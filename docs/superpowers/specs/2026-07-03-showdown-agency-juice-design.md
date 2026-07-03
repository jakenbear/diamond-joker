# Showdown Agency + Juice — Design

**Date:** 2026-07-03
**Goal:** Make the pitching showdown (opponent's at-bat) fun by giving the player real agency (pick targets, read the board) and visible feedback (animated effects, tension beat), without changing the underlying resolution.

---

## Problem

The Hold'em-style showdown is currently passive: the player picks a pitch, the game auto-targets the affected card, applies the effect silently, and re-renders the board. The player watches a slot machine rather than pitching. Three root causes in `src/scenes/PitchingScene.js`:

1. **Auto-targeting** (`_onShowdownPitchSelected`, ~line 1042): targeted pitches auto-pick "highest-rank unlocked card"; the player never chooses.
2. **No effect visualization** (~line 1066–1072): effects apply, then the board silently re-renders — nothing animates.
3. **Pacing drag** (~lines 1075, 1105–1117): fixed `delayedCall(800)`/`300ms` waits between every stage; across ~27 opponent at-bats this adds minutes.

The concept stays. We add agency and juice.

---

## Architecture & Boundaries

All work lives in **`src/scenes/PitchingScene.js`** (Phaser UI/interaction) plus small **pure-logic helpers on `src/ShowdownEngine.js`** so the decision logic is headlessly testable.

- **ShowdownEngine (pure, unit-tested)** gains two read-only helpers:
  - `getBestHandName(owner)` — returns the current best 5-card hand name for `'pitcher'` or `'batter'`, from that side's hole cards + community. For `'batter'`, only *revealed* hole cards count (see Live Hand Read).
  - `getSuggestedTarget(pitchKey)` — returns the community-card index (or hole-card index for fastball) the auto-picker would choose. Extracted from the current inline heuristic in the scene so scene and tests share one source of truth. Returns `null` when no eligible target exists.
- **PitchingScene (Phaser, smoke-tested)** owns the presentation: target-select overlay, hand-read display, effect animations, pacing.

Decisions (which card, what hand) live in tested logic; presentation lives in the scene.

---

## Feature 1 — Suggested-Target + Confirm

**Targeted pitches** and their target domain:
- Community-card targets: `slider`, `cutter`, `splitter`, `twoseam`, `breaking`.
- Own-hole target: `fastball` (uses `swapIndex` into `pitcherHole`).

**Non-targeted pitches** (commit immediately, unchanged): `sinker` (all community −1), `knuckle` (scramble all), `palmball` (plant next), `changeup`/`screwball` (random batter card), `curveball` (auto best batter card). These have no meaningful player choice.

**Flow when a targeted pitch is picked:**
1. Pitch buttons hide. Scene enters targeting state: `this._targetingPitch = { key, stage }`.
2. Eligible cards highlight. The **suggested** card (from `getSuggestedTarget`) gets a distinct pulsing ring + a small "suggested" tag. Ineligible cards are excluded: for community targets, `lockedIndices` and (where the effect requires a face-up card) `faceDownIndices` are not selectable.
3. Eligible cards are clickable; clicking moves the selection ring. A **CONFIRM** button commits the current selection; a **CANCEL** button clears targeting state and re-shows the pitch buttons for the same stage.
4. On confirm → `applyPitch(key, { targetIndex })` (or `{ swapIndex }` for fastball) → effect animation (Feature 3) → stage advances.

**Guards:**
- The existing `_selectingPitch` double-fire guard extends to CONFIRM (cannot double-commit).
- `_showPitchAbilities(stage)` already resets `_selectingPitch`; it also clears any leftover targeting state/overlay.
- Existing control-based **misfire** logic (`applyPitch`, ~line 337) is unchanged: a confirmed target can still miss for a low-control pitcher. The reveal animation shows the miss (the actually-hit card animates, not the intended one).

**Edge cases:**
- If `getSuggestedTarget` returns `null` (e.g. all community cards locked for a community-target pitch), the pitch still commits with the engine's existing default behavior — no target overlay is shown. This preserves current behavior rather than blocking the pitch.
- The wild-card pitch path (`~line 1004`) resolves to a concrete `pitchKey`; it enters the same targeting flow if that resolved key is targeted.

---

## Feature 2 — Live Hand Read

After each community card (flop/turn/river) and after every pitch effect, a hand-read strip shows each side's current best hand:

- **`YOU: Pair of 9s`** near the pitcher hole row (y≈480), **`OPP (visible): Pair of 9s`** near the batter hole row (y≈120).
- Powered by `getBestHandName(owner)`, which reuses the existing `bestHand()` evaluator and returns its `handName`.
- **Opponent read counts only visible cards:** the batter's hole cards are included only if their index is in `revealedBatterCards`. So OPP's read is computed from (revealed batter hole cards) + community. This preserves hidden-information tension and makes reveal pitches (changeup/screwball) genuinely informative.
- **Honesty:** because OPP's read can understate their true hand (hidden hole cards), it is labeled `OPP (visible):` so it never reads as a false certainty.
- The read updates live after every pitch effect and every new community card, so the player watches manipulations change the matchup.

This is the core agency lever: "I'm behind on the board → use splitter to knock down their pair."

---

## Feature 3 — Effect Juice (full pass)

A shared dispatcher `_animateCardChange(owner, index, kind, onComplete)` in the scene runs the right tween by `kind`, then fires `onComplete` (which triggers board re-render + hand-read update). Kinds:

| Pitch | kind | Animation |
|---|---|---|
| fastball / slider / screwball | `swap` | old card shrinks + fades out, new card scales in |
| curveball / sinker | `downgrade` | affected card(s) flash red, rank ticks down |
| breaking | `flip` | card flips 180° (scaleX → 0 → back) to face-down |
| cutter | `lock` | gold lock ring snaps in with a scale-pop |
| splitter | `destroy` | card shrinks to nothing + puff |
| knuckle / wild_thing | `scramble` | affected cards jitter/shuffle then settle |
| twoseam | `swap` | swap slide |
| palmball | `plant` | card slides in from deck |
| changeup | `reveal` | face-down card flips face-up |

**Effect result shapes:** each `_effect*` returns different fields identifying what changed (e.g. `_effectScrewball` → `replacedBatterCard` on a random batter index; `_effectTwoseam` → `batterIdx` + swapped cards; `_effectCurveball` → `downgraded`/`fromRank`/`toRank`). The dispatcher reads the returned `result` to decide which card (owner + index) to animate. Since some effects (screwball, changeup) pick their own random index internally, the scene animates by re-reading engine state at the changed index rather than assuming the suggested target.

**Curveball miss caveat:** `_effectCurveball` on a failed control roll sets `community[0].rank = 14` (an Ace helping the batter) instead of downgrading. The `downgrade` animation must handle both outcomes — animate the batter hole card on success, or the community[0] rank-up on a miss — driven by `result.downgraded`.

**Reveal tension beat:** at river resolution, a brief hold + the winning side's hand-read pulses/highlights before the outcome text lands. Reuses the existing resolution flow (`_resolveShowdown` / `_animateShowdownReveal`), adds a beat.

Animations use existing SoundManager hooks where they already exist (spinTick/spinSuccess/spinFail on the reveal). No new audio required for this pass, though per-effect SFX can be layered later.

---

## Feature 4 — Pacing

- **Trim inter-stage delays:** the fixed `delayedCall(800)` after a pitch (~line 1075/1082) and `delayedCall(300)` between stages (~line 1112–1117) are reduced to snappier values (target ~400ms post-effect, ~150ms inter-stage), tuned so animations still read.
- **Tap-to-advance:** during any post-effect or reveal pause, a tap (pointerdown on the scene) skips the remaining wait and jumps to the next stage/resolution. Guarded so it cannot skip into an unready state (only active while a skippable timer is pending; cleared on use).

---

## Data Flow

1. `PitchingScene._startNewAtBat` builds the `ShowdownEngine`, deals flop → renders board → shows hand read → shows pitch buttons.
2. Player picks a pitch:
   - Non-targeted → commit immediately → animate → advance.
   - Targeted → targeting overlay → confirm → commit → animate → advance.
3. `applyPitch` mutates engine state (with possible misfire); scene animates the actual change, re-renders board, updates hand read.
4. Turn/river repeat. River → resolve → tension beat → outcome.

No change to `resolve()`, outcome mapping, trait bonuses, stamina, or deck logic.

---

## Testing

**Headless (`test/sim.js`):**
- `getBestHandName('pitcher')` returns correct hand name for constructed pitcher hole + community.
- `getBestHandName('batter')` counts only revealed hole cards: with no reveals it evaluates community-only; after revealing a hole card index it includes it.
- `getSuggestedTarget(key)`: for a community-target pitch returns the highest-rank *unlocked, face-up* community index; skips locked/face-down; returns `null` when none eligible. For `fastball` returns the weaker pitcher hole index.
- Full suite stays green (currently 2260 passing).

**Browser smoke:**
- Boot clean (no JS errors).
- Drive a showdown far enough to confirm: hand-read strip renders and updates; targeting overlay appears for a targeted pitch with a suggested ring; confirm/cancel work; an effect animates; tap-to-advance skips a pause.

---

## Scope / Non-Goals

- No change to resolution math, outcome mapping, trait bonuses, stamina, or deck generation.
- No new pitch types — agency + feedback on the existing set only.
- No Godot mirror (project owner is scrapping Godot).
- Per-effect custom SFX beyond existing hooks are out of scope (can layer later).

---

## Risks

- **Interaction state leaks:** targeting overlay or tap-to-advance handlers not cleaned up between stages/at-bats could cause stuck input or phantom clicks. Mitigation: all targeting/skip state cleared in `_showPitchAbilities` and at at-bat start; overlay elements tracked in an array and destroyed like `_pitchButtons`/`_boardElements`.
- **Animation vs. state race:** re-rendering the board mid-animation could double-draw or reference destroyed sprites. Mitigation: `_animateCardChange` owns its sprites and only triggers re-render in its `onComplete`; input locked during animation via the existing `_selectingPitch`-style guard.
- **Hand-read honesty:** addressed via the `OPP (visible):` label so understated reads aren't misleading.

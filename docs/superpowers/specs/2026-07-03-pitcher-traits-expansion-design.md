# Pitcher Traits Expansion — Design

**Date:** 2026-07-03
**Goal:** Expand opponent pitcher traits from 8 → 20 so opponents feel distinct across a 9-inning game and the half you *defend* has more variety.

---

## Context

Pitcher traits are defined in `data/pitcher_traits.js`. 1–2 are randomly assigned to the opponent pitcher each game (`TraitManager.pickPitcherTraits` → `RosterManager.setPitcherTraits`). They always affect the **player's** at-bats — every pitcher trait is an obstacle the player reads and plays around.

Traits are pure data interpreted by `src/EffectEngine.js`:
- `phase: 'pitcher_pre'` — transforms the player's cards before hand evaluation (via `PRE_HANDLERS`)
- `phase: 'pitcher_post'` — transforms the result after evaluation (via `POST_HANDLERS`)

The engine already provides a large toolbox, so most new traits are pure data:
- **Post handlers:** `add_mult`, `add_peanuts`, `per_runner_peanuts`, `upgrade_outcome`, `prevent_outcome`, `set_flag`, `force_groundout`, `convert_high_card`, `add_discard`, `compound`
- **Pre handlers:** `adjacent_to_pair`, `ace_wild_straight`, `color_is_suit`, `upgrade_lowest`, `downgrade_highest`, `downgrade_face_cards`, `swap_random`
- **Conditions:** `always`, `outs_eq`, `outs_neq`, `inning_range`, `runner_on`, `bases_loaded`, `bases_empty`, `outcome_is`, `hand_is`, `hand_in`, `peanuts_lte`, `peanuts_gte`, `losing_by`, `first_batter_of_inning`, `and`, `or`

All mult handlers floor at `mult ≥ 1` (via `Math.max(1, …)`), so outs (mult 1) are never pushed below 1.

---

## Engine Additions (4)

These unlock mechanics the current toolbox can't express. Each is small, pure, and TDD-covered.

### 1. `winning_by` condition
Mirror of the existing `losing_by`. True when the player's lead ≥ `value`.
```js
case 'winning_by':
  return gameState.playerScore - gameState.opponentScore >= cond.value;
```

### 1b. `bases_occupied` condition
Truthiness-based mirror of `bases_empty` — true when any base has a runner. Needed because base runners are stored as **batter objects or `true`** (`bases[i] = batter || true`), so the existing `runner_on` condition's strict `=== true` check silently misses object runners. `bases_occupied` uses truthiness like `bases_empty` does.
```js
case 'bases_occupied':
  return !!(gameState.bases[0] || gameState.bases[1] || gameState.bases[2]);
```
Used by `rally_killer`. (The `runner_on === true` fragility affecting `sacrifice_fly`/`squeeze_play` is a separate pre-existing issue and is **out of scope** here.)

### 2. `cap_mult` post handler
Hard ceiling on mult — a control pitcher limiting damage. Distinct from `add_mult`, which is a flat subtraction.
```js
cap_mult(result, effect, gameState) {
  if (!checkCondition(effect.condition, result, gameState)) return result;
  return { ...result, mult: Math.min(result.mult, effect.value) };
}
```
No explicit floor needed: an existing mult is already ≥ 1, and `Math.min` only lowers toward `effect.value` (which we always set ≥ 1 in data).

### 3. `scale_mult` post handler
Proportional mult reduction — hurts big hands more than small ones. Distinct from flat `add_mult`.
```js
scale_mult(result, effect, gameState) {
  if (!checkCondition(effect.condition, result, gameState)) return result;
  const scaled = Math.max(1, Math.round(result.mult * effect.value * 10) / 10);
  return { ...result, mult: scaled };
}
```
Floors at 1 so outs and low hands stay valid. `value` is a fraction (e.g. `0.75`).

---

## New Traits (12)

Distribution: **5 common · 5 uncommon · 2 rare**. Flavor mix: **7 straight obstacles · 5 double-edged.**
Rarity weights (existing): common 3× · uncommon 2× · rare 1×.

### Common (5)

| id | name | phase | flavor | effect |
|----|------|-------|--------|--------|
| `sinker` | Sinker | pre | straight | `downgrade_highest`, chance 0.4, amount 2 |
| `cutter` | Cutter | post | straight | `add_peanuts` −1 on all hits (condition: `peanuts_gte` 1 so outs at 0 peanuts are untouched) |
| `sinkerballer` | Sinkerballer | post | double-edged | compound: `add_mult` −2 when `hand_in [Pair, Two Pair]`; `add_peanuts` +2 when `hand_in [Straight, Flush]` |
| `fireballer` | Fireballer | post | straight | `add_mult` −2 when `inning_range 1–3` (anti-Closer's Instinct) |
| `backfoot_slider` | Backfoot Slider | pre | straight | `downgrade_face_cards`, amount 1 |

### Uncommon (5)

| id | name | phase | flavor | effect |
|----|------|-------|--------|--------|
| `junkballer` | Junkballer | post | double-edged | compound: `cap_mult` 4 (always); `add_peanuts` +1 when `peanuts_gte` 1 |
| `bulldog` | Bulldog | post | straight | `add_mult` −3 when `winning_by` 1 |
| `wild_thing` | Wild Thing | pre | double-edged | `swap_random`, chance 0.5 (chaos — can help the player) |
| `splitter` | Splitter | post | straight | `add_mult` −2 when `hand_in [Three of a Kind, Full House, Four of a Kind, Straight Flush, Royal Flush]` |
| `escape_artist` | Escape Artist | post | double-edged | compound: `add_mult` −5 when `bases_loaded`; `add_mult` +1 when `bases_empty` |

### Rare (2)

| id | name | phase | flavor | effect |
|----|------|-------|--------|--------|
| `frontline_ace` | Frontline Ace | post | straight | `scale_mult` 0.75 (always) |
| `rally_killer` | Rally Killer | post | double-edged | compound: `add_mult` −4 when `bases_occupied`; `add_peanuts` +2 when `bases_empty` |

**Notes:**
- `escape_artist` −5 mult when bases loaded: floors at 1 (via `add_mult`'s `Math.max(1, …)`), so it neutralizes a big hand's mult rather than going negative. Intended — that's the "escape."
- `rally_killer` uses the new `bases_occupied` condition (truthiness) rather than `runner_on`, which would silently miss object runners (see Engine Addition 1b).
- `splitter` uses `hand_in` with the explicit list of big hands rather than a numeric threshold, matching the existing `heater` pattern.

---

## Data Flow (unchanged)

1. `GameScene` assigns pitcher traits at pitcher setup.
2. Pre-eval: `pitcher_pre` traits transform the player's cards before `CardEngine` evaluates the hand.
3. Post-eval: `pitcher_post` traits transform the evaluated result (mult/peanuts/outcome).
4. Score = `floor(peanuts × mult)`.

No changes to assignment, phases, or the scoring pipeline. New traits ride existing rails.

---

## Risks & Mitigations

- **`runner_on` truthiness (resolved).** `checkCondition`'s `runner_on` does `gameState.bases[cond.base] === true`, but base runners are stored as batter objects or `true` (`bases[i] = batter || true`), so `runner_on` silently misses object runners. Resolved by adding the truthiness-based `bases_occupied` condition (Engine Addition 1b) and using it for `rally_killer`. The pre-existing `runner_on` fragility in `sacrifice_fly`/`squeeze_play` is left untouched (out of scope).
- **Balance skew from stacking.** Two heavy mult-penalty traits on one pitcher (e.g. `frontline_ace` + `splitter`) could feel oppressive. Acceptable: only 1–2 traits assigned, floors keep hands playable, and double-edged traits give counterplay. No mitigation beyond the mult ≥ 1 floors.
- **Dead/overlapping traits.** `sinker` vs `curveball` (both downgrade highest) and `backfoot_slider` vs `knuckleball` (both downgrade face cards) are intentionally milder/cheaper siblings, differentiated by rarity and magnitude — not duplicates.

---

## Testing

- **Engine (unit, `test/sim.js`):**
  - `winning_by`: true at/above lead threshold, false below and when losing.
  - `bases_occupied`: true with a `true` runner AND with an object runner; false when all bases empty.
  - `cap_mult`: lowers mult above cap, leaves mult at/below cap unchanged.
  - `scale_mult`: reduces proportionally, floors at 1, rounds to 1 decimal.
- **Traits (data-driven):** For a representative double-edged trait (`sinkerballer` or `escape_artist`), assert both branches fire under the right game state and neither fires under the wrong one.
- Full suite must stay green (currently 2183 passing).

---

## Documentation

Update the **Pitcher Traits** table in `docs/GAME_DESIGN.md` to list all 20 traits with their effects (per project protocol: GDD updated in the same commit as the mechanic).

---

## Out of Scope

- No changes to how many traits are assigned (stays 1–2).
- No batter-trait, coach, mascot, or synergy changes.
- No pitching-minigame (ShowdownEngine) rework — separate track.

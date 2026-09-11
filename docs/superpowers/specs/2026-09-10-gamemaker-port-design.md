# GameMaker Port — Design

**Date:** 2026-09-10  
**Goal:** Port Aces Loaded! from Phaser to GameMaker LTS as a one-way move: new GM project, full game logic parity with the current GDD, redesigned UI at 1280×720, playable early via a full scene shell, Phaser left untouched.

---

## Context

- Live implementation today: Phaser in `src/` + `data/` (see `docs/GAME_DESIGN.md`, `CLAUDE.md`).
- Pure engines already exist without Phaser (`CardEngine`, `BaseballState`, etc.); scenes are presentation-only.
- `godot/` is abandoned — do not revive or sync.
- Existing `docs/porting-plan.md` describes a general port strategy; **this spec overrides it** where they differ (notably: **manual playtesting only** for the GM port; no requirement to port `test/sim.js` in v1).
- Authoring machine for GM work: **Windows** with latest GameMaker **LTS**. Design/chat can continue on Mac; MCP + compile/run happen on Windows.
- Tooling: **gamemaker-mcp** (`yearningss` / `npx gamemaker-mcp`) connected to Cursor on the Windows machine.

---

## Goals & Non-Goals

### Goals

- New GameMaker LTS project in-repo under `gamemaker/` (Phaser files never modified).
- Full scene skeleton so the game is **playable in GM** early (navigate full loop, finish a short game).
- Port **full game logic** over time (not a forever-stub game).
- Reuse real art where it exists (cards, players, other finished assets); placeholders elsewhere.
- Resolution **1280×720**.
- UI may be redesigned freely; rules/feel must match the GDD / current JS engines.

### Non-Goals (v1)

- Dual-maintaining or updating Phaser.
- Syncing or continuing the Godot port.
- Automated GML unit tests / port of `test/sim.js` (manual play only for now).
- Balance retunes “while porting.”
- Pixel-perfect Phaser UI clone.

---

## Approach

**Approach 2 — Full playable shell, then swap in real systems.**

1. Scaffold all rooms/objects at 1280×720 with redesigned UI.
2. Wire the full game loop so a short run reaches game over (stubs allowed behind clear interfaces).
3. Replace stubs with ported engines module-by-module until logic parity.
4. Keep Phaser frozen as reference only.

---

## Architecture & Boundaries

### Repo layout

| Path | Role |
|------|------|
| `src/`, `data/`, `assets/`, Phaser entry | **Frozen reference** — do not modify for this port |
| `gamemaker/aces_loaded/` | New GameMaker LTS `.yyp` project (canonical path) |
| `godot/` | Leave alone |
| `docs/GAME_DESIGN.md` | Rules source of truth |

Copy (do not move) reusable art into the GM project. Placeholders for missing chrome/UI/VFX.

### Runtime layers

| Layer | Lives in | Role |
|-------|----------|------|
| Data | GML scripts / included files from `data/*` | Hand table, teams, traits, balance |
| Engines | GML scripts (e.g. `scr_card_engine`) | Pure rules — no draw calls |
| Session | Persistent controller (e.g. `obj_game`) | Inning loop, peanuts, roster, room flow |
| Presentation | Objects + rooms | Redesigned UI at 1280×720 |

### Hard rules

- Engine scripts must not depend on room draw code.
- Stubs only behind clear interfaces (e.g. outcome resolver) so they are replaced, not forked forever.
- Same hand-eval split as JS: pure `classify` for comparison; batting evaluate may use RNG and must not be used for head-to-head compare.
- Baseball-legal outcomes only; only the home team (opponent) can walk off; player is away.

---

## Scene Flow

Mirror current game flow (UI redesigned):

```
rm_title → rm_team_select → rm_trait_draft → [Inning Loop] → rm_game_over
```

**Inning loop (per inning):**

1. `rm_batting` — player bats until 3 outs  
2. `rm_shop` — peanuts / traits (and pack flow when applicable)  
3. Optional `rm_pack_open` when the live game would open packs  
4. `rm_pitching` — opponent half / showdown  
5. Next inning or end (3 / 5 / 7 / 9 + extras / walk-off per GDD)

`obj_game` (or equivalent) owns session state: inning, scores, outs, bases, peanuts, roster, deck, regulation length, game-over flags.

### Shell exit criteria

Start a game, walk every room in a short (e.g. 3-inning) run, reach game over — even if some mid-game outcomes are still stubbed.

---

## Stub → Real Swap Order

Each step remains playable in GM:

1. **Shell** — all rooms navigate; temporary continue / fake score bumps as needed  
2. **Cards + hand eval** — deal, select, `classify` (real card engine)  
3. **Baseball state + count** — outs, bases, score, innings from real outcomes  
4. **Shop + traits + effects** — peanuts, trait apply via effect engine  
5. **Pitching / showdown** — real pitch selection + showdown resolve  
6. **Situational / synergies / bonuses / remaining systems** — rest of `src/` parity  

---

## Data & Engine Map

**Rules source of truth:** `docs/GAME_DESIGN.md` + current JS engines/tables. GM does not invent new poker/baseball rules during the port.

### Data

Translate each `data/*.js` table into GML-friendly structs/arrays or included JSON loaded at boot, behind `scr_data_*` (or equivalent) so balance stays centralized.

Invariant: hand-table **monotonic reward ladder** (stronger poker hand never pays less than a weaker one).

### Engines (JS → GML)

| JS | GML (illustrative names) |
|----|--------------------------|
| `CardEngine.js` | `scr_card_engine` |
| `BaseballState.js` | `scr_baseball_state` |
| `CountManager.js` | `scr_count_manager` |
| `RosterManager.js` | `scr_roster_manager` |
| `TraitManager.js` | `scr_trait_manager` |
| `EffectEngine.js` | `scr_effect_engine` |
| `ShowdownEngine.js` | `scr_showdown_engine` |
| `SituationalEngine.js` | `scr_situational_engine` |
| `SynergyEngine.js` | `scr_synergy_engine` |
| `BonusEngine.js` | `scr_bonus_engine` |
| `data/*.js` | `scr_data_*` / included files |

**RNG:** one consistent strategy (e.g. GM `irandom` or a small seeded helper) for manual regression stability. No requirement for deterministic replays in v1.

---

## Assets & UI

- **Reuse:** card PNGs, player art, and any other finished sprites/audio worth keeping.  
- **Placeholder:** field chrome, buttons, shop panels, missing mascots, VFX, etc.  
- Cards must stay readable at 1280×720 (Phaser used 3× on 32×42; GM uses equivalent scale).  
- UI redesign is allowed; each screen keeps one clear primary job; HUD (score, inning, count, bases, peanuts) stays legible.

---

## Verification

- **Manual playtesting only** for this port’s v1.  
- After each swap step: complete at least one short-game playthrough in the GM runner.  
- No automated GML suite required yet (may revisit later; not blocking).

---

## Windows / MCP Handoff

On Windows with GameMaker LTS:

1. Create (or open) the `.yyp` under `gamemaker/…`.  
2. Connect MCP: `npx gamemaker-mcp@latest connect cursor` (workspace-write; builds optional).  
3. Open that project (or the repo containing it) in Cursor; resume from this spec.  
4. Iterate Approach 2 in the swap order above.  
5. Manual playthrough after each major swap.

Mac sessions may continue design/planning against the frozen Phaser reference; they do not require GM installed.

---

## Done-Enough Checkpoints

| Checkpoint | Meaning |
|------------|---------|
| **Shell** | Full loop; short game length; game over reachable |
| **Logic complete** | Parity with current GDD systems (not Phaser visuals) |
| **Ship-shaped** | Real art where we have it; remaining placeholders tracked for later |

**2026-09-11:** Shell + most logic are in. Pickup list: `gamemaker/STATUS.md`.

---

## Open Decisions (resolved in brainstorm)

| Topic | Decision |
|-------|----------|
| MCP | A — `gamemaker-mcp` |
| First milestone shape | Full scene skeleton, playable in GM |
| Logic depth | Full game logic port (longer process) |
| Phaser | Do not modify; one-way port |
| Project location | New `gamemaker/` folder |
| Art | Reuse cards/players/real art; placeholders elsewhere |
| Tests | Manual play only |
| UI | Redesign freely; 1280×720 |
| Implementation approach | Shell first, then swap engines |

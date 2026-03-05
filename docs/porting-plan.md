# Porting Plan — Diamond Joker

## Architecture Overview

The codebase is split into two clean layers, making engine porting straightforward.

### Logic Layer (Engine-Agnostic)

These files have **zero** Phaser/browser/DOM dependencies. They are pure state machines and math that can be ported 1:1 to GDScript, GML, C#, etc.

| File | Responsibility |
|------|---------------|
| `src/CardEngine.js` | Deck management, hand evaluation, poker math |
| `src/BaseballState.js` | Innings, outs, bases, scoring, game flow state machine |
| `src/RosterManager.js` | Rosters, pitcher sim, pitch types, stamina, batter/pitcher modifiers |
| `src/EffectEngine.js` | Trait condition checking and effect application |
| `src/TraitManager.js` | Trait composition and modifier building |
| `data/hand_table.js` | Hand rankings → baseball outcome mapping |
| `data/teams.js` | Team rosters and stats |
| `data/batter_traits.js` | Batter trait definitions |
| `data/pitcher_traits.js` | Pitcher trait definitions |

### Presentation Layer (Phaser-Specific — Rewrite for New Engine)

| File | Responsibility |
|------|---------------|
| `src/scenes/GameScene.js` | Main gameplay UI, card rendering, pitch selection, animations |
| `src/scenes/ShopScene.js` | Shop UI, trait buying |
| Other scenes | Menu, team select, etc. |

These call into the logic layer and render results. In a new engine, you'd rebuild these using the engine's scene/UI system but wire them to the same logic API.

## Porting Steps

1. **Port data files first** — teams, traits, hand_table are just static data structures
2. **Port logic layer** — translate JS classes to target language; all pure functions/state
3. **Port tests** — the test suite (`test/sim.js`) validates all game logic without any UI; port it early to catch translation bugs
4. **Build presentation layer** — use the new engine's native scene/sprite/UI systems
5. **Wire up** — scenes call logic layer the same way: `rosterManager.simSingleAtBat()`, `baseball.resolveOutcome()`, etc.

## Things to Watch

- **`Math.random()` everywhere** — Logic layer calls `Math.random()` directly. For deterministic replays, networking, or save/load, swap in a seeded PRNG. Small refactor — grep for `Math.random` and replace with a shared `rng.next()`.
- **No async** — All logic is synchronous. No promises, no callbacks. This makes porting simpler.
- **Modular exports** — Each file exports a single class or constant. Clean import boundaries = clean module boundaries in any language.
- **Smart test brain** — `test/sim.js` has a full AI player (`findBestPlay`, `pickDiscards`, `smartAtBat`) that brute-forces optimal card selection. This can serve as an AI opponent or difficulty tuning reference in a ported version.

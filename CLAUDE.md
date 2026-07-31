# Aces Loaded! — Project Rules

## Game Update Protocol

When making ANY gameplay change (mechanics, balance, outcomes, traits, etc.):

1. **GDD First** — Update `docs/GAME_DESIGN.md` with the new/changed mechanic before writing code
2. **Tests Cover It** — If changing game logic, update or add tests in `test/sim.js`
3. **Commit Together** — GDD update, code, and tests go in the same commit (or tightly grouped commits)

## The Godot Port Is Dead Code

`godot/` is an abandoned port. **Do not keep it in sync.** The Phaser version in
`src/` and `data/` is the only live implementation. Changes to game logic go to JS
only — no GDScript mirror is required or wanted.

## Architecture

Pure game logic lives in `src/*.js` with no Phaser dependency, so `test/sim.js` can
import and exercise it directly. Phaser only appears in `src/scenes/*.js`. Keep it
that way: if a rule can be tested without a canvas, it belongs in an engine file.

| File | Responsibility |
|------|----------------|
| `src/CardEngine.js` | Deck management + poker hand evaluation |
| `src/BaseballState.js` | Innings, outs, bases, score |
| `src/RosterManager.js` | Lineup and roster state |
| `src/EffectEngine.js` | Interprets trait effect descriptors from `data/` |
| `src/SituationalEngine.js` | Context-dependent outcome adjustments |
| `src/TraitManager.js` | Trait ownership and activation |
| `src/CountManager.js` | Balls/strikes |
| `src/ShowdownEngine.js` | Hold'em-style pitching showdown |
| `data/*.js` | Tunable tables — hand table, teams, decks, traits, pitch types, balance |

## Hand Evaluation: Two Entry Points

- `CardEngine.classify(cards)` — **pure**. No RNG, no mutation, no game state.
  Returns `strength` in poker order (higher = better). Use this whenever comparing
  two hands (e.g. the showdown).
- `CardEngine.evaluateHand(...)` — rolls the batting out-chance and can rewrite a
  made hand's score to 0. **Never use it for comparison** — the same cards can
  return different scores on repeated calls.

## Baseball Outcome Rules

- Outcomes must be physically possible in baseball (no Grand Slam without runners, no Walk-Off in inning 1)
- Only the home team can walk off
- Top-tier hands resolve with probability curves, not identical "everyone scores" logic
- `data/hand_table.js` is the source of truth for outcome mappings, and its reward
  ladder must stay **monotonic** — a stronger poker hand can never pay less than a
  weaker one. `test/sim.js` group 19 enforces this.

## Card Art

- 32×42 pixel art PNGs in `assets/cards/` (repo root — this is the live path)
- Naming: `{suit}{rank}.png` (h/d/c/s + 2-10/j/q/k/a)
- Scale: 3× (96×126) in game UI for 8-card hands

## Tech Stack

- **Phaser 3** — runs via `index.html`
- **Tests** — `node test/sim.js` (pure JS, no framework)
- **No build step** — vanilla JS ES modules, no bundler
- Two tests in the suite are statistical and sample-size sensitive (pitch-type hit
  rates); a rare near-miss there is flakiness, not a regression. Re-run to confirm.

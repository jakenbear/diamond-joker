# Aces Loaded! — Project Rules

## Game Update Protocol

When making ANY gameplay change (mechanics, balance, outcomes, traits, etc.):

1. **GDD First** — Update `docs/GAME_DESIGN.md` with the new/changed mechanic before writing code
2. **Phaser + Godot in Sync** — Every logic change must be applied to BOTH:
   - JS: `src/` and `data/`
   - GDScript: `godot/scripts/` and `godot/scripts/data/`
3. **Tests Cover It** — If changing game logic, update or add tests in `test/sim.js`
4. **Commit Together** — GDD update, Phaser code, Godot code, and tests go in the same commit (or tightly grouped commits)

## File Mapping (JS ↔ GDScript)

| JS Source | GDScript Mirror |
|-----------|----------------|
| `src/BaseballState.js` | `godot/scripts/baseball_state.gd` |
| `src/CardEngine.js` | `godot/scripts/card_engine.gd` |
| `src/RosterManager.js` | `godot/scripts/roster_manager.gd` |
| `src/EffectEngine.js` | `godot/scripts/effect_engine.gd` |
| `src/SituationalEngine.js` | `godot/scripts/situational_engine.gd` |
| `src/TraitManager.js` | `godot/scripts/trait_manager.gd` |
| `data/hand_table.js` | `godot/scripts/data/hand_table.gd` |
| `data/teams.js` | `godot/scripts/data/teams.gd` |
| `data/decks.js` | `godot/scripts/data/decks.gd` |
| `data/batter_traits.js` | `godot/scripts/data/batter_traits.gd` |
| `data/pitcher_traits.js` | `godot/scripts/data/pitcher_traits.gd` |
| `data/pitch_types.js` | `godot/scripts/data/pitch_types.gd` |

## UI Scenes (Not Mirrored 1:1, But Match Functionally)

| Phaser Scene | Godot Scene |
|-------------|-------------|
| `src/scenes/GameScene.js` | `godot/scenes/game_scene.tscn` + `.gd` |
| `src/scenes/PitchingScene.js` | `godot/scenes/pitching_scene.tscn` + `.gd` |
| `src/scenes/ShopScene.js` | `godot/scenes/shop_scene.tscn` + `.gd` |
| `src/scenes/TeamSelectScene.js` | `godot/scenes/title_scene.tscn` + `.gd` |
| `src/scenes/GameOverScene.js` | `godot/scenes/game_over_scene.tscn` + `.gd` |

## Baseball Outcome Rules

- Outcomes must be physically possible in baseball (no Grand Slam without runners, no Walk-Off in inning 1)
- Top-tier hands resolve with probability curves, not identical "everyone scores" logic
- The GDD hand table is the source of truth for outcome mappings

## Card Art

- 32×42 pixel art PNGs in `godot/assets/cards/`
- Naming: `{suit}{rank}.png` (h/d/c/s + 2-10/j/q/k/a)
- Phaser loads from `assets/cards/` via same naming convention
- Scale: 3× (96×126) in game UI for 8-card hands

## Tech Stack

- **Phaser 3** — web version, runs via `index.html`
- **Godot 4.6** — native version, project at `godot/project.godot`
- **Tests** — `node test/sim.js` (pure JS, no framework)
- **No build step** — Phaser version is vanilla JS, no bundler

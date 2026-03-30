# Baseball Stat Display Conversion

## Goal
Replace abstract PWR/CNT/SPD (1-10) labels with baseball-authentic AVG/HR/SB display values. Internal math stays on the 1-10 scale — this is a pure display layer change.

## Conversion Functions

Three display helpers, all seeded with player name for consistent per-player jitter:

```
nameHash(name) → deterministic float 0-1 from player name string

toAVG(contact, name) → .150 + (contact - 1) * .028 + jitter(±.015)
toHR(power, name)    → round((power - 1) * 6.7 + jitter(±3))
toSB(speed, name)    → round((speed - 1) * 8.9 + jitter(±4))
```

### Ranges

| Internal | Display | Min (1) | Max (10) | Jitter |
|----------|---------|---------|----------|--------|
| contact  | AVG     | ~.135   | ~.415    | +/-.015 |
| power    | HR      | 0       | ~63      | +/-3    |
| speed    | SB      | 0       | ~84      | +/-4    |

Jitter is seeded from player name so the same player always shows the same display stats across sessions.

## Display Locations (JS)

| File | Current | New |
|------|---------|-----|
| GameScene.js — batter panel | `PWR ████░░` bar | `HR 27` bar |
| GameScene.js — preview line | `+2 PWR +0.6 CNT` | `+2 PWR +0.6 CNT` (internal, keep as-is) |
| PitchingScene.js — opp batter panel | `PWR ████░░` bar | `HR 27` bar |
| PitchingScene.js — roster sidebar | `PWR:5 CNT:8 SPD:6` | `AVG:.273 HR:27 SB:36` |
| TeamSelectScene.js — roster table | PWR/CNT/SPD bars | HR/AVG/SB bars |
| TeamSelectScene.js — team averages | `PWR:5.2 CNT:7.1 SPD:5.8` | `HR:28 AVG:.297 SB:43` |
| TraitDraftScene.js — lineup | `P:5 C:8 S:6` | `HR:27 AVG:.273 SB:36` |
| ShopScene.js — player cards | `PWR:5 CNT:8 SPD:6` | `HR:27 AVG:.273 SB:36` |
| PackOpenScene.js — pack cards | `PWR 5 CNT 8 SPD 6` | `HR 27 AVG .273 SB 36` |

## What Does NOT Change
- Internal math in RosterManager.js (still uses raw 1-10 power/contact/speed)
- ShowdownEngine.js deck generation (uses contact/power internally)
- Player data in teams.js (still `power: 5, contact: 8, speed: 6`)
- Pitcher stats (VEL/CTL already feel baseball-authentic)
- Godot data files (same internal values, display conversion mirrored in GDScript)
- CardEngine.js (no stat references)

## Implementation Notes
- Conversion functions live in a small utility (e.g. `src/StatDisplay.js`) or as static methods
- Godot mirror: `godot/scripts/stat_display.gd` with same logic
- Bar graphics can stay — just relabel from PWR/CNT/SPD to HR/AVG/SB
- Clamp output so HR/SB never go negative from jitter

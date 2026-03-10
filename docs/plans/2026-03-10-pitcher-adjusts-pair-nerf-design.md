# Pitcher Adjusts — Pair Nerf Design

**Date**: 2026-03-10
**Problem**: Pairs are too powerful when batting. Playtester reported winning 77-1 by living on pairs.
**Root cause**: Pairs are the most common poker hand (~42% of 5-card draws), contact rescue makes them near-guaranteed singles (up to 60% rescue rate), and trait upgrades push them further.

## Design

### 1. State Tracking

- New field `pairsPlayedThisInning` on `BaseballState` (JS) / `baseball_state` (GDScript)
- Initialized to `0`
- Incremented in `_applyRankQuality` whenever the played hand is a Pair
- Reset to `0` in `switchSides` / `switch_sides` (start of each half-inning)

### 2. Out Chance Escalation

Current formula:
```
outChance = max(0.05, 0.80 - (pairRank - 2) * 0.06 + twoStrikePenalty)
```

New formula:
```
pairPenalty = pairsPlayedThisInning * 0.15
outChance = min(0.95, max(0.05, 0.80 - (pairRank - 2) * 0.06 + twoStrikePenalty + pairPenalty))
```

Capped at 0.95 so there's always a 5% miracle chance.

Example — pair of Kings (rank 13, base out chance 14%):

| Pair # | Penalty | Out Chance (0 strikes) | Out Chance (2 strikes) |
|--------|---------|----------------------|----------------------|
| 1st    | +0%     | 14%                  | 24%                  |
| 2nd    | +15%    | 29%                  | 39%                  |
| 3rd    | +30%    | 44%                  | 54%                  |
| 4th    | +45%    | 59%                  | 69%                  |

### 3. Contact Rescue Nerf

Current: `saveChance = batter.contact * 0.06` (max 60%)
New: `saveChance = batter.contact * 0.04` (max 40%)

Flat nerf — contact rescue was too generous regardless of pair count.

### 4. Visual Warning

On the hand description label, when player selects cards forming a Pair:

- **1st pair**: `"Pair -> Single"` (normal, no warning)
- **2nd pair**: `"Pair -> Single (Pitcher adjusting...)"` — yellow text
- **3rd pair**: `"Pair -> Single (Pitcher has your number!)"` — red/orange text
- **4th+ pair**: `"Pair -> Single (You're cooked!)"` — red text

Outcome message for 2nd+ pair outs: `"Groundout - pitcher had that read"`

Resets when the inning switches. No warning on non-pair hands.

### 5. What Doesn't Change

- Two Pair, Three of a Kind, and all higher hands are untouched
- High-rank bonus chips on pairs still apply
- Trait effects (adjacent_to_pair, upgrade_outcome) still work

## Files Changed (3 per platform, 6 total)

- `BaseballState.js` / `baseball_state.gd` — add + reset `pairsPlayedThisInning`
- `CardEngine.js` / `card_engine.gd` — apply penalty in `_applyRankQuality`, nerf contact rescue
- `GameScene.js` / `game_scene.gd` — show warning text on hand description label

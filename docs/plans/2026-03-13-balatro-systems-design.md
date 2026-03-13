# Balatro-Style Systems Expansion Design

> Risk/reward depth, game-breaking combos, and build-around strategy for Aces Loaded!

---

## Overview

Four interconnected systems that transform the game from "play poker, score runs" into a roguelike with meaningful build decisions, escalating power, and combo potential:

1. **Starter Trait Draft** -- every player picks a trait before inning 1
2. **Card Packs & Bonus Players** -- performance rewards that reshape your lineup
3. **Coaches & Mascots** -- passive Joker-style buffs (up to 4 slots)
4. **Player Synergies** -- set bonuses for lineup composition

---

## 1. Starter Trait Draft

### When
After team select, before inning 1.

### Screen
All 9 batters shown in lineup order. Each displays name, stats, and 2 trait options (A/B). Player taps one per batter. "Confirm Lineup" starts the game.

### Rules
- Trait assignments are **fixed per player** in team data (e.g., Moose Leblanc always offers Lead-Off King or Stolen Base)
- Traits match player archetype (power hitters get power traits, speedsters get speed traits)
- Uses the existing trait pool -- no new trait type needed
- Innate trait counts toward the 2-trait max (1 innate + 1 from shop)

### Example Assignments (Canada)

| Player | Option A | Option B |
|--------|----------|----------|
| Moose Leblanc (CF) | Lead-Off King | Stolen Base |
| Ace Tremblay (SS) | Contact Lens | Double McGee |
| Buck Fournier (1B) | Slugger Serum | Cleanup Crew |
| Bear Campbell (DH) | Eye of the Tiger | Hot Corner |
| Flash Bouchard (LF) | Rally Cap | Closer |
| Dusty Roy (3B) | Bunt Single | Dugout Fire |
| Hawk Sinclair (RF) | Extra Innings | Grand Ambition |
| Sparky Makinen (2B) | Pinch Hitter | Switch Hitter |
| Iron Mike Dumont (C) | Sacrifice Fly | Batting Gloves |

All 4 teams (36 batters) need unique A/B assignments.

### Trait Pool Target
- Current: ~20 batter traits, ~8 pitcher traits
- Target: 60+ batter traits at launch, expandable to 128+
- Enough variety for unique A/B pairs across all 36 batters plus a healthy shop rotation

---

## 2. Card Packs & Bonus Players

### Pack Triggers

| Tier | Trigger | Contents |
|------|---------|----------|
| Bronze Pack | 2+ runs in a half-inning | Pick 1 of 2 bonus players |
| Gold Pack | 4+ runs in a half-inning OR single at-bat worth 25+ chips | Pick 1 of 3 bonus players |

### Pack Opening
- Appears after batting half, before the shop (new scene: PackOpenScene)
- Cards face-down, flip to reveal, pick one
- Skip if max 3 bonus players already in lineup

### Bonus Player Design
Bonus players are enhanced generic archetypes (not team-affiliated). Each has:

- **Boosted stats** -- at least one stat at 8+
- **A fixed innate trait** -- always equipped, does NOT count toward 2-trait cap (so bonus players can hold innate + 2 shop traits = 3 total)
- **A passive lineup effect** -- Joker-like, applies to all batters while this player is in the lineup

### Example Bonus Players

| Name | Stats (P/C/S) | Innate Trait | Lineup Effect |
|------|----------------|-------------|---------------|
| "Knuckles" McBride | 9/4/5 | Cleanup Crew | All batters: +1 chip on doubles+ |
| Silk Santiago | 4/9/7 | Contact Lens | All batters: pair out chance -5% |
| Ghost Runner | 3/6/10 | Stolen Base | All batters: +5% extra base chance |
| Hammer Jones | 10/3/3 | Slugger Serum | Power hitters (8+): x1.5 mult |

### Roster Replacement
- Pick a bonus player -> choose which starter to bench
- Benched player is gone for the rest of the run
- Bonus player takes their lineup slot and position
- **Max 3 bonus players per run** -- keeps team identity intact

### Pool Size
- ~20 bonus players at launch, expandable
- Bronze draws from full pool
- Gold guarantees at least one with a rare innate trait

---

## 3. Coaches & Mascots

### Slots
- 4 total slots (shared between Coaches and Mascots, any mix)
- Start with 2 unlocked
- 3rd and 4th unlockable via specific Coaches, milestones, or Mascot effects

### Where to Buy
- Dugout Shop, separate tab/row from traits
- Own economy -- does NOT use the trait buy limit
- Can sell back for 50% price to free a slot

### Coaches (Steady, Predictable Buffs)
Common/uncommon rarity. Show up most innings.

| Coach | Price | Effect |
|-------|-------|--------|
| Batting Coach | 30 | All batters +1 contact |
| Power Coach | 30 | All batters +1 power |
| Base Coach | 25 | All batters +1 speed |
| Bench Coach | 35 | +1 discard per at-bat for all |
| Pitching Coach | 35 | Your pitcher: -8% hit chance |
| Equipment Manager | 40 | Unlock +1 Coach/Mascot slot |
| Scout | 25 | Shop shows 4 trait cards instead of 3 |
| Bullpen Coach | 30 | Pitcher fatigue starts 1 inning later |

### Mascots (Wild, Game-Breaking Effects)
Uncommon/rare rarity. ~1 offered every 2-3 shop visits.

| Mascot | Price | Effect |
|--------|-------|--------|
| Rally Moose | 45 | +5 mult on any at-bat when losing |
| Lucky Bat Dog | 40 | 15% chance a strikeout becomes a walk |
| Thunder Bear | 50 | Home Runs score double chips |
| Golden Glove Gorilla | 35 | Errors happen 3x more often (in your favor) |
| Card Shark Parrot | 45 | Draw 9 cards instead of 8 |
| Fireworks Fox | 40 | +3 mult for every run scored this inning |
| Voodoo Vulture | 50 | Opponent pitcher starts with +1 fatigue per Mascot owned |
| Ice Cream Vendor | 30 | Earn +5 bonus chips after every 3-out inning you pitch |

---

## 4. Player Synergies & Combos

### Concept
Certain combinations of players in the active lineup trigger passive bonuses. Shown on a Synergy tab/panel -- locked synergies display as "???" with hints.

### Handedness Combos

| Synergy | Requirement | Bonus |
|---------|-------------|-------|
| Switch Squad | 3+ lefty batters | +1 mult on all lefty at-bats |
| Balanced Lineup | 4L + 4R + 1 either | +2 chips on all at-bats |
| Southpaw Stack | 5+ lefty batters | Opponent pitcher -1 control |

### Stat Threshold Combos

| Synergy | Requirement | Bonus |
|---------|-------------|-------|
| Murderer's Row | 3 batters with 8+ power | +2 mult on Home Runs |
| Contact Factory | 3 batters with 8+ contact | Pair out chance -10% team-wide |
| Speed Demons | 3 batters with 8+ speed | Extra base chance +10% team-wide |
| Well-Rounded | All 9 batters no stat below 5 | +1 chip, +0.5 mult on all at-bats |

### Positional Combos

| Synergy | Requirement | Bonus |
|---------|-------------|-------|
| Strong Up the Middle | C, SS, 2B, CF all 7+ contact | -5% opponent hit chance |
| Corner Power | 1B + 3B both 8+ power | +3 chips on triples+ |

### Bonus Player Combos

| Synergy | Requirement | Bonus |
|---------|-------------|-------|
| Hired Guns | 2+ bonus players | Bonus players +1 to all stats |
| Mercenary Squad | 3 bonus players (max) | Gold packs offer 4 picks instead of 3 |

### Design Rules
- Synergies always visible (locked or unlocked) to encourage building toward them
- ~15 synergies at launch, expandable
- Bonus players count for synergy checks (stats, handedness, position)
- Synergies stack -- multiple can be active simultaneously
- Recalculated on any lineup change (bonus player added, etc.)

---

## 5. Updated Game Flow

```
Title Screen -> Team Select -> TRAIT DRAFT (new) -> [Inning Loop] -> Game Over

Trait Draft (one-time, before inning 1):
  - Show all 9 batters with A/B trait options
  - Pick 1 trait per batter
  - Confirm Lineup -> start game

Inning Loop (per inning):
  1. Player bats (GameScene)
     - Synergies active passively
     - Coach/Mascot effects active passively
     - Bonus player lineup effects active passively
     - Play until 3 outs
  2. PACK REWARD CHECK (new)
     - 2+ runs -> Bronze Pack (pick 1 of 2, bench a starter)
     - 4+ runs OR 25+ chip hand -> Gold Pack (pick 1 of 3)
     - Skip if 3 bonus players already owned
  3. Shop (ShopScene) -- expanded
     - Tab 1: Trait cards (existing, uses buy limit)
     - Tab 2: Coaches & Mascots (separate economy)
     - Synergy tracker visible
  4. Opponent bats (PitchingScene)
     - Coach/Mascot pitcher effects active
  5. Next inning (or Game Over after 9+)
```

### What Stays the Same
- Core card -> hand -> outcome -> chips loop
- Existing trait system (shop traits stack on innate)
- Pitching scene, ball-strike count, situational plays
- 9-inning structure, walk-off rules, extra innings

### New Scenes
- TraitDraftScene (between team select and inning 1)
- PackOpenScene (between batting and shop, conditional)

### New Data Files
- Innate trait pairs per player (in teams.js / teams.gd)
- Bonus players pool (bonus_players.js / bonus_players.gd)
- Coaches data (coaches.js / coaches.gd)
- Mascots data (mascots.js / mascots.gd)
- Synergies data (synergies.js / synergies.gd)

### Modified Files
- ShopScene -- add Coach/Mascot tab, synergy display
- GameScene -- apply Coach/Mascot/synergy/lineup effects
- PitchingScene -- apply Coach/Mascot pitcher effects
- BaseballState -- track bonus players, coaches, mascots, active synergies
- RosterManager -- support benching starters, bonus player slots
- EffectEngine -- process Coach/Mascot/synergy effects

---

## Balancing Notes

- Pack thresholds (2 runs / 4 runs / 25 chips) are tunable
- Bonus player max (3) prevents full roster replacement
- Coach/Mascot slot limit (4) caps passive power stacking
- Selling Coaches/Mascots at 50% enables mid-game pivots
- Synergy bonuses are modest (+1/+2 range) so they reward building without being mandatory
- Innate traits use existing balanced trait pool

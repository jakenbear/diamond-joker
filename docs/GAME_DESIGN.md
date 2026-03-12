# Aces Loaded! — Game Design Document

> A poker-baseball roguelike where you play poker hands to generate at-bats, manage a roster across 9 innings, and outscore your opponent.

---

## Game Overview

**Genre:** Roguelike Deckbuilder × Baseball Sim
**Engine:** Phaser 3 (web), Godot 4.6 (native)
**Resolution:** 1280×720
**Session Length:** ~20–30 minutes

You pick a national team, face an opponent across 9 innings. Each at-bat, you're dealt 8 cards—play a poker hand to determine the outcome. Better hands = better hits. Between innings, spend earned chips at the shop to equip trait cards that bend the rules in your favor.

---

## Game Flow

```
Title Screen → Team Select → [Inning Loop] → Game Over

Inning Loop (per inning):
  1. Player bats (GameScene) — play cards until 3 outs
  2. Shop (ShopScene) — buy trait cards with chips
  3. Opponent bats (PitchingScene) — pick pitches until 3 outs
  4. Next inning (or Game Over after 9+)
```

### End Conditions
- After 9 innings: highest score wins
- Tied after 9: extra innings until someone leads
- Walk-off: if player takes the lead in bottom of 9th+, instant win

---

## Card System

### Deck & Hand
| Parameter | Value |
|-----------|-------|
| Deck size | 52 (standard poker deck) |
| Hand size | 8 cards |
| Discards per at-bat | 2 |
| Cards played | 1–5 (selected from hand) |

When the deck runs low, the discard pile is reshuffled back in.

### Hand Rankings → Baseball Outcomes

| Hand | Baseball Outcome | Chips | Mult | Score |
|------|-----------------|-------|------|-------|
| Royal Flush | Perfect Game | 15 | 20 | 300 |
| Straight Flush | Walk-Off | 10 | 10 | 100 |
| Four of a Kind | Inside-the-Park HR | 6 | 6 | 36 |
| Flush | Grand Slam | 5 | 5 | 25 |
| Straight | Home Run | 4 | 4 | 16 |
| Full House | RBI Double | 3 | 2.5 | 7.5 |
| Three of a Kind | Triple | 3 | 3 | 9 |
| Two Pair | Double | 2 | 2 | 4 |
| Pair | Single | 1 | 1.5 | 1.5 |
| High Card | Strikeout | 0 | 1 | 0 |

**Score = floor(Chips × Mult)** — this becomes your chip income for the shop.

### Hand Evaluation Rules
- Straights and Flushes require exactly 5 cards
- Pairs, Two Pair, Three of a Kind, Four of a Kind, Full House work with fewer
- High Card is the fallback for anything that doesn't match

---

## Batting Mechanics

### At-Bat Flow
1. Draw 8 cards
2. Optionally discard (up to 2 times) to improve your hand
3. Select 1–5 cards and hit "Play Hand"
4. Hand is evaluated → baseball outcome determined
5. Batter/pitcher traits applied
6. Situational plays checked (double play, error, etc.)
7. Runners advance, runs score, chips earned
8. Next batter (9-player lineup cycles)

### Rank Quality — The Pair Gamble

Pairs, Two Pair, and Three of a Kind aren't guaranteed hits. Lower-rank cards have a higher chance of becoming outs:

**Pair out chance:**
```
outChance = 0.80 - (pairRank - 2) × 0.06 + twoStrikePenalty + pairPenalty
```

| Pair Rank | Base Out % | Survives |
|-----------|-----------|----------|
| 2s | 80% | 20% |
| 5s | 62% | 38% |
| 8s | 44% | 56% |
| 10s | 32% | 68% |
| Kings | 14% | 86% |
| Aces | 8% | 92% |

- Two-strike penalty: +10%
- Face card pairs (10+): bonus chips = pairRank - 9

**Two Pair:** 20% out chance on low pairs (2–5). 50/50 groundout/flyout.
**Three of a Kind:** 10% out chance on low ranks. Always flyout on failure.

### "Pitcher Adjusts" — Pair Degradation

The more pairs you play in a single inning, the worse they get. The pitcher reads your strategy.

| Pair # This Inning | Extra Out Chance |
|--------------------|-----------------|
| 1st | +0% |
| 2nd | +15% |
| 3rd | +30% |
| 4th+ | +45% |

Capped at 95% max out chance. Resets each half-inning.

**Visual warnings** appear on the hand description:
- 2nd pair: *"Pitcher adjusting..."* (yellow)
- 3rd pair: *"Pitcher has your number!"* (red)
- 4th+ pair: *"You're cooked!"* (red)

### Contact Rescue

When a pair becomes a groundout, the batter's Contact stat can save it:
```
saveChance = batter.contact × 0.04
```
A contact-10 batter rescues 40% of failed pairs back to singles.

### Batter Stat Bonuses (On Hit)
- **Power:** +max(0, power - 5) bonus chips
- **Contact:** +contact/10 bonus mult
- **Speed:** speed × 5% chance for an extra base

---

## Ball-Strike Count

Each discard = 1 pitch thrown at you.

```
ballChance = max(0, (7 - pitcherControl) × 0.08)
```

| Pitcher Control | Ball % per Pitch |
|-----------------|-----------------|
| 1 | 48% |
| 3 | 32% |
| 5 | 16% |
| 7+ | 0% |

- 4 balls = walk (free base, no hand evaluation)
- Strikes cap at 2 (fouls protect you after that)

### Count Modifiers

Your ball-strike count affects chip/mult bonuses:

| Count | Chips | Mult |
|-------|-------|------|
| 3-0 | +2 | +1.0 |
| 2-0 | +1 | +0.5 |
| 3-1 | +1 | +0.5 |
| 3-2 | 0 | +0.5 |
| 0-1 | 0 | -0.2 |
| 1-2 | 0 | -0.3 |
| 0-2 | -1 | -0.5 |

Being ahead in the count rewards patience. Behind = penalized.

---

## Pitching (Opponent Half-Inning)

### Player Controls the Pitcher
You pick from 4 pitches in your pitcher's repertoire. Each pitch type has different trade-offs:

| Pitch | Hit Mod | K Mult | XBH Mult | Stamina | Best For |
|-------|---------|--------|----------|---------|----------|
| Fastball | -3% | 1.15 | 1.4 | 0.06 | Strikeouts (but risky XBH) |
| Breaking | -5% | 1.0 | 0.8 | 0.04 | Hardest to hit, walk risk |
| Changeup | 0% | 0.95 | 0.6 | 0.02 | Efficient, limits power |
| Slider | -2% | 1.05 | 0.5 | 0.03 | Groundball inducer |
| Cutter | -3% | 1.08 | 0.7 | 0.04 | Balanced power pitch |
| Curveball | -4% | 1.1 | 0.5 | 0.04 | High K, shuts down power |
| Sinker | +1% | 0.85 | 0.3 | 0.03 | Weak contact, hittable |
| Splitter | -4% | 1.2 | 0.9 | 0.05 | Elite K but expensive |
| Two-Seam | -1% | 0.9 | 0.4 | 0.03 | Movement specialist |
| Knuckleball | -6% | 1.0 | 1.2 | 0.01 | Unpredictable, cheap |
| Screwball | -5% | 1.05 | 0.6 | 0.05 | Rare reverse break |
| Palmball | -1% | 0.9 | 0.4 | 0.02 | Safe slow pitch |

Plus **IBB** (Intentional Walk) — automatic walk, no at-bat.

### Hit Probability Formula
```
pitchStrength = (velocity × 0.6 + control × 0.4) × fatigue
batStrength   = contact × 0.6 + power × 0.4
matchup       = batStrength - pitchStrength
baseHitChance = clamp(0.28 + matchup × 0.025, 0.12, 0.50)
hitChance     = clamp(baseHitChance + pitch.hitChanceMod, 0.05, 0.50)
```

### Pitcher Fatigue
```
fatigueStart = max(3, stamina - 1)
fatigue = inning ≤ fatigueStart ? 1.0 : max(0.5, 1.0 - (inning - fatigueStart) × 0.08)
```

| Stamina | Fresh Through | Fades After |
|---------|--------------|-------------|
| 3 | Inning 2 | Inning 3 |
| 5 | Inning 4 | Inning 5 |
| 8 | Inning 7 | Inning 8 |

### Pitch Repertoire Assignment

Based on pitcher stats, 4 pitches are auto-assigned:
- **V ≥ 10:** fastball, splitter, slider, cutter (power arm)
- **C ≥ 9:** sinker, curveball, palmball, cutter (precision)
- **V ≤ 5 & C ≤ 5:** knuckleball, screwball, palmball, changeup (junkballer)
- **Default:** fastball, slider, changeup, breaking

### Breaking Ball Walk Risk
```
walkChance = max(0, (6 - control) × 0.04)
```
Low-control pitchers risk walks when throwing breaking balls.

---

## Roster System

### Teams
4 national teams, each with 9 batters + 5 pitchers:
- **Canada**, **USA**, **Japan**, **Mexico**

### Player Stats (1–10 scale)

**Batters:**
| Stat | Effect |
|------|--------|
| Power | Bonus chips on hits, XBH chance |
| Contact | Bonus mult on hits, pair rescue chance |
| Speed | Extra base chance, DP escape |

**Pitchers:**
| Stat | Effect |
|------|--------|
| Velocity | Hit chance reduction, strikeout type |
| Control | Walk/wild pitch prevention, hit chance |
| Stamina | Fatigue start threshold, durability |

### Lineup Cycling
- 9 batters cycle in order, wrapping around
- Same for opponent lineup during PitchingScene

---

## Trait System

### How It Works
1. Buy trait cards at the shop with chips
2. Assign to a specific player on your roster
3. Each player holds max 2 traits
4. Traits activate automatically during at-bats

### Trait Phases
- **Pre-eval:** Modifies cards before hand evaluation (e.g., making adjacent ranks count as pairs)
- **Post-eval:** Modifies the result after evaluation (e.g., +mult, outcome upgrades)

### Rarity & Pricing

| Rarity | Weight | Price |
|--------|--------|-------|
| Common | 3× | 20–25 chips |
| Uncommon | 2× | 25–35 chips |
| Rare | 1× | 35–45 chips |

### Batter Traits

#### Pre-Eval
| Trait | Rarity | Price | Effect |
|-------|--------|-------|--------|
| Double McGee | Common | 30 | Adjacent ranks count as a pair (e.g., 5-6) |
| Ace in the Hole | Rare | 35 | Aces are wild for straights |
| Switch Hitter | Uncommon | 30 | Suit colors count as matching for flushes |
| Pinch Hitter | Uncommon | 25 | 20% chance to upgrade lowest card by +3 ranks |

#### Post-Eval
| Trait | Rarity | Price | Effect |
|-------|--------|-------|--------|
| Slugger Serum | Rare | 40 | Pairs upgrade to Doubles (+1 chip, +0.5 mult) |
| Eye of the Tiger | Common | 25 | +3 mult with 2 outs |
| Contact Lens | Common | 20 | Low pairs never become groundouts |
| Sacrifice Fly | Uncommon | 25 | Strikeouts with runner on 3rd score a run |
| Hot Corner | Common | 20 | +2 chips per runner on base |
| Closer | Uncommon | 30 | +5 mult in innings 7–9 |
| Stolen Base | Uncommon | 25 | Runner on 1st auto-advances before at-bat |
| Grand Ambition | Rare | 45 | +10 mult when bases loaded |
| Batting Gloves | Uncommon | 35 | +1 discard per at-bat (2 → 3) |
| Rally Cap | Uncommon | 30 | +4 mult when losing by 2+ runs |
| Bunt Single | Common | 20 | High Card becomes weak single (1 chip, 1 mult) |
| Cleanup Crew | Common | 25 | +3 chips on Three of a Kind or better |
| Walk Machine | Rare | 40 | Every at-bat starts with 1 ball (1-0 count) |
| Dugout Fire | Uncommon | 30 | +2 mult per out this inning |
| Lead-Off King | Common | 20 | +3 mult as first batter of inning |
| Extra Innings | Rare | 35 | +6 mult in innings 8–9 |

### Pitcher Traits (Opponent's)

These are assigned to the opposing pitcher and affect YOUR at-bats:

| Trait | Effect |
|-------|--------|
| Heater | Low pairs auto-groundout; triples+ get +2 chips |
| Curveball | 30% chance highest card loses 3 ranks |
| Slider | -1 mult on all hands; -2 mult with 2 outs |
| Knuckleball | Face cards (J/Q/K) lose 2 ranks |
| Intimidation | -2 mult at 0 outs; +2 mult at 2 outs |
| Painted Corner | High pairs/two pair get -1 chip |
| Changeup | 25% chance two cards swap ranks |
| Closer's Instinct | -3 mult in innings 7–9 |

---

## Situational Plays

These trigger automatically based on game state:

### Double Play
- **When:** Groundout + runner on 1st + outs < 2
- **Chance:** max(5%, 35% - speed × 3%)
- **Result:** 2 outs, runner on 1st removed

### Fielder's Choice
- **When:** Groundout + runner on 1st (if DP didn't trigger)
- **Chance:** 40%
- **Result:** Lead runner out, batter safe on 1st

### Error
- **When:** Any out
- **Chance:** 4% + max(0, (inning - 6) × 1%)
- **Result:** Out → Single (batter reaches 1st)

### Dropped Third Strike
- **When:** Strikeout + 1st base empty
- **Chance:** 5% + speed × 1%
- **Result:** Strikeout → batter reaches 1st

### Wild Pitch
- **When:** Discard with runners on base
- **Chance:** max(0, (6 - pitcherControl) × 2%)
- **Result:** Lead runner advances 1 base

### Hit By Pitch
- **When:** Start of at-bat
- **Chance:** max(0, (5 - pitcherControl) × 1.5%)
- **Result:** Batter awarded 1st base

---

## Shop System

### When It Appears
After your batting half, before opponent bats. Once per inning, innings 1–9.

### Buy Limits

| Innings | Max Buys |
|---------|----------|
| 1–3 | 1 |
| 4–6 | 2 |
| 7–9 | 3 |

### Flow
1. 3 random trait cards displayed (weighted by rarity)
2. Buy a card → assign to a roster player (max 2 traits each)
3. Chips deducted, shop refreshes if buys remain
4. Hit "Done" to continue to opponent's half

No duplicate traits offered (already-owned traits excluded).

---

## Chip Economy

### Earning
- Every at-bat: floor(chips × mult) from the played hand
- Bonuses from batter stats, count modifiers, trait effects

### Spending
- Trait cards at the shop (20–45 chips each)
- Chips persist across the entire game (not reset per inning)

### Rough Progression
- Innings 1–3: ~50–75 chips (enough for 1 trait)
- Innings 4–6: ~100–150 chips (equip 2–3 players)
- Innings 7–9: ~150–250 chips (build synergies)

---

## Deck Variants (Available)

| Variant | Cards | Discards | Description |
|---------|-------|----------|-------------|
| Standard | 52 | 2 | Full poker deck |
| No Face | 40 | 2 | No J/Q/K — tighter straights |
| Double | 104 | 3 | Two decks shuffled together |
| All Hearts | ~52 | 2 | All hearts — flushes guaranteed |
| Small Ball | 32 | 2 | Only 7+ ranks — high-value hands |

---

## Runner Advancement

| Outcome | 1st → | 2nd → | 3rd → | Batter → |
|---------|-------|-------|-------|----------|
| Single | 2nd | 3rd (scores if speed) | Scores | 1st |
| Double | 3rd | Scores | Scores | 2nd |
| Triple | Scores | Scores | Scores | 3rd |
| Home Run | Scores | Scores | Scores | Scores |
| Walk | 2nd (if forced) | 3rd (if forced) | Scores (if forced) | 1st |

3 outs = bases clear, side retires.

---

## Balancing Levers

Key parameters to tune:

| Lever | Current Value | Effect |
|-------|--------------|--------|
| Hand size | 8 | More cards = more hand options |
| Discards | 2 | Discard depth for hand improvement |
| Pair out base | 80% - rank×6% | How risky pairs feel |
| Pitcher adjusts | +15% per pair | Diminishing returns on pairs |
| Contact rescue | contact × 4% | Pair safety net |
| Shop buy limits | 1/2/3 | Trait accumulation rate |
| Fatigue rate | 8% per inning past threshold | Late-game pitcher decay |
| Error base | 4% | Comeback potential |

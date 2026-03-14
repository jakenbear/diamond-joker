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
| Discards | Unlimited (count-based — see Count System) |
| Cards played | 1–5 (selected from hand) |

When the deck runs low, the discard pile is reshuffled back in.

### Hand Rankings → Baseball Outcomes

| Hand | Baseball Outcome | Chips | Mult | Score |
|------|-----------------|-------|------|-------|
| Royal Flush | Home Run (guaranteed) | 15 | 20 | 300 |
| Straight Flush | 80% HR / 15% Triple / 5% Double | 10 | 10 | 100 |
| Four of a Kind | Triple | 6 | 6 | 36 |
| Flush | Double | 5 | 5 | 25 |
| Straight | Home Run | 4 | 4 | 16 |
| Full House | Double | 3 | 2.5 | 7.5 |
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
1. Draw 8 cards (count starts at 0-0, or 1-0 with Walk Machine)
2. Optionally discard to improve your hand — each discard is a pitch (see Count System)
   - STRIKE: count advances toward strikeout
   - BALL: count advances toward walk
   - FOUL: (at 2 strikes only) count stays, you survive
3. If count reaches 4 balls → Walk (free base, skip to step 7)
4. If count reaches 3 strikes → Strikeout (at-bat over, skip to step 7)
5. Select 1–5 cards and hit "Play Hand" at any point during the count
6. Hand is evaluated → baseball outcome determined
7. Batter/pitcher traits applied
8. Situational plays checked (double play, error, etc.)
9. Runners advance, runs score, chips earned
10. Next batter (9-player lineup cycles)

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

## Count-Based Discard System

The ball-strike count IS the discard system. There is no hard discard limit — the count is your limiter. Each discard simulates a pitch, creating real risk/reward tension.

### Core Rules
- Each DISCARD = a pitch is thrown → results in STRIKE, BALL, or FOUL
- **3 strikes** → Strikeout (at-bat over, no hand played)
- **4 balls** → Walk (batter takes first base, no hand played)
- You can PLAY your hand at any point during the count
- Count starts at 0-0 (unless modified by traits)

### Pitch Outcome Probability

**Before 2 strikes** — two outcomes (STRIKE or BALL):

```
strikeChance = 0.40
  + (pitcherVelocity - 5) × 0.02     // high-velo pitchers throw more strikes
  + (pitcherControl - 5) × 0.02      // high-control pitchers hit the zone
  - (batterContact - 5) × 0.03       // high-contact batters lay off bad pitches
strikeChance = clamp(strikeChance, 0.15, 0.65)
ballChance = 1.0 - strikeChance
```

**At 2 strikes** — three outcomes (FOUL, STRIKE, or BALL):

```
foulChance = batterContact × 0.04     // high-contact batters foul off to survive
remaining = 1.0 - foulChance
strikeChance = remaining × (base strikeChance from above)
ballChance = remaining × (1.0 - base strikeChance)
```

### Probability Examples

| Batter CNT | Pitcher VEL/CTL | Strike % | Foul % (at 2K) | Feel |
|------------|-----------------|----------|-----------------|------|
| 5 vs 5/5 | 40% | 20% | Average matchup |
| 9 vs 5/5 | 28% | 36% | Safe to discard |
| 3 vs 8/7 | 52% | 12% | Very risky |
| 7 vs 6/5 | 36% | 28% | Manageable |
| 5 vs 9/8 | 48% | 20% | Tough pitcher |

### Strategic Scenarios

| Count | Situation | Decision |
|-------|-----------|----------|
| 0-0 | Bad hand | Discard freely, low risk |
| 1-1 | Mediocre hand | Depends on batter contact |
| 0-2 | Need better hand | Very risky — only if batter has high contact (fouls) |
| 3-0 | Decent hand | Consider discarding for the walk |
| 3-2 | Full count | All or nothing — play your hand or gamble on one more |
| 2-0 | Good hand | Play it — you're ahead in the count |

### Count Modifiers (Chip/Mult Bonuses)

Your count when you PLAY the hand affects scoring:

| Count | Chips | Mult | Notes |
|-------|-------|------|-------|
| 3-0 | +2 | +1.0 | Patient eye rewarded |
| 2-0 | +1 | +0.5 | Ahead in count |
| 3-1 | +1 | +0.5 | Hitter's count |
| 3-2 | 0 | +0.5 | Full count drama |
| 0-1 | 0 | -0.2 | Slightly behind |
| 1-2 | 0 | -0.3 | Pitcher's count |
| 0-2 | -1 | -0.5 | In the hole |

### Interaction with Existing Systems

| System | How It Interacts |
|--------|-----------------|
| **Walk Machine trait** | Starts count at 1-0 (one free ball) |
| **"Free take" traits** (Batting Gloves, Fresh Cleats, Bench Coach) | Grant free discards that don't add to count |
| **Nine Lives mascot** | First strikeout-by-count each inning triggers redraw |
| **Contact stat** | Higher contact = more fouls at 2 strikes = safer discarding |
| **Opponent pitcher stats** | Their velocity/control affect YOUR discard risk |
| **Bunt Single / Foul Fighter traits** | Still convert High Cards, but now you might not need to discard at all |

### UI Display
- Count shown near batter panel as dots/circles (balls = green, strikes = red)
- DISCARD button shows current count and risk level:
  - **Green** (0 strikes): "DISCARD (0-0)"
  - **Yellow** (1 strike): "DISCARD (1-1)"
  - **Red** (2 strikes): "DISCARD (0-2) DANGER"
- Strike/ball/foul result flashes on screen after each discard
- New cards dealt after discard animation

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

## Pitching Showdown (Hold'em Style)

When the opponent bats, each at-bat is a **Texas Hold'em-style poker showdown** between your pitcher and the opposing batter.

### Setup
- Pitcher gets 2 hole cards from a velocity-scaled deck (higher velocity = higher rank cards)
- Batter gets 2 hidden hole cards from a contact/power-scaled deck
- Player sees their hole cards and the batter's stats

### Three Stages
1. **Flop** — 3 community cards revealed. Player picks a pitch ability.
2. **Turn** — 4th community card. Player picks another pitch ability.
3. **River** — 5th community card. Player picks final pitch ability.

Each pitch in the pitcher's 4-pitch repertoire is a **board manipulation ability** (one use per at-bat):

| Pitch | Effect |
|-------|--------|
| Fastball | Swap hole card from top 30% of deck |
| Breaking Ball | Flip community card face-down |
| Changeup | Peek at batter hole card |
| Slider | Replace a community card |
| Cutter | Lock a card (immune to effects) |
| Curveball | Downgrade batter's best card -2 rank (control check) |
| Sinker | All community cards -1 rank |
| Splitter | Destroy a community card |
| Two-Seam | Shift a card's suit to match majority |
| Knuckleball | Randomize a community card |
| Screwball | Replace a batter hole card |
| Palmball | Hide next community card from batter |

### Resolution
Best 5-card hand from each side (2 hole + 5 community). Winner determined by hand score:
- **Pitcher wins** → Out (Strikeout / Flyout / Groundout based on margin)
- **Batter wins** → Hit (Single / Double / Triple / HR based on margin)
- **Tie** → Groundout (pitcher favored)

### Pitcher Stats
- **Velocity** → Deck quality (higher ranks)
- **Control** → Pitch effect accuracy
- **Stamina** → Deck degrades across at-bats (top cards removed)

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

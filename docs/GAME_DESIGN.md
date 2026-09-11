# Aces Loaded! — Game Design Document

> A poker-baseball roguelike where you play poker hands to generate at-bats, manage a roster across 9 innings, and outscore your opponent.

---

## Game Overview

**Genre:** Roguelike Deckbuilder × Baseball Sim
**Engine:** Phaser 3 (web), Godot 4.6 (native)
**Resolution:** 1280×720
**Session Length:** ~20–30 minutes

You pick a national team, face an opponent across 9 innings. Each at-bat, you're dealt 8 cards—play a poker hand to determine the outcome. Better hands = better hits. Between innings, spend earned peanuts at the shop to equip trait cards that bend the rules in your favor.

---

## Game Flow

```
Title Screen → Team Select → [Inning Loop] → Game Over

Inning Loop (per inning):
  1. Player bats (GameScene) — play cards until 3 outs
  2. Shop (ShopScene) — buy trait cards with peanuts
  3. Opponent bats (PitchingScene) — pick pitches until 3 outs
  4. Next inning (or Game Over after 9+)
```

### End Conditions
- **Game length** is chosen at Team Select: **3, 5, 7, or 9 innings** (default 9).
- After the chosen number of innings: highest score wins
- Tied after regulation: extra innings until someone leads
- The **player is the away team** and bats in the top half of every inning; the opponent (home team) bats last (bottom half). Real-baseball final-inning rules apply:
  - **Player trailing after their final top half →** the home team has already won and does **not** bat. Game ends immediately (opponent win). This mirrors the home team not needing to bat in the bottom of the 9th.
  - **Player tied or ahead after their final top half →** the opponent bats their bottom half:
    - **Opponent takes the lead →** instant **walk-off** (opponent win), their half ends the moment they go ahead.
    - **Opponent ties the game →** extra innings.
    - **Opponent falls short →** game over, player wins.
- Only the *opponent* can walk off, since they bat last. The player can never walk off — taking the lead in the top half always leaves the opponent a turn to respond.

### Innings Played (Box Score)
The end-of-game screen reports **innings actually played**, counted from the per-inning
run arrays (`playerRunsByInning` / `opponentRunsByInning`) rather than the live `inning`
counter. The counter advances past the last played inning as part of the half-inning
transition, so reading it directly reported one inning too many — a 3-inning game decided
in the 4th claimed "5 innings played" beside a 4-column linescore. Every half-inning that
is played pushes exactly one entry, including the final top half of a game that ends with
the player trailing (where the opponent never bats).

---

## Card System

### Deck & Hand
| Parameter | Value |
|-----------|-------|
| Deck size | 52 (standard poker deck) |
| Hand size | 7 cards |
| Discards | Unlimited (count-based — see Count System) |
| Cards played | 1–5 (selected from hand) |

When the deck runs low, the discard pile is reshuffled back in.

### Hand Rankings → Baseball Outcomes

Listed strongest to weakest. The ladder is **monotonic**: going down the table, neither the score nor the outcome ever improves — a rarer hand never pays less than a more common one.

| Hand | Baseball Outcome | Peanuts | Mult | Score |
|------|-----------------|-------|------|-------|
| Royal Flush | Home Run (guaranteed) | 15 | 20 | 300 |
| Straight Flush | 85% HR / 15% Triple | 10 | 10 | 100 |
| Four of a Kind | Home Run | 10 | 6 | 60 |
| Full House | Home Run | 8 | 5 | 40 |
| Flush | Double | 5 | 5 | 25 |
| Straight | Double | 4 | 4 | 16 |
| Three of a Kind | Double | 3 | 3 | 9 |
| Two Pair | Single | 2 | 2 | 4 |
| Pair | Single | 1 | 1.5 | 1.5 |
| High Card | Strikeout | 0 | 1 | 0 |

**Score = floor(Peanuts × Mult)** — this becomes your peanut income for the shop.

**Monotonicity is an invariant, not a coincidence.** It is enforced by tests in `test/sim.js`. When rebalancing, keep both `peanuts × mult` and the outcome's base value non-increasing down the table. (Previously a Straight paid a Home Run while Four of a Kind paid only a Triple, and a Full House scored 7.5 against a Flush's 25 — so building a stronger hand could actively cost you.)

### The Triple Is Sacred

In real baseball a triple is the **rarest hit** — rarer than a home run, and the play
that gets a crowd on its feet. The outcome mapping protects that.

Three narrow paths produce a triple on a player at-bat:

1. **Stretch Triple** — `SituationalEngine._checkStretchTriple` turns a Double into a
   Triple. Chance is `15% + (speed - 5) * 3.5%`, floored at 4%. This is the main path.
2. **Straight Flush roll** — 15% of Straight Flushes become a Triple instead of a HR.
3. **Leg It Out** trait — upgrades a Double to a Triple on a Straight.

**No hand class maps directly to Triple.** That is a design constraint, not a tuning
value. Flush and Straight used to, and because both are common in a 7-card draw, triples
ran at ~6.9% of at-bats against a real-world ~0.5% — they were the second-most-common hit
and nearly 3× more frequent than home runs, which drained them of all drama.

The stretch is deliberately driven by **speed, not power**: legging out a triple is a
wheels play, whereas power turns a would-be triple into a home run. This is what makes
the speed stat matter at the plate.

Measured profile per at-bat, no traits or staff, speed-5 batter:

| Outcome | Ours | MLB |
|---------|------|-----|
| Single | 25.0% | 14.6% |
| Double | 8.6% | 4.5% |
| Triple | 1.7% | 0.5% |
| Home Run | 2.8% | 3.2% |
| Strikeout | 15.6% | 22.4% |
| Groundout / Flyout | 42.9% | 44% |
| Error / Dropped 3rd K | 3.5% | — |

Triples by speed: **0.4%** at speed 1, **1.6%** at speed 5, **3.3%** at speed 10 — roughly
a 9× swing, so a burner is worth building around. The overall 1.7% is ~3× the real-world
rate on purpose: a triple is the most exciting hit in baseball, and at true MLB frequency
a player would essentially never see one. It is still the rarest hit in the game.

Batting average sits near .415 — well above MLB. **That is intentional.** Scoring is the
fun of this game; the goal is a baseball-shaped *distribution* of hits, not a suppressed
one. Do not "fix" the hit rate without a deliberate decision to reduce offense.

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
9. Runners advance, runs score, peanuts earned
10. Next batter (9-player lineup cycles)

### Rank Quality — Every Hand Is a Gamble

All hands below Four of a Kind have an out chance. Only Four of a Kind, Straight Flush, and Royal Flush are guaranteed hits. All tuning values live in `data/balance.js`.

**Pair out chance:**
```
outChance = 0.95 - (pairRank - 2) × 0.03 + twoStrikePenalty + pairPenalty
```

| Pair Rank | Base Out % | Survives |
|-----------|-----------|----------|
| 2s | 95% | 5% |
| 5s | 86% | 14% |
| 8s | 77% | 23% |
| 10s | 71% | 29% |
| Kings | 62% | 38% |
| Aces | 59% | 41% |

- Two-strike penalty: +10%
- Face card pairs (10+): bonus peanuts = pairRank - 9

**Two Pair:** 65% base out chance. Pair penalty stacks at half rate (+12%/pair).
**Three of a Kind:** 45% base out chance.
**Straight / Flush:** 20% base out chance.
**Full House:** 15% base out chance.
**Four of a Kind+:** 0% out chance (guaranteed hits — reward for building strong hands).

### "Pitcher Adjusts" — Universal Hand Degradation

The more you play the same hand type in a single inning, the worse it gets. The pitcher reads your strategy. Each hand type is tracked independently.

| # This Inning | Pair (+) | Two Pair (+) | Three of a Kind (+) | Straight (+) | Flush (+) |
|----------------|----------|-------------|---------------------|-------------|-----------|
| 1st | +0% | +0% | +0% | +0% | +0% |
| 2nd | +25% | +12% | +15% | +20% | +20% |
| 3rd | +50% | +24% | +30% | +40% | +40% |
| 4th+ | +75% | +36% | +45% | +60% | +60% |

Capped at 95% max out chance. Resets each half-inning.

**Hand preview** shows exact success percentage, color-coded:
- `Pair of Kings → Single (62%)` — green (≥70%), gold (40–69%), orange (20–39%), red (<20%)
- Percentage accounts for pitcher adjusts degradation automatically
- Guaranteed hands (Four of a Kind+) show no percentage
- If an opponent pitcher trait alters your cards before evaluation (e.g. Knuckleball, Sinker), the preview shows the **post-tamper** hand plus a `⚠ <TraitName>` tag so you know why. Chance-based pitcher/batter card traits are decided once per at-bat, so the preview always matches the actual play (no flicker). The survive/out roll remains uncertain — the preview only ever shows it as a percentage.

### Contact Rescue

When a pair becomes a groundout, the batter's Contact stat can save it:
```
saveChance = batter.contact × 0.04
```
A contact-10 batter rescues 40% of failed pairs back to singles.

### Batter Stat Bonuses (On Hit)
- **Power:** +max(0, power - 5) bonus peanuts
- **Contact:** +contact/10 bonus mult
- **Speed:** speed × 5% chance for an extra base **on Singles**

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
strikeChance = 0.55
  + (pitcherVelocity - 5) × 0.02     // high-velo pitchers throw more strikes
  + (pitcherControl - 5) × 0.02      // high-control pitchers hit the zone
  - (batterContact - 5) × 0.03       // high-contact batters lay off bad pitches
strikeChance = clamp(strikeChance, 0.25, 0.75)
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

| Count | Peanuts | Mult | Notes |
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
| Power | Bonus peanuts on hits, XBH chance |
| Contact | Bonus mult on hits, pair rescue chance |
| Speed | Extra base chance, DP escape |

**Pitchers:**
| Stat | Effect |
|------|--------|
| Velocity | Hit chance reduction, strikeout type |
| Control | Walk/wild pitch prevention, hit chance |
| Stamina | Fatigue start threshold, durability |

### Stat Display
Internal stats (1-10) are converted to baseball-style display values:
- **contact** → **AVG** (.150–.400 range, ±.015 jitter per player name)
- **power** → **HR** (0–60 range, ±3 jitter per player name)
- **speed** → **SB** (0–80 range, ±4 jitter per player name)

Jitter is seeded from player name for deterministic, unique values.
Internal math always uses raw 1-10 values.

### Lineup Cycling
- 9 batters cycle in order, wrapping around
- Same for opponent lineup during PitchingScene

---

## Trait System

### How It Works
1. Buy trait cards at the shop with peanuts
2. Assign to a specific player on your roster
3. Each player holds max 2 traits
4. Traits activate automatically during at-bats

### Trait Phases
- **Pre-eval:** Modifies cards before hand evaluation (e.g., making adjacent ranks count as pairs)
- **Post-eval:** Modifies the result after evaluation (e.g., +mult, outcome upgrades)

### Inning Windows Scale With Game Length

Trait conditions are authored as `{ type: 'inning_range', min, max }` against a
**9-inning canvas** — "innings 7-9" means *the last third of the game*, not literally
innings 7 through 9. At any other game length the window is rescaled proportionally, so
a late-game trait is always live for roughly the final third no matter how long the game
is.

Without this, every window above the chosen length was a **dead card**: a 3-inning game
would offer "Closer: +5 mult in innings 7-9" for 35 peanuts and it could never fire.

| Authored | 9 inn | 7 inn | 5 inn | 3 inn |
|----------|-------|-------|-------|-------|
| 7-9 (last third) | 7-9 | 5-7 | 4-5 | 3 |
| 8-9 (last two)   | 8-9 | 6-7 | 4-5 | 3 |
| 9 (final only)   | 9 | 7 | 5 | 3 |
| 7 (single, mid-late) | 7 | 5-6 | 4 | 3 |
| 4-6 (middle third) | 4-6 | 3-5 | 2-4 | 2 |
| 1-3 (first third) | 1-3 | 1-3 | 1-2 | 1 |

Rules:
- A window whose `max` reaches 9 stays **open-ended**, so it also covers extra innings.
  A "Closer" trait fires in the 12th inning of a tied game, as it should.
- A window never collapses to nothing — `min` is clamped so it can always fire at least
  one inning.
- Trait **descriptions are rewritten to match** the actual game length, so the card never
  promises a window it won't honour.

### Rarity & Pricing

| Rarity | Weight | Price |
|--------|--------|-------|
| Common | 3× | 20–25 peanuts |
| Uncommon | 2× | 25–35 peanuts |
| Rare | 1× | 35–45 peanuts |

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
| Hot Corner | Common | 20 | +2 peanuts per runner on base |
| Closer | Uncommon | 30 | +5 mult in innings 7–9 |
| Stolen Base | Uncommon | 25 | Runner on 1st auto-advances before at-bat |
| Grand Ambition | Rare | 45 | +10 mult when bases loaded |
| Batting Gloves | Uncommon | 35 | +1 discard per at-bat (2 → 3) |
| Rally Cap | Uncommon | 30 | +4 mult when losing by 2+ runs |
| Bunt Single | Common | 20 | High Card becomes weak single (1 chip, 1 mult) |
| Cleanup Crew | Common | 25 | +3 peanuts on Three of a Kind or better |
| Walk Machine | Rare | 40 | Every at-bat starts with 1 ball (1-0 count) |
| Dugout Fire | Uncommon | 30 | +2 mult per out this inning |
| Lead-Off King | Common | 20 | +3 mult as first batter of inning |
| Extra Innings | Rare | 35 | +6 mult in innings 8–9 |

### Pitcher Traits (Opponent's)

These are assigned to the opposing pitcher and affect YOUR at-bats:

| Trait | Rarity | Effect |
|-------|--------|--------|
| Heater | Common | Low pairs auto-groundout; triples+ get +2 peanuts |
| Curveball | Uncommon | 30% chance highest card loses 3 ranks |
| Slider | Common | -1 mult on all hands; -2 mult with 2 outs |
| Knuckleball | Uncommon | Face cards (J/Q/K) lose 2 ranks |
| Intimidation | Common | -2 mult at 0 outs; +2 mult at 2 outs |
| Painted Corner | Uncommon | High pairs/two pair get -1 peanut |
| Changeup | Rare | 25% chance two cards swap ranks |
| Closer's Instinct | Rare | -3 mult in innings 7–9 |
| Sinker | Common | 40% chance highest card loses 2 ranks |
| Cutter | Common | -1 peanut on all hits |
| Sinkerballer | Common | Pairs/Two Pair -2 mult; Straights/Flushes +2 peanuts |
| Fireballer | Common | -2 mult in innings 1–3 |
| Backfoot Slider | Common | Face cards lose 1 rank |
| Junkballer | Uncommon | All mult capped at 4; every hit +1 peanut |
| Bulldog | Uncommon | -3 mult when you have the lead |
| Wild Thing | Uncommon | 50% chance two cards swap ranks |
| Splitter | Uncommon | Three of a Kind+ get -2 mult |
| Escape Artist | Uncommon | Bases loaded -5 mult; bases empty +1 mult |
| Frontline Ace | Rare | All mult scaled to 75% |
| Rally Killer | Rare | Runners on base -4 mult; bases empty +2 peanuts |

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

### Force Play on Groundout
- **When:** Groundout + runner on 1st (when DP and FC don't trigger)
- **Result:** All forced runners advance one base (batter is out at 1st). Bases loaded groundout can score a run from 3rd.
- **Exception:** If the groundout is the **3rd out**, the inning ends the instant the batter is retired at first — no runners advance and no runs score (MLB rule 5.08(a)).

### Productive Groundout
- **When:** Groundout + runner on 2nd or 3rd + outs < 2 (and no DP/FC triggered)
- **Chance:** 40% + speed × 3%
- **Result:** Each runner on 2nd/3rd advances one base (runner on 3rd scores)

### Sac Bunt
- **When:** Play exactly **1 card**, at least one runner on, outs < 2
- **Result:** All runners advance one base, batter is out, 0 peanuts
- Skips hand evaluation (no out-chance roll, no traits, no peanuts)

### Extra Base (Speed)
- **When:** A **Single** (not extra-base hits, walks, or homers)
- **Chance:** batter speed × 5%, plus staff / lineup / synergy extra-base bonuses
- **Result:** Lead runner takes one extra base

### Home Run Descriptions
Flavor text based on runners scoring:
- **0 runners:** "Solo Homer!"
- **1 runner:** "2-Run Homer!"
- **2 runners:** "3-Run Homer!"
- **3 runners (bases loaded):** "GRAND SLAM!"

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
3. Peanuts deducted, shop refreshes if buys remain
4. **Staff tab:** hire coaches/mascots into slots (does not use the trait buy limit). Active staff can be **sold for 50%** of price.
5. **Synergies tab:** all lineup synergies listed; active ones show their bonus, locked ones show the hint.
6. Hit "Done" to continue to opponent's half

No duplicate traits offered (already-owned traits excluded).

---

## Bonus Resolution Order

Three passive bonus sources apply after the hand is evaluated and after batter/pitcher
modifiers, in this fixed order:

1. **Staff** — mascots & coaches (`data/coaches.js`, `data/mascots.js`)
2. **Lineup** — bonus-player passives (`data/bonus_players.js`)
3. **Synergies** — active lineup synergies (`data/synergies.js`)

Each pass accumulates `peanutBonus` and `multBonus`, then commits them as
`peanuts += peanutBonus`, `mult += multBonus`, `score = round(peanuts × mult)`.
Mult bonuses are **additive**, both within a pass and across passes: a staff `+1x` and
a synergy `+1x` on a base 1x hand yield 3x, not 4x. Score is recomputed after each
pass, so the final score always equals the final `peanuts × mult`.

Some effects don't touch the score and are instead returned for the caller to use:
`errorMult` (feeds `SituationalEngine`, multiplicative), `extraBaseBonus`,
`pairOutReduction`, and `contactSaveBoost` (all additive).

Order matters for one visible case: `double_peanuts` doubles the peanut count *as it
stands when staff runs*, so it does not double later lineup or synergy peanuts.

**Known inconsistency (intentional, preserved):** the lineup XBH bonus
(`team_add_peanuts_on_xbh`) counts Doubles, Triples, and Home Runs, while the synergy
XBH bonus (`add_peanuts_on_xbh`) counts only Triples and Home Runs. This is a live
balance difference, locked in by a test so it can't drift silently.

Logic lives in `src/BonusEngine.js` (pure, no Phaser). `GameScene` holds thin wrappers
that supply context.

---

## Chip Economy

### Earning
- Every at-bat: floor(peanuts × mult) from the played hand
- Bonuses from batter stats, count modifiers, trait effects
- Passive bonuses from staff, lineup, and synergies (see Bonus Resolution Order)

### Spending
- Trait cards at the shop (20–45 peanuts each)
- Peanuts persist across the entire game (not reset per inning)

### Rough Progression
- Innings 1–3: ~50–75 peanuts (enough for 1 trait)
- Innings 4–6: ~100–150 peanuts (equip 2–3 players)
- Innings 7–9: ~150–250 peanuts (build synergies)

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

**Interactivity:** Targeted pitches (fastball, slider, cutter, splitter, twoseam, breaking) let the player pick which card to hit — a suggested target is highlighted; click to change it, then CONFIRM (or CANCEL). A live hand read shows each side's current best hand (`YOU:` full, `OPP (visible):` from cards you can see) so the player can read the board. Effects animate on the affected card, and a tap skips post-effect pauses.

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
| Two-Seam | Swap a community card with a random batter hole card |
| Knuckleball | Randomize ALL community card ranks (keeps suits) |
| Screwball | Replace a batter hole card |
| Palmball | Plant best card from pitcher deck as next community card |

### Resolution
Best 5-card hand from each side (2 hole + 5 community). The winner is decided by **poker hand strength** — hand class first, then the ranks involved (so a pair of Aces beats a pair of 3s). Hand *reward* values (peanuts × mult) are never used to pick a winner, since they measure payout, not rank.

- **Pitcher wins** → Out (Strikeout / Flyout / Groundout based on margin)
- **Batter wins** → Hit (Single / Double / Triple / HR based on margin)
- **Tie** → higher hole card wins (pitcher favored on an exact tie)

Pitcher trait bonuses add weight *within* a hand class: they can swing a close call but can never make a weaker hand class beat a stronger one. The margin that selects the specific outcome is still measured on the reward scale.

**Implementation note:** hand comparison uses `CardEngine.classify()`, which is pure — no RNG, no mutation. `CardEngine.evaluateHand()` must **not** be used for comparison: it rolls the batting out-chance and zeroes a made hand's score, which previously made the showdown non-deterministic (the same seven cards could resolve as a Flush or as a Pair).

### Pitcher Traits in the Showdown
Every pitcher trait (see the Pitcher Traits table) is translated into showdown terms — either a flat/conditional bonus to the pitcher's hand score or a card manipulation (downgrade a batter hole card, scramble/swap community cards). Conditional traits read the live at-bat state: outs, inning, whether the pitcher's team leads, and whether runners are on base.

### Pitcher Stats
- **Velocity** → Deck quality (higher ranks)
- **Control** → Pitch effect accuracy
- **Stamina** → Deck degrades across at-bats (top cards removed)

---

## Balancing Levers

Key parameters to tune:

| Lever | Current Value | Effect |
|-------|--------------|--------|
| Hand size | 7 | More cards = more hand options |
| Discards | unlimited (count-limited) | Discard depth for hand improvement |
| Pair out base | 95% - rank×3% | How risky pairs feel |
| Pitcher adjusts | +10%/pair, +20%/straight/flush, +15%/trips | Universal hand degradation |
| **Discard scaling** | 0 disc: -10%, 2: +5%, 3+: +3%/extra | Rewards first-pitch swings, punishes fishing |
| Contact rescue | contact × 4% | Pair safety net |
| Shop buy limits | 1/2/3 | Trait accumulation rate |
| Fatigue rate | 8% per inning past threshold | Late-game pitcher decay |
| Error base | 4% | Comeback potential |

### Discard Scaling

Each discard used in an at-bat adjusts the out chance for the final hand played:

| Discards Used | Out Chance Modifier | Feel |
|---|---|---|
| 0 (first pitch) | -10% | Reward for swinging at what you're dealt |
| 1 | 0% | Normal play |
| 2 | +5% | Pitcher is reading you |
| 3 | +8% | Fishing hard |
| 4 | +11% | Very risky |
| 5+ | +3% per extra | Diminishing returns on building a hand |

Hand preview uses color-coded text (green/gold/orange/red) instead of raw percentages. Traits and contact rescue are hidden — the player sees the base risk, their build rewards them invisibly.

All tuning values live in `data/balance.js` (single source of truth).

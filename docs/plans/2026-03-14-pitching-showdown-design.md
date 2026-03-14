# Pitching Showdown — Design Document

**Status:** Pre-design (pending playtest feedback from Balatro systems branch)

**Goal:** Replace the passive opponent-half with an interactive poker-based pitching mechanic that mirrors the batting system from the other side of the mound.

---

## Core Concept

Both sides play poker. Batting = you build a hand to hit. Pitching = you build a hand to get outs. Same mental model, different decisions.

Structured like Texas Hold'em with staged card reveals that build tension.

---

## Setup

- You draw **2 hole cards** from your pitcher's deck (pitch-themed cards with suits/ranks)
- The batter gets **2 hidden hole cards** (you don't see them)
- You see the batter's stats (power/contact/speed) so you know what you're up against

---

## Stages

At each stage you **pick a pitch from your 4-pitch repertoire** to throw. Each pitch manipulates the board differently (see Pitch Effects below). You can't use the same pitch twice in one at-bat.

### The Flop (3 community cards)

- 3 cards flip face-up in the middle — shared by both you and the batter
- Now you see what hands are forming
- **Decision:** Choose a pitch to throw — its effect triggers on the board
- A "read" hint may appear (e.g. "Batter is sitting fastball") giving partial info about their hole cards

### The Turn (4th community card)

- 1 more community card flips
- Hands are getting clearer
- **Decision:** Choose your second pitch — manipulate the board further

### The River (5th community card)

- Final card flips
- **Decision:** Choose your third and final pitch
- Both hands are locked after the effect resolves

---

## Resolution

Best 5-card poker hand from each side (2 hole + 5 community, pick best 5).

### Pitcher Wins (You get an out)

| Margin    | Outcome     |
|-----------|-------------|
| Blowout   | Strikeout   |
| Medium    | Flyout / Groundout |
| Narrow    | Weak contact, still out |

### Batter Wins (They get a hit)

| Margin    | Outcome     |
|-----------|-------------|
| Narrow    | Single      |
| Medium    | Double      |
| Blowout   | Home Run    |

### Tie

- Foul ball → redo the showdown, or a ball added to the count

---

## Pitch Effects (12 Pitches)

Each pitcher has a 4-pitch repertoire assigned by their velocity/control profile. In the showdown, each pitch is an **ability that manipulates the Hold'em board**.

| Pitch | Showdown Effect |
|-------|----------------|
| **Fastball** | Swap draws from top 30% of deck (high cards only). If batter still wins, the hit is bigger. |
| **Breaking Ball** | Flip one community card face-down until the next stage. Batter builds a hand with less info. |
| **Changeup** | No stamina cost. Peek at one of the batter's hole cards. Low-risk intel gathering. |
| **Slider** | Replace one community card with a new draw. Disrupts whatever hand the batter was forming. |
| **Cutter** | Lock one community card — it can't be replaced by other effects. Protects your forming hand. |
| **Curveball** | Downgrade the batter's highest visible card by 2 ranks. On a miss (low control roll), it becomes a wild card instead. |
| **Sinker** | Force all community cards down by 1 rank. Weak contact guaranteed — batter can't homer, but easier for them to win small. |
| **Splitter** | Destroy one community card entirely (4-card board). Devastating but costs 2x stamina. |
| **Two-Seam** | Shift one community card's suit to match another. Breaks the batter's flush/straight draws. |
| **Knuckleball** | Randomize one community card completely. Chaotic — could help you, could backfire. No stamina cost. |
| **Screwball** | Swap one of the batter's hole cards with a random deck draw. Direct attack on their hand but high stamina cost. |
| **Palmball** | Add a "delay" — the batter doesn't see the next community card until after they commit. Cheap and sneaky. |

### How Pitcher Stats Shape the Showdown

| Stat | Effect |
|------|--------|
| **Velocity** | Deck quality — high velocity = higher-rank cards in your pitcher deck. A 10-velocity pitcher draws from Aces and Kings. A 4-velocity pitcher draws middling cards. |
| **Control** | Pitch accuracy — high control = pitch effects are more reliable. Low control = some pitches can misfire (curveball becomes wild, slider replaces the wrong card). |
| **Stamina** | Sustain across at-bats — each pitch thrown costs stamina. High stamina pitchers stay strong through 3+ at-bats. Low stamina pitchers' decks degrade (best cards removed after each at-bat). |

### Pitcher Identity Through Repertoire

Pitchers already get 4 pitches assigned via `assignPitchRepertoire()`. Each combo creates a distinct playstyle:

| Pitcher | Stats | Repertoire | Playstyle |
|---------|-------|-----------|-----------|
| Viper Knox | V:9 C:5 S:4 | Fastball / Splitter / Slider / Cutter | Aggressive — power swaps, destroy cards, lock the board |
| The Professor | V:4 C:10 S:7 | Changeup / Curveball / Palmball / Two-Seam | Precision — peek, downgrade, delay, manipulate suits |
| Smooth Eddie | V:5 C:8 S:8 | Changeup / Sinker / Palmball / Two-Seam | Marathon — cheap pitches, grind batters down over many at-bats |
| Wildfire Cruz | V:10 C:4 S:4 | Fastball / Splitter / Knuckleball / Screwball | Nuclear — huge effects but chaotic, burns out fast |
| Bulldog Brewer | V:7 C:6 S:9 | Slider / Sinker / Two-Seam / Changeup | Workhorse — consistent board control, never tires |
| Rex "The Arm" | V:10 C:3 S:5 | Fastball / Splitter / Slider / Cutter | Glass cannon — elite stuff, terrible accuracy, unpredictable misfires |

---

## What Makes It Feel Good

- **Staged tension** — sweating the river card, just like real Hold'em
- **Meaningful choices** — which pitch do I throw? Do I peek first or attack now?
- **Pitcher identity** — each pitcher's 4 pitches give a totally different toolkit
- **Read mechanic** — Changeup/Palmball give intel, Fastball/Splitter are power plays
- **Pitcher deck quality matters** — velocity determines your raw card quality
- **Mirrors batting** — same poker-hand-to-outcome system, already understood by the player
- **Baseball feel** — "I threw the slider to break up his straight draw" maps to real pitching strategy

---

## Trait / Staff Integration

| System | Pitching Showdown Effect |
|--------|--------------------------|
| Pitcher traits | Extra pitch uses, enhanced effects, passive bonuses (e.g. Heater: +1 rank to all fastball swaps) |
| Mascots | Add wild cards to your deck, reveal batter cards between stages |
| Coaches | Reduce stamina costs, improve control rolls, grant extra peek |
| Opponent batter traits | Better hole cards, resist pitch effects, community card influence |

---

## Open Questions (Post-Playtest)

- How many at-bats per opponent half? Full 3-out innings or simplified?
- Does the pitcher's stamina/fatigue limit swaps across multiple at-bats?
- Should the community cards be truly shared or does each side see different "boards"?
- How does the opponent batting order work — same roster data as teams.js?
- Can you re-use a pitch in the same at-bat with increasing stamina cost, or is it strictly one use?
- Do we keep the current auto-sim as a "quick sim" option for players who want to skip?
- How does IBB (Intentional Walk) work? Skip the showdown entirely, batter goes to 1st?

---

## Dependencies

- Pitcher deck system (velocity → card quality mapping)
- Opponent batter data (already exists in teams.js)
- Poker hand evaluator (already exists in CardEngine for batting)
- Pitch repertoire assignment (already exists in `assignPitchRepertoire()`)
- UI for the Hold'em-style board layout
- Stamina tracking across at-bats (partially exists)

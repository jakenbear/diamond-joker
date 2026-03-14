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

### The Flop (3 community cards)

- 3 cards flip face-up in the middle — shared by both you and the batter
- Now you see what hands are forming
- **Decision:** Swap one of your hole cards for a new draw from your pitcher's deck
  - This represents "choosing your pitch" — change approach or stick with it
- A "read" hint may appear (e.g. "Batter is sitting fastball") giving partial info about their hole cards

### The Turn (4th community card)

- 1 more community card flips
- Hands are getting clearer
- **Decision:** Swap again or hold
  - Each swap has a cost (count progression, pitch fatigue, or similar balance lever)

### The River (5th community card)

- Final card flips, no more decisions
- Both hands are locked

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

## What Makes It Feel Good

- **Staged tension** — sweating the river card, just like real Hold'em
- **Meaningful choices** — each swap is risk/reward. Keep your pair or chase the flush?
- **Read mechanic** — pitcher traits give peeks at batter's hole cards (e.g. "Deception" reveals one card after the flop)
- **Pitcher deck quality matters** — a good pitcher has better cards in the swap pool
- **Mirrors batting** — same poker-hand-to-outcome system, already understood by the player

---

## Trait / Staff Integration

| System         | Pitching Showdown Effect |
|----------------|--------------------------|
| Pitcher traits | Affect deck composition, grant extra swaps, reveal batter cards |
| Mascots        | Add wild cards, peek abilities |
| Coaches        | Improve swap draw odds, reduce swap costs |
| Opponent batter traits | Give them better hole cards or community card influence |

---

## Open Questions (Post-Playtest)

- How many at-bats per opponent half? Full 3-out innings or simplified?
- Does the pitcher's stamina/fatigue limit swaps across multiple at-bats?
- Should the community cards be truly shared or does each side see different "boards"?
- How does the opponent batting order work — same roster data as teams.js?
- What's the right swap cost that feels strategic but not punishing?
- Do we keep the current auto-sim as a "quick sim" option for players who want to skip?

---

## Dependencies

- Pitcher deck system (what cards does each pitcher generate?)
- Opponent batter data (already exists in teams.js)
- Poker hand evaluator (already exists in CardEngine for batting)
- UI for the Hold'em-style board layout

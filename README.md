# Diamond Joker

A Balatro-style poker/baseball hybrid card game built with Phaser 3.

## How to Play

You're the manager of a 9-player baseball team. Each at-bat, you draw 5 cards and **select which cards to play** as your poker hand. The poker hand determines the baseball outcome:

| Hand | Baseball Outcome | Chips | Mult |
|------|-----------------|-------|------|
| Royal Flush | Perfect Game | 15 | 20x |
| Straight Flush | Walk-Off | 10 | 10x |
| Four of a Kind | Inside-the-Park HR | 6 | 6x |
| Full House | RBI Double | 3 | 2.5x |
| Flush (5 same suit) | Grand Slam | 5 | 5x |
| Straight (5 in sequence) | Home Run | 4 | 4x |
| Three of a Kind | Triple | 3 | 3x |
| Two Pair | Double | 2 | 2x |
| Pair | Single | 1 | 1.5x |
| High Card | Strikeout | 0 | 1x |

### Rank Quality
Low-rank pairs (2-5) risk groundouts. High-rank pairs (10-A) earn bonus chips. Three of a Kind with low ranks has a small chance of a flyout.

### Roster
Each game picks 9 random players from a pool of 20. Players have **Power** (bonus chips), **Contact** (bonus mult), and **Speed** (extra base chance) stats.

### Trait Cards (Dugout Cards)
Buy trait cards in the shop (after innings 3 and 6) and assign them to specific players (max 2 per player). Traits modify your cards or outcomes:

**Pre-eval traits** change cards before evaluation:
- **Double McGee** — Adjacent ranks count as a pair
- **Ace in the Hole** — Aces are wild for straights
- **Switch Hitter** — Suit color counts as matching for flushes

**Post-eval traits** change outcomes:
- **Slugger Serum** — Pairs upgrade to doubles
- **Eye of the Tiger** — +3 mult with 2 outs
- **Contact Lens** — Low pairs never groundout
- And more...

### Pitcher Traits
The opposing pitcher has 1-2 traits that work against you — with risk/reward twists:
- **Curveball** — 30% chance your best card loses 3 ranks
- **Intimidation** — -2 mult at 0 outs, but +2 mult at 2 outs
- **Knuckleball** — Face cards get weaker, number cards stay strong
- **Changeup** — 25% chance two cards swap ranks. Chaos!

Pitcher trait activations show in the play-by-play so you always know what happened.

## Running Locally

Serve the project with any HTTP server:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080` in your browser.

## Tech Stack

- **Phaser 3.60.0** (loaded from CDN)
- Vanilla JavaScript (ES6 modules)
- No build step, no dependencies

## Project Structure

```
diamond-joker/
├── index.html              # Entry point
├── src/
│   ├── main.js             # Phaser config + bootstrap
│   ├── CardEngine.js       # Deck, hand evaluation, rank quality
│   ├── BaseballState.js    # Baseball state machine, scoring, shop triggers
│   ├── RosterManager.js    # Player roster + pitcher management
│   ├── TraitManager.js     # Batter + pitcher trait definitions
│   └── scenes/
│       ├── GameScene.js    # Main gameplay (batter/pitcher panels, cards, flow)
│       ├── ShopScene.js    # Between-innings trait card shop
│       └── GameOverScene.js # Results screen
```

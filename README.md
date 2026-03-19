# Aces Loaded!

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

## Running Locally (Browser)

Serve the project with any HTTP server:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080` in your browser.

## Running Tests

```bash
node test/sim.js
```

## Desktop Build (NW.js)

The game can run as a standalone desktop app using [NW.js](https://nwjs.io). This is the path to packaging for Steam.

### Quick Test

```bash
# Install NW.js
brew install nwjs          # macOS
# or download from https://nwjs.io/downloads/

# Build and launch
./scripts/build-desktop.sh --run
```

### Package for Distribution

```bash
# Install the packager
npm install -g nw-builder

# Build for a specific platform
./scripts/package-desktop.sh win64     # Windows .exe
./scripts/package-desktop.sh osx64     # macOS .app
./scripts/package-desktop.sh linux64   # Linux
./scripts/package-desktop.sh all       # All platforms
```

Output goes to `desktop/dist/`. Each platform folder contains a self-contained app — no install needed.

### Steam Distribution

1. Create your app on [Steamworks](https://partner.steamgames.com)
2. Package for Windows: `./scripts/package-desktop.sh win64`
3. Upload `desktop/dist/` contents as a depot via SteamPipe
4. For Steam overlay/achievements, add `greenworks`:
   ```bash
   npm install greenworks
   ```
   Then init in a `<script>` tag before the game boots (requires your Steam App ID).

### How It Works

- `vendor/phaser.min.js` — Local Phaser 3.60 (no CDN needed offline)
- `desktop/package.json` — NW.js manifest (window size, title, chrome settings)
- `scripts/build-desktop.sh` — Assembles game files into `desktop/build/`
- `scripts/package-desktop.sh` — Wraps with NW.js runtime for each platform

The browser version still works identically — `index.html` loads local Phaser first, with a CDN fallback for GitHub Pages.

## Tech Stack

- **Phaser 3.60.0** (local + CDN fallback)
- **NW.js** for desktop/Steam builds
- **Godot 4.6** for native version (parallel implementation)
- Vanilla JavaScript (ES6 modules)
- No bundler — just serve and play

## Project Structure

```
diamond-joker/
├── index.html              # Entry point (browser + desktop)
├── vendor/
│   └── phaser.min.js       # Local Phaser 3.60
├── src/
│   ├── main.js             # Phaser config + bootstrap
│   ├── CardEngine.js       # Deck, hand evaluation, rank quality
│   ├── BaseballState.js    # Baseball state machine, scoring, shop triggers
│   ├── RosterManager.js    # Player roster + pitcher management
│   ├── TraitManager.js     # Batter + pitcher trait definitions
│   └── scenes/
│       ├── GameScene.js    # Main gameplay (cards, diamond, scoring)
│       ├── PitchingScene.js # Pitching showdown (bottom half)
│       ├── ShopScene.js    # Between-innings trait card shop
│       ├── TeamSelectScene.js # Team + opponent selection
│       └── GameOverScene.js # Results screen
├── data/                   # Game data (teams, hands, traits, balance)
├── test/                   # Tests (node test/sim.js)
├── godot/                  # Godot 4.6 native version
├── desktop/
│   ├── package.json        # NW.js manifest
│   ├── build/              # Assembled game (gitignored)
│   └── dist/               # Packaged executables (gitignored)
└── scripts/
    ├── build-desktop.sh    # Assemble for NW.js
    └── package-desktop.sh  # Package .exe/.app/.zip
```

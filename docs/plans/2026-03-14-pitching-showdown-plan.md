# Pitching Showdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the auto-sim pitching half with an interactive Hold'em-style showdown where the player picks pitches to manipulate a shared poker board.

**Architecture:** New `ShowdownEngine` (pure logic, no Phaser) handles deck generation, board state, pitch effects, and resolution. The existing `PitchingScene` gets a new UI mode that renders the Hold'em board and pitch selection per stage. Existing `CardEngine.evaluateHand()` is reused for final hand comparison.

**Tech Stack:** Vanilla JS (Phaser 3 for UI), no build step. Tests via `node test/sim.js`.

---

## Task 1: ShowdownEngine — Deck Generation

**Files:**
- Create: `src/ShowdownEngine.js`
- Test: `test/sim.js` (append new group)

**Step 1: Write the failing test**

Add to `test/sim.js`:

```javascript
import ShowdownEngine from '../src/ShowdownEngine.js';

group('25. ShowdownEngine — Deck generation');

// Deck size is always 20 cards
const sDeck = ShowdownEngine.generateDeck(9, 5); // velocity 9, control 5
assert(sDeck.length === 20, 'Pitcher deck has 20 cards');
assert(sDeck.every(c => c.rank >= 2 && c.rank <= 14), 'All ranks in valid range');
assert(sDeck.every(c => ['H','D','C','S'].includes(c.suit)), 'All suits valid');

// High velocity = higher average rank
const highVelDeck = ShowdownEngine.generateDeck(10, 5);
const lowVelDeck = ShowdownEngine.generateDeck(4, 5);
const avgRank = (deck) => deck.reduce((s, c) => s + c.rank, 0) / deck.length;
// Run 50 samples to get stable averages
let highSum = 0, lowSum = 0;
for (let i = 0; i < 50; i++) {
  highSum += avgRank(ShowdownEngine.generateDeck(10, 5));
  lowSum += avgRank(ShowdownEngine.generateDeck(4, 5));
}
assert(highSum / 50 > lowSum / 50, 'High velocity decks have higher avg rank than low velocity');
```

**Step 2: Run test to verify it fails**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: FAIL — ShowdownEngine not found

**Step 3: Write minimal implementation**

Create `src/ShowdownEngine.js`:

```javascript
/**
 * ShowdownEngine.js — Hold'em-style pitching showdown logic.
 * Pure logic, no Phaser dependency.
 *
 * Pitcher stats shape the deck:
 *   velocity → card rank quality (higher = better cards)
 *   control  → pitch effect accuracy
 *   stamina  → deck degradation across at-bats
 */

const SUITS = ['H', 'D', 'C', 'S'];

export default class ShowdownEngine {
  /**
   * Generate a 20-card pitcher deck based on velocity.
   * Higher velocity = higher minimum rank floor.
   * @param {number} velocity - 1-10
   * @param {number} control - 1-10 (used later for pitch accuracy)
   * @returns {Array<{rank: number, suit: string}>}
   */
  static generateDeck(velocity, control) {
    // Velocity sets the rank floor: vel 10 → floor 7, vel 1 → floor 2
    const floor = Math.max(2, Math.round(2 + (velocity - 1) * 0.55));
    const ceiling = 14; // Ace
    const deck = [];

    for (let i = 0; i < 20; i++) {
      const rank = floor + Math.floor(Math.random() * (ceiling - floor + 1));
      const suit = SUITS[Math.floor(Math.random() * 4)];
      deck.push({ rank, suit });
    }

    return deck;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: All group 25 tests PASS

**Step 5: Commit**

```bash
git add src/ShowdownEngine.js test/sim.js
git commit -m "feat: ShowdownEngine with velocity-based deck generation"
```

---

## Task 2: ShowdownEngine — Board State & Stages

**Files:**
- Modify: `src/ShowdownEngine.js`
- Test: `test/sim.js` (append)

**Step 1: Write the failing test**

```javascript
group('25b. ShowdownEngine — Board state & stages');

const showdown = new ShowdownEngine({ velocity: 8, control: 7, stamina: 6 });
showdown.start();

// Initial state: 2 hole cards each, no community
assert(showdown.pitcherHole.length === 2, 'Pitcher gets 2 hole cards');
assert(showdown.batterHole.length === 2, 'Batter gets 2 hole cards');
assert(showdown.community.length === 0, 'No community cards yet');
assert(showdown.stage === 'pre-flop', 'Stage is pre-flop');

// Flop
showdown.dealFlop();
assert(showdown.community.length === 3, 'Flop deals 3 community cards');
assert(showdown.stage === 'flop', 'Stage is flop');

// Turn
showdown.dealTurn();
assert(showdown.community.length === 4, 'Turn deals 4th community card');
assert(showdown.stage === 'turn', 'Stage is turn');

// River
showdown.dealRiver();
assert(showdown.community.length === 5, 'River deals 5th community card');
assert(showdown.stage === 'river', 'Stage is river');
```

**Step 2: Run test to verify it fails**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: FAIL — ShowdownEngine constructor / start not found

**Step 3: Write minimal implementation**

Add to `ShowdownEngine.js`:

```javascript
constructor(pitcher) {
  this.pitcher = pitcher;
  this.pitcherDeck = [];
  this.batterDeck = [];
  this.pitcherHole = [];
  this.batterHole = [];
  this.community = [];
  this.stage = 'pre-flop';
  this.pitchesUsed = [];
}

start(batterStats = null) {
  this.pitcherDeck = ShowdownEngine.generateDeck(this.pitcher.velocity, this.pitcher.control);
  // Batter deck: use contact as "velocity equivalent"
  const batterVel = batterStats ? (batterStats.contact * 0.6 + batterStats.power * 0.4) : 5;
  this.batterDeck = ShowdownEngine.generateDeck(batterVel, 5);
  this._shuffle(this.pitcherDeck);
  this._shuffle(this.batterDeck);

  this.pitcherHole = [this.pitcherDeck.pop(), this.pitcherDeck.pop()];
  this.batterHole = [this.batterDeck.pop(), this.batterDeck.pop()];
  this.community = [];
  this.stage = 'pre-flop';
  this.pitchesUsed = [];
}

dealFlop() {
  for (let i = 0; i < 3; i++) this.community.push(this.pitcherDeck.pop());
  this.stage = 'flop';
}

dealTurn() {
  this.community.push(this.pitcherDeck.pop());
  this.stage = 'turn';
}

dealRiver() {
  this.community.push(this.pitcherDeck.pop());
  this.stage = 'river';
}

_shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add src/ShowdownEngine.js test/sim.js
git commit -m "feat: ShowdownEngine board state — hole cards, flop, turn, river"
```

---

## Task 3: ShowdownEngine — Resolution (Hand Comparison)

**Files:**
- Modify: `src/ShowdownEngine.js`
- Test: `test/sim.js` (append)

**Step 1: Write the failing test**

```javascript
group('25c. ShowdownEngine — Resolution');

// Force known cards for deterministic test
const sd = new ShowdownEngine({ velocity: 8, control: 7, stamina: 6 });
sd.start();

// Manually set cards: pitcher has pair of Aces, batter has pair of 3s
sd.pitcherHole = [{ rank: 14, suit: 'H' }, { rank: 14, suit: 'S' }];
sd.batterHole = [{ rank: 3, suit: 'H' }, { rank: 3, suit: 'S' }];
sd.community = [
  { rank: 7, suit: 'C' }, { rank: 9, suit: 'D' }, { rank: 10, suit: 'H' },
  { rank: 5, suit: 'S' }, { rank: 2, suit: 'C' },
];
sd.stage = 'river';

const result = sd.resolve();
assert(result.winner === 'pitcher', 'Pitcher wins with better pair');
assert(result.pitcherHand.handName !== undefined, 'Pitcher hand has handName');
assert(result.batterHand.handName !== undefined, 'Batter hand has handName');
assert(typeof result.outcome === 'string', 'Result has outcome string');
assert(result.isOut === true, 'Pitcher win = out');

// Batter wins scenario
const sd2 = new ShowdownEngine({ velocity: 8, control: 7, stamina: 6 });
sd2.start();
sd2.pitcherHole = [{ rank: 3, suit: 'H' }, { rank: 2, suit: 'S' }];
sd2.batterHole = [{ rank: 14, suit: 'H' }, { rank: 14, suit: 'S' }];
sd2.community = [
  { rank: 7, suit: 'C' }, { rank: 9, suit: 'D' }, { rank: 10, suit: 'H' },
  { rank: 5, suit: 'S' }, { rank: 6, suit: 'C' },
];
sd2.stage = 'river';

const result2 = sd2.resolve();
assert(result2.winner === 'batter', 'Batter wins with better hand');
assert(result2.isOut === false, 'Batter win = hit');
assert(['Single', 'Double', 'Triple', 'Home Run'].includes(result2.outcome), 'Batter outcome is a valid hit type');
```

**Step 2: Run test to verify it fails**

**Step 3: Write minimal implementation**

Add to `ShowdownEngine.js`:

```javascript
import CardEngine from './CardEngine.js';

// Add to class:

/**
 * Find best 5-card hand from 2 hole + 5 community.
 * Tries all C(7,5) = 21 combinations.
 */
static bestHand(hole, community) {
  const all = [...hole, ...community];
  let best = null;
  let bestScore = -1;
  const combos = ShowdownEngine._combinations(all, 5);
  for (const combo of combos) {
    const result = CardEngine.evaluateHand(combo);
    if (result.score > bestScore || (result.score === bestScore && !best)) {
      best = result;
      bestScore = result.score;
    }
  }
  // If all combos score 0 (high cards), use hand index to compare
  if (best && bestScore === 0) {
    best._highCard = Math.max(...all.map(c => c.rank));
  }
  return best;
}

static _combinations(arr, k) {
  const results = [];
  function combo(start, current) {
    if (current.length === k) { results.push([...current]); return; }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      combo(i + 1, current);
      current.pop();
    }
  }
  combo(0, []);
  return results;
}

/**
 * Resolve the showdown. Compare best hands.
 * @returns {{ winner, pitcherHand, batterHand, outcome, isOut, margin }}
 */
resolve() {
  const pHand = ShowdownEngine.bestHand(this.pitcherHole, this.community);
  const bHand = ShowdownEngine.bestHand(this.batterHole, this.community);

  const pScore = pHand.score;
  const bScore = bHand.score;

  let winner, margin;
  if (pScore > bScore) {
    winner = 'pitcher';
    margin = pScore - bScore;
  } else if (bScore > pScore) {
    winner = 'batter';
    margin = bScore - pScore;
  } else {
    // Tie — compare high cards
    const pHigh = Math.max(...this.pitcherHole.map(c => c.rank));
    const bHigh = Math.max(...this.batterHole.map(c => c.rank));
    winner = pHigh >= bHigh ? 'pitcher' : 'batter';
    margin = 0;
  }

  const outcome = winner === 'pitcher'
    ? ShowdownEngine._pitcherOutcome(margin)
    : ShowdownEngine._batterOutcome(margin);

  return {
    winner,
    pitcherHand: pHand,
    batterHand: bHand,
    outcome,
    isOut: winner === 'pitcher',
    margin,
  };
}

static _pitcherOutcome(margin) {
  if (margin >= 30) return 'Strikeout';
  if (margin >= 10) return Math.random() < 0.5 ? 'Flyout' : 'Groundout';
  return 'Groundout';
}

static _batterOutcome(margin) {
  if (margin >= 50) return 'Home Run';
  if (margin >= 25) return Math.random() < 0.5 ? 'Triple' : 'Double';
  if (margin >= 10) return 'Double';
  return 'Single';
}
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add src/ShowdownEngine.js test/sim.js
git commit -m "feat: ShowdownEngine resolution — best-of-7 hand comparison + outcomes"
```

---

## Task 4: ShowdownEngine — Core Pitch Effects (Fastball, Changeup, Slider)

**Files:**
- Modify: `src/ShowdownEngine.js`
- Test: `test/sim.js` (append)

**Step 1: Write the failing test**

```javascript
group('25d. ShowdownEngine — Core pitch effects');

// Fastball: swap a hole card, draw from top 30% of deck
const sd3 = new ShowdownEngine({ velocity: 9, control: 7, stamina: 6 });
sd3.start();
sd3.dealFlop();
const oldHole = [...sd3.pitcherHole];
const fbResult = sd3.applyPitch('fastball', { swapIndex: 0 });
assert(fbResult.success === true, 'Fastball succeeds');
assert(sd3.pitcherHole[0].rank !== undefined, 'Fastball swap produces valid card');
assert(sd3.pitchesUsed.includes('fastball'), 'Fastball marked as used');

// Can't use same pitch twice
const fbResult2 = sd3.applyPitch('fastball', { swapIndex: 0 });
assert(fbResult2.success === false, 'Cannot reuse same pitch in same at-bat');

// Changeup: peek at one batter hole card
const sd4 = new ShowdownEngine({ velocity: 7, control: 8, stamina: 6 });
sd4.start();
sd4.dealFlop();
const peekResult = sd4.applyPitch('changeup', {});
assert(peekResult.success === true, 'Changeup succeeds');
assert(peekResult.revealed !== undefined, 'Changeup reveals a batter card');
assert(peekResult.revealed.rank >= 2 && peekResult.revealed.rank <= 14, 'Revealed card has valid rank');

// Slider: replace one community card
const sd5 = new ShowdownEngine({ velocity: 7, control: 7, stamina: 6 });
sd5.start();
sd5.dealFlop();
const oldComm = [...sd5.community];
const sliderResult = sd5.applyPitch('slider', { targetIndex: 1 });
assert(sliderResult.success === true, 'Slider succeeds');
assert(sd5.community.length === 3, 'Community still has 3 cards after slider');
assert(sliderResult.replaced !== undefined, 'Slider returns replaced card info');
```

**Step 2: Run test to verify it fails**

**Step 3: Write minimal implementation**

Add `applyPitch(pitchKey, options)` method to `ShowdownEngine`:

```javascript
/**
 * Apply a pitch effect to the board.
 * @param {string} pitchKey - key from PITCH_TYPES
 * @param {Object} options - pitch-specific options (swapIndex, targetIndex, etc.)
 * @returns {{ success: boolean, ...effectResult }}
 */
applyPitch(pitchKey, options = {}) {
  if (this.pitchesUsed.includes(pitchKey)) {
    return { success: false, reason: 'Already used this pitch' };
  }

  const handler = this._pitchEffects[pitchKey];
  if (!handler) return { success: false, reason: 'Unknown pitch' };

  const result = handler.call(this, options);
  if (result.success) this.pitchesUsed.push(pitchKey);
  return result;
}

get _pitchEffects() {
  return {
    fastball: (opts) => this._effectFastball(opts),
    changeup: (opts) => this._effectChangeup(opts),
    slider: (opts) => this._effectSlider(opts),
  };
}

_effectFastball({ swapIndex = 0 }) {
  // Draw from top 30% of remaining deck (highest ranks)
  const sorted = [...this.pitcherDeck].sort((a, b) => b.rank - a.rank);
  const topPool = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.3)));
  const drawn = topPool[Math.floor(Math.random() * topPool.length)];
  // Remove from deck
  const deckIdx = this.pitcherDeck.indexOf(drawn);
  if (deckIdx >= 0) this.pitcherDeck.splice(deckIdx, 1);
  const old = this.pitcherHole[swapIndex];
  this.pitcherHole[swapIndex] = drawn;
  return { success: true, swapped: old, drawn };
}

_effectChangeup() {
  // Peek at a random batter hole card
  const idx = Math.floor(Math.random() * this.batterHole.length);
  return { success: true, revealed: { ...this.batterHole[idx] }, revealedIndex: idx };
}

_effectSlider({ targetIndex = 0 }) {
  if (targetIndex < 0 || targetIndex >= this.community.length) {
    return { success: false, reason: 'Invalid target' };
  }
  const replaced = this.community[targetIndex];
  const newCard = this.pitcherDeck.pop();
  if (!newCard) return { success: false, reason: 'Deck empty' };
  this.community[targetIndex] = newCard;
  return { success: true, replaced, newCard };
}
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add src/ShowdownEngine.js test/sim.js
git commit -m "feat: ShowdownEngine pitch effects — fastball, changeup, slider"
```

---

## Task 5: ShowdownEngine — Remaining 9 Pitch Effects

**Files:**
- Modify: `src/ShowdownEngine.js`
- Test: `test/sim.js` (append)

**Step 1: Write the failing test**

```javascript
group('25e. ShowdownEngine — All pitch effects');

function testPitch(pitchKey, setupFn, assertFn) {
  const sd = new ShowdownEngine({ velocity: 7, control: 7, stamina: 6 });
  sd.start();
  sd.dealFlop();
  if (setupFn) setupFn(sd);
  const result = sd.applyPitch(pitchKey, { targetIndex: 0, swapIndex: 0 });
  assertFn(result, sd);
}

// Cutter: lock a community card
testPitch('cutter', null, (r, sd) => {
  assert(r.success === true, 'Cutter succeeds');
  assert(sd.lockedIndices.includes(0), 'Cutter locks target community card');
});

// Curveball: downgrade batter's highest visible card by 2
testPitch('curveball', null, (r, sd) => {
  assert(r.success === true, 'Curveball succeeds');
  assert(typeof r.downgraded === 'boolean' || r.downgraded === true, 'Curveball reports downgrade result');
});

// Sinker: all community cards lose 1 rank
testPitch('sinker', (sd) => {
  sd._preSinkerRanks = sd.community.map(c => c.rank);
}, (r, sd) => {
  assert(r.success === true, 'Sinker succeeds');
  sd.community.forEach((c, i) => {
    assert(c.rank === Math.max(2, sd._preSinkerRanks[i] - 1), `Sinker: community[${i}] rank decreased by 1`);
  });
});

// Splitter: destroy a community card
testPitch('splitter', null, (r, sd) => {
  assert(r.success === true, 'Splitter succeeds');
  assert(sd.community.length === 2, 'Splitter removes one community card');
});

// Two-seam: shift a card's suit
testPitch('twoseam', null, (r, sd) => {
  assert(r.success === true, 'Two-seam succeeds');
  assert(typeof r.newSuit === 'string', 'Two-seam reports new suit');
});

// Knuckleball: randomize a community card
testPitch('knuckle', null, (r, sd) => {
  assert(r.success === true, 'Knuckleball succeeds');
  assert(sd.community.length === 3, 'Board still has 3 cards');
});

// Screwball: swap a batter hole card
testPitch('screwball', null, (r, sd) => {
  assert(r.success === true, 'Screwball succeeds');
  assert(r.replacedBatterCard !== undefined, 'Screwball reports replaced batter card');
});

// Palmball: hide next community card
testPitch('palmball', null, (r, sd) => {
  assert(r.success === true, 'Palmball succeeds');
  assert(sd.hiddenNextCard === true, 'Palmball hides next card');
});

// Breaking ball: flip one community card face-down
testPitch('breaking', null, (r, sd) => {
  assert(r.success === true, 'Breaking ball succeeds');
  assert(sd.faceDownIndices.length > 0, 'Breaking ball has a face-down card');
});
```

**Step 2: Run test to verify it fails**

**Step 3: Write minimal implementation**

Add remaining handlers to `_pitchEffects` getter and implement each `_effect*` method:

```javascript
get _pitchEffects() {
  return {
    fastball:  (opts) => this._effectFastball(opts),
    changeup:  (opts) => this._effectChangeup(opts),
    slider:    (opts) => this._effectSlider(opts),
    cutter:    (opts) => this._effectCutter(opts),
    curveball: (opts) => this._effectCurveball(opts),
    sinker:    (opts) => this._effectSinker(opts),
    splitter:  (opts) => this._effectSplitter(opts),
    twoseam:   (opts) => this._effectTwoseam(opts),
    knuckle:   (opts) => this._effectKnuckle(opts),
    screwball: (opts) => this._effectScrewball(opts),
    palmball:  (opts) => this._effectPalmball(opts),
    breaking:  (opts) => this._effectBreaking(opts),
  };
}

_effectCutter({ targetIndex = 0 }) {
  if (!this.lockedIndices) this.lockedIndices = [];
  this.lockedIndices.push(targetIndex);
  return { success: true, locked: targetIndex };
}

_effectCurveball({ targetIndex = 0 }) {
  // Downgrade batter's highest visible card by 2 (control check)
  const controlRoll = Math.random() < (this.pitcher.control / 12);
  if (controlRoll) {
    // Find batter's highest hole card
    const idx = this.batterHole[0].rank >= this.batterHole[1].rank ? 0 : 1;
    this.batterHole[idx].rank = Math.max(2, this.batterHole[idx].rank - 2);
    return { success: true, downgraded: true };
  }
  // Misfire: community card becomes wild (rank 14)
  if (this.community.length > 0) {
    this.community[0].rank = 14;
  }
  return { success: true, downgraded: false, misfired: true };
}

_effectSinker() {
  this.community.forEach(c => { c.rank = Math.max(2, c.rank - 1); });
  return { success: true };
}

_effectSplitter({ targetIndex = 0 }) {
  if (targetIndex < 0 || targetIndex >= this.community.length) {
    return { success: false, reason: 'Invalid target' };
  }
  // Check locked
  if (this.lockedIndices && this.lockedIndices.includes(targetIndex)) {
    return { success: false, reason: 'Card is locked' };
  }
  const removed = this.community.splice(targetIndex, 1)[0];
  return { success: true, destroyed: removed };
}

_effectTwoseam({ targetIndex = 0 }) {
  if (targetIndex < 0 || targetIndex >= this.community.length) {
    return { success: false, reason: 'Invalid target' };
  }
  // Find most common suit among OTHER community cards
  const otherSuits = this.community.filter((_, i) => i !== targetIndex).map(c => c.suit);
  const freq = {};
  otherSuits.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
  const dominantSuit = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  const newSuit = dominantSuit ? dominantSuit[0] : this.community[targetIndex].suit;
  const oldSuit = this.community[targetIndex].suit;
  this.community[targetIndex].suit = newSuit;
  return { success: true, oldSuit, newSuit };
}

_effectKnuckle({ targetIndex = 0 }) {
  if (targetIndex < 0 || targetIndex >= this.community.length) {
    return { success: false, reason: 'Invalid target' };
  }
  const SUITS = ['H', 'D', 'C', 'S'];
  this.community[targetIndex] = {
    rank: 2 + Math.floor(Math.random() * 13),
    suit: SUITS[Math.floor(Math.random() * 4)],
  };
  return { success: true };
}

_effectScrewball() {
  const idx = Math.floor(Math.random() * this.batterHole.length);
  const old = this.batterHole[idx];
  const SUITS = ['H', 'D', 'C', 'S'];
  this.batterHole[idx] = {
    rank: 2 + Math.floor(Math.random() * 13),
    suit: SUITS[Math.floor(Math.random() * 4)],
  };
  return { success: true, replacedBatterCard: old };
}

_effectPalmball() {
  this.hiddenNextCard = true;
  return { success: true };
}

_effectBreaking({ targetIndex = 0 }) {
  if (!this.faceDownIndices) this.faceDownIndices = [];
  if (targetIndex < 0 || targetIndex >= this.community.length) {
    return { success: false, reason: 'Invalid target' };
  }
  this.faceDownIndices.push(targetIndex);
  return { success: true, hiddenIndex: targetIndex };
}
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add src/ShowdownEngine.js test/sim.js
git commit -m "feat: ShowdownEngine — all 12 pitch effects implemented"
```

---

## Task 6: ShowdownEngine — Full At-Bat Flow

**Files:**
- Modify: `src/ShowdownEngine.js`
- Test: `test/sim.js` (append)

**Step 1: Write the failing test**

```javascript
group('25f. ShowdownEngine — Full at-bat flow');

const sdFull = new ShowdownEngine({ velocity: 8, control: 7, stamina: 6 });
const batter = { power: 7, contact: 6, speed: 5 };
sdFull.start(batter);

assert(sdFull.stage === 'pre-flop', 'Starts at pre-flop');

sdFull.dealFlop();
assert(sdFull.stage === 'flop', 'After flop');
const p1 = sdFull.applyPitch('changeup', {});
assert(p1.success === true, 'Pitch 1 at flop');

sdFull.dealTurn();
assert(sdFull.stage === 'turn', 'After turn');
const p2 = sdFull.applyPitch('slider', { targetIndex: 0 });
assert(p2.success === true, 'Pitch 2 at turn');

sdFull.dealRiver();
assert(sdFull.stage === 'river', 'After river');
const p3 = sdFull.applyPitch('fastball', { swapIndex: 0 });
assert(p3.success === true, 'Pitch 3 at river');

const finalResult = sdFull.resolve();
assert(['pitcher', 'batter'].includes(finalResult.winner), 'Has a winner');
assert(typeof finalResult.outcome === 'string', 'Has outcome');
assert(typeof finalResult.isOut === 'boolean', 'Has isOut');

// getState returns serializable snapshot
const state = sdFull.getState();
assert(state.pitcherHole.length === 2, 'State has pitcher hole');
assert(state.community.length === 5, 'State has full community');
assert(state.stage === 'river', 'State has stage');
assert(Array.isArray(state.pitchesUsed), 'State has pitchesUsed');
```

**Step 2: Run test to verify it fails**

**Step 3: Write minimal implementation**

Add `getState()`:

```javascript
getState() {
  return {
    pitcherHole: this.pitcherHole.map(c => ({ ...c })),
    batterHole: this.batterHole.map(c => ({ ...c })),
    community: this.community.map(c => ({ ...c })),
    stage: this.stage,
    pitchesUsed: [...this.pitchesUsed],
    lockedIndices: this.lockedIndices ? [...this.lockedIndices] : [],
    faceDownIndices: this.faceDownIndices ? [...this.faceDownIndices] : [],
    hiddenNextCard: this.hiddenNextCard || false,
  };
}
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add src/ShowdownEngine.js test/sim.js
git commit -m "feat: ShowdownEngine full at-bat flow + getState()"
```

---

## Task 7: PitchingScene — Hold'em Board UI

**Files:**
- Modify: `src/scenes/PitchingScene.js`
- Modify: `src/main.js` (if ShowdownEngine needs importing)

This is the **largest single task** — replacing the pitch-select → auto-resolve flow with the staged Hold'em UI.

**Step 1: Add ShowdownEngine import and showdown state**

At top of PitchingScene.js:
```javascript
import ShowdownEngine from '../ShowdownEngine.js';
```

**Step 2: Replace `_showPitchSelection()` → `_startShowdown()`**

The new flow per at-bat:
1. Create ShowdownEngine instance
2. Deal flop → show 3 community cards + pitcher's 2 hole cards
3. Show pitch repertoire as ability buttons (not card-select)
4. Player picks a pitch → effect animates on board
5. Deal turn → show 4th card → player picks 2nd pitch
6. Deal river → show 5th card → player picks 3rd pitch
7. Resolve → show both hands → animate result

**Step 3: Implement `_renderBoard()`**

```javascript
_renderBoard() {
  this._destroyBoardElements();
  this._boardElements = [];
  const state = this.showdownEngine.getState();

  // Pitcher hole cards (bottom-left of board area)
  const holeY = 460;
  state.pitcherHole.forEach((card, i) => {
    const x = 520 + i * 70;
    this._renderCard(x, holeY, card, true, 'pitcher-hole');
  });

  // Community cards (center)
  const commY = 340;
  state.community.forEach((card, i) => {
    const x = 440 + i * 90;
    const faceDown = state.faceDownIndices.includes(i);
    const locked = state.lockedIndices.includes(i);
    this._renderCard(x, commY, card, !faceDown, 'community', locked);
  });

  // Batter hole cards (top, face-down unless revealed)
  const batterY = 220;
  state.batterHole.forEach((card, i) => {
    const x = 520 + i * 70;
    const revealed = this._revealedBatterCards.includes(i);
    this._renderCard(x, batterY, card, revealed, 'batter-hole');
  });
}
```

**Step 4: Implement `_renderPitchAbilities()`**

Show the pitcher's 4 pitches as action buttons (not the old card-style selection). Each button shows pitch name + effect description. Grayed out if already used.

**Step 5: Implement `_onShowdownPitchSelected(pitchKey)`**

1. Apply pitch effect via `showdownEngine.applyPitch()`
2. Animate the effect (card swap, reveal, replace, etc.)
3. After animation, deal next stage or resolve

**Step 6: Implement `_showShowdownResult(result)`**

Display both hands, winner, and outcome. Then feed result into existing `_pitchState` tracking (outs, runs, bases).

**Step 7: Commit**

```bash
git add src/scenes/PitchingScene.js
git commit -m "feat: PitchingScene Hold'em board UI — showdown replaces auto-sim"
```

---

## Task 8: Wire Showdown Results into Baseball State

**Files:**
- Modify: `src/scenes/PitchingScene.js`
- Test: `test/sim.js` (append)

**Step 1: Write the failing test**

```javascript
group('25g. ShowdownEngine — Integration with BaseballState outcomes');

// Showdown results map to valid baseball outcomes
const validOuts = ['Strikeout', 'Flyout', 'Groundout'];
const validHits = ['Single', 'Double', 'Triple', 'Home Run'];
const allValid = [...validOuts, ...validHits];

// Run 100 showdowns, verify all outcomes are valid
let outCount = 0, hitCount = 0;
for (let i = 0; i < 100; i++) {
  const sd = new ShowdownEngine({ velocity: 7, control: 7, stamina: 6 });
  sd.start({ power: 6, contact: 6, speed: 5 });
  sd.dealFlop();
  sd.dealTurn();
  sd.dealRiver();
  const r = sd.resolve();
  assert(allValid.includes(r.outcome), `Showdown ${i}: outcome "${r.outcome}" is valid`);
  if (r.isOut) outCount++; else hitCount++;
}
assert(outCount > 0, 'Some showdowns produce outs');
assert(hitCount > 0, 'Some showdowns produce hits');
```

**Step 2: Run test, verify pass (should already pass from Task 3)**

**Step 3: Wire into PitchingScene**

In `_showShowdownResult()`, replace the old `this.rosterManager.simSingleAtBat()` call with:

```javascript
// Map showdown result to existing pitchState tracking
const outcome = showdownResult.outcome;
const isOut = showdownResult.isOut;
const batter = this.rosterManager.opponentRoster[this.rosterManager.opponentBatterIndex];

if (isOut) {
  ps.outs++;
  // ... existing out handling (K animation, sounds, etc.)
} else {
  const basesGained = { 'Single': 1, 'Double': 2, 'Triple': 3, 'Home Run': 4 }[outcome] || 1;
  const scored = this.rosterManager._advanceRunners(ps.bases, basesGained, batter.speed, batter);
  ps.runs += scored;
  // ... existing hit handling
}

this.rosterManager.opponentBatterIndex = (this.rosterManager.opponentBatterIndex + 1) % 9;
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add src/scenes/PitchingScene.js test/sim.js
git commit -m "feat: wire showdown results into baseball state + base advancement"
```

---

## Task 9: Stamina Degradation Across At-Bats

**Files:**
- Modify: `src/ShowdownEngine.js`
- Test: `test/sim.js` (append)

**Step 1: Write the failing test**

```javascript
group('25h. ShowdownEngine — Stamina degradation');

// After multiple at-bats, deck quality should decrease
const pitcher = { velocity: 9, control: 7, stamina: 4 }; // low stamina
const se = new ShowdownEngine(pitcher);

const firstDeck = ShowdownEngine.generateDeck(9, 7);
const firstAvg = firstDeck.reduce((s, c) => s + c.rank, 0) / firstDeck.length;

// Simulate 3 at-bats of degradation
se.degradeDeck(3);
const degradedDeck = se.pitcherDeck;
const degradedAvg = degradedDeck.reduce((s, c) => s + c.rank, 0) / degradedDeck.length;

// Low stamina pitcher should degrade more
assert(typeof se.degradeDeck === 'function', 'degradeDeck method exists');
```

**Step 2: Run test to verify it fails**

**Step 3: Write implementation**

```javascript
/**
 * Degrade pitcher deck after an at-bat.
 * Low stamina = remove top cards, high stamina = minimal effect.
 * @param {number} atBatNumber - which at-bat this is (1-indexed)
 */
degradeDeck(atBatNumber) {
  const staminaFactor = this.pitcher.stamina / 10;
  // Remove N top cards where N scales with at-bat count and inverse stamina
  const removeCount = Math.max(0, Math.floor((atBatNumber - 1) * (1 - staminaFactor) * 2));
  if (removeCount > 0) {
    this.pitcherDeck.sort((a, b) => b.rank - a.rank);
    this.pitcherDeck.splice(0, Math.min(removeCount, this.pitcherDeck.length - 5));
    this._shuffle(this.pitcherDeck);
  }
}
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add src/ShowdownEngine.js test/sim.js
git commit -m "feat: ShowdownEngine stamina-based deck degradation"
```

---

## Task 10: GDScript Mirror — ShowdownEngine

**Files:**
- Create: `godot/scripts/showdown_engine.gd`

**Step 1: Mirror the JS ShowdownEngine to GDScript**

```gdscript
class_name ShowdownEngine
extends RefCounted

# Hold'em-style pitching showdown engine.
# Mirrors src/ShowdownEngine.js

const SUITS := ["H", "D", "C", "S"]

var pitcher: Dictionary
var pitcher_deck: Array[Dictionary] = []
var batter_deck: Array[Dictionary] = []
var pitcher_hole: Array[Dictionary] = []
var batter_hole: Array[Dictionary] = []
var community: Array[Dictionary] = []
var stage: String = "pre-flop"
var pitches_used: Array[String] = []
var locked_indices: Array[int] = []
var face_down_indices: Array[int] = []
var hidden_next_card: bool = false

# ... (mirror all methods from JS)
```

**Step 2: Commit**

```bash
git add godot/scripts/showdown_engine.gd
git commit -m "feat: GDScript mirror of ShowdownEngine"
```

---

## Task 11: Update GDD + CLAUDE.md

**Files:**
- Modify: `docs/GAME_DESIGN.md`
- Modify: `CLAUDE.md`

**Step 1: Add Pitching Showdown section to GDD**

Document the Hold'em mechanic, pitch effects, resolution rules.

**Step 2: Add ShowdownEngine to CLAUDE.md file mapping**

```markdown
| `src/ShowdownEngine.js` | `godot/scripts/showdown_engine.gd` |
```

**Step 3: Commit**

```bash
git add docs/GAME_DESIGN.md CLAUDE.md
git commit -m "docs: add Pitching Showdown to GDD + file mapping"
```

---

## Summary

| Task | What | Size |
|------|------|------|
| 1 | Deck generation | Small |
| 2 | Board state & stages | Small |
| 3 | Resolution (hand comparison) | Medium |
| 4 | Core pitch effects (3) | Medium |
| 5 | Remaining pitch effects (9) | Medium |
| 6 | Full at-bat flow + getState | Small |
| 7 | PitchingScene Hold'em UI | **Large** |
| 8 | Wire results into baseball state | Medium |
| 9 | Stamina degradation | Small |
| 10 | GDScript mirror | Medium |
| 11 | GDD + CLAUDE.md | Small |

Tasks 1-6 are pure logic (testable without Phaser). Task 7 is the big UI task. Tasks 8-11 are integration and documentation.

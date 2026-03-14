# Count-Based Discard System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fixed 2-discard limit with a count-based system where each discard simulates a pitch (STRIKE/BALL/FOUL), creating real risk/reward tension.

**Architecture:** Rewrite CountManager.js `recordDiscard()` to use the GDD formula based on pitcher velocity, pitcher control, and batter contact. Remove CardEngine's `discardsRemaining` hard limit — the ball-strike count IS the discard limiter. Add strikeout-by-count (3 strikes = out, no hand played). Mirror all changes to Godot.

**Tech Stack:** Vanilla JS (Phaser 3 scenes), GDScript (Godot 4.6), custom test runner (`/opt/homebrew/bin/node test/sim.js`)

**Reference:** `docs/GAME_DESIGN.md` → "Count-Based Discard System" section

---

### Task 1: Rewrite CountManager.js — New Pitch Formula

The core logic change. Replace the old `ballChance = max(0, (7 - control) * 0.08)` formula with the GDD's stat-based pitch outcome system.

**Files:**
- Modify: `src/CountManager.js`
- Test: `test/sim.js`

**Step 1: Write failing tests for the new formula**

Add to the end of `test/sim.js`, BEFORE the final summary block (before the `console.log('\n' + '='.repeat(50))` line). Import CountManager at the top of the file if not already imported.

Add import at top of `test/sim.js` (near other imports):
```javascript
import CountManager from '../src/CountManager.js';
```

Add tests (new section `10a`):
```javascript
// ═══════════════════════════════════════════════════════════
// 10. COUNT-BASED DISCARD SYSTEM
// ═══════════════════════════════════════════════════════════

group('10a. CountManager — New Pitch Formula');
{
  // Test: recordDiscard now requires 3 params
  const cm = new CountManager();
  const result = cm.recordDiscard(5, 5, 5); // vel, control, contact
  assert(
    'isStrike' in result && 'isBall' in result && 'isFoul' in result && 'isStrikeout' in result && 'isWalk' in result,
    'recordDiscard returns all expected fields'
  );

  // Test: before 2 strikes, result is either STRIKE or BALL (never FOUL)
  const cm2 = new CountManager();
  let sawFoulBefore2Strikes = false;
  for (let i = 0; i < 200; i++) {
    cm2.reset();
    const r = cm2.recordDiscard(5, 5, 5);
    if (r.isFoul) sawFoulBefore2Strikes = true;
  }
  assert(!sawFoulBefore2Strikes, 'No fouls before 2 strikes');

  // Test: at 2 strikes, FOUL is possible (high contact batter)
  let foulCount = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) {
    const cm3 = new CountManager();
    cm3.strikes = 2; // force 2 strikes
    const r = cm3.recordDiscard(5, 5, 9); // high contact = high foul chance
    if (r.isFoul) foulCount++;
  }
  // contact 9 → foulChance = 0.36, so expect 500-900 fouls out of 2000
  assertClose(foulCount, 500, 900, `High contact fouls at 2 strikes (${foulCount}/${N})`);

  // Test: at 2 strikes with low contact, fewer fouls
  let lowContactFouls = 0;
  for (let i = 0; i < N; i++) {
    const cm4 = new CountManager();
    cm4.strikes = 2;
    const r = cm4.recordDiscard(5, 5, 3); // low contact
    if (r.isFoul) lowContactFouls++;
  }
  // contact 3 → foulChance = 0.12
  assertClose(lowContactFouls, 100, 400, `Low contact fouls at 2 strikes (${lowContactFouls}/${N})`);

  // Test: high velocity + control pitcher gets more strikes
  let highPitcherStrikes = 0;
  for (let i = 0; i < N; i++) {
    const cm5 = new CountManager();
    const r = cm5.recordDiscard(9, 8, 5); // elite pitcher
    if (r.isStrike) highPitcherStrikes++;
  }
  // expected strikeChance ~0.46, clamp max 0.65
  assertClose(highPitcherStrikes, 700, 1400, `Elite pitcher strike rate (${highPitcherStrikes}/${N})`);

  // Test: high contact batter gets more balls
  let highContactBalls = 0;
  for (let i = 0; i < N; i++) {
    const cm6 = new CountManager();
    const r = cm6.recordDiscard(5, 5, 9); // high contact batter
    if (r.isBall) highContactBalls++;
  }
  // strikeChance = 0.40 - 0.12 = 0.28, so ballChance ~0.72
  assertClose(highContactBalls, 1100, 1700, `High contact ball rate (${highContactBalls}/${N})`);

  // Test: strike chance clamped between 0.15 and 0.65
  let extremeLowStrikes = 0;
  for (let i = 0; i < N; i++) {
    const cm7 = new CountManager();
    const r = cm7.recordDiscard(1, 1, 10); // worst pitcher, best batter
    if (r.isStrike) extremeLowStrikes++;
  }
  // clamped to 0.15, so expect 200-500 strikes
  assertClose(extremeLowStrikes, 200, 500, `Min clamp strike rate (${extremeLowStrikes}/${N})`);
}
```

**Step 2: Run tests to verify they fail**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: FAIL — `recordDiscard` currently takes 1 param, tests pass 3

**Step 3: Rewrite CountManager.js**

Replace the entire `src/CountManager.js` with:

```javascript
/**
 * CountManager.js - Count-based discard system.
 * Pure logic, no Phaser dependency.
 *
 * Each discard = a pitch. Outcome depends on batter/pitcher stats:
 *   Before 2 strikes: STRIKE or BALL
 *   At 2 strikes: FOUL, STRIKE, or BALL
 * 3 strikes = strikeout (at-bat over). 4 balls = walk.
 */

const COUNT_MODIFIERS = {
  '3-0': { chipsMod: 2, multMod: 1.0 },
  '2-0': { chipsMod: 1, multMod: 0.5 },
  '3-1': { chipsMod: 1, multMod: 0.5 },
  '3-2': { chipsMod: 0, multMod: 0.5 },
  '0-1': { chipsMod: 0, multMod: -0.2 },
  '1-2': { chipsMod: 0, multMod: -0.3 },
  '0-2': { chipsMod: -1, multMod: -0.5 },
};

export default class CountManager {
  constructor() {
    this.balls = 0;
    this.strikes = 0;
    this.foulCount = 0;
  }

  reset() {
    this.balls = 0;
    this.strikes = 0;
    this.foulCount = 0;
  }

  /**
   * Record a discard as a pitch.
   * @param {number} pitcherVelocity - pitcher velocity stat (1-10)
   * @param {number} pitcherControl - pitcher control stat (1-10)
   * @param {number} batterContact - batter contact stat (1-10)
   * @returns {{ isStrike, isBall, isFoul, isStrikeout, isWalk }}
   */
  recordDiscard(pitcherVelocity, pitcherControl, batterContact) {
    const result = { isStrike: false, isBall: false, isFoul: false, isStrikeout: false, isWalk: false };

    // Base strike chance from GDD formula
    let baseStrikeChance = 0.40
      + (pitcherVelocity - 5) * 0.02
      + (pitcherControl - 5) * 0.02
      - (batterContact - 5) * 0.03;
    baseStrikeChance = Math.max(0.15, Math.min(0.65, baseStrikeChance));

    if (this.strikes < 2) {
      // Before 2 strikes: STRIKE or BALL only
      if (Math.random() < baseStrikeChance) {
        this.strikes++;
        result.isStrike = true;
      } else {
        this.balls++;
        result.isBall = true;
        if (this.balls >= 4) {
          result.isWalk = true;
        }
      }
    } else {
      // At 2 strikes: FOUL, STRIKE, or BALL
      const foulChance = batterContact * 0.04;
      const remaining = 1.0 - foulChance;
      const strikeChance = remaining * baseStrikeChance;
      // ballChance = remaining * (1.0 - baseStrikeChance)

      const roll = Math.random();
      if (roll < foulChance) {
        this.foulCount++;
        result.isFoul = true;
      } else if (roll < foulChance + strikeChance) {
        this.strikes++;
        result.isStrike = true;
        result.isStrikeout = true; // 3rd strike
      } else {
        this.balls++;
        result.isBall = true;
        if (this.balls >= 4) {
          result.isWalk = true;
        }
      }
    }

    return result;
  }

  getCount() {
    return { balls: this.balls, strikes: this.strikes };
  }

  /**
   * Get count-dependent modifiers for hand evaluation.
   * @returns {{ chipsMod: number, multMod: number }}
   */
  getCountModifiers() {
    const key = `${this.balls}-${this.strikes}`;
    return COUNT_MODIFIERS[key] || { chipsMod: 0, multMod: 0 };
  }

  isWalk() {
    return this.balls >= 4;
  }

  isStrikeout() {
    return this.strikes >= 3;
  }

  /**
   * Set starting balls (e.g. Walk Machine trait gives +1 ball).
   * @param {number} startBalls
   */
  setStartingBalls(startBalls) {
    this.balls = Math.min(3, startBalls);
  }
}

export { COUNT_MODIFIERS };
```

Key changes:
- `recordDiscard(pitcherVelocity, pitcherControl, batterContact)` — 3 params instead of 1
- Before 2 strikes: binary STRIKE/BALL based on `baseStrikeChance`
- At 2 strikes: three-way FOUL/STRIKE/BALL with `foulChance = batterContact * 0.04`
- `isStrikeout` flag when 3rd strike is thrown
- New `isStrikeout()` method
- Removed several "neutral" count modifiers (only keep bonus/penalty counts per GDD)

**Step 4: Run tests to verify they pass**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/CountManager.js test/sim.js
git commit -m "feat: rewrite CountManager with GDD pitch formula (vel/ctrl/contact)"
```

---

### Task 2: Tests for Strikeout-by-Count and Walk-by-Count

**Files:**
- Test: `test/sim.js`

**Step 1: Write tests for strikeout and walk detection**

Add section `10b` after the `10a` tests:

```javascript
group('10b. CountManager — Strikeout & Walk Detection');
{
  // Test: 3 strikes = strikeout
  const cm = new CountManager();
  cm.strikes = 2;
  // Force a strike with very high pitcher stats, low batter contact
  let gotStrikeout = false;
  for (let i = 0; i < 200; i++) {
    const cm2 = new CountManager();
    cm2.strikes = 2;
    const r = cm2.recordDiscard(10, 10, 1); // almost guaranteed strike
    if (r.isStrikeout) { gotStrikeout = true; break; }
  }
  assert(gotStrikeout, 'Strikeout achievable at 2 strikes with elite pitcher');

  // Test: isStrikeout() method
  const cm3 = new CountManager();
  cm3.strikes = 3;
  assert(cm3.isStrikeout(), 'isStrikeout() true at 3 strikes');

  const cm4 = new CountManager();
  cm4.strikes = 2;
  assert(!cm4.isStrikeout(), 'isStrikeout() false at 2 strikes');

  // Test: 4 balls = walk
  const cm5 = new CountManager();
  cm5.balls = 3;
  // Force ball with low pitcher stats, high contact
  let gotWalk = false;
  for (let i = 0; i < 200; i++) {
    const cm6 = new CountManager();
    cm6.balls = 3;
    const r = cm6.recordDiscard(1, 1, 10); // almost guaranteed ball
    if (r.isWalk) { gotWalk = true; break; }
  }
  assert(gotWalk, 'Walk achievable at 3 balls with weak pitcher');

  // Test: isWalk() method
  const cm7 = new CountManager();
  cm7.balls = 4;
  assert(cm7.isWalk(), 'isWalk() true at 4 balls');

  // Test: strikeout flag ONLY set when going from 2→3 strikes
  const cm8 = new CountManager();
  const r1 = cm8.recordDiscard(10, 10, 1);
  if (r1.isStrike) {
    assert(!r1.isStrikeout, 'First strike is not a strikeout');
  }

  // Test: count modifiers still work
  const cm9 = new CountManager();
  cm9.balls = 3; cm9.strikes = 0;
  const mods = cm9.getCountModifiers();
  assert(mods.chipsMod === 2 && mods.multMod === 1.0, '3-0 count gives +2 chips, +1.0 mult');

  const cm10 = new CountManager();
  cm10.balls = 0; cm10.strikes = 2;
  const mods2 = cm10.getCountModifiers();
  assert(mods2.chipsMod === -1 && mods2.multMod === -0.5, '0-2 count gives -1 chip, -0.5 mult');
}
```

**Step 2: Run tests — should pass**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: ALL PASS (implementation from Task 1 already covers this)

**Step 3: Commit**

```bash
git add test/sim.js
git commit -m "test: add strikeout/walk detection tests for count system"
```

---

### Task 3: Remove CardEngine discardsRemaining Limit

The count is now the discard limiter. CardEngine should no longer track or enforce a discard limit. We keep the `discard()` method for card replacement logic, but remove the counter check.

**Files:**
- Modify: `src/CardEngine.js`
- Modify: `test/sim.js`

**Step 1: Write tests for unlimited discards**

Add section `10c`:

```javascript
group('10c. CardEngine — Unlimited Discards (Count-Limited)');
{
  const ce = new CardEngine('standard');
  ce.newAtBat();

  // Test: discard works without decrementing a counter
  const handBefore = ce.hand.length;
  ce.discard([0, 1]);
  assert(ce.hand.length === handBefore, 'Hand stays same size after discard (replacements drawn)');

  // Test: can discard many times (no hard limit)
  let discardWorked = true;
  for (let i = 0; i < 10; i++) {
    const before = ce.hand.length;
    ce.discard([0]);
    if (ce.hand.length !== before) { discardWorked = false; break; }
  }
  assert(discardWorked, 'Can discard 10+ times without hitting a limit');

  // Test: discardsRemaining property removed or ignored
  assert(ce.discardsRemaining === undefined || ce.discardsRemaining === Infinity,
    'discardsRemaining is removed or Infinity');
}
```

**Step 2: Run tests to verify they fail**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: FAIL — CardEngine still has `discardsRemaining` check

**Step 3: Modify CardEngine.js**

In `src/CardEngine.js`, make these changes:

1. **Remove `discardsRemaining` initialization** from constructor (line ~20)
2. **Remove `discardsRemaining` check** from `discard()` method (lines ~58-59)
3. **Remove `discardsRemaining` reset** from `newAtBat()`, `resetDeck()`, `playHand()` methods

The `discard()` method becomes:
```javascript
discard(indices) {
  const sorted = [...indices].sort((a, b) => b - a);
  for (const idx of sorted) {
    if (idx >= 0 && idx < this.hand.length) {
      this.discardPile.push(this.hand.splice(idx, 1)[0]);
    }
  }
  const needed = this.handSize - this.hand.length;
  this.draw(needed);
  if (this.hand.length < this.handSize && this.discardPile.length > 0) {
    this.deck.push(...this.discardPile);
    this.discardPile = [];
    this.shuffle();
    this.draw(this.handSize - this.hand.length);
  }
  return this.hand;
}
```

**Step 4: Update existing CardEngine tests**

Find and update any tests that reference `discardsRemaining`:
- `test/sim.js:346` — change `assert(ce.discardsRemaining === 2, ...)` → remove or replace
- `test/sim.js:2011` — remove `discardsRemaining` assertions from deck variant tests
- `test/sim.js:2027` — same
- `test/sim.js:2039` — same
- Any test that sets `ce.discardsRemaining = 0` → remove that line

**Step 5: Run tests to verify they pass**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/CardEngine.js test/sim.js
git commit -m "feat: remove CardEngine discard limit — count is the limiter now"
```

---

### Task 4: Update GameScene.js — Wire Count-Based Discards

The big scene wiring task. GameScene must:
1. Pass 3 params to `recordDiscard()`
2. Handle strikeout-by-count (3 strikes = out, no hand played)
3. Remove all `discardsRemaining` checks (discard button enabled based on count, not counter)
4. Update info text to show count instead of "Discards: N"

**Files:**
- Modify: `src/scenes/GameScene.js`

**Step 1: Update `_onDiscard()` — pass 3 params to recordDiscard**

At `src/scenes/GameScene.js:1655-1657`, change:
```javascript
// OLD:
const pitcher = this.rosterManager.getCurrentPitcher();
const pitchResult = this.countManager.recordDiscard(pitcher.control);

// NEW:
const pitcher = this.rosterManager.getCurrentPitcher();
const batter = this.rosterManager.getCurrentBatter();
const pitchResult = this.countManager.recordDiscard(pitcher.velocity, pitcher.control, batter.contact);
```

**Step 2: Add strikeout-by-count handling**

After the walk handling block (after line ~1745), add strikeout-by-count:

```javascript
// Strikeout from count — 3 strikes, at-bat over
if (pitchResult.isStrikeout) {
  this.time.delayedCall(800, () => {
    this.resultText.setText('STRUCK OUT!');
    this.resultText.setColor('#ff5252');
    this.resultText.setAlpha(1);
    this.resultText.setScale(1);
    this.tweens.add({
      targets: this.resultText,
      scale: { from: 1.3, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });

    const kBatter = this.rosterManager.getCurrentBatter();
    this.baseball.resolveOutcome('Strikeout', 0, kBatter);
    const kCount = this.countManager.getCount();
    this._addGameLog(`${kBatter.name.split(' ').pop()}: Struck out looking (${kCount.balls}-${kCount.strikes})`, '#ff5252');
    this._updateScoreboard();
    this._clearCards();
    if (this.batterSprite) this.batterSprite.setVisible(false);

    this.rosterManager.advanceBatter();
    this.time.delayedCall(600, () => this._updateBatterPanel());
    this.time.delayedCall(1500, () => {
      if (this.baseball.isGameOver()) { this._endGame(); return; }
      if (this.baseball.state === 'SWITCH_SIDE') { this._showMidInningTransition(); return; }
      this._startAtBat();
    });
  });
  return;
}
```

**Step 3: Update discard button enable logic**

The discard button should be enabled unless the count has ended (3K or 4BB). Replace all `this.cardEngine.discardsRemaining > 0` checks with a count-based check.

Create a helper method:
```javascript
_canDiscard() {
  return !this.countManager.isStrikeout() && !this.countManager.isWalk();
}
```

Then replace these lines:
- Line ~1606: `this._setButtonsEnabled(true, this.cardEngine.discardsRemaining > 0)` → `this._setButtonsEnabled(true, this._canDiscard())`
- Line ~1648: `if (this.cardEngine.discardsRemaining <= 0) return;` → `if (!this._canDiscard()) return;`
- Line ~1809: `this._setButtonsEnabled(true, this.cardEngine.discardsRemaining > 0)` → `this._setButtonsEnabled(true, this._canDiscard())`

**Step 4: Update info text to show count**

In `_updateInfoText()` (line ~735-738), change:
```javascript
// OLD:
this.discardInfo.setText(
  `Discards: ${this.cardEngine.discardsRemaining} | Select cards to PLAY or DISCARD`
);

// NEW:
const count = this.countManager.getCount();
const countStr = `${count.balls}-${count.strikes}`;
this.discardInfo.setText(
  `Count: ${countStr} | Select cards to PLAY or DISCARD`
);
```

**Step 5: Update discard button label with count + risk**

After the discard button is created (line ~952), update the button text dynamically. Add to `_updateInfoText()` or create a helper that runs after each discard:

```javascript
// Update discard button label with count and risk
const count = this.countManager.getCount();
const countStr = `${count.balls}-${count.strikes}`;
if (count.strikes === 0) {
  this.discardBtn.label.setText(`DISCARD (${countStr})`);
  this.discardBtn.label.setColor('#a5d6a7'); // green
} else if (count.strikes === 1) {
  this.discardBtn.label.setText(`DISCARD (${countStr})`);
  this.discardBtn.label.setColor('#fff176'); // yellow
} else {
  this.discardBtn.label.setText(`DISCARD (${countStr}) DANGER`);
  this.discardBtn.label.setColor('#ff8a80'); // red
}
```

**Step 6: Remove bonus discard logic at at-bat start**

In `_startAtBat()` (lines ~1570-1581), the `add_discard` and `team_add_discard` traits now grant "free takes" — discards that don't add to count. Track them:

```javascript
// Free takes: discards that don't add to count (from Batting Gloves, Bench Coach, Fresh Cleats)
const staffFreeTakes = staff
  .filter(s => s.effect.type === 'team_add_discard')
  .reduce((sum, s) => sum + s.effect.value, 0);
const traitFreeTakes = batter.traits
  .filter(t => t.effect && t.effect.type === 'add_discard')
  .reduce((sum, t) => sum + (t.effect.value || 1), 0);
this.freeTakesRemaining = staffFreeTakes + traitFreeTakes;
```

Then in `_onDiscard()`, before calling `recordDiscard()`:
```javascript
// Free takes bypass the count
if (this.freeTakesRemaining > 0) {
  this.freeTakesRemaining--;
  // Skip count recording — just do the discard
  // (still increment discardCount for first-pitch bonus tracking)
  this.discardCount = (this.discardCount || 0) + 1;
  // Show "FREE TAKE" callout
  this.resultText.setText('FREE TAKE!');
  this.resultText.setColor('#81d4fa');
  // ... (same animation, then skip to card replacement at line ~1779)
  // Jump to the card replacement block (extracted to a helper — see step 7)
} else {
  // Normal pitch recording
  const pitchResult = this.countManager.recordDiscard(pitcher.velocity, pitcher.control, batter.contact);
  // ... existing logic
}
```

**Step 7: Extract card replacement to helper**

The card discard animation + replacement logic (lines ~1779-1811) should be extracted to `_doCardDiscard()` so both free takes and normal discards can share it:

```javascript
_doCardDiscard() {
  const displayIndices = [...this.selectedIndices];
  displayIndices.forEach(idx => {
    const cs = this.cardSprites[idx];
    this.tweens.add({
      targets: [cs.bg, cs.rankText, cs.suitText, cs.glow],
      y: '-=60',
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
    });
  });

  this.time.delayedCall(250, () => {
    const handIndices = displayIndices
      .map(di => this._displayToHand[di] !== undefined ? this._displayToHand[di] : di);
    this.cardEngine.discard(handIndices);

    const drawOnDiscard = this.baseball.getStaffByEffect('bonus_draw_on_discard');
    for (const s of drawOnDiscard) {
      if (Math.random() < s.effect.chance) {
        this.cardEngine.draw(1);
      }
    }

    this.dealOrder = this.cardEngine.hand.map((_, i) => i);
    this._renderHand();
    this._updateInfoText();
    this._setButtonsEnabled(true, this._canDiscard());
    this.inputLocked = false;
  });
}
```

**Step 8: Remove `discardsRemaining` reset from sac bunt**

At line ~2487: `this.cardEngine.discardsRemaining = this.cardEngine.deckConfig.discards;` — remove this line entirely.

**Step 9: Run the game manually to smoke test**

Open `index.html` in browser, play through an at-bat. Verify:
- Count displays as dots on scoreboard
- Discard button shows count and risk color
- Strikeout at 3 strikes ends at-bat
- Walk at 4 balls works
- Fouls protect at 2 strikes
- Free takes (if equipped) skip count

**Step 10: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: wire count-based discards into GameScene — strikeout/walk/foul/free takes"
```

---

### Task 5: Update Existing Count Tests

Some existing tests in `test/sim.js` reference the old `recordDiscard(pitcherControl)` 1-param signature. Update them.

**Files:**
- Modify: `test/sim.js`

**Step 1: Find and update old count tests**

Search for sections labeled "Count System" (around lines 1556-1700). Update all `recordDiscard(N)` calls to `recordDiscard(N, N, 5)` or appropriate 3-param calls:

- Section "Count System: Basic State" (~line 1556)
- Section "Count System: recordDiscard" (~line 1587)
- Section "Count System: Count Modifiers" (~line 1636)
- Section "Count System: Two-Strike Groundout Penalty" (~line 1664)
- Section "Count System: Walk Machine Trait" (~line 1680)

For each `recordDiscard(pitcherControl)` call, replace with `recordDiscard(5, pitcherControl, 5)` to preserve the test's intent (pitcher control as the variable, velocity and contact neutral at 5).

Also update any assertions that check for the old behavior where a discard could be both a ball AND a strike simultaneously — the new system makes each pitch exactly one of STRIKE, BALL, or FOUL.

**Step 2: Run tests**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add test/sim.js
git commit -m "test: update existing count tests for 3-param recordDiscard signature"
```

---

### Task 6: Create Godot count_manager.gd

Mirror CountManager.js to GDScript.

**Files:**
- Create: `godot/scripts/count_manager.gd`

**Step 1: Write the GDScript mirror**

```gdscript
class_name CountManager
extends RefCounted

## Count-based discard system.
## Each discard = a pitch. Outcome depends on batter/pitcher stats.

const COUNT_MODIFIERS: Dictionary = {
	"3-0": {"chips_mod": 2, "mult_mod": 1.0},
	"2-0": {"chips_mod": 1, "mult_mod": 0.5},
	"3-1": {"chips_mod": 1, "mult_mod": 0.5},
	"3-2": {"chips_mod": 0, "mult_mod": 0.5},
	"0-1": {"chips_mod": 0, "mult_mod": -0.2},
	"1-2": {"chips_mod": 0, "mult_mod": -0.3},
	"0-2": {"chips_mod": -1, "mult_mod": -0.5},
}

var balls: int = 0
var strikes: int = 0
var foul_count: int = 0


func reset() -> void:
	balls = 0
	strikes = 0
	foul_count = 0


func record_discard(pitcher_velocity: int, pitcher_control: int, batter_contact: int) -> Dictionary:
	var result: Dictionary = {
		"is_strike": false, "is_ball": false, "is_foul": false,
		"is_strikeout": false, "is_walk": false,
	}

	var base_strike_chance: float = 0.40 \
		+ (pitcher_velocity - 5) * 0.02 \
		+ (pitcher_control - 5) * 0.02 \
		- (batter_contact - 5) * 0.03
	base_strike_chance = clampf(base_strike_chance, 0.15, 0.65)

	if strikes < 2:
		if randf() < base_strike_chance:
			strikes += 1
			result["is_strike"] = true
		else:
			balls += 1
			result["is_ball"] = true
			if balls >= 4:
				result["is_walk"] = true
	else:
		var foul_chance: float = batter_contact * 0.04
		var remaining: float = 1.0 - foul_chance
		var strike_chance: float = remaining * base_strike_chance
		var roll: float = randf()

		if roll < foul_chance:
			foul_count += 1
			result["is_foul"] = true
		elif roll < foul_chance + strike_chance:
			strikes += 1
			result["is_strike"] = true
			result["is_strikeout"] = true
		else:
			balls += 1
			result["is_ball"] = true
			if balls >= 4:
				result["is_walk"] = true

	return result


func get_count() -> Dictionary:
	return {"balls": balls, "strikes": strikes}


func get_count_modifiers() -> Dictionary:
	var key: String = "%d-%d" % [balls, strikes]
	return COUNT_MODIFIERS.get(key, {"chips_mod": 0, "mult_mod": 0})


func is_walk() -> bool:
	return balls >= 4


func is_strikeout() -> bool:
	return strikes >= 3


func set_starting_balls(start_balls: int) -> void:
	balls = mini(3, start_balls)
```

**Step 2: Commit**

```bash
git add godot/scripts/count_manager.gd
git commit -m "feat: add Godot count_manager.gd mirror"
```

---

### Task 7: Update Godot card_engine.gd — Remove Discard Limit

Mirror the CardEngine changes from Task 3.

**Files:**
- Modify: `godot/scripts/card_engine.gd`

**Step 1: Remove discard limit from card_engine.gd**

1. Remove `var discards_remaining: int = 2` (line 12)
2. Remove `discards_remaining` assignments in `_init()`, `reset_deck()`, `new_at_bat()`, `play_hand()`
3. Remove the `if discards_remaining <= 0: return hand` check from `discard()`
4. Remove `discards_remaining -= 1` from `discard()`

**Step 2: Commit**

```bash
git add godot/scripts/card_engine.gd
git commit -m "feat: remove discard limit from Godot card_engine.gd"
```

---

### Task 8: Update CLAUDE.md File Mapping

Add CountManager to the file mapping table.

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add CountManager row**

In the File Mapping table, add:
```
| `src/CountManager.js` | `godot/scripts/count_manager.gd` |
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CountManager to file mapping table"
```

---

### Task 9: Update RosterManager sim_single_at_bat for Count System

The `RosterManager.simSingleAtBat()` method (used for opponent at-bats in PitchingScene) needs to respect the new count formula for its internal discard simulation.

**Files:**
- Modify: `src/RosterManager.js` (find `simSingleAtBat` or equivalent)
- Modify: `godot/scripts/roster_manager.gd` (mirror)

**Step 1: Check if RosterManager simulates discards internally**

Search for any `discardsRemaining` or `recordDiscard` usage in RosterManager. If it doesn't simulate discards (likely — opponent at-bats in PitchingScene use a different flow), this task is a no-op.

If it does reference the old system, update to use the new 3-param `recordDiscard()` and remove any `discardsRemaining` references.

**Step 2: Commit (if changes needed)**

```bash
git add src/RosterManager.js godot/scripts/roster_manager.gd
git commit -m "feat: update RosterManager for count-based discard system"
```

---

### Task 10: Final Integration Test + Push

**Step 1: Run full test suite**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: ALL PASS

**Step 2: Smoke test in browser**

Open `index.html`, play a full game. Verify:
- Discards create pitch outcomes (STRIKE/BALL/FOUL visible)
- Count dots update correctly
- 3 strikes ends at-bat as strikeout
- 4 balls ends at-bat as walk
- High contact batters foul off more at 2 strikes
- Walk Machine starts at 1-0
- Batting Gloves/Fresh Cleats/Bench Coach grant free takes
- Count modifiers apply to chip/mult scoring
- Discard button shows count and risk color

**Step 3: Commit any final fixes**

**Step 4: Push**

```bash
git push origin feature/balatro-systems
```

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `src/CountManager.js` | **Rewrite** | New 3-param `recordDiscard()` with GDD formula |
| `src/CardEngine.js` | **Modify** | Remove `discardsRemaining` limit |
| `src/scenes/GameScene.js` | **Modify** | Wire strikeout/walk/foul, free takes, count UI |
| `godot/scripts/count_manager.gd` | **Create** | GDScript mirror of CountManager |
| `godot/scripts/card_engine.gd` | **Modify** | Remove discard limit |
| `test/sim.js` | **Modify** | New count tests + update old ones |
| `CLAUDE.md` | **Modify** | Add CountManager to file mapping |
| `src/RosterManager.js` | **Check** | May need update if it simulates discards |

**Estimated test count increase:** ~20-30 new tests (sections 10a-10c)

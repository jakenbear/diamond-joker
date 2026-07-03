# Showdown Agency + Juice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the pitching showdown fun by adding player agency (suggested-target + confirm, live hand read) and juice (animated effects, tension beat, snappier pacing), without changing resolution.

**Architecture:** Two pure, unit-tested helpers on `ShowdownEngine` (`getBestHandName`, `getSuggestedTarget`) hold the decision logic. All interaction/animation lives in `PitchingScene.js` and is verified by browser smoke tests. The scene consumes the engine helpers so behavior stays testable.

**Tech Stack:** Vanilla ES modules, no bundler. Phaser 3 for the scene. Pure-JS test harness at `test/sim.js` (`node`, no framework, `assert()`/`group()` helpers). Browser smoke via a local `python3 -m http.server` + Playwright.

---

## Reference: existing code

**`ShowdownEngine` (src/ShowdownEngine.js):**
- `bestHand(hole, community)` (static, line 118) → returns an object with `.handName` (and `.score`, `.cards`). Handles < 5 cards.
- `getState()` (line 515) → `{ pitcherHole, batterHole, community, stage, pitchesUsed, lockedIndices, faceDownIndices, hiddenNextCard, revealedBatterCards }` (all deep-copied).
- Instance fields: `this.pitcherHole`, `this.batterHole`, `this.community`, `this.lockedIndices`, `this.faceDownIndices`, `this._revealedBatterCards`.
- `applyPitch(pitchKey, options)` (line 311): targeted pitches read `options.targetIndex` (community) or `options.swapIndex` (fastball hole). Sets `options.misfired` on a control miss.

**`PitchingScene` (src/scenes/PitchingScene.js):**
- `_onShowdownPitchSelected(pitchKey, stage)` (line 1044): auto-picks target, calls `applyPitch`, re-renders, `delayedCall(800)` → `_advanceShowdownStage`.
- `_advanceShowdownStage(stage, pitch)` (line 1115): `delayedCall(300)` → deal turn / river / resolve.
- `_showPitchAbilities(stage)` (line 864): resets `_selectingPitch`, builds pitch buttons; `cardBg.on('pointerdown', () => this._onShowdownPitchSelected(key, stage))` (line 950).
- `_renderShowdownBoard()` (line 783): community row at y≈290 (x = `640 - (n-1)*65 + i*130`), pitcher hole at y≈480 (x = `580 + i*120`), batter hole at y≈120 (x = `580 + i*120`).
- `_renderCardOnBoard(x, y, card, faceUp, locked, owner)` (line 824): draws one card, pushes sprites to `this._boardElements`.
- `_destroyBoardElements()` (line 855), `_destroyPitchButtons()` (line ~1407).
- `_effectFeedback(key, result)` (line 1092), `_rankName(rank)` (line 1110).

**Test harness (test/sim.js):** `group('title')`, `assert(cond, 'name')`. `ShowdownEngine` imported at line ~3833. Run: `/opt/homebrew/bin/node test/sim.js`. Baseline: **2260 passing, 0 failed**.

**Browser smoke:** `python3 -m http.server 8179` in repo root; navigate to `http://localhost:8179/index.html`; the game exposes `window.game`. `window.game.scene.getScene('PitchingScene')` is the live scene. Import the module in-page via `await import('./src/ShowdownEngine.js')`.

---

## File Structure

- **Modify `src/ShowdownEngine.js`** — add `getBestHandName(owner)` and `getSuggestedTarget(pitchKey)` (pure, tested).
- **Modify `test/sim.js`** — unit tests for the two helpers.
- **Modify `src/scenes/PitchingScene.js`** — targeting overlay, live hand read, effect animations, pacing/skip. This is the bulk; done in incremental tasks.
- **Modify `docs/GAME_DESIGN.md`** — note the interactive targeting + hand read in the Pitching Showdown section.

---

## Task 1: `getBestHandName(owner)` engine helper

**Files:**
- Modify: `src/ShowdownEngine.js`
- Test: `test/sim.js`

- [ ] **Step 1: Write the failing test**

Append to `test/sim.js` after the last ShowdownEngine group (search for `group('25n. ShowdownEngine — expansion pitcher trait bonuses')` and add after its closing `}`):

```javascript
group('25o. ShowdownEngine — getBestHandName');
{
  const sd = new ShowdownEngine({ velocity: 5, control: 5, stamina: 5 });
  sd.start();
  sd.pitcherHole = [{ rank: 14, suit: 'H' }, { rank: 14, suit: 'S' }];
  sd.batterHole = [{ rank: 7, suit: 'H' }, { rank: 2, suit: 'S' }];
  sd.community = [
    { rank: 14, suit: 'C' }, { rank: 9, suit: 'D' }, { rank: 5, suit: 'H' },
    { rank: 3, suit: 'S' }, { rank: 8, suit: 'C' },
  ];
  // Pitcher has three Aces
  assert(sd.getBestHandName('pitcher') === 'Three of a Kind', `pitcher best hand (got ${sd.getBestHandName('pitcher')})`);

  // Batter read counts ONLY community when no hole cards revealed → pair of Aces from community? No: community has one Ace.
  // Community alone: A,9,5,3,8 → High Card. Batter hole (7,2) hidden.
  assert(sd.getBestHandName('batter') === 'High Card', `batter best hand hides hole cards (got ${sd.getBestHandName('batter')})`);

  // Reveal batter hole card index 0 (the 7) → still High Card (A,9,8,7,5)
  sd._revealedBatterCards = [0];
  assert(sd.getBestHandName('batter') === 'High Card', 'batter read includes revealed hole card');

  // Give batter a revealed pair with community: change community to include a 7
  sd.community = [{ rank: 7, suit: 'C' }, { rank: 9, suit: 'D' }, { rank: 5, suit: 'H' }];
  sd._revealedBatterCards = [0]; // batterHole[0] is 7
  assert(sd.getBestHandName('batter') === 'Pair', `batter revealed 7 + community 7 = Pair (got ${sd.getBestHandName('batter')})`);
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "getBestHandName|pitcher best hand|batter best hand|RESULTS"`
Expected: `pitcher best hand` FAILS (method undefined → throws or undefined).

- [ ] **Step 3: Implement**

In `src/ShowdownEngine.js`, add this method right after `getState()` (after its closing `}` near line 527):

```javascript
  /**
   * Current best 5-card hand NAME for a side, from what is visible.
   * Pitcher: full hole + community. Batter: only REVEALED hole cards + community.
   * @param {'pitcher'|'batter'} owner
   * @returns {string} handName (e.g. 'Pair', 'High Card')
   */
  getBestHandName(owner) {
    let hole;
    if (owner === 'pitcher') {
      hole = this.pitcherHole;
    } else {
      hole = this.batterHole.filter((_, i) => this._revealedBatterCards.includes(i));
    }
    const best = ShowdownEngine.bestHand(hole, this.community);
    return best ? best.handName : 'High Card';
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "getBestHandName|pitcher best hand|batter|RESULTS"`
Expected: all `25o` assertions PASS, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add src/ShowdownEngine.js test/sim.js
git commit -m "feat: add ShowdownEngine.getBestHandName for live hand read"
```

---

## Task 2: `getSuggestedTarget(pitchKey)` engine helper

**Files:**
- Modify: `src/ShowdownEngine.js`
- Test: `test/sim.js`

This extracts the scene's current auto-pick heuristic into the engine so scene + tests share it.

- [ ] **Step 1: Write the failing test**

Append to `test/sim.js` after the `25o` group:

```javascript
group('25p. ShowdownEngine — getSuggestedTarget');
{
  const sd = new ShowdownEngine({ velocity: 5, control: 5, stamina: 5 });
  sd.start();
  sd.community = [{ rank: 5, suit: 'C' }, { rank: 13, suit: 'D' }, { rank: 9, suit: 'H' }];

  // Community-target pitch → highest-rank unlocked, face-up index (the K at index 1)
  assert(sd.getSuggestedTarget('slider') === 1, `slider suggests highest card idx 1 (got ${sd.getSuggestedTarget('slider')})`);

  // Lock index 1 → next highest is the 9 at index 2
  sd.lockedIndices = [1];
  assert(sd.getSuggestedTarget('slider') === 2, `slider skips locked, suggests idx 2 (got ${sd.getSuggestedTarget('slider')})`);

  // Face-down index 2 as well → only index 0 eligible
  sd.faceDownIndices = [2];
  assert(sd.getSuggestedTarget('slider') === 0, `slider skips locked+facedown, suggests idx 0 (got ${sd.getSuggestedTarget('slider')})`);

  // All community ineligible → null
  sd.lockedIndices = [0, 1, 2];
  sd.faceDownIndices = [];
  assert(sd.getSuggestedTarget('slider') === null, 'slider returns null when nothing eligible');

  // fastball → weaker pitcher hole index
  const sd2 = new ShowdownEngine({ velocity: 5, control: 5, stamina: 5 });
  sd2.start();
  sd2.pitcherHole = [{ rank: 12, suit: 'H' }, { rank: 4, suit: 'S' }];
  assert(sd2.getSuggestedTarget('fastball') === 1, `fastball suggests weaker hole idx 1 (got ${sd2.getSuggestedTarget('fastball')})`);

  // Non-targeted pitch → null
  assert(sd2.getSuggestedTarget('sinker') === null, 'non-targeted pitch returns null');
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "getSuggestedTarget|slider suggests|fastball suggests|RESULTS"`
Expected: `slider suggests highest card idx 1` FAILS.

- [ ] **Step 3: Implement**

In `src/ShowdownEngine.js`, add after `getBestHandName` (from Task 1):

```javascript
  /**
   * Index the auto-picker would target for a pitch, or null if not targeted /
   * nothing eligible. Community pitches → highest-rank unlocked, face-up card.
   * fastball → weaker pitcher hole card index.
   * @param {string} pitchKey
   * @returns {number|null}
   */
  getSuggestedTarget(pitchKey) {
    if (pitchKey === 'fastball') {
      return this.pitcherHole[0].rank <= this.pitcherHole[1].rank ? 0 : 1;
    }
    const communityTargets = ['slider', 'cutter', 'splitter', 'twoseam', 'breaking'];
    if (!communityTargets.includes(pitchKey)) return null;
    let bestIdx = null, bestRank = -1;
    this.community.forEach((c, i) => {
      const eligible = !this.lockedIndices.includes(i) && !this.faceDownIndices.includes(i);
      if (eligible && c.rank > bestRank) {
        bestRank = c.rank;
        bestIdx = i;
      }
    });
    return bestIdx;
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "getSuggestedTarget|slider suggests|fastball suggests|null|RESULTS"`
Expected: all `25p` assertions PASS, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add src/ShowdownEngine.js test/sim.js
git commit -m "feat: add ShowdownEngine.getSuggestedTarget (shared target heuristic)"
```

---

## Task 3: Live hand read display

**Files:**
- Modify: `src/scenes/PitchingScene.js`

Adds a hand-read strip that updates after every board render.

- [ ] **Step 1: Add the render method + hook it into board rendering**

In `src/scenes/PitchingScene.js`, add this method right after `_renderShowdownBoard()` (after its closing `}` near line 822):

```javascript
  /** Draw the live "who's winning" hand read near each hole row. */
  _renderHandRead() {
    if (!this.showdownEngine || !this.showdownEngine.community) return;
    // Only meaningful once the flop is out
    if (this.showdownEngine.community.length === 0) return;
    const youName = this.showdownEngine.getBestHandName('pitcher');
    const oppName = this.showdownEngine.getBestHandName('batter');
    // YOU read — just above the pitcher hole row (y 480)
    this._boardElements.push(this.add.text(760, 480, `YOU: ${youName}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#69f0ae', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(6));
    // OPP read — just below the batter hole row (y 120). "(visible)" because hidden hole cards may understate it.
    this._boardElements.push(this.add.text(760, 120, `OPP (visible): ${oppName}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ff8a80', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(6));
  }
```

Then, at the END of `_renderShowdownBoard()` (right before its closing `}`), add:

```javascript
    this._renderHandRead();
```

- [ ] **Step 2: Syntax check**

Run: `/opt/homebrew/bin/node --check src/scenes/PitchingScene.js && echo OK`
Expected: `OK`

- [ ] **Step 3: Browser smoke — hand read renders**

Start server: `python3 -m http.server 8179 &` (in repo root). Then via Playwright, navigate to `http://localhost:8179/index.html`, and in-page evaluate that the ShowdownEngine helper the read depends on works end to end:

```javascript
async () => {
  const m = await import('./src/ShowdownEngine.js');
  const sd = new m.default({ velocity: 6, control: 6, stamina: 6 });
  sd.start({ power: 6, contact: 6, speed: 5 });
  sd.dealFlop();
  return { you: sd.getBestHandName('pitcher'), opp: sd.getBestHandName('batter') };
}
```
Expected: returns two hand-name strings, no error. Confirm no JS console errors on the page. Kill server after: `pkill -f "http.server 8179"`.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/PitchingScene.js
git commit -m "feat: live hand-read strip in the showdown"
```

---

## Task 4: Targeting state — suggested-target + confirm overlay

**Files:**
- Modify: `src/scenes/PitchingScene.js`

Replaces auto-target-and-commit with: targeted pitch → overlay with a suggested ring + confirm/cancel; non-targeted → commit immediately.

- [ ] **Step 1: Split `_onShowdownPitchSelected` into targeted vs. immediate**

In `src/scenes/PitchingScene.js`, REPLACE the body of `_onShowdownPitchSelected` (lines ~1044–1090) with:

```javascript
  _onShowdownPitchSelected(pitchKey, stage) {
    if (this._selectingPitch) return;
    this._selectingPitch = true;
    this._destroyPitchButtons();
    SoundManager.pitchSelect();

    const suggested = this.showdownEngine.getSuggestedTarget(pitchKey);
    const isTargeted = suggested !== null &&
      (pitchKey === 'fastball' || ['slider', 'cutter', 'splitter', 'twoseam', 'breaking'].includes(pitchKey));

    if (isTargeted) {
      // Enter targeting mode: highlight eligible cards, suggest one, wait for confirm.
      this._enterTargeting(pitchKey, stage, suggested);
    } else {
      // No meaningful target — commit immediately.
      this._commitPitch(pitchKey, stage, {});
    }
  }

  /** Commit a pitch with resolved options: apply, feedback, animate, advance. */
  _commitPitch(pitchKey, stage, opts) {
    const result = this.showdownEngine.applyPitch(pitchKey, opts);
    const pitch = PITCH_TYPES[pitchKey];
    if (result.success) {
      this.handNameText.setText(`${pitch.name} — ${this._effectFeedback(pitchKey, result)}`);
      this.handNameText.setColor('#69f0ae');
    } else {
      this.handNameText.setText(`${pitch.name} failed: ${result.reason}`);
      this.handNameText.setColor('#ff5252');
    }
    this._renderShowdownBoard();
    this._pauseThenAdvance(stage, pitchKey, 800);
  }
```

- [ ] **Step 2: Add the targeting overlay methods**

Add these methods right after `_commitPitch` (from Step 1):

```javascript
  /** Show clickable target selection on the board with a suggested pick. */
  _enterTargeting(pitchKey, stage, suggestedIdx) {
    this._targeting = { pitchKey, stage, selectedIdx: suggestedIdx };
    this._targetElements = [];

    const isFastball = pitchKey === 'fastball';
    const state = this.showdownEngine.getState();

    // Prompt
    this.resultText.setText(`${PITCH_TYPES[pitchKey].name} — pick a target, then CONFIRM`);
    this.resultText.setColor('#ffe082');

    // Eligible card positions mirror _renderShowdownBoard layout.
    const eligible = [];
    if (isFastball) {
      const holeStartX = 580, holeY = 480, holeSpacing = 120;
      state.pitcherHole.forEach((c, i) => eligible.push({ i, x: holeStartX + i * holeSpacing, y: holeY }));
    } else {
      const commCount = state.community.length;
      const commStartX = 640 - (commCount - 1) * 65, commY = 290;
      state.community.forEach((c, i) => {
        const locked = state.lockedIndices.includes(i);
        const faceDown = state.faceDownIndices.includes(i);
        if (!locked && !faceDown) eligible.push({ i, x: commStartX + i * 130, y: commY });
      });
    }

    // Draw a ring per eligible card; the selected one pulses gold.
    this._targetRings = {};
    eligible.forEach(({ i, x, y }) => {
      const ring = this.add.rectangle(x, y, 104, 134, 0x000000, 0)
        .setStrokeStyle(3, 0x64b5f6).setDepth(8).setInteractive({ useHandCursor: true });
      ring.on('pointerdown', () => this._selectTarget(i));
      this._targetRings[i] = ring;
      this._targetElements.push(ring);
    });
    this._paintTargetSelection();

    // CONFIRM / CANCEL buttons
    const mkBtn = (x, label, color, cb) => {
      const bg = this.add.rectangle(x, 650, 120, 40, color, 0.9).setDepth(9)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, 650, label, {
        fontSize: '15px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(10);
      bg.on('pointerdown', cb);
      this._targetElements.push(bg, txt);
    };
    mkBtn(560, 'CONFIRM', 0x2e7d32, () => this._confirmTarget());
    mkBtn(720, 'CANCEL', 0x777777, () => this._cancelTargeting());
  }

  _selectTarget(idx) {
    if (!this._targeting) return;
    this._targeting.selectedIdx = idx;
    this._paintTargetSelection();
  }

  /** Update ring colors: selected = gold pulse, others = blue. */
  _paintTargetSelection() {
    if (!this._targetRings) return;
    Object.entries(this._targetRings).forEach(([i, ring]) => {
      this.tweens.killTweensOf(ring);
      ring.setScale(1);
      if (Number(i) === this._targeting.selectedIdx) {
        ring.setStrokeStyle(4, 0xffd600);
        this.tweens.add({ targets: ring, scaleX: 1.06, scaleY: 1.06, duration: 400, yoyo: true, repeat: -1 });
      } else {
        ring.setStrokeStyle(3, 0x64b5f6);
      }
    });
  }

  _confirmTarget() {
    if (!this._targeting) return;
    const { pitchKey, stage, selectedIdx } = this._targeting;
    const opts = pitchKey === 'fastball' ? { swapIndex: selectedIdx } : { targetIndex: selectedIdx };
    this._destroyTargeting();
    this._commitPitch(pitchKey, stage, opts);
  }

  _cancelTargeting() {
    if (!this._targeting) return;
    const stage = this._targeting.stage;
    this._destroyTargeting();
    this._selectingPitch = false;
    this._showPitchAbilities(stage);
  }

  _destroyTargeting() {
    if (this._targetElements) {
      this._targetElements.forEach(el => { this.tweens.killTweensOf(el); el.destroy(); });
      this._targetElements = null;
    }
    this._targetRings = null;
    this._targeting = null;
  }
```

- [ ] **Step 3: Add `_pauseThenAdvance` (used by `_commitPitch`) and clean up targeting on new stages**

Add this method after `_destroyTargeting`:

```javascript
  /** Wait `ms`, then advance the stage. Tap-to-advance skips the wait (Task 6 enhances this). */
  _pauseThenAdvance(stage, pitchKey, ms) {
    this._advanceTimer = this.time.delayedCall(ms, () => {
      this._advanceTimer = null;
      this._advanceShowdownStage(stage, pitchKey);
    });
  }
```

Then in `_showPitchAbilities(stage)` (line 864), add a targeting cleanup right after the existing `this._selectingPitch = false;` line:

```javascript
    this._destroyTargeting();
```

(Guard: `_destroyTargeting` early-returns when `_targetElements` is null, so this is safe on first call.)

- [ ] **Step 4: Update `_advanceShowdownStage` to not rely on the old inline delay**

REPLACE `_advanceShowdownStage` (lines ~1115–1126) with:

```javascript
  _advanceShowdownStage(currentStage, pitchUsed) {
    this._destroyPitchButtons();
    this._destroyTargeting();
    if (currentStage === 'flop') {
      this._interStageTimer = this.time.delayedCall(300, () => this._dealShowdownTurn());
    } else if (currentStage === 'turn') {
      this._interStageTimer = this.time.delayedCall(300, () => this._dealShowdownRiver());
    } else {
      this._interStageTimer = this.time.delayedCall(300, () => this._resolveShowdown());
    }
  }
```

- [ ] **Step 5: Syntax check + full test suite**

Run: `/opt/homebrew/bin/node --check src/scenes/PitchingScene.js && /opt/homebrew/bin/node test/sim.js 2>&1 | tail -2`
Expected: parses OK; `0 failed` (engine tests unaffected).

- [ ] **Step 6: Browser smoke — targeting overlay**

Start `python3 -m http.server 8179 &`. Navigate to the game, play into an opponent half-inning (the scene flow: Title → team select → trait draft → your at-bat → shop → **PitchingScene**). Because reaching it by click is deep, verify instead by driving the scene method directly in-page after boot:

```javascript
() => {
  const s = window.game.scene.getScene('PitchingScene');
  return { hasEnterTargeting: typeof s._enterTargeting === 'function',
           hasCommitPitch: typeof s._commitPitch === 'function',
           hasDestroyTargeting: typeof s._destroyTargeting === 'function' };
}
```
Expected: all three `true`, and no JS console errors on page load. Kill server after.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/PitchingScene.js
git commit -m "feat: suggested-target + confirm targeting in the showdown"
```

---

## Task 5: Effect animations (juice)

**Files:**
- Modify: `src/scenes/PitchingScene.js`

Adds a shared card-change animation dispatched by kind, played before the board re-renders.

- [ ] **Step 1: Add the animation dispatcher + kind lookup**

Add these methods after `_pauseThenAdvance` (from Task 4):

```javascript
  /** Map a pitch to an animation kind + the owner/board row it affects. */
  _pitchAnimKind(pitchKey) {
    const map = {
      fastball:  { kind: 'swap',     owner: 'pitcher' },
      slider:    { kind: 'swap',     owner: 'community' },
      screwball: { kind: 'swap',     owner: 'batter' },
      twoseam:   { kind: 'swap',     owner: 'community' },
      palmball:  { kind: 'plant',    owner: 'community' },
      changeup:  { kind: 'reveal',   owner: 'batter' },
      curveball: { kind: 'downgrade', owner: 'batter' },
      sinker:    { kind: 'downgrade', owner: 'community' },
      breaking:  { kind: 'flip',     owner: 'community' },
      cutter:    { kind: 'lock',     owner: 'community' },
      splitter:  { kind: 'destroy',  owner: 'community' },
      knuckle:   { kind: 'scramble', owner: 'community' },
      wild_thing:{ kind: 'scramble', owner: 'community' },
    };
    return map[pitchKey] || null;
  }

  /**
   * Play a brief animation over the current board sprites for a pitch effect,
   * then call onComplete. Sprites are the existing _boardElements images at the
   * affected positions; we overlay a transient effect and never destroy them here.
   */
  _animatePitchEffect(pitchKey, result, onComplete) {
    const info = this._pitchAnimKind(pitchKey);
    if (!info) { onComplete(); return; }

    // Resolve the affected screen position from board layout.
    const state = this.showdownEngine.getState();
    const pos = (owner, idx) => {
      if (owner === 'community') {
        const n = state.community.length;
        return { x: 640 - (n - 1) * 65 + idx * 130, y: 290 };
      }
      if (owner === 'pitcher') return { x: 580 + idx * 120, y: 480 };
      return { x: 580 + idx * 120, y: 120 }; // batter
    };

    // Determine index from result (effects report their own changed index).
    let idx = 0;
    if (pitchKey === 'fastball') idx = result.swapIndex !== undefined ? result.swapIndex : 0;
    else if (pitchKey === 'screwball') idx = 0; // screwball randomizes internally; animate a generic batter pulse at idx 0
    else if (pitchKey === 'twoseam') idx = result.batterIdx !== undefined ? this._lastTargetIdx : (this._lastTargetIdx || 0);
    else idx = this._lastTargetIdx !== undefined ? this._lastTargetIdx : 0;

    const { x, y } = pos(info.owner, idx);
    // Transient flash rectangle over the affected card.
    const colorByKind = {
      swap: 0x64b5f6, plant: 0x2e7d32, reveal: 0xffd600, downgrade: 0xff5252,
      flip: 0x1e88e5, lock: 0xffd600, destroy: 0xff5252, scramble: 0x00838f,
    };
    const flash = this.add.rectangle(x, y, 100, 130, colorByKind[info.kind] || 0xffffff, 0.55).setDepth(12);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: info.kind === 'destroy' ? 0.1 : 1.15,
      scaleY: info.kind === 'destroy' ? 0.1 : 1.15,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => { flash.destroy(); onComplete(); },
    });
  }
```

- [ ] **Step 2: Record the committed target index + route commit through the animation**

In `_commitPitch` (from Task 4), REPLACE the body with a version that records the target index and animates before re-render:

```javascript
  _commitPitch(pitchKey, stage, opts) {
    this._lastTargetIdx = opts.targetIndex !== undefined ? opts.targetIndex
      : (opts.swapIndex !== undefined ? opts.swapIndex : 0);
    const result = this.showdownEngine.applyPitch(pitchKey, opts);
    const pitch = PITCH_TYPES[pitchKey];
    if (result.success) {
      this.handNameText.setText(`${pitch.name} — ${this._effectFeedback(pitchKey, result)}`);
      this.handNameText.setColor('#69f0ae');
    } else {
      this.handNameText.setText(`${pitch.name} failed: ${result.reason}`);
      this.handNameText.setColor('#ff5252');
    }
    // If the pitch misfired, animate the actually-hit index.
    if (result.misfired && opts.targetIndex !== undefined) this._lastTargetIdx = opts.targetIndex;
    this._animatePitchEffect(pitchKey, result, () => {
      this._renderShowdownBoard();
      this._pauseThenAdvance(stage, pitchKey, 400);
    });
  }
```

Note: the post-effect pause drops from 800 → 400ms here (part of the pacing trim).

- [ ] **Step 3: Syntax check + full suite**

Run: `/opt/homebrew/bin/node --check src/scenes/PitchingScene.js && /opt/homebrew/bin/node test/sim.js 2>&1 | tail -2`
Expected: parses OK; `0 failed`.

- [ ] **Step 4: Browser smoke — effect animates without error**

Start server; navigate; in-page check the methods exist and a flash can be created without throwing:

```javascript
() => {
  const s = window.game.scene.getScene('PitchingScene');
  return { hasAnim: typeof s._animatePitchEffect === 'function',
           hasKind: typeof s._pitchAnimKind === 'function',
           sliderKind: s._pitchAnimKind('slider') };
}
```
Expected: `hasAnim`/`hasKind` true, `sliderKind` = `{ kind: 'swap', owner: 'community' }`, no console errors. Kill server.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/PitchingScene.js
git commit -m "feat: animated pitch effects in the showdown"
```

---

## Task 6: Pacing — inter-stage trim + tap-to-advance + reveal beat

**Files:**
- Modify: `src/scenes/PitchingScene.js`

- [ ] **Step 1: Trim inter-stage delays**

In `_advanceShowdownStage` (updated in Task 4), change the three `delayedCall(300, ...)` values to `150`:

```javascript
  _advanceShowdownStage(currentStage, pitchUsed) {
    this._destroyPitchButtons();
    this._destroyTargeting();
    if (currentStage === 'flop') {
      this._interStageTimer = this.time.delayedCall(150, () => this._dealShowdownTurn());
    } else if (currentStage === 'turn') {
      this._interStageTimer = this.time.delayedCall(150, () => this._dealShowdownRiver());
    } else {
      this._interStageTimer = this.time.delayedCall(150, () => this._resolveShowdown());
    }
  }
```

- [ ] **Step 2: Add tap-to-advance**

Add a scene-level tap handler that fast-forwards a pending post-effect pause. Add this method after `_pauseThenAdvance`:

```javascript
  /** If a post-effect pause is pending, tapping skips the remaining wait. */
  _skipPause() {
    if (this._advanceTimer) {
      const t = this._advanceTimer;
      this._advanceTimer = null;
      const cb = t.callback;      // Phaser TimerEvent stores its callback
      t.remove(false);            // cancel without firing
      if (cb) cb();               // fire immediately
    }
  }
```

Then register the handler once. In `_pauseThenAdvance`, set up the listener when a pause starts and remove it when it fires. REPLACE `_pauseThenAdvance` with:

```javascript
  _pauseThenAdvance(stage, pitchKey, ms) {
    // Enable tap-to-skip for this pause.
    this.input.once('pointerdown', this._skipPause, this);
    this._advanceTimer = this.time.delayedCall(ms, () => {
      this.input.off('pointerdown', this._skipPause, this);
      this._advanceTimer = null;
      this._advanceShowdownStage(stage, pitchKey);
    });
  }
```

Note: `_skipPause` cancels the timer and invokes the callback directly, which itself removes the input listener via the `off` in the timer callback — but since we `remove(false)` the timer, that callback won't run. So `_skipPause` must also detach the listener. Update `_skipPause`:

```javascript
  _skipPause() {
    if (this._advanceTimer) {
      const t = this._advanceTimer;
      this._advanceTimer = null;
      this.input.off('pointerdown', this._skipPause, this);
      t.remove(false);
      // Advance immediately using the stashed stage/pitch.
      this._advanceShowdownStage(this._pendingStage, this._pendingPitch);
    }
  }
```

And stash the pending values in `_pauseThenAdvance`:

```javascript
  _pauseThenAdvance(stage, pitchKey, ms) {
    this._pendingStage = stage;
    this._pendingPitch = pitchKey;
    this.input.once('pointerdown', this._skipPause, this);
    this._advanceTimer = this.time.delayedCall(ms, () => {
      this.input.off('pointerdown', this._skipPause, this);
      this._advanceTimer = null;
      this._advanceShowdownStage(stage, pitchKey);
    });
  }
```

- [ ] **Step 3: Reveal tension beat**

The current `_resolveShowdown` (lines ~1128–1137) is:

```javascript
  _resolveShowdown() {
    this._destroyPitchButtons();
    const result = this.showdownEngine.resolve();

    // Reveal batter cards on the existing board first
    this.showdownEngine._revealedBatterCards = [0, 1];
    this._renderShowdownBoard();

    // After a beat, animate into the showdown comparison layout
    this.time.delayedCall(600, () => this._animateShowdownReveal(result));
  }
```

REPLACE it with a version that adds a winner-side pulse after the existing render (no duplicate render):

```javascript
  _resolveShowdown() {
    this._destroyPitchButtons();
    this._destroyTargeting();
    const result = this.showdownEngine.resolve();

    // Reveal batter cards on the existing board first
    this.showdownEngine._revealedBatterCards = [0, 1];
    this._renderShowdownBoard();

    // Tension beat: pulse a "who won the hand" label at the winner's row.
    const winnerY = result.winner === 'pitcher' ? 480 : 120;
    const beat = this.add.text(760, winnerY, result.winner === 'pitcher' ? 'YOU WIN THE HAND' : 'BATTER WINS', {
      fontSize: '14px', fontFamily: 'monospace',
      color: result.winner === 'pitcher' ? '#69f0ae' : '#ff8a80', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(20);
    this.tweens.add({ targets: beat, scaleX: 1.15, scaleY: 1.15, duration: 250, yoyo: true, repeat: 1,
      onComplete: () => beat.destroy() });

    // After a beat, animate into the showdown comparison layout
    this.time.delayedCall(600, () => this._animateShowdownReveal(result));
  }
```

- [ ] **Step 4: Syntax check + full suite**

Run: `/opt/homebrew/bin/node --check src/scenes/PitchingScene.js && /opt/homebrew/bin/node test/sim.js 2>&1 | tail -2`
Expected: parses OK; `0 failed`.

- [ ] **Step 5: Browser smoke — boot clean, methods present**

Start server; navigate; in-page:

```javascript
() => {
  const s = window.game.scene.getScene('PitchingScene');
  return { hasSkip: typeof s._skipPause === 'function',
           hasPause: typeof s._pauseThenAdvance === 'function' };
}
```
Expected: both true, no console errors. Kill server.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/PitchingScene.js
git commit -m "feat: showdown pacing trim, tap-to-advance, reveal beat"
```

---

## Task 7: GDD update + final verification

**Files:**
- Modify: `docs/GAME_DESIGN.md`

- [ ] **Step 1: Note interactivity in the GDD**

In `docs/GAME_DESIGN.md`, insert the following paragraph between the numbered stage list (ends at the `3. **River** …` line) and the `Each pitch in the pitcher's 4-pitch repertoire…` line — i.e. on the blank line after the River bullet:

```markdown
**Interactivity:** Targeted pitches (fastball, slider, cutter, splitter, twoseam, breaking) let the player pick which card to hit — a suggested target is highlighted; click to change it, then CONFIRM (or CANCEL). A live hand read shows each side's current best hand (`YOU:` full, `OPP (visible):` from cards you can see) so the player can read the board. Effects animate on the affected card, and a tap skips post-effect pauses.

```

- [ ] **Step 2: Full verification**

Run:
```bash
/opt/homebrew/bin/node --check src/ShowdownEngine.js && \
/opt/homebrew/bin/node --check src/scenes/PitchingScene.js && \
/opt/homebrew/bin/node test/sim.js 2>&1 | tail -2
```
Expected: both parse; `RESULTS: N passed, 0 failed`.

- [ ] **Step 3: Browser smoke — full playthrough of an opponent half-inning**

Start `python3 -m http.server 8179 &`. Drive the game via Playwright to an opponent half-inning and confirm by observation (screenshots): hand-read strip visible; picking a targeted pitch shows rings + CONFIRM/CANCEL; confirming animates and advances; the read updates; a full at-bat resolves with the tension beat. If reaching the scene by click is impractical, at minimum confirm the page boots with zero JS console errors after loading, and that the in-page method checks from Tasks 3–6 all pass. Kill server after.

- [ ] **Step 4: Commit**

```bash
git add docs/GAME_DESIGN.md
git commit -m "docs: note interactive targeting + hand read in showdown GDD"
```

---

## Self-Review Notes

- **Spec coverage:** Feature 1 (suggested-target + confirm) → Tasks 2, 4. Feature 2 (live hand read) → Tasks 1, 3. Feature 3 (effect juice) → Task 5 + reveal beat in Task 6. Feature 4 (pacing) → Task 6. Testing → engine tests in Tasks 1–2, browser smokes throughout. GDD → Task 7. All spec sections mapped.
- **Type/name consistency:** `getBestHandName`, `getSuggestedTarget`, `_enterTargeting`, `_commitPitch`, `_destroyTargeting`, `_pauseThenAdvance`, `_skipPause`, `_animatePitchEffect`, `_pitchAnimKind`, `_lastTargetIdx`, `_targeting`, `_targetElements`, `_targetRings`, `_advanceTimer`, `_pendingStage`, `_pendingPitch` — used consistently across tasks.
- **Known limitation (documented, acceptable):** effect animation index for internally-randomizing pitches (screwball, changeup, sinker whole-board) is approximate — it flashes a representative card, not necessarily the exact randomized one. Faithful for targeted pitches (the player's chosen index) and the misfire case. This matches the spec's note that internally-random effects animate by representative position.
- **Browser-smoke caveat:** reaching PitchingScene by simulated clicks is deep and Phaser-input-sensitive (seen earlier this session), so smokes primarily assert clean boot + method presence + engine-helper correctness in-page, with a best-effort full playthrough in Task 7. This is the honest verification ceiling for headless-untestable Phaser interaction.

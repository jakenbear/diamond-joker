# Pitcher Adjusts — Pair Nerf Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Nerf pairs by adding escalating out-chance penalties per inning and reducing contact rescue, with visual warnings.

**Architecture:** New `pairsPlayedThisInning` counter on BaseballState, read by CardEngine during `_applyRankQuality`, reset on side switch. UI reads the counter to show warning text on hand preview. All changes mirrored in both JS (Phaser) and GDScript (Godot).

**Tech Stack:** Vanilla JS (Phaser 3), GDScript (Godot 4.6)

---

### Task 1: Add `pairsPlayedThisInning` counter to BaseballState (JS)

**Files:**
- Modify: `src/BaseballState.js:36-51` (reset method)
- Modify: `src/BaseballState.js:292-328` (switchSide method)

**Step 1: Write failing test**

Add to `test/sim.js`:

```js
// ── Pitcher Adjusts: pairsPlayedThisInning tracking ──
console.log('\n── Pitcher Adjusts: pair counter ──');

{
  const bs = new BaseballState();
  assert(bs.pairsPlayedThisInning === 0, 'pairsPlayedThisInning starts at 0');
  bs.pairsPlayedThisInning = 3;
  bs.switchSide(0);
  assert(bs.pairsPlayedThisInning === 0, 'pairsPlayedThisInning resets on switchSide');
}

{
  const bs = new BaseballState();
  bs.pairsPlayedThisInning = 5;
  bs.reset();
  assert(bs.pairsPlayedThisInning === 0, 'pairsPlayedThisInning resets on full reset');
}
```

**Step 2: Run test to verify it fails**

Run: `node test/sim.js`
Expected: FAIL — `pairsPlayedThisInning` is undefined

**Step 3: Write implementation**

In `src/BaseballState.js`, add to `reset()` (after line 50):
```js
    this.pairsPlayedThisInning = 0;
```

In `switchSide()`, add after `this._atBatsThisInning = 0;` (line 308):
```js
      this.pairsPlayedThisInning = 0;
```

**Step 4: Run test to verify it passes**

Run: `node test/sim.js`
Expected: PASS — all 3 new assertions pass

**Step 5: Commit**

```bash
git add src/BaseballState.js test/sim.js
git commit -m "feat: add pairsPlayedThisInning counter to BaseballState"
```

---

### Task 2: Apply pair penalty in CardEngine._applyRankQuality (JS)

**Files:**
- Modify: `src/CardEngine.js:89` (playHand — pass gameState through)
- Modify: `src/CardEngine.js:122` (evaluateHand — accept gameState)
- Modify: `src/CardEngine.js:176-182` (call _applyRankQuality with gameState)
- Modify: `src/CardEngine.js:276-300` (_applyRankQuality — add penalty + increment counter)

**Step 1: Write failing test**

Add to `test/sim.js`:

```js
console.log('\n── Pitcher Adjusts: escalating out chance ──');

{
  // With pairsPlayedThisInning = 3, pair of Aces (normally 8% out)
  // should have 8% + 45% = 53% out chance — much higher than normal
  const bs = new BaseballState();
  bs.pairsPlayedThisInning = 3;
  const aceCards = [{ rank: 14, suit: 'H' }, { rank: 14, suit: 'D' }];
  let outs = 0;
  const trials = 1000;
  for (let i = 0; i < trials; i++) {
    bs.pairsPlayedThisInning = 3; // reset before each eval since it increments
    const r = CardEngine.evaluateHand(aceCards, null, null, { baseballState: bs });
    if (r.handName === 'Groundout' || r.handName === 'Flyout') outs++;
  }
  const outRate = outs / trials;
  // With +45% penalty, Aces should have ~53% out rate (allow wide margin for randomness)
  assert(outRate > 0.35, `Aces with 3 prior pairs: out rate ${(outRate*100).toFixed(1)}% > 35%`);
  assert(outRate < 0.75, `Aces with 3 prior pairs: out rate ${(outRate*100).toFixed(1)}% < 75%`);
}

{
  // pairsPlayedThisInning should increment after each pair evaluation
  const bs = new BaseballState();
  assert(bs.pairsPlayedThisInning === 0, 'starts at 0 before play');
  const pairCards = [{ rank: 14, suit: 'H' }, { rank: 14, suit: 'D' }];
  CardEngine.evaluateHand(pairCards, null, null, { baseballState: bs });
  assert(bs.pairsPlayedThisInning === 1, 'incremented to 1 after first pair');
  CardEngine.evaluateHand(pairCards, null, null, { baseballState: bs });
  assert(bs.pairsPlayedThisInning === 2, 'incremented to 2 after second pair');
}
```

**Step 2: Run test to verify it fails**

Run: `node test/sim.js`
Expected: FAIL — evaluateHand doesn't accept/use gameState for pair penalty

**Step 3: Write implementation**

In `src/CardEngine.js`, update `evaluateHand` signature (line 122):
```js
  static evaluateHand(cards, preModifier = null, postModifier = null, gameState = null, strikeCount = 0) {
```
(Already accepts gameState — no change needed to signature.)

Update the `_applyRankQuality` call (around line 178) to pass gameState:
```js
    if (handIdx === 8 || handIdx === 7 || handIdx === 6) {
      const qualityResult = CardEngine._applyRankQuality(entry, pairRank, handIdx, strikeCount, gameState);
```

Update `_applyRankQuality` signature (line 276):
```js
  static _applyRankQuality(entry, pairRank, handIdx, strikeCount = 0, gameState = null) {
```

In the `handIdx === 8` block (line 278-300), replace the out chance calculation:
```js
    if (handIdx === 8) {
      const twoStrikePenalty = strikeCount >= 2 ? 0.10 : 0;
      const pairsPlayed = gameState?.baseballState?.pairsPlayedThisInning || 0;
      const pairPenalty = pairsPlayed * 0.15;
      const outChance = Math.min(0.95, Math.max(0.05, 0.80 - (pairRank - 2) * 0.06 + twoStrikePenalty + pairPenalty));

      // Increment the counter for next pair this inning
      if (gameState?.baseballState) {
        gameState.baseballState.pairsPlayedThisInning++;
      }

      if (Math.random() < outChance) {
        const outType = Math.random() < 0.40 ? 'Flyout' : 'Groundout';
        return {
          handName: outType,
          outcome: outType,
          chips: 0,
          mult: 1,
          score: 0,
          wasGroundout: true,
          originalHand: entry.handName,
          pairRank,
        };
      }
      // Survived — high ranks still get bonus chips
      if (pairRank >= 10) {
        const bonus = pairRank - 9;
        return { ...entry, chips: entry.chips + bonus };
      }
      return null;
    }
```

**Step 4: Run test to verify it passes**

Run: `node test/sim.js`
Expected: PASS — all new pair penalty tests pass, existing tests still pass

**Step 5: Commit**

```bash
git add src/CardEngine.js test/sim.js
git commit -m "feat: apply escalating pair out-chance penalty per inning"
```

---

### Task 3: Nerf contact rescue (JS)

**Files:**
- Modify: `src/RosterManager.js:373` (saveChance line)

**Step 1: Write failing test**

Add to `test/sim.js`:

```js
console.log('\n── Contact rescue nerf ──');

{
  // Contact-10 batter rescue rate should be ~40% (0.04 * 10), not 60%
  const rm = new RosterManager();
  rm.setTeam(TEAMS[0]);
  // Override current batter to have contact=10
  const roster = rm.getTeam().roster;
  const origContact = roster[0].contact;
  roster[0].contact = 10;

  let saves = 0;
  const trials = 2000;
  for (let i = 0; i < trials; i++) {
    const fakeResult = {
      wasGroundout: true, originalHand: 'Pair', pairRank: 10,
      outcome: 'Groundout', handName: 'Groundout', chips: 0, mult: 1, score: 0,
    };
    const { bonuses } = rm.applyBatterModifiers(fakeResult, {});
    if (bonuses.contactSave) saves++;
  }

  roster[0].contact = origContact; // restore
  const saveRate = saves / trials;
  // Should be ~40% (was 60%). Allow margin.
  assert(saveRate > 0.25, `Contact-10 rescue rate ${(saveRate*100).toFixed(1)}% > 25%`);
  assert(saveRate < 0.55, `Contact-10 rescue rate ${(saveRate*100).toFixed(1)}% < 55%`);
}
```

**Step 2: Run test to verify it fails**

Run: `node test/sim.js`
Expected: FAIL — saveRate will be ~60% (current `* 0.06`)

**Step 3: Write implementation**

In `src/RosterManager.js` line 373, change:
```js
      const saveChance = batter.contact * 0.06;
```
to:
```js
      const saveChance = batter.contact * 0.04;
```

**Step 4: Run test to verify it passes**

Run: `node test/sim.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/RosterManager.js test/sim.js
git commit -m "fix: nerf contact rescue from 0.06 to 0.04 per contact point"
```

---

### Task 4: Pass gameState to evaluateHand in GameScene.js (Phaser)

**Files:**
- Modify: `src/scenes/GameScene.js` — wherever `CardEngine.evaluateHand` or `playHand` is called

**Step 1: Find all evaluateHand / playHand calls**

Search for `evaluateHand` and `playHand` in GameScene.js. The key calls are:
- `_updateHandPreview()` (~line 1076): `CardEngine.evaluateHand(cards)` — needs gameState for accurate preview
- `_playSelectedCards()`: `this.cardEngine.playHand(...)` — needs gameState passed through

**Step 2: Update `_updateHandPreview` to pass gameState**

Around line 1076, change:
```js
    const result = CardEngine.evaluateHand(cards);
```
to:
```js
    const result = CardEngine.evaluateHand(cards, null, null, { baseballState: this.baseballState });
```

**Important:** The preview should NOT increment the counter. We need to pass a temporary copy or just read the counter without incrementing. Actually, evaluateHand always increments. So for preview, pass a snapshot:

```js
    // Preview with a fake state so we don't increment the real counter
    const previewState = { baseballState: { pairsPlayedThisInning: this.baseballState.pairsPlayedThisInning } };
    const result = CardEngine.evaluateHand(cards, null, null, previewState);
```

**Step 3: Update `_playSelectedCards` to pass gameState**

The `playHand` call already passes gameState. Check that the gameState object includes `baseballState`:

Find the `playHand` call and ensure the gameState dict includes `{ baseballState: this.baseballState }`. The gameState is already constructed in this method — verify it has the baseballState ref.

**Step 4: Add warning text to hand preview**

In `_updateHandPreview()`, after the existing Pair preview logic (around line 1105-1109 where color is set for small hands), add:

```js
      // Pitcher adjusts warning for pairs
      if (handName === 'Pair' && this.baseballState.pairsPlayedThisInning > 0) {
        const count = this.baseballState.pairsPlayedThisInning;
        if (count === 1) {
          preview += ' (Pitcher adjusting...)';
          color = '#ffe082'; // yellow
        } else if (count === 2) {
          preview += ' (Pitcher has your number!)';
          color = '#ff8a65'; // orange
        } else {
          preview += " (You're cooked!)";
          color = '#ff5252'; // red
        }
      }
```

Also in the `isRiskyOut` branch (line 1096-1100), when a Pair becomes a Groundout/Flyout preview, add the same warning.

**Step 5: Add warning to outcome text for pair outs**

In the outcome resolution (after `applyBatterModifiers`), when the result is an out and was originally a Pair with `pairsPlayedThisInning > 1`:

```js
    // Pitcher adjusts flavor text
    if (handResult.wasGroundout && handResult.originalHand === 'Pair' && this.baseballState.pairsPlayedThisInning > 1) {
      handResult.playedDescription = `${handResult.handName} — pitcher had that read`;
    }
```

**Step 6: Run tests and build**

Run: `node test/sim.js`
Expected: All tests pass (GameScene changes are UI-only, won't affect headless tests)

**Step 7: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: show pitcher-adjusts warning in hand preview and outcomes"
```

---

### Task 5: Mirror all changes to Godot — BaseballState

**Files:**
- Modify: `godot/scripts/baseball_state.gd:31-44` (add var)
- Modify: `godot/scripts/baseball_state.gd:47-55` (reset)
- Modify: `godot/scripts/baseball_state.gd:247-263` (switch_side)

**Step 1: Add variable declaration**

After line 44 (`var _at_bats_this_inning: int = 0`), add:
```gdscript
var pairs_played_this_inning: int = 0
```

**Step 2: Add to reset()**

After the line resetting `_at_bats_this_inning` in reset(), add:
```gdscript
	pairs_played_this_inning = 0
```

**Step 3: Add to switch_side()**

After `_at_bats_this_inning = 0` (line 263), add:
```gdscript
		pairs_played_this_inning = 0
```

**Step 4: Commit**

```bash
git add godot/scripts/baseball_state.gd
git commit -m "feat(godot): add pairs_played_this_inning counter"
```

---

### Task 6: Mirror pair penalty to Godot — CardEngine

**Files:**
- Modify: `godot/scripts/card_engine.gd:258-280` (_apply_rank_quality)

**Step 1: Update _apply_rank_quality signature and Pair block**

Change the signature to accept game_state:
```gdscript
static func _apply_rank_quality(entry: Dictionary, pair_rank: int, hand_idx: int, strike_count: int = 0, game_state: Dictionary = {}) -> Dictionary:
```

Replace the `hand_idx == 8` block:
```gdscript
	if hand_idx == 8:
		var two_strike_penalty: float = 0.10 if strike_count >= 2 else 0.0
		var bs = game_state.get("baseball_state", null)
		var pairs_played: int = bs.pairs_played_this_inning if bs else 0
		var pair_penalty: float = pairs_played * 0.15
		var out_chance: float = minf(0.95, maxf(0.05, 0.80 - (pair_rank - 2) * 0.06 + two_strike_penalty + pair_penalty))

		# Increment counter for next pair this inning
		if bs:
			bs.pairs_played_this_inning += 1

		if randf() < out_chance:
			var out_type: String = "Flyout" if randf() < 0.40 else "Groundout"
			return {
				"hand_name": out_type,
				"outcome": out_type,
				"chips": 0,
				"mult": 1.0,
				"score": 0,
				"was_groundout": true,
				"original_hand": entry["hand_name"],
				"pair_rank": pair_rank,
			}
		if pair_rank >= 10:
			var bonus: int = pair_rank - 9
			var result: Dictionary = entry.duplicate()
			result["chips"] = entry["chips"] + bonus
			return result
		return {}
```

**Step 2: Update the evaluate_hand call to _apply_rank_quality**

Find where `_apply_rank_quality` is called in `evaluate_hand` and pass `game_state` through. Update the `evaluate_hand` signature to accept `game_state: Dictionary = {}` and pass it to `_apply_rank_quality`.

**Step 3: Commit**

```bash
git add godot/scripts/card_engine.gd
git commit -m "feat(godot): apply escalating pair out-chance penalty"
```

---

### Task 7: Mirror contact rescue nerf to Godot — RosterManager

**Files:**
- Modify: `godot/scripts/roster_manager.gd:195` (save_chance line)

**Step 1: Change the multiplier**

Change:
```gdscript
		var save_chance: float = batter.get("contact", 5) * 0.06
```
to:
```gdscript
		var save_chance: float = batter.get("contact", 5) * 0.04
```

**Step 2: Commit**

```bash
git add godot/scripts/roster_manager.gd
git commit -m "fix(godot): nerf contact rescue from 0.06 to 0.04"
```

---

### Task 8: Mirror visual warnings to Godot — game_scene.gd

**Files:**
- Modify: `godot/scenes/game_scene.gd:198-210` (hand preview section)

**Step 1: Update hand preview to show warning**

Replace the preview section (lines 198-210):
```gdscript
	# Preview selected hand
	if not selected_indices.is_empty():
		var preview_cards: Array[Dictionary] = []
		for idx in selected_indices:
			if idx < hand.size():
				preview_cards.append(hand[idx])
		if not preview_cards.is_empty():
			var preview := CardEngine.evaluate_hand(preview_cards)
			var hand_name: String = preview.get("hand_name", "?")
			var outcome: String = preview.get("outcome", "?")
			var desc: String = "%s -> %s" % [hand_name, outcome]

			# Pitcher adjusts warning for pairs
			if hand_name == "Pair" and GameManager.baseball_state.pairs_played_this_inning > 0:
				var count: int = GameManager.baseball_state.pairs_played_this_inning
				if count == 1:
					desc += " (Pitcher adjusting...)"
					hand_desc_label.add_theme_color_override("font_color", Color("#ffe082"))
				elif count == 2:
					desc += " (Pitcher has your number!)"
					hand_desc_label.add_theme_color_override("font_color", Color("#ff8a65"))
				else:
					desc += " (You're cooked!)"
					hand_desc_label.add_theme_color_override("font_color", Color("#ff5252"))
			else:
				hand_desc_label.add_theme_color_override("font_color", Color("#f5f5dc"))

			hand_desc_label.text = desc
		else:
			hand_desc_label.text = ""
	else:
		hand_desc_label.text = "Select 1-5 cards to play"
```

**Step 2: Commit**

```bash
git add godot/scenes/game_scene.gd
git commit -m "feat(godot): show pitcher-adjusts warning in hand preview"
```

---

### Task 9: Run full test suite and verify

**Step 1: Run all tests**

Run: `node test/sim.js`
Expected: All tests pass (existing 247 + new ~8 tests)

**Step 2: Verify build**

Run: `npx vite build` (or whatever the project's build command is)
Expected: Clean build

**Step 3: Final commit with all changes**

If any files weren't committed in prior tasks, stage and commit them now.

```bash
git push
```

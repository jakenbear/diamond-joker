# Pitcher Traits Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand opponent pitcher traits from 8 → 20 by adding 4 small engine primitives and 12 new data-defined traits, so opponents feel distinct across a game.

**Architecture:** Pitcher traits are pure data in `data/pitcher_traits.js`, interpreted by `src/EffectEngine.js` (pre-eval card transforms + post-eval result transforms). Most new traits reuse existing effect handlers/conditions; four new primitives (`winning_by`, `bases_occupied` conditions; `cap_mult`, `scale_mult` handlers) unlock the rest. No changes to trait assignment or the scoring pipeline.

**Tech Stack:** Vanilla ES modules, no bundler. Tests are a pure-JS harness at `test/sim.js` (run with `node`, no framework) using `assert(condition, name)` and `group(title)` helpers.

---

## Reference: existing patterns

**Test harness** (`test/sim.js`):
- `group('title')` — prints a section header.
- `assert(condition, 'name')` — records pass/fail.
- Tests are bare `{ ... }` blocks. `EffectEngine`, `checkCondition`, and `PITCHER_TRAITS` are already imported at the top.
- Run the whole suite: `/opt/homebrew/bin/node test/sim.js`. Final line reads `RESULTS: N passed, 0 failed`.
- Baseline before this plan: **2184 passed, 0 failed**.

**EffectEngine condition switch** (`src/EffectEngine.js`, `checkCondition`): a `switch (cond.type)` ending at a `default: return false`. New conditions are added as `case` blocks.

**EffectEngine `POST_HANDLERS`** (`src/EffectEngine.js`): an object of `name(result, effect, gameState)` methods. Each returns a **new** result object (never mutates). Mult writes use `Math.round(Math.max(1, x) * 10) / 10` to floor at 1 and round to one decimal.

**Trait shape** (`data/pitcher_traits.js`): `{ id, name, description, rarity, phase, effect }` where `phase` is `'pitcher_pre'` or `'pitcher_post'`, and `effect` is either a single effect descriptor or `{ type: 'compound', effects: [...] }`.

---

## File Structure

- **Modify** `src/EffectEngine.js` — add 2 conditions (`winning_by`, `bases_occupied`) + 2 post handlers (`cap_mult`, `scale_mult`).
- **Modify** `test/sim.js` — add engine unit tests + representative trait tests.
- **Modify** `data/pitcher_traits.js` — add 12 trait objects + update the header comment listing effect types.
- **Modify** `docs/GAME_DESIGN.md` — expand the Pitcher Traits table to 20 rows.

---

## Task 1: Add `winning_by` condition

**Files:**
- Modify: `src/EffectEngine.js` (in `checkCondition`, after the `losing_by` case ~line 49)
- Test: `test/sim.js`

- [ ] **Step 1: Write the failing test**

Add this block in `test/sim.js` immediately after the existing `bases_empty` condition test block (search for `condition: bases_empty = true when no runners`):

```javascript
{
  // Conditions: winning_by (mirror of losing_by)
  assert(checkCondition({ type: 'winning_by', value: 2 }, {}, { playerScore: 5, opponentScore: 3 }) === true, 'condition: winning_by 2 when lead is 2');
  assert(checkCondition({ type: 'winning_by', value: 2 }, {}, { playerScore: 4, opponentScore: 3 }) === false, 'condition: winning_by 2 when lead is only 1');
  assert(checkCondition({ type: 'winning_by', value: 1 }, {}, { playerScore: 2, opponentScore: 5 }) === false, 'condition: winning_by false when losing');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "winning_by|RESULTS"`
Expected: the `winning_by 2 when lead is 2` assertion FAILS (unknown condition → `default: return false`).

- [ ] **Step 3: Write minimal implementation**

In `src/EffectEngine.js`, add this case directly after the `losing_by` case:

```javascript
    case 'winning_by':
      return gameState.playerScore - gameState.opponentScore >= cond.value;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "winning_by|RESULTS"`
Expected: all three `winning_by` assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add src/EffectEngine.js test/sim.js
git commit -m "feat: add winning_by condition to EffectEngine"
```

---

## Task 2: Add `bases_occupied` condition

**Files:**
- Modify: `src/EffectEngine.js` (in `checkCondition`, after the `bases_empty` case ~line 34)
- Test: `test/sim.js`

**Why:** Base runners are stored as batter objects or `true` (`bases[i] = batter || true`), so the existing `runner_on` condition's strict `=== true` check silently misses object runners. `bases_occupied` uses truthiness like `bases_empty`.

- [ ] **Step 1: Write the failing test**

Add this block in `test/sim.js` immediately after the `winning_by` block from Task 1:

```javascript
{
  // Conditions: bases_occupied (truthiness — works for object runners, not just === true)
  assert(checkCondition({ type: 'bases_occupied' }, {}, { bases: [true, false, false] }) === true, 'condition: bases_occupied true with a true runner');
  assert(checkCondition({ type: 'bases_occupied' }, {}, { bases: [null, { name: 'Batter' }, null] }) === true, 'condition: bases_occupied true with an object runner');
  assert(checkCondition({ type: 'bases_occupied' }, {}, { bases: [false, false, false] }) === false, 'condition: bases_occupied false when empty');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "bases_occupied|RESULTS"`
Expected: the first two `bases_occupied` assertions FAIL (unknown condition → false).

- [ ] **Step 3: Write minimal implementation**

In `src/EffectEngine.js`, add this case directly after the `bases_empty` case:

```javascript
    case 'bases_occupied':
      return !!(gameState.bases[0] || gameState.bases[1] || gameState.bases[2]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "bases_occupied|RESULTS"`
Expected: all three `bases_occupied` assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add src/EffectEngine.js test/sim.js
git commit -m "feat: add bases_occupied condition to EffectEngine"
```

---

## Task 3: Add `cap_mult` post handler

**Files:**
- Modify: `src/EffectEngine.js` (in `POST_HANDLERS`, after the `add_peanuts` handler ~line 191)
- Test: `test/sim.js`

- [ ] **Step 1: Write the failing test**

Add this block in `test/sim.js` in the trait-effects section, immediately after the existing `compound: +4 mult at 2 outs` test block (search for `compound: +4 mult at 2 outs`):

```javascript
{
  // Post: cap_mult ceilings the mult, leaves lower mults alone
  const high = { outcome: 'Home Run', handName: 'Straight', peanuts: 4, mult: 6 };
  const capped = EffectEngine.applyPost({ ...high }, { type: 'cap_mult', value: 4 }, {});
  assert(capped.mult === 4, 'cap_mult: mult 6 capped to 4');

  const low = { outcome: 'Single', handName: 'Pair', peanuts: 1, mult: 1.5 };
  const uncapped = EffectEngine.applyPost({ ...low }, { type: 'cap_mult', value: 4 }, {});
  assert(uncapped.mult === 1.5, 'cap_mult: mult 1.5 below cap is unchanged');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "cap_mult|RESULTS"`
Expected: `cap_mult: mult 6 capped to 4` FAILS (unknown handler → `applyPost` returns result unchanged, mult stays 6).

- [ ] **Step 3: Write minimal implementation**

In `src/EffectEngine.js`, add this handler to `POST_HANDLERS` directly after `add_peanuts`:

```javascript
  /** Cap the multiplier at a ceiling (control pitcher limiting damage) */
  cap_mult(result, effect, gameState) {
    if (!checkCondition(effect.condition, result, gameState)) return result;
    return { ...result, mult: Math.min(result.mult, effect.value) };
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "cap_mult|RESULTS"`
Expected: both `cap_mult` assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add src/EffectEngine.js test/sim.js
git commit -m "feat: add cap_mult post handler to EffectEngine"
```

---

## Task 4: Add `scale_mult` post handler

**Files:**
- Modify: `src/EffectEngine.js` (in `POST_HANDLERS`, after the `cap_mult` handler from Task 3)
- Test: `test/sim.js`

- [ ] **Step 1: Write the failing test**

Add this block in `test/sim.js` immediately after the `cap_mult` block from Task 3:

```javascript
{
  // Post: scale_mult reduces proportionally, floors at 1, rounds to 1 decimal
  const big = { outcome: 'Home Run', handName: 'Straight', peanuts: 4, mult: 6 };
  const scaled = EffectEngine.applyPost({ ...big }, { type: 'scale_mult', value: 0.75 }, {});
  assert(scaled.mult === 4.5, 'scale_mult: mult 6 * 0.75 = 4.5');

  const out = { outcome: 'Groundout', handName: 'Groundout', peanuts: 0, mult: 1 };
  const floored = EffectEngine.applyPost({ ...out }, { type: 'scale_mult', value: 0.75 }, {});
  assert(floored.mult === 1, 'scale_mult: mult 1 stays 1 (floor)');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "scale_mult|RESULTS"`
Expected: `scale_mult: mult 6 * 0.75 = 4.5` FAILS (unknown handler → mult stays 6).

- [ ] **Step 3: Write minimal implementation**

In `src/EffectEngine.js`, add this handler to `POST_HANDLERS` directly after `cap_mult`:

```javascript
  /** Scale the multiplier by a fraction (hurts big hands more); floors at 1 */
  scale_mult(result, effect, gameState) {
    if (!checkCondition(effect.condition, result, gameState)) return result;
    const scaled = Math.max(1, Math.round(result.mult * effect.value * 10) / 10);
    return { ...result, mult: scaled };
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "scale_mult|RESULTS"`
Expected: both `scale_mult` assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add src/EffectEngine.js test/sim.js
git commit -m "feat: add scale_mult post handler to EffectEngine"
```

---

## Task 5: Add the 12 new pitcher traits (data)

**Files:**
- Modify: `data/pitcher_traits.js` (add 12 objects to the exported array before the closing `];`; update the header comment)
- Test: `test/sim.js`

- [ ] **Step 1: Write the failing tests**

Add this block in `test/sim.js` immediately after the `scale_mult` block from Task 4. It asserts the count, uniqueness, and both branches of two representative double-edged traits:

```javascript
group('1f-pitcher. Expanded Pitcher Traits');
{
  // 8 original + 12 new = 20, all unique ids
  assert(PITCHER_TRAITS.length === 20, `PITCHER_TRAITS has 20 entries (got ${PITCHER_TRAITS.length})`);
  const ids = PITCHER_TRAITS.map(t => t.id);
  assert(new Set(ids).size === ids.length, 'PITCHER_TRAITS ids are all unique');

  // Every trait has the required shape
  const shapeOk = PITCHER_TRAITS.every(t =>
    t.id && t.name && t.description && t.rarity &&
    (t.phase === 'pitcher_pre' || t.phase === 'pitcher_post') && t.effect);
  assert(shapeOk, 'Every pitcher trait has id/name/description/rarity/phase/effect');

  // sinkerballer (double-edged): -2 mult on Pair, +2 peanuts on Straight
  const sinkerballer = PITCHER_TRAITS.find(t => t.id === 'sinkerballer');
  assert(!!sinkerballer, 'sinkerballer trait exists');
  const pairRes = EffectEngine.applyPost(
    { outcome: 'Single', handName: 'Pair', peanuts: 1, mult: 1.5 }, sinkerballer.effect, { outs: 0 });
  assert(pairRes.mult === 1, 'sinkerballer: Pair mult 1.5 - 2 floors to 1');
  const straightRes = EffectEngine.applyPost(
    { outcome: 'Home Run', handName: 'Straight', peanuts: 4, mult: 4 }, sinkerballer.effect, { outs: 0 });
  assert(straightRes.peanuts === 6, 'sinkerballer: Straight peanuts 4 + 2 = 6');

  // rally_killer (double-edged): -4 mult when bases occupied, +2 peanuts when empty
  const rallyKiller = PITCHER_TRAITS.find(t => t.id === 'rally_killer');
  assert(!!rallyKiller, 'rally_killer trait exists');
  const occupied = EffectEngine.applyPost(
    { outcome: 'Double', handName: 'Flush', peanuts: 5, mult: 5 }, rallyKiller.effect,
    { bases: [{ name: 'R' }, false, false] });
  assert(occupied.mult === 1, 'rally_killer: mult 5 - 4 = 1 with a runner on (object runner)');
  const empty = EffectEngine.applyPost(
    { outcome: 'Double', handName: 'Flush', peanuts: 5, mult: 5 }, rallyKiller.effect,
    { bases: [false, false, false] });
  assert(empty.peanuts === 7, 'rally_killer: peanuts 5 + 2 = 7 with bases empty');
  assert(empty.mult === 5, 'rally_killer: mult unchanged when bases empty');
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "PITCHER_TRAITS has 20|sinkerballer|rally_killer|RESULTS"`
Expected: `PITCHER_TRAITS has 20 entries` FAILS (still 8), and the `find` lookups return undefined → `sinkerballer trait exists` / `rally_killer trait exists` FAIL.

- [ ] **Step 3: Write the implementation**

In `data/pitcher_traits.js`, add these 12 objects to the exported array — insert them just before the final `];`. (The last existing entry is `closers_instinct`; add a comma after its closing `}` if needed, then paste these.)

```javascript
  // ── Expansion: Common ──
  {
    id: 'sinker',
    name: 'Sinker',
    description: '40% chance your highest card loses 2 ranks.',
    rarity: 'common',
    phase: 'pitcher_pre',
    effect: { type: 'downgrade_highest', chance: 0.4, amount: 2 },
  },
  {
    id: 'cutter',
    name: 'Cutter',
    description: '-1 peanut on all hits.',
    rarity: 'common',
    phase: 'pitcher_post',
    effect: { type: 'add_peanuts', value: -1, condition: { type: 'peanuts_gte', value: 1 } },
  },
  {
    id: 'sinkerballer',
    name: 'Sinkerballer',
    description: 'Pairs/Two Pair -2 mult. But Straights/Flushes get +2 peanuts.',
    rarity: 'common',
    phase: 'pitcher_post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: -2, condition: { type: 'hand_in', values: ['Pair', 'Two Pair'] } },
        { type: 'add_peanuts', value: 2, condition: { type: 'hand_in', values: ['Straight', 'Flush'] } },
      ],
    },
  },
  {
    id: 'fireballer',
    name: 'Fireballer',
    description: '-2 mult in innings 1-3 (fresh and dominant).',
    rarity: 'common',
    phase: 'pitcher_post',
    effect: { type: 'add_mult', value: -2, condition: { type: 'inning_range', min: 1, max: 3 } },
  },
  {
    id: 'backfoot_slider',
    name: 'Backfoot Slider',
    description: 'Face cards (J/Q/K) lose 1 rank.',
    rarity: 'common',
    phase: 'pitcher_pre',
    effect: { type: 'downgrade_face_cards', amount: 1 },
  },
  // ── Expansion: Uncommon ──
  {
    id: 'junkballer',
    name: 'Junkballer',
    description: 'All mult capped at 4. But every hit gets +1 peanut.',
    rarity: 'uncommon',
    phase: 'pitcher_post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'cap_mult', value: 4 },
        { type: 'add_peanuts', value: 1, condition: { type: 'peanuts_gte', value: 1 } },
      ],
    },
  },
  {
    id: 'bulldog',
    name: 'Bulldog',
    description: 'When you have the lead, -3 mult.',
    rarity: 'uncommon',
    phase: 'pitcher_post',
    effect: { type: 'add_mult', value: -3, condition: { type: 'winning_by', value: 1 } },
  },
  {
    id: 'wild_thing',
    name: 'Wild Thing',
    description: '50% chance two of your cards swap ranks. Chaos!',
    rarity: 'uncommon',
    phase: 'pitcher_pre',
    effect: { type: 'swap_random', chance: 0.5 },
  },
  {
    id: 'splitter',
    name: 'Splitter',
    description: 'Three of a Kind and better get -2 mult.',
    rarity: 'uncommon',
    phase: 'pitcher_post',
    effect: {
      type: 'add_mult', value: -2,
      condition: { type: 'hand_in', values: ['Three of a Kind', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'] },
    },
  },
  {
    id: 'escape_artist',
    name: 'Escape Artist',
    description: 'Bases loaded -5 mult. Bases empty +1 mult.',
    rarity: 'uncommon',
    phase: 'pitcher_post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: -5, condition: { type: 'bases_loaded' } },
        { type: 'add_mult', value: 1, condition: { type: 'bases_empty' } },
      ],
    },
  },
  // ── Expansion: Rare ──
  {
    id: 'frontline_ace',
    name: 'Frontline Ace',
    description: 'All mult scaled to 75% (big hands hurt most).',
    rarity: 'rare',
    phase: 'pitcher_post',
    effect: { type: 'scale_mult', value: 0.75 },
  },
  {
    id: 'rally_killer',
    name: 'Rally Killer',
    description: 'Runners on base -4 mult. But bases empty +2 peanuts.',
    rarity: 'rare',
    phase: 'pitcher_post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: -4, condition: { type: 'bases_occupied' } },
        { type: 'add_peanuts', value: 2, condition: { type: 'bases_empty' } },
      ],
    },
  },
```

Then update the header comment block at the top of `data/pitcher_traits.js` to document the newly-used effect types. Replace the existing "Post-eval effect types" comment section:

```javascript
 * Post-eval effect types:
 *   add_mult             — add/subtract mult                     { value, condition? }
 *   add_peanuts            — add/subtract peanuts                    { value, condition? }
 *   force_groundout      — convert weak hands to groundout       { condition }
 *   cap_mult             — ceiling the mult                       { value, condition? }
 *   scale_mult           — multiply the mult by a fraction        { value, condition? }
 *   compound             — apply multiple effects in sequence    { effects: [] }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | grep -E "PITCHER_TRAITS|sinkerballer|rally_killer|RESULTS"`
Expected: all Task 5 assertions PASS, and `RESULTS` shows 0 failed.

- [ ] **Step 5: Verify the full suite is green**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | tail -3`
Expected: `RESULTS: N passed, 0 failed` (N will be baseline 2184 + all the assertions added in Tasks 1–5).

- [ ] **Step 6: Syntax check the data file**

Run: `/opt/homebrew/bin/node --check data/pitcher_traits.js && echo OK`
Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add data/pitcher_traits.js test/sim.js
git commit -m "feat: add 12 new pitcher traits (8 -> 20 total)"
```

---

## Task 6: Update the GDD pitcher traits table

**Files:**
- Modify: `docs/GAME_DESIGN.md` (the "Pitcher Traits (Opponent's)" table, lines ~390–399)

- [ ] **Step 1: Replace the table body**

In `docs/GAME_DESIGN.md`, replace the existing 8-row table (the block starting `| Trait | Effect |` under `### Pitcher Traits (Opponent's)`) with this 20-row table:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/GAME_DESIGN.md
git commit -m "docs: expand GDD pitcher traits table to 20"
```

---

## Task 7: Final verification

- [ ] **Step 1: Full suite green**

Run: `/opt/homebrew/bin/node test/sim.js 2>&1 | tail -3`
Expected: `RESULTS: N passed, 0 failed`.

- [ ] **Step 2: Syntax check all modified source files**

Run:
```bash
/opt/homebrew/bin/node --check src/EffectEngine.js && \
/opt/homebrew/bin/node --check data/pitcher_traits.js && echo "ALL OK"
```
Expected: `ALL OK`

- [ ] **Step 3: Sanity — traits are pickable**

Run:
```bash
/opt/homebrew/bin/node -e "import('./src/TraitManager.js').then(m => { const picks = m.default.pickPitcherTraits(); console.log('picked', picks.length, 'traits:', picks.map(t => t.id).join(', ')); })"
```
Expected: prints 1–2 picked trait ids without error (confirms the expanded pool feeds assignment).

---

## Self-Review Notes

- **Spec coverage:** 4 engine additions → Tasks 1–4. 12 traits → Task 5. GDD update → Task 6. Testing requirements (winning_by, bases_occupied, cap_mult, scale_mult, representative double-edged traits) → covered in Tasks 1–5. Final verification → Task 7. All spec sections mapped.
- **Type/name consistency:** condition names (`winning_by`, `bases_occupied`) and handler names (`cap_mult`, `scale_mult`) are used identically in engine cases, tests, and trait `effect` descriptors. Trait ids in tests (`sinkerballer`, `rally_killer`) match the data objects.
- **Mult floors:** `sinkerballer` Pair (1.5 − 2) and `rally_killer` occupied (5 − 4 = 1) both rely on `add_mult`'s `Math.max(1, …)` floor — asserted explicitly.
- **`pickPitcherTraits` behavior:** picks 1–2 traits weighted by rarity from the pool; unaffected by pool size beyond having more variety. Task 7 Step 3 confirms it runs.

# Baseball Stat Display Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace PWR/CNT/SPD labels with baseball-authentic AVG/HR/SB display values everywhere in the UI, keeping internal 1-10 math unchanged.

**Architecture:** Three pure display functions in a new `src/StatDisplay.js` utility. Each function takes a raw 1-10 stat + player name, returns a formatted string. Player name seeds deterministic jitter so two players with the same stat show slightly different display values. All scene files import and call these instead of showing raw numbers.

**Tech Stack:** Vanilla JS (no build step), Phaser 3 scenes, `node test/sim.js` for testing.

---

### Task 1: Create StatDisplay utility with conversion functions

**Files:**
- Create: `src/StatDisplay.js`
- Create: `test/stat_display_test.js` (or add to `test/sim.js`)

**Step 1: Write failing tests in test/sim.js**

Add a new test group at the end of `test/sim.js`:

```javascript
group('XX. Stat Display Conversion');

{
  // toAVG: contact 1 → ~.150, contact 10 → ~.400, jittered by name
  const avg1 = StatDisplay.toAVG(1, 'Test Player');
  assert(avg1 >= 0.130 && avg1 <= 0.170, `toAVG(1) in range: ${avg1}`);
  const avg10 = StatDisplay.toAVG(10, 'Test Player');
  assert(avg10 >= 0.385 && avg10 <= 0.415, `toAVG(10) in range: ${avg10}`);

  // toHR: power 1 → ~0, power 10 → ~60
  const hr1 = StatDisplay.toHR(1, 'Test Player');
  assert(hr1 >= 0 && hr1 <= 5, `toHR(1) in range: ${hr1}`);
  const hr10 = StatDisplay.toHR(10, 'Test Player');
  assert(hr10 >= 57 && hr10 <= 63, `toHR(10) in range: ${hr10}`);

  // toSB: speed 1 → ~0, speed 10 → ~80
  const sb1 = StatDisplay.toSB(1, 'Test Player');
  assert(sb1 >= 0 && sb1 <= 5, `toSB(1) in range: ${sb1}`);
  const sb10 = StatDisplay.toSB(10, 'Test Player');
  assert(sb10 >= 76 && sb10 <= 84, `toSB(10) in range: ${sb10}`);

  // Deterministic: same name+stat always returns same value
  const a = StatDisplay.toAVG(7, 'Moose Leblanc');
  const b = StatDisplay.toAVG(7, 'Moose Leblanc');
  assert(a === b, 'toAVG is deterministic for same name');

  // Different names produce different values (with high probability)
  const c = StatDisplay.toAVG(7, 'Moose Leblanc');
  const d = StatDisplay.toAVG(7, 'Tank Morrison');
  assert(c !== d, 'toAVG differs for different names');

  // Format helpers
  const avgStr = StatDisplay.fmtAVG(8, 'Test Player');
  assert(avgStr.startsWith('.'), `fmtAVG starts with dot: ${avgStr}`);
  assert(avgStr.length === 4, `fmtAVG is 4 chars (.XXX): ${avgStr}`);

  const hrStr = StatDisplay.fmtHR(7, 'Test Player');
  assert(!isNaN(parseInt(hrStr)), `fmtHR is a number: ${hrStr}`);

  const sbStr = StatDisplay.fmtSB(9, 'Test Player');
  assert(!isNaN(parseInt(sbStr)), `fmtSB is a number: ${sbStr}`);

  // Full stat line helper
  const line = StatDisplay.statLine({ power: 8, contact: 7, speed: 6, name: 'Buck Fournier' });
  assert(line.includes('AVG:'), `statLine has AVG: ${line}`);
  assert(line.includes('HR:'), `statLine has HR: ${line}`);
  assert(line.includes('SB:'), `statLine has SB: ${line}`);
}
```

**Step 2: Run tests to verify they fail**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: FAIL — `StatDisplay` is not defined.

**Step 3: Implement StatDisplay.js**

Create `src/StatDisplay.js`:

```javascript
/**
 * Pure display conversion: internal 1-10 stats → baseball-style AVG/HR/SB.
 * Per-player jitter seeded from player name for consistent, unique values.
 */
const StatDisplay = {
  /** Deterministic hash of player name → float in [0, 1) */
  _nameHash(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return ((hash & 0x7fffffff) % 10000) / 10000;
  },

  /** Internal contact (1-10) → batting average (~.135–.415) */
  toAVG(contact, name) {
    const base = 0.150 + (contact - 1) * 0.028;
    const jitter = (this._nameHash(name + 'avg') - 0.5) * 0.030; // ±.015
    return Math.max(0.100, Math.min(0.450, base + jitter));
  },

  /** Internal power (1-10) → home runs (~0–63) */
  toHR(power, name) {
    const base = (power - 1) * 6.7;
    const jitter = (this._nameHash(name + 'hr') - 0.5) * 6; // ±3
    return Math.max(0, Math.round(base + jitter));
  },

  /** Internal speed (1-10) → stolen bases (~0–84) */
  toSB(speed, name) {
    const base = (speed - 1) * 8.9;
    const jitter = (this._nameHash(name + 'sb') - 0.5) * 8; // ±4
    return Math.max(0, Math.round(base + jitter));
  },

  /** Formatted AVG string: ".273" */
  fmtAVG(contact, name) {
    return this.toAVG(contact, name).toFixed(3).slice(1); // drop leading 0
  },

  /** Formatted HR string: "27" */
  fmtHR(power, name) {
    return String(this.toHR(power, name));
  },

  /** Formatted SB string: "36" */
  fmtSB(speed, name) {
    return String(this.toSB(speed, name));
  },

  /** Full stat line: "AVG:.273 HR:27 SB:36" */
  statLine(player) {
    const n = player.name;
    return `AVG:${this.fmtAVG(player.contact, n)} HR:${this.fmtHR(player.power, n)} SB:${this.fmtSB(player.speed, n)}`;
  },
};

export default StatDisplay;
```

**Step 4: Import StatDisplay in test/sim.js**

Add near the top imports:
```javascript
import StatDisplay from '../src/StatDisplay.js';
```

**Step 5: Run tests to verify they pass**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: All pass including new stat display tests.

**Step 6: Commit**

```bash
git add src/StatDisplay.js test/sim.js
git commit -m "feat: add StatDisplay utility for AVG/HR/SB conversion"
```

---

### Task 2: Update GameScene batter panel and roster

**Files:**
- Modify: `src/scenes/GameScene.js:366-368` (batter stat bars)
- Modify: `src/scenes/GameScene.js:1144` (roster sidebar)
- Modify: `src/scenes/GameScene.js:1653-1654` (preview tags)
- Modify: `src/scenes/GameScene.js:2629` (power peanuts step)
- Modify: `src/scenes/GameScene.js:2639` (contact mult step)
- Modify: `src/scenes/GameScene.js:3012` (team_power_mult staff bonus)

**Step 1: Import StatDisplay at top of GameScene.js**

```javascript
import StatDisplay from '../StatDisplay.js';
```

**Step 2: Replace batter panel stat bars (lines ~366-368)**

```javascript
// Old:
this.batterPwrText.setText(`PWR  ${this._statBar(batter.power)}`);
this.batterCntText.setText(`CNT  ${this._statBar(batter.contact)}`);
this.batterSpdText.setText(`SPD  ${this._statBar(batter.speed)}`);

// New:
this.batterPwrText.setText(`HR  ${StatDisplay.fmtHR(batter.power, batter.name)}  ${this._statBar(batter.power)}`);
this.batterCntText.setText(`AVG ${StatDisplay.fmtAVG(batter.contact, batter.name)}  ${this._statBar(batter.contact)}`);
this.batterSpdText.setText(`SB  ${StatDisplay.fmtSB(batter.speed, batter.name)}  ${this._statBar(batter.speed)}`);
```

**Step 3: Replace roster sidebar (line ~1144)**

```javascript
// Old:
`${batsLabel}  PWR:${player.power} CNT:${player.contact} SPD:${player.speed}`

// New:
`${batsLabel}  ${StatDisplay.statLine(player)}`
```

**Step 4: Replace preview tags (lines ~1653-1654)**

```javascript
// Old:
if (powerBonus > 0) tags.push(`+${powerBonus} PWR`);
if (contactBonus > 0) tags.push(`+${contactBonus.toFixed(1)} CNT`);

// New:
if (powerBonus > 0) tags.push(`+${powerBonus} PWR`);
if (contactBonus > 0) tags.push(`+${contactBonus.toFixed(1)} CNT`);
```
Note: Keep these as PWR/CNT — they describe internal bonuses, not player stats.

**Step 5: Replace bonus breakdown messages (lines ~2629, 2639, 3012)**

```javascript
// Line ~2629 — Old:
text: `+${bonuses.powerPeanuts} peanuts (PWR ${batter.power})`,
// New:
text: `+${bonuses.powerPeanuts} peanuts (${StatDisplay.fmtHR(batter.power, batter.name)} HR)`,

// Line ~2639 — Old:
text: `+${bonuses.contactMult.toFixed(1)}x (CNT ${batter.contact})`,
// New:
text: `+${bonuses.contactMult.toFixed(1)}x (${StatDisplay.fmtAVG(batter.contact, batter.name)} AVG)`,

// Line ~3012 — Old:
text: `x${eff.value} mult (PWR ${batter.power})`,
// New:
text: `x${eff.value} mult (${StatDisplay.fmtHR(batter.power, batter.name)} HR)`,
```

**Step 6: Run tests**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: All pass (no gameplay logic changed).

**Step 7: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: GameScene uses AVG/HR/SB display stats"
```

---

### Task 3: Update PitchingScene opponent batter panel and roster

**Files:**
- Modify: `src/scenes/PitchingScene.js:378` (roster sidebar)
- Modify: `src/scenes/PitchingScene.js:582-584` (opp batter stat bars)

**Step 1: Import StatDisplay at top of PitchingScene.js**

```javascript
import StatDisplay from '../StatDisplay.js';
```

**Step 2: Replace opp batter stat bars (lines ~582-584)**

```javascript
// Old:
this.oppBatterPwrText.setText(`PWR  ${this._statBar(batter.power)}`);
this.oppBatterCntText.setText(`CNT  ${this._statBar(batter.contact)}`);
this.oppBatterSpdText.setText(`SPD  ${this._statBar(batter.speed)}`);

// New:
this.oppBatterPwrText.setText(`HR  ${StatDisplay.fmtHR(batter.power, batter.name)}  ${this._statBar(batter.power)}`);
this.oppBatterCntText.setText(`AVG ${StatDisplay.fmtAVG(batter.contact, batter.name)}  ${this._statBar(batter.contact)}`);
this.oppBatterSpdText.setText(`SB  ${StatDisplay.fmtSB(batter.speed, batter.name)}  ${this._statBar(batter.speed)}`);
```

**Step 3: Replace roster sidebar (line ~378)**

```javascript
// Old:
`${batsLabel}  PWR:${player.power} CNT:${player.contact} SPD:${player.speed}`

// New:
`${batsLabel}  ${StatDisplay.statLine(player)}`
```

**Step 4: Run tests**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: All pass.

**Step 5: Commit**

```bash
git add src/scenes/PitchingScene.js
git commit -m "feat: PitchingScene uses AVG/HR/SB display stats"
```

---

### Task 4: Update TeamSelectScene

**Files:**
- Modify: `src/scenes/TeamSelectScene.js:128-130` (stat bars per batter)
- Modify: `src/scenes/TeamSelectScene.js:133` (legend labels)
- Modify: `src/scenes/TeamSelectScene.js:384-389` (team averages)

**Step 1: Import StatDisplay at top**

```javascript
import StatDisplay from '../StatDisplay.js';
```

**Step 2: Replace legend (line ~133)**

```javascript
// Old:
'PWR       CNT       SPD'
// New:
'HR        AVG       SB'
```

**Step 3: Replace team averages (lines ~384-389)**

```javascript
// Old:
const avgPow = (team.batters.reduce((s, b) => s + b.power, 0) / 9).toFixed(1);
const avgCon = (team.batters.reduce((s, b) => s + b.contact, 0) / 9).toFixed(1);
const avgSpd = (team.batters.reduce((s, b) => s + b.speed, 0) / 9).toFixed(1);
// ...
`Power ${avgPow}  Contact ${avgCon}  Speed ${avgSpd}`

// New:
const avgHR = Math.round(team.batters.reduce((s, b) => s + StatDisplay.toHR(b.power, b.name), 0) / 9);
const avgAVG = (team.batters.reduce((s, b) => s + StatDisplay.toAVG(b.contact, b.name), 0) / 9).toFixed(3).slice(1);
const avgSB = Math.round(team.batters.reduce((s, b) => s + StatDisplay.toSB(b.speed, b.name), 0) / 9);
// ...
`HR ${avgHR}  AVG ${avgAVG}  SB ${avgSB}`
```

**Step 4: Run tests**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: All pass.

**Step 5: Commit**

```bash
git add src/scenes/TeamSelectScene.js
git commit -m "feat: TeamSelectScene uses AVG/HR/SB display stats"
```

---

### Task 5: Update TraitDraftScene, ShopScene, PackOpenScene

**Files:**
- Modify: `src/scenes/TraitDraftScene.js:66`
- Modify: `src/scenes/ShopScene.js:429`
- Modify: `src/scenes/PackOpenScene.js:160, 271`

**Step 1: Import StatDisplay in each file**

Add to top of each:
```javascript
import StatDisplay from '../StatDisplay.js';
```

**Step 2: Replace TraitDraftScene (line ~66)**

```javascript
// Old:
`${batter.pos}  P:${batter.power} C:${batter.contact} S:${batter.speed}`
// New:
`${batter.pos}  ${StatDisplay.statLine(batter)}`
```

**Step 3: Replace ShopScene (line ~429)**

```javascript
// Old:
const statsStr = `PWR:${player.power} CNT:${player.contact} SPD:${player.speed}`;
// New:
const statsStr = StatDisplay.statLine(player);
```

**Step 4: Replace PackOpenScene (lines ~160, 271)**

```javascript
// Line ~160 — Old:
`PWR ${player.power}  CNT ${player.contact}  SPD ${player.speed}`
// New:
`HR ${StatDisplay.fmtHR(player.power, player.name)}  AVG ${StatDisplay.fmtAVG(player.contact, player.name)}  SB ${StatDisplay.fmtSB(player.speed, player.name)}`

// Line ~271 — Old:
const statsStr = `PWR:${player.power} CNT:${player.contact} SPD:${player.speed}`;
// New:
const statsStr = StatDisplay.statLine(player);
```

**Step 5: Run tests**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: All pass.

**Step 6: Commit**

```bash
git add src/scenes/TraitDraftScene.js src/scenes/ShopScene.js src/scenes/PackOpenScene.js
git commit -m "feat: TraitDraft/Shop/PackOpen use AVG/HR/SB display stats"
```

---

### Task 6: Create Godot mirror

**Files:**
- Create: `godot/scripts/stat_display.gd`

**Step 1: Create stat_display.gd**

```gdscript
class_name StatDisplay

static func _name_hash(player_name: String, salt: String) -> float:
    var hash_val := 0
    var full := player_name + salt
    for i in range(full.length()):
        hash_val = ((hash_val << 5) - hash_val + full.unicode_at(i)) & 0x7FFFFFFF
    return (hash_val % 10000) / 10000.0

static func to_avg(contact: int, player_name: String) -> float:
    var base := 0.150 + (contact - 1) * 0.028
    var jitter := (_name_hash(player_name, "avg") - 0.5) * 0.030
    return clampf(base + jitter, 0.100, 0.450)

static func to_hr(power: int, player_name: String) -> int:
    var base := (power - 1) * 6.7
    var jitter := (_name_hash(player_name, "hr") - 0.5) * 6.0
    return maxi(0, roundi(base + jitter))

static func to_sb(speed: int, player_name: String) -> int:
    var base := (speed - 1) * 8.9
    var jitter := (_name_hash(player_name, "sb") - 0.5) * 8.0
    return maxi(0, roundi(base + jitter))

static func fmt_avg(contact: int, player_name: String) -> String:
    return ("%.3f" % to_avg(contact, player_name)).substr(1)

static func fmt_hr(power: int, player_name: String) -> String:
    return str(to_hr(power, player_name))

static func fmt_sb(speed: int, player_name: String) -> String:
    return str(to_sb(speed, player_name))

static func stat_line(player: Dictionary) -> String:
    var n: String = player.get("name", "")
    return "AVG:%s HR:%s SB:%s" % [fmt_avg(player.contact, n), fmt_hr(player.power, n), fmt_sb(player.speed, n)]
```

**Step 2: Commit**

```bash
git add godot/scripts/stat_display.gd
git commit -m "feat: Godot StatDisplay mirror for AVG/HR/SB conversion"
```

---

### Task 7: Update GDD and final verification

**Files:**
- Modify: `docs/GAME_DESIGN.md` (document the display conversion)

**Step 1: Add section to GDD about stat display**

Add under the Player Stats section:
```markdown
### Stat Display
Internal stats (1-10) are converted to baseball-style display values:
- **contact** → **AVG** (.150–.400 range, ±.015 jitter per player name)
- **power** → **HR** (0–60 range, ±3 jitter per player name)
- **speed** → **SB** (0–80 range, ±4 jitter per player name)

Jitter is seeded from player name for deterministic, unique values.
Internal math always uses raw 1-10 values.
```

**Step 2: Run full test suite**

Run: `/opt/homebrew/bin/node test/sim.js`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add docs/GAME_DESIGN.md
git commit -m "docs: document AVG/HR/SB stat display conversion in GDD"
```

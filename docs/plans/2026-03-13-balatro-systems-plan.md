# Balatro-Style Systems Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add starter trait draft, card packs with bonus players, coaches & mascots, and player synergies to create Balatro-style risk/reward depth.

**Architecture:** Four independent systems layered onto the existing engine. New data files define bonus players, coaches, mascots, and synergies. Two new scenes (TraitDraftScene, PackOpenScene) slot into the game flow. Existing scenes and engines are extended to apply passive effects. All changes mirrored to Godot.

**Tech Stack:** Phaser 3 (vanilla JS, no bundler), Godot 4.6 (GDScript), node test runner (test/sim.js)

---

## Phase 1: Starter Trait Draft

### Task 1.1: Add Innate Trait Pairs to Team Data

**Files:**
- Modify: `data/teams.js`
- Modify: `data/batter_traits.js` (reference only, no changes)
- Test: `test/sim.js`

**Step 1: Write failing test**

Add to `test/sim.js`:

```javascript
group('Innate Trait Pairs');

// Every batter across all teams must have innateTraits with exactly 2 options
for (const team of TEAMS) {
  for (const batter of team.batters) {
    assert(
      Array.isArray(batter.innateTraits) && batter.innateTraits.length === 2,
      `${team.name} ${batter.name} has 2 innate trait options`
    );
    // Both must be valid trait IDs
    for (const tid of batter.innateTraits) {
      assert(
        BATTER_TRAITS.some(t => t.id === tid),
        `${team.name} ${batter.name} innate trait '${tid}' exists in batter_traits`
      );
    }
  }
}
```

**Step 2: Run test to verify it fails**

Run: `node test/sim.js`
Expected: FAIL — `innateTraits` undefined on batters

**Step 3: Add innateTraits to all 36 batters in `data/teams.js`**

Each batter gets `innateTraits: ['trait_id_a', 'trait_id_b']` matching their archetype:
- High power → power traits (slugger_serum, cleanup_crew, grand_ambition)
- High contact → contact traits (contact_lens, double_mcgee, bunt_single)
- High speed → speed traits (stolen_base, leadoff_king)
- Balanced → situational traits (eye_of_the_tiger, rally_cap, closer)

Example for Canada:
```javascript
{ name: 'Moose Leblanc', pos: 'CF', power: 5, contact: 8, speed: 8, bats: 'L',
  innateTraits: ['leadoff_king', 'stolen_base'] },
{ name: 'Ace Tremblay', pos: 'SS', power: 6, contact: 7, speed: 7, bats: 'R',
  innateTraits: ['contact_lens', 'double_mcgee'] },
{ name: 'Buck Fournier', pos: '1B', power: 9, contact: 5, speed: 3, bats: 'L',
  innateTraits: ['slugger_serum', 'cleanup_crew'] },
```

Assign all 36 batters across 4 teams. No duplicate A/B pairs within a team.

**Step 4: Run test to verify it passes**

Run: `node test/sim.js`
Expected: PASS

**Step 5: Commit**

```bash
git add data/teams.js test/sim.js
git commit -m "feat: add innate trait pairs to all team batters"
```

---

### Task 1.2: Create TraitDraftScene

**Files:**
- Create: `src/scenes/TraitDraftScene.js`
- Modify: `src/main.js` (register scene)
- Modify: `src/scenes/TeamSelectScene.js` (transition to draft instead of GameScene)

**Step 1: Create `src/scenes/TraitDraftScene.js`**

Scene layout (1280x720):
- Title "DRAFT STARTING TRAITS" at top
- 9 rows, one per batter
- Each row: player name, stats, two trait buttons (A / B)
- Selected trait highlights green
- "CONFIRM LINEUP" button at bottom (enabled when all 9 picks made)

```javascript
import BATTER_TRAITS from '../../data/batter_traits.js';

export default class TraitDraftScene extends Phaser.Scene {
  constructor() { super({ key: 'TraitDraftScene' }); }

  init(data) {
    this.team = data.team;
    this.pitcherIndex = data.pitcherIndex;
    this.opponentTeam = data.opponentTeam;
    this.deckId = data.deckId || 'standard';
    this.picks = new Array(9).fill(null); // index 0-8, null = not picked
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x0d1b2a);
    this.add.text(640, 30, 'DRAFT STARTING TRAITS', {
      fontSize: '36px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);

    const startY = 80;
    const rowH = 62;

    this.team.batters.forEach((batter, i) => {
      const y = startY + i * rowH;
      this._createBatterRow(batter, i, y);
    });

    this._createConfirmButton();
  }

  _createBatterRow(batter, index, y) {
    // Player info
    this.add.text(40, y, `${index + 1}. ${batter.name}`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(300, y, `P:${batter.power} C:${batter.contact} S:${batter.speed}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0, 0.5);

    // Two trait buttons
    const traitIds = batter.innateTraits;
    const traits = traitIds.map(id => BATTER_TRAITS.find(t => t.id === id));

    traits.forEach((trait, ti) => {
      if (!trait) return;
      const tx = 520 + ti * 360;
      const bg = this.add.rectangle(tx, y, 340, 48, 0x1a2a3a)
        .setStrokeStyle(2, 0x334455)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(tx, y - 8, trait.name, {
        fontSize: '15px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      const desc = this.add.text(tx, y + 12, trait.description, {
        fontSize: '11px', fontFamily: 'monospace', color: '#aaaaaa',
        wordWrap: { width: 320 },
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        this.picks[index] = ti;
        this._refreshHighlights();
      });

      // Store refs for highlighting
      if (!this._rowButtons) this._rowButtons = [];
      if (!this._rowButtons[index]) this._rowButtons[index] = [];
      this._rowButtons[index][ti] = { bg, label };
    });
  }

  _refreshHighlights() {
    if (!this._rowButtons) return;
    this._rowButtons.forEach((row, i) => {
      row.forEach((btn, ti) => {
        const selected = this.picks[i] === ti;
        btn.bg.setStrokeStyle(2, selected ? 0x4caf50 : 0x334455);
        btn.bg.setFillStyle(selected ? 0x1a3a2a : 0x1a2a3a);
        btn.label.setColor(selected ? '#69f0ae' : '#ffffff');
      });
    });

    // Enable/disable confirm
    const allPicked = this.picks.every(p => p !== null);
    if (this._confirmBg) {
      this._confirmBg.setFillStyle(allPicked ? 0x2e7d32 : 0x555555);
      this._confirmTxt.setColor(allPicked ? '#ffffff' : '#888888');
    }
  }

  _createConfirmButton() {
    this._confirmBg = this.add.rectangle(640, 660, 260, 50, 0x555555)
      .setStrokeStyle(2, 0x666666)
      .setInteractive({ useHandCursor: true });
    this._confirmTxt = this.add.text(640, 660, 'CONFIRM LINEUP', {
      fontSize: '22px', fontFamily: 'monospace', color: '#888888', fontStyle: 'bold',
    }).setOrigin(0.5);

    this._confirmBg.on('pointerdown', () => {
      if (!this.picks.every(p => p !== null)) return;
      this._startGame();
    });
  }

  _startGame() {
    // Build picked traits array
    const pickedTraits = this.team.batters.map((batter, i) => {
      const traitId = batter.innateTraits[this.picks[i]];
      return BATTER_TRAITS.find(t => t.id === traitId);
    });

    this.scene.start('GameScene', {
      team: this.team,
      pitcherIndex: this.pitcherIndex,
      opponentTeam: this.opponentTeam,
      deckId: this.deckId,
      innateTraits: pickedTraits, // array of 9 trait objects
    });
  }
}
```

**Step 2: Register scene in `src/main.js`**

Add import and add to scene array:
```javascript
import TraitDraftScene from './scenes/TraitDraftScene.js';
// Add to scene array: [TitleScene, TeamSelectScene, TraitDraftScene, GameScene, ...]
```

**Step 3: Update TeamSelectScene transition**

In `src/scenes/TeamSelectScene.js`, change the final `scene.start('GameScene', ...)` to `scene.start('TraitDraftScene', ...)` passing the same data.

**Step 4: Update GameScene and RosterManager to apply innate traits**

In GameScene `init()`, when `data.innateTraits` is provided, equip each batter's innate trait via `rosterManager.equipTrait(i, trait)` before the first at-bat.

**Step 5: Test manually in browser, then commit**

```bash
git add src/scenes/TraitDraftScene.js src/main.js src/scenes/TeamSelectScene.js src/scenes/GameScene.js
git commit -m "feat: add TraitDraftScene for innate trait selection"
```

---

## Phase 2: Coaches & Mascots

### Task 2.1: Create Coach and Mascot Data Files

**Files:**
- Create: `data/coaches.js`
- Create: `data/mascots.js`
- Test: `test/sim.js`

**Step 1: Write failing test**

```javascript
group('Coaches & Mascots Data');
assert(COACHES.length >= 8, 'At least 8 coaches defined');
assert(MASCOTS.length >= 8, 'At least 8 mascots defined');
for (const c of COACHES) {
  assert(c.id && c.name && c.price && c.effect, `Coach ${c.name || '?'} has required fields`);
}
for (const m of MASCOTS) {
  assert(m.id && m.name && m.price && m.effect, `Mascot ${m.name || '?'} has required fields`);
}
```

**Step 2: Create `data/coaches.js`**

```javascript
export default [
  { id: 'batting_coach', name: 'Batting Coach', price: 30, rarity: 'common',
    description: 'All batters +1 contact',
    effect: { type: 'team_stat_boost', stat: 'contact', value: 1 } },
  { id: 'power_coach', name: 'Power Coach', price: 30, rarity: 'common',
    description: 'All batters +1 power',
    effect: { type: 'team_stat_boost', stat: 'power', value: 1 } },
  { id: 'base_coach', name: 'Base Coach', price: 25, rarity: 'common',
    description: 'All batters +1 speed',
    effect: { type: 'team_stat_boost', stat: 'speed', value: 1 } },
  { id: 'bench_coach', name: 'Bench Coach', price: 35, rarity: 'uncommon',
    description: '+1 discard per at-bat for all',
    effect: { type: 'team_add_discard', value: 1 } },
  { id: 'pitching_coach', name: 'Pitching Coach', price: 35, rarity: 'uncommon',
    description: 'Your pitcher: -8% hit chance',
    effect: { type: 'pitcher_hit_reduction', value: 0.08 } },
  { id: 'equipment_manager', name: 'Equipment Manager', price: 40, rarity: 'rare',
    description: 'Unlock +1 Coach/Mascot slot',
    effect: { type: 'unlock_staff_slot', value: 1 } },
  { id: 'scout', name: 'Scout', price: 25, rarity: 'common',
    description: 'Shop shows 4 trait cards instead of 3',
    effect: { type: 'shop_extra_cards', value: 1 } },
  { id: 'bullpen_coach', name: 'Bullpen Coach', price: 30, rarity: 'uncommon',
    description: 'Pitcher fatigue starts 1 inning later',
    effect: { type: 'pitcher_fatigue_delay', value: 1 } },
];
```

**Step 3: Create `data/mascots.js`**

```javascript
export default [
  { id: 'rally_moose', name: 'Rally Moose', price: 45, rarity: 'rare',
    description: '+5 mult on any at-bat when losing',
    effect: { type: 'add_mult', value: 5, condition: { type: 'losing_by', value: 1 } } },
  { id: 'lucky_bat_dog', name: 'Lucky Bat Dog', price: 40, rarity: 'rare',
    description: '15% chance a strikeout becomes a walk',
    effect: { type: 'strikeout_to_walk', chance: 0.15 } },
  { id: 'thunder_bear', name: 'Thunder Bear', price: 50, rarity: 'rare',
    description: 'Home Runs score double chips',
    effect: { type: 'double_chips', condition: { type: 'outcome_is', value: 'Home Run' } } },
  { id: 'golden_glove_gorilla', name: 'Golden Glove Gorilla', price: 35, rarity: 'uncommon',
    description: 'Errors happen 3x more often (in your favor)',
    effect: { type: 'error_multiplier', value: 3 } },
  { id: 'card_shark_parrot', name: 'Card Shark Parrot', price: 45, rarity: 'rare',
    description: 'Draw 9 cards instead of 8',
    effect: { type: 'add_hand_draw', value: 1 } },
  { id: 'fireworks_fox', name: 'Fireworks Fox', price: 40, rarity: 'uncommon',
    description: '+3 mult for every run scored this inning',
    effect: { type: 'mult_per_inning_run', value: 3 } },
  { id: 'voodoo_vulture', name: 'Voodoo Vulture', price: 50, rarity: 'rare',
    description: 'Opponent pitcher +1 fatigue per Mascot owned',
    effect: { type: 'opponent_fatigue_per_mascot', value: 1 } },
  { id: 'ice_cream_vendor', name: 'Ice Cream Vendor', price: 30, rarity: 'uncommon',
    description: '+5 bonus chips after every 3-out inning you pitch',
    effect: { type: 'chips_on_clean_inning', value: 5 } },
];
```

**Step 4: Run tests**

Run: `node test/sim.js`
Expected: PASS

**Step 5: Commit**

```bash
git add data/coaches.js data/mascots.js test/sim.js
git commit -m "feat: add coach and mascot data files"
```

---

### Task 2.2: Add Staff Slot Tracking to BaseballState

**Files:**
- Modify: `src/BaseballState.js`
- Test: `test/sim.js`

**Step 1: Write failing test**

```javascript
group('Staff Slots (Coaches & Mascots)');
const bs = new BaseballState();
bs.reset();
assert(bs.staffSlots === 2, 'Start with 2 staff slots');
assert(bs.staff.length === 0, 'Start with no staff');
assert(bs.addStaff({ id: 'batting_coach', name: 'Batting Coach', price: 30, effect: {} }) === true, 'Can add staff');
assert(bs.staff.length === 1, 'Staff count is 1');
assert(bs.addStaff({ id: 'rally_moose', name: 'Rally Moose', price: 45, effect: {} }) === true, 'Can add 2nd staff');
assert(bs.addStaff({ id: 'scout', name: 'Scout', price: 25, effect: {} }) === false, 'Cannot exceed slot limit');
bs.staffSlots = 3;
assert(bs.addStaff({ id: 'scout', name: 'Scout', price: 25, effect: {} }) === true, 'Can add after slot unlock');
assert(bs.removeStaff('rally_moose') === true, 'Can remove staff');
assert(bs.staff.length === 2, 'Staff count after removal');
```

**Step 2: Implement in BaseballState**

Add to `reset()`:
```javascript
this.staff = [];
this.staffSlots = 2;
```

Add methods:
```javascript
addStaff(staffItem) {
  if (this.staff.length >= this.staffSlots) return false;
  this.staff.push(staffItem);
  return true;
}

removeStaff(id) {
  const idx = this.staff.findIndex(s => s.id === id);
  if (idx === -1) return false;
  this.staff.splice(idx, 1);
  return true;
}

getStaff() { return this.staff; }
getStaffByType(type) { return this.staff.filter(s => s.effect.type === type); }
```

**Step 3: Run tests, commit**

```bash
git add src/BaseballState.js test/sim.js
git commit -m "feat: add staff slot tracking to BaseballState"
```

---

### Task 2.3: Expand ShopScene with Coach/Mascot Tab

**Files:**
- Modify: `src/scenes/ShopScene.js`

**Step 1: Add tab UI to ShopScene**

Add two tabs at top: "TRAITS" and "STAFF". Traits tab shows existing trait cards. Staff tab shows available coaches/mascots with buy buttons. Staff purchases do NOT use the trait buy limit.

Key changes:
- Import COACHES and MASCOTS data
- Add `this.activeTab = 'traits'` state
- Tab buttons toggle between `_renderShopCards()` (existing) and `_renderStaffCards()` (new)
- Staff cards show name, description, price, "COACH" or "MASCOT" badge
- Buy flow: click Buy → staff added to `this.baseball.addStaff()` → chips deducted
- Show current staff at bottom of staff tab with sell buttons (50% refund)

**Step 2: Test manually in browser, commit**

```bash
git add src/scenes/ShopScene.js
git commit -m "feat: add Coach/Mascot tab to ShopScene"
```

---

### Task 2.4: Apply Coach/Mascot Effects in GameScene

**Files:**
- Modify: `src/EffectEngine.js` (add new effect type handlers)
- Modify: `src/scenes/GameScene.js` (apply staff effects at at-bat start)
- Modify: `src/scenes/PitchingScene.js` (apply pitcher staff effects)
- Test: `test/sim.js`

**Step 1: Write failing tests for new effect types**

```javascript
group('Staff Effect Types');
// team_stat_boost
const boostEffect = { type: 'team_stat_boost', stat: 'contact', value: 1 };
// Test that EffectEngine can process this (new handler needed)

// strikeout_to_walk
const walkEffect = { type: 'strikeout_to_walk', chance: 1.0 }; // 100% for testing
const strikeoutResult = { handName: 'High Card', outcome: 'Strikeout', chips: 0, mult: 1 };
const converted = EffectEngine.applyStaffPost(strikeoutResult, walkEffect, {});
assert(converted.outcome === 'Walk', 'strikeout_to_walk converts at 100%');
```

**Step 2: Add `applyStaffPost` and staff effect handlers to EffectEngine**

New static method that handles staff-specific effect types (team_stat_boost, strikeout_to_walk, double_chips, etc.)

**Step 3: In GameScene `_startAtBat()`, gather active staff effects and apply:**
- Stat boosts (modify effective batter stats for this at-bat)
- Extra discards (Bench Coach)
- Extra hand draw (Card Shark Parrot)
- Mult bonuses (Rally Moose, Fireworks Fox)

**Step 4: In PitchingScene, apply pitcher staff effects:**
- Pitching Coach hit reduction
- Bullpen Coach fatigue delay
- Voodoo Vulture opponent fatigue

**Step 5: Run tests, commit**

```bash
git add src/EffectEngine.js src/scenes/GameScene.js src/scenes/PitchingScene.js test/sim.js
git commit -m "feat: apply coach/mascot effects in game and pitching scenes"
```

---

## Phase 3: Card Packs & Bonus Players

### Task 3.1: Create Bonus Player Data

**Files:**
- Create: `data/bonus_players.js`
- Test: `test/sim.js`

**Step 1: Write failing test**

```javascript
group('Bonus Players Data');
assert(BONUS_PLAYERS.length >= 12, 'At least 12 bonus players defined');
for (const bp of BONUS_PLAYERS) {
  assert(bp.id && bp.name && bp.power && bp.contact && bp.speed, `${bp.name} has stats`);
  assert(bp.innateTraitId, `${bp.name} has innate trait`);
  assert(bp.lineupEffect && bp.lineupEffect.type, `${bp.name} has lineup effect`);
  assert(BATTER_TRAITS.some(t => t.id === bp.innateTraitId), `${bp.name} innate trait exists`);
}
```

**Step 2: Create `data/bonus_players.js`**

```javascript
export default [
  { id: 'knuckles_mcbride', name: '"Knuckles" McBride', pos: '1B',
    power: 9, contact: 4, speed: 5, bats: 'R',
    innateTraitId: 'cleanup_crew', traitCap: 3,
    lineupEffect: { type: 'team_add_chips_on_xbh', value: 1 },
    lineupDescription: 'All batters: +1 chip on doubles+',
    rarity: 'common' },
  { id: 'silk_santiago', name: 'Silk Santiago', pos: 'SS',
    power: 4, contact: 9, speed: 7, bats: 'L',
    innateTraitId: 'contact_lens', traitCap: 3,
    lineupEffect: { type: 'team_pair_out_reduction', value: 0.05 },
    lineupDescription: 'All batters: pair out chance -5%',
    rarity: 'common' },
  // ... 10+ more bonus players
];
```

**Step 3: Run tests, commit**

```bash
git add data/bonus_players.js test/sim.js
git commit -m "feat: add bonus player data file"
```

---

### Task 3.2: Add Bonus Player Tracking to RosterManager

**Files:**
- Modify: `src/RosterManager.js`
- Test: `test/sim.js`

**Step 1: Write failing test**

```javascript
group('Bonus Player Roster Management');
// Test benchPlayer and addBonusPlayer methods
```

**Step 2: Add methods to RosterManager**

```javascript
this.bonusPlayerCount = 0;
this.benchedPlayers = [];

addBonusPlayer(bonusPlayer, replaceIndex) {
  if (this.bonusPlayerCount >= 3) return false;
  const benched = this.roster[replaceIndex];
  this.benchedPlayers.push(benched);
  // Slot bonus player into roster
  const bp = { ...bonusPlayer, traits: [], isBonus: true };
  // Equip innate trait (doesn't count toward cap)
  const trait = BATTER_TRAITS.find(t => t.id === bonusPlayer.innateTraitId);
  if (trait) bp.traits.push({ ...trait, isInnate: true });
  this.roster[replaceIndex] = bp;
  this.bonusPlayerCount++;
  return true;
}

getActiveLineupEffects() {
  return this.roster
    .filter(p => p.isBonus && p.lineupEffect)
    .map(p => p.lineupEffect);
}
```

**Step 3: Run tests, commit**

```bash
git add src/RosterManager.js test/sim.js
git commit -m "feat: add bonus player roster management"
```

---

### Task 3.3: Create PackOpenScene

**Files:**
- Create: `src/scenes/PackOpenScene.js`
- Modify: `src/main.js` (register scene)
- Modify: `src/scenes/GameScene.js` (transition to pack scene after batting)

**Step 1: Create PackOpenScene**

Scene shows 2 (Bronze) or 3 (Gold) face-down cards. Click to flip. Pick one. Then choose which batter to bench. Transitions to ShopScene after.

**Step 2: Add pack trigger check in GameScene**

After batting half completes (3 outs), before transitioning:
```javascript
const runsThisInning = this.baseball._currentInningPlayerRuns;
const hadBigHand = this._maxChipsThisInning >= 25;
const canGetPack = this.rosterManager.bonusPlayerCount < 3;

if (canGetPack && (runsThisInning >= 4 || hadBigHand)) {
  // Gold pack
  this.scene.start('PackOpenScene', { tier: 'gold', ...managerData });
} else if (canGetPack && runsThisInning >= 2) {
  // Bronze pack
  this.scene.start('PackOpenScene', { tier: 'bronze', ...managerData });
} else {
  // Normal flow to shop/pitching
}
```

**Step 3: Register scene, test manually, commit**

```bash
git add src/scenes/PackOpenScene.js src/main.js src/scenes/GameScene.js
git commit -m "feat: add PackOpenScene with bronze/gold pack tiers"
```

---

### Task 3.4: Apply Bonus Player Lineup Effects

**Files:**
- Modify: `src/EffectEngine.js`
- Modify: `src/scenes/GameScene.js`
- Test: `test/sim.js`

**Step 1: Add lineup effect handlers to EffectEngine**

Handle types: `team_add_chips_on_xbh`, `team_pair_out_reduction`, `team_extra_base_chance`, `team_power_mult`

**Step 2: In GameScene `_startAtBat()`, gather lineup effects from RosterManager and apply alongside staff effects**

**Step 3: Tests and commit**

```bash
git add src/EffectEngine.js src/scenes/GameScene.js test/sim.js
git commit -m "feat: apply bonus player lineup effects during at-bats"
```

---

## Phase 4: Player Synergies

### Task 4.1: Create Synergy Data and Calculator

**Files:**
- Create: `data/synergies.js`
- Create: `src/SynergyEngine.js`
- Test: `test/sim.js`

**Step 1: Write failing test**

```javascript
group('Synergy Engine');
const roster = [
  { bats: 'L', power: 9, contact: 5, speed: 3, pos: '1B' },
  { bats: 'L', power: 8, contact: 6, speed: 4, pos: '3B' },
  { bats: 'L', power: 7, contact: 7, speed: 7, pos: 'LF' },
  { bats: 'R', power: 6, contact: 7, speed: 5, pos: 'SS' },
  // ... 9 players, 3 lefties with 8+ power
];
const active = SynergyEngine.calculate(roster);
assert(active.some(s => s.id === 'murderers_row'), 'Murderers Row activates with 3x 8+ power');
assert(active.some(s => s.id === 'switch_squad'), 'Switch Squad activates with 3+ lefties');
```

**Step 2: Create `data/synergies.js`**

```javascript
export default [
  { id: 'switch_squad', name: 'Switch Squad',
    description: '3+ lefty batters in lineup',
    hint: '3 lefty batters...',
    check: (roster) => roster.filter(b => b.bats === 'L').length >= 3,
    bonus: { type: 'add_mult_lefty', value: 1 } },
  { id: 'murderers_row', name: "Murderer's Row",
    description: '3 batters with 8+ power',
    hint: '3 power hitters...',
    check: (roster) => roster.filter(b => b.power >= 8).length >= 3,
    bonus: { type: 'add_mult_on_hr', value: 2 } },
  // ... all ~15 synergies
];
```

**Step 3: Create `src/SynergyEngine.js`**

```javascript
import SYNERGIES from '../data/synergies.js';

export default class SynergyEngine {
  static calculate(roster) {
    return SYNERGIES.filter(s => s.check(roster)).map(s => ({ ...s }));
  }

  static getAll() { return SYNERGIES; }
}
```

**Step 4: Run tests, commit**

```bash
git add data/synergies.js src/SynergyEngine.js test/sim.js
git commit -m "feat: add synergy data and calculation engine"
```

---

### Task 4.2: Integrate Synergies into GameScene

**Files:**
- Modify: `src/scenes/GameScene.js` (recalculate on lineup change, apply bonuses)
- Modify: `src/scenes/ShopScene.js` (show synergy panel)

**Step 1: Recalculate synergies at game start and after any roster change**

```javascript
this.activeSynergies = SynergyEngine.calculate(this.rosterManager.roster);
```

**Step 2: Apply synergy bonuses in `_startAtBat()` alongside staff/lineup effects**

**Step 3: Add synergy display to ShopScene (list of active/locked synergies)**

**Step 4: Test manually, commit**

```bash
git add src/scenes/GameScene.js src/scenes/ShopScene.js
git commit -m "feat: integrate synergies into game flow and shop display"
```

---

## Phase 5: Godot Sync

### Task 5.1: Mirror All New Data Files to Godot

**Files:**
- Create: `godot/scripts/data/coaches.gd`
- Create: `godot/scripts/data/mascots.gd`
- Create: `godot/scripts/data/bonus_players.gd`
- Create: `godot/scripts/data/synergies.gd`
- Modify: `godot/scripts/data/teams.gd` (add innateTraits)

### Task 5.2: Mirror New Engine Logic to Godot

**Files:**
- Create: `godot/scripts/synergy_engine.gd`
- Modify: `godot/scripts/baseball_state.gd` (staff slots)
- Modify: `godot/scripts/roster_manager.gd` (bonus players)
- Modify: `godot/scripts/effect_engine.gd` (new effect handlers)

### Task 5.3: Mirror New Scenes to Godot

**Files:**
- Create: `godot/scenes/trait_draft_scene.tscn` + `.gd`
- Create: `godot/scenes/pack_open_scene.tscn` + `.gd`
- Modify: `godot/scenes/shop_scene.tscn` + `.gd` (staff tab)

---

## Phase 6: Expanded Trait Pool

### Task 6.1: Design and Add ~40 New Batter Traits

Expand from ~20 to 60+ traits. Categories to fill:
- More pre-eval card manipulation traits
- Situational scoring traits (bases loaded, late innings, comeback)
- Defensive/pitching crossover traits
- Deck manipulation traits (draw extra, peek at deck)
- Combo-enabler traits that synergize with Coaches/Mascots

This task is a data-only addition to `data/batter_traits.js` and `godot/scripts/data/batter_traits.gd`, plus updating `test/sim.js` to validate all new traits have required fields.

---

## Commit Strategy

Each task ends with a commit. Approximate commit sequence:
1. `feat: add innate trait pairs to all team batters`
2. `feat: add TraitDraftScene for innate trait selection`
3. `feat: add coach and mascot data files`
4. `feat: add staff slot tracking to BaseballState`
5. `feat: add Coach/Mascot tab to ShopScene`
6. `feat: apply coach/mascot effects in game and pitching scenes`
7. `feat: add bonus player data file`
8. `feat: add bonus player roster management`
9. `feat: add PackOpenScene with bronze/gold pack tiers`
10. `feat: apply bonus player lineup effects during at-bats`
11. `feat: add synergy data and calculation engine`
12. `feat: integrate synergies into game flow and shop display`
13. `feat: mirror all new systems to Godot`
14. `feat: expand batter trait pool to 60+`

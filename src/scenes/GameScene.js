/**
 * GameScene.js - Main gameplay scene
 * Layout: Batter panel (left) | Base diamond + result (center) | Pitcher panel (right)
 * Cards and buttons along the bottom.
 */
import CardEngine from '../CardEngine.js';
import BaseballState from '../BaseballState.js';
import RosterManager, { PITCH_TYPES } from '../RosterManager.js';
import TraitManager from '../TraitManager.js';
import CountManager from '../CountManager.js';
import SituationalEngine from '../SituationalEngine.js';
import SoundManager from '../SoundManager.js';
import SynergyEngine from '../SynergyEngine.js';

const RANK_NAMES = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const CARD_ASSET_RANKS = { 2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'j',12:'q',13:'k',14:'a' };
const CARD_ASSET_SUITS = { H:'h', D:'d', C:'c', S:'s' };

const CARD_W = 96;
const CARD_H = 126;
const CARD_SPACING = 85;
const HAND_Y = 570;
const HAND_START_X = 640 - (7 * CARD_SPACING) / 2;

// Panel constants
const PANEL_W = 210;
const BATTER_X = 115;   // center of left panel
const PITCHER_X = 1165;  // center of right panel

const RARITY_COLORS = {
  common:   '#81c784',
  uncommon: '#64b5f6',
  rare:     '#ce93d8',
};

const TEAM_SPRITE_KEY = { 'Canada': 'canada', 'USA': 'usa', 'Japan': 'japan', 'Mexico': 'mexico' };

import HAND_TABLE from '../../data/hand_table.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this._initData = data || {};
  }

  preload() {
    if (this.textures.exists('card_ha')) return; // already loaded
    const suits = ['h', 'd', 'c', 's'];
    const ranks = ['2','3','4','5','6','7','8','9','10','a','j','q','k'];
    for (const s of suits) {
      for (const r of ranks) {
        this.load.image(`card_${s}${r}`, `assets/cards/${s}${r}.png`);
      }
    }
    this.load.image('card_back', 'assets/cards/back1.png');
    this.load.image('card_back_red', 'assets/cards/back2.png');

    // Team sprites (batter, pitcher, runner)
    for (const team of ['usa', 'japan', 'canada', 'mexico']) {
      for (const pose of ['batter', 'pitcher', 'runner']) {
        this.load.image(`sprite_${team}_${pose}`, `assets/sprites/${team}_${pose}.png`);
      }
    }

    // Mascot spritesheet (5 cols × 3 rows, 72×72 per frame at 4x)
    this.load.spritesheet('mascots', 'assets/animals/mascots_4x.png', {
      frameWidth: 72, frameHeight: 72,
    });

    // Coach face spritesheet (6 cols × 5 rows, 96×96 per face)
    this.load.spritesheet('faces', 'assets/sprites/faces.png', {
      frameWidth: 96, frameHeight: 96,
    });

    // Blank card base for staff cards
    this.load.image('card_blank', 'assets/cards/space5.png');

    // Set nearest-neighbor filtering on card textures only (keeps text smooth)
    this.load.on('complete', () => {
      for (const s of suits) {
        for (const r of ranks) {
          this.textures.get(`card_${s}${r}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      }
      this.textures.get('card_back').setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (this.textures.exists('card_back_red')) {
        this.textures.get('card_back_red').setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      // Nearest-neighbor on team sprites
      for (const team of ['usa', 'japan', 'canada', 'mexico']) {
        for (const pose of ['batter', 'pitcher', 'runner']) {
          const key = `sprite_${team}_${pose}`;
          if (this.textures.exists(key)) {
            this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
          }
        }
      }
      // Nearest-neighbor on mascot spritesheet, faces, and blank card
      for (const key of ['mascots', 'faces', 'card_blank']) {
        if (this.textures.exists(key)) {
          this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      }
    });
  }

  create() {
    // Persist managers through scene transitions (shop, pitching, etc.)
    if (this._initData.fromShop || this._initData.fromPitching) {
      this.cardEngine = this._initData.cardEngine;
      this.baseball = this._initData.baseball;
      this.rosterManager = this._initData.rosterManager;
      this.traitManager = this._initData.traitManager;
      this.gameLogEntries = this._initData.gameLogEntries || [];
    } else {
      this.cardEngine = new CardEngine();
      this.baseball = new BaseballState();
      // Accept team + pitcher + opponent from TeamSelectScene
      const team = this._initData.team;
      const pitcherIdx = this._initData.pitcherIndex || 0;
      const oppTeam = this._initData.opponentTeam || null;
      this.rosterManager = new RosterManager(team, pitcherIdx, oppTeam);
      this.traitManager = new TraitManager();
      // Apply innate traits from draft (one per batter)
      if (this._initData.innateTraits) {
        this._initData.innateTraits.forEach((trait, i) => {
          if (trait) this.rosterManager.equipTrait(i, trait);
        });
      }
      // Assign pitcher traits at game start
      const pitcherTraits = TraitManager.pickPitcherTraits();
      this.rosterManager.setPitcherTraits(pitcherTraits);
      this.gameLogEntries = [];
    }

    this.selectedIndices = new Set();
    this.cardSprites = [];
    this.inputLocked = false;
    this._maxPeanutsThisInning = 0;
    this.activeSynergies = SynergyEngine.calculate(this.rosterManager.getRoster());
    this.baseGraphics = [];
    this.batterTraitSprites = [];
    this.pitcherTraitSprites = [];
    this.sortMode = 'default'; // 'default' | 'rank' | 'suit'
    this.dealOrder = [];       // original card indices for default sort

    this._createBaseDiamond();
    this._createScoreboard();
    this._createBatterPanel();
    this._createPitcherPanel();
    this._createResultDisplay();
    this._createButtons();
    this._createSortButtons();
    this._createInfoText();
    this._createStaffStack();
    this._createRosterButton();

    // Clean up in-flight timers when scene exits (prevents stale callbacks)
    this.events.once('shutdown', () => {
      this.time.removeAllEvents();
      this.tweens.killAll();
    });

    this._updateBatterPanel();
    this._updatePitcherPanel();

    // Show inning transition when returning from pitching, otherwise start at-bat directly
    if (this._initData.fromPitching) {
      this._showInningTransition();
    } else {
      this._startAtBat();
    }

  }

  // ── Scoreboard ──────────────────────────────────────────

  _createScoreboard() {
    this.add.rectangle(640, 25, 1280, 50, 0x0d3311).setDepth(0);

    // Score + Peanuts (vertically centered in bar)
    this.scoreText = this.add.text(640, 13, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffd600',
    }).setOrigin(0.5, 0).setDepth(1);

    // Left: INN + Outs
    this.inningOutsText = this.add.text(BATTER_X + PANEL_W / 2 + 20, 16, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    }).setDepth(1);

    // Right: B + S count (right-aligned before pitcher panel)
    this.countText = this.add.text(PITCHER_X - PANEL_W / 2 - 10, 16, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(1, 0).setDepth(1);

    this.countManager = new CountManager();

    this.peanutBalanceText = this.add.text(640, 6, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffd600',
    }).setOrigin(0.5, 0).setDepth(1).setVisible(false);

    this._updateScoreboard();
  }

  _updateScoreboard() {
    const s = this.baseball.getStatus();
    const playerTeam = this.rosterManager.getTeam();
    const playerName = playerTeam ? playerTeam.id : 'YOU';
    const oppTeam = this.rosterManager.getOpponentTeam();
    const oppName = oppTeam ? oppTeam.id : 'OPP';
    this.scoreText.setText(`${playerName} ${s.playerScore}  -  ${s.opponentScore} ${oppName}    Peanuts: ${s.totalPeanuts}`);

    // Line 2 left: INN + Outs
    const outDots = [];
    for (let i = 0; i < 3; i++) {
      outDots.push(i < s.outs ? '\u25cf' : '\u25cb');
    }
    const innHalf = s.half === 'top' ? '\u25b2' : '\u25bc';
    this.inningOutsText.setText(`INN ${s.inning} ${innHalf}   Outs: ${outDots.join(' ')}`);

    // Line 2 right: B + S count
    const count = this.countManager.getCount();
    const ballDots = [];
    for (let i = 0; i < 4; i++) {
      ballDots.push(i < count.balls ? '\u25cf' : '\u25cb');
    }
    const strikeDots = [];
    for (let i = 0; i < 3; i++) {
      strikeDots.push(i < count.strikes ? '\u25cf' : '\u25cb');
    }
    this.countText.setText(`B: ${ballDots.join(' ')}   S: ${strikeDots.join(' ')}`);

    if (!this._deferBaseUpdate) this._updateBases(s.bases);
  }

  // ── Batter Panel (left) ────────────────────────────────

  _createBatterPanel() {
    const panelLeft = BATTER_X - PANEL_W / 2;
    const textW = PANEL_W - 20;
    // Dark panel background
    this.add.rectangle(BATTER_X, 280, PANEL_W, 400, 0x0a1f0d, 0.85)
      .setStrokeStyle(2, 0x2e7d32);

    // Team + "AT BAT" header
    const team = this.rosterManager.getTeam();
    const headerLabel = team ? `${team.logo} AT BAT` : 'AT BAT';
    this.add.text(BATTER_X, 95, headerLabel, {
      fontSize: '12px', fontFamily: 'monospace', color: '#4caf50', fontStyle: 'bold',
      fixedWidth: textW, align: 'center',
    }).setOrigin(0.5);

    // Player name
    this.batterNameText = this.add.text(BATTER_X, 120, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: textW }, fixedWidth: textW,
    }).setOrigin(0.5).setDepth(2);

    // Lineup number
    this.batterNumText = this.add.text(BATTER_X, 148, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#81c784',
      fixedWidth: textW, align: 'center',
    }).setOrigin(0.5).setDepth(2);

    // Stats
    this.batterPwrText = this.add.text(panelLeft + 10, 175, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8a65',
      fixedWidth: textW,
    }).setDepth(2);
    this.batterCntText = this.add.text(panelLeft + 10, 195, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#64b5f6',
      fixedWidth: textW,
    }).setDepth(2);
    this.batterSpdText = this.add.text(panelLeft + 10, 215, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
      fixedWidth: textW,
    }).setDepth(2);

    // Divider
    this.add.rectangle(BATTER_X, 240, PANEL_W - 30, 1, 0x2e7d32, 0.5);

    // "TRAITS" label
    this.batterTraitLabel = this.add.text(BATTER_X, 252, 'TRAITS', {
      fontSize: '11px', fontFamily: 'monospace', color: '#4caf50',
      fixedWidth: textW, align: 'center',
    }).setOrigin(0.5).setDepth(2);
  }

  _updateBatterPanel() {
    const batter = this.rosterManager.getCurrentBatter();
    const idx = this.rosterManager.getCurrentBatterIndex();

    // Update batter sprite position based on handedness
    if (this.batterSprite) {
      const cx = this.baseDiamondCenter.x;
      const cy = this.baseDiamondCenter.y;
      const r = this.baseDiamondRadius;
      const isLefty = batter.bats === 'L';
      this.batterSprite.setX(cx + (isLefty ? 22 : -22));
      this.batterSprite.setY(cy + r - 5);
      this.batterSprite.setFlipX(isLefty);
    }

    this.batterNameText.setText(batter.name);
    const pos = batter.pos ? ` | ${batter.pos}` : '';
    this.batterNumText.setText(`#${idx + 1} in lineup${pos}`);

    this.batterPwrText.setText(`PWR  ${this._statBar(batter.power)}`);
    this.batterCntText.setText(`CNT  ${this._statBar(batter.contact)}`);
    this.batterSpdText.setText(`SPD  ${this._statBar(batter.speed)}`);

    // Trait mini-cards
    this._clearTraitSprites(this.batterTraitSprites);
    this.batterTraitSprites = [];

    if (batter.traits.length === 0) {
      this.batterTraitLabel.setText('NO TRAITS');
    } else {
      this.batterTraitLabel.setText('TRAITS');
      batter.traits.forEach((trait, i) => {
        const sprites = this._createTraitMiniCard(BATTER_X, 275 + i * 75, trait);
        this.batterTraitSprites.push(...sprites);
      });
    }

    // Walk-up animation - slide everything in from the left
    const walkUpTargets = [
      this.batterNameText, this.batterNumText,
      this.batterPwrText, this.batterCntText, this.batterSpdText,
      this.batterTraitLabel,
    ];
    walkUpTargets.forEach((t, i) => {
      const origX = t.x;
      t.setAlpha(0);
      t.x = origX - 50;
      this.tweens.add({
        targets: t,
        x: origX,
        alpha: 1,
        duration: 300,
        delay: i * 50,
        ease: 'Quad.easeOut',
      });
    });
  }

  // ── Pitcher Panel (right) ─────────────────────────────

  _createPitcherPanel() {
    const panelLeft = PITCHER_X - PANEL_W / 2;
    const textW = PANEL_W - 20;
    this.add.rectangle(PITCHER_X, 280, PANEL_W, 400, 0x1a0a0d, 0.85)
      .setStrokeStyle(2, 0x8b0000);

    // "PITCHING" header
    this.add.text(PITCHER_X, 95, 'PITCHING', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e53935', fontStyle: 'bold',
      fixedWidth: textW, align: 'center',
    }).setOrigin(0.5);

    // Pitcher name
    this.pitcherNameText = this.add.text(PITCHER_X, 120, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: textW }, fixedWidth: textW,
    }).setOrigin(0.5).setDepth(2);

    // Opponent team label
    this.pitcherTeamText = this.add.text(PITCHER_X, 148, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e57373',
      fixedWidth: textW, align: 'center',
    }).setOrigin(0.5).setDepth(2);

    // Stats
    this.pitcherVelText = this.add.text(panelLeft + 10, 170, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8a65',
      fixedWidth: textW,
    }).setDepth(2);
    this.pitcherCtlText = this.add.text(panelLeft + 10, 190, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#64b5f6',
      fixedWidth: textW,
    }).setDepth(2);
    this.pitcherStaText = this.add.text(panelLeft + 10, 210, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
      fixedWidth: textW,
    }).setDepth(2);

    // Divider
    this.add.rectangle(PITCHER_X, 235, PANEL_W - 30, 1, 0x8b0000, 0.5);

    // "TRAITS" label
    this.pitcherTraitLabel = this.add.text(PITCHER_X, 247, 'TRAITS', {
      fontSize: '11px', fontFamily: 'monospace', color: '#e53935',
      fixedWidth: textW, align: 'center',
    }).setOrigin(0.5).setDepth(2);
  }

  _updatePitcherPanel() {
    const pitcher = this.rosterManager.getCurrentPitcher();

    this.pitcherNameText.setText(pitcher.name);
    const teamLabel = pitcher.teamLogo ? `${pitcher.teamLogo} ${pitcher.teamName}` : '';
    this.pitcherTeamText.setText(teamLabel);
    this.pitcherVelText.setText(`VEL  ${this._statBar(pitcher.velocity)}`);
    this.pitcherCtlText.setText(`CTL  ${this._statBar(pitcher.control)}`);
    this.pitcherStaText.setText(`STA  ${this._statBar(pitcher.stamina)}`);

    // Update pitcher mound sprite flip for handedness
    if (this.pitcherMoundSprite) {
      const pitcherLefty = pitcher.throws === 'L';
      this.pitcherMoundSprite.setFlipX(!pitcherLefty);
    }

    // Trait mini-cards
    this._clearTraitSprites(this.pitcherTraitSprites);
    this.pitcherTraitSprites = [];

    if (pitcher.traits.length === 0) {
      this.pitcherTraitLabel.setText('NO TRAITS');
    } else {
      this.pitcherTraitLabel.setText('TRAITS');
      pitcher.traits.forEach((trait, i) => {
        const sprites = this._createTraitMiniCard(PITCHER_X, 270 + i * 75, trait, true);
        this.pitcherTraitSprites.push(...sprites);
      });
    }
  }

  // ── Trait Mini-Card ────────────────────────────────────

  _createTraitMiniCard(cx, cy, trait, isPitcher = false) {
    const w = PANEL_W - 24;
    const h = 60;
    const borderColor = isPitcher ? 0x8b0000 : 0x2e7d32;
    const bgColor = isPitcher ? 0x2a1015 : 0x0d2a12;
    const rarityColor = RARITY_COLORS[trait.rarity] || '#aaaaaa';

    const bg = this.add.rectangle(cx, cy, w, h, bgColor)
      .setStrokeStyle(1, borderColor)
      .setDepth(2);

    const name = this.add.text(cx, cy - 15, trait.name, {
      fontSize: '11px', fontFamily: 'monospace', color: rarityColor, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);

    const desc = this.add.text(cx, cy + 8, trait.description, {
      fontSize: '9px', fontFamily: 'monospace', color: '#999999',
      align: 'center', wordWrap: { width: w - 10 },
    }).setOrigin(0.5).setDepth(3);

    return [bg, name, desc];
  }

  _clearTraitSprites(arr) {
    arr.forEach(s => s.destroy());
  }

  // ── Stat Bar Helper ────────────────────────────────────

  _statBar(val) {
    const max = 5;
    const filled = Math.round(Math.min(val, 10) / 10 * max);
    return '\u2588'.repeat(filled) + '\u2591'.repeat(max - filled) + ` ${val}`;
  }

  // ── Base Diamond (center) ─────────────────────────────

  _createBaseDiamond() {
    this.baseGraphics = [];
    this.runners = [null, null, null]; // runner dots for 1st, 2nd, 3rd
    this.runnerLabels = [null, null, null]; // runner name labels
    this._prevBases = [null, null, null]; // track previous state for animations
    const cx = 640, cy = 195;
    const r = 85;
    this.baseDiamondCenter = { x: cx, y: cy };
    this.baseDiamondRadius = r;
    this.basePositions = [
      { x: cx + r, y: cy },       // 1st base
      { x: cx, y: cy - r },       // 2nd base
      { x: cx - r, y: cy },       // 3rd base
    ];
    this.runnerOffsets = [
      { x: 12, y: -10 },  // 1st — centered at base, offset right and up
      { x: 0, y: -15 },   // 2nd — feet on base
      { x: -12, y: -10 }, // 3rd — centered at base, offset left and up
    ];
    this.homePosition = { x: cx, y: cy + r };

    const gfx = this.add.graphics();
    gfx.lineStyle(2, 0xffffff, 0.4);
    gfx.beginPath();
    gfx.moveTo(cx, cy + r);
    gfx.lineTo(cx + r, cy);
    gfx.lineTo(cx, cy - r);
    gfx.lineTo(cx - r, cy);
    gfx.closePath();
    gfx.strokePath();

    // Home plate — pentagon
    const hp = this.add.graphics();
    hp.fillStyle(0xffffff, 0.6);
    hp.beginPath();
    const hs = 8;
    hp.moveTo(cx - hs, cy + r - hs * 0.4);
    hp.lineTo(cx + hs, cy + r - hs * 0.4);
    hp.lineTo(cx + hs, cy + r + hs * 0.2);
    hp.lineTo(cx, cy + r + hs * 0.8);
    hp.lineTo(cx - hs, cy + r + hs * 0.2);
    hp.closePath();
    hp.fillPath();

    // Square bases (rotated 45deg) for 1st, 2nd, 3rd
    for (let i = 0; i < 3; i++) {
      const bp = this.basePositions[i];
      const baseGfx = this.add.graphics();
      const bs = 14;
      baseGfx.fillStyle(0x666666, 1);
      baseGfx.beginPath();
      baseGfx.moveTo(bp.x, bp.y - bs / 2);
      baseGfx.lineTo(bp.x + bs / 2, bp.y);
      baseGfx.lineTo(bp.x, bp.y + bs / 2);
      baseGfx.lineTo(bp.x - bs / 2, bp.y);
      baseGfx.closePath();
      baseGfx.fillPath();
      this.baseGraphics.push(baseGfx);
    }

    // Batter sprite at home plate (updated each at-bat for handedness)
    const team = this.rosterManager.getTeam();
    const teamKey = team ? TEAM_SPRITE_KEY[team.name] : 'usa';
    const batterSpriteKey = `sprite_${teamKey}_batter`;
    if (this.textures.exists(batterSpriteKey)) {
      const batter = this.rosterManager.getCurrentBatter();
      const isLefty = batter && batter.bats === 'L';
      const xOff = isLefty ? 22 : -22;
      this.batterSprite = this.add.image(cx + xOff, cy + r - 5, batterSpriteKey)
        .setScale(2.5).setDepth(3).setFlipX(isLefty);
    }

    // Pitcher sprite at mound (center of diamond)
    const oppTeam = this.rosterManager.getOpponentTeam();
    const oppKey = oppTeam ? TEAM_SPRITE_KEY[oppTeam.name] : 'usa';
    const pitcherSpriteKey = `sprite_${oppKey}_pitcher`;
    if (this.textures.exists(pitcherSpriteKey)) {
      const pitcher = this.rosterManager.getCurrentPitcher();
      const pitcherLefty = pitcher && pitcher.throws === 'L';
      this.pitcherMoundSprite = this.add.image(cx, cy, pitcherSpriteKey)
        .setScale(2.5).setDepth(3).setFlipX(!pitcherLefty);
    }
  }

  _updateBases(bases) {
    const bs = 14;

    // Process bases in order: 3rd → 2nd → 1st (lead runners advance first)
    const order = [2, 1, 0];
    for (const i of order) {
      const bp = this.basePositions[i];
      const occupied = bases[i];
      const wasOccupied = this._prevBases[i];
      const stagger = (2 - i) * 200; // 3rd=0ms, 2nd=200ms, 1st=400ms

      // Redraw base with correct color
      this.baseGraphics[i].clear();
      this.baseGraphics[i].fillStyle(occupied ? 0xffd600 : 0x666666, 1);
      this.baseGraphics[i].beginPath();
      this.baseGraphics[i].moveTo(bp.x, bp.y - bs / 2);
      this.baseGraphics[i].lineTo(bp.x + bs / 2, bp.y);
      this.baseGraphics[i].lineTo(bp.x, bp.y + bs / 2);
      this.baseGraphics[i].lineTo(bp.x - bs / 2, bp.y);
      this.baseGraphics[i].closePath();
      this.baseGraphics[i].fillPath();

      // Runner sprites — offset from base position
      const ro = this.runnerOffsets[i];
      const destX = bp.x + ro.x;
      const destY = bp.y + ro.y;
      if (occupied && !wasOccupied) {
        // Runner arriving — animate from previous base or home
        const fromPos = i === 0 ? this.homePosition : this.basePositions[i - 1];
        const prevRo = i === 0 ? { x: 0, y: 0 } : this.runnerOffsets[i - 1];
        if (this.runners[i]) this.runners[i].destroy();
        const teamKey = TEAM_SPRITE_KEY[this.rosterManager.getTeam()?.name] || 'usa';
        const runnerKey = `sprite_${teamKey}_runner`;
        const runner = this.textures.exists(runnerKey)
          ? this.add.image(fromPos.x + prevRo.x, fromPos.y + prevRo.y, runnerKey).setScale(2.5).setDepth(3)
          : this.add.circle(fromPos.x + prevRo.x, fromPos.y + prevRo.y, 10, 0xffd600).setDepth(3);
        this.runners[i] = runner;
        // Trail particles along basepath
        this._spawnRunnerTrail(fromPos, bp);
        // Tween along basepath (staggered — lead runners move first)
        this.tweens.add({
          targets: runner,
          x: destX,
          y: destY,
          duration: 500,
          delay: stagger,
          ease: 'Quad.easeInOut',
        });
      } else if (!occupied && wasOccupied) {
        // Runner left — animate to next base or home
        if (this.runners[i]) {
          const toPos = i === 2 ? this.homePosition : this.basePositions[i + 1];
          const nextRo = i === 2 ? { x: 0, y: 0 } : this.runnerOffsets[i + 1];
          this._spawnRunnerTrail(bp, toPos);
          const runnerRef = this.runners[i];
          this.tweens.add({
            targets: runnerRef,
            x: toPos.x + nextRo.x,
            y: toPos.y + nextRo.y,
            alpha: 0,
            duration: 500,
            delay: stagger,
            ease: 'Quad.easeIn',
            onComplete: () => runnerRef.destroy(),
          });
          this.runners[i] = null;
        }
      } else if (occupied && wasOccupied) {
        // Runner stayed — ensure sprite is at correct position
        if (!this.runners[i]) {
          const teamKey = TEAM_SPRITE_KEY[this.rosterManager.getTeam()?.name] || 'usa';
          const runnerKey = `sprite_${teamKey}_runner`;
          const runner = this.textures.exists(runnerKey)
            ? this.add.image(destX, destY, runnerKey).setScale(2.5).setDepth(3)
            : this.add.circle(destX, destY, 10, 0xffd600).setDepth(3);
          this.runners[i] = runner;
        }
      } else {
        // No runner, clean up
        if (this.runners[i]) {
          this.runners[i].destroy();
          this.runners[i] = null;
        }
      }
    }
    // Update runner name labels
    for (let i = 0; i < 3; i++) {
      const bp = this.basePositions[i];
      if (this.runnerLabels[i]) {
        this.runnerLabels[i].destroy();
        this.runnerLabels[i] = null;
      }
      if (bases[i] && typeof bases[i] === 'object' && bases[i].name) {
        const lastName = bases[i].name.split(' ').pop();
        const ro = this.runnerOffsets[i];
        const labelY = bp.y + ro.y - (i === 1 ? 18 : 26);
        const label = this.add.text(bp.x + ro.x, labelY, lastName, {
          fontSize: '13px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
        }).setOrigin(0.5, 1).setDepth(4).setAlpha(0);
        this.tweens.add({ targets: label, alpha: 0.9, duration: 300, delay: 200 });
        this.runnerLabels[i] = label;
      }
    }

    this._prevBases = bases.map(b => b ? true : null);
  }

  /** Spawn fading trail dots between two base positions */
  _spawnRunnerTrail(from, to) {
    const steps = 5;
    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1);
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const dot = this.add.circle(x, y, 4, 0xffd600, 0.6).setDepth(2);
      this.tweens.add({
        targets: dot,
        alpha: 0,
        scale: 0.3,
        duration: 400,
        delay: s * 40,
        onComplete: () => dot.destroy(),
      });
    }
  }

  // ── Result Display (center) ───────────────────────────

  _createResultDisplay() {
    this.resultText = this.add.text(640, 345, '', {
      fontSize: '34px', fontFamily: 'monospace', color: '#ffffff',
      align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    this.handNameText = this.add.text(640, 430, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#aaaaaa',
      align: 'center',
    }).setOrigin(0.5).setDepth(2);

    // Live hand preview (shown while selecting cards — shares space with result text)
    this.handPreviewText = this.add.text(640, 345, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffd600',
      align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(7).setAlpha(0);

    // Live score preview: peanuts x mult = total (shares space with hand name)
    this.scorePreviewText = this.add.text(640, 370, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaaaaa',
      align: 'center',
    }).setOrigin(0.5).setDepth(8).setAlpha(0);

    // Cascade text lines (reused each resolve)
    this.cascadeTexts = [];

    // Score popup container (created dynamically)
    this.scorePopups = [];
  }

  // ── Info Text ─────────────────────────────────────────

  _createInfoText() {
    this.discardInfo = this.add.text(640, 395, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#b2dfdb',
    }).setOrigin(0.5).setDepth(7);

    this.deckInfo = this.add.text(BATTER_X, 490, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0.5).setDepth(1);

    this._updateInfoText();
  }

  _canDiscard() {
    return !this.countManager.isStrikeout() && !this.countManager.isWalk();
  }

  _updateInfoText() {
    const count = this.countManager.getCount();
    const freeTakeStr = this.freeTakesRemaining > 0 ? ` | Free takes: ${this.freeTakesRemaining}` : '';
    this.discardInfo.setText(
      `Select cards to PLAY or DISCARD${freeTakeStr}`
    );
    this.deckInfo.setText(`Deck: ${this.cardEngine.deck.length}`);

    // Tint discard button by risk level (count shown in scoreboard)
    if (this.discardBtn) {
      this.discardBtn.txt.setText('DISCARD');
      if (count.strikes === 0) {
        this.discardBtn.bg.setFillStyle(0x558b2f);  // green — safe
      } else if (count.strikes === 1) {
        this.discardBtn.bg.setFillStyle(0xf57f17);  // orange — caution
      } else {
        this.discardBtn.bg.setFillStyle(0xc62828);  // red — danger
      }
    }
  }

  // ── Game Log ─────────────────────────────────────────

  // ── Staff Card Stack (bottom-left, replaces game log) ──

  _createStaffStack() {
    const stackX = 10;
    const stackY = 495;
    const stackW = PANEL_W + 10;
    const stackH = 170;

    this.add.rectangle(stackX + stackW / 2, stackY + stackH / 2, stackW, stackH, 0x0a1f0d, 0.8)
      .setStrokeStyle(1, 0x2e7d32, 0.5).setDepth(0);

    this.add.text(stackX + 8, stackY + 4, 'STAFF', {
      fontSize: '9px', fontFamily: 'monospace', color: '#4caf50', fontStyle: 'bold',
    }).setDepth(1);

    const staff = this.baseball.getStaff();
    if (staff.length === 0) {
      this.add.text(stackX + stackW / 2, stackY + stackH / 2, 'No staff hired', {
        fontSize: '11px', fontFamily: 'monospace', color: '#555555',
      }).setOrigin(0.5).setDepth(1);
      return;
    }

    staff.forEach((item, i) => {
      const cardY = stackY + 20 + i * 38;
      const isCoach = item.category === 'coach';
      const badgeColor = isCoach ? 0x00695c : 0x6d4c00;
      const textColor = isCoach ? '#80cbc4' : '#ffab40';

      this.add.rectangle(stackX + stackW / 2, cardY + 12, stackW - 12, 32, badgeColor, 0.5)
        .setStrokeStyle(1, isCoach ? 0x26a69a : 0xffa000, 0.6).setDepth(1);

      // Mascot sprite, coach face, or text badge
      if (!isCoach && item.spriteIndex !== undefined && this.textures.exists('mascots')) {
        this.add.image(stackX + 20, cardY + 12, 'mascots', item.spriteIndex)
          .setOrigin(0.5).setScale(0.35).setDepth(2);
      } else if (isCoach && item.faceIndex !== undefined && this.textures.exists('faces')) {
        this.add.image(stackX + 20, cardY + 12, 'faces', item.faceIndex)
          .setOrigin(0.5).setScale(0.25).setDepth(2);
      } else {
        const badge = isCoach ? 'C' : 'M';
        this.add.text(stackX + 14, cardY + 5, badge, {
          fontSize: '11px', fontFamily: 'monospace', color: textColor, fontStyle: 'bold',
        }).setDepth(2);
      }

      this.add.text(stackX + 38, cardY + 4, item.name, {
        fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setDepth(2);

      this.add.text(stackX + 38, cardY + 16, item.description, {
        fontSize: '8px', fontFamily: 'monospace', color: '#aaaaaa',
        wordWrap: { width: stackW - 50 },
      }).setDepth(2);
    });
  }

  // ── Game Log (data only, rendered in roster overlay) ──

  _addGameLog(entry, color = '#b0bec5') {
    const s = this.baseball.getStatus();
    const prefix = `${s.inning}${s.half === 'top' ? '\u25b2' : '\u25bc'}`;
    this.gameLogEntries.push({ text: `${prefix} ${entry}`, color });
    if (this.gameLogEntries.length > 40) {
      this.gameLogEntries.shift();
    }
  }

  // ── Roster Overlay ────────────────────────────────────

  _createRosterButton() {
    const btnX = 10 + (PANEL_W + 10) / 2;
    const btnY = 495 + 175;
    const btnW = PANEL_W + 10;
    const btnH = 28;

    const bg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x1a3a2a, 0.9)
      .setStrokeStyle(1, 0x4caf50).setDepth(3)
      .setInteractive({ useHandCursor: true });
    this.add.text(btnX, btnY, 'ROSTER', {
      fontSize: '12px', fontFamily: 'monospace', color: '#69f0ae', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(4);

    bg.on('pointerover', () => bg.setStrokeStyle(1, 0xffd600));
    bg.on('pointerout', () => bg.setStrokeStyle(1, 0x4caf50));
    bg.on('pointerdown', () => this._toggleRosterOverlay());

    this.rosterOverlayVisible = false;
    this.rosterOverlayElements = [];
  }

  _toggleRosterOverlay() {
    if (this.rosterOverlayVisible) {
      this.rosterOverlayElements.forEach(el => el.destroy());
      this.rosterOverlayElements = [];
      this.rosterOverlayVisible = false;
      return;
    }
    this.rosterOverlayVisible = true;
    const els = this.rosterOverlayElements;

    // Full-screen overlay
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.92)
      .setDepth(50).setInteractive();
    els.push(overlay);

    // Close button
    const closeBg = this.add.rectangle(1220, 40, 80, 32, 0x8b0000)
      .setStrokeStyle(1, 0xaa2222).setDepth(51)
      .setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(1220, 40, 'CLOSE', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    closeBg.on('pointerdown', () => this._toggleRosterOverlay());
    els.push(closeBg, closeTxt);

    // ── Left column: LINEUP ──
    const colL = 40;       // left edge of lineup column
    const colLW = 560;     // lineup column width
    const colR = 640;      // left edge of right column
    const colRW = 580;     // right column width

    els.push(this.add.text(colL + colLW / 2, 25, 'LINEUP', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51));

    const roster = this.rosterManager.getRoster();
    const currentIdx = this.rosterManager.getCurrentBatterIndex();
    const rosterX = colL + 10;
    const startY = 55;
    const rowH = 44;

    roster.forEach((player, i) => {
      const y = startY + i * rowH;
      const isNext = i === currentIdx;
      const isBonus = player.isBonus;

      const rowBg = this.add.rectangle(colL + colLW / 2, y + 16, colLW - 10, 38,
        isBonus ? 0x2a2a1a : 0x111d2a, 0.7)
        .setStrokeStyle(1, isNext ? 0x69f0ae : 0x222d3a).setDepth(51);
      els.push(rowBg);

      if (isNext) {
        els.push(this.add.text(rosterX - 5, y + 8, '\u25b6', {
          fontSize: '12px', fontFamily: 'monospace', color: '#69f0ae',
        }).setDepth(52));
      }

      const posLabel = player.pos ? `${player.pos} ` : '';
      const nameColor = isBonus ? '#ffd600' : (isNext ? '#69f0ae' : '#ffffff');
      els.push(this.add.text(rosterX + 12, y + 6, `${i + 1}. ${posLabel}${player.name}`, {
        fontSize: '12px', fontFamily: 'monospace', color: nameColor, fontStyle: 'bold',
      }).setDepth(52));

      const batsLabel = player.bats === 'L' ? 'L' : 'R';
      els.push(this.add.text(rosterX + 12, y + 20, `${batsLabel}  PWR:${player.power} CNT:${player.contact} SPD:${player.speed}`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#81c784',
      }).setDepth(52));

      // Traits (right side of row)
      if (player.traits && player.traits.length > 0) {
        const traitNames = player.traits.map(t => t.name).join(', ');
        els.push(this.add.text(colL + colLW - 20, y + 13, traitNames, {
          fontSize: '9px', fontFamily: 'monospace', color: '#ce93d8',
          wordWrap: { width: 200 },
        }).setOrigin(1, 0.5).setDepth(52));
      }
    });

    // ── Right column: SYNERGIES + GAME LOG ──
    const synX = colR + 20;
    els.push(this.add.text(colR + colRW / 2, 25, 'SYNERGIES', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ce93d8', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51));

    const allSynergies = SynergyEngine.getAll();
    const activeIds = new Set((this.activeSynergies || []).map(s => s.id));

    allSynergies.forEach((syn, i) => {
      const y = 50 + i * 28;
      const isActive = activeIds.has(syn.id);
      const icon = isActive ? '\u2713' : '\u2717';
      const iconColor = isActive ? '#69f0ae' : '#444444';

      els.push(this.add.text(synX, y, icon, {
        fontSize: '13px', fontFamily: 'monospace', color: iconColor, fontStyle: 'bold',
      }).setDepth(52));

      els.push(this.add.text(synX + 20, y, syn.name, {
        fontSize: '11px', fontFamily: 'monospace',
        color: isActive ? '#ffffff' : '#666666', fontStyle: isActive ? 'bold' : '',
      }).setDepth(52));

      const desc = isActive ? syn.bonusDescription : syn.hint;
      els.push(this.add.text(synX + 180, y + 1, desc, {
        fontSize: '9px', fontFamily: 'monospace', color: isActive ? '#81c784' : '#555555',
      }).setDepth(52));
    });

    // Game Log (below synergies in right column)
    const logTopY = 400;
    els.push(this.add.text(colR + colRW / 2, logTopY, 'GAME LOG', {
      fontSize: '14px', fontFamily: 'monospace', color: '#4caf50', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51));

    els.push(this.add.rectangle(colR + colRW / 2, logTopY + 125, colRW - 20, 230, 0x0a1f0d, 0.6)
      .setStrokeStyle(1, 0x2e7d32, 0.4).setDepth(51));

    const visible = this.gameLogEntries.slice(-12);
    const logText = visible.map(e => e.text).join('\n');
    els.push(this.add.text(synX, logTopY + 20, logText || '(no entries yet)', {
      fontSize: '9px', fontFamily: 'monospace', color: '#b0bec5',
      wordWrap: { width: colRW - 40 }, lineSpacing: 2,
    }).setDepth(52));
  }

  // ── Buttons ───────────────────────────────────────────

  _createButtons() {
    this.playBtn = this._makeButton(500, 680, 'PLAY', 0x2e7d32, () => this._onPlay());
    this.discardBtn = this._makeButton(640, 680, 'DISCARD', 0xf57f17, () => this._onDiscard());

    // Hand reference "?" button
    const helpBg = this.add.rectangle(1240, 680, 40, 40, 0x333333)
      .setStrokeStyle(1, 0x555555)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);
    const helpTxt = this.add.text(1240, 680, '?', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(4);
    helpBg.on('pointerover', () => helpBg.setStrokeStyle(1, 0xffd600));
    helpBg.on('pointerout', () => helpBg.setStrokeStyle(1, 0x555555));
    helpBg.on('pointerdown', () => this._toggleHandReference());

    this.handRefVisible = false;
    this.handRefElements = [];
  }

  _makeButton(x, y, label, color, callback) {
    const bg = this.add.rectangle(x, y, 130, 40, color, 0.9)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);
    const txt = this.add.text(x, y, label, {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(4);

    bg.on('pointerover', () => { if (bg.input.enabled) bg.setAlpha(1); });
    bg.on('pointerout', () => { if (bg.input.enabled) bg.setAlpha(0.9); });
    bg.on('pointerdown', () => {
      if (!this.inputLocked) callback();
    });

    return { bg, txt };
  }

  _setButtonsEnabled(play, discard) {
    this.playBtn.bg.setAlpha(play ? 0.9 : 0.3);
    if (play) this.playBtn.bg.setInteractive({ useHandCursor: true });
    else this.playBtn.bg.disableInteractive();

    this.discardBtn.bg.setAlpha(discard ? 0.9 : 0.3);
    if (discard) this.discardBtn.bg.setInteractive({ useHandCursor: true });
    else this.discardBtn.bg.disableInteractive();
  }

  // ── Sort Buttons ───────────────────────────────────────

  _createSortButtons() {
    const sortY = 680;
    const modes = [
      { label: 'DEF', mode: 'default' },
      { label: 'RNK', mode: 'rank' },
      { label: 'SUT', mode: 'suit' },
    ];

    this.sortBtns = [];
    const startX = 770;

    modes.forEach((m, i) => {
      const x = startX + i * 60;
      const bg = this.add.rectangle(x, sortY, 52, 28, 0x333333, 0.7)
        .setStrokeStyle(1, 0x555555)
        .setInteractive({ useHandCursor: true })
        .setDepth(3);
      const txt = this.add.text(x, sortY, m.label, {
        fontSize: '11px', fontFamily: 'monospace', color: '#888888', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(4);

      bg.on('pointerdown', () => {
        if (this.inputLocked) return;
        this.sortMode = m.mode;
        this._updateSortHighlight();
        this._resortHand();
      });
      bg.on('pointerover', () => bg.setAlpha(1));
      bg.on('pointerout', () => bg.setAlpha(0.7));

      this.sortBtns.push({ bg, txt, mode: m.mode });
    });

    this._updateSortHighlight();
  }

  _updateSortHighlight() {
    this.sortBtns.forEach(btn => {
      if (btn.mode === this.sortMode) {
        btn.bg.setStrokeStyle(1, 0xffd600);
        btn.txt.setColor('#ffd600');
      } else {
        btn.bg.setStrokeStyle(1, 0x555555);
        btn.txt.setColor('#888888');
      }
    });
  }

  _setSortButtonsVisible(visible) {
    this.sortBtns.forEach(btn => {
      btn.bg.setVisible(visible);
      btn.txt.setVisible(visible);
    });
  }

  /** Get display order indices based on current sort mode */
  _getSortedIndices() {
    const hand = this.cardEngine.hand;
    const indices = hand.map((_, i) => i);

    if (this.sortMode === 'rank') {
      indices.sort((a, b) => hand[a].rank - hand[b].rank);
    } else if (this.sortMode === 'suit') {
      const suitOrder = { H: 0, D: 1, C: 2, S: 3 };
      indices.sort((a, b) => {
        const sd = suitOrder[hand[a].suit] - suitOrder[hand[b].suit];
        return sd !== 0 ? sd : hand[a].rank - hand[b].rank;
      });
    }
    // 'default' keeps original deal order

    return indices;
  }

  /** Re-sort cards in place with animation */
  _resortHand() {
    if (this.cardSprites.length === 0) return;

    const sortedIndices = this._getSortedIndices();
    const hand = this.cardEngine.hand;

    // Calculate new x positions for each card based on sorted order
    const newPositions = {};
    sortedIndices.forEach((handIdx, displayPos) => {
      newPositions[handIdx] = HAND_START_X + displayPos * CARD_SPACING;
    });

    // Map old selected indices to the actual card references
    const selectedCards = new Set();
    this.selectedIndices.forEach(displayIdx => {
      // displayIdx is the current visual position — find which hand index it maps to
      if (this._displayToHand && this._displayToHand[displayIdx] !== undefined) {
        selectedCards.add(this._displayToHand[displayIdx]);
      } else {
        selectedCards.add(displayIdx);
      }
    });

    // Rebuild the display mapping
    this._displayToHand = {};
    sortedIndices.forEach((handIdx, displayPos) => {
      this._displayToHand[displayPos] = handIdx;
    });

    // Rebuild selectedIndices based on new display positions
    this.selectedIndices.clear();
    sortedIndices.forEach((handIdx, displayPos) => {
      if (selectedCards.has(handIdx)) {
        this.selectedIndices.add(displayPos);
      }
    });

    // Re-render with new order (quick rebuild)
    this._clearCardsKeepSelection();
    const savedSelection = new Set(this.selectedIndices);

    this.cardSprites = [];
    sortedIndices.forEach((handIdx, displayPos) => {
      const card = hand[handIdx];
      const x = HAND_START_X + displayPos * CARD_SPACING;
      this._createCardSpriteImmediate(card, x, HAND_Y, displayPos);
    });

    // Restore selections
    savedSelection.forEach(idx => {
      const cs = this.cardSprites[idx];
      if (cs) {
        cs.glow.setAlpha(0.7);
        const lift = 20;
        cs.bg.y = cs.y - lift;
        cs.rankText.y = cs.rankY - lift;
        cs.suitText.y = cs.suitY - lift;
        cs.glow.y = cs.y - lift;
      }
    });
    this.selectedIndices = savedSelection;
  }

  _clearCardsKeepSelection() {
    this.cardSprites.forEach(cs => {
      cs.bg.destroy();
      cs.rankText.destroy();
      cs.suitText.destroy();
      if (cs.glow) cs.glow.destroy();
    });
    this.cardSprites = [];
  }

  // ── Card Rendering ────────────────────────────────────

  _clearCards() {
    this.cardSprites.forEach(cs => {
      cs.bg.destroy();
      cs.rankText.destroy();
      cs.suitText.destroy();
      if (cs.glow) cs.glow.destroy();
    });
    this.cardSprites = [];
    this.selectedIndices.clear();
    this._displayToHand = {};
  }

  _renderHand() {
    this._clearCards();

    const hand = this.cardEngine.hand;
    const sortedIndices = this._getSortedIndices();

    // Build display-to-hand mapping
    this._displayToHand = {};
    sortedIndices.forEach((handIdx, displayPos) => {
      this._displayToHand[displayPos] = handIdx;
    });

    sortedIndices.forEach((handIdx, displayPos) => {
      const card = hand[handIdx];
      const x = HAND_START_X + displayPos * CARD_SPACING;
      this._createCardSprite(card, x, HAND_Y, displayPos);
    });
  }

  _cardTextureKey(card) {
    return `card_${CARD_ASSET_SUITS[card.suit]}${CARD_ASSET_RANKS[card.rank]}`;
  }

  _createCardSprite(card, x, y, index) {
    const key = this._cardTextureKey(card);
    const scaleX = CARD_W / 32;
    const scaleY = CARD_H / 42;

    const glow = this.add.rectangle(x, y, CARD_W + 8, CARD_H + 8, 0xffd600, 0)
      .setDepth(4);

    const bg = this.add.image(x, y, key)
      .setScale(scaleX, scaleY)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);

    // Invisible position trackers — keep the same cardSprites interface
    const rankText = this.add.rectangle(x, y - 20, 1, 1, 0x000000, 0).setDepth(6);
    const suitText = this.add.rectangle(x, y + 25, 1, 1, 0x000000, 0).setDepth(6);

    bg.on('pointerdown', () => {
      if (this.inputLocked) return;
      this._toggleSelect(index);
    });

    const allParts = [bg, rankText, suitText, glow];
    allParts.forEach(p => {
      p.setAlpha(0);
      p.y += 30;
    });
    this.tweens.add({
      targets: allParts,
      alpha: { value: 1, duration: 200 },
      y: `-=30`,
      duration: 250,
      delay: index * 80,
      ease: 'Back.easeOut',
    });
    this.time.delayedCall(index * 80 + 260, () => { glow.setAlpha(0); });

    const rankY = y - 20;
    const suitY = y + 25;
    this.cardSprites.push({ bg, rankText, suitText, glow, x, y, rankY, suitY });
  }

  /** Create card sprite without deal-in animation (used for re-sorting) */
  _createCardSpriteImmediate(card, x, y, index) {
    const key = this._cardTextureKey(card);
    const scaleX = CARD_W / 32;
    const scaleY = CARD_H / 42;

    const glow = this.add.rectangle(x, y, CARD_W + 8, CARD_H + 8, 0xffd600, 0).setDepth(4);
    const bg = this.add.image(x, y, key)
      .setScale(scaleX, scaleY)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);
    const rankText = this.add.rectangle(x, y - 20, 1, 1, 0x000000, 0).setDepth(6);
    const suitText = this.add.rectangle(x, y + 25, 1, 1, 0x000000, 0).setDepth(6);

    bg.on('pointerdown', () => {
      if (this.inputLocked) return;
      this._toggleSelect(index);
    });

    const rankY = y - 20;
    const suitY = y + 25;
    this.cardSprites.push({ bg, rankText, suitText, glow, x, y, rankY, suitY });
  }

  _toggleSelect(index) {
    const cs = this.cardSprites[index];
    const lift = 20;

    if (this.selectedIndices.has(index)) {
      this.selectedIndices.delete(index);
      SoundManager.cardDeselect();
      cs.glow.setAlpha(0);
      const targets = [cs.bg, cs.rankText, cs.suitText, cs.glow];
      this.tweens.add({ targets, y: '-=0', duration: 1 }); // kill existing tweens
      this.tweens.add({ targets: cs.bg,       y: cs.y,      duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.rankText,  y: cs.rankY,  duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.suitText,  y: cs.suitY,  duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.glow,      y: cs.y,      duration: 150, ease: 'Back.easeOut' });
    } else {
      if (this.selectedIndices.size >= (this.maxCardSelection || 5)) return;
      this.selectedIndices.add(index);
      SoundManager.cardSelect();
      cs.glow.setAlpha(0.7);
      // Bounce up with slight scale pop
      this.tweens.add({ targets: cs.bg,       y: cs.y - lift,      duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.rankText,  y: cs.rankY - lift,  duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.suitText,  y: cs.suitY - lift,  duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.glow,      y: cs.y - lift,      duration: 150, ease: 'Back.easeOut' });
      // Quick scale pop on the card
      const popTargets = [cs.rankText, cs.suitText, cs.glow];
      this.tweens.add({
        targets: popTargets, scaleX: 1.08, scaleY: 1.08,
        duration: 80, yoyo: true, ease: 'Quad.easeOut',
      });
      this.tweens.add({
        targets: cs.bg, scaleX: cs.bg.scaleX * 1.08, scaleY: cs.bg.scaleY * 1.08,
        duration: 80, yoyo: true, ease: 'Quad.easeOut',
      });
    }

    this._updateHandPreview();
  }

  /** Live hand preview - shows what poker hand the selected cards form */
  _updateHandPreview() {
    if (this.selectedIndices.size === 0) {
      this.handPreviewText.setAlpha(0);
      this.scorePreviewText.setAlpha(0);
      return;
    }

    // Map display indices to actual hand cards
    const cards = [...this.selectedIndices]
      .map(di => this._displayToHand[di] !== undefined ? this._displayToHand[di] : di)
      .map(hi => this.cardEngine.hand[hi])
      .filter(Boolean);

    if (cards.length === 0) {
      this.handPreviewText.setAlpha(0);
      this.scorePreviewText.setAlpha(0);
      return;
    }

    // Preview with snapshot so we don't increment the real counter
    const previewState = { baseballState: { pairsPlayedThisInning: this.baseball.pairsPlayedThisInning } };
    const result = CardEngine.evaluateHand(cards, null, null, previewState);
    const handName = result.handName;
    const n = cards.length;

    let preview = '';
    let color = '#ffd600';
    // Definite outs vs risky hands (Groundout/Flyout from low pair still has a chance)
    const isDefiniteOut = handName === 'High Card' || handName === 'Strikeout';
    const isRiskyOut = handName === 'Groundout' || handName === 'Flyout';

    if (handName === 'High Card' || handName === 'Strikeout') {
      if (n < 5) {
        // Check if they're building toward something
        const hint = this._getHandHint(cards);
        preview = hint || 'High Card (Strikeout)';
        color = hint ? '#ffe082' : '#ff8a80';
      } else {
        preview = 'High Card (Strikeout)';
        color = '#ff8a80';
      }
    } else if (handName === 'Groundout' || handName === 'Flyout') {
      // Preview got a random groundout/flyout roll — show the real hand with risk warning
      const realHand = result.originalHand || handName;
      preview = `${realHand} (risky — could be ${handName})`;
      color = '#ffe082';
      // Add pitcher adjusts warning if applicable
      if (realHand === 'Pair' && this.baseball.pairsPlayedThisInning > 0) {
        const count = this.baseball.pairsPlayedThisInning;
        if (count >= 2) {
          preview = `${realHand} (Pitcher has your number!)`;
          color = '#ff5252';
        } else {
          preview += ' — Pitcher adjusting...';
          color = '#ff8a65';
        }
      }
    } else {
      const desc = result.playedDescription || handName;
      preview = `${desc} \u2192 ${result.outcome}`;
      // Color by hand strength
      const strength = ['Royal Flush','Straight Flush','Four of a Kind','Full House','Flush','Straight','Three of a Kind','Two Pair','Pair'];
      const idx = strength.indexOf(handName);
      if (idx <= 2) color = '#ff6e40';     // orange-red for big hands
      else if (idx <= 5) color = '#ffd600'; // gold
      else color = '#81c784';               // green for small hands
    }

    // Pitcher adjusts warning for pairs
    if (handName === 'Pair' && this.baseball.pairsPlayedThisInning > 0) {
      const count = this.baseball.pairsPlayedThisInning;
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

    this.handPreviewText.setText(preview);
    this.handPreviewText.setColor(color);
    this.handPreviewText.setAlpha(1);

    // Live peanuts x mult display
    let scorePreview = '';
    if (isDefiniteOut) {
      scorePreview = 'OUT';
      this.scorePreviewText.setColor('#ff5252');
    } else if (isRiskyOut || result.peanuts > 0) {
      // For risky outs (low pair Groundout/Flyout), look up the original hand's peanuts/mult
      let basePeanuts = result.peanuts;
      let baseMult = result.mult;
      if (isRiskyOut && result.originalHand) {
        const entry = HAND_TABLE.find(h => h.handName === result.originalHand);
        if (entry) { basePeanuts = entry.peanuts; baseMult = entry.mult; }
      }
      const batter = this.rosterManager.getCurrentBatter();
      const powerBonus = Math.max(0, batter.power - 5);
      const contactBonus = batter.contact / 10;
      const totalPeanuts = basePeanuts + powerBonus;
      const totalMult = Math.round((baseMult + contactBonus) * 10) / 10;
      const total = Math.round(totalPeanuts * totalMult);

      const peanutsStr = Number.isInteger(totalPeanuts) ? totalPeanuts : totalPeanuts.toFixed(1);
      const multStr = Number.isInteger(totalMult) ? totalMult : totalMult.toFixed(1);
      scorePreview = `${peanutsStr} peanuts x ${multStr} mult = ${total}`;
      if (isRiskyOut) scorePreview += ' (if hit)';

      const tags = [];
      if (powerBonus > 0) tags.push(`+${powerBonus} PWR`);
      if (contactBonus > 0) tags.push(`+${contactBonus.toFixed(1)} CNT`);
      if (tags.length > 0) scorePreview += `  ${tags.join(' ')}`;

      this.scorePreviewText.setColor('#aaaaaa');
    }
    this.scorePreviewText.setText(scorePreview);
    this.scorePreviewText.setAlpha(scorePreview ? 1 : 0);
  }

  /** Hint at what the player might be building toward */
  _getHandHint(cards) {
    const ranks = cards.map(c => c.rank);
    const suits = cards.map(c => c.suit);

    // Check for pair building
    const freq = {};
    for (const r of ranks) freq[r] = (freq[r] || 0) + 1;
    const hasPair = Object.values(freq).some(v => v >= 2);
    if (hasPair) return null; // already a pair, evaluateHand handles it

    // Check flush potential
    const suitCounts = {};
    for (const s of suits) suitCounts[s] = (suitCounts[s] || 0) + 1;
    const maxSuit = Math.max(...Object.values(suitCounts));
    if (maxSuit >= 3 && cards.length < 5) return `${maxSuit}/5 to a Flush...`;

    // Check straight potential
    const sorted = [...new Set(ranks)].sort((a, b) => a - b);
    if (sorted.length >= 3) {
      let maxRun = 1, run = 1;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i-1] + 1) { run++; maxRun = Math.max(maxRun, run); }
        else run = 1;
      }
      if (maxRun >= 3 && cards.length < 5) return `${maxRun}/5 to a Straight...`;
    }

    return null;
  }

  /** Show a score popup that floats up and fades */
  _showScorePopup(text, color, x, y) {
    const popup = this.add.text(x, y, text, {
      fontSize: '40px', fontFamily: 'monospace', color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(15).setAlpha(0);

    this.tweens.add({
      targets: popup,
      alpha: { from: 0, to: 1 },
      y: y - 60,
      scale: { from: 1.5, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: popup,
      alpha: 0,
      y: y - 100,
      duration: 500,
      delay: 800,
      onComplete: () => popup.destroy(),
    });
  }

  /** Toggle hand reference overlay */
  _toggleHandReference() {
    if (this.handRefVisible) {
      this.handRefElements.forEach(el => el.destroy());
      this.handRefElements = [];
      this.handRefVisible = false;
      return;
    }

    this.handRefVisible = true;
    const els = this.handRefElements;

    // Overlay background
    const overlay = this.add.rectangle(640, 360, 460, 440, 0x0a1f0d, 0.95)
      .setStrokeStyle(2, 0x4caf50).setDepth(20)
      .setInteractive(); // block clicks through
    els.push(overlay);

    const title = this.add.text(640, 165, 'HAND RANKINGS', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);
    els.push(title);

    const subtitle = this.add.text(640, 190, 'Poker Hand \u2192 Baseball Outcome', {
      fontSize: '11px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5).setDepth(21);
    els.push(subtitle);

    HAND_TABLE.forEach((h, i) => {
      const y = 215 + i * 32;
      const handColor = i <= 2 ? '#ff6e40' : i <= 5 ? '#ffd600' : i <= 8 ? '#81c784' : '#ff8a80';

      const name = this.add.text(440, y, h.handName, {
        fontSize: '14px', fontFamily: 'monospace', color: handColor, fontStyle: 'bold',
      }).setDepth(21);
      els.push(name);

      const arrow = this.add.text(610, y, '\u2192', {
        fontSize: '14px', fontFamily: 'monospace', color: '#555555',
      }).setDepth(21);
      els.push(arrow);

      const outcome = this.add.text(635, y, h.outcome, {
        fontSize: '14px', fontFamily: 'monospace', color: '#bbbbbb',
      }).setDepth(21);
      els.push(outcome);

      const stats = this.add.text(810, y, `${h.peanuts}c x${h.mult}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#666666',
      }).setDepth(21);
      els.push(stats);
    });

    // Note about straights/flushes
    const note = this.add.text(640, 540, 'Straights & Flushes need exactly 5 cards', {
      fontSize: '11px', fontFamily: 'monospace', color: '#666666',
    }).setOrigin(0.5).setDepth(21);
    els.push(note);

    // Close instruction
    const close = this.add.text(640, 560, '[ click ? to close ]', {
      fontSize: '11px', fontFamily: 'monospace', color: '#444444',
    }).setOrigin(0.5).setDepth(21);
    els.push(close);

    // Animate in
    els.forEach(el => {
      el.setAlpha(0);
      this.tweens.add({ targets: el, alpha: el === overlay ? 0.95 : 1, duration: 200 });
    });
  }

  // ── Game Flow ─────────────────────────────────────────

  _startAtBat() {
    this.resultText.setText('');
    this.handNameText.setText('');
    this.selectedIndices.clear();
    this.handPreviewText.setText('').setAlpha(0);
    this.scorePreviewText.setText('').setAlpha(0);
    // Show diamond sprites for at-bat
    if (this.batterSprite) this.batterSprite.setVisible(true);
    if (this.pitcherMoundSprite) this.pitcherMoundSprite.setVisible(true);
    // Clean up any leftover cascade texts
    if (this.cascadeTexts) {
      this.cascadeTexts.forEach(t => t.destroy());
      this.cascadeTexts = [];
    }
    this._setSortButtonsVisible(true);
    this.discardInfo.setAlpha(1);
    this.cardEngine.newAtBat();

    // Max card selection (base 5, can be boosted by traits)
    const batter = this.rosterManager.getCurrentBatter();
    this.maxCardSelection = 5 + batter.traits
      .filter(t => t.effect && t.effect.type === 'add_hand_size')
      .reduce((sum, t) => sum + (t.effect.value || 1), 0);

    // ── Staff effects at at-bat start ──
    const staff = this.baseball.getStaff();

    // Free takes: discards that don't add to count (Batting Gloves, Fresh Cleats, Bench Coach)
    const staffFreeTakes = staff
      .filter(s => s.effect.type === 'team_add_discard')
      .reduce((sum, s) => sum + s.effect.value, 0);
    const traitFreeTakes = batter.traits
      .filter(t => t.effect && t.effect.type === 'add_discard')
      .reduce((sum, t) => sum + (t.effect.value || 1), 0);
    this.freeTakesRemaining = staffFreeTakes + traitFreeTakes;

    // Pinch Crab / Card Shark Parrot: draw extra cards
    const extraDraw = staff
      .filter(s => s.effect.type === 'add_hand_draw')
      .reduce((sum, s) => sum + s.effect.value, 0);
    if (extraDraw > 0) {
      this.cardEngine.draw(extraDraw);
    }

    this.discardCount = 0;

    // Reset count for new at-bat
    this.countManager.reset();
    // Walk Machine trait: start at 1-0 count
    if (batter.traits.some(t => t.id === 'walk_machine')) {
      this.countManager.setStartingBalls(1);
    }

    this.dealOrder = this.cardEngine.hand.map((_, i) => i);
    this.sortMode = 'default';
    this._updateSortHighlight();
    this._renderHand();
    this._updateScoreboard();
    this._updateInfoText();
    this._setButtonsEnabled(true, this._canDiscard());
    this.inputLocked = false;

    // HBP check at start of at-bat
    const pitcher = this.rosterManager.getCurrentPitcher();
    const hbp = SituationalEngine.checkHBP(pitcher.control);
    if (hbp.triggered) {
      this.inputLocked = true;
      this._setButtonsEnabled(false, false);
      this.time.delayedCall(300, () => {
        this.resultText.setText('HIT BY PITCH!');
        this.resultText.setColor('#ffab40');
        this.resultText.setAlpha(1);
        this.resultText.setScale(1);
        this.tweens.add({
          targets: this.resultText,
          scale: { from: 1.3, to: 1 },
          duration: 300,
          ease: 'Back.easeOut',
        });
        this.handNameText.setText(hbp.description);
        this.handNameText.setColor('#ffab40');

        this.baseball.resolveOutcome('HBP', 0, batter);
        this._addGameLog(`${batter.name.split(' ').pop()}: HBP — free base`, '#ffab40');
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
    }
  }

  _onDiscard() {
    if (this.selectedIndices.size === 0) return;
    if (!this._canDiscard()) return;
    SoundManager.discard();

    this.inputLocked = true;
    this.handPreviewText.setAlpha(0);
    this.scorePreviewText.setAlpha(0);
    this.discardCount = (this.discardCount || 0) + 1;

    // Free takes bypass the count (Batting Gloves, Fresh Cleats, Bench Coach)
    if (this.freeTakesRemaining > 0) {
      this.freeTakesRemaining--;
      this.resultText.setText('FREE TAKE!');
      this.resultText.setColor('#81d4fa');
      this.resultText.setAlpha(1);
      this.resultText.setScale(1);
      this.tweens.add({ targets: this.resultText, alpha: 0, duration: 400, delay: 600 });
      this._updateScoreboard();
      this._doCardDiscard();
      return;
    }

    // Record pitch in count manager
    const pitcher = this.rosterManager.getCurrentPitcher();
    const batter = this.rosterManager.getCurrentBatter();
    const pitchResult = this.countManager.recordDiscard(pitcher.velocity, pitcher.control, batter.contact);

    // Build callout text from count result
    let calloutText = '';
    let calloutColor = '#ff5252';
    if (pitchResult.isBall) {
      calloutText = `BALL ${this.countManager.getCount().balls}!`;
      calloutColor = '#66bb6a';
    } else if (pitchResult.isFoul) {
      calloutText = 'FOUL!';
      calloutColor = '#ffab40';
    } else if (pitchResult.isStrikeout) {
      calloutText = 'STRIKE 3!';
      calloutColor = '#ff5252';
    } else if (pitchResult.isStrike) {
      calloutText = `STRIKE ${this.countManager.getCount().strikes}!`;
      calloutColor = '#ff5252';
    }

    this.resultText.setText(calloutText);
    this.resultText.setColor(calloutColor);
    this.resultText.setAlpha(1);
    this.resultText.setScale(1);
    this.tweens.add({ targets: this.resultText, alpha: 0, duration: 400, delay: 600 });

    this._updateScoreboard();

    // Wild pitch check: runners advance if triggered
    const gameStatus = this.baseball.getStatus();
    const wildPitch = SituationalEngine.checkWildPitch(pitcher.control, gameStatus.bases);
    if (wildPitch.triggered) {
      this.baseball.advanceAllRunners();
      this._updateScoreboard();
      this._addGameLog('Wild pitch — runner advances!', '#ffab40');
      this.time.delayedCall(700, () => {
        this.handNameText.setText(wildPitch.description);
        this.handNameText.setColor('#ffab40');
        this.tweens.add({ targets: this.handNameText, alpha: { from: 0, to: 1 }, duration: 200 });
        this.tweens.add({ targets: this.handNameText, alpha: 0, duration: 300, delay: 800 });
      });
    }

    // Walk from balls — resolve immediately, skip card play
    if (pitchResult.isWalk) {
      this.time.delayedCall(800, () => {
        this.resultText.setText('WALK!');
        this.resultText.setColor('#66bb6a');
        this.resultText.setAlpha(1);
        this.resultText.setScale(1);
        this.tweens.add({ targets: this.resultText, scale: { from: 1.3, to: 1 }, duration: 300, ease: 'Back.easeOut' });

        const walkBatter = this.rosterManager.getCurrentBatter();
        this.baseball.resolveOutcome('Walk', 0, walkBatter);
        const walkCount = this.countManager.getCount();
        this._addGameLog(`${walkBatter.name.split(' ').pop()}: Walk (${walkCount.balls}-${walkCount.strikes})`, '#66bb6a');
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

    // Strikeout from count — 3 strikes, at-bat over
    if (pitchResult.isStrikeout) {
      this.time.delayedCall(800, () => {
        this.resultText.setText('STRUCK OUT!');
        this.resultText.setColor('#ff5252');
        this.resultText.setAlpha(1);
        this.resultText.setScale(1);
        this.tweens.add({ targets: this.resultText, scale: { from: 1.3, to: 1 }, duration: 300, ease: 'Back.easeOut' });

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

    // Foul pop-up: 8% chance a foul ball is caught for an out
    if (pitchResult.isFoul && Math.random() < 0.08) {
      this.time.delayedCall(800, () => {
        this.resultText.setText('FOUL POP-UP CAUGHT!');
        this.resultText.setColor('#ff8a80');
        this.resultText.setAlpha(1);
        this.resultText.setScale(1);
        this.tweens.add({ targets: this.resultText, scale: { from: 1.3, to: 1 }, duration: 300, ease: 'Back.easeOut' });

        const foulBatter = this.rosterManager.getCurrentBatter();
        this.baseball.resolveOutcome('Flyout', 0, foulBatter);
        this._addGameLog(`${foulBatter.name.split(' ').pop()}: Foul pop-up — out!`, '#ff8a80');
        this._updateScoreboard();
        this._clearCards();

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

    // Normal discard — replace cards
    this._doCardDiscard();
  }

  /** Animate discarded cards flying away, replace them, and re-render hand */
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

      // Trash Panda: chance to draw an extra card on discard
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

  _onPlay() {
    if (this.selectedIndices.size === 0) return;
    SoundManager.playHand();

    this.inputLocked = true;
    this._setButtonsEnabled(false, false);

    // Map display indices → actual hand indices
    const selectedArr = [...this.selectedIndices]
      .map(di => this._displayToHand[di] !== undefined ? this._displayToHand[di] : di)
      .sort((a, b) => a - b);
    const batter = this.rosterManager.getCurrentBatter();
    const pitcher = this.rosterManager.getCurrentPitcher();
    const gameState = this.baseball.getStatus();
    gameState.baseballState = this.baseball;

    // Sac Bunt: 1 card played + runners on base + < 2 outs
    if (selectedArr.length === 1 && gameState.bases.some(b => b) && gameState.outs < 2) {
      this._resolveSacBunt(batter);
      return;
    }

    // Build modifiers: batter traits + pitcher traits
    const batterPreMod = TraitManager.buildPreModifier(batter.traits);
    const batterPostMod = TraitManager.buildPostModifier(batter.traits);
    const pitcherPreMod = TraitManager.buildPitcherPreModifier(pitcher.traits);
    const pitcherPostMod = TraitManager.buildPitcherPostModifier(pitcher.traits);

    // ── Detect pitcher pre-modifier effects for play-by-play ──
    const originalCards = selectedArr.map(i => this.cardEngine.hand[i]).filter(Boolean);
    let pitcherPreMessage = '';
    if (pitcherPreMod) {
      const modifiedCards = pitcherPreMod([...originalCards.map(c => ({ ...c }))]);
      const changes = [];
      for (let i = 0; i < originalCards.length; i++) {
        if (modifiedCards[i] && modifiedCards[i].rank !== originalCards[i].rank) {
          const oldR = RANK_NAMES[originalCards[i].rank] || originalCards[i].rank;
          const newR = RANK_NAMES[modifiedCards[i].rank] || modifiedCards[i].rank;
          changes.push(`${oldR}\u2192${newR}`);
        }
      }
      if (changes.length > 0) {
        const traitNames = pitcher.traits
          .filter(t => t.phase === 'pitcher_pre')
          .map(t => t.name).join('/');
        pitcherPreMessage = `${traitNames}! (${changes.join(', ')})`;
      }
    }

    // Chain pre-modifiers: pitcher pre runs first, then batter pre
    const combinedPreMod = (batterPreMod || pitcherPreMod) ? (cards) => {
      let c = cards;
      if (pitcherPreMod) c = pitcherPreMod(c);
      if (batterPreMod) c = batterPreMod(c);
      return c;
    } : null;

    // Detect pitcher post-modifier effects (we'll track after eval)
    let pitcherPostMessage = '';
    let pitcherPostPenalty = { peanuts: 0, mult: 0 };

    // Track batter post-modifier effects
    let batterPostMessage = '';

    // Wrap post-mods to detect changes from both pitcher and batter
    const trackingPostMod = (batterPostMod || pitcherPostMod) ? (result, gs) => {
      let r = result;
      if (pitcherPostMod) {
        const before = { ...r };
        r = pitcherPostMod(r, gs);
        const effects = [];
        if (r.outcome !== before.outcome) effects.push(`${before.outcome}\u2192${r.outcome}`);
        if (r.mult < before.mult) {
          pitcherPostPenalty.mult = before.mult - r.mult;
          effects.push(`-${(before.mult - r.mult).toFixed(1)} mult`);
        }
        if (r.peanuts < before.peanuts) {
          pitcherPostPenalty.peanuts = before.peanuts - r.peanuts;
          effects.push(`-${before.peanuts - r.peanuts} peanuts`);
        }
        if (r.mult > before.mult) effects.push(`+${(r.mult - before.mult).toFixed(1)} mult`);
        if (effects.length > 0) {
          const traitNames = pitcher.traits
            .filter(t => t.phase === 'pitcher_post')
            .map(t => t.name).join('/');
          pitcherPostMessage = `${traitNames}: ${effects.join(', ')}`;
        }
      }
      if (batterPostMod) {
        const before = { ...r };
        r = batterPostMod(r, gs);
        // Detect batter trait changes
        const effects = [];
        if (r.outcome !== before.outcome) effects.push(`${before.outcome}\u2192${r.outcome}`);
        if (r.mult > before.mult) effects.push(`+${(r.mult - before.mult).toFixed(1)} mult`);
        if (r.peanuts > before.peanuts) effects.push(`+${r.peanuts - before.peanuts} peanuts`);
        if (r.mult < before.mult) effects.push(`${(r.mult - before.mult).toFixed(1)} mult`);
        if (effects.length > 0) {
          const traitNames = batter.traits
            .filter(t => t.phase === 'batter_post')
            .map(t => t.name).join('/');
          batterPostMessage = `${traitNames}: ${effects.join(', ')}`;
        }
      }
      return r;
    } : null;

    // Stolen base
    const hasStolenBase = batter.traits.some(t => t.id === 'stolen_base');
    if (hasStolenBase && gameState.bases[0]) {
      this.baseball.processStolenBase();
      this._updateScoreboard();
    }

    // Full count (3-2): runners auto-advance 1 base
    const count = this.countManager.getCount();
    if (count.balls === 3 && count.strikes === 2) {
      const status = this.baseball.getStatus();
      if (status.bases.some(b => b)) {
        this.baseball.advanceAllRunners();
      }
    }

    // Black Sheep: ignore pair penalty (reset pairs counter before eval)
    const blackSheep = this.baseball.getStaffByEffect('ignore_pair_penalty').length > 0;
    const savedPairsPlayed = this.baseball.pairsPlayedThisInning;
    if (blackSheep) this.baseball.pairsPlayedThisInning = 0;

    // Play selected cards with combined modifiers + strike count for two-strike penalty
    let handResult = this.cardEngine.playHand(selectedArr, combinedPreMod, trackingPostMod, gameState, count.strikes);

    // Restore pairs counter (it was incremented during eval, keep that increment unless Black Sheep)
    if (blackSheep) this.baseball.pairsPlayedThisInning = savedPairsPlayed;

    // Apply count modifiers to hand result
    const countMods = this.countManager.getCountModifiers();
    // First-pitch swing bonus: +0.5 mult if no discards used (played on 0-0 count)
    const firstPitchBonus = this.discardCount === 0 ? 0.5 : 0;
    const totalCountMult = countMods.multMod + firstPitchBonus;

    const isHitForCount = handResult.outcome !== 'Strikeout' && handResult.outcome !== 'Groundout' && handResult.outcome !== 'Flyout';
    if (isHitForCount && (countMods.peanutsMod !== 0 || totalCountMult !== 0)) {
      handResult.peanuts = Math.max(0, handResult.peanuts + countMods.peanutsMod);
      handResult.mult = Math.round(Math.max(1, handResult.mult + totalCountMult) * 10) / 10;
      handResult.score = Math.round(handResult.peanuts * handResult.mult);
    }

    // Apply team stat boosts from staff (Batting Coach etc.)
    const staff = this.baseball.getStaff();
    const statBoosts = {};
    for (const s of staff) {
      if (s.effect && s.effect.type === 'team_stat_boost') {
        statBoosts[s.effect.stat] = (statBoosts[s.effect.stat] || 0) + s.effect.value;
      }
    }
    // Hired Guns synergy: bonus players get +1 to all stats
    if (batter.isBonus && this.activeSynergies) {
      for (const syn of this.activeSynergies) {
        if (syn.bonus.type === 'bonus_player_stat_boost') {
          statBoosts.power = (statBoosts.power || 0) + syn.bonus.value;
          statBoosts.contact = (statBoosts.contact || 0) + syn.bonus.value;
          statBoosts.speed = (statBoosts.speed || 0) + syn.bonus.value;
        }
      }
    }
    // Temporarily boost batter stats
    const origStats = {};
    for (const [stat, val] of Object.entries(statBoosts)) {
      origStats[stat] = batter[stat];
      batter[stat] += val;
    }

    // Apply stat modifiers (now returns { result, bonuses })
    const batterMod = this.rosterManager.applyBatterModifiers(handResult, gameState);
    handResult = batterMod.result;
    const batterBonuses = batterMod.bonuses;

    // Revert temporary stat boosts
    for (const [stat, val] of Object.entries(origStats)) {
      batter[stat] = val;
    }

    // Re-apply batter trait post-modifiers after contact save so upgrades
    // like Slugger Serum (Pair Single→Double) can trigger on the rescued hit
    if (batterBonuses.contactSave && batterPostMod) {
      handResult = batterPostMod(handResult, gameState);
      handResult.score = Math.round(handResult.peanuts * handResult.mult);
    }

    handResult = this.rosterManager.applyPitcherModifiers(handResult, gameState);

    // ── Staff effects (mascots & coaches) ──
    const staffBonuses = this._applyStaffEffects(handResult, gameState);

    // ── Bonus player lineup effects ──
    const lineupBonuses = this._applyLineupEffects(handResult, gameState);

    // ── Synergy effects ──
    const synergyBonuses = this._applySynergyEffects(handResult, gameState);

    // Merge extra base bonuses for unified handling
    staffBonuses.extraBaseBonus += lineupBonuses.extraBaseBonus + synergyBonuses.extraBaseBonus;

    // Sacrifice fly (trait-based, e.g. on strikeouts)
    let sacrificeFlyRun = 0;
    if (handResult.sacrificeFly) {
      sacrificeFlyRun = this.baseball.processSacrificeFly();
    }

    // Situational outcomes: DP, Fielder's Choice, Error
    // Sly Fox: multiply error chance
    const situational = SituationalEngine.check(
      handResult.outcome,
      this.baseball.getStatus(),
      batter.speed,
      staffBonuses.errorMult,
    );
    let situationalMessage = '';
    if (situational.transformed) {
      handResult.outcome = situational.outcome;
      situationalMessage = situational.description;
    }

    // Automatic sacrifice fly: Flyout + runner on 3rd + < 2 outs
    const statusForSacFly = this.baseball.getStatus();
    if (handResult.outcome === 'Flyout' && statusForSacFly.bases[2] && statusForSacFly.outs < 2 && sacrificeFlyRun === 0) {
      sacrificeFlyRun = this.baseball.processSacrificeFly();
    }

    const isOut = ['Strikeout', 'Groundout', 'Flyout', 'Double Play', "Fielder's Choice"].includes(handResult.outcome);

    // ── Phase 0: Show pitcher pre-trait activation if any ──
    let pitcherDelay = 0;
    if (pitcherPreMessage) {
      this.handNameText.setText(`\u26be ${pitcherPreMessage}`);
      this.handNameText.setColor('#ff5252');
      this.handNameText.setAlpha(1);
      this.tweens.add({
        targets: this.handNameText,
        alpha: { from: 0, to: 1 },
        duration: 200,
      });
      pitcherDelay = 700;
    }

    // ── Phase 1: Announce the hand (T=pitcherDelay) ──
    this.time.delayedCall(pitcherDelay, () => {
      const announcement = handResult.playedDescription || handResult.handName;
      this.resultText.setText(announcement);
      this.resultText.setColor('#ffd600');
      this.resultText.setAlpha(1);
      this.resultText.setScale(1);

      // Show pitcher post-modifier effect below the hand name
      if (pitcherPostMessage) {
        this.handNameText.setText(`\u26be ${pitcherPostMessage}`);
        this.handNameText.setColor('#ff5252');
      } else {
        this.handNameText.setText('');
      }

      this.tweens.add({
        targets: this.resultText,
        scale: { from: 1.3, to: 1 },
        duration: 300,
        ease: 'Back.easeOut',
      });
    });

    // Hide hand preview + score preview
    this.handPreviewText.setAlpha(0);
    this.scorePreviewText.setAlpha(0);

    // Animate cards with juice based on outcome
    this.cardSprites.forEach((cs, i) => {
      const parts = [cs.bg, cs.rankText, cs.suitText, cs.glow];
      if (this.selectedIndices.has(i)) {
        if (isOut) {
          this.tweens.add({
            targets: parts, x: '+=4', duration: 40, yoyo: true, repeat: 3,
          });
          this.tweens.add({
            targets: parts,
            y: '+=80', alpha: 0, angle: Phaser.Math.Between(-15, 15),
            duration: 400, delay: 200, ease: 'Quad.easeIn',
          });
        } else {
          // Scoring glow pulse before fly-away
          cs.glow.setFillStyle(0xffffff);
          this.tweens.add({
            targets: cs.glow,
            alpha: { from: 1, to: 0.7 },
            duration: 200,
            onComplete: () => cs.glow.setFillStyle(0xffd600),
          });
          this.tweens.add({
            targets: parts,
            x: 640, y: 300, alpha: 0, scale: 0.3,
            duration: 350, delay: 200 + i * 50, ease: 'Quad.easeIn',
          });
        }
      } else {
        this.tweens.add({
          targets: parts,
          y: '+=40', alpha: 0,
          duration: 250, delay: 150, ease: 'Quad.easeIn',
        });
      }
    });

    // ── Phase 1.5: Batter trait callout (T=pitcherDelay+500) ──
    let batterTraitDelay = 0;
    if (batterPostMessage) {
      batterTraitDelay = 500;
      this.time.delayedCall(pitcherDelay + 500, () => {
        this.handNameText.setText(`\u26be ${batterPostMessage}`);
        this.handNameText.setColor('#69f0ae'); // Green for batter traits
        this.tweens.add({
          targets: this.handNameText,
          alpha: { from: 0, to: 1 },
          duration: 200,
        });
      });
    }

    // ── Phase 1.6: Staff effect callout (T=pitcherDelay+batterTraitDelay+500) ──
    let staffDelay = 0;
    if (staffBonuses.outcomeChanged && staffBonuses.messages.length > 0) {
      staffDelay = 500;
      this.time.delayedCall(pitcherDelay + batterTraitDelay + 500, () => {
        this.handNameText.setText(`\u2b50 ${staffBonuses.messages[0].text}`);
        this.handNameText.setColor(staffBonuses.messages[0].color);
        this.tweens.add({
          targets: this.handNameText,
          alpha: { from: 0, to: 1 },
          duration: 200,
        });
      });
    }

    // ── Phase 1.75: Situational callout (T=pitcherDelay+batterTraitDelay+staffDelay+500) ──
    let situationalDelay = 0;
    if (situationalMessage) {
      situationalDelay = 500;
      this.time.delayedCall(pitcherDelay + batterTraitDelay + staffDelay + 500, () => {
        this.handNameText.setText(`\u26be ${situationalMessage}`);
        this.handNameText.setColor(situational.type === 'error' ? '#ffab40' : '#ff5252');
        this.tweens.add({
          targets: this.handNameText,
          alpha: { from: 0, to: 1 },
          duration: 200,
        });
      });
    }

    // ── Phase 2: Resolve outcome (defer base display until Phase 2.5) ──
    const resolveStart = 900 + pitcherDelay + batterTraitDelay + staffDelay + situationalDelay;
    this._deferBaseUpdate = true;

    this.time.delayedCall(resolveStart, () => {
      // Track max peanut hand this inning for pack triggers
      if (handResult.score > this._maxPeanutsThisInning) {
        this._maxPeanutsThisInning = handResult.score;
      }
      const outcome = this.baseball.resolveOutcome(handResult.outcome, handResult.score, batter);

      let extraBase = { scored: 0, advanced: false };
      const totalExtraBase = (handResult.extraBaseChance || 0) + staffBonuses.extraBaseBonus;
      if (totalExtraBase > 0 && !isOut && handResult.outcome === 'Single') {
        extraBase = this.baseball.tryExtraBase(totalExtraBase);
      }

      this._clearCards();

      // Hide batter sprite — they're now a runner or out
      if (this.batterSprite) this.batterSprite.setVisible(false);

      let desc = outcome.description;
      if (sacrificeFlyRun > 0) desc += ` Sac fly scores a run!`;
      if (extraBase.advanced) {
        desc += extraBase.scored > 0 ? ' Speed! Extra run!' : ' Speed! Runner advances!';
      }

      // Game log entry
      const logBatter = batter.name.split(' ').pop().slice(0, 8);
      const logHand = this._shortHandName(handResult.handName || '');
      // For strikeouts, show a realistic count ending in strike 3
      let logCount;
      if (handResult.outcome === 'Strikeout') {
        const fakeBalls = [0, 0, 1, 1, 2, 2, 3][Math.floor(Math.random() * 7)];
        logCount = `${fakeBalls}-3`;
      } else {
        logCount = `${count.balls}-${count.strikes}`;
      }
      if (situational.transformed) {
        this._addGameLog(`${logBatter}: ${logHand}>${situational.outcome} ${logCount}`, situational.type === 'error' ? '#ffab40' : '#ff8a80');
      } else if (isOut && sacrificeFlyRun > 0) {
        this._addGameLog(`${logBatter}: ${logHand}>Sac Fly +${sacrificeFlyRun}R ${logCount}`, '#ffab40');
      } else if (isOut) {
        this._addGameLog(`${logBatter}: ${logHand}>${handResult.outcome} ${logCount}`, '#ff8a80');
      } else {
        const runNote = outcome.runsScored > 0 ? ` +${outcome.runsScored}R` : '';
        this._addGameLog(`${logBatter}: ${logHand}>${handResult.outcome}${runNote} ${logCount}`, '#69f0ae');
      }

      // Show outcome text
      this.resultText.setText(desc);
      this.resultText.setColor(isOut ? '#ff8a80' : '#69f0ae');
      this.tweens.add({
        targets: this.resultText,
        scale: { from: 0.5, to: 1 }, alpha: { from: 0, to: 1 },
        duration: 400, ease: 'Back.easeOut',
      });

      // Screen shake + sound on extra-base hits
      const xbh = ['Home Run', 'Triple', 'Double'];
      if (xbh.includes(handResult.outcome)) {
        const intensity = handResult.outcome === 'Home Run' ? 0.006 : 0.003;
        const duration = handResult.outcome === 'Home Run' ? 300 : 200;
        this.cameras.main.shake(duration, intensity);
        if (handResult.outcome === 'Home Run') SoundManager.homeRun();
        else SoundManager.extraBaseHit();
      } else if (isOut) {
        if (handResult.outcome === 'Strikeout') SoundManager.strikeout();
        else SoundManager.out();
      } else {
        SoundManager.hit();
      }

      // Update score text (without bases — those come in Phase 2.5)
      this._updateScoreboard();

      // ── Phase 2.5: Resolve runners (T+400ms after outcome) ──
      const RUNNER_DELAY = 400;
      this.time.delayedCall(RUNNER_DELAY, () => {
        this._deferBaseUpdate = false;
        this._updateBases(this.baseball.getStatus().bases);

        // Run scored chime after runners visually move
        const runsForSound = (outcome.runsScored || 0) + sacrificeFlyRun + extraBase.scored;
        if (runsForSound > 0) SoundManager.runScored();
      });

      // For outs, skip cascade — just show outcome and move on
      if (isOut) {
        this.handNameText.setText('');

        this.rosterManager.advanceBatter();
        this.time.delayedCall(RUNNER_DELAY + 200, () => this._updateBatterPanel());
        this.time.delayedCall(RUNNER_DELAY + 1200, () => {
          if (this.baseball.isGameOver()) { this._endGame(); return; }
          if (this.baseball.state === 'SWITCH_SIDE') { this._showMidInningTransition(); return; }
          this._startAtBat();
        });
        return;
      }

      // ── Phase 3: Scoring Cascade for hits (after runners) ──
      this.handNameText.setText('');
      const cascadeDelay = this._showScoringCascade(handResult, batterBonuses, pitcherPostPenalty, batterPostMessage, staffBonuses, lineupBonuses, synergyBonuses);
      const totalCascadeDelay = RUNNER_DELAY + cascadeDelay;

      // Score popup for runs (after cascade)
      const totalRuns = outcome.runsScored + sacrificeFlyRun + extraBase.scored;
      this.time.delayedCall(totalCascadeDelay, () => {
        if (totalRuns > 0) {
          const popupColor = totalRuns >= 4 ? '#ff6e40' : totalRuns >= 2 ? '#ffd600' : '#69f0ae';
          const popupText = totalRuns >= 4 ? `+${totalRuns} RUNS!!!` : `+${totalRuns} RUN${totalRuns > 1 ? 'S' : ''}!`;
          this._showScorePopup(popupText, popupColor, 640, 250);
        }

        // Chip earnings flash
        if (handResult.score > 0) {
          this._showChipEarnings(handResult.score);
        }
      });

      // Advance batter
      this.rosterManager.advanceBatter();
      this.time.delayedCall(totalCascadeDelay + 200, () => this._updateBatterPanel());

      this.time.delayedCall(totalCascadeDelay + 1200, () => {
        if (this.baseball.isGameOver()) { this._endGame(); return; }
        if (this.baseball.state === 'SWITCH_SIDE') { this._showMidInningTransition(); return; }
        this._startAtBat();
      });
    });
  }

  /** Show scoring cascade: base hand → power → contact → trait → pitcher → staff → lineup → synergy → final */
  _showScoringCascade(handResult, bonuses, pitcherPenalty, batterTraitMsg, staffBonuses = null, lineupBonuses = null, synergyBonuses = null) {
    const steps = [];
    const stepDelay = 350;
    let runningPeanuts = handResult.peanuts - bonuses.powerPeanuts + pitcherPenalty.peanuts;
    let runningMult = handResult.mult - bonuses.contactMult + pitcherPenalty.mult;

    // Ensure running values don't go below the base hand values
    const basePeanuts = runningPeanuts;
    const baseMult = Math.round(runningMult * 10) / 10;

    // Step 1: Base hand
    steps.push({
      text: `${handResult.handName} \u2192 ${basePeanuts} peanut${basePeanuts !== 1 ? 's' : ''} x ${baseMult.toFixed(1)}`,
      color: '#ffd600',
    });

    // Step 2: Power bonus (if any)
    if (bonuses.powerPeanuts > 0) {
      runningPeanuts += bonuses.powerPeanuts;
      const batter = this.rosterManager.getCurrentBatter();
      steps.push({
        text: `+${bonuses.powerPeanuts} peanuts (PWR ${batter.power})`,
        color: '#ff8a65',
      });
    }

    // Step 3: Contact bonus (if any)
    if (bonuses.contactMult > 0) {
      runningMult = Math.round((runningMult + bonuses.contactMult) * 10) / 10;
      const batter = this.rosterManager.getCurrentBatter();
      steps.push({
        text: `+${bonuses.contactMult.toFixed(1)}x (CNT ${batter.contact})`,
        color: '#64b5f6',
      });
    }

    // Step 4: Batter trait bonuses (if any)
    if (batterTraitMsg) {
      steps.push({
        text: batterTraitMsg,
        color: '#69f0ae',
      });
    }

    // Step 5: Pitcher penalty (if any)
    if (pitcherPenalty.peanuts > 0 || pitcherPenalty.mult > 0) {
      const parts = [];
      if (pitcherPenalty.mult > 0) {
        runningMult = Math.round((runningMult - pitcherPenalty.mult) * 10) / 10;
        parts.push(`-${pitcherPenalty.mult.toFixed(1)}x`);
      }
      if (pitcherPenalty.peanuts > 0) {
        runningPeanuts -= pitcherPenalty.peanuts;
        parts.push(`-${pitcherPenalty.peanuts} peanuts`);
      }
      steps.push({
        text: `${parts.join(' ')} (Pitcher)`,
        color: '#ff5252',
      });
    }

    // Step 6: Staff bonuses (mascots & coaches)
    if (staffBonuses && staffBonuses.messages.length > 0) {
      for (const msg of staffBonuses.messages) {
        steps.push({ text: msg.text, color: msg.color });
      }
    }

    // Step 6b: Lineup bonuses (bonus players)
    if (lineupBonuses && lineupBonuses.messages.length > 0) {
      for (const msg of lineupBonuses.messages) {
        steps.push({ text: msg.text, color: msg.color });
      }
    }

    // Step 6c: Synergy bonuses
    if (synergyBonuses && synergyBonuses.messages.length > 0) {
      for (const msg of synergyBonuses.messages) {
        steps.push({ text: msg.text, color: msg.color });
      }
    }

    // Step 7: Final score
    steps.push({
      text: `= ${handResult.score}`,
      color: '#ffffff',
      isFinal: true,
    });

    // Clean up old cascade texts
    this.cascadeTexts.forEach(t => t.destroy());
    this.cascadeTexts = [];

    // Animate each step — left of diamond, vertically centered
    const cascadeX = 390;
    const totalHeight = steps.length * 24;
    const cascadeStartY = this.baseDiamondCenter.y - totalHeight / 2;

    steps.forEach((step, i) => {
      this.time.delayedCall(i * stepDelay, () => {
        const y = cascadeStartY + i * 24;
        const fontSize = step.isFinal ? '18px' : '12px';
        const txt = this.add.text(cascadeX, y, step.text, {
          fontSize, fontFamily: 'monospace', color: step.color,
          fontStyle: step.isFinal ? 'bold' : 'normal',
        }).setOrigin(0.5, 0.5).setDepth(10).setAlpha(0);
        this.cascadeTexts.push(txt);

        // Fade in
        this.tweens.add({
          targets: txt,
          alpha: 1,
          duration: 200,
          ease: 'Quad.easeOut',
        });

        // Final score gets a scale pop
        if (step.isFinal) {
          this.tweens.add({
            targets: txt,
            scale: { from: 1.5, to: 1 },
            duration: 300,
            delay: 50,
            ease: 'Back.easeOut',
          });
        }
      });
    });

    // Return total cascade duration
    return steps.length * stepDelay + 350;
  }

  /** Flash peanut earnings below peanut balance */
  _showChipEarnings(amount) {
    const peanutBal = this.peanutBalanceText;
    const startY = peanutBal.y + 18;
    const popup = this.add.text(peanutBal.x, startY, `+${amount}`, {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(15).setAlpha(0);

    this.tweens.add({
      targets: popup,
      alpha: { from: 0, to: 1 },
      y: startY + 10,
      duration: 400,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: popup,
      alpha: 0,
      y: startY + 30,
      duration: 400,
      delay: 600,
      onComplete: () => popup.destroy(),
    });
  }

  /** Animate peanut counter rolling from current to target value */
  _animateChipCounter(target) {
    const current = this._displayedPeanuts ?? target;
    if (current === target) {
      this.peanutBalanceText.setText(`Peanuts: ${target}`);
      this._displayedPeanuts = target;
      return;
    }
    this._displayedPeanuts = target;
    const obj = { val: current };
    this.tweens.add({
      targets: obj,
      val: target,
      duration: 500,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.peanutBalanceText.setText(`Peanuts: ${Math.round(obj.val)}`);
      },
    });
  }

  _resolveSacBunt(batter) {
    // Discard all cards (at-bat is over)
    this.cardEngine.discardPile.push(...this.cardEngine.hand);
    this.cardEngine.hand = [];

    this.resultText.setText('SAC BUNT!');
    this.resultText.setColor('#ffab40');
    this.resultText.setAlpha(1);
    this.resultText.setScale(1);
    this.tweens.add({
      targets: this.resultText,
      scale: { from: 1.3, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });
    this.handNameText.setText('Runners advance, batter out');
    this.handNameText.setColor('#ffab40');

    // Animate cards out
    this.cardSprites.forEach((cs, i) => {
      const parts = [cs.bg, cs.rankText, cs.suitText, cs.glow];
      this.tweens.add({
        targets: parts,
        y: '+=80', alpha: 0,
        duration: 300, delay: i * 40, ease: 'Quad.easeIn',
      });
    });

    this.handPreviewText.setAlpha(0);
    this.scorePreviewText.setAlpha(0);

    this.time.delayedCall(900, () => {
      const outcome = this.baseball.resolveOutcome('Sac Bunt', 0, batter);
      this._clearCards();
      const sacRuns = outcome.runsScored > 0 ? ` +${outcome.runsScored}R` : '';
      this._addGameLog(`${batter.name.split(' ').pop()}: Sac Bunt — runners advance${sacRuns}`, '#ffab40');

      this.resultText.setText(outcome.description);
      this.resultText.setColor('#ffab40');
      this._updateScoreboard();

      this.rosterManager.advanceBatter();
      this.time.delayedCall(600, () => this._updateBatterPanel());
      this.time.delayedCall(1500, () => {
        if (this.baseball.isGameOver()) { this._endGame(); return; }
        if (this.baseball.state === 'SWITCH_SIDE') { this._showMidInningTransition(); return; }
        this._startAtBat();
      });
    });
  }

  // ── Staff Effect Processor ─────────────────────────────────
  // Data-driven: loops over active staff and applies effects by type.
  // Returns { peanutBonus, multBonus, outcomeChanged, messages[] }

  _applyStaffEffects(handResult, gameState) {
    const staff = this.baseball.getStaff();
    const bonuses = { peanutBonus: 0, multBonus: 0, outcomeChanged: false, messages: [], errorMult: 1, extraBaseBonus: 0 };
    if (staff.length === 0) return bonuses;

    for (const s of staff) {
      if (!s.effect) continue;
      const eff = s.effect;

      switch (eff.type) {
        // ── Mult bonuses (conditional) ──
        case 'add_mult': {
          let applies = true;
          if (eff.condition) {
            if (eff.condition.type === 'inning_range') {
              applies = gameState.inning >= eff.condition.min && gameState.inning <= eff.condition.max;
            } else if (eff.condition.type === 'bases_empty') {
              applies = !gameState.bases.some(b => b);
            }
          }
          if (applies) {
            bonuses.multBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value}x (${s.name})`, color: '#ffab40' });
          }
          break;
        }

        // ── Mult per run scored this inning ──
        case 'mult_per_inning_run': {
          const inningRuns = gameState.currentInningPlayerRuns || 0;
          if (inningRuns > 0) {
            const bonus = eff.value * inningRuns;
            bonuses.multBonus += bonus;
            bonuses.messages.push({ text: `+${bonus}x (${s.name}, ${inningRuns}R)`, color: '#ffab40' });
          }
          break;
        }

        // ── Chip bonuses ──
        case 'flat_peanuts_per_ab': {
          bonuses.peanutBonus += eff.value;
          bonuses.messages.push({ text: `+${eff.value} peanuts (${s.name})`, color: '#ffd600' });
          break;
        }
        case 'per_runner_peanuts': {
          const runners = gameState.bases.filter(b => b).length;
          if (runners > 0) {
            const bonus = eff.value * runners;
            bonuses.peanutBonus += bonus;
            bonuses.messages.push({ text: `+${bonus} peanuts (${s.name}, ${runners} on)`, color: '#ffd600' });
          }
          break;
        }

        // ── Double peanuts (conditional) ──
        case 'double_peanuts': {
          let applies = false;
          if (eff.condition && eff.condition.type === 'outcome_is') {
            applies = handResult.outcome === eff.condition.value;
          }
          if (applies) {
            bonuses.peanutBonus += handResult.peanuts;
            bonuses.messages.push({ text: `x2 peanuts! (${s.name})`, color: '#ff6e40' });
          }
          break;
        }

        // ── Outcome transformations ──
        case 'team_convert_high_card': {
          if (handResult.handName === 'High Card' && handResult.outcome === 'Strikeout') {
            handResult.outcome = 'Single';
            handResult.peanuts = Math.max(handResult.peanuts, eff.peanuts || 1);
            handResult.mult = Math.max(handResult.mult, eff.mult || 1);
            handResult.score = Math.round(handResult.peanuts * handResult.mult);
            bonuses.outcomeChanged = true;
            bonuses.messages.push({ text: `High Card → Single! (${s.name})`, color: '#69f0ae' });
          }
          break;
        }
        case 'strikeout_to_walk': {
          if (handResult.outcome === 'Strikeout' && Math.random() < eff.chance) {
            handResult.outcome = 'Walk';
            bonuses.outcomeChanged = true;
            bonuses.messages.push({ text: `K → Walk! (${s.name})`, color: '#69f0ae' });
          }
          break;
        }

        // ── Error multiplier (passed to SituationalEngine) ──
        case 'error_multiplier': {
          bonuses.errorMult *= eff.value;
          break;
        }

        // ── Extra base chance boost ──
        case 'team_extra_base': {
          bonuses.extraBaseBonus += eff.value;
          break;
        }

        // ── Stat boosts (Batting Coach etc.) applied at batter level ──
        case 'team_stat_boost':
        // ── Effects handled at at-bat start ──
        case 'team_add_discard':
        case 'add_hand_draw':
        // ── Effects handled elsewhere ──
        case 'shop_extra_cards':
        case 'unlock_staff_slot':
        case 'pitcher_hit_reduction':
        case 'pitcher_fatigue_delay':
        case 'bonus_draw_on_discard':
        case 'strikeout_redraw':
        case 'ignore_pair_penalty':
          break;

        default:
          break;
      }
    }

    // Apply peanut/mult bonuses to handResult
    if (bonuses.peanutBonus > 0 || bonuses.multBonus > 0) {
      handResult.peanuts += bonuses.peanutBonus;
      handResult.mult = Math.round((handResult.mult + bonuses.multBonus) * 10) / 10;
      handResult.score = Math.round(handResult.peanuts * handResult.mult);
    }

    return bonuses;
  }

  // ── Bonus Player Lineup Effect Processor ──────────────
  // Applies passive effects from bonus players in the lineup.
  // Returns { peanutBonus, multBonus, messages[], extraBaseBonus, pairOutReduction, contactSaveBoost }

  _applyLineupEffects(handResult, gameState) {
    const effects = this.rosterManager.getActiveLineupEffects();
    const bonuses = { peanutBonus: 0, multBonus: 0, messages: [], extraBaseBonus: 0, pairOutReduction: 0, contactSaveBoost: 0 };
    if (effects.length === 0) return bonuses;

    const isHit = !['Strikeout', 'Groundout', 'Flyout', 'Double Play', "Fielder's Choice"].includes(handResult.outcome);
    const isXBH = ['Double', 'Triple', 'Home Run'].includes(handResult.outcome);

    for (const eff of effects) {
      switch (eff.type) {
        case 'team_add_peanuts_on_xbh': {
          if (isXBH) {
            bonuses.peanutBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value} peanut (XBH bonus)`, color: '#ffd600' });
          }
          break;
        }
        case 'team_pair_out_reduction': {
          bonuses.pairOutReduction += eff.value;
          break;
        }
        case 'team_extra_base_chance': {
          bonuses.extraBaseBonus += eff.value;
          break;
        }
        case 'team_power_mult': {
          const batter = this.rosterManager.getCurrentBatter();
          if (batter.power >= (eff.threshold || 8)) {
            const bonus = Math.round((handResult.mult * eff.value - handResult.mult) * 10) / 10;
            bonuses.multBonus += bonus;
            bonuses.messages.push({ text: `x${eff.value} mult (PWR ${batter.power})`, color: '#ff8a65' });
          }
          break;
        }
        case 'team_add_mult_on_hit': {
          if (isHit) {
            bonuses.multBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value}x (lineup bonus)`, color: '#ffab40' });
          }
          break;
        }
        case 'team_strikeout_peanuts': {
          if (handResult.outcome === 'Strikeout') {
            bonuses.peanutBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value} peanuts (K bonus)`, color: '#ffd600' });
          }
          break;
        }
        case 'team_first_pitch_mult': {
          if (this.discardCount === 0) {
            bonuses.multBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value}x (1st pitch)`, color: '#ffab40' });
          }
          break;
        }
        case 'team_runner_mult': {
          const runners = gameState.bases.filter(b => b).length;
          if (runners > 0) {
            const bonus = eff.value * runners;
            bonuses.multBonus += bonus;
            bonuses.messages.push({ text: `+${bonus}x (${runners} on base)`, color: '#ffab40' });
          }
          break;
        }
        case 'team_late_inning_peanuts': {
          if (gameState.inning >= 7) {
            bonuses.peanutBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value} peanuts (late inning)`, color: '#ffd600' });
          }
          break;
        }
        case 'team_contact_save_boost': {
          bonuses.contactSaveBoost += eff.value;
          break;
        }
        default:
          break;
      }
    }

    // Apply peanut/mult bonuses
    if (bonuses.peanutBonus > 0 || bonuses.multBonus > 0) {
      handResult.peanuts += bonuses.peanutBonus;
      handResult.mult = Math.round((handResult.mult + bonuses.multBonus) * 10) / 10;
      handResult.score = Math.round(handResult.peanuts * handResult.mult);
    }

    return bonuses;
  }

  // ── Synergy Effect Processor ──────────────────────────
  // Applies bonuses from active lineup synergies.

  _applySynergyEffects(handResult, gameState) {
    const bonuses = { peanutBonus: 0, multBonus: 0, messages: [], extraBaseBonus: 0, pairOutReduction: 0 };
    if (!this.activeSynergies || this.activeSynergies.length === 0) return bonuses;

    const batter = this.rosterManager.getCurrentBatter();
    const isHit = !['Strikeout', 'Groundout', 'Flyout', 'Double Play', "Fielder's Choice"].includes(handResult.outcome);

    for (const syn of this.activeSynergies) {
      const eff = syn.bonus;
      switch (eff.type) {
        case 'add_mult_all': {
          bonuses.multBonus += eff.value;
          bonuses.messages.push({ text: `+${eff.value}x (${syn.name})`, color: '#ce93d8' });
          break;
        }
        case 'add_peanuts_all': {
          bonuses.peanutBonus += eff.value;
          bonuses.messages.push({ text: `+${eff.value} peanuts (${syn.name})`, color: '#ce93d8' });
          break;
        }
        case 'add_mult_on_hr': {
          if (handResult.outcome === 'Home Run') {
            bonuses.multBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value}x (${syn.name})`, color: '#ce93d8' });
          }
          break;
        }
        case 'add_mult_lefty': {
          if (batter.bats === 'L') {
            bonuses.multBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value}x (${syn.name})`, color: '#ce93d8' });
          }
          break;
        }
        case 'team_pair_out_reduction': {
          bonuses.pairOutReduction += eff.value;
          break;
        }
        case 'team_extra_base_chance': {
          bonuses.extraBaseBonus += eff.value;
          break;
        }
        case 'add_peanuts_on_xbh': {
          if (['Triple', 'Home Run'].includes(handResult.outcome)) {
            bonuses.peanutBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value} peanuts (${syn.name})`, color: '#ce93d8' });
          }
          break;
        }
        // pitcher_control_reduction and pitcher_hit_reduction handled in PitchingScene
        // bonus_player_stat_boost handled at at-bat start
        default:
          break;
      }
    }

    if (bonuses.peanutBonus > 0 || bonuses.multBonus > 0) {
      handResult.peanuts += bonuses.peanutBonus;
      handResult.mult = Math.round((handResult.mult + bonuses.multBonus) * 10) / 10;
      handResult.score = Math.round(handResult.peanuts * handResult.mult);
    }

    return bonuses;
  }

  // Pitching methods moved to PitchingScene.js

  _goToShop() {
    this.scene.start('ShopScene', {
      rosterManager: this.rosterManager,
      traitManager: this.traitManager,
      baseball: this.baseball,
      cardEngine: this.cardEngine,
      gameLogEntries: this.gameLogEntries,
    });
  }

  _goToPitching() {
    // Check for card pack reward before pitching
    const packTier = this._checkPackReward();
    if (packTier) {
      this.scene.start('PackOpenScene', {
        tier: packTier,
        rosterManager: this.rosterManager,
        traitManager: this.traitManager,
        baseball: this.baseball,
        cardEngine: this.cardEngine,
        gameLogEntries: this.gameLogEntries,
      });
      return;
    }

    this.scene.start('PitchingScene', {
      rosterManager: this.rosterManager,
      baseball: this.baseball,
      traitManager: this.traitManager,
      cardEngine: this.cardEngine,
      gameLogEntries: this.gameLogEntries,
    });
  }

  /** Check if batting performance earned a card pack. */
  _checkPackReward() {
    const canGetPack = this.rosterManager.bonusPlayerCount < 3;
    if (!canGetPack) return null;

    const runsThisInning = this.baseball.getStatus().currentInningPlayerRuns;
    const hadBigHand = this._maxPeanutsThisInning >= 25;

    if (runsThisInning >= 4 || hadBigHand) return 'gold';
    if (runsThisInning >= 2) return 'bronze';
    return null;
  }

  _showMidInningTransition() {
    this.inputLocked = true;
    this._setButtonsEnabled(false, false);
    this._setSortButtonsVisible(false);
    // Hide diamond sprites during transition
    if (this.batterSprite) this.batterSprite.setVisible(false);
    if (this.pitcherMoundSprite) this.pitcherMoundSprite.setVisible(false);
    const s = this.baseball.getStatus();
    const elements = [];

    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0).setDepth(10);
    elements.push(overlay);

    // "Middle of Inning X" header
    const inningLabel = this.add.text(640, 420, `Inning ${s.inning}`, {
      fontSize: '44px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);
    elements.push(inningLabel);

    // Half indicator
    const halfLabel = this.add.text(640, 465, '▼  Bottom Half  —  Pitching', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ff8a80',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);
    elements.push(halfLabel);

    // Box score
    const boxElements = this._createBoxScore(640, 560, s, 11);
    elements.push(...boxElements);

    // Animate in
    this.tweens.add({ targets: overlay, alpha: 1, duration: 300 });
    this.tweens.add({
      targets: [inningLabel, halfLabel, ...boxElements],
      alpha: 1, duration: 300, delay: 150,
    });

    // Dismiss after delay
    this.time.delayedCall(2800, () => {
      this.tweens.add({
        targets: elements,
        alpha: 0, duration: 400,
        onComplete: () => elements.forEach(el => el.destroy()),
      });
      this.time.delayedCall(450, () => this._goToPitching());
    });
  }

  _showInningTransition() {
    this._setSortButtonsVisible(false);
    // Hide diamond sprites during transition
    if (this.batterSprite) this.batterSprite.setVisible(false);
    if (this.pitcherMoundSprite) this.pitcherMoundSprite.setVisible(false);
    const s = this.baseball.getStatus();
    const elements = [];

    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0).setDepth(10);
    elements.push(overlay);

    // "Inning X" header
    const inningLabel = this.add.text(640, 420, `Inning ${s.inning}`, {
      fontSize: '44px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);
    elements.push(inningLabel);

    // Half indicator
    const halfLabel = this.add.text(640, 465, '▲  Top Half  —  Batting', {
      fontSize: '18px', fontFamily: 'monospace', color: '#69f0ae',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);
    elements.push(halfLabel);

    // Box score
    const boxElements = this._createBoxScore(640, 560, s, 11);
    elements.push(...boxElements);

    // Animate in
    this.tweens.add({ targets: overlay, alpha: 1, duration: 300 });
    this.tweens.add({
      targets: [inningLabel, halfLabel, ...boxElements],
      alpha: 1, duration: 300, delay: 150,
    });

    // Dismiss after delay
    this.time.delayedCall(2800, () => {
      this.tweens.add({
        targets: elements,
        alpha: 0, duration: 400,
        onComplete: () => elements.forEach(el => el.destroy()),
      });
      this.time.delayedCall(450, () => this._startAtBat());
    });
  }

  _shortHandName(name) {
    const abbrev = {
      'High Card': 'HC', 'Pair': 'Pr', 'Two Pair': '2P',
      'Three of a Kind': '3K', 'Straight': 'St', 'Flush': 'Fl',
      'Full House': 'FH', 'Four of a Kind': '4K',
      'Straight Flush': 'SF', 'Royal Flush': 'RF',
    };
    return abbrev[name] || name.slice(0, 3);
  }

  /**
   * Create a classic baseball box score display.
   * Returns array of Phaser game objects.
   */
  _createBoxScore(cx, cy, status, depth) {
    const elements = [];
    const yourTeam = this.rosterManager.getTeam();
    const oppTeam = this.rosterManager.getOpponentTeam();

    const yourName = yourTeam ? yourTeam.id : 'YOU';
    const oppName = oppTeam ? oppTeam.id : 'OPP';

    const totalInnings = 9;
    const playedInnings = status.playerRunsByInning.length;

    // Layout
    const cellW = 36;
    const cellH = 32;
    const nameColW = 70;
    const totalColW = 44;
    const gridW = nameColW + totalInnings * cellW + totalColW;
    const gridH = cellH * 3; // header + 2 team rows
    const startX = cx - gridW / 2;
    const startY = cy - gridH / 2;

    // Background
    const bg = this.add.rectangle(cx, cy, gridW + 8, gridH + 8, 0x0a1f0d)
      .setStrokeStyle(2, 0x4caf50).setDepth(depth).setAlpha(0);
    elements.push(bg);

    // Header row: TEAM | 1 | 2 | 3 ... | 9 | R
    const headerY = startY + cellH / 2;

    const teamHeader = this.add.text(startX + nameColW / 2, headerY, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#4caf50',
    }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
    elements.push(teamHeader);

    for (let i = 0; i < totalInnings; i++) {
      const x = startX + nameColW + i * cellW + cellW / 2;
      const isCurrent = (i + 1) === status.inning;
      const color = isCurrent ? '#ffd600' : '#4caf50';
      const inningNum = this.add.text(x, headerY, `${i + 1}`, {
        fontSize: '13px', fontFamily: 'monospace', color,
        fontStyle: isCurrent ? 'bold' : 'normal',
      }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
      elements.push(inningNum);

      // Highlight current inning column
      if (isCurrent) {
        const highlight = this.add.rectangle(x, cy, cellW, gridH, 0xffd600, 0.08)
          .setDepth(depth).setAlpha(0);
        elements.push(highlight);
      }
    }

    // "R" total column header
    const rHeader = this.add.text(startX + nameColW + totalInnings * cellW + totalColW / 2, headerY, 'R', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
    elements.push(rHeader);

    // Divider line under header
    const divider1 = this.add.rectangle(cx, startY + cellH, gridW - 4, 1, 0x4caf50, 0.5)
      .setDepth(depth + 1).setAlpha(0);
    elements.push(divider1);

    // Your team row
    const yourY = startY + cellH + cellH / 2;
    const yourNameTxt = this.add.text(startX + nameColW / 2, yourY, yourName, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
    elements.push(yourNameTxt);

    for (let i = 0; i < totalInnings; i++) {
      const x = startX + nameColW + i * cellW + cellW / 2;
      let val = '';
      if (i < playedInnings) {
        val = `${status.playerRunsByInning[i]}`;
      } else if (i === playedInnings) {
        // Current inning in progress
        val = `${status.currentInningPlayerRuns}`;
      }
      const color = i < playedInnings ? '#cccccc' : (i === playedInnings ? '#ffd600' : '#333333');
      const cell = this.add.text(x, yourY, val || '-', {
        fontSize: '14px', fontFamily: 'monospace', color,
        fontStyle: i === playedInnings ? 'bold' : 'normal',
      }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
      elements.push(cell);
    }

    // Your total
    const yourTotal = this.add.text(
      startX + nameColW + totalInnings * cellW + totalColW / 2, yourY,
      `${status.playerScore}`, {
      fontSize: '15px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
    elements.push(yourTotal);

    // Divider between teams
    const divider2 = this.add.rectangle(cx, startY + cellH * 2, gridW - 4, 1, 0x333333, 0.5)
      .setDepth(depth + 1).setAlpha(0);
    elements.push(divider2);

    // Opponent team row
    const oppY = startY + cellH * 2 + cellH / 2;
    const oppNameTxt = this.add.text(startX + nameColW / 2, oppY, oppName, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8a80', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
    elements.push(oppNameTxt);

    for (let i = 0; i < totalInnings; i++) {
      const x = startX + nameColW + i * cellW + cellW / 2;
      let val = '';
      if (i < status.opponentRunsByInning.length) {
        val = `${status.opponentRunsByInning[i]}`;
      }
      const color = i < status.opponentRunsByInning.length ? '#cccccc' : '#333333';
      const cell = this.add.text(x, oppY, val || '-', {
        fontSize: '14px', fontFamily: 'monospace', color,
      }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
      elements.push(cell);
    }

    // Opponent total
    const oppTotal = this.add.text(
      startX + nameColW + totalInnings * cellW + totalColW / 2, oppY,
      `${status.opponentScore}`, {
      fontSize: '15px', fontFamily: 'monospace', color: '#ff8a80', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
    elements.push(oppTotal);

    return elements;
  }

  _endGame() {
    const result = this.baseball.getResult();
    result.yourTeam = this.rosterManager.getTeam();
    result.opponentTeam = this.rosterManager.getOpponentTeam();
    this.scene.start('GameOverScene', result);
  }
}

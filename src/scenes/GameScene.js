/**
 * GameScene.js - Main gameplay scene
 * Layout: Batter panel (left) | Base diamond + result (center) | Pitcher panel (right)
 * Cards and buttons along the bottom.
 */
import CardEngine from '../CardEngine.js';
import BaseballState from '../BaseballState.js';
import RosterManager from '../RosterManager.js';
import TraitManager from '../TraitManager.js';

const SUIT_SYMBOLS = { H: '\u2665', D: '\u2666', C: '\u2663', S: '\u2660' };
const SUIT_COLORS = { H: '#e53935', D: '#e53935', C: '#212121', S: '#212121' };
const RANK_NAMES = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

const CARD_W = 100;
const CARD_H = 140;
const CARD_SPACING = 120;
const HAND_Y = 560;
const HAND_START_X = 640 - (4 * CARD_SPACING) / 2;

// Panel constants
const PANEL_W = 210;
const BATTER_X = 115;   // center of left panel
const PITCHER_X = 1165;  // center of right panel

const RARITY_COLORS = {
  common:   '#81c784',
  uncommon: '#64b5f6',
  rare:     '#ce93d8',
};

import HAND_TABLE from '../../data/hand_table.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this._initData = data || {};
  }

  create() {
    // Persist managers through scene transitions (shop, etc.)
    if (this._initData.fromShop) {
      this.cardEngine = this._initData.cardEngine;
      this.baseball = this._initData.baseball;
      this.rosterManager = this._initData.rosterManager;
      this.traitManager = this._initData.traitManager;
    } else {
      this.cardEngine = new CardEngine();
      this.baseball = new BaseballState();
      // Accept team + pitcher + opponent from TeamSelectScene
      const team = this._initData.team;
      const pitcherIdx = this._initData.pitcherIndex || 0;
      const oppTeam = this._initData.opponentTeam || null;
      this.rosterManager = new RosterManager(team, pitcherIdx, oppTeam);
      this.traitManager = new TraitManager();
      // Assign pitcher traits at game start
      const pitcherTraits = TraitManager.pickPitcherTraits();
      this.rosterManager.setPitcherTraits(pitcherTraits);
    }

    this.selectedIndices = new Set();
    this.cardSprites = [];
    this.inputLocked = false;
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

    this._updateBatterPanel();
    this._updatePitcherPanel();
    this._startAtBat();
  }

  // ── Scoreboard ──────────────────────────────────────────

  _createScoreboard() {
    this.add.rectangle(640, 25, 1280, 50, 0x0d3311).setDepth(0);

    this.inningText = this.add.text(BATTER_X + PANEL_W / 2 + 20, 10, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
    }).setDepth(1);

    this.scoreText = this.add.text(640, 8, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd600',
    }).setOrigin(0.5, 0).setDepth(1);

    this.outsText = this.add.text(PITCHER_X - PANEL_W / 2 - 20, 10, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ff8a80',
    }).setOrigin(1, 0).setDepth(1);

    this.chipBalanceText = this.add.text(640, 33, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffd600',
    }).setOrigin(0.5, 0).setDepth(1);

    this._updateScoreboard();
  }

  _updateScoreboard() {
    const s = this.baseball.getStatus();
    this.inningText.setText(`INN ${s.inning} ${s.half === 'top' ? '\u25b2' : '\u25bc'}`);
    const oppTeam = this.rosterManager.getOpponentTeam();
    const oppName = oppTeam ? oppTeam.id : 'OPP';
    this.scoreText.setText(`YOU ${s.playerScore}  -  ${s.opponentScore} ${oppName}`);
    this.chipBalanceText.setText(`Chips: ${s.totalChips}`);

    const outDots = [];
    for (let i = 0; i < 3; i++) {
      outDots.push(i < s.outs ? '\u25cf' : '\u25cb');
    }
    this.outsText.setText(`Outs: ${outDots.join(' ')}`);
    this._updateBases(s.bases);
  }

  // ── Batter Panel (left) ────────────────────────────────

  _createBatterPanel() {
    // Dark panel background
    this.add.rectangle(BATTER_X, 280, PANEL_W, 400, 0x0a1f0d, 0.85)
      .setStrokeStyle(2, 0x2e7d32);

    // Team + "AT BAT" header
    const team = this.rosterManager.getTeam();
    const headerLabel = team ? `${team.logo} AT BAT` : 'AT BAT';
    this.add.text(BATTER_X, 95, headerLabel, {
      fontSize: '12px', fontFamily: 'monospace', color: '#4caf50', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Player name
    this.batterNameText = this.add.text(BATTER_X, 120, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: PANEL_W - 20 },
    }).setOrigin(0.5).setDepth(2);

    // Lineup number
    this.batterNumText = this.add.text(BATTER_X, 148, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0.5).setDepth(2);

    // Stats
    this.batterPwrText = this.add.text(BATTER_X - 70, 175, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8a65',
    }).setDepth(2);
    this.batterCntText = this.add.text(BATTER_X - 70, 195, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#64b5f6',
    }).setDepth(2);
    this.batterSpdText = this.add.text(BATTER_X - 70, 215, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
    }).setDepth(2);

    // Divider
    this.add.rectangle(BATTER_X, 240, PANEL_W - 30, 1, 0x2e7d32, 0.5);

    // "TRAITS" label
    this.batterTraitLabel = this.add.text(BATTER_X, 252, 'TRAITS', {
      fontSize: '11px', fontFamily: 'monospace', color: '#4caf50',
    }).setOrigin(0.5).setDepth(2);
  }

  _updateBatterPanel() {
    const batter = this.rosterManager.getCurrentBatter();
    const idx = this.rosterManager.getCurrentBatterIndex();

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
    this.add.rectangle(PITCHER_X, 280, PANEL_W, 400, 0x1a0a0d, 0.85)
      .setStrokeStyle(2, 0x8b0000);

    // "PITCHING" header
    this.add.text(PITCHER_X, 95, 'PITCHING', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e53935', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Pitcher name
    this.pitcherNameText = this.add.text(PITCHER_X, 120, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: PANEL_W - 20 },
    }).setOrigin(0.5).setDepth(2);

    // Opponent team label
    this.pitcherTeamText = this.add.text(PITCHER_X, 148, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e57373',
    }).setOrigin(0.5).setDepth(2);

    // Stats
    this.pitcherVelText = this.add.text(PITCHER_X - 70, 170, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8a65',
    }).setDepth(2);
    this.pitcherCtlText = this.add.text(PITCHER_X - 70, 190, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#64b5f6',
    }).setDepth(2);
    this.pitcherStaText = this.add.text(PITCHER_X - 70, 210, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
    }).setDepth(2);

    // Divider
    this.add.rectangle(PITCHER_X, 235, PANEL_W - 30, 1, 0x8b0000, 0.5);

    // "TRAITS" label
    this.pitcherTraitLabel = this.add.text(PITCHER_X, 247, 'TRAITS', {
      fontSize: '11px', fontFamily: 'monospace', color: '#e53935',
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
    const filled = Math.min(val, 10);
    return '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled) + ` ${val}`;
  }

  // ── Base Diamond (center) ─────────────────────────────

  _createBaseDiamond() {
    this.baseGraphics = [];
    this.runners = [null, null, null]; // runner dots for 1st, 2nd, 3rd
    this._prevBases = [false, false, false]; // track previous state for animations
    const cx = 640, cy = 175;
    const r = 65;
    this.baseDiamondCenter = { x: cx, y: cy };
    this.baseDiamondRadius = r;
    this.basePositions = [
      { x: cx + r, y: cy },       // 1st base
      { x: cx, y: cy - r },       // 2nd base
      { x: cx - r, y: cy },       // 3rd base
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
  }

  _updateBases(bases) {
    const cx = this.baseDiamondCenter.x;
    const cy = this.baseDiamondCenter.y;
    const r = this.baseDiamondRadius;
    const bs = 14;

    for (let i = 0; i < 3; i++) {
      const bp = this.basePositions[i];
      const occupied = bases[i];
      const wasOccupied = this._prevBases[i];

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

      // Runner dots
      if (occupied && !wasOccupied) {
        // Runner arriving — animate from previous base or home
        const fromPos = i === 0 ? this.homePosition : this.basePositions[i - 1];
        if (this.runners[i]) this.runners[i].destroy();
        const runner = this.add.circle(fromPos.x, fromPos.y, 10, 0xffd600).setDepth(3);
        this.runners[i] = runner;
        // Pulse glow
        this.tweens.add({
          targets: runner,
          alpha: { from: 1, to: 0.6 },
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        // Tween along basepath
        this.tweens.add({
          targets: runner,
          x: bp.x,
          y: bp.y,
          duration: 350,
          ease: 'Quad.easeInOut',
        });
      } else if (!occupied && wasOccupied) {
        // Runner left — animate to next base or home
        if (this.runners[i]) {
          const toPos = i === 2 ? this.homePosition : this.basePositions[i + 1];
          const runnerRef = this.runners[i];
          this.tweens.add({
            targets: runnerRef,
            x: toPos.x,
            y: toPos.y,
            alpha: 0,
            duration: 350,
            ease: 'Quad.easeIn',
            onComplete: () => runnerRef.destroy(),
          });
          this.runners[i] = null;
        }
      } else if (occupied && wasOccupied) {
        // Runner stayed — ensure dot is at correct position
        if (!this.runners[i]) {
          const runner = this.add.circle(bp.x, bp.y, 10, 0xffd600).setDepth(3);
          this.runners[i] = runner;
          this.tweens.add({
            targets: runner,
            alpha: { from: 1, to: 0.6 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      } else {
        // No runner, clean up
        if (this.runners[i]) {
          this.runners[i].destroy();
          this.runners[i] = null;
        }
      }
    }
    this._prevBases = [...bases];
  }

  // ── Result Display (center) ───────────────────────────

  _createResultDisplay() {
    this.resultText = this.add.text(640, 310, '', {
      fontSize: '26px', fontFamily: 'monospace', color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setDepth(2);

    this.handNameText = this.add.text(640, 345, '', {
      fontSize: '18px', fontFamily: 'monospace', color: '#aaaaaa',
      align: 'center',
    }).setOrigin(0.5).setDepth(2);

    // Live hand preview (shown while selecting cards)
    this.handPreviewText = this.add.text(640, HAND_Y - CARD_H / 2 - 65, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffd600',
      align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(7).setAlpha(0);

    // Live score preview: chips x mult = total (below hand preview)
    this.scorePreviewText = this.add.text(640, HAND_Y - CARD_H / 2 - 40, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaaaaa',
      align: 'center',
    }).setOrigin(0.5).setDepth(7).setAlpha(0);

    // Cascade text lines (reused each resolve)
    this.cascadeTexts = [];

    // Score popup container (created dynamically)
    this.scorePopups = [];
  }

  // ── Info Text ─────────────────────────────────────────

  _createInfoText() {
    this.discardInfo = this.add.text(640, 380, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#b2dfdb',
    }).setOrigin(0.5).setDepth(7);

    this.deckInfo = this.add.text(BATTER_X, 490, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0.5).setDepth(1);

    this._updateInfoText();
  }

  _updateInfoText() {
    this.discardInfo.setText(
      `Discards: ${this.cardEngine.discardsRemaining} | Select cards to PLAY or DISCARD`
    );
    this.deckInfo.setText(`Deck: ${this.cardEngine.deck.length}`);
  }

  // ── Buttons ───────────────────────────────────────────

  _createButtons() {
    this.playBtn = this._makeButton(540, 680, 'PLAY HAND', 0x2e7d32, () => this._onPlay());
    this.discardBtn = this._makeButton(740, 680, 'DISCARD', 0xf57f17, () => this._onDiscard());

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
    const bg = this.add.rectangle(x, y, 160, 44, color, 0.9)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);
    const txt = this.add.text(x, y, label, {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
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
    const sortY = HAND_Y - CARD_H / 2 - 40;
    const modes = [
      { label: 'DEFAULT', mode: 'default' },
      { label: 'RANK',    mode: 'rank' },
      { label: 'SUIT',    mode: 'suit' },
    ];

    this.sortBtns = [];
    const totalW = modes.length * 90;
    const startX = 640 - totalW / 2 + 45;

    modes.forEach((m, i) => {
      const x = startX + i * 90;
      const bg = this.add.rectangle(x, sortY, 80, 22, 0x333333, 0.7)
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

  _createCardSprite(card, x, y, index) {
    const suitColor = SUIT_COLORS[card.suit];
    const suitSym = SUIT_SYMBOLS[card.suit];
    const rankStr = RANK_NAMES[card.rank] || card.rank.toString();

    const glow = this.add.rectangle(x, y, CARD_W + 8, CARD_H + 8, 0xffd600, 0)
      .setDepth(4);

    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0xfafafa)
      .setStrokeStyle(2, 0x333333)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);

    const rankText = this.add.text(x, y - 20, rankStr, {
      fontSize: '32px', fontFamily: 'serif', color: suitColor, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(6);

    const suitText = this.add.text(x, y + 25, suitSym, {
      fontSize: '36px', fontFamily: 'serif', color: suitColor,
    }).setOrigin(0.5).setDepth(6);

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
    const suitColor = SUIT_COLORS[card.suit];
    const suitSym = SUIT_SYMBOLS[card.suit];
    const rankStr = RANK_NAMES[card.rank] || card.rank.toString();

    const glow = this.add.rectangle(x, y, CARD_W + 8, CARD_H + 8, 0xffd600, 0).setDepth(4);
    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0xfafafa)
      .setStrokeStyle(2, 0x333333)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);
    const rankText = this.add.text(x, y - 20, rankStr, {
      fontSize: '32px', fontFamily: 'serif', color: suitColor, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(6);
    const suitText = this.add.text(x, y + 25, suitSym, {
      fontSize: '36px', fontFamily: 'serif', color: suitColor,
    }).setOrigin(0.5).setDepth(6);

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
      cs.glow.setAlpha(0);
      cs.bg.setStrokeStyle(2, 0x333333);
      const targets = [cs.bg, cs.rankText, cs.suitText, cs.glow];
      this.tweens.add({ targets, y: '-=0', duration: 1 }); // kill existing tweens
      this.tweens.add({ targets: cs.bg,       y: cs.y,      duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.rankText,  y: cs.rankY,  duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.suitText,  y: cs.suitY,  duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.glow,      y: cs.y,      duration: 150, ease: 'Back.easeOut' });
    } else {
      this.selectedIndices.add(index);
      cs.glow.setAlpha(0.7);
      cs.bg.setStrokeStyle(2, 0xffd600);
      // Bounce up with slight scale pop
      const allParts = [cs.bg, cs.rankText, cs.suitText, cs.glow];
      this.tweens.add({ targets: cs.bg,       y: cs.y - lift,      duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.rankText,  y: cs.rankY - lift,  duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.suitText,  y: cs.suitY - lift,  duration: 150, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.glow,      y: cs.y - lift,      duration: 150, ease: 'Back.easeOut' });
      // Quick scale pop on the card
      this.tweens.add({
        targets: allParts, scaleX: 1.08, scaleY: 1.08,
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

    // Evaluate without modifiers for a clean preview
    const result = CardEngine.evaluateHand(cards);
    const handName = result.handName;
    const n = cards.length;

    let preview = '';
    let color = '#ffd600';
    const isOut = handName === 'High Card' || handName === 'Strikeout' ||
                  handName === 'Groundout' || handName === 'Flyout';

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
      preview = `${result.originalHand || handName} \u2192 ${handName}!`;
      color = '#ff8a80';
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

    this.handPreviewText.setText(preview);
    this.handPreviewText.setColor(color);
    this.handPreviewText.setAlpha(1);

    // Live chips x mult display
    let scorePreview = '';
    if (isOut) {
      scorePreview = 'OUT';
      this.scorePreviewText.setColor('#ff5252');
    } else if (result.chips > 0) {
      const batter = this.rosterManager.getCurrentBatter();
      const powerBonus = Math.max(0, batter.power - 5);
      const contactBonus = batter.contact / 10;
      const totalChips = result.chips + powerBonus;
      const totalMult = Math.round((result.mult + contactBonus) * 10) / 10;
      const total = Math.round(totalChips * totalMult);

      const chipsStr = Number.isInteger(totalChips) ? totalChips : totalChips.toFixed(1);
      const multStr = Number.isInteger(totalMult) ? totalMult : totalMult.toFixed(1);
      scorePreview = `${chipsStr} chips x ${multStr} mult = ${total}`;

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
      fontSize: '32px', fontFamily: 'monospace', color, fontStyle: 'bold',
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

      const stats = this.add.text(810, y, `${h.chips}c x${h.mult}`, {
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
    // Clean up any leftover cascade texts
    if (this.cascadeTexts) {
      this.cascadeTexts.forEach(t => t.destroy());
      this.cascadeTexts = [];
    }
    this._setSortButtonsVisible(true);
    this.cardEngine.newAtBat();

    // Bonus discards from batter traits (e.g. Batting Gloves)
    const batter = this.rosterManager.getCurrentBatter();
    const bonusDiscards = batter.traits
      .filter(t => t.effect && t.effect.type === 'add_discard')
      .reduce((sum, t) => sum + (t.effect.value || 1), 0);
    if (bonusDiscards > 0) {
      this.cardEngine.discardsRemaining += bonusDiscards;
    }

    this.dealOrder = this.cardEngine.hand.map((_, i) => i);
    this.sortMode = 'default';
    this._updateSortHighlight();
    this._renderHand();
    this._updateScoreboard();
    this._updateInfoText();
    this._setButtonsEnabled(true, this.cardEngine.discardsRemaining > 0);
    this.inputLocked = false;
  }

  _onDiscard() {
    if (this.selectedIndices.size === 0) return;
    if (this.cardEngine.discardsRemaining <= 0) return;

    this.inputLocked = true;

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
      // Map display indices → actual hand indices for CardEngine
      const handIndices = displayIndices
        .map(di => this._displayToHand[di] !== undefined ? this._displayToHand[di] : di);
      this.cardEngine.discard(handIndices);
      // Reset deal order for new hand composition
      this.dealOrder = this.cardEngine.hand.map((_, i) => i);
      this._renderHand();
      this._updateInfoText();
      this._setButtonsEnabled(true, this.cardEngine.discardsRemaining > 0);
      this.inputLocked = false;
    });
  }

  _onPlay() {
    if (this.selectedIndices.size === 0) return;

    this.inputLocked = true;
    this._setButtonsEnabled(false, false);

    // Map display indices → actual hand indices
    const selectedArr = [...this.selectedIndices]
      .map(di => this._displayToHand[di] !== undefined ? this._displayToHand[di] : di)
      .sort((a, b) => a - b);
    const batter = this.rosterManager.getCurrentBatter();
    const pitcher = this.rosterManager.getCurrentPitcher();
    const gameState = this.baseball.getStatus();

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
    let pitcherPostPenalty = { chips: 0, mult: 0 };

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
        if (r.chips < before.chips) {
          pitcherPostPenalty.chips = before.chips - r.chips;
          effects.push(`-${before.chips - r.chips} chips`);
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
        if (r.chips > before.chips) effects.push(`+${r.chips - before.chips} chips`);
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

    // Play selected cards with combined modifiers
    let handResult = this.cardEngine.playHand(selectedArr, combinedPreMod, trackingPostMod, gameState);

    // Apply stat modifiers (now returns { result, bonuses })
    const batterMod = this.rosterManager.applyBatterModifiers(handResult, gameState);
    handResult = batterMod.result;
    const batterBonuses = batterMod.bonuses;
    handResult = this.rosterManager.applyPitcherModifiers(handResult, gameState);

    // Sacrifice fly
    let sacrificeFlyRun = 0;
    if (handResult.sacrificeFly) {
      sacrificeFlyRun = this.baseball.processSacrificeFly();
    }

    const isOut = handResult.outcome === 'Strikeout' || handResult.outcome === 'Groundout' || handResult.outcome === 'Flyout';

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
          this.tweens.add({
            targets: parts,
            x: 640, y: 300, alpha: 0, scale: 0.3,
            duration: 350, delay: i * 50, ease: 'Quad.easeIn',
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

    // ── Phase 2: Resolve with cascade ──
    const resolveStart = 900 + pitcherDelay + batterTraitDelay;
    this.time.delayedCall(resolveStart, () => {
      const outcome = this.baseball.resolveOutcome(handResult.outcome, handResult.score);

      let extraBase = { scored: 0, advanced: false };
      if (handResult.extraBaseChance && !isOut) {
        extraBase = this.baseball.tryExtraBase(handResult.extraBaseChance);
      }

      this._clearCards();

      let desc = outcome.description;
      if (sacrificeFlyRun > 0) desc += ` Sac fly scores a run!`;
      if (extraBase.advanced) {
        desc += extraBase.scored > 0 ? ' Speed! Extra run!' : ' Speed! Runner advances!';
      }

      // Show outcome text
      this.resultText.setText(desc);
      this.resultText.setColor(isOut ? '#ff8a80' : '#69f0ae');
      this.tweens.add({
        targets: this.resultText,
        scale: { from: 0.5, to: 1 }, alpha: { from: 0, to: 1 },
        duration: 400, ease: 'Back.easeOut',
      });

      this._updateScoreboard();

      // For outs, skip cascade — just show outcome and move on
      if (isOut) {
        this.handNameText.setText('');

        this.rosterManager.advanceBatter();
        this.time.delayedCall(600, () => this._updateBatterPanel());
        this.time.delayedCall(1500, () => {
          if (this.baseball.isGameOver()) { this._endGame(); return; }
          if (this.baseball.state === 'SWITCH_SIDE') { this._doOpponentHalf(); return; }
          this._startAtBat();
        });
        return;
      }

      // ── Scoring Cascade for hits ──
      this.handNameText.setText('');
      const cascadeDelay = this._showScoringCascade(handResult, batterBonuses, pitcherPostPenalty, batterPostMessage);

      // Score popup for runs (after cascade)
      const totalRuns = outcome.runsScored + sacrificeFlyRun + extraBase.scored;
      this.time.delayedCall(cascadeDelay, () => {
        if (totalRuns > 0) {
          const popupColor = totalRuns >= 4 ? '#ff6e40' : totalRuns >= 2 ? '#ffd600' : '#69f0ae';
          const popupText = totalRuns >= 4 ? `+${totalRuns} RUNS!!!` : `+${totalRuns} RUN${totalRuns > 1 ? 'S' : ''}!`;
          this._showScorePopup(popupText, popupColor, 640, 260);
        }

        // Chip earnings flash
        if (handResult.score > 0) {
          this._showChipEarnings(handResult.score);
        }
      });

      // Advance batter
      this.rosterManager.advanceBatter();
      this.time.delayedCall(cascadeDelay + 200, () => this._updateBatterPanel());

      this.time.delayedCall(cascadeDelay + 1200, () => {
        if (this.baseball.isGameOver()) { this._endGame(); return; }
        if (this.baseball.state === 'SWITCH_SIDE') { this._doOpponentHalf(); return; }
        this._startAtBat();
      });
    });
  }

  /** Show scoring cascade: base hand → power → contact → trait → pitcher → final */
  _showScoringCascade(handResult, bonuses, pitcherPenalty, batterTraitMsg) {
    const steps = [];
    const stepDelay = 350;
    const baseY = 370;
    let runningChips = handResult.chips - bonuses.powerChips + pitcherPenalty.chips;
    let runningMult = handResult.mult - bonuses.contactMult + pitcherPenalty.mult;

    // Ensure running values don't go below the base hand values
    const baseChips = runningChips;
    const baseMult = Math.round(runningMult * 10) / 10;

    // Step 1: Base hand
    steps.push({
      text: `${handResult.handName} \u2192 ${baseChips} chip${baseChips !== 1 ? 's' : ''} x ${baseMult.toFixed(1)}`,
      color: '#ffd600',
    });

    // Step 2: Power bonus (if any)
    if (bonuses.powerChips > 0) {
      runningChips += bonuses.powerChips;
      const batter = this.rosterManager.getCurrentBatter();
      steps.push({
        text: `+${bonuses.powerChips} chips (PWR ${batter.power})`,
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
    if (pitcherPenalty.chips > 0 || pitcherPenalty.mult > 0) {
      const parts = [];
      if (pitcherPenalty.mult > 0) {
        runningMult = Math.round((runningMult - pitcherPenalty.mult) * 10) / 10;
        parts.push(`-${pitcherPenalty.mult.toFixed(1)}x`);
      }
      if (pitcherPenalty.chips > 0) {
        runningChips -= pitcherPenalty.chips;
        parts.push(`-${pitcherPenalty.chips} chips`);
      }
      steps.push({
        text: `${parts.join(' ')} (Pitcher)`,
        color: '#ff5252',
      });
    }

    // Step 6: Final score
    steps.push({
      text: `= ${handResult.score}`,
      color: '#ffffff',
      isFinal: true,
    });

    // Clean up old cascade texts
    this.cascadeTexts.forEach(t => t.destroy());
    this.cascadeTexts = [];

    // Animate each step
    steps.forEach((step, i) => {
      this.time.delayedCall(i * stepDelay, () => {
        const y = baseY + i * 24;
        const fontSize = step.isFinal ? '22px' : '13px';
        const txt = this.add.text(620, y, step.text, {
          fontSize, fontFamily: 'monospace', color: step.color,
          fontStyle: step.isFinal ? 'bold' : 'normal',
        }).setOrigin(0, 0.5).setDepth(10).setAlpha(0);
        this.cascadeTexts.push(txt);

        // Slide in from left + fade in
        txt.x -= 20;
        this.tweens.add({
          targets: txt,
          alpha: 1,
          x: '+=20',
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

  /** Flash chip earnings next to chip balance */
  _showChipEarnings(amount) {
    const chipBal = this.chipBalanceText;
    const popup = this.add.text(chipBal.x + chipBal.width / 2 + 10, chipBal.y, `+${amount}`, {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(15).setAlpha(0);

    this.tweens.add({
      targets: popup,
      alpha: { from: 0, to: 1 },
      y: popup.y - 30,
      duration: 400,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: popup,
      alpha: 0,
      y: popup.y - 60,
      duration: 400,
      delay: 600,
      onComplete: () => popup.destroy(),
    });
  }

  _doOpponentHalf() {
    this.inputLocked = true;
    this._setButtonsEnabled(false, false);
    this._clearCards();
    this._setSortButtonsVisible(false);

    const oppTeam = this.rosterManager.getOpponentTeam();
    const oppLabel = oppTeam ? `${oppTeam.logo} ${oppTeam.nickname}` : 'Opponent';
    const myPitcher = this.rosterManager.getMyPitcher();

    this.resultText.setColor('#ffffff');
    this.resultText.setText(`${oppLabel} batting...`);
    this.handNameText.setText(`${myPitcher.name} pitching`);
    this.handNameText.setColor('#81c784');

    // Run the sim
    const sim = this.rosterManager.simOpponentHalfInning(this.baseball.getStatus().inning);

    // Show play-by-play log one entry at a time
    const logY = 420;
    const logElements = [];

    // Clear area for log display
    const logBg = this.add.rectangle(640, logY + sim.log.length * 12, 500, sim.log.length * 26 + 20, 0x000000, 0.5)
      .setDepth(8);
    logElements.push(logBg);

    sim.log.forEach((entry, i) => {
      this.time.delayedCall(400 + i * 500, () => {
        const icon = entry.isOut ? '\u274c' : '\u2705';
        let text = `${icon} ${entry.batter} - ${entry.outcome}`;
        if (!entry.isOut && entry.scored > 0) {
          text += ` (${entry.scored} run${entry.scored > 1 ? 's' : ''})`;
        }

        const color = entry.isOut ? '#999999' : (entry.scored > 0 ? '#ff8a80' : '#ffe082');
        const logLine = this.add.text(640, logY + i * 26, text, {
          fontSize: '14px', fontFamily: 'monospace', color,
        }).setOrigin(0.5).setDepth(9).setAlpha(0);
        logElements.push(logLine);

        this.tweens.add({
          targets: logLine,
          alpha: 1, y: logLine.y - 5,
          duration: 200,
        });
      });
    });

    // After all log entries shown, show summary + advance
    const totalDelay = 400 + sim.log.length * 500 + 800;

    this.time.delayedCall(totalDelay, () => {
      // Pass sim runs to switchSide
      const switchResult = this.baseball.switchSide(sim.runs);

      // Clean up log
      logElements.forEach(el => {
        this.tweens.add({ targets: el, alpha: 0, duration: 300 });
      });
      this.time.delayedCall(350, () => logElements.forEach(el => el.destroy()));

      // Show summary
      const summary = sim.runs === 0
        ? `${myPitcher.name} shuts them down!`
        : `${oppLabel} score${sim.runs === 1 ? 's' : ''} ${sim.runs} run${sim.runs !== 1 ? 's' : ''}`;
      this.resultText.setText(summary);
      this.resultText.setColor(sim.runs > 0 ? '#ff8a80' : '#69f0ae');
      this.handNameText.setText('');

      this.tweens.add({
        targets: this.scoreText,
        scale: { from: 1.3, to: 1 },
        duration: 400, ease: 'Back.easeOut',
      });

      this._updateScoreboard();

      this.time.delayedCall(1800, () => {
        if (this.baseball.isGameOver()) {
          this._endGame();
          return;
        }
        if (this.baseball.shouldShowShop()) {
          this._goToShop();
          return;
        }
        this._showInningTransition();
      });
    });
  }

  _goToShop() {
    this.scene.start('ShopScene', {
      rosterManager: this.rosterManager,
      traitManager: this.traitManager,
      baseball: this.baseball,
      cardEngine: this.cardEngine,
    });
  }

  _showInningTransition() {
    this._setSortButtonsVisible(false);
    const s = this.baseball.getStatus();
    const elements = [];

    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0).setDepth(10);
    elements.push(overlay);

    // "Inning X" header
    const inningLabel = this.add.text(640, 160, `Inning ${s.inning}`, {
      fontSize: '44px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);
    elements.push(inningLabel);

    // Box score
    const boxElements = this._createBoxScore(640, 320, s, 11);
    elements.push(...boxElements);

    // Animate in
    this.tweens.add({ targets: overlay, alpha: 0.9, duration: 300 });
    this.tweens.add({
      targets: [inningLabel, ...boxElements],
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

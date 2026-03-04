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
      this.rosterManager = new RosterManager();
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

    this._createBaseDiamond();
    this._createScoreboard();
    this._createBatterPanel();
    this._createPitcherPanel();
    this._createResultDisplay();
    this._createButtons();
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
    this.scoreText.setText(`YOU ${s.playerScore}  -  ${s.opponentScore} OPP`);
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

    // "AT BAT" header
    this.add.text(BATTER_X, 95, 'AT BAT', {
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
    this.batterNumText.setText(`#${idx + 1} in lineup`);

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

    // Entrance tween
    this.tweens.add({
      targets: this.batterNameText,
      x: { from: BATTER_X - 40, to: BATTER_X },
      alpha: { from: 0, to: 1 },
      duration: 300,
      ease: 'Quad.easeOut',
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

    // Stats
    this.pitcherVelText = this.add.text(PITCHER_X - 70, 155, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8a65',
    }).setDepth(2);
    this.pitcherCtlText = this.add.text(PITCHER_X - 70, 175, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#64b5f6',
    }).setDepth(2);
    this.pitcherStaText = this.add.text(PITCHER_X - 70, 195, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
    }).setDepth(2);

    // Divider
    this.add.rectangle(PITCHER_X, 220, PANEL_W - 30, 1, 0x8b0000, 0.5);

    // "TRAITS" label
    this.pitcherTraitLabel = this.add.text(PITCHER_X, 232, 'TRAITS', {
      fontSize: '11px', fontFamily: 'monospace', color: '#e53935',
    }).setOrigin(0.5).setDepth(2);
  }

  _updatePitcherPanel() {
    const pitcher = this.rosterManager.getCurrentPitcher();

    this.pitcherNameText.setText(pitcher.name);
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
        const sprites = this._createTraitMiniCard(PITCHER_X, 255 + i * 75, trait, true);
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
    const cx = 640, cy = 175;
    const r = 50;
    this.basePositions = [
      { x: cx + r, y: cy },       // 1st base
      { x: cx, y: cy - r },       // 2nd base
      { x: cx - r, y: cy },       // 3rd base
    ];

    const gfx = this.add.graphics();
    gfx.lineStyle(2, 0xffffff, 0.4);
    gfx.beginPath();
    gfx.moveTo(cx, cy + r);
    gfx.lineTo(cx + r, cy);
    gfx.lineTo(cx, cy - r);
    gfx.lineTo(cx - r, cy);
    gfx.closePath();
    gfx.strokePath();

    this.add.circle(cx, cy + r, 6, 0xffffff, 0.6);

    for (let i = 0; i < 3; i++) {
      const bp = this.basePositions[i];
      const base = this.add.circle(bp.x, bp.y, 8, 0x666666);
      this.baseGraphics.push(base);
    }
  }

  _updateBases(bases) {
    for (let i = 0; i < 3; i++) {
      const occupied = bases[i];
      this.baseGraphics[i].setFillStyle(occupied ? 0xffd600 : 0x666666);
      if (occupied) {
        this.tweens.add({
          targets: this.baseGraphics[i],
          scale: { from: 1.4, to: 1 },
          duration: 300,
          ease: 'Back.easeOut',
        });
      }
    }
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
  }

  _renderHand() {
    this._clearCards();

    const hand = this.cardEngine.hand;
    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const x = HAND_START_X + i * CARD_SPACING;
      this._createCardSprite(card, x, HAND_Y, i);
    }
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

  _toggleSelect(index) {
    const cs = this.cardSprites[index];
    const lift = 20;

    if (this.selectedIndices.has(index)) {
      this.selectedIndices.delete(index);
      cs.glow.setAlpha(0);
      this.tweens.add({ targets: cs.bg,       y: cs.y,      duration: 120, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.rankText,  y: cs.rankY,  duration: 120, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.suitText,  y: cs.suitY,  duration: 120, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.glow,      y: cs.y,      duration: 120, ease: 'Back.easeOut' });
    } else {
      this.selectedIndices.add(index);
      cs.glow.setAlpha(0.7);
      this.tweens.add({ targets: cs.bg,       y: cs.y - lift,      duration: 120, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.rankText,  y: cs.rankY - lift,  duration: 120, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.suitText,  y: cs.suitY - lift,  duration: 120, ease: 'Back.easeOut' });
      this.tweens.add({ targets: cs.glow,      y: cs.y - lift,      duration: 120, ease: 'Back.easeOut' });
    }
  }

  // ── Game Flow ─────────────────────────────────────────

  _startAtBat() {
    this.resultText.setText('');
    this.handNameText.setText('');
    this.cardEngine.newAtBat();
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

    const indices = [...this.selectedIndices];
    indices.forEach(idx => {
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
      this.cardEngine.discard(indices);
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

    const selectedArr = [...this.selectedIndices].sort((a, b) => a - b);
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
      // Compare to detect changes
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

    // Wrap pitcher post to detect changes
    const trackingPostMod = (batterPostMod || pitcherPostMod) ? (result, gs) => {
      let r = result;
      if (pitcherPostMod) {
        const before = { ...r };
        r = pitcherPostMod(r, gs);
        // Detect meaningful changes
        const effects = [];
        if (r.outcome !== before.outcome) effects.push(`${before.outcome}\u2192${r.outcome}`);
        if (r.mult < before.mult) effects.push(`-${(before.mult - r.mult).toFixed(1)} mult`);
        if (r.chips < before.chips) effects.push(`-${before.chips - r.chips} chips`);
        if (r.mult > before.mult) effects.push(`+${(r.mult - before.mult).toFixed(1)} mult`);
        if (effects.length > 0) {
          const traitNames = pitcher.traits
            .filter(t => t.phase === 'pitcher_post')
            .map(t => t.name).join('/');
          pitcherPostMessage = `${traitNames}: ${effects.join(', ')}`;
        }
      }
      if (batterPostMod) r = batterPostMod(r, gs);
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

    // Apply stat modifiers
    handResult = this.rosterManager.applyBatterModifiers(handResult, gameState);
    handResult = this.rosterManager.applyPitcherModifiers(handResult, gameState);

    // Sacrifice fly
    let sacrificeFlyRun = 0;
    if (handResult.sacrificeFly) {
      sacrificeFlyRun = this.baseball.processSacrificeFly();
    }

    // ── Phase 0: Show pitcher trait activation if any ──
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

    // ── Phase 1: Announce the hand (after pitcher trait display) ──
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

    // Animate cards (immediately)
    this.cardSprites.forEach((cs, i) => {
      if (this.selectedIndices.has(i)) {
        this.tweens.add({
          targets: [cs.bg, cs.rankText, cs.suitText, cs.glow],
          x: 640, y: 360, alpha: 0, scale: 0.5,
          duration: 350, delay: i * 40, ease: 'Quad.easeIn',
        });
      } else {
        this.tweens.add({
          targets: [cs.bg, cs.rankText, cs.suitText, cs.glow],
          y: '+=40', alpha: 0,
          duration: 250, delay: 150, ease: 'Quad.easeIn',
        });
      }
    });

    // ── Phase 2: Resolve (extra delay if pitcher trait showed) ──
    this.time.delayedCall(900 + pitcherDelay, () => {
      const outcome = this.baseball.resolveOutcome(handResult.outcome, handResult.score);

      let extraBaseRun = 0;
      if (handResult.extraBaseChance && handResult.outcome !== 'Strikeout' && handResult.outcome !== 'Groundout' && handResult.outcome !== 'Flyout') {
        extraBaseRun = this.baseball.tryExtraBase(handResult.extraBaseChance);
      }

      this._clearCards();

      let desc = outcome.description;
      if (sacrificeFlyRun > 0) desc += ` Sac fly scores a run!`;
      if (extraBaseRun > 0) desc += ` Speed! Extra run!`;

      this.resultText.setText(desc);
      this.handNameText.setText(`${handResult.handName} \u2022 ${handResult.chips} chips x${handResult.mult}`);

      if (handResult.outcome === 'Strikeout' || handResult.outcome === 'Groundout' || handResult.outcome === 'Flyout') {
        this.resultText.setColor('#ff8a80');
      } else {
        this.resultText.setColor('#69f0ae');
      }

      this.tweens.add({
        targets: this.resultText,
        scale: { from: 0.5, to: 1 }, alpha: { from: 0, to: 1 },
        duration: 400, ease: 'Back.easeOut',
      });
      this.tweens.add({
        targets: this.handNameText,
        alpha: { from: 0, to: 1 },
        duration: 300, delay: 200,
      });

      this._updateScoreboard();

      // Advance batter
      this.rosterManager.advanceBatter();
      this.time.delayedCall(600, () => {
        this._updateBatterPanel();
      });

      this.time.delayedCall(1500, () => {
        if (this.baseball.isGameOver()) {
          this._endGame();
          return;
        }
        if (this.baseball.state === 'SWITCH_SIDE') {
          this._doOpponentHalf();
          return;
        }
        this._startAtBat();
      });
    });
  }

  _doOpponentHalf() {
    this.inputLocked = true;
    this._setButtonsEnabled(false, false);
    this._clearCards();

    this.resultText.setColor('#ffffff');
    this.resultText.setText('Opponent batting...');
    this.handNameText.setText('');

    let dots = 0;
    const dotTimer = this.time.addEvent({
      delay: 300, repeat: 3,
      callback: () => {
        dots++;
        this.resultText.setText('Opponent batting' + '.'.repeat(dots));
      },
    });

    this.time.delayedCall(1400, () => {
      dotTimer.destroy();
      const switchResult = this.baseball.switchSide();

      this.resultText.setText(switchResult.description);
      this.resultText.setColor(switchResult.opponentRuns > 0 ? '#ff8a80' : '#69f0ae');

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
    const s = this.baseball.getStatus();
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0).setDepth(10);
    const inningLabel = this.add.text(640, 330, `Inning ${s.inning}`, {
      fontSize: '52px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    const scoreLabel = this.add.text(640, 390, `${s.playerScore} - ${s.opponentScore}`, {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    this.tweens.add({ targets: overlay, alpha: 0.85, duration: 300 });
    this.tweens.add({ targets: [inningLabel, scoreLabel], alpha: 1, duration: 300, delay: 150 });

    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: [overlay, inningLabel, scoreLabel],
        alpha: 0, duration: 400,
        onComplete: () => {
          overlay.destroy();
          inningLabel.destroy();
          scoreLabel.destroy();
          this._startAtBat();
        },
      });
    });
  }

  _endGame() {
    const result = this.baseball.getResult();
    this.scene.start('GameOverScene', result);
  }
}

/**
 * PackOpenScene.js - Card pack reward screen.
 * Shows face-down cards, player clicks to flip & reveal bonus players.
 * Pick one, then choose which roster slot to bench.
 *
 * Triggered from GameScene after a strong batting half:
 *   Bronze Pack: 2+ runs → pick 1 of 2
 *   Gold Pack:   4+ runs (or 25+ chip hand) → pick 1 of 3
 */

import BONUS_PLAYERS from '../../data/bonus_players.js';
import BATTER_TRAITS from '../../data/batter_traits.js';

const RARITY_COLORS = {
  common:   { fill: 0x4caf50, border: 0x66bb6a, label: '#81c784' },
  uncommon: { fill: 0x42a5f5, border: 0x64b5f6, label: '#90caf9' },
  rare:     { fill: 0xab47bc, border: 0xce93d8, label: '#ce93d8' },
};

export default class PackOpenScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PackOpenScene' });
  }

  init(data) {
    this.rosterManager = data.rosterManager;
    this.traitManager = data.traitManager;
    this.baseball = data.baseball;
    this.cardEngine = data.cardEngine;
    this.gameLogEntries = data.gameLogEntries || [];
    this.tier = data.tier || 'bronze'; // 'bronze' or 'gold'
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x0d1b2a);
    this.selectedPlayer = null;

    // Title
    const tierColor = this.tier === 'gold' ? '#ffd600' : '#cd7f32';
    const tierName = this.tier === 'gold' ? 'GOLD PACK' : 'BRONZE PACK';
    this.add.text(640, 40, tierName, {
      fontSize: '36px', fontFamily: 'monospace', color: tierColor, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(640, 75, 'Click a card to reveal, then pick your new player', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Generate pack contents
    this.packPlayers = this._generatePack();
    this.revealed = new Array(this.packPlayers.length).fill(false);
    this.cardElements = [];

    // Render face-down cards
    const count = this.packPlayers.length;
    const spacing = 280;
    const startX = 640 - (count - 1) * spacing / 2;

    this.packPlayers.forEach((player, i) => {
      const x = startX + i * spacing;
      this._createPackCard(player, x, 300, i);
    });

    // Skip button
    const skipBg = this.add.rectangle(640, 660, 160, 40, 0x555555, 0.8)
      .setStrokeStyle(2, 0x777777)
      .setInteractive({ useHandCursor: true });
    this.add.text(640, 660, 'SKIP', {
      fontSize: '18px', fontFamily: 'monospace', color: '#aaaaaa', fontStyle: 'bold',
    }).setOrigin(0.5);
    skipBg.on('pointerdown', () => this._exitToNext());
  }

  // ── Pack Generation ────────────────────────────────────

  _generatePack() {
    const count = this.tier === 'gold' ? 3 : 2;
    const owned = new Set(
      this.rosterManager.roster
        .filter(p => p.isBonus)
        .map(p => p.id)
    );

    const available = BONUS_PLAYERS.filter(bp => !owned.has(bp.id));
    if (available.length === 0) return [];

    const picks = [];

    if (this.tier === 'gold') {
      // Gold guarantees at least one rare
      const rares = available.filter(bp => bp.rarity === 'rare');
      if (rares.length > 0) {
        picks.push(rares[Math.floor(Math.random() * rares.length)]);
      }
    }

    // Fill remaining slots randomly (weighted by rarity)
    const weights = { common: 3, uncommon: 2, rare: 1 };
    const remaining = available.filter(bp => !picks.includes(bp));
    const weighted = remaining.flatMap(bp => Array(weights[bp.rarity] || 1).fill(bp));

    while (picks.length < count && weighted.length > 0) {
      const idx = Math.floor(Math.random() * weighted.length);
      const pick = weighted[idx];
      if (!picks.includes(pick)) {
        picks.push(pick);
      }
      // Remove all copies of this pick
      for (let j = weighted.length - 1; j >= 0; j--) {
        if (weighted[j] === pick) weighted.splice(j, 1);
      }
    }

    return picks;
  }

  // ── Card Rendering ─────────────────────────────────────

  _createPackCard(player, x, y, index) {
    const colors = RARITY_COLORS[player.rarity] || RARITY_COLORS.common;
    const cardW = 220;
    const cardH = 320;

    // Card back (face-down state)
    const back = this.add.rectangle(x, y, cardW, cardH, 0x1a3a4a)
      .setStrokeStyle(3, colors.border);
    const backLabel = this.add.text(x, y, '?', {
      fontSize: '60px', fontFamily: 'monospace', color: '#555555', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Make clickable to flip
    back.setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this._revealCard(index));

    // Card front (hidden until revealed)
    const front = this.add.container(x, y).setAlpha(0);

    const frontBg = this.add.rectangle(0, 0, cardW, cardH, 0x0d1b2a)
      .setStrokeStyle(3, colors.border);
    front.add(frontBg);

    // Rarity
    front.add(this.add.text(0, -135, player.rarity.toUpperCase(), {
      fontSize: '11px', fontFamily: 'monospace', color: colors.label, fontStyle: 'bold',
    }).setOrigin(0.5));

    // Name
    front.add(this.add.text(0, -108, player.name, {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: cardW - 20 },
    }).setOrigin(0.5));

    // Position
    front.add(this.add.text(0, -85, player.pos, {
      fontSize: '12px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0.5));

    // Stats
    front.add(this.add.text(0, -55, `PWR ${player.power}  CNT ${player.contact}  SPD ${player.speed}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ff8a65',
    }).setOrigin(0.5));

    // Bats
    front.add(this.add.text(0, -35, `Bats: ${player.bats === 'L' ? 'Left' : 'Right'}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5));

    // Separator
    front.add(this.add.rectangle(0, -18, cardW - 40, 1, 0x334455));

    // Innate trait
    const trait = BATTER_TRAITS.find(t => t.id === player.innateTraitId);
    const traitName = trait ? trait.name : player.innateTraitId;
    front.add(this.add.text(0, 0, `Trait: ${traitName}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#69f0ae', fontStyle: 'bold',
    }).setOrigin(0.5));

    const traitDesc = trait ? trait.description : '';
    front.add(this.add.text(0, 20, traitDesc, {
      fontSize: '10px', fontFamily: 'monospace', color: '#81c784',
      align: 'center', wordWrap: { width: cardW - 30 },
    }).setOrigin(0.5));

    // Separator
    front.add(this.add.rectangle(0, 45, cardW - 40, 1, 0x334455));

    // Lineup effect
    front.add(this.add.text(0, 65, 'LINEUP EFFECT', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffab40', fontStyle: 'bold',
    }).setOrigin(0.5));
    front.add(this.add.text(0, 85, player.lineupDescription, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffe082',
      align: 'center', wordWrap: { width: cardW - 30 },
    }).setOrigin(0.5));

    // Pick button (shown after reveal)
    const pickBg = this.add.rectangle(0, 130, 100, 34, 0x2e7d32, 0.9)
      .setStrokeStyle(2, 0x4caf50)
      .setInteractive({ useHandCursor: true });
    const pickText = this.add.text(0, 130, 'PICK', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    pickBg.on('pointerdown', () => this._pickPlayer(index));
    front.add(pickBg);
    front.add(pickText);

    this.cardElements.push({ back, backLabel, front, x, y, player });
  }

  _revealCard(index) {
    if (this.revealed[index]) return;
    this.revealed[index] = true;

    const el = this.cardElements[index];

    // Flip animation: shrink back, show front
    this.tweens.add({
      targets: [el.back, el.backLabel],
      scaleX: 0,
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => {
        el.back.setVisible(false);
        el.backLabel.setVisible(false);
        el.front.setAlpha(1).setScale(0, 1);
        this.tweens.add({
          targets: el.front,
          scaleX: 1,
          duration: 200,
          ease: 'Back.easeOut',
        });
      },
    });
  }

  // ── Player Selection ───────────────────────────────────

  _pickPlayer(index) {
    this.selectedPlayer = this.packPlayers[index];
    this._showRosterPicker();
  }

  _showRosterPicker() {
    // Overlay
    this.pickerOverlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.9)
      .setDepth(10).setInteractive();

    const title = this.add.text(640, 50, `Bench a player for ${this.selectedPlayer.name}`, {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    this.add.text(640, 80, 'The benched player is gone for the rest of the run', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff8a80',
    }).setOrigin(0.5).setDepth(11);

    const roster = this.rosterManager.getRoster();
    const startY = 115;
    const rowH = 56;

    roster.forEach((player, i) => {
      const y = startY + i * rowH;
      const isBonus = player.isBonus;
      const canBench = !isBonus; // Can't bench another bonus player

      const rowBg = this.add.rectangle(640, y, 700, 48, canBench ? 0x1a3a2a : 0x2a1a1a, 0.8)
        .setStrokeStyle(1, canBench ? 0x4caf50 : 0x555555)
        .setDepth(11);

      const nameStr = `${i + 1}. ${player.name}${isBonus ? ' (BONUS)' : ''}`;
      const statsStr = `PWR:${player.power} CNT:${player.contact} SPD:${player.speed}`;
      const traitStr = player.traits.length > 0
        ? player.traits.map(t => t.name).join(', ')
        : '(no traits)';

      this.add.text(310, y - 8, nameStr, {
        fontSize: '15px', fontFamily: 'monospace',
        color: isBonus ? '#ffab40' : '#ffffff', fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(12);

      this.add.text(580, y - 8, statsStr, {
        fontSize: '12px', fontFamily: 'monospace', color: '#81c784',
      }).setDepth(12);

      this.add.text(750, y + 4, traitStr, {
        fontSize: '10px', fontFamily: 'monospace', color: '#aaaaaa',
      }).setDepth(12);

      if (canBench) {
        rowBg.setInteractive({ useHandCursor: true });
        rowBg.on('pointerover', () => rowBg.setFillStyle(0x2a5a3a, 0.9));
        rowBg.on('pointerout', () => rowBg.setFillStyle(0x1a3a2a, 0.8));
        rowBg.on('pointerdown', () => this._confirmBench(i));
      }
    });

    // Cancel button
    const cancelY = startY + 9 * rowH + 15;
    const cancelBg = this.add.rectangle(640, cancelY, 140, 38, 0x8b0000)
      .setInteractive({ useHandCursor: true }).setDepth(11);
    this.add.text(640, cancelY, 'CANCEL', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(12);
    cancelBg.on('pointerdown', () => {
      this.selectedPlayer = null;
      this.scene.restart({
        rosterManager: this.rosterManager,
        traitManager: this.traitManager,
        baseball: this.baseball,
        cardEngine: this.cardEngine,
        gameLogEntries: this.gameLogEntries,
        tier: this.tier,
      });
    });
  }

  _confirmBench(replaceIndex) {
    const player = this.rosterManager.getRoster()[replaceIndex];
    const bonus = this.selectedPlayer;

    this.rosterManager.addBonusPlayer(bonus, replaceIndex);

    // Confirmation flash
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.85).setDepth(20);
    const text = this.add.text(640, 320,
      `${player.name} benched!\n${bonus.name} joins the lineup!`, {
        fontSize: '26px', fontFamily: 'monospace', color: '#69f0ae',
        fontStyle: 'bold', align: 'center',
      }).setOrigin(0.5).setDepth(21);

    const effectText = this.add.text(640, 400, bonus.lineupDescription, {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffe082',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    this.tweens.add({
      targets: [text, effectText],
      scale: { from: 0.5, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(2000, () => {
      overlay.destroy();
      text.destroy();
      effectText.destroy();
      this._exitToNext();
    });
  }

  // ── Exit ───────────────────────────────────────────────

  _exitToNext() {
    // Always go to pitching next — shop is handled by PitchingScene after opponent half
    this.scene.start('PitchingScene', {
      rosterManager: this.rosterManager,
      baseball: this.baseball,
      traitManager: this.traitManager,
      cardEngine: this.cardEngine,
      gameLogEntries: this.gameLogEntries,
    });
  }
}

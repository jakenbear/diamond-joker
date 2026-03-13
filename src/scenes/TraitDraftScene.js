/**
 * TraitDraftScene.js - Pre-game innate trait selection
 * Each batter picks 1 of 2 archetype-matched traits before inning 1.
 */

import BATTER_TRAITS from '../../data/batter_traits.js';

const RARITY_COLORS = {
  common:   { fill: '#81c784', bg: 0x1a2a3a },
  uncommon: { fill: '#64b5f6', bg: 0x1a2a3a },
  rare:     { fill: '#ce93d8', bg: 0x1a2a3a },
};

export default class TraitDraftScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TraitDraftScene' });
  }

  init(data) {
    this.team = data.team;
    this.pitcherIndex = data.pitcherIndex;
    this.opponentTeam = data.opponentTeam;
    this.deckId = data.deckId || 'standard';
    this.picks = new Array(9).fill(null);
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x0d1b2a);

    // Title
    this.add.text(640, 28, 'DRAFT STARTING TRAITS', {
      fontSize: '32px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(640, 56, `${this.team.name} ${this.team.nickname} — pick one trait per batter`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    this._rowButtons = [];
    const startY = 88;
    const rowH = 60;

    this.team.batters.forEach((batter, i) => {
      const y = startY + i * rowH;
      this._createBatterRow(batter, i, y);
    });

    this._createConfirmButton();
  }

  _createBatterRow(batter, index, y) {
    // Row background
    this.add.rectangle(640, y, 1220, 52, 0x111d2a, 0.6)
      .setStrokeStyle(1, 0x222d3a);

    // Player number and name
    this.add.text(40, y, `${index + 1}.`, {
      fontSize: '15px', fontFamily: 'monospace', color: '#666666', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(62, y - 7, batter.name, {
      fontSize: '15px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // Position and stats
    this.add.text(62, y + 10, `${batter.pos}  P:${batter.power} C:${batter.contact} S:${batter.speed}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0, 0.5);

    // Two trait buttons
    const traitIds = batter.innateTraits;
    this._rowButtons[index] = [];

    traitIds.forEach((id, ti) => {
      const trait = BATTER_TRAITS.find(t => t.id === id);
      if (!trait) return;

      const tx = 560 + ti * 350;
      const colors = RARITY_COLORS[trait.rarity] || RARITY_COLORS.common;

      const bg = this.add.rectangle(tx, y, 330, 46, colors.bg)
        .setStrokeStyle(2, 0x334455)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(tx, y - 9, trait.name, {
        fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      const rarityLabel = this.add.text(tx + 155, y - 9, trait.rarity[0].toUpperCase(), {
        fontSize: '10px', fontFamily: 'monospace', color: colors.fill,
      }).setOrigin(0.5);

      const desc = this.add.text(tx, y + 10, trait.description, {
        fontSize: '11px', fontFamily: 'monospace', color: '#999999',
        wordWrap: { width: 310 },
      }).setOrigin(0.5);

      bg.on('pointerover', () => {
        if (this.picks[index] !== ti) bg.setStrokeStyle(2, 0xffd600);
      });
      bg.on('pointerout', () => {
        if (this.picks[index] !== ti) bg.setStrokeStyle(2, 0x334455);
      });
      bg.on('pointerdown', () => {
        this.picks[index] = ti;
        this._refreshHighlights();
      });

      this._rowButtons[index][ti] = { bg, label, desc, rarityLabel };
    });
  }

  _refreshHighlights() {
    this._rowButtons.forEach((row, i) => {
      row.forEach((btn, ti) => {
        const selected = this.picks[i] === ti;
        btn.bg.setStrokeStyle(2, selected ? 0x4caf50 : 0x334455);
        btn.bg.setFillStyle(selected ? 0x1a3a2a : 0x1a2a3a);
        btn.label.setColor(selected ? '#69f0ae' : '#ffffff');
      });
    });

    // Enable/disable confirm button
    const allPicked = this.picks.every(p => p !== null);
    if (this._confirmBg) {
      this._confirmBg.setFillStyle(allPicked ? 0x2e7d32 : 0x444444);
      this._confirmBg.setStrokeStyle(2, allPicked ? 0x4caf50 : 0x555555);
      this._confirmTxt.setColor(allPicked ? '#ffffff' : '#666666');
    }
  }

  _createConfirmButton() {
    this._confirmBg = this.add.rectangle(640, 658, 260, 48, 0x444444)
      .setStrokeStyle(2, 0x555555)
      .setInteractive({ useHandCursor: true });
    this._confirmTxt = this.add.text(640, 658, 'CONFIRM LINEUP', {
      fontSize: '22px', fontFamily: 'monospace', color: '#666666', fontStyle: 'bold',
    }).setOrigin(0.5);

    this._confirmBg.on('pointerdown', () => {
      if (!this.picks.every(p => p !== null)) return;
      this._startGame();
    });
  }

  _startGame() {
    // Build array of picked trait objects (one per batter)
    const pickedTraits = this.team.batters.map((batter, i) => {
      const traitId = batter.innateTraits[this.picks[i]];
      return BATTER_TRAITS.find(t => t.id === traitId);
    });

    this.scene.start('GameScene', {
      team: this.team,
      pitcherIndex: this.pitcherIndex,
      opponentTeam: this.opponentTeam,
      deckId: this.deckId,
      innateTraits: pickedTraits,
    });
  }
}

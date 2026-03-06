/**
 * ShopScene.js - Between-innings trait card shop
 * Buy trait cards and assign them to specific roster players.
 */

const RARITY_COLORS = {
  common:   { fill: 0x4caf50, border: 0x66bb6a, label: '#81c784' },
  uncommon: { fill: 0x42a5f5, border: 0x64b5f6, label: '#90caf9' },
  rare:     { fill: 0xab47bc, border: 0xce93d8, label: '#ce93d8' },
};

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  init(data) {
    this.rosterManager = data.rosterManager;
    this.traitManager = data.traitManager;
    this.baseball = data.baseball;
    this.cardEngine = data.cardEngine;
    this.gameLogEntries = data.gameLogEntries || [];
    this.purchasesMade = data.purchasesMade || 0;
  }

  create() {
    this.buyLimit = this.baseball.getShopBuyLimit();
    this.shopCards = this.traitManager.getShopSelection(3);
    this.selectedCard = null;
    this.uiElements = [];

    this.add.rectangle(640, 360, 1280, 720, 0x0d1b2a);

    // Title
    this.add.text(640, 40, 'DUGOUT SHOP', {
      fontSize: '42px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Chip balance + buy limit
    const buysLeft = this.buyLimit - this.purchasesMade;
    this.chipText = this.add.text(640, 85,
      `Chips: ${this.baseball.getTotalChips()}  |  Buys left: ${buysLeft}`, {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd600',
    }).setOrigin(0.5);

    // Decorative line
    this.add.rectangle(640, 110, 600, 2, 0x334455);

    this._renderShopCards();
    this._createDoneButton();
  }

  _renderShopCards() {
    const startX = 640 - (this.shopCards.length - 1) * 170;
    const buysLeft = this.buyLimit - this.purchasesMade;

    this.shopCards.forEach((card, i) => {
      const x = startX + i * 340;
      const y = 300;
      this._createTraitCard(card, x, y, buysLeft);
    });
  }

  _createTraitCard(trait, x, y, buysLeft) {
    const colors = RARITY_COLORS[trait.rarity] || RARITY_COLORS.common;
    const canAfford = this.baseball.getTotalChips() >= trait.price && buysLeft > 0;

    // Card border (rarity color)
    const border = this.add.rectangle(x, y, 260, 300, colors.border, 0.3)
      .setStrokeStyle(3, colors.border);

    // Card background
    const bg = this.add.rectangle(x, y, 250, 290, 0x1a2a3a);

    // Rarity label
    this.add.text(x, y - 120, trait.rarity.toUpperCase(), {
      fontSize: '12px', fontFamily: 'monospace', color: colors.label, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Name
    this.add.text(x, y - 85, trait.name, {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Description
    this.add.text(x, y - 20, trait.description, {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaaaaa',
      align: 'center', wordWrap: { width: 220 },
    }).setOrigin(0.5);

    // Phase indicator
    const phaseLabel = trait.phase === 'pre' ? 'PRE-EVAL' : 'POST-EVAL';
    const phaseColor = trait.phase === 'pre' ? '#ffab40' : '#80cbc4';
    this.add.text(x, y + 40, phaseLabel, {
      fontSize: '12px', fontFamily: 'monospace', color: phaseColor,
    }).setOrigin(0.5);

    // Price
    const priceColor = canAfford ? '#ffd600' : '#ff5252';
    const priceNote = buysLeft <= 0 ? '(no buys left)' : `${trait.price} chips`;
    this.add.text(x, y + 80, priceNote, {
      fontSize: '18px', fontFamily: 'monospace', color: priceColor, fontStyle: 'bold',
    }).setOrigin(0.5);

    // BUY button
    const btnColor = canAfford ? 0x2e7d32 : 0x555555;
    const buyBg = this.add.rectangle(x, y + 120, 120, 40, btnColor, 0.9)
      .setStrokeStyle(2, canAfford ? 0x4caf50 : 0x666666);
    const buyTxt = this.add.text(x, y + 120, 'BUY', {
      fontSize: '18px', fontFamily: 'monospace', color: canAfford ? '#ffffff' : '#888888', fontStyle: 'bold',
    }).setOrigin(0.5);

    if (canAfford) {
      buyBg.setInteractive({ useHandCursor: true });
      buyBg.on('pointerover', () => buyBg.setAlpha(1));
      buyBg.on('pointerout', () => buyBg.setAlpha(0.9));
      buyBg.on('pointerdown', () => {
        this.selectedCard = trait;
        this._showRosterPicker();
      });
    }

    this.uiElements.push(border, bg, buyBg, buyTxt);
  }

  _showRosterPicker() {
    // Dark overlay
    this.pickerOverlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.85)
      .setDepth(10)
      .setInteractive(); // Block clicks behind

    this.pickerElements = [this.pickerOverlay];

    const title = this.add.text(640, 60, `Assign "${this.selectedCard.name}" to:`, {
      fontSize: '24px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);
    this.pickerElements.push(title);

    const roster = this.rosterManager.getRoster();
    const currentIdx = this.rosterManager.getCurrentBatterIndex();
    const startY = 120;
    const rowH = 58;

    roster.forEach((player, i) => {
      const y = startY + i * rowH;
      const canEquip = player.traits.length < 2;
      const isNext = i === currentIdx;

      // Row background
      const rowBg = this.add.rectangle(640, y, 700, 50, canEquip ? 0x1a3a2a : 0x2a1a1a, 0.8)
        .setStrokeStyle(1, isNext ? 0x69f0ae : (canEquip ? 0x4caf50 : 0x555555))
        .setDepth(11);

      // Due-up arrow
      if (isNext) {
        this.add.text(298, y - 8, '\u25B6', {
          fontSize: '14px', fontFamily: 'monospace', color: '#69f0ae',
        }).setDepth(12);
        this.add.text(298, y + 8, 'DUE UP', {
          fontSize: '8px', fontFamily: 'monospace', color: '#69f0ae',
        }).setDepth(12);
      }

      // Player name and stats
      const nameStr = `${i + 1}. ${player.name}`;
      const statsStr = `PWR:${player.power} CNT:${player.contact} SPD:${player.speed}`;
      const traitStr = player.traits.length > 0
        ? player.traits.map(t => t.name).join(', ')
        : '(no traits)';

      this.add.text(320, y - 8, nameStr, {
        fontSize: '16px', fontFamily: 'monospace',
        color: isNext ? '#69f0ae' : '#ffffff',
        fontStyle: 'bold',
      }).setDepth(12);
      this.pickerElements.push(rowBg);

      this.add.text(580, y - 8, statsStr, {
        fontSize: '13px', fontFamily: 'monospace', color: '#81c784',
      }).setDepth(12);

      const traitColor = player.traits.length >= 2 ? '#ff5252' : '#aaaaaa';
      this.add.text(780, y - 8, `[${player.traits.length}/2] ${traitStr}`, {
        fontSize: '13px', fontFamily: 'monospace', color: traitColor,
      }).setDepth(12);

      if (canEquip) {
        rowBg.setInteractive({ useHandCursor: true });
        rowBg.on('pointerover', () => rowBg.setFillStyle(0x2a5a3a, 0.9));
        rowBg.on('pointerout', () => rowBg.setFillStyle(0x1a3a2a, 0.8));
        rowBg.on('pointerdown', () => this._confirmAssign(i));
      }
    });

    // Cancel button
    const cancelBg = this.add.rectangle(640, startY + 9 * rowH + 20, 140, 40, 0x8b0000)
      .setInteractive({ useHandCursor: true })
      .setDepth(11);
    this.add.text(640, startY + 9 * rowH + 20, 'CANCEL', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(12);
    cancelBg.on('pointerdown', () => this._closeRosterPicker());
    this.pickerElements.push(cancelBg);
  }

  _confirmAssign(playerIndex) {
    const player = this.rosterManager.getRoster()[playerIndex];
    const trait = this.selectedCard;

    // Spend chips
    if (!this.baseball.spendChips(trait.price)) return;

    // Equip trait
    this.rosterManager.equipTrait(playerIndex, trait);
    this.traitManager.markOwned(trait.id);
    this.purchasesMade++;

    // Show confirmation flash
    this._closeRosterPicker();

    // Brief confirmation overlay
    const confirmOverlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.8).setDepth(20);
    const confirmText = this.add.text(640, 340,
      `${player.name} equipped\n"${trait.name}"!`, {
        fontSize: '28px', fontFamily: 'monospace', color: '#69f0ae',
        fontStyle: 'bold', align: 'center',
      }).setOrigin(0.5).setDepth(21);

    this.tweens.add({
      targets: confirmText,
      scale: { from: 0.5, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(1200, () => {
      confirmOverlay.destroy();
      confirmText.destroy();
      // If at buy limit, auto-exit. Otherwise refresh shop.
      if (this.purchasesMade >= this.buyLimit) {
        this._exitShop();
      } else {
        // Restart scene to refresh cards and counts
        this.scene.restart({
          rosterManager: this.rosterManager,
          traitManager: this.traitManager,
          baseball: this.baseball,
          cardEngine: this.cardEngine,
          purchasesMade: this.purchasesMade,
        });
      }
    });
  }

  _closeRosterPicker() {
    if (this.pickerOverlay) {
      this.pickerOverlay.destroy();
      this.pickerOverlay = null;
    }
    // Restart scene to refresh
    this.scene.restart({
      rosterManager: this.rosterManager,
      traitManager: this.traitManager,
      baseball: this.baseball,
      cardEngine: this.cardEngine,
      purchasesMade: this.purchasesMade,
    });
  }

  _createDoneButton() {
    const doneBg = this.add.rectangle(640, 640, 200, 50, 0x37474f, 0.9)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x546e7a);
    this.add.text(640, 640, 'DONE', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    doneBg.on('pointerover', () => doneBg.setAlpha(1));
    doneBg.on('pointerout', () => doneBg.setAlpha(0.9));
    doneBg.on('pointerdown', () => this._exitShop());
  }

  _exitShop() {
    this.baseball.markShopVisited();
    this.scene.start('GameScene', {
      rosterManager: this.rosterManager,
      traitManager: this.traitManager,
      baseball: this.baseball,
      cardEngine: this.cardEngine,
      gameLogEntries: this.gameLogEntries,
      fromShop: true,
    });
  }
}

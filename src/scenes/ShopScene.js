/**
 * ShopScene.js - Between-innings shop with two tabs:
 * 1. TRAITS — buy trait cards, assign to roster players (uses buy limit)
 * 2. STAFF — buy coaches & mascots for staff slots (separate economy)
 */

import COACHES from '../../data/coaches.js';
import MASCOTS from '../../data/mascots.js';
import SynergyEngine from '../SynergyEngine.js';

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
    this.activeTab = data.activeTab || 'traits';
  }

  create() {
    this.buyLimit = this.baseball.getShopBuyLimit();
    this.selectedCard = null;
    this.uiElements = [];

    this.add.rectangle(640, 360, 1280, 720, 0x0d1b2a);

    // Title
    this.add.text(640, 30, 'DUGOUT SHOP', {
      fontSize: '38px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Chip balance
    this.add.text(640, 65,
      `Chips: ${this.baseball.getTotalChips()}`, {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffd600',
    }).setOrigin(0.5);

    // Tab buttons
    this._createTabs();

    // Decorative line
    this.add.rectangle(640, 110, 900, 2, 0x334455);

    // Render active tab content
    if (this.activeTab === 'traits') {
      this._renderTraitsTab();
    } else if (this.activeTab === 'staff') {
      this._renderStaffTab();
    } else {
      this._renderSynergiesTab();
    }

    this._createDoneButton();
  }

  // ── Tabs ──────────────────────────────────────────────

  _createTabs() {
    const tabs = [
      { key: 'traits', label: 'TRAITS', x: 440 },
      { key: 'staff', label: 'STAFF', x: 640 },
      { key: 'synergies', label: 'SYNERGIES', x: 840 },
    ];

    tabs.forEach(tab => {
      const isActive = this.activeTab === tab.key;
      const bg = this.add.rectangle(tab.x, 90, 160, 32, isActive ? 0x2e7d32 : 0x222222)
        .setStrokeStyle(2, isActive ? 0x4caf50 : 0x444444)
        .setInteractive({ useHandCursor: true });

      this.add.text(tab.x, 90, tab.label, {
        fontSize: '16px', fontFamily: 'monospace',
        color: isActive ? '#ffffff' : '#888888', fontStyle: 'bold',
      }).setOrigin(0.5);

      if (!isActive) {
        bg.on('pointerdown', () => {
          this.scene.restart({
            rosterManager: this.rosterManager,
            traitManager: this.traitManager,
            baseball: this.baseball,
            cardEngine: this.cardEngine,
            gameLogEntries: this.gameLogEntries,
            purchasesMade: this.purchasesMade,
            activeTab: tab.key,
          });
        });
      }
    });
  }

  // ── Traits Tab (existing behavior) ────────────────────

  _renderTraitsTab() {
    const buysLeft = this.buyLimit - this.purchasesMade;
    this.add.text(640, 128,
      `Buys left: ${buysLeft}`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Get shop selection (Scout coach gives +1 card)
    const extraCards = this.baseball.getStaffByEffect('shop_extra_cards')
      .reduce((sum, s) => sum + s.effect.value, 0);
    this.shopCards = this.traitManager.getShopSelection(3 + extraCards);

    const startX = 640 - (this.shopCards.length - 1) * 150;
    this.shopCards.forEach((card, i) => {
      const x = startX + i * 300;
      this._createTraitCard(card, x, 310, buysLeft);
    });
  }

  _createTraitCard(trait, x, y, buysLeft) {
    const colors = RARITY_COLORS[trait.rarity] || RARITY_COLORS.common;
    const canAfford = this.baseball.getTotalChips() >= trait.price && buysLeft > 0;

    const border = this.add.rectangle(x, y, 240, 280, colors.border, 0.3)
      .setStrokeStyle(3, colors.border);
    const bg = this.add.rectangle(x, y, 230, 270, 0x1a2a3a);

    this.add.text(x, y - 110, trait.rarity.toUpperCase(), {
      fontSize: '11px', fontFamily: 'monospace', color: colors.label, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(x, y - 80, trait.name, {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(x, y - 20, trait.description, {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaaaaa',
      align: 'center', wordWrap: { width: 200 },
    }).setOrigin(0.5);

    const phaseLabel = trait.phase === 'pre' ? 'PRE-EVAL' : 'POST-EVAL';
    const phaseColor = trait.phase === 'pre' ? '#ffab40' : '#80cbc4';
    this.add.text(x, y + 35, phaseLabel, {
      fontSize: '11px', fontFamily: 'monospace', color: phaseColor,
    }).setOrigin(0.5);

    const priceColor = canAfford ? '#ffd600' : '#ff5252';
    const priceNote = buysLeft <= 0 ? '(no buys left)' : `${trait.price} chips`;
    this.add.text(x, y + 70, priceNote, {
      fontSize: '16px', fontFamily: 'monospace', color: priceColor, fontStyle: 'bold',
    }).setOrigin(0.5);

    const btnColor = canAfford ? 0x2e7d32 : 0x555555;
    const buyBg = this.add.rectangle(x, y + 108, 110, 36, btnColor, 0.9)
      .setStrokeStyle(2, canAfford ? 0x4caf50 : 0x666666);
    this.add.text(x, y + 108, 'BUY', {
      fontSize: '16px', fontFamily: 'monospace', color: canAfford ? '#ffffff' : '#888888', fontStyle: 'bold',
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

    this.uiElements.push(border, bg, buyBg);
  }

  // ── Staff Tab ─────────────────────────────────────────

  _renderStaffTab() {
    const staff = this.baseball.getStaff();
    const slotsUsed = staff.length;
    const slotsTotal = this.baseball.staffSlots;

    this.add.text(640, 128,
      `Staff: ${slotsUsed}/${slotsTotal} slots`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Available staff for purchase (mix coaches and mascots, exclude owned)
    const ownedIds = new Set(staff.map(s => s.id));
    const available = this._pickStaffSelection(ownedIds);

    // Render available staff cards
    const startX = 640 - (available.length - 1) * 150;
    available.forEach((item, i) => {
      const x = startX + i * 300;
      this._createStaffCard(item, x, 280, slotsUsed < slotsTotal);
    });

    // Current staff display at bottom
    if (staff.length > 0) {
      this.add.text(640, 450, 'ACTIVE STAFF', {
        fontSize: '16px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.rectangle(640, 452, 500, 2, 0x334455);

      staff.forEach((item, i) => {
        const y = 480 + i * 50;
        this._createActiveStaffRow(item, y);
      });
    }
  }

  _pickStaffSelection(ownedIds) {
    // Weighted random selection: 2 coaches + 1 mascot (or 1+2 randomly)
    const availableCoaches = COACHES.filter(c => !ownedIds.has(c.id));
    const availableMascots = MASCOTS.filter(m => !ownedIds.has(m.id));

    const picks = [];

    // Pick 1-2 coaches
    const coachCount = Math.min(2, availableCoaches.length);
    const shuffledCoaches = [...availableCoaches].sort(() => Math.random() - 0.5);
    for (let i = 0; i < coachCount; i++) picks.push(shuffledCoaches[i]);

    // Pick 1 mascot (weighted by rarity)
    if (availableMascots.length > 0) {
      const weights = { common: 3, uncommon: 2, rare: 1 };
      const weighted = availableMascots.flatMap(m =>
        Array(weights[m.rarity] || 1).fill(m)
      );
      picks.push(weighted[Math.floor(Math.random() * weighted.length)]);
    }

    return picks;
  }

  _createStaffCard(item, x, y, hasSlots) {
    const colors = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
    const canAfford = this.baseball.getTotalChips() >= item.price && hasSlots;
    const isCoach = item.category === 'coach';

    // Outer border (rarity colored)
    const border = this.add.rectangle(x, y, 240, 280, colors.border, 0.3)
      .setStrokeStyle(3, colors.border);
    const bg = this.add.rectangle(x, y, 230, 270, 0x1a2a3a);

    // Category badge + rarity
    const badgeColor = isCoach ? '#80cbc4' : '#ffab40';
    const badgeText = isCoach ? 'COACH' : 'MASCOT';
    this.add.text(x - 50, y - 120, badgeText, {
      fontSize: '10px', fontFamily: 'monospace', color: badgeColor, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.add.text(x + 50, y - 120, item.rarity.toUpperCase(), {
      fontSize: '10px', fontFamily: 'monospace', color: colors.label,
    }).setOrigin(1, 0.5);

    // Card art: blank card base with sprite overlay
    const cardScale = 2.5;  // 32×42 → 80×105
    const cardY = y - 55;
    if (this.textures.exists('card_blank')) {
      this.add.image(x, cardY, 'card_blank').setScale(cardScale).setDepth(1);
    }

    // Overlay: mascot animal or coach face
    if (!isCoach && item.spriteIndex !== undefined && this.textures.exists('mascots')) {
      this.add.image(x, cardY, 'mascots', item.spriteIndex)
        .setOrigin(0.5).setScale(0.9).setDepth(2);
    } else if (isCoach && item.faceIndex !== undefined && this.textures.exists('faces')) {
      this.add.image(x, cardY, 'faces', item.faceIndex)
        .setOrigin(0.5).setScale(0.7).setDepth(2);
    }

    // Name
    this.add.text(x, y + 10, item.name, {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Description
    this.add.text(x, y + 40, item.description, {
      fontSize: '11px', fontFamily: 'monospace', color: '#aaaaaa',
      align: 'center', wordWrap: { width: 200 },
    }).setOrigin(0.5);

    // Price
    const priceColor = canAfford ? '#ffd600' : '#ff5252';
    const priceNote = !hasSlots ? '(no slots)' : `${item.price} chips`;
    this.add.text(x, y + 75, priceNote, {
      fontSize: '14px', fontFamily: 'monospace', color: priceColor, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Buy button
    const btnColor = canAfford ? 0x2e7d32 : 0x555555;
    const buyBg = this.add.rectangle(x, y + 105, 110, 36, btnColor, 0.9)
      .setStrokeStyle(2, canAfford ? 0x4caf50 : 0x666666);
    this.add.text(x, y + 105, 'HIRE', {
      fontSize: '16px', fontFamily: 'monospace', color: canAfford ? '#ffffff' : '#888888', fontStyle: 'bold',
    }).setOrigin(0.5);

    if (canAfford) {
      buyBg.setInteractive({ useHandCursor: true });
      buyBg.on('pointerover', () => buyBg.setAlpha(1));
      buyBg.on('pointerout', () => buyBg.setAlpha(0.9));
      buyBg.on('pointerdown', () => this._buyStaff(item));
    }

    this.uiElements.push(border, bg, buyBg);
  }

  _createActiveStaffRow(item, y) {
    const isCoach = item.category === 'coach';
    const badgeColor = isCoach ? '#80cbc4' : '#ffab40';

    this.add.rectangle(640, y, 600, 40, 0x111d2a, 0.6)
      .setStrokeStyle(1, 0x222d3a);

    // Staff sprite: mascot animal or coach face
    if (!isCoach && item.spriteIndex !== undefined && this.textures.exists('mascots')) {
      this.add.image(360, y, 'mascots', item.spriteIndex)
        .setOrigin(0.5).setScale(0.4);
    } else if (isCoach && item.faceIndex !== undefined && this.textures.exists('faces')) {
      this.add.image(360, y, 'faces', item.faceIndex)
        .setOrigin(0.5).setScale(0.3);
    } else {
      this.add.text(360, y, isCoach ? 'C' : 'M', {
        fontSize: '14px', fontFamily: 'monospace', color: badgeColor, fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    this.add.text(390, y, item.name, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(650, y, item.description, {
      fontSize: '11px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0, 0.5);

    // Sell button (50% refund)
    const sellPrice = Math.floor(item.price / 2);
    const sellBg = this.add.rectangle(910, y, 80, 30, 0x8b0000, 0.8)
      .setStrokeStyle(1, 0xaa2222)
      .setInteractive({ useHandCursor: true });
    this.add.text(910, y, `SELL ${sellPrice}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ff8888', fontStyle: 'bold',
    }).setOrigin(0.5);

    sellBg.on('pointerdown', () => {
      this.baseball.removeStaff(item.id);
      this.baseball.totalChips += sellPrice;
      this._restartScene();
    });
  }

  _buyStaff(item) {
    if (!this.baseball.spendChips(item.price)) return;
    if (!this.baseball.addStaff(item)) {
      // Refund if slot add failed
      this.baseball.totalChips += item.price;
      return;
    }

    // Confirmation flash
    const confirmOverlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.8).setDepth(20);
    const isCoach = item.category === 'coach';
    const verb = isCoach ? 'Hired' : 'Adopted';
    const confirmText = this.add.text(640, 340,
      `${verb}\n"${item.name}"!`, {
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
      this._restartScene();
    });
  }

  // ── Roster Picker (traits only) ───────────────────────

  _showRosterPicker() {
    this.pickerOverlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.85)
      .setDepth(10)
      .setInteractive();

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

      const rowBg = this.add.rectangle(640, y, 700, 50, canEquip ? 0x1a3a2a : 0x2a1a1a, 0.8)
        .setStrokeStyle(1, isNext ? 0x69f0ae : (canEquip ? 0x4caf50 : 0x555555))
        .setDepth(11);

      if (isNext) {
        this.add.text(298, y - 8, '\u25B6', {
          fontSize: '14px', fontFamily: 'monospace', color: '#69f0ae',
        }).setDepth(12);
        this.add.text(298, y + 8, 'DUE UP', {
          fontSize: '8px', fontFamily: 'monospace', color: '#69f0ae',
        }).setDepth(12);
      }

      const nameStr = `${i + 1}. ${player.name}`;
      const statsStr = `PWR:${player.power} CNT:${player.contact} SPD:${player.speed}`;
      const traitStr = player.traits.length > 0
        ? player.traits.map(t => t.name).join(', ')
        : '(no traits)';

      this.add.text(320, y - 8, nameStr, {
        fontSize: '16px', fontFamily: 'monospace',
        color: isNext ? '#69f0ae' : '#ffffff', fontStyle: 'bold',
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

    const cancelBg = this.add.rectangle(640, startY + 9 * rowH + 20, 140, 40, 0x8b0000)
      .setInteractive({ useHandCursor: true })
      .setDepth(11);
    this.add.text(640, startY + 9 * rowH + 20, 'CANCEL', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(12);
    cancelBg.on('pointerdown', () => this._restartScene());
    this.pickerElements.push(cancelBg);
  }

  _confirmAssign(playerIndex) {
    const player = this.rosterManager.getRoster()[playerIndex];
    const trait = this.selectedCard;

    if (!this.baseball.spendChips(trait.price)) return;

    this.rosterManager.equipTrait(playerIndex, trait);
    this.traitManager.markOwned(trait.id);
    this.purchasesMade++;

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
      if (this.purchasesMade >= this.buyLimit) {
        this._exitShop();
      } else {
        this._restartScene();
      }
    });
  }

  // ── Synergies Tab ───────────────────────────────────────

  _renderSynergiesTab() {
    const roster = this.rosterManager.getRoster();
    const activeSynergies = SynergyEngine.calculate(roster);
    const activeIds = new Set(activeSynergies.map(s => s.id));
    const allSynergies = SynergyEngine.getAll();

    const activeCount = activeSynergies.length;
    this.add.text(640, 128,
      `Active: ${activeCount}/${allSynergies.length} synergies`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    const startY = 160;
    const rowH = 42;
    const colW = 580;

    allSynergies.forEach((syn, i) => {
      const isActive = activeIds.has(syn.id);
      const col = i < 7 ? 0 : 1;
      const row = i < 7 ? i : i - 7;
      const x = col === 0 ? 640 - colW / 2 - 10 : 640 + colW / 2 + 10;
      const y = startY + row * rowH;

      // Row background
      this.add.rectangle(x, y, colW, 36, isActive ? 0x1a3a2a : 0x1a1a2a, 0.7)
        .setStrokeStyle(1, isActive ? 0x4caf50 : 0x333344);

      // Status icon
      const icon = isActive ? '\u2713' : '\u2717';
      const iconColor = isActive ? '#69f0ae' : '#555555';
      this.add.text(x - colW / 2 + 15, y, icon, {
        fontSize: '16px', fontFamily: 'monospace', color: iconColor, fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      // Synergy name
      this.add.text(x - colW / 2 + 40, y - 6, syn.name, {
        fontSize: '13px', fontFamily: 'monospace',
        color: isActive ? '#ffffff' : '#888888', fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      // Description or hint
      const desc = isActive ? syn.bonusDescription : syn.hint;
      const descColor = isActive ? '#81c784' : '#666666';
      this.add.text(x - colW / 2 + 40, y + 8, desc, {
        fontSize: '10px', fontFamily: 'monospace', color: descColor,
      }).setOrigin(0, 0.5);

      // Requirement text (right side)
      if (isActive) {
        this.add.text(x + colW / 2 - 15, y, 'ACTIVE', {
          fontSize: '10px', fontFamily: 'monospace', color: '#69f0ae', fontStyle: 'bold',
        }).setOrigin(1, 0.5);
      }
    });
  }

  // ── Common ────────────────────────────────────────────

  _restartScene() {
    this.scene.restart({
      rosterManager: this.rosterManager,
      traitManager: this.traitManager,
      baseball: this.baseball,
      cardEngine: this.cardEngine,
      gameLogEntries: this.gameLogEntries,
      purchasesMade: this.purchasesMade,
      activeTab: this.activeTab,
    });
  }

  _createDoneButton() {
    const doneBg = this.add.rectangle(640, 680, 200, 46, 0x37474f, 0.9)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x546e7a);
    this.add.text(640, 680, 'DONE', {
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

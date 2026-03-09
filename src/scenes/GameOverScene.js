/**
 * GameOverScene.js - Results screen with box score + replay option
 */
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { playerScore, opponentScore, won, innings,
            yourTeam, opponentTeam,
            playerRunsByInning, opponentRunsByInning } = this.result;

    this.add.rectangle(640, 360, 1280, 720, 0x0d3311);

    // Result banner
    const bannerColor = won ? '#4caf50' : '#e53935';
    const bannerText = won ? 'VICTORY!' : 'DEFEAT';

    const banner = this.add.text(640, 70, bannerText, {
      fontSize: '64px', fontFamily: 'monospace', color: bannerColor, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 600,
      ease: 'Back.easeOut',
    });

    this.add.rectangle(640, 120, 400, 2, won ? 0x4caf50 : 0xe53935);

    // Team matchup header
    const yourLabel = yourTeam ? `${yourTeam.logo} ${yourTeam.name}` : 'YOU';
    const oppLabel = opponentTeam ? `${opponentTeam.logo} ${opponentTeam.name}` : 'OPP';

    this.add.text(640, 150, `${yourLabel}  vs  ${oppLabel}`, {
      fontSize: '22px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    // ── Box Score ──
    this._createBoxScore(640, 280,
      yourTeam ? yourTeam.id : 'YOU',
      opponentTeam ? opponentTeam.id : 'OPP',
      playerRunsByInning || [],
      opponentRunsByInning || [],
      playerScore, opponentScore, innings);

    // Final score big text
    const scoreDisplay = this.add.text(640, 410,
      `${playerScore}  -  ${opponentScore}`, {
      fontSize: '48px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: scoreDisplay,
      alpha: 1,
      scale: { from: 1.3, to: 1 },
      duration: 400,
      delay: 400,
      ease: 'Back.easeOut',
    });

    this.add.text(640, 455, `${innings} inning${innings !== 1 ? 's' : ''} played`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0.5);

    // Play Again button
    const btnBg = this.add.rectangle(640, 540, 240, 56, 0x2e7d32)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);
    const btnTxt = this.add.text(640, 540, 'PLAY AGAIN', {
      fontSize: '24px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [btnBg, btnTxt],
      alpha: 1,
      duration: 300,
      delay: 800,
    });

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x388e3c));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x2e7d32));
    btnBg.on('pointerdown', () => {
      this.scene.start('TitleScene');
    });

    this.add.text(640, 680, 'Aces Loaded! - A Card-Based Baseball Game', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5);
  }

  _createBoxScore(cx, cy, yourName, oppName, playerRuns, oppRuns, playerTotal, oppTotal, totalInnings) {
    const cellW = 36;
    const cellH = 30;
    const nameColW = 70;
    const totalColW = 44;
    const numInnings = Math.max(9, totalInnings - 1);
    const gridW = nameColW + numInnings * cellW + totalColW;
    const gridH = cellH * 3;
    const startX = cx - gridW / 2;
    const startY = cy - gridH / 2;

    // Background
    this.add.rectangle(cx, cy, gridW + 8, gridH + 8, 0x0a1f0d)
      .setStrokeStyle(2, 0x4caf50);

    // Header row
    const headerY = startY + cellH / 2;
    for (let i = 0; i < numInnings; i++) {
      this.add.text(startX + nameColW + i * cellW + cellW / 2, headerY, `${i + 1}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#4caf50',
      }).setOrigin(0.5);
    }

    this.add.text(startX + nameColW + numInnings * cellW + totalColW / 2, headerY, 'R', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(cx, startY + cellH, gridW - 4, 1, 0x4caf50, 0.5);

    // Your team row
    const yourY = startY + cellH + cellH / 2;
    this.add.text(startX + nameColW / 2, yourY, yourName, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    for (let i = 0; i < numInnings; i++) {
      const val = i < playerRuns.length ? `${playerRuns[i]}` : '-';
      const color = i < playerRuns.length ? '#cccccc' : '#333333';
      this.add.text(startX + nameColW + i * cellW + cellW / 2, yourY, val, {
        fontSize: '13px', fontFamily: 'monospace', color,
      }).setOrigin(0.5);
    }

    this.add.text(startX + nameColW + numInnings * cellW + totalColW / 2, yourY,
      `${playerTotal}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(cx, startY + cellH * 2, gridW - 4, 1, 0x333333, 0.5);

    // Opponent row
    const oppY = startY + cellH * 2 + cellH / 2;
    this.add.text(startX + nameColW / 2, oppY, oppName, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ff8a80', fontStyle: 'bold',
    }).setOrigin(0.5);

    for (let i = 0; i < numInnings; i++) {
      const val = i < oppRuns.length ? `${oppRuns[i]}` : '-';
      const color = i < oppRuns.length ? '#cccccc' : '#333333';
      this.add.text(startX + nameColW + i * cellW + cellW / 2, oppY, val, {
        fontSize: '13px', fontFamily: 'monospace', color,
      }).setOrigin(0.5);
    }

    this.add.text(startX + nameColW + numInnings * cellW + totalColW / 2, oppY,
      `${oppTotal}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8a80', fontStyle: 'bold',
    }).setOrigin(0.5);
  }
}

/**
 * GameOverScene.js - Results screen + replay option
 */
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { playerScore, opponentScore, won, innings } = this.result;

    this.add.rectangle(640, 360, 1280, 720, 0x0d3311);

    // Result banner with entrance animation
    const bannerColor = won ? '#4caf50' : '#e53935';
    const bannerText = won ? 'VICTORY!' : 'DEFEAT';

    const banner = this.add.text(640, 150, bannerText, {
      fontSize: '72px', fontFamily: 'monospace', color: bannerColor, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 600,
      ease: 'Back.easeOut',
    });

    // Decorative line
    const line = this.add.rectangle(640, 220, 400, 2, won ? 0x4caf50 : 0xe53935);

    // Score
    this.add.text(640, 270, 'Final Score', {
      fontSize: '22px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    const scoreDisplay = this.add.text(640, 320, `YOU ${playerScore}  -  ${opponentScore} OPP`, {
      fontSize: '44px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: scoreDisplay,
      alpha: 1,
      y: { from: 340, to: 320 },
      duration: 400,
      delay: 300,
    });

    this.add.text(640, 385, `${innings} inning${innings !== 1 ? 's' : ''} played`, {
      fontSize: '18px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0.5);

    // Play Again button with delayed appearance
    const btnBg = this.add.rectangle(640, 500, 240, 56, 0x2e7d32)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);
    const btnTxt = this.add.text(640, 500, 'PLAY AGAIN', {
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
      this.scene.start('GameScene');
    });

    // Credit line
    this.add.text(640, 680, 'Diamond Joker - A Balatro-style Baseball Card Game', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5);
  }
}

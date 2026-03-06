/**
 * TitleScene.js - Game title screen with PLAY BALL button
 */
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x0d3311);

    // Diamond shape decoration
    const diamond = this.add.graphics();
    diamond.lineStyle(3, 0xffd600, 0.3);
    diamond.beginPath();
    diamond.moveTo(640, 140);
    diamond.lineTo(760, 260);
    diamond.lineTo(640, 380);
    diamond.lineTo(520, 260);
    diamond.closePath();
    diamond.strokePath();

    // Logo: baseball + ace of spades
    const ball = this.add.text(610, 225, '\u26be', {
      fontSize: '45px', padding: { top: 5 },
    }).setOrigin(0.5).setAlpha(0).setDepth(2);

    const ace = this.add.text(670, 220, 'A\u2660', {
      fontSize: '50px', fontFamily: 'serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0).setDepth(2);

    this.tweens.add({
      targets: ball,
      alpha: 1,
      x: { from: 580, to: 610 },
      scale: { from: 0.5, to: 1 },
      duration: 600,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: ace,
      alpha: 1,
      x: { from: 700, to: 670 },
      scale: { from: 0.5, to: 1 },
      duration: 600,
      delay: 100,
      ease: 'Back.easeOut',
    });

    // Title
    const title = this.add.text(640, 290, 'ACES & BASES', {
      fontSize: '64px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      y: { from: 310, to: 290 },
      duration: 500,
      delay: 200,
    });

    // Subtitle
    const sub = this.add.text(640, 345, 'Poker Hands. Baseball Outcomes.', {
      fontSize: '18px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: sub,
      alpha: 1,
      duration: 400,
      delay: 500,
    });

    // Decorative line
    this.add.rectangle(640, 380, 500, 2, 0x4caf50, 0.4);

    // PLAY BALL button
    const btnW = 280;
    const btnH = 64;
    const btnY = 460;

    const btnBg = this.add.rectangle(640, btnY, btnW, btnH, 0x2e7d32)
      .setStrokeStyle(2, 0x4caf50)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const btnTxt = this.add.text(640, btnY, 'PLAY BALL', {
      fontSize: '32px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [btnBg, btnTxt],
      alpha: 1,
      duration: 400,
      delay: 800,
    });

    // Button hover
    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x388e3c);
      btnBg.setStrokeStyle(2, 0xffd600);
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x2e7d32);
      btnBg.setStrokeStyle(2, 0x4caf50);
    });
    btnBg.on('pointerdown', () => {
      this.scene.start('TeamSelectScene');
    });

    // Pulsing hint
    const hint = this.add.text(640, 530, '[ click to start ]', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: hint,
      alpha: { from: 0, to: 0.6 },
      duration: 1200,
      delay: 1200,
      yoyo: true,
      repeat: -1,
    });

    // Version / credit
    this.add.text(640, 690, 'v0.3', {
      fontSize: '12px', fontFamily: 'monospace', color: '#444444',
    }).setOrigin(0.5);
  }
}

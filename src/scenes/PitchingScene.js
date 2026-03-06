/**
 * PitchingScene.js - Opponent's half-inning (player pitches)
 * Extracted from GameScene to keep each scene focused.
 *
 * Receives game managers via scene data. When the half-inning ends,
 * transitions back to GameScene (or ShopScene / GameOverScene).
 */
import { PITCH_TYPES } from '../RosterManager.js';
import SoundManager from '../SoundManager.js';

const CARD_W = 100;
const CARD_H = 140;
const CARD_SPACING = 120;
const HAND_Y = 560;
const PANEL_W = 210;
const PITCHER_PANEL_X = 115;   // same as GameScene BATTER_X
const BATTER_PANEL_X = 1165;   // matches GameScene PITCHER_X

export default class PitchingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PitchingScene' });
  }

  init(data) {
    this.rosterManager = data.rosterManager;
    this.baseball = data.baseball;
    this.traitManager = data.traitManager;
    this.cardEngine = data.cardEngine;
    this.gameLogEntries = data.gameLogEntries || [];
  }

  create() {
    // Background - match GameScene's config background
    this.add.rectangle(640, 360, 1280, 720, 0x1b5e20);

    // Clean up on exit
    this.events.once('shutdown', () => {
      this.time.removeAllEvents();
      this.tweens.killAll();
    });

    this._createScoreboard();
    this._createBaseDiamond();
    this._createResultDisplay();
    this._createGameLog();
    this._createPitcherPanel();
    this._createBatterPanel();

    this._startPitching();
  }

  // ── Scoreboard (matches GameScene layout) ───────────────

  _createScoreboard() {
    this.add.rectangle(640, 25, 1280, 50, 0x0d3311).setDepth(7);

    this.inningText = this.add.text(PITCHER_PANEL_X + PANEL_W / 2 + 20, 10, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
    }).setDepth(8);

    this.scoreText = this.add.text(640, 8, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd600',
    }).setOrigin(0.5, 0).setDepth(8);

    this.outsText = this.add.text(BATTER_PANEL_X - PANEL_W / 2 - 20, 10, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ff8a80',
    }).setOrigin(1, 0).setDepth(8);

    this.chipBalanceText = this.add.text(640, 33, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffd600',
    }).setOrigin(0.5, 0).setDepth(8);

    this.youIndicator = this.add.text(0, 33, '(you)', {
      fontSize: '10px', fontFamily: 'monospace', color: '#69f0ae',
    }).setOrigin(0.5, 0).setDepth(8).setAlpha(0.7);

    this._updateScoreboard();
  }

  _updateScoreboard() {
    const s = this.baseball.getStatus();
    this.inningText.setText(`INN ${s.inning} ${s.half === 'top' ? '\u25b2' : '\u25bc'}`);
    const playerTeam = this.rosterManager.getTeam();
    const playerName = playerTeam ? playerTeam.id : 'YOU';
    const oppTeam = this.rosterManager.getOpponentTeam();
    const oppName = oppTeam ? oppTeam.id : 'OPP';
    this.scoreText.setText(`${playerName} ${s.playerScore}  -  ${s.opponentScore} ${oppName}`);
    this.chipBalanceText.setText(`Chips: ${s.totalChips}`);

    // Position "(you)" under player team name
    this.scoreText.updateText();
    const scoreLeft = this.scoreText.x - this.scoreText.width / 2;
    const measured = this.add.text(0, -100, playerName, {
      fontSize: '22px', fontFamily: 'monospace',
    });
    this.youIndicator.setX(scoreLeft + measured.width / 2);
    measured.destroy();

    const outDots = [];
    for (let i = 0; i < 3; i++) {
      outDots.push(i < s.outs ? '\u25cf' : '\u25cb');
    }
    this.outsText.setText(`Outs: ${outDots.join(' ')}`);
  }

  // ── Base Diamond ────────────────────────────────────────

  _createBaseDiamond() {
    const cx = 640, cy = 280;
    const size = 55;
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(2, 0x4caf50, 0.6);
    g.beginPath();
    g.moveTo(cx, cy - size);
    g.lineTo(cx + size, cy);
    g.lineTo(cx, cy + size);
    g.lineTo(cx - size, cy);
    g.closePath();
    g.strokePath();

    // Base positions: 1st (right), 2nd (top), 3rd (left)
    this.basePositions = [
      { x: cx + size, y: cy },
      { x: cx, y: cy - size },
      { x: cx - size, y: cy },
    ];
    this.runners = [null, null, null];
  }

  _updateBases(bases) {
    const cx = 640, cy = 280, size = 55;
    const homePos = { x: cx, y: cy + size };
    for (let i = 0; i < 3; i++) {
      const bp = this.basePositions[i];
      if (bases[i] && !this.runners[i]) {
        const fromPos = i === 0 ? homePos : this.basePositions[i - 1];
        const dot = this.add.circle(fromPos.x, fromPos.y, 7, 0xffd600).setDepth(3);
        this._spawnRunnerTrail(fromPos, bp);
        this.tweens.add({ targets: dot, x: bp.x, y: bp.y, duration: 300, ease: 'Quad.easeInOut' });
        this.tweens.add({
          targets: dot, alpha: { from: 1, to: 0.6 },
          duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        this.runners[i] = dot;
      } else if (!bases[i] && this.runners[i]) {
        const toPos = i === 2 ? homePos : this.basePositions[i + 1];
        this._spawnRunnerTrail(bp, toPos);
        const runnerRef = this.runners[i];
        this.tweens.add({
          targets: runnerRef, x: toPos.x, y: toPos.y, alpha: 0, duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => runnerRef.destroy(),
        });
        this.runners[i] = null;
      }
    }
  }

  _spawnRunnerTrail(from, to) {
    const steps = 5;
    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1);
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const dot = this.add.circle(x, y, 3, 0xffd600, 0.6).setDepth(2);
      this.tweens.add({
        targets: dot, alpha: 0, scale: 0.3,
        duration: 400, delay: s * 40,
        onComplete: () => dot.destroy(),
      });
    }
  }

  _showStrikeoutK() {
    const k = this.add.text(640, 280, 'K', {
      fontSize: '120px', fontFamily: 'monospace', color: '#ff5252', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(15).setAlpha(0);
    this.tweens.add({
      targets: k,
      alpha: { from: 0, to: 0.8 }, scale: { from: 2, to: 1 },
      duration: 300, ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: k, alpha: 0, scale: 0.8,
      duration: 400, delay: 500,
      onComplete: () => k.destroy(),
    });
  }

  _showScorePopup(text, color) {
    const popup = this.add.text(640, 260, text, {
      fontSize: '32px', fontFamily: 'monospace', color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(15).setAlpha(0);
    this.tweens.add({
      targets: popup,
      alpha: { from: 0, to: 1 }, y: 200, scale: { from: 1.5, to: 1 },
      duration: 400, ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: popup, alpha: 0, y: 160,
      duration: 500, delay: 800,
      onComplete: () => popup.destroy(),
    });
  }

  // ── Result Display ──────────────────────────────────────

  _createResultDisplay() {
    this.resultText = this.add.text(640, 370, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: 600 },
    }).setOrigin(0.5).setDepth(3);

    this.handNameText = this.add.text(640, 400, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
      align: 'center', wordWrap: { width: 600 },
    }).setOrigin(0.5).setDepth(3);
  }

  // ── Game Log ────────────────────────────────────────────

  _createGameLog() {
    const logX = 10, logY = 495, logW = 220, logH = 210;

    this.add.rectangle(logX + logW / 2, logY + logH / 2, logW, logH, 0x0a1f0d, 0.8)
      .setStrokeStyle(1, 0x2e7d32, 0.5).setDepth(0);
    this.add.text(logX + 8, logY + 4, 'GAME LOG', {
      fontSize: '9px', fontFamily: 'monospace', color: '#4caf50', fontStyle: 'bold',
    }).setDepth(1);

    this.gameLogText = this.add.text(logX + 8, logY + 18, '', {
      fontSize: '9px', fontFamily: 'monospace', color: '#b0bec5',
      wordWrap: { width: logW - 16 }, lineSpacing: 2,
    }).setDepth(1);

    const mask = this.add.rectangle(logX + logW / 2, logY + logH / 2 + 8, logW, logH - 16, 0xffffff)
      .setVisible(false);
    this.gameLogText.setMask(mask.createGeometryMask());

    // Render existing entries
    this._refreshGameLog();
  }

  _addGameLog(entry, color = '#b0bec5') {
    const s = this.baseball.getStatus();
    const prefix = `${s.inning}${s.half === 'top' ? '\u25b2' : '\u25bc'}`;
    this.gameLogEntries.push({ text: `${prefix} ${entry}`, color });
    if (this.gameLogEntries.length > 40) this.gameLogEntries.shift();
    this._refreshGameLog();
  }

  _refreshGameLog() {
    const visible = this.gameLogEntries.slice(-15);
    this.gameLogText.setText(visible.map(e => e.text).join('\n'));
  }

  // ── Player Panels ──────────────────────────────────────

  _statBar(val) {
    const max = 5;
    const filled = Math.round(Math.min(val, 10) / 10 * max);
    return '\u2588'.repeat(filled) + '\u2591'.repeat(max - filled) + ` ${val}`;
  }

  _createPitcherPanel() {
    const x = PITCHER_PANEL_X;
    this.add.rectangle(x, 280, PANEL_W, 400, 0x0a1f0d, 0.85)
      .setStrokeStyle(2, 0x2e7d32);

    const team = this.rosterManager.getTeam();
    const headerLabel = team ? `${team.logo} PITCHING` : 'PITCHING';
    this.add.text(x, 95, headerLabel, {
      fontSize: '12px', fontFamily: 'monospace', color: '#4caf50', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.myPitcherNameText = this.add.text(x, 120, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: PANEL_W - 20 },
    }).setOrigin(0.5);

    this.myPitcherRoleText = this.add.text(x, 148, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0.5);

    this.myPitcherVelText = this.add.text(x - 55, 175, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8a65',
    });
    this.myPitcherCtlText = this.add.text(x - 55, 195, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#64b5f6',
    });
    this.myPitcherStaText = this.add.text(x - 55, 215, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
    });

    this.add.rectangle(x, 240, PANEL_W - 30, 1, 0x2e7d32, 0.5);

    this.staminaBarLabel = this.add.text(x, 252, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#69f0ae', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.staminaBarBg = this.add.rectangle(x, 272, PANEL_W - 40, 12, 0x1a3a1a)
      .setStrokeStyle(1, 0x2e7d32);
    this.staminaBarFill = this.add.rectangle(
      x - (PANEL_W - 40) / 2, 272, PANEL_W - 40, 10, 0x69f0ae
    ).setOrigin(0, 0.5);

    this.pitchCountText = this.add.text(x, 295, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#b0bec5',
    }).setOrigin(0.5);
  }

  _updatePitcherPanel() {
    const pitcher = this.rosterManager.getMyPitcher();
    const stamina = this.rosterManager.getMyPitcherStamina();
    const staminaPct = Math.round(stamina * 100);

    this.myPitcherNameText.setText(pitcher.name);
    const team = this.rosterManager.getTeam();
    const teamLabel = team ? `${team.logo} ${team.nickname}` : 'Starter';
    this.myPitcherRoleText.setText(teamLabel);
    this.myPitcherVelText.setText(`VEL  ${this._statBar(pitcher.velocity)}`);
    this.myPitcherCtlText.setText(`CTL  ${this._statBar(pitcher.control)}`);
    this.myPitcherStaText.setText(`STA  ${this._statBar(pitcher.stamina)}`);

    const staminaColor = staminaPct > 50 ? 0x69f0ae : staminaPct > 25 ? 0xffd600 : 0xff5252;
    const barW = PANEL_W - 40;
    this.staminaBarFill.displayWidth = barW * stamina;
    this.staminaBarFill.setFillStyle(staminaColor);

    const colorHex = staminaPct > 50 ? '#69f0ae' : staminaPct > 25 ? '#ffd600' : '#ff5252';
    this.staminaBarLabel.setText(`STAMINA ${staminaPct}%`);
    this.staminaBarLabel.setColor(colorHex);

    const ps = this._pitchState;
    this.pitchCountText.setText(`${ps.outs} out${ps.outs !== 1 ? 's' : ''}  |  ${ps.runs} run${ps.runs !== 1 ? 's' : ''}`);
  }

  _createBatterPanel() {
    const x = BATTER_PANEL_X;
    this.add.rectangle(x, 280, PANEL_W, 400, 0x1a0a0d, 0.85)
      .setStrokeStyle(2, 0x8b0000);

    const oppTeam = this.rosterManager.getOpponentTeam();
    const headerLabel = oppTeam ? `${oppTeam.logo} AT BAT` : 'AT BAT';
    this.add.text(x, 95, headerLabel, {
      fontSize: '12px', fontFamily: 'monospace', color: '#e53935', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.oppBatterNameText = this.add.text(x, 120, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: PANEL_W - 20 },
    }).setOrigin(0.5);

    this.oppBatterNumText = this.add.text(x, 148, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e57373',
    }).setOrigin(0.5);

    this.oppBatterPwrText = this.add.text(x - 55, 170, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8a65',
    });
    this.oppBatterCntText = this.add.text(x - 55, 190, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#64b5f6',
    });
    this.oppBatterSpdText = this.add.text(x - 55, 210, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
    });

    this.add.rectangle(x, 235, PANEL_W - 30, 1, 0x8b0000, 0.5);

    this.dueUpText = this.add.text(x, 260, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#b0bec5',
      align: 'center', wordWrap: { width: PANEL_W - 20 },
    }).setOrigin(0.5);
  }

  _updateBatterPanel() {
    const batter = this.rosterManager.opponentRoster[this.rosterManager.opponentBatterIndex];
    const idx = this.rosterManager.opponentBatterIndex;

    this.oppBatterNameText.setText(batter.name);
    const pos = batter.pos ? ` | ${batter.pos}` : '';
    this.oppBatterNumText.setText(`#${idx + 1} in lineup${pos}`);

    this.oppBatterPwrText.setText(`PWR  ${this._statBar(batter.power)}`);
    this.oppBatterCntText.setText(`CNT  ${this._statBar(batter.contact)}`);
    this.oppBatterSpdText.setText(`SPD  ${this._statBar(batter.speed)}`);

    // On-deck preview
    const nextIdx = (idx + 1) % this.rosterManager.opponentRoster.length;
    const onDeck = this.rosterManager.opponentRoster[nextIdx];
    this.dueUpText.setText(`On deck: ${onDeck.name}`);

    // Walk-up animation
    const targets = [
      this.oppBatterNameText, this.oppBatterNumText,
      this.oppBatterPwrText, this.oppBatterCntText, this.oppBatterSpdText,
      this.dueUpText,
    ];
    targets.forEach((t, i) => {
      const origX = t.x;
      t.setAlpha(0);
      t.x = origX + 50;
      this.tweens.add({
        targets: t, x: origX, alpha: 1,
        duration: 300, delay: i * 50, ease: 'Quad.easeOut',
      });
    });
  }

  // ── Pitching Flow ───────────────────────────────────────

  _startPitching() {
    const oppTeam = this.rosterManager.getOpponentTeam();
    const oppLabel = oppTeam ? `${oppTeam.logo} ${oppTeam.nickname}` : 'Opponent';
    const myPitcher = this.rosterManager.getMyPitcher();

    this._pitchState = {
      outs: 0,
      runs: 0,
      bases: [false, false, false],
      oppLabel,
      myPitcher,
      logElements: [],
      logIndex: 0,
    };

    this.resultText.setColor('#ffffff');
    this.resultText.setText(`${oppLabel} batting...`);
    this.handNameText.setText('');

    this._updatePitcherPanel();
    this._updateBatterPanel();
    this._updateBases(this._pitchState.bases);
    this._showPitchSelection();
  }

  _showPitchSelection() {
    this.resultText.setText('Select a pitch');
    this.resultText.setColor('#b0bec5');
    this.handNameText.setText('');

    this._updatePitcherPanel();
    this._updateBatterPanel();
    this._createPitchButtons();
  }

  _createPitchButtons() {
    this._destroyPitchButtons();
    this._pitchButtons = [];

    const keys = ['fastball', 'breaking', 'slider', 'changeup', 'ibb'];
    const colors = [0xe53935, 0x1e88e5, 0xfb8c00, 0x43a047, 0x757575];
    const stamina = this.rosterManager.getMyPitcherStamina();

    const pitchSpacing = keys.length > 4 ? 105 : CARD_SPACING;
    const pitchStartX = 640 - ((keys.length - 1) * pitchSpacing) / 2;

    keys.forEach((key, i) => {
      const pitch = PITCH_TYPES[key];
      const x = pitchStartX + i * pitchSpacing;
      const y = HAND_Y;

      const bg = this.add.rectangle(x, y, CARD_W, CARD_H, colors[i], 0.9)
        .setDepth(5).setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });

      const nameText = this.add.text(x, y - 45, pitch.name, {
        fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
        align: 'center', wordWrap: { width: CARD_W - 10 },
      }).setOrigin(0.5).setDepth(6);

      const costPct = Math.round(pitch.staminaCost * 100);
      const costLabel = key === 'ibb' ? 'FREE' : `-${costPct}%`;
      const costText = this.add.text(x, y - 15, costLabel, {
        fontSize: '11px', fontFamily: 'monospace', color: '#ffd600',
      }).setOrigin(0.5).setDepth(6);

      const descText = this.add.text(x, y + 15, this._pitchShortDesc(key), {
        fontSize: '9px', fontFamily: 'monospace', color: '#cccccc',
        align: 'center', wordWrap: { width: CARD_W - 10 },
      }).setOrigin(0.5).setDepth(6);

      const nameY = y - 45, costY = y - 15, descY = y + 15;
      bg.on('pointerover', () => {
        bg.setStrokeStyle(3, 0xffd600);
        this.tweens.add({ targets: bg, y: y - 8, duration: 100 });
        this.tweens.add({ targets: nameText, y: nameY - 8, duration: 100 });
        this.tweens.add({ targets: costText, y: costY - 8, duration: 100 });
        this.tweens.add({ targets: descText, y: descY - 8, duration: 100 });
      });
      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, 0xffffff);
        this.tweens.add({ targets: bg, y: y, duration: 100 });
        this.tweens.add({ targets: nameText, y: nameY, duration: 100 });
        this.tweens.add({ targets: costText, y: costY, duration: 100 });
        this.tweens.add({ targets: descText, y: descY, duration: 100 });
      });
      bg.on('pointerdown', () => this._onPitchSelected(key));

      this._pitchButtons.push(bg, nameText, costText, descText);
    });

    // Bullpen button
    const bullpenAvailable = this.rosterManager.getAvailableBullpen();
    if (stamina <= 0.30 && bullpenAvailable.length > 0) {
      const bpX = 640;
      const bpY = HAND_Y + CARD_H / 2 + 30;
      const bpBg = this.add.rectangle(bpX, bpY, 200, 32, 0x1565c0)
        .setStrokeStyle(2, 0x42a5f5)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);
      const bpTxt = this.add.text(bpX, bpY, `BULLPEN (${bullpenAvailable.length} available)`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(6);

      bpBg.on('pointerover', () => bpBg.setStrokeStyle(2, 0xffd600));
      bpBg.on('pointerout', () => bpBg.setStrokeStyle(2, 0x42a5f5));
      bpBg.on('pointerdown', () => this._showBullpenSelection());

      this._pitchButtons.push(bpBg, bpTxt);
    }
  }

  _showBullpenSelection() {
    this._destroyPitchButtons();
    this._pitchButtons = [];

    const relievers = this.rosterManager.getAvailableBullpen();
    const currentPitcher = this.rosterManager.getMyPitcher();
    const staminaPct = Math.round(this.rosterManager.getMyPitcherStamina() * 100);

    this.resultText.setText(`${currentPitcher.name} (${staminaPct}% stamina) — Call the bullpen?`);
    this.resultText.setColor('#42a5f5');
    this.handNameText.setText('Select a reliever or go back');
    this.handNameText.setColor('#90caf9');

    const totalCards = relievers.length + 1;
    const spacing = Math.min(CARD_SPACING, 120);
    const startX = 640 - ((totalCards - 1) * spacing) / 2;

    relievers.forEach((p, i) => {
      const x = startX + i * spacing;
      const y = HAND_Y;

      const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0x1565c0, 0.9)
        .setDepth(5).setStrokeStyle(2, 0x42a5f5)
        .setInteractive({ useHandCursor: true });
      const nameText = this.add.text(x, y - 40, p.name.split(' ').pop(), {
        fontSize: '12px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(6);
      const velText = this.add.text(x, y - 15, `VEL ${p.velocity}`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#ef5350',
      }).setOrigin(0.5).setDepth(6);
      const ctrlText = this.add.text(x, y + 3, `CTL ${p.control}`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#66bb6a',
      }).setOrigin(0.5).setDepth(6);
      const staText = this.add.text(x, y + 21, `STA ${p.stamina}`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#ffd600',
      }).setOrigin(0.5).setDepth(6);
      const freshText = this.add.text(x, y + 42, '100%', {
        fontSize: '10px', fontFamily: 'monospace', color: '#69f0ae', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(6);

      const bullpenIndex = this.rosterManager.bullpen.indexOf(p);

      const nameY = y - 40, velY = y - 15, ctrlY = y + 3, staY = y + 21, freshY = y + 42;
      bg.on('pointerover', () => {
        bg.setStrokeStyle(3, 0xffd600);
        [bg, nameText, velText, ctrlText, staText, freshText].forEach((el, idx) => {
          const baseY = [y, nameY, velY, ctrlY, staY, freshY][idx];
          this.tweens.add({ targets: el, y: baseY - 8, duration: 100 });
        });
      });
      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, 0x42a5f5);
        [bg, nameText, velText, ctrlText, staText, freshText].forEach((el, idx) => {
          const baseY = [y, nameY, velY, ctrlY, staY, freshY][idx];
          this.tweens.add({ targets: el, y: baseY, duration: 100 });
        });
      });
      bg.on('pointerdown', () => {
        this._destroyPitchButtons();
        const newPitcher = this.rosterManager.swapPitcher(bullpenIndex);
        this._pitchState.myPitcher = newPitcher;
        this._addGameLog(`Bullpen: ${newPitcher.name} warming up`, '#42a5f5');

        this.resultText.setText(`${newPitcher.name} takes the mound!`);
        this.resultText.setColor('#69f0ae');
        this.handNameText.setText('');
        this._updatePitcherPanel();

        this.time.delayedCall(1500, () => this._showPitchSelection());
      });

      this._pitchButtons.push(bg, nameText, velText, ctrlText, staText, freshText);
    });

    // "Keep Pitching" button
    const keepX = startX + relievers.length * spacing;
    const keepY = HAND_Y;
    const keepBg = this.add.rectangle(keepX, keepY, CARD_W, CARD_H, 0x555555, 0.9)
      .setDepth(5).setStrokeStyle(2, 0x777777)
      .setInteractive({ useHandCursor: true });
    const keepText = this.add.text(keepX, keepY - 10, 'Keep', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(6);
    const keepSub = this.add.text(keepX, keepY + 10, `${staminaPct}%`, {
      fontSize: '11px', fontFamily: 'monospace', color: staminaPct > 15 ? '#ffd600' : '#ff5252',
    }).setOrigin(0.5).setDepth(6);

    const keepTextY = keepY - 10, keepSubY = keepY + 10;
    keepBg.on('pointerover', () => {
      keepBg.setStrokeStyle(3, 0xffd600);
      this.tweens.add({ targets: keepBg, y: keepY - 8, duration: 100 });
      this.tweens.add({ targets: keepText, y: keepTextY - 8, duration: 100 });
      this.tweens.add({ targets: keepSub, y: keepSubY - 8, duration: 100 });
    });
    keepBg.on('pointerout', () => {
      keepBg.setStrokeStyle(2, 0x777777);
      this.tweens.add({ targets: keepBg, y: keepY, duration: 100 });
      this.tweens.add({ targets: keepText, y: keepTextY, duration: 100 });
      this.tweens.add({ targets: keepSub, y: keepSubY, duration: 100 });
    });
    keepBg.on('pointerdown', () => {
      this._destroyPitchButtons();
      this._showPitchSelection();
    });

    this._pitchButtons.push(keepBg, keepText, keepSub);
  }

  _pitchShortDesc(key) {
    switch (key) {
      case 'fastball': return 'High K\nMore XBH';
      case 'breaking': return 'Hard to hit\nWalk risk';
      case 'slider': return 'Weak contact\nLow XBH';
      case 'changeup': return 'Saves arm\nSafe hits';
      case 'ibb': return 'Free pass\nto 1st base';
      default: return '';
    }
  }

  _destroyPitchButtons() {
    if (this._pitchButtons) {
      this._pitchButtons.forEach(el => el.destroy());
      this._pitchButtons = null;
    }
  }

  _onPitchSelected(pitchType) {
    this._destroyPitchButtons();
    SoundManager.pitchSelect();

    const ps = this._pitchState;
    const inning = this.baseball.getStatus().inning;
    const result = this.rosterManager.simSingleAtBat(inning, pitchType, ps.bases);

    if (result.isOut) {
      ps.outs++;
      if (result.outcome === 'Strikeout') {
        SoundManager.strikeout();
        this._showStrikeoutK();
      } else {
        SoundManager.out();
      }
    } else if (result.walked) {
      SoundManager.walk();
    } else {
      SoundManager.hit();
    }
    if (result.scored > 0) {
      SoundManager.runScored();
      this._showScorePopup(`+${result.scored} RUN${result.scored > 1 ? 'S' : ''}!`, '#ff8a80');
    }
    ps.runs += result.scored || 0;

    // Game log entry
    const oppBatterLast = result.batter.name.split(' ').pop().slice(0, 8);
    const pitchAbbr = { Fastball: 'FB', 'Breaking Ball': 'BRK', Slider: 'SLD', Changeup: 'CHG', IBB: 'IBB' };
    const pitchShort = pitchAbbr[PITCH_TYPES[pitchType]?.name] || pitchType;
    // For strikeouts, show a realistic ball-strike count
    let countStr = '';
    if (result.outcome === 'Strikeout') {
      const fakeBalls = [0, 0, 1, 1, 2, 2, 3][Math.floor(Math.random() * 7)];
      countStr = ` ${fakeBalls}-3`;
    }
    if (result.isOut) {
      this._addGameLog(`${oppBatterLast}: ${result.outcome}${countStr} ${pitchShort}`, '#999999');
    } else {
      const runNote = result.scored > 0 ? ` +${result.scored}R` : '';
      this._addGameLog(`${oppBatterLast}: ${result.outcome}${runNote} ${pitchShort}`, '#ff8a80');
    }

    // Show result line
    const icon = result.isOut ? '\u274c' : (result.walked ? '\ud83d\udeb6' : '\u2705');
    let text = `${icon} ${result.batter.name} - ${result.outcome}`;
    if (!result.isOut && result.scored > 0) {
      text += ` (${result.scored} run${result.scored > 1 ? 's' : ''})`;
    }

    const color = result.isOut ? '#999999' : (result.scored > 0 ? '#ff8a80' : '#ffe082');
    const logY = 420 + ps.logIndex * 26;
    const logLine = this.add.text(640, logY + 5, text, {
      fontSize: '14px', fontFamily: 'monospace', color,
    }).setOrigin(0.5).setDepth(9).setAlpha(0);
    ps.logElements.push(logLine);
    ps.logIndex++;

    this.tweens.add({
      targets: logLine, alpha: 1, y: logY, duration: 200,
    });

    this._updateBases(ps.bases);

    if (ps.outs >= 3) {
      this.time.delayedCall(800, () => this._finishOpponentHalf());
    } else {
      this.time.delayedCall(600, () => this._showPitchSelection());
    }
  }

  _finishOpponentHalf() {
    const ps = this._pitchState;

    // Clean up log elements
    ps.logElements.forEach(el => {
      this.tweens.add({ targets: el, alpha: 0, duration: 300 });
    });
    this.time.delayedCall(350, () => ps.logElements.forEach(el => el.destroy()));

    // Switch side with accumulated runs
    this.baseball.switchSide(ps.runs);
    this._addGameLog(`--- End of half: ${ps.runs} run${ps.runs !== 1 ? 's' : ''} ---`, '#4caf50');

    // Show summary
    const summary = ps.runs === 0
      ? `${ps.myPitcher.name} shuts them down!`
      : `${ps.oppLabel} score${ps.runs === 1 ? 's' : ''} ${ps.runs} run${ps.runs !== 1 ? 's' : ''}`;
    this.resultText.setText(summary);
    this.resultText.setColor(ps.runs > 0 ? '#ff8a80' : '#69f0ae');
    this.handNameText.setText('');

    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1.3, to: 1 },
      duration: 400, ease: 'Back.easeOut',
    });

    this._updateScoreboard();
    this._updateBases([false, false, false]);

    this.time.delayedCall(1800, () => {
      if (this.baseball.isGameOver()) {
        this._endGame();
        return;
      }
      if (this.baseball.shouldShowShop()) {
        this._goToShop();
        return;
      }
      this._returnToGameScene();
    });
  }

  _returnToGameScene() {
    this.scene.start('GameScene', {
      fromPitching: true,
      rosterManager: this.rosterManager,
      baseball: this.baseball,
      traitManager: this.traitManager,
      cardEngine: this.cardEngine,
      gameLogEntries: this.gameLogEntries,
    });
  }

  _goToShop() {
    this.scene.start('ShopScene', {
      rosterManager: this.rosterManager,
      traitManager: this.traitManager,
      baseball: this.baseball,
      cardEngine: this.cardEngine,
      gameLogEntries: this.gameLogEntries,
    });
  }

  _endGame() {
    const result = this.baseball.getResult();
    result.yourTeam = this.rosterManager.getTeam();
    result.opponentTeam = this.rosterManager.getOpponentTeam();
    this.scene.start('GameOverScene', result);
  }
}

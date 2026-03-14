/**
 * PitchingScene.js - Opponent's half-inning (player pitches)
 * Extracted from GameScene to keep each scene focused.
 *
 * Receives game managers via scene data. When the half-inning ends,
 * transitions back to GameScene (or ShopScene / GameOverScene).
 */
import { PITCH_TYPES, assignPitchRepertoire } from '../RosterManager.js';
import SoundManager from '../SoundManager.js';
import SynergyEngine from '../SynergyEngine.js';
import ShowdownEngine from '../ShowdownEngine.js';

const TEAM_SPRITE_KEY = { 'Canada': 'canada', 'USA': 'usa', 'Japan': 'japan', 'Mexico': 'mexico' };

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
    this._createStaffStack();
    this._createRosterButton();
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

    this.peanutBalanceText = this.add.text(640, 33, '', {
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
    const liveOppScore = s.opponentScore + (this._pitchState ? this._pitchState.runs : 0);
    this.scoreText.setText(`${playerName} ${s.playerScore}  -  ${liveOppScore} ${oppName}`);
    this.peanutBalanceText.setText(`Peanuts: ${s.totalPeanuts}`);

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

  // ── Base Diamond (scorebug mini-diamond) ────────────────

  _createBaseDiamond() {
    // Scorebug-style mini diamond — top-right, next to outs
    const cx = 1230, cy = 70;
    const bs = 12; // base square size
    const gap = 18; // distance from center to each base

    // Diamond outline
    const g = this.add.graphics().setDepth(8);
    g.lineStyle(1.5, 0x4caf50, 0.4);
    g.beginPath();
    g.moveTo(cx, cy - gap);           // 2nd
    g.lineTo(cx + gap, cy);           // 1st
    g.lineTo(cx, cy + gap);           // home
    g.lineTo(cx - gap, cy);           // 3rd
    g.closePath();
    g.strokePath();

    // Base squares: 1st (right), 2nd (top), 3rd (left)
    const emptyColor = 0x444444;
    this._baseBugSquares = [
      this.add.rectangle(cx + gap, cy, bs, bs, emptyColor).setDepth(9).setAngle(45).setStrokeStyle(1, 0x666666),  // 1st
      this.add.rectangle(cx, cy - gap, bs, bs, emptyColor).setDepth(9).setAngle(45).setStrokeStyle(1, 0x666666),  // 2nd
      this.add.rectangle(cx - gap, cy, bs, bs, emptyColor).setDepth(9).setAngle(45).setStrokeStyle(1, 0x666666),  // 3rd
    ];

    // Runner name text below the diamond
    this._baseBugRunnerText = this.add.text(cx, cy + gap + 12, '', {
      fontSize: '9px', fontFamily: 'monospace', color: '#ffd600',
    }).setOrigin(0.5, 0).setDepth(9);

    // Keep these for _advanceOppRunners / _handleIBB compatibility
    this.basePositions = [
      { x: cx + gap, y: cy },
      { x: cx, y: cy - gap },
      { x: cx - gap, y: cy },
    ];
    this.homePosition = { x: cx, y: cy + gap };
    this.runners = [null, null, null];
    this.runnerLabels = [null, null, null];

    this._pitchDiamondCx = cx;
    this._pitchDiamondCy = cy;
    this._pitchDiamondSize = gap;
  }

  _updateBases(bases) {
    const litColor = 0xffd600;
    const emptyColor = 0x333333;

    for (let i = 0; i < 3; i++) {
      const occupied = !!bases[i];
      this._baseBugSquares[i].setFillStyle(occupied ? litColor : emptyColor);
      this.runners[i] = occupied ? bases[i] : null;
    }

    // Show runner names below diamond
    const names = [];
    const labels = ['1B', '2B', '3B'];
    for (let i = 0; i < 3; i++) {
      if (bases[i] && typeof bases[i] === 'object' && bases[i].name) {
        const last = bases[i].name.split(' ').pop();
        names.push(`${labels[i]}: ${last}`);
      }
    }
    this._baseBugRunnerText.setText(names.join('  '));
  }

  _showStrikeoutK() {
    const k = this.add.text(640, 300, 'K', {
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
    this.resultText = this.add.text(640, 385, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: 600 },
    }).setOrigin(0.5).setDepth(10);

    this.handNameText = this.add.text(640, 410, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#81c784',
      align: 'center', wordWrap: { width: 600 },
    }).setOrigin(0.5).setDepth(10);
  }

  // ── Staff Card Stack (bottom-left, replaces game log) ──

  _createStaffStack() {
    const stackX = 10;
    const stackY = 495;
    const stackW = 220;
    const stackH = 170;

    this.add.rectangle(stackX + stackW / 2, stackY + stackH / 2, stackW, stackH, 0x0a1f0d, 0.8)
      .setStrokeStyle(1, 0x2e7d32, 0.5).setDepth(0);

    this.add.text(stackX + 8, stackY + 4, 'STAFF', {
      fontSize: '9px', fontFamily: 'monospace', color: '#4caf50', fontStyle: 'bold',
    }).setDepth(1);

    const staff = this.baseball.getStaff();
    if (staff.length === 0) {
      this.add.text(stackX + stackW / 2, stackY + stackH / 2, 'No staff hired', {
        fontSize: '11px', fontFamily: 'monospace', color: '#555555',
      }).setOrigin(0.5).setDepth(1);
      return;
    }

    staff.forEach((item, i) => {
      const cardY = stackY + 20 + i * 38;
      const isCoach = item.category === 'coach';
      const badgeColor = isCoach ? 0x00695c : 0x6d4c00;
      const textColor = isCoach ? '#80cbc4' : '#ffab40';

      this.add.rectangle(stackX + stackW / 2, cardY + 12, stackW - 12, 32, badgeColor, 0.5)
        .setStrokeStyle(1, isCoach ? 0x26a69a : 0xffa000, 0.6).setDepth(1);

      const badge = isCoach ? 'C' : 'M';
      this.add.text(stackX + 14, cardY + 5, badge, {
        fontSize: '11px', fontFamily: 'monospace', color: textColor, fontStyle: 'bold',
      }).setDepth(2);

      this.add.text(stackX + 28, cardY + 4, item.name, {
        fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setDepth(2);

      this.add.text(stackX + 28, cardY + 16, item.description, {
        fontSize: '8px', fontFamily: 'monospace', color: '#aaaaaa',
        wordWrap: { width: stackW - 40 },
      }).setDepth(2);
    });
  }

  // ── Game Log (data only, rendered in roster overlay) ──

  _addGameLog(entry, color = '#b0bec5') {
    const s = this.baseball.getStatus();
    const prefix = `${s.inning}${s.half === 'top' ? '\u25b2' : '\u25bc'}`;
    this.gameLogEntries.push({ text: `${prefix} ${entry}`, color });
    if (this.gameLogEntries.length > 40) this.gameLogEntries.shift();
  }

  // ── Roster Overlay ────────────────────────────────────

  _createRosterButton() {
    const btnX = 10 + 220 / 2;
    const btnY = 495 + 175;
    const btnW = 220;
    const btnH = 28;

    const bg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x1a3a2a, 0.9)
      .setStrokeStyle(1, 0x4caf50).setDepth(3)
      .setInteractive({ useHandCursor: true });
    this.add.text(btnX, btnY, 'ROSTER', {
      fontSize: '12px', fontFamily: 'monospace', color: '#69f0ae', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(4);

    bg.on('pointerover', () => bg.setStrokeStyle(1, 0xffd600));
    bg.on('pointerout', () => bg.setStrokeStyle(1, 0x4caf50));
    bg.on('pointerdown', () => this._toggleRosterOverlay());

    this.rosterOverlayVisible = false;
    this.rosterOverlayElements = [];
  }

  _toggleRosterOverlay() {
    if (this.rosterOverlayVisible) {
      this.rosterOverlayElements.forEach(el => el.destroy());
      this.rosterOverlayElements = [];
      this.rosterOverlayVisible = false;
      return;
    }
    this.rosterOverlayVisible = true;
    const els = this.rosterOverlayElements;

    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.92)
      .setDepth(50).setInteractive();
    els.push(overlay);

    const closeBg = this.add.rectangle(1220, 40, 80, 32, 0x8b0000)
      .setStrokeStyle(1, 0xaa2222).setDepth(51)
      .setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(1220, 40, 'CLOSE', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    closeBg.on('pointerdown', () => this._toggleRosterOverlay());
    els.push(closeBg, closeTxt);

    els.push(this.add.text(640, 25, 'LINEUP', {
      fontSize: '24px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51));

    const roster = this.rosterManager.getRoster();
    const currentIdx = this.rosterManager.getCurrentBatterIndex();
    const rosterX = 60;
    const startY = 60;
    const rowH = 44;

    roster.forEach((player, i) => {
      const y = startY + i * rowH;
      const isNext = i === currentIdx;
      const isBonus = player.isBonus;

      const rowBg = this.add.rectangle(310, y + 16, 520, 38,
        isBonus ? 0x2a2a1a : 0x111d2a, 0.7)
        .setStrokeStyle(1, isNext ? 0x69f0ae : 0x222d3a).setDepth(51);
      els.push(rowBg);

      if (isNext) {
        els.push(this.add.text(rosterX - 5, y + 8, '\u25b6', {
          fontSize: '12px', fontFamily: 'monospace', color: '#69f0ae',
        }).setDepth(52));
      }

      const posLabel = player.pos ? `${player.pos} ` : '';
      const nameColor = isBonus ? '#ffd600' : (isNext ? '#69f0ae' : '#ffffff');
      els.push(this.add.text(rosterX + 12, y + 6, `${i + 1}. ${posLabel}${player.name}`, {
        fontSize: '12px', fontFamily: 'monospace', color: nameColor, fontStyle: 'bold',
      }).setDepth(52));

      const batsLabel = player.bats === 'L' ? 'L' : 'R';
      els.push(this.add.text(rosterX + 12, y + 20, `${batsLabel}  PWR:${player.power} CNT:${player.contact} SPD:${player.speed}`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#81c784',
      }).setDepth(52));

      if (player.traits && player.traits.length > 0) {
        const traitNames = player.traits.map(t => t.name).join(', ');
        els.push(this.add.text(380, y + 13, traitNames, {
          fontSize: '9px', fontFamily: 'monospace', color: '#ce93d8',
          wordWrap: { width: 200 },
        }).setOrigin(0, 0.5).setDepth(52));
      }
    });

    // Synergies (right side)
    const synX = 620;
    els.push(this.add.text(synX + 150, 55, 'SYNERGIES', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ce93d8', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51));

    const allSynergies = SynergyEngine.getAll();
    const activeSynergies = SynergyEngine.calculate(roster);
    const activeIds = new Set(activeSynergies.map(s => s.id));

    allSynergies.forEach((syn, i) => {
      const y = 75 + i * 30;
      const isActive = activeIds.has(syn.id);
      const icon = isActive ? '\u2713' : '\u2717';
      const iconColor = isActive ? '#69f0ae' : '#444444';

      els.push(this.add.text(synX, y, icon, {
        fontSize: '13px', fontFamily: 'monospace', color: iconColor, fontStyle: 'bold',
      }).setDepth(52));

      els.push(this.add.text(synX + 20, y, syn.name, {
        fontSize: '11px', fontFamily: 'monospace',
        color: isActive ? '#ffffff' : '#666666', fontStyle: isActive ? 'bold' : '',
      }).setDepth(52));

      const desc = isActive ? syn.bonusDescription : syn.hint;
      els.push(this.add.text(synX + 180, y, desc, {
        fontSize: '9px', fontFamily: 'monospace', color: isActive ? '#81c784' : '#555555',
      }).setDepth(52));
    });

    // Game Log (bottom-right)
    const logX = synX;
    const logTopY = 445;
    els.push(this.add.text(logX + 150, logTopY - 5, 'GAME LOG', {
      fontSize: '14px', fontFamily: 'monospace', color: '#4caf50', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51));

    els.push(this.add.rectangle(logX + 150, logTopY + 105, 620, 190, 0x0a1f0d, 0.6)
      .setStrokeStyle(1, 0x2e7d32, 0.4).setDepth(51));

    const visible = this.gameLogEntries.slice(-12);
    const logText = visible.map(e => e.text).join('\n');
    els.push(this.add.text(logX + 10, logTopY + 15, logText || '(no entries yet)', {
      fontSize: '9px', fontFamily: 'monospace', color: '#b0bec5',
      wordWrap: { width: 600 }, lineSpacing: 2,
    }).setDepth(52));
  }

  // ── Player Panels ──────────────────────────────────────

  _statBar(val) {
    const max = 5;
    const filled = Math.round(Math.min(val, 10) / 10 * max);
    return '\u2588'.repeat(filled) + '\u2591'.repeat(max - filled) + ` ${val}`;
  }

  _createPitcherPanel() {
    const x = PITCHER_PANEL_X;
    const panelLeft = x - PANEL_W / 2;
    const textW = PANEL_W - 20; // max text width with 10px padding each side
    this.add.rectangle(x, 280, PANEL_W, 400, 0x0a1f0d, 0.85)
      .setStrokeStyle(2, 0x2e7d32);

    const team = this.rosterManager.getTeam();
    const headerLabel = team ? `${team.logo} PITCHING` : 'PITCHING';
    this.add.text(x, 95, headerLabel, {
      fontSize: '12px', fontFamily: 'monospace', color: '#4caf50', fontStyle: 'bold',
      fixedWidth: textW, align: 'center',
    }).setOrigin(0.5);

    this.myPitcherNameText = this.add.text(x, 120, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: textW }, fixedWidth: textW,
    }).setOrigin(0.5);

    this.myPitcherRoleText = this.add.text(x, 148, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#81c784',
      fixedWidth: textW, align: 'center',
    }).setOrigin(0.5);

    this.myPitcherVelText = this.add.text(panelLeft + 10, 175, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8a65',
      fixedWidth: textW,
    });
    this.myPitcherCtlText = this.add.text(panelLeft + 10, 195, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#64b5f6',
      fixedWidth: textW,
    });
    this.myPitcherStaText = this.add.text(panelLeft + 10, 215, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
      fixedWidth: textW,
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
    const panelLeft = x - PANEL_W / 2;
    const textW = PANEL_W - 20; // max text width with 10px padding each side
    this.add.rectangle(x, 280, PANEL_W, 400, 0x1a0a0d, 0.85)
      .setStrokeStyle(2, 0x8b0000);

    const oppTeam = this.rosterManager.getOpponentTeam();
    const headerLabel = oppTeam ? `${oppTeam.logo} AT BAT` : 'AT BAT';
    this.add.text(x - 30, 95, headerLabel, {
      fontSize: '12px', fontFamily: 'monospace', color: '#e53935', fontStyle: 'bold',
      fixedWidth: textW, align: 'center',
    }).setOrigin(0.5);

    this.oppBatterNameText = this.add.text(x - 30, 120, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: textW }, fixedWidth: textW,
    }).setOrigin(0.5);

    this.oppBatterNumText = this.add.text(x - 30, 148, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e57373',
      fixedWidth: textW, align: 'center',
    }).setOrigin(0.5);

    this.oppBatterPwrText = this.add.text(panelLeft - 20
      , 170, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8a65',
      fixedWidth: textW,
    });
    this.oppBatterCntText = this.add.text(panelLeft - 20, 190, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#64b5f6',
      fixedWidth: textW,
    });
    this.oppBatterSpdText = this.add.text(panelLeft - 20, 210, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
      fixedWidth: textW,
    });

    this.add.rectangle(x, 235, PANEL_W - 30, 1, 0x8b0000, 0.5);

    this.dueUpText = this.add.text(x - 30, 260, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#b0bec5',
      align: 'center', wordWrap: { width: textW }, fixedWidth: textW,
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
      bases: [null, null, null],
      oppLabel,
      myPitcher,
      logElements: [],
      logIndex: 0,
      atBatNumber: 0,
    };

    this.resultText.setColor('#ffffff');
    this.resultText.setText(`${oppLabel} batting...`);
    this.handNameText.setText('');

    this._updatePitcherPanel();
    this._updateBatterPanel();
    this._updateBases(this._pitchState.bases);
    this._startNewAtBat();
  }

  // ── Showdown Flow ─────────────────────────────────────

  _startNewAtBat() {
    this._pitchState.atBatNumber++;
    this._updatePitcherPanel();
    this._updateBatterPanel();

    const pitcher = this.rosterManager.getMyPitcher();
    const batter = this.rosterManager.opponentRoster[this.rosterManager.opponentBatterIndex];

    this.showdownEngine = new ShowdownEngine(pitcher);
    this.showdownEngine.start(batter, this._pitchState.outs, this._pitchState.inning);
    if (this._pitchState.atBatNumber > 1) {
      this.showdownEngine.degradeDeck(this._pitchState.atBatNumber);
    }

    // Drain a base stamina cost per at-bat
    this.rosterManager.myPitcherStamina = Math.max(0, this.rosterManager.myPitcherStamina - 0.03);

    this.resultText.setText(`Showdown vs ${batter.name}`);
    this.resultText.setColor('#ffe082');
    this.handNameText.setText('');

    // Show IBB option first, then deal flop
    this._showPreFlopChoice();
  }

  _showPreFlopChoice() {
    // Offer IBB or proceed to showdown
    this._destroyPitchButtons();
    this._destroyBoardElements();
    this._pitchButtons = [];

    const pitcher = this.rosterManager.getMyPitcher();
    const repertoire = assignPitchRepertoire(pitcher);
    const stamina = this.rosterManager.getMyPitcherStamina();

    // "Deal" button to start the showdown
    const dealX = 640, dealY = 540;
    const dealBg = this.add.rectangle(dealX, dealY, 200, 50, 0x2e7d32, 0.9)
      .setStrokeStyle(2, 0x4caf50).setDepth(5)
      .setInteractive({ useHandCursor: true });
    const dealTxt = this.add.text(dealX, dealY, 'DEAL', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(6);
    dealBg.on('pointerover', () => dealBg.setStrokeStyle(3, 0xffd600));
    dealBg.on('pointerout', () => dealBg.setStrokeStyle(2, 0x4caf50));
    dealBg.on('pointerdown', () => {
      this._destroyPitchButtons();
      this._dealShowdownFlop();
    });
    this._pitchButtons.push(dealBg, dealTxt);

    // IBB button
    const ibbX = 840, ibbY = 540;
    const ibbBg = this.add.rectangle(ibbX, ibbY, 140, 50, 0x757575, 0.9)
      .setStrokeStyle(2, 0x999999).setDepth(5)
      .setInteractive({ useHandCursor: true });
    const ibbTxt = this.add.text(ibbX, ibbY, 'IBB', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(6);
    ibbBg.on('pointerover', () => ibbBg.setStrokeStyle(3, 0xffd600));
    ibbBg.on('pointerout', () => ibbBg.setStrokeStyle(2, 0x999999));
    ibbBg.on('pointerdown', () => {
      this._destroyPitchButtons();
      this._handleIBB();
    });
    this._pitchButtons.push(ibbBg, ibbTxt);

    // Bullpen button if stamina low
    const bullpenAvailable = this.rosterManager.getAvailableBullpen();
    if (stamina <= 0.30 && bullpenAvailable.length > 0) {
      const bpX = 440, bpY = 540;
      const bpBg = this.add.rectangle(bpX, bpY, 180, 50, 0x1565c0, 0.9)
        .setStrokeStyle(2, 0x42a5f5).setDepth(5)
        .setInteractive({ useHandCursor: true });
      const bpTxt = this.add.text(bpX, bpY, `BULLPEN (${bullpenAvailable.length})`, {
        fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(6);
      bpBg.on('pointerover', () => bpBg.setStrokeStyle(3, 0xffd600));
      bpBg.on('pointerout', () => bpBg.setStrokeStyle(2, 0x42a5f5));
      bpBg.on('pointerdown', () => this._showBullpenSelection());
      this._pitchButtons.push(bpBg, bpTxt);
    }

    // Show pitcher hole cards preview
    this._renderHoleCards();
  }

  _dealShowdownFlop() {
    this.showdownEngine.dealFlop();
    this._renderShowdownBoard();
    this._showPitchAbilities('flop');
  }

  _dealShowdownTurn() {
    // Un-hide face-down cards from breaking ball at new stage
    this.showdownEngine.faceDownIndices = [];
    this.showdownEngine.dealTurn();
    this._renderShowdownBoard();
    this._showPitchAbilities('turn');
  }

  _dealShowdownRiver() {
    this.showdownEngine.faceDownIndices = [];
    this.showdownEngine.dealRiver();
    this._renderShowdownBoard();
    this._showPitchAbilities('river');
  }

  // ── Board Rendering ─────────────────────────────────────

  _renderHoleCards() {
    this._destroyBoardElements();
    this._boardElements = [];

    const state = this.showdownEngine.getState();

    // Pitcher hole cards (bottom)
    const holeY = 480;
    const holeStartX = 600;
    this._boardElements.push(this.add.text(holeStartX - 55, holeY, 'YOU', {
      fontSize: '12px', fontFamily: 'monospace', color: '#4caf50', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(5));
    state.pitcherHole.forEach((card, i) => {
      const x = holeStartX + i * 70;
      this._renderCardOnBoard(x, holeY, card, true, false, 'pitcher');
    });

    // Batter hole cards (top — face-down)
    const batterY = 130;
    this._boardElements.push(this.add.text(holeStartX - 55, batterY, 'OPP', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e53935', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(5));
    state.batterHole.forEach((card, i) => {
      const x = holeStartX + i * 70;
      this._renderCardOnBoard(x, batterY, card, false, false, 'batter');
    });
  }

  _renderShowdownBoard() {
    this._destroyBoardElements();
    this._boardElements = [];

    const state = this.showdownEngine.getState();

    // Community cards (center row)
    const commY = 280;
    const commCount = state.community.length;
    const commStartX = 640 - (commCount - 1) * 40;
    state.community.forEach((card, i) => {
      const x = commStartX + i * 80;
      const faceDown = state.faceDownIndices.includes(i);
      const locked = state.lockedIndices.includes(i);
      this._renderCardOnBoard(x, commY, card, !faceDown, locked, 'community');
    });

    // Pitcher hole cards (below community)
    const holeY = 480;
    const holeStartX = 600;
    this._boardElements.push(this.add.text(holeStartX - 55, holeY, 'YOU', {
      fontSize: '12px', fontFamily: 'monospace', color: '#4caf50', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(5));
    state.pitcherHole.forEach((card, i) => {
      const x = holeStartX + i * 70;
      this._renderCardOnBoard(x, holeY, card, true, false, 'pitcher');
    });

    // Batter hole cards (above community)
    const batterY = 130;
    this._boardElements.push(this.add.text(holeStartX - 55, batterY, 'OPP', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e53935', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(5));
    state.batterHole.forEach((card, i) => {
      const x = holeStartX + i * 70;
      const revealed = state.revealedBatterCards.includes(i);
      this._renderCardOnBoard(x, batterY, card, revealed, false, 'batter');
    });
  }

  _renderCardOnBoard(x, y, card, faceUp, locked, owner) {
    const CARD_BW = 58;
    const CARD_BH = 80;
    const ASSET_RANKS = { 2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'j',12:'q',13:'k',14:'a' };
    const ASSET_SUITS = { H:'h', D:'d', C:'c', S:'s' };

    if (faceUp) {
      const key = `card_${ASSET_SUITS[card.suit]}${ASSET_RANKS[card.rank]}`;
      const scaleX = CARD_BW / 32;
      const scaleY = CARD_BH / 42;
      const bg = this.add.image(x, y, key)
        .setScale(scaleX, scaleY).setDepth(5);
      if (locked) {
        const border = this.add.rectangle(x, y, CARD_BW + 4, CARD_BH + 4, 0x000000, 0)
          .setStrokeStyle(3, 0xffd600).setDepth(6);
        const lockIcon = this.add.text(x + 22, y - 32, '\uD83D\uDD12', {
          fontSize: '10px',
        }).setOrigin(0.5).setDepth(7);
        this._boardElements.push(border, lockIcon);
      }
      this._boardElements.push(bg);
    } else {
      const backKey = owner === 'batter' ? 'card_back_red' : 'card_back';
      const scaleX = CARD_BW / 32;
      const scaleY = CARD_BH / 42;
      const bg = this.add.image(x, y, backKey)
        .setScale(scaleX, scaleY).setDepth(5);
      this._boardElements.push(bg);
    }
  }

  _destroyBoardElements() {
    if (this._boardElements) {
      this._boardElements.forEach(el => el.destroy());
      this._boardElements = null;
    }
  }

  // ── Pitch Ability Selection ─────────────────────────────

  _showPitchAbilities(stage) {
    this._destroyPitchButtons();
    this._pitchButtons = [];

    const pitcher = this.rosterManager.getMyPitcher();
    const repertoire = assignPitchRepertoire(pitcher);
    const used = this.showdownEngine.pitchesUsed;

    const pitchColors = {
      fastball: 0xe53935, breaking: 0x1e88e5, slider: 0xfb8c00, changeup: 0x43a047,
      cutter: 0xab47bc, curveball: 0x1565c0, sinker: 0x6d4c41, splitter: 0xd84315,
      twoseam: 0xc62828, knuckle: 0x00838f, screwball: 0x7b1fa2, palmball: 0x2e7d32,
    };

    this.resultText.setText(`${stage.toUpperCase()} — Pick a pitch ability`);
    this.resultText.setColor('#ffe082');

    const stageNum = { flop: 1, turn: 2, river: 3 }[stage];
    this.handNameText.setText(`Stage ${stageNum}/3`);
    this.handNameText.setColor('#81c784');

    const btnY = 600;
    const btnW = 140;
    const btnH = 65;
    const spacing = btnW + 12;
    const startX = 640 - (repertoire.length - 1) * spacing / 2;

    repertoire.forEach((key, i) => {
      const x = startX + i * spacing;
      const isUsed = used.includes(key);
      const pitch = PITCH_TYPES[key];
      const color = isUsed ? 0x333333 : (pitchColors[key] || 0x555555);

      const bg = this.add.rectangle(x, btnY, btnW, btnH, color, isUsed ? 0.4 : 0.9)
        .setStrokeStyle(2, isUsed ? 0x444444 : 0xffffff).setDepth(5);

      const nameText = this.add.text(x, btnY - 18, pitch.name, {
        fontSize: '11px', fontFamily: 'monospace',
        color: isUsed ? '#666666' : '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(6);

      const effectText = this.add.text(x, btnY + 5, this._showdownEffectDesc(key), {
        fontSize: '8px', fontFamily: 'monospace',
        color: isUsed ? '#555555' : '#cccccc',
        align: 'center', wordWrap: { width: btnW - 10 },
      }).setOrigin(0.5).setDepth(6);

      const statusText = this.add.text(x, btnY + 28, isUsed ? 'USED' : 'READY', {
        fontSize: '9px', fontFamily: 'monospace',
        color: isUsed ? '#ff5252' : '#69f0ae', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(6);

      if (!isUsed) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => {
          bg.setStrokeStyle(3, 0xffd600);
          this.tweens.add({ targets: [bg, nameText, effectText, statusText], y: '-=5', duration: 80 });
        });
        bg.on('pointerout', () => {
          bg.setStrokeStyle(2, 0xffffff);
          this.tweens.add({ targets: [bg, nameText, effectText, statusText], y: '+=5', duration: 80 });
        });
        bg.on('pointerdown', () => this._onShowdownPitchSelected(key, stage));
      }

      this._pitchButtons.push(bg, nameText, effectText, statusText);
    });

    // "Skip" button — don't use a pitch this stage
    const skipX = startX + repertoire.length * spacing;
    const skipBg = this.add.rectangle(skipX, btnY, 80, btnH, 0x555555, 0.7)
      .setStrokeStyle(2, 0x777777).setDepth(5)
      .setInteractive({ useHandCursor: true });
    const skipTxt = this.add.text(skipX, btnY, 'SKIP', {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaaaaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(6);
    skipBg.on('pointerover', () => skipBg.setStrokeStyle(3, 0xffd600));
    skipBg.on('pointerout', () => skipBg.setStrokeStyle(2, 0x777777));
    skipBg.on('pointerdown', () => this._advanceShowdownStage(stage, null));
    this._pitchButtons.push(skipBg, skipTxt);
  }

  _showdownEffectDesc(key) {
    const descs = {
      fastball: 'Swap hole card\nfrom top 30%',
      breaking: 'Flip community\ncard face-down',
      slider: 'Replace a\ncommunity card',
      changeup: 'Peek at batter\nhole card',
      cutter: 'Lock a card\nin place',
      curveball: 'Downgrade batter\nbest card -2',
      sinker: 'All community\ncards -1 rank',
      splitter: 'Destroy a\ncommunity card',
      twoseam: 'Shift a card\nsuit to match',
      knuckle: 'Randomize a\ncommunity card',
      screwball: 'Replace a batter\nhole card',
      palmball: 'Hide next\ncommunity card',
    };
    return descs[key] || '';
  }

  _onShowdownPitchSelected(pitchKey, stage) {
    this._destroyPitchButtons();
    SoundManager.pitchSelect();

    // For targeted effects, auto-pick a reasonable target
    const state = this.showdownEngine.getState();
    const opts = {};
    if (['slider', 'cutter', 'splitter', 'twoseam', 'knuckle', 'breaking'].includes(pitchKey)) {
      // Target the community card that would help the batter most
      // Simple heuristic: highest rank unlocked card
      let bestIdx = 0, bestRank = -1;
      state.community.forEach((c, i) => {
        if (!state.lockedIndices.includes(i) && c.rank > bestRank) {
          bestRank = c.rank;
          bestIdx = i;
        }
      });
      opts.targetIndex = bestIdx;
    }
    if (pitchKey === 'fastball') {
      // Swap the weaker hole card
      opts.swapIndex = state.pitcherHole[0].rank <= state.pitcherHole[1].rank ? 0 : 1;
    }

    const result = this.showdownEngine.applyPitch(pitchKey, opts);

    // Show effect feedback
    const pitch = PITCH_TYPES[pitchKey];
    if (result.success) {
      this.handNameText.setText(`${pitch.name} — ${this._effectFeedback(pitchKey, result)}`);
      this.handNameText.setColor('#69f0ae');
    } else {
      this.handNameText.setText(`${pitch.name} failed: ${result.reason}`);
      this.handNameText.setColor('#ff5252');
    }

    // Re-render board to show effect
    this._renderShowdownBoard();

    // Advance after brief pause
    this.time.delayedCall(800, () => this._advanceShowdownStage(stage, pitchKey));
  }

  _effectFeedback(key, result) {
    switch (key) {
      case 'fastball': return `Swapped for ${this._rankName(result.drawn.rank)}${result.drawn.suit}`;
      case 'changeup': return `Revealed: ${this._rankName(result.revealed.rank)}${result.revealed.suit}`;
      case 'slider': return `Replaced ${this._rankName(result.replaced.rank)} with new card`;
      case 'cutter': return 'Card locked!';
      case 'curveball': return result.downgraded ? 'Batter card downgraded!' : 'Misfired!';
      case 'sinker': return 'All community ranks -1';
      case 'splitter': return 'Card destroyed!';
      case 'twoseam': return `Suit shifted: ${result.oldSuit} → ${result.newSuit}`;
      case 'knuckle': return 'Card randomized!';
      case 'screwball': return 'Batter card replaced!';
      case 'palmball': return 'Next card hidden';
      case 'breaking': return 'Card flipped face-down';
      default: return '';
    }
  }

  _rankName(rank) {
    const names = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
    return names[rank] || rank.toString();
  }

  _advanceShowdownStage(currentStage, pitchUsed) {
    this._destroyPitchButtons();

    if (currentStage === 'flop') {
      this.time.delayedCall(300, () => this._dealShowdownTurn());
    } else if (currentStage === 'turn') {
      this.time.delayedCall(300, () => this._dealShowdownRiver());
    } else {
      // River done — resolve
      this.time.delayedCall(300, () => this._resolveShowdown());
    }
  }

  _resolveShowdown() {
    this._destroyPitchButtons();
    const result = this.showdownEngine.resolve();

    // Show both hands
    this._renderShowdownBoard();

    // Reveal batter cards
    this.showdownEngine._revealedBatterCards = [0, 1];
    this._renderShowdownBoard();

    const winnerLabel = result.winner === 'pitcher' ? 'YOU WIN' : 'BATTER WINS';
    const winnerColor = result.isOut ? '#69f0ae' : '#ff5252';
    this.resultText.setText(`${winnerLabel} — ${result.outcome}!`);
    this.resultText.setColor(winnerColor);

    const pHandName = result.pitcherHand.handName || 'High Card';
    const bHandName = result.batterHand.handName || 'High Card';
    this.handNameText.setText(`You: ${pHandName} (${result.pitcherHand.score}) vs Batter: ${bHandName} (${result.batterHand.score})`);
    this.handNameText.setColor('#b0bec5');

    // Apply pitch-effect stamina drain
    const pitchStaminaDrain = this.showdownEngine.getStaminaDrained();
    if (pitchStaminaDrain > 0) {
      this.rosterManager.myPitcherStamina = Math.max(0, this.rosterManager.myPitcherStamina - pitchStaminaDrain);
    }

    // Apply result to pitch state
    this.time.delayedCall(1500, () => this._applyShowdownResult(result));
  }

  _applyShowdownResult(result) {
    this._destroyBoardElements();

    const ps = this._pitchState;
    const batter = this.rosterManager.opponentRoster[this.rosterManager.opponentBatterIndex];
    const oppBatterLast = batter.name.split(' ').pop().slice(0, 8);

    if (result.isOut) {
      ps.outs++;
      if (result.outcome === 'Strikeout') {
        SoundManager.strikeout();
        this._showStrikeoutK();
        this._addGameLog(`${oppBatterLast}: Strikeout K`, '#999999');
      } else {
        SoundManager.out();
        this._addGameLog(`${oppBatterLast}: ${result.outcome}`, '#999999');
      }
    } else {
      SoundManager.hit();
      const basesGained = { 'Single': 1, 'Double': 2, 'Triple': 3, 'Home Run': 4 }[result.outcome] || 1;
      const scored = this._advanceOppRunners(ps.bases, basesGained, batter);
      ps.runs += scored;
      if (scored > 0) {
        SoundManager.runScored();
        this._showScorePopup(`+${scored} RUN${scored > 1 ? 'S' : ''}!`, '#ff8a80');
        this._updateScoreboard();
      }
      const runNote = scored > 0 ? ` +${scored}R` : '';
      this._addGameLog(`${oppBatterLast}: ${result.outcome}${runNote}`, '#ff8a80');
    }

    // Show result in log area
    const icon = result.isOut ? '\u274c' : '\u2705';
    let text = `${icon} ${batter.name} - ${result.outcome}`;
    if (!result.isOut) {
      const basesGained = { 'Single': 1, 'Double': 2, 'Triple': 3, 'Home Run': 4 }[result.outcome] || 1;
      if (basesGained >= 4) text += ' (all score)';
    }
    const color = result.isOut ? '#999999' : '#ff8a80';
    const LOG_START_Y = 420;
    const LOG_LINE_H = 26;
    const MAX_VISIBLE = 4;
    if (ps.logIndex >= MAX_VISIBLE) {
      const oldest = ps.logElements.shift();
      this.tweens.add({ targets: oldest, alpha: 0, duration: 150, onComplete: () => oldest.destroy() });
      ps.logElements.forEach(el => {
        this.tweens.add({ targets: el, y: el.y - LOG_LINE_H, duration: 150 });
      });
    }
    const displayIdx = Math.min(ps.logIndex, MAX_VISIBLE - 1);
    const logY = LOG_START_Y + displayIdx * LOG_LINE_H;
    const logLine = this.add.text(640, logY + 5, text, {
      fontSize: '14px', fontFamily: 'monospace', color,
    }).setOrigin(0.5).setDepth(4).setAlpha(0);
    ps.logElements.push(logLine);
    ps.logIndex++;
    this.tweens.add({ targets: logLine, alpha: 1, y: logY, duration: 200 });

    this._updateBases(ps.bases);
    this.rosterManager.opponentBatterIndex = (this.rosterManager.opponentBatterIndex + 1) % 9;

    // Check end conditions
    const status = this.baseball.getStatus();
    const liveOppScore = status.opponentScore + ps.runs;
    if (status.inning >= 9 && liveOppScore > status.playerScore) {
      this.time.delayedCall(800, () => this._finishOpponentHalf());
    } else if (ps.outs >= 3) {
      this.time.delayedCall(800, () => this._finishOpponentHalf());
    } else {
      this.time.delayedCall(600, () => this._startNewAtBat());
    }
  }

  /**
   * Advance opponent runners on the bases (simplified).
   * Mirrors BaseballState._advanceRunners logic.
   */
  _advanceOppRunners(bases, basesGained, batter) {
    let runs = 0;
    if (basesGained >= 4) {
      // Home run: everyone scores
      for (let i = 0; i < 3; i++) {
        if (bases[i]) { runs++; bases[i] = null; }
      }
      runs++; // batter
      return runs;
    }
    // Advance existing runners
    for (let i = 2; i >= 0; i--) {
      if (!bases[i]) continue;
      const runner = bases[i];
      bases[i] = null;
      const newPos = i + basesGained;
      if (newPos >= 3) { runs++; }
      else { bases[newPos] = runner; }
    }
    // Place batter
    if (basesGained >= 1 && basesGained <= 3) {
      bases[basesGained - 1] = batter;
    }
    return runs;
  }

  _handleIBB() {
    const ps = this._pitchState;
    const batter = this.rosterManager.opponentRoster[this.rosterManager.opponentBatterIndex];
    const oppBatterLast = batter.name.split(' ').pop().slice(0, 8);

    // Walk logic: force advance
    let scored = 0;
    let forceUpTo = -1;
    for (let i = 0; i < 3; i++) {
      if (ps.bases[i]) { forceUpTo = i; } else { break; }
    }
    for (let i = forceUpTo; i >= 0; i--) {
      const runner = ps.bases[i];
      ps.bases[i] = null;
      if (i + 1 >= 3) { scored++; } else { ps.bases[i + 1] = runner; }
    }
    ps.bases[0] = batter;
    ps.runs += scored;

    SoundManager.walk();
    if (scored > 0) {
      SoundManager.runScored();
      this._showScorePopup(`+${scored} RUN${scored > 1 ? 'S' : ''}!`, '#ff8a80');
      this._updateScoreboard();
    }

    this._addGameLog(`${oppBatterLast}: Walk (IBB)`, '#ffe082');
    this.resultText.setText(`IBB — ${batter.name} walks`);
    this.resultText.setColor('#ffe082');
    this.handNameText.setText('');

    this._updateBases(ps.bases);
    this.rosterManager.opponentBatterIndex = (this.rosterManager.opponentBatterIndex + 1) % 9;

    const status = this.baseball.getStatus();
    const liveOppScore = status.opponentScore + ps.runs;
    if (status.inning >= 9 && liveOppScore > status.playerScore) {
      this.time.delayedCall(800, () => this._finishOpponentHalf());
    } else if (ps.outs >= 3) {
      this.time.delayedCall(800, () => this._finishOpponentHalf());
    } else {
      this.time.delayedCall(600, () => this._startNewAtBat());
    }
  }

  _showPitchSelection() {
    // Legacy — redirect to showdown flow
    this._startNewAtBat();
  }

  _destroyPitchButtons() {
    if (this._pitchButtons) {
      this._pitchButtons.forEach(el => el.destroy());
      this._pitchButtons = null;
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

        this.time.delayedCall(1500, () => this._startNewAtBat());
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
      this._startNewAtBat();
    });

    this._pitchButtons.push(keepBg, keepText, keepSub);
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
    this._updateBases([null, null, null]);

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

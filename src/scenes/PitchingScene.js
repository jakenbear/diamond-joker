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
    const liveOppScore = s.opponentScore + (this._pitchState ? this._pitchState.runs : 0);
    this.scoreText.setText(`${playerName} ${s.playerScore}  -  ${liveOppScore} ${oppName}`);
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
    this.runnerLabels = [null, null, null];
    this.homePosition = { x: cx, y: cy + size };

    // Pitcher sprite at mound (your team)
    const team = this.rosterManager.getTeam();
    const teamKey = team ? TEAM_SPRITE_KEY[team.name] : 'usa';
    const pitcherKey = `sprite_${teamKey}_pitcher`;
    if (this.textures.exists(pitcherKey)) {
      const myPitcher = this.rosterManager.getMyPitcher();
      const pitcherLefty = myPitcher && myPitcher.throws === 'L';
      this.pitcherMoundSprite = this.add.image(cx, cy, pitcherKey)
        .setScale(2).setDepth(3).setFlipX(pitcherLefty);
    }

    // Opponent batter sprite at home plate (updated each at-bat for handedness)
    const oppTeam = this.rosterManager.getOpponentTeam();
    const oppKey = oppTeam ? TEAM_SPRITE_KEY[oppTeam.name] : 'usa';
    const batterKey = `sprite_${oppKey}_batter`;
    this._pitchDiamondCx = cx;
    this._pitchDiamondCy = cy;
    this._pitchDiamondSize = size;
    if (this.textures.exists(batterKey)) {
      const oppBatter = this.rosterManager.opponentRoster[this.rosterManager.opponentBatterIndex];
      const isLefty = oppBatter && oppBatter.bats === 'L';
      const xOff = isLefty ? 18 : -18;
      this.oppBatterSprite = this.add.image(cx + xOff, cy + size - 5, batterKey)
        .setScale(2).setDepth(3).setFlipX(isLefty);
    }
  }

  _updateBases(bases) {
    const homePos = this.homePosition;
    // Process 3rd → 2nd → 1st (lead runners advance first)
    const order = [2, 1, 0];
    for (const i of order) {
      const bp = this.basePositions[i];
      const stagger = (2 - i) * 200;
      if (bases[i] && !this.runners[i]) {
        const fromPos = i === 0 ? homePos : this.basePositions[i - 1];
        const oppTeam = this.rosterManager.getOpponentTeam();
        const oppKey = oppTeam ? TEAM_SPRITE_KEY[oppTeam.name] : 'usa';
        const runnerKey = `sprite_${oppKey}_runner`;
        const runner = this.textures.exists(runnerKey)
          ? this.add.image(fromPos.x, fromPos.y, runnerKey).setScale(2).setDepth(3).setFlipX(true)
          : this.add.circle(fromPos.x, fromPos.y, 7, 0xffd600).setDepth(3);
        this._spawnRunnerTrail(fromPos, bp);
        this.tweens.add({ targets: runner, x: bp.x, y: bp.y, duration: 500, delay: stagger, ease: 'Quad.easeInOut' });
        this.runners[i] = runner;
      } else if (!bases[i] && this.runners[i]) {
        const toPos = i === 2 ? homePos : this.basePositions[i + 1];
        this._spawnRunnerTrail(bp, toPos);
        const runnerRef = this.runners[i];
        this.tweens.add({
          targets: runnerRef, x: toPos.x, y: toPos.y, alpha: 0, duration: 500,
          delay: stagger, ease: 'Quad.easeIn',
          onComplete: () => runnerRef.destroy(),
        });
        this.runners[i] = null;
      }

      // Runner name label
      if (this.runnerLabels[i]) {
        this.runnerLabels[i].destroy();
        this.runnerLabels[i] = null;
      }
      if (bases[i] && typeof bases[i] === 'object' && bases[i].name) {
        const lastName = bases[i].name.split(' ').pop();
        const labelY = i === 1 ? bp.y - 18 : bp.y - 16;
        const label = this.add.text(bp.x, labelY, lastName, {
          fontSize: '8px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
        }).setOrigin(0.5, 1).setDepth(4).setAlpha(0);
        this.tweens.add({ targets: label, alpha: 0.9, duration: 300, delay: 200 });
        this.runnerLabels[i] = label;
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

    // Update pitcher mound sprite flip for handedness
    if (this.pitcherMoundSprite) {
      this.pitcherMoundSprite.setFlipX(pitcher.throws === 'L');
    }

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

    // Update opponent batter sprite position based on handedness
    if (this.oppBatterSprite) {
      const isLefty = batter.bats === 'L';
      this.oppBatterSprite.setX(this._pitchDiamondCx + (isLefty ? 18 : -18));
      this.oppBatterSprite.setFlipX(isLefty);
    }

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

    const pitcher = this.rosterManager.getMyPitcher();
    const repertoire = assignPitchRepertoire(pitcher);
    const keys = [...repertoire, 'ibb'];
    const pitchColors = {
      fastball: 0xe53935, breaking: 0x1e88e5, slider: 0xfb8c00, changeup: 0x43a047,
      cutter: 0xab47bc, curveball: 0x1565c0, sinker: 0x6d4c41, splitter: 0xd84315,
      twoseam: 0xc62828, knuckle: 0x00838f, screwball: 0x7b1fa2, palmball: 0x2e7d32,
      ibb: 0x757575,
    };
    const colors = keys.map(k => pitchColors[k] || 0x757575);
    const stamina = this.rosterManager.getMyPitcherStamina();

    const pitchSpacing = 120;
    const pitchStartX = 640 - ((keys.length - 1) * pitchSpacing) / 2;

    keys.forEach((key, i) => {
      const pitch = PITCH_TYPES[key];
      const x = pitchStartX + i * pitchSpacing;
      const y = HAND_Y;

      const cardSprite = this.add.image(x, y, 'card_back_red')
        .setDisplaySize(CARD_W, CARD_H).setDepth(5).setTint(colors[i]);
      const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0x000000, 0)
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
        this.tweens.add({ targets: [bg, cardSprite], y: y - 8, duration: 100 });
        this.tweens.add({ targets: nameText, y: nameY - 8, duration: 100 });
        this.tweens.add({ targets: costText, y: costY - 8, duration: 100 });
        this.tweens.add({ targets: descText, y: descY - 8, duration: 100 });
      });
      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, 0xffffff);
        this.tweens.add({ targets: [bg, cardSprite], y: y, duration: 100 });
        this.tweens.add({ targets: nameText, y: nameY, duration: 100 });
        this.tweens.add({ targets: costText, y: costY, duration: 100 });
        this.tweens.add({ targets: descText, y: descY, duration: 100 });
      });
      bg.on('pointerdown', () => this._onPitchSelected(key));

      this._pitchButtons.push(cardSprite, bg, nameText, costText, descText);
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
    const descs = {
      fastball: 'High K\nMore XBH',
      breaking: 'Hard to hit\nWalk risk',
      slider: 'Weak contact\nLow XBH',
      changeup: 'Saves arm\nSafe hits',
      cutter: 'Good Ks\nJams hitters',
      curveball: 'Big break\nNeeds control',
      sinker: 'Groundballs\nEasy contact',
      splitter: 'Whiff pitch\nHigh cost',
      twoseam: 'Heavy ball\nWeak contact',
      knuckle: 'Wild pitch\nVery cheap',
      screwball: 'Rare break\nHard to hit',
      palmball: 'Slow & safe\nVery cheap',
      ibb: 'Free pass\nto 1st base',
    };
    return descs[key] || '';
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

    // Compute staff modifiers for pitching
    const staff = this.baseball.getStaff();
    const staffMods = { hitReduction: 0, fatigueDelay: 0 };
    for (const s of staff) {
      if (!s.effect) continue;
      if (s.effect.type === 'pitcher_hit_reduction') staffMods.hitReduction += s.effect.value;
      if (s.effect.type === 'pitcher_fatigue_delay') staffMods.fatigueDelay += s.effect.value;
    }

    // Add synergy-based pitcher mods (southpaw_stack, strong_middle)
    const synergies = SynergyEngine.calculate(this.rosterManager.getRoster());
    for (const syn of synergies) {
      if (syn.bonus.type === 'pitcher_hit_reduction') staffMods.hitReduction += syn.bonus.value;
      if (syn.bonus.type === 'pitcher_control_reduction') staffMods.hitReduction += syn.bonus.value * 0.03;
    }

    const result = this.rosterManager.simSingleAtBat(inning, pitchType, ps.bases, staffMods);

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
    if (result.scored > 0) this._updateScoreboard();

    // Game log entry
    const oppBatterLast = result.batter.name.split(' ').pop().slice(0, 8);
    const pitchAbbr = {
      Fastball: 'FB', 'Breaking Ball': 'BRK', Slider: 'SLD', Changeup: 'CHG',
      Cutter: 'CUT', Curveball: 'CRV', Sinker: 'SNK', Splitter: 'SPL',
      'Two-Seam': '2S', Knuckleball: 'KNK', Screwball: 'SCR', Palmball: 'PLM',
      'Intentional Walk': 'IBB',
    };
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
    const LOG_START_Y = 420;
    const LOG_LINE_H = 26;
    const MAX_VISIBLE = 4;

    // Scroll existing entries up if we've exceeded the visible limit
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

    this.tweens.add({
      targets: logLine, alpha: 1, y: logY, duration: 200,
    });

    this._updateBases(ps.bases);

    // Walk-off check: opponent takes the lead in 9th inning or later
    const status = this.baseball.getStatus();
    const liveOppScore = status.opponentScore + ps.runs;
    if (status.inning >= 9 && liveOppScore > status.playerScore) {
      this.time.delayedCall(800, () => this._finishOpponentHalf());
    } else if (ps.outs >= 3) {
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

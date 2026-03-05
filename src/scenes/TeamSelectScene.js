/**
 * TeamSelectScene.js - Pick your team, pitcher, then opponent.
 * Flow: Phase 1 (pick team) → Phase 2 (roster + pitcher) → Phase 3 (pick opponent) → Game
 */
import TEAMS from '../../data/teams.js';

const CARD_W = 250;
const CARD_H = 320;
const CARD_GAP = 30;

export default class TeamSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TeamSelectScene' });
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x0d3311);
    this.elements = [];
    this.selectedTeam = null;
    this.selectedPitcherIdx = 0;
    this.opponentTeam = null;

    this._showTeamCards();
  }

  // ── Phase 1: Pick Your Team ─────────────────────────────

  _showTeamCards() {
    this._clearElements();

    const title = this.add.text(640, 40, 'CHOOSE YOUR TEAM', {
      fontSize: '36px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.elements.push(title);

    const totalW = TEAMS.length * CARD_W + (TEAMS.length - 1) * CARD_GAP;
    const startX = (1280 - totalW) / 2 + CARD_W / 2;
    const cardY = 230;

    TEAMS.forEach((team, i) => {
      const x = startX + i * (CARD_W + CARD_GAP);
      this._createTeamCard(x, cardY, team, i, () => {
        this.selectedTeam = team;
        this.selectedPitcherIdx = 0;
        this._showRosterView(team);
      });
    });

    const hint = this.add.text(640, 430, 'Click a team to view roster', {
      fontSize: '16px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5);
    this.elements.push(hint);
  }

  // ── Phase 2: Roster + Pitcher Picker ────────────────────

  _showRosterView(team) {
    this._clearElements();

    // Header
    const headerBg = this.add.rectangle(640, 38, 1280, 74, team.colorHex, 0.15);
    this.elements.push(headerBg);

    const headerLogo = this.add.text(80, 38, team.logo, {
      fontSize: '40px',
    }).setOrigin(0.5);
    this.elements.push(headerLogo);

    const headerName = this.add.text(130, 25, `${team.name.toUpperCase()} ${team.nickname.toUpperCase()}`, {
      fontSize: '28px', fontFamily: 'monospace', color: team.color, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.elements.push(headerName);

    const headerStyle = this.add.text(130, 50, team.style, {
      fontSize: '13px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0, 0.5);
    this.elements.push(headerStyle);

    // Back button
    this._addBackButton(() => this._showTeamCards());

    // ── Batting Order (left side) ──
    const rosterTitle = this.add.text(40, 90, 'BATTING ORDER', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    });
    this.elements.push(rosterTitle);

    const colLabels = this.add.text(40, 115,
      '#   POS  NAME', {
      fontSize: '12px', fontFamily: 'monospace', color: '#666666',
    });
    this.elements.push(colLabels);

    this.add.rectangle(350, 128, 660, 1, 0x444444);

    team.batters.forEach((b, i) => {
      const rowY = 145 + i * 34;
      const num = `${i + 1}`.padStart(2);
      const pos = b.pos.padEnd(4);
      const name = b.name.padEnd(20);

      if (i % 2 === 0) {
        const rowBg = this.add.rectangle(350, rowY + 4, 660, 30, 0xffffff, 0.03);
        this.elements.push(rowBg);
      }

      const txt = this.add.text(40, rowY, `${num}   ${pos} ${name}`, {
        fontSize: '14px', fontFamily: 'monospace', color: '#cccccc',
      });
      this.elements.push(txt);

      this._drawStatBar(460, rowY + 4, b.power, '#e53935');
      this._drawStatBar(530, rowY + 4, b.contact, '#42a5f5');
      this._drawStatBar(600, rowY + 4, b.speed, '#66bb6a');
    });

    const legend = this.add.text(440, 115, 'PWR       CNT       SPD', {
      fontSize: '12px', fontFamily: 'monospace', color: '#666666',
    });
    this.elements.push(legend);

    // ── Pitching Staff (right side) ──
    const pitchTitle = this.add.text(720, 90, 'PITCHING STAFF', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    });
    this.elements.push(pitchTitle);

    const pitchSub = this.add.text(720, 115, 'Click to select your starter', {
      fontSize: '12px', fontFamily: 'monospace', color: '#888888',
    });
    this.elements.push(pitchSub);

    this.pitcherCards = [];
    team.pitchers.forEach((p, i) => {
      this._createPitcherCard(720, 150 + i * 64, p, i, team);
    });

    // ── NEXT button ──
    const nextY = 620;
    this.starterLabel = this.add.text(640, nextY - 50,
      `Starter: ${team.pitchers[this.selectedPitcherIdx].name}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.elements.push(this.starterLabel);

    const nextBg = this.add.rectangle(640, nextY, 280, 56, team.colorHex)
      .setStrokeStyle(2, 0xffd600)
      .setInteractive({ useHandCursor: true });
    const nextTxt = this.add.text(640, nextY, 'CHOOSE OPPONENT >', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.elements.push(nextBg, nextTxt);

    nextBg.on('pointerover', () => nextBg.setFillStyle(0xffd600).setAlpha(0.9));
    nextBg.on('pointerout', () => { nextBg.setFillStyle(team.colorHex); nextBg.setAlpha(1); });
    nextBg.on('pointerdown', () => this._showOpponentPicker());

    // Animate
    this.elements.forEach((el, i) => {
      el.setAlpha(0);
      this.tweens.add({ targets: el, alpha: 1, duration: 200, delay: Math.min(i * 15, 300) });
    });
  }

  // ── Phase 3: Pick Opponent ──────────────────────────────

  _showOpponentPicker() {
    this._clearElements();

    const yourTeam = this.selectedTeam;

    const title = this.add.text(640, 30, 'CHOOSE YOUR OPPONENT', {
      fontSize: '36px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.elements.push(title);

    // Show your team summary at top
    const yourLabel = this.add.text(640, 70,
      `${yourTeam.logo} You: ${yourTeam.name} ${yourTeam.nickname}  |  Pitcher: ${yourTeam.pitchers[this.selectedPitcherIdx].name}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0.5);
    this.elements.push(yourLabel);

    // Back button
    this._addBackButton(() => this._showRosterView(yourTeam));

    // Show other 3 teams as cards
    const opponents = TEAMS.filter(t => t.id !== yourTeam.id);
    const totalW = opponents.length * CARD_W + (opponents.length - 1) * CARD_GAP;
    const startX = (1280 - totalW) / 2 + CARD_W / 2;
    const cardY = 270;

    opponents.forEach((team, i) => {
      const x = startX + i * (CARD_W + CARD_GAP);
      this._createTeamCard(x, cardY, team, i, () => {
        this.opponentTeam = team;
        this._showMatchupConfirm();
      });
    });

    const hint = this.add.text(640, 470, 'Pick a team to face', {
      fontSize: '16px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5);
    this.elements.push(hint);
  }

  // ── Phase 4: Matchup Confirm ────────────────────────────

  _showMatchupConfirm() {
    this._clearElements();

    const yourTeam = this.selectedTeam;
    const oppTeam = this.opponentTeam;

    // VS screen
    const title = this.add.text(640, 50, 'MATCHUP', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.elements.push(title);

    // Your team (left)
    const yourPanel = this.add.rectangle(320, 280, 400, 360, yourTeam.colorHex, 0.12)
      .setStrokeStyle(2, yourTeam.colorHex);
    this.elements.push(yourPanel);

    this.add.text(320, 120, yourTeam.logo, { fontSize: '64px' }).setOrigin(0.5);
    const yourName = this.add.text(320, 175, yourTeam.name.toUpperCase(), {
      fontSize: '32px', fontFamily: 'monospace', color: yourTeam.color, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.elements.push(yourName);

    const yourNick = this.add.text(320, 210, yourTeam.nickname, {
      fontSize: '18px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.elements.push(yourNick);

    // Your lineup preview
    const yourPitcher = yourTeam.pitchers[this.selectedPitcherIdx];
    const yourStarter = this.add.text(320, 250, `Starter: ${yourPitcher.name}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#81c784',
    }).setOrigin(0.5);
    this.elements.push(yourStarter);

    const yourStats = this.add.text(320, 275,
      `VEL ${yourPitcher.velocity}  CTL ${yourPitcher.control}  STM ${yourPitcher.stamina}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5);
    this.elements.push(yourStats);

    // Top 3 batters
    yourTeam.batters.slice(0, 4).forEach((b, i) => {
      const txt = this.add.text(180, 310 + i * 22,
        `${b.pos.padEnd(3)} ${b.name}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#bbbbbb',
      });
      this.elements.push(txt);
    });
    const moreY = this.add.text(180, 310 + 4 * 22, '... and 5 more', {
      fontSize: '11px', fontFamily: 'monospace', color: '#666666',
    });
    this.elements.push(moreY);

    // VS
    const vs = this.add.text(640, 260, 'VS', {
      fontSize: '48px', fontFamily: 'monospace', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.elements.push(vs);

    // Opponent team (right)
    const oppPanel = this.add.rectangle(960, 280, 400, 360, oppTeam.colorHex, 0.12)
      .setStrokeStyle(2, oppTeam.colorHex);
    this.elements.push(oppPanel);

    this.add.text(960, 120, oppTeam.logo, { fontSize: '64px' }).setOrigin(0.5);
    const oppName = this.add.text(960, 175, oppTeam.name.toUpperCase(), {
      fontSize: '32px', fontFamily: 'monospace', color: oppTeam.color, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.elements.push(oppName);

    const oppNick = this.add.text(960, 210, oppTeam.nickname, {
      fontSize: '18px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.elements.push(oppNick);

    // Opponent ace pitcher
    const oppAce = oppTeam.pitchers[0]; // Their ace
    const oppStarter = this.add.text(960, 250, `Starter: ${oppAce.name}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#e57373',
    }).setOrigin(0.5);
    this.elements.push(oppStarter);

    const oppPStats = this.add.text(960, 275,
      `VEL ${oppAce.velocity}  CTL ${oppAce.control}  STM ${oppAce.stamina}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5);
    this.elements.push(oppPStats);

    // Opponent top batters
    oppTeam.batters.slice(0, 4).forEach((b, i) => {
      const txt = this.add.text(820, 310 + i * 22,
        `${b.pos.padEnd(3)} ${b.name}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#bbbbbb',
      });
      this.elements.push(txt);
    });
    const moreO = this.add.text(820, 310 + 4 * 22, '... and 5 more', {
      fontSize: '11px', fontFamily: 'monospace', color: '#666666',
    });
    this.elements.push(moreO);

    // Back button
    this._addBackButton(() => this._showOpponentPicker());

    // START GAME
    const startY = 530;
    const startBg = this.add.rectangle(640, startY, 300, 60, 0x2e7d32)
      .setStrokeStyle(3, 0xffd600)
      .setInteractive({ useHandCursor: true });
    const startTxt = this.add.text(640, startY, 'PLAY BALL!', {
      fontSize: '30px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.elements.push(startBg, startTxt);

    startBg.on('pointerover', () => startBg.setFillStyle(0x388e3c));
    startBg.on('pointerout', () => startBg.setFillStyle(0x2e7d32));
    startBg.on('pointerdown', () => {
      this.scene.start('GameScene', {
        team: this.selectedTeam,
        pitcherIndex: this.selectedPitcherIdx,
        opponentTeam: this.opponentTeam,
      });
    });

    // Animate
    this.elements.forEach((el, i) => {
      el.setAlpha(0);
      this.tweens.add({ targets: el, alpha: 1, duration: 250, delay: Math.min(i * 20, 400) });
    });
  }

  // ── Shared Helpers ──────────────────────────────────────

  _createTeamCard(x, y, team, idx, onClick) {
    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0x1a3a1a)
      .setStrokeStyle(3, team.colorHex)
      .setInteractive({ useHandCursor: true });
    this.elements.push(bg);

    const banner = this.add.rectangle(x, y - CARD_H / 2 + 30, CARD_W - 4, 58, team.colorHex, 0.25);
    this.elements.push(banner);

    const logo = this.add.text(x, y - 115, team.logo, { fontSize: '56px' }).setOrigin(0.5);
    this.elements.push(logo);

    const name = this.add.text(x, y - 55, team.name.toUpperCase(), {
      fontSize: '26px', fontFamily: 'monospace', color: team.color, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.elements.push(name);

    const nick = this.add.text(x, y - 28, team.nickname, {
      fontSize: '16px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.elements.push(nick);

    const div = this.add.rectangle(x, y + 5, CARD_W - 40, 1, team.colorHex, 0.4);
    this.elements.push(div);

    const style = this.add.text(x, y + 30, team.style, {
      fontSize: '12px', fontFamily: 'monospace', color: '#81c784',
      wordWrap: { width: CARD_W - 30 }, align: 'center',
    }).setOrigin(0.5);
    this.elements.push(style);

    const avgPow = (team.batters.reduce((s, b) => s + b.power, 0) / 9).toFixed(1);
    const avgCon = (team.batters.reduce((s, b) => s + b.contact, 0) / 9).toFixed(1);
    const avgSpd = (team.batters.reduce((s, b) => s + b.speed, 0) / 9).toFixed(1);

    const stats = this.add.text(x, y + 70,
      `PWR ${avgPow}  CNT ${avgCon}  SPD ${avgSpd}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#999999',
    }).setOrigin(0.5);
    this.elements.push(stats);

    const pCount = this.add.text(x, y + 95, `${team.pitchers.length} pitchers`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#777777',
    }).setOrigin(0.5);
    this.elements.push(pCount);

    const all = [bg, banner, logo, name, nick, div, style, stats, pCount];
    all.forEach(el => { el.setAlpha(0); el.y += 20; });
    this.tweens.add({
      targets: all, alpha: 1, y: '-=20',
      duration: 300, delay: idx * 100 + 100, ease: 'Quad.easeOut',
    });

    bg.on('pointerover', () => {
      bg.setStrokeStyle(3, 0xffd600);
      this.tweens.add({ targets: all, scaleX: 1.03, scaleY: 1.03, duration: 100 });
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(3, team.colorHex);
      this.tweens.add({ targets: all, scaleX: 1, scaleY: 1, duration: 100 });
    });

    bg.on('pointerdown', onClick);
  }

  _createPitcherCard(x, y, pitcher, idx, team) {
    const w = 500;
    const h = 52;
    const isSelected = idx === this.selectedPitcherIdx;

    const bg = this.add.rectangle(x + w / 2 - 20, y + h / 2, w, h,
      isSelected ? team.colorHex : 0x1a3a1a, isSelected ? 0.3 : 1)
      .setStrokeStyle(2, isSelected ? 0xffd600 : 0x333333)
      .setInteractive({ useHandCursor: true });
    this.elements.push(bg);

    if (isSelected) {
      const badge = this.add.text(x - 10, y + h / 2, '\u2605', {
        fontSize: '20px', fontFamily: 'monospace', color: '#ffd600',
      }).setOrigin(0.5);
      this.elements.push(badge);
    }

    const name = this.add.text(x + 10, y + 10, pitcher.name, {
      fontSize: '16px', fontFamily: 'monospace',
      color: isSelected ? '#ffffff' : '#bbbbbb',
      fontStyle: isSelected ? 'bold' : 'normal',
    });
    this.elements.push(name);

    const statsStr = `VEL ${pitcher.velocity}  CTL ${pitcher.control}  STM ${pitcher.stamina}`;
    const stats = this.add.text(x + 10, y + 30, statsStr, {
      fontSize: '12px', fontFamily: 'monospace', color: '#888888',
    });
    this.elements.push(stats);

    this._drawStatBar(x + 280, y + 16, pitcher.velocity, '#ff7043');
    this._drawStatBar(x + 350, y + 16, pitcher.control, '#42a5f5');
    this._drawStatBar(x + 420, y + 16, pitcher.stamina, '#66bb6a');

    bg.on('pointerover', () => {
      if (idx !== this.selectedPitcherIdx) bg.setStrokeStyle(2, 0xffd600);
    });
    bg.on('pointerout', () => {
      if (idx !== this.selectedPitcherIdx) bg.setStrokeStyle(2, 0x333333);
    });
    bg.on('pointerdown', () => {
      this.selectedPitcherIdx = idx;
      this._showRosterView(team);
    });
  }

  _addBackButton(onClick) {
    const backBg = this.add.rectangle(1180, 38, 140, 36, 0x333333)
      .setStrokeStyle(1, 0x555555)
      .setInteractive({ useHandCursor: true });
    const backTxt = this.add.text(1180, 38, '< BACK', {
      fontSize: '16px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.elements.push(backBg, backTxt);

    backBg.on('pointerover', () => backBg.setFillStyle(0x444444));
    backBg.on('pointerout', () => backBg.setFillStyle(0x333333));
    backBg.on('pointerdown', onClick);
  }

  _drawStatBar(x, y, value, color) {
    const bgBar = this.add.rectangle(x, y, 50, 8, 0x333333).setOrigin(0, 0.5);
    this.elements.push(bgBar);

    const fillW = Math.max(2, (value / 10) * 50);
    const fill = this.add.rectangle(x, y, fillW, 8,
      Phaser.Display.Color.HexStringToColor(color).color).setOrigin(0, 0.5);
    this.elements.push(fill);

    const label = this.add.text(x + 54, y, `${value}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#999999',
    }).setOrigin(0, 0.5);
    this.elements.push(label);
  }

  _clearElements() {
    this.elements.forEach(el => el.destroy());
    this.elements = [];
    this.pitcherCards = [];
  }
}

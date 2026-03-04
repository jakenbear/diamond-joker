/**
 * RosterManager.js - Player roster + pitcher management.
 * All player/pitcher DATA lives in data/players.js and data/pitchers.js.
 */
import PLAYER_POOL from '../data/players.js';
import PITCHER_POOL from '../data/pitchers.js';

const MAX_TRAITS_PER_PLAYER = 2;
const MAX_PITCHER_TRAITS = 2;

export default class RosterManager {
  constructor() {
    this.roster = [];
    this.currentBatterIndex = 0;
    this.pitcher = null;
    this._pickRoster();
    this._pickPitcher();
  }

  _pickRoster() {
    const pool = [...PLAYER_POOL];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.roster = pool.slice(0, 9).map((p, i) => ({
      ...p,
      traits: [],
      lineupIndex: i,
    }));
  }

  _pickPitcher() {
    const idx = Math.floor(Math.random() * PITCHER_POOL.length);
    this.pitcher = {
      ...PITCHER_POOL[idx],
      traits: [],
    };
  }

  getCurrentPitcher() {
    return this.pitcher;
  }

  setPitcherTraits(traits) {
    this.pitcher.traits = traits.slice(0, MAX_PITCHER_TRAITS);
  }

  getCurrentBatter() {
    return this.roster[this.currentBatterIndex];
  }

  getCurrentBatterIndex() {
    return this.currentBatterIndex;
  }

  advanceBatter() {
    this.currentBatterIndex = (this.currentBatterIndex + 1) % 9;
    return this.getCurrentBatter();
  }

  equipTrait(playerIndex, traitCard) {
    const player = this.roster[playerIndex];
    if (!player) return false;
    if (player.traits.length >= MAX_TRAITS_PER_PLAYER) return false;
    player.traits.push(traitCard);
    return true;
  }

  applyBatterModifiers(evalResult, gameState) {
    const batter = this.getCurrentBatter();
    const result = { ...evalResult };

    const isHit = result.outcome !== 'Strikeout' && result.outcome !== 'Groundout' && result.outcome !== 'Flyout';
    if (!isHit) return result;

    const powerBonus = Math.max(0, batter.power - 5);
    result.chips += powerBonus;

    const contactBonus = batter.contact / 10;
    result.mult += contactBonus;

    result.score = result.chips * result.mult;
    result.extraBaseChance = batter.speed * 0.05;

    return result;
  }

  applyPitcherModifiers(evalResult, _gameState) {
    const pitcher = this.pitcher;
    const result = { ...evalResult };

    if (result.outcome === 'Single' || result.outcome === 'Double') {
      const velPenalty = Math.max(0, pitcher.velocity - 6);
      result.chips = Math.max(0, result.chips - Math.floor(velPenalty / 2));
    }

    const controlPenalty = pitcher.control * 0.05;
    result.mult = Math.max(1, result.mult - controlPenalty);

    result.score = result.chips * result.mult;
    return result;
  }

  getRoster() {
    return this.roster;
  }
}

export { MAX_TRAITS_PER_PLAYER, MAX_PITCHER_TRAITS };

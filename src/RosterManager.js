/**
 * RosterManager.js - Player roster + pitcher management
 * Pure logic, no Phaser dependency.
 */

const PLAYER_POOL = [
  { name: 'Ace Maddox',      power: 8,  contact: 5,  speed: 4 },
  { name: 'Dusty Rhodes',    power: 6,  contact: 7,  speed: 5 },
  { name: 'Flash Kowalski',  power: 4,  contact: 6,  speed: 9 },
  { name: 'Buck Hammer',     power: 9,  contact: 4,  speed: 3 },
  { name: 'Slick Nakamura',  power: 5,  contact: 8,  speed: 7 },
  { name: 'Tank Morrison',   power: 10, contact: 3,  speed: 3 },
  { name: 'Zip Delgado',     power: 3,  contact: 7,  speed: 10 },
  { name: 'Hawk Jensen',     power: 7,  contact: 6,  speed: 6 },
  { name: 'Sparky Lee',      power: 5,  contact: 9,  speed: 5 },
  { name: 'Iron Mike Ortiz', power: 8,  contact: 5,  speed: 5 },
  { name: 'Blaze Tanaka',    power: 6,  contact: 6,  speed: 8 },
  { name: 'Chopper Davis',   power: 7,  contact: 7,  speed: 4 },
  { name: 'Sarge Williams',  power: 9,  contact: 5,  speed: 4 },
  { name: 'Scooter Patel',   power: 4,  contact: 8,  speed: 8 },
  { name: 'Brick Callahan',  power: 10, contact: 4,  speed: 4 },
  { name: 'Noodle Nguyen',   power: 3,  contact: 10, speed: 6 },
  { name: 'Jet Ramirez',     power: 5,  contact: 5,  speed: 9 },
  { name: 'Moose O\'Brien',  power: 8,  contact: 6,  speed: 3 },
  { name: 'Dizzy Flores',    power: 6,  contact: 8,  speed: 6 },
  { name: 'Lefty Kowalczyk', power: 7,  contact: 7,  speed: 5 },
];

const PITCHER_POOL = [
  { name: 'Viper Knox',       velocity: 9,  control: 5,  stamina: 4 },
  { name: 'Doc Sabbath',      velocity: 6,  control: 9,  stamina: 6 },
  { name: 'Rex "The Arm"',    velocity: 10, control: 3,  stamina: 5 },
  { name: 'Smooth Eddie',     velocity: 5,  control: 8,  stamina: 8 },
  { name: 'Blister McGraw',   velocity: 8,  control: 6,  stamina: 5 },
  { name: 'Ice Pick Petrov',  velocity: 7,  control: 7,  stamina: 7 },
  { name: 'Tornado Gomez',    velocity: 9,  control: 4,  stamina: 6 },
  { name: 'The Professor',    velocity: 4,  control: 10, stamina: 7 },
  { name: 'Bulldog Brewer',   velocity: 7,  control: 6,  stamina: 9 },
  { name: 'Razor Ikeda',      velocity: 8,  control: 7,  stamina: 4 },
  { name: 'Sandman Reeves',   velocity: 6,  control: 8,  stamina: 6 },
  { name: 'Wildfire Cruz',    velocity: 10, control: 4,  stamina: 4 },
  { name: 'Dice Holloway',    velocity: 5,  control: 6,  stamina: 9 },
  { name: 'Phantom Yuen',     velocity: 7,  control: 9,  stamina: 5 },
  { name: 'Hammer Schmidt',   velocity: 9,  control: 5,  stamina: 6 },
];

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

  /** Randomly pick 9 players from the pool */
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

  /** Randomly pick a pitcher and assign 1-2 random pitcher traits */
  _pickPitcher() {
    const idx = Math.floor(Math.random() * PITCHER_POOL.length);
    this.pitcher = {
      ...PITCHER_POOL[idx],
      traits: [], // Traits assigned by TraitManager after construction
    };
  }

  /** Get the current pitcher */
  getCurrentPitcher() {
    return this.pitcher;
  }

  /** Assign pitcher traits (called once at game start by TraitManager) */
  setPitcherTraits(traits) {
    this.pitcher.traits = traits.slice(0, MAX_PITCHER_TRAITS);
  }

  /** Get the current batter */
  getCurrentBatter() {
    return this.roster[this.currentBatterIndex];
  }

  getCurrentBatterIndex() {
    return this.currentBatterIndex;
  }

  /** Advance to the next batter in the lineup */
  advanceBatter() {
    this.currentBatterIndex = (this.currentBatterIndex + 1) % 9;
    return this.getCurrentBatter();
  }

  /** Equip a trait card to a player. Returns true if successful. */
  equipTrait(playerIndex, traitCard) {
    const player = this.roster[playerIndex];
    if (!player) return false;
    if (player.traits.length >= MAX_TRAITS_PER_PLAYER) return false;
    player.traits.push(traitCard);
    return true;
  }

  /**
   * Apply the current batter's stat modifiers to an eval result.
   * Power → bonus chips, Contact → bonus mult, Speed → extra base chance.
   */
  applyBatterModifiers(evalResult, gameState) {
    const batter = this.getCurrentBatter();
    const result = { ...evalResult };

    const isHit = result.outcome !== 'Strikeout' && result.outcome !== 'Groundout';
    if (!isHit) return result;

    // Power: bonus chips (power - 5, so average player gives +1)
    const powerBonus = Math.max(0, batter.power - 5);
    result.chips += powerBonus;

    // Contact: bonus mult (contact/10, so 10 contact = +1.0 mult)
    const contactBonus = batter.contact / 10;
    result.mult += contactBonus;

    result.score = result.chips * result.mult;

    // Speed: chance to advance extra base (speed * 5% chance)
    result.extraBaseChance = batter.speed * 0.05;

    return result;
  }

  /**
   * Apply pitcher stat modifiers to an eval result.
   * Velocity → penalty mult on weak hands, Control → higher groundout chance.
   */
  applyPitcherModifiers(evalResult, _gameState) {
    const pitcher = this.pitcher;
    const result = { ...evalResult };

    // Velocity: reduce chips on weak hits (Single/Double)
    if (result.outcome === 'Single' || result.outcome === 'Double') {
      const velPenalty = Math.max(0, pitcher.velocity - 6); // 0-4 chip penalty
      result.chips = Math.max(0, result.chips - Math.floor(velPenalty / 2));
    }

    // Control: slight mult reduction on all hands
    const controlPenalty = pitcher.control * 0.05; // 0.15 - 0.5
    result.mult = Math.max(1, result.mult - controlPenalty);

    result.score = result.chips * result.mult;
    return result;
  }

  getRoster() {
    return this.roster;
  }
}

export { PLAYER_POOL, PITCHER_POOL, MAX_TRAITS_PER_PLAYER, MAX_PITCHER_TRAITS };

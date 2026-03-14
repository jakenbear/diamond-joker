/**
 * RosterManager.js - Player roster + pitcher management.
 * Manages your team (batting) and opponent team (their batters face your pitcher).
 */
import TEAMS from '../data/teams.js';
import BATTER_TRAITS from '../data/batter_traits.js';

const MAX_TRAITS_PER_PLAYER = 2;
const MAX_BONUS_PLAYERS = 3;
const MAX_PITCHER_TRAITS = 2;

const PITCH_TYPES = {
  fastball: {
    name: 'Fastball',
    hitChanceMod: -0.03,
    kBonusMult: 1.15,
    xbhMult: 1.4,
    staminaCost: 0.06,
    description: 'Best strikeout pitch, but drains stamina and hits go further',
  },
  breaking: {
    name: 'Breaking Ball',
    hitChanceMod: -0.05,
    kBonusMult: 1.0,
    xbhMult: 0.8,
    staminaCost: 0.04,
    description: 'Harder to hit, but walk risk if low control',
  },
  changeup: {
    name: 'Changeup',
    hitChanceMod: 0,
    kBonusMult: 0.95,
    xbhMult: 0.6,
    staminaCost: 0.02,
    description: 'Cheapest on stamina, limits extra-base hits',
  },
  slider: {
    name: 'Slider',
    hitChanceMod: -0.02,
    kBonusMult: 1.05,
    xbhMult: 0.5,
    staminaCost: 0.03,
    description: 'Groundball pitch — weak contact if they hit',
  },
  cutter: {
    name: 'Cutter',
    hitChanceMod: -0.03,
    kBonusMult: 1.08,
    xbhMult: 0.7,
    staminaCost: 0.04,
    description: 'Fastball-slider hybrid. Good Ks, jams batters',
  },
  curveball: {
    name: 'Curveball',
    hitChanceMod: -0.04,
    kBonusMult: 1.1,
    xbhMult: 0.5,
    staminaCost: 0.04,
    description: 'Big break. High K but needs control to land',
  },
  sinker: {
    name: 'Sinker',
    hitChanceMod: 0.01,
    kBonusMult: 0.85,
    xbhMult: 0.3,
    staminaCost: 0.03,
    description: 'Easy to hit, but almost always a groundball',
  },
  splitter: {
    name: 'Splitter',
    hitChanceMod: -0.04,
    kBonusMult: 1.2,
    xbhMult: 0.9,
    staminaCost: 0.05,
    description: 'Devastating whiff pitch. High stamina cost',
  },
  twoseam: {
    name: 'Two-Seam',
    hitChanceMod: -0.01,
    kBonusMult: 0.9,
    xbhMult: 0.4,
    staminaCost: 0.03,
    description: 'Heavy movement. Induces weak contact',
  },
  knuckle: {
    name: 'Knuckleball',
    hitChanceMod: -0.06,
    kBonusMult: 1.0,
    xbhMult: 1.2,
    staminaCost: 0.01,
    description: 'Unpredictable. Low cost but big hits possible',
  },
  screwball: {
    name: 'Screwball',
    hitChanceMod: -0.05,
    kBonusMult: 1.05,
    xbhMult: 0.6,
    staminaCost: 0.05,
    description: 'Rare reverse break. Hard to hit, taxing to throw',
  },
  palmball: {
    name: 'Palmball',
    hitChanceMod: -0.01,
    kBonusMult: 0.9,
    xbhMult: 0.4,
    staminaCost: 0.02,
    description: 'Slow changeup variant. Cheap and safe',
  },
  ibb: {
    name: 'Intentional Walk',
    hitChanceMod: 0,
    kBonusMult: 0,
    xbhMult: 0,
    staminaCost: 0,
    description: 'Puts batter on 1st base',
  },
};

/**
 * Assign 4 pitches to a pitcher based on velocity/control profile.
 * Every pitcher gets a fastball variant + 3 secondary pitches.
 */
function assignPitchRepertoire(pitcher) {
  if (pitcher.pitches) return pitcher.pitches; // already assigned
  const v = pitcher.velocity, c = pitcher.control;
  let pitches;
  if (v >= 10) {
    // Flamethrower: pure gas + power secondaries
    pitches = ['fastball', 'splitter', 'slider', 'cutter'];
  } else if (v >= 9 && c >= 7) {
    // Ace: elite stuff both ways
    pitches = ['fastball', 'cutter', 'curveball', 'splitter'];
  } else if (v >= 9) {
    // Power pitcher: velocity + swing-and-miss
    pitches = ['fastball', 'slider', 'splitter', 'breaking'];
  } else if (v >= 8 && c >= 8) {
    // Complete pitcher: well-rounded mix
    pitches = ['fastball', 'cutter', 'changeup', 'curveball'];
  } else if (c >= 9) {
    // Surgeon: pinpoint control pitches
    pitches = ['sinker', 'curveball', 'palmball', 'cutter'];
  } else if (c >= 8) {
    // Control artist: precision and deception
    pitches = ['twoseam', 'curveball', 'changeup', 'cutter'];
  } else if (v >= 8) {
    // Hard thrower: power with breaking stuff
    pitches = ['fastball', 'slider', 'cutter', 'breaking'];
  } else if (v <= 5 && c <= 5) {
    // Junkballer: weird stuff
    pitches = ['knuckle', 'screwball', 'palmball', 'changeup'];
  } else if (pitcher.stamina >= 8) {
    // Workhorse: efficient mix
    pitches = ['sinker', 'twoseam', 'changeup', 'slider'];
  } else {
    // Balanced: standard repertoire
    pitches = ['fastball', 'slider', 'changeup', 'breaking'];
  }
  pitcher.pitches = pitches;
  return pitches;
}

export default class RosterManager {
  /**
   * @param {Object} team - Your team object from TEAMS
   * @param {number} pitcherIndex - Your starting pitcher index
   * @param {Object} opponentTeam - Opponent team object from TEAMS
   */
  constructor(team, pitcherIndex = 0, opponentTeam = null) {
    this.team = team;
    this.roster = team.batters.map((p, i) => ({
      ...p,
      traits: [],
      lineupIndex: i,
    }));
    this.currentBatterIndex = 0;

    // Bonus player tracking
    this.bonusPlayerCount = 0;
    this.benchedPlayers = [];

    // Your pitcher (pitches against opponent batters)
    this.myPitcher = { ...team.pitchers[pitcherIndex] };
    this.myPitcherStamina = 1.0;

    // Bullpen: all pitchers except the starter
    this.bullpen = team.pitchers
      .filter((_, i) => i !== pitcherIndex)
      .map(p => ({ ...p, used: false }));

    // Opponent team
    this.opponentTeam = opponentTeam;
    if (opponentTeam) {
      this.opponentRoster = opponentTeam.batters.map((p, i) => ({
        ...p,
        lineupIndex: i,
      }));
      // Opponent's ace pitches against you
      this.pitcher = {
        ...opponentTeam.pitchers[0],
        teamName: opponentTeam.name,
        teamLogo: opponentTeam.logo,
        traits: [],
      };
      this.opponentBatterIndex = 0;
    } else {
      this.opponentRoster = [];
      this.pitcher = { name: 'Unknown', velocity: 5, control: 5, stamina: 5, traits: [] };
      this.opponentBatterIndex = 0;
    }
  }

  // ── Your batting lineup ─────────────────────────────────

  getCurrentPitcher() {
    return this.pitcher; // opponent's pitcher (faces you)
  }

  getMyPitcher() {
    return this.myPitcher; // your pitcher (faces opponent batters)
  }

  getOpponentTeam() {
    return this.opponentTeam;
  }

  getMyPitcherStamina() {
    return this.myPitcherStamina;
  }

  /** Get available (unused) bullpen pitchers */
  getAvailableBullpen() {
    return this.bullpen.filter(p => !p.used);
  }

  /**
   * Swap in a reliever from the bullpen.
   * @param {number} index - Index into the bullpen array
   * @returns {Object} The new active pitcher
   */
  swapPitcher(index) {
    const reliever = this.bullpen[index];
    if (!reliever || reliever.used) return this.myPitcher;
    reliever.used = true;
    this.myPitcher = { ...reliever };
    this.myPitcherStamina = 1.0;
    return this.myPitcher;
  }

  /**
   * Simulate a single opponent at-bat with a chosen pitch type.
   * Drains stamina, advances opponent batter index.
   * @param {number} inning - current inning for fatigue calc
   * @param {string} pitchType - key from PITCH_TYPES
   * @param {boolean[]} bases - [1st, 2nd, 3rd] runner state (mutated in place)
   * @returns {{ outcome: string, isOut: boolean, basesGained: number, batter: object, walked: boolean, scored: number }}
   */
  simSingleAtBat(inning, pitchType, bases, staffMods = null) {
    const pitcher = this.myPitcher;
    let fatigue = this._getPitcherFatigue(pitcher, inning);
    // Bullpen Coach: delay fatigue onset
    if (staffMods && staffMods.fatigueDelay > 0) {
      fatigue = this._getPitcherFatigue(pitcher, Math.max(1, inning - staffMods.fatigueDelay));
    }
    const pitch = PITCH_TYPES[pitchType];
    const batter = this.opponentRoster[this.opponentBatterIndex];

    // Drain stamina
    this.myPitcherStamina = Math.max(0, this.myPitcherStamina - pitch.staminaCost);

    // IBB — automatic walk
    if (pitchType === 'ibb') {
      const scored = this._advanceRunners(bases, 1, 0, batter);
      this.opponentBatterIndex = (this.opponentBatterIndex + 1) % 9;
      return { outcome: 'Walk (IBB)', isOut: false, basesGained: 1, batter, walked: true, scored };
    }

    const hitReduction = staffMods ? (staffMods.hitReduction || 0) : 0;
    const result = this._simAtBatWithPitch(pitcher, batter, fatigue, pitch, hitReduction);

    // Breaking ball walk risk: max(0, (6 - control) * 0.04)
    if (pitchType === 'breaking' && !result.isOut) {
      // Only check walk risk if it wasn't already an out
    }
    if (pitchType === 'breaking') {
      const walkChance = Math.max(0, (6 - pitcher.control) * 0.04);
      if (walkChance > 0 && Math.random() < walkChance) {
        const scored = this._advanceRunners(bases, 1, 0, batter);
        this.opponentBatterIndex = (this.opponentBatterIndex + 1) % 9;
        return { outcome: 'Walk', isOut: false, basesGained: 1, batter, walked: true, scored };
      }
    }

    let scored = 0;
    if (result.isOut) {
      // No runner advancement on outs
    } else {
      scored = this._advanceRunners(bases, result.basesGained, batter.speed, batter);
    }

    this.opponentBatterIndex = (this.opponentBatterIndex + 1) % 9;
    return { outcome: result.outcome, isOut: result.isOut, basesGained: result.basesGained, batter, walked: false, scored };
  }

  /**
   * At-bat sim with pitch type modifiers applied.
   * Stamina modulates fatigue: effectiveFatigue = inningFatigue * (0.5 + stamina * 0.5)
   */
  _simAtBatWithPitch(pitcher, batter, fatigue, pitch, hitReduction = 0) {
    const effectiveFatigue = fatigue * (0.5 + this.myPitcherStamina * 0.5);

    const pitchStrength = (pitcher.velocity * 0.6 + pitcher.control * 0.4) * effectiveFatigue;
    const batStrength = batter.contact * 0.6 + batter.power * 0.4;

    const matchup = batStrength - pitchStrength;
    const baseHitChance = Math.min(0.50, Math.max(0.12, 0.28 + matchup * 0.025));
    const hitChance = Math.min(0.50, Math.max(0.05, baseHitChance + pitch.hitChanceMod - hitReduction));

    const roll = Math.random();

    if (roll > hitChance) {
      // Out — apply K bonus
      const outRoll = Math.random();
      const kThreshold = (pitcher.velocity >= 8 ? 0.4 : 0.2) * pitch.kBonusMult;
      if (outRoll < kThreshold) {
        return { outcome: 'Strikeout', isOut: true, basesGained: 0 };
      } else if (outRoll < kThreshold + 0.3) {
        return { outcome: 'Groundout', isOut: true, basesGained: 0 };
      } else {
        return { outcome: 'Flyout', isOut: true, basesGained: 0 };
      }
    }

    // Hit — apply XBH multiplier
    const hitRoll = Math.random();
    const powerFactor = batter.power / 10;

    const hrChance = (0.01 + powerFactor * 0.03) * pitch.xbhMult;
    const tripleChance = (0.05 + powerFactor * 0.08) * pitch.xbhMult;
    const doubleChance = (0.20 + powerFactor * 0.12) * pitch.xbhMult;

    if (hitRoll < hrChance) {
      return { outcome: 'Home Run', isOut: false, basesGained: 4 };
    } else if (hitRoll < tripleChance) {
      return { outcome: 'Triple', isOut: false, basesGained: 3 };
    } else if (hitRoll < doubleChance) {
      return { outcome: 'Double', isOut: false, basesGained: 2 };
    } else {
      return { outcome: 'Single', isOut: false, basesGained: 1 };
    }
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
    // Bonus players can hold innate + 2 shop traits (3 total)
    const cap = player.isBonus ? 3 : MAX_TRAITS_PER_PLAYER;
    if (player.traits.length >= cap) return false;
    player.traits.push(traitCard);
    return true;
  }

  // ── Bonus Players ──────────────────────────────────────

  /**
   * Add a bonus player to the roster, benching the player at replaceIndex.
   * Innate trait is auto-equipped and doesn't count toward the shop trait cap.
   * Returns false if at max bonus players or invalid index.
   */
  addBonusPlayer(bonusPlayer, replaceIndex) {
    if (this.bonusPlayerCount >= MAX_BONUS_PLAYERS) return false;
    if (replaceIndex < 0 || replaceIndex >= this.roster.length) return false;

    const benched = this.roster[replaceIndex];
    this.benchedPlayers.push(benched);

    const bp = {
      ...bonusPlayer,
      traits: [],
      isBonus: true,
      lineupIndex: replaceIndex,
    };

    // Equip innate trait (marked so it doesn't count toward shop cap)
    const trait = BATTER_TRAITS.find(t => t.id === bonusPlayer.innateTraitId);
    if (trait) bp.traits.push({ ...trait, isInnate: true });

    this.roster[replaceIndex] = bp;
    this.bonusPlayerCount++;
    return true;
  }

  /** Get all active lineup effects from bonus players in the roster. */
  getActiveLineupEffects() {
    return this.roster
      .filter(p => p.isBonus && p.lineupEffect)
      .map(p => p.lineupEffect);
  }

  applyBatterModifiers(evalResult, gameState) {
    const batter = this.getCurrentBatter();
    const result = { ...evalResult };
    const bonuses = { powerChips: 0, contactMult: 0, contactSave: false };

    // Contact save: batter can rescue a pair that became a Groundout
    if (result.wasGroundout && result.originalHand === 'Pair') {
      const saveChance = batter.contact * 0.04;
      if (Math.random() < saveChance) {
        result.outcome = 'Single';
        result.handName = 'Pair';
        result.chips = 1;
        result.mult = 1.5;
        result.score = 2;
        result.wasGroundout = false;
        result.playedDescription = `Pair of ${result.pairRank >= 11 ? {11:'J',12:'Q',13:'K',14:'A'}[result.pairRank] : result.pairRank}s (Contact!)`;
        bonuses.contactSave = true;
        // Fall through to apply normal hit bonuses below
      } else {
        return { result, bonuses };
      }
    }

    const isHit = result.outcome !== 'Strikeout' && result.outcome !== 'Groundout' && result.outcome !== 'Flyout';
    if (!isHit) return { result, bonuses };

    const powerBonus = Math.max(0, batter.power - 5);
    bonuses.powerChips = powerBonus;
    result.chips += powerBonus;

    const contactBonus = batter.contact / 10;
    bonuses.contactMult = contactBonus;
    result.mult = Math.round((result.mult + contactBonus) * 10) / 10;

    result.score = Math.round(result.chips * result.mult);
    result.extraBaseChance = batter.speed * 0.05;

    return { result, bonuses };
  }

  applyPitcherModifiers(evalResult, gameState) {
    const pitcher = this.pitcher;
    const result = { ...evalResult };

    // Pitcher fatigue: effectiveness drops after inning 5 based on stamina
    const inning = gameState ? gameState.inning : 1;
    const fatigue = this._getPitcherFatigue(pitcher, inning);

    if (result.outcome === 'Single' || result.outcome === 'Double') {
      const velPenalty = Math.max(0, (pitcher.velocity * fatigue) - 6);
      result.chips = Math.max(0, result.chips - Math.floor(velPenalty / 2));
    }

    const controlPenalty = (pitcher.control * fatigue) * 0.05;
    result.mult = Math.round(Math.max(1, result.mult - controlPenalty) * 10) / 10;

    result.score = Math.round(result.chips * result.mult);
    return result;
  }

  /**
   * Calculate pitcher fatigue multiplier (1.0 = fresh, lower = tired).
   * Stamina determines when fatigue kicks in.
   */
  _getPitcherFatigue(pitcher, inning) {
    // Fatigue starts after inning (stamina - 1). High stamina = lasts longer.
    const fatigueStart = Math.max(3, pitcher.stamina - 1);
    if (inning <= fatigueStart) return 1.0;
    // Lose ~5% effectiveness per inning past the fatigue threshold
    const fatigueInnings = inning - fatigueStart;
    return Math.max(0.5, 1.0 - fatigueInnings * 0.08);
  }

  // ── Opponent half-inning sim ────────────────────────────

  /**
   * Simulate the opponent's half-inning.
   * Your pitcher faces their batters until 3 outs.
   * Returns { runs, log[] } where log is play-by-play entries.
   */
  /**
   * @param {number} inning - current inning for fatigue calculation
   */
  simOpponentHalfInning(inning = 1) {
    const pitcher = this.myPitcher;
    const fatigue = this._getPitcherFatigue(pitcher, inning);
    let outs = 0;
    let runs = 0;
    const bases = [false, false, false]; // 1st, 2nd, 3rd
    const log = [];

    while (outs < 3) {
      const batter = this.opponentRoster[this.opponentBatterIndex];
      const result = this._simAtBat(pitcher, batter, fatigue);

      if (result.isOut) {
        outs++;
        log.push({
          batter: batter.name,
          pos: batter.pos,
          outcome: result.outcome,
          isOut: true,
        });
      } else {
        // Advance runners
        const scored = this._advanceRunners(bases, result.basesGained, batter.speed, batter);
        runs += scored;
        log.push({
          batter: batter.name,
          pos: batter.pos,
          outcome: result.outcome,
          isOut: false,
          scored,
        });
      }

      this.opponentBatterIndex = (this.opponentBatterIndex + 1) % 9;
    }

    return { runs, log };
  }

  /**
   * Simulate a single at-bat: pitcher stats vs batter stats.
   * Returns { outcome, isOut, basesGained }
   */
  _simAtBat(pitcher, batter, fatigue = 1.0) {
    // Pitcher strength: velocity + control, reduced by fatigue
    // Batter strength: power + contact (higher = better at hitting)
    const pitchStrength = (pitcher.velocity * 0.6 + pitcher.control * 0.4) * fatigue;
    const batStrength = batter.contact * 0.6 + batter.power * 0.4;

    // Base probability of a hit: batter vs pitcher matchup
    // Scale from ~0.15 (weak batter vs strong pitcher) to ~0.45 (strong vs weak)
    const matchup = batStrength - pitchStrength;
    const hitChance = Math.min(0.50, Math.max(0.12, 0.28 + matchup * 0.025));

    const roll = Math.random();

    if (roll > hitChance) {
      // Out - type based on pitcher style
      const outRoll = Math.random();
      if (pitcher.velocity >= 8 && outRoll < 0.4) {
        return { outcome: 'Strikeout', isOut: true, basesGained: 0 };
      } else if (outRoll < 0.6) {
        return { outcome: 'Groundout', isOut: true, basesGained: 0 };
      } else {
        return { outcome: 'Flyout', isOut: true, basesGained: 0 };
      }
    }

    // Hit - type based on batter power
    const hitRoll = Math.random();
    const powerFactor = batter.power / 10;

    if (hitRoll < 0.01 + powerFactor * 0.03) {
      // Home run: ~1-4% chance on a hit
      return { outcome: 'Home Run', isOut: false, basesGained: 4 };
    } else if (hitRoll < 0.05 + powerFactor * 0.08) {
      // Triple: ~4-13%
      return { outcome: 'Triple', isOut: false, basesGained: 3 };
    } else if (hitRoll < 0.20 + powerFactor * 0.12) {
      // Double: ~15-32%
      return { outcome: 'Double', isOut: false, basesGained: 2 };
    } else {
      return { outcome: 'Single', isOut: false, basesGained: 1 };
    }
  }

  /**
   * Advance runners on bases. Returns number of runs scored.
   */
  _advanceRunners(bases, basesGained, batterSpeed, batter = null) {
    let scored = 0;

    if (basesGained >= 4) {
      // Home run: everyone scores
      scored += bases.filter(b => b).length + 1;
      bases[0] = bases[1] = bases[2] = null;
      return scored;
    }

    // Move runners forward by basesGained
    for (let i = 2; i >= 0; i--) {
      if (bases[i]) {
        const runner = bases[i];
        bases[i] = null;
        const newBase = i + basesGained;
        if (newBase >= 3) {
          scored++;
        } else {
          bases[newBase] = runner;
        }
      }
    }

    // Place batter on base
    if (basesGained >= 3) {
      scored++; // Triple+ means batter also scored (shouldn't happen with basesGained=3 but safety)
    }
    if (basesGained === 3) {
      bases[2] = batter || true; // batter on 3rd
    } else if (basesGained === 2) {
      bases[1] = batter || true; // batter on 2nd
    } else if (basesGained === 1) {
      bases[0] = batter || true; // batter on 1st
    }

    // Speed bonus: small chance runner advances extra
    if (batterSpeed >= 7 && Math.random() < batterSpeed * 0.03) {
      for (let i = 1; i >= 0; i--) {
        if (bases[i] && !bases[i + 1]) {
          const runner = bases[i];
          bases[i] = null;
          bases[i + 1] = runner;
          break;
        }
      }
    }

    return scored;
  }

  getRoster() {
    return this.roster;
  }

  getTeam() {
    return this.team;
  }
}

export { TEAMS, MAX_TRAITS_PER_PLAYER, MAX_PITCHER_TRAITS, PITCH_TYPES, assignPitchRepertoire };

/**
 * CountManager.js - Count-based discard system.
 * Pure logic, no Phaser dependency.
 *
 * Each discard = a pitch. Outcome depends on batter/pitcher stats:
 *   Before 2 strikes: STRIKE or BALL
 *   At 2 strikes: FOUL, STRIKE, or BALL
 * 3 strikes = strikeout (at-bat over). 4 balls = walk.
 */

const COUNT_MODIFIERS = {
  '3-0': { peanutsMod: 2, multMod: 1.0 },
  '2-0': { peanutsMod: 1, multMod: 0.5 },
  '3-1': { peanutsMod: 1, multMod: 0.5 },
  '3-2': { peanutsMod: 0, multMod: 0.5 },
  '0-1': { peanutsMod: 0, multMod: -0.2 },
  '1-2': { peanutsMod: 0, multMod: -0.3 },
  '0-2': { peanutsMod: -1, multMod: -0.5 },
};

export default class CountManager {
  constructor() {
    this.balls = 0;
    this.strikes = 0;
    this.foulCount = 0;
  }

  reset() {
    this.balls = 0;
    this.strikes = 0;
    this.foulCount = 0;
  }

  /**
   * Record a discard as a pitch.
   * @param {number} pitcherVelocity - pitcher velocity stat (1-10)
   * @param {number} pitcherControl - pitcher control stat (1-10)
   * @param {number} batterContact - batter contact stat (1-10)
   * @returns {{ isStrike, isBall, isFoul, isStrikeout, isWalk }}
   */
  recordDiscard(pitcherVelocity, pitcherControl, batterContact) {
    const result = { isStrike: false, isBall: false, isFoul: false, isStrikeout: false, isWalk: false };

    let baseStrikeChance = 0.40
      + (pitcherVelocity - 5) * 0.02
      + (pitcherControl - 5) * 0.02
      - (batterContact - 5) * 0.03;
    baseStrikeChance = Math.max(0.15, Math.min(0.65, baseStrikeChance));

    if (this.strikes < 2) {
      if (Math.random() < baseStrikeChance) {
        this.strikes++;
        result.isStrike = true;
      } else {
        this.balls++;
        result.isBall = true;
        if (this.balls >= 4) {
          result.isWalk = true;
        }
      }
    } else {
      const foulChance = batterContact * 0.04;
      const remaining = 1.0 - foulChance;
      const strikeChance = remaining * baseStrikeChance;

      const roll = Math.random();
      if (roll < foulChance) {
        this.foulCount++;
        result.isFoul = true;
      } else if (roll < foulChance + strikeChance) {
        this.strikes++;
        result.isStrike = true;
        result.isStrikeout = true;
      } else {
        this.balls++;
        result.isBall = true;
        if (this.balls >= 4) {
          result.isWalk = true;
        }
      }
    }

    return result;
  }

  getCount() {
    return { balls: this.balls, strikes: this.strikes };
  }

  getCountModifiers() {
    const key = `${this.balls}-${this.strikes}`;
    return COUNT_MODIFIERS[key] || { peanutsMod: 0, multMod: 0 };
  }

  isWalk() {
    return this.balls >= 4;
  }

  isStrikeout() {
    return this.strikes >= 3;
  }

  setStartingBalls(startBalls) {
    this.balls = Math.min(3, startBalls);
  }
}

export { COUNT_MODIFIERS };

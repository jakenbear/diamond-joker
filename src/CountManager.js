/**
 * CountManager.js - Tracks balls/strikes per at-bat.
 * Pure logic, no Phaser dependency.
 *
 * Each discard is a pitch: always a strike (capped at 2, fouls protect),
 * with a chance of also being a ball based on pitcher control.
 * 4 balls = walk (at-bat ends immediately).
 */

const COUNT_MODIFIERS = {
  '3-0': { chipsMod: 2, multMod: 1.0 },
  '2-0': { chipsMod: 1, multMod: 0.5 },
  '3-1': { chipsMod: 1, multMod: 0.5 },
  '1-0': { chipsMod: 0, multMod: 0.3 },
  '2-1': { chipsMod: 0, multMod: 0.3 },
  '3-2': { chipsMod: 0, multMod: 0.5 },
  '0-0': { chipsMod: 0, multMod: 0 },
  '1-1': { chipsMod: 0, multMod: 0 },
  '2-2': { chipsMod: 0, multMod: 0 },
  '0-1': { chipsMod: 0, multMod: -0.2 },
  '1-2': { chipsMod: 0, multMod: -0.3 },
  '0-2': { chipsMod: -1, multMod: -0.5 },
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
   * Strike always increments (fouls protect at 2 strikes).
   * Ball chance rolled based on pitcher control.
   * @param {number} pitcherControl - opponent pitcher's control stat (1-10)
   * @returns {{ isStrike: boolean, isBall: boolean, isWalk: boolean, isFoul: boolean }}
   */
  recordDiscard(pitcherControl) {
    const result = { isStrike: false, isBall: false, isWalk: false, isFoul: false };

    // Ball chance: max(0, (7 - control) * 0.08)
    const ballChance = Math.max(0, (7 - pitcherControl) * 0.08);
    if (ballChance > 0 && Math.random() < ballChance) {
      this.balls++;
      result.isBall = true;
      if (this.balls >= 4) {
        result.isWalk = true;
        return result;
      }
    }

    // Strike logic: increment unless at 2 strikes (foul protection)
    if (this.strikes < 2) {
      this.strikes++;
      result.isStrike = true;
    } else {
      this.foulCount++;
      result.isFoul = true;
    }

    return result;
  }

  getCount() {
    return { balls: this.balls, strikes: this.strikes };
  }

  /**
   * Get count-dependent modifiers for hand evaluation.
   * @returns {{ chipsMod: number, multMod: number }}
   */
  getCountModifiers() {
    const key = `${this.balls}-${this.strikes}`;
    return COUNT_MODIFIERS[key] || { chipsMod: 0, multMod: 0 };
  }

  isWalk() {
    return this.balls >= 4;
  }

  /**
   * Set starting balls (e.g. Walk Machine trait gives +1 ball).
   * @param {number} startBalls
   */
  setStartingBalls(startBalls) {
    this.balls = Math.min(3, startBalls);
  }
}

export { COUNT_MODIFIERS };

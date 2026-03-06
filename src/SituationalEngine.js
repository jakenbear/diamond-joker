/**
 * SituationalEngine.js - Post-evaluation outcome transformations.
 * Pure logic, no Phaser dependency.
 *
 * Checks for Double Play, Fielder's Choice, Error, and Dropped Third Strike
 * conditions and transforms the outcome when they trigger.
 * Also provides Wild Pitch and HBP checks for use during discards/at-bat start.
 */

export default class SituationalEngine {
  /**
   * Check if the outcome should be transformed by a situational play.
   * Called after hand evaluation, before BaseballState.resolveOutcome().
   *
   * @param {string} outcome - Current outcome ('Groundout', 'Flyout', etc.)
   * @param {Object} gameState - From baseball.getStatus() { outs, bases, inning, ... }
   * @param {number} batterSpeed - Current batter's speed stat (1-10)
   * @returns {{ outcome: string, transformed: boolean, type: string|null, description: string|null }}
   */
  static check(outcome, gameState, batterSpeed) {
    // Error check applies to all outs (groundouts + flyouts)
    if (outcome === 'Groundout' || outcome === 'Flyout') {
      const errorResult = SituationalEngine._checkError(outcome, gameState);
      if (errorResult) return errorResult;
    }

    // DP and FC only apply to groundouts with runner on 1st
    if (outcome === 'Groundout' && gameState.bases[0] && gameState.outs < 2) {
      const dpResult = SituationalEngine._checkDoublePlay(gameState, batterSpeed);
      if (dpResult) return dpResult;
    }

    if (outcome === 'Groundout' && gameState.bases[0]) {
      const fcResult = SituationalEngine._checkFieldersChoice(gameState);
      if (fcResult) return fcResult;
    }

    // Dropped Third Strike: strikeout + 1st base empty
    if (outcome === 'Strikeout' && !gameState.bases[0]) {
      const d3kResult = SituationalEngine._checkDroppedThirdStrike(batterSpeed);
      if (d3kResult) return d3kResult;
    }

    return { outcome, transformed: false, type: null, description: null };
  }

  /**
   * Dropped Third Strike: 5% + (speed * 1%) chance.
   * Requires: Strikeout + 1st base empty.
   * Batter reaches 1st.
   */
  static _checkDroppedThirdStrike(batterSpeed) {
    const chance = 0.05 + batterSpeed * 0.01;
    if (Math.random() < chance) {
      return {
        outcome: 'Dropped Third Strike',
        transformed: true,
        type: 'dropped_third_strike',
        description: 'Dropped third strike! Batter races to first!',
      };
    }
    return null;
  }

  /**
   * Wild Pitch check: called per discard when runners are on base.
   * Chance = (6 - control) * 2%. Lead runner advances 1 base.
   * @param {number} pitcherControl - opponent pitcher's control stat
   * @param {boolean[]} bases - current base state
   * @returns {{ triggered: boolean, description: string|null }}
   */
  static checkWildPitch(pitcherControl, bases) {
    if (!bases.some(b => b)) return { triggered: false, description: null };
    const chance = Math.max(0, (6 - pitcherControl) * 0.02);
    if (chance > 0 && Math.random() < chance) {
      return {
        triggered: true,
        description: 'Wild pitch! Runner advances!',
      };
    }
    return { triggered: false, description: null };
  }

  /**
   * HBP check: called at start of each at-bat.
   * Chance = (5 - control) * 1.5%. Batter gets free base.
   * @param {number} pitcherControl - opponent pitcher's control stat
   * @returns {{ triggered: boolean, description: string|null }}
   */
  static checkHBP(pitcherControl) {
    const chance = Math.max(0, (5 - pitcherControl) * 0.015);
    if (chance > 0 && Math.random() < chance) {
      return {
        triggered: true,
        description: 'Hit by pitch! Batter takes first base!',
      };
    }
    return { triggered: false, description: null };
  }

  /**
   * Double Play: 35% - (speed * 3%) chance.
   * Requires: Groundout + runner on 1st + < 2 outs.
   */
  static _checkDoublePlay(gameState, batterSpeed) {
    const dpChance = Math.max(0.05, 0.35 - batterSpeed * 0.03);
    if (Math.random() < dpChance) {
      return {
        outcome: 'Double Play',
        transformed: true,
        type: 'double_play',
        description: `Ground ball to short — double play! (${Math.round(dpChance * 100)}% chance)`,
      };
    }
    return null;
  }

  /**
   * Fielder's Choice: 40% of non-DP groundouts with runner on 1st.
   * Batter reaches 1st, lead runner is out.
   */
  static _checkFieldersChoice(gameState) {
    if (Math.random() < 0.40) {
      return {
        outcome: 'Fielder\'s Choice',
        transformed: true,
        type: 'fielders_choice',
        description: 'Fielder\'s choice — lead runner thrown out!',
      };
    }
    return null;
  }

  /**
   * Error: 4% base chance on groundouts/flyouts, +1% per inning past 6th.
   * Out becomes a single.
   */
  static _checkError(outcome, gameState) {
    const baseChance = 0.04;
    const lateInningBonus = Math.max(0, (gameState.inning - 6) * 0.01);
    const errorChance = baseChance + lateInningBonus;
    if (Math.random() < errorChance) {
      return {
        outcome: 'Error',
        transformed: true,
        type: 'error',
        description: `Error on the ${outcome.toLowerCase()}! Batter reaches first!`,
      };
    }
    return null;
  }
}

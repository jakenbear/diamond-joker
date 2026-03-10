/**
 * BaseballState.js - Baseball game state machine
 * Pure logic, no Phaser dependency.
 *
 * States: BATTING → RESOLVE → BATTING | SWITCH_SIDE | GAME_OVER
 */

const OUTCOME_EFFECTS = {
  'Strikeout':          { basesToMove: 0, isOut: true },
  'Groundout':          { basesToMove: 0, isOut: true },
  'Flyout':             { basesToMove: 0, isOut: true },
  'Single':             { basesToMove: 1, isOut: false },
  'Double':             { basesToMove: 2, isOut: false },
  'Triple':             { basesToMove: 3, isOut: false },
  'Home Run':           { basesToMove: 4, isOut: false },
  'Grand Slam':         { basesToMove: 4, isOut: false },
  'RBI Double':         { basesToMove: 2, isOut: false },
  'Inside-the-Park HR': { basesToMove: 4, isOut: false },
  'Walk-Off':           { basesToMove: 4, isOut: false },
  'Perfect Game':       { basesToMove: 4, isOut: false },
  'Walk':               { basesToMove: 1, isOut: false },
  'Double Play':        { basesToMove: 0, isOut: true, outsRecorded: 2 },
  'Fielder\'s Choice':  { basesToMove: 0, isOut: true, fieldsersChoice: true },
  'Error':              { basesToMove: 1, isOut: false },
  'Dropped Third Strike': { basesToMove: 1, isOut: false },
  'HBP':                { basesToMove: 1, isOut: false },
  'Sac Bunt':           { basesToMove: 0, isOut: true, sacBunt: true },
};

export default class BaseballState {
  constructor() {
    this.reset();
  }

  reset() {
    this.inning = 1;
    this.half = 'top';       // 'top' = player bats, 'bottom' = opponent bats
    this.outs = 0;
    this.bases = [null, null, null]; // [1st, 2nd, 3rd] — null or batter object
    this.playerScore = 0;
    this.opponentScore = 0;
    this.state = 'BATTING';  // BATTING | RESOLVE | SWITCH_SIDE | GAME_OVER
    this.lastResult = null;
    this.totalChips = 0;
    this.shopVisited = new Set(); // Track which innings we've shown shop for
    // Per-inning run tracking for box score (index 0 = inning 1)
    this.playerRunsByInning = [];
    this.opponentRunsByInning = [];
    this._currentInningPlayerRuns = 0;
    this._atBatsThisInning = 0;  // Track at-bats for first_batter_of_inning
    this.pairsPlayedThisInning = 0;
  }

  /** Get total accumulated chips (currency for shop) */
  getTotalChips() {
    return this.totalChips;
  }

  /** Spend chips in the shop. Returns true if successful. */
  spendChips(amount) {
    if (this.totalChips < amount) return false;
    this.totalChips -= amount;
    return true;
  }

  /**
   * Check if shop should appear after the current inning transition.
   * Shop shows after every inning (except the last).
   */
  shouldShowShop() {
    if (this.inning > 9) return false;
    if (this.shopVisited.has(this.inning)) return false;
    return true;
  }

  /**
   * Get max purchases allowed for this shop visit.
   * Innings 1-3: 1 buy, 4-6: 2 buys, 7-9: 3 buys.
   */
  getShopBuyLimit() {
    if (this.inning <= 3) return 1;
    if (this.inning <= 6) return 2;
    return 3;
  }

  /** Mark the current inning's shop as visited */
  markShopVisited() {
    this.shopVisited.add(this.inning);
  }

  /**
   * Resolve an outcome from a played hand.
   * @param {string} outcome - The baseball outcome name
   * @param {number} handScore - Score from the hand (chips * mult) to accumulate
   * Returns { runsScored, description, state }
   */
  resolveOutcome(outcome, handScore = 0, batter = null) {
    const effect = OUTCOME_EFFECTS[outcome];
    if (!effect) {
      return { runsScored: 0, description: 'Unknown outcome', state: this.state };
    }

    this._atBatsThisInning++;

    // Accumulate chips from hand score
    this.totalChips += Math.floor(handScore);

    let runsScored = 0;
    let description = outcome;

    if (effect.isOut) {
      // Double Play: 2 outs, remove lead runner from 1st
      if (effect.outsRecorded === 2) {
        this.outs += 2;
        this.bases[0] = null; // runner on 1st out
        description = `Double Play! Outs: ${this.outs}`;
      } else if (effect.sacBunt) {
        // Sac Bunt: advance all runners 1 base, then record the out
        // advanceAllRunners() already updates playerScore internally
        const sacRuns = this.advanceAllRunners();
        runsScored += sacRuns;
        this.outs++;
        description = sacRuns > 0
          ? `Sac Bunt - Out ${this.outs}, ${sacRuns} run${sacRuns > 1 ? 's' : ''} scored!`
          : `Sac Bunt - Out ${this.outs}, runners advance`;
      } else if (effect.fieldsersChoice) {
        // Fielder's Choice: lead runner out, batter safe on 1st
        this.outs++;
        // Remove the lead runner (highest occupied base)
        for (let i = 2; i >= 0; i--) {
          if (this.bases[i]) { this.bases[i] = null; break; }
        }
        this.bases[0] = batter || true; // batter reaches 1st
        description = `Fielder's Choice - Out ${this.outs}`;
      } else {
        this.outs++;
        description = `${outcome} - Out ${this.outs}`;
      }

      if (this.outs >= 3) {
        this.bases = [null, null, null];
        this.outs = 0;
        this.state = 'SWITCH_SIDE';
        description += ' - Side retired!';
      } else {
        this.state = 'BATTING';
      }
    } else {
      runsScored = this._advanceRunners(effect.basesToMove, batter);

      if (this.half === 'top') {
        this.playerScore += runsScored;
        this._currentInningPlayerRuns += runsScored;
      } else {
        this.opponentScore += runsScored;
      }

      description = `${outcome}!`;
      if (runsScored > 0) {
        description += ` ${runsScored} run${runsScored > 1 ? 's' : ''} scored!`;
      }

      // Walk-off check: bottom of 9th (or later), player is ahead
      if (this._checkWalkOff()) {
        this.state = 'GAME_OVER';
        description += ' WALK-OFF WIN!';
      } else {
        this.state = 'BATTING';
      }
    }

    this.lastResult = { runsScored, description, state: this.state, outcome };
    return this.lastResult;
  }

  /**
   * Process a sacrifice fly: runner on 3rd scores, batter is out.
   * Called when the sacrificeFly flag is set on the eval result.
   */
  processSacrificeFly() {
    if (!this.bases[2]) return 0;
    this.bases[2] = null;
    this.playerScore += 1;
    this._currentInningPlayerRuns += 1;
    return 1;
  }

  /**
   * Process stolen base: advance runner from 1st to 2nd.
   * Called before the at-bat resolves when stolenBase flag is set.
   */
  processStolenBase() {
    if (!this.bases[0]) return;
    const runner = this.bases[0];
    this.bases[0] = null;
    if (!this.bases[1]) {
      this.bases[1] = runner;
    } else if (!this.bases[2]) {
      this.bases[2] = runner;
    }
  }

  /**
   * Advance all existing runners by 1 base (no batter placed).
   * Used for full-count (3-2) runner advance.
   * Returns runs scored.
   */
  advanceAllRunners() {
    let runs = 0;
    for (let i = 2; i >= 0; i--) {
      if (!this.bases[i]) continue;
      const runner = this.bases[i];
      this.bases[i] = null;
      if (i + 1 >= 3) {
        runs++;
        this.playerScore += 1;
        this._currentInningPlayerRuns += 1;
      } else {
        this.bases[i + 1] = runner;
      }
    }
    return runs;
  }

  /**
   * Advance runners by a number of bases. Batter also occupies a base (unless HR/4).
   * Returns runs scored.
   */
  _advanceRunners(basesToMove, batter = null) {
    let runs = 0;

    if (basesToMove >= 4) {
      // Home run: all runners + batter score
      runs = this.bases.filter(b => b).length + 1;
      this.bases = [null, null, null];
      return runs;
    }

    // Advance existing runners from 3rd base backward
    for (let i = 2; i >= 0; i--) {
      if (!this.bases[i]) continue;
      const runner = this.bases[i];
      const newPos = i + basesToMove;
      this.bases[i] = null;
      if (newPos >= 3) {
        runs++;
      } else {
        this.bases[newPos] = runner;
      }
    }

    // Place batter on base
    if (basesToMove >= 1 && basesToMove <= 3) {
      this.bases[basesToMove - 1] = batter || true;
    }

    return runs;
  }

  /**
   * Check if a runner should advance an extra base (speed bonus).
   * @param {number} chance - probability 0-1
   */
  tryExtraBase(chance) {
    if (Math.random() < chance) {
      // Try to advance the lead runner one extra base
      for (let i = 2; i >= 0; i--) {
        if (this.bases[i]) {
          const runner = this.bases[i];
          this.bases[i] = null;
          if (i + 1 >= 3) {
            this.playerScore += 1;
            this._currentInningPlayerRuns += 1;
            return { scored: 1, advanced: true };
          } else {
            this.bases[i + 1] = runner;
          }
          return { scored: 0, advanced: true };
        }
      }
    }
    return { scored: 0, advanced: false };
  }

  /**
   * Switch sides after 3 outs.
   * If it was top half, opponent now bats (auto-resolved).
   * If it was bottom half, advance to next inning.
   */
  /**
   * @param {number|null} simRuns - If provided, use this instead of auto-generating
   */
  switchSide(simRuns = null) {
    if (this.half === 'top') {
      this.half = 'bottom';

      // Record player's runs for this inning
      this.playerRunsByInning.push(this._currentInningPlayerRuns);
      this._currentInningPlayerRuns = 0;

      const opponentRuns = simRuns !== null ? simRuns : this._generateOpponentRuns();
      this.opponentScore += opponentRuns;

      // Record opponent's runs for this inning
      this.opponentRunsByInning.push(opponentRuns);

      this.half = 'top';
      this.inning++;
      this._atBatsThisInning = 0;
      this.pairsPlayedThisInning = 0;

      // Check game over after 9 innings
      if (this.inning > 9 && this.playerScore !== this.opponentScore) {
        this.state = 'GAME_OVER';
      } else {
        this.state = 'BATTING';
      }

      return {
        opponentRuns,
        description: `Opponent scores ${opponentRuns} run${opponentRuns !== 1 ? 's' : ''} this inning.`,
        state: this.state,
      };
    }

    // Shouldn't reach here in our flow (player is always 'top')
    this.half = 'top';
    this.inning++;
    this.state = 'BATTING';
    return { opponentRuns: 0, description: 'Next inning', state: this.state };
  }

  /**
   * Generate opponent runs for their half-inning.
   * Scales with inning number for difficulty progression.
   */
  _generateOpponentRuns() {
    // Base chance of scoring increases with inning
    const baseChance = 0.3 + (this.inning - 1) * 0.05; // 30% inning 1, 70% inning 9
    const maxRuns = Math.min(this.inning, 5); // Cap at 5 runs per inning

    let runs = 0;
    // Simulate 3 "at-bats" for opponent
    for (let i = 0; i < 3; i++) {
      if (Math.random() < baseChance) {
        runs += Math.floor(Math.random() * Math.ceil(maxRuns / 2)) + 1;
      }
    }

    return Math.min(runs, maxRuns);
  }

  /** Check walk-off: bottom of 9th+, half is top (player), and player just took the lead */
  _checkWalkOff() {
    return this.inning >= 9 && this.half === 'top' && this.playerScore > this.opponentScore;
  }

  /** Get current game state summary */
  getStatus() {
    return {
      inning: this.inning,
      half: this.half,
      outs: this.outs,
      bases: [...this.bases],
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      state: this.state,
      totalChips: this.totalChips,
      playerRunsByInning: [...this.playerRunsByInning],
      opponentRunsByInning: [...this.opponentRunsByInning],
      currentInningPlayerRuns: this._currentInningPlayerRuns,
      atBatsThisInning: this._atBatsThisInning,
    };
  }

  /** Check if game is over */
  isGameOver() {
    return this.state === 'GAME_OVER';
  }

  /** Get final result */
  getResult() {
    if (!this.isGameOver()) return null;
    return {
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      won: this.playerScore > this.opponentScore,
      innings: this.inning,
      totalChips: this.totalChips,
      playerRunsByInning: [...this.playerRunsByInning],
      opponentRunsByInning: [...this.opponentRunsByInning],
    };
  }
}

export { OUTCOME_EFFECTS };

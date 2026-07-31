/**
 * ShowdownEngine.js — Hold'em-style pitching showdown logic.
 * Pure logic, no Phaser dependency.
 *
 * Pitcher stats shape the deck:
 *   velocity → card rank quality (higher = better cards)
 *   control  → pitch effect accuracy
 *   stamina  → deck degradation across at-bats
 */

import CardEngine from './CardEngine.js';
import HAND_TABLE from '../data/hand_table.js';

const SUITS = ['H', 'D', 'C', 'S'];

// Weight of one hand-class step when collapsing a hand to a comparable number.
// Within-class tiebreaks are base-15 over 5 rank slots, maxing at WITHIN_CLASS_MAX,
// so one class step must be worth more than that to stay strictly dominant.
const CLASS_POWER = 1_000_000;
const WITHIN_CLASS_MAX = Math.pow(15, 5); // 759,375

// How much one point of pitcher trait bonus is worth, and the hard ceiling on
// their total contribution. Two hands one class apart can differ by as little as
// CLASS_POWER - WITHIN_CLASS_MAX (best-ranked low class vs worst-ranked high
// class), so the cap must stay under that gap. Traits then sway close calls
// WITHIN a hand class but can never let a worse hand class beat a better one.
const TRAIT_POWER_MAX = CLASS_POWER - WITHIN_CLASS_MAX - 1; // 240,624
const TRAIT_POWER_PER_POINT = 6_000;

// Stamina cost per pitch (from PITCH_TYPES, simplified for showdown)
const PITCH_STAMINA = {
  fastball: 0.06, breaking: 0.04, changeup: 0.02, slider: 0.03,
  cutter: 0.04, curveball: 0.04, sinker: 0.03, splitter: 0.05,
  twoseam: 0.03, knuckle: 0.01, screwball: 0.05, palmball: 0.02,
};

export default class ShowdownEngine {
  /**
   * Generate a 20-card pitcher deck based on velocity.
   * Higher velocity = higher minimum rank floor.
   * @param {number} velocity - 1-10
   * @param {number} control - 1-10 (used later for pitch accuracy)
   * @returns {Array<{rank: number, suit: string}>}
   */
  static generateDeck(velocity, control) {
    const floor = Math.max(2, Math.round(2 + (velocity - 1) * 0.55));
    const ceiling = 14; // Ace

    // Build the pool of every DISTINCT card at or above the velocity floor, then
    // draw 20 from it without replacement. This used to draw 20 independent
    // random rank+suit pairs, which let the same physical card appear more than
    // once: 99.9% of decks held a duplicate and 46.5% of showdowns put a visibly
    // impossible duplicate on the board (K♦ in the community AND in the hole).
    // It also fabricated hands — a "Full House" off the same King twice.
    const pool = [];
    for (let rank = floor; rank <= ceiling; rank++) {
      for (const suit of SUITS) pool.push({ rank, suit });
    }

    // Partial Fisher-Yates: shuffle only the 20 slots we need.
    const n = Math.min(20, pool.length);
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(Math.random() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
  }

  constructor(pitcher) {
    this.pitcher = pitcher;
    this.pitcherDeck = [];
    this.batterDeck = [];
    this.pitcherHole = [];
    this.batterHole = [];
    this.community = [];
    this.stage = 'pre-flop';
    this.pitchesUsed = [];
    this.lockedIndices = [];
    this.faceDownIndices = [];
    this.hiddenNextCard = false;
    this.plantedCard = null;
    this._revealedBatterCards = [];
    this.staminaDrained = 0;
    this.pitcherTraits = pitcher.traits || [];
  }

  start(batterStats = null, outs = 0, inning = 1, pitcherLeadBy = 0, basesOccupied = false) {
    this.outs = outs;
    this.inning = inning;
    // pitcherLeadBy: how many runs the PITCHER'S team is ahead by (negative if behind).
    // basesOccupied: whether any runner is on base this at-bat.
    this.pitcherLeadBy = pitcherLeadBy;
    this.basesOccupied = basesOccupied;
    this.pitcherDeck = ShowdownEngine.generateDeck(this.pitcher.velocity, this.pitcher.control);
    const batterVel = batterStats ? (batterStats.contact * 0.6 + batterStats.power * 0.4) : 5;
    this.batterDeck = ShowdownEngine.generateDeck(batterVel, 5);
    this._shuffle(this.pitcherDeck);
    this._shuffle(this.batterDeck);

    this.pitcherHole = [this.pitcherDeck.pop(), this.pitcherDeck.pop()];
    this.batterHole = [this.batterDeck.pop(), this.batterDeck.pop()];
    this.community = [];
    this.stage = 'pre-flop';
    this.pitchesUsed = [];
    this.lockedIndices = [];
    this.faceDownIndices = [];
    this.hiddenNextCard = false;
    this.plantedCard = null;
    this._revealedBatterCards = [];
  }

  _dealOne() {
    // If palmball planted a card, use it as the next community card
    if (this.plantedCard) {
      const card = this.plantedCard;
      this.plantedCard = null;
      return card;
    }
    return this.pitcherDeck.pop();
  }

  dealFlop() {
    for (let i = 0; i < 3; i++) this.community.push(this._dealOne());
    this.stage = 'flop';
  }

  dealTurn() {
    this.community.push(this._dealOne());
    this.stage = 'turn';
  }

  dealRiver() {
    this.community.push(this._dealOne());
    this.stage = 'river';
  }

  // ── Resolution ──────────────────────────────────────────

  /**
   * Find best 5-card hand from 2 hole + up to 5 community.
   * Tries all C(n,5) combinations.
   *
   * Uses CardEngine.classify (PURE — no RNG) to rank combos. Do NOT use
   * evaluateHand here: it rolls the batting out-chance and zeroes a made hand's
   * score, which made this function non-deterministic and caused real
   * flushes/straights to lose to a lesser combo from the same cards.
   *
   * Ties on hand class are broken by the ranks involved (pair rank first, then
   * remaining cards high-to-low), so a pair of Aces beats a pair of 3s.
   *
   * @returns {{handName, strength, score, cards, pairRank, tiebreak, _highCard}}
   */
  static bestHand(hole, community) {
    const all = [...hole, ...community];
    if (all.length === 0) {
      return { handName: 'High Card', strength: 0, score: 0, cards: [], pairRank: 0, tiebreak: [], _highCard: 0 };
    }

    const combos = all.length < 5
      ? [all]                                        // not enough cards — judge what we have
      : ShowdownEngine._combinations(all, 5);

    let best = null;
    for (const combo of combos) {
      const c = CardEngine.classify(combo);
      const cand = {
        handName: c.handName,
        strength: c.strength,
        pairRank: c.pairRank,
        tiebreak: ShowdownEngine._tiebreak(c),
        cards: combo,
      };
      if (!best || ShowdownEngine._compare(cand, best) > 0) best = cand;
    }

    // `score` keeps the reward value from hand_table for display/peanuts, but it
    // is NOT what ranks hands — `strength` + `tiebreak` do that.
    const entry = HAND_TABLE.find(h => h.handName === best.handName);
    best.score = entry ? Math.round(entry.peanuts * entry.mult) : 0;
    best._highCard = Math.max(...all.map(c => c.rank));
    return best;
  }

  /**
   * Ordered rank list for breaking ties within the same hand class:
   * grouped ranks first (by group size, then rank), then kickers high-to-low.
   */
  static _tiebreak(classified) {
    const freq = {};
    for (const c of classified.bestCards) freq[c.rank] = (freq[c.rank] || 0) + 1;
    return Object.entries(freq)
      .map(([rank, count]) => ({ rank: parseInt(rank, 10), count }))
      .sort((a, b) => b.count - a.count || b.rank - a.rank)
      .map(g => g.rank);
  }

  /**
   * Collapse a hand into a single comparable number. The hand class dominates;
   * the tiebreak ranks refine within a class via base-15 positional weighting
   * (ranks are 2..14, so 5 slots max out just under one CLASS_POWER step).
   */
  static _power(hand) {
    let within = 0;
    const tb = hand.tiebreak || [];
    for (let i = 0; i < 5; i++) {
      within = within * 15 + (tb[i] || 0);
    }
    return (hand.strength || 0) * CLASS_POWER + within;
  }

  /** Compare two candidate hands. >0 if a is better, <0 if b is better, 0 if equal. */
  static _compare(a, b) {
    if (a.strength !== b.strength) return a.strength - b.strength;
    const len = Math.max(a.tiebreak.length, b.tiebreak.length);
    for (let i = 0; i < len; i++) {
      const ar = a.tiebreak[i] ?? 0;
      const br = b.tiebreak[i] ?? 0;
      if (ar !== br) return ar - br;
    }
    return 0;
  }

  static _combinations(arr, k) {
    const results = [];
    function combo(start, current) {
      if (current.length === k) { results.push([...current]); return; }
      for (let i = start; i < arr.length; i++) {
        current.push(arr[i]);
        combo(i + 1, current);
        current.pop();
      }
    }
    combo(0, []);
    return results;
  }

  /**
   * Resolve the showdown. Compare best hands.
   * @returns {{ winner, pitcherHand, batterHand, outcome, isOut, margin }}
   */
  resolve() {
    const pHand = ShowdownEngine.bestHand(this.pitcherHole, this.community);
    const bHand = ShowdownEngine.bestHand(this.batterHole, this.community);

    // Apply pitcher trait bonuses (may mutate the board / batter hole cards, so
    // this runs before the hands are turned into comparable power values).
    const traitBonus = this._calcTraitBonus();

    // WINNER is decided by poker hand strength (class first, then ranks) — never
    // by the peanuts/mult reward value, which is not ordered by hand strength.
    // Traits add weight WITHIN a hand class: they can break a close call but
    // cannot make a worse hand class beat a better one.
    const traitPower = Math.max(-TRAIT_POWER_MAX,
      Math.min(TRAIT_POWER_MAX, traitBonus * TRAIT_POWER_PER_POINT));
    const pPower = ShowdownEngine._power(pHand) + traitPower;
    const bPower = ShowdownEngine._power(bHand);

    let winner;
    if (pPower > bPower) {
      winner = 'pitcher';
    } else if (bPower > pPower) {
      winner = 'batter';
    } else {
      const pHigh = Math.max(...this.pitcherHole.map(c => c.rank));
      const bHigh = Math.max(...this.batterHole.map(c => c.rank));
      winner = pHigh >= bHigh ? 'pitcher' : 'batter';
    }

    // MARGIN stays on the reward-score scale, which is what the outcome
    // thresholds in _pitcherOutcome/_batterOutcome are calibrated against.
    const pScore = pHand.score + traitBonus;
    const bScore = bHand.score;
    const margin = Math.abs(pScore - bScore);

    const outcome = winner === 'pitcher'
      ? ShowdownEngine._pitcherOutcome(margin)
      : ShowdownEngine._batterOutcome(margin);

    return {
      winner,
      pitcherHand: pHand,
      batterHand: bHand,
      outcome,
      isOut: winner === 'pitcher',
      margin,
      traitBonus,
    };
  }

  static _pitcherOutcome(margin) {
    if (margin >= 10) return 'Strikeout';
    if (margin >= 5) return Math.random() < 0.3 ? 'Strikeout' : (Math.random() < 0.5 ? 'Flyout' : 'Groundout');
    return Math.random() < 0.5 ? 'Flyout' : 'Groundout';
  }

  static _batterOutcome(margin) {
    if (margin >= 15) return 'Home Run';
    // Triples stay rare even on a big margin (see "The Triple Is Sacred" in the GDD).
    // A blowout margin is far more likely to be a double than the rarest hit in
    // baseball, so this is a 15% roll rather than a coin flip.
    if (margin >= 8) return Math.random() < 0.15 ? 'Triple' : 'Double';
    if (margin >= 3) return 'Double';
    return 'Single';
  }

  // ── Trait Bonuses ───────────────────────────────────────

  /**
   * Calculate pitcher score bonus from traits.
   * Translates every batting-scene pitcher trait into showdown terms — either a
   * flat/conditional score bonus for the pitcher or a card manipulation. Conditional
   * traits read this.outs / this.inning / this.pitcherLeadBy / this.basesOccupied,
   * set in start().
   */
  _calcTraitBonus() {
    let bonus = 0;
    for (const trait of this.pitcherTraits) {
      const id = typeof trait === 'string' ? trait : trait.id;
      switch (id) {
        case 'heater':       bonus += 3; break;
        case 'painted_corner': bonus += 2; break;
        case 'changeup':     bonus += 1; break;
        case 'slider':
          bonus += this.outs === 2 ? 2 : 1;
          break;
        case 'intimidation':
          bonus += this.outs === 0 ? 3 : (this.outs === 2 ? -2 : 0);
          break;
        case 'closers_instinct':
          if (this.inning >= 7 && this.inning <= 9) bonus += 5;
          break;
        case 'curveball':
          // 30% chance to downgrade batter's best hole card
          if (Math.random() < 0.3) {
            const idx = this.batterHole[0].rank >= this.batterHole[1].rank ? 0 : 1;
            this.batterHole[idx].rank = Math.max(2, this.batterHole[idx].rank - 3);
          }
          break;
        case 'knuckleball':
          // Randomize one community card's suit
          if (this.community.length > 0) {
            const ci = Math.floor(Math.random() * this.community.length);
            this.community[ci].suit = SUITS[Math.floor(Math.random() * 4)];
          }
          break;

        // ── Expansion traits (translated to showdown terms) ──
        case 'cutter':        bonus += 1; break;
        case 'sinkerballer':  bonus += 2; break;
        case 'junkballer':    bonus += 2; break;
        case 'frontline_ace': bonus += 2; break;
        case 'fireballer':
          if (this.inning >= 1 && this.inning <= 3) bonus += 2;
          break;
        case 'splitter':
          if (this.outs === 2) bonus += 2;
          break;
        case 'bulldog':
          // Pitcher's team is ahead → bear down
          if (this.pitcherLeadBy >= 1) bonus += 3;
          break;
        case 'escape_artist':
          bonus += this.basesOccupied ? 4 : 1;
          break;
        case 'rally_killer':
          if (this.basesOccupied) bonus += 3;
          break;
        case 'sinker':
          // 30% chance to downgrade batter's best hole card -2 (softer Curveball)
          if (Math.random() < 0.3) {
            const idx = this.batterHole[0].rank >= this.batterHole[1].rank ? 0 : 1;
            this.batterHole[idx].rank = Math.max(2, this.batterHole[idx].rank - 2);
          }
          break;
        case 'backfoot_slider':
          // 30% chance to randomize one community card's suit (softer Knuckleball)
          if (Math.random() < 0.3 && this.community.length > 0) {
            const ci = Math.floor(Math.random() * this.community.length);
            this.community[ci].suit = SUITS[Math.floor(Math.random() * 4)];
          }
          break;
        case 'wild_thing':
          // 50% chance to swap two community card ranks (chaos — can help the batter)
          if (Math.random() < 0.5 && this.community.length >= 2) {
            const a = Math.floor(Math.random() * this.community.length);
            let b = Math.floor(Math.random() * (this.community.length - 1));
            if (b >= a) b++;
            const tmp = this.community[a].rank;
            this.community[a].rank = this.community[b].rank;
            this.community[b].rank = tmp;
          }
          break;
      }
    }
    return bonus;
  }

  // ── Pitch Effects ───────────────────────────────────────

  /**
   * Apply a pitch effect to the board.
   * @param {string} pitchKey - key from PITCH_TYPES
   * @param {Object} options - pitch-specific options (swapIndex, targetIndex, etc.)
   * @returns {{ success: boolean, ...effectResult }}
   */
  applyPitch(pitchKey, options = {}) {
    if (this.pitchesUsed.includes(pitchKey)) {
      return { success: false, reason: 'Already used this pitch' };
    }

    const effects = {
      fastball:  (opts) => this._effectFastball(opts),
      changeup:  (opts) => this._effectChangeup(opts),
      slider:    (opts) => this._effectSlider(opts),
      cutter:    (opts) => this._effectCutter(opts),
      curveball: (opts) => this._effectCurveball(opts),
      sinker:    (opts) => this._effectSinker(opts),
      splitter:  (opts) => this._effectSplitter(opts),
      twoseam:   (opts) => this._effectTwoseam(opts),
      knuckle:   (opts) => this._effectKnuckle(opts),
      screwball: (opts) => this._effectScrewball(opts),
      palmball:  (opts) => this._effectPalmball(opts),
      breaking:  (opts) => this._effectBreaking(opts),
    };

    const handler = effects[pitchKey];
    if (!handler) return { success: false, reason: 'Unknown pitch' };

    // Control-based misfire for targeted effects:
    // Low control = chance to hit wrong target
    const targeted = ['slider', 'cutter', 'splitter', 'twoseam', 'breaking'];
    if (targeted.includes(pitchKey) && options.targetIndex !== undefined) {
      const misfireChance = Math.max(0, (6 - this.pitcher.control) * 0.08);
      if (Math.random() < misfireChance && this.community.length > 1) {
        // Pick a random different target
        let newTarget;
        do { newTarget = Math.floor(Math.random() * this.community.length); }
        while (newTarget === options.targetIndex && this.community.length > 1);
        options.targetIndex = newTarget;
        options.misfired = true;
      }
    }

    const result = handler(options);
    if (result.success) {
      this.pitchesUsed.push(pitchKey);
      // Drain stamina
      this.staminaDrained += PITCH_STAMINA[pitchKey] || 0.03;
      if (options.misfired) result.misfired = true;
    }
    return result;
  }

  /** Total stamina drained during this at-bat's showdown */
  getStaminaDrained() {
    return this.staminaDrained;
  }

  _replenishPitcherDeck() {
    if (this.pitcherDeck.length === 0) {
      this.pitcherDeck = ShowdownEngine.generateDeck(this.pitcher.velocity, this.pitcher.control);
      this._shuffle(this.pitcherDeck);
    }
  }

  _effectFastball({ swapIndex = 0 }) {
    this._replenishPitcherDeck();
    const sorted = [...this.pitcherDeck].sort((a, b) => b.rank - a.rank);
    const topPool = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.3)));
    const drawn = topPool[Math.floor(Math.random() * topPool.length)];
    const deckIdx = this.pitcherDeck.indexOf(drawn);
    if (deckIdx >= 0) this.pitcherDeck.splice(deckIdx, 1);
    const old = this.pitcherHole[swapIndex];
    this.pitcherHole[swapIndex] = drawn;
    return { success: true, swapped: old, drawn };
  }

  _effectChangeup() {
    const idx = Math.floor(Math.random() * this.batterHole.length);
    this._revealedBatterCards.push(idx);
    return { success: true, revealed: { ...this.batterHole[idx] }, revealedIndex: idx };
  }

  _effectSlider({ targetIndex = 0 }) {
    if (targetIndex < 0 || targetIndex >= this.community.length) {
      return { success: false, reason: 'Invalid target' };
    }
    if (this.lockedIndices.includes(targetIndex)) {
      return { success: false, reason: 'Card is locked' };
    }
    const replaced = this.community[targetIndex];
    this._replenishPitcherDeck();
    const newCard = this.pitcherDeck.pop();
    this.community[targetIndex] = newCard;
    return { success: true, replaced, newCard };
  }

  _effectCutter({ targetIndex = 0 }) {
    this.lockedIndices.push(targetIndex);
    return { success: true, locked: targetIndex };
  }

  _effectCurveball() {
    const controlRoll = Math.random() < (this.pitcher.control / 12);
    if (controlRoll) {
      const idx = this.batterHole[0].rank >= this.batterHole[1].rank ? 0 : 1;
      const oldRank = this.batterHole[idx].rank;
      this.batterHole[idx].rank = Math.max(2, this.batterHole[idx].rank - 2);
      return { success: true, downgraded: true, fromRank: oldRank, toRank: this.batterHole[idx].rank };
    }
    if (this.community.length > 0) {
      this.community[0].rank = 14;
    }
    return { success: true, downgraded: false, misfired: true };
  }

  _effectSinker() {
    this.community.forEach(c => { c.rank = Math.max(2, c.rank - 1); });
    return { success: true };
  }

  _effectSplitter({ targetIndex = 0 }) {
    if (targetIndex < 0 || targetIndex >= this.community.length) {
      return { success: false, reason: 'Invalid target' };
    }
    if (this.lockedIndices.includes(targetIndex)) {
      return { success: false, reason: 'Card is locked' };
    }
    const removed = this.community.splice(targetIndex, 1)[0];
    // Adjust locked/faceDown indices after removal
    this.lockedIndices = this.lockedIndices.filter(i => i !== targetIndex).map(i => i > targetIndex ? i - 1 : i);
    this.faceDownIndices = this.faceDownIndices.filter(i => i !== targetIndex).map(i => i > targetIndex ? i - 1 : i);
    return { success: true, destroyed: removed };
  }

  _effectTwoseam({ targetIndex = 0 }) {
    if (targetIndex < 0 || targetIndex >= this.community.length) {
      return { success: false, reason: 'Invalid target' };
    }
    // Swap a community card with a random batter hole card
    const batterIdx = Math.floor(Math.random() * this.batterHole.length);
    const communityCard = { ...this.community[targetIndex] };
    const batterCard = { ...this.batterHole[batterIdx] };
    this.community[targetIndex] = batterCard;
    this.batterHole[batterIdx] = communityCard;
    return { success: true, swappedCommunity: communityCard, swappedBatter: batterCard, batterIdx };
  }

  _effectKnuckle() {
    if (this.community.length === 0) {
      return { success: false, reason: 'No community cards' };
    }
    // Randomize ALL community card ranks (keep suits)
    const before = this.community.map(c => ({ ...c }));
    for (const c of this.community) {
      c.rank = 2 + Math.floor(Math.random() * 13);
    }
    return { success: true, before, after: this.community.map(c => ({ ...c })) };
  }

  _effectScrewball() {
    const idx = Math.floor(Math.random() * this.batterHole.length);
    const old = { ...this.batterHole[idx] };
    this.batterHole[idx] = {
      rank: 2 + Math.floor(Math.random() * 13),
      suit: SUITS[Math.floor(Math.random() * 4)],
    };
    return { success: true, replacedBatterCard: old };
  }

  _effectPalmball() {
    // Deal next community card from pitcher's deck instead of random
    this._replenishPitcherDeck();
    // Sort deck descending and take the best card
    const sorted = [...this.pitcherDeck].sort((a, b) => b.rank - a.rank);
    const planted = sorted[0];
    const deckIdx = this.pitcherDeck.indexOf(planted);
    this.pitcherDeck.splice(deckIdx, 1);
    this.plantedCard = planted;
    return { success: true, plantedCard: { ...planted } };
  }

  _effectBreaking({ targetIndex = 0 }) {
    if (targetIndex < 0 || targetIndex >= this.community.length) {
      return { success: false, reason: 'Invalid target' };
    }
    this.faceDownIndices.push(targetIndex);
    return { success: true, hiddenIndex: targetIndex };
  }

  // ── Stamina ─────────────────────────────────────────────

  /**
   * Degrade pitcher deck after an at-bat.
   * Low stamina = remove top cards.
   * @param {number} atBatNumber - which at-bat (1-indexed)
   */
  degradeDeck(atBatNumber) {
    const staminaFactor = this.pitcher.stamina / 10;
    const removeCount = Math.max(0, Math.floor((atBatNumber - 1) * (1 - staminaFactor) * 2));
    if (removeCount > 0 && this.pitcherDeck.length > 5) {
      this.pitcherDeck.sort((a, b) => b.rank - a.rank);
      this.pitcherDeck.splice(0, Math.min(removeCount, this.pitcherDeck.length - 5));
      this._shuffle(this.pitcherDeck);
    }
  }

  // ── State ───────────────────────────────────────────────

  getState() {
    return {
      pitcherHole: this.pitcherHole.map(c => ({ ...c })),
      batterHole: this.batterHole.map(c => ({ ...c })),
      community: this.community.map(c => ({ ...c })),
      stage: this.stage,
      pitchesUsed: [...this.pitchesUsed],
      lockedIndices: [...this.lockedIndices],
      faceDownIndices: [...this.faceDownIndices],
      hiddenNextCard: this.hiddenNextCard,
      revealedBatterCards: [...this._revealedBatterCards],
    };
  }

  /**
   * Current best 5-card hand NAME for a side, from what is visible.
   * Pitcher: full hole + community. Batter: only REVEALED hole cards + community.
   * @param {'pitcher'|'batter'} owner
   * @returns {string} handName (e.g. 'Pair', 'High Card')
   */
  getBestHandName(owner) {
    let hole;
    if (owner === 'pitcher') {
      hole = this.pitcherHole;
    } else {
      hole = this.batterHole.filter((_, i) => this._revealedBatterCards.includes(i));
    }
    const best = ShowdownEngine.bestHand(hole, this.community);
    if (!best) return 'High Card';
    // CardEngine may convert Pair/etc to Groundout/Flyout; use originalHand if present
    return best.originalHand || best.handName;
  }

  /**
   * Index the auto-picker would target for a pitch, or null if not targeted /
   * nothing eligible. Community pitches → highest-rank unlocked, face-up card.
   * fastball → weaker pitcher hole card index.
   * @param {string} pitchKey
   * @returns {number|null}
   */
  getSuggestedTarget(pitchKey) {
    if (pitchKey === 'fastball') {
      return this.pitcherHole[0].rank <= this.pitcherHole[1].rank ? 0 : 1;
    }
    const communityTargets = ['slider', 'cutter', 'splitter', 'twoseam', 'breaking'];
    if (!communityTargets.includes(pitchKey)) return null;
    let bestIdx = null, bestRank = -1;
    this.community.forEach((c, i) => {
      const eligible = !this.lockedIndices.includes(i) && !this.faceDownIndices.includes(i);
      if (eligible && c.rank > bestRank) {
        bestRank = c.rank;
        bestIdx = i;
      }
    });
    return bestIdx;
  }

  // ── Helpers ─────────────────────────────────────────────

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

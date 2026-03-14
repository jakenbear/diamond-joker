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

const SUITS = ['H', 'D', 'C', 'S'];

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
    const deck = [];

    for (let i = 0; i < 20; i++) {
      const rank = floor + Math.floor(Math.random() * (ceiling - floor + 1));
      const suit = SUITS[Math.floor(Math.random() * 4)];
      deck.push({ rank, suit });
    }

    return deck;
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
    this._revealedBatterCards = [];
  }

  start(batterStats = null) {
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
    this._revealedBatterCards = [];
  }

  dealFlop() {
    for (let i = 0; i < 3; i++) this.community.push(this.pitcherDeck.pop());
    this.stage = 'flop';
  }

  dealTurn() {
    this.community.push(this.pitcherDeck.pop());
    this.stage = 'turn';
  }

  dealRiver() {
    this.community.push(this.pitcherDeck.pop());
    this.stage = 'river';
  }

  // ── Resolution ──────────────────────────────────────────

  /**
   * Find best 5-card hand from 2 hole + up to 5 community.
   * Tries all C(n,5) combinations.
   */
  static bestHand(hole, community) {
    const all = [...hole, ...community];
    if (all.length < 5) {
      // Not enough cards — evaluate what we have
      return CardEngine.evaluateHand(all);
    }
    let best = null;
    let bestScore = -1;
    const combos = ShowdownEngine._combinations(all, 5);
    for (const combo of combos) {
      const result = CardEngine.evaluateHand(combo);
      if (result.score > bestScore) {
        best = result;
        bestScore = result.score;
      }
    }
    if (best && bestScore === 0) {
      best._highCard = Math.max(...all.map(c => c.rank));
    }
    return best;
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

    const pScore = pHand.score;
    const bScore = bHand.score;

    let winner, margin;
    if (pScore > bScore) {
      winner = 'pitcher';
      margin = pScore - bScore;
    } else if (bScore > pScore) {
      winner = 'batter';
      margin = bScore - pScore;
    } else {
      const pHigh = Math.max(...this.pitcherHole.map(c => c.rank));
      const bHigh = Math.max(...this.batterHole.map(c => c.rank));
      winner = pHigh >= bHigh ? 'pitcher' : 'batter';
      margin = 0;
    }

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
    };
  }

  static _pitcherOutcome(margin) {
    if (margin >= 15) return 'Strikeout';
    if (margin >= 5) return Math.random() < 0.5 ? 'Flyout' : 'Groundout';
    return 'Groundout';
  }

  static _batterOutcome(margin) {
    if (margin >= 15) return 'Home Run';
    if (margin >= 8) return Math.random() < 0.5 ? 'Triple' : 'Double';
    if (margin >= 3) return 'Double';
    return 'Single';
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

    const result = handler(options);
    if (result.success) this.pitchesUsed.push(pitchKey);
    return result;
  }

  _effectFastball({ swapIndex = 0 }) {
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
    const newCard = this.pitcherDeck.pop();
    if (!newCard) return { success: false, reason: 'Deck empty' };
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
    const otherSuits = this.community.filter((_, i) => i !== targetIndex).map(c => c.suit);
    const freq = {};
    otherSuits.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const newSuit = sorted.length > 0 ? sorted[0][0] : this.community[targetIndex].suit;
    const oldSuit = this.community[targetIndex].suit;
    this.community[targetIndex].suit = newSuit;
    return { success: true, oldSuit, newSuit };
  }

  _effectKnuckle({ targetIndex = 0 }) {
    if (targetIndex < 0 || targetIndex >= this.community.length) {
      return { success: false, reason: 'Invalid target' };
    }
    this.community[targetIndex] = {
      rank: 2 + Math.floor(Math.random() * 13),
      suit: SUITS[Math.floor(Math.random() * 4)],
    };
    return { success: true };
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
    this.hiddenNextCard = true;
    return { success: true };
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

  // ── Helpers ─────────────────────────────────────────────

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

/**
 * CardEngine.js - Deck management and poker hand evaluation
 * Pure logic, no Phaser dependency.
 *
 * Balatro-style: player selects 1-5 cards from hand to play.
 * Only selected cards are evaluated as the poker hand.
 */

import HAND_TABLE from '../data/hand_table.js';
import DECKS from '../data/decks.js';
import BALANCE from '../data/balance.js';

const RANK_NAMES = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export default class CardEngine {
  constructor(deckId = 'standard') {
    this.deckConfig = DECKS[deckId] || DECKS.standard;
    this.deck = [];
    this.hand = [];
    this.discardPile = [];
    this.handSize = this.deckConfig.handSize;
    this._buildDeck();
    this.shuffle();
  }

  _buildDeck() {
    this.deck = this.deckConfig.build();
  }

  /** Fisher-Yates shuffle */
  shuffle() {
    const a = this.deck;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  /** Reset deck with all cards, shuffle, clear hand/discard */
  resetDeck() {
    this._buildDeck();
    this.shuffle();
    this.hand = [];
    this.discardPile = [];
  }

  /** Draw n cards from deck into hand */
  draw(n = 5) {
    for (let i = 0; i < n && this.deck.length > 0; i++) {
      this.hand.push(this.deck.pop());
    }
    return this.hand;
  }

  /** Discard selected cards (by index), draw replacements */
  discard(indices) {
    // Sort descending so splicing doesn't shift indices
    const sorted = [...indices].sort((a, b) => b - a);
    for (const idx of sorted) {
      if (idx >= 0 && idx < this.hand.length) {
        this.discardPile.push(this.hand.splice(idx, 1)[0]);
      }
    }

    // Draw replacements, reshuffling discard pile into deck if needed
    const needed = this.handSize - this.hand.length;
    this.draw(needed);
    if (this.hand.length < this.handSize && this.discardPile.length > 0) {
      this.deck.push(...this.discardPile);
      this.discardPile = [];
      this.shuffle();
      this.draw(this.handSize - this.hand.length);
    }
    return this.hand;
  }

  /**
   * Play selected cards from hand (Balatro-style).
   * Only the selected cards are evaluated. All cards go to discard after.
   * @param {number[]} selectedIndices - Indices of cards to play (1-5 cards)
   * @param {Function|null} preModifier - (cards) => modifiedCards
   * @param {Function|null} postModifier - (evalResult, gameState) => modifiedResult
   * @param {Object|null} gameState - current game state for post-modifier
   */
  playHand(selectedIndices = null, preModifier = null, postModifier = null, gameState = null, strikeCount = 0) {
    // If no selection provided, play all cards (backwards compat)
    const indices = selectedIndices || this.hand.map((_, i) => i);
    const playedCards = indices.map(i => this.hand[i]).filter(Boolean);

    if (playedCards.length === 0) {
      return { ...HAND_TABLE[9], score: 0 };
    }

    const result = CardEngine.evaluateHand(playedCards, preModifier, postModifier, gameState, strikeCount);

    // All cards (played and unplayed) go to discard - at-bat is over
    this.discardPile.push(...this.hand);
    this.hand = [];
    return result;
  }

  /** Draw a fresh hand for a new at-bat */
  newAtBat() {
    if (this.deck.length < this.handSize) {
      this.resetDeck();
    }
    this.hand = [];
    this.draw(this.handSize);
    return this.hand;
  }

  /**
   * Evaluate 1-5 selected cards as a poker hand.
   * Automatically finds the best sub-hand if submitting extra cards.
   * Straights and flushes require exactly 5 cards.
   */
  static evaluateHand(cards, preModifier = null, postModifier = null, gameState = null, strikeCount = 0) {
    if (!cards || cards.length === 0) {
      return { ...HAND_TABLE[9], score: 0 };
    }

    // Apply pre-modifier (trait cards that change cards before evaluation)
    let evalCards = cards;
    if (preModifier) {
      evalCards = preModifier(cards);
    }

    // Find the best hand among all subsets of the submitted cards
    const { handIdx, bestCards } = CardEngine._bestSubHand(evalCards);
    const ranks = bestCards.map(c => c.rank).sort((a, b) => a - b);

    // Rank frequency counts (from best subset)
    const freq = {};
    for (const r of ranks) {
      freq[r] = (freq[r] || 0) + 1;
    }

    const pairRank = CardEngine._getPairRank(freq);

    let entry = { ...HAND_TABLE[handIdx] };

    // ── Straight Flush probability roll: 80% HR, 15% Triple, 5% Double ──
    if (entry.rollOutcome) {
      const roll = Math.random();
      if (roll < 0.05) {
        entry.outcome = 'Double';
      } else if (roll < 0.20) {
        entry.outcome = 'Triple';
      }
      // else stays Home Run (80%)
    }

    // ── Rank-scaled quality — out chances for Pair through Full House ──
    if (handIdx >= 3 && handIdx <= 8) {
      const qualityResult = CardEngine._applyRankQuality(entry, pairRank, handIdx, strikeCount, gameState);
      if (qualityResult) {
        entry = qualityResult;
      }
    }

    // Add a readable description of what was played
    entry.playedDescription = CardEngine._describePlay(bestCards, entry.handName);
    entry.pairRank = pairRank;

    entry.score = Math.round(entry.peanuts * entry.mult);

    // Apply post-modifier (trait cards that change the outcome)
    if (postModifier && gameState) {
      const modified = postModifier(entry, gameState);
      modified.score = Math.round(modified.peanuts * modified.mult);
      return modified;
    }

    return entry;
  }

  /**
   * Build a human-readable description of the played cards.
   * e.g. "Pair of 8s", "Two Pair: Ks and 7s", "Flush (Hearts)"
   */
  static _describePlay(cards, handName) {
    const rankName = (r) => RANK_NAMES[r] || r.toString();
    const rankPlural = (r) => {
      const name = rankName(r);
      return name === '6' ? '6es' : name + 's';
    };

    const freq = {};
    for (const c of cards) {
      freq[c.rank] = (freq[c.rank] || 0) + 1;
    }

    const pairs = Object.entries(freq)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1] || parseInt(b[0]) - parseInt(a[0]));

    switch (handName) {
      case 'Royal Flush':
        return 'Royal Flush!';
      case 'Straight Flush':
        return `Straight Flush (${rankName(cards[0].rank)}-high)`;
      case 'Four of a Kind':
        return `Four ${rankPlural(parseInt(pairs[0][0]))}`;
      case 'Full House':
        return `Full House: ${rankPlural(parseInt(pairs[0][0]))} full of ${rankPlural(parseInt(pairs[1][0]))}`;
      case 'Flush': {
        const suitNames = { H: 'Hearts', D: 'Diamonds', C: 'Clubs', S: 'Spades' };
        return `Flush (${suitNames[cards[0].suit]})`;
      }
      case 'Straight':
        return `Straight (${rankName(Math.min(...cards.map(c => c.rank)))}-${rankName(Math.max(...cards.map(c => c.rank)))})`;
      case 'Three of a Kind':
        return `Three ${rankPlural(parseInt(pairs[0][0]))}`;
      case 'Two Pair':
        return `Two Pair: ${rankPlural(parseInt(pairs[0][0]))} and ${rankPlural(parseInt(pairs[1][0]))}`;
      case 'Pair':
        return `Pair of ${rankPlural(parseInt(pairs[0][0]))}`;
      case 'Groundout':
        return 'Groundout!';
      case 'Flyout':
        return 'Flyout!';
      default: {
        const highest = Math.max(...cards.map(c => c.rank));
        return `${rankName(highest)}-high`;
      }
    }
  }

  /**
   * Get the rank of the most relevant pair/group.
   * Returns the rank with the highest frequency; ties broken by higher rank.
   */
  static _getPairRank(freq) {
    let bestRank = 0;
    let bestCount = 0;
    for (const [rank, count] of Object.entries(freq)) {
      const r = parseInt(rank);
      if (count > bestCount || (count === bestCount && r > bestRank)) {
        bestRank = r;
        bestCount = count;
      }
    }
    return bestRank;
  }

  /**
   * Apply rank-scaled quality rules.
   * All hands below Full House have some out chance.
   * Pair out formula: 0.95 - (rank-2)*0.03 + pairPenalty + twoStrikePenalty
   *   Pair of 2s: 95% out, Pair of Aces: 59% out (before penalties)
   *   Two Pair: 55% base out
   *   Three of a Kind: 35% base out
   *   Straight / Flush: 10% base out
   * pairPenalty: +0.25 per pair/two-pair played this inning (stacks fast)
   */
  static _applyRankQuality(entry, pairRank, handIdx, strikeCount = 0, gameState = null) {
    const bs = gameState?.baseballState;
    const pairsPlayed = bs?.pairsPlayedThisInning || 0;
    const twoPairsPlayed = bs?.twoPairsPlayedThisInning || 0;
    const tripsPlayed = bs?.tripsPlayedThisInning || 0;
    const straightsPlayed = bs?.straightsPlayedThisInning || 0;
    const flushesPlayed = bs?.flushesPlayedThisInning || 0;

    let outChance = 0;

    if (handIdx === 8) {
      // Pair
      const twoStrikePenalty = strikeCount >= 2 ? BALANCE.twoStrikePenalty : 0;
      const pairPenalty = pairsPlayed * BALANCE.pairDegradation;
      outChance = BALANCE.pairOutBase - (pairRank - 2) * BALANCE.pairOutRankScale + twoStrikePenalty + pairPenalty;
      if (bs) bs.pairsPlayedThisInning++;
    } else if (handIdx === 7) {
      // Two Pair
      outChance = BALANCE.twoPairOutBase + twoPairsPlayed * BALANCE.twoPairDegradation;
      if (bs) bs.twoPairsPlayedThisInning++;
    } else if (handIdx === 6) {
      // Three of a Kind
      outChance = BALANCE.tripsOutBase + tripsPlayed * BALANCE.tripsDegradation;
      if (bs) bs.tripsPlayedThisInning++;
    } else if (handIdx === 5) {
      // Straight
      outChance = BALANCE.straightOutBase + straightsPlayed * BALANCE.straightDegradation;
      if (bs) bs.straightsPlayedThisInning++;
    } else if (handIdx === 4) {
      // Flush
      outChance = BALANCE.flushOutBase + flushesPlayed * BALANCE.flushDegradation;
      if (bs) bs.flushesPlayedThisInning++;
    } else if (handIdx === 3) {
      // Full House
      outChance = BALANCE.fullHouseOutBase;
    }

    // Discard scaling: reward first-pitch swings, punish fishing
    const discardCount = gameState?.discardCount || 0;
    if (discardCount === 0) outChance -= BALANCE.discardBonus0;
    else if (discardCount >= 2) outChance += BALANCE.discardPenalty2 + Math.max(0, discardCount - 2) * BALANCE.discardPenalty3Plus;

    outChance = Math.min(BALANCE.outMax, Math.max(BALANCE.outMin, outChance));

    if (Math.random() < outChance) {
      const outType = Math.random() < 0.40 ? 'Flyout' : 'Groundout';
      return {
        handName: outType,
        outcome: outType,
        peanuts: 0,
        mult: 1,
        score: 0,
        wasGroundout: true,
        originalHand: entry.handName,
        pairRank,
      };
    }

    // Survived — high pair ranks get bonus peanuts (Pair, Two Pair, Three of a Kind only)
    if (pairRank >= 10 && handIdx >= 6) {
      const bonus = pairRank - 9;
      return { ...entry, peanuts: entry.peanuts + bonus };
    }

    return null;
  }

  /**
   * Returns the success chance (0–100) for a hand, without rolling.
   * Used by the UI to show "Pair of Kings (62%)" style previews.
   * @param {string} handName - e.g. 'Pair', 'Two Pair', 'Flush'
   * @param {number} pairRank - rank of the pair (2–14), 0 if N/A
   * @param {number} strikeCount - current strikes (0–2)
   * @param {object} gameState - { baseballState: { pairsPlayedThisInning, ... } }
   * @returns {number} success percentage 0–100, or 100 if guaranteed
   */
  static getSuccessChance(handName, pairRank = 0, strikeCount = 0, gameState = null) {
    const HAND_NAMES = [
      'Royal Flush','Straight Flush','Four of a Kind','Full House',
      'Flush','Straight','Three of a Kind','Two Pair','Pair','High Card',
    ];
    const handIdx = HAND_NAMES.indexOf(handName);
    if (handIdx < 0 || handIdx < 3) return 100; // guaranteed or unknown

    const bs = gameState?.baseballState;
    const pairsPlayed = bs?.pairsPlayedThisInning || 0;
    const twoPairsPlayed = bs?.twoPairsPlayedThisInning || 0;
    const tripsPlayed = bs?.tripsPlayedThisInning || 0;
    const straightsPlayed = bs?.straightsPlayedThisInning || 0;
    const flushesPlayed = bs?.flushesPlayedThisInning || 0;

    let outChance = 0;
    if (handIdx === 8) {
      const twoStrikePenalty = strikeCount >= 2 ? BALANCE.twoStrikePenalty : 0;
      const pairPenalty = pairsPlayed * BALANCE.pairDegradation;
      outChance = BALANCE.pairOutBase - (pairRank - 2) * BALANCE.pairOutRankScale + twoStrikePenalty + pairPenalty;
    } else if (handIdx === 7) {
      outChance = BALANCE.twoPairOutBase + twoPairsPlayed * BALANCE.twoPairDegradation;
    } else if (handIdx === 6) {
      outChance = BALANCE.tripsOutBase + tripsPlayed * BALANCE.tripsDegradation;
    } else if (handIdx === 5) {
      outChance = BALANCE.straightOutBase + straightsPlayed * BALANCE.straightDegradation;
    } else if (handIdx === 4) {
      outChance = BALANCE.flushOutBase + flushesPlayed * BALANCE.flushDegradation;
    } else if (handIdx === 3) {
      outChance = BALANCE.fullHouseOutBase;
    } else {
      return 0; // High Card = strikeout
    }

    // Discard scaling: reward first-pitch swings, punish fishing
    const discardCount = gameState?.discardCount || 0;
    if (discardCount === 0) outChance -= BALANCE.discardBonus0;
    else if (discardCount >= 2) outChance += BALANCE.discardPenalty2 + Math.max(0, discardCount - 2) * BALANCE.discardPenalty3Plus;

    outChance = Math.min(BALANCE.outMax, Math.max(BALANCE.outMin, outChance));
    return Math.round((1 - outChance) * 100);
  }

  /**
   * Find the best poker hand among all subsets of the given cards.
   * Tries all C(n,k) combinations for k = n down to 1 and returns the
   * best (lowest handIdx). For ≤5 cards this is at most 31 subsets.
   */
  static _bestSubHand(cards) {
    const n = cards.length;

    // Evaluate a specific set of cards and return its handIdx
    const classifyCards = (subset) => {
      const sn = subset.length;
      const ranks = subset.map(c => c.rank).sort((a, b) => a - b);
      const suits = subset.map(c => c.suit);
      const isFlush = sn === 5 && suits.every(s => s === suits[0]);
      const isStraight = sn === 5 && CardEngine._isStraight(ranks);
      const freq = {};
      for (const r of ranks) freq[r] = (freq[r] || 0) + 1;
      const counts = Object.values(freq).sort((a, b) => b - a);

      if (isFlush && isStraight && ranks[0] === 10 && ranks[4] === 14) return 0;
      if (isFlush && isStraight) return 1;
      if (counts[0] === 4) return 2;
      if (counts[0] === 3 && counts[1] === 2) return 3;
      if (isFlush) return 4;
      if (isStraight) return 5;
      if (counts[0] === 3) return 6;
      if (counts[0] === 2 && counts[1] === 2) return 7;
      if (counts[0] === 2) return 8;
      return 9;
    };

    // Start with the full set
    let bestIdx = classifyCards(cards);
    let bestCards = cards;

    // If already a strong hand or only 1-2 cards, no point checking subsets
    if (bestIdx <= 1 || n <= 2) return { handIdx: bestIdx, bestCards };

    // Try all subsets from size n-1 down to max(1, n-3) to find a better hand
    // (skipping a kicker can reveal Two Pair, etc.)
    const trySubsets = (size) => {
      const indices = Array.from({ length: size }, (_, i) => i);
      while (true) {
        const subset = indices.map(i => cards[i]);
        const idx = classifyCards(subset);
        if (idx < bestIdx) {
          bestIdx = idx;
          bestCards = subset;
        }
        // Generate next combination
        let i = size - 1;
        while (i >= 0 && indices[i] === n - size + i) i--;
        if (i < 0) break;
        indices[i]++;
        for (let j = i + 1; j < size; j++) indices[j] = indices[j - 1] + 1;
      }
    };

    // Only check subsets if we have more than the minimum needed
    for (let sz = n - 1; sz >= 1; sz--) {
      if (bestIdx <= 1) break; // Can't do better than Straight Flush
      trySubsets(sz);
    }

    return { handIdx: bestIdx, bestCards };
  }

  /** Check if sorted ranks form a straight (handles ace-low) */
  static _isStraight(sorted) {
    if (sorted.length !== 5) return false;

    // Normal straight check
    const isNormal = sorted.every((r, i) => i === 0 || r === sorted[i - 1] + 1);
    if (isNormal) return true;

    // Ace-low: A-2-3-4-5 → sorted as [2,3,4,5,14]
    if (sorted[4] === 14 && sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 4 && sorted[3] === 5) {
      return true;
    }

    return false;
  }
}

export { HAND_TABLE };

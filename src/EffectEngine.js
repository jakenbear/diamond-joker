/**
 * EffectEngine.js - Interprets trait effect descriptors from data files.
 * Pure logic, no Phaser dependency.
 *
 * Handles both pre-eval (card transforms) and post-eval (result transforms).
 * Adding a new effect type = add a handler here + use it in data files.
 */

// ── Condition Evaluators ────────────────────────────────

function checkCondition(cond, evalResult, gameState) {
  if (!cond) return true;

  switch (cond.type) {
    case 'always':
      return true;

    case 'outs_eq':
      return gameState.outs === cond.value;

    case 'outs_neq':
      return gameState.outs !== cond.value;

    case 'inning_range':
      return gameState.inning >= cond.min && gameState.inning <= cond.max;

    case 'runner_on':
      return gameState.bases[cond.base] === true;

    case 'bases_loaded':
      return gameState.bases[0] && gameState.bases[1] && gameState.bases[2];

    case 'outcome_is':
      return evalResult.outcome === cond.value;

    case 'hand_is':
      return evalResult.handName === cond.value;

    case 'hand_in':
      return cond.values.includes(evalResult.handName);

    case 'chips_lte':
      return evalResult.chips <= cond.value;

    case 'chips_gte':
      return evalResult.chips >= cond.value;

    case 'and':
      return cond.conditions.every(c => checkCondition(c, evalResult, gameState));

    case 'or':
      return cond.conditions.some(c => checkCondition(c, evalResult, gameState));

    default:
      return false;
  }
}

// ── Pre-Eval Effect Handlers (card transforms) ──────────

const PRE_HANDLERS = {
  /** Adjacent ranks count as a pair */
  adjacent_to_pair(cards, _effect) {
    const sorted = [...cards].sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1].rank - sorted[i].rank === 1) {
        return cards.map(c => {
          if (c.id === sorted[i].id) {
            return { ...c, rank: sorted[i + 1].rank };
          }
          return c;
        });
      }
    }
    return cards;
  },

  /** Aces fill gaps in straights */
  ace_wild_straight(cards, _effect) {
    const hasAce = cards.some(c => c.rank === 14);
    if (!hasAce) return cards;

    const nonAce = cards.filter(c => c.rank !== 14).map(c => c.rank).sort((a, b) => a - b);
    if (nonAce.length < 4) return cards;

    for (let i = 0; i < nonAce.length - 1; i++) {
      const gap = nonAce[i] + 1;
      const test = [...nonAce, gap].sort((a, b) => a - b);
      const isSeq = test.every((r, j) => j === 0 || r === test[j - 1] + 1);
      if (isSeq) {
        return cards.map(c => {
          if (c.rank === 14) return { ...c, rank: gap };
          return c;
        });
      }
    }
    return cards;
  },

  /** Suit colors count as matching for flushes */
  color_is_suit(cards, _effect) {
    const redSuits = ['H', 'D'];
    const blackSuits = ['C', 'S'];
    const redCount = cards.filter(c => redSuits.includes(c.suit)).length;
    const blackCount = cards.filter(c => blackSuits.includes(c.suit)).length;

    if (redCount >= 4 || blackCount >= 4) {
      const targetSuit = redCount >= blackCount ? 'H' : 'C';
      const matchColors = redCount >= blackCount ? redSuits : blackSuits;
      return cards.map(c => {
        if (matchColors.includes(c.suit)) return c;
        return { ...c, suit: targetSuit };
      });
    }
    return cards;
  },

  /** Chance to reduce highest card's rank */
  downgrade_highest(cards, effect) {
    if (Math.random() > (effect.chance || 0.3)) return cards;
    let maxIdx = 0;
    for (let i = 1; i < cards.length; i++) {
      if (cards[i].rank > cards[maxIdx].rank) maxIdx = i;
    }
    return cards.map((c, i) => {
      if (i === maxIdx) return { ...c, rank: Math.max(2, c.rank - (effect.amount || 3)) };
      return c;
    });
  },

  /** Reduce face card (J/Q/K) ranks */
  downgrade_face_cards(cards, effect) {
    return cards.map(c => {
      if (c.rank >= 11 && c.rank <= 13) {
        return { ...c, rank: Math.max(2, c.rank - (effect.amount || 2)) };
      }
      return c;
    });
  },

  /** Chance to swap two random cards' ranks */
  swap_random(cards, effect) {
    if (Math.random() > (effect.chance || 0.25)) return cards;
    if (cards.length < 2) return cards;
    const i = Math.floor(Math.random() * cards.length);
    let j = Math.floor(Math.random() * (cards.length - 1));
    if (j >= i) j++;
    const newCards = cards.map(c => ({ ...c }));
    const tmp = newCards[i].rank;
    newCards[i].rank = newCards[j].rank;
    newCards[j].rank = tmp;
    return newCards;
  },
};

// ── Post-Eval Effect Handlers (result transforms) ───────

const POST_HANDLERS = {
  /** Add to multiplier (can be negative) */
  add_mult(result, effect, gameState) {
    if (!checkCondition(effect.condition, result, gameState)) return result;
    return { ...result, mult: Math.round(Math.max(1, result.mult + effect.value) * 10) / 10 };
  },

  /** Add to chips (can be negative) */
  add_chips(result, effect, gameState) {
    if (!checkCondition(effect.condition, result, gameState)) return result;
    return { ...result, chips: Math.max(0, result.chips + effect.value) };
  },

  /** Add chips per runner on base */
  per_runner_chips(result, effect, gameState) {
    const runners = gameState.bases.filter(b => b).length;
    if (runners === 0) return result;
    return { ...result, chips: result.chips + (runners * effect.value) };
  },

  /** Upgrade outcome from one type to another */
  upgrade_outcome(result, effect, gameState) {
    if (result.outcome !== effect.from) return result;
    if (!checkCondition(effect.condition, result, gameState)) return result;
    return {
      ...result,
      outcome: effect.to,
      handName: effect.newHandName || result.handName,
      chips: result.chips + (effect.addChips || 0),
      mult: result.mult + (effect.addMult || 0),
    };
  },

  /** Convert a bad outcome to something else */
  prevent_outcome(result, effect, _gameState) {
    if (result.outcome !== effect.from) return result;
    return {
      ...result,
      outcome: effect.toOutcome,
      handName: effect.toHand || result.handName,
      chips: effect.chips !== undefined ? effect.chips : result.chips,
      mult: effect.mult !== undefined ? effect.mult : result.mult,
    };
  },

  /** Set a flag on the result */
  set_flag(result, effect, gameState) {
    if (!checkCondition(effect.condition, result, gameState)) return result;
    return { ...result, [effect.flag]: true };
  },

  /** Force groundout when condition met */
  force_groundout(result, effect, gameState) {
    if (!checkCondition(effect.condition, result, gameState)) return result;
    return {
      ...result,
      outcome: 'Groundout',
      handName: effect.newHandName || 'Groundout',
      chips: 0,
      mult: 1,
      wasGroundout: true,
    };
  },

  /** Apply multiple effects in sequence */
  compound(result, effect, gameState) {
    let r = result;
    for (const sub of effect.effects) {
      const handler = POST_HANDLERS[sub.type];
      if (handler) {
        r = handler(r, sub, gameState);
      }
    }
    return r;
  },
};

// ── Public API ──────────────────────────────────────────

export default class EffectEngine {
  /**
   * Apply a pre-eval effect descriptor to cards.
   * @param {Object[]} cards - the cards array
   * @param {Object} effect - effect descriptor from data file
   * @returns {Object[]} modified cards
   */
  static applyPre(cards, effect) {
    const handler = PRE_HANDLERS[effect.type];
    if (!handler) return cards;
    return handler(cards, effect);
  }

  /**
   * Apply a post-eval effect descriptor to a result.
   * @param {Object} result - eval result
   * @param {Object} effect - effect descriptor from data file
   * @param {Object} gameState - current game state
   * @returns {Object} modified result
   */
  static applyPost(result, effect, gameState) {
    const handler = POST_HANDLERS[effect.type];
    if (!handler) return result;
    return handler(result, effect, gameState);
  }
}

export { checkCondition };

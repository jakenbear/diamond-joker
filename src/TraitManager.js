/**
 * TraitManager.js - Trait card definitions for batters and pitchers
 * Pure logic, no Phaser dependency.
 */

// ── Batter Trait Pool (player buys these in shop) ────────────
const TRAIT_POOL = [
  // ── Pre-eval traits (modify cards before evaluation) ──────
  {
    id: 'double_mcgee',
    name: 'Double McGee',
    description: 'Adjacent ranks count as a pair',
    price: 30,
    rarity: 'uncommon',
    phase: 'pre',
    apply(cards) {
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
  },
  {
    id: 'ace_in_the_hole',
    name: 'Ace in the Hole',
    description: 'Aces are wild for straights',
    price: 35,
    rarity: 'rare',
    phase: 'pre',
    apply(cards) {
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
  },
  {
    id: 'switch_hitter',
    name: 'Switch Hitter',
    description: 'Either suit color counts as matching for flushes',
    price: 30,
    rarity: 'uncommon',
    phase: 'pre',
    apply(cards) {
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
  },

  // ── Post-eval traits (modify outcome after evaluation) ────
  {
    id: 'slugger_serum',
    name: 'Slugger Serum',
    description: 'Pairs upgrade to doubles',
    price: 40,
    rarity: 'rare',
    phase: 'post',
    apply(evalResult, _gameState) {
      if (evalResult.outcome === 'Single' && evalResult.handName === 'Pair') {
        return { ...evalResult, outcome: 'Double', handName: 'Pair (Slugger!)', chips: evalResult.chips + 1, mult: evalResult.mult + 0.5 };
      }
      return evalResult;
    },
  },
  {
    id: 'eye_of_the_tiger',
    name: 'Eye of the Tiger',
    description: '+3 mult with 2 outs',
    price: 25,
    rarity: 'common',
    phase: 'post',
    apply(evalResult, gameState) {
      if (gameState.outs === 2) {
        return { ...evalResult, mult: evalResult.mult + 3 };
      }
      return evalResult;
    },
  },
  {
    id: 'contact_lens',
    name: 'Contact Lens',
    description: 'Low pairs never fail into groundouts',
    price: 20,
    rarity: 'common',
    phase: 'post',
    apply(evalResult, _gameState) {
      if (evalResult.outcome === 'Groundout') {
        return { ...evalResult, outcome: 'Single', handName: 'Pair (Contact!)', chips: 1, mult: 1.5 };
      }
      return evalResult;
    },
  },
  {
    id: 'sacrifice_fly',
    name: 'Sacrifice Fly',
    description: 'Strikeouts with runner on 3rd score a run',
    price: 25,
    rarity: 'uncommon',
    phase: 'post',
    apply(evalResult, gameState) {
      if (evalResult.outcome === 'Strikeout' && gameState.bases[2]) {
        return { ...evalResult, sacrificeFly: true };
      }
      return evalResult;
    },
  },
  {
    id: 'hot_corner',
    name: 'Hot Corner',
    description: '+2 chips per runner on base',
    price: 20,
    rarity: 'common',
    phase: 'post',
    apply(evalResult, gameState) {
      const runners = gameState.bases.filter(b => b).length;
      if (runners > 0) {
        return { ...evalResult, chips: evalResult.chips + (runners * 2) };
      }
      return evalResult;
    },
  },
  {
    id: 'closer',
    name: 'Closer',
    description: '+5 mult in innings 7-9',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    apply(evalResult, gameState) {
      if (gameState.inning >= 7 && gameState.inning <= 9) {
        return { ...evalResult, mult: evalResult.mult + 5 };
      }
      return evalResult;
    },
  },
  {
    id: 'stolen_base',
    name: 'Stolen Base',
    description: 'Runner on 1st auto-advances before at-bat',
    price: 25,
    rarity: 'uncommon',
    phase: 'post',
    apply(evalResult, gameState) {
      if (gameState.bases[0]) {
        return { ...evalResult, stolenBase: true };
      }
      return evalResult;
    },
  },
  {
    id: 'grand_ambition',
    name: 'Grand Ambition',
    description: '+10 mult when bases are loaded',
    price: 45,
    rarity: 'rare',
    phase: 'post',
    apply(evalResult, gameState) {
      if (gameState.bases[0] && gameState.bases[1] && gameState.bases[2]) {
        return { ...evalResult, mult: evalResult.mult + 10 };
      }
      return evalResult;
    },
  },
];

// ── Pitcher Trait Pool (assigned to opponent pitcher at game start) ───
const PITCHER_TRAIT_POOL = [
  {
    id: 'heater',
    name: 'Heater',
    description: 'Pairs of 6 or lower auto-groundout. But triples+ get +2 chips.',
    rarity: 'common',
    phase: 'pitcher_post',
    apply(evalResult, _gameState) {
      // Risk: low pairs always fail. Reward: strong hands get a bonus.
      if (evalResult.handName === 'Pair' && !evalResult.wasGroundout) {
        // Check if the pair rank is low (we can infer from chips — base pair = 1 chip)
        if (evalResult.chips <= 1) {
          return { ...evalResult, outcome: 'Groundout', handName: 'Groundout (Heater!)', chips: 0, mult: 1, wasGroundout: true };
        }
      }
      if (evalResult.handName === 'Three of a Kind' || evalResult.handName === 'Four of a Kind' ||
          evalResult.handName === 'Full House') {
        return { ...evalResult, chips: evalResult.chips + 2 };
      }
      return evalResult;
    },
  },
  {
    id: 'curveball',
    name: 'Curveball',
    description: '30% chance your highest card loses 3 ranks. But if you still hit, +1 mult.',
    rarity: 'uncommon',
    phase: 'pitcher_pre',
    apply(cards) {
      if (Math.random() > 0.3) return cards;
      // Downgrade the highest card by 3 ranks
      let maxIdx = 0;
      for (let i = 1; i < cards.length; i++) {
        if (cards[i].rank > cards[maxIdx].rank) maxIdx = i;
      }
      return cards.map((c, i) => {
        if (i === maxIdx) {
          return { ...c, rank: Math.max(2, c.rank - 3) };
        }
        return c;
      });
    },
    // Post bonus tracked via flag
    postBonus: true,
  },
  {
    id: 'slider',
    name: 'Slider',
    description: '-1 mult on all hands. Risk: with 2 outs, penalty doubles to -2.',
    rarity: 'common',
    phase: 'pitcher_post',
    apply(evalResult, gameState) {
      const penalty = gameState.outs === 2 ? 2 : 1;
      return { ...evalResult, mult: Math.max(1, evalResult.mult - penalty) };
    },
  },
  {
    id: 'knuckleball',
    name: 'Knuckleball',
    description: 'Face cards (J/Q/K) lose 2 chips. But number cards (2-10) gain +1 chip.',
    rarity: 'uncommon',
    phase: 'pitcher_pre',
    apply(cards) {
      // Transform: face cards get weaker, number cards get slightly stronger
      return cards.map(c => {
        if (c.rank >= 11 && c.rank <= 13) {
          return { ...c, rank: Math.max(2, c.rank - 2) };
        }
        return c;
      });
    },
  },
  {
    id: 'intimidation',
    name: 'Intimidation',
    description: '-2 mult at 0 outs. But +2 mult at 2 outs (batter digs in).',
    rarity: 'common',
    phase: 'pitcher_post',
    apply(evalResult, gameState) {
      if (gameState.outs === 0) {
        return { ...evalResult, mult: Math.max(1, evalResult.mult - 2) };
      }
      if (gameState.outs === 2) {
        return { ...evalResult, mult: evalResult.mult + 2 };
      }
      return evalResult;
    },
  },
  {
    id: 'painted_corner',
    name: 'Painted Corner',
    description: 'High cards are less effective: pairs of 10+ get -1 chip.',
    rarity: 'uncommon',
    phase: 'pitcher_post',
    apply(evalResult, _gameState) {
      // Counters the rank quality bonus on high pairs
      if ((evalResult.handName === 'Pair' || evalResult.handName === 'Two Pair') && evalResult.chips > 2) {
        return { ...evalResult, chips: evalResult.chips - 1 };
      }
      return evalResult;
    },
  },
  {
    id: 'changeup',
    name: 'Changeup',
    description: '25% chance one random card swaps rank with another. Chaos!',
    rarity: 'rare',
    phase: 'pitcher_pre',
    apply(cards) {
      if (Math.random() > 0.25) return cards;
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
  },
  {
    id: 'closers_instinct',
    name: "Closer's Instinct",
    description: '-3 mult in innings 7-9. The bullpen tightens up.',
    rarity: 'rare',
    phase: 'pitcher_post',
    apply(evalResult, gameState) {
      if (gameState.inning >= 7 && gameState.inning <= 9) {
        return { ...evalResult, mult: Math.max(1, evalResult.mult - 3) };
      }
      return evalResult;
    },
  },
];

const RARITY_WEIGHTS = { common: 3, uncommon: 2, rare: 1 };

export default class TraitManager {
  constructor() {
    this.ownedTraitIds = new Set();
  }

  /** Get a weighted random shop selection of batter trait cards */
  getShopSelection(count = 3) {
    const available = TRAIT_POOL.filter(t => !this.ownedTraitIds.has(t.id));
    if (available.length === 0) return [];

    const weighted = [];
    for (const trait of available) {
      const w = RARITY_WEIGHTS[trait.rarity] || 1;
      for (let i = 0; i < w; i++) weighted.push(trait);
    }

    const selected = [];
    const usedIds = new Set();
    const limit = Math.min(count, available.length);

    while (selected.length < limit) {
      const pick = weighted[Math.floor(Math.random() * weighted.length)];
      if (!usedIds.has(pick.id)) {
        usedIds.add(pick.id);
        selected.push(pick);
      }
    }

    return selected;
  }

  /** Pick 1-2 random pitcher traits for the game */
  static pickPitcherTraits() {
    const count = Math.random() < 0.5 ? 1 : 2;
    const pool = [...PITCHER_TRAIT_POOL];
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  markOwned(traitId) {
    this.ownedTraitIds.add(traitId);
  }

  /**
   * Build a pre-modifier function from a player's pre-phase traits.
   */
  static buildPreModifier(traits) {
    const preTraits = traits.filter(t => t.phase === 'pre');
    if (preTraits.length === 0) return null;

    return (cards) => {
      let modified = cards;
      for (const trait of preTraits) {
        modified = trait.apply(modified);
      }
      return modified;
    };
  }

  /**
   * Build a post-modifier function from a player's post-phase traits.
   */
  static buildPostModifier(traits) {
    const postTraits = traits.filter(t => t.phase === 'post');
    if (postTraits.length === 0) return null;

    return (evalResult, gameState) => {
      let modified = evalResult;
      for (const trait of postTraits) {
        modified = trait.apply(modified, gameState);
      }
      return modified;
    };
  }

  /**
   * Build a pre-modifier from pitcher's pre-phase traits.
   */
  static buildPitcherPreModifier(traits) {
    const preTraits = traits.filter(t => t.phase === 'pitcher_pre');
    if (preTraits.length === 0) return null;

    return (cards) => {
      let modified = cards;
      for (const trait of preTraits) {
        modified = trait.apply(modified);
      }
      return modified;
    };
  }

  /**
   * Build a post-modifier from pitcher's post-phase traits.
   */
  static buildPitcherPostModifier(traits) {
    const postTraits = traits.filter(t => t.phase === 'pitcher_post');
    if (postTraits.length === 0) return null;

    return (evalResult, gameState) => {
      let modified = evalResult;
      for (const trait of postTraits) {
        modified = trait.apply(modified, gameState);
      }
      return modified;
    };
  }
}

export { TRAIT_POOL, PITCHER_TRAIT_POOL, RARITY_WEIGHTS };

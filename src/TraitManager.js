/**
 * TraitManager.js - Trait card management and modifier building.
 * All trait DATA lives in data/batter_traits.js and data/pitcher_traits.js.
 * Effect logic lives in EffectEngine.js.
 */
import BATTER_TRAITS from '../data/batter_traits.js';
import PITCHER_TRAITS from '../data/pitcher_traits.js';
import EffectEngine from './EffectEngine.js';

const RARITY_WEIGHTS = { common: 3, uncommon: 2, rare: 1 };

export default class TraitManager {
  constructor() {
    this.ownedTraitIds = new Set();
  }

  /** Get a weighted random shop selection of batter trait cards */
  getShopSelection(count = 3) {
    const available = BATTER_TRAITS.filter(t => !this.ownedTraitIds.has(t.id));
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
    const pool = [...PITCHER_TRAITS];
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
   * Build a pre-modifier function from traits with phase 'pre'.
   * Uses EffectEngine to interpret effect descriptors.
   */
  static buildPreModifier(traits) {
    const preTraits = traits.filter(t => t.phase === 'pre' && t.effect);
    if (preTraits.length === 0) return null;

    return (cards) => {
      let modified = cards;
      for (const trait of preTraits) {
        modified = EffectEngine.applyPre(modified, trait.effect);
      }
      return modified;
    };
  }

  /**
   * Build a post-modifier function from traits with phase 'post'.
   */
  static buildPostModifier(traits) {
    const postTraits = traits.filter(t => t.phase === 'post' && t.effect);
    if (postTraits.length === 0) return null;

    return (evalResult, gameState) => {
      let modified = evalResult;
      for (const trait of postTraits) {
        modified = EffectEngine.applyPost(modified, trait.effect, gameState);
      }
      return modified;
    };
  }

  /**
   * Build a pre-modifier from pitcher traits (phase 'pitcher_pre').
   */
  static buildPitcherPreModifier(traits) {
    const preTraits = traits.filter(t => t.phase === 'pitcher_pre' && t.effect);
    if (preTraits.length === 0) return null;

    return (cards) => {
      let modified = cards;
      for (const trait of preTraits) {
        modified = EffectEngine.applyPre(modified, trait.effect);
      }
      return modified;
    };
  }

  /**
   * Build a post-modifier from pitcher traits (phase 'pitcher_post').
   */
  static buildPitcherPostModifier(traits) {
    const postTraits = traits.filter(t => t.phase === 'pitcher_post' && t.effect);
    if (postTraits.length === 0) return null;

    return (evalResult, gameState) => {
      let modified = evalResult;
      for (const trait of postTraits) {
        modified = EffectEngine.applyPost(modified, trait.effect, gameState);
      }
      return modified;
    };
  }
}

export { BATTER_TRAITS, PITCHER_TRAITS, RARITY_WEIGHTS };

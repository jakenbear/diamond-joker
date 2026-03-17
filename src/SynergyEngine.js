/**
 * SynergyEngine.js - Calculates active synergies from roster composition.
 * Pure logic, no Phaser dependency.
 */
import SYNERGIES from '../data/synergies.js';

export default class SynergyEngine {
  /** Calculate which synergies are active for the given roster. */
  static calculate(roster) {
    return SYNERGIES.filter(s => s.check(roster)).map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      bonus: s.bonus,
      bonusDescription: s.bonusDescription,
    }));
  }

  /** Get all synergy definitions (for UI display of locked/unlocked). */
  static getAll() {
    return SYNERGIES;
  }
}

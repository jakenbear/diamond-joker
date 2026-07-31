/**
 * BonusEngine.js - Applies staff, lineup, and synergy bonuses to a hand result.
 * Pure logic, no Phaser dependency.
 *
 * These three processors were extracted from GameScene so they can be tested
 * without a canvas. Each takes an explicit context object rather than reading
 * off a scene.
 *
 * MUTATION SEMANTICS: every processor mutates `handResult` in place (peanuts,
 * mult, score, and sometimes outcome) AND returns a bonuses object. Callers in
 * GameScene rely on the in-place mutation — do not switch these to returning
 * copies without auditing _onPlay.
 */

import StatDisplay from './StatDisplay.js';
import { scaleInningWindow } from './EffectEngine.js';

/** Outcomes that record an out — not a hit. */
const OUT_OUTCOMES = ['Strikeout', 'Groundout', 'Flyout', 'Double Play', "Fielder's Choice"];

/** Extra-base hits. */
const XBH_OUTCOMES = ['Double', 'Triple', 'Home Run'];

/**
 * Fold accumulated peanut/mult bonuses into the result and recompute score.
 * Only applies when something actually accumulated, matching the original
 * `if (peanutBonus > 0 || multBonus > 0)` guard.
 */
function _commit(handResult, bonuses) {
  if (bonuses.peanutBonus > 0 || bonuses.multBonus > 0) {
    handResult.peanuts += bonuses.peanutBonus;
    handResult.mult = Math.round((handResult.mult + bonuses.multBonus) * 10) / 10;
    handResult.score = Math.round(handResult.peanuts * handResult.mult);
  }
  return bonuses;
}

export default class BonusEngine {
  /**
   * Staff (mascots & coaches) effects.
   * @param {Object} handResult - mutated in place
   * @param {Object} gameState - from BaseballState.getStatus()
   * @param {Object} ctx
   * @param {Array}  ctx.staff - staff cards, each with an optional `effect`
   * @param {Function} [ctx.rng] - 0..1 RNG for chance effects (default Math.random)
   * @returns {{peanutBonus, multBonus, outcomeChanged, messages, errorMult, extraBaseBonus}}
   */
  static applyStaff(handResult, gameState, ctx = {}) {
    const staff = ctx.staff || [];
    const rng = ctx.rng || Math.random;
    const bonuses = {
      peanutBonus: 0, multBonus: 0, outcomeChanged: false,
      messages: [], errorMult: 1, extraBaseBonus: 0,
    };
    if (staff.length === 0) return bonuses;

    for (const s of staff) {
      if (!s.effect) continue;
      const eff = s.effect;

      switch (eff.type) {
        // ── Mult bonuses (conditional) ──
        case 'add_mult': {
          let applies = true;
          if (eff.condition) {
            if (eff.condition.type === 'inning_range') {
              // Same 9-inning-canvas rescaling as trait conditions, so staff
              // windows aren't dead in short games either.
              const w = scaleInningWindow(eff.condition.min, eff.condition.max, gameState.totalInnings);
              applies = gameState.inning >= w.min && gameState.inning <= w.max;
            } else if (eff.condition.type === 'bases_empty') {
              applies = !gameState.bases.some(b => b);
            }
          }
          if (applies) {
            bonuses.multBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value}x (${s.name})`, color: '#ffab40' });
          }
          break;
        }

        // ── Mult per run scored this inning ──
        case 'mult_per_inning_run': {
          const inningRuns = gameState.currentInningPlayerRuns || 0;
          if (inningRuns > 0) {
            const bonus = eff.value * inningRuns;
            bonuses.multBonus += bonus;
            bonuses.messages.push({ text: `+${bonus}x (${s.name}, ${inningRuns}R)`, color: '#ffab40' });
          }
          break;
        }

        // ── Chip bonuses ──
        case 'flat_peanuts_per_ab': {
          bonuses.peanutBonus += eff.value;
          bonuses.messages.push({ text: `+${eff.value} peanuts (${s.name})`, color: '#ffd600' });
          break;
        }
        case 'per_runner_peanuts': {
          const runners = gameState.bases.filter(b => b).length;
          if (runners > 0) {
            const bonus = eff.value * runners;
            bonuses.peanutBonus += bonus;
            bonuses.messages.push({ text: `+${bonus} peanuts (${s.name}, ${runners} on)`, color: '#ffd600' });
          }
          break;
        }

        // ── Double peanuts (conditional) ──
        case 'double_peanuts': {
          let applies = false;
          if (eff.condition && eff.condition.type === 'outcome_is') {
            applies = handResult.outcome === eff.condition.value;
          }
          if (applies) {
            bonuses.peanutBonus += handResult.peanuts;
            bonuses.messages.push({ text: `x2 peanuts! (${s.name})`, color: '#ff6e40' });
          }
          break;
        }

        // ── Outcome transformations ──
        case 'team_convert_high_card': {
          if (handResult.handName === 'High Card' && handResult.outcome === 'Strikeout') {
            handResult.outcome = 'Single';
            handResult.peanuts = Math.max(handResult.peanuts, eff.peanuts || 1);
            handResult.mult = Math.max(handResult.mult, eff.mult || 1);
            handResult.score = Math.round(handResult.peanuts * handResult.mult);
            bonuses.outcomeChanged = true;
            bonuses.messages.push({ text: `High Card → Single! (${s.name})`, color: '#69f0ae' });
          }
          break;
        }
        case 'strikeout_to_walk': {
          if (handResult.outcome === 'Strikeout' && rng() < eff.chance) {
            handResult.outcome = 'Walk';
            bonuses.outcomeChanged = true;
            bonuses.messages.push({ text: `K → Walk! (${s.name})`, color: '#69f0ae' });
          }
          break;
        }

        // ── Error multiplier (passed to SituationalEngine) ──
        case 'error_multiplier': {
          bonuses.errorMult *= eff.value;
          break;
        }

        // ── Extra base chance boost ──
        case 'team_extra_base': {
          bonuses.extraBaseBonus += eff.value;
          break;
        }

        // ── Stat boosts (Batting Coach etc.) applied at batter level ──
        case 'team_stat_boost':
        // ── Effects handled at at-bat start ──
        case 'team_add_discard':
        case 'add_hand_draw':
        // ── Effects handled elsewhere ──
        case 'shop_extra_cards':
        case 'unlock_staff_slot':
        case 'pitcher_hit_reduction':
        case 'pitcher_fatigue_delay':
        case 'bonus_draw_on_discard':
        case 'strikeout_redraw':
        case 'ignore_pair_penalty':
          break;

        default:
          break;
      }
    }

    return _commit(handResult, bonuses);
  }

  /**
   * Bonus-player lineup passive effects.
   * @param {Object} handResult - mutated in place
   * @param {Object} gameState
   * @param {Object} ctx
   * @param {Array}  ctx.effects - from RosterManager.getActiveLineupEffects()
   * @param {Object} ctx.batter - current batter (for stat-threshold effects)
   * @param {number} ctx.discardCount - discards used this at-bat
   * @returns {{peanutBonus, multBonus, messages, extraBaseBonus, pairOutReduction, contactSaveBoost}}
   */
  static applyLineup(handResult, gameState, ctx = {}) {
    const effects = ctx.effects || [];
    const batter = ctx.batter;
    const discardCount = ctx.discardCount || 0;
    const bonuses = {
      peanutBonus: 0, multBonus: 0, messages: [],
      extraBaseBonus: 0, pairOutReduction: 0, contactSaveBoost: 0,
    };
    if (effects.length === 0) return bonuses;

    const isHit = !OUT_OUTCOMES.includes(handResult.outcome);
    const isXBH = XBH_OUTCOMES.includes(handResult.outcome);

    for (const eff of effects) {
      switch (eff.type) {
        case 'team_add_peanuts_on_xbh': {
          if (isXBH) {
            bonuses.peanutBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value} peanut (XBH bonus)`, color: '#ffd600' });
          }
          break;
        }
        case 'team_pair_out_reduction': {
          bonuses.pairOutReduction += eff.value;
          break;
        }
        case 'team_extra_base_chance': {
          bonuses.extraBaseBonus += eff.value;
          break;
        }
        case 'team_power_mult': {
          if (batter && batter.power >= (eff.threshold || 8)) {
            const bonus = Math.round((handResult.mult * eff.value - handResult.mult) * 10) / 10;
            bonuses.multBonus += bonus;
            bonuses.messages.push({ text: `x${eff.value} mult (${StatDisplay.fmtHR(batter.power, batter.name)} HR)`, color: '#ff8a65' });
          }
          break;
        }
        case 'team_add_mult_on_hit': {
          if (isHit) {
            bonuses.multBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value}x (lineup bonus)`, color: '#ffab40' });
          }
          break;
        }
        case 'team_strikeout_peanuts': {
          if (handResult.outcome === 'Strikeout') {
            bonuses.peanutBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value} peanuts (K bonus)`, color: '#ffd600' });
          }
          break;
        }
        case 'team_first_pitch_mult': {
          if (discardCount === 0) {
            bonuses.multBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value}x (1st pitch)`, color: '#ffab40' });
          }
          break;
        }
        case 'team_runner_mult': {
          const runners = gameState.bases.filter(b => b).length;
          if (runners > 0) {
            const bonus = eff.value * runners;
            bonuses.multBonus += bonus;
            bonuses.messages.push({ text: `+${bonus}x (${runners} on base)`, color: '#ffab40' });
          }
          break;
        }
        case 'team_late_inning_peanuts': {
          // "Late innings" = the last third of the game, not literally 7+, which
          // never arrives in a 3/5-inning game.
          if (gameState.inning >= scaleInningWindow(7, 9, gameState.totalInnings).min) {
            bonuses.peanutBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value} peanuts (late inning)`, color: '#ffd600' });
          }
          break;
        }
        case 'team_contact_save_boost': {
          bonuses.contactSaveBoost += eff.value;
          break;
        }
        default:
          break;
      }
    }

    return _commit(handResult, bonuses);
  }

  /**
   * Active lineup synergy bonuses.
   * @param {Object} handResult - mutated in place
   * @param {Object} gameState
   * @param {Object} ctx
   * @param {Array}  ctx.synergies - active synergies, each with a `bonus` descriptor
   * @param {Object} ctx.batter - current batter (for handedness effects)
   * @returns {{peanutBonus, multBonus, messages, extraBaseBonus, pairOutReduction}}
   */
  static applySynergies(handResult, gameState, ctx = {}) {
    const synergies = ctx.synergies || [];
    const batter = ctx.batter;
    const bonuses = {
      peanutBonus: 0, multBonus: 0, messages: [],
      extraBaseBonus: 0, pairOutReduction: 0,
    };
    if (synergies.length === 0) return bonuses;

    for (const syn of synergies) {
      const eff = syn.bonus;
      switch (eff.type) {
        case 'add_mult_all': {
          bonuses.multBonus += eff.value;
          bonuses.messages.push({ text: `+${eff.value}x (${syn.name})`, color: '#ce93d8' });
          break;
        }
        case 'add_peanuts_all': {
          bonuses.peanutBonus += eff.value;
          bonuses.messages.push({ text: `+${eff.value} peanuts (${syn.name})`, color: '#ce93d8' });
          break;
        }
        case 'add_mult_on_hr': {
          if (handResult.outcome === 'Home Run') {
            bonuses.multBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value}x (${syn.name})`, color: '#ce93d8' });
          }
          break;
        }
        case 'add_mult_lefty': {
          if (batter && batter.bats === 'L') {
            bonuses.multBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value}x (${syn.name})`, color: '#ce93d8' });
          }
          break;
        }
        case 'team_pair_out_reduction': {
          bonuses.pairOutReduction += eff.value;
          break;
        }
        case 'team_extra_base_chance': {
          bonuses.extraBaseBonus += eff.value;
          break;
        }
        case 'add_peanuts_on_xbh': {
          if (['Triple', 'Home Run'].includes(handResult.outcome)) {
            bonuses.peanutBonus += eff.value;
            bonuses.messages.push({ text: `+${eff.value} peanuts (${syn.name})`, color: '#ce93d8' });
          }
          break;
        }
        // pitcher_control_reduction and pitcher_hit_reduction handled in PitchingScene
        // bonus_player_stat_boost handled at at-bat start
        default:
          break;
      }
    }

    return _commit(handResult, bonuses);
  }
}

export { OUT_OUTCOMES, XBH_OUTCOMES };

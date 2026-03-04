/**
 * Batter trait card definitions.
 * Add new traits here — they'll automatically appear in the shop.
 *
 * phase: 'pre' = modifies cards before eval, 'post' = modifies result after eval
 *
 * Pre-eval effect types:
 *   adjacent_to_pair  — adjacent ranks count as a pair
 *   ace_wild_straight — aces fill gaps in straights
 *   color_is_suit     — suit colors count as matching for flushes
 *
 * Post-eval effect types:
 *   add_mult          — add to multiplier          { value, condition? }
 *   add_chips         — add to chips               { value, condition? }
 *   per_runner_chips  — add chips per baserunner   { value }
 *   upgrade_outcome   — change outcome type        { from, to, addChips?, addMult?, condition? }
 *   prevent_outcome   — convert bad outcome         { from, toOutcome, toHand, chips, mult }
 *   set_flag          — set a flag on result        { flag, condition? }
 *
 * Conditions:
 *   { type: 'outs_eq', value: N }
 *   { type: 'inning_range', min: N, max: N }
 *   { type: 'runner_on', base: 0|1|2 }
 *   { type: 'bases_loaded' }
 *   { type: 'outcome_is', value: 'Strikeout' }
 *   { type: 'hand_is', value: 'Pair' }
 */
export default [
  // ── Pre-eval ──────────────────────────────────────────
  {
    id: 'double_mcgee',
    name: 'Double McGee',
    description: 'Adjacent ranks count as a pair',
    price: 30,
    rarity: 'uncommon',
    phase: 'pre',
    effect: { type: 'adjacent_to_pair' },
  },
  {
    id: 'ace_in_the_hole',
    name: 'Ace in the Hole',
    description: 'Aces are wild for straights',
    price: 35,
    rarity: 'rare',
    phase: 'pre',
    effect: { type: 'ace_wild_straight' },
  },
  {
    id: 'switch_hitter',
    name: 'Switch Hitter',
    description: 'Either suit color counts as matching for flushes',
    price: 30,
    rarity: 'uncommon',
    phase: 'pre',
    effect: { type: 'color_is_suit' },
  },

  // ── Post-eval ─────────────────────────────────────────
  {
    id: 'slugger_serum',
    name: 'Slugger Serum',
    description: 'Pairs upgrade to doubles',
    price: 40,
    rarity: 'rare',
    phase: 'post',
    effect: {
      type: 'upgrade_outcome',
      from: 'Single', to: 'Double',
      addChips: 1, addMult: 0.5,
      newHandName: 'Pair (Slugger!)',
      condition: { type: 'hand_is', value: 'Pair' },
    },
  },
  {
    id: 'eye_of_the_tiger',
    name: 'Eye of the Tiger',
    description: '+3 mult with 2 outs',
    price: 25,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_mult', value: 3, condition: { type: 'outs_eq', value: 2 } },
  },
  {
    id: 'contact_lens',
    name: 'Contact Lens',
    description: 'Low pairs never fail into groundouts',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'prevent_outcome', from: 'Groundout', toOutcome: 'Single', toHand: 'Pair (Contact!)', chips: 1, mult: 1.5 },
  },
  {
    id: 'sacrifice_fly',
    name: 'Sacrifice Fly',
    description: 'Strikeouts with runner on 3rd score a run',
    price: 25,
    rarity: 'uncommon',
    phase: 'post',
    effect: {
      type: 'set_flag', flag: 'sacrificeFly',
      condition: { type: 'and', conditions: [
        { type: 'outcome_is', value: 'Strikeout' },
        { type: 'runner_on', base: 2 },
      ]},
    },
  },
  {
    id: 'hot_corner',
    name: 'Hot Corner',
    description: '+2 chips per runner on base',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'per_runner_chips', value: 2 },
  },
  {
    id: 'closer',
    name: 'Closer',
    description: '+5 mult in innings 7-9',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'add_mult', value: 5, condition: { type: 'inning_range', min: 7, max: 9 } },
  },
  {
    id: 'stolen_base',
    name: 'Stolen Base',
    description: 'Runner on 1st auto-advances before at-bat',
    price: 25,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'set_flag', flag: 'stolenBase', condition: { type: 'runner_on', base: 0 } },
  },
  {
    id: 'grand_ambition',
    name: 'Grand Ambition',
    description: '+10 mult when bases are loaded',
    price: 45,
    rarity: 'rare',
    phase: 'post',
    effect: { type: 'add_mult', value: 10, condition: { type: 'bases_loaded' } },
  },
];

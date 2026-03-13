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
 *   { type: 'losing_by', value: N }
 *   { type: 'first_batter_of_inning' }
 *
 * Additional post-eval effect types:
 *   convert_high_card  — turn High Card outs into weak singles  { newHandName, chips, mult, condition? }
 *   add_discard        — grant extra discards this at-bat       { value, condition? }
 *
 * Additional pre-eval effect types:
 *   upgrade_lowest     — chance to boost lowest card rank        { chance, amount }
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

  // ── New traits ──────────────────────────────────────────

  {
    id: 'batting_gloves',
    name: 'Batting Gloves',
    description: '+1 discard per at-bat',
    price: 35,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'add_discard', value: 1 },
  },
  {
    id: 'rally_cap',
    name: 'Rally Cap',
    description: '+4 mult when losing by 2+ runs',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'add_mult', value: 4, condition: { type: 'losing_by', value: 2 } },
  },
  {
    id: 'pinch_hitter',
    name: 'Pinch Hitter',
    description: '20% chance to boost lowest card by 3 ranks',
    price: 25,
    rarity: 'uncommon',
    phase: 'pre',
    effect: { type: 'upgrade_lowest', chance: 0.2, amount: 3 },
  },
  {
    id: 'bunt_single',
    name: 'Bunt Single',
    description: 'High Card becomes a weak single instead of an out',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'convert_high_card', newHandName: 'Bunt Single', chips: 1, mult: 1 },
  },
  {
    id: 'cleanup_crew',
    name: 'Cleanup Crew',
    description: '+3 chips on Three of a Kind or better',
    price: 25,
    rarity: 'common',
    phase: 'post',
    effect: {
      type: 'add_chips', value: 3,
      condition: { type: 'hand_in', values: ['Three of a Kind', 'Full House', 'Four of a Kind', 'Flush', 'Straight', 'Straight Flush', 'Royal Flush'] },
    },
  },
  {
    id: 'walk_machine',
    name: 'Walk Machine',
    description: 'Every at-bat starts with 1 ball (1-0 count)',
    price: 40,
    rarity: 'rare',
    phase: 'post',
    effect: { type: 'start_with_ball', value: 1 },
  },
  {
    id: 'dugout_fire',
    name: 'Dugout Fire',
    description: '+2 mult per out this inning',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: 2, condition: { type: 'outs_eq', value: 1 } },
        { type: 'add_mult', value: 4, condition: { type: 'outs_eq', value: 2 } },
      ],
    },
  },
  {
    id: 'leadoff_king',
    name: 'Lead-Off King',
    description: '+3 mult as first batter of the inning',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_mult', value: 3, condition: { type: 'first_batter_of_inning' } },
  },
  {
    id: 'extra_innings',
    name: 'Extra Innings',
    description: '+6 mult in innings 8-9',
    price: 35,
    rarity: 'rare',
    phase: 'post',
    effect: { type: 'add_mult', value: 6, condition: { type: 'inning_range', min: 8, max: 9 } },
  },
  {
    id: 'extra_glove',
    name: 'Extra Glove',
    description: 'Play or discard up to 6 cards instead of 5',
    price: 40,
    rarity: 'rare',
    phase: 'post',
    effect: { type: 'add_hand_size', value: 1 },
  },
];

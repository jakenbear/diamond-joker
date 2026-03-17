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
 *   add_peanuts         — add to peanuts               { value, condition? }
 *   per_runner_peanuts  — add peanuts per baserunner   { value }
 *   upgrade_outcome   — change outcome type        { from, to, addPeanuts?, addMult?, condition? }
 *   prevent_outcome   — convert bad outcome         { from, toOutcome, toHand, peanuts, mult }
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
 *   convert_high_card  — turn High Card outs into weak singles  { newHandName, peanuts, mult, condition? }
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
      addPeanuts: 1, addMult: 0.5,
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
    effect: { type: 'prevent_outcome', from: 'Groundout', toOutcome: 'Single', toHand: 'Pair (Contact!)', peanuts: 1, mult: 1.5 },
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
    description: '+2 peanuts per runner on base',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'per_runner_peanuts', value: 2 },
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
    effect: { type: 'convert_high_card', newHandName: 'Bunt Single', peanuts: 1, mult: 1 },
  },
  {
    id: 'cleanup_crew',
    name: 'Cleanup Crew',
    description: '+3 peanuts on Three of a Kind or better',
    price: 25,
    rarity: 'common',
    phase: 'post',
    effect: {
      type: 'add_peanuts', value: 3,
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

  // ── Clutch / Pressure ─────────────────────────────────

  {
    id: 'walk_off_hero',
    name: 'Walk-Off Hero',
    description: '+8 mult in inning 9',
    price: 35,
    rarity: 'rare',
    phase: 'post',
    effect: { type: 'add_mult', value: 8, condition: { type: 'inning_range', min: 9, max: 9 } },
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: '+6 mult when losing by 3+ runs',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'add_mult', value: 6, condition: { type: 'losing_by', value: 3 } },
  },
  {
    id: 'ice_veins',
    name: 'Ice Veins',
    description: '+2 mult with 2 outs, +4 mult with 0 outs',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: 2, condition: { type: 'outs_eq', value: 2 } },
        { type: 'add_mult', value: 4, condition: { type: 'outs_eq', value: 0 } },
      ],
    },
  },
  {
    id: 'pressure_player',
    name: 'Pressure Player',
    description: '+3 peanuts when losing by 1+ run',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_peanuts', value: 3, condition: { type: 'losing_by', value: 1 } },
  },
  {
    id: 'no_quit',
    name: 'No Quit',
    description: '+2 mult when losing, in innings 5+',
    price: 25,
    rarity: 'uncommon',
    phase: 'post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: 2, condition: { type: 'and', conditions: [
          { type: 'losing_by', value: 1 },
          { type: 'inning_range', min: 5, max: 9 },
        ]}},
      ],
    },
  },

  // ── Runner / Base Situation ───────────────────────────

  {
    id: 'traffic_cop',
    name: 'Traffic Cop',
    description: '+4 peanuts per runner on base',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'per_runner_peanuts', value: 4 },
  },
  {
    id: 'bases_clearing',
    name: 'Bases Clearing',
    description: '+15 mult when bases are loaded',
    price: 50,
    rarity: 'rare',
    phase: 'post',
    effect: { type: 'add_mult', value: 15, condition: { type: 'bases_loaded' } },
  },
  {
    id: 'hit_and_run',
    name: 'Hit and Run',
    description: '+2 mult with runner on 1st',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_mult', value: 2, condition: { type: 'runner_on', base: 0 } },
  },
  {
    id: 'scoring_position',
    name: 'Scoring Position',
    description: '+3 mult with runner on 2nd or 3rd',
    price: 25,
    rarity: 'common',
    phase: 'post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: 3, condition: { type: 'runner_on', base: 1 } },
        { type: 'add_mult', value: 3, condition: { type: 'runner_on', base: 2 } },
      ],
    },
  },
  {
    id: 'empty_yard',
    name: 'Empty Yard',
    description: '+4 mult when bases are empty',
    price: 25,
    rarity: 'uncommon',
    phase: 'post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: 4, condition: { type: 'and', conditions: [
          { type: 'outs_neq', value: -1 },  // always true (trick to check no runners)
        ]}},
      ],
    },
  },
  {
    id: 'squeeze_play',
    name: 'Squeeze Play',
    description: 'Strikeouts with runner on 3rd score a run (like Sacrifice Fly)',
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

  // ── Hand-Specific Bonuses ─────────────────────────────

  {
    id: 'pair_specialist',
    name: 'Pair Specialist',
    description: '+2 mult on Pairs',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_mult', value: 2, condition: { type: 'hand_is', value: 'Pair' } },
  },
  {
    id: 'two_pair_terror',
    name: 'Two Pair Terror',
    description: '+3 mult on Two Pair',
    price: 25,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_mult', value: 3, condition: { type: 'hand_is', value: 'Two Pair' } },
  },
  {
    id: 'triple_threat',
    name: 'Triple Threat',
    description: '+4 mult on Three of a Kind',
    price: 25,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'add_mult', value: 4, condition: { type: 'hand_is', value: 'Three of a Kind' } },
  },
  {
    id: 'flush_fever',
    name: 'Flush Fever',
    description: '+5 mult on Flushes',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'add_mult', value: 5, condition: { type: 'hand_is', value: 'Flush' } },
  },
  {
    id: 'run_the_bases',
    name: 'Run the Bases',
    description: '+4 mult on Straights',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'add_mult', value: 4, condition: { type: 'hand_is', value: 'Straight' } },
  },
  {
    id: 'full_count',
    name: 'Full Count',
    description: '+6 mult on Full House',
    price: 35,
    rarity: 'rare',
    phase: 'post',
    effect: { type: 'add_mult', value: 6, condition: { type: 'hand_is', value: 'Full House' } },
  },
  {
    id: 'four_bagger',
    name: 'Four Bagger',
    description: '+8 mult on Four of a Kind',
    price: 40,
    rarity: 'rare',
    phase: 'post',
    effect: { type: 'add_mult', value: 8, condition: { type: 'hand_is', value: 'Four of a Kind' } },
  },
  {
    id: 'chip_shot',
    name: 'Chip Shot',
    description: '+2 peanuts on Pairs and Two Pair',
    price: 15,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_peanuts', value: 2, condition: { type: 'hand_in', values: ['Pair', 'Two Pair'] } },
  },
  {
    id: 'big_fly',
    name: 'Big Fly',
    description: 'Straight Flush and Royal Flush: +10 mult',
    price: 45,
    rarity: 'rare',
    phase: 'post',
    effect: { type: 'add_mult', value: 10, condition: { type: 'hand_in', values: ['Straight Flush', 'Royal Flush'] } },
  },

  // ── Card Manipulation (Pre-eval) ──────────────────────

  {
    id: 'card_shark',
    name: 'Card Shark',
    description: '25% chance to swap two random card ranks',
    price: 25,
    rarity: 'uncommon',
    phase: 'pre',
    effect: { type: 'swap_random', chance: 0.25 },
  },
  {
    id: 'face_smasher',
    name: 'Face Smasher',
    description: 'Face cards (J/Q/K) drop 2 ranks (helps pairs)',
    price: 20,
    rarity: 'common',
    phase: 'pre',
    effect: { type: 'downgrade_face_cards', amount: 2 },
  },
  {
    id: 'lucky_draw',
    name: 'Lucky Draw',
    description: '30% chance to boost lowest card by 4 ranks',
    price: 30,
    rarity: 'uncommon',
    phase: 'pre',
    effect: { type: 'upgrade_lowest', chance: 0.3, amount: 4 },
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    description: '30% chance to drop highest card by 3 ranks',
    price: 20,
    rarity: 'common',
    phase: 'pre',
    effect: { type: 'downgrade_highest', chance: 0.3, amount: 3 },
  },

  // ── Economy / Chip Generation ─────────────────────────

  {
    id: 'money_ball',
    name: 'Money Ball',
    description: '+2 peanuts on every at-bat',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_peanuts', value: 2 },
  },
  {
    id: 'gold_glove',
    name: 'Gold Glove',
    description: '+4 peanuts on Three of a Kind or better',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    effect: {
      type: 'add_peanuts', value: 4,
      condition: { type: 'hand_in', values: ['Three of a Kind', 'Full House', 'Four of a Kind', 'Flush', 'Straight', 'Straight Flush', 'Royal Flush'] },
    },
  },
  {
    id: 'penny_pincher',
    name: 'Penny Pincher',
    description: '+1 peanut on Pairs',
    price: 10,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_peanuts', value: 1, condition: { type: 'hand_is', value: 'Pair' } },
  },
  {
    id: 'late_bloomer',
    name: 'Late Bloomer',
    description: '+5 peanuts in innings 7-9',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'add_peanuts', value: 5, condition: { type: 'inning_range', min: 7, max: 9 } },
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: '+3 peanuts in innings 1-3',
    price: 15,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_peanuts', value: 3, condition: { type: 'inning_range', min: 1, max: 3 } },
  },

  // ── Outcome Upgrades / Prevention ─────────────────────

  {
    id: 'ground_rule_double',
    name: 'Ground Rule Double',
    description: 'Singles upgrade to Doubles on Two Pair',
    price: 35,
    rarity: 'rare',
    phase: 'post',
    effect: {
      type: 'upgrade_outcome',
      from: 'Single', to: 'Double',
      addPeanuts: 1, addMult: 0.5,
      newHandName: 'Two Pair (Ground Rule!)',
      condition: { type: 'hand_is', value: 'Two Pair' },
    },
  },
  {
    id: 'leg_it_out',
    name: 'Leg It Out',
    description: 'Doubles upgrade to Triples on Straights',
    price: 40,
    rarity: 'rare',
    phase: 'post',
    effect: {
      type: 'upgrade_outcome',
      from: 'Double', to: 'Triple',
      addPeanuts: 2, addMult: 1,
      newHandName: 'Straight (Legged Out!)',
      condition: { type: 'hand_is', value: 'Straight' },
    },
  },
  {
    id: 'error_magnet',
    name: 'Error Magnet',
    description: 'Groundouts become Singles 15% of the time',
    price: 25,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'prevent_outcome', from: 'Groundout', toOutcome: 'Single', toHand: 'Error!', peanuts: 1, mult: 1 },
  },
  {
    id: 'foul_fighter',
    name: 'Foul Fighter',
    description: 'High Card becomes a weak single (like Bunt Single)',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'convert_high_card', newHandName: 'Foul Fighter', peanuts: 1, mult: 1 },
  },

  // ── Inning-Specific ───────────────────────────────────

  {
    id: 'morning_stretch',
    name: 'Morning Stretch',
    description: '+3 mult in innings 1-3',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_mult', value: 3, condition: { type: 'inning_range', min: 1, max: 3 } },
  },
  {
    id: 'midgame_motor',
    name: 'Midgame Motor',
    description: '+3 mult in innings 4-6',
    price: 20,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_mult', value: 3, condition: { type: 'inning_range', min: 4, max: 6 } },
  },
  {
    id: 'seventh_stretch',
    name: 'Seventh Inning Stretch',
    description: '+5 mult in inning 7',
    price: 25,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'add_mult', value: 5, condition: { type: 'inning_range', min: 7, max: 7 } },
  },

  // ── Utility / Flexibility ─────────────────────────────

  {
    id: 'fresh_cleats',
    name: 'Fresh Cleats',
    description: '+1 discard per at-bat',
    price: 35,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'add_discard', value: 1 },
  },
  {
    id: 'batting_cage',
    name: 'Batting Cage',
    description: '+2 mult as first batter of the inning',
    price: 15,
    rarity: 'common',
    phase: 'post',
    effect: { type: 'add_mult', value: 2, condition: { type: 'first_batter_of_inning' } },
  },
  {
    id: 'insurance_run',
    name: 'Insurance Run',
    description: '+2 peanuts and +1 mult with 0 outs',
    price: 25,
    rarity: 'uncommon',
    phase: 'post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_peanuts', value: 2, condition: { type: 'outs_eq', value: 0 } },
        { type: 'add_mult', value: 1, condition: { type: 'outs_eq', value: 0 } },
      ],
    },
  },
  {
    id: 'tape_measure',
    name: 'Tape Measure',
    description: '+5 peanuts on Home Runs',
    price: 30,
    rarity: 'uncommon',
    phase: 'post',
    effect: { type: 'add_peanuts', value: 5, condition: { type: 'outcome_is', value: 'Home Run' } },
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Flyouts become Singles with 2 outs',
    price: 30,
    rarity: 'rare',
    phase: 'post',
    effect: {
      type: 'prevent_outcome', from: 'Flyout', toOutcome: 'Single',
      toHand: 'Flyout (Iron Will!)', peanuts: 1, mult: 1.5,
    },
  },
];

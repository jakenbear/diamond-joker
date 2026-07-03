/**
 * Pitcher trait definitions.
 * 1-2 traits are randomly assigned to the opponent pitcher each game.
 *
 * phase: 'pitcher_pre' = modifies player's cards, 'pitcher_post' = modifies result
 *
 * Pre-eval effect types:
 *   downgrade_highest    — chance to reduce highest card's rank  { chance, amount }
 *   downgrade_face_cards — reduce face card ranks                { amount }
 *   swap_random          — chance to swap two cards' ranks       { chance }
 *
 * Post-eval effect types:
 *   add_mult             — add/subtract mult                     { value, condition? }
 *   add_peanuts            — add/subtract peanuts                    { value, condition? }
 *   force_groundout      — convert weak hands to groundout       { condition }
 *   cap_mult             — ceiling the mult                       { value, condition? }
 *   scale_mult           — multiply the mult by a fraction        { value, condition? }
 *   compound             — apply multiple effects in sequence    { effects: [] }
 */
export default [
  {
    id: 'heater',
    name: 'Heater',
    description: 'Low pairs auto-groundout. But triples+ get +2 peanuts.',
    rarity: 'common',
    phase: 'pitcher_post',
    effect: {
      type: 'compound',
      effects: [
        {
          type: 'force_groundout',
          newHandName: 'Groundout (Heater!)',
          condition: { type: 'and', conditions: [
            { type: 'hand_is', value: 'Pair' },
            { type: 'peanuts_lte', value: 1 },
          ]},
        },
        {
          type: 'add_peanuts', value: 2,
          condition: { type: 'hand_in', values: ['Three of a Kind', 'Four of a Kind', 'Full House'] },
        },
      ],
    },
  },
  {
    id: 'curveball',
    name: 'Curveball',
    description: '30% chance your highest card loses 3 ranks.',
    rarity: 'uncommon',
    phase: 'pitcher_pre',
    effect: { type: 'downgrade_highest', chance: 0.3, amount: 3 },
  },
  {
    id: 'slider',
    name: 'Slider',
    description: '-1 mult on all hands. With 2 outs, -2 instead.',
    rarity: 'common',
    phase: 'pitcher_post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: -1, condition: { type: 'outs_neq', value: 2 } },
        { type: 'add_mult', value: -2, condition: { type: 'outs_eq', value: 2 } },
      ],
    },
  },
  {
    id: 'knuckleball',
    name: 'Knuckleball',
    description: 'Face cards (J/Q/K) lose 2 ranks.',
    rarity: 'uncommon',
    phase: 'pitcher_pre',
    effect: { type: 'downgrade_face_cards', amount: 2 },
  },
  {
    id: 'intimidation',
    name: 'Intimidation',
    description: '-2 mult at 0 outs. +2 mult at 2 outs.',
    rarity: 'common',
    phase: 'pitcher_post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: -2, condition: { type: 'outs_eq', value: 0 } },
        { type: 'add_mult', value: 2,  condition: { type: 'outs_eq', value: 2 } },
      ],
    },
  },
  {
    id: 'painted_corner',
    name: 'Painted Corner',
    description: 'High pairs/two pair get -1 peanut.',
    rarity: 'uncommon',
    phase: 'pitcher_post',
    effect: {
      type: 'add_peanuts', value: -1,
      condition: { type: 'and', conditions: [
        { type: 'hand_in', values: ['Pair', 'Two Pair'] },
        { type: 'peanuts_gte', value: 3 },
      ]},
    },
  },
  {
    id: 'changeup',
    name: 'Changeup',
    description: '25% chance two cards swap ranks. Chaos!',
    rarity: 'rare',
    phase: 'pitcher_pre',
    effect: { type: 'swap_random', chance: 0.25 },
  },
  {
    id: 'closers_instinct',
    name: "Closer's Instinct",
    description: '-3 mult in innings 7-9.',
    rarity: 'rare',
    phase: 'pitcher_post',
    effect: { type: 'add_mult', value: -3, condition: { type: 'inning_range', min: 7, max: 9 } },
  },
  // ── Expansion: Common ──
  {
    id: 'sinker',
    name: 'Sinker',
    description: '40% chance your highest card loses 2 ranks.',
    rarity: 'common',
    phase: 'pitcher_pre',
    effect: { type: 'downgrade_highest', chance: 0.4, amount: 2 },
  },
  {
    id: 'cutter',
    name: 'Cutter',
    description: '-1 peanut on all hits.',
    rarity: 'common',
    phase: 'pitcher_post',
    effect: { type: 'add_peanuts', value: -1, condition: { type: 'peanuts_gte', value: 1 } },
  },
  {
    id: 'sinkerballer',
    name: 'Sinkerballer',
    description: 'Pairs/Two Pair -2 mult. But Straights/Flushes get +2 peanuts.',
    rarity: 'common',
    phase: 'pitcher_post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: -2, condition: { type: 'hand_in', values: ['Pair', 'Two Pair'] } },
        { type: 'add_peanuts', value: 2, condition: { type: 'hand_in', values: ['Straight', 'Flush'] } },
      ],
    },
  },
  {
    id: 'fireballer',
    name: 'Fireballer',
    description: '-2 mult in innings 1-3 (fresh and dominant).',
    rarity: 'common',
    phase: 'pitcher_post',
    effect: { type: 'add_mult', value: -2, condition: { type: 'inning_range', min: 1, max: 3 } },
  },
  {
    id: 'backfoot_slider',
    name: 'Backfoot Slider',
    description: 'Face cards (J/Q/K) lose 1 rank.',
    rarity: 'common',
    phase: 'pitcher_pre',
    effect: { type: 'downgrade_face_cards', amount: 1 },
  },
  // ── Expansion: Uncommon ──
  {
    id: 'junkballer',
    name: 'Junkballer',
    description: 'All mult capped at 4. But every hit gets +1 peanut.',
    rarity: 'uncommon',
    phase: 'pitcher_post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'cap_mult', value: 4 },
        { type: 'add_peanuts', value: 1, condition: { type: 'peanuts_gte', value: 1 } },
      ],
    },
  },
  {
    id: 'bulldog',
    name: 'Bulldog',
    description: 'When you have the lead, -3 mult.',
    rarity: 'uncommon',
    phase: 'pitcher_post',
    effect: { type: 'add_mult', value: -3, condition: { type: 'winning_by', value: 1 } },
  },
  {
    id: 'wild_thing',
    name: 'Wild Thing',
    description: '50% chance two of your cards swap ranks. Chaos!',
    rarity: 'uncommon',
    phase: 'pitcher_pre',
    effect: { type: 'swap_random', chance: 0.5 },
  },
  {
    id: 'splitter',
    name: 'Splitter',
    description: 'Three of a Kind and better get -2 mult.',
    rarity: 'uncommon',
    phase: 'pitcher_post',
    effect: {
      type: 'add_mult', value: -2,
      condition: { type: 'hand_in', values: ['Three of a Kind', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'] },
    },
  },
  {
    id: 'escape_artist',
    name: 'Escape Artist',
    description: 'Bases loaded -5 mult. Bases empty +1 mult.',
    rarity: 'uncommon',
    phase: 'pitcher_post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: -5, condition: { type: 'bases_loaded' } },
        { type: 'add_mult', value: 1, condition: { type: 'bases_empty' } },
      ],
    },
  },
  // ── Expansion: Rare ──
  {
    id: 'frontline_ace',
    name: 'Frontline Ace',
    description: 'All mult scaled to 75% (big hands hurt most).',
    rarity: 'rare',
    phase: 'pitcher_post',
    effect: { type: 'scale_mult', value: 0.75 },
  },
  {
    id: 'rally_killer',
    name: 'Rally Killer',
    description: 'Runners on base -4 mult. But bases empty +2 peanuts.',
    rarity: 'rare',
    phase: 'pitcher_post',
    effect: {
      type: 'compound',
      effects: [
        { type: 'add_mult', value: -4, condition: { type: 'bases_occupied' } },
        { type: 'add_peanuts', value: 2, condition: { type: 'bases_empty' } },
      ],
    },
  },
];

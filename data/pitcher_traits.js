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
 *   add_chips            — add/subtract chips                    { value, condition? }
 *   force_groundout      — convert weak hands to groundout       { condition }
 *   compound             — apply multiple effects in sequence    { effects: [] }
 */
export default [
  {
    id: 'heater',
    name: 'Heater',
    description: 'Low pairs auto-groundout. But triples+ get +2 chips.',
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
            { type: 'chips_lte', value: 1 },
          ]},
        },
        {
          type: 'add_chips', value: 2,
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
    description: 'High pairs/two pair get -1 chip.',
    rarity: 'uncommon',
    phase: 'pitcher_post',
    effect: {
      type: 'add_chips', value: -1,
      condition: { type: 'and', conditions: [
        { type: 'hand_in', values: ['Pair', 'Two Pair'] },
        { type: 'chips_gte', value: 3 },
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
];

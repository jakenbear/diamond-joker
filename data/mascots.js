/**
 * Mascot definitions — wild, game-breaking passive effects.
 * Bought at the shop, placed in staff slots (shared with coaches).
 * Sprites: assets/animals/mascots_4x.png (15 animals, 3 rows of 5)
 *
 * Effect types:
 *   team_convert_high_card — High Card becomes weak single for all  { peanuts, mult }
 *   add_mult               — bonus mult with condition              { value, condition? }
 *   strikeout_to_walk      — chance strikeout becomes walk          { chance }
 *   flat_peanuts_per_ab      — bonus peanuts every at-bat               { value }
 *   ignore_pair_penalty    — disable Pitcher Adjusts pair penalty   {}
 *   bonus_draw_on_discard  — chance to draw extra card on discard   { chance }
 *   per_runner_peanuts       — +chips per baserunner                  { value }
 *   double_peanuts           — double peanut score with condition       { condition }
 *   strikeout_redraw       — first K each inning redraws hand       { usesPerInning }
 *   pitcher_hit_reduction  — reduce opponent hit chance             { value }
 *   mult_per_inning_run    — +mult per run scored this inning       { value }
 *   team_extra_base        — bonus extra-base chance for all        { value }
 *   add_hand_draw          — draw extra cards per hand              { value }
 *   error_multiplier       — multiply error chance in your favor    { value }
 */
export default [
  // Row 1: Chick, Rooster, Duck, Cow, Sheep
  {
    id: 'scrappy_chick',
    name: 'Scrappy Chick',
    price: 25,
    rarity: 'common',
    category: 'mascot',
    spriteIndex: 0,
    description: 'High Card becomes a weak single for ALL batters',
    effect: { type: 'team_convert_high_card', peanuts: 1, mult: 1 },
  },
  {
    id: 'morning_rooster',
    name: 'Morning Rooster',
    price: 35,
    rarity: 'uncommon',
    category: 'mascot',
    spriteIndex: 1,
    description: '+4 mult in innings 1-3',
    effect: { type: 'add_mult', value: 4, condition: { type: 'inning_range', min: 1, max: 3 } },
  },
  {
    id: 'lucky_duck',
    name: 'Lucky Duck',
    price: 35,
    rarity: 'uncommon',
    category: 'mascot',
    spriteIndex: 2,
    description: '15% chance a strikeout becomes a walk',
    effect: { type: 'strikeout_to_walk', chance: 0.15 },
  },
  {
    id: 'cash_cow',
    name: 'Cash Cow',
    price: 30,
    rarity: 'common',
    category: 'mascot',
    spriteIndex: 3,
    description: '+3 bonus peanuts after every at-bat',
    effect: { type: 'flat_peanuts_per_ab', value: 3 },
  },
  {
    id: 'black_sheep',
    name: 'Black Sheep',
    price: 45,
    rarity: 'rare',
    category: 'mascot',
    spriteIndex: 4,
    description: 'Pairs never degrade from Pitcher Adjusts',
    effect: { type: 'ignore_pair_penalty' },
  },

  // Row 2: Raccoon, Hedgehog, Bear, Cat, Wolf
  {
    id: 'trash_panda',
    name: 'Trash Panda',
    price: 35,
    rarity: 'uncommon',
    category: 'mascot',
    spriteIndex: 5,
    description: '20% chance to steal an extra card on discard',
    effect: { type: 'bonus_draw_on_discard', chance: 0.20 },
  },
  {
    id: 'spike',
    name: 'Spike',
    price: 40,
    rarity: 'uncommon',
    category: 'mascot',
    spriteIndex: 6,
    description: '+2 peanuts per runner on base (all batters)',
    effect: { type: 'per_runner_peanuts', value: 2 },
  },
  {
    id: 'thunder_bear',
    name: 'Thunder Bear',
    price: 50,
    rarity: 'rare',
    category: 'mascot',
    spriteIndex: 7,
    description: 'Home Runs score double peanuts',
    effect: { type: 'double_peanuts', condition: { type: 'outcome_is', value: 'Home Run' } },
  },
  {
    id: 'nine_lives',
    name: 'Nine Lives',
    price: 45,
    rarity: 'rare',
    category: 'mascot',
    spriteIndex: 8,
    description: 'First strikeout each inning becomes a foul (redraw)',
    effect: { type: 'strikeout_redraw', usesPerInning: 1 },
  },
  {
    id: 'lone_wolf',
    name: 'Lone Wolf',
    price: 35,
    rarity: 'uncommon',
    category: 'mascot',
    spriteIndex: 9,
    description: '+5 mult when bases are empty',
    effect: { type: 'add_mult', value: 5, condition: { type: 'bases_empty' } },
  },

  // Row 3: Turtle, Lizard, Frog, Crab, Fox
  {
    id: 'iron_shell',
    name: 'Iron Shell',
    price: 30,
    rarity: 'common',
    category: 'mascot',
    spriteIndex: 10,
    description: 'Your pitcher: -8% hit chance',
    effect: { type: 'pitcher_hit_reduction', value: 0.08 },
  },
  {
    id: 'cold_blood',
    name: 'Cold Blood',
    price: 40,
    rarity: 'uncommon',
    category: 'mascot',
    spriteIndex: 11,
    description: '+3 mult per run scored this inning',
    effect: { type: 'mult_per_inning_run', value: 3 },
  },
  {
    id: 'leap_frog',
    name: 'Leap Frog',
    price: 35,
    rarity: 'uncommon',
    category: 'mascot',
    spriteIndex: 12,
    description: 'All batters +10% extra base chance',
    effect: { type: 'team_extra_base', value: 0.10 },
  },
  {
    id: 'pinch_crab',
    name: 'Pinch Crab',
    price: 45,
    rarity: 'rare',
    category: 'mascot',
    spriteIndex: 13,
    description: 'Draw 9 cards instead of 8',
    effect: { type: 'add_hand_draw', value: 1 },
  },
  {
    id: 'sly_fox',
    name: 'Sly Fox',
    price: 50,
    rarity: 'rare',
    category: 'mascot',
    spriteIndex: 14,
    description: 'Errors happen 3x more often (in your favor)',
    effect: { type: 'error_multiplier', value: 3 },
  },
];

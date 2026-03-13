/**
 * Coach definitions — steady, predictable team-wide buffs.
 * Bought at the shop, placed in staff slots (shared with mascots).
 *
 * Effect types:
 *   team_stat_boost      — boost a stat for all batters        { stat, value }
 *   team_add_discard     — extra discards per at-bat            { value }
 *   pitcher_hit_reduction — reduce opponent hit chance          { value }
 *   unlock_staff_slot    — add +1 coach/mascot slot             { value }
 *   shop_extra_cards     — shop shows extra trait cards          { value }
 *   pitcher_fatigue_delay — pitcher fatigue starts later         { value }
 */
export default [
  {
    id: 'batting_coach',
    name: 'Batting Coach',
    price: 30,
    rarity: 'common',
    category: 'coach',
    description: 'All batters +1 contact',
    effect: { type: 'team_stat_boost', stat: 'contact', value: 1 },
  },
  {
    id: 'power_coach',
    name: 'Power Coach',
    price: 30,
    rarity: 'common',
    category: 'coach',
    description: 'All batters +1 power',
    effect: { type: 'team_stat_boost', stat: 'power', value: 1 },
  },
  {
    id: 'base_coach',
    name: 'Base Coach',
    price: 25,
    rarity: 'common',
    category: 'coach',
    description: 'All batters +1 speed',
    effect: { type: 'team_stat_boost', stat: 'speed', value: 1 },
  },
  {
    id: 'bench_coach',
    name: 'Bench Coach',
    price: 35,
    rarity: 'uncommon',
    category: 'coach',
    description: '+1 discard per at-bat for all',
    effect: { type: 'team_add_discard', value: 1 },
  },
  {
    id: 'pitching_coach',
    name: 'Pitching Coach',
    price: 35,
    rarity: 'uncommon',
    category: 'coach',
    description: 'Your pitcher: -8% hit chance',
    effect: { type: 'pitcher_hit_reduction', value: 0.08 },
  },
  {
    id: 'equipment_manager',
    name: 'Equipment Manager',
    price: 40,
    rarity: 'rare',
    category: 'coach',
    description: 'Unlock +1 Coach/Mascot slot',
    effect: { type: 'unlock_staff_slot', value: 1 },
  },
  {
    id: 'scout',
    name: 'Scout',
    price: 25,
    rarity: 'common',
    category: 'coach',
    description: 'Shop shows 4 trait cards instead of 3',
    effect: { type: 'shop_extra_cards', value: 1 },
  },
  {
    id: 'bullpen_coach',
    name: 'Bullpen Coach',
    price: 30,
    rarity: 'uncommon',
    category: 'coach',
    description: 'Pitcher fatigue starts 1 inning later',
    effect: { type: 'pitcher_fatigue_delay', value: 1 },
  },
];

/**
 * Bonus player definitions — enhanced archetypes earned from card packs.
 * Not team-affiliated. Each has boosted stats, a fixed innate trait,
 * and a passive lineup effect (Joker-like, applies to all batters).
 *
 * Pack tiers:
 *   Bronze Pack — 2+ runs in a half-inning, pick 1 of 2
 *   Gold Pack   — 4+ runs (or 25+ peanut single hand), pick 1 of 3
 *
 * innateTraitId: references data/batter_traits.js (equipped free, doesn't count toward 2-trait cap)
 * lineupEffect: passive bonus for the whole lineup while this player is active
 *
 * Lineup effect types:
 *   team_add_peanuts_on_xbh     — +chips on doubles, triples, HRs    { value }
 *   team_pair_out_reduction   — reduce pair out chance              { value }
 *   team_extra_base_chance    — +extra base chance on singles       { value }
 *   team_power_mult           — x mult for high-power batters       { value, threshold }
 *   team_add_mult_on_hit      — +mult on all hits                  { value }
 *   team_strikeout_peanuts      — earn peanuts even on strikeouts       { value }
 *   team_first_pitch_mult     — bonus mult on first-pitch swings    { value }
 *   team_runner_mult          — +mult per runner on base            { value }
 *   team_late_inning_peanuts    — +chips in innings 7-9               { value }
 *   team_contact_save_boost   — increase contact save chance        { value }
 */
export default [
  // ── Power Archetype ──
  {
    id: 'knuckles_mcbride',
    name: '"Knuckles" McBride',
    pos: '1B',
    power: 9, contact: 4, speed: 5, bats: 'R',
    innateTraitId: 'cleanup_crew',
    lineupEffect: { type: 'team_add_peanuts_on_xbh', value: 1 },
    lineupDescription: 'All batters: +1 peanut on doubles+',
    rarity: 'common',
  },
  {
    id: 'hammer_jones',
    name: 'Hammer Jones',
    pos: 'DH',
    power: 10, contact: 3, speed: 3, bats: 'R',
    innateTraitId: 'slugger_serum',
    lineupEffect: { type: 'team_power_mult', value: 1.5, threshold: 8 },
    lineupDescription: 'Power 8+ batters: x1.5 mult',
    rarity: 'rare',
  },
  {
    id: 'dynamite_diaz',
    name: 'Dynamite Diaz',
    pos: 'RF',
    power: 8, contact: 5, speed: 6, bats: 'L',
    innateTraitId: 'hot_corner',
    lineupEffect: { type: 'team_add_peanuts_on_xbh', value: 2 },
    lineupDescription: 'All batters: +2 peanuts on doubles+',
    rarity: 'uncommon',
  },

  // ── Contact Archetype ──
  {
    id: 'silk_santiago',
    name: 'Silk Santiago',
    pos: 'SS',
    power: 4, contact: 9, speed: 7, bats: 'L',
    innateTraitId: 'contact_lens',
    lineupEffect: { type: 'team_pair_out_reduction', value: 0.05 },
    lineupDescription: 'All batters: pair out chance -5%',
    rarity: 'common',
  },
  {
    id: 'professor_park',
    name: 'Professor Park',
    pos: '2B',
    power: 3, contact: 10, speed: 5, bats: 'R',
    innateTraitId: 'eye_of_the_tiger',
    lineupEffect: { type: 'team_contact_save_boost', value: 0.10 },
    lineupDescription: 'All batters: +10% contact save chance',
    rarity: 'uncommon',
  },
  {
    id: 'doc_daniels',
    name: 'Doc Daniels',
    pos: 'C',
    power: 5, contact: 8, speed: 4, bats: 'R',
    innateTraitId: 'walk_machine',
    lineupEffect: { type: 'team_first_pitch_mult', value: 1.0 },
    lineupDescription: 'All batters: +1.0 mult on first-pitch swings',
    rarity: 'uncommon',
  },

  // ── Speed Archetype ──
  {
    id: 'ghost_runner',
    name: 'Ghost Runner',
    pos: 'CF',
    power: 3, contact: 6, speed: 10, bats: 'L',
    innateTraitId: 'stolen_base',
    lineupEffect: { type: 'team_extra_base_chance', value: 0.05 },
    lineupDescription: 'All batters: +5% extra base chance',
    rarity: 'common',
  },
  {
    id: 'flash_freeman',
    name: 'Flash Freeman',
    pos: 'LF',
    power: 5, contact: 7, speed: 9, bats: 'L',
    innateTraitId: 'leadoff_king',
    lineupEffect: { type: 'team_extra_base_chance', value: 0.08 },
    lineupDescription: 'All batters: +8% extra base chance',
    rarity: 'uncommon',
  },

  // ── Balanced / Utility ──
  {
    id: 'clutch_carter',
    name: 'Clutch Carter',
    pos: '3B',
    power: 7, contact: 7, speed: 6, bats: 'R',
    innateTraitId: 'rally_cap',
    lineupEffect: { type: 'team_add_mult_on_hit', value: 0.5 },
    lineupDescription: 'All batters: +0.5 mult on hits',
    rarity: 'common',
  },
  {
    id: 'iron_mike',
    name: 'Iron Mike',
    pos: '1B',
    power: 8, contact: 6, speed: 3, bats: 'R',
    innateTraitId: 'extra_innings',
    lineupEffect: { type: 'team_late_inning_peanuts', value: 3 },
    lineupDescription: 'All batters: +3 peanuts in innings 7-9',
    rarity: 'uncommon',
  },
  {
    id: 'lucky_luciano',
    name: 'Lucky Luciano',
    pos: 'SS',
    power: 5, contact: 7, speed: 8, bats: 'L',
    innateTraitId: 'bunt_single',
    lineupEffect: { type: 'team_strikeout_peanuts', value: 2 },
    lineupDescription: 'All batters: earn 2 peanuts on strikeouts',
    rarity: 'common',
  },
  {
    id: 'ace_malone',
    name: 'Ace Malone',
    pos: 'CF',
    power: 6, contact: 8, speed: 7, bats: 'R',
    innateTraitId: 'ace_in_the_hole',
    lineupEffect: { type: 'team_runner_mult', value: 0.5 },
    lineupDescription: 'All batters: +0.5 mult per runner on base',
    rarity: 'uncommon',
  },

  // ── Rare Specialists ──
  {
    id: 'big_papa_ortiz',
    name: 'Big Papa Ortiz',
    pos: 'DH',
    power: 10, contact: 5, speed: 2, bats: 'L',
    innateTraitId: 'grand_ambition',
    lineupEffect: { type: 'team_add_mult_on_hit', value: 1.0 },
    lineupDescription: 'All batters: +1.0 mult on hits',
    rarity: 'rare',
  },
  {
    id: 'phantom_phelps',
    name: 'Phantom Phelps',
    pos: 'RF',
    power: 4, contact: 6, speed: 10, bats: 'L',
    innateTraitId: 'double_mcgee',
    lineupEffect: { type: 'team_extra_base_chance', value: 0.12 },
    lineupDescription: 'All batters: +12% extra base chance',
    rarity: 'rare',
  },
  {
    id: 'magnet_martinez',
    name: 'Magnet Martinez',
    pos: '2B',
    power: 6, contact: 9, speed: 6, bats: 'R',
    innateTraitId: 'batting_gloves',
    lineupEffect: { type: 'team_pair_out_reduction', value: 0.08 },
    lineupDescription: 'All batters: pair out chance -8%',
    rarity: 'rare',
  },
];

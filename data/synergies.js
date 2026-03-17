/**
 * Synergy definitions — set bonuses triggered by lineup composition.
 * Always visible in the UI (locked ones show hints to encourage building toward them).
 *
 * Each synergy has:
 *   check(roster) → boolean — whether the synergy is active
 *   bonus — effect applied when active (processed by GameScene alongside staff/lineup effects)
 *
 * Bonus types:
 *   add_mult_all         — +mult on all at-bats                  { value }
 *   add_peanuts_all        — +chips on all at-bats                 { value }
 *   add_mult_on_hr       — +mult on Home Runs                    { value }
 *   add_mult_lefty       — +mult on lefty batter at-bats         { value }
 *   team_pair_out_reduction — reduce pair out chance              { value }
 *   team_extra_base_chance  — +extra base chance                  { value }
 *   add_peanuts_on_xbh     — +chips on doubles, triples, HRs       { value }
 *   pitcher_control_reduction — opponent pitcher -control         { value }
 *   pitcher_hit_reduction — reduce opponent hit chance            { value }
 *   bonus_player_stat_boost — bonus players +stats               { value }
 */
export default [
  // ── Handedness Combos ──
  {
    id: 'switch_squad',
    name: 'Switch Squad',
    description: '3+ lefty batters in lineup',
    hint: '3 lefty batters...',
    check: (roster) => roster.filter(b => b.bats === 'L').length >= 3,
    bonus: { type: 'add_mult_lefty', value: 1 },
    bonusDescription: '+1 mult on lefty at-bats',
  },
  {
    id: 'balanced_lineup',
    name: 'Balanced Lineup',
    description: '4 lefty + 4 righty batters (+ 1 either)',
    hint: '4L + 4R batters...',
    check: (roster) => {
      const l = roster.filter(b => b.bats === 'L').length;
      const r = roster.filter(b => b.bats === 'R').length;
      return l >= 4 && r >= 4;
    },
    bonus: { type: 'add_peanuts_all', value: 2 },
    bonusDescription: '+2 peanuts on all at-bats',
  },
  {
    id: 'southpaw_stack',
    name: 'Southpaw Stack',
    description: '5+ lefty batters in lineup',
    hint: '5 lefty batters...',
    check: (roster) => roster.filter(b => b.bats === 'L').length >= 5,
    bonus: { type: 'pitcher_control_reduction', value: 1 },
    bonusDescription: 'Opponent pitcher -1 control',
  },

  // ── Stat Threshold Combos ──
  {
    id: 'murderers_row',
    name: "Murderer's Row",
    description: '3 batters with 8+ power',
    hint: '3 power hitters...',
    check: (roster) => roster.filter(b => b.power >= 8).length >= 3,
    bonus: { type: 'add_mult_on_hr', value: 2 },
    bonusDescription: '+2 mult on Home Runs',
  },
  {
    id: 'contact_factory',
    name: 'Contact Factory',
    description: '3 batters with 8+ contact',
    hint: '3 contact hitters...',
    check: (roster) => roster.filter(b => b.contact >= 8).length >= 3,
    bonus: { type: 'team_pair_out_reduction', value: 0.10 },
    bonusDescription: 'Pair out chance -10% team-wide',
  },
  {
    id: 'speed_demons',
    name: 'Speed Demons',
    description: '3 batters with 8+ speed',
    hint: '3 speedsters...',
    check: (roster) => roster.filter(b => b.speed >= 8).length >= 3,
    bonus: { type: 'team_extra_base_chance', value: 0.10 },
    bonusDescription: 'Extra base chance +10% team-wide',
  },
  {
    id: 'well_rounded',
    name: 'Well-Rounded',
    description: 'All 9 batters have no stat below 5',
    hint: 'No weak links...',
    check: (roster) => roster.length >= 9 && roster.every(b => b.power >= 5 && b.contact >= 5 && b.speed >= 5),
    bonus: { type: 'add_mult_all', value: 0.5 },
    bonusDescription: '+0.5 mult on all at-bats',
  },

  // ── Positional Combos ──
  {
    id: 'strong_middle',
    name: 'Strong Up the Middle',
    description: 'C, SS, 2B, CF all have 7+ contact',
    hint: 'Up-the-middle contact...',
    check: (roster) => {
      const positions = ['C', 'SS', '2B', 'CF'];
      return positions.every(pos => {
        const player = roster.find(b => b.pos === pos);
        return player && player.contact >= 7;
      });
    },
    bonus: { type: 'pitcher_hit_reduction', value: 0.05 },
    bonusDescription: '-5% opponent hit chance',
  },
  {
    id: 'corner_power',
    name: 'Corner Power',
    description: '1B and 3B both have 8+ power',
    hint: 'Corner infield power...',
    check: (roster) => {
      const first = roster.find(b => b.pos === '1B');
      const third = roster.find(b => b.pos === '3B');
      return first && first.power >= 8 && third && third.power >= 8;
    },
    bonus: { type: 'add_peanuts_on_xbh', value: 3 },
    bonusDescription: '+3 peanuts on triples+',
  },

  // ── Bonus Player Combos ──
  {
    id: 'hired_guns',
    name: 'Hired Guns',
    description: '2+ bonus players in lineup',
    hint: '2 bonus players...',
    check: (roster) => roster.filter(b => b.isBonus).length >= 2,
    bonus: { type: 'bonus_player_stat_boost', value: 1 },
    bonusDescription: 'Bonus players +1 to all stats',
  },
  {
    id: 'mercenary_squad',
    name: 'Mercenary Squad',
    description: '3 bonus players (max) in lineup',
    hint: 'Full mercenary roster...',
    check: (roster) => roster.filter(b => b.isBonus).length >= 3,
    bonus: { type: 'add_mult_all', value: 1.0 },
    bonusDescription: '+1.0 mult on all at-bats',
  },

  // ── Specialist Combos ──
  {
    id: 'small_ball',
    name: 'Small Ball',
    description: '5+ batters with 7+ contact and 6+ speed',
    hint: 'Many contact-speed players...',
    check: (roster) => roster.filter(b => b.contact >= 7 && b.speed >= 6).length >= 5,
    bonus: { type: 'add_peanuts_all', value: 1 },
    bonusDescription: '+1 peanut on all at-bats',
  },
];

class_name Synergies
extends RefCounted

# Synergy definitions — set bonuses triggered by lineup composition.
# Always visible in the UI (locked ones show hints to encourage building toward them).

static var DATA: Array[Dictionary] = [
	# Handedness Combos
	{
		"id": "switch_squad",
		"name": "Switch Squad",
		"description": "3+ lefty batters in lineup",
		"hint": "3 lefty batters...",
		"bonus": {"type": "add_mult_lefty", "value": 1},
		"bonus_description": "+1 mult on lefty at-bats",
	},
	{
		"id": "balanced_lineup",
		"name": "Balanced Lineup",
		"description": "4 lefty + 4 righty batters (+ 1 either)",
		"hint": "4L + 4R batters...",
		"bonus": {"type": "add_peanuts_all", "value": 2},
		"bonus_description": "+2 peanuts on all at-bats",
	},
	{
		"id": "southpaw_stack",
		"name": "Southpaw Stack",
		"description": "5+ lefty batters in lineup",
		"hint": "5 lefty batters...",
		"bonus": {"type": "pitcher_control_reduction", "value": 1},
		"bonus_description": "Opponent pitcher -1 control",
	},

	# Stat Threshold Combos
	{
		"id": "murderers_row",
		"name": "Murderer's Row",
		"description": "3 batters with 8+ power",
		"hint": "3 power hitters...",
		"bonus": {"type": "add_mult_on_hr", "value": 2},
		"bonus_description": "+2 mult on Home Runs",
	},
	{
		"id": "contact_factory",
		"name": "Contact Factory",
		"description": "3 batters with 8+ contact",
		"hint": "3 contact hitters...",
		"bonus": {"type": "team_pair_out_reduction", "value": 0.10},
		"bonus_description": "Pair out chance -10% team-wide",
	},
	{
		"id": "speed_demons",
		"name": "Speed Demons",
		"description": "3 batters with 8+ speed",
		"hint": "3 speedsters...",
		"bonus": {"type": "team_extra_base_chance", "value": 0.10},
		"bonus_description": "Extra base chance +10% team-wide",
	},
	{
		"id": "well_rounded",
		"name": "Well-Rounded",
		"description": "All 9 batters have no stat below 5",
		"hint": "No weak links...",
		"bonus": {"type": "add_mult_all", "value": 0.5},
		"bonus_description": "+0.5 mult on all at-bats",
	},

	# Positional Combos
	{
		"id": "strong_middle",
		"name": "Strong Up the Middle",
		"description": "C, SS, 2B, CF all have 7+ contact",
		"hint": "Up-the-middle contact...",
		"bonus": {"type": "pitcher_hit_reduction", "value": 0.05},
		"bonus_description": "-5% opponent hit chance",
	},
	{
		"id": "corner_power",
		"name": "Corner Power",
		"description": "1B and 3B both have 8+ power",
		"hint": "Corner infield power...",
		"bonus": {"type": "add_peanuts_on_xbh", "value": 3},
		"bonus_description": "+3 peanuts on triples+",
	},

	# Bonus Player Combos
	{
		"id": "hired_guns",
		"name": "Hired Guns",
		"description": "2+ bonus players in lineup",
		"hint": "2 bonus players...",
		"bonus": {"type": "bonus_player_stat_boost", "value": 1},
		"bonus_description": "Bonus players +1 to all stats",
	},
	{
		"id": "mercenary_squad",
		"name": "Mercenary Squad",
		"description": "3 bonus players (max) in lineup",
		"hint": "Full mercenary roster...",
		"bonus": {"type": "add_mult_all", "value": 1.0},
		"bonus_description": "+1.0 mult on all at-bats",
	},

	# Specialist Combos
	{
		"id": "small_ball",
		"name": "Small Ball",
		"description": "5+ batters with 7+ contact and 6+ speed",
		"hint": "Many contact-speed players...",
		"bonus": {"type": "add_peanuts_all", "value": 1},
		"bonus_description": "+1 peanut on all at-bats",
	},
]


static func check_synergy(synergy: Dictionary, roster: Array) -> bool:
	match synergy["id"]:
		"switch_squad":
			return roster.filter(func(b): return b.get("bats") == "L").size() >= 3
		"balanced_lineup":
			var l := roster.filter(func(b): return b.get("bats") == "L").size()
			var r := roster.filter(func(b): return b.get("bats") == "R").size()
			return l >= 4 and r >= 4
		"southpaw_stack":
			return roster.filter(func(b): return b.get("bats") == "L").size() >= 5
		"murderers_row":
			return roster.filter(func(b): return b.get("power", 0) >= 8).size() >= 3
		"contact_factory":
			return roster.filter(func(b): return b.get("contact", 0) >= 8).size() >= 3
		"speed_demons":
			return roster.filter(func(b): return b.get("speed", 0) >= 8).size() >= 3
		"well_rounded":
			if roster.size() < 9:
				return false
			return roster.all(func(b): return b.get("power", 0) >= 5 and b.get("contact", 0) >= 5 and b.get("speed", 0) >= 5)
		"strong_middle":
			var positions := ["C", "SS", "2B", "CF"]
			for pos in positions:
				var player = null
				for b in roster:
					if b.get("pos") == pos:
						player = b
						break
				if not player or player.get("contact", 0) < 7:
					return false
			return true
		"corner_power":
			var first = null
			var third = null
			for b in roster:
				if b.get("pos") == "1B":
					first = b
				if b.get("pos") == "3B":
					third = b
			return first != null and first.get("power", 0) >= 8 and third != null and third.get("power", 0) >= 8
		"hired_guns":
			return roster.filter(func(b): return b.get("is_bonus", false)).size() >= 2
		"mercenary_squad":
			return roster.filter(func(b): return b.get("is_bonus", false)).size() >= 3
		"small_ball":
			return roster.filter(func(b): return b.get("contact", 0) >= 7 and b.get("speed", 0) >= 6).size() >= 5
	return false

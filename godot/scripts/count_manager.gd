class_name CountManager
extends RefCounted

## Count-based discard system.
## Each discard = a pitch. Outcome depends on batter/pitcher stats.

const COUNT_MODIFIERS: Dictionary = {
	"3-0": {"peanuts_mod": 2, "mult_mod": 1.0},
	"2-0": {"peanuts_mod": 1, "mult_mod": 0.5},
	"3-1": {"peanuts_mod": 1, "mult_mod": 0.5},
	"3-2": {"peanuts_mod": 0, "mult_mod": 0.5},
	"0-1": {"peanuts_mod": 0, "mult_mod": -0.2},
	"1-2": {"peanuts_mod": 0, "mult_mod": -0.3},
	"0-2": {"peanuts_mod": -1, "mult_mod": -0.5},
}

var balls: int = 0
var strikes: int = 0
var foul_count: int = 0


func reset() -> void:
	balls = 0
	strikes = 0
	foul_count = 0


func record_discard(pitcher_velocity: int, pitcher_control: int, batter_contact: int) -> Dictionary:
	var result: Dictionary = {
		"is_strike": false, "is_ball": false, "is_foul": false,
		"is_strikeout": false, "is_walk": false,
	}

	var base_strike_chance: float = 0.40 \
		+ (pitcher_velocity - 5) * 0.02 \
		+ (pitcher_control - 5) * 0.02 \
		- (batter_contact - 5) * 0.03
	base_strike_chance = clampf(base_strike_chance, 0.15, 0.65)

	if strikes < 2:
		if randf() < base_strike_chance:
			strikes += 1
			result["is_strike"] = true
		else:
			balls += 1
			result["is_ball"] = true
			if balls >= 4:
				result["is_walk"] = true
	else:
		var foul_chance: float = batter_contact * 0.04
		var remaining: float = 1.0 - foul_chance
		var strike_chance: float = remaining * base_strike_chance
		var roll: float = randf()

		if roll < foul_chance:
			foul_count += 1
			result["is_foul"] = true
		elif roll < foul_chance + strike_chance:
			strikes += 1
			result["is_strike"] = true
			result["is_strikeout"] = true
		else:
			balls += 1
			result["is_ball"] = true
			if balls >= 4:
				result["is_walk"] = true

	return result


func get_count() -> Dictionary:
	return {"balls": balls, "strikes": strikes}


func get_count_modifiers() -> Dictionary:
	var key: String = "%d-%d" % [balls, strikes]
	return COUNT_MODIFIERS.get(key, {"peanuts_mod": 0, "mult_mod": 0})


func is_walk() -> bool:
	return balls >= 4


func is_strikeout() -> bool:
	return strikes >= 3


func set_starting_balls(start_balls: int) -> void:
	balls = mini(3, start_balls)

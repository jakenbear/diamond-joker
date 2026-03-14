class_name SituationalEngine
extends RefCounted

# Post-evaluation outcome transformations.
# Checks for Double Play, Fielder's Choice, Error, and Dropped Third Strike.
# Also provides Wild Pitch and HBP checks.


static func check(outcome: String, game_state: Dictionary, batter_speed: int, error_mult: float = 1.0) -> Dictionary:
	# Error check on all outs
	if outcome == "Groundout" or outcome == "Flyout":
		var error_result: Dictionary = _check_error(outcome, game_state, error_mult)
		if not error_result.is_empty():
			return error_result

	var bases: Array = game_state.get("bases", [null, null, null])
	var outs_val: int = game_state.get("outs", 0)

	# DP and FC only on groundouts with runner on 1st
	if outcome == "Groundout" and bases[0] and outs_val < 2:
		var dp_result: Dictionary = _check_double_play(game_state, batter_speed)
		if not dp_result.is_empty():
			return dp_result

	if outcome == "Groundout" and bases[0]:
		var fc_result: Dictionary = _check_fielders_choice(game_state)
		if not fc_result.is_empty():
			return fc_result

	# Dropped Third Strike: strikeout + 1st base empty
	if outcome == "Strikeout" and not bases[0]:
		var d3k_result: Dictionary = _check_dropped_third_strike(batter_speed)
		if not d3k_result.is_empty():
			return d3k_result

	return {"outcome": outcome, "transformed": false, "type": "", "description": ""}


static func check_wild_pitch(pitcher_control: int, bases: Array) -> Dictionary:
	var has_runner: bool = false
	for b in bases:
		if b:
			has_runner = true
			break
	if not has_runner:
		return {"triggered": false, "description": ""}

	var chance: float = maxf(0.0, (6 - pitcher_control) * 0.02)
	if chance > 0.0 and randf() < chance:
		return {"triggered": true, "description": "Wild pitch! Runner advances!"}
	return {"triggered": false, "description": ""}


static func check_hbp(pitcher_control: int) -> Dictionary:
	var chance: float = maxf(0.0, (5 - pitcher_control) * 0.015)
	if chance > 0.0 and randf() < chance:
		return {"triggered": true, "description": "Hit by pitch! Batter takes first base!"}
	return {"triggered": false, "description": ""}


static func _check_dropped_third_strike(batter_speed: int) -> Dictionary:
	var chance: float = 0.05 + batter_speed * 0.01
	if randf() < chance:
		return {
			"outcome": "Dropped Third Strike",
			"transformed": true,
			"type": "dropped_third_strike",
			"description": "Dropped third strike! Batter races to first!",
		}
	return {}


static func _check_double_play(game_state: Dictionary, batter_speed: int) -> Dictionary:
	var dp_chance: float = maxf(0.05, 0.35 - batter_speed * 0.03)
	if randf() < dp_chance:
		return {
			"outcome": "Double Play",
			"transformed": true,
			"type": "double_play",
			"description": "Ground ball to short - double play! (%d%% chance)" % roundi(dp_chance * 100),
		}
	return {}


static func _check_fielders_choice(_game_state: Dictionary) -> Dictionary:
	if randf() < 0.40:
		return {
			"outcome": "Fielder's Choice",
			"transformed": true,
			"type": "fielders_choice",
			"description": "Fielder's choice - lead runner thrown out!",
		}
	return {}


static func _check_error(outcome: String, game_state: Dictionary, error_mult: float = 1.0) -> Dictionary:
	var base_chance: float = 0.04
	var late_inning_bonus: float = maxf(0.0, (game_state.get("inning", 1) - 6) * 0.01)
	var error_chance: float = (base_chance + late_inning_bonus) * error_mult
	if randf() < error_chance:
		return {
			"outcome": "Error",
			"transformed": true,
			"type": "error",
			"description": "Error on the %s! Batter reaches first!" % outcome.to_lower(),
		}
	return {}

class_name BaseballState
extends RefCounted

# Baseball game state machine.
# States: BATTING -> RESOLVE -> BATTING | SWITCH_SIDE | GAME_OVER

enum State { BATTING, RESOLVE, SWITCH_SIDE, GAME_OVER }

const OUTCOME_EFFECTS: Dictionary = {
	"Strikeout":          {"bases_to_move": 0, "is_out": true},
	"Groundout":          {"bases_to_move": 0, "is_out": true},
	"Flyout":             {"bases_to_move": 0, "is_out": true},
	"Single":             {"bases_to_move": 1, "is_out": false},
	"Double":             {"bases_to_move": 2, "is_out": false},
	"Triple":             {"bases_to_move": 3, "is_out": false},
	"Home Run":           {"bases_to_move": 4, "is_out": false},
	"Grand Slam":         {"bases_to_move": 4, "is_out": false},
	"RBI Double":         {"bases_to_move": 2, "is_out": false},
	"Inside-the-Park HR": {"bases_to_move": 4, "is_out": false},
	"Walk-Off":           {"bases_to_move": 4, "is_out": false},
	"Perfect Game":       {"bases_to_move": 4, "is_out": false},
	"Walk":               {"bases_to_move": 1, "is_out": false},
	"Double Play":        {"bases_to_move": 0, "is_out": true, "outs_recorded": 2},
	"Fielder's Choice":   {"bases_to_move": 0, "is_out": true, "fielders_choice": true},
	"Error":              {"bases_to_move": 1, "is_out": false},
	"Dropped Third Strike": {"bases_to_move": 1, "is_out": false},
	"HBP":                {"bases_to_move": 1, "is_out": false},
	"Sac Bunt":           {"bases_to_move": 0, "is_out": true, "sac_bunt": true},
}

var inning: int = 1
var half: String = "top"  # "top" = player bats, "bottom" = opponent bats
var outs: int = 0
var bases: Array = [null, null, null]  # [1st, 2nd, 3rd] - null or batter dict
var player_score: int = 0
var opponent_score: int = 0
var state: int = State.BATTING
var last_result: Dictionary = {}
var total_chips: int = 0
var shop_visited: Dictionary = {}  # inning -> true
var player_runs_by_inning: Array[int] = []
var opponent_runs_by_inning: Array[int] = []
var _current_inning_player_runs: int = 0
var _at_bats_this_inning: int = 0


func reset() -> void:
	inning = 1
	half = "top"
	outs = 0
	bases = [null, null, null]
	player_score = 0
	opponent_score = 0
	state = State.BATTING
	last_result = {}
	total_chips = 0
	shop_visited = {}
	player_runs_by_inning = []
	opponent_runs_by_inning = []
	_current_inning_player_runs = 0
	_at_bats_this_inning = 0


func get_total_chips() -> int:
	return total_chips


func spend_chips(amount: int) -> bool:
	if total_chips < amount:
		return false
	total_chips -= amount
	return true


func should_show_shop() -> bool:
	if inning > 9:
		return false
	if shop_visited.has(inning):
		return false
	return true


func get_shop_buy_limit() -> int:
	if inning <= 3:
		return 1
	if inning <= 6:
		return 2
	return 3


func mark_shop_visited() -> void:
	shop_visited[inning] = true


func resolve_outcome(outcome: String, hand_score: int = 0, batter = null) -> Dictionary:
	var effect: Dictionary = OUTCOME_EFFECTS.get(outcome, {})
	if effect.is_empty():
		return {"runs_scored": 0, "description": "Unknown outcome", "state": state}

	_at_bats_this_inning += 1
	total_chips += int(hand_score)

	var runs_scored: int = 0
	var description: String = outcome

	if effect.get("is_out", false):
		# Double Play
		if effect.get("outs_recorded", 0) == 2:
			outs += 2
			bases[0] = null
			description = "Double Play! Outs: %d" % outs
		# Sac Bunt
		elif effect.get("sac_bunt", false):
			var sac_runs := advance_all_runners()
			runs_scored += sac_runs
			outs += 1
			if sac_runs > 0:
				description = "Sac Bunt - Out %d, %d run%s scored!" % [outs, sac_runs, "s" if sac_runs > 1 else ""]
			else:
				description = "Sac Bunt - Out %d, runners advance" % outs
		# Fielder's Choice
		elif effect.get("fielders_choice", false):
			outs += 1
			for i in range(2, -1, -1):
				if bases[i]:
					bases[i] = null
					break
			bases[0] = batter if batter else true
			description = "Fielder's Choice - Out %d" % outs
		else:
			outs += 1
			description = "%s - Out %d" % [outcome, outs]

		if outs >= 3:
			bases = [null, null, null]
			outs = 0
			state = State.SWITCH_SIDE
			description += " - Side retired!"
		else:
			state = State.BATTING
	else:
		runs_scored = _advance_runners(effect.get("bases_to_move", 0), batter)

		if half == "top":
			player_score += runs_scored
			_current_inning_player_runs += runs_scored
		else:
			opponent_score += runs_scored

		description = "%s!" % outcome
		if runs_scored > 0:
			description += " %d run%s scored!" % [runs_scored, "s" if runs_scored > 1 else ""]

		if _check_walk_off():
			state = State.GAME_OVER
			description += " WALK-OFF WIN!"
		else:
			state = State.BATTING

	last_result = {"runs_scored": runs_scored, "description": description, "state": state, "outcome": outcome}
	return last_result


func process_sacrifice_fly() -> int:
	if not bases[2]:
		return 0
	bases[2] = null
	player_score += 1
	_current_inning_player_runs += 1
	return 1


func process_stolen_base() -> void:
	if not bases[0]:
		return
	var runner = bases[0]
	bases[0] = null
	if not bases[1]:
		bases[1] = runner
	elif not bases[2]:
		bases[2] = runner


func advance_all_runners() -> int:
	var runs: int = 0
	for i in range(2, -1, -1):
		if not bases[i]:
			continue
		var runner = bases[i]
		bases[i] = null
		if i + 1 >= 3:
			runs += 1
			player_score += 1
			_current_inning_player_runs += 1
		else:
			bases[i + 1] = runner
	return runs


func _advance_runners(bases_to_move: int, batter = null) -> int:
	var runs: int = 0

	if bases_to_move >= 4:
		# Home run: all runners + batter score
		for b in bases:
			if b:
				runs += 1
		runs += 1  # batter
		bases = [null, null, null]
		return runs

	# Advance existing runners from 3rd base backward
	for i in range(2, -1, -1):
		if not bases[i]:
			continue
		var runner = bases[i]
		var new_pos: int = i + bases_to_move
		bases[i] = null
		if new_pos >= 3:
			runs += 1
		else:
			bases[new_pos] = runner

	# Place batter on base
	if bases_to_move >= 1 and bases_to_move <= 3:
		bases[bases_to_move - 1] = batter if batter else true

	return runs


func try_extra_base(chance: float) -> Dictionary:
	if randf() < chance:
		for i in range(2, -1, -1):
			if bases[i]:
				var runner = bases[i]
				bases[i] = null
				if i + 1 >= 3:
					player_score += 1
					_current_inning_player_runs += 1
					return {"scored": 1, "advanced": true}
				else:
					bases[i + 1] = runner
				return {"scored": 0, "advanced": true}
	return {"scored": 0, "advanced": false}


func switch_side(sim_runs = null) -> Dictionary:
	if half == "top":
		half = "bottom"
		player_runs_by_inning.append(_current_inning_player_runs)
		_current_inning_player_runs = 0

		var opp_runs: int
		if sim_runs != null:
			opp_runs = sim_runs
		else:
			opp_runs = _generate_opponent_runs()
		opponent_score += opp_runs
		opponent_runs_by_inning.append(opp_runs)

		half = "top"
		inning += 1
		_at_bats_this_inning = 0

		if inning > 9 and player_score != opponent_score:
			state = State.GAME_OVER
		else:
			state = State.BATTING

		return {
			"opponent_runs": opp_runs,
			"description": "Opponent scores %d run%s this inning." % [opp_runs, "s" if opp_runs != 1 else ""],
			"state": state,
		}

	half = "top"
	inning += 1
	state = State.BATTING
	return {"opponent_runs": 0, "description": "Next inning", "state": state}


func _generate_opponent_runs() -> int:
	var base_chance: float = 0.3 + (inning - 1) * 0.05
	var max_runs: int = mini(inning, 5)
	var runs: int = 0
	for i in 3:
		if randf() < base_chance:
			runs += randi_range(1, ceili(max_runs / 2.0))
	return mini(runs, max_runs)


func _check_walk_off() -> bool:
	return inning >= 9 and half == "top" and player_score > opponent_score


func get_status() -> Dictionary:
	return {
		"inning": inning,
		"half": half,
		"outs": outs,
		"bases": bases.duplicate(),
		"player_score": player_score,
		"opponent_score": opponent_score,
		"state": state,
		"total_chips": total_chips,
		"player_runs_by_inning": player_runs_by_inning.duplicate(),
		"opponent_runs_by_inning": opponent_runs_by_inning.duplicate(),
		"current_inning_player_runs": _current_inning_player_runs,
		"at_bats_this_inning": _at_bats_this_inning,
	}


func is_game_over() -> bool:
	return state == State.GAME_OVER


func get_result() -> Dictionary:
	if not is_game_over():
		return {}
	return {
		"player_score": player_score,
		"opponent_score": opponent_score,
		"won": player_score > opponent_score,
		"innings": inning,
		"total_chips": total_chips,
		"player_runs_by_inning": player_runs_by_inning.duplicate(),
		"opponent_runs_by_inning": opponent_runs_by_inning.duplicate(),
	}

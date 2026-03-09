class_name EffectEngine
extends RefCounted

# Interprets trait effect descriptors from data files.
# Handles both pre-eval (card transforms) and post-eval (result transforms).


# --- Condition Evaluators ---

static func check_condition(cond: Dictionary, eval_result: Dictionary, game_state: Dictionary) -> bool:
	if cond.is_empty():
		return true

	match cond.get("type", ""):
		"always":
			return true
		"outs_eq":
			return game_state.get("outs", 0) == cond["value"]
		"outs_neq":
			return game_state.get("outs", 0) != cond["value"]
		"inning_range":
			var inn: int = game_state.get("inning", 1)
			return inn >= cond["min"] and inn <= cond["max"]
		"runner_on":
			var bases: Array = game_state.get("bases", [null, null, null])
			return bases[cond["base"]] != null and bases[cond["base"]] != false
		"bases_loaded":
			var bases: Array = game_state.get("bases", [null, null, null])
			return bases[0] and bases[1] and bases[2]
		"outcome_is":
			return eval_result.get("outcome", "") == cond["value"]
		"hand_is":
			return eval_result.get("hand_name", "") == cond["value"]
		"hand_in":
			return cond.get("values", []).has(eval_result.get("hand_name", ""))
		"chips_lte":
			return eval_result.get("chips", 0) <= cond["value"]
		"chips_gte":
			return eval_result.get("chips", 0) >= cond["value"]
		"losing_by":
			return game_state.get("opponent_score", 0) - game_state.get("player_score", 0) >= cond["value"]
		"first_batter_of_inning":
			return game_state.get("at_bats_this_inning", 0) == 0
		"and":
			for c in cond.get("conditions", []):
				if not check_condition(c, eval_result, game_state):
					return false
			return true
		"or":
			for c in cond.get("conditions", []):
				if check_condition(c, eval_result, game_state):
					return true
			return false
		_:
			return false


# --- Pre-Eval Effect Handlers (card transforms) ---

static func apply_pre(cards: Array[Dictionary], effect: Dictionary) -> Array[Dictionary]:
	match effect.get("type", ""):
		"adjacent_to_pair":
			return _pre_adjacent_to_pair(cards)
		"ace_wild_straight":
			return _pre_ace_wild_straight(cards)
		"color_is_suit":
			return _pre_color_is_suit(cards)
		"upgrade_lowest":
			return _pre_upgrade_lowest(cards, effect)
		"downgrade_highest":
			return _pre_downgrade_highest(cards, effect)
		"downgrade_face_cards":
			return _pre_downgrade_face_cards(cards, effect)
		"swap_random":
			return _pre_swap_random(cards, effect)
		_:
			return cards


static func _pre_adjacent_to_pair(cards: Array[Dictionary]) -> Array[Dictionary]:
	var sorted_cards := cards.duplicate(true)
	sorted_cards.sort_custom(func(a, b): return a["rank"] < b["rank"])
	for i in range(sorted_cards.size() - 1):
		if sorted_cards[i + 1]["rank"] - sorted_cards[i]["rank"] == 1:
			var target_id: String = sorted_cards[i]["id"]
			var new_rank: int = sorted_cards[i + 1]["rank"]
			var result: Array[Dictionary] = []
			for c in cards:
				if c["id"] == target_id:
					var nc: Dictionary = c.duplicate()
					nc["rank"] = new_rank
					result.append(nc)
				else:
					result.append(c)
			return result
	return cards


static func _pre_ace_wild_straight(cards: Array[Dictionary]) -> Array[Dictionary]:
	var has_ace: bool = cards.any(func(c): return c["rank"] == 14)
	if not has_ace:
		return cards

	var non_ace: Array[int] = []
	for c in cards:
		if c["rank"] != 14:
			non_ace.append(c["rank"])
	non_ace.sort()
	if non_ace.size() < 4:
		return cards

	for i in range(non_ace.size() - 1):
		var gap: int = non_ace[i] + 1
		var test: Array[int] = non_ace.duplicate()
		test.append(gap)
		test.sort()
		var is_seq: bool = true
		for j in range(1, test.size()):
			if test[j] != test[j - 1] + 1:
				is_seq = false
				break
		if is_seq:
			var result: Array[Dictionary] = []
			for c in cards:
				if c["rank"] == 14:
					var nc: Dictionary = c.duplicate()
					nc["rank"] = gap
					result.append(nc)
				else:
					result.append(c)
			return result
	return cards


static func _pre_color_is_suit(cards: Array[Dictionary]) -> Array[Dictionary]:
	var red_suits := ["H", "D"]
	var black_suits := ["C", "S"]
	var red_count: int = 0
	var black_count: int = 0
	for c in cards:
		if c["suit"] in red_suits:
			red_count += 1
		if c["suit"] in black_suits:
			black_count += 1

	if red_count >= 4 or black_count >= 4:
		var target_suit: String = "H" if red_count >= black_count else "C"
		var match_colors: Array = red_suits if red_count >= black_count else black_suits
		var result: Array[Dictionary] = []
		for c in cards:
			if c["suit"] in match_colors:
				result.append(c)
			else:
				var nc: Dictionary = c.duplicate()
				nc["suit"] = target_suit
				result.append(nc)
		return result
	return cards


static func _pre_upgrade_lowest(cards: Array[Dictionary], effect: Dictionary) -> Array[Dictionary]:
	if randf() > effect.get("chance", 0.2):
		return cards
	var min_idx: int = 0
	for i in range(1, cards.size()):
		if cards[i]["rank"] < cards[min_idx]["rank"]:
			min_idx = i
	var result: Array[Dictionary] = []
	for i in cards.size():
		if i == min_idx:
			var nc: Dictionary = cards[i].duplicate()
			nc["rank"] = mini(14, cards[i]["rank"] + effect.get("amount", 3))
			result.append(nc)
		else:
			result.append(cards[i])
	return result


static func _pre_downgrade_highest(cards: Array[Dictionary], effect: Dictionary) -> Array[Dictionary]:
	if randf() > effect.get("chance", 0.3):
		return cards
	var max_idx: int = 0
	for i in range(1, cards.size()):
		if cards[i]["rank"] > cards[max_idx]["rank"]:
			max_idx = i
	var result: Array[Dictionary] = []
	for i in cards.size():
		if i == max_idx:
			var nc: Dictionary = cards[i].duplicate()
			nc["rank"] = maxi(2, cards[i]["rank"] - effect.get("amount", 3))
			result.append(nc)
		else:
			result.append(cards[i])
	return result


static func _pre_downgrade_face_cards(cards: Array[Dictionary], effect: Dictionary) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for c in cards:
		if c["rank"] >= 11 and c["rank"] <= 13:
			var nc: Dictionary = c.duplicate()
			nc["rank"] = maxi(2, c["rank"] - effect.get("amount", 2))
			result.append(nc)
		else:
			result.append(c)
	return result


static func _pre_swap_random(cards: Array[Dictionary], effect: Dictionary) -> Array[Dictionary]:
	if randf() > effect.get("chance", 0.25):
		return cards
	if cards.size() < 2:
		return cards
	var i: int = randi_range(0, cards.size() - 1)
	var j: int = randi_range(0, cards.size() - 2)
	if j >= i:
		j += 1
	var result: Array[Dictionary] = cards.duplicate(true)
	var tmp: int = result[i]["rank"]
	result[i]["rank"] = result[j]["rank"]
	result[j]["rank"] = tmp
	return result


# --- Post-Eval Effect Handlers (result transforms) ---

static func apply_post(result: Dictionary, effect: Dictionary, game_state: Dictionary) -> Dictionary:
	match effect.get("type", ""):
		"add_mult":
			return _post_add_mult(result, effect, game_state)
		"add_chips":
			return _post_add_chips(result, effect, game_state)
		"per_runner_chips":
			return _post_per_runner_chips(result, effect, game_state)
		"upgrade_outcome":
			return _post_upgrade_outcome(result, effect, game_state)
		"prevent_outcome":
			return _post_prevent_outcome(result, effect, game_state)
		"set_flag":
			return _post_set_flag(result, effect, game_state)
		"force_groundout":
			return _post_force_groundout(result, effect, game_state)
		"convert_high_card":
			return _post_convert_high_card(result, effect, game_state)
		"add_discard":
			return _post_add_discard(result, effect, game_state)
		"compound":
			return _post_compound(result, effect, game_state)
		_:
			return result


static func _post_add_mult(result: Dictionary, effect: Dictionary, game_state: Dictionary) -> Dictionary:
	if not check_condition(effect.get("condition", {}), result, game_state):
		return result
	var r: Dictionary = result.duplicate()
	r["mult"] = snappedf(maxf(1.0, r.get("mult", 1.0) + effect.get("value", 0)), 0.1)
	return r


static func _post_add_chips(result: Dictionary, effect: Dictionary, game_state: Dictionary) -> Dictionary:
	if not check_condition(effect.get("condition", {}), result, game_state):
		return result
	var r: Dictionary = result.duplicate()
	r["chips"] = maxi(0, r.get("chips", 0) + effect.get("value", 0))
	return r


static func _post_per_runner_chips(result: Dictionary, effect: Dictionary, game_state: Dictionary) -> Dictionary:
	var bases: Array = game_state.get("bases", [null, null, null])
	var runners: int = 0
	for b in bases:
		if b:
			runners += 1
	if runners == 0:
		return result
	var r: Dictionary = result.duplicate()
	r["chips"] = r.get("chips", 0) + runners * effect.get("value", 0)
	return r


static func _post_upgrade_outcome(result: Dictionary, effect: Dictionary, game_state: Dictionary) -> Dictionary:
	if result.get("outcome", "") != effect.get("from", ""):
		return result
	if not check_condition(effect.get("condition", {}), result, game_state):
		return result
	var r: Dictionary = result.duplicate()
	r["outcome"] = effect.get("to", result["outcome"])
	r["hand_name"] = effect.get("new_hand_name", result.get("hand_name", ""))
	r["chips"] = r.get("chips", 0) + effect.get("add_chips", 0)
	r["mult"] = r.get("mult", 1.0) + effect.get("add_mult", 0.0)
	return r


static func _post_prevent_outcome(result: Dictionary, effect: Dictionary, game_state: Dictionary) -> Dictionary:
	if result.get("outcome", "") != effect.get("from", ""):
		return result
	if not check_condition(effect.get("condition", {}), result, game_state):
		return result
	var r: Dictionary = result.duplicate()
	r["outcome"] = effect.get("to_outcome", result["outcome"])
	r["hand_name"] = effect.get("to_hand", result.get("hand_name", ""))
	if effect.has("chips"):
		r["chips"] = effect["chips"]
	if effect.has("mult"):
		r["mult"] = effect["mult"]
	return r


static func _post_set_flag(result: Dictionary, effect: Dictionary, game_state: Dictionary) -> Dictionary:
	if not check_condition(effect.get("condition", {}), result, game_state):
		return result
	var r: Dictionary = result.duplicate()
	r[effect.get("flag", "")] = true
	return r


static func _post_force_groundout(result: Dictionary, effect: Dictionary, game_state: Dictionary) -> Dictionary:
	if not check_condition(effect.get("condition", {}), result, game_state):
		return result
	var r: Dictionary = result.duplicate()
	r["outcome"] = "Groundout"
	r["hand_name"] = effect.get("new_hand_name", "Groundout")
	r["chips"] = 0
	r["mult"] = 1.0
	r["was_groundout"] = true
	return r


static func _post_convert_high_card(result: Dictionary, effect: Dictionary, game_state: Dictionary) -> Dictionary:
	if result.get("hand_name", "") != "High Card":
		return result
	if not check_condition(effect.get("condition", {}), result, game_state):
		return result
	var r: Dictionary = result.duplicate()
	r["outcome"] = "Single"
	r["hand_name"] = effect.get("new_hand_name", "Bunt Single")
	r["chips"] = effect.get("chips", 1)
	r["mult"] = effect.get("mult", 1.0)
	return r


static func _post_add_discard(result: Dictionary, effect: Dictionary, game_state: Dictionary) -> Dictionary:
	if not check_condition(effect.get("condition", {}), result, game_state):
		return result
	var r: Dictionary = result.duplicate()
	r["extra_discards"] = r.get("extra_discards", 0) + effect.get("value", 1)
	return r


static func _post_compound(result: Dictionary, effect: Dictionary, game_state: Dictionary) -> Dictionary:
	var r: Dictionary = result
	for sub in effect.get("effects", []):
		r = apply_post(r, sub, game_state)
	return r

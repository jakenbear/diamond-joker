class_name ShowdownEngine
extends RefCounted

# Hold'em-style pitching showdown engine.
# Mirrors src/ShowdownEngine.js

const SUITS := ["H", "D", "C", "S"]

const PITCH_STAMINA := {
	"fastball": 0.06, "breaking": 0.04, "changeup": 0.02, "slider": 0.03,
	"cutter": 0.04, "curveball": 0.04, "sinker": 0.03, "splitter": 0.05,
	"twoseam": 0.03, "knuckle": 0.01, "screwball": 0.05, "palmball": 0.02,
}

var pitcher: Dictionary
var pitcher_deck: Array[Dictionary] = []
var batter_deck: Array[Dictionary] = []
var pitcher_hole: Array[Dictionary] = []
var batter_hole: Array[Dictionary] = []
var community: Array[Dictionary] = []
var stage: String = "pre-flop"
var pitches_used: Array[String] = []
var locked_indices: Array[int] = []
var face_down_indices: Array[int] = []
var hidden_next_card: bool = false
var planted_card: Variant = null
var _revealed_batter_cards: Array[int] = []
var stamina_drained: float = 0.0
var pitcher_traits: Array = []
var outs: int = 0
var inning: int = 1


static func generate_deck(velocity: int, control: int) -> Array[Dictionary]:
	var floor_rank := maxi(2, roundi(2 + (velocity - 1) * 0.55))
	var ceiling := 14
	var deck: Array[Dictionary] = []
	for i in 20:
		var rank := floor_rank + randi_range(0, ceiling - floor_rank)
		var suit := SUITS[randi() % 4]
		deck.append({"rank": rank, "suit": suit})
	return deck


func start(batter_stats: Dictionary = {}, p_outs: int = 0, p_inning: int = 1) -> void:
	outs = p_outs
	inning = p_inning
	pitcher_deck = ShowdownEngine.generate_deck(pitcher.get("velocity", 5), pitcher.get("control", 5))
	var batter_vel := 5.0
	if batter_stats.size() > 0:
		batter_vel = batter_stats.get("contact", 5) * 0.6 + batter_stats.get("power", 5) * 0.4
	batter_deck = ShowdownEngine.generate_deck(int(batter_vel), 5)
	pitcher_deck.shuffle()
	batter_deck.shuffle()

	pitcher_hole = [pitcher_deck.pop_back(), pitcher_deck.pop_back()]
	batter_hole = [batter_deck.pop_back(), batter_deck.pop_back()]
	community = []
	stage = "pre-flop"
	pitches_used = []
	locked_indices = []
	face_down_indices = []
	hidden_next_card = false
	planted_card = null
	_revealed_batter_cards = []
	stamina_drained = 0.0
	pitcher_traits = pitcher.get("traits", [])


func _deal_one() -> Dictionary:
	if planted_card != null:
		var card: Dictionary = planted_card
		planted_card = null
		return card
	return pitcher_deck.pop_back()


func deal_flop() -> void:
	for i in 3:
		community.append(_deal_one())
	stage = "flop"


func deal_turn() -> void:
	community.append(_deal_one())
	stage = "turn"


func deal_river() -> void:
	community.append(_deal_one())
	stage = "river"


# Resolution

static func best_hand(hole: Array[Dictionary], comm: Array[Dictionary]) -> Dictionary:
	var all_cards := hole + comm
	if all_cards.size() < 5:
		# Not enough cards — evaluate what we have
		return CardEngine.evaluate_hand(all_cards)
	var best: Dictionary = {}
	var best_score := -1
	var combos := _combinations(all_cards, 5)
	for combo in combos:
		var result := CardEngine.evaluate_hand(combo)
		if result["score"] > best_score:
			best = result
			best_score = result["score"]
	if not best.is_empty() and best_score == 0:
		var high_card := 0
		for c in all_cards:
			high_card = maxi(high_card, c["rank"])
		best["_high_card"] = high_card
	return best


static func _combinations(arr: Array, k: int) -> Array[Array]:
	var results: Array[Array] = []
	_combo_helper(arr, k, 0, [], results)
	return results


static func _combo_helper(arr: Array, k: int, start: int, current: Array, results: Array[Array]) -> void:
	if current.size() == k:
		results.append(current.duplicate())
		return
	for i in range(start, arr.size()):
		current.append(arr[i])
		_combo_helper(arr, k, i + 1, current, results)
		current.pop_back()


# Trait Bonuses

func _calc_trait_bonus() -> int:
	var bonus := 0
	for trait in pitcher_traits:
		var id: String = trait if trait is String else trait.get("id", "")
		match id:
			"heater": bonus += 3
			"painted_corner": bonus += 2
			"changeup": bonus += 1
			"slider":
				bonus += 2 if outs == 2 else 1
			"intimidation":
				if outs == 0: bonus += 3
				elif outs == 2: bonus -= 2
			"closers_instinct":
				if inning >= 7 and inning <= 9: bonus += 5
			"curveball":
				if randf() < 0.3:
					var idx := 0 if batter_hole[0]["rank"] >= batter_hole[1]["rank"] else 1
					batter_hole[idx]["rank"] = maxi(2, batter_hole[idx]["rank"] - 3)
			"knuckleball":
				if community.size() > 0:
					var ci := randi() % community.size()
					community[ci]["suit"] = SUITS[randi() % 4]
	return bonus


func resolve() -> Dictionary:
	var p_hand := ShowdownEngine.best_hand(pitcher_hole, community)
	var b_hand := ShowdownEngine.best_hand(batter_hole, community)

	var trait_bonus := _calc_trait_bonus()

	var p_score: int = p_hand["score"] + trait_bonus
	var b_score: int = b_hand["score"]

	var winner: String
	var margin: int

	if p_score > b_score:
		winner = "pitcher"
		margin = p_score - b_score
	elif b_score > p_score:
		winner = "batter"
		margin = b_score - p_score
	else:
		var p_high := maxi(pitcher_hole[0]["rank"], pitcher_hole[1]["rank"])
		var b_high := maxi(batter_hole[0]["rank"], batter_hole[1]["rank"])
		winner = "pitcher" if p_high >= b_high else "batter"
		margin = 0

	var outcome: String
	if winner == "pitcher":
		outcome = _pitcher_outcome(margin)
	else:
		outcome = _batter_outcome(margin)

	return {
		"winner": winner,
		"pitcher_hand": p_hand,
		"batter_hand": b_hand,
		"outcome": outcome,
		"is_out": winner == "pitcher",
		"margin": margin,
		"trait_bonus": trait_bonus,
	}


static func _pitcher_outcome(margin: int) -> String:
	if margin >= 10: return "Strikeout"
	if margin >= 5: return "Strikeout" if randf() < 0.3 else ("Flyout" if randf() < 0.5 else "Groundout")
	return "Flyout" if randf() < 0.5 else "Groundout"


static func _batter_outcome(margin: int) -> String:
	if margin >= 15: return "Home Run"
	if margin >= 8: return "Triple" if randf() < 0.5 else "Double"
	if margin >= 3: return "Double"
	return "Single"


# Pitch Effects

func apply_pitch(pitch_key: String, options: Dictionary = {}) -> Dictionary:
	if pitches_used.has(pitch_key):
		return {"success": false, "reason": "Already used this pitch"}

	# Control-based misfire for targeted effects
	var targeted := ["slider", "cutter", "splitter", "twoseam", "breaking"]
	if targeted.has(pitch_key) and options.has("target_index"):
		var misfire_chance := maxf(0, (6 - pitcher.get("control", 5)) * 0.08)
		if randf() < misfire_chance and community.size() > 1:
			var new_target: int = options["target_index"]
			while new_target == options["target_index"] and community.size() > 1:
				new_target = randi() % community.size()
			options["target_index"] = new_target
			options["misfired"] = true

	var result: Dictionary
	match pitch_key:
		"fastball": result = _effect_fastball(options)
		"changeup": result = _effect_changeup()
		"slider": result = _effect_slider(options)
		"cutter": result = _effect_cutter(options)
		"curveball": result = _effect_curveball()
		"sinker": result = _effect_sinker()
		"splitter": result = _effect_splitter(options)
		"twoseam": result = _effect_twoseam(options)
		"knuckle": result = _effect_knuckle(options)
		"screwball": result = _effect_screwball()
		"palmball": result = _effect_palmball()
		"breaking": result = _effect_breaking(options)
		_: return {"success": false, "reason": "Unknown pitch"}

	if result.get("success", false):
		pitches_used.append(pitch_key)
		stamina_drained += PITCH_STAMINA.get(pitch_key, 0.03)
		if options.get("misfired", false):
			result["misfired"] = true
	return result


func get_stamina_drained() -> float:
	return stamina_drained


func _effect_fastball(opts: Dictionary) -> Dictionary:
	var swap_index: int = opts.get("swap_index", 0)
	var sorted := pitcher_deck.duplicate()
	sorted.sort_custom(func(a, b): return a["rank"] > b["rank"])
	var pool_size := maxi(1, ceili(sorted.size() * 0.3))
	var drawn: Dictionary = sorted[randi() % pool_size]
	var idx := pitcher_deck.find(drawn)
	if idx >= 0: pitcher_deck.remove_at(idx)
	var old := pitcher_hole[swap_index]
	pitcher_hole[swap_index] = drawn
	return {"success": true, "swapped": old, "drawn": drawn}


func _effect_changeup() -> Dictionary:
	var idx := randi() % batter_hole.size()
	_revealed_batter_cards.append(idx)
	return {"success": true, "revealed": batter_hole[idx].duplicate(), "revealed_index": idx}


func _effect_slider(opts: Dictionary) -> Dictionary:
	var target: int = opts.get("target_index", 0)
	if target < 0 or target >= community.size():
		return {"success": false, "reason": "Invalid target"}
	if locked_indices.has(target):
		return {"success": false, "reason": "Card is locked"}
	var replaced := community[target]
	var new_card: Dictionary = pitcher_deck.pop_back()
	community[target] = new_card
	return {"success": true, "replaced": replaced, "new_card": new_card}


func _effect_cutter(opts: Dictionary) -> Dictionary:
	var target: int = opts.get("target_index", 0)
	locked_indices.append(target)
	return {"success": true, "locked": target}


func _effect_curveball() -> Dictionary:
	if randf() < (pitcher.get("control", 5) / 12.0):
		var idx := 0 if batter_hole[0]["rank"] >= batter_hole[1]["rank"] else 1
		var old_rank: int = batter_hole[idx]["rank"]
		batter_hole[idx]["rank"] = maxi(2, batter_hole[idx]["rank"] - 2)
		return {"success": true, "downgraded": true, "from_rank": old_rank}
	if community.size() > 0:
		community[0]["rank"] = 14
	return {"success": true, "downgraded": false, "misfired": true}


func _effect_sinker() -> Dictionary:
	for c in community:
		c["rank"] = maxi(2, c["rank"] - 1)
	return {"success": true}


func _effect_splitter(opts: Dictionary) -> Dictionary:
	var target: int = opts.get("target_index", 0)
	if target < 0 or target >= community.size():
		return {"success": false, "reason": "Invalid target"}
	if locked_indices.has(target):
		return {"success": false, "reason": "Card is locked"}
	var removed := community[target]
	community.remove_at(target)
	locked_indices = locked_indices.filter(func(i): return i != target).map(func(i): return i - 1 if i > target else i)
	face_down_indices = face_down_indices.filter(func(i): return i != target).map(func(i): return i - 1 if i > target else i)
	return {"success": true, "destroyed": removed}


func _effect_twoseam(opts: Dictionary) -> Dictionary:
	var target: int = opts.get("target_index", 0)
	if target < 0 or target >= community.size():
		return {"success": false, "reason": "Invalid target"}
	# Swap a community card with a random batter hole card
	var batter_idx := randi() % batter_hole.size()
	var comm_card := community[target].duplicate()
	var bat_card := batter_hole[batter_idx].duplicate()
	community[target] = bat_card
	batter_hole[batter_idx] = comm_card
	return {"success": true, "swapped_community": comm_card, "swapped_batter": bat_card, "batter_idx": batter_idx}


func _effect_knuckle(_opts: Dictionary) -> Dictionary:
	if community.size() == 0:
		return {"success": false, "reason": "No community cards"}
	# Randomize ALL community card ranks (keep suits)
	var before: Array = community.duplicate(true)
	for c in community:
		c["rank"] = 2 + randi() % 13
	return {"success": true, "before": before, "after": community.duplicate(true)}


func _effect_screwball() -> Dictionary:
	var idx := randi() % batter_hole.size()
	var old := batter_hole[idx].duplicate()
	batter_hole[idx] = {"rank": 2 + randi() % 13, "suit": SUITS[randi() % 4]}
	return {"success": true, "replaced_batter_card": old}


func _effect_palmball() -> Dictionary:
	if pitcher_deck.size() == 0:
		return {"success": false, "reason": "Deck empty"}
	# Deal next community card from pitcher's best card
	var sorted := pitcher_deck.duplicate()
	sorted.sort_custom(func(a, b): return a["rank"] > b["rank"])
	var card: Dictionary = sorted[0]
	var idx := pitcher_deck.find(card)
	pitcher_deck.remove_at(idx)
	planted_card = card
	return {"success": true, "planted_card": card.duplicate()}


func _effect_breaking(opts: Dictionary) -> Dictionary:
	var target: int = opts.get("target_index", 0)
	if target < 0 or target >= community.size():
		return {"success": false, "reason": "Invalid target"}
	face_down_indices.append(target)
	return {"success": true, "hidden_index": target}


# Stamina

func degrade_deck(at_bat_number: int) -> void:
	var stamina_factor := pitcher.get("stamina", 5) / 10.0
	var remove_count := maxi(0, int((at_bat_number - 1) * (1 - stamina_factor) * 2))
	if remove_count > 0 and pitcher_deck.size() > 5:
		pitcher_deck.sort_custom(func(a, b): return a["rank"] > b["rank"])
		var to_remove := mini(remove_count, pitcher_deck.size() - 5)
		for i in to_remove:
			pitcher_deck.remove_at(0)
		pitcher_deck.shuffle()


# State

func get_state() -> Dictionary:
	return {
		"pitcher_hole": pitcher_hole.duplicate(true),
		"batter_hole": batter_hole.duplicate(true),
		"community": community.duplicate(true),
		"stage": stage,
		"pitches_used": pitches_used.duplicate(),
		"locked_indices": locked_indices.duplicate(),
		"face_down_indices": face_down_indices.duplicate(),
		"hidden_next_card": hidden_next_card,
		"revealed_batter_cards": _revealed_batter_cards.duplicate(),
	}

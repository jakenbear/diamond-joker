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
	_revealed_batter_cards = []
	stamina_drained = 0.0
	pitcher_traits = pitcher.get("traits", [])


func deal_flop() -> void:
	for i in 3:
		community.append(pitcher_deck.pop_back())
	stage = "flop"


func deal_turn() -> void:
	community.append(pitcher_deck.pop_back())
	stage = "turn"


func deal_river() -> void:
	community.append(pitcher_deck.pop_back())
	stage = "river"


# Resolution

static func best_hand(hole: Array[Dictionary], comm: Array[Dictionary]) -> Dictionary:
	var all_cards := hole + comm
	if all_cards.size() < 5:
		return {"score": 0, "hand_name": "High Card"}
	var best: Dictionary = {}
	var best_score := -1
	var combos := _combinations(all_cards, 5)
	for combo in combos:
		var result := _evaluate_simple(combo)
		if result["score"] > best_score:
			best = result
			best_score = result["score"]
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


static func _evaluate_simple(cards: Array[Dictionary]) -> Dictionary:
	var ranks: Array[int] = []
	var suits: Array[String] = []
	for c in cards:
		ranks.append(c["rank"])
		suits.append(c["suit"])
	ranks.sort()

	var freq := {}
	for r in ranks:
		freq[r] = freq.get(r, 0) + 1
	var counts: Array[int] = []
	for v in freq.values():
		counts.append(v)
	counts.sort()
	counts.reverse()

	var is_flush := cards.size() == 5 and suits.all(func(s): return s == suits[0])
	var is_straight := cards.size() == 5 and _is_straight(ranks)

	var score := 0
	var hand_name := "High Card"

	if is_flush and is_straight:
		if ranks[0] == 10 and ranks[4] == 14:
			score = 300; hand_name = "Royal Flush"
		else:
			score = 200; hand_name = "Straight Flush"
	elif counts[0] == 4:
		score = 120; hand_name = "Four of a Kind"
	elif counts[0] == 3 and counts.size() > 1 and counts[1] == 2:
		score = 50; hand_name = "Full House"
	elif is_flush:
		score = 40; hand_name = "Flush"
	elif is_straight:
		score = 30; hand_name = "Straight"
	elif counts[0] == 3:
		score = 20; hand_name = "Three of a Kind"
	elif counts[0] == 2 and counts.size() > 1 and counts[1] == 2:
		score = 10; hand_name = "Two Pair"
	elif counts[0] == 2:
		score = 5; hand_name = "Pair"

	score += ranks[ranks.size() - 1]

	return {"score": score, "hand_name": hand_name}


static func _is_straight(sorted: Array[int]) -> bool:
	if sorted.size() != 5:
		return false
	for i in range(1, sorted.size()):
		if sorted[i] != sorted[i - 1] + 1:
			if sorted[4] == 14 and sorted[0] == 2 and sorted[1] == 3 and sorted[2] == 4 and sorted[3] == 5:
				return true
			return false
	return true


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
	var targeted := ["slider", "cutter", "splitter", "twoseam", "knuckle", "breaking"]
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
	var other_suits: Array[String] = []
	for i in community.size():
		if i != target: other_suits.append(community[i]["suit"])
	var freq := {}
	for s in other_suits:
		freq[s] = freq.get(s, 0) + 1
	var best_suit: String = community[target]["suit"]
	var best_count := 0
	for s in freq:
		if freq[s] > best_count:
			best_count = freq[s]
			best_suit = s
	var old_suit: String = community[target]["suit"]
	community[target]["suit"] = best_suit
	return {"success": true, "old_suit": old_suit, "new_suit": best_suit}


func _effect_knuckle(opts: Dictionary) -> Dictionary:
	var target: int = opts.get("target_index", 0)
	if target < 0 or target >= community.size():
		return {"success": false, "reason": "Invalid target"}
	community[target] = {"rank": 2 + randi() % 13, "suit": SUITS[randi() % 4]}
	return {"success": true}


func _effect_screwball() -> Dictionary:
	var idx := randi() % batter_hole.size()
	var old := batter_hole[idx].duplicate()
	batter_hole[idx] = {"rank": 2 + randi() % 13, "suit": SUITS[randi() % 4]}
	return {"success": true, "replaced_batter_card": old}


func _effect_palmball() -> Dictionary:
	hidden_next_card = true
	return {"success": true}


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

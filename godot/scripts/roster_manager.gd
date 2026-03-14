class_name RosterManager
extends RefCounted

# Player roster + pitcher management.
# Manages your team (batting) and opponent team (their batters face your pitcher).

const MAX_TRAITS_PER_PLAYER: int = 2
const MAX_BONUS_PLAYERS: int = 3
const MAX_PITCHER_TRAITS: int = 2

var team: Dictionary
var roster: Array[Dictionary] = []
var current_batter_index: int = 0
var bonus_player_count: int = 0
var benched_players: Array[Dictionary] = []

# Your pitcher (pitches against opponent batters)
var my_pitcher: Dictionary = {}
var my_pitcher_stamina: float = 1.0
var bullpen: Array[Dictionary] = []

# Opponent team
var opponent_team: Dictionary = {}
var opponent_roster: Array[Dictionary] = []
var pitcher: Dictionary = {}  # opponent's pitcher (faces you)
var opponent_batter_index: int = 0


func _init(p_team: Dictionary, pitcher_index: int = 0, p_opponent_team: Dictionary = {}) -> void:
	team = p_team
	roster = []
	for i in p_team["batters"].size():
		var b: Dictionary = p_team["batters"][i].duplicate()
		b["traits"] = []
		b["lineup_index"] = i
		roster.append(b)
	current_batter_index = 0

	# Your pitcher
	my_pitcher = p_team["pitchers"][pitcher_index].duplicate()
	my_pitcher_stamina = 1.0

	# Bullpen
	bullpen = []
	for i in p_team["pitchers"].size():
		if i != pitcher_index:
			var p: Dictionary = p_team["pitchers"][i].duplicate()
			p["used"] = false
			bullpen.append(p)

	# Opponent team
	opponent_team = p_opponent_team
	if not p_opponent_team.is_empty():
		opponent_roster = []
		for i in p_opponent_team["batters"].size():
			var b: Dictionary = p_opponent_team["batters"][i].duplicate()
			b["lineup_index"] = i
			opponent_roster.append(b)
		pitcher = p_opponent_team["pitchers"][0].duplicate()
		pitcher["team_name"] = p_opponent_team.get("name", "")
		pitcher["team_logo"] = p_opponent_team.get("logo", "")
		pitcher["traits"] = []
		opponent_batter_index = 0
	else:
		opponent_roster = []
		pitcher = {"name": "Unknown", "velocity": 5, "control": 5, "stamina": 5, "traits": []}
		opponent_batter_index = 0


func get_current_pitcher() -> Dictionary:
	return pitcher

func get_my_pitcher() -> Dictionary:
	return my_pitcher

func get_opponent_team() -> Dictionary:
	return opponent_team

func get_my_pitcher_stamina() -> float:
	return my_pitcher_stamina

func get_available_bullpen() -> Array[Dictionary]:
	return bullpen.filter(func(p): return not p.get("used", false))

func swap_pitcher(index: int) -> Dictionary:
	if index < 0 or index >= bullpen.size():
		return my_pitcher
	var reliever: Dictionary = bullpen[index]
	if reliever.get("used", false):
		return my_pitcher
	reliever["used"] = true
	my_pitcher = reliever.duplicate()
	my_pitcher_stamina = 1.0
	return my_pitcher


func sim_single_at_bat(inning: int, pitch_type: String, bases: Array, staff_mods: Dictionary = {}) -> Dictionary:
	var p: Dictionary = my_pitcher
	var fatigue: float = _get_pitcher_fatigue(p, inning)
	var pitch: Dictionary = PitchTypes.TYPES.get(pitch_type, PitchTypes.TYPES["fastball"])
	var batter: Dictionary = opponent_roster[opponent_batter_index]

	# Drain stamina
	my_pitcher_stamina = maxf(0.0, my_pitcher_stamina - pitch.get("stamina_cost", 0.0))

	# IBB - automatic walk
	if pitch_type == "ibb":
		var scored: int = _advance_runners(bases, 1, 0, batter)
		opponent_batter_index = (opponent_batter_index + 1) % 9
		return {"outcome": "Walk (IBB)", "is_out": false, "bases_gained": 1, "batter": batter, "walked": true, "scored": scored}

	var hit_reduction: float = staff_mods.get("hit_reduction", 0.0)
	var result: Dictionary = _sim_at_bat_with_pitch(p, batter, fatigue, pitch, hit_reduction)

	# Breaking ball walk risk
	if pitch_type == "breaking":
		var walk_chance: float = maxf(0.0, (6 - p.get("control", 5)) * 0.04)
		if walk_chance > 0.0 and randf() < walk_chance:
			var scored: int = _advance_runners(bases, 1, 0, batter)
			opponent_batter_index = (opponent_batter_index + 1) % 9
			return {"outcome": "Walk", "is_out": false, "bases_gained": 1, "batter": batter, "walked": true, "scored": scored}

	var scored: int = 0
	if not result.get("is_out", false):
		scored = _advance_runners(bases, result.get("bases_gained", 0), batter.get("speed", 5), batter)

	opponent_batter_index = (opponent_batter_index + 1) % 9
	return {"outcome": result["outcome"], "is_out": result["is_out"], "bases_gained": result["bases_gained"], "batter": batter, "walked": false, "scored": scored}


func _sim_at_bat_with_pitch(p: Dictionary, batter: Dictionary, fatigue: float, pitch: Dictionary, hit_reduction: float = 0.0) -> Dictionary:
	var effective_fatigue: float = fatigue * (0.5 + my_pitcher_stamina * 0.5)
	var pitch_strength: float = (p.get("velocity", 5) * 0.6 + p.get("control", 5) * 0.4) * effective_fatigue
	var bat_strength: float = batter.get("contact", 5) * 0.6 + batter.get("power", 5) * 0.4

	var matchup: float = bat_strength - pitch_strength
	var base_hit_chance: float = clampf(0.28 + matchup * 0.025, 0.12, 0.50)
	var hit_chance: float = clampf(base_hit_chance + pitch.get("hit_chance_mod", 0.0) - hit_reduction, 0.05, 0.50)

	var roll: float = randf()
	if roll > hit_chance:
		# Out
		var out_roll: float = randf()
		var k_threshold: float = (0.4 if p.get("velocity", 5) >= 8 else 0.2) * pitch.get("k_bonus_mult", 1.0)
		if out_roll < k_threshold:
			return {"outcome": "Strikeout", "is_out": true, "bases_gained": 0}
		elif out_roll < k_threshold + 0.3:
			return {"outcome": "Groundout", "is_out": true, "bases_gained": 0}
		else:
			return {"outcome": "Flyout", "is_out": true, "bases_gained": 0}

	# Hit - apply XBH multiplier
	var hit_roll: float = randf()
	var power_factor: float = batter.get("power", 5) / 10.0
	var hr_chance: float = (0.01 + power_factor * 0.03) * pitch.get("xbh_mult", 1.0)
	var triple_chance: float = (0.05 + power_factor * 0.08) * pitch.get("xbh_mult", 1.0)
	var double_chance: float = (0.20 + power_factor * 0.12) * pitch.get("xbh_mult", 1.0)

	if hit_roll < hr_chance:
		return {"outcome": "Home Run", "is_out": false, "bases_gained": 4}
	elif hit_roll < triple_chance:
		return {"outcome": "Triple", "is_out": false, "bases_gained": 3}
	elif hit_roll < double_chance:
		return {"outcome": "Double", "is_out": false, "bases_gained": 2}
	else:
		return {"outcome": "Single", "is_out": false, "bases_gained": 1}


func set_pitcher_traits(traits: Array) -> void:
	pitcher["traits"] = traits.slice(0, MAX_PITCHER_TRAITS)

func get_current_batter() -> Dictionary:
	return roster[current_batter_index]

func get_current_batter_index() -> int:
	return current_batter_index

func advance_batter() -> Dictionary:
	current_batter_index = (current_batter_index + 1) % 9
	return get_current_batter()

func equip_trait(player_index: int, trait_card: Dictionary) -> bool:
	if player_index < 0 or player_index >= roster.size():
		return false
	var player: Dictionary = roster[player_index]
	var cap: int = 3 if player.get("is_bonus", false) else MAX_TRAITS_PER_PLAYER
	if player["traits"].size() >= cap:
		return false
	player["traits"].append(trait_card)
	return true


func add_bonus_player(bonus_player: Dictionary, replace_index: int) -> bool:
	if bonus_player_count >= MAX_BONUS_PLAYERS:
		return false
	if replace_index < 0 or replace_index >= roster.size():
		return false

	var benched: Dictionary = roster[replace_index].duplicate()
	benched_players.append(benched)

	var bp: Dictionary = bonus_player.duplicate()
	bp["is_bonus"] = true
	bp["traits"] = []
	bp["lineup_index"] = replace_index

	# Auto-equip innate trait
	if bp.has("innate_trait_id"):
		for t in BatterTraits.TRAITS:
			if t["id"] == bp["innate_trait_id"]:
				var innate: Dictionary = t.duplicate()
				innate["is_innate"] = true
				bp["traits"].append(innate)
				break

	roster[replace_index] = bp
	bonus_player_count += 1
	return true


func get_active_lineup_effects() -> Array[Dictionary]:
	var effects: Array[Dictionary] = []
	for p in roster:
		if p.get("is_bonus", false) and p.has("lineup_effect"):
			effects.append(p["lineup_effect"])
	return effects


func apply_batter_modifiers(eval_result: Dictionary, game_state: Dictionary) -> Dictionary:
	var batter: Dictionary = get_current_batter()
	var result: Dictionary = eval_result.duplicate()
	var bonuses: Dictionary = {"power_peanuts": 0, "contact_mult": 0.0, "contact_save": false}

	# Contact save: rescue a pair that became a Groundout
	if result.get("was_groundout", false) and result.get("original_hand", "") == "Pair":
		var save_chance: float = batter.get("contact", 5) * 0.04
		if randf() < save_chance:
			result["outcome"] = "Single"
			result["hand_name"] = "Pair"
			result["peanuts"] = 1
			result["mult"] = 1.5
			result["score"] = 2
			result["was_groundout"] = false
			var pr: int = result.get("pair_rank", 0)
			var rank_names := {11: "J", 12: "Q", 13: "K", 14: "A"}
			var rank_str: String = rank_names.get(pr, str(pr)) if pr >= 11 else str(pr)
			result["played_description"] = "Pair of %ss (Contact!)" % rank_str
			bonuses["contact_save"] = true
		else:
			return {"result": result, "bonuses": bonuses}

	var is_hit: bool = result["outcome"] != "Strikeout" and result["outcome"] != "Groundout" and result["outcome"] != "Flyout"
	if not is_hit:
		return {"result": result, "bonuses": bonuses}

	var power_bonus: int = maxi(0, batter.get("power", 5) - 5)
	bonuses["power_peanuts"] = power_bonus
	result["peanuts"] = result.get("peanuts", 0) + power_bonus

	var contact_bonus: float = batter.get("contact", 5) / 10.0
	bonuses["contact_mult"] = contact_bonus
	result["mult"] = snappedf(result.get("mult", 1.0) + contact_bonus, 0.1)

	result["score"] = roundi(result["peanuts"] * result["mult"])
	result["extra_base_chance"] = batter.get("speed", 5) * 0.05

	return {"result": result, "bonuses": bonuses}


func apply_pitcher_modifiers(eval_result: Dictionary, game_state: Dictionary) -> Dictionary:
	var p: Dictionary = pitcher
	var result: Dictionary = eval_result.duplicate()
	var inning: int = game_state.get("inning", 1)
	var fatigue: float = _get_pitcher_fatigue(p, inning)

	if result["outcome"] == "Single" or result["outcome"] == "Double":
		var vel_penalty: int = maxi(0, int(p.get("velocity", 5) * fatigue) - 6)
		result["peanuts"] = maxi(0, result.get("peanuts", 0) - int(vel_penalty / 2))

	var control_penalty: float = (p.get("control", 5) * fatigue) * 0.05
	result["mult"] = snappedf(maxf(1.0, result.get("mult", 1.0) - control_penalty), 0.1)

	result["score"] = roundi(result["peanuts"] * result["mult"])
	return result


func _get_pitcher_fatigue(p: Dictionary, inning: int) -> float:
	var fatigue_start: int = maxi(3, p.get("stamina", 5) - 1)
	if inning <= fatigue_start:
		return 1.0
	var fatigue_innings: int = inning - fatigue_start
	return maxf(0.5, 1.0 - fatigue_innings * 0.08)


func sim_opponent_half_inning(inning: int = 1) -> Dictionary:
	var p: Dictionary = my_pitcher
	var fatigue: float = _get_pitcher_fatigue(p, inning)
	var sim_outs: int = 0
	var runs: int = 0
	var bases: Array = [null, null, null]
	var log: Array[Dictionary] = []

	while sim_outs < 3:
		var batter: Dictionary = opponent_roster[opponent_batter_index]
		var result: Dictionary = _sim_at_bat(p, batter, fatigue)

		if result["is_out"]:
			sim_outs += 1
			log.append({
				"batter": batter["name"],
				"pos": batter.get("pos", ""),
				"outcome": result["outcome"],
				"is_out": true,
			})
		else:
			var scored: int = _advance_runners(bases, result["bases_gained"], batter.get("speed", 5), batter)
			runs += scored
			log.append({
				"batter": batter["name"],
				"pos": batter.get("pos", ""),
				"outcome": result["outcome"],
				"is_out": false,
				"scored": scored,
			})

		opponent_batter_index = (opponent_batter_index + 1) % 9

	return {"runs": runs, "log": log}


func _sim_at_bat(p: Dictionary, batter: Dictionary, fatigue: float = 1.0) -> Dictionary:
	var pitch_strength: float = (p.get("velocity", 5) * 0.6 + p.get("control", 5) * 0.4) * fatigue
	var bat_strength: float = batter.get("contact", 5) * 0.6 + batter.get("power", 5) * 0.4

	var matchup: float = bat_strength - pitch_strength
	var hit_chance: float = clampf(0.28 + matchup * 0.025, 0.12, 0.50)

	var roll: float = randf()
	if roll > hit_chance:
		var out_roll: float = randf()
		if p.get("velocity", 5) >= 8 and out_roll < 0.4:
			return {"outcome": "Strikeout", "is_out": true, "bases_gained": 0}
		elif out_roll < 0.6:
			return {"outcome": "Groundout", "is_out": true, "bases_gained": 0}
		else:
			return {"outcome": "Flyout", "is_out": true, "bases_gained": 0}

	var hit_roll: float = randf()
	var power_factor: float = batter.get("power", 5) / 10.0

	if hit_roll < 0.01 + power_factor * 0.03:
		return {"outcome": "Home Run", "is_out": false, "bases_gained": 4}
	elif hit_roll < 0.05 + power_factor * 0.08:
		return {"outcome": "Triple", "is_out": false, "bases_gained": 3}
	elif hit_roll < 0.20 + power_factor * 0.12:
		return {"outcome": "Double", "is_out": false, "bases_gained": 2}
	else:
		return {"outcome": "Single", "is_out": false, "bases_gained": 1}


func _advance_runners(bases: Array, bases_gained: int, batter_speed: int, batter = null) -> int:
	var scored: int = 0

	if bases_gained >= 4:
		for b in bases:
			if b:
				scored += 1
		scored += 1  # batter
		bases[0] = null
		bases[1] = null
		bases[2] = null
		return scored

	# Move runners forward
	for i in range(2, -1, -1):
		if bases[i]:
			var runner = bases[i]
			bases[i] = null
			var new_base: int = i + bases_gained
			if new_base >= 3:
				scored += 1
			else:
				bases[new_base] = runner

	# Place batter on base
	if bases_gained >= 3:
		scored += 1  # Triple means batter scored too (safety)
	if bases_gained == 3:
		bases[2] = batter if batter else true
	elif bases_gained == 2:
		bases[1] = batter if batter else true
	elif bases_gained == 1:
		bases[0] = batter if batter else true

	# Speed bonus
	if batter_speed >= 7 and randf() < batter_speed * 0.03:
		for i in range(1, -1, -1):
			if bases[i] and not bases[i + 1]:
				var runner = bases[i]
				bases[i] = null
				bases[i + 1] = runner
				break

	return scored


func get_roster() -> Array[Dictionary]:
	return roster

func get_team() -> Dictionary:
	return team


static func assign_pitch_repertoire(p: Dictionary) -> Array[String]:
	if p.has("pitches"):
		return p["pitches"]
	var v: int = p.get("velocity", 5)
	var c: int = p.get("control", 5)
	var pitches: Array[String]
	if v >= 10:
		pitches = ["fastball", "splitter", "slider", "cutter"]
	elif v >= 9 and c >= 7:
		pitches = ["fastball", "cutter", "curveball", "splitter"]
	elif v >= 9:
		pitches = ["fastball", "slider", "splitter", "breaking"]
	elif v >= 8 and c >= 8:
		pitches = ["fastball", "cutter", "changeup", "curveball"]
	elif c >= 9:
		pitches = ["sinker", "curveball", "palmball", "cutter"]
	elif c >= 8:
		pitches = ["twoseam", "curveball", "changeup", "cutter"]
	elif v >= 8:
		pitches = ["fastball", "slider", "cutter", "breaking"]
	elif v <= 5 and c <= 5:
		pitches = ["knuckle", "screwball", "palmball", "changeup"]
	elif p.get("stamina", 5) >= 8:
		pitches = ["sinker", "twoseam", "changeup", "slider"]
	else:
		pitches = ["fastball", "slider", "changeup", "breaking"]
	p["pitches"] = pitches
	return pitches

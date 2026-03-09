class_name TraitManager
extends RefCounted

# Trait card management and modifier building.
# All trait DATA lives in data/batter_traits.gd and data/pitcher_traits.gd.
# Effect logic lives in effect_engine.gd.

const RARITY_WEIGHTS: Dictionary = {"common": 3, "uncommon": 2, "rare": 1}

var owned_trait_ids: Dictionary = {}  # id -> true


func get_shop_selection(count: int = 3) -> Array[Dictionary]:
	var available: Array[Dictionary] = []
	for t in BatterTraits.TRAITS:
		if not owned_trait_ids.has(t["id"]):
			available.append(t)
	if available.is_empty():
		return []

	var weighted: Array[Dictionary] = []
	for trait_card in available:
		var w: int = RARITY_WEIGHTS.get(trait_card.get("rarity", "common"), 1)
		for i in w:
			weighted.append(trait_card)

	var selected: Array[Dictionary] = []
	var used_ids: Dictionary = {}
	var limit: int = mini(count, available.size())

	while selected.size() < limit:
		var pick: Dictionary = weighted[randi_range(0, weighted.size() - 1)]
		if not used_ids.has(pick["id"]):
			used_ids[pick["id"]] = true
			selected.append(pick)

	return selected


static func pick_pitcher_traits() -> Array[Dictionary]:
	var count: int = 1 if randf() < 0.5 else 2
	var pool: Array[Dictionary] = PitcherTraits.TRAITS.duplicate(true)
	# Fisher-Yates shuffle
	for i in range(pool.size() - 1, 0, -1):
		var j: int = randi_range(0, i)
		var tmp: Dictionary = pool[i]
		pool[i] = pool[j]
		pool[j] = tmp
	return pool.slice(0, count)


func mark_owned(trait_id: String) -> void:
	owned_trait_ids[trait_id] = true


static func build_pre_modifier(traits: Array) -> Callable:
	var pre_traits: Array = traits.filter(func(t): return t.get("phase", "") == "pre" and t.has("effect"))
	if pre_traits.is_empty():
		return Callable()

	return func(cards: Array[Dictionary]) -> Array[Dictionary]:
		var modified: Array[Dictionary] = cards
		for trait_card in pre_traits:
			modified = EffectEngine.apply_pre(modified, trait_card["effect"])
		return modified


static func build_post_modifier(traits: Array) -> Callable:
	var post_traits: Array = traits.filter(func(t): return t.get("phase", "") == "post" and t.has("effect"))
	if post_traits.is_empty():
		return Callable()

	return func(eval_result: Dictionary, game_state: Dictionary) -> Dictionary:
		var modified: Dictionary = eval_result
		for trait_card in post_traits:
			modified = EffectEngine.apply_post(modified, trait_card["effect"], game_state)
		return modified


static func build_pitcher_pre_modifier(traits: Array) -> Callable:
	var pre_traits: Array = traits.filter(func(t): return t.get("phase", "") == "pitcher_pre" and t.has("effect"))
	if pre_traits.is_empty():
		return Callable()

	return func(cards: Array[Dictionary]) -> Array[Dictionary]:
		var modified: Array[Dictionary] = cards
		for trait_card in pre_traits:
			modified = EffectEngine.apply_pre(modified, trait_card["effect"])
		return modified


static func build_pitcher_post_modifier(traits: Array) -> Callable:
	var post_traits: Array = traits.filter(func(t): return t.get("phase", "") == "pitcher_post" and t.has("effect"))
	if post_traits.is_empty():
		return Callable()

	return func(eval_result: Dictionary, game_state: Dictionary) -> Dictionary:
		var modified: Dictionary = eval_result
		for trait_card in post_traits:
			modified = EffectEngine.apply_post(modified, trait_card["effect"], game_state)
		return modified

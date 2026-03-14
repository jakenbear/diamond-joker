class_name CardEngine
extends RefCounted

# Deck management and poker hand evaluation.
# Balatro-style: player selects 1-5 cards from hand to play.

const RANK_NAMES: Dictionary = {11: "J", 12: "Q", 13: "K", 14: "A"}

var deck: Array[Dictionary] = []
var hand: Array[Dictionary] = []
var discard_pile: Array[Dictionary] = []
var hand_size: int = 5
var _deck_id: String = "standard"


func _init(deck_id: String = "standard") -> void:
	_deck_id = deck_id
	var config: Dictionary = Decks.DECK_CONFIGS.get(deck_id, Decks.DECK_CONFIGS["standard"])
	hand_size = config.get("hand_size", 5)
	_build_deck()
	shuffle()


func _build_deck() -> void:
	deck = Decks.build_deck(_deck_id)


func shuffle() -> void:
	# Fisher-Yates shuffle
	for i in range(deck.size() - 1, 0, -1):
		var j: int = randi_range(0, i)
		var tmp: Dictionary = deck[i]
		deck[i] = deck[j]
		deck[j] = tmp


func reset_deck() -> void:
	_build_deck()
	shuffle()
	hand = []
	discard_pile = []


func draw(n: int = 5) -> Array[Dictionary]:
	for i in n:
		if deck.is_empty():
			break
		hand.append(deck.pop_back())
	return hand


func discard(indices: Array[int]) -> Array[Dictionary]:
	# Sort descending so splicing doesn't shift indices
	var sorted_indices := indices.duplicate()
	sorted_indices.sort()
	sorted_indices.reverse()
	for idx in sorted_indices:
		if idx >= 0 and idx < hand.size():
			discard_pile.append(hand[idx])
			hand.remove_at(idx)

	# Draw replacements
	var needed: int = hand_size - hand.size()
	draw(needed)

	# Reshuffle discard into deck if needed
	if hand.size() < hand_size and not discard_pile.is_empty():
		deck.append_array(discard_pile)
		discard_pile = []
		shuffle()
		draw(hand_size - hand.size())

	return hand


func play_hand(selected_indices: Array[int] = [], pre_modifier: Callable = Callable(), post_modifier: Callable = Callable(), game_state: Dictionary = {}, strike_count: int = 0) -> Dictionary:
	var indices: Array[int] = selected_indices
	if indices.is_empty():
		for i in hand.size():
			indices.append(i)

	var played_cards: Array[Dictionary] = []
	for i in indices:
		if i >= 0 and i < hand.size():
			played_cards.append(hand[i])

	if played_cards.is_empty():
		return HandTable.get_entry(9).merged({"score": 0})

	var result := CardEngine.evaluate_hand(played_cards, pre_modifier, post_modifier, game_state, strike_count)

	# All cards go to discard
	discard_pile.append_array(hand)
	hand = []
	return result


func new_at_bat() -> Array[Dictionary]:
	if deck.size() < hand_size:
		reset_deck()
	hand = []
	draw(hand_size)
	return hand


# --- Static evaluation ---

static func evaluate_hand(cards: Array[Dictionary], pre_modifier: Callable = Callable(), post_modifier: Callable = Callable(), game_state: Dictionary = {}, strike_count: int = 0) -> Dictionary:
	if cards.is_empty():
		return HandTable.get_entry(9).merged({"score": 0})

	# Apply pre-modifier
	var eval_cards: Array[Dictionary] = cards
	if pre_modifier.is_valid():
		eval_cards = pre_modifier.call(cards)

	var n: int = eval_cards.size()
	var ranks: Array[int] = []
	var suits: Array[String] = []
	for c in eval_cards:
		ranks.append(c["rank"])
		suits.append(c["suit"])
	ranks.sort()

	# Flush and straight require exactly 5 cards
	var is_flush: bool = n == 5 and suits.all(func(s): return s == suits[0])
	var is_straight: bool = n == 5 and _is_straight(ranks)

	# Rank frequency counts
	var freq: Dictionary = {}
	for r in ranks:
		freq[r] = freq.get(r, 0) + 1
	var counts: Array = freq.values()
	counts.sort()
	counts.reverse()

	var pair_rank: int = _get_pair_rank(freq)
	var hand_idx: int

	if is_flush and is_straight and ranks[0] == 10 and ranks[4] == 14:
		hand_idx = 0  # Royal Flush
	elif is_flush and is_straight:
		hand_idx = 1  # Straight Flush
	elif counts[0] == 4:
		hand_idx = 2  # Four of a Kind
	elif counts[0] == 3 and counts.size() > 1 and counts[1] == 2:
		hand_idx = 3  # Full House
	elif is_flush:
		hand_idx = 4  # Flush
	elif is_straight:
		hand_idx = 5  # Straight
	elif counts[0] == 3:
		hand_idx = 6  # Three of a Kind
	elif counts[0] == 2 and counts.size() > 1 and counts[1] == 2:
		hand_idx = 7  # Two Pair
	elif counts[0] == 2:
		hand_idx = 8  # Pair
	else:
		hand_idx = 9  # High Card

	var entry: Dictionary = HandTable.get_entry(hand_idx)

	# Straight Flush probability roll: 80% HR, 15% Triple, 5% Double
	if entry.get("roll_outcome", false):
		var roll: float = randf()
		if roll < 0.05:
			entry["outcome"] = "Double"
		elif roll < 0.20:
			entry["outcome"] = "Triple"
		# else stays Home Run (80%)

	# Rank-scaled quality for Pair, Two Pair, Three of a Kind
	if hand_idx >= 4 and hand_idx <= 8:
		var quality_result: Dictionary = _apply_rank_quality(entry, pair_rank, hand_idx, strike_count, game_state)
		if not quality_result.is_empty():
			entry = quality_result

	entry["played_description"] = _describe_play(eval_cards, entry["hand_name"])
	entry["score"] = roundi(entry["peanuts"] * entry["mult"])

	# Apply post-modifier
	if post_modifier.is_valid() and not game_state.is_empty():
		var modified: Dictionary = post_modifier.call(entry, game_state)
		modified["score"] = roundi(modified["peanuts"] * modified["mult"])
		return modified

	return entry


static func _describe_play(cards: Array[Dictionary], hand_name: String) -> String:
	var rank_name := func(r: int) -> String:
		return RANK_NAMES.get(r, str(r))
	var rank_plural := func(r: int) -> String:
		var nm: String = RANK_NAMES.get(r, str(r))
		return nm + "es" if nm == "6" else nm + "s"

	var freq: Dictionary = {}
	for c in cards:
		freq[c["rank"]] = freq.get(c["rank"], 0) + 1

	var pairs: Array = []
	for rank_key in freq:
		if freq[rank_key] >= 2:
			pairs.append({"rank": rank_key, "count": freq[rank_key]})
	pairs.sort_custom(func(a, b): return a["count"] > b["count"] or (a["count"] == b["count"] and a["rank"] > b["rank"]))

	match hand_name:
		"Royal Flush":
			return "Royal Flush!"
		"Straight Flush":
			return "Straight Flush (%s-high)" % rank_name.call(cards[0]["rank"])
		"Four of a Kind":
			return "Four %s" % rank_plural.call(pairs[0]["rank"])
		"Full House":
			return "Full House: %s full of %s" % [rank_plural.call(pairs[0]["rank"]), rank_plural.call(pairs[1]["rank"])]
		"Flush":
			var suit_names := {"H": "Hearts", "D": "Diamonds", "C": "Clubs", "S": "Spades"}
			return "Flush (%s)" % suit_names.get(cards[0]["suit"], "?")
		"Straight":
			var min_r: int = cards[0]["rank"]
			var max_r: int = cards[0]["rank"]
			for c in cards:
				min_r = mini(min_r, c["rank"])
				max_r = maxi(max_r, c["rank"])
			return "Straight (%s-%s)" % [rank_name.call(min_r), rank_name.call(max_r)]
		"Three of a Kind":
			return "Three %s" % rank_plural.call(pairs[0]["rank"])
		"Two Pair":
			return "Two Pair: %s and %s" % [rank_plural.call(pairs[0]["rank"]), rank_plural.call(pairs[1]["rank"])]
		"Pair":
			return "Pair of %s" % rank_plural.call(pairs[0]["rank"])
		"Groundout":
			return "Groundout!"
		"Flyout":
			return "Flyout!"
		_:
			var highest: int = 0
			for c in cards:
				highest = maxi(highest, c["rank"])
			return "%s-high" % rank_name.call(highest)


static func _get_pair_rank(freq: Dictionary) -> int:
	var best_rank: int = 0
	var best_count: int = 0
	for rank_key in freq:
		var r: int = int(rank_key)
		var count: int = freq[rank_key]
		if count > best_count or (count == best_count and r > best_rank):
			best_rank = r
			best_count = count
	return best_rank


static func _apply_rank_quality(entry: Dictionary, pair_rank: int, hand_idx: int, strike_count: int = 0, game_state: Dictionary = {}) -> Dictionary:
	var bs = game_state.get("baseball_state", null)
	var pairs_played: int = bs.pairs_played_this_inning if bs else 0

	var out_chance: float = 0.0

	if hand_idx == 8:
		# Pair: 0.95 - (rank-2)*0.03 + penalties
		var two_strike_penalty: float = 0.10 if strike_count >= 2 else 0.0
		var pair_penalty: float = pairs_played * 0.25
		out_chance = 0.95 - (pair_rank - 2) * 0.03 + two_strike_penalty + pair_penalty
		if bs:
			bs.pairs_played_this_inning += 1
	elif hand_idx == 7:
		# Two Pair: 55% base + stacking penalty
		var pair_penalty: float = pairs_played * 0.12
		out_chance = 0.55 + pair_penalty
		if bs:
			bs.pairs_played_this_inning += 1
	elif hand_idx == 6:
		# Three of a Kind: 35%
		out_chance = 0.35
	elif hand_idx == 5 or hand_idx == 4:
		# Straight or Flush: 10%
		out_chance = 0.10

	out_chance = minf(0.95, maxf(0.05, out_chance))

	if randf() < out_chance:
		var out_type: String = "Flyout" if randf() < 0.40 else "Groundout"
		return {
			"hand_name": out_type,
			"outcome": out_type,
			"peanuts": 0,
			"mult": 1.0,
			"score": 0,
			"was_groundout": true,
			"original_hand": entry["hand_name"],
			"pair_rank": pair_rank,
		}

	# Survived — high pair rank bonus peanuts (Pair, Two Pair, Trips only)
	if pair_rank >= 10 and hand_idx >= 6:
		var bonus: int = pair_rank - 9
		var result: Dictionary = entry.duplicate()
		result["peanuts"] = entry["peanuts"] + bonus
		return result

	return {}


static func _is_straight(sorted_ranks: Array[int]) -> bool:
	if sorted_ranks.size() != 5:
		return false
	# Normal straight
	var is_normal: bool = true
	for i in range(1, sorted_ranks.size()):
		if sorted_ranks[i] != sorted_ranks[i - 1] + 1:
			is_normal = false
			break
	if is_normal:
		return true
	# Ace-low: A-2-3-4-5
	if sorted_ranks[4] == 14 and sorted_ranks[0] == 2 and sorted_ranks[1] == 3 and sorted_ranks[2] == 4 and sorted_ranks[3] == 5:
		return true
	return false

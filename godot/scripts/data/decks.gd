class_name Decks
extends RefCounted

const SUITS := ["H", "D", "C", "S"]
const RANKS := [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]  # 11=J, 12=Q, 13=K, 14=A

static func build_cards(suits: Array, ranks: Array) -> Array[Dictionary]:
	var cards: Array[Dictionary] = []
	for suit in suits:
		for rank in ranks:
			cards.append({"rank": rank, "suit": suit, "id": "%d%s" % [rank, suit]})
	return cards

static var DECK_CONFIGS: Dictionary = {
	"standard": {
		"name": "Standard",
		"description": "52-card deck - the classic.",
		"discards": 2,
		"hand_size": 7,
	},
	"no_face": {
		"name": "No Face",
		"description": "40 cards - no Jacks, Queens, or Kings. Straights are tighter.",
		"discards": 2,
		"hand_size": 7,
	},
	"double": {
		"name": "Double Deck",
		"description": "104 cards - two full decks shuffled together. Pairs everywhere.",
		"discards": 3,
		"hand_size": 7,
	},
	"all_hearts": {
		"name": "All Hearts",
		"description": "52 cards, all Hearts. Flushes guaranteed, suits won't help.",
		"discards": 2,
		"hand_size": 7,
	},
	"small_ball": {
		"name": "Small Ball",
		"description": "32 cards - only 7 and up. High-value hands, smaller deck.",
		"discards": 2,
		"hand_size": 7,
	},
}

static func build_deck(deck_id: String) -> Array[Dictionary]:
	match deck_id:
		"no_face":
			var ranks = RANKS.filter(func(r): return r < 11 or r == 14)
			return build_cards(SUITS, ranks)
		"double":
			var single = build_cards(SUITS, RANKS)
			var doubled: Array[Dictionary] = []
			doubled.append_array(single)
			doubled.append_array(single.duplicate(true))
			return doubled
		"all_hearts":
			var cards: Array[Dictionary] = []
			for i in 4:
				cards.append_array(build_cards(["H"], RANKS))
			return cards
		"small_ball":
			var ranks = RANKS.filter(func(r): return r >= 7)
			return build_cards(SUITS, ranks)
		_:  # standard
			return build_cards(SUITS, RANKS)

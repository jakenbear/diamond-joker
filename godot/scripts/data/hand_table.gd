class_name HandTable
extends RefCounted

# Hand rankings table.
# Index 0 = best hand, index 9 = worst.

static var TABLE: Array[Dictionary] = [
	{"hand_name": "Royal Flush",      "outcome": "Perfect Game",       "chips": 15, "mult": 20.0},
	{"hand_name": "Straight Flush",   "outcome": "Walk-Off",           "chips": 10, "mult": 10.0},
	{"hand_name": "Four of a Kind",   "outcome": "Inside-the-Park HR", "chips": 6,  "mult": 6.0},
	{"hand_name": "Full House",       "outcome": "RBI Double",         "chips": 3,  "mult": 2.5},
	{"hand_name": "Flush",            "outcome": "Grand Slam",         "chips": 5,  "mult": 5.0},
	{"hand_name": "Straight",         "outcome": "Home Run",           "chips": 4,  "mult": 4.0},
	{"hand_name": "Three of a Kind",  "outcome": "Triple",             "chips": 3,  "mult": 3.0},
	{"hand_name": "Two Pair",         "outcome": "Double",             "chips": 2,  "mult": 2.0},
	{"hand_name": "Pair",             "outcome": "Single",             "chips": 1,  "mult": 1.5},
	{"hand_name": "High Card",        "outcome": "Strikeout",          "chips": 0,  "mult": 1.0},
]

static func get_entry(index: int) -> Dictionary:
	return TABLE[index].duplicate()

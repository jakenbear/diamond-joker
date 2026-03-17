class_name HandTable
extends RefCounted

# Hand rankings table.
# Index 0 = best hand, index 9 = worst.

static var TABLE: Array[Dictionary] = [
	{"hand_name": "Royal Flush",      "outcome": "Home Run",  "peanuts": 15, "mult": 20.0},
	{"hand_name": "Straight Flush",   "outcome": "Home Run",  "peanuts": 10, "mult": 10.0, "roll_outcome": true},
	{"hand_name": "Four of a Kind",   "outcome": "Triple",    "peanuts": 6,  "mult": 6.0},
	{"hand_name": "Full House",       "outcome": "Double",    "peanuts": 3,  "mult": 2.5},
	{"hand_name": "Flush",            "outcome": "Double",    "peanuts": 5,  "mult": 5.0},
	{"hand_name": "Straight",         "outcome": "Home Run",           "peanuts": 4,  "mult": 4.0},
	{"hand_name": "Three of a Kind",  "outcome": "Triple",             "peanuts": 3,  "mult": 3.0},
	{"hand_name": "Two Pair",         "outcome": "Double",             "peanuts": 2,  "mult": 2.0},
	{"hand_name": "Pair",             "outcome": "Single",             "peanuts": 1,  "mult": 1.5},
	{"hand_name": "High Card",        "outcome": "Strikeout",          "peanuts": 0,  "mult": 1.0},
]

static func get_entry(index: int) -> Dictionary:
	return TABLE[index].duplicate()

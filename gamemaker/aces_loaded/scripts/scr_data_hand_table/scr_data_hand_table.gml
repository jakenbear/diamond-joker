/// @desc Hand rankings. Index 0 = best. Ladder must stay monotonic.

function data_hand_table() {
    static _table = undefined;
    if (_table != undefined) {
        return _table;
    }
    _table = [
        { hand_name: "Royal Flush", outcome: "Home Run", peanuts: 15, mult: 20, roll_outcome: false },
        { hand_name: "Straight Flush", outcome: "Home Run", peanuts: 10, mult: 10, roll_outcome: true },
        { hand_name: "Four of a Kind", outcome: "Home Run", peanuts: 10, mult: 6, roll_outcome: false },
        { hand_name: "Full House", outcome: "Home Run", peanuts: 8, mult: 5, roll_outcome: false },
        { hand_name: "Flush", outcome: "Double", peanuts: 5, mult: 5, roll_outcome: false },
        { hand_name: "Straight", outcome: "Double", peanuts: 4, mult: 4, roll_outcome: false },
        { hand_name: "Three of a Kind", outcome: "Double", peanuts: 3, mult: 3, roll_outcome: false },
        { hand_name: "Two Pair", outcome: "Single", peanuts: 2, mult: 2, roll_outcome: false },
        { hand_name: "Pair", outcome: "Single", peanuts: 1, mult: 1.5, roll_outcome: false },
        { hand_name: "High Card", outcome: "Strikeout", peanuts: 0, mult: 1, roll_outcome: false },
    ];
    return _table;
}

function data_hand_named(_name) {
    var _table = data_hand_table();
    for (var i = 0; i < array_length(_table); i++) {
        if (_table[i].hand_name == _name) {
            return _table[i];
        }
    }
    return _table[9];
}

function data_hand_copy(_idx) {
    var _src = data_hand_table()[_idx];
    return {
        hand_name: _src.hand_name,
        outcome: _src.outcome,
        peanuts: _src.peanuts,
        mult: _src.mult,
        roll_outcome: _src.roll_outcome,
        score: 0,
        played_description: "",
        pair_rank: 0,
        was_groundout: false,
        original_hand: "",
    };
}

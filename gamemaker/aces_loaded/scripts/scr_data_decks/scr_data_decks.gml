/// @desc Deck builders. Standard 52 is the live default.

function data_suits() {
    static _s = undefined;
    if (_s == undefined) {
        _s = ["H", "D", "C", "S"];
    }
    return _s;
}

function data_ranks() {
    static _r = undefined;
    if (_r == undefined) {
        _r = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    }
    return _r;
}

function data_build_cards(_suits, _ranks) {
    var _cards = [];
    for (var s = 0; s < array_length(_suits); s++) {
        for (var r = 0; r < array_length(_ranks); r++) {
            var _rank = _ranks[r];
            var _suit = _suits[s];
            array_push(_cards, {
                rank: _rank,
                suit: _suit,
                card_id: string(_rank) + _suit,
            });
        }
    }
    return _cards;
}

function data_deck_config(_deck_id) {
    return {
        deck_id: _deck_id,
        name: "Standard",
        hand_size: 7,
        discards: 2,
    };
}

function data_deck_build(_deck_id) {
    return data_build_cards(data_suits(), data_ranks());
}

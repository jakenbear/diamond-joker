/// @desc Batting deck variants. Discards stay count-based; only composition changes.

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

function data_deck_list() {
    static _list = undefined;
    if (_list == undefined) {
        _list = [
            { deck_id: "standard", name: "Standard", description: "52 cards — the classic." },
            { deck_id: "no_face", name: "No Face", description: "40 cards — no J/Q/K. Tighter straights." },
            { deck_id: "double", name: "Double", description: "104 cards — two decks. Pairs everywhere." },
            { deck_id: "all_hearts", name: "All Hearts", description: "52 hearts — flushes guaranteed." },
            { deck_id: "small_ball", name: "Small Ball", description: "32 cards — only 7 and up." },
        ];
    }
    return _list;
}

function data_deck_config(_deck_id) {
    var _list = data_deck_list();
    for (var i = 0; i < array_length(_list); i++) {
        if (_list[i].deck_id == _deck_id) {
            return {
                deck_id: _deck_id,
                name: _list[i].name,
                description: _list[i].description,
                hand_size: 7,
            };
        }
    }
    return { deck_id: "standard", name: "Standard", description: "52 cards — the classic.", hand_size: 7 };
}

function data_deck_build(_deck_id) {
    var _suits = data_suits();
    var _ranks = data_ranks();
    if (_deck_id == "no_face") {
        var _nf = [];
        for (var i = 0; i < array_length(_ranks); i++) {
            if (_ranks[i] < 11 || _ranks[i] == 14) {
                array_push(_nf, _ranks[i]);
            }
        }
        return data_build_cards(_suits, _nf);
    }
    if (_deck_id == "double") {
        var _a = data_build_cards(_suits, _ranks);
        var _b = data_build_cards(_suits, _ranks);
        array_copy(_a, array_length(_a), _b, 0, array_length(_b));
        return _a;
    }
    if (_deck_id == "all_hearts") {
        var _h = [];
        repeat (4) {
            var _chunk = data_build_cards(["H"], _ranks);
            array_copy(_h, array_length(_h), _chunk, 0, array_length(_chunk));
        }
        return _h;
    }
    if (_deck_id == "small_ball") {
        var _sb = [];
        for (var i = 0; i < array_length(_ranks); i++) {
            if (_ranks[i] >= 7) {
                array_push(_sb, _ranks[i]);
            }
        }
        return data_build_cards(_suits, _sb);
    }
    return data_build_cards(_suits, _ranks);
}

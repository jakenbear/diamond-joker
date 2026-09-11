/// @desc Deck + poker eval. classify is PURE. evaluate_hand may use RNG.

function cards_create(_deck_id) {
    if (_deck_id == undefined) {
        _deck_id = "standard";
    }
    var _cfg = data_deck_config(_deck_id);
    var _eng = {
        deck_id: _deck_id,
        deck: [],
        hand: [],
        discard_pile: [],
        hand_size: _cfg.hand_size,
    };
    cards_reset(_eng);
    return _eng;
}

function cards_reset(_eng) {
    _eng.deck = data_deck_build(_eng.deck_id);
    cards_shuffle(_eng.deck);
    _eng.hand = [];
    _eng.discard_pile = [];
}

function cards_shuffle(_arr) {
    for (var i = array_length(_arr) - 1; i > 0; i--) {
        var _j = irandom(i);
        var _tmp = _arr[i];
        _arr[i] = _arr[_j];
        _arr[_j] = _tmp;
    }
}

function cards_draw(_eng, _n) {
    for (var i = 0; i < _n && array_length(_eng.deck) > 0; i++) {
        var _last = array_length(_eng.deck) - 1;
        array_push(_eng.hand, _eng.deck[_last]);
        array_delete(_eng.deck, _last, 1);
    }
    return _eng.hand;
}

function cards_discard(_eng, _indices) {
    var _sorted = [];
    array_copy(_sorted, 0, _indices, 0, array_length(_indices));
    array_sort(_sorted, false);
    for (var i = 0; i < array_length(_sorted); i++) {
        var _idx = _sorted[i];
        if (_idx >= 0 && _idx < array_length(_eng.hand)) {
            array_push(_eng.discard_pile, _eng.hand[_idx]);
            array_delete(_eng.hand, _idx, 1);
        }
    }
    var _needed = _eng.hand_size - array_length(_eng.hand);
    cards_draw(_eng, _needed);
    if (array_length(_eng.hand) < _eng.hand_size && array_length(_eng.discard_pile) > 0) {
        array_copy(_eng.deck, array_length(_eng.deck), _eng.discard_pile, 0, array_length(_eng.discard_pile));
        _eng.discard_pile = [];
        cards_shuffle(_eng.deck);
        cards_draw(_eng, _eng.hand_size - array_length(_eng.hand));
    }
    return _eng.hand;
}

function cards_new_at_bat(_eng) {
    if (array_length(_eng.deck) < _eng.hand_size) {
        cards_reset(_eng);
    }
    _eng.hand = [];
    cards_draw(_eng, _eng.hand_size);
    return _eng.hand;
}

function cards_play(_eng, _selected_indices, _strike_count, _game_state) {
    var _played = [];
    for (var i = 0; i < array_length(_selected_indices); i++) {
        var _idx = _selected_indices[i];
        if (_idx >= 0 && _idx < array_length(_eng.hand)) {
            array_push(_played, _eng.hand[_idx]);
        }
    }
    var _result;
    if (array_length(_played) == 0) {
        _result = data_hand_copy(9);
        _result.score = 0;
    } else {
        _result = cards_evaluate_hand(_played, _strike_count, _game_state);
    }
    for (var i = 0; i < array_length(_eng.hand); i++) {
        array_push(_eng.discard_pile, _eng.hand[i]);
    }
    _eng.hand = [];
    return _result;
}

function cards_classify(_cards) {
    if (_cards == undefined || array_length(_cards) == 0) {
        return { hand_idx: 9, hand_name: "High Card", strength: 0, best_cards: [], pair_rank: 0 };
    }
    var _best = cards_best_subhand(_cards);
    var _freq = {};
    for (var i = 0; i < array_length(_best.best_cards); i++) {
        var _r = _best.best_cards[i].rank;
        var _key = string(_r);
        if (!variable_struct_exists(_freq, _key)) {
            _freq[$ _key] = 0;
        }
        _freq[$ _key] += 1;
    }
    var _table = data_hand_table();
    return {
        hand_idx: _best.hand_idx,
        hand_name: _table[_best.hand_idx].hand_name,
        strength: array_length(_table) - 1 - _best.hand_idx,
        best_cards: _best.best_cards,
        pair_rank: cards_pair_rank(_freq),
    };
}

function cards_evaluate_hand(_cards, _strike_count, _game_state) {
    if (_cards == undefined || array_length(_cards) == 0) {
        var _empty = data_hand_copy(9);
        _empty.score = 0;
        return _empty;
    }
    var _best = cards_best_subhand(_cards);
    var _hand_idx = _best.hand_idx;
    var _best_cards = _best.best_cards;
    var _freq = {};
    for (var i = 0; i < array_length(_best_cards); i++) {
        var _r = _best_cards[i].rank;
        var _key = string(_r);
        if (!variable_struct_exists(_freq, _key)) {
            _freq[$ _key] = 0;
        }
        _freq[$ _key] += 1;
    }
    var _pair_rank = cards_pair_rank(_freq);
    var _entry = data_hand_copy(_hand_idx);

    if (_entry.roll_outcome) {
        if (random(1) < 0.15) {
            _entry.outcome = "Triple";
        }
    }

    if (_hand_idx >= 3 && _hand_idx <= 8) {
        var _quality = cards_apply_rank_quality(_entry, _pair_rank, _hand_idx, _strike_count, _game_state);
        if (_quality != undefined) {
            _entry = _quality;
        }
    }

    _entry.played_description = cards_describe(_best_cards, _entry.hand_name);
    _entry.pair_rank = _pair_rank;
    _entry.score = round(_entry.peanuts * _entry.mult);
    return _entry;
}

function cards_success_chance(_hand_name, _pair_rank, _strike_count, _game_state) {
    var _names = ["Royal Flush", "Straight Flush", "Four of a Kind", "Full House", "Flush", "Straight", "Three of a Kind", "Two Pair", "Pair", "High Card"];
    var _hand_idx = -1;
    for (var i = 0; i < array_length(_names); i++) {
        if (_names[i] == _hand_name) {
            _hand_idx = i;
            break;
        }
    }
    if (_hand_idx < 0 || _hand_idx < 3) {
        return 100;
    }
    if (_hand_idx == 9) {
        return 0;
    }
    var _out = cards_out_chance(_hand_idx, _pair_rank, _strike_count, _game_state, false);
    return round((1 - _out) * 100);
}

function cards_out_chance(_hand_idx, _pair_rank, _strike_count, _game_state, _mutate) {
    var _bal = data_balance();
    var _pairs = 0;
    var _two = 0;
    var _trips = 0;
    var _straights = 0;
    var _flushes = 0;
    var _discards = 0;
    if (is_struct(_game_state)) {
        if (variable_struct_exists(_game_state, "pairs_played")) _pairs = _game_state.pairs_played;
        if (variable_struct_exists(_game_state, "two_pairs_played")) _two = _game_state.two_pairs_played;
        if (variable_struct_exists(_game_state, "trips_played")) _trips = _game_state.trips_played;
        if (variable_struct_exists(_game_state, "straights_played")) _straights = _game_state.straights_played;
        if (variable_struct_exists(_game_state, "flushes_played")) _flushes = _game_state.flushes_played;
        if (variable_struct_exists(_game_state, "discard_count")) _discards = _game_state.discard_count;
    }

    var _out = 0;
    if (_hand_idx == 8) {
        var _two_k = (_strike_count >= 2) ? _bal.two_strike_penalty : 0;
        _out = _bal.pair_out_base - (_pair_rank - 2) * _bal.pair_out_rank_scale + _two_k + _pairs * _bal.pair_degradation;
        if (_mutate && is_struct(_game_state)) _game_state.pairs_played += 1;
    } else if (_hand_idx == 7) {
        _out = _bal.two_pair_out_base + _two * _bal.two_pair_degradation;
        if (_mutate && is_struct(_game_state)) _game_state.two_pairs_played += 1;
    } else if (_hand_idx == 6) {
        _out = _bal.trips_out_base + _trips * _bal.trips_degradation;
        if (_mutate && is_struct(_game_state)) _game_state.trips_played += 1;
    } else if (_hand_idx == 5) {
        _out = _bal.straight_out_base + _straights * _bal.straight_degradation;
        if (_mutate && is_struct(_game_state)) _game_state.straights_played += 1;
    } else if (_hand_idx == 4) {
        _out = _bal.flush_out_base + _flushes * _bal.flush_degradation;
        if (_mutate && is_struct(_game_state)) _game_state.flushes_played += 1;
    } else if (_hand_idx == 3) {
        _out = _bal.full_house_out_base;
    }

    if (_discards == 0) {
        _out -= _bal.discard_bonus_0;
    } else if (_discards >= 2) {
        _out += _bal.discard_penalty_2 + max(0, _discards - 2) * _bal.discard_penalty_3_plus;
    }
    return min(_bal.out_max, max(_bal.out_min, _out));
}

function cards_apply_rank_quality(_entry, _pair_rank, _hand_idx, _strike_count, _game_state) {
    var _out = cards_out_chance(_hand_idx, _pair_rank, _strike_count, _game_state, true);
    if (random(1) < _out) {
        var _out_type = (random(1) < 0.40) ? "Flyout" : "Groundout";
        return {
            hand_name: _out_type,
            outcome: _out_type,
            peanuts: 0,
            mult: 1,
            score: 0,
            roll_outcome: false,
            played_description: "",
            pair_rank: _pair_rank,
            was_groundout: true,
            original_hand: _entry.hand_name,
        };
    }
    if (_pair_rank >= 10 && _hand_idx >= 6) {
        var _bonus = _pair_rank - 9;
        var _copy = data_hand_copy(_hand_idx);
        _copy.peanuts = _entry.peanuts + _bonus;
        _copy.outcome = _entry.outcome;
        _copy.hand_name = _entry.hand_name;
        return _copy;
    }
    return undefined;
}

function cards_pair_rank(_freq) {
    var _best_rank = 0;
    var _best_count = 0;
    var _names = variable_struct_get_names(_freq);
    for (var i = 0; i < array_length(_names); i++) {
        var _r = real(_names[i]);
        var _count = _freq[$ _names[i]];
        if (_count > _best_count || (_count == _best_count && _r > _best_rank)) {
            _best_rank = _r;
            _best_count = _count;
        }
    }
    return _best_rank;
}

function cards_rank_name(_r) {
    switch (_r) {
        case 11: return "J";
        case 12: return "Q";
        case 13: return "K";
        case 14: return "A";
        default: return string(_r);
    }
}

function cards_rank_plural(_r) {
    var _name = cards_rank_name(_r);
    if (_name == "6") {
        return "6es";
    }
    return _name + "s";
}

function cards_describe(_cards, _hand_name) {
    var _freq = {};
    for (var i = 0; i < array_length(_cards); i++) {
        var _key = string(_cards[i].rank);
        if (!variable_struct_exists(_freq, _key)) {
            _freq[$ _key] = 0;
        }
        _freq[$ _key] += 1;
    }
    var _pairs = [];
    var _names = variable_struct_get_names(_freq);
    for (var i = 0; i < array_length(_names); i++) {
        if (_freq[$ _names[i]] >= 2) {
            array_push(_pairs, { rank: real(_names[i]), count: _freq[$ _names[i]] });
        }
    }
    for (var i = 0; i < array_length(_pairs); i++) {
        for (var j = i + 1; j < array_length(_pairs); j++) {
            var _swap = false;
            if (_pairs[j].count > _pairs[i].count) {
                _swap = true;
            } else if (_pairs[j].count == _pairs[i].count && _pairs[j].rank > _pairs[i].rank) {
                _swap = true;
            }
            if (_swap) {
                var _tmp = _pairs[i];
                _pairs[i] = _pairs[j];
                _pairs[j] = _tmp;
            }
        }
    }

    if (_hand_name == "Royal Flush") return "Royal Flush!";
    if (_hand_name == "Straight Flush") return "Straight Flush (" + cards_rank_name(_cards[0].rank) + "-high)";
    if (_hand_name == "Four of a Kind") return "Four " + cards_rank_plural(_pairs[0].rank);
    if (_hand_name == "Full House") return "Full House: " + cards_rank_plural(_pairs[0].rank) + " full of " + cards_rank_plural(_pairs[1].rank);
    if (_hand_name == "Flush") {
        var _suit_label = "Hearts";
        if (_cards[0].suit == "D") _suit_label = "Diamonds";
        else if (_cards[0].suit == "C") _suit_label = "Clubs";
        else if (_cards[0].suit == "S") _suit_label = "Spades";
        return "Flush (" + _suit_label + ")";
    }
    if (_hand_name == "Straight") {
        var _lo = 99;
        var _hi = 0;
        for (var i = 0; i < array_length(_cards); i++) {
            _lo = min(_lo, _cards[i].rank);
            _hi = max(_hi, _cards[i].rank);
        }
        return "Straight (" + cards_rank_name(_lo) + "-" + cards_rank_name(_hi) + ")";
    }
    if (_hand_name == "Three of a Kind") return "Three " + cards_rank_plural(_pairs[0].rank);
    if (_hand_name == "Two Pair") return "Two Pair: " + cards_rank_plural(_pairs[0].rank) + " and " + cards_rank_plural(_pairs[1].rank);
    if (_hand_name == "Pair") return "Pair of " + cards_rank_plural(_pairs[0].rank);
    if (_hand_name == "Groundout") return "Groundout!";
    if (_hand_name == "Flyout") return "Flyout!";
    var _high = 0;
    for (var i = 0; i < array_length(_cards); i++) {
        _high = max(_high, _cards[i].rank);
    }
    return cards_rank_name(_high) + "-high";
}

function cards_is_straight(_sorted) {
    if (array_length(_sorted) != 5) {
        return false;
    }
    var _normal = true;
    for (var i = 1; i < 5; i++) {
        if (_sorted[i] != _sorted[i - 1] + 1) {
            _normal = false;
            break;
        }
    }
    if (_normal) {
        return true;
    }
    return (_sorted[4] == 14 && _sorted[0] == 2 && _sorted[1] == 3 && _sorted[2] == 4 && _sorted[3] == 5);
}

function cards_classify_subset(_subset) {
    var _sn = array_length(_subset);
    var _ranks = array_create(_sn);
    var _suits = array_create(_sn);
    for (var i = 0; i < _sn; i++) {
        _ranks[i] = _subset[i].rank;
        _suits[i] = _subset[i].suit;
    }
    array_sort(_ranks, true);
    var _is_flush = false;
    if (_sn == 5) {
        _is_flush = true;
        for (var i = 1; i < 5; i++) {
            if (_suits[i] != _suits[0]) {
                _is_flush = false;
                break;
            }
        }
    }
    var _is_straight = (_sn == 5) && cards_is_straight(_ranks);
    var _freq = {};
    for (var i = 0; i < _sn; i++) {
        var _key = string(_ranks[i]);
        if (!variable_struct_exists(_freq, _key)) {
            _freq[$ _key] = 0;
        }
        _freq[$ _key] += 1;
    }
    var _counts = [];
    var _keys = variable_struct_get_names(_freq);
    for (var i = 0; i < array_length(_keys); i++) {
        array_push(_counts, _freq[$ _keys[i]]);
    }
    array_sort(_counts, false);

    if (_is_flush && _is_straight && _ranks[0] == 10 && _ranks[4] == 14) return 0;
    if (_is_flush && _is_straight) return 1;
    if (array_length(_counts) > 0 && _counts[0] == 4) return 2;
    if (array_length(_counts) > 1 && _counts[0] == 3 && _counts[1] == 2) return 3;
    if (_is_flush) return 4;
    if (_is_straight) return 5;
    if (array_length(_counts) > 0 && _counts[0] == 3) return 6;
    if (array_length(_counts) > 1 && _counts[0] == 2 && _counts[1] == 2) return 7;
    if (array_length(_counts) > 0 && _counts[0] == 2) return 8;
    return 9;
}

function cards_best_subhand(_cards) {
    var _n = array_length(_cards);
    var _best_idx = cards_classify_subset(_cards);
    var _best_cards = _cards;
    if (_best_idx <= 1 || _n <= 2) {
        return { hand_idx: _best_idx, best_cards: _best_cards };
    }

    for (var _sz = _n - 1; _sz >= 1; _sz--) {
        if (_best_idx <= 1) {
            break;
        }
        var _indices = array_create(_sz);
        for (var i = 0; i < _sz; i++) {
            _indices[i] = i;
        }
        while (true) {
            var _subset = array_create(_sz);
            for (var i = 0; i < _sz; i++) {
                _subset[i] = _cards[_indices[i]];
            }
            var _idx = cards_classify_subset(_subset);
            if (_idx < _best_idx) {
                _best_idx = _idx;
                _best_cards = _subset;
            }
            var _i = _sz - 1;
            while (_i >= 0 && _indices[_i] == _n - _sz + _i) {
                _i -= 1;
            }
            if (_i < 0) {
                break;
            }
            _indices[_i] += 1;
            for (var _j = _i + 1; _j < _sz; _j++) {
                _indices[_j] = _indices[_j - 1] + 1;
            }
        }
    }
    return { hand_idx: _best_idx, best_cards: _best_cards };
}

function cards_copy(_cards) {
    var _out = [];
    for (var i = 0; i < array_length(_cards); i++) {
        var _c = _cards[i];
        array_push(_out, { rank: _c.rank, suit: _c.suit, card_id: _c.card_id });
    }
    return _out;
}

function cards_ranks_changed(_a, _b) {
    var _n = min(array_length(_a), array_length(_b));
    for (var i = 0; i < _n; i++) {
        if (_a[i].rank != _b[i].rank || _a[i].suit != _b[i].suit) {
            return true;
        }
    }
    return false;
}

function cards_hand_hint(_cards) {
    var _n = array_length(_cards);
    if (_n < 3) {
        return "";
    }
    var _freq = {};
    var _suits = {};
    var _ranks = [];
    for (var i = 0; i < _n; i++) {
        var _rk = string(_cards[i].rank);
        if (!variable_struct_exists(_freq, _rk)) {
            _freq[$ _rk] = 0;
        }
        _freq[$ _rk] += 1;
        var _sk = _cards[i].suit;
        if (!variable_struct_exists(_suits, _sk)) {
            _suits[$ _sk] = 0;
        }
        _suits[$ _sk] += 1;
        array_push(_ranks, _cards[i].rank);
    }
    var _keys = variable_struct_get_names(_freq);
    for (var i = 0; i < array_length(_keys); i++) {
        if (_freq[$ _keys[i]] >= 2) {
            return "";
        }
    }
    if (_n < 5) {
        var _max_suit = 0;
        var _skeys = variable_struct_get_names(_suits);
        for (var i = 0; i < array_length(_skeys); i++) {
            _max_suit = max(_max_suit, _suits[$ _skeys[i]]);
        }
        if (_max_suit >= 3) {
            return string(_max_suit) + "/5 to a Flush...";
        }
        array_sort(_ranks, true);
        var _uniq = [];
        for (var i = 0; i < array_length(_ranks); i++) {
            if (i == 0 || _ranks[i] != _ranks[i - 1]) {
                array_push(_uniq, _ranks[i]);
            }
        }
        var _run = 1;
        var _max_run = 1;
        for (var i = 1; i < array_length(_uniq); i++) {
            if (_uniq[i] == _uniq[i - 1] + 1) {
                _run += 1;
                _max_run = max(_max_run, _run);
            } else {
                _run = 1;
            }
        }
        if (_max_run >= 3) {
            return string(_max_run) + "/5 to a Straight...";
        }
    }
    return "";
}

function cards_sprite_name(_card) {
    var _s = string_lower(_card.suit);
    var _r;
    switch (_card.rank) {
        case 11: _r = "j"; break;
        case 12: _r = "q"; break;
        case 13: _r = "k"; break;
        case 14: _r = "a"; break;
        default: _r = string(_card.rank);
    }
    return "spr_card_" + _s + _r;
}

function cards_suit_order(_suit) {
    switch (_suit) {
        case "H": return 0;
        case "D": return 1;
        case "C": return 2;
        case "S": return 3;
        default: return 4;
    }
}

function cards_display_order(_hand, _mode) {
    var _n = array_length(_hand);
    var _idx = array_create(_n);
    for (var i = 0; i < _n; i++) {
        _idx[i] = i;
    }
    if (_mode != "rank" && _mode != "suit") {
        return _idx;
    }
    for (var i = 0; i < _n; i++) {
        for (var j = i + 1; j < _n; j++) {
            var _ca = _hand[_idx[i]];
            var _cb = _hand[_idx[j]];
            var _swap = false;
            if (_mode == "rank") {
                _swap = (_ca.rank > _cb.rank);
            } else {
                var _sd = cards_suit_order(_ca.suit) - cards_suit_order(_cb.suit);
                _swap = (_sd > 0) || (_sd == 0 && _ca.rank > _cb.rank);
            }
            if (_swap) {
                var _tmp = _idx[i];
                _idx[i] = _idx[j];
                _idx[j] = _tmp;
            }
        }
    }
    return _idx;
}

function cards_selected_from_flags(_flags) {
    var _out = [];
    for (var i = 0; i < array_length(_flags); i++) {
        if (_flags[i]) {
            array_push(_out, i);
        }
    }
    return _out;
}

/// @desc Hold'em pitching showdown. Uses cards_classify only — never evaluate_hand.

function sd_suits() {
    return ["H", "D", "C", "S"];
}

function sd_card(_rank, _suit) {
    return { rank: _rank, suit: _suit, card_id: _suit + string(_rank) + string(irandom(99999)) };
}

function sd_copy_card(_c) {
    return { rank: _c.rank, suit: _c.suit, card_id: _c.card_id };
}

function sd_generate_deck(_velocity) {
    var _floor = max(2, round(2 + (_velocity - 1) * 0.55));
    var _pool = [];
    var _suits = sd_suits();
    for (var _r = _floor; _r <= 14; _r++) {
        for (var i = 0; i < 4; i++) {
            array_push(_pool, sd_card(_r, _suits[i]));
        }
    }
    var _n = min(20, array_length(_pool));
    for (var i = 0; i < _n; i++) {
        var _j = i + irandom(array_length(_pool) - 1 - i);
        var _tmp = _pool[i];
        _pool[i] = _pool[_j];
        _pool[_j] = _tmp;
    }
    var _out = [];
    array_copy(_out, 0, _pool, 0, _n);
    return _out;
}

function sd_shuffle(_arr) {
    for (var i = array_length(_arr) - 1; i > 0; i--) {
        var _j = irandom(i);
        var _tmp = _arr[i];
        _arr[i] = _arr[_j];
        _arr[_j] = _tmp;
    }
}

function sd_pop(_arr) {
    var _last = array_length(_arr) - 1;
    if (_last < 0) {
        return undefined;
    }
    var _c = _arr[_last];
    array_delete(_arr, _last, 1);
    return _c;
}

function sd_create(_pitcher) {
    return {
        pitcher: _pitcher,
        pitcher_deck: [],
        batter_deck: [],
        pitcher_hole: [],
        batter_hole: [],
        community: [],
        stage: "pre-flop",
        pitches_used: [],
        locked: [],
        face_down: [],
        planted: undefined,
        revealed_batter: [],
        stamina_drained: 0,
        outs: 0,
        inning: 1,
        pitcher_lead_by: 0,
        bases_occupied: false,
    };
}

function sd_start(_sd, _batter, _outs, _inning, _lead, _occupied) {
    _sd.outs = _outs;
    _sd.inning = _inning;
    _sd.pitcher_lead_by = _lead;
    _sd.bases_occupied = _occupied;
    _sd.pitcher_deck = sd_generate_deck(_sd.pitcher.velocity);
    var _bvel = 5;
    if (is_struct(_batter)) {
        _bvel = _batter.contact * 0.6 + _batter.power * 0.4;
    }
    _sd.batter_deck = sd_generate_deck(_bvel);
    sd_shuffle(_sd.pitcher_deck);
    sd_shuffle(_sd.batter_deck);
    _sd.pitcher_hole = [sd_pop(_sd.pitcher_deck), sd_pop(_sd.pitcher_deck)];
    _sd.batter_hole = [sd_pop(_sd.batter_deck), sd_pop(_sd.batter_deck)];
    _sd.community = [];
    _sd.stage = "pre-flop";
    _sd.pitches_used = [];
    _sd.locked = [];
    _sd.face_down = [];
    _sd.planted = undefined;
    _sd.revealed_batter = [];
    _sd.stamina_drained = 0;
}

function sd_deal_one(_sd) {
    if (_sd.planted != undefined) {
        var _c = _sd.planted;
        _sd.planted = undefined;
        return _c;
    }
    sd_replenish(_sd);
    return sd_pop(_sd.pitcher_deck);
}

function sd_deal_flop(_sd) {
    for (var i = 0; i < 3; i++) {
        array_push(_sd.community, sd_deal_one(_sd));
    }
    _sd.stage = "flop";
}

function sd_deal_turn(_sd) {
    array_push(_sd.community, sd_deal_one(_sd));
    _sd.stage = "turn";
}

function sd_deal_river(_sd) {
    array_push(_sd.community, sd_deal_one(_sd));
    _sd.stage = "river";
}

function sd_tiebreak(_cls) {
    var _freq = {};
    for (var i = 0; i < array_length(_cls.best_cards); i++) {
        var _key = string(_cls.best_cards[i].rank);
        if (!variable_struct_exists(_freq, _key)) {
            _freq[$ _key] = 0;
        }
        _freq[$ _key] += 1;
    }
    var _groups = [];
    var _names = variable_struct_get_names(_freq);
    for (var i = 0; i < array_length(_names); i++) {
        array_push(_groups, { rank: real(_names[i]), count: _freq[$ _names[i]] });
    }
    array_sort(_groups, function(_a, _b) {
        if (_a.count != _b.count) {
            return _b.count - _a.count;
        }
        return _b.rank - _a.rank;
    });
    var _tb = [];
    for (var i = 0; i < array_length(_groups); i++) {
        array_push(_tb, _groups[i].rank);
    }
    return _tb;
}

function sd_compare(_a, _b) {
    if (_a.strength != _b.strength) {
        return _a.strength - _b.strength;
    }
    var _len = max(array_length(_a.tiebreak), array_length(_b.tiebreak));
    for (var i = 0; i < _len; i++) {
        var _ar = (i < array_length(_a.tiebreak)) ? _a.tiebreak[i] : 0;
        var _br = (i < array_length(_b.tiebreak)) ? _b.tiebreak[i] : 0;
        if (_ar != _br) {
            return _ar - _br;
        }
    }
    return 0;
}

function sd_power(_hand) {
    var _within = 0;
    var _tb = _hand.tiebreak;
    for (var i = 0; i < 5; i++) {
        var _v = (i < array_length(_tb)) ? _tb[i] : 0;
        _within = _within * 15 + _v;
    }
    return (_hand.strength * 1000000) + _within;
}

function sd_combinations(_arr, _k) {
    var _results = [];
    var _n = array_length(_arr);
    if (_n < _k) {
        array_push(_results, _arr);
        return _results;
    }
    var _idx = array_create(_k);
    for (var i = 0; i < _k; i++) {
        _idx[i] = i;
    }
    while (true) {
        var _combo = [];
        for (var i = 0; i < _k; i++) {
            array_push(_combo, _arr[_idx[i]]);
        }
        array_push(_results, _combo);
        var _i = _k - 1;
        while (_i >= 0 && _idx[_i] == _n - _k + _i) {
            _i -= 1;
        }
        if (_i < 0) {
            break;
        }
        _idx[_i] += 1;
        for (var _j = _i + 1; _j < _k; _j++) {
            _idx[_j] = _idx[_j - 1] + 1;
        }
    }
    return _results;
}

function sd_best_hand(_hole, _community) {
    var _all = [];
    array_copy(_all, 0, _hole, 0, array_length(_hole));
    array_copy(_all, array_length(_all), _community, 0, array_length(_community));
    if (array_length(_all) == 0) {
        return { hand_name: "High Card", strength: 0, score: 0, cards: [], pair_rank: 0, tiebreak: [], high: 0 };
    }
    var _combos = (array_length(_all) < 5) ? [_all] : sd_combinations(_all, 5);
    var _best = undefined;
    for (var i = 0; i < array_length(_combos); i++) {
        var _c = cards_classify(_combos[i]);
        var _cand = {
            hand_name: _c.hand_name,
            strength: _c.strength,
            pair_rank: _c.pair_rank,
            tiebreak: sd_tiebreak(_c),
            cards: _combos[i],
        };
        if (_best == undefined || sd_compare(_cand, _best) > 0) {
            _best = _cand;
        }
    }
    var _table = data_hand_table();
    _best.score = 0;
    for (var i = 0; i < array_length(_table); i++) {
        if (_table[i].hand_name == _best.hand_name) {
            _best.score = round(_table[i].peanuts * _table[i].mult);
            break;
        }
    }
    _best.high = 0;
    for (var i = 0; i < array_length(_all); i++) {
        _best.high = max(_best.high, _all[i].rank);
    }
    return _best;
}

function sd_trait_bonus(_sd) {
    var _bonus = 0;
    var _traits = is_array(_sd.pitcher.traits) ? _sd.pitcher.traits : [];
    for (var i = 0; i < array_length(_traits); i++) {
        var _id = is_struct(_traits[i]) ? _traits[i].id : _traits[i];
        switch (_id) {
            case "heater": _bonus += 3; break;
            case "painted_corner": _bonus += 2; break;
            case "changeup": _bonus += 1; break;
            case "slider": _bonus += (_sd.outs == 2) ? 2 : 1; break;
            case "intimidation":
                if (_sd.outs == 0) _bonus += 3;
                else if (_sd.outs == 2) _bonus -= 2;
                break;
            case "closers_instinct":
                if (_sd.inning >= 7 && _sd.inning <= 9) _bonus += 5;
                break;
            case "curveball":
                if (random(1) < 0.3) {
                    var _idx = (_sd.batter_hole[0].rank >= _sd.batter_hole[1].rank) ? 0 : 1;
                    _sd.batter_hole[_idx].rank = max(2, _sd.batter_hole[_idx].rank - 3);
                }
                break;
            case "knuckleball":
                if (array_length(_sd.community) > 0) {
                    var _ci = irandom(array_length(_sd.community) - 1);
                    var _suits = sd_suits();
                    _sd.community[_ci].suit = _suits[irandom(3)];
                }
                break;
            case "cutter": _bonus += 1; break;
            case "sinkerballer": _bonus += 2; break;
            case "junkballer": _bonus += 2; break;
            case "frontline_ace": _bonus += 2; break;
            case "fireballer":
                if (_sd.inning >= 1 && _sd.inning <= 3) _bonus += 2;
                break;
            case "splitter":
                if (_sd.outs == 2) _bonus += 2;
                break;
            case "bulldog":
                if (_sd.pitcher_lead_by >= 1) _bonus += 3;
                break;
            case "escape_artist":
                _bonus += _sd.bases_occupied ? 4 : 1;
                break;
            case "rally_killer":
                if (_sd.bases_occupied) _bonus += 3;
                break;
            case "sinker":
                if (random(1) < 0.3) {
                    var _idx = (_sd.batter_hole[0].rank >= _sd.batter_hole[1].rank) ? 0 : 1;
                    _sd.batter_hole[_idx].rank = max(2, _sd.batter_hole[_idx].rank - 2);
                }
                break;
            case "backfoot_slider":
                if (random(1) < 0.3 && array_length(_sd.community) > 0) {
                    var _ci = irandom(array_length(_sd.community) - 1);
                    var _suits = sd_suits();
                    _sd.community[_ci].suit = _suits[irandom(3)];
                }
                break;
            case "wild_thing":
                if (random(1) < 0.5 && array_length(_sd.community) >= 2) {
                    var _a = irandom(array_length(_sd.community) - 1);
                    var _b = irandom(array_length(_sd.community) - 2);
                    if (_b >= _a) _b += 1;
                    var _tmp = _sd.community[_a].rank;
                    _sd.community[_a].rank = _sd.community[_b].rank;
                    _sd.community[_b].rank = _tmp;
                }
                break;
        }
    }
    return _bonus;
}

function sd_pitcher_outcome(_margin) {
    if (_margin >= 10) {
        return "Strikeout";
    }
    if (_margin >= 5) {
        if (random(1) < 0.3) {
            return "Strikeout";
        }
        return (random(1) < 0.5) ? "Flyout" : "Groundout";
    }
    return (random(1) < 0.5) ? "Flyout" : "Groundout";
}

function sd_batter_outcome(_margin) {
    if (_margin >= 15) {
        return "Home Run";
    }
    if (_margin >= 8) {
        return (random(1) < 0.15) ? "Triple" : "Double";
    }
    if (_margin >= 3) {
        return "Double";
    }
    return "Single";
}

function sd_resolve(_sd) {
    var _p_hand = sd_best_hand(_sd.pitcher_hole, _sd.community);
    var _b_hand = sd_best_hand(_sd.batter_hole, _sd.community);
    var _trait = sd_trait_bonus(_sd);
    var _tp = clamp(_trait * 6000, -240624, 240624);
    var _pp = sd_power(_p_hand) + _tp;
    var _bp = sd_power(_b_hand);
    var _winner;
    if (_pp > _bp) {
        _winner = "pitcher";
    } else if (_bp > _pp) {
        _winner = "batter";
    } else {
        var _ph = max(_sd.pitcher_hole[0].rank, _sd.pitcher_hole[1].rank);
        var _bh = max(_sd.batter_hole[0].rank, _sd.batter_hole[1].rank);
        _winner = (_ph >= _bh) ? "pitcher" : "batter";
    }
    var _margin = abs((_p_hand.score + _trait) - _b_hand.score);
    var _outcome = (_winner == "pitcher") ? sd_pitcher_outcome(_margin) : sd_batter_outcome(_margin);
    return {
        winner: _winner,
        pitcher_hand: _p_hand,
        batter_hand: _b_hand,
        outcome: _outcome,
        is_out: (_winner == "pitcher"),
        margin: _margin,
        trait_bonus: _trait,
    };
}

function sd_replenish(_sd) {
    if (array_length(_sd.pitcher_deck) == 0) {
        _sd.pitcher_deck = sd_generate_deck(_sd.pitcher.velocity);
        sd_shuffle(_sd.pitcher_deck);
    }
}

function sd_used(_sd, _key) {
    for (var i = 0; i < array_length(_sd.pitches_used); i++) {
        if (_sd.pitches_used[i] == _key) {
            return true;
        }
    }
    return false;
}

function sd_has_lock(_sd, _idx) {
    for (var i = 0; i < array_length(_sd.locked); i++) {
        if (_sd.locked[i] == _idx) {
            return true;
        }
    }
    return false;
}

function sd_stamina_cost(_key) {
    switch (_key) {
        case "fastball": return 0.06;
        case "breaking": return 0.04;
        case "changeup": return 0.02;
        case "slider": return 0.03;
        case "cutter": return 0.04;
        case "curveball": return 0.04;
        case "sinker": return 0.03;
        case "splitter": return 0.05;
        case "twoseam": return 0.03;
        case "knuckle": return 0.01;
        case "screwball": return 0.05;
        case "palmball": return 0.02;
        default: return 0.03;
    }
}

function sd_apply_pitch(_sd, _key, _opts) {
    if (sd_used(_sd, _key)) {
        return { success: false, reason: "Already used this pitch" };
    }
    if (!is_struct(_opts)) {
        _opts = {};
    }
    var _targeted = (_key == "slider" || _key == "cutter" || _key == "splitter" || _key == "twoseam" || _key == "breaking");
    if (_targeted && variable_struct_exists(_opts, "targetIndex")) {
        var _misfire = max(0, (6 - _sd.pitcher.control) * 0.08);
        if (random(1) < _misfire && array_length(_sd.community) > 1) {
            var _nt = irandom(array_length(_sd.community) - 1);
            if (_nt == _opts.targetIndex && array_length(_sd.community) > 1) {
                _nt = (_nt + 1) mod array_length(_sd.community);
            }
            _opts.targetIndex = _nt;
            _opts.misfired = true;
        }
    }
    var _result;
    switch (_key) {
        case "fastball": _result = sd_fx_fastball(_sd, _opts); break;
        case "changeup": _result = sd_fx_changeup(_sd); break;
        case "slider": _result = sd_fx_slider(_sd, _opts); break;
        case "cutter": _result = sd_fx_cutter(_sd, _opts); break;
        case "curveball": _result = sd_fx_curveball(_sd); break;
        case "sinker": _result = sd_fx_sinker(_sd); break;
        case "splitter": _result = sd_fx_splitter(_sd, _opts); break;
        case "twoseam": _result = sd_fx_twoseam(_sd, _opts); break;
        case "knuckle": _result = sd_fx_knuckle(_sd); break;
        case "screwball": _result = sd_fx_screwball(_sd); break;
        case "palmball": _result = sd_fx_palmball(_sd); break;
        case "breaking": _result = sd_fx_breaking(_sd, _opts); break;
        default: return { success: false, reason: "Unknown pitch" };
    }
    if (_result.success) {
        array_push(_sd.pitches_used, _key);
        _sd.stamina_drained += sd_stamina_cost(_key);
        if (variable_struct_exists(_opts, "misfired") && _opts.misfired) {
            _result.misfired = true;
        }
    }
    return _result;
}

function sd_fx_fastball(_sd, _opts) {
    sd_replenish(_sd);
    var _sorted = [];
    array_copy(_sorted, 0, _sd.pitcher_deck, 0, array_length(_sd.pitcher_deck));
    array_sort(_sorted, function(_a, _b) { return _b.rank - _a.rank; });
    var _top_n = max(1, ceil(array_length(_sorted) * 0.3));
    var _drawn = _sorted[irandom(_top_n - 1)];
    for (var i = 0; i < array_length(_sd.pitcher_deck); i++) {
        if (_sd.pitcher_deck[i].card_id == _drawn.card_id) {
            array_delete(_sd.pitcher_deck, i, 1);
            break;
        }
    }
    var _swap = variable_struct_exists(_opts, "swapIndex") ? _opts.swapIndex : 0;
    var _old = _sd.pitcher_hole[_swap];
    _sd.pitcher_hole[_swap] = _drawn;
    return { success: true, swapped: _old, drawn: _drawn };
}

function sd_fx_changeup(_sd) {
    var _idx = irandom(array_length(_sd.batter_hole) - 1);
    array_push(_sd.revealed_batter, _idx);
    return { success: true, revealed_index: _idx };
}

function sd_fx_slider(_sd, _opts) {
    var _t = variable_struct_exists(_opts, "targetIndex") ? _opts.targetIndex : 0;
    if (_t < 0 || _t >= array_length(_sd.community)) {
        return { success: false, reason: "Invalid target" };
    }
    if (sd_has_lock(_sd, _t)) {
        return { success: false, reason: "Card is locked" };
    }
    sd_replenish(_sd);
    _sd.community[_t] = sd_pop(_sd.pitcher_deck);
    return { success: true };
}

function sd_fx_cutter(_sd, _opts) {
    var _t = variable_struct_exists(_opts, "targetIndex") ? _opts.targetIndex : 0;
    array_push(_sd.locked, _t);
    return { success: true };
}

function sd_fx_curveball(_sd) {
    if (random(1) < (_sd.pitcher.control / 12)) {
        var _idx = (_sd.batter_hole[0].rank >= _sd.batter_hole[1].rank) ? 0 : 1;
        _sd.batter_hole[_idx].rank = max(2, _sd.batter_hole[_idx].rank - 2);
        return { success: true, downgraded: true };
    }
    if (array_length(_sd.community) > 0) {
        _sd.community[0].rank = 14;
    }
    return { success: true, downgraded: false, misfired: true };
}

function sd_fx_sinker(_sd) {
    for (var i = 0; i < array_length(_sd.community); i++) {
        _sd.community[i].rank = max(2, _sd.community[i].rank - 1);
    }
    return { success: true };
}

function sd_fx_splitter(_sd, _opts) {
    var _t = variable_struct_exists(_opts, "targetIndex") ? _opts.targetIndex : 0;
    if (_t < 0 || _t >= array_length(_sd.community)) {
        return { success: false, reason: "Invalid target" };
    }
    if (sd_has_lock(_sd, _t)) {
        return { success: false, reason: "Card is locked" };
    }
    array_delete(_sd.community, _t, 1);
    var _nl = [];
    for (var i = 0; i < array_length(_sd.locked); i++) {
        if (_sd.locked[i] == _t) {
            continue;
        }
        array_push(_nl, (_sd.locked[i] > _t) ? _sd.locked[i] - 1 : _sd.locked[i]);
    }
    _sd.locked = _nl;
    var _nf = [];
    for (var i = 0; i < array_length(_sd.face_down); i++) {
        if (_sd.face_down[i] == _t) {
            continue;
        }
        array_push(_nf, (_sd.face_down[i] > _t) ? _sd.face_down[i] - 1 : _sd.face_down[i]);
    }
    _sd.face_down = _nf;
    return { success: true };
}

function sd_fx_twoseam(_sd, _opts) {
    var _t = variable_struct_exists(_opts, "targetIndex") ? _opts.targetIndex : 0;
    if (_t < 0 || _t >= array_length(_sd.community)) {
        return { success: false, reason: "Invalid target" };
    }
    var _bi = irandom(array_length(_sd.batter_hole) - 1);
    var _tmp = _sd.community[_t];
    _sd.community[_t] = _sd.batter_hole[_bi];
    _sd.batter_hole[_bi] = _tmp;
    return { success: true };
}

function sd_fx_knuckle(_sd) {
    if (array_length(_sd.community) == 0) {
        return { success: false, reason: "No community cards" };
    }
    for (var i = 0; i < array_length(_sd.community); i++) {
        _sd.community[i].rank = 2 + irandom(12);
    }
    return { success: true };
}

function sd_fx_screwball(_sd) {
    var _idx = irandom(array_length(_sd.batter_hole) - 1);
    var _suits = sd_suits();
    _sd.batter_hole[_idx] = sd_card(2 + irandom(12), _suits[irandom(3)]);
    return { success: true };
}

function sd_fx_palmball(_sd) {
    sd_replenish(_sd);
    var _best_i = 0;
    for (var i = 1; i < array_length(_sd.pitcher_deck); i++) {
        if (_sd.pitcher_deck[i].rank > _sd.pitcher_deck[_best_i].rank) {
            _best_i = i;
        }
    }
    _sd.planted = _sd.pitcher_deck[_best_i];
    array_delete(_sd.pitcher_deck, _best_i, 1);
    return { success: true };
}

function sd_fx_breaking(_sd, _opts) {
    var _t = variable_struct_exists(_opts, "targetIndex") ? _opts.targetIndex : 0;
    if (_t < 0 || _t >= array_length(_sd.community)) {
        return { success: false, reason: "Invalid target" };
    }
    array_push(_sd.face_down, _t);
    return { success: true };
}

function sd_is_targeted(_key) {
    return (_key == "fastball" || _key == "slider" || _key == "cutter" || _key == "splitter" || _key == "twoseam" || _key == "breaking");
}

function sd_target_domain(_key) {
    if (_key == "fastball") {
        return "hole";
    }
    if (_key == "slider" || _key == "cutter" || _key == "splitter" || _key == "twoseam" || _key == "breaking") {
        return "community";
    }
    return "";
}

function sd_visible_batter_cards(_sd) {
    var _out = [];
    for (var i = 0; i < array_length(_sd.batter_hole); i++) {
        if (sd_revealed(_sd, i)) {
            array_push(_out, _sd.batter_hole[i]);
        }
    }
    return _out;
}

function sd_opp_visible_hand(_sd) {
    return sd_best_hand(sd_visible_batter_cards(_sd), _sd.community);
}

function sd_suggested_target(_sd, _key) {
    if (_key == "fastball") {
        return (_sd.pitcher_hole[0].rank <= _sd.pitcher_hole[1].rank) ? 0 : 1;
    }
    if (_key != "slider" && _key != "cutter" && _key != "splitter" && _key != "twoseam" && _key != "breaking") {
        return -1;
    }
    var _best = -1;
    var _rank = -1;
    for (var i = 0; i < array_length(_sd.community); i++) {
        var _locked = sd_has_lock(_sd, i);
        var _down = false;
        for (var j = 0; j < array_length(_sd.face_down); j++) {
            if (_sd.face_down[j] == i) {
                _down = true;
            }
        }
        if (!_locked && !_down && _sd.community[i].rank > _rank) {
            _rank = _sd.community[i].rank;
            _best = i;
        }
    }
    return _best;
}

function sd_revealed(_sd, _idx) {
    for (var i = 0; i < array_length(_sd.revealed_batter); i++) {
        if (_sd.revealed_batter[i] == _idx) {
            return true;
        }
    }
    return false;
}

function sd_face_down(_sd, _idx) {
    for (var i = 0; i < array_length(_sd.face_down); i++) {
        if (_sd.face_down[i] == _idx) {
            return true;
        }
    }
    return false;
}

function sd_degrade(_sd, _at_bat) {
    var _factor = _sd.pitcher.stamina / 10;
    var _remove = max(0, floor((_at_bat - 1) * (1 - _factor) * 2));
    if (_remove > 0 && array_length(_sd.pitcher_deck) > 5) {
        array_sort(_sd.pitcher_deck, function(_a, _b) { return _b.rank - _a.rank; });
        array_delete(_sd.pitcher_deck, 0, min(_remove, array_length(_sd.pitcher_deck) - 5));
        sd_shuffle(_sd.pitcher_deck);
    }
}

function sd_pitch_desc(_key) {
    switch (_key) {
        case "fastball": return "Swap a hole card";
        case "breaking": return "Hide a board card";
        case "slider": return "Replace a board card";
        case "changeup": return "Peek a hole card";
        case "cutter": return "Lock a board card";
        case "curveball": return "Batter best -2";
        case "sinker": return "Board ranks -1";
        case "splitter": return "Remove a board card";
        case "twoseam": return "Swap board / hole";
        case "knuckle": return "Scramble ranks";
        case "screwball": return "Replace batter hole";
        case "palmball": return "Plant next card";
        default: return _key;
    }
}

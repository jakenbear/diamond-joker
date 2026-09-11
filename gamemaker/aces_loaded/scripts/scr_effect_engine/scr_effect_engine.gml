/// @desc Trait conditions + pre/post handlers. Mirrors EffectEngine.js.

function fx_rng_make(_seed) {
    if (_seed == undefined || _seed <= 0) {
        _seed = 1;
    }
    return { s: _seed };
}

function fx_rng_next(_rng) {
    _rng.s = (_rng.s * 1103515245 + 12345) & $7fffffff;
    return _rng.s / 2147483648;
}

function fx_roll(_rng) {
    if (is_struct(_rng)) {
        return fx_rng_next(_rng);
    }
    return random(1);
}

function fx_scale_window(_min, _max, _total) {
    var _canon = 9;
    var _open = _max >= _canon;
    if (_total == _canon) {
        return { mn: _min, mx: _open ? 999 : _max };
    }
    var _lo = floor((_min - 1) * _total / _canon) + 1;
    var _hi = ceil(_max * _total / _canon);
    return { mn: min(_lo, _total), mx: _open ? 999 : max(_lo, _hi) };
}

function fx_window_label(_min, _max, _total) {
    var _w = fx_scale_window(_min, _max, _total);
    var _hi = (_w.mx >= 999) ? _total : min(_w.mx, _total);
    if (_w.mn >= _hi) {
        return "inning " + string(_w.mn);
    }
    return "innings " + string(_w.mn) + "-" + string(_hi);
}

function fx_effect_of(_item) {
    if (!is_struct(_item) || !variable_struct_exists(_item, "effect")) {
        return undefined;
    }
    var _effect = _item.effect;
    return is_struct(_effect) ? _effect : undefined;
}

function fx_effect_condition(_effect) {
    if (!is_struct(_effect) || !variable_struct_exists(_effect, "condition")) {
        return undefined;
    }
    var _cond = _effect.condition;
    return is_struct(_cond) ? _cond : undefined;
}

function fx_item_description(_item, _total) {
    if (!is_struct(_item)) {
        return "";
    }
    var _text = variable_struct_exists(_item, "description") ? _item.description : "";
    if (_total == 9 || _text == undefined || _text == "") {
        return _text;
    }
    var _effect = fx_effect_of(_item);
    var _cond = fx_effect_condition(_effect);
    if (is_struct(_cond) && variable_struct_exists(_cond, "type") && _cond.type == "inning_range") {
        var _label = fx_window_label(_cond.min, _cond.max, _total);
        return string_replace(_text, "innings " + string(_cond.min) + "-" + string(_cond.max), _label);
    }
    return _text;
}

function fx_check(_cond, _result, _gs) {
    if (!is_struct(_cond)) {
        return true;
    }
    var _type = _cond.type;
    if (_type == "always") {
        return true;
    }
    if (_type == "outs_eq") {
        return _gs.outs == _cond.value;
    }
    if (_type == "outs_neq") {
        return _gs.outs != _cond.value;
    }
    if (_type == "inning_range") {
        var _w = fx_scale_window(_cond.min, _cond.max, _gs.total_innings);
        return _gs.inning >= _w.mn && _gs.inning <= _w.mx;
    }
    if (_type == "runner_on") {
        return (_gs.bases[_cond.base] != "");
    }
    if (_type == "bases_loaded") {
        return _gs.bases[0] != "" && _gs.bases[1] != "" && _gs.bases[2] != "";
    }
    if (_type == "bases_empty") {
        return _gs.bases[0] == "" && _gs.bases[1] == "" && _gs.bases[2] == "";
    }
    if (_type == "bases_occupied") {
        return _gs.bases[0] != "" || _gs.bases[1] != "" || _gs.bases[2] != "";
    }
    if (_type == "outcome_is") {
        return _result.outcome == _cond.value;
    }
    if (_type == "hand_is") {
        return _result.hand_name == _cond.value;
    }
    if (_type == "hand_in") {
        var _vals = _cond.values;
        for (var i = 0; i < array_length(_vals); i++) {
            if (_result.hand_name == _vals[i]) {
                return true;
            }
        }
        return false;
    }
    if (_type == "peanuts_lte") {
        return _result.peanuts <= _cond.value;
    }
    if (_type == "peanuts_gte") {
        return _result.peanuts >= _cond.value;
    }
    if (_type == "losing_by") {
        return _gs.opponent_score - _gs.player_score >= _cond.value;
    }
    if (_type == "winning_by") {
        return _gs.player_score - _gs.opponent_score >= _cond.value;
    }
    if (_type == "first_batter_of_inning") {
        return _gs.at_bats == 0;
    }
    if (_type == "and") {
        for (var i = 0; i < array_length(_cond.conditions); i++) {
            if (!fx_check(_cond.conditions[i], _result, _gs)) {
                return false;
            }
        }
        return true;
    }
    if (_type == "or") {
        for (var i = 0; i < array_length(_cond.conditions); i++) {
            if (fx_check(_cond.conditions[i], _result, _gs)) {
                return true;
            }
        }
        return false;
    }
    return false;
}

function fx_gs_from_bb(_bb) {
    return {
        outs: _bb.outs,
        inning: _bb.inning,
        total_innings: _bb.total_innings,
        bases: _bb.bases,
        player_score: _bb.player_score,
        opponent_score: _bb.opponent_score,
        at_bats: _bb.at_bats_this_inning,
        current_inning_runs: _bb.current_inning_runs,
    };
}

function fx_apply_post(_result, _traits, _gs, _phase = "post") {
    var _out = _result;
    for (var i = 0; i < array_length(_traits); i++) {
        var _t = _traits[i];
        var _effect = fx_effect_of(_t);
        if (_effect == undefined) {
            continue;
        }
        if (!variable_struct_exists(_t, "phase") || _t.phase != _phase) {
            continue;
        }
        _out = fx_post_one(_out, _effect, _gs);
    }
    _out.score = round(_out.peanuts * _out.mult);
    return _out;
}

function fx_post_one(_result, _effect, _gs) {
    var _type = _effect.type;
    if (_type == "compound") {
        var _r = _result;
        for (var i = 0; i < array_length(_effect.effects); i++) {
            _r = fx_post_one(_r, _effect.effects[i], _gs);
        }
        return _r;
    }
    if (_type == "add_mult") {
        if (!fx_check(fx_effect_condition(_effect), _result, _gs)) {
            return _result;
        }
        _result.mult = round(max(1, _result.mult + _effect.value) * 10) / 10;
        return _result;
    }
    if (_type == "add_peanuts") {
        if (!fx_check(fx_effect_condition(_effect), _result, _gs)) {
            return _result;
        }
        _result.peanuts = max(0, _result.peanuts + _effect.value);
        return _result;
    }
    if (_type == "cap_mult") {
        if (!fx_check(fx_effect_condition(_effect), _result, _gs)) {
            return _result;
        }
        _result.mult = min(_result.mult, _effect.value);
        return _result;
    }
    if (_type == "scale_mult") {
        if (!fx_check(fx_effect_condition(_effect), _result, _gs)) {
            return _result;
        }
        _result.mult = max(1, round(_result.mult * _effect.value * 10) / 10);
        return _result;
    }
    if (_type == "per_runner_peanuts") {
        var _n = 0;
        for (var i = 0; i < 3; i++) {
            if (_gs.bases[i] != "") {
                _n += 1;
            }
        }
        if (_n == 0) {
            return _result;
        }
        _result.peanuts += _n * _effect.value;
        return _result;
    }
    if (_type == "upgrade_outcome") {
        if (_result.outcome != _effect.from) {
            return _result;
        }
        if (!fx_check(fx_effect_condition(_effect), _result, _gs)) {
            return _result;
        }
        _result.outcome = _effect.to;
        if (variable_struct_exists(_effect, "newHandName")) {
            _result.hand_name = _effect.newHandName;
        }
        if (variable_struct_exists(_effect, "addPeanuts")) {
            _result.peanuts += _effect.addPeanuts;
        }
        if (variable_struct_exists(_effect, "addMult")) {
            _result.mult += _effect.addMult;
        }
        return _result;
    }
    if (_type == "prevent_outcome") {
        if (_result.outcome != _effect.from) {
            return _result;
        }
        if (!fx_check(fx_effect_condition(_effect), _result, _gs)) {
            return _result;
        }
        _result.outcome = _effect.toOutcome;
        if (variable_struct_exists(_effect, "toHand")) {
            _result.hand_name = _effect.toHand;
        }
        if (variable_struct_exists(_effect, "peanuts")) {
            _result.peanuts = _effect.peanuts;
        }
        if (variable_struct_exists(_effect, "mult")) {
            _result.mult = _effect.mult;
        }
        return _result;
    }
    if (_type == "set_flag") {
        if (!fx_check(fx_effect_condition(_effect), _result, _gs)) {
            return _result;
        }
        _result[$ _effect.flag] = true;
        return _result;
    }
    if (_type == "force_groundout") {
        if (!fx_check(fx_effect_condition(_effect), _result, _gs)) {
            return _result;
        }
        _result.outcome = "Groundout";
        _result.hand_name = variable_struct_exists(_effect, "newHandName") ? _effect.newHandName : "Groundout";
        _result.peanuts = 0;
        _result.mult = 1;
        _result.was_groundout = true;
        return _result;
    }
    if (_type == "convert_high_card") {
        if (_result.hand_name != "High Card") {
            return _result;
        }
        if (!fx_check(fx_effect_condition(_effect), _result, _gs)) {
            return _result;
        }
        _result.outcome = "Single";
        _result.hand_name = variable_struct_exists(_effect, "newHandName") ? _effect.newHandName : "Bunt Single";
        _result.peanuts = variable_struct_exists(_effect, "peanuts") ? _effect.peanuts : 1;
        _result.mult = variable_struct_exists(_effect, "mult") ? _effect.mult : 1;
        return _result;
    }
    return _result;
}

function fx_apply_pre(_cards, _traits, _phase = "pre", _rng = undefined) {
    var _out = _cards;
    for (var i = 0; i < array_length(_traits); i++) {
        var _t = _traits[i];
        var _effect = fx_effect_of(_t);
        if (_effect == undefined) {
            continue;
        }
        if (!variable_struct_exists(_t, "phase") || _t.phase != _phase) {
            continue;
        }
        _out = fx_pre_one(_out, _effect, _rng);
    }
    return _out;
}

function fx_pre_one(_cards, _effect, _rng = undefined) {
    var _type = _effect.type;
    if (_type == "adjacent_to_pair") {
        var _sorted = [];
        array_copy(_sorted, 0, _cards, 0, array_length(_cards));
        array_sort(_sorted, function(_a, _b) { return _a.rank - _b.rank; });
        for (var i = 0; i < array_length(_sorted) - 1; i++) {
            if (_sorted[i + 1].rank - _sorted[i].rank == 1) {
                var _target = _sorted[i + 1].rank;
                var _id = _sorted[i].card_id;
                var _mapped = [];
                for (var j = 0; j < array_length(_cards); j++) {
                    var _c = _cards[j];
                    if (_c.card_id == _id) {
                        array_push(_mapped, { rank: _target, suit: _c.suit, card_id: _c.card_id });
                    } else {
                        array_push(_mapped, _c);
                    }
                }
                return _mapped;
            }
        }
        return _cards;
    }
    if (_type == "ace_wild_straight") {
        var _has_ace = false;
        var _non = [];
        for (var i = 0; i < array_length(_cards); i++) {
            if (_cards[i].rank == 14) {
                _has_ace = true;
            } else {
                array_push(_non, _cards[i].rank);
            }
        }
        if (!_has_ace || array_length(_non) < 4) {
            return _cards;
        }
        array_sort(_non, true);
        for (var i = 0; i < array_length(_non) - 1; i++) {
            var _gap = _non[i] + 1;
            var _test = [];
            array_copy(_test, 0, _non, 0, array_length(_non));
            array_push(_test, _gap);
            array_sort(_test, true);
            var _seq = true;
            for (var j = 1; j < array_length(_test); j++) {
                if (_test[j] != _test[j - 1] + 1) {
                    _seq = false;
                    break;
                }
            }
            if (_seq) {
                var _mapped = [];
                var _used = false;
                for (var j = 0; j < array_length(_cards); j++) {
                    var _c = _cards[j];
                    if (!_used && _c.rank == 14) {
                        array_push(_mapped, { rank: _gap, suit: _c.suit, card_id: _c.card_id });
                        _used = true;
                    } else {
                        array_push(_mapped, _c);
                    }
                }
                return _mapped;
            }
        }
        return _cards;
    }
    if (_type == "color_is_suit") {
        var _red = 0;
        var _black = 0;
        for (var i = 0; i < array_length(_cards); i++) {
            if (_cards[i].suit == "H" || _cards[i].suit == "D") {
                _red += 1;
            } else {
                _black += 1;
            }
        }
        if (_red >= 4 || _black >= 4) {
            var _use_red = _red >= _black;
            var _mapped = [];
            for (var i = 0; i < array_length(_cards); i++) {
                var _c = _cards[i];
                var _is_red = (_c.suit == "H" || _c.suit == "D");
                if (_use_red == _is_red) {
                    array_push(_mapped, _c);
                } else {
                    array_push(_mapped, { rank: _c.rank, suit: _use_red ? "H" : "C", card_id: _c.card_id });
                }
            }
            return _mapped;
        }
        return _cards;
    }
    if (_type == "upgrade_lowest") {
        var _chance = variable_struct_exists(_effect, "chance") ? _effect.chance : 0.2;
        if (fx_roll(_rng) > _chance) {
            return _cards;
        }
        var _min_i = 0;
        for (var i = 1; i < array_length(_cards); i++) {
            if (_cards[i].rank < _cards[_min_i].rank) {
                _min_i = i;
            }
        }
        var _mapped = [];
        var _amt = variable_struct_exists(_effect, "amount") ? _effect.amount : 3;
        for (var i = 0; i < array_length(_cards); i++) {
            var _c = _cards[i];
            if (i == _min_i) {
                array_push(_mapped, { rank: min(14, _c.rank + _amt), suit: _c.suit, card_id: _c.card_id });
            } else {
                array_push(_mapped, _c);
            }
        }
        return _mapped;
    }
    if (_type == "downgrade_highest") {
        var _chance = variable_struct_exists(_effect, "chance") ? _effect.chance : 0.3;
        if (fx_roll(_rng) > _chance) {
            return _cards;
        }
        var _max_i = 0;
        for (var i = 1; i < array_length(_cards); i++) {
            if (_cards[i].rank > _cards[_max_i].rank) {
                _max_i = i;
            }
        }
        var _mapped = [];
        var _amt = variable_struct_exists(_effect, "amount") ? _effect.amount : 3;
        for (var i = 0; i < array_length(_cards); i++) {
            var _c = _cards[i];
            if (i == _max_i) {
                array_push(_mapped, { rank: max(2, _c.rank - _amt), suit: _c.suit, card_id: _c.card_id });
            } else {
                array_push(_mapped, _c);
            }
        }
        return _mapped;
    }
    if (_type == "downgrade_face_cards") {
        var _mapped = [];
        var _amt = variable_struct_exists(_effect, "amount") ? _effect.amount : 2;
        for (var i = 0; i < array_length(_cards); i++) {
            var _c = _cards[i];
            if (_c.rank >= 11 && _c.rank <= 13) {
                array_push(_mapped, { rank: max(2, _c.rank - _amt), suit: _c.suit, card_id: _c.card_id });
            } else {
                array_push(_mapped, _c);
            }
        }
        return _mapped;
    }
    if (_type == "swap_random") {
        var _chance = variable_struct_exists(_effect, "chance") ? _effect.chance : 0.25;
        var _n = array_length(_cards);
        if (fx_roll(_rng) > _chance || _n < 2) {
            return _cards;
        }
        var _i = floor(fx_roll(_rng) * _n);
        var _j = floor(fx_roll(_rng) * (_n - 1));
        if (_j >= _i) {
            _j += 1;
        }
        var _mapped = [];
        for (var k = 0; k < array_length(_cards); k++) {
            array_push(_mapped, { rank: _cards[k].rank, suit: _cards[k].suit, card_id: _cards[k].card_id });
        }
        var _tmp = _mapped[_i].rank;
        _mapped[_i].rank = _mapped[_j].rank;
        _mapped[_j].rank = _tmp;
        return _mapped;
    }
    return _cards;
}

function fx_trait_has(_traits, _id) {
    for (var i = 0; i < array_length(_traits); i++) {
        if (is_struct(_traits[i]) && _traits[i].id == _id) {
            return true;
        }
    }
    return false;
}

function fx_trait_sum(_traits, _type) {
    var _n = 0;
    for (var i = 0; i < array_length(_traits); i++) {
        var _t = _traits[i];
        var _effect = fx_effect_of(_t);
        if (_effect != undefined && variable_struct_exists(_effect, "type") && _effect.type == _type) {
            _n += variable_struct_exists(_effect, "value") ? _effect.value : 1;
        }
    }
    return _n;
}

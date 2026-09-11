/// @desc Innings, outs, bases, score. Baseball-legal outcomes only.

function bb_create(_total_innings) {
    return {
        inning: 1,
        total_innings: _total_innings,
        half: "top",
        outs: 0,
        bases: ["", "", ""],
        player_score: 0,
        opponent_score: 0,
        state: "BATTING",
        last_result: undefined,
        total_peanuts: 0,
        shop_visited: [],
        player_runs_by_inning: [],
        opponent_runs_by_inning: [],
        current_inning_runs: 0,
        at_bats_this_inning: 0,
        pairs_played: 0,
        two_pairs_played: 0,
        trips_played: 0,
        straights_played: 0,
        flushes_played: 0,
        walk_off: false,
        staff: [],
        staff_slots: 3,
    };
}

function bb_base_filled(_bb, _i) {
    return (_bb.bases[_i] != "");
}

function bb_runner_count(_bb) {
    var _n = 0;
    for (var i = 0; i < 3; i++) {
        if (bb_base_filled(_bb, i)) _n += 1;
    }
    return _n;
}

function bb_clear_bases(_bb) {
    _bb.bases = ["", "", ""];
}

function bb_reset_half_stats(_bb) {
    _bb.at_bats_this_inning = 0;
    _bb.pairs_played = 0;
    _bb.two_pairs_played = 0;
    _bb.trips_played = 0;
    _bb.straights_played = 0;
    _bb.flushes_played = 0;
}

function bb_should_show_shop(_bb) {
    if (_bb.inning > _bb.total_innings) return false;
    for (var i = 0; i < array_length(_bb.shop_visited); i++) {
        if (_bb.shop_visited[i] == _bb.inning) return false;
    }
    return true;
}

function bb_shop_buy_limit(_bb) {
    if (_bb.inning <= 3) return 1;
    if (_bb.inning <= 6) return 2;
    return 3;
}

function bb_mark_shop(_bb) {
    array_push(_bb.shop_visited, _bb.inning);
}

function bb_spend(_bb, _amount) {
    if (_bb.total_peanuts < _amount) return false;
    _bb.total_peanuts -= _amount;
    return true;
}

function bb_add_staff(_bb, _item) {
    if (array_length(_bb.staff) >= _bb.staff_slots) {
        return false;
    }
    array_push(_bb.staff, _item);
    var _eff = fx_effect_of(_item);
    if (is_struct(_eff) && _eff.type == "unlock_staff_slot") {
        _bb.staff_slots = min(4, _bb.staff_slots + _eff.value);
    }
    return true;
}

function bb_remove_staff(_bb, _id) {
    for (var i = 0; i < array_length(_bb.staff); i++) {
        if (_bb.staff[i].id == _id) {
            array_delete(_bb.staff, i, 1);
            return true;
        }
    }
    return false;
}

function bb_staff_owned_ids(_bb) {
    var _ids = [];
    for (var i = 0; i < array_length(_bb.staff); i++) {
        array_push(_ids, _bb.staff[i].id);
    }
    return _ids;
}

function bb_staff_has(_bb, _type) {
    for (var i = 0; i < array_length(_bb.staff); i++) {
        var _eff = fx_effect_of(_bb.staff[i]);
        if (is_struct(_eff) && _eff.type == _type) {
            return true;
        }
    }
    return false;
}

function bb_staff_sum(_bb, _type) {
    var _n = 0;
    for (var i = 0; i < array_length(_bb.staff); i++) {
        var _eff = fx_effect_of(_bb.staff[i]);
        if (is_struct(_eff) && _eff.type == _type) {
            _n += variable_struct_exists(_eff, "value") ? _eff.value : 1;
        }
    }
    return _n;
}

function bb_staff_stat(_bb, _stat) {
    var _n = 0;
    for (var i = 0; i < array_length(_bb.staff); i++) {
        var _eff = fx_effect_of(_bb.staff[i]);
        if (is_struct(_eff) && _eff.type == "team_stat_boost" && _eff.stat == _stat) {
            _n += _eff.value;
        }
    }
    return _n;
}

function bb_try_extra_base(_bb, _chance) {
    if (random(1) >= _chance) {
        return { scored: 0, advanced: false };
    }
    for (var i = 2; i >= 0; i--) {
        if (!bb_base_filled(_bb, i)) {
            continue;
        }
        var _runner = _bb.bases[i];
        _bb.bases[i] = "";
        if (i + 1 >= 3) {
            bb_credit_runs(_bb, 1);
            return { scored: 1, advanced: true };
        }
        _bb.bases[i + 1] = _runner;
        return { scored: 0, advanced: true };
    }
    return { scored: 0, advanced: false };
}

function bb_advance_forced(_bb) {
    var _runs = 0;
    var _upto = -1;
    for (var i = 0; i < 3; i++) {
        if (bb_base_filled(_bb, i)) _upto = i;
        else break;
    }
    for (var i = _upto; i >= 0; i--) {
        var _runner = _bb.bases[i];
        _bb.bases[i] = "";
        if (i + 1 >= 3) _runs += 1;
        else _bb.bases[i + 1] = _runner;
    }
    return _runs;
}

function bb_advance_runners(_bb, _bases, _batter, _is_walk) {
    var _runs = 0;
    if (_bases >= 4) {
        _runs = bb_runner_count(_bb) + 1;
        bb_clear_bases(_bb);
        return _runs;
    }
    if (_is_walk) {
        var _upto = -1;
        for (var i = 0; i < 3; i++) {
            if (bb_base_filled(_bb, i)) _upto = i;
            else break;
        }
        for (var i = _upto; i >= 0; i--) {
            var _runner = _bb.bases[i];
            _bb.bases[i] = "";
            if (i + 1 >= 3) _runs += 1;
            else _bb.bases[i + 1] = _runner;
        }
        _bb.bases[0] = _batter;
        return _runs;
    }
    for (var i = 2; i >= 0; i--) {
        if (!bb_base_filled(_bb, i)) continue;
        var _runner = _bb.bases[i];
        var _pos = i + _bases;
        _bb.bases[i] = "";
        if (_pos >= 3) _runs += 1;
        else _bb.bases[_pos] = _runner;
    }
    if (_bases >= 1 && _bases <= 3) {
        _bb.bases[_bases - 1] = _batter;
    }
    return _runs;
}

function bb_credit_runs(_bb, _runs) {
    if (_runs <= 0) return;
    if (_bb.half == "top") {
        _bb.player_score += _runs;
        _bb.current_inning_runs += _runs;
    } else {
        _bb.opponent_score += _runs;
        _bb.current_inning_runs += _runs;
    }
}

function bb_resolve(_bb, _outcome, _hand_score, _batter_name) {
    _bb.at_bats_this_inning += 1;
    _bb.total_peanuts += floor(_hand_score);

    var _bases = 0;
    var _is_out = false;
    var _is_walk = false;
    var _outs_rec = 1;
    var _fc = false;
    var _sac = false;
    switch (_outcome) {
        case "Strikeout":
        case "Groundout":
        case "Flyout":
            _is_out = true;
            break;
        case "Single": _bases = 1; break;
        case "Double": _bases = 2; break;
        case "Triple": _bases = 3; break;
        case "Home Run": _bases = 4; break;
        case "Walk":
        case "HBP":
            _bases = 1;
            _is_walk = true;
            break;
        case "Double Play":
            _is_out = true;
            _outs_rec = 2;
            break;
        case "Fielder's Choice":
            _is_out = true;
            _fc = true;
            break;
        case "Error":
        case "Dropped Third Strike":
            _bases = 1;
            break;
        case "Sac Bunt":
            _is_out = true;
            _sac = true;
            break;
        default:
            return { runs: 0, description: "Unknown outcome", state: _bb.state };
    }

    var _runs = 0;
    var _desc = _outcome;

    if (_is_out) {
        if (_outs_rec == 2) {
            _bb.outs += 2;
            _bb.bases[0] = "";
            _desc = "Double Play! Outs: " + string(_bb.outs);
        } else if (_sac) {
            _runs += bb_advance_all(_bb);
            _bb.outs += 1;
            _desc = (_runs > 0) ? ("Sac Bunt — " + string(_runs) + " run(s)") : "Sac Bunt — runners advance";
        } else if (_fc) {
            _bb.outs += 1;
            for (var i = 2; i >= 0; i--) {
                if (bb_base_filled(_bb, i)) {
                    _bb.bases[i] = "";
                    break;
                }
            }
            _bb.bases[0] = _batter_name;
            _desc = "Fielder's Choice — Out " + string(_bb.outs);
        } else {
            _bb.outs += 1;
            if (_outcome == "Groundout" && bb_base_filled(_bb, 0) && _bb.outs < 3) {
                var _fr = bb_advance_forced(_bb);
                if (_fr > 0) {
                    bb_credit_runs(_bb, _fr);
                    _runs += _fr;
                }
                _desc = "Groundout — Out " + string(_bb.outs);
                if (_fr > 0) _desc += ", " + string(_fr) + " run(s)";
            } else {
                _desc = _outcome + " — Out " + string(_bb.outs);
            }
        }

        if (_bb.outs >= 3) {
            bb_clear_bases(_bb);
            _bb.outs = 0;
            if (_bb.half == "top" && _bb.inning >= _bb.total_innings && _bb.player_score < _bb.opponent_score) {
                array_push(_bb.player_runs_by_inning, _bb.current_inning_runs);
                _bb.current_inning_runs = 0;
                _bb.state = "GAME_OVER";
            } else {
                _bb.state = "SWITCH_SIDE";
            }
        } else {
            _bb.state = "BATTING";
        }
    } else {
        _runs = bb_advance_runners(_bb, _bases, _batter_name, _is_walk);
        bb_credit_runs(_bb, _runs);
        if (_outcome == "Home Run") {
            if (_runs == 4) _desc = "GRAND SLAM! 4 runs!";
            else if (_runs == 3) _desc = "3-Run Homer!";
            else if (_runs == 2) _desc = "2-Run Homer!";
            else _desc = "Solo Homer!";
        } else {
            _desc = _outcome + "!";
            if (_runs > 0) _desc += " " + string(_runs) + " run(s)!";
        }
        if (_bb.half == "bot" && _bb.inning >= _bb.total_innings && _bb.opponent_score > _bb.player_score) {
            _bb.walk_off = true;
            _bb.state = "GAME_OVER";
            array_push(_bb.opponent_runs_by_inning, _bb.current_inning_runs);
            _bb.current_inning_runs = 0;
        } else {
            _bb.state = "BATTING";
        }
    }

    _bb.last_result = { runs: _runs, description: _desc, state: _bb.state, outcome: _outcome };
    return _bb.last_result;
}

function bb_finish_player_half(_bb) {
    if (array_length(_bb.player_runs_by_inning) < _bb.inning) {
        array_push(_bb.player_runs_by_inning, _bb.current_inning_runs);
    }
    _bb.current_inning_runs = 0;
    bb_reset_half_stats(_bb);
    bb_clear_bases(_bb);
    _bb.outs = 0;
    _bb.half = "bot";
    _bb.state = "BATTING";
}

function bb_finish_opponent_half(_bb) {
    if (array_length(_bb.opponent_runs_by_inning) < _bb.inning) {
        array_push(_bb.opponent_runs_by_inning, _bb.current_inning_runs);
    }
    _bb.current_inning_runs = 0;
    _bb.inning += 1;
    _bb.half = "top";
    bb_reset_half_stats(_bb);
    bb_clear_bases(_bb);
    _bb.outs = 0;
    if (_bb.inning > _bb.total_innings && _bb.player_score != _bb.opponent_score) {
        _bb.state = "GAME_OVER";
    } else {
        _bb.state = "BATTING";
    }
}

function bb_process_sac_fly(_bb) {
    if (!bb_base_filled(_bb, 2)) {
        return 0;
    }
    _bb.bases[2] = "";
    bb_credit_runs(_bb, 1);
    return 1;
}

function bb_process_stolen_base(_bb) {
    if (!bb_base_filled(_bb, 0)) {
        return;
    }
    var _runner = _bb.bases[0];
    _bb.bases[0] = "";
    if (!bb_base_filled(_bb, 1)) {
        _bb.bases[1] = _runner;
    } else if (!bb_base_filled(_bb, 2)) {
        _bb.bases[2] = _runner;
    }
}

function bb_advance_all(_bb) {
    var _runs = 0;
    for (var i = 2; i >= 0; i--) {
        if (!bb_base_filled(_bb, i)) {
            continue;
        }
        var _runner = _bb.bases[i];
        _bb.bases[i] = "";
        if (i + 1 >= 3) {
            _runs += 1;
            bb_credit_runs(_bb, 1);
        } else {
            _bb.bases[i + 1] = _runner;
        }
    }
    return _runs;
}

function bb_productive_advance(_bb) {
    var _runs = 0;
    if (bb_base_filled(_bb, 2)) {
        _bb.bases[2] = "";
        _runs = 1;
        bb_credit_runs(_bb, 1);
    }
    if (bb_base_filled(_bb, 1)) {
        _bb.bases[2] = _bb.bases[1];
        _bb.bases[1] = "";
    }
    return _runs;
}

function bb_is_game_over(_bb) {
    return _bb.state == "GAME_OVER";
}

function bb_result(_bb) {
    return {
        player_score: _bb.player_score,
        opponent_score: _bb.opponent_score,
        won: _bb.player_score > _bb.opponent_score,
        innings: max(array_length(_bb.player_runs_by_inning), array_length(_bb.opponent_runs_by_inning)),
        walk_off: _bb.walk_off,
        player_runs_by_inning: _bb.player_runs_by_inning,
        opponent_runs_by_inning: _bb.opponent_runs_by_inning,
    };
}

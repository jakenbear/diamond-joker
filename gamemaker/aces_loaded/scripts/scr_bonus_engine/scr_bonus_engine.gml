/// @desc Staff, lineup, and synergy bonuses. Mutates the hand result in place.

function bonus_empty() {
    return {
        peanut_bonus: 0,
        mult_bonus: 0,
        outcome_changed: false,
        messages: [],
        error_mult: 1,
        extra_base_bonus: 0,
        pair_out_reduction: 0,
        contact_save_boost: 0,
    };
}

function bonus_commit(_result, _b) {
    if (_b.peanut_bonus > 0 || _b.mult_bonus > 0) {
        _result.peanuts += _b.peanut_bonus;
        _result.mult = round((_result.mult + _b.mult_bonus) * 10) / 10;
        _result.score = round(_result.peanuts * _result.mult);
    }
    return _b;
}

function bonus_msg(_b, _text) {
    array_push(_b.messages, _text);
}

function bonus_is_out(_outcome) {
    return _outcome == "Strikeout" || _outcome == "Groundout" || _outcome == "Flyout" || _outcome == "Double Play" || _outcome == "Fielder's Choice";
}

function bonus_is_xbh(_outcome) {
    return _outcome == "Double" || _outcome == "Triple" || _outcome == "Home Run";
}

function bonus_base_filled(_gs, _i) {
    return (_gs.bases[_i] != "" && _gs.bases[_i] != false);
}

function bonus_apply_staff(_result, _gs, _staff) {
    var _b = bonus_empty();
    for (var i = 0; i < array_length(_staff); i++) {
        var _s = _staff[i];
        var _eff = fx_effect_of(_s);
        if (_eff == undefined) {
            continue;
        }
        var _type = _eff.type;
        if (_type == "add_mult") {
            var _applies = true;
            var _cond = fx_effect_condition(_eff);
            if (is_struct(_cond)) {
                if (_cond.type == "inning_range") {
                    var _w = fx_scale_window(_cond.min, _cond.max, _gs.total_innings);
                    _applies = _gs.inning >= _w.mn && _gs.inning <= _w.mx;
                } else if (_cond.type == "bases_empty") {
                    _applies = !bonus_base_filled(_gs, 0) && !bonus_base_filled(_gs, 1) && !bonus_base_filled(_gs, 2);
                }
            }
            if (_applies) {
                _b.mult_bonus += _eff.value;
                bonus_msg(_b, "+" + string(_eff.value) + "x (" + _s.name + ")");
            }
        } else if (_type == "mult_per_inning_run") {
            var _runs = _gs.current_inning_runs;
            if (_runs > 0) {
                var _bonus = _eff.value * _runs;
                _b.mult_bonus += _bonus;
                bonus_msg(_b, "+" + string(_bonus) + "x (" + _s.name + ")");
            }
        } else if (_type == "flat_peanuts_per_ab") {
            _b.peanut_bonus += _eff.value;
            bonus_msg(_b, "+" + string(_eff.value) + " peanuts (" + _s.name + ")");
        } else if (_type == "per_runner_peanuts") {
            var _n = 0;
            for (var j = 0; j < 3; j++) {
                if (bonus_base_filled(_gs, j)) {
                    _n += 1;
                }
            }
            if (_n > 0) {
                var _bonus = _eff.value * _n;
                _b.peanut_bonus += _bonus;
                bonus_msg(_b, "+" + string(_bonus) + " peanuts (" + _s.name + ")");
            }
        } else if (_type == "double_peanuts") {
            var _cond = fx_effect_condition(_eff);
            if (is_struct(_cond) && _cond.type == "outcome_is" && _result.outcome == _cond.value) {
                _b.peanut_bonus += _result.peanuts;
                bonus_msg(_b, "x2 peanuts! (" + _s.name + ")");
            }
        } else if (_type == "team_convert_high_card") {
            if (_result.hand_name == "High Card" && _result.outcome == "Strikeout") {
                _result.outcome = "Single";
                _result.peanuts = max(_result.peanuts, variable_struct_exists(_eff, "peanuts") ? _eff.peanuts : 1);
                _result.mult = max(_result.mult, variable_struct_exists(_eff, "mult") ? _eff.mult : 1);
                _result.score = round(_result.peanuts * _result.mult);
                _b.outcome_changed = true;
                bonus_msg(_b, "High Card → Single! (" + _s.name + ")");
            }
        } else if (_type == "strikeout_to_walk") {
            if (_result.outcome == "Strikeout" && random(1) < _eff.chance) {
                _result.outcome = "Walk";
                _b.outcome_changed = true;
                bonus_msg(_b, "K → Walk! (" + _s.name + ")");
            }
        } else if (_type == "error_multiplier") {
            _b.error_mult *= _eff.value;
        } else if (_type == "team_extra_base") {
            _b.extra_base_bonus += _eff.value;
        }
    }
    return bonus_commit(_result, _b);
}

function bonus_apply_lineup(_result, _gs, _effects, _batter, _discards) {
    var _b = bonus_empty();
    var _hit = !bonus_is_out(_result.outcome);
    var _xbh = bonus_is_xbh(_result.outcome);
    for (var i = 0; i < array_length(_effects); i++) {
        var _eff = _effects[i];
        var _type = _eff.type;
        if (_type == "team_add_peanuts_on_xbh") {
            if (_xbh) {
                _b.peanut_bonus += _eff.value;
                bonus_msg(_b, "+" + string(_eff.value) + " peanut (XBH bonus)");
            }
        } else if (_type == "team_pair_out_reduction") {
            _b.pair_out_reduction += _eff.value;
        } else if (_type == "team_extra_base_chance") {
            _b.extra_base_bonus += _eff.value;
        } else if (_type == "team_power_mult") {
            var _th = variable_struct_exists(_eff, "threshold") ? _eff.threshold : 8;
            if (is_struct(_batter) && _batter.power >= _th) {
                var _bonus = round((_result.mult * _eff.value - _result.mult) * 10) / 10;
                _b.mult_bonus += _bonus;
                bonus_msg(_b, "x" + string(_eff.value) + " mult (power)");
            }
        } else if (_type == "team_add_mult_on_hit") {
            if (_hit) {
                _b.mult_bonus += _eff.value;
                bonus_msg(_b, "+" + string(_eff.value) + "x (lineup bonus)");
            }
        } else if (_type == "team_strikeout_peanuts") {
            if (_result.outcome == "Strikeout") {
                _b.peanut_bonus += _eff.value;
                bonus_msg(_b, "+" + string(_eff.value) + " peanuts (K bonus)");
            }
        } else if (_type == "team_first_pitch_mult") {
            if (_discards == 0) {
                _b.mult_bonus += _eff.value;
                bonus_msg(_b, "+" + string(_eff.value) + "x (1st pitch)");
            }
        } else if (_type == "team_runner_mult") {
            var _n = 0;
            for (var j = 0; j < 3; j++) {
                if (bonus_base_filled(_gs, j)) {
                    _n += 1;
                }
            }
            if (_n > 0) {
                var _bonus = _eff.value * _n;
                _b.mult_bonus += _bonus;
                bonus_msg(_b, "+" + string(_bonus) + "x on base");
            }
        } else if (_type == "team_late_inning_peanuts") {
            if (_gs.inning >= fx_scale_window(7, 9, _gs.total_innings).mn) {
                _b.peanut_bonus += _eff.value;
                bonus_msg(_b, "+" + string(_eff.value) + " peanuts (late inning)");
            }
        } else if (_type == "team_contact_save_boost") {
            _b.contact_save_boost += _eff.value;
        }
    }
    return bonus_commit(_result, _b);
}

function bonus_apply_synergies(_result, _gs, _synergies, _batter) {
    var _b = bonus_empty();
    for (var i = 0; i < array_length(_synergies); i++) {
        var _syn = _synergies[i];
        var _eff = _syn.bonus;
        var _type = _eff.type;
        if (_type == "add_mult_all") {
            _b.mult_bonus += _eff.value;
            bonus_msg(_b, "+" + string(_eff.value) + "x (" + _syn.name + ")");
        } else if (_type == "add_peanuts_all") {
            _b.peanut_bonus += _eff.value;
            bonus_msg(_b, "+" + string(_eff.value) + " peanuts (" + _syn.name + ")");
        } else if (_type == "add_mult_on_hr") {
            if (_result.outcome == "Home Run") {
                _b.mult_bonus += _eff.value;
                bonus_msg(_b, "+" + string(_eff.value) + "x (" + _syn.name + ")");
            }
        } else if (_type == "add_mult_lefty") {
            if (is_struct(_batter) && _batter.bats == "L") {
                _b.mult_bonus += _eff.value;
                bonus_msg(_b, "+" + string(_eff.value) + "x (" + _syn.name + ")");
            }
        } else if (_type == "team_pair_out_reduction") {
            _b.pair_out_reduction += _eff.value;
        } else if (_type == "team_extra_base_chance") {
            _b.extra_base_bonus += _eff.value;
        } else if (_type == "add_peanuts_on_xbh") {
            if (_result.outcome == "Triple" || _result.outcome == "Home Run") {
                _b.peanut_bonus += _eff.value;
                bonus_msg(_b, "+" + string(_eff.value) + " peanuts (" + _syn.name + ")");
            }
        }
    }
    return bonus_commit(_result, _b);
}

function bonus_pitcher_fatigue(_pitcher, _inning) {
    var _start = max(3, _pitcher.stamina - 1);
    if (_inning <= _start) {
        return 1.0;
    }
    return max(0.5, 1.0 - (_inning - _start) * 0.08);
}

function bonus_pitcher_mods(_result, _pitcher, _inning) {
    var _fatigue = bonus_pitcher_fatigue(_pitcher, _inning);
    if (_result.outcome == "Single" || _result.outcome == "Double") {
        var _vel = max(0, (_pitcher.velocity * _fatigue) - 6);
        _result.peanuts = max(0, _result.peanuts - floor(_vel / 2));
    }
    var _ctl = (_pitcher.control * _fatigue) * 0.05;
    _result.mult = round(max(1, _result.mult - _ctl) * 10) / 10;
    _result.score = round(_result.peanuts * _result.mult);
    return _result;
}

function bonus_batter_mods(_result, _batter, _save_boost) {
    var _bonuses = { power_peanuts: 0, contact_mult: 0, contact_save: false, extra_base: 0 };
    if (variable_struct_exists(_result, "was_groundout") && _result.was_groundout && _result.original_hand == "Pair") {
        var _chance = _batter.contact * 0.04 + _save_boost;
        if (random(1) < _chance) {
            _result.outcome = "Single";
            _result.hand_name = "Pair";
            _result.peanuts = 1;
            _result.mult = 1.5;
            _result.score = 2;
            _result.was_groundout = false;
            _result.played_description = "Pair of " + cards_rank_plural(_result.pair_rank) + " (Contact!)";
            _bonuses.contact_save = true;
        } else {
            return _bonuses;
        }
    }
    if (bonus_is_out(_result.outcome)) {
        return _bonuses;
    }
    var _power = max(0, _batter.power - 5);
    _result.peanuts += _power;
    _bonuses.power_peanuts = _power;
    var _cm = _batter.contact / 10;
    _result.mult = round((_result.mult + _cm) * 10) / 10;
    _bonuses.contact_mult = _cm;
    _result.score = round(_result.peanuts * _result.mult);
    _bonuses.extra_base = _batter.speed * 0.05;
    return _bonuses;
}

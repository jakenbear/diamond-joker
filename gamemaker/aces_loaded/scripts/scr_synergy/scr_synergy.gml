/// @desc Lineup synergies. Checks are data-driven; no JS functions.

function syn_all() {
    static _list = undefined;
    if (_list != undefined) {
        return _list;
    }
    _list = [
        { id: "switch_squad", name: "Switch Squad", description: "3+ lefty batters in lineup", hint: "3 lefty batters...", bonus: { type: "add_mult_lefty", value: 1 }, bonus_desc: "+1 mult on lefty at-bats", check: { type: "count_eq", field: "bats", value: "L", min: 3 } },
        { id: "balanced_lineup", name: "Balanced Lineup", description: "4 lefty + 4 righty batters", hint: "4L + 4R batters...", bonus: { type: "add_peanuts_all", value: 2 }, bonus_desc: "+2 peanuts on all at-bats", check: { type: "balanced_hands", left: 4, right: 4 } },
        { id: "southpaw_stack", name: "Southpaw Stack", description: "5+ lefty batters in lineup", hint: "5 lefty batters...", bonus: { type: "pitcher_control_reduction", value: 1 }, bonus_desc: "Opponent pitcher -1 control", check: { type: "count_eq", field: "bats", value: "L", min: 5 } },
        { id: "murderers_row", name: "Murderer's Row", description: "3 batters with 8+ power", hint: "3 power hitters...", bonus: { type: "add_mult_on_hr", value: 2 }, bonus_desc: "+2 mult on Home Runs", check: { type: "stat_gte", field: "power", min_stat: 8, min: 3 } },
        { id: "contact_factory", name: "Contact Factory", description: "3 batters with 8+ contact", hint: "3 contact hitters...", bonus: { type: "team_pair_out_reduction", value: 0.10 }, bonus_desc: "Pair out chance -10% team-wide", check: { type: "stat_gte", field: "contact", min_stat: 8, min: 3 } },
        { id: "speed_demons", name: "Speed Demons", description: "3 batters with 8+ speed", hint: "3 speedsters...", bonus: { type: "team_extra_base_chance", value: 0.10 }, bonus_desc: "Extra base chance +10% team-wide", check: { type: "stat_gte", field: "speed", min_stat: 8, min: 3 } },
        { id: "well_rounded", name: "Well-Rounded", description: "All 9 batters have no stat below 5", hint: "No stat below 5...", bonus: { type: "add_mult_all", value: 0.5 }, bonus_desc: "+0.5 mult on all at-bats", check: { type: "all_stats_min", min_stat: 5 } },
        { id: "strong_middle", name: "Strong Up the Middle", description: "C, SS, 2B, CF all have 7+ contact", hint: "C/SS/2B/CF contact 7+...", bonus: { type: "pitcher_hit_reduction", value: 0.05 }, bonus_desc: "-5% opponent hit chance", check: { type: "pos_stat", positions: ["C", "SS", "2B", "CF"], field: "contact", min_stat: 7 } },
        { id: "corner_power", name: "Corner Power", description: "1B and 3B both have 8+ power", hint: "1B and 3B power 8+...", bonus: { type: "add_peanuts_on_xbh", value: 3 }, bonus_desc: "+3 peanuts on triples+", check: { type: "pos_stat", positions: ["1B", "3B"], field: "power", min_stat: 8 } },
        { id: "hired_guns", name: "Hired Guns", description: "2+ bonus players in lineup", hint: "2 bonus players...", bonus: { type: "bonus_player_stat_boost", value: 1 }, bonus_desc: "Bonus players +1 to all stats", check: { type: "bonus_count", min: 2 } },
        { id: "mercenary_squad", name: "Mercenary Squad", description: "3 bonus players in lineup", hint: "3 bonus players...", bonus: { type: "add_mult_all", value: 1.0 }, bonus_desc: "+1.0 mult on all at-bats", check: { type: "bonus_count", min: 3 } },
        { id: "small_ball", name: "Small Ball", description: "5+ batters with 7+ contact and 6+ speed", hint: "5 contact/speed bats...", bonus: { type: "add_peanuts_all", value: 1 }, bonus_desc: "+1 peanut on all at-bats", check: { type: "contact_speed", contact: 7, speed: 6, min: 5 } },
    ];
    return _list;
}

function syn_pos(_batters, _pos) {
    for (var i = 0; i < array_length(_batters); i++) {
        if (_batters[i].pos == _pos) {
            return _batters[i];
        }
    }
    return undefined;
}

function syn_matches(_check, _batters) {
    var _type = _check.type;
    if (_type == "count_eq") {
        var _n = 0;
        for (var i = 0; i < array_length(_batters); i++) {
            if (_batters[i][$ _check.field] == _check.value) {
                _n += 1;
            }
        }
        return _n >= _check.min;
    }
    if (_type == "stat_gte") {
        var _n = 0;
        for (var i = 0; i < array_length(_batters); i++) {
            if (_batters[i][$ _check.field] >= _check.min_stat) {
                _n += 1;
            }
        }
        return _n >= _check.min;
    }
    if (_type == "balanced_hands") {
        var _l = 0;
        var _r = 0;
        for (var i = 0; i < array_length(_batters); i++) {
            if (_batters[i].bats == "L") {
                _l += 1;
            } else if (_batters[i].bats == "R") {
                _r += 1;
            }
        }
        return _l >= _check.left && _r >= _check.right;
    }
    if (_type == "all_stats_min") {
        if (array_length(_batters) < 9) {
            return false;
        }
        for (var i = 0; i < array_length(_batters); i++) {
            var _b = _batters[i];
            if (_b.power < _check.min_stat || _b.contact < _check.min_stat || _b.speed < _check.min_stat) {
                return false;
            }
        }
        return true;
    }
    if (_type == "pos_stat") {
        var _pos = _check.positions;
        for (var i = 0; i < array_length(_pos); i++) {
            var _p = syn_pos(_batters, _pos[i]);
            if (!is_struct(_p) || _p[$ _check.field] < _check.min_stat) {
                return false;
            }
        }
        return true;
    }
    if (_type == "bonus_count") {
        var _n = 0;
        for (var i = 0; i < array_length(_batters); i++) {
            if (variable_struct_exists(_batters[i], "is_bonus") && _batters[i].is_bonus) {
                _n += 1;
            }
        }
        return _n >= _check.min;
    }
    if (_type == "contact_speed") {
        var _n = 0;
        for (var i = 0; i < array_length(_batters); i++) {
            if (_batters[i].contact >= _check.contact && _batters[i].speed >= _check.speed) {
                _n += 1;
            }
        }
        return _n >= _check.min;
    }
    return false;
}

function syn_calculate(_batters) {
    var _all = syn_all();
    var _out = [];
    for (var i = 0; i < array_length(_all); i++) {
        if (syn_matches(_all[i].check, _batters)) {
            array_push(_out, _all[i]);
        }
    }
    return _out;
}

function syn_bonus_stat(_synergies) {
    var _n = 0;
    for (var i = 0; i < array_length(_synergies); i++) {
        if (_synergies[i].bonus.type == "bonus_player_stat_boost") {
            _n += _synergies[i].bonus.value;
        }
    }
    return _n;
}

function syn_bonus_sum(_synergies, _type) {
    var _n = 0;
    for (var i = 0; i < array_length(_synergies); i++) {
        if (_synergies[i].bonus.type == _type) {
            _n += _synergies[i].bonus.value;
        }
    }
    return _n;
}

function syn_is_active(_id, _batters) {
    var _active = syn_calculate(_batters);
    for (var i = 0; i < array_length(_active); i++) {
        if (_active[i].id == _id) {
            return true;
        }
    }
    return false;
}

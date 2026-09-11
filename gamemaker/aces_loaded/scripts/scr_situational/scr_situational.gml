/// @desc Post-eval outcome transforms. Mirrors SituationalEngine.js.

function sit_check(_outcome, _bb, _speed, _error_mult) {
    if (_error_mult == undefined) {
        _error_mult = 1;
    }
    if (_outcome == "Groundout" || _outcome == "Flyout") {
        var _err = sit_error(_outcome, _bb, _error_mult);
        if (is_struct(_err)) {
            return _err;
        }
    }
    if (_outcome == "Groundout" && bb_base_filled(_bb, 0) && _bb.outs < 2) {
        var _dp = sit_double_play(_speed);
        if (is_struct(_dp)) {
            return _dp;
        }
    }
    if (_outcome == "Groundout" && bb_base_filled(_bb, 0)) {
        var _fc = sit_fielders_choice();
        if (is_struct(_fc)) {
            return _fc;
        }
    }
    if (_outcome == "Strikeout" && !bb_base_filled(_bb, 0)) {
        var _d3 = sit_dropped_third(_speed);
        if (is_struct(_d3)) {
            return _d3;
        }
    }
    if (_outcome == "Double") {
        var _tr = sit_stretch_triple(_speed);
        if (is_struct(_tr)) {
            return _tr;
        }
    }
    if (_outcome == "Groundout" && _bb.outs < 2 && (bb_base_filled(_bb, 1) || bb_base_filled(_bb, 2))) {
        var _prod = 0.40 + (_speed == undefined ? 5 : _speed) * 0.03;
        if (random(1) < _prod) {
            return { outcome: _outcome, transformed: false, type: "", description: "", productive_out: true };
        }
    }
    return { outcome: _outcome, transformed: false, type: "", description: "", productive_out: false };
}

function sit_dropped_third(_speed) {
    var _chance = 0.05 + _speed * 0.01;
    if (random(1) < _chance) {
        return {
            outcome: "Dropped Third Strike",
            transformed: true,
            type: "dropped_third_strike",
            description: "Dropped third strike! Batter races to first!",
            productive_out: false,
        };
    }
    return undefined;
}

function sit_stretch_triple(_speed) {
    var _spd = (_speed == undefined) ? 5 : _speed;
    var _chance = max(0.04, 0.15 + (_spd - 5) * 0.035);
    if (random(1) < _chance) {
        return {
            outcome: "Triple",
            transformed: true,
            type: "stretch_triple",
            description: "He's not stopping at second — triple!",
            productive_out: false,
        };
    }
    return undefined;
}

function sit_wild_pitch(_control, _bases) {
    var _any = false;
    for (var i = 0; i < 3; i++) {
        if (_bases[i] != "" && _bases[i] != false) {
            _any = true;
            break;
        }
    }
    if (!_any) {
        return { triggered: false, description: "" };
    }
    var _chance = max(0, (6 - _control) * 0.02);
    if (_chance > 0 && random(1) < _chance) {
        return { triggered: true, description: "Wild pitch! Runner advances!" };
    }
    return { triggered: false, description: "" };
}

function sit_hbp(_control) {
    var _chance = max(0, (5 - _control) * 0.015);
    if (_chance > 0 && random(1) < _chance) {
        return { triggered: true, description: "Hit by pitch! Batter takes first base!" };
    }
    return { triggered: false, description: "" };
}

function sit_double_play(_speed) {
    var _chance = max(0.05, 0.35 - _speed * 0.03);
    if (random(1) < _chance) {
        return {
            outcome: "Double Play",
            transformed: true,
            type: "double_play",
            description: "Ground ball to short — double play!",
            productive_out: false,
        };
    }
    return undefined;
}

function sit_fielders_choice() {
    if (random(1) < 0.40) {
        return {
            outcome: "Fielder's Choice",
            transformed: true,
            type: "fielders_choice",
            description: "Fielder's choice — lead runner thrown out!",
            productive_out: false,
        };
    }
    return undefined;
}

function sit_error(_outcome, _bb, _error_mult) {
    var _chance = (0.04 + max(0, (_bb.inning - 6) * 0.01)) * _error_mult;
    if (random(1) < _chance) {
        return {
            outcome: "Error",
            transformed: true,
            type: "error",
            description: "Error on the " + string_lower(_outcome) + "! Batter reaches first!",
            productive_out: false,
        };
    }
    return undefined;
}

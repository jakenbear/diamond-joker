/// @desc Count-based discard. Each discard is a pitch.

function count_create() {
    return { balls: 0, strikes: 0, fouls: 0 };
}

function count_reset(_c) {
    _c.balls = 0;
    _c.strikes = 0;
    _c.fouls = 0;
}

function count_set_starting_balls(_c, _n) {
    _c.balls = max(0, _n);
    _c.strikes = 0;
    _c.fouls = 0;
}

function count_record_discard(_c, _vel, _ctl, _contact) {
    var _bal = data_balance();
    var _result = { is_strike: false, is_ball: false, is_foul: false, is_strikeout: false, is_walk: false };
    var _strike = 0.55 + (_vel - 5) * 0.02 + (_ctl - 5) * 0.02 - (_contact - 5) * 0.03;
    _strike = clamp(_strike, 0.25, 0.75);

    if (_c.strikes < 2) {
        if (random(1) < _strike) {
            _c.strikes += 1;
            _result.is_strike = true;
        } else {
            _c.balls += 1;
            _result.is_ball = true;
            if (_c.balls >= 4) _result.is_walk = true;
        }
    } else {
        var _foul = _contact * 0.04;
        var _remain = 1.0 - _foul;
        var _k = _remain * _strike;
        var _roll = random(1);
        if (_roll < _foul) {
            _c.fouls += 1;
            _result.is_foul = true;
        } else if (_roll < _foul + _k) {
            _c.strikes += 1;
            _result.is_strike = true;
            _result.is_strikeout = true;
        } else {
            _c.balls += 1;
            _result.is_ball = true;
            if (_c.balls >= 4) _result.is_walk = true;
        }
    }
    return _result;
}

function count_modifiers(_c) {
    var _key = string(_c.balls) + "-" + string(_c.strikes);
    switch (_key) {
        case "3-0": return { peanuts: 2, mult: 1.0 };
        case "2-0": return { peanuts: 1, mult: 0.5 };
        case "3-1": return { peanuts: 1, mult: 0.5 };
        case "3-2": return { peanuts: 0, mult: 0.5 };
        case "0-1": return { peanuts: 0, mult: -0.2 };
        case "1-2": return { peanuts: 0, mult: -0.3 };
        case "0-2": return { peanuts: -1, mult: -0.5 };
        default: return { peanuts: 0, mult: 0 };
    }
}

function count_text(_c) {
    return string(_c.balls) + "-" + string(_c.strikes);
}

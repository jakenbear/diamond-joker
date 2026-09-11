/// @desc Baseball-style AVG/HR/SB from 1-10 stats. Seeded from player name.

function stat_hash01(_name) {
    var _hash = 0;
    var _n = string_length(_name);
    for (var i = 1; i <= _n; i++) {
        _hash = ((_hash << 5) - _hash) + ord(string_char_at(_name, i));
        _hash = _hash & $7fffffff;
    }
    return (_hash mod 10000) / 10000;
}

function stat_avg(_contact, _name) {
    var _base = 0.150 + (_contact - 1) * 0.028;
    var _jitter = (stat_hash01(_name + "avg") - 0.5) * 0.030;
    return clamp(_base + _jitter, 0.100, 0.450);
}

function stat_hr(_power, _name) {
    var _base = (_power - 1) * 6.7;
    var _jitter = (stat_hash01(_name + "hr") - 0.5) * 6;
    return max(0, round(_base + _jitter));
}

function stat_sb(_speed, _name) {
    var _base = (_speed - 1) * 8.9;
    var _jitter = (stat_hash01(_name + "sb") - 0.5) * 8;
    return max(0, round(_base + _jitter));
}

function stat_fmt_avg(_contact, _name) {
    var _s = string_replace_all(string_format(stat_avg(_contact, _name), 1, 3), " ", "");
    if (string_char_at(_s, 1) == "0") {
        _s = string_delete(_s, 1, 1);
    }
    return _s;
}

function stat_line(_p) {
    return "AVG " + stat_fmt_avg(_p.contact, _p.name) + "  HR " + string(stat_hr(_p.power, _p.name)) + "  SB " + string(stat_sb(_p.speed, _p.name));
}

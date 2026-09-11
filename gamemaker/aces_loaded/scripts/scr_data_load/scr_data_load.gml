/// @desc Load included JSON tables once.

function data_json(_fname) {
    var _tries = [_fname, working_directory + _fname, working_directory + "datafiles/" + _fname, "datafiles/" + _fname];
    var _path = "";
    var _found = false;
    for (var i = 0; i < array_length(_tries); i++) {
        if (file_exists(_tries[i])) {
            _path = _tries[i];
            _found = true;
            break;
        }
    }
    if (!_found) {
        show_debug_message("Missing data file: " + _fname);
        return undefined;
    }
    var _buf = buffer_load(_path);
    var _str = buffer_read(_buf, buffer_text);
    buffer_delete(_buf);
    return json_parse(_str);
}

function data_teams_full() {
    static _teams = undefined;
    if (_teams == undefined) {
        _teams = data_json("teams.json");
        if (_teams == undefined) {
            _teams = [];
        }
    }
    return _teams;
}

function data_team_full(_id) {
    var _teams = data_teams_full();
    for (var i = 0; i < array_length(_teams); i++) {
        if (_teams[i].id == _id) {
            return _teams[i];
        }
    }
    if (array_length(_teams) == 0) {
        return undefined;
    }
    return _teams[0];
}

function data_batter_traits() {
    static _t = undefined;
    if (_t == undefined) {
        _t = data_json("batter_traits.json");
        if (_t == undefined) {
            _t = [];
        }
    }
    return _t;
}

function data_trait_by_id(_id) {
    var _t = data_batter_traits();
    for (var i = 0; i < array_length(_t); i++) {
        if (_t[i].id == _id) {
            return _t[i];
        }
    }
    return undefined;
}

function data_table(_fname) {
    var _t = data_json(_fname);
    return (_t == undefined) ? [] : _t;
}

function data_coaches() {
    static _t = undefined;
    if (_t == undefined) {
        _t = data_table("coaches.json");
    }
    return _t;
}

function data_mascots() {
    static _t = undefined;
    if (_t == undefined) {
        _t = data_table("mascots.json");
    }
    return _t;
}

function data_bonus_players() {
    static _t = undefined;
    if (_t == undefined) {
        _t = data_table("bonus_players.json");
    }
    return _t;
}

function data_staff_offer(_owned_ids) {
    var _coaches = [];
    var _all_c = data_coaches();
    for (var i = 0; i < array_length(_all_c); i++) {
        var _taken = false;
        for (var j = 0; j < array_length(_owned_ids); j++) {
            if (_owned_ids[j] == _all_c[i].id) {
                _taken = true;
                break;
            }
        }
        if (!_taken) {
            array_push(_coaches, _all_c[i]);
        }
    }
    for (var i = array_length(_coaches) - 1; i > 0; i--) {
        var _j = irandom(i);
        var _tmp = _coaches[i];
        _coaches[i] = _coaches[_j];
        _coaches[_j] = _tmp;
    }
    var _picks = [];
    var _n = min(2, array_length(_coaches));
    for (var i = 0; i < _n; i++) {
        array_push(_picks, _coaches[i]);
    }
    var _mascots = [];
    var _all_m = data_mascots();
    var _weighted = [];
    for (var i = 0; i < array_length(_all_m); i++) {
        var _taken = false;
        for (var j = 0; j < array_length(_owned_ids); j++) {
            if (_owned_ids[j] == _all_m[i].id) {
                _taken = true;
                break;
            }
        }
        if (!_taken) {
            var _w = 1;
            if (_all_m[i].rarity == "common") {
                _w = 3;
            } else if (_all_m[i].rarity == "uncommon") {
                _w = 2;
            }
            for (var k = 0; k < _w; k++) {
                array_push(_weighted, _all_m[i]);
            }
        }
    }
    if (array_length(_weighted) > 0) {
        array_push(_picks, _weighted[irandom(array_length(_weighted) - 1)]);
    }
    return _picks;
}

function data_bonus_pack(_tier, _owned_ids) {
    var _count = (_tier == "gold") ? 3 : 2;
    var _all = data_bonus_players();
    var _available = [];
    for (var i = 0; i < array_length(_all); i++) {
        var _taken = false;
        for (var j = 0; j < array_length(_owned_ids); j++) {
            if (_owned_ids[j] == _all[i].id) {
                _taken = true;
                break;
            }
        }
        if (!_taken) {
            array_push(_available, _all[i]);
        }
    }
    if (array_length(_available) == 0) {
        return [];
    }
    var _picks = [];
    if (_tier == "gold") {
        var _rares = [];
        for (var i = 0; i < array_length(_available); i++) {
            if (_available[i].rarity == "rare") {
                array_push(_rares, _available[i]);
            }
        }
        if (array_length(_rares) > 0) {
            array_push(_picks, _rares[irandom(array_length(_rares) - 1)]);
        }
    }
    var _weighted = [];
    for (var i = 0; i < array_length(_available); i++) {
        var _dup = false;
        for (var j = 0; j < array_length(_picks); j++) {
            if (_picks[j].id == _available[i].id) {
                _dup = true;
                break;
            }
        }
        if (_dup) {
            continue;
        }
        var _w = 1;
        if (_available[i].rarity == "common") {
            _w = 3;
        } else if (_available[i].rarity == "uncommon") {
            _w = 2;
        }
        for (var k = 0; k < _w; k++) {
            array_push(_weighted, _available[i]);
        }
    }
    while (array_length(_picks) < _count && array_length(_weighted) > 0) {
        var _pick = _weighted[irandom(array_length(_weighted) - 1)];
        var _already = false;
        for (var i = 0; i < array_length(_picks); i++) {
            if (_picks[i].id == _pick.id) {
                _already = true;
                break;
            }
        }
        if (!_already) {
            array_push(_picks, _pick);
        }
        for (var i = array_length(_weighted) - 1; i >= 0; i--) {
            if (_weighted[i].id == _pick.id) {
                array_delete(_weighted, i, 1);
            }
        }
    }
    return _picks;
}

function data_shop_offer(_owned_ids, _count) {
    var _all = data_batter_traits();
    var _available = [];
    for (var i = 0; i < array_length(_all); i++) {
        var _taken = false;
        for (var j = 0; j < array_length(_owned_ids); j++) {
            if (_owned_ids[j] == _all[i].id) {
                _taken = true;
                break;
            }
        }
        if (!_taken) {
            array_push(_available, _all[i]);
        }
    }
    if (array_length(_available) == 0) {
        return [];
    }
    var _weighted = [];
    for (var i = 0; i < array_length(_available); i++) {
        var _w = 1;
        if (_available[i].rarity == "common") {
            _w = 3;
        } else if (_available[i].rarity == "uncommon") {
            _w = 2;
        }
        for (var k = 0; k < _w; k++) {
            array_push(_weighted, _available[i]);
        }
    }
    var _selected = [];
    var _limit = min(_count, array_length(_available));
    while (array_length(_selected) < _limit) {
        var _pick = _weighted[irandom(array_length(_weighted) - 1)];
        var _dup = false;
        for (var i = 0; i < array_length(_selected); i++) {
            if (_selected[i].id == _pick.id) {
                _dup = true;
                break;
            }
        }
        if (!_dup) {
            array_push(_selected, _pick);
        }
    }
    return _selected;
}

function data_pitcher_traits() {
    static _t = undefined;
    if (_t == undefined) {
        _t = data_table("pitcher_traits.json");
    }
    return _t;
}

function data_pitcher_trait_by_id(_id) {
    var _t = data_pitcher_traits();
    for (var i = 0; i < array_length(_t); i++) {
        if (_t[i].id == _id) {
            return _t[i];
        }
    }
    return undefined;
}

function data_pitcher_trait_ids() {
    var _all = data_pitcher_traits();
    if (array_length(_all) > 0) {
        var _ids = [];
        for (var i = 0; i < array_length(_all); i++) {
            array_push(_ids, _all[i].id);
        }
        return _ids;
    }
    return ["heater", "painted_corner", "changeup", "slider", "intimidation", "closers_instinct", "curveball", "knuckleball", "cutter", "sinkerballer", "junkballer", "frontline_ace", "fireballer", "splitter", "bulldog", "escape_artist", "rally_killer", "sinker", "backfoot_slider", "wild_thing"];
}

function data_pitch_types() {
    static _p = undefined;
    if (_p != undefined) {
        return _p;
    }
    _p = {
        fastball: { name: "Fastball", hit_mod: -0.03, k_mult: 1.15, xbh_mult: 1.4, stamina: 0.06 },
        breaking: { name: "Breaking", hit_mod: -0.05, k_mult: 1.0, xbh_mult: 0.8, stamina: 0.04 },
        changeup: { name: "Changeup", hit_mod: 0, k_mult: 0.95, xbh_mult: 0.6, stamina: 0.02 },
        slider: { name: "Slider", hit_mod: -0.02, k_mult: 1.05, xbh_mult: 0.5, stamina: 0.03 },
        cutter: { name: "Cutter", hit_mod: -0.03, k_mult: 1.08, xbh_mult: 0.7, stamina: 0.04 },
        curveball: { name: "Curveball", hit_mod: -0.04, k_mult: 1.1, xbh_mult: 0.5, stamina: 0.04 },
        sinker: { name: "Sinker", hit_mod: 0.01, k_mult: 0.85, xbh_mult: 0.3, stamina: 0.03 },
        splitter: { name: "Splitter", hit_mod: -0.04, k_mult: 1.2, xbh_mult: 0.9, stamina: 0.05 },
        twoseam: { name: "Two-Seam", hit_mod: -0.01, k_mult: 0.9, xbh_mult: 0.4, stamina: 0.03 },
        knuckle: { name: "Knuckleball", hit_mod: -0.06, k_mult: 1.0, xbh_mult: 1.2, stamina: 0.01 },
        screwball: { name: "Screwball", hit_mod: -0.05, k_mult: 1.05, xbh_mult: 0.6, stamina: 0.05 },
        palmball: { name: "Palmball", hit_mod: -0.01, k_mult: 0.9, xbh_mult: 0.4, stamina: 0.02 },
        ibb: { name: "IBB", hit_mod: 0, k_mult: 0, xbh_mult: 0, stamina: 0 },
    };
    return _p;
}

/// @desc Lineups, current batter/pitcher, pitch repertoire.

function roster_copy_batter(_src, _i) {
    return {
        name: _src.name,
        pos: _src.pos,
        power: _src.power,
        contact: _src.contact,
        speed: _src.speed,
        bats: _src.bats,
        innate: _src.innateTraits,
        traits: [],
        lineup_index: _i,
        is_bonus: false,
        bonus_id: "",
        lineup_effect: undefined,
        lineup_description: "",
    };
}

function roster_copy_pitcher(_src) {
    var _p = {
        name: _src.name,
        velocity: _src.velocity,
        control: _src.control,
        stamina: _src.stamina,
        throws: _src.throws,
        traits: [],
        pitches: [],
        used: false,
    };
    _p.pitches = roster_assign_pitches(_p);
    return _p;
}

function roster_assign_pitcher_traits(_p) {
    var _all = data_pitcher_traits();
    if (array_length(_all) == 0) {
        var _ids = data_pitcher_trait_ids();
        var _n = (random(1) < 0.5) ? 1 : 2;
        _p.traits = [];
        for (var i = 0; i < min(_n, array_length(_ids)); i++) {
            array_push(_p.traits, { id: _ids[i], name: _ids[i] });
        }
        return;
    }
    var _pool = [];
    array_copy(_pool, 0, _all, 0, array_length(_all));
    for (var i = array_length(_pool) - 1; i > 0; i--) {
        var _j = irandom(i);
        var _tmp = _pool[i];
        _pool[i] = _pool[_j];
        _pool[_j] = _tmp;
    }
    var _n = (random(1) < 0.5) ? 1 : 2;
    _p.traits = [];
    for (var i = 0; i < min(_n, array_length(_pool)); i++) {
        array_push(_p.traits, _pool[i]);
    }
}

function roster_assign_pitches(_p) {
    var _v = _p.velocity;
    var _c = _p.control;
    if (_v >= 10) return ["fastball", "splitter", "slider", "cutter"];
    if (_v >= 9 && _c >= 7) return ["fastball", "cutter", "curveball", "splitter"];
    if (_v >= 9) return ["fastball", "slider", "splitter", "breaking"];
    if (_v >= 8 && _c >= 8) return ["fastball", "cutter", "changeup", "curveball"];
    if (_c >= 9) return ["sinker", "curveball", "palmball", "cutter"];
    if (_c >= 8) return ["twoseam", "curveball", "changeup", "cutter"];
    if (_v >= 8) return ["fastball", "slider", "cutter", "breaking"];
    if (_v <= 5 && _c <= 5) return ["knuckle", "screwball", "palmball", "changeup"];
    if (_p.stamina >= 8) return ["sinker", "twoseam", "changeup", "slider"];
    return ["fastball", "slider", "changeup", "breaking"];
}

function roster_create(_team, _pitcher_index, _opp) {
    var _batters = [];
    for (var i = 0; i < array_length(_team.batters); i++) {
        array_push(_batters, roster_copy_batter(_team.batters[i], i));
    }
    var _opp_batters = [];
    for (var i = 0; i < array_length(_opp.batters); i++) {
        array_push(_opp_batters, roster_copy_batter(_opp.batters[i], i));
    }
    var _my = roster_copy_pitcher(_team.pitchers[_pitcher_index]);
    var _bull = [];
    for (var i = 0; i < array_length(_team.pitchers); i++) {
        if (i != _pitcher_index) {
            array_push(_bull, roster_copy_pitcher(_team.pitchers[i]));
        }
    }
    var _opp_p = roster_copy_pitcher(_opp.pitchers[0]);
    roster_assign_pitcher_traits(_opp_p);
    return {
        team: _team,
        opp_team: _opp,
        batters: _batters,
        opp_batters: _opp_batters,
        batter_index: 0,
        opp_batter_index: 0,
        my_pitcher: _my,
        my_stamina: 1.0,
        opp_pitcher: _opp_p,
        bullpen: _bull,
        bonus_count: 0,
    };
}

function roster_batter(_r) {
    return _r.batters[_r.batter_index];
}

function roster_opp_batter(_r) {
    return _r.opp_batters[_r.opp_batter_index];
}

function roster_opp_pitcher(_r) {
    return _r.opp_pitcher;
}

function roster_my_pitcher(_r) {
    return _r.my_pitcher;
}

function roster_bullpen_ready(_r) {
    var _out = [];
    for (var i = 0; i < array_length(_r.bullpen); i++) {
        if (!_r.bullpen[i].used) {
            array_push(_out, { index: i, pitcher: _r.bullpen[i] });
        }
    }
    return _out;
}

function roster_swap_pitcher(_r, _index) {
    if (_index < 0 || _index >= array_length(_r.bullpen)) {
        return _r.my_pitcher;
    }
    var _rel = _r.bullpen[_index];
    if (_rel.used) {
        return _r.my_pitcher;
    }
    _rel.used = true;
    _r.my_pitcher = _rel;
    _r.my_stamina = 1.0;
    return _r.my_pitcher;
}

function roster_pitcher_trait_names(_p) {
    var _names = "";
    if (!is_struct(_p) || !is_array(_p.traits)) {
        return _names;
    }
    for (var i = 0; i < array_length(_p.traits); i++) {
        if (i > 0) {
            _names += " / ";
        }
        _names += _p.traits[i].name;
    }
    return _names;
}

function roster_advance_batter(_r) {
    _r.batter_index = (_r.batter_index + 1) mod 9;
}

function roster_advance_opp_batter(_r) {
    _r.opp_batter_index = (_r.opp_batter_index + 1) mod 9;
}

function roster_shop_trait_count(_b) {
    var _n = 0;
    for (var i = 0; i < array_length(_b.traits); i++) {
        var _t = _b.traits[i];
        if (is_struct(_t) && (!variable_struct_exists(_t, "isInnate") || !_t.isInnate)) {
            _n += 1;
        }
    }
    return _n;
}

function roster_equip_trait(_r, _batter_index, _trait) {
    var _b = _r.batters[_batter_index];
    if (roster_shop_trait_count(_b) >= 2) {
        return false;
    }
    array_push(_b.traits, _trait);
    return true;
}

function roster_apply_draft(_r, _picks) {
    var _owned = [];
    for (var i = 0; i < array_length(_r.batters); i++) {
        var _choice = (i < array_length(_picks)) ? _picks[i] : 0;
        var _ids = _r.batters[i].innate;
        if (_choice < 0 || _choice >= array_length(_ids)) {
            _choice = 0;
        }
        var _trait = data_trait_by_id(_ids[_choice]);
        if (is_struct(_trait)) {
            array_push(_r.batters[i].traits, _trait);
            array_push(_owned, _trait.id);
        }
    }
    return _owned;
}

function roster_owned_ids(_r) {
    var _ids = [];
    for (var i = 0; i < array_length(_r.batters); i++) {
        var _traits = _r.batters[i].traits;
        for (var j = 0; j < array_length(_traits); j++) {
            if (is_struct(_traits[j])) {
                array_push(_ids, _traits[j].id);
            }
        }
    }
    return _ids;
}

function roster_lineup_effects(_r) {
    var _out = [];
    for (var i = 0; i < array_length(_r.batters); i++) {
        var _b = _r.batters[i];
        if (variable_struct_exists(_b, "is_bonus") && _b.is_bonus && is_struct(_b.lineup_effect)) {
            array_push(_out, _b.lineup_effect);
        }
    }
    return _out;
}

function roster_bonus_ids(_r) {
    var _ids = [];
    for (var i = 0; i < array_length(_r.batters); i++) {
        if (variable_struct_exists(_r.batters[i], "is_bonus") && _r.batters[i].is_bonus) {
            array_push(_ids, _r.batters[i].bonus_id);
        }
    }
    return _ids;
}

function roster_add_bonus(_r, _src, _replace) {
    if (_r.bonus_count >= 3) {
        return false;
    }
    if (_replace < 0 || _replace >= 9) {
        return false;
    }
    var _trait = data_trait_by_id(_src.innateTraitId);
    var _traits = [];
    if (is_struct(_trait)) {
        var _copy = {
            id: _trait.id,
            name: _trait.name,
            description: _trait.description,
            price: _trait.price,
            rarity: _trait.rarity,
            phase: _trait.phase,
            effect: _trait.effect,
            isInnate: true,
        };
        array_push(_traits, _copy);
    }
    _r.batters[_replace] = {
        name: _src.name,
        pos: _src.pos,
        power: _src.power,
        contact: _src.contact,
        speed: _src.speed,
        bats: _src.bats,
        innate: [_src.innateTraitId],
        traits: _traits,
        lineup_index: _replace,
        is_bonus: true,
        bonus_id: _src.id,
        lineup_effect: _src.lineupEffect,
        lineup_description: _src.lineupDescription,
    };
    _r.bonus_count += 1;
    return true;
}

function roster_effective_batter(_r, _bb) {
    var _b = roster_batter(_r);
    var _hired = 0;
    if (variable_struct_exists(_b, "is_bonus") && _b.is_bonus) {
        _hired = syn_bonus_stat(syn_calculate(_r.batters));
    }
    return {
        name: _b.name,
        pos: _b.pos,
        power: _b.power + bb_staff_stat(_bb, "power") + _hired,
        contact: _b.contact + bb_staff_stat(_bb, "contact") + _hired,
        speed: _b.speed + bb_staff_stat(_bb, "speed") + _hired,
        bats: _b.bats,
        traits: _b.traits,
        is_bonus: variable_struct_exists(_b, "is_bonus") && _b.is_bonus,
    };
}

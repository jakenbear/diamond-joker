/// @desc Camera punch, color flash, bag/score particles, HR celebration.
/// Primitive-only: no new sprites. GUI shake is a world-matrix offset.

function fx_init() {
    global.fx = {
        shake_t: 0,
        shake_dur: 1,
        shake_mag: 0,
        ox: 0,
        oy: 0,
        flash_t: 0,
        flash_dur: 1,
        flash_col: c_white,
        flash_a: 0,
        score_scale: 1,
        bits: [],
        lights: [],
        hops: [],
        hr_t: 0,
    };
}

function fx_ready() {
    return variable_global_exists("fx") && is_struct(global.fx);
}

function fx_punch(_frames, _mag) {
    if (!fx_ready()) {
        return;
    }
    global.fx.shake_t = max(global.fx.shake_t, _frames);
    global.fx.shake_dur = max(1, _frames);
    global.fx.shake_mag = max(global.fx.shake_mag, _mag);
}

function fx_flash(_col, _frames, _alpha) {
    if (!fx_ready()) {
        return;
    }
    global.fx.flash_col = _col;
    global.fx.flash_t = max(global.fx.flash_t, _frames);
    global.fx.flash_dur = max(1, _frames);
    global.fx.flash_a = max(global.fx.flash_a, _alpha);
}

function fx_score_punch() {
    if (!fx_ready()) {
        return;
    }
    global.fx.score_scale = 1.35;
}

function fx_bit_push(_bit) {
    if (array_length(global.fx.bits) >= 180) {
        array_delete(global.fx.bits, 0, 1);
    }
    array_push(global.fx.bits, _bit);
}

function fx_burst(_px, _py, _n, _col, _kind, _spd) {
    if (!fx_ready()) {
        return;
    }
    repeat (_n) {
        var _ang = random(360);
        var _v = _spd * (0.4 + random(0.8));
        fx_bit_push({
            px: _px,
            py: _py,
            vx: lengthdir_x(_v, _ang),
            vy: lengthdir_y(_v, _ang) - ((_kind == "confetti") ? (1 + random(2)) : 0),
            life: 18 + irandom(22),
            max_life: 40,
            col: _col,
            size: (_kind == "peanut") ? 3 : (1 + irandom(2)),
            kind: _kind,
            grav: (_kind == "dirt") ? 0.18 : ((_kind == "confetti") ? 0.12 : 0.04),
        });
    }
}

function fx_diamond_dirt() {
    var _cx = 640;
    var _cy = 368;
    var _sz = 168;
    var _bases = (variable_global_exists("session") && is_struct(global.session)) ? global.session.bases : [false, false, false];
    if (_bases[0]) {
        fx_burst(_cx + _sz, _cy, 7, pal_dirt(), "dirt", 1.8);
    }
    if (_bases[1]) {
        fx_burst(_cx, _cy - _sz, 7, pal_dirt(), "dirt", 1.8);
    }
    if (_bases[2]) {
        fx_burst(_cx - _sz, _cy, 7, pal_dirt(), "dirt", 1.8);
    }
    fx_burst(_cx, _cy + _sz, 8, pal_dirt2(), "dirt", 2);
    fx_burst(200, 36, 6, pal_gold(), "spark", 1.4);
}

function fx_peanuts() {
    fx_burst(640, 44, 10, pal_gold(), "peanut", 1.6);
    fx_burst(640, 44, 6, pal_cream(), "spark", 1.2);
}

function fx_stand_lights(_slam) {
    var _cols = [c_white, pal_gold(), pal_orange(), pal_red(), pal_green()];
    var _towers = [[220, 36], [1060, 36]];
    var _n = _slam ? 10 : 8;
    for (var t = 0; t < 2; t++) {
        for (var i = 0; i < _n; i++) {
            array_push(global.fx.lights, {
                kind: "glow",
                px: _towers[t][0],
                py: _towers[t][1],
                delay: i * 9,
                t: 0,
                dur: 16,
                col: _cols[i % array_length(_cols)],
                rad: 36 + irandom(22),
            });
        }
        array_push(global.fx.lights, {
            kind: "ray",
            px: _towers[t][0],
            py: _towers[t][1] + 70,
            delay: 12,
            t: 0,
            dur: 48,
            col: pal_gold(),
            rad: 8,
        });
    }
}

function fx_celebrate_runs(_runs) {
    if (!fx_ready() || _runs <= 0) {
        return;
    }
    var _home_px = 640;
    var _home_py = 536;
    var _team = "usa";
    if (variable_global_exists("session") && is_struct(global.session)) {
        var _batting = (global.session.half == "bot") ? global.session.opponent_team : global.session.player_team;
        if (is_struct(_batting)) {
            _team = ui_team_key(_batting.id);
        }
    }
    var _spr = asset_get_index("spr_" + _team + "_runner");
    var _n = min(4, _runs);
    for (var i = 0; i < _n; i++) {
        array_push(global.fx.hops, {
            px: _home_px,
            py: _home_py,
            from_px: _home_px,
            from_py: _home_py,
            to_px: _home_px - 48 - i * 26,
            to_py: _home_py - 10,
            delay: i * 9,
            t: 0,
            life: 110,
            spr: _spr,
        });
    }
}

function fx_hr(_runs) {
    if (!fx_ready()) {
        return;
    }
    var _slam = (_runs >= 4);
    global.fx.hr_t = _slam ? 90 : 70;
    fx_punch(_slam ? 22 : 18, _slam ? 7 : 5);
    fx_flash(c_white, 8, 0.45);
    fx_flash(pal_gold(), 22, 0.28);
    fx_score_punch();
    fx_peanuts();
    fx_diamond_dirt();
    fx_stand_lights(_slam);
    fx_celebrate_runs(max(1, _runs));
    var _home_px = 640;
    var _home_py = 536;
    fx_burst(_home_px, _home_py, _slam ? 36 : 24, pal_gold(), "spark", 4.2);
    fx_burst(_home_px, _home_py, 12, c_white, "spark", 3.2);
    var _n = _slam ? 70 : 42;
    var _cols = [pal_gold(), pal_cream(), pal_orange(), pal_red(), pal_green(), c_white];
    for (var i = 0; i < _n; i++) {
        fx_burst(80 + irandom(1120), -8 - irandom(40), 1, _cols[i % array_length(_cols)], "confetti", 1.4 + random(1.8));
    }
}

function fx_play_result(_outcome, _runs) {
    if (!fx_ready()) {
        return;
    }
    if (_outcome == "Home Run") {
        fx_hr(_runs);
        return;
    }
    if (_outcome == "HBP") {
        fx_punch(8, 3);
        fx_flash(pal_orange(), 8, 0.22);
        fx_diamond_dirt();
        if (_runs > 0) {
            fx_score_punch();
            fx_peanuts();
            fx_celebrate_runs(_runs);
        }
        return;
    }
    if (_outcome == "Walk") {
        fx_flash(pal_green(), 8, 0.16);
        fx_diamond_dirt();
        if (_runs > 0) {
            fx_score_punch();
            fx_peanuts();
            fx_celebrate_runs(_runs);
        }
        return;
    }
    if (bonus_is_xbh(_outcome)) {
        fx_punch(12, 4);
        fx_flash(pal_gold(), 10, 0.2);
        fx_diamond_dirt();
        fx_burst(640, 536, 14, pal_gold(), "spark", 2.8);
        if (_runs > 0) {
            fx_score_punch();
            fx_peanuts();
            fx_celebrate_runs(_runs);
        }
        return;
    }
    if (_outcome == "Strikeout") {
        fx_punch(12, 4);
        fx_flash(pal_red(), 10, 0.28);
        return;
    }
    if (bonus_is_out(_outcome) || _outcome == "Sac Bunt") {
        fx_flash(make_color_rgb(40, 48, 80), 6, 0.12);
        if (_runs > 0) {
            fx_score_punch();
            fx_peanuts();
            fx_celebrate_runs(_runs);
            fx_diamond_dirt();
        }
        return;
    }
    fx_punch(6, 2);
    fx_diamond_dirt();
    if (_runs > 0) {
        fx_score_punch();
        fx_peanuts();
        fx_celebrate_runs(_runs);
    }
}

function fx_count(_kind) {
    if (_kind == "ball") {
        fx_flash(pal_green(), 6, 0.14);
    } else if (_kind == "strike") {
        fx_flash(pal_red(), 6, 0.16);
        fx_punch(4, 2);
    } else if (_kind == "k") {
        fx_punch(12, 4);
        fx_flash(pal_red(), 10, 0.28);
    } else if (_kind == "foul") {
        fx_flash(pal_orange(), 5, 0.1);
    } else if (_kind == "walk") {
        fx_flash(pal_green(), 8, 0.16);
    }
}

function fx_apply_shake() {
    if (!fx_ready()) {
        return;
    }
    matrix_set(matrix_world, matrix_build(global.fx.ox, global.fx.oy, 0, 0, 0, 0, 1, 1, 1));
}

function fx_clear_shake() {
    matrix_set(matrix_world, matrix_build_identity());
}

function fx_update() {
    if (!fx_ready()) {
        return;
    }
    var f = global.fx;
    if (f.shake_t > 0) {
        f.shake_t -= 1;
        var _u = f.shake_t / f.shake_dur;
        var _m = max(1, round(f.shake_mag * _u));
        f.ox = irandom_range(-_m, _m);
        f.oy = irandom_range(-_m, _m);
        if (f.shake_t <= 0) {
            f.ox = 0;
            f.oy = 0;
            f.shake_mag = 0;
        }
    }
    if (f.flash_t > 0) {
        f.flash_t -= 1;
    }
    if (f.hr_t > 0) {
        f.hr_t -= 1;
    }
    f.score_scale = lerp(f.score_scale, 1, 0.2);
    if (f.score_scale < 1.02) {
        f.score_scale = 1;
    }

    var _bits = [];
    for (var i = 0; i < array_length(f.bits); i++) {
        var _b = f.bits[i];
        _b.life -= 1;
        _b.px += _b.vx;
        _b.py += _b.vy;
        _b.vy += _b.grav;
        if (_b.kind == "dirt") {
            _b.vx *= 0.92;
        }
        if (_b.life > 0 && _b.py < 760) {
            array_push(_bits, _b);
        }
    }
    f.bits = _bits;

    var _lights = [];
    for (var i = 0; i < array_length(f.lights); i++) {
        var _L = f.lights[i];
        if (_L.delay > 0) {
            _L.delay -= 1;
            array_push(_lights, _L);
        } else {
            _L.t += 1;
            if (_L.t < _L.dur) {
                array_push(_lights, _L);
            }
        }
    }
    f.lights = _lights;

    var _hops = [];
    for (var i = 0; i < array_length(f.hops); i++) {
        var _h = f.hops[i];
        _h.t += 1;
        if (_h.t < _h.life) {
            var _u2 = 0;
            if (_h.t > _h.delay) {
                _u2 = clamp((_h.t - _h.delay) / 18, 0, 1);
                _u2 = 1 - power(1 - _u2, 3);
            }
            _h.px = lerp(_h.from_px, _h.to_px, _u2);
            var _base_py = lerp(_h.from_py, _h.to_py, _u2);
            var _hop = 0;
            if (_h.t > _h.delay + 18) {
                _hop = abs(sin((_h.t - _h.delay - 18) / 10 * pi)) * 14;
            }
            _h.py = _base_py - _hop;
            array_push(_hops, _h);
        }
    }
    f.hops = _hops;
}

function fx_draw_world() {
    if (!fx_ready()) {
        return;
    }
    var f = global.fx;
    gpu_set_texfilter(false);

    for (var i = 0; i < array_length(f.hops); i++) {
        var _h = f.hops[i];
        var _a = 1;
        if (_h.t < _h.delay) {
            _a = 0;
        } else if (_h.t > _h.life - 16) {
            _a = clamp((_h.life - _h.t) / 16, 0, 1);
        }
        if (_a <= 0) {
            continue;
        }
        draw_set_alpha(_a);
        if (_h.spr >= 0 && sprite_exists(_h.spr)) {
            ui_draw_actor(_h.spr, _h.px, _h.py, false);
        } else {
            draw_set_color(pal_gold());
            draw_circle(_h.px, _h.py, 8, false);
        }
        draw_set_alpha(1);
    }

    gpu_set_blendmode(bm_add);
    for (var i = 0; i < array_length(f.lights); i++) {
        var _L = f.lights[i];
        if (_L.delay > 0) {
            continue;
        }
        var _u = _L.t / max(1, _L.dur);
        var _a = (_u < 0.5) ? (_u * 2) : (1 - _u);
        _a *= 0.55;
        draw_set_alpha(_a);
        draw_set_color(_L.col);
        if (_L.kind == "ray") {
            var _w = 6 + 10 * _a;
            draw_rectangle(_L.px - _w, _L.py - 20, _L.px + _w, _L.py + 90, false);
        } else {
            var _r = _L.rad * (0.6 + _a);
            draw_circle(_L.px, _L.py, _r, false);
            draw_circle(_L.px, _L.py, _r * 0.45, false);
        }
    }
    gpu_set_blendmode(bm_normal);
    draw_set_alpha(1);

    for (var i = 0; i < array_length(f.bits); i++) {
        var _b = f.bits[i];
        var _a = clamp(_b.life / max(8, _b.max_life * 0.45), 0, 1);
        draw_set_alpha(_a);
        draw_set_color(_b.col);
        var _sz = _b.size;
        if (_b.kind == "confetti") {
            draw_rectangle(_b.px, _b.py, _b.px + _sz + 1, _b.py + _sz + 2, false);
        } else if (_b.kind == "peanut") {
            draw_circle(_b.px, _b.py, _sz, false);
        } else {
            draw_rectangle(_b.px, _b.py, _b.px + _sz, _b.py + _sz, false);
        }
    }
    draw_set_alpha(1);
}

function fx_draw_overlay() {
    if (!fx_ready()) {
        return;
    }
    var f = global.fx;
    if (f.flash_t <= 0) {
        return;
    }
    var _u = f.flash_t / f.flash_dur;
    draw_set_alpha(f.flash_a * _u);
    draw_set_color(f.flash_col);
    draw_rectangle(0, 0, 1280, 720, false);
    draw_set_alpha(1);
}

function fx_draw_end() {
    fx_apply_shake();
    fx_draw_world();
    fx_clear_shake();
    fx_draw_overlay();
}

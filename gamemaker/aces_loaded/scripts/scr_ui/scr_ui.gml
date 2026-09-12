/// @desc Ballpark UI. Buttons keep centered hitboxes so Step events stay unchanged.

function ui_font_file(_fname) {
    var _tries = [_fname, working_directory + _fname, working_directory + "datafiles/" + _fname, "datafiles/" + _fname];
    for (var i = 0; i < array_length(_tries); i++) {
        if (file_exists(_tries[i])) {
            return _tries[i];
        }
    }
    return _fname;
}

function ui_fonts_init() {
    font_add_enable_aa(false);
    if (!variable_global_exists("fnt_ui") || !font_exists(global.fnt_ui)) {
        var _strip = ui_font_file("m5x7_16.png");
        global.spr_font_ui = sprite_add(_strip, 98, false, false, 0, 0);
        if (sprite_exists(global.spr_font_ui)) {
            var _map = "";
            var i = 32;
            repeat (95) {
                _map += chr(i);
                i += 1;
            }
            _map += chr(8212) + chr(183) + chr(8594);
            global.fnt_ui = font_add_sprite_ext(global.spr_font_ui, _map, true, 1);
        } else {
            global.fnt_ui = font_add(ui_font_file("m5x7.ttf"), 16, false, false, 32, 255);
        }
    }
    if (!variable_global_exists("fnt_title") || !font_exists(global.fnt_title)) {
        global.fnt_title = font_add(ui_font_file("kenpixel_square.ttf"), 16, false, false, 32, 255);
    }
}

function ui_font() {
    if (variable_global_exists("fnt_ui") && font_exists(global.fnt_ui)) {
        return global.fnt_ui;
    }
    return -1;
}

function ui_font_title() {
    if (variable_global_exists("fnt_title") && font_exists(global.fnt_title)) {
        return global.fnt_title;
    }
    if (variable_global_exists("fnt_ui") && font_exists(global.fnt_ui)) {
        return global.fnt_ui;
    }
    return -1;
}

function ui_button(_x, _y, _w, _h, _label, _fill, _stroke) {
    return {
        x: _x,
        y: _y,
        w: _w,
        h: _h,
        label: _label,
        fill: _fill,
        stroke: _stroke,
        hover: false,
        disabled: false,
        selected: false,
    };
}

function ui_button_update(_btn) {
    var _mx = device_mouse_x_to_gui(0);
    var _my = device_mouse_y_to_gui(0);
    _btn.hover = point_in_rectangle(
        _mx, _my,
        _btn.x - _btn.w * 0.5, _btn.y - _btn.h * 0.5,
        _btn.x + _btn.w * 0.5, _btn.y + _btn.h * 0.5
    );
    var _clicked = _btn.hover && !_btn.disabled && mouse_check_button_pressed(mb_left);
    if (_clicked) {
        sfx_ui_tap();
    }
    return _clicked;
}

function ui_round(_x1, _y1, _x2, _y2, _r, _col, _outline) {
    draw_set_color(_col);
    draw_roundrect_ext(_x1, _y1, _x2, _y2, _r, _r, _outline);
}

function ui_button_draw(_btn) {
    var _x1 = _btn.x - _btn.w * 0.5;
    var _y1 = _btn.y - _btn.h * 0.5;
    var _x2 = _btn.x + _btn.w * 0.5;
    var _y2 = _btn.y + _btn.h * 0.5;
    var _fill = _btn.fill;
    if (_btn.disabled) {
        _fill = make_color_rgb(36, 36, 40);
    } else if (_btn.selected) {
        _fill = merge_color(_btn.fill, pal_gold(), 0.22);
    } else if (_btn.hover) {
        _fill = merge_color(_btn.fill, pal_cream(), 0.16);
    }
    draw_set_alpha(0.35);
    ui_round(_x1 + 3, _y1 + 4, _x2 + 3, _y2 + 4, 10, c_black, false);
    draw_set_alpha(1);
    ui_round(_x1, _y1, _x2, _y2, 10, _fill, false);
    var _stroke = _btn.stroke;
    if (_btn.selected || (_btn.hover && !_btn.disabled)) {
        _stroke = pal_gold();
    } else if (_btn.disabled) {
        _stroke = pal_dim();
    }
    ui_round(_x1, _y1, _x2, _y2, 10, _stroke, true);
    if (!_btn.disabled) {
        draw_set_alpha(0.18);
        ui_round(_x1 + 4, _y1 + 3, _x2 - 4, _y1 + max(8, _btn.h * 0.28), 6, c_white, false);
        draw_set_alpha(1);
    }
    draw_set_font(ui_font());
    draw_set_halign(fa_center);
    draw_set_valign(fa_middle);
    draw_set_color(_btn.disabled ? pal_gray() : pal_cream());
    draw_text(_btn.x, _btn.y, _btn.label);
}

function ui_begin_draw(_mood = "field") {
    draw_set_alpha(1);
    gpu_set_texfilter(false);
    draw_set_font(ui_font());
    draw_set_halign(fa_left);
    draw_set_valign(fa_top);
    draw_set_color(c_white);
    fx_apply_shake();
    ui_draw_bg(_mood);
}

function ui_end_draw() {
    fx_draw_end();
}

function ui_draw_bg(_mood) {
    if (_mood == "title") {
        ui_draw_bg_night(true);
    } else if (_mood == "shop") {
        ui_draw_bg_shop();
    } else if (_mood == "pitch") {
        ui_draw_bg_pitch();
    } else if (_mood == "navy") {
        ui_draw_bg_navy();
    } else {
        ui_draw_bg_field();
    }
}

function ui_draw_bg_night(_show_grass) {
    draw_set_color(pal_sky());
    draw_rectangle(0, 0, 1280, 720, false);
    for (var i = 0; i < 12; i++) {
        var _yy = i * 28;
        draw_set_color(merge_color(pal_sky(), pal_sky2(), i / 12));
        draw_rectangle(0, _yy, 1280, _yy + 28, false);
    }
    draw_set_alpha(0.12);
    draw_set_color(c_white);
    draw_circle(220, 40, 90, false);
    draw_circle(640, 10, 120, false);
    draw_circle(1060, 40, 90, false);
    draw_set_alpha(0.06);
    draw_circle(640, 80, 280, false);
    draw_set_alpha(1);
    if (_show_grass) {
        for (var i = 0; i < 10; i++) {
            draw_set_color((i mod 2 == 0) ? pal_grass() : pal_grass2());
            draw_rectangle(0, 480 + i * 24, 1280, 504 + i * 24, false);
        }
        ui_draw_infield(640, 620, 220);
    }
    ui_draw_vignette();
}

function ui_draw_bg_field() {
    draw_set_color(pal_sky());
    draw_rectangle(0, 0, 1280, 160, false);
    draw_set_alpha(0.14);
    draw_set_color(c_white);
    draw_circle(200, 24, 70, false);
    draw_circle(640, 8, 90, false);
    draw_circle(1080, 24, 70, false);
    draw_set_alpha(1);
    for (var i = 0; i < 18; i++) {
        draw_set_color((i mod 2 == 0) ? pal_grass() : pal_grass2());
        draw_rectangle(0, 120 + i * 34, 1280, 154 + i * 34, false);
    }
    ui_draw_infield(640, 340, 210);
    ui_draw_vignette();
}

function ui_draw_bg_shop() {
    draw_set_color(pal_bg_shop());
    draw_rectangle(0, 0, 1280, 720, false);
    for (var i = 0; i < 16; i++) {
        draw_set_color(merge_color(pal_wood(), pal_bg_shop(), 0.55 + (i mod 2) * 0.08));
        draw_rectangle(0, 560 + i * 10, 1280, 570 + i * 10, false);
    }
    draw_set_color(pal_gold_dk());
    draw_rectangle(0, 552, 1280, 556, false);
    ui_draw_vignette();
}

function ui_draw_bg_pitch() {
    draw_set_color(make_color_rgb(28, 18, 22));
    draw_rectangle(0, 0, 1280, 720, false);
    draw_set_color(pal_dirt2());
    draw_ellipse(640 - 260, 280, 640 + 260, 520, false);
    draw_set_color(pal_dirt());
    draw_ellipse(640 - 210, 300, 640 + 210, 500, false);
    ui_draw_vignette();
}

function ui_draw_bg_navy() {
    draw_set_color(pal_bg_navy());
    draw_rectangle(0, 0, 1280, 720, false);
    draw_set_color(make_color_rgb(16, 24, 40));
    draw_rectangle(0, 0, 1280, 96, false);
    ui_draw_vignette();
}

function ui_draw_vignette() {
    draw_set_alpha(0.28);
    draw_set_color(c_black);
    draw_rectangle(0, 0, 1280, 18, false);
    draw_rectangle(0, 702, 1280, 720, false);
    draw_rectangle(0, 0, 18, 720, false);
    draw_rectangle(1262, 0, 1280, 720, false);
    draw_set_alpha(1);
}

function ui_field() {
    return { cx: 640, cy: 340, size: 210 };
}

function ui_team_color(_id) {
    switch (_id) {
        case "CAN": return make_color_rgb(200, 42, 42);
        case "USA": return make_color_rgb(28, 72, 160);
        case "JPN": return make_color_rgb(176, 32, 40);
        case "MEX": return make_color_rgb(36, 110, 52);
        default: return pal_gold_dk();
    }
}

function ui_draw_infield(_cx, _cy, _size) {
    var _d = pal_dirt();
    draw_set_color(_d);
    draw_triangle(_cx, _cy - _size, _cx + _size, _cy, _cx, _cy + _size, false);
    draw_triangle(_cx, _cy - _size, _cx - _size, _cy, _cx, _cy + _size, false);
    draw_set_color(pal_dirt2());
    draw_circle(_cx, _cy + _size * 0.55, 28, false);
    draw_set_alpha(0.35);
    draw_set_color(pal_cream());
    draw_line_width(_cx, _cy + _size, _cx + _size * 1.15, _cy - 20, 2);
    draw_line_width(_cx, _cy + _size, _cx - _size * 1.15, _cy - 20, 2);
    draw_set_alpha(1);
}

function ui_text(_x, _y, _str, _col, _halign) {
    draw_set_font(ui_font());
    draw_set_halign(_halign);
    draw_set_valign(fa_middle);
    draw_set_color(_col);
    draw_text(_x, _y, _str);
}

function ui_pixel_scale(_scale) {
    if (_scale >= 2.5) {
        return 3;
    }
    if (_scale >= 1.35) {
        return 2;
    }
    return 1;
}

function ui_text_scale(_x, _y, _str, _col, _scale, _halign) {
    var _s = ui_pixel_scale(_scale);
    draw_set_font(ui_font_title());
    draw_set_halign(_halign);
    draw_set_valign(fa_middle);
    draw_set_color(_col);
    draw_text_transformed(_x, _y, _str, _s, _s, 0);
    draw_set_font(ui_font());
}

function ui_text_num(_x, _y, _str, _col, _halign) {
    draw_set_font(ui_font());
    draw_set_halign(_halign);
    draw_set_valign(fa_middle);
    draw_set_color(_col);
    var _sc = 2;
    if (fx_ready()) {
        _sc = 2 * global.fx.score_scale;
    }
    draw_text_transformed(_x, _y, _str, _sc, _sc, 0);
}

function ui_text_wrap(_x, _y, _str, _col, _w, _halign) {
    draw_set_font(ui_font());
    draw_set_halign(_halign);
    draw_set_valign(fa_top);
    draw_set_color(_col);
    draw_text_ext(_x, _y, _str, 16, _w);
    draw_set_valign(fa_middle);
}

function ui_ellipsize(_str, _max) {
    if (string_length(_str) <= _max) {
        return _str;
    }
    return string_copy(_str, 1, _max - 1) + "...";
}

function ui_ellipsize_px(_str, _max_w) {
    draw_set_font(ui_font());
    if (string_width(_str) <= _max_w) {
        return _str;
    }
    var _out = _str;
    while (string_length(_out) > 1 && string_width(_out + "...") > _max_w) {
        _out = string_delete(_out, string_length(_out), 1);
    }
    return _out + "...";
}

function ui_panel(_x, _y, _w, _h, _fill, _stroke) {
    var _x1 = _x - _w * 0.5;
    var _y1 = _y - _h * 0.5;
    var _x2 = _x + _w * 0.5;
    var _y2 = _y + _h * 0.5;
    draw_set_alpha(0.3);
    ui_round(_x1 + 3, _y1 + 4, _x2 + 3, _y2 + 4, 12, c_black, false);
    draw_set_alpha(1);
    ui_round(_x1, _y1, _x2, _y2, 12, _fill, false);
    ui_round(_x1, _y1, _x2, _y2, 12, _stroke, true);
}

function ui_draw_diamond(_cx, _cy, _size, _col) {
    draw_set_color(_col);
    draw_triangle(_cx, _cy - _size, _cx + _size, _cy, _cx, _cy + _size, false);
    draw_triangle(_cx, _cy - _size, _cx - _size, _cy, _cx, _cy + _size, false);
}

function ui_bag(_cx, _cy, _on) {
    var _s = 8;
    if (_on) {
        draw_set_alpha(0.4);
        draw_set_color(pal_gold());
        draw_circle(_cx, _cy, 14, false);
        draw_set_alpha(1);
    }
    ui_draw_diamond(_cx, _cy, _s, _on ? pal_gold() : make_color_rgb(90, 90, 90));
    draw_set_color(_on ? pal_cream() : pal_dim());
    draw_line(_cx, _cy - _s, _cx + _s, _cy);
    draw_line(_cx + _s, _cy, _cx, _cy + _s);
    draw_line(_cx, _cy + _s, _cx - _s, _cy);
    draw_line(_cx - _s, _cy, _cx, _cy - _s);
}

function ui_draw_bases_gem(_x, _y, _bases) {
    var _r = 18;
    var _x2 = _x;
    var _y2 = _y - _r;
    var _x1 = _x + _r;
    var _y1 = _y;
    var _xh = _x;
    var _yh = _y + _r;
    var _x3 = _x - _r;
    var _y3 = _y;
    var _empty = make_color_rgb(70, 70, 76);

    draw_set_color(make_color_rgb(28, 22, 12));
    draw_triangle(_x2, _y2, _x1, _y1, _xh, _yh, false);
    draw_triangle(_x2, _y2, _x3, _y3, _xh, _yh, false);

    draw_set_color(pal_gold_dk());
    draw_line_width(_x2, _y2, _x1, _y1, 2);
    draw_line_width(_x1, _y1, _xh, _yh, 2);
    draw_line_width(_xh, _yh, _x3, _y3, 2);
    draw_line_width(_x3, _y3, _x2, _y2, 2);

    ui_draw_diamond(_x1, _y1, 5, _bases[0] ? pal_gold() : _empty);
    ui_draw_diamond(_x2, _y2, 5, _bases[1] ? pal_gold() : _empty);
    ui_draw_diamond(_x3, _y3, 5, _bases[2] ? pal_gold() : _empty);
    ui_draw_diamond(_xh, _yh, 4, pal_cream());
}

function ui_draw_field_bags(_cx, _cy, _size, _bases) {
    ui_bag(_cx + _size, _cy, _bases[0]);
    ui_bag(_cx, _cy - _size, _bases[1]);
    ui_bag(_cx - _size, _cy, _bases[2]);
    draw_set_color(pal_cream());
    draw_rectangle(_cx - 8, _cy + _size - 4, _cx + 8, _cy + _size + 6, false);
}

function ui_team_key(_id) {
    switch (_id) {
        case "CAN": return "canada";
        case "USA": return "usa";
        case "JPN": return "japan";
        case "MEX": return "mexico";
        default: return "usa";
    }
}

function ui_team_sprite(_team_id, _pose) {
    return asset_get_index("spr_" + ui_team_key(_team_id) + "_" + _pose);
}

function ui_draw_actor(_spr, _x, _y, _flip) {
    if (_spr < 0 || !sprite_exists(_spr)) {
        return;
    }
    var _filter = gpu_get_texfilter();
    gpu_set_texfilter(false);
    var _sx = _flip ? -3 : 3;
    draw_sprite_ext(_spr, 0, _x, _y, _sx, 3, 0, c_white, 1);
    gpu_set_texfilter(_filter);
}

function ui_draw_pixel(_spr, _frame, _x, _y, _px) {
    if (_spr < 0 || !sprite_exists(_spr)) {
        return;
    }
    var _sw = sprite_get_width(_spr);
    if (_sw <= 0) {
        return;
    }
    var _sc = _px / _sw;
    var _filter = gpu_get_texfilter();
    gpu_set_texfilter(false);
    draw_sprite_ext(_spr, _frame, _x, _y, _sc, _sc, 0, c_white, 1);
    gpu_set_texfilter(_filter);
}

function ui_logo_sprite(_team_id) {
    var _key = "";
    switch (_team_id) {
        case "CAN": _key = "canada"; break;
        case "USA": _key = "usa"; break;
        case "JPN": _key = "japan"; break;
        case "MEX": _key = "mexico"; break;
        default: return -1;
    }
    return asset_get_index("spr_logo_" + _key);
}

function ui_draw_logo(_team_id, _x, _y, _px) {
    ui_draw_pixel(ui_logo_sprite(_team_id), 0, _x, _y, _px);
}

function ui_staff_is_coach(_item) {
    return is_struct(_item) && variable_struct_exists(_item, "category") && (_item.category == "coach");
}

function ui_staff_frame(_item) {
    if (!is_struct(_item)) {
        return 0;
    }
    if (ui_staff_is_coach(_item) && variable_struct_exists(_item, "faceIndex")) {
        return _item.faceIndex;
    }
    if (variable_struct_exists(_item, "spriteIndex")) {
        return _item.spriteIndex;
    }
    return 0;
}

function ui_draw_staff_portrait(_item, _x, _y, _px) {
    if (!is_struct(_item)) {
        return;
    }
    var _spr = ui_staff_is_coach(_item) ? spr_faces : spr_mascots;
    ui_draw_pixel(_spr, ui_staff_frame(_item), _x, _y, _px);
}

function ui_player_face_index(_name) {
    if (!sprite_exists(spr_faces)) {
        return 0;
    }
    var _n = sprite_get_number(spr_faces);
    if (_n <= 0) {
        return 0;
    }
    return floor(stat_hash01(_name + "face") * _n);
}

function ui_draw_player_portrait(_cx, _cy, _name, _team_id, _px) {
    var _half = _px * 0.5;
    draw_set_color(ui_team_color(_team_id));
    draw_rectangle(_cx - _half - 3, _cy - _half - 3, _cx + _half + 3, _cy + _half + 3, false);
    draw_set_color(make_color_rgb(18, 14, 12));
    draw_rectangle(_cx - _half, _cy - _half, _cx + _half, _cy + _half, false);
    draw_set_color(pal_gold());
    draw_rectangle(_cx - _half, _cy - _half, _cx + _half, _cy + _half, true);
    if (sprite_exists(spr_faces)) {
        ui_draw_pixel(spr_faces, ui_player_face_index(_name), _cx, _cy, _px - 8);
    }
}

function ui_draw_staff_stack(_cx, _cy) {
    var s = global.session;
    if (!is_struct(s.baseball)) {
        return;
    }
    var _staff = s.baseball.staff;
    var _n = array_length(_staff);
    if (_n <= 0) {
        return;
    }
    ui_text(_cx, _cy, "STAFF", pal_green(), fa_center);
    for (var i = 0; i < _n; i++) {
        var _item = _staff[i];
        var _yy = _cy + 28 + i * 38;
        var _coach = ui_staff_is_coach(_item);
        ui_panel(_cx, _yy, 300, 34, pal_board(), _coach ? pal_green() : pal_orange());
        ui_draw_staff_portrait(_item, _cx - 128, _yy, 28);
        ui_text(_cx - 108, _yy - 7, ui_ellipsize_px(_item.name, 220), pal_cream(), fa_left);
        ui_text(_cx - 108, _yy + 8, ui_ellipsize_px(fx_item_description(_item, s.regulation), 220), pal_muted(), fa_left);
    }
}

function ui_draw_field_actors(_cx, _cy, _size, _bases) {
    var s = global.session;
    var _you = is_struct(s.player_team) ? s.player_team.id : "USA";
    var _opp = is_struct(s.opponent_team) ? s.opponent_team.id : "USA";
    var _batter = (is_struct(s.roster) && is_struct(s.baseball)) ? roster_effective_batter(s.roster, s.baseball) : undefined;
    var _pitcher = is_struct(s.roster) ? session_pitcher() : undefined;
    var _lefty = (is_struct(_batter) && _batter.bats == "L");
    ui_draw_actor(ui_team_sprite(_you, "batter"), _cx + (_lefty ? 26 : -26), _cy + _size * 0.55, _lefty);
    var _p_left = (is_struct(_pitcher) && _pitcher.throws == "L");
    ui_draw_actor(ui_team_sprite(_opp, "pitcher"), _cx, _cy, !_p_left);
    var _rx = [_cx + _size, _cx, _cx - _size];
    var _ry = [_cy - 22, _cy - _size - 22, _cy - 22];
    for (var i = 0; i < 3; i++) {
        if (_bases[i]) {
            ui_draw_actor(ui_team_sprite(_you, "runner"), _rx[i], _ry[i], false);
        }
    }
}

function ui_outs_pips(_x, _y, _outs) {
    for (var i = 0; i < 3; i++) {
        var _on = i < _outs;
        draw_set_color(_on ? pal_amber() : pal_dim());
        draw_circle(_x + i * 16, _y, 5, false);
    }
}

function ui_draw_hud(_callout = "", _callout_col = pal_gold()) {
    var s = global.session;
    var _away = is_struct(s.player_team) ? s.player_team.id : "AWAY";
    var _home = is_struct(s.opponent_team) ? s.opponent_team.id : "HOME";

    draw_set_color(pal_board());
    draw_rectangle(0, 0, 1280, 78, false);
    draw_set_color(pal_gold_dk());
    draw_rectangle(0, 78, 1280, 82, false);
    draw_set_color(pal_gold());
    draw_rectangle(0, 0, 1280, 3, false);

    ui_draw_logo(_away, 22, 28, 28);
    ui_text_scale(42, 26, _away, pal_cream(), 1.15, fa_left);
    ui_text_num(118, 32, string(s.player_score), pal_amber(), fa_left);
    ui_text(640, 20, session_inning_text(), pal_gold(), fa_center);
    ui_draw_logo(_home, 1258, 28, 28);
    ui_text_scale(1238, 26, _home, pal_cream(), 1.15, fa_right);
    ui_text_num(1162, 32, string(s.opponent_score), pal_amber(), fa_right);

    ui_panel(640, 44, 168, 20, make_color_rgb(28, 22, 12), pal_gold_dk());
    ui_text(640, 44, string(s.peanuts) + " PEANUTS", pal_gold(), fa_center);

    ui_text(24, 64, "OUTS", pal_dim(), fa_left);
    ui_outs_pips(72, 64, s.outs);
    ui_text(140, 64, string(s.balls) + "-" + string(s.strikes), pal_cream(), fa_left);
    ui_draw_bases_gem(200, 36, s.bases);

    var _msg = _callout;
    var _col = _callout_col;
    if (_msg == "" && s.last_outcome != "") {
        _msg = s.last_outcome;
        _col = pal_gold();
    }
    if (_msg != "") {
        ui_text(640, 68, ui_ellipsize_px(_msg, 640), _col, fa_center);
    }
}

function ui_draw_synergies() {
    var s = global.session;
    if (!is_struct(s.roster)) {
        return;
    }
    var _syn = syn_calculate(s.roster.batters);
    var _n = array_length(_syn);
    if (_n <= 0) {
        return;
    }
    draw_set_font(ui_font());
    var _gap = 8;
    var _need = 120;
    for (var i = 0; i < _n; i++) {
        _need = max(_need, string_width(_syn[i].name) + 24);
    }
    var _cols = _n;
    var _w = _need;
    if ((_n * _w) + ((_n - 1) * _gap) > 1180) {
        _cols = min(3, _n);
        _w = min(300, (1180 - ((_cols - 1) * _gap)) / _cols);
    }
    for (var i = 0; i < _n; i++) {
        var _col = i mod _cols;
        var _row = i div _cols;
        var _row_n = min(_cols, _n - (_row * _cols));
        var _row_w = (_row_n * _w) + ((_row_n - 1) * _gap);
        var _x0 = 640 - (_row_w * 0.5) + (_w * 0.5);
        var _cx = _x0 + (_col * (_w + _gap));
        var _cy = 98 + (_row * 26);
        draw_set_alpha(0.82);
        ui_panel(_cx, _cy, _w, 22, pal_board(), pal_violet());
        draw_set_alpha(1);
        ui_text(_cx, _cy, _syn[i].name, pal_violet(), fa_center);
    }
}

function ui_draw_linescore(_cx, _cy) {
    var s = global.session;
    var _played = max(3, session_played_innings());
    var _cell = 36;
    var _name_w = 70;
    var _total_w = 44;
    var _grid_w = _name_w + _played * _cell + _total_w;
    var _grid_h = 100;
    ui_panel(_cx, _cy, _grid_w + 24, _grid_h + 16, pal_board(), pal_gold());
    var _left = _cx - _grid_w * 0.5;
    var _top = _cy - 40;
    for (var i = 0; i < _played; i++) {
        ui_text(_left + _name_w + i * _cell + _cell * 0.5, _top, string(i + 1), pal_dim(), fa_center);
    }
    ui_text(_left + _name_w + _played * _cell + _total_w * 0.5, _top, "R", pal_gold(), fa_center);
    var _away = is_struct(s.player_team) ? s.player_team.id : "YOU";
    var _home = is_struct(s.opponent_team) ? s.opponent_team.id : "OPP";
    ui_text(_left + 8, _top + 30, _away, pal_cream(), fa_left);
    ui_text(_left + 8, _top + 60, _home, pal_cream(), fa_left);
    for (var i = 0; i < _played; i++) {
        var _pr = (i < array_length(s.player_runs_by_inning)) ? string(s.player_runs_by_inning[i]) : "-";
        var _or = (i < array_length(s.opponent_runs_by_inning)) ? string(s.opponent_runs_by_inning[i]) : "-";
        ui_text(_left + _name_w + i * _cell + _cell * 0.5, _top + 30, _pr, pal_cream(), fa_center);
        ui_text(_left + _name_w + i * _cell + _cell * 0.5, _top + 60, _or, pal_cream(), fa_center);
    }
    ui_text(_left + _name_w + _played * _cell + _total_w * 0.5, _top + 30, string(s.player_score), pal_amber(), fa_center);
    ui_text(_left + _name_w + _played * _cell + _total_w * 0.5, _top + 60, string(s.opponent_score), pal_amber(), fa_center);
}

function ui_card_size() {
    return { w: 96, h: 126, gap: 108 };
}

function ui_card_x(_index, _count) {
    var _sz = ui_card_size();
    var _total = (_count - 1) * _sz.gap;
    return 640 - _total * 0.5 + _index * _sz.gap;
}

function ui_card_hit(_cx, _cy) {
    var _sz = ui_card_size();
    var _mx = device_mouse_x_to_gui(0);
    var _my = device_mouse_y_to_gui(0);
    return point_in_rectangle(_mx, _my, _cx - _sz.w * 0.5, _cy - _sz.h * 0.5, _cx + _sz.w * 0.5, _cy + _sz.h * 0.5);
}

function ui_draw_card_back(_cx, _cy) {
    var _sz = ui_card_size();
    draw_set_alpha(0.35);
    draw_set_color(c_black);
    draw_roundrect_ext(_cx - _sz.w * 0.5 + 4, _cy - _sz.h * 0.5 + 6, _cx + _sz.w * 0.5 + 4, _cy + _sz.h * 0.5 + 6, 6, 6, false);
    draw_set_alpha(1);
    if (sprite_exists(spr_card_back)) {
        draw_sprite_ext(spr_card_back, 0, _cx, _cy, 3, 3, 0, c_white, 1);
    } else {
        draw_set_color(pal_card());
        draw_roundrect_ext(_cx - _sz.w * 0.5, _cy - _sz.h * 0.5, _cx + _sz.w * 0.5, _cy + _sz.h * 0.5, 6, 6, false);
        draw_set_color(pal_gold());
        draw_roundrect_ext(_cx - _sz.w * 0.5, _cy - _sz.h * 0.5, _cx + _sz.w * 0.5, _cy + _sz.h * 0.5, 6, 6, true);
    }
}

function ui_draw_card(_card, _cx, _cy, _selected) {
    var _sz = ui_card_size();
    var _draw_y = _selected ? _cy - 12 : _cy;
    draw_set_alpha(0.35);
    draw_set_color(c_black);
    draw_roundrect_ext(_cx - _sz.w * 0.5 + 4, _draw_y - _sz.h * 0.5 + 6, _cx + _sz.w * 0.5 + 4, _draw_y + _sz.h * 0.5 + 6, 6, 6, false);
    draw_set_alpha(1);
    if (_selected) {
        draw_set_color(pal_gold());
        draw_roundrect_ext(_cx - _sz.w * 0.5 - 6, _draw_y - _sz.h * 0.5 - 6, _cx + _sz.w * 0.5 + 6, _draw_y + _sz.h * 0.5 + 6, 8, 8, false);
    }
    var _spr = asset_get_index(cards_sprite_name(_card));
    if (_spr != -1 && sprite_exists(_spr)) {
        draw_sprite_ext(_spr, 0, _cx, _draw_y, 3, 3, 0, c_white, 1);
    } else {
        draw_set_color(pal_cream());
        draw_roundrect_ext(_cx - _sz.w * 0.5, _draw_y - _sz.h * 0.5, _cx + _sz.w * 0.5, _draw_y + _sz.h * 0.5, 6, 6, false);
        ui_text(_cx, _draw_y, cards_rank_name(_card.rank) + _card.suit, pal_red(), fa_center);
    }
}

function ui_nameplate(_x, _y, _w, _title, _sub) {
    ui_panel(_x, _y, _w, 56, pal_board(), pal_gold());
    ui_text(_x, _y - 10, _title, pal_gold(), fa_center);
    ui_text(_x, _y + 12, _sub, pal_cream(), fa_center);
}

function ui_draw_player_card(_cx, _top, _team_id, _player, _kind, _line2, _lit = false) {
    if (!is_struct(_player)) {
        return;
    }
    var _staff = [];
    if (_kind == "batter" && variable_global_exists("session") && is_struct(global.session.baseball) && is_array(global.session.baseball.staff)) {
        _staff = global.session.baseball.staff;
    }
    var _staff_n = array_length(_staff);
    var _w = 252;
    var _body = 236;
    var _staff_h = (_staff_n > 0) ? 78 : 0;
    var _h = _body + _staff_h;
    var _cy = _top + (_h * 0.5);
    var _col = ui_team_color(_team_id);
    if (_lit) {
        var _gx1 = _cx - (_w * 0.5) - 8;
        var _gy1 = _cy - (_h * 0.5) - 8;
        var _gx2 = _cx + (_w * 0.5) + 8;
        var _gy2 = _cy + (_h * 0.5) + 8;
        draw_set_alpha(0.4);
        ui_round(_gx1, _gy1, _gx2, _gy2, 16, pal_gold(), false);
        draw_set_alpha(1);
        ui_round(_gx1, _gy1, _gx2, _gy2, 16, pal_gold(), true);
    }
    ui_panel(_cx, _cy, _w, _h, pal_board(), pal_gold());

    var _x1 = _cx - (_w * 0.5) + 6;
    var _x2 = _cx + (_w * 0.5) - 6;
    var _y1 = _cy - (_h * 0.5) + 6;
    draw_set_color(_col);
    draw_rectangle(_x1, _y1, _x2, _y1 + 32, false);
    ui_draw_logo(_team_id, _x1 + 16, _y1 + 16, 22);
    var _pos = variable_struct_exists(_player, "pos") ? _player.pos : "P";
    ui_text(_cx + 12, _y1 + 16, _pos, pal_cream(), fa_center);

    ui_draw_player_portrait(_cx, _y1 + 80, _player.name, _team_id, 72);
    ui_text(_cx, _y1 + 128, ui_ellipsize_px(_player.name, _w - 28), pal_gold(), fa_center);

    if (_kind == "pitcher") {
        var _throws = variable_struct_exists(_player, "throws") ? _player.throws : "R";
        ui_text(_cx, _y1 + 150, ui_ellipsize_px(_throws + "HP  VEL " + string(_player.velocity) + "  CTL " + string(_player.control) + "  STA " + string(_player.stamina), _w - 28), pal_cream(), fa_center);
    } else {
        var _bats = variable_struct_exists(_player, "bats") ? _player.bats : "R";
        ui_text(_cx, _y1 + 150, "Bats " + _bats, pal_cream(), fa_center);
        ui_text(_cx, _y1 + 168, ui_ellipsize_px(stat_line(_player), _w - 28), pal_cream(), fa_center);
    }
    if (_line2 != "") {
        ui_text_wrap(_cx, _y1 + 186, _line2, pal_muted(), _w - 36, fa_center);
    }

    if (_staff_n > 0) {
        var _sy = _cy + (_h * 0.5) - _staff_h + 8;
        draw_set_color(pal_gold_dk());
        draw_rectangle(_x1, _sy, _x2, _sy + 1, false);
        ui_text(_cx, _sy + 12, "STAFF", pal_green(), fa_center);
        var _gap = min(58, (_w - 28) / max(1, _staff_n));
        var _sx0 = _cx - ((_staff_n - 1) * _gap) * 0.5;
        for (var i = 0; i < _staff_n; i++) {
            var _sx = _sx0 + (i * _gap);
            ui_draw_staff_portrait(_staff[i], _sx, _sy + 38, 28);
            ui_text(_sx, _sy + 60, ui_ellipsize_px(_staff[i].name, _gap - 2), pal_cream(), fa_center);
        }
    }
}

function cinema_pick() {
    var _v = ["lines", "rings", "slots", "crosshair", "dice", "bounce"];
    return _v[irandom(array_length(_v) - 1)];
}

function cinema_ease(_t) {
    var _u = clamp(_t / 160, 0, 1);
    var _split = 0.36;
    var _early = 0.64;
    if (_u <= _split) {
        return (_u / _split) * _early;
    }
    var _local = (_u - _split) / (1 - _split);
    return _early + ((1 - _early) * (1 - power(1 - _local, 3)));
}

function cinema_lock_blend(_t) {
    return clamp((_t - 152) / 8, 0, 1);
}

function cinema_arrive(_rest, _turns, _e) {
    return _rest + (_turns * 360 * (1 - _e));
}

function cinema_setup(_is_out, _variant) {
    var _syms = ["O", "*", "+"];
    var _wi = irandom(2);
    cinema_slot_win = _syms[_wi];
    cinema_slot_miss = _syms[(_wi + 1 + irandom(1)) mod 3];
    if (_is_out) {
        cinema_line_rest = [8, 34, -28];
        cinema_ring_rest = [18, 42, 58];
        cinema_hair_rest = [22, -18];
        cinema_dice_rest = [8, -12, 32];
    } else {
        cinema_line_rest = [0, 0, 0];
        cinema_ring_rest = [28, 28, 28];
        cinema_hair_rest = [0, 0];
        cinema_dice_rest = [0, 0, 0];
    }
    if (_variant == "bounce") {
        cinema_bounce_build(_is_out);
    }
}

function cinema_bounce_point_in(_px, _py, _qpx, _qpy) {
    var _inside = true;
    var i;
    for (i = 0; i < 4; i++) {
        var _j = (i + 1) mod 4;
        var _cross = (_qpx[_j] - _qpx[i]) * (_py - _qpy[i]) - (_qpy[_j] - _qpy[i]) * (_px - _qpx[i]);
        if (_cross < 0) {
            _inside = false;
            break;
        }
    }
    if (_inside) {
        return true;
    }
    _inside = true;
    for (i = 0; i < 4; i++) {
        var _j = (i + 1) mod 4;
        var _cross = (_qpx[_j] - _qpx[i]) * (_py - _qpy[i]) - (_qpy[_j] - _qpy[i]) * (_px - _qpx[i]);
        if (_cross > 0) {
            _inside = false;
            break;
        }
    }
    return _inside;
}

function cinema_bounce_build(_is_out) {
    var _hw = 96;
    var _hh = 96;
    var _ball_r = 8;
    var _fric = 0.985;
    var _bdec = 0.8;
    var _min_spd = 0.15;
    var _spd = 3.5 + random(2);
    var _ang = random(360);
    var _svx = lengthdir_x(_spd, _ang);
    var _svy = lengthdir_y(_spd, _ang);
    var _spx = 0;
    var _spy = 0;
    var _ppx = [];
    var _ppy = [];
    array_push(_ppx, 0);
    array_push(_ppy, 0);
    var _step;
    for (_step = 0; _step < 5000; _step++) {
        _spx += _svx;
        _spy += _svy;
        if (_spx < -_hw + _ball_r) {
            _spx = -_hw + _ball_r;
            _svx = abs(_svx) * _bdec;
        }
        if (_spx > _hw - _ball_r) {
            _spx = _hw - _ball_r;
            _svx = -abs(_svx) * _bdec;
        }
        if (_spy < -_hh + _ball_r) {
            _spy = -_hh + _ball_r;
            _svy = abs(_svy) * _bdec;
        }
        if (_spy > _hh - _ball_r) {
            _spy = _hh - _ball_r;
            _svy = -abs(_svy) * _bdec;
        }
        _svx *= _fric;
        _svy *= _fric;
        array_push(_ppx, _spx);
        array_push(_ppy, _spy);
        if (point_distance(0, 0, _svx, _svy) < _min_spd) {
            break;
        }
    }
    var _fx = _ppx[array_length(_ppx) - 1];
    var _fy = _ppy[array_length(_ppy) - 1];
    var _qsize = 30 + random(15);
    var _qpx = array_create(4, 0);
    var _qpy = array_create(4, 0);
    var _attempt;
    var k;
    if (!_is_out) {
        for (_attempt = 0; _attempt < 20; _attempt++) {
            for (k = 0; k < 4; k++) {
                var _a = (k / 4) * 360 + (random(1) - 0.5) * 46;
                var _r = _qsize * (0.6 + random(0.5));
                _qpx[k] = _fx + lengthdir_x(_r, _a);
                _qpy[k] = _fy + lengthdir_y(_r, _a);
            }
            if (cinema_bounce_point_in(_fx, _fy, _qpx, _qpy)) {
                break;
            }
        }
    } else {
        for (_attempt = 0; _attempt < 30; _attempt++) {
            var _ox = (random(1) - 0.5) * _hw * 1.4;
            var _oy = (random(1) - 0.5) * _hh * 1.4;
            for (k = 0; k < 4; k++) {
                var _a = (k / 4) * 360 + (random(1) - 0.5) * 46;
                var _r = _qsize * (0.6 + random(0.5));
                _qpx[k] = _ox + lengthdir_x(_r, _a);
                _qpy[k] = _oy + lengthdir_y(_r, _a);
            }
            if (!cinema_bounce_point_in(_fx, _fy, _qpx, _qpy)) {
                break;
            }
        }
    }
    cinema_bz_path_px = _ppx;
    cinema_bz_path_py = _ppy;
    cinema_bz_quad_px = _qpx;
    cinema_bz_quad_py = _qpy;
    cinema_bz_n = array_length(_ppx);
}

function cinema_draw_rect_rot(_x, _y, _w, _h, _ang, _col) {
    var _c = dcos(_ang);
    var _s = dsin(_ang);
    var _hw = _w * 0.5;
    var _hh = _h * 0.5;
    var _x1 = _x + (-_hw * _c) - (-_hh * _s);
    var _y1 = _y + (-_hw * _s) + (-_hh * _c);
    var _x2 = _x + (_hw * _c) - (-_hh * _s);
    var _y2 = _y + (_hw * _s) + (-_hh * _c);
    var _x3 = _x + (_hw * _c) - (_hh * _s);
    var _y3 = _y + (_hw * _s) + (_hh * _c);
    var _x4 = _x + (-_hw * _c) - (_hh * _s);
    var _y4 = _y + (-_hw * _s) + (_hh * _c);
    draw_set_color(_col);
    draw_triangle(_x1, _y1, _x2, _y2, _x3, _y3, false);
    draw_triangle(_x1, _y1, _x3, _y3, _x4, _y4, false);
}

function cinema_draw(_t, _is_out, _outcome, _variant) {
    var _e = cinema_ease(_t);
    var _decay = 1 - _e;
    var _blend = cinema_lock_blend(_t);
    var _lock = _is_out ? pal_red() : pal_green();
    var _ink = merge_color(pal_gold(), _lock, _blend);
    var _cx = 640;
    var _cy = 318;

    draw_set_alpha(min(0.62, _t / 12));
    draw_set_color(c_black);
    draw_rectangle(0, 0, 1280, 720, false);
    draw_set_alpha(1);
    ui_panel(_cx, 330, 220, 220, pal_board(), _ink);

    if (_variant == "lines") {
        var _a1 = cinema_arrive(cinema_line_rest[0], 8, _e);
        var _a2 = cinema_arrive(cinema_line_rest[1], -9, _e);
        var _a3 = cinema_arrive(cinema_line_rest[2], 10, _e);
        draw_set_color(merge_color(pal_cream(), _lock, _blend));
        draw_circle(_cx, _cy, 52, false);
        draw_set_color(merge_color(pal_red(), _lock, _blend));
        draw_line_width(_cx - dcos(_a1) * 44, _cy - dsin(_a1) * 44, _cx + dcos(_a1) * 44, _cy + dsin(_a1) * 44, 5);
        draw_line_width(_cx - dcos(_a2) * 44, _cy - dsin(_a2) * 44, _cx + dcos(_a2) * 44, _cy + dsin(_a2) * 44, 5);
        draw_line_width(_cx - dcos(_a3) * 44, _cy - dsin(_a3) * 44, _cx + dcos(_a3) * 44, _cy + dsin(_a3) * 44, 5);
    } else if (_variant == "rings") {
        var _r1 = lerp(28, cinema_ring_rest[0], _e) + (22 * dsin(cinema_arrive(0, 8, _e)));
        var _r2 = lerp(28, cinema_ring_rest[1], _e) + (28 * dsin(cinema_arrive(0, -9, _e)));
        var _r3 = lerp(28, cinema_ring_rest[2], _e) + (34 * dsin(cinema_arrive(0, 10, _e)));
        draw_set_color(merge_color(make_color_rgb(204, 51, 51), _lock, _blend));
        draw_circle(_cx, _cy, max(4, _r1), true);
        draw_set_color(merge_color(make_color_rgb(51, 136, 204), _lock, _blend));
        draw_circle(_cx, _cy, max(4, _r2), true);
        draw_set_color(merge_color(make_color_rgb(204, 204, 51), _lock, _blend));
        draw_circle(_cx, _cy, max(4, _r3), true);
    } else if (_variant == "slots") {
        var _sym = ["O", "*", "+"];
        var _win_i = 0;
        var _miss_i = 1;
        for (var _si = 0; _si < 3; _si++) {
            if (_sym[_si] == cinema_slot_win) {
                _win_i = _si;
            }
            if (_sym[_si] == cinema_slot_miss) {
                _miss_i = _si;
            }
        }
        var _stops = [0.58, 0.78, 1];
        var _extras = [14, 18, 22];
        var _xs = [_cx - 42, _cx, _cx + 42];
        var _u = clamp(_t / 160, 0, 1);
        draw_set_color(pal_dim());
        draw_rectangle(_cx - 21, _cy - 50, _cx - 19, _cy + 50, false);
        draw_rectangle(_cx + 19, _cy - 50, _cx + 21, _cy + 50, false);
        for (var i = 0; i < 3; i++) {
            var _target = (_is_out && i == 2) ? _miss_i : _win_i;
            var _p = min(1, _u / _stops[i]);
            var _pe = 1 - power(1 - _p, 3);
            var _pos = _target - (_extras[i] * (1 - _pe));
            var _idx = ((floor(_pos + 0.001) mod 3) + 3) mod 3;
            ui_text_scale(_xs[i], _cy, _sym[_idx], merge_color(pal_cream(), _lock, _blend), 2.2, fa_center);
        }
    } else if (_variant == "crosshair") {
        var _hoff = lerp(0, cinema_hair_rest[0], _e) + (60 * dsin(cinema_arrive(0, 7, _e)));
        var _voff = lerp(0, cinema_hair_rest[1], _e) + (60 * dsin(cinema_arrive(0, -8, _e)));
        draw_set_color(merge_color(make_color_rgb(204, 51, 51), _lock, _blend));
        draw_rectangle(_cx - 60, _cy + _hoff - 2, _cx + 60, _cy + _hoff + 2, false);
        draw_set_color(merge_color(make_color_rgb(51, 136, 204), _lock, _blend));
        draw_rectangle(_cx + _voff - 2, _cy - 60, _cx + _voff + 2, _cy + 60, false);
        draw_set_color(merge_color(pal_gold(), _lock, _blend));
        draw_circle(_cx + _voff, _cy + _hoff, 6, false);
    } else if (_variant == "bounce" && variable_instance_exists(id, "cinema_bz_n") && cinema_bz_n > 1) {
        var _qcol = merge_color(make_color_rgb(34, 85, 170), _lock, _blend);
        draw_set_alpha(0.35 + (0.05 * _blend));
        draw_set_color(_qcol);
        draw_triangle(_cx + cinema_bz_quad_px[0], _cy + cinema_bz_quad_py[0], _cx + cinema_bz_quad_px[1], _cy + cinema_bz_quad_py[1], _cx + cinema_bz_quad_px[2], _cy + cinema_bz_quad_py[2], false);
        draw_triangle(_cx + cinema_bz_quad_px[0], _cy + cinema_bz_quad_py[0], _cx + cinema_bz_quad_px[2], _cy + cinema_bz_quad_py[2], _cx + cinema_bz_quad_px[3], _cy + cinema_bz_quad_py[3], false);
        draw_set_alpha(1);
        draw_set_color(merge_color(make_color_rgb(68, 136, 221), _lock, _blend));
        draw_line_width(_cx + cinema_bz_quad_px[0], _cy + cinema_bz_quad_py[0], _cx + cinema_bz_quad_px[1], _cy + cinema_bz_quad_py[1], 2);
        draw_line_width(_cx + cinema_bz_quad_px[1], _cy + cinema_bz_quad_py[1], _cx + cinema_bz_quad_px[2], _cy + cinema_bz_quad_py[2], 2);
        draw_line_width(_cx + cinema_bz_quad_px[2], _cy + cinema_bz_quad_py[2], _cx + cinema_bz_quad_px[3], _cy + cinema_bz_quad_py[3], 2);
        draw_line_width(_cx + cinema_bz_quad_px[3], _cy + cinema_bz_quad_py[3], _cx + cinema_bz_quad_px[0], _cy + cinema_bz_quad_py[0], 2);
        var _u = clamp(_t / 160, 0, 1);
        var _idx = clamp(floor(_u * (cinema_bz_n - 1)), 0, cinema_bz_n - 1);
        draw_set_color(merge_color(pal_cream(), _lock, _blend));
        draw_circle(_cx + cinema_bz_path_px[_idx], _cy + cinema_bz_path_py[_idx], 8, false);
    } else {
        var _dx = [_cx - 52, _cx, _cx + 52];
        var _dc = [make_color_rgb(204, 51, 51), make_color_rgb(51, 136, 204), make_color_rgb(204, 204, 51)];
        var _turns = [8, -9, 10];
        for (var i = 0; i < 3; i++) {
            var _ang = cinema_arrive(cinema_dice_rest[i], _turns[i], _e);
            cinema_draw_rect_rot(_dx[i], _cy, 40, 40, _ang, merge_color(_dc[i], _lock, _blend));
            draw_set_color(c_white);
            draw_circle(_dx[i], _cy, 4, false);
        }
    }

    if (_blend < 1) {
        draw_set_alpha(1 - _blend);
        ui_text(_cx, 430, "PITCHING...", pal_muted(), fa_center);
        draw_set_alpha(1);
    }
    if (_blend > 0) {
        draw_set_alpha(_blend);
        ui_text_scale(_cx, 430, _is_out ? "X" : "+", _lock, 2.4, fa_center);
        draw_set_alpha(1);
    }
    ui_text(_cx, 470, "click to skip", pal_dim(), fa_center);
}

ui_begin_draw("pitch");
ui_draw_hud();
ui_draw_synergies();

var _p = roster_my_pitcher(global.session.roster);
var _b = roster_opp_batter(global.session.roster);
ui_text(640, 118, _p.name + " vs " + _b.name + "   " + stat_line(_b) + "   STA " + string(round(global.session.roster.my_stamina * 100)) + "%", pal_cream(), fa_center);
if (feedback != "") {
    ui_panel(640, 148, min(700, 48 + string_width(ui_ellipsize(feedback, 64))), 26, pal_board(), pal_gold());
    ui_text(640, 148, ui_ellipsize(feedback, 64), pal_gold(), fa_center);
}

if (is_struct(showdown)) {
    var _ph = showdown.pitcher_hole;
    var _bh = showdown.batter_hole;
    var _comm = showdown.community;
    var _sug = (targeting) ? sd_suggested_target(showdown, target_key) : -1;

    ui_panel(420, 220, 70, 24, pal_board(), pal_red());
    ui_text(420, 220, "OPP", pal_cream(), fa_center);
    for (var i = 0; i < array_length(_bh); i++) {
        var _cx = 500 + i * 110;
        if (resolving || sd_revealed(showdown, i)) {
            ui_draw_card(_bh[i], _cx, 250, false);
        } else {
            ui_draw_card_back(_cx, 250);
        }
        if (flash_t > 0 && flash_domain == "batter" && flash_idx == i) {
            var _fa = flash_t / 16;
            draw_set_alpha(_fa * 0.7);
            draw_set_color(flash_col);
            draw_roundrect_ext(_cx - 52, 185, _cx + 52, 315, 8, 8, false);
            draw_set_alpha(1);
        }
    }
    if (!resolving && !half_over && showdown.stage != "pre-flop") {
        var _opp_h = sd_opp_visible_hand(showdown);
        ui_panel(980, 250, 240, 36, pal_board(), pal_red());
        ui_text(980, 250, "OPP  " + _opp_h.hand_name, pal_cream(), fa_center);
    }

    for (var i = 0; i < array_length(_comm); i++) {
        var _cx = comm_x(i);
        var _aim = targeting && target_domain == "community" && target_idx == i;
        if (sd_face_down(showdown, i) && !resolving) {
            ui_draw_card_back(_cx, 400);
        } else {
            ui_draw_card(_comm[i], _cx, 400, _aim || sd_has_lock(showdown, i));
        }
        if (targeting && target_domain == "community" && _sug == i && target_idx != i) {
            ui_text(_cx, 478, "SUG", pal_gold(), fa_center);
        }
        if (flash_t > 0 && flash_domain == "community" && flash_idx == i) {
            var _fa = flash_t / 16;
            var _fr = (flash_kind == "destroy") ? 16 + 54 * _fa : 70;
            draw_set_alpha(_fa * 0.7);
            draw_set_color(flash_col);
            draw_roundrect_ext(_cx - 52, 400 - 65, _cx + 52, 400 + 65, 8, 8, false);
            draw_set_alpha(_fa);
            draw_circle(_cx, 400, _fr, true);
            draw_set_alpha(1);
        }
    }

    ui_panel(420, 520, 70, 24, pal_board(), pal_green());
    ui_text(420, 520, "YOU", pal_cream(), fa_center);
    for (var i = 0; i < array_length(_ph); i++) {
        var _aim = targeting && target_domain == "hole" && target_idx == i;
        ui_draw_card(_ph[i], 500 + i * 110, 550, _aim);
        if (targeting && target_domain == "hole" && _sug == i && target_idx != i) {
            ui_text(500 + i * 110, 628, "SUG", pal_gold(), fa_center);
        }
        if (flash_t > 0 && flash_domain == "hole" && flash_idx == i) {
            var _fa = flash_t / 16;
            var _fr = (flash_kind == "destroy") ? 16 + 54 * _fa : 70;
            draw_set_alpha(_fa * 0.7);
            draw_set_color(flash_col);
            draw_roundrect_ext(500 + i * 110 - 52, 485, 500 + i * 110 + 52, 615, 8, 8, false);
            draw_set_alpha(_fa);
            draw_circle(500 + i * 110, 550, _fr, true);
            draw_set_alpha(1);
        }
    }

    if (!resolving && !half_over && showdown.stage != "pre-flop") {
        var _best = sd_best_hand(_ph, _comm);
        ui_panel(980, 550, 240, 36, pal_board(), pal_gold());
        ui_text(980, 550, "YOU  " + _best.hand_name, pal_gold(), fa_center);
    }
}

if (reveal_movie && is_struct(reveal_result)) {
    draw_set_alpha(0.72);
    draw_set_color(c_black);
    draw_rectangle(0, 0, 1280, 720, false);
    draw_set_alpha(1);
    var _pc = reveal_result.pitcher_hand.cards;
    var _bc = reveal_result.batter_hand.cards;
    var _you_win = (reveal_result.winner == "pitcher");
    ui_text(640, 150, _you_win ? "YOU WIN THE HAND" : "BATTER WINS", _you_win ? pal_green() : pal_red(), fa_center);
    var _n = array_length(_bc);
    var _gap = 100;
    var _start = (_n > 0) ? (640 - ((_n - 1) * _gap) * 0.5) : 640;
    for (var i = 0; i < _n; i++) {
        var _u = clamp((reveal_t - i * 6) / 16, 0, 1);
        if (_u > 0) {
            var _e = 1 - power(1 - _u, 3);
            ui_draw_card(_bc[i], lerp(640, _start + i * _gap, _e), lerp(360, 250, _e), (!_you_win) && (_u >= 1));
        }
    }
    _n = array_length(_pc);
    _start = (_n > 0) ? (640 - ((_n - 1) * _gap) * 0.5) : 640;
    for (var i = 0; i < _n; i++) {
        var _u = clamp((reveal_t - i * 6) / 16, 0, 1);
        if (_u > 0) {
            var _e = 1 - power(1 - _u, 3);
            ui_draw_card(_pc[i], lerp(640, _start + i * _gap, _e), lerp(360, 500, _e), _you_win && (_u >= 1));
        }
    }
    if (reveal_t > 40) {
        ui_text(640, 620, "click to continue", pal_dim(), fa_center);
    }
}

if (half_over && !reveal_movie) {
    ui_text(640, 620, "Three outs. Next inning or ballgame.", pal_cream(), fa_center);
    ui_button_draw(btn_continue);
} else if (resolving && !reveal_movie) {
    ui_button_draw(btn_next);
} else if (bullpen_open) {
    for (var i = 0; i < array_length(reliever_btns); i++) {
        var _rb = reliever_btns[i];
        ui_button_draw(_rb);
        var _rp = _rb.pitcher;
        ui_text(_rb.x, _rb.y - 36, ui_ellipsize(_rp.name, 14), pal_cream(), fa_center);
        ui_text(_rb.x, _rb.y - 12, "VEL " + string(_rp.velocity), pal_red(), fa_center);
        ui_text(_rb.x, _rb.y + 8, "CTL " + string(_rp.control), pal_green(), fa_center);
        ui_text(_rb.x, _rb.y + 28, "STA " + string(_rp.stamina), pal_gold(), fa_center);
        ui_text(_rb.x, _rb.y + 46, "100%", pal_green(), fa_center);
    }
    if (is_struct(btn_keep)) {
        ui_button_draw(btn_keep);
        ui_text(btn_keep.x, btn_keep.y - 12, "KEEP", pal_cream(), fa_center);
        ui_text(btn_keep.x, btn_keep.y + 12, string(btn_keep.stamina_pct) + "%", pal_gold(), fa_center);
    }
} else if (showdown.stage == "pre-flop") {
    ui_button_draw(btn_deal);
    ui_button_draw(btn_ibb);
    var _pen = roster_bullpen_ready(global.session.roster);
    if (global.session.roster.my_stamina <= 0.30 && array_length(_pen) > 0) {
        btn_bullpen.label = "BULLPEN (" + string(array_length(_pen)) + ")";
        ui_button_draw(btn_bullpen);
    }
} else if (targeting) {
    ui_button_draw(btn_confirm_tgt);
    ui_button_draw(btn_cancel_tgt);
} else if (effect_hold <= 0) {
    for (var i = 0; i < array_length(pitch_btns); i++) {
        ui_button_draw(pitch_btns[i]);
    }
}

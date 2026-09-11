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
            draw_set_alpha(flash_t / 14);
            draw_set_color(pal_gold());
            draw_circle(_cx, 400, 70, true);
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
            draw_set_alpha(flash_t / 14);
            draw_set_color(pal_gold());
            draw_circle(500 + i * 110, 550, 70, true);
            draw_set_alpha(1);
        }
    }

    if (!resolving && !half_over && showdown.stage != "pre-flop") {
        var _best = sd_best_hand(_ph, _comm);
        ui_panel(980, 550, 240, 36, pal_board(), pal_gold());
        ui_text(980, 550, "YOU  " + _best.hand_name, pal_gold(), fa_center);
    }
}

if (half_over) {
    ui_text(640, 620, "Three outs. Next inning or ballgame.", pal_cream(), fa_center);
    ui_button_draw(btn_continue);
} else if (resolving) {
    ui_button_draw(btn_next);
} else if (showdown.stage == "pre-flop") {
    ui_button_draw(btn_deal);
    ui_button_draw(btn_ibb);
    var _pen = roster_bullpen_ready(global.session.roster);
    if (global.session.roster.my_stamina <= 0.30 && array_length(_pen) > 0) {
        btn_bullpen.label = "BULLPEN: " + _pen[0].pitcher.name;
        ui_button_draw(btn_bullpen);
    }
} else if (targeting) {
    ui_button_draw(btn_confirm_tgt);
    ui_button_draw(btn_cancel_tgt);
} else {
    for (var i = 0; i < array_length(pitch_btns); i++) {
        ui_button_draw(pitch_btns[i]);
    }
}

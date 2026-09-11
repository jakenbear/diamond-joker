var s = global.session;
if (cinema) {
    cinema_t += 1;
    if (cinema_t < 160) {
        var _t = clamp(cinema_t / 160, 0, 1);
        var _speed = power(1 - _t, 2);
        var _interval = 11 + ((1 - _speed) * 30);
        if (cinema_t - cinema_last_tick >= _interval) {
            cinema_last_tick = cinema_t;
            sfx_spin_tick(600 - ((1 - _speed) * 300));
        }
    } else if (!cinema_locked) {
        cinema_locked = true;
        if (cinema_out) {
            sfx_spin_fail();
        } else {
            sfx_spin_success();
        }
    }
    if (mouse_check_button_pressed(mb_left) || cinema_t >= 200) {
        cinema = false;
        finish_after_play();
    }
    exit;
}

refresh_selection();
var _hand = s.cards.hand;
var _n = array_length(_hand);
var _sel = cards_selected_from_flags(selected);
var _sel_n = array_length(_sel);
var _max = s.max_select;

if (!half_over && !resolving) {
    var _card_y = 568;
    var _order = cards_display_order(_hand, sort_mode);
    btn_sort_def.selected = (sort_mode == "default");
    btn_sort_rnk.selected = (sort_mode == "rank");
    btn_sort_sut.selected = (sort_mode == "suit");
    if (ui_button_update(btn_sort_def)) {
        sort_mode = "default";
    } else if (ui_button_update(btn_sort_rnk)) {
        sort_mode = "rank";
    } else if (ui_button_update(btn_sort_sut)) {
        sort_mode = "suit";
    }
    if (mouse_check_button_pressed(mb_left)) {
        for (var i = 0; i < _n; i++) {
            var _cx = ui_card_x(i, _n);
            if (ui_card_hit(_cx, _card_y)) {
                var _hi = (i < array_length(_order)) ? _order[i] : i;
                if (_hi >= 0 && _hi < array_length(selected)) {
                    if (selected[_hi]) {
                        selected[_hi] = false;
                        sfx_card_deselect();
                    } else if (_sel_n < _max) {
                        selected[_hi] = true;
                        sfx_card_select();
                    }
                }
                break;
            }
        }
        _sel = cards_selected_from_flags(selected);
        _sel_n = array_length(_sel);
    }
    var _hover = -1;
    for (var i = 0; i < _n; i++) {
        if (ui_card_hit(ui_card_x(i, _n), _card_y)) {
            _hover = (i < array_length(_order)) ? _order[i] : i;
            break;
        }
    }
    if (_hover != hover_hi) {
        hover_hi = _hover;
        if (_hover >= 0) {
            sfx_card_hover();
        }
    }

    btn_play.disabled = (_sel_n < 1);
    btn_discard.disabled = (_sel_n < 1);
    btn_discard.label = "DISCARD  " + count_text(s.count);
    if (s.strikes >= 2) {
        btn_discard.label = "DISCARD  " + count_text(s.count) + " !";
        btn_discard.fill = pal_red();
    } else if (s.strikes == 1) {
        btn_discard.fill = make_color_rgb(183, 110, 0);
    } else {
        btn_discard.fill = pal_green_dk();
    }
    if (_sel_n == 1 && bb_runner_count(s.baseball) > 0 && s.outs < 2) {
        btn_play.label = "BUNT";
    } else {
        btn_play.label = "PLAY";
    }

    if (!btn_play.disabled && ui_button_update(btn_play)) {
        sfx_play_hand();
        var _res = session_play_hand(_sel);
        last_play = _res;
        selected = [];
        if (is_struct(_res) && variable_struct_exists(_res, "redraw") && _res.redraw) {
            refresh_selection();
            selected = array_create(array_length(s.cards.hand), false);
        } else if (s.show_showdowns) {
            begin_cinema(_res);
        } else {
            finish_after_play();
        }
    } else if (!btn_discard.disabled && ui_button_update(btn_discard)) {
        sfx_discard();
        var _d = session_after_discard(_sel);
        refresh_selection();
        selected = array_create(array_length(s.cards.hand), false);
        if (_d.kind == "redraw") {
            // stay in the at-bat
        } else if (_d.kind == "walk") {
            var _runs = (is_struct(_d.result) && variable_struct_exists(_d.result, "runs")) ? _d.result.runs : 0;
            sfx_walk();
            if (_runs > 0) {
                sfx_later(0.25, function() { sfx_run_scored(); });
            }
            if (bb_is_game_over(s.baseball) || s.baseball.state == "SWITCH_SIDE") {
                half_over = true;
            } else {
                resolving = true;
            }
        } else if (_d.kind == "k" || _d.kind == "foul_out") {
            sfx_strike();
            if (_d.kind == "k") {
                sfx_later(0.12, function() { sfx_strikeout(); });
            } else {
                sfx_later(0.08, function() { sfx_out(); });
            }
            if (bb_is_game_over(s.baseball) || s.baseball.state == "SWITCH_SIDE") {
                half_over = true;
            } else {
                resolving = true;
            }
        } else if (_d.kind == "pitch") {
            if (string_pos("Ball", s.last_outcome) == 1) {
                sfx_ball();
            } else if (string_pos("Foul", s.last_outcome) == 1) {
                sfx_foul();
            } else if (string_pos("Strike", s.last_outcome) == 1) {
                sfx_strike();
            }
        }
    }
} else if (resolving) {
    if (ui_button_update(btn_next)) {
        resolving = false;
        begin_at_bat();
    }
} else if (ui_button_update(btn_continue)) {
    flow_finish_player_half();
}

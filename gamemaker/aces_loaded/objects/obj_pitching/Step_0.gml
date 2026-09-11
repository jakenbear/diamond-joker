if (flash_t > 0) {
    flash_t -= 1;
}

if (reveal_movie) {
    reveal_t += 1;
    if (mouse_check_button_pressed(mb_left) || reveal_t >= 90) {
        reveal_movie = false;
    }
    exit;
}

if (effect_hold > 0) {
    effect_hold -= 1;
    if (mouse_check_button_pressed(mb_left) || effect_hold <= 0) {
        run_pending_advance();
    }
    exit;
}

if (half_over) {
    if (ui_button_update(btn_continue)) {
        flow_finish_opponent_half();
    }
    exit;
}

if (resolving) {
    if (ui_button_update(btn_next)) {
        at_bat += 1;
        start_showdown();
    }
    exit;
}

if (bullpen_open) {
    for (var i = 0; i < array_length(reliever_btns); i++) {
        if (ui_button_update(reliever_btns[i])) {
            roster_swap_pitcher(global.session.roster, reliever_btns[i].bull_index);
            close_bullpen();
            start_showdown();
            feedback = "Bullpen — " + roster_my_pitcher(global.session.roster).name + " in";
            exit;
        }
    }
    if (is_struct(btn_keep) && ui_button_update(btn_keep)) {
        close_bullpen();
        feedback = "Still pitching";
    }
    exit;
}

if (showdown.stage == "pre-flop") {
    if (ui_button_update(btn_deal)) {
        sd_deal_flop(showdown);
        rebuild_pitches();
        feedback = "FLOP — pick a pitch";
    }
    if (ui_button_update(btn_ibb)) {
        do_ibb();
    }
    var _pen = roster_bullpen_ready(global.session.roster);
    if (global.session.roster.my_stamina <= 0.30 && array_length(_pen) > 0) {
        if (ui_button_update(btn_bullpen)) {
            open_bullpen();
        }
    }
    exit;
}

if (targeting) {
    if (mouse_check_button_pressed(mb_left)) {
        if (target_domain == "community") {
            for (var i = 0; i < array_length(showdown.community); i++) {
                if (sd_has_lock(showdown, i) || sd_face_down(showdown, i)) {
                    continue;
                }
                if (ui_card_hit(comm_x(i), 400)) {
                    target_idx = i;
                    break;
                }
            }
        } else if (target_domain == "hole") {
            for (var i = 0; i < array_length(showdown.pitcher_hole); i++) {
                if (ui_card_hit(500 + i * 110, 550)) {
                    target_idx = i;
                    break;
                }
            }
        }
    }
    if (ui_button_update(btn_confirm_tgt)) {
        apply_and_advance(target_key, target_idx);
    } else if (ui_button_update(btn_cancel_tgt)) {
        targeting = false;
        target_key = "";
        feedback = "Pick a pitch";
    }
    exit;
}

for (var i = 0; i < array_length(pitch_btns); i++) {
    pitch_btns[i].disabled = sd_used(showdown, pitch_btns[i].key);
    if (!pitch_btns[i].disabled && ui_button_update(pitch_btns[i])) {
        var _key = pitch_btns[i].key;
        if (sd_is_targeted(_key)) {
            begin_targeting(_key);
        } else {
            apply_and_advance(_key, -1);
        }
        break;
    }
}

if (flash_t > 0) {
    flash_t -= 1;
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
        btn_bullpen.label = "BULLPEN: " + _pen[0].pitcher.name;
        if (ui_button_update(btn_bullpen)) {
            roster_swap_pitcher(global.session.roster, _pen[0].index);
            start_showdown();
            feedback = "Bullpen — " + roster_my_pitcher(global.session.roster).name + " in";
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

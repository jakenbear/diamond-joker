if (rebuild_buttons) {
    team_select_rebuild();
    rebuild_buttons = false;
}

if (phase == 0) {
    for (var i = 0; i < array_length(team_buttons); i++) {
        if (ui_button_update(team_buttons[i])) {
            player_id = team_buttons[i].team_id;
            pitcher_index = 0;
            var staff = session_team_pitchers(player_id);
            phase = (array_length(staff) > 0) ? 1 : 2;
            rebuild_buttons = true;
        }
    }
} else if (phase == 1) {
    for (var i = 0; i < array_length(pitcher_buttons); i++) {
        if (ui_button_update(pitcher_buttons[i])) {
            pitcher_index = pitcher_buttons[i].pitcher_index;
            rebuild_buttons = true;
        }
    }
    if (is_struct(btn_next) && ui_button_update(btn_next)) {
        phase = 2;
        rebuild_buttons = true;
    }
} else if (phase == 2) {
    for (var i = 0; i < array_length(team_buttons); i++) {
        if (ui_button_update(team_buttons[i])) {
            opp_id = team_buttons[i].team_id;
            phase = 3;
            rebuild_buttons = true;
        }
    }
} else if (phase == 3) {
    for (var i = 0; i < array_length(innings_buttons); i++) {
        if (ui_button_update(innings_buttons[i])) {
            innings = innings_buttons[i].innings;
            rebuild_buttons = true;
        }
    }
    if (is_struct(btn_start) && ui_button_update(btn_start)) {
        flow_start_game(player_id, opp_id, innings, pitcher_index);
    }
}

if (is_struct(btn_back) && ui_button_update(btn_back)) {
    if (phase == 1) {
        phase = 0;
        player_id = "";
        pitcher_index = 0;
    } else if (phase == 2) {
        var staff = session_team_pitchers(player_id);
        phase = (array_length(staff) > 0) ? 1 : 0;
        opp_id = "";
    } else if (phase == 3) {
        phase = 2;
        opp_id = "";
    }
    rebuild_buttons = true;
}

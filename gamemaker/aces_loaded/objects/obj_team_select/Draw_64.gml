ui_begin_draw("title");

if (phase == 0) {
    ui_text_scale(640, 56, "CHOOSE YOUR TEAM", pal_gold(), 2, fa_center);
    ui_text(640, 96, "You bat first. Opponent is home and bats last.", pal_cream(), fa_center);
} else if (phase == 1) {
    var yours = session_team(player_id);
    ui_text_scale(640, 56, "CHOOSE STARTER", pal_gold(), 2, fa_center);
    ui_text(640, 96, yours.name + " pitching staff  —  click to select", pal_cream(), fa_center);
} else if (phase == 2) {
    var yours = session_team(player_id);
    var staff = session_team_pitchers(player_id);
    var starter = (array_length(staff) > pitcher_index) ? staff[pitcher_index].name : "Starter";
    ui_text_scale(640, 56, "CHOOSE OPPONENT", pal_gold(), 2, fa_center);
    ui_text(640, 96, "Your club: " + yours.name + "  |  Starter: " + starter, pal_cream(), fa_center);
} else {
    var yours = session_team(player_id);
    var opp = session_team(opp_id);
    var staff = session_team_pitchers(player_id);
    var starter = (array_length(staff) > pitcher_index) ? staff[pitcher_index].name : "Starter";
    ui_text_scale(640, 56, "TONIGHT'S MATCHUP", pal_gold(), 2, fa_center);
    ui_panel(320, 250, 300, 220, pal_board(), yours.color);
    ui_draw_logo(player_id, 320, 178, 64);
    ui_text_scale(320, 218, yours.name, pal_cream(), 1.6, fa_center);
    ui_text(320, 250, yours.nickname, pal_muted(), fa_center);
    ui_text(320, 290, "AWAY", pal_gold(), fa_center);
    ui_text(320, 318, starter, pal_cream(), fa_center);
    ui_text_scale(640, 250, "VS", pal_gold(), 2.4, fa_center);
    ui_panel(960, 250, 300, 220, pal_board(), opp.color);
    ui_draw_logo(opp_id, 960, 178, 64);
    ui_text_scale(960, 218, opp.name, pal_cream(), 1.6, fa_center);
    ui_text(960, 250, opp.nickname, pal_muted(), fa_center);
    ui_text(960, 290, "HOME", pal_gold(), fa_center);
    ui_text(640, 400, "GAME LENGTH", pal_muted(), fa_center);
    ui_text(640, 492, "DECK", pal_muted(), fa_center);
    var _cfg = data_deck_config(deck_id);
    ui_text(640, 572, _cfg.description, pal_cream(), fa_center);
}

for (var i = 0; i < array_length(team_buttons); i++) {
    ui_button_draw(team_buttons[i]);
    var t = session_team(team_buttons[i].team_id);
    var _bx = team_buttons[i].x;
    var _by = team_buttons[i].y;
    ui_text(_bx, _by - 78, t.name, pal_cream(), fa_center);
    ui_draw_logo(t.id, _bx, _by - 8, 80);
    ui_text(_bx, _by + 48, t.nickname, pal_cream(), fa_center);
    if (variable_struct_exists(t, "style") && t.style != "") {
        ui_text_wrap(_bx, _by + 62, t.style, pal_muted(), team_buttons[i].w - 16, fa_center);
    }
}
for (var i = 0; i < array_length(pitcher_buttons); i++) {
    ui_button_draw(pitcher_buttons[i]);
    var staff = session_team_pitchers(player_id);
    var p = staff[pitcher_buttons[i].pitcher_index];
    ui_text(pitcher_buttons[i].x, pitcher_buttons[i].y - 10, p.name, pal_cream(), fa_center);
    var line = "VEL " + string(p.velocity) + "   CTL " + string(p.control) + "   STA " + string(p.stamina) + "   " + p.throws;
    ui_text(pitcher_buttons[i].x, pitcher_buttons[i].y + 14, line, pal_muted(), fa_center);
}
for (var i = 0; i < array_length(innings_buttons); i++) {
    ui_button_draw(innings_buttons[i]);
}
for (var i = 0; i < array_length(deck_buttons); i++) {
    ui_button_draw(deck_buttons[i]);
}
if (is_struct(btn_back)) {
    ui_button_draw(btn_back);
}
if (is_struct(btn_next)) {
    ui_button_draw(btn_next);
}
if (is_struct(btn_start)) {
    ui_button_draw(btn_start);
}

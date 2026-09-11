ui_begin_draw("navy");
ui_panel(640, 48, 520, 56, pal_board(), pal_gold());
ui_text_scale(640, 36, "STARTING LINEUP", pal_gold(), 1.8, fa_center);
var team_name = is_struct(global.session.player_team)
    ? global.session.player_team.name + " " + global.session.player_team.nickname
    : "Your team";
ui_text(640, 70, team_name + " — one innate trait each", pal_cream(), fa_center);

var start_y = 130;
var row_h = 52;
var _roster = global.session.roster;
for (var i = 0; i < 9; i++) {
    var _row_y = start_y + i * row_h;
    var _b = _roster.batters[i];
    ui_panel(640, _row_y, 1220, 48, pal_panel_navy(), pal_gold_dk());
    ui_text(40, _row_y, string(i + 1) + ".", pal_gold(), fa_left);
    ui_text(70, _row_y, _b.pos + "  " + _b.name, pal_cream(), fa_left);
    ui_text(280, _row_y, stat_line(_b), pal_muted(), fa_left);
    ui_button_draw(row_left[i]);
    ui_button_draw(row_right[i]);
}

ui_button_draw(btn_auto);
ui_button_draw(btn_confirm);
ui_button_draw(btn_showdowns);
ui_text(820, 646, show_showdowns ? "Pitch roulette on PLAY" : "Skip pitch animations", pal_muted(), fa_center);

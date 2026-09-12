ui_begin_draw("title");
var s = global.session;
var won = s.player_won;
ui_text_scale(640, 70, won ? "VICTORY" : "DEFEAT", won ? pal_green() : pal_red(), 3.2, fa_center);
draw_set_color(won ? pal_gold() : pal_red());
draw_rectangle(460, 112, 820, 114, false);

var yours = is_struct(s.player_team) ? s.player_team.name : "YOU";
var opp = is_struct(s.opponent_team) ? s.opponent_team.name : "OPP";
ui_text(640, 140, yours + "  vs  " + opp, pal_cream(), fa_center);
if (s.walk_off) {
    ui_text(640, 166, "Walk-off — home club took the lead.", pal_gold(), fa_center);
}

ui_draw_linescore(640, 300);
ui_text_scale(640, 430, string(s.player_score) + "  —  " + string(s.opponent_score), pal_amber(), 2.6, fa_center);
var played = max(1, s.innings_played);
ui_text(640, 478, string(played) + (played == 1 ? " inning" : " innings"), pal_muted(), fa_center);
ui_button_draw(btn_again);
ui_text(640, 680, "Aces Loaded!", pal_dim(), fa_center);
ui_end_draw();

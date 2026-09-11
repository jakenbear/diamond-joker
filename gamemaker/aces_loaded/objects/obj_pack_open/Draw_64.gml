ui_begin_draw("shop");
ui_draw_hud();
var s = global.session;
var _title = (tier == "gold") ? "GOLD PACK" : "BRONZE PACK";
ui_panel(640, 112, 280, 36, pal_board(), pal_gold());
ui_text_scale(640, 112, _title, pal_gold(), 1.4, fa_center);
ui_text(640, 148, ui_ellipsize(status_text, 70), pal_cream(), fa_center);

if (array_length(cards) == 0) {
    ui_text(640, 300, "No bonus players left to sign.", pal_muted(), fa_center);
} else {
    for (var i = 0; i < array_length(card_btns); i++) {
        var _p = cards[i];
        var _btn = card_btns[i];
        ui_button_draw(_btn);
        ui_text(_btn.x, _btn.y + 24, string_upper(_p.rarity) + "  ·  " + _p.pos, pal_gold(), fa_center);
        ui_text(_btn.x, _btn.y + 46, stat_line(_p), pal_cream(), fa_center);
        ui_text_wrap(_btn.x, _btn.y + 62, _p.lineupDescription, pal_muted(), 210, fa_center);
    }
}

ui_text(640, 480, "Bench a current batter", pal_dim(), fa_center);
for (var i = 0; i < array_length(batter_btns); i++) {
    ui_button_draw(batter_btns[i]);
}
ui_button_draw(btn_confirm);
ui_button_draw(btn_skip);

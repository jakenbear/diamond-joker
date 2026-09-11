ui_begin_draw("title");
ui_draw_diamond(640, 168, 70, merge_color(pal_gold(), pal_sky(), 0.55));
ui_draw_diamond(640, 168, 28, pal_gold());
ui_text_scale(640, 268, "ACES LOADED!", pal_gold(), 3.2, fa_center);
ui_text(640, 322, "Poker hands. Baseball outcomes.", pal_cream(), fa_center);
draw_set_color(pal_gold_dk());
draw_rectangle(430, 352, 850, 354, false);
ui_button_draw(btn_play);
ui_text(640, 540, "F11 fullscreen   ·   F10 integer scale", pal_dim(), fa_center);

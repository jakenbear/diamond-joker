ui_begin_draw("shop");
ui_draw_hud();
var s = global.session;
ui_button_draw(btn_tab_traits);
ui_button_draw(btn_tab_staff);
ui_button_draw(btn_tab_syn);
ui_text(640, 148, "Trait buys left: " + string(buy_limit - buys), pal_gold(), fa_center);
if (status_text != "") {
    ui_text(640, 172, ui_ellipsize(status_text, 70), pal_cream(), fa_center);
}

if (tab == "traits") {
    for (var i = 0; i < array_length(offer_btns); i++) {
        var _t = offer[i];
        var _btn = offer_btns[i];
        ui_button_draw(_btn);
        ui_text(_btn.x, _btn.y + 28, string_upper(_t.rarity) + "  ·  " + string(_t.price) + "p", pal_gold(), fa_center);
        ui_text_wrap(_btn.x, _btn.y + 42, fx_item_description(_t, s.regulation), pal_muted(), 270, fa_center);
    }
    ui_text(640, 480, "Assign to a batter  ·  max 2 shop traits", pal_dim(), fa_center);
    for (var i = 0; i < array_length(batter_btns); i++) {
        var _b = s.roster.batters[i];
        batter_btns[i].disabled = (roster_shop_trait_count(_b) >= 2);
        ui_button_draw(batter_btns[i]);
    }
    ui_button_draw(btn_buy);
} else if (tab == "staff") {
    ui_text(640, 200, "Staff slots  " + string(array_length(s.baseball.staff)) + " / " + string(s.baseball.staff_slots), pal_cream(), fa_center);
    for (var i = 0; i < array_length(staff_btns); i++) {
        var _item = staff_offer[i];
        var _btn = staff_btns[i];
        ui_button_draw(_btn);
        ui_text(_btn.x, _btn.y + 28, string_upper(_item.category) + "  ·  " + string(_item.price) + "p", pal_gold(), fa_center);
        ui_text_wrap(_btn.x, _btn.y + 42, fx_item_description(_item, s.regulation), pal_muted(), 270, fa_center);
    }
    if (array_length(sell_btns) > 0) {
        ui_text(640, 490, "ACTIVE  ·  sell for half", pal_gold(), fa_center);
        for (var i = 0; i < array_length(sell_btns); i++) {
            ui_button_draw(sell_btns[i]);
        }
    }
    ui_button_draw(btn_buy);
} else {
    var _all = syn_all();
    var _active = syn_calculate(s.roster.batters);
    ui_text(640, 200, "Active " + string(array_length(_active)) + " / " + string(array_length(_all)), pal_cream(), fa_center);
    for (var i = 0; i < array_length(_all); i++) {
        var _syn = _all[i];
        var _on = syn_is_active(_syn.id, s.roster.batters);
        var _col = (i < 6) ? 0 : 1;
        var _row = (i < 6) ? i : i - 6;
        var _x = 320 + _col * 640;
        var _y = 250 + _row * 58;
        ui_panel(_x, _y, 600, 50, _on ? pal_green_dk() : pal_board(), _on ? pal_green() : pal_gold_dk());
        ui_text(_x - 280, _y - 8, _syn.name, _on ? pal_cream() : pal_muted(), fa_left);
        var _sub = _on ? _syn.bonus_desc : _syn.hint;
        ui_text(_x - 280, _y + 10, _sub, _on ? pal_gold() : pal_dim(), fa_left);
        if (_on) {
            ui_text(_x + 260, _y, "ACTIVE", pal_gold(), fa_right);
        }
    }
}

ui_button_draw(btn_continue);

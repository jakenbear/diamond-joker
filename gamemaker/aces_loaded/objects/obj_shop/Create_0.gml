var s = global.session;
tab = "traits";
buy_limit = bb_shop_buy_limit(s.baseball);
buys = 0;
selected_trait = -1;
selected_batter = -1;
selected_staff = -1;
status_text = "Pick a trait, then a batter with an open slot.";
btn_tab_traits = ui_button(480, 108, 150, 36, "TRAITS", pal_green_dk(), pal_gold());
btn_tab_staff = ui_button(640, 108, 150, 36, "STAFF", pal_card(), pal_gold());
btn_tab_syn = ui_button(800, 108, 150, 36, "SYNERGIES", pal_card(), pal_gold());
btn_buy = ui_button(520, 680, 220, 48, "BUY", pal_green_dk(), pal_gold());
btn_continue = ui_button(760, 680, 220, 48, "CONTINUE", pal_card(), pal_gold());

shop_rebuild = function() {
    var _s = global.session;
    var _extra = bb_staff_sum(_s.baseball, "shop_extra_cards");
    offer = data_shop_offer(_s.owned_trait_ids, 3 + _extra);
    offer_btns = [];
    var _n = array_length(offer);
    var _gap = (_n > 0) ? min(360, 1000 / _n) : 360;
    var _start = 640 - ((_n - 1) * _gap) * 0.5;
    for (var i = 0; i < _n; i++) {
        var _btn = ui_button(_start + i * _gap, 270, 300, 180, offer[i].name, pal_panel_navy(), pal_green());
        _btn.index = i;
        array_push(offer_btns, _btn);
    }
    batter_btns = [];
    for (var i = 0; i < 9; i++) {
        var _b = _s.roster.batters[i];
        var _btn = ui_button(80 + i * 132, 520, 124, 44, string(i + 1) + " " + _b.pos, pal_card(), pal_green());
        _btn.index = i;
        array_push(batter_btns, _btn);
    }
    staff_offer = data_staff_offer(bb_staff_owned_ids(_s.baseball));
    staff_btns = [];
    var _sn = array_length(staff_offer);
    var _sgap = (_sn > 0) ? min(360, 1000 / max(1, _sn)) : 360;
    var _sstart = 640 - ((_sn - 1) * _sgap) * 0.5;
    for (var i = 0; i < _sn; i++) {
        var _btn = ui_button(_sstart + i * _sgap, 280, 300, 180, "", pal_panel_navy(), pal_gold());
        _btn.index = i;
        array_push(staff_btns, _btn);
    }
    sell_btns = [];
    var _staff = _s.baseball.staff;
    var _ns = array_length(_staff);
    for (var i = 0; i < _ns; i++) {
        var _price = floor(_staff[i].price / 2);
        var _btn = ui_button(120 + i * 260, 530, 240, 40, "SELL " + _staff[i].name, pal_red(), pal_gold());
        _btn.staff_id = _staff[i].id;
        _btn.refund = _price;
        array_push(sell_btns, _btn);
    }
    selected_trait = -1;
    selected_batter = -1;
    selected_staff = -1;
};

shop_rebuild();

var s = global.session;
btn_tab_traits.selected = (tab == "traits");
btn_tab_staff.selected = (tab == "staff");
btn_tab_syn.selected = (tab == "synergies");
if (ui_button_update(btn_tab_traits)) {
    tab = "traits";
    status_text = "Pick a trait, then a batter with an open slot.";
}
if (ui_button_update(btn_tab_staff)) {
    tab = "staff";
    status_text = "Hire a coach or adopt a mascot. Slots: " + string(array_length(s.baseball.staff)) + "/" + string(s.baseball.staff_slots);
}
if (ui_button_update(btn_tab_syn)) {
    tab = "synergies";
    var _n = array_length(syn_calculate(s.roster.batters));
    status_text = "Active: " + string(_n) + " / " + string(array_length(syn_all()));
}

if (tab == "traits") {
    for (var i = 0; i < array_length(offer_btns); i++) {
        if (ui_button_update(offer_btns[i])) {
            selected_trait = i;
        }
        offer_btns[i].selected = (selected_trait == i);
    }
    for (var i = 0; i < array_length(batter_btns); i++) {
        if (ui_button_update(batter_btns[i])) {
            selected_batter = i;
        }
        batter_btns[i].selected = (selected_batter == i);
    }
    var _can = false;
    if (selected_trait >= 0 && selected_batter >= 0 && buys < buy_limit) {
        var _t = offer[selected_trait];
        var _b = s.roster.batters[selected_batter];
        _can = (s.peanuts >= _t.price) && (roster_shop_trait_count(_b) < 2);
    }
    btn_buy.disabled = !_can;
    if (!btn_buy.disabled && ui_button_update(btn_buy)) {
        var _t = offer[selected_trait];
        if (bb_spend(s.baseball, _t.price) && roster_equip_trait(s.roster, selected_batter, _t)) {
            array_push(s.owned_trait_ids, _t.id);
            buys += 1;
            s.shop_buys += 1;
            status_text = "Equipped " + _t.name + " on " + s.roster.batters[selected_batter].name + ".";
            shop_rebuild();
            session_sync();
        }
    }
} else if (tab == "staff") {
    for (var i = 0; i < array_length(staff_btns); i++) {
        if (ui_button_update(staff_btns[i])) {
            selected_staff = i;
        }
        staff_btns[i].selected = (selected_staff == i);
    }
    var _can_s = false;
    if (selected_staff >= 0) {
        var _item = staff_offer[selected_staff];
        _can_s = (s.peanuts >= _item.price) && (array_length(s.baseball.staff) < s.baseball.staff_slots);
    }
    btn_buy.disabled = !_can_s;
    if (!btn_buy.disabled && ui_button_update(btn_buy)) {
        var _item = staff_offer[selected_staff];
        if (bb_spend(s.baseball, _item.price) && bb_add_staff(s.baseball, _item)) {
            status_text = _item.name + " joined the staff.";
            shop_rebuild();
            session_sync();
        }
    }
    for (var i = 0; i < array_length(sell_btns); i++) {
        if (ui_button_update(sell_btns[i])) {
            var _id = sell_btns[i].staff_id;
            var _refund = sell_btns[i].refund;
            if (bb_remove_staff(s.baseball, _id)) {
                s.baseball.total_peanuts += _refund;
                status_text = "Sold for " + string(_refund) + " peanuts.";
                shop_rebuild();
                session_sync();
            }
            break;
        }
    }
} else {
    btn_buy.disabled = true;
}

if (ui_button_update(btn_continue)) {
    flow_after_shop();
}

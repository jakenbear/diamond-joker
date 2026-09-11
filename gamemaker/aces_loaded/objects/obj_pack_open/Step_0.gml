var s = global.session;
var _n = array_length(card_btns);
for (var i = 0; i < _n; i++) {
    if (flipping[i]) {
        flip_t[i] += 1 / 21;
        if (flip_t[i] >= 1) {
            flip_t[i] = 1;
            flipping[i] = false;
            revealed[i] = true;
        }
    }
    if (ui_button_update(card_btns[i])) {
        if (revealed[i]) {
            selected = i;
        } else if (!flipping[i]) {
            flipping[i] = true;
        }
    }
    card_btns[i].selected = (selected == i && revealed[i]);
}
for (var i = 0; i < array_length(batter_btns); i++) {
    if (ui_button_update(batter_btns[i])) {
        replace_idx = i;
    }
    batter_btns[i].selected = (replace_idx == i);
}
btn_confirm.disabled = (selected < 0 || replace_idx < 0 || array_length(cards) == 0 || (selected >= 0 && !revealed[selected]));

if (!btn_confirm.disabled && ui_button_update(btn_confirm)) {
    if (roster_add_bonus(s.roster, cards[selected], replace_idx)) {
        flow_after_pack();
        exit;
    }
    status_text = "Could not add that player.";
}

if (ui_button_update(btn_skip)) {
    flow_after_pack();
}

var all_picked = true;
for (var i = 0; i < 9; i++) {
    if (ui_button_update(row_left[i])) {
        picks[i] = 0;
    }
    if (ui_button_update(row_right[i])) {
        picks[i] = 1;
    }
    row_left[i].selected = (picks[i] == 0);
    row_right[i].selected = (picks[i] == 1);
    if (picks[i] < 0) {
        all_picked = false;
    }
}
btn_confirm.disabled = !all_picked;

if (ui_button_update(btn_auto)) {
    for (var i = 0; i < 9; i++) {
        picks[i] = irandom(1);
        row_left[i].selected = (picks[i] == 0);
        row_right[i].selected = (picks[i] == 1);
    }
    btn_confirm.disabled = false;
}

btn_showdowns.selected = show_showdowns;
if (ui_button_update(btn_showdowns)) {
    show_showdowns = !show_showdowns;
}

if (!btn_confirm.disabled && ui_button_update(btn_confirm)) {
    global.session.draft_picks = picks;
    global.session.show_showdowns = show_showdowns;
    flow_after_draft();
}

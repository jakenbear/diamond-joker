picks = array_create(9, -1);
row_left = [];
row_right = [];
var start_y = 130;
var row_h = 52;
var _roster = global.session.roster;
for (var i = 0; i < 9; i++) {
    var _row_y = start_y + i * row_h;
    var _ids = _roster.batters[i].innate;
    var _a = data_trait_by_id(_ids[0]);
    var _b = data_trait_by_id(_ids[1]);
    var _la = is_struct(_a) ? _a.name : "Trait A";
    var _lb = is_struct(_b) ? _b.name : "Trait B";
    var left = ui_button(760, _row_y, 260, 40, _la, pal_panel_navy(), pal_green());
    var right = ui_button(1040, _row_y, 260, 40, _lb, pal_panel_navy(), pal_green());
    left.index = i;
    right.index = i;
    left.choice = 0;
    right.choice = 1;
    array_push(row_left, left);
    array_push(row_right, right);
}
btn_auto = ui_button(1100, 40, 140, 36, "AUTO-PICK", pal_card(), pal_gold());
btn_confirm = ui_button(520, 680, 260, 48, "START GAME", pal_green_dk(), pal_gold());
btn_confirm.disabled = true;
show_showdowns = false;
btn_showdowns = ui_button(820, 680, 220, 48, "SHOWDOWNS", pal_card(), pal_gold());

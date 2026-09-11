var s = global.session;
tier = (s.pending_pack == "") ? "bronze" : s.pending_pack;
cards = data_bonus_pack(tier, roster_bonus_ids(s.roster));
selected = -1;
replace_idx = -1;
status_text = "Pick a bonus player, then the lineup slot to bench.";
card_btns = [];
var _n = array_length(cards);
var _gap = 280;
var _start = 640 - ((_n - 1) * _gap) * 0.5;
for (var i = 0; i < _n; i++) {
    var _btn = ui_button(_start + i * _gap, 280, 240, 200, cards[i].name, pal_panel_navy(), pal_gold());
    _btn.index = i;
    array_push(card_btns, _btn);
}
batter_btns = [];
for (var i = 0; i < 9; i++) {
    var _b = s.roster.batters[i];
    var _btn = ui_button(80 + i * 132, 520, 124, 44, string(i + 1) + " " + _b.pos, pal_card(), pal_green());
    _btn.index = i;
    array_push(batter_btns, _btn);
}
btn_confirm = ui_button(520, 660, 220, 48, "SIGN", pal_green_dk(), pal_gold());
btn_skip = ui_button(760, 660, 220, 48, "SKIP", pal_card(), pal_gold());
btn_confirm.disabled = true;

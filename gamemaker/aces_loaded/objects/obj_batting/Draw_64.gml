ui_begin_draw("field");

var s = global.session;
var _batter = is_struct(card_batter) ? card_batter : roster_effective_batter(s.roster, s.baseball);
var _opp_p = session_pitcher();
var _pnames = roster_pitcher_trait_names(_opp_p);
var _traits = "";
if (array_length(_batter.traits) > 0) {
    _traits = _batter.traits[0].name;
    if (array_length(_batter.traits) > 1) {
        _traits += "  ·  " + _batter.traits[1].name;
    }
}

var _hand = s.cards.hand;
var _n = array_length(_hand);
var _sel = cards_selected_from_flags(selected);
var _preview = "";
var _preview_col = pal_gold();
if (!half_over && !resolving && _n > 0 && array_length(_sel) > 0) {
    var _pv = session_hand_preview(_sel);
    _preview = _pv.title;
    if (_pv.score != "") {
        _preview += "   ·   " + _pv.score;
    }
    _preview_col = _pv.color;
} else if (resolving && s.last_outcome != "") {
    _preview = s.last_outcome;
}

ui_draw_hud(_preview, _preview_col);
ui_draw_synergies();

var _field = ui_field();
ui_draw_field_bags(_field.cx, _field.cy, _field.size, s.bases);
ui_draw_field_actors(_field.cx, _field.cy, _field.size, s.bases);

var _you_id = is_struct(s.player_team) ? s.player_team.id : "USA";
var _opp_id = is_struct(s.opponent_team) ? s.opponent_team.id : "USA";
var _pitcher_sub = (_pnames != "") ? _pnames : "On the mound";
ui_draw_player_card(148, 152, _you_id, _batter, "batter", _traits);
ui_draw_player_card(1132, 152, _opp_id, _opp_p, "pitcher", _pitcher_sub);

var _card_y = 568;
var _order = cards_display_order(_hand, sort_mode);

for (var i = 0; i < _n; i++) {
    var _hi = (i < array_length(_order)) ? _order[i] : i;
    var _on = (_hi < array_length(selected)) ? selected[_hi] : false;
    ui_draw_card(_hand[_hi], ui_card_x(i, _n), _card_y, _on);
}

if (!resolving && !half_over) {
    ui_text(24, 638, "Deck " + string(array_length(s.cards.deck)) + "   Discard " + string(array_length(s.cards.discard_pile)), pal_dim(), fa_left);
}

if (!half_over && !resolving && !cinema) {
    ui_button_draw(btn_play);
    ui_button_draw(btn_discard);
    ui_button_draw(btn_sort_def);
    ui_button_draw(btn_sort_rnk);
    ui_button_draw(btn_sort_sut);
    ui_text(640, 638, string(array_length(_sel)) + " / " + string(s.max_select) + " selected", pal_cream(), fa_center);
} else if (resolving) {
    ui_button_draw(btn_next);
} else if (!cinema) {
    ui_text(640, 620, "Three outs — side retired.", pal_cream(), fa_center);
    ui_button_draw(btn_continue);
}

if (cinema) {
    cinema_draw(cinema_t, cinema_out, cinema_outcome, cinema_variant);
    ui_draw_player_card(148, 152, _you_id, _batter, "batter", _traits, true);
    ui_draw_player_card(1132, 152, _opp_id, _opp_p, "pitcher", _pitcher_sub, true);
}
ui_end_draw();

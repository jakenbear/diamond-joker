ui_begin_draw("field");
ui_draw_hud();
ui_draw_synergies();

var s = global.session;
var _batter = roster_effective_batter(s.roster, s.baseball);
var _opp_p = session_pitcher();
var _pnames = roster_pitcher_trait_names(_opp_p);
var _traits = "";
if (array_length(_batter.traits) > 0) {
    _traits = _batter.traits[0].name;
    if (array_length(_batter.traits) > 1) {
        _traits += "  ·  " + _batter.traits[1].name;
    }
}

ui_draw_field_bags(640, 368, 168, s.bases);
ui_draw_field_actors(640, 368, 168, s.bases);

ui_nameplate(186, 268, 300, _batter.name, stat_line(_batter));
if (_traits != "") {
    ui_text(186, 310, ui_ellipsize_px(_traits, 280), pal_muted(), fa_center);
}
var _pitcher_sub = (_pnames != "") ? _pnames : "On the mound";
ui_nameplate(1094, 268, 300, "vs " + _opp_p.name, ui_ellipsize_px(_pitcher_sub, 280));

var _hand = s.cards.hand;
var _n = array_length(_hand);
var _sel = cards_selected_from_flags(selected);
var _card_y = 568;
var _order = cards_display_order(_hand, sort_mode);

for (var i = 0; i < _n; i++) {
    var _hi = (i < array_length(_order)) ? _order[i] : i;
    var _on = (_hi < array_length(selected)) ? selected[_hi] : false;
    ui_draw_card(_hand[_hi], ui_card_x(i, _n), _card_y, _on);
}

var _preview = "";
var _preview_score = "";
var _preview_col = pal_gold();
var _show_result = false;
if (!half_over && !resolving && _n > 0 && array_length(_sel) > 0) {
    var _pv = session_hand_preview(_sel);
    _preview = _pv.title;
    _preview_score = _pv.score;
    _preview_col = _pv.color;
} else if (resolving && s.last_outcome != "") {
    _preview = s.last_outcome;
    _show_result = true;
    _preview_col = pal_gold();
}

if (_preview != "") {
    if (_show_result) {
        ui_panel(640, 400, 760, 52, pal_board(), pal_gold());
        ui_text_wrap(640, 382, _preview, pal_gold(), 720, fa_center);
    } else {
        var _pw = min(760, 56 + string_width(_preview));
        var _ph = (_preview_score != "") ? 44 : 28;
        ui_panel(640, 400, _pw, _ph, pal_board(), _preview_col);
        ui_text(640, (_preview_score != "") ? 390 : 400, _preview, _preview_col, fa_center);
        if (_preview_score != "") {
            ui_text(640, 412, _preview_score, pal_muted(), fa_center);
        }
    }
}

if (!resolving && !half_over) {
    ui_text(640, 434, "Deck " + string(array_length(s.cards.deck)) + "   ·   Discard " + string(array_length(s.cards.discard_pile)), pal_dim(), fa_center);
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
}

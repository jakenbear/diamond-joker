half_over = false;
resolving = false;
cinema = false;
cinema_t = 0;
cinema_out = false;
cinema_outcome = "";
cinema_variant = "lines";
cinema_slot_win = "O";
cinema_last_tick = -999;
cinema_locked = false;
last_play = undefined;
hover_hi = -1;
sort_mode = "default";
selected = array_create(7, false);
btn_play = ui_button(520, 680, 200, 48, "PLAY", pal_green_dk(), pal_gold());
btn_discard = ui_button(760, 680, 230, 48, "DISCARD", make_color_rgb(183, 110, 0), pal_gold());
btn_continue = ui_button(640, 680, 280, 52, "CONTINUE", pal_green_dk(), pal_gold());
btn_next = ui_button(640, 680, 280, 52, "NEXT AT-BAT", pal_green_dk(), pal_gold());
btn_sort_def = ui_button(1040, 680, 56, 32, "DEF", pal_card(), pal_gold());
btn_sort_rnk = ui_button(1104, 680, 56, 32, "RNK", pal_card(), pal_gold());
btn_sort_sut = ui_button(1168, 680, 56, 32, "SUT", pal_card(), pal_gold());

refresh_selection = function() {
    var _n = array_length(global.session.cards.hand);
    if (array_length(selected) != _n) {
        selected = array_create(_n, false);
    }
};

begin_at_bat = function() {
    var _kind = session_start_at_bat();
    refresh_selection();
    selected = array_create(array_length(global.session.cards.hand), false);
    if (_kind == "hbp") {
        sfx_hbp();
        var _hbp_runs = 0;
        if (is_struct(global.session.baseball.last_result)) {
            _hbp_runs = global.session.baseball.last_result.runs;
        }
        fx_play_result("HBP", _hbp_runs);
        if (bb_is_game_over(global.session.baseball) || global.session.baseball.state == "SWITCH_SIDE") {
            half_over = true;
            resolving = false;
        } else {
            resolving = true;
        }
    }
};

finish_after_play = function() {
    if (is_struct(last_play) && !(variable_struct_exists(last_play, "redraw") && last_play.redraw)) {
        var _oc = variable_struct_exists(last_play, "outcome") ? last_play.outcome : "";
        var _runs = variable_struct_exists(last_play, "runs") ? last_play.runs : 0;
        sfx_play_result(_oc, _runs);
        fx_play_result(_oc, _runs);
    }
    if (bb_is_game_over(global.session.baseball) || global.session.baseball.state == "SWITCH_SIDE") {
        half_over = true;
        resolving = false;
    } else {
        resolving = true;
        half_over = false;
    }
};

begin_cinema = function(_res) {
    cinema = true;
    cinema_t = 0;
    cinema_last_tick = -999;
    cinema_locked = false;
    last_play = _res;
    cinema_outcome = is_struct(_res) && variable_struct_exists(_res, "outcome") ? _res.outcome : global.session.last_outcome;
    cinema_out = bonus_is_out(cinema_outcome);
    cinema_variant = cinema_pick();
    var _syms = ["O", "*", "+"];
    cinema_slot_win = _syms[irandom(2)];
    if (cinema_variant == "bounce") {
        cinema_bounce_build(cinema_out);
    }
};

begin_at_bat();

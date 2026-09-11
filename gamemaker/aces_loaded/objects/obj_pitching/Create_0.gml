half_over = false;
resolving = false;
showdown = undefined;
pitch_btns = [];
feedback = "";
at_bat = 1;
targeting = false;
target_key = "";
target_idx = -1;
target_domain = "";
flash_idx = -1;
flash_domain = "";
flash_t = 0;

btn_deal = ui_button(560, 660, 180, 48, "DEAL", pal_green_dk(), pal_gold());
btn_ibb = ui_button(760, 660, 140, 48, "IBB", pal_card(), pal_gold());
btn_bullpen = ui_button(160, 660, 200, 48, "BULLPEN", pal_card(), pal_gold());
btn_confirm_tgt = ui_button(560, 660, 180, 48, "CONFIRM", pal_green_dk(), pal_gold());
btn_cancel_tgt = ui_button(760, 660, 160, 48, "CANCEL", pal_card(), pal_gold());
btn_next = ui_button(640, 660, 260, 48, "NEXT AT-BAT", pal_green_dk(), pal_gold());
btn_continue = ui_button(640, 660, 280, 48, "CONTINUE", pal_green_dk(), pal_gold());

rebuild_pitches = function() {
    pitch_btns = [];
    targeting = false;
    target_key = "";
    target_idx = -1;
    target_domain = "";
    if (!is_struct(showdown)) {
        return;
    }
    var _keys = roster_my_pitcher(global.session.roster).pitches;
    var _n = array_length(_keys);
    var _gap = 150;
    var _start = 640 - ((_n - 1) * _gap) * 0.5;
    for (var i = 0; i < _n; i++) {
        var _used = sd_used(showdown, _keys[i]);
        var _types = data_pitch_types();
        var _label = variable_struct_exists(_types, _keys[i]) ? _types[$ _keys[i]].name : _keys[i];
        var _btn = ui_button(_start + i * _gap, 650, 140, 56, _label, pal_card(), pal_gold());
        _btn.key = _keys[i];
        _btn.disabled = _used;
        array_push(pitch_btns, _btn);
    }
};

comm_x = function(_i) {
    var _n = array_length(showdown.community);
    return 640 - ((_n - 1) * 110) * 0.5 + _i * 110;
};

begin_targeting = function(_key) {
    var _sug = sd_suggested_target(showdown, _key);
    if (_sug < 0) {
        apply_and_advance(_key, -1);
        return;
    }
    targeting = true;
    target_key = _key;
    target_idx = _sug;
    target_domain = sd_target_domain(_key);
    feedback = "Aim — " + sd_pitch_desc(_key);
};

apply_and_advance = function(_key, _chosen) {
    var _opts = {};
    if (_key == "fastball") {
        var _i = (_chosen >= 0) ? _chosen : sd_suggested_target(showdown, _key);
        _opts.swapIndex = (_i < 0) ? 0 : _i;
    } else if (sd_is_targeted(_key)) {
        var _t = (_chosen >= 0) ? _chosen : sd_suggested_target(showdown, _key);
        if (_t >= 0) {
            _opts.targetIndex = _t;
        }
    }
    targeting = false;
    var _r = sd_apply_pitch(showdown, _key, _opts);
    var _types = data_pitch_types();
    var _pname = variable_struct_exists(_types, _key) ? _types[$ _key].name : _key;
    if (_r.success) {
        feedback = _pname + " — " + sd_pitch_desc(_key);
        if (variable_struct_exists(_r, "misfired") && _r.misfired) {
            feedback += " (misfire)";
        }
        flash_domain = (_key == "fastball") ? "hole" : "community";
        if (_key == "fastball") {
            flash_idx = variable_struct_exists(_opts, "swapIndex") ? _opts.swapIndex : 0;
        } else if (variable_struct_exists(_opts, "targetIndex")) {
            flash_idx = _opts.targetIndex;
        } else {
            flash_idx = 0;
        }
        flash_t = 14;
    } else {
        feedback = _pname + " failed";
    }
    if (showdown.stage == "flop") {
        sd_deal_turn(showdown);
    } else if (showdown.stage == "turn") {
        sd_deal_river(showdown);
    } else if (showdown.stage == "river") {
        finish_showdown();
        return;
    }
    rebuild_pitches();
};

finish_showdown = function() {
    var _r = sd_resolve(showdown);
    var _res = session_resolve_pitch(_r.outcome);
    feedback = _r.winner + "  " + _r.pitcher_hand.hand_name + " vs " + _r.batter_hand.hand_name + "  —  " + _res.description;
    resolving = true;
    global.session.roster.my_stamina = max(0, global.session.roster.my_stamina - showdown.stamina_drained);
    var _st = global.session.baseball.state;
    if (bb_is_game_over(global.session.baseball) || _st == "SWITCH_SIDE") {
        half_over = true;
    }
};

do_ibb = function() {
    var _res = session_resolve_pitch("Walk");
    feedback = "IBB — " + _res.description;
    resolving = true;
    var _st = global.session.baseball.state;
    if (bb_is_game_over(global.session.baseball) || _st == "SWITCH_SIDE") {
        half_over = true;
    }
};

start_showdown = function() {
    var s = global.session;
    var _p = roster_my_pitcher(s.roster);
    var _b = roster_opp_batter(s.roster);
    showdown = sd_create(_p);
    var _lead = s.player_score - s.opponent_score;
    sd_start(showdown, _b, s.outs, s.inning, _lead, bb_runner_count(s.baseball) > 0);
    if (at_bat > 1) {
        var _delay = bb_staff_sum(s.baseball, "pitcher_fatigue_delay");
        sd_degrade(showdown, max(1, at_bat - _delay));
    }
    s.roster.my_stamina = max(0, s.roster.my_stamina - 0.03);
    feedback = "Showdown vs " + _b.name;
    resolving = false;
    targeting = false;
    flash_t = 0;
    rebuild_pitches();
};

start_showdown();

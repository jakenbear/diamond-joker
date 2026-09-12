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
flash_col = pal_gold();
flash_kind = "swap";
effect_hold = 0;
pending_advance = "";
reveal_movie = false;
reveal_t = 0;
reveal_result = undefined;
bullpen_open = false;
reliever_btns = [];
btn_keep = undefined;

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
    sfx_pitch_select();
    var _r = sd_apply_pitch(showdown, _key, _opts);
    var _types = data_pitch_types();
    var _pname = variable_struct_exists(_types, _key) ? _types[$ _key].name : _key;
    if (_r.success) {
        feedback = _pname + " — " + sd_pitch_desc(_key);
        if (variable_struct_exists(_r, "misfired") && _r.misfired) {
            feedback += " (misfire)";
        }
        flash_kind = pitch_effect_kind(_key);
        flash_col = pitch_effect_color(flash_kind);
        flash_domain = pitch_effect_domain(_key);
        if (_key == "fastball") {
            flash_idx = variable_struct_exists(_opts, "swapIndex") ? _opts.swapIndex : 0;
        } else if (variable_struct_exists(_opts, "targetIndex")) {
            flash_idx = _opts.targetIndex;
        } else {
            flash_idx = 0;
        }
        flash_t = 16;
        effect_hold = 24;
        if (showdown.stage == "flop") {
            pending_advance = "turn";
        } else if (showdown.stage == "turn") {
            pending_advance = "river";
        } else {
            pending_advance = "resolve";
        }
    } else {
        feedback = _pname + " failed";
        effect_hold = 12;
        if (showdown.stage == "flop") {
            pending_advance = "turn";
        } else if (showdown.stage == "turn") {
            pending_advance = "river";
        } else {
            pending_advance = "resolve";
        }
    }
};

run_pending_advance = function() {
    var _next = pending_advance;
    pending_advance = "";
    effect_hold = 0;
    if (_next == "turn") {
        sd_deal_turn(showdown);
        rebuild_pitches();
    } else if (_next == "river") {
        sd_deal_river(showdown);
        rebuild_pitches();
    } else if (_next == "resolve") {
        finish_showdown();
    }
};

pitch_effect_kind = function(_key) {
    switch (_key) {
        case "fastball":
        case "slider":
        case "screwball":
        case "twoseam":
            return "swap";
        case "palmball":
            return "plant";
        case "changeup":
            return "reveal";
        case "curveball":
        case "sinker":
            return "downgrade";
        case "breaking":
            return "flip";
        case "cutter":
            return "lock";
        case "splitter":
            return "destroy";
        default:
            return "scramble";
    }
};

pitch_effect_color = function(_kind) {
    switch (_kind) {
        case "swap":
            return make_color_rgb(100, 181, 246);
        case "plant":
            return pal_green();
        case "reveal":
        case "lock":
            return pal_gold();
        case "downgrade":
        case "destroy":
            return pal_red();
        case "flip":
            return make_color_rgb(30, 136, 229);
        default:
            return make_color_rgb(0, 131, 143);
    }
};

pitch_effect_domain = function(_key) {
    if (_key == "fastball") {
        return "hole";
    }
    if (_key == "changeup" || _key == "curveball" || _key == "screwball") {
        return "batter";
    }
    return "community";
};

finish_showdown = function() {
    var _r = sd_resolve(showdown);
    var _res = session_resolve_pitch(_r.outcome);
    feedback = _r.winner + "  " + _r.pitcher_hand.hand_name + " vs " + _r.batter_hand.hand_name + "  —  " + _res.description;
    resolving = true;
    reveal_movie = true;
    reveal_t = 0;
    reveal_result = _r;
    global.session.roster.my_stamina = max(0, global.session.roster.my_stamina - showdown.stamina_drained);
    if (_r.is_out) {
        sfx_spin_success();
    } else {
        sfx_spin_fail();
    }
    sfx_later(0.18, method({ oc: _res.outcome, runs: _res.runs }, function() {
        sfx_play_result(oc, runs);
        fx_play_result(oc, runs);
    }));
    var _st = global.session.baseball.state;
    if (bb_is_game_over(global.session.baseball) || _st == "SWITCH_SIDE") {
        half_over = true;
    }
};

do_ibb = function() {
    var _res = session_resolve_pitch("Walk");
    feedback = "IBB — " + _res.description;
    resolving = true;
    sfx_walk();
    fx_play_result("Walk", _res.runs);
    if (_res.runs > 0) {
        sfx_later(0.25, function() { sfx_run_scored(); });
    }
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
    effect_hold = 0;
    pending_advance = "";
    reveal_movie = false;
    bullpen_open = false;
    rebuild_pitches();
};

open_bullpen = function() {
    var _pen = roster_bullpen_ready(global.session.roster);
    bullpen_open = true;
    reliever_btns = [];
    var _n = array_length(_pen) + 1;
    var _gap = 150;
    var _start = 640 - ((_n - 1) * _gap) * 0.5;
    for (var i = 0; i < array_length(_pen); i++) {
        var _p = _pen[i].pitcher;
        var _btn = ui_button(_start + i * _gap, 560, 140, 120, "", pal_card(), make_color_rgb(66, 165, 245));
        _btn.bull_index = _pen[i].index;
        _btn.pitcher = _p;
        array_push(reliever_btns, _btn);
    }
    var _sta = round(global.session.roster.my_stamina * 100);
    btn_keep = ui_button(_start + array_length(_pen) * _gap, 560, 140, 120, "", pal_card(), pal_dim());
    btn_keep.stamina_pct = _sta;
    feedback = roster_my_pitcher(global.session.roster).name + " (" + string(_sta) + "%) — pick a reliever";
};

close_bullpen = function() {
    bullpen_open = false;
    reliever_btns = [];
    btn_keep = undefined;
};

start_showdown();

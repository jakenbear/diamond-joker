/// @desc Persistent session. Baseball, count, roster, and cards are live.

function session_init() {
    if (!variable_global_exists("session") || !is_struct(global.session)) {
        session_reset();
    }
}

function session_reset() {
    global.session = {
        player_team_id: "",
        opponent_team_id: "",
        player_team: undefined,
        opponent_team: undefined,
        regulation: 3,
        inning: 1,
        half: "top",
        player_score: 0,
        opponent_score: 0,
        outs: 0,
        balls: 0,
        strikes: 0,
        peanuts: 0,
        bases: [false, false, false],
        player_runs_by_inning: [],
        opponent_runs_by_inning: [],
        last_outcome: "",
        pack_opened_this_game: false,
        game_over: false,
        player_won: false,
        walk_off: false,
        innings_played: 0,
        draft_picks: array_create(9, -1),
        shop_buys: 0,
        cards: undefined,
        baseball: undefined,
        count: undefined,
        roster: undefined,
        discard_count: 0,
        free_takes: 0,
        max_select: 5,
        owned_trait_ids: [],
        at_bat_number: 1,
        max_peanuts_inning: 0,
        pending_pack: "",
        k_redraw_used: false,
        last_bonus_notes: "",
        at_bat_seed: 1,
        pitcher_index: 0,
        deck_id: "standard",
        show_showdowns: false,
    };
}

function session_teams() {
    static _teams = undefined;
    if (_teams != undefined) {
        return _teams;
    }
    var _full = data_teams_full();
    if (array_length(_full) > 0) {
        _teams = [];
        for (var i = 0; i < array_length(_full); i++) {
            var _t = _full[i];
            var _hex = variable_struct_exists(_t, "colorHex") ? _t.colorHex : 15022389;
            array_push(_teams, {
                id: _t.id,
                name: _t.name,
                nickname: _t.nickname,
                style: variable_struct_exists(_t, "style") ? _t.style : "",
                color: make_color_rgb((_hex >> 16) & 255, (_hex >> 8) & 255, _hex & 255),
            });
        }
        return _teams;
    }
    _teams = [
        { id: "CAN", name: "Canada", nickname: "Mounties", style: "Balanced power and grit", color: make_color_rgb(229, 57, 53) },
        { id: "USA", name: "USA", nickname: "Eagles", style: "Raw power and velocity", color: make_color_rgb(21, 101, 192) },
        { id: "JPN", name: "Japan", nickname: "Dragons", style: "Precision contact and control", color: make_color_rgb(183, 28, 28) },
        { id: "MEX", name: "Mexico", nickname: "Diablos", style: "Speed and clutch hitting", color: make_color_rgb(46, 125, 50) },
    ];
    return _teams;
}

function session_team(_id) {
    var _teams = session_teams();
    for (var i = 0; i < array_length(_teams); i++) {
        if (_teams[i].id == _id) {
            return _teams[i];
        }
    }
    return _teams[0];
}

function session_start(_player_id, _opp_id, _innings, _pitcher_index = 0, _deck_id = "standard") {
    session_reset();
    var s = global.session;
    s.player_team_id = _player_id;
    s.opponent_team_id = _opp_id;
    s.player_team = session_team(_player_id);
    s.opponent_team = session_team(_opp_id);
    s.regulation = _innings;
    s.pitcher_index = _pitcher_index;
    s.deck_id = (_deck_id == undefined || _deck_id == "") ? "standard" : _deck_id;
    s.baseball = bb_create(_innings);
    s.count = count_create();
    var _pf = data_team_full(_player_id);
    var _of = data_team_full(_opp_id);
    if (!is_struct(_pf) || !is_struct(_of)) {
        show_debug_message("teams.json failed to load — cannot start game");
        return;
    }
    var _pi = clamp(_pitcher_index, 0, array_length(_pf.pitchers) - 1);
    s.roster = roster_create(_pf, _pi, _of);
    s.cards = cards_create(s.deck_id);
    session_sync();
}

function session_sync() {
    var s = global.session;
    if (!is_struct(s.baseball)) {
        return;
    }
    var _bb = s.baseball;
    s.inning = _bb.inning;
    s.half = _bb.half;
    s.player_score = _bb.player_score;
    s.opponent_score = _bb.opponent_score;
    s.outs = _bb.outs;
    s.peanuts = _bb.total_peanuts;
    s.bases = [_bb.bases[0] != "", _bb.bases[1] != "", _bb.bases[2] != ""];
    s.player_runs_by_inning = _bb.player_runs_by_inning;
    s.opponent_runs_by_inning = _bb.opponent_runs_by_inning;
    s.walk_off = _bb.walk_off;
    if (is_struct(s.count)) {
        s.balls = s.count.balls;
        s.strikes = s.count.strikes;
    }
}

function session_half_label() {
    var s = global.session;
    return (s.half == "top") ? "TOP" : "BOT";
}

function session_inning_text() {
    var s = global.session;
    var _txt = "INN " + string(s.inning) + " " + session_half_label();
    if (s.inning > s.regulation) {
        _txt += "  EXTRAS";
    }
    return _txt;
}

function session_is_regulation_or_later() {
    return global.session.inning >= global.session.regulation;
}

function session_eval_state() {
    var _bb = global.session.baseball;
    return {
        pairs_played: _bb.pairs_played,
        two_pairs_played: _bb.two_pairs_played,
        trips_played: _bb.trips_played,
        straights_played: _bb.straights_played,
        flushes_played: _bb.flushes_played,
        discard_count: global.session.discard_count,
    };
}

function session_sync_eval_state(_state) {
    var _bb = global.session.baseball;
    _bb.pairs_played = _state.pairs_played;
    _bb.two_pairs_played = _state.two_pairs_played;
    _bb.trips_played = _state.trips_played;
    _bb.straights_played = _state.straights_played;
    _bb.flushes_played = _state.flushes_played;
}

function session_at_bat_rng() {
    return fx_rng_make(global.session.at_bat_seed);
}

function session_roll_at_bat_seed() {
    global.session.at_bat_seed = irandom_range(1, $7fffffff);
}

function session_team_pitchers(_id) {
    var _t = data_team_full(_id);
    if (!is_struct(_t) || !variable_struct_exists(_t, "pitchers")) {
        return [];
    }
    return _t.pitchers;
}

function session_pitcher_pre_names(_pitcher) {
    var _names = "";
    if (!is_struct(_pitcher)) {
        return _names;
    }
    for (var i = 0; i < array_length(_pitcher.traits); i++) {
        var _t = _pitcher.traits[i];
        if (is_struct(_t) && variable_struct_exists(_t, "phase") && _t.phase == "pitcher_pre") {
            if (_names != "") {
                _names += "/";
            }
            _names += _t.name;
        }
    }
    return _names;
}

function session_apply_pre_chain(_cards, _rng) {
    var s = global.session;
    var _pitcher = session_pitcher();
    var _batter = roster_effective_batter(s.roster, s.baseball);
    _cards = fx_apply_pre(_cards, _pitcher.traits, "pitcher_pre", _rng);
    _cards = fx_apply_pre(_cards, _batter.traits, "pre", _rng);
    return _cards;
}

function session_hand_preview(_sel) {
    var s = global.session;
    var _empty = { title: "", score: "", color: pal_gold(), is_bunt: false };
    if (!is_array(_sel) || array_length(_sel) <= 0) {
        return _empty;
    }
    if (array_length(_sel) == 1 && bb_runner_count(s.baseball) > 0 && s.outs < 2) {
        return { title: "SAC BUNT", score: "0 peanuts  —  runners advance, batter out", color: pal_gold(), is_bunt: true };
    }
    var _raw = [];
    for (var i = 0; i < array_length(_sel); i++) {
        array_push(_raw, s.cards.hand[_sel[i]]);
    }
    var _played = cards_copy(_raw);
    var _pitcher = session_pitcher();
    var _detect = fx_apply_pre(cards_copy(_raw), _pitcher.traits, "pitcher_pre", session_at_bat_rng());
    var _tag = "";
    if (cards_ranks_changed(_raw, _detect)) {
        var _pnames = session_pitcher_pre_names(_pitcher);
        if (_pnames != "") {
            _tag = "  ! " + _pnames;
        }
    }
    _played = session_apply_pre_chain(_played, session_at_bat_rng());
    var _cls = cards_classify(_played);
    var _high = (_cls.hand_name == "High Card" || _cls.hand_name == "Strikeout");
    if (_high) {
        var _hint = cards_hand_hint(_raw);
        var _title = (_hint != "") ? _hint : "High Card — Strikeout";
        return { title: _title + _tag, score: "OUT", color: pal_red(), is_bunt: false };
    }
    var _entry = data_hand_named(_cls.hand_name);
    var _desc = cards_describe(_cls.best_cards, _cls.hand_name);
    var _chance = cards_success_chance(_cls.hand_name, _cls.pair_rank, s.strikes, session_eval_state());
    var _title = _desc + "  ->  " + _entry.outcome;
    if (_chance < 100) {
        _title += "  (" + string(_chance) + "%)";
    }
    _title += _tag;
    var _batter = roster_effective_batter(s.roster, s.baseball);
    var _pwr = max(0, _batter.power - 5);
    var _cnt = _batter.contact / 10;
    var _peanuts = _entry.peanuts + _pwr;
    var _mult = round((_entry.mult + _cnt) * 10) / 10;
    var _total = round(_peanuts * _mult);
    var _score = string(_peanuts) + " x " + string(_mult) + " = " + string(_total);
    if (_pwr > 0) {
        _score += "  +" + string(_pwr) + " PWR";
    }
    if (_cnt > 0) {
        _score += "  +" + string_replace_all(string_format(_cnt, 1, 1), " ", "") + " CNT";
    }
    return { title: _title, score: _score, color: pal_preview_chance(_chance), is_bunt: false };
}

function session_batter() {
    return roster_batter(global.session.roster);
}

function session_pitcher() {
    return roster_opp_pitcher(global.session.roster);
}

function session_pitcher_control() {
    var _ctl = session_pitcher().control;
    var _syn = syn_calculate(global.session.roster.batters);
    _ctl -= syn_bonus_sum(_syn, "pitcher_control_reduction");
    return max(1, _ctl);
}

function session_hit_reduction() {
    var _n = bb_staff_sum(global.session.baseball, "pitcher_hit_reduction");
    var _syn = syn_calculate(global.session.roster.batters);
    _n += syn_bonus_sum(_syn, "pitcher_hit_reduction");
    return _n;
}

function session_start_at_bat() {
    var s = global.session;
    var _batter = roster_effective_batter(s.roster, s.baseball);
    if (s.baseball.at_bats_this_inning == 0) {
        s.k_redraw_used = false;
        s.max_peanuts_inning = 0;
    }
    s.discard_count = 0;
    session_roll_at_bat_seed();
    s.max_select = 5 + fx_trait_sum(_batter.traits, "add_hand_size");
    s.free_takes = fx_trait_sum(_batter.traits, "add_discard") + bb_staff_sum(s.baseball, "team_add_discard");
    count_reset(s.count);
    var _start_balls = fx_trait_sum(_batter.traits, "start_with_ball");
    if (_start_balls > 0) {
        count_set_starting_balls(s.count, _start_balls);
    }
    if (array_length(s.cards.hand) == 0) {
        cards_new_at_bat(s.cards);
        var _extra = bb_staff_sum(s.baseball, "add_hand_draw");
        if (_extra > 0) {
            cards_draw(s.cards, _extra);
        }
    }
    session_sync();
    var _ctl = session_pitcher_control();
    var _hbp = sit_hbp(_ctl);
    if (_hbp.triggered) {
        session_resolve_count_outcome("HBP", "Hit by pitch!");
        return "hbp";
    }
    return "play";
}

function session_dump_hand() {
    var s = global.session;
    for (var i = 0; i < array_length(s.cards.hand); i++) {
        array_push(s.cards.discard_pile, s.cards.hand[i]);
    }
    s.cards.hand = [];
}

function session_finish_at_bat(_label) {
    var s = global.session;
    s.last_outcome = _label;
    s.discard_count = 0;
    count_reset(s.count);
    session_dump_hand();
    roster_advance_batter(s.roster);
    session_sync();
}

function session_try_k_redraw() {
    var s = global.session;
    if (s.k_redraw_used) {
        return false;
    }
    if (!bb_staff_has(s.baseball, "strikeout_redraw")) {
        return false;
    }
    s.k_redraw_used = true;
    session_dump_hand();
    cards_new_at_bat(s.cards);
    var _extra = bb_staff_sum(s.baseball, "add_hand_draw");
    if (_extra > 0) {
        cards_draw(s.cards, _extra);
    }
    count_reset(s.count);
    s.discard_count = 0;
    session_roll_at_bat_seed();
    s.last_outcome = "Nine Lives — redraw!";
    session_sync();
    return true;
}

function session_resolve_count_outcome(_outcome, _label) {
    var s = global.session;
    if (_outcome == "Strikeout" && session_try_k_redraw()) {
        return { runs: 0, description: s.last_outcome, state: s.baseball.state, outcome: "Strikeout", redraw: true };
    }
    var _name = session_batter().name;
    var _res = bb_resolve(s.baseball, _outcome, 0, _name);
    session_finish_at_bat(_label + " — " + _res.description);
    _res.outcome = _outcome;
    return _res;
}

function session_after_discard(_sel) {
    var s = global.session;
    cards_discard(s.cards, _sel);
    if (s.free_takes > 0) {
        s.free_takes -= 1;
        s.last_outcome = "Free take!";
        session_sync();
        return { kind: "free" };
    }
    s.discard_count += 1;
    if (bb_staff_has(s.baseball, "bonus_draw_on_discard") && random(1) < 0.20) {
        cards_draw(s.cards, 1);
        s.last_outcome = "Trash Panda stole a card!";
    }
    var _pitcher = session_pitcher();
    var _batter = roster_effective_batter(s.roster, s.baseball);
    var _pr = count_record_discard(s.count, _pitcher.velocity, session_pitcher_control(), _batter.contact);
    var _wp = sit_wild_pitch(session_pitcher_control(), s.baseball.bases);
    if (_wp.triggered) {
        bb_advance_all(s.baseball);
        s.last_outcome = _wp.description;
    }
    if (_pr.is_walk) {
        session_sync();
        return { kind: "walk", result: session_resolve_count_outcome("Walk", "Walk") };
    }
    if (_pr.is_strikeout) {
        var _res = session_resolve_count_outcome("Strikeout", "Struck out");
        session_sync();
        if (is_struct(_res) && variable_struct_exists(_res, "redraw") && _res.redraw) {
            return { kind: "redraw" };
        }
        return { kind: "k", result: _res };
    }
    if (_pr.is_foul && random(1) < 0.08) {
        session_sync();
        return { kind: "foul_out", result: session_resolve_count_outcome("Flyout", "Foul pop-up caught") };
    }
    if (_pr.is_ball) {
        s.last_outcome = "Ball " + string(s.count.balls) + "!";
    } else if (_pr.is_foul) {
        s.last_outcome = "Foul!";
    } else if (_pr.is_strike) {
        s.last_outcome = "Strike " + string(s.count.strikes) + "!";
    }
    session_sync();
    return { kind: "pitch" };
}

function session_play_hand(_sel) {
    var s = global.session;
    var _raw = session_batter();
    var _batter = roster_effective_batter(s.roster, s.baseball);
    var _pitcher = session_pitcher();
    var _played = [];
    for (var i = 0; i < array_length(_sel); i++) {
        array_push(_played, s.cards.hand[_sel[i]]);
    }

    if (array_length(_played) == 1 && bb_runner_count(s.baseball) > 0 && s.baseball.outs < 2) {
        var _bunt = bb_resolve(s.baseball, "Sac Bunt", 0, _raw.name);
        session_finish_at_bat("Sac Bunt — " + _bunt.description);
        _bunt.outcome = "Sac Bunt";
        return _bunt;
    }

    var _original = cards_copy(_played);
    var _detect = fx_apply_pre(cards_copy(_played), _pitcher.traits, "pitcher_pre", session_at_bat_rng());
    var _pitcher_tag = "";
    if (cards_ranks_changed(_original, _detect)) {
        _pitcher_tag = session_pitcher_pre_names(_pitcher);
    }
    _played = session_apply_pre_chain(_played, session_at_bat_rng());

    if (fx_trait_has(_batter.traits, "stolen_base") && bb_base_filled(s.baseball, 0)) {
        bb_process_stolen_base(s.baseball);
    }
    if (s.count.balls == 3 && s.count.strikes == 2 && bb_runner_count(s.baseball) > 0) {
        bb_advance_all(s.baseball);
    }

    var _sheep = bb_staff_has(s.baseball, "ignore_pair_penalty");
    var _saved_pairs = s.baseball.pairs_played;
    if (_sheep) {
        s.baseball.pairs_played = 0;
    }
    var _state = session_eval_state();
    var _result = cards_evaluate_hand(_played, s.count.strikes, _state);
    session_sync_eval_state(_state);
    if (_sheep) {
        s.baseball.pairs_played = _saved_pairs;
    }

    var _gs = fx_gs_from_bb(s.baseball);
    _result = fx_apply_post(_result, _pitcher.traits, _gs, "pitcher_post");
    _result = fx_apply_post(_result, _batter.traits, _gs, "post");

    var _mods = count_modifiers(s.count);
    var _first = (s.discard_count == 0) ? 0.5 : 0;
    var _hit = !bonus_is_out(_result.outcome);
    if (_hit && (_mods.peanuts != 0 || _mods.mult + _first != 0)) {
        _result.peanuts = max(0, _result.peanuts + _mods.peanuts);
        _result.mult = round(max(1, _result.mult + _mods.mult + _first) * 10) / 10;
        _result.score = round(_result.peanuts * _result.mult);
    }

    var _syn = syn_calculate(s.roster.batters);
    var _lineup = roster_lineup_effects(s.roster);
    var _line_save = 0;
    for (var i = 0; i < array_length(_lineup); i++) {
        if (_lineup[i].type == "team_contact_save_boost") {
            _line_save += _lineup[i].value;
        }
    }
    var _bat_b = bonus_batter_mods(_result, _batter, _line_save);
    if (_bat_b.contact_save) {
        _result = fx_apply_post(_result, _batter.traits, _gs, "post");
    }
    bonus_pitcher_mods(_result, _pitcher, s.baseball.inning);
    var _staff_b = bonus_apply_staff(_result, _gs, s.baseball.staff);
    var _line_b = bonus_apply_lineup(_result, _gs, _lineup, _batter, s.discard_count);
    var _syn_b = bonus_apply_synergies(_result, _gs, _syn, _batter);

    var _notes = "";
    for (var i = 0; i < array_length(_staff_b.messages); i++) {
        _notes += _staff_b.messages[i] + "  ";
    }
    for (var i = 0; i < array_length(_line_b.messages); i++) {
        _notes += _line_b.messages[i] + "  ";
    }
    for (var i = 0; i < array_length(_syn_b.messages); i++) {
        _notes += _syn_b.messages[i] + "  ";
    }
    s.last_bonus_notes = _notes;

    if (_result.outcome == "Strikeout" && session_try_k_redraw()) {
        return { runs: 0, description: s.last_outcome, state: s.baseball.state, outcome: "Strikeout", redraw: true };
    }

    var _sac = 0;
    if (variable_struct_exists(_result, "sacrificeFly") && _result.sacrificeFly) {
        _sac = bb_process_sac_fly(s.baseball);
    }
    var _sit = sit_check(_result.outcome, s.baseball, _batter.speed, _staff_b.error_mult);
    if (_sit.transformed) {
        _result.outcome = _sit.outcome;
    }
    if (_result.outcome == "Flyout" && bb_base_filled(s.baseball, 2) && s.baseball.outs < 2 && _sac == 0) {
        _sac = bb_process_sac_fly(s.baseball);
    }
    if (_sit.productive_out) {
        bb_productive_advance(s.baseball);
    }

    var _res = bb_resolve(s.baseball, _result.outcome, _result.score, _raw.name);
    if (_result.score > s.max_peanuts_inning) {
        s.max_peanuts_inning = _result.score;
    }

    var _extra = { scored: 0, advanced: false };
    if (_result.outcome == "Single") {
        var _chance = _bat_b.extra_base + _staff_b.extra_base_bonus + _line_b.extra_base_bonus + _syn_b.extra_base_bonus;
        if (_chance > 0) {
            _extra = bb_try_extra_base(s.baseball, _chance);
        }
    }

    var _label = _result.played_description;
    if (_label != "") {
        _label += " — ";
    }
    _label += _res.description;
    if (_sit.transformed && _sit.description != "") {
        _label += "  " + _sit.description;
    }
    if (_sac > 0) {
        _label += "  Sac fly!";
    }
    if (_extra.advanced) {
        _label += _extra.scored > 0 ? "  Speed! Extra run!" : "  Speed! Runner advances!";
    }
    if (_pitcher_tag != "") {
        _label += "  " + _pitcher_tag + "!";
    }
    if (_notes != "") {
        _label += "  " + _notes;
    }
    session_finish_at_bat(_label);
    _res.outcome = _result.outcome;
    return _res;
}

function session_pack_tier() {
    var s = global.session;
    if (s.roster.bonus_count >= 3) {
        return "";
    }
    var _runs = s.baseball.current_inning_runs;
    if (_runs >= 4 || s.max_peanuts_inning >= 25) {
        return "gold";
    }
    if (_runs >= 2) {
        return "bronze";
    }
    return "";
}

function session_resolve_pitch(_outcome) {
    var s = global.session;
    var _batter = roster_opp_batter(s.roster);
    var _stole = false;
    if (!bonus_is_out(_outcome) && _outcome != "Walk" && _outcome != "HBP") {
        var _red = session_hit_reduction();
        if (_red > 0 && random(1) < _red) {
            _outcome = "Flyout";
            _stole = true;
        }
    }
    var _sit = sit_check(_outcome, s.baseball, _batter.speed, 1);
    if (_sit.transformed) {
        _outcome = _sit.outcome;
    }
    if (_sit.productive_out) {
        bb_productive_advance(s.baseball);
    }
    var _res = bb_resolve(s.baseball, _outcome, 0, _batter.name);
    roster_advance_opp_batter(s.roster);
    s.at_bat_number += 1;
    s.last_outcome = _batter.name + " — " + _res.description;
    if (_stole) {
        s.last_outcome += "  Defense!";
    }
    session_sync();
    _res.outcome = _outcome;
    return _res;
}

function session_played_innings() {
    var s = global.session;
    return max(array_length(s.player_runs_by_inning), array_length(s.opponent_runs_by_inning));
}

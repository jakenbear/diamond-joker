/// @desc Room flow. End conditions match the GDD.

function flow_goto(_room) {
    room_goto(_room);
}

function flow_goto_title() {
    session_reset();
    room_goto(rm_title);
}

function flow_goto_team_select() {
    room_goto(rm_team_select);
}

function flow_start_game(_player_id, _opp_id, _innings, _pitcher_index = 0) {
    session_start(_player_id, _opp_id, _innings, _pitcher_index);
    room_goto(rm_trait_draft);
}

function flow_after_draft() {
    var s = global.session;
    s.owned_trait_ids = roster_apply_draft(s.roster, s.draft_picks);
    room_goto(rm_batting);
}

function flow_end_from_bb() {
    var s = global.session;
    session_sync();
    var _r = bb_result(s.baseball);
    s.game_over = true;
    s.player_won = _r.won;
    s.walk_off = _r.walk_off;
    s.innings_played = max(1, _r.innings);
    room_goto(rm_game_over);
}

function flow_goto_pack_or_pitch() {
    var s = global.session;
    if (s.pending_pack != "") {
        room_goto(rm_pack_open);
        return;
    }
    room_goto(rm_pitching);
}

function flow_finish_player_half() {
    var s = global.session;
    session_sync();
    if (bb_is_game_over(s.baseball)) {
        flow_end_from_bb();
        return;
    }
    s.pending_pack = session_pack_tier();
    bb_finish_player_half(s.baseball);
    session_sync();
    if (bb_should_show_shop(s.baseball)) {
        room_goto(rm_shop);
        return;
    }
    flow_goto_pack_or_pitch();
}

function flow_after_shop() {
    var s = global.session;
    bb_mark_shop(s.baseball);
    flow_goto_pack_or_pitch();
}

function flow_after_pack() {
    global.session.pending_pack = "";
    room_goto(rm_pitching);
}

function flow_finish_opponent_half() {
    var s = global.session;
    session_sync();
    if (bb_is_game_over(s.baseball)) {
        flow_end_from_bb();
        return;
    }
    bb_finish_opponent_half(s.baseball);
    session_sync();
    if (bb_is_game_over(s.baseball)) {
        flow_end_from_bb();
        return;
    }
    s.at_bat_number = 1;
    room_goto(rm_batting);
}

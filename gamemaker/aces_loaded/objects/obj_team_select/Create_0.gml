phase = 0;
player_id = "";
opp_id = "";
innings = 3;
pitcher_index = 0;
deck_id = "standard";
rebuild_buttons = true;

team_select_rebuild = function() {
    var teams = session_teams();
    team_buttons = [];
    innings_buttons = [];
    deck_buttons = [];
    pitcher_buttons = [];
    btn_back = undefined;
    btn_start = undefined;
    btn_next = undefined;

    if (phase == 0) {
        var n = array_length(teams);
        var gap = 24;
        var w = 248;
        var total = n * w + (n - 1) * gap;
        var start_x = 640 - total * 0.5 + w * 0.5;
        for (var i = 0; i < n; i++) {
            var b = ui_button(start_x + i * (w + gap), 300, w, 220, "", pal_card(), teams[i].color);
            b.team_id = teams[i].id;
            array_push(team_buttons, b);
        }
    } else if (phase == 1) {
        var staff = session_team_pitchers(player_id);
        var n = array_length(staff);
        for (var i = 0; i < n; i++) {
            var p = staff[i];
            var b = ui_button(640, 168 + i * 70, 560, 58, "", pal_card(), pal_gold());
            b.pitcher_index = i;
            b.selected = (i == pitcher_index);
            array_push(pitcher_buttons, b);
        }
        btn_back = ui_button(80, 40, 100, 36, "BACK", pal_card(), pal_green());
        btn_next = ui_button(640, 640, 300, 52, "CHOOSE OPPONENT", pal_green_dk(), pal_gold());
    } else if (phase == 2) {
        var opts = [];
        for (var i = 0; i < array_length(teams); i++) {
            if (teams[i].id != player_id) {
                array_push(opts, teams[i]);
            }
        }
        var n = array_length(opts);
        var gap = 24;
        var w = 248;
        var total = n * w + (n - 1) * gap;
        var start_x = 640 - total * 0.5 + w * 0.5;
        for (var i = 0; i < n; i++) {
            var b = ui_button(start_x + i * (w + gap), 300, w, 220, "", pal_card(), opts[i].color);
            b.team_id = opts[i].id;
            array_push(team_buttons, b);
        }
        btn_back = ui_button(80, 40, 100, 36, "BACK", pal_card(), pal_green());
    } else {
        var lengths = [3, 5, 7, 9];
        var opt_w = 70;
        var gap = 12;
        var row_w = array_length(lengths) * opt_w + (array_length(lengths) - 1) * gap;
        var start_x = 640 - row_w * 0.5 + opt_w * 0.5;
        for (var i = 0; i < array_length(lengths); i++) {
            var b = ui_button(start_x + i * (opt_w + gap), 432, opt_w, 40, string(lengths[i]), pal_card(), pal_green());
            b.innings = lengths[i];
            b.selected = (lengths[i] == innings);
            array_push(innings_buttons, b);
        }
        var decks = data_deck_list();
        var dw = 176;
        var dg = 12;
        var drow = array_length(decks) * dw + (array_length(decks) - 1) * dg;
        var dx0 = 640 - drow * 0.5 + dw * 0.5;
        for (var i = 0; i < array_length(decks); i++) {
            var db = ui_button(dx0 + i * (dw + dg), 528, dw, 48, decks[i].name, pal_card(), pal_gold());
            db.deck_id = decks[i].deck_id;
            db.selected = (decks[i].deck_id == deck_id);
            array_push(deck_buttons, db);
        }
        btn_back = ui_button(80, 40, 100, 36, "BACK", pal_card(), pal_green());
        btn_start = ui_button(640, 640, 300, 60, "PLAY BALL!", pal_green_dk(), pal_gold());
    }
}

team_select_rebuild();

/// @desc Night-game ballpark palette.

function pal_sky() { return make_color_rgb(8, 14, 28); }
function pal_sky2() { return make_color_rgb(18, 32, 58); }
function pal_bg() { return make_color_rgb(12, 42, 22); }
function pal_grass() { return make_color_rgb(34, 92, 42); }
function pal_grass2() { return make_color_rgb(28, 78, 36); }
function pal_dirt() { return make_color_rgb(166, 112, 58); }
function pal_dirt2() { return make_color_rgb(138, 88, 42); }
function pal_wood() { return make_color_rgb(42, 28, 18); }
function pal_board() { return make_color_rgb(12, 14, 18); }
function pal_bg_navy() { return make_color_rgb(12, 22, 38); }
function pal_bg_shop() { return make_color_rgb(18, 16, 28); }
function pal_bg_pitch() { return make_color_rgb(28, 16, 18); }
function pal_panel() { return make_color_rgb(16, 28, 22); }
function pal_panel_navy() { return make_color_rgb(20, 28, 44); }
function pal_gold() { return make_color_rgb(242, 196, 72); }
function pal_gold_dk() { return make_color_rgb(176, 128, 32); }
function pal_cream() { return make_color_rgb(248, 236, 210); }
function pal_green() { return make_color_rgb(72, 168, 82); }
function pal_green_dk() { return make_color_rgb(32, 96, 48); }
function pal_red() { return make_color_rgb(214, 64, 58); }
function pal_muted() { return make_color_rgb(168, 196, 164); }
function pal_gray() { return make_color_rgb(148, 148, 148); }
function pal_dim() { return make_color_rgb(72, 72, 80); }
function pal_card() { return make_color_rgb(28, 48, 36); }
function pal_stroke() { return make_color_rgb(196, 160, 64); }
function pal_amber() { return make_color_rgb(255, 186, 72); }
function pal_violet() { return make_color_rgb(186, 142, 214); }
function pal_orange() { return make_color_rgb(255, 138, 101); }

function pal_preview_chance(_pct) {
    if (_pct >= 100) {
        return pal_orange();
    }
    if (_pct >= 70) {
        return pal_green();
    }
    if (_pct >= 40) {
        return pal_gold();
    }
    if (_pct >= 20) {
        return pal_orange();
    }
    return pal_red();
}

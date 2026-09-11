/// @desc Windows pixel-art display. Internal res stays 1280x720; the window
/// scales in whole pixels. F11 fullscreen, F10 cycles 1x/2x/3x windowed.

function gfx_init() {
    global.game_w = 1280;
    global.game_h = 720;
    global.gfx_scale = 1;

    gpu_set_texfilter(false);
    gpu_set_texrepeat(false);
    display_reset(0, true);

    surface_resize(application_surface, global.game_w, global.game_h);
    display_set_gui_size(global.game_w, global.game_h);

    window_set_caption("Aces Loaded!");
    global.gfx_scale = gfx_max_window_scale();
    gfx_apply_window();
}

function gfx_max_window_scale() {
    var _dw = display_get_width();
    var _dh = display_get_height();
    var _sx = floor(_dw / global.game_w);
    var _sy = floor((_dh - 88) / global.game_h);
    return max(1, min(_sx, _sy));
}

function gfx_apply_window() {
    if (window_get_fullscreen()) {
        return;
    }
    var _max = gfx_max_window_scale();
    global.gfx_scale = clamp(global.gfx_scale, 1, _max);
    window_set_size(global.game_w * global.gfx_scale, global.game_h * global.gfx_scale);
    window_center();
}

function gfx_cycle_scale() {
    if (window_get_fullscreen()) {
        window_set_fullscreen(false);
    }
    var _max = gfx_max_window_scale();
    global.gfx_scale += 1;
    if (global.gfx_scale > _max) {
        global.gfx_scale = 1;
    }
    gfx_apply_window();
}

function gfx_toggle_fullscreen() {
    var _full = !window_get_fullscreen();
    window_set_fullscreen(_full);
    if (!_full) {
        gfx_apply_window();
    }
}

function gfx_update() {
    gpu_set_texfilter(false);
    if (keyboard_check_pressed(vk_f11)) {
        gfx_toggle_fullscreen();
    }
    if (keyboard_check_pressed(vk_f10)) {
        gfx_cycle_scale();
    }
}

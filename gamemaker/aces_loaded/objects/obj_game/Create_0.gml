if (instance_number(obj_game) > 1) {
    instance_destroy();
    exit;
}

persistent = true;
randomize();
gfx_init();
session_init();
sfx_init();
ui_fonts_init();

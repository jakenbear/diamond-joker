if (instance_number(obj_game) > 1) {
    instance_destroy();
    exit;
}

persistent = true;
randomize();
window_set_size(1280, 720);
window_center();
window_set_caption("Aces Loaded!");
surface_resize(application_surface, 1280, 720);
display_set_gui_size(1280, 720);
session_init();

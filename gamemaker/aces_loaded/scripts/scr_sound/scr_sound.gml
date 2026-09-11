/// @desc Procedural beeps matching Phaser SoundManager.js. No audio files.

function sfx_init() {
    global.sfx_rate = 22050;
}

function sfx_later(_sec, _fn) {
    call_later(_sec, time_source_units_seconds, _fn);
}

function sfx_osc(_type, _phase) {
    var _p = _phase - floor(_phase);
    if (_type == "square") {
        return (_p < 0.5) ? 1 : -1;
    }
    if (_type == "sawtooth") {
        return (2 * _p) - 1;
    }
    if (_type == "triangle") {
        return 1 - (4 * abs(_p - 0.5));
    }
    return sin(_p * 2 * pi);
}

function sfx_tone(_freq, _dur, _type = "square", _vol = 0.08) {
    var _rate = global.sfx_rate;
    var _n = max(8, ceil(_rate * _dur));
    var _bytes = _n * 2;
    var _buf = buffer_create(_bytes, buffer_fixed, 2);
    var _k = ln(max(_vol, 0.001) / 0.001) / max(_dur, 0.001);
    for (var i = 0; i < _n; i++) {
        var _t = i / _rate;
        var _env = _vol * exp(-_k * _t);
        var _sample = sfx_osc(_type, _freq * _t) * _env;
        buffer_write(_buf, buffer_s16, clamp(round(_sample * 32767), -32767, 32767));
    }
    var _snd = audio_create_buffer_sound(_buf, buffer_s16, _rate, 0, _bytes, audio_mono);
    var _inst = audio_play_sound(_snd, 1, false);
    sfx_later(_dur + 0.08, method({ snd: _snd, inst: _inst, buf: _buf }, function() {
        audio_stop_sound(inst);
        audio_free_buffer_sound(snd);
        if (buffer_exists(buf)) {
            buffer_delete(buf);
        }
    }));
}

function sfx_noise(_dur, _vol = 0.04) {
    var _rate = global.sfx_rate;
    var _n = max(8, ceil(_rate * _dur));
    var _bytes = _n * 2;
    var _buf = buffer_create(_bytes, buffer_fixed, 2);
    var _k = ln(max(_vol, 0.001) / 0.001) / max(_dur, 0.001);
    for (var i = 0; i < _n; i++) {
        var _t = i / _rate;
        var _env = _vol * exp(-_k * _t);
        var _sample = ((random(1) * 2) - 1) * _env;
        buffer_write(_buf, buffer_s16, clamp(round(_sample * 32767), -32767, 32767));
    }
    var _snd = audio_create_buffer_sound(_buf, buffer_s16, _rate, 0, _bytes, audio_mono);
    var _inst = audio_play_sound(_snd, 1, false);
    sfx_later(_dur + 0.08, method({ snd: _snd, inst: _inst, buf: _buf }, function() {
        audio_stop_sound(inst);
        audio_free_buffer_sound(snd);
        if (buffer_exists(buf)) {
            buffer_delete(buf);
        }
    }));
}

function sfx_card_select() { sfx_tone(800, 0.06, "square", 0.06); }
function sfx_card_deselect() { sfx_tone(500, 0.05, "square", 0.04); }
function sfx_card_hover() { sfx_tone(720, 0.02, "sine", 0.02); }
function sfx_ui_tap() { sfx_tone(660, 0.03, "sine", 0.03); }
function sfx_discard() { sfx_tone(300, 0.1, "triangle", 0.05); }
function sfx_strike() { sfx_tone(920, 0.05, "square", 0.055); }
function sfx_spin_tick(_freq) { sfx_tone(_freq, 0.04, "square", 0.06); }

function sfx_play_hand() {
    sfx_tone(400, 0.15, "sine", 0.06);
    sfx_later(0.05, function() { sfx_tone(600, 0.1, "sine", 0.05); });
}

function sfx_hit() {
    sfx_tone(440, 0.15, "sine", 0.07);
    sfx_later(0.08, function() { sfx_tone(660, 0.15, "sine", 0.06); });
}

function sfx_out() {
    sfx_tone(400, 0.2, "triangle", 0.06);
    sfx_later(0.1, function() { sfx_tone(250, 0.25, "triangle", 0.05); });
}

function sfx_home_run() {
    var _notes = [523, 659, 784, 1047];
    for (var i = 0; i < 4; i++) {
        sfx_later(i * 0.08, method({ freq: _notes[i] }, function() {
            sfx_tone(freq, 0.2, "square", 0.07);
        }));
    }
    sfx_later(0.32, function() { sfx_tone(1047, 0.4, "sine", 0.08); });
}

function sfx_extra_base_hit() {
    sfx_tone(523, 0.12, "sine", 0.06);
    sfx_later(0.07, function() { sfx_tone(784, 0.15, "sine", 0.07); });
}

function sfx_strikeout() {
    sfx_tone(200, 0.15, "sawtooth", 0.05);
    sfx_later(0.08, function() { sfx_tone(150, 0.2, "sawtooth", 0.04); });
}

function sfx_run_scored() {
    sfx_tone(880, 0.12, "sine", 0.06);
    sfx_later(0.1, function() { sfx_tone(1100, 0.15, "sine", 0.07); });
}

function sfx_pitch_select() {
    sfx_tone(600, 0.08, "square", 0.05);
    sfx_later(0.04, function() { sfx_tone(800, 0.06, "square", 0.04); });
}

function sfx_walk() {
    sfx_tone(440, 0.15, "sine", 0.05);
    sfx_later(0.12, function() { sfx_tone(550, 0.15, "sine", 0.05); });
    sfx_later(0.24, function() { sfx_tone(440, 0.2, "sine", 0.04); });
}

function sfx_hbp() {
    sfx_tone(140, 0.12, "triangle", 0.06);
    sfx_noise(0.06, 0.03);
}

function sfx_ball() {
    sfx_tone(360, 0.06, "sine", 0.045);
    sfx_later(0.055, function() { sfx_tone(460, 0.06, "sine", 0.04); });
}

function sfx_foul() {
    sfx_tone(500, 0.07, "triangle", 0.045);
    sfx_noise(0.05, 0.025);
}

function sfx_spin_success() {
    sfx_tone(880, 0.12, "sine", 0.08);
    sfx_later(0.1, function() { sfx_tone(1320, 0.2, "sine", 0.09); });
}

function sfx_spin_fail() {
    sfx_tone(300, 0.15, "sawtooth", 0.06);
    sfx_later(0.12, function() { sfx_tone(200, 0.25, "sawtooth", 0.05); });
}

function sfx_play_result(_outcome, _runs) {
    if (_outcome == "HBP") {
        sfx_hbp();
    } else if (_outcome == "Walk") {
        sfx_walk();
    } else if (_outcome == "Home Run") {
        sfx_home_run();
    } else if (bonus_is_xbh(_outcome)) {
        sfx_extra_base_hit();
    } else if (_outcome == "Strikeout") {
        sfx_strikeout();
    } else if (bonus_is_out(_outcome) || _outcome == "Sac Bunt") {
        sfx_out();
    } else {
        sfx_hit();
    }
    if (_runs > 0) {
        sfx_later(0.25, function() { sfx_run_scored(); });
    }
}

/// @desc Batting balance knobs. Mirrors data/balance.js.

function data_balance() {
    static _b = undefined;
    if (_b != undefined) {
        return _b;
    }
    _b = {
        pair_out_base: 0.95,
        pair_out_rank_scale: 0.03,
        two_strike_penalty: 0.10,
        two_pair_out_base: 0.65,
        trips_out_base: 0.45,
        straight_out_base: 0.20,
        flush_out_base: 0.20,
        full_house_out_base: 0.15,
        out_min: 0.05,
        out_max: 0.95,
        pair_degradation: 0.10,
        two_pair_degradation: 0.12,
        trips_degradation: 0.15,
        straight_degradation: 0.20,
        flush_degradation: 0.20,
        discard_bonus_0: 0.10,
        discard_penalty_2: 0.05,
        discard_penalty_3_plus: 0.03,
    };
    return _b;
}

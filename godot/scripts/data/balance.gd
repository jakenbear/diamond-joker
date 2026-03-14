class_name Balance
extends RefCounted

## Central tuning parameters for batting balance.
## Used by CardEngine, CountManager, and tuning tools.

# Strike / Discard Risk
const BASE_STRIKE_CHANCE := 0.55
const STRIKE_VELOCITY_SCALE := 0.02
const STRIKE_CONTROL_SCALE := 0.02
const STRIKE_CONTACT_SCALE := 0.03
const STRIKE_MIN := 0.25
const STRIKE_MAX := 0.75

# Out Chances (base, before degradation)
const PAIR_OUT_BASE := 0.95
const PAIR_OUT_RANK_SCALE := 0.03
const TWO_STRIKE_PENALTY := 0.10
const TWO_PAIR_OUT_BASE := 0.65
const TRIPS_OUT_BASE := 0.45
const STRAIGHT_OUT_BASE := 0.20
const FLUSH_OUT_BASE := 0.20
const FULL_HOUSE_OUT_BASE := 0.15
const OUT_MIN := 0.05
const OUT_MAX := 0.95

# Pitcher Reads (degradation per repeat)
const PAIR_DEGRADATION := 0.25
const TWO_PAIR_DEGRADATION := 0.12
const TRIPS_DEGRADATION := 0.15
const STRAIGHT_DEGRADATION := 0.20
const FLUSH_DEGRADATION := 0.20

# Contact Rescue
const CONTACT_RESCUE_SCALE := 0.04

# Foul at 2 Strikes
const FOUL_CONTACT_SCALE := 0.04

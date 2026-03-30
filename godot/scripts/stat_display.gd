class_name StatDisplay

## Deterministic hash of player name → float in [0, 1)
## Must match JS: ((hash << 5) - hash + charCode) | 0, then & 0x7fffffff
static func _name_hash(player_name: String, salt: String) -> float:
	var hash_val := 0
	var full := player_name + salt
	for i in range(full.length()):
		# JS uses |0 (signed 32-bit truncation) inside the loop
		hash_val = ((hash_val << 5) - hash_val + full.unicode_at(i))
		# Truncate to signed 32-bit like JS |0
		hash_val = hash_val & 0xFFFFFFFF
		if hash_val >= 0x80000000:
			hash_val -= 0x100000000
	return ((hash_val & 0x7FFFFFFF) % 10000) / 10000.0

## Internal contact (1-10) → batting average (~.135–.415)
static func to_avg(contact: int, player_name: String) -> float:
	var base := 0.150 + (contact - 1) * 0.028
	var jitter := (_name_hash(player_name, "avg") - 0.5) * 0.030
	return clampf(base + jitter, 0.100, 0.450)

## Internal power (1-10) → home runs (~0–63)
static func to_hr(power: int, player_name: String) -> int:
	var base := (power - 1) * 6.7
	var jitter := (_name_hash(player_name, "hr") - 0.5) * 6.0
	return maxi(0, roundi(base + jitter))

## Internal speed (1-10) → stolen bases (~0–84)
static func to_sb(speed: int, player_name: String) -> int:
	var base := (speed - 1) * 8.9
	var jitter := (_name_hash(player_name, "sb") - 0.5) * 8.0
	return maxi(0, roundi(base + jitter))

## Formatted AVG string: ".273"
static func fmt_avg(contact: int, player_name: String) -> String:
	return ("%.3f" % to_avg(contact, player_name)).substr(1)

## Formatted HR string: "27"
static func fmt_hr(power: int, player_name: String) -> String:
	return str(to_hr(power, player_name))

## Formatted SB string: "36"
static func fmt_sb(speed: int, player_name: String) -> String:
	return str(to_sb(speed, player_name))

## Full stat line: "AVG:.273 HR:27 SB:36"
static func stat_line(player: Dictionary) -> String:
	var n: String = player.get("name", "")
	return "AVG:%s HR:%s SB:%s" % [fmt_avg(player["contact"], n), fmt_hr(player["power"], n), fmt_sb(player["speed"], n)]

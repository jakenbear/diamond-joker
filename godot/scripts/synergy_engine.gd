class_name SynergyEngine
extends RefCounted

# Calculates active synergies from roster composition.
# Pure logic, no scene dependency.


static func calculate(roster: Array) -> Array[Dictionary]:
	var active: Array[Dictionary] = []
	for s in Synergies.DATA:
		if Synergies.check_synergy(s, roster):
			active.append({
				"id": s["id"],
				"name": s["name"],
				"description": s["description"],
				"bonus": s["bonus"],
				"bonus_description": s["bonus_description"],
			})
	return active


static func get_all() -> Array[Dictionary]:
	return Synergies.DATA

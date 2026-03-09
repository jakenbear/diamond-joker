extends Node

# GameManager — Autoload singleton that persists between scenes.
# Holds all game state and handles scene transitions.

# Color palette used across all scenes
const COLORS = {
	"bg":           Color("#1b2838"),
	"panel":        Color("#2a3f5f"),
	"panel_light":  Color("#3a5578"),
	"card":         Color("#f5f5dc"),
	"card_selected":Color("#ffd700"),
	"button":       Color("#4a90d9"),
	"button_hover": Color("#66c0f4"),
	"text":         Color("#c7d5e0"),
	"text_bright":  Color("#ffffff"),
	"accent":       Color("#ffd700"),
	"out":          Color("#ff4444"),
	"run":          Color("#44ff44"),
	"base_empty":   Color("#555555"),
	"base_on":      Color("#ffd700"),
	"suit_red":     Color("#e53935"),
	"suit_black":   Color("#1a1a2e"),
}

# Game instances — created when a game starts
var baseball: BaseballState = null
var card_engine: CardEngine = null
var roster: RosterManager = null
var trait_manager: TraitManager = null

# Team selections
var player_team: Dictionary = {}
var opponent_team: Dictionary = {}
var player_team_index: int = -1


func start_game(team_index: int) -> void:
	player_team_index = team_index
	player_team = Teams.TEAMS[team_index]

	# Pick a random opponent (not the same team)
	var opp_idx: int = team_index
	while opp_idx == team_index:
		opp_idx = randi_range(0, Teams.TEAMS.size() - 1)
	opponent_team = Teams.TEAMS[opp_idx]

	# Create game instances
	baseball = BaseballState.new()
	card_engine = CardEngine.new("standard")
	roster = RosterManager.new(player_team, 0, opponent_team)
	trait_manager = TraitManager.new()

	# Assign pitch repertoire to your pitcher
	RosterManager.assign_pitch_repertoire(roster.get_my_pitcher())

	# Pick pitcher traits for opponent
	var pitcher_traits: Array = TraitManager.pick_pitcher_traits()
	roster.set_pitcher_traits(pitcher_traits)

	go_to_scene("game")


func go_to_scene(scene_name: String) -> void:
	var path: String = "res://scenes/%s_scene.tscn" % scene_name
	get_tree().change_scene_to_file(path)


func get_game_state() -> Dictionary:
	if not baseball:
		return {}
	var status: Dictionary = baseball.get_status()
	# Add roster info for trait conditions
	status["bases"] = status["bases"]
	return status

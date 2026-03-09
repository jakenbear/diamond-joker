extends Control

# TitleScene — Team selection and game start.
#
# HOW TO EDIT THE LAYOUT:
#   1. Open title_scene.tscn in Godot's editor
#   2. Click any node in the Scene tree (left panel)
#   3. Drag it on the 2D canvas, or edit properties in the Inspector (right panel)
#   4. The script below just handles button logic — layout is all in the .tscn

# References to nodes defined in the .tscn file
# The %Name syntax finds nodes marked "unique_name_in_owner = true"
@onready var team_grid: HBoxContainer = %TeamGrid
@onready var team_info: Label = %TeamInfo
@onready var start_button: Button = %StartButton

var selected_team_index: int = -1
var team_buttons: Array[Button] = []


func _ready() -> void:
	start_button.pressed.connect(_on_start_pressed)

	# Dynamically create team buttons from data
	for i in Teams.TEAMS.size():
		var team: Dictionary = Teams.TEAMS[i]
		var btn := Button.new()
		btn.custom_minimum_size = Vector2(230, 220)
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		btn.text = "%s\n%s %s\n\n%s" % [
			team.get("logo", "?"),
			team.get("city", ""),
			team.get("nickname", ""),
			team.get("style", ""),
		]
		btn.add_theme_font_size_override("font_size", 18)
		btn.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
		btn.pressed.connect(_on_team_selected.bind(i))
		team_grid.add_child(btn)
		team_buttons.append(btn)


func _on_team_selected(index: int) -> void:
	selected_team_index = index
	start_button.disabled = false

	# Highlight selected, dim others
	for i in team_buttons.size():
		team_buttons[i].modulate = Color.WHITE if i == index else Color(0.5, 0.5, 0.5, 0.8)

	# Show team info
	var team: Dictionary = Teams.TEAMS[index]
	var pitcher: Dictionary = team.get("pitchers", [{}])[0]
	var lineup_str := ""
	for b in team.get("batters", []):
		lineup_str += "%s (%s) " % [b.get("name", "?"), b.get("pos", "?")]
	team_info.text = "Ace: %s (Vel %d / Ctrl %d)\nLineup: %s" % [
		pitcher.get("name", "?"),
		pitcher.get("velocity", 0),
		pitcher.get("control", 0),
		lineup_str,
	]


func _on_start_pressed() -> void:
	if selected_team_index >= 0:
		GameManager.start_game(selected_team_index)

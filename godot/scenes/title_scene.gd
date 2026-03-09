extends Control

# TitleScene — Team selection and game start.

var selected_team_index: int = -1
var team_buttons: Array[Button] = []
var start_button: Button = null
var team_info_label: Label = null


func _ready() -> void:
	# Background
	var bg := ColorRect.new()
	bg.color = GameManager.COLORS["bg"]
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	# Title
	var title := Label.new()
	title.text = "ACES LOADED!"
	title.add_theme_font_size_override("font_size", 64)
	title.add_theme_color_override("font_color", GameManager.COLORS["accent"])
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.set_anchors_preset(Control.PRESET_CENTER_TOP)
	title.position = Vector2(640, 40)
	title.set_anchor(SIDE_LEFT, 0.5)
	title.set_anchor(SIDE_RIGHT, 0.5)
	title.grow_horizontal = Control.GROW_DIRECTION_BOTH
	title.custom_minimum_size = Vector2(600, 80)
	add_child(title)

	# Subtitle
	var subtitle := Label.new()
	subtitle.text = "A Balatro-Style Baseball Card Game"
	subtitle.add_theme_font_size_override("font_size", 20)
	subtitle.add_theme_color_override("font_color", GameManager.COLORS["text"])
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.position = Vector2(340, 115)
	subtitle.custom_minimum_size = Vector2(600, 30)
	add_child(subtitle)

	# "Select Your Team" label
	var select_label := Label.new()
	select_label.text = "SELECT YOUR TEAM"
	select_label.add_theme_font_size_override("font_size", 28)
	select_label.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
	select_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	select_label.position = Vector2(340, 180)
	select_label.custom_minimum_size = Vector2(600, 40)
	add_child(select_label)

	# Team selection grid — 4 buttons in a row
	var grid := HBoxContainer.new()
	grid.position = Vector2(140, 240)
	grid.custom_minimum_size = Vector2(1000, 220)
	grid.add_theme_constant_override("separation", 20)
	add_child(grid)

	for i in Teams.TEAMS.size():
		var team: Dictionary = Teams.TEAMS[i]
		var btn := _create_team_button(team, i)
		grid.add_child(btn)
		team_buttons.append(btn)

	# Team info panel (shows after selection)
	team_info_label = Label.new()
	team_info_label.add_theme_font_size_override("font_size", 18)
	team_info_label.add_theme_color_override("font_color", GameManager.COLORS["text"])
	team_info_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	team_info_label.position = Vector2(240, 480)
	team_info_label.custom_minimum_size = Vector2(800, 80)
	team_info_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(team_info_label)

	# Start button
	start_button = Button.new()
	start_button.text = "  PLAY BALL!  "
	start_button.add_theme_font_size_override("font_size", 32)
	start_button.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
	start_button.position = Vector2(490, 590)
	start_button.custom_minimum_size = Vector2(300, 60)
	start_button.disabled = true
	start_button.pressed.connect(_on_start_pressed)
	add_child(start_button)

	# Footer
	var footer := Label.new()
	footer.text = "Play poker hands to get on base. Outscore the opponent in 9 innings."
	footer.add_theme_font_size_override("font_size", 14)
	footer.add_theme_color_override("font_color", Color(GameManager.COLORS["text"], 0.6))
	footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	footer.position = Vector2(290, 675)
	footer.custom_minimum_size = Vector2(700, 20)
	add_child(footer)


func _create_team_button(team: Dictionary, index: int) -> Button:
	var btn := Button.new()
	btn.custom_minimum_size = Vector2(230, 220)
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	# Button text: logo + name + style
	var text := "%s\n%s %s\n\n%s" % [
		team.get("logo", "?"),
		team.get("city", ""),
		team.get("nickname", ""),
		team.get("style", ""),
	]
	btn.text = text
	btn.add_theme_font_size_override("font_size", 18)
	btn.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])

	btn.pressed.connect(_on_team_selected.bind(index))
	return btn


func _on_team_selected(index: int) -> void:
	selected_team_index = index
	start_button.disabled = false

	# Highlight selected, dim others
	for i in team_buttons.size():
		if i == index:
			team_buttons[i].modulate = Color.WHITE
		else:
			team_buttons[i].modulate = Color(0.5, 0.5, 0.5, 0.8)

	# Show team info
	var team: Dictionary = Teams.TEAMS[index]
	var batters: Array = team.get("batters", [])
	var pitcher: Dictionary = team.get("pitchers", [{}])[0]
	var lineup_str := ""
	for b in batters:
		lineup_str += "%s (%s) " % [b.get("name", "?"), b.get("pos", "?")]
	team_info_label.text = "Ace: %s (Vel %d / Ctrl %d)\nLineup: %s" % [
		pitcher.get("name", "?"),
		pitcher.get("velocity", 0),
		pitcher.get("control", 0),
		lineup_str,
	]


func _on_start_pressed() -> void:
	if selected_team_index >= 0:
		GameManager.start_game(selected_team_index)

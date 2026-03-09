extends Control

# GameOverScene — Final score, box score, play again.


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = GameManager.COLORS["bg"]
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var result: Dictionary = GameManager.baseball.get_result()
	var won: bool = result.get("won", false)

	# Result banner
	var banner := ColorRect.new()
	banner.color = GameManager.COLORS["run"] if won else GameManager.COLORS["out"]
	banner.position = Vector2(0, 0)
	banner.size = Vector2(1280, 80)
	add_child(banner)

	var result_text := Label.new()
	result_text.text = "YOU WIN!" if won else "GAME OVER"
	result_text.add_theme_font_size_override("font_size", 48)
	result_text.add_theme_color_override("font_color", GameManager.COLORS["bg"])
	result_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_text.position = Vector2(290, 12)
	result_text.custom_minimum_size = Vector2(700, 60)
	add_child(result_text)

	# Final score
	var p_name: String = GameManager.player_team.get("nickname", "You")
	var o_name: String = GameManager.opponent_team.get("nickname", "Opponent")
	var score_text := Label.new()
	score_text.text = "%s  %d  -  %d  %s" % [
		p_name, result.get("player_score", 0),
		result.get("opponent_score", 0), o_name,
	]
	score_text.add_theme_font_size_override("font_size", 36)
	score_text.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
	score_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	score_text.position = Vector2(240, 110)
	score_text.custom_minimum_size = Vector2(800, 50)
	add_child(score_text)

	# Box score
	_build_box_score(result)

	# Stats
	var chips_text := Label.new()
	chips_text.text = "Total Chips Earned: %d" % result.get("total_chips", 0)
	chips_text.add_theme_font_size_override("font_size", 20)
	chips_text.add_theme_color_override("font_color", GameManager.COLORS["accent"])
	chips_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	chips_text.position = Vector2(340, 480)
	chips_text.custom_minimum_size = Vector2(600, 30)
	add_child(chips_text)

	var innings_text := Label.new()
	innings_text.text = "%d Innings Played" % result.get("innings", 9)
	innings_text.add_theme_font_size_override("font_size", 18)
	innings_text.add_theme_color_override("font_color", GameManager.COLORS["text"])
	innings_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	innings_text.position = Vector2(340, 515)
	innings_text.custom_minimum_size = Vector2(600, 25)
	add_child(innings_text)

	# Play again button
	var play_again := Button.new()
	play_again.text = "  PLAY AGAIN  "
	play_again.add_theme_font_size_override("font_size", 28)
	play_again.position = Vector2(480, 580)
	play_again.custom_minimum_size = Vector2(320, 60)
	play_again.pressed.connect(_on_play_again)
	add_child(play_again)

	# Footer
	var footer := Label.new()
	footer.text = "Aces Loaded!"
	footer.add_theme_font_size_override("font_size", 14)
	footer.add_theme_color_override("font_color", Color(GameManager.COLORS["text"], 0.4))
	footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	footer.position = Vector2(490, 670)
	footer.custom_minimum_size = Vector2(300, 20)
	add_child(footer)


func _build_box_score(result: Dictionary) -> void:
	var player_runs: Array = result.get("player_runs_by_inning", [])
	var opp_runs: Array = result.get("opponent_runs_by_inning", [])
	var innings: int = maxi(player_runs.size(), opp_runs.size())
	if innings == 0:
		return

	var p_name: String = GameManager.player_team.get("nickname", "You")
	var o_name: String = GameManager.opponent_team.get("nickname", "Opp")

	# Box score panel
	var box_panel := ColorRect.new()
	box_panel.color = GameManager.COLORS["panel"]
	box_panel.position = Vector2(100, 180)
	box_panel.size = Vector2(1080, 280)
	add_child(box_panel)

	var box_title := Label.new()
	box_title.text = "BOX SCORE"
	box_title.add_theme_font_size_override("font_size", 20)
	box_title.add_theme_color_override("font_color", GameManager.COLORS["accent"])
	box_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box_title.position = Vector2(100, 185)
	box_title.custom_minimum_size = Vector2(1080, 30)
	add_child(box_title)

	# Column width
	var col_w: int = 70
	var name_w: int = 120
	var start_x: int = 120
	var start_y: int = 225

	# Header row: INN | 1 | 2 | 3 | ... | R
	var header := ""
	header += "         "
	for i in range(1, innings + 1):
		header += "  %d  " % i
	header += "   R"

	var header_label := Label.new()
	header_label.text = header
	header_label.add_theme_font_size_override("font_size", 18)
	header_label.add_theme_color_override("font_color", GameManager.COLORS["text"])
	header_label.position = Vector2(start_x, start_y)
	header_label.custom_minimum_size = Vector2(1000, 25)
	add_child(header_label)

	# Player row
	var p_row := "%-8s " % p_name.left(8)
	for i in innings:
		var r: int = player_runs[i] if i < player_runs.size() else 0
		p_row += "  %d  " % r
	p_row += "  %d" % result.get("player_score", 0)

	var p_label := Label.new()
	p_label.text = p_row
	p_label.add_theme_font_size_override("font_size", 18)
	p_label.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
	p_label.position = Vector2(start_x, start_y + 35)
	p_label.custom_minimum_size = Vector2(1000, 25)
	add_child(p_label)

	# Opponent row
	var o_row := "%-8s " % o_name.left(8)
	for i in innings:
		var r: int = opp_runs[i] if i < opp_runs.size() else 0
		o_row += "  %d  " % r
	o_row += "  %d" % result.get("opponent_score", 0)

	var o_label := Label.new()
	o_label.text = o_row
	o_label.add_theme_font_size_override("font_size", 18)
	o_label.add_theme_color_override("font_color", GameManager.COLORS["text"])
	o_label.position = Vector2(start_x, start_y + 70)
	o_label.custom_minimum_size = Vector2(1000, 25)
	add_child(o_label)

	# Separator line
	var sep := ColorRect.new()
	sep.color = GameManager.COLORS["text"]
	sep.position = Vector2(start_x, start_y + 30)
	sep.size = Vector2(900, 1)
	add_child(sep)

	var sep2 := ColorRect.new()
	sep2.color = GameManager.COLORS["text"]
	sep2.position = Vector2(start_x, start_y + 65)
	sep2.size = Vector2(900, 1)
	add_child(sep2)


func _on_play_again() -> void:
	GameManager.go_to_scene("title")

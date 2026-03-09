extends Control

# PitchingScene — Opponent's half-inning. You pick pitches.

var pitch_buttons: Array[Button] = []
var log_container: VBoxContainer = null
var score_label: Label = null
var inning_label: Label = null
var outs_label: Label = null
var batter_label: Label = null
var pitcher_label: Label = null
var stamina_label: Label = null
var base_indicators: Array[ColorRect] = []
var runner_labels: Array[Label] = []

var sim_outs: int = 0
var sim_runs: int = 0
var bases: Array = [null, null, null]
var pitching_done: bool = false


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = GameManager.COLORS["bg"]
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	_build_scoreboard()
	_build_diamond()
	_build_pitch_buttons()
	_build_log()
	_build_info()

	_update_ui()
	_show_current_batter()


# ── Scoreboard ────────────────────────────────────────────

func _build_scoreboard() -> void:
	var bar := ColorRect.new()
	bar.color = GameManager.COLORS["panel"]
	bar.position = Vector2(0, 0)
	bar.size = Vector2(1280, 50)
	add_child(bar)

	score_label = Label.new()
	score_label.add_theme_font_size_override("font_size", 22)
	score_label.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
	score_label.position = Vector2(20, 10)
	score_label.custom_minimum_size = Vector2(400, 30)
	add_child(score_label)

	inning_label = Label.new()
	inning_label.add_theme_font_size_override("font_size", 22)
	inning_label.add_theme_color_override("font_color", GameManager.COLORS["accent"])
	inning_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	inning_label.position = Vector2(490, 10)
	inning_label.custom_minimum_size = Vector2(300, 30)
	add_child(inning_label)

	outs_label = Label.new()
	outs_label.add_theme_font_size_override("font_size", 22)
	outs_label.add_theme_color_override("font_color", GameManager.COLORS["text"])
	outs_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	outs_label.position = Vector2(900, 10)
	outs_label.custom_minimum_size = Vector2(350, 30)
	add_child(outs_label)


# ── Diamond ───────────────────────────────────────────────

func _build_diamond() -> void:
	var diamond_panel := ColorRect.new()
	diamond_panel.color = GameManager.COLORS["panel"].darkened(0.2)
	diamond_panel.position = Vector2(20, 70)
	diamond_panel.size = Vector2(340, 280)
	add_child(diamond_panel)

	var base_positions := [
		Vector2(270, 210),  # 1st
		Vector2(190, 130),  # 2nd
		Vector2(110, 210),  # 3rd
	]

	for i in 3:
		var base := ColorRect.new()
		base.color = GameManager.COLORS["base_empty"]
		var bp: Vector2 = base_positions[i]
		base.position = Vector2(20 + bp.x - 12, 70 + bp.y - 12)
		base.size = Vector2(24, 24)
		base.rotation = deg_to_rad(45)
		add_child(base)
		base_indicators.append(base)

		var lbl := Label.new()
		lbl.add_theme_font_size_override("font_size", 10)
		lbl.add_theme_color_override("font_color", GameManager.COLORS["accent"])
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.position = Vector2(20 + bp.x - 40, 70 + bp.y - 30)
		lbl.custom_minimum_size = Vector2(80, 14)
		add_child(lbl)
		runner_labels.append(lbl)

	# Home plate
	var home := ColorRect.new()
	home.color = Color.WHITE
	home.position = Vector2(20 + 190 - 8, 70 + 280 - 8)
	home.size = Vector2(16, 16)
	add_child(home)


# ── Pitch buttons ─────────────────────────────────────────

func _build_pitch_buttons() -> void:
	var panel := ColorRect.new()
	panel.color = GameManager.COLORS["panel"].darkened(0.1)
	panel.position = Vector2(20, 370)
	panel.size = Vector2(340, 310)
	add_child(panel)

	var title := Label.new()
	title.text = "SELECT YOUR PITCH"
	title.add_theme_font_size_override("font_size", 18)
	title.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.position = Vector2(20, 375)
	title.custom_minimum_size = Vector2(340, 25)
	add_child(title)

	var btn_container := VBoxContainer.new()
	btn_container.position = Vector2(35, 405)
	btn_container.custom_minimum_size = Vector2(310, 260)
	btn_container.add_theme_constant_override("separation", 8)
	add_child(btn_container)

	# Get pitcher's repertoire
	var my_pitcher: Dictionary = GameManager.roster.get_my_pitcher()
	var pitches: Array = my_pitcher.get("pitches", ["fastball", "slider", "changeup", "breaking"])

	for pitch_key in pitches:
		var pitch_data: Dictionary = PitchTypes.TYPES.get(pitch_key, {})
		var btn := Button.new()
		btn.text = "%s - %s" % [pitch_data.get("name", pitch_key), pitch_data.get("description", "")]
		btn.add_theme_font_size_override("font_size", 14)
		btn.custom_minimum_size = Vector2(300, 50)
		btn.pressed.connect(_on_pitch_selected.bind(pitch_key))
		btn_container.add_child(btn)
		pitch_buttons.append(btn)

	# IBB button
	var ibb_btn := Button.new()
	ibb_btn.text = "Intentional Walk - Put batter on 1st"
	ibb_btn.add_theme_font_size_override("font_size", 14)
	ibb_btn.custom_minimum_size = Vector2(300, 40)
	ibb_btn.pressed.connect(_on_pitch_selected.bind("ibb"))
	btn_container.add_child(ibb_btn)
	pitch_buttons.append(ibb_btn)


# ── At-bat log ────────────────────────────────────────────

func _build_log() -> void:
	var log_panel := ColorRect.new()
	log_panel.color = GameManager.COLORS["panel"].darkened(0.2)
	log_panel.position = Vector2(390, 70)
	log_panel.size = Vector2(870, 610)
	add_child(log_panel)

	var log_title := Label.new()
	log_title.text = "AT-BAT LOG"
	log_title.add_theme_font_size_override("font_size", 18)
	log_title.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
	log_title.position = Vector2(400, 75)
	log_title.custom_minimum_size = Vector2(850, 25)
	add_child(log_title)

	# Scrollable log
	var scroll := ScrollContainer.new()
	scroll.position = Vector2(400, 105)
	scroll.size = Vector2(850, 560)
	add_child(scroll)

	log_container = VBoxContainer.new()
	log_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	log_container.add_theme_constant_override("separation", 4)
	scroll.add_child(log_container)


# ── Info panels ───────────────────────────────────────────

func _build_info() -> void:
	batter_label = Label.new()
	batter_label.add_theme_font_size_override("font_size", 14)
	batter_label.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
	batter_label.position = Vector2(390, 640)
	batter_label.custom_minimum_size = Vector2(400, 20)
	add_child(batter_label)

	pitcher_label = Label.new()
	pitcher_label.add_theme_font_size_override("font_size", 14)
	pitcher_label.add_theme_color_override("font_color", GameManager.COLORS["text"])
	pitcher_label.position = Vector2(390, 660)
	pitcher_label.custom_minimum_size = Vector2(400, 20)
	add_child(pitcher_label)

	stamina_label = Label.new()
	stamina_label.add_theme_font_size_override("font_size", 14)
	stamina_label.add_theme_color_override("font_color", GameManager.COLORS["accent"])
	stamina_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	stamina_label.position = Vector2(850, 640)
	stamina_label.custom_minimum_size = Vector2(400, 20)
	add_child(stamina_label)


# ── Game logic ────────────────────────────────────────────

func _show_current_batter() -> void:
	var opp_roster: Array = GameManager.opponent_team.get("batters", [])
	var idx: int = GameManager.roster.opponent_batter_index
	if idx < opp_roster.size():
		var b: Dictionary = opp_roster[idx]
		batter_label.text = "At bat: %s (%s)  Pow:%d Con:%d Spd:%d" % [
			b.get("name", "?"), b.get("pos", "?"),
			b.get("power", 0), b.get("contact", 0), b.get("speed", 0),
		]


func _update_ui() -> void:
	var status: Dictionary = GameManager.baseball.get_status()

	var p_name: String = GameManager.player_team.get("nickname", "You")
	var o_name: String = GameManager.opponent_team.get("nickname", "Opp")
	var live_opp_score: int = status["opponent_score"] + sim_runs
	score_label.text = "%s %d  -  %s %d" % [p_name, status["player_score"], o_name, live_opp_score]
	inning_label.text = "Inning %d  |  Bottom" % status["inning"]
	outs_label.text = "Outs: %d / 3     Runs this inning: %d" % [sim_outs, sim_runs]

	# Pitcher info
	var my_p: Dictionary = GameManager.roster.get_my_pitcher()
	pitcher_label.text = "Pitching: %s  Vel:%d Ctrl:%d" % [
		my_p.get("name", "?"), my_p.get("velocity", 0), my_p.get("control", 0),
	]
	stamina_label.text = "Stamina: %d%%" % roundi(GameManager.roster.get_my_pitcher_stamina() * 100)

	# Bases
	for i in 3:
		if bases[i]:
			base_indicators[i].color = GameManager.COLORS["base_on"]
			if typeof(bases[i]) == TYPE_DICTIONARY:
				runner_labels[i].text = bases[i].get("name", "").split(" ")[-1]
			else:
				runner_labels[i].text = "Runner"
		else:
			base_indicators[i].color = GameManager.COLORS["base_empty"]
			runner_labels[i].text = ""

	# Disable pitch buttons when done
	for btn in pitch_buttons:
		btn.disabled = pitching_done


func _add_log_entry(text: String, is_out: bool, scored: int) -> void:
	var entry := Label.new()
	entry.text = text
	entry.add_theme_font_size_override("font_size", 16)
	if is_out:
		entry.add_theme_color_override("font_color", GameManager.COLORS["out"])
	elif scored > 0:
		entry.add_theme_color_override("font_color", GameManager.COLORS["run"])
	else:
		entry.add_theme_color_override("font_color", GameManager.COLORS["text"])
	entry.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	entry.custom_minimum_size = Vector2(830, 0)
	log_container.add_child(entry)

	# Auto-scroll to bottom
	await get_tree().process_frame
	var scroll: ScrollContainer = log_container.get_parent()
	scroll.scroll_vertical = int(scroll.get_v_scroll_bar().max_value)


func _on_pitch_selected(pitch_key: String) -> void:
	if pitching_done:
		return

	var status: Dictionary = GameManager.baseball.get_status()
	var result: Dictionary = GameManager.roster.sim_single_at_bat(
		status["inning"], pitch_key, bases
	)

	var batter_name: String = result.get("batter", {}).get("name", "Batter")
	var outcome: String = result.get("outcome", "?")
	var scored: int = result.get("scored", 0)
	sim_runs += scored

	if result.get("is_out", false):
		sim_outs += 1
		_add_log_entry("%s: %s  (Out %d)" % [batter_name, outcome, sim_outs], true, 0)
	else:
		var score_text := ""
		if scored > 0:
			score_text = "  [%d run%s!]" % [scored, "s" if scored > 1 else ""]
		_add_log_entry("%s: %s%s" % [batter_name, outcome, score_text], false, scored)

	# Walk-off check (opponent takes lead in bottom of 9th+)
	if status["inning"] >= 9 and status["opponent_score"] + sim_runs > status["player_score"]:
		pitching_done = true
		_add_log_entry("WALK-OFF! Opponent wins!", false, 0)
		_update_ui()
		_show_current_batter()
		await get_tree().create_timer(2.0).timeout
		GameManager.baseball.switch_side(sim_runs)
		GameManager.go_to_scene("game_over")
		return

	if sim_outs >= 3:
		pitching_done = true
		_add_log_entry("--- Side retired! ---", true, 0)
		_update_ui()
		await get_tree().create_timer(1.5).timeout
		_end_half_inning()
		return

	_update_ui()
	_show_current_batter()


func _end_half_inning() -> void:
	GameManager.baseball.switch_side(sim_runs)

	var status: Dictionary = GameManager.baseball.get_status()

	# Game over?
	if status["state"] == BaseballState.State.GAME_OVER:
		GameManager.go_to_scene("game_over")
		return

	# Shop?
	if GameManager.baseball.should_show_shop():
		GameManager.go_to_scene("shop")
	else:
		GameManager.go_to_scene("game")

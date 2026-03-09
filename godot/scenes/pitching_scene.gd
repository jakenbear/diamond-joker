extends Control

# PitchingScene — Opponent's half-inning. You pick pitches.
# Pitches are displayed as cards on the right side (like Phaser).

@onready var score_label: Label = %ScoreLabel
@onready var inning_label: Label = %InningLabel
@onready var outs_label: Label = %OutsLabel
@onready var batter_label: Label = %BatterLabel
@onready var pitcher_label: Label = %PitcherLabel
@onready var stamina_label: Label = %StaminaLabel
@onready var pitch_card_container: HBoxContainer = %PitchCardContainer
@onready var log_container: VBoxContainer = %LogContainer
@onready var log_scroll: ScrollContainer = %LogScroll

var base_indicators: Array[ColorRect] = []
var runner_labels: Array[Label] = []
var pitch_cards: Array[Panel] = []

var sim_outs: int = 0
var sim_runs: int = 0
var bases: Array = [null, null, null]
var pitching_done: bool = false


func _ready() -> void:
	base_indicators = [%Base1st, %Base2nd, %Base3rd]
	runner_labels = [%Runner1st, %Runner2nd, %Runner3rd]

	_build_pitch_cards()
	_update_ui()
	_show_current_batter()


func _build_pitch_cards() -> void:
	var my_pitcher: Dictionary = GameManager.roster.get_my_pitcher()
	var pitches: Array = my_pitcher.get("pitches", ["fastball", "slider", "changeup", "breaking"])

	for pitch_key in pitches:
		var pitch_data: Dictionary = PitchTypes.TYPES.get(pitch_key, {})
		var card := _create_pitch_card(pitch_key, pitch_data)
		pitch_card_container.add_child(card)
		pitch_cards.append(card)

	# IBB card
	var ibb_data := {"name": "IBB", "description": "Intentional Walk\nPut batter on 1st"}
	var ibb_card := _create_pitch_card("ibb", ibb_data)
	pitch_card_container.add_child(ibb_card)
	pitch_cards.append(ibb_card)


func _create_pitch_card(pitch_key: String, pitch_data: Dictionary) -> Panel:
	var card := Panel.new()
	card.custom_minimum_size = Vector2(145, 200)
	card.mouse_filter = Control.MOUSE_FILTER_STOP

	# Card style
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#2a4a6a")
	style.set_corner_radius_all(8)
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = Color("#4a7aaa")
	card.add_theme_stylebox_override("panel", style)

	# Pitch name at top
	var name_label := Label.new()
	name_label.text = pitch_data.get("name", pitch_key).to_upper()
	name_label.add_theme_font_size_override("font_size", 18)
	name_label.add_theme_color_override("font_color", Color("#ffd700"))
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.position = Vector2(5, 15)
	name_label.size = Vector2(135, 25)
	card.add_child(name_label)

	# Description
	var desc_label := Label.new()
	desc_label.text = pitch_data.get("description", "")
	desc_label.add_theme_font_size_override("font_size", 11)
	desc_label.add_theme_color_override("font_color", Color("#c7d5e0"))
	desc_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_label.position = Vector2(5, 50)
	desc_label.size = Vector2(135, 120)
	card.add_child(desc_label)

	# Click handling
	card.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			_on_pitch_selected(pitch_key)
	)

	return card


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

	var my_p: Dictionary = GameManager.roster.get_my_pitcher()
	pitcher_label.text = "Pitching: %s  Vel:%d Ctrl:%d" % [
		my_p.get("name", "?"), my_p.get("velocity", 0), my_p.get("control", 0),
	]
	stamina_label.text = "Stamina: %d%%" % roundi(GameManager.roster.get_my_pitcher_stamina() * 100)

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

	# Disable/dim pitch cards when done
	for card in pitch_cards:
		card.modulate = Color(0.4, 0.4, 0.4) if pitching_done else Color.WHITE
		card.mouse_filter = Control.MOUSE_FILTER_IGNORE if pitching_done else Control.MOUSE_FILTER_STOP


func _add_log_entry(text: String, is_out: bool, scored: int) -> void:
	var entry := Label.new()
	entry.text = text
	entry.add_theme_font_size_override("font_size", 14)
	if is_out:
		entry.add_theme_color_override("font_color", GameManager.COLORS["out"])
	elif scored > 0:
		entry.add_theme_color_override("font_color", GameManager.COLORS["run"])
	else:
		entry.add_theme_color_override("font_color", GameManager.COLORS["text"])
	entry.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	entry.custom_minimum_size = Vector2(300, 0)
	log_container.add_child(entry)

	await get_tree().process_frame
	log_scroll.scroll_vertical = int(log_scroll.get_v_scroll_bar().max_value)


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

	# Walk-off check
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

	if status["state"] == BaseballState.State.GAME_OVER:
		GameManager.go_to_scene("game_over")
		return

	if GameManager.baseball.should_show_shop():
		GameManager.go_to_scene("shop")
	else:
		GameManager.go_to_scene("game")

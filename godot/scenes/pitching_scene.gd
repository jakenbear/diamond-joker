extends Control

# PitchingScene — Opponent's half-inning. You pick pitches.
#
# HOW TO EDIT THE LAYOUT:
#   Open pitching_scene.tscn and drag nodes around in the 2D editor.

@onready var score_label: Label = %ScoreLabel
@onready var inning_label: Label = %InningLabel
@onready var outs_label: Label = %OutsLabel
@onready var batter_label: Label = %BatterLabel
@onready var pitcher_label: Label = %PitcherLabel
@onready var stamina_label: Label = %StaminaLabel
@onready var pitch_btn_container: VBoxContainer = %PitchButtonContainer
@onready var log_container: VBoxContainer = %LogContainer
@onready var log_scroll: ScrollContainer = %LogScroll

var base_indicators: Array[ColorRect] = []
var runner_labels: Array[Label] = []
var pitch_buttons: Array[Button] = []

var sim_outs: int = 0
var sim_runs: int = 0
var bases: Array = [null, null, null]
var pitching_done: bool = false


func _ready() -> void:
	base_indicators = [%Base1st, %Base2nd, %Base3rd]
	runner_labels = [%Runner1st, %Runner2nd, %Runner3rd]

	_build_pitch_buttons()
	_update_ui()
	_show_current_batter()


func _build_pitch_buttons() -> void:
	var my_pitcher: Dictionary = GameManager.roster.get_my_pitcher()
	var pitches: Array = my_pitcher.get("pitches", ["fastball", "slider", "changeup", "breaking"])

	for pitch_key in pitches:
		var pitch_data: Dictionary = PitchTypes.TYPES.get(pitch_key, {})
		var btn := Button.new()
		btn.text = "%s - %s" % [pitch_data.get("name", pitch_key), pitch_data.get("description", "")]
		btn.add_theme_font_size_override("font_size", 14)
		btn.custom_minimum_size = Vector2(300, 50)
		btn.pressed.connect(_on_pitch_selected.bind(pitch_key))
		pitch_btn_container.add_child(btn)
		pitch_buttons.append(btn)

	# IBB button
	var ibb_btn := Button.new()
	ibb_btn.text = "Intentional Walk - Put batter on 1st"
	ibb_btn.add_theme_font_size_override("font_size", 14)
	ibb_btn.custom_minimum_size = Vector2(300, 40)
	ibb_btn.pressed.connect(_on_pitch_selected.bind("ibb"))
	pitch_btn_container.add_child(ibb_btn)
	pitch_buttons.append(ibb_btn)


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

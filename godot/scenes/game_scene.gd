extends Control

# GameScene — Main gameplay: play poker hands to bat.
#
# HOW TO EDIT THE LAYOUT:
#   1. Open game_scene.tscn in Godot's editor
#   2. Click any node in the Scene tree (left panel)
#   3. Drag it on the 2D canvas, or edit properties in the Inspector (right panel)
#   4. This script handles game logic — layout is all in the .tscn

const SUIT_SYMBOLS := {"H": "♥", "D": "♦", "C": "♣", "S": "♠"}
const SUIT_COLORS := {"H": Color("#e53935"), "D": Color("#e53935"), "C": Color("#222233"), "S": Color("#222233")}
const RANK_DISPLAY := {2:"2", 3:"3", 4:"4", 5:"5", 6:"6", 7:"7", 8:"8", 9:"9", 10:"10", 11:"J", 12:"Q", 13:"K", 14:"A"}

# Node references from the .tscn (% finds unique-named nodes)
@onready var score_label: Label = %ScoreLabel
@onready var inning_label: Label = %InningLabel
@onready var outs_label: Label = %OutsLabel
@onready var chips_label: Label = %ChipsLabel
@onready var batter_label: Label = %BatterLabel
@onready var pitcher_label: Label = %PitcherLabel
@onready var traits_label: Label = %TraitsLabel
@onready var card_container: HBoxContainer = %CardContainer
@onready var hand_desc_label: Label = %HandDescLabel
@onready var discard_count_label: Label = %DiscardCountLabel
@onready var play_button: Button = %PlayButton
@onready var discard_button: Button = %DiscardButton
@onready var strike_label: Label = %StrikeLabel
@onready var outcome_label: Label = %OutcomeLabel

# Base indicators and runner labels (arrays for easy iteration)
var base_indicators: Array[ColorRect] = []
var runner_labels: Array[Label] = []

# Card buttons (created dynamically in the CardContainer)
var card_buttons: Array[Button] = []
var selected_indices: Array[int] = []
var strike_count: int = 0


func _ready() -> void:
	# Collect base/runner references from .tscn
	base_indicators = [%Base1st, %Base2nd, %Base3rd]
	runner_labels = [%Runner1st, %Runner2nd, %Runner3rd]

	# Connect button signals
	play_button.pressed.connect(_on_play_pressed)
	discard_button.pressed.connect(_on_discard_pressed)

	# Create 5 card buttons dynamically in the container
	for i in 5:
		var btn := _create_card_button(i)
		card_container.add_child(btn)
		card_buttons.append(btn)

	# Show pitcher traits
	var traits_text := ""
	var p: Dictionary = GameManager.roster.get_current_pitcher()
	for t in p.get("traits", []):
		traits_text += "[%s] %s  " % [t.get("name", "?"), t.get("description", "")]
	traits_label.text = "Pitcher traits: " + traits_text if not traits_text.is_empty() else ""

	# Start first at-bat
	_new_at_bat()


# ── Card button factory ───────────────────────────────────

func _create_card_button(index: int) -> Button:
	var btn := Button.new()
	btn.custom_minimum_size = Vector2(145, 210)
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.add_theme_font_size_override("font_size", 32)

	# Cream background so card text is always readable
	var bg_style := StyleBoxFlat.new()
	bg_style.bg_color = Color("#f0ead6")
	bg_style.set_corner_radius_all(8)
	bg_style.border_width_left = 2
	bg_style.border_width_right = 2
	bg_style.border_width_top = 2
	bg_style.border_width_bottom = 2
	bg_style.border_color = Color("#999999")
	btn.add_theme_stylebox_override("normal", bg_style)

	var hover_style := bg_style.duplicate()
	hover_style.bg_color = Color("#fffde8")
	hover_style.border_color = Color("#ffd700")
	btn.add_theme_stylebox_override("hover", hover_style)

	var press_style := bg_style.duplicate()
	press_style.bg_color = Color("#e8e0c0")
	btn.add_theme_stylebox_override("pressed", press_style)

	btn.pressed.connect(_on_card_toggled.bind(index))
	return btn


# ── Game Logic ────────────────────────────────────────────

func _new_at_bat() -> void:
	selected_indices = []
	strike_count = 0

	# Check for HBP
	var pitcher: Dictionary = GameManager.roster.get_current_pitcher()
	var hbp: Dictionary = SituationalEngine.check_hbp(pitcher.get("control", 5))
	if hbp.get("triggered", false):
		_resolve_outcome("HBP", 0)
		return

	GameManager.card_engine.new_at_bat()

	# Check for stolen base trait
	var batter: Dictionary = GameManager.roster.get_current_batter()
	var game_state: Dictionary = GameManager.get_game_state()
	var post_mod: Callable = TraitManager.build_post_modifier(batter.get("traits", []))
	if post_mod.is_valid():
		var dummy := {"outcome": "", "hand_name": ""}
		var check_result: Dictionary = post_mod.call(dummy, game_state)
		if check_result.get("stolen_base", false) and game_state["bases"][0]:
			GameManager.baseball.process_stolen_base()

	_update_ui()


func _update_ui() -> void:
	var status: Dictionary = GameManager.baseball.get_status()
	var batter: Dictionary = GameManager.roster.get_current_batter()
	var pitcher: Dictionary = GameManager.roster.get_current_pitcher()

	# Scoreboard
	var p_name: String = GameManager.player_team.get("nickname", "You")
	var o_name: String = GameManager.opponent_team.get("nickname", "Opp")
	score_label.text = "%s %d  -  %s %d" % [p_name, status["player_score"], o_name, status["opponent_score"]]
	inning_label.text = "Inning %d  |  Top" % status["inning"]
	outs_label.text = "Outs: %d" % status["outs"]
	chips_label.text = "Chips: %d" % status["total_chips"]

	# Batter info
	batter_label.text = "AB: %s (%s)  Pow:%d Con:%d Spd:%d" % [
		batter.get("name", "?"), batter.get("pos", "?"),
		batter.get("power", 0), batter.get("contact", 0), batter.get("speed", 0),
	]

	# Pitcher info
	pitcher_label.text = "vs %s  Vel:%d Ctrl:%d Stam:%d" % [
		pitcher.get("name", "?"),
		pitcher.get("velocity", 0), pitcher.get("control", 0), pitcher.get("stamina", 0),
	]

	# Bases
	var bases: Array = status["bases"]
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

	# Cards
	var hand: Array = GameManager.card_engine.hand
	for i in card_buttons.size():
		if i < hand.size():
			var card: Dictionary = hand[i]
			var rank_str: String = RANK_DISPLAY.get(card["rank"], "?")
			var suit_str: String = SUIT_SYMBOLS.get(card["suit"], "?")
			card_buttons[i].text = "%s\n%s" % [rank_str, suit_str]
			card_buttons[i].visible = true

			var suit_color: Color = SUIT_COLORS.get(card["suit"], Color.BLACK)
			card_buttons[i].add_theme_color_override("font_color", suit_color)

			# Selection highlight — gold border + raised look
			if i in selected_indices:
				var sel_style := StyleBoxFlat.new()
				sel_style.bg_color = Color("#fff8dc")
				sel_style.set_corner_radius_all(8)
				sel_style.border_width_left = 3
				sel_style.border_width_right = 3
				sel_style.border_width_top = 3
				sel_style.border_width_bottom = 3
				sel_style.border_color = Color("#ffd700")
				card_buttons[i].add_theme_stylebox_override("normal", sel_style)
				card_buttons[i].position.y = -10
			else:
				var def_style := StyleBoxFlat.new()
				def_style.bg_color = Color("#f0ead6")
				def_style.set_corner_radius_all(8)
				def_style.border_width_left = 2
				def_style.border_width_right = 2
				def_style.border_width_top = 2
				def_style.border_width_bottom = 2
				def_style.border_color = Color("#999999")
				card_buttons[i].add_theme_stylebox_override("normal", def_style)
				card_buttons[i].position.y = 0
		else:
			card_buttons[i].visible = false

	# Discard counter
	discard_count_label.text = "Discards: %d" % GameManager.card_engine.discards_remaining

	# Preview selected hand
	if not selected_indices.is_empty():
		var preview_cards: Array[Dictionary] = []
		for idx in selected_indices:
			if idx < hand.size():
				preview_cards.append(hand[idx])
		if not preview_cards.is_empty():
			var preview := CardEngine.evaluate_hand(preview_cards)
			hand_desc_label.text = "%s -> %s" % [preview.get("hand_name", "?"), preview.get("outcome", "?")]
		else:
			hand_desc_label.text = ""
	else:
		hand_desc_label.text = "Select 1-5 cards to play"

	# Strike count
	strike_label.text = "Count: %d-%d" % [0, strike_count]

	# Button states
	play_button.disabled = selected_indices.is_empty()
	discard_button.disabled = GameManager.card_engine.discards_remaining <= 0 or selected_indices.is_empty()


func _on_card_toggled(index: int) -> void:
	if index in selected_indices:
		selected_indices.erase(index)
	else:
		if selected_indices.size() < 5:
			selected_indices.append(index)
	_update_ui()


func _on_play_pressed() -> void:
	if selected_indices.is_empty():
		return

	var batter: Dictionary = GameManager.roster.get_current_batter()
	var game_state: Dictionary = GameManager.get_game_state()

	# Build modifiers from traits
	var all_traits: Array = batter.get("traits", [])
	all_traits.append_array(GameManager.roster.get_current_pitcher().get("traits", []))
	var pre_mod: Callable = TraitManager.build_pre_modifier(all_traits)
	var pitcher_pre: Callable = TraitManager.build_pitcher_pre_modifier(GameManager.roster.get_current_pitcher().get("traits", []))
	var post_mod: Callable = TraitManager.build_post_modifier(all_traits)
	var pitcher_post: Callable = TraitManager.build_pitcher_post_modifier(GameManager.roster.get_current_pitcher().get("traits", []))

	# Combine pre-modifiers
	var combined_pre: Callable = Callable()
	if pre_mod.is_valid() and pitcher_pre.is_valid():
		combined_pre = func(cards):
			var m = pre_mod.call(cards)
			return pitcher_pre.call(m)
	elif pre_mod.is_valid():
		combined_pre = pre_mod
	elif pitcher_pre.is_valid():
		combined_pre = pitcher_pre

	# Combine post-modifiers
	var combined_post: Callable = Callable()
	if post_mod.is_valid() and pitcher_post.is_valid():
		combined_post = func(result, gs):
			var m = post_mod.call(result, gs)
			return pitcher_post.call(m, gs)
	elif post_mod.is_valid():
		combined_post = post_mod
	elif pitcher_post.is_valid():
		combined_post = pitcher_post

	# Play the hand
	var hand_result: Dictionary = GameManager.card_engine.play_hand(
		selected_indices, combined_pre, combined_post, game_state, strike_count
	)

	# Apply batter modifiers (power/contact bonuses, contact save)
	var mod_result: Dictionary = GameManager.roster.apply_batter_modifiers(hand_result, game_state)
	var final_result: Dictionary = mod_result["result"]
	var bonuses: Dictionary = mod_result["bonuses"]

	# Re-apply trait post-modifiers after contact save
	if bonuses.get("contact_save", false) and combined_post.is_valid():
		final_result = combined_post.call(final_result, game_state)
		final_result["score"] = roundi(final_result["chips"] * final_result["mult"])

	# Apply pitcher modifiers
	final_result = GameManager.roster.apply_pitcher_modifiers(final_result, game_state)

	var outcome: String = final_result.get("outcome", "Strikeout")

	# Situational check (DP, FC, Error, D3K)
	var sit: Dictionary = SituationalEngine.check(outcome, game_state, batter.get("speed", 5))
	if sit.get("transformed", false):
		outcome = sit["outcome"]

	# Sacrifice fly check
	if final_result.get("sacrifice_fly", false):
		GameManager.baseball.process_sacrifice_fly()

	# Show hand description
	var desc: String = final_result.get("played_description", outcome)
	hand_desc_label.text = desc

	_resolve_outcome(outcome, final_result.get("score", 0))


func _on_discard_pressed() -> void:
	if selected_indices.is_empty():
		return

	# Wild pitch check
	var pitcher: Dictionary = GameManager.roster.get_current_pitcher()
	var bases: Array = GameManager.baseball.get_status()["bases"]
	var wp: Dictionary = SituationalEngine.check_wild_pitch(pitcher.get("control", 5), bases)
	if wp.get("triggered", false):
		GameManager.baseball.advance_all_runners()
		outcome_label.text = "Wild Pitch! Runner advances!"

	strike_count = mini(strike_count + 1, 2)
	GameManager.card_engine.discard(selected_indices)
	selected_indices = []
	_update_ui()


func _resolve_outcome(outcome: String, score: int) -> void:
	var batter: Dictionary = GameManager.roster.get_current_batter()
	var result: Dictionary = GameManager.baseball.resolve_outcome(outcome, score, batter)

	outcome_label.text = result.get("description", outcome)

	# Extra base attempt on hits
	if result.get("runs_scored", 0) >= 0 and outcome in ["Single", "Double", "Triple"]:
		var extra: Dictionary = GameManager.baseball.try_extra_base(batter.get("speed", 5) * 0.05)
		if extra.get("advanced", false):
			outcome_label.text += " (Runner advances!)"

	var state: int = result.get("state", BaseballState.State.BATTING)

	if state == BaseballState.State.GAME_OVER:
		await get_tree().create_timer(2.0).timeout
		GameManager.go_to_scene("game_over")
		return

	if state == BaseballState.State.SWITCH_SIDE:
		_update_ui()
		await get_tree().create_timer(1.5).timeout
		GameManager.go_to_scene("pitching")
		return

	# Next batter
	GameManager.roster.advance_batter()
	await get_tree().create_timer(1.0).timeout
	outcome_label.text = ""
	_new_at_bat()

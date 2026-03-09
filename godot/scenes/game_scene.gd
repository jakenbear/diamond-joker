extends Control

# GameScene — Main gameplay: play poker hands to bat.
# Layout:
#   Top bar:    Scoreboard (inning, score, outs, chips)
#   Left:       Baseball diamond + batter/pitcher info
#   Right:      Card hand + action buttons
#   Center:     Outcome overlay text

const SUIT_SYMBOLS := {"H": "♥", "D": "♦", "C": "♣", "S": "♠"}
const SUIT_COLORS := {"H": Color("#e53935"), "D": Color("#e53935"), "C": Color("#1a1a2e"), "S": Color("#1a1a2e")}
const RANK_DISPLAY := {2:"2", 3:"3", 4:"4", 5:"5", 6:"6", 7:"7", 8:"8", 9:"9", 10:"10", 11:"J", 12:"Q", 13:"K", 14:"A"}

# UI references
var card_buttons: Array[Button] = []
var selected_indices: Array[int] = []
var play_button: Button = null
var discard_button: Button = null
var outcome_label: Label = null
var score_label: Label = null
var inning_label: Label = null
var outs_label: Label = null
var chips_label: Label = null
var batter_label: Label = null
var pitcher_label: Label = null
var hand_desc_label: Label = null
var base_indicators: Array[ColorRect] = []
var runner_labels: Array[Label] = []
var discard_count_label: Label = null
var strike_count: int = 0


func _ready() -> void:
	# Background
	var bg := ColorRect.new()
	bg.color = GameManager.COLORS["bg"]
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	_build_scoreboard()
	_build_diamond()
	_build_info_panels()
	_build_card_area()
	_build_outcome_overlay()

	# Start first at-bat
	_new_at_bat()


# ── Scoreboard (top bar) ──────────────────────────────────

func _build_scoreboard() -> void:
	var bar := ColorRect.new()
	bar.color = GameManager.COLORS["panel"]
	bar.position = Vector2(0, 0)
	bar.size = Vector2(1280, 50)
	add_child(bar)

	# Team names + scores
	var player_team_name: String = GameManager.player_team.get("nickname", "You")
	var opp_team_name: String = GameManager.opponent_team.get("nickname", "Opponent")
	score_label = Label.new()
	score_label.add_theme_font_size_override("font_size", 22)
	score_label.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
	score_label.position = Vector2(20, 10)
	score_label.custom_minimum_size = Vector2(300, 30)
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
	outs_label.position = Vector2(880, 10)
	outs_label.custom_minimum_size = Vector2(150, 30)
	add_child(outs_label)

	chips_label = Label.new()
	chips_label.add_theme_font_size_override("font_size", 22)
	chips_label.add_theme_color_override("font_color", GameManager.COLORS["accent"])
	chips_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	chips_label.position = Vector2(1060, 10)
	chips_label.custom_minimum_size = Vector2(200, 30)
	add_child(chips_label)


# ── Diamond display (left side) ───────────────────────────

func _build_diamond() -> void:
	var diamond_panel := ColorRect.new()
	diamond_panel.color = GameManager.COLORS["panel"].darkened(0.2)
	diamond_panel.position = Vector2(20, 70)
	diamond_panel.size = Vector2(340, 300)
	add_child(diamond_panel)

	var diamond_title := Label.new()
	diamond_title.text = "DIAMOND"
	diamond_title.add_theme_font_size_override("font_size", 14)
	diamond_title.add_theme_color_override("font_color", GameManager.COLORS["text"])
	diamond_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	diamond_title.position = Vector2(20, 72)
	diamond_title.custom_minimum_size = Vector2(340, 20)
	add_child(diamond_title)

	# Base positions in diamond layout:
	#        2nd (top)
	#   3rd (left)   1st (right)
	#       Home (bottom)
	var base_positions := [
		Vector2(270, 230),  # 1st base (right)
		Vector2(190, 150),  # 2nd base (top)
		Vector2(110, 230),  # 3rd base (left)
	]
	var home_pos := Vector2(190, 310)

	# Draw diamond lines
	var diamond_draw := Control.new()
	diamond_draw.position = Vector2(0, 0)
	diamond_draw.size = Vector2(380, 380)
	diamond_draw.draw.connect(func():
		var offset := Vector2(20, 70)
		var pts := [home_pos + offset, base_positions[0] + offset, base_positions[1] + offset, base_positions[2] + offset, home_pos + offset]
		for i in range(pts.size() - 1):
			diamond_draw.draw_line(pts[i], pts[i + 1], Color(0.4, 0.4, 0.4, 0.5), 2.0)
	)
	add_child(diamond_draw)

	# Home plate
	var home := ColorRect.new()
	home.color = Color.WHITE
	home.position = Vector2(20 + home_pos.x - 8, 70 + home_pos.y - 8)
	home.size = Vector2(16, 16)
	add_child(home)

	# Base indicators (1st, 2nd, 3rd)
	for i in 3:
		var base := ColorRect.new()
		base.color = GameManager.COLORS["base_empty"]
		var bp: Vector2 = base_positions[i]
		base.position = Vector2(20 + bp.x - 12, 70 + bp.y - 12)
		base.size = Vector2(24, 24)
		base.rotation = deg_to_rad(45)
		add_child(base)
		base_indicators.append(base)

		# Runner name label above base
		var lbl := Label.new()
		lbl.add_theme_font_size_override("font_size", 11)
		lbl.add_theme_color_override("font_color", GameManager.COLORS["accent"])
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.position = Vector2(20 + bp.x - 40, 70 + bp.y - 32)
		lbl.custom_minimum_size = Vector2(80, 16)
		lbl.text = ""
		add_child(lbl)
		runner_labels.append(lbl)


# ── Batter + Pitcher info (left side, below diamond) ──────

func _build_info_panels() -> void:
	batter_label = Label.new()
	batter_label.add_theme_font_size_override("font_size", 16)
	batter_label.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
	batter_label.position = Vector2(20, 385)
	batter_label.custom_minimum_size = Vector2(340, 40)
	batter_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(batter_label)

	pitcher_label = Label.new()
	pitcher_label.add_theme_font_size_override("font_size", 14)
	pitcher_label.add_theme_color_override("font_color", Color(GameManager.COLORS["text"], 0.7))
	pitcher_label.position = Vector2(20, 430)
	pitcher_label.custom_minimum_size = Vector2(340, 40)
	pitcher_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(pitcher_label)

	# Pitcher traits display
	var traits_text := ""
	var p: Dictionary = GameManager.roster.get_current_pitcher()
	for t in p.get("traits", []):
		traits_text += "[%s] %s  " % [t.get("name", "?"), t.get("description", "")]
	if not traits_text.is_empty():
		var traits_label := Label.new()
		traits_label.text = "Pitcher traits: " + traits_text
		traits_label.add_theme_font_size_override("font_size", 12)
		traits_label.add_theme_color_override("font_color", GameManager.COLORS["out"])
		traits_label.position = Vector2(20, 470)
		traits_label.custom_minimum_size = Vector2(340, 30)
		traits_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		add_child(traits_label)


# ── Card hand area (right side) ───────────────────────────

func _build_card_area() -> void:
	# Card area background
	var card_panel := ColorRect.new()
	card_panel.color = GameManager.COLORS["panel"].darkened(0.15)
	card_panel.position = Vector2(390, 70)
	card_panel.size = Vector2(870, 540)
	add_child(card_panel)

	# "Your Hand" label
	var hand_label := Label.new()
	hand_label.text = "YOUR HAND"
	hand_label.add_theme_font_size_override("font_size", 18)
	hand_label.add_theme_color_override("font_color", GameManager.COLORS["text"])
	hand_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hand_label.position = Vector2(390, 75)
	hand_label.custom_minimum_size = Vector2(870, 25)
	add_child(hand_label)

	# Card buttons container
	var card_container := HBoxContainer.new()
	card_container.position = Vector2(430, 110)
	card_container.custom_minimum_size = Vector2(800, 280)
	card_container.add_theme_constant_override("separation", 15)
	card_container.name = "CardContainer"
	add_child(card_container)

	# Create 5 card button slots
	for i in 5:
		var btn := _create_card_button(i)
		card_container.add_child(btn)
		card_buttons.append(btn)

	# Hand description (shows what hand was detected)
	hand_desc_label = Label.new()
	hand_desc_label.add_theme_font_size_override("font_size", 20)
	hand_desc_label.add_theme_color_override("font_color", GameManager.COLORS["accent"])
	hand_desc_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hand_desc_label.position = Vector2(390, 400)
	hand_desc_label.custom_minimum_size = Vector2(870, 30)
	add_child(hand_desc_label)

	# Discard counter
	discard_count_label = Label.new()
	discard_count_label.add_theme_font_size_override("font_size", 16)
	discard_count_label.add_theme_color_override("font_color", GameManager.COLORS["text"])
	discard_count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	discard_count_label.position = Vector2(390, 435)
	discard_count_label.custom_minimum_size = Vector2(870, 25)
	add_child(discard_count_label)

	# Action buttons
	var btn_container := HBoxContainer.new()
	btn_container.position = Vector2(530, 480)
	btn_container.custom_minimum_size = Vector2(600, 60)
	btn_container.add_theme_constant_override("separation", 30)
	add_child(btn_container)

	play_button = Button.new()
	play_button.text = "  PLAY HAND  "
	play_button.add_theme_font_size_override("font_size", 24)
	play_button.custom_minimum_size = Vector2(250, 55)
	play_button.pressed.connect(_on_play_pressed)
	btn_container.add_child(play_button)

	discard_button = Button.new()
	discard_button.text = "  DISCARD  "
	discard_button.add_theme_font_size_override("font_size", 24)
	discard_button.custom_minimum_size = Vector2(250, 55)
	discard_button.pressed.connect(_on_discard_pressed)
	btn_container.add_child(discard_button)

	# Strike count display
	var strike_label := Label.new()
	strike_label.name = "StrikeLabel"
	strike_label.add_theme_font_size_override("font_size", 16)
	strike_label.add_theme_color_override("font_color", GameManager.COLORS["text"])
	strike_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	strike_label.position = Vector2(390, 555)
	strike_label.custom_minimum_size = Vector2(870, 25)
	add_child(strike_label)


func _create_card_button(index: int) -> Button:
	var btn := Button.new()
	btn.custom_minimum_size = Vector2(140, 200)
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.add_theme_font_size_override("font_size", 28)
	btn.pressed.connect(_on_card_toggled.bind(index))
	return btn


# ── Outcome overlay ───────────────────────────────────────

func _build_outcome_overlay() -> void:
	outcome_label = Label.new()
	outcome_label.add_theme_font_size_override("font_size", 36)
	outcome_label.add_theme_color_override("font_color", GameManager.COLORS["accent"])
	outcome_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	outcome_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	outcome_label.position = Vector2(200, 620)
	outcome_label.custom_minimum_size = Vector2(880, 50)
	outcome_label.text = ""
	add_child(outcome_label)


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
				var last_name: String = bases[i].get("name", "").split(" ")[-1]
				runner_labels[i].text = last_name
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

			# Color based on suit
			var suit_color: Color = SUIT_COLORS.get(card["suit"], Color.WHITE)
			card_buttons[i].add_theme_color_override("font_color", suit_color)

			# Selection highlight
			if i in selected_indices:
				card_buttons[i].modulate = Color(1.0, 0.85, 0.2, 1.0)
			else:
				card_buttons[i].modulate = Color.WHITE
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
			hand_desc_label.text = "%s → %s" % [preview.get("hand_name", "?"), preview.get("outcome", "?")]
		else:
			hand_desc_label.text = ""
	else:
		hand_desc_label.text = "Select 1-5 cards to play"

	# Strike count
	var strike_node := get_node_or_null("StrikeLabel")
	if strike_node:
		strike_node.text = "Count: %d-%d" % [0, strike_count]

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
		# Advance lead runner
		GameManager.baseball.advance_all_runners()
		outcome_label.text = "Wild Pitch! Runner advances!"

	strike_count = mini(strike_count + 1, 2)
	GameManager.card_engine.discard(selected_indices)
	selected_indices = []
	_update_ui()


func _resolve_outcome(outcome: String, score: int) -> void:
	var batter: Dictionary = GameManager.roster.get_current_batter()
	var result: Dictionary = GameManager.baseball.resolve_outcome(outcome, score, batter)

	# Show outcome text
	outcome_label.text = result.get("description", outcome)

	# Extra base attempt on hits
	if result.get("runs_scored", 0) >= 0 and outcome in ["Single", "Double", "Triple"]:
		var extra: Dictionary = GameManager.baseball.try_extra_base(batter.get("speed", 5) * 0.05)
		if extra.get("advanced", false):
			outcome_label.text += " (Runner advances!)"

	# Check game state
	var state: int = result.get("state", BaseballState.State.BATTING)

	if state == BaseballState.State.GAME_OVER:
		# Delay then go to game over
		await get_tree().create_timer(2.0).timeout
		GameManager.go_to_scene("game_over")
		return

	if state == BaseballState.State.SWITCH_SIDE:
		_update_ui()
		await get_tree().create_timer(1.5).timeout
		# Go to pitching scene for opponent's half
		GameManager.go_to_scene("pitching")
		return

	# Next batter
	GameManager.roster.advance_batter()
	await get_tree().create_timer(1.0).timeout
	outcome_label.text = ""
	_new_at_bat()

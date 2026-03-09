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

# Card image file mapping: suit letter + rank string
const SUIT_FILE := {"H": "h", "D": "d", "C": "c", "S": "s"}
const RANK_FILE := {2:"2", 3:"3", 4:"4", 5:"5", 6:"6", 7:"7", 8:"8", 9:"9", 10:"10", 11:"j", 12:"q", 13:"k", 14:"a"}
const CARD_SCALE := Vector2(4.0, 4.0)  # 32x42 -> 128x168

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

# Card slots (TextureRect nodes showing card art)
var card_panels: Array[TextureRect] = []
var card_textures: Array[TextureRect] = []
var selected_indices: Array[int] = []
var strike_count: int = 0


func _ready() -> void:
	# Collect base/runner references from .tscn
	base_indicators = [%Base1st, %Base2nd, %Base3rd]
	runner_labels = [%Runner1st, %Runner2nd, %Runner3rd]

	# Connect button signals
	play_button.pressed.connect(_on_play_pressed)
	discard_button.pressed.connect(_on_discard_pressed)

	# Create 5 card slots with image support
	for i in 5:
		var slot := _create_card_slot(i)
		card_container.add_child(slot["panel"])
		card_panels.append(slot["panel"])
		card_textures.append(slot["texture"])

	# Show pitcher traits
	var traits_text := ""
	var p: Dictionary = GameManager.roster.get_current_pitcher()
	for t in p.get("traits", []):
		traits_text += "[%s] %s  " % [t.get("name", "?"), t.get("description", "")]
	traits_label.text = "Pitcher traits: " + traits_text if not traits_text.is_empty() else ""

	# Start first at-bat
	_new_at_bat()


# ── Card slot factory ─────────────────────────────────────

func _create_card_slot(index: int) -> Dictionary:
	# Just the card image — no background panel, no border
	var tex_rect := TextureRect.new()
	tex_rect.custom_minimum_size = Vector2(128, 168)
	tex_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE  # allow scaling beyond texture size
	tex_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tex_rect.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST  # pixel art stays crisp
	tex_rect.mouse_filter = Control.MOUSE_FILTER_STOP

	# Click handling
	tex_rect.gui_input.connect(_on_card_input.bind(index))

	return {"panel": tex_rect, "texture": tex_rect}


func _on_card_input(event: InputEvent, index: int) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_on_card_toggled(index)


func _get_card_texture(card: Dictionary) -> Texture2D:
	var suit_char: String = SUIT_FILE.get(card["suit"], "h")
	var rank_char: String = RANK_FILE.get(card["rank"], "2")
	var path := "res://assets/cards/%s%s.png" % [suit_char, rank_char]
	if ResourceLoader.exists(path):
		return load(path)
	return null


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

	# Cards — load card art images
	var hand: Array = GameManager.card_engine.hand
	for i in card_panels.size():
		if i < hand.size():
			var card: Dictionary = hand[i]
			card_panels[i].visible = true

			# Load card image
			var tex: Texture2D = _get_card_texture(card)
			if tex:
				card_textures[i].texture = tex
			else:
				card_textures[i].texture = null

			# Selection: raise card up, unselected: normal position
			if i in selected_indices:
				card_panels[i].position.y = -15
				card_panels[i].modulate = Color(1.2, 1.2, 1.0, 1.0)  # slight brightness
			else:
				card_panels[i].position.y = 0
				card_panels[i].modulate = Color.WHITE
		else:
			card_panels[i].visible = false

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

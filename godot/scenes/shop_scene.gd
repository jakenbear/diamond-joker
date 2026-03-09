extends Control

# ShopScene — Buy trait cards between innings, equip to batters.

var shop_items: Array[Dictionary] = []
var buy_buttons: Array[Button] = []
var roster_buttons: Array[Button] = []
var chips_label: Label = null
var buys_label: Label = null
var continue_button: Button = null
var equip_panel: Control = null
var selected_trait: Dictionary = {}
var buys_remaining: int = 0
var status_label: Label = null


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = GameManager.COLORS["bg"]
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	GameManager.baseball.mark_shop_visited()
	buys_remaining = GameManager.baseball.get_shop_buy_limit()
	shop_items = GameManager.trait_manager.get_shop_selection(3)

	_build_header()
	_build_shop_cards()
	_build_roster_panel()
	_build_footer()

	_update_ui()


func _build_header() -> void:
	var bar := ColorRect.new()
	bar.color = GameManager.COLORS["panel"]
	bar.position = Vector2(0, 0)
	bar.size = Vector2(1280, 50)
	add_child(bar)

	var title := Label.new()
	title.text = "DUGOUT SHOP"
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", GameManager.COLORS["accent"])
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.position = Vector2(390, 8)
	title.custom_minimum_size = Vector2(500, 35)
	add_child(title)

	chips_label = Label.new()
	chips_label.add_theme_font_size_override("font_size", 22)
	chips_label.add_theme_color_override("font_color", GameManager.COLORS["accent"])
	chips_label.position = Vector2(20, 10)
	chips_label.custom_minimum_size = Vector2(200, 30)
	add_child(chips_label)

	buys_label = Label.new()
	buys_label.add_theme_font_size_override("font_size", 22)
	buys_label.add_theme_color_override("font_color", GameManager.COLORS["text"])
	buys_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	buys_label.position = Vector2(1000, 10)
	buys_label.custom_minimum_size = Vector2(260, 30)
	add_child(buys_label)


func _build_shop_cards() -> void:
	var cards_container := HBoxContainer.new()
	cards_container.position = Vector2(90, 70)
	cards_container.custom_minimum_size = Vector2(1100, 260)
	cards_container.add_theme_constant_override("separation", 30)
	add_child(cards_container)

	for i in shop_items.size():
		var item: Dictionary = shop_items[i]
		var card_panel := VBoxContainer.new()
		card_panel.custom_minimum_size = Vector2(320, 250)
		cards_container.add_child(card_panel)

		# Card background
		var card_bg := ColorRect.new()
		card_bg.color = GameManager.COLORS["panel_light"]
		card_bg.custom_minimum_size = Vector2(320, 200)
		card_panel.add_child(card_bg)

		# Trait name
		var name_label := Label.new()
		name_label.text = item.get("name", "?")
		name_label.add_theme_font_size_override("font_size", 22)
		name_label.add_theme_color_override("font_color", GameManager.COLORS["text_bright"])
		name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		name_label.custom_minimum_size = Vector2(320, 30)
		card_panel.add_child(name_label)

		# Rarity
		var rarity_colors := {"common": Color("#aaaaaa"), "uncommon": Color("#4fc3f7"), "rare": Color("#ffd700")}
		var rarity_label := Label.new()
		rarity_label.text = item.get("rarity", "common").to_upper()
		rarity_label.add_theme_font_size_override("font_size", 12)
		rarity_label.add_theme_color_override("font_color", rarity_colors.get(item.get("rarity", "common"), Color.WHITE))
		rarity_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		rarity_label.custom_minimum_size = Vector2(320, 18)
		card_panel.add_child(rarity_label)

		# Description
		var desc_label := Label.new()
		desc_label.text = item.get("description", "")
		desc_label.add_theme_font_size_override("font_size", 16)
		desc_label.add_theme_color_override("font_color", GameManager.COLORS["text"])
		desc_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		desc_label.custom_minimum_size = Vector2(320, 50)
		card_panel.add_child(desc_label)

		# Buy button
		var buy_btn := Button.new()
		buy_btn.text = "BUY (%d chips)" % item.get("price", 0)
		buy_btn.add_theme_font_size_override("font_size", 18)
		buy_btn.custom_minimum_size = Vector2(320, 45)
		buy_btn.pressed.connect(_on_buy_pressed.bind(i))
		card_panel.add_child(buy_btn)
		buy_buttons.append(buy_btn)


func _build_roster_panel() -> void:
	equip_panel = Control.new()
	equip_panel.position = Vector2(0, 0)
	equip_panel.size = Vector2(1280, 720)
	equip_panel.visible = false
	add_child(equip_panel)

	# Dimmed background
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.7)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	equip_panel.add_child(dim)

	var panel_bg := ColorRect.new()
	panel_bg.color = GameManager.COLORS["panel"]
	panel_bg.position = Vector2(140, 80)
	panel_bg.size = Vector2(1000, 560)
	equip_panel.add_child(panel_bg)

	var equip_title := Label.new()
	equip_title.text = "EQUIP TO WHICH BATTER?"
	equip_title.add_theme_font_size_override("font_size", 24)
	equip_title.add_theme_color_override("font_color", GameManager.COLORS["accent"])
	equip_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	equip_title.position = Vector2(140, 90)
	equip_title.custom_minimum_size = Vector2(1000, 35)
	equip_panel.add_child(equip_title)

	var roster_container := VBoxContainer.new()
	roster_container.position = Vector2(180, 140)
	roster_container.custom_minimum_size = Vector2(920, 470)
	roster_container.add_theme_constant_override("separation", 6)
	equip_panel.add_child(roster_container)

	var roster: Array = GameManager.roster.get_roster()
	for i in roster.size():
		var player: Dictionary = roster[i]
		var btn := Button.new()
		var traits_str := ""
		for t in player.get("traits", []):
			traits_str += " [%s]" % t.get("name", "?")
		btn.text = "%d. %s (%s)  Pow:%d Con:%d Spd:%d%s" % [
			i + 1, player.get("name", "?"), player.get("pos", "?"),
			player.get("power", 0), player.get("contact", 0), player.get("speed", 0),
			traits_str,
		]
		btn.add_theme_font_size_override("font_size", 16)
		btn.custom_minimum_size = Vector2(900, 42)
		btn.pressed.connect(_on_equip_to_batter.bind(i))
		roster_container.add_child(btn)
		roster_buttons.append(btn)


func _build_footer() -> void:
	status_label = Label.new()
	status_label.add_theme_font_size_override("font_size", 18)
	status_label.add_theme_color_override("font_color", GameManager.COLORS["text"])
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.position = Vector2(190, 590)
	status_label.custom_minimum_size = Vector2(900, 30)
	add_child(status_label)

	continue_button = Button.new()
	continue_button.text = "  CONTINUE TO NEXT INNING  "
	continue_button.add_theme_font_size_override("font_size", 24)
	continue_button.position = Vector2(430, 640)
	continue_button.custom_minimum_size = Vector2(420, 55)
	continue_button.pressed.connect(_on_continue_pressed)
	add_child(continue_button)


func _update_ui() -> void:
	chips_label.text = "Chips: %d" % GameManager.baseball.get_total_chips()
	buys_label.text = "Buys left: %d" % buys_remaining

	for i in buy_buttons.size():
		if i < shop_items.size():
			var item: Dictionary = shop_items[i]
			var can_afford: bool = GameManager.baseball.get_total_chips() >= item.get("price", 0)
			buy_buttons[i].disabled = not can_afford or buys_remaining <= 0


func _on_buy_pressed(index: int) -> void:
	if index >= shop_items.size() or buys_remaining <= 0:
		return
	var item: Dictionary = shop_items[index]
	var price: int = item.get("price", 0)
	if not GameManager.baseball.spend_chips(price):
		return

	selected_trait = item
	GameManager.trait_manager.mark_owned(item.get("id", ""))
	buys_remaining -= 1

	# Disable this buy button
	buy_buttons[index].disabled = true
	buy_buttons[index].text = "SOLD"

	# Show equip panel
	equip_panel.visible = true
	_update_ui()


func _on_equip_to_batter(player_index: int) -> void:
	if selected_trait.is_empty():
		return
	var success: bool = GameManager.roster.equip_trait(player_index, selected_trait)
	if success:
		status_label.text = "Equipped %s to %s!" % [
			selected_trait.get("name", "?"),
			GameManager.roster.get_roster()[player_index].get("name", "?"),
		]
	else:
		status_label.text = "Can't equip — max 2 traits per batter!"
	selected_trait = {}
	equip_panel.visible = false
	_update_ui()


func _on_continue_pressed() -> void:
	GameManager.go_to_scene("game")

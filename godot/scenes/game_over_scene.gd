extends Control

# GameOverScene — Final score, box score, play again.
#
# HOW TO EDIT THE LAYOUT:
#   Open game_over_scene.tscn and drag nodes around in the 2D editor.

@onready var banner: ColorRect = %Banner
@onready var result_label: Label = %ResultLabel
@onready var score_label: Label = %ScoreLabel
@onready var box_header: Label = %BoxHeader
@onready var box_player_row: Label = %BoxPlayerRow
@onready var box_opponent_row: Label = %BoxOpponentRow
@onready var chips_label: Label = %ChipsLabel
@onready var innings_label: Label = %InningsLabel
@onready var play_again_button: Button = %PlayAgainButton


func _ready() -> void:
	play_again_button.pressed.connect(_on_play_again)

	var result: Dictionary = GameManager.baseball.get_result()
	var won: bool = result.get("won", false)

	# Banner color: green for win, red for loss
	banner.color = GameManager.COLORS["run"] if won else GameManager.COLORS["out"]
	result_label.text = "YOU WIN!" if won else "GAME OVER"

	# Final score
	var p_name: String = GameManager.player_team.get("nickname", "You")
	var o_name: String = GameManager.opponent_team.get("nickname", "Opponent")
	score_label.text = "%s  %d  -  %d  %s" % [
		p_name, result.get("player_score", 0),
		result.get("opponent_score", 0), o_name,
	]

	# Box score
	var player_runs: Array = result.get("player_runs_by_inning", [])
	var opp_runs: Array = result.get("opponent_runs_by_inning", [])
	var innings: int = maxi(player_runs.size(), opp_runs.size())

	if innings > 0:
		# Header row
		var header := "         "
		for i in range(1, innings + 1):
			header += "  %d  " % i
		header += "   R"
		box_header.text = header

		# Player row
		var p_row := "%-8s " % p_name.left(8)
		for i in innings:
			var r: int = player_runs[i] if i < player_runs.size() else 0
			p_row += "  %d  " % r
		p_row += "  %d" % result.get("player_score", 0)
		box_player_row.text = p_row

		# Opponent row
		var o_row := "%-8s " % o_name.left(8)
		for i in innings:
			var r: int = opp_runs[i] if i < opp_runs.size() else 0
			o_row += "  %d  " % r
		o_row += "  %d" % result.get("opponent_score", 0)
		box_opponent_row.text = o_row

	# Stats
	chips_label.text = "Total Chips Earned: %d" % result.get("total_chips", 0)
	innings_label.text = "%d Innings Played" % result.get("innings", 9)


func _on_play_again() -> void:
	GameManager.go_to_scene("title")

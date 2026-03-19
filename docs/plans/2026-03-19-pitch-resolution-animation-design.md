# Pitch Resolution Animation — "Card Roulette Pitch"

## Summary
After the player hits PLAY, a cinematic overlay plays showing a baseball traveling from pitcher to batter while an outcome card rapidly cycles through possible results (slot-machine style), slowing down and locking on the real outcome as the ball reaches the plate. Bat connects on hits, whiffs on outs.

## Trigger
`GameScene._onPlay()` — after hand result is calculated but before the result text/scoring flow begins.

## Sequence (~3.5s)

| Time | Event |
|------|-------|
| T=0.0 | Dark overlay (alpha 0.7) fades in over 300ms. Cards below fade out as normal. |
| T=0.3 | Pitcher silhouette appears on far left. Batter silhouette on far right. Baseball sprite appears near pitcher. |
| T=0.5 | Ball begins traveling right in a slight arc. A large face-down outcome card (150x200) appears centered on screen. |
| T=1.0 | Card begins rapidly flipping between outcome labels: Single, Double, Triple, HR, Groundout, Flyout, Strikeout (~100ms per flip). |
| T=2.0 | Cycling slows (~200ms per flip). Card wobbles with increasing intensity. |
| T=2.8 | Cycling slows further (~400ms). Ball approaching plate. |
| T=3.0 | Card locks on real outcome. Ball reaches batter. |
| T=3.0 | HIT: bat crack, white flash, ball flies off-screen. OUT: bat whiffs, sad wobble, ball passes through. |
| T=3.5 | Overlay fades out (300ms). Normal result text/scoring flow resumes. |

## Visual Elements (all procedural)
- **Overlay:** full-screen black rectangle, alpha 0.7, depth above all game elements
- **Pitcher silhouette:** simple dark figure, left side (~x=150)
- **Batter silhouette:** simple dark figure, right side (~x=1130)
- **Baseball:** small white circle (r=8) with red stitch lines, travels full width
- **Outcome card:** cream bg (0xfaf3e0), brown border (0x8b7d5e), 150x200px, centered. Shows outcome text on face. Back is dark with card pattern.
- **Bat:** simple angled rectangle near batter, animates swing on resolution

## Outcome Pool for Cycling
Cards cycle through contextually valid outcomes only:
- Always include the actual result
- Include 2-3 "near miss" outcomes (adjacent in hand table)
- Include at least 1 out type if result is a hit, and vice versa
- Never show impossible outcomes (no Grand Slam text without bases loaded)

## Scene Integration
- New method: `_playPitchResolution(handResult, callback)`
- Called from `_onPlay()` after hand evaluation, wraps the existing result display in the callback
- All overlay elements added to a container for easy cleanup
- Container destroyed in callback after overlay fades

## Skippable
- Clicking anywhere during the animation fast-forwards to the reveal
- Prevents the animation from becoming tedious after many at-bats

## Files Changed
- `src/scenes/GameScene.js` — add `_playPitchResolution()` method, modify `_onPlay()` to call it
- No Godot mirror needed (UI-only, Phaser specific)

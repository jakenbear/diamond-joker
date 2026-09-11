# GameMaker Port — Pickup Notes

**Last session:** 2026-09-11  
**Live project:** `gamemaker/aces_loaded/` (YYP IDEVersion **2026.0.0.16**)  
**Compile:** VM, not YYC. Internal res **1280×720**, integer window scale, nearest-neighbor (interpolate off). F11 fullscreen, F10 cycle 1×/2×/3×.  
**Phaser** (`src/`, `data/`) is frozen reference. **Godot** is dead — ignore it.

**Goal:** Get GM as close to Phaser’s *systems* as we can, then Jake takes over in GameMaker. Later (not now): GM-native sprites, particles, lighting.

---

## Where we are

The full loop plays: title → team → **starter picker** → opponent → 3/5/7/9 → trait draft → bat → shop → optional pack → pitching showdown → extras / walk-off → box score.

Rules are most of the GDD. Presentation is a night-game GM UI (not a Phaser clone). Cards, team batter/pitcher/runner sprites, **team logos**, **shop coach faces / mascots**, batting staff stack, and draft **Showdowns** (pitch-roulette overlays) are in.

Player is **away**. Only **home (opponent)** can walk off.

---

## In (don’t re-port)

- Cards + `classify` vs `evaluate_hand` split (showdown uses classify only)
- Count, walk/K/foul, first-pitch bonus, pitcher-adjusts, contact rescue
- Sac bunt, steal, HBP, DP/FC/error/D3K/wild pitch, extra base **on singles only**
- Shop: traits / staff / synergies / sell staff 50%
- Staff + synergy effects that change play (southpaw control, bullpen fatigue delay, hit reduction → flyout)
- Hold’em showdown: DEAL/IBB, 4 pitches, click-to-aim + CONFIRM/CANCEL, YOU/OPP hand read, bullpen swap
- Starter picker, DEF/RNK/SUT hand sort
- Live hand preview (matches play; seeded at-bat RNG for chance traits)
- AVG/HR/SB stat lines
- Draft **SHOWDOWNS** toggle → skippable overlays: lines / rings / slots / crosshair / dice. Locks **green / red** only (no spinning outcome names)
- Shop coach faces (`spr_faces`) + mascot animals (`spr_mascots`); team logos on select / matchup / HUD
- Procedural SFX (`scr_sound`) matching Phaser SoundManager beeps
- Pixel fonts: **m5x7** body as a native-size sprite font (`m5x7_16.png`; Daniel Linssen, CC0), **Kenney Pixel Square** titles at integer 2×/3× (Kenney, CC0). Loaded at runtime from `datafiles/`.

---

## What’s left (pick up here)

**Phaser parity still thin**

1. ~~**Pack flip**~~ — face-down pack cards squash-flip on click.
2. ~~**Showdown juice**~~ — pitch-effect color flash + hold; deal-in comparison after resolve.
3. ~~**Bounce cinema variant**~~ — sixth overlay (ball + zone).
4. ~~**Reliever picker**~~ — BULLPEN opens unused arms + KEEP.
5. ~~**Deck variants**~~ — GameMaker matchup screen picker (Standard / No Face / Double / All Hearts / Small Ball). Phaser still always Standard.

**Known same-as-Phaser leftovers (don’t “fix” unless asked)**

- Contact Factory `team_pair_out_reduction` accumulates, is **not** applied to the pair out-roll.
- Shop does not sell **traits** (staff only).

**Later, because it’s GameMaker**

Better sprites, particles, camera punch, pitcher-to-plate cinematic. Do not fake that with more Phaser chrome now.

---

## How to run

Open `gamemaker/aces_loaded/aces_loaded.yyp` in GameMaker LTS. Reload the project if new sprites/scripts don’t appear. F5 / VM.

Hard rules still apply: no `var x` / `var y`; cards use `card_id`; engines have no draw calls; GDD first if you change gameplay.

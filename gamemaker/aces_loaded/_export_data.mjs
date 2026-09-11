import { writeFileSync, mkdirSync } from "fs";
import TEAMS from "../../data/teams.js";
import BATTER_TRAITS from "../../data/batter_traits.js";
import COACHES from "../../data/coaches.js";
import MASCOTS from "../../data/mascots.js";
import BONUS_PLAYERS from "../../data/bonus_players.js";
import PITCHER_TRAITS from "../../data/pitcher_traits.js";

const out = new URL("./datafiles/", import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL("teams.json", out), JSON.stringify(TEAMS));
writeFileSync(new URL("batter_traits.json", out), JSON.stringify(BATTER_TRAITS));
writeFileSync(new URL("coaches.json", out), JSON.stringify(COACHES));
writeFileSync(new URL("mascots.json", out), JSON.stringify(MASCOTS));
writeFileSync(new URL("bonus_players.json", out), JSON.stringify(BONUS_PLAYERS));
writeFileSync(new URL("pitcher_traits.json", out), JSON.stringify(PITCHER_TRAITS));
console.log("exported teams, traits, coaches, mascots, bonus_players, pitcher_traits");

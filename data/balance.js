/**
 * balance.js — Central tuning parameters for batting balance.
 * Used by CardEngine, CountManager, and tuning_sim.
 * Change values here to rebalance the game.
 */

const BALANCE = {
  // ── Strike / Discard Risk ──────────────────────
  baseStrikeChance: 0.55,      // base probability a discard = strike
  strikeVelocityScale: 0.02,   // per point of pitcher velocity above 5
  strikeControlScale: 0.02,    // per point of pitcher control above 5
  strikeContactScale: 0.03,    // per point of batter contact above 5 (reduces strikes)
  strikeMin: 0.25,             // floor
  strikeMax: 0.75,             // ceiling

  // ── Out Chances (base, before degradation) ─────
  pairOutBase: 0.95,           // pair of 2s; decreases by pairOutRankScale per rank
  pairOutRankScale: 0.03,      // per rank above 2
  twoStrikePenalty: 0.10,      // extra out chance at 2 strikes
  twoPairOutBase: 0.65,
  tripsOutBase: 0.45,
  straightOutBase: 0.20,
  flushOutBase: 0.20,
  fullHouseOutBase: 0.15,
  outMin: 0.05,
  outMax: 0.95,

  // ── Pitcher Reads (degradation per repeat) ─────
  pairDegradation: 0.25,       // per pair/two-pair played this inning
  twoPairDegradation: 0.12,
  tripsDegradation: 0.15,
  straightDegradation: 0.20,
  flushDegradation: 0.20,

  // ── Contact Rescue ─────────────────────────────
  contactRescueScale: 0.04,    // batter.contact * this = save chance

  // ── Foul at 2 Strikes ─────────────────────────
  foulContactScale: 0.04,      // batter.contact * this = foul chance at 2K
};

export default BALANCE;

/**
 * Diamond Joker — Headless Simulation Test Suite
 * Run: node test/sim.js
 */

import CardEngine from '../src/CardEngine.js';
import BaseballState from '../src/BaseballState.js';
import RosterManager from '../src/RosterManager.js';
import TraitManager from '../src/TraitManager.js';
import EffectEngine, { checkCondition } from '../src/EffectEngine.js';
import HAND_TABLE from '../data/hand_table.js';
import TEAMS from '../data/teams.js';
import BATTER_TRAITS from '../data/batter_traits.js';
import PITCHER_TRAITS from '../data/pitcher_traits.js';

// ── Test Harness ────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
  }
}

function assertClose(actual, min, max, name) {
  assert(actual >= min && actual <= max, `${name} (got ${actual}, expected ${min}-${max})`);
}

function group(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

// ── Helpers ─────────────────────────────────────────────

function makeCards(specs) {
  return specs.map(([rank, suit]) => ({ rank, suit, id: `${rank}${suit}` }));
}

// ═══════════════════════════════════════════════════════
//  PART 1: UNIT TESTS
// ═══════════════════════════════════════════════════════

// ── 1a. Hand Evaluation ─────────────────────────────────

group('1a. Hand Evaluation');

{
  const royalFlush = makeCards([[10,'H'],[11,'H'],[12,'H'],[13,'H'],[14,'H']]);
  const r = CardEngine.evaluateHand(royalFlush);
  assert(r.handName === 'Royal Flush', 'Royal Flush detected');
  assert(r.chips === 15 && r.mult === 20, 'Royal Flush chips/mult match HAND_TABLE');
}
{
  const sf = makeCards([[5,'S'],[6,'S'],[7,'S'],[8,'S'],[9,'S']]);
  const r = CardEngine.evaluateHand(sf);
  assert(r.handName === 'Straight Flush', 'Straight Flush detected');
  assert(r.chips === 10 && r.mult === 10, 'Straight Flush chips/mult');
}
{
  const foak = makeCards([[7,'H'],[7,'D'],[7,'C'],[7,'S'],[3,'H']]);
  const r = CardEngine.evaluateHand(foak);
  assert(r.handName === 'Four of a Kind', 'Four of a Kind detected');
  assert(r.chips === 6 && r.mult === 6, 'Four of a Kind chips/mult');
}
{
  const fh = makeCards([[9,'H'],[9,'D'],[9,'C'],[4,'S'],[4,'H']]);
  const r = CardEngine.evaluateHand(fh);
  assert(r.handName === 'Full House', 'Full House detected');
  assert(r.chips === 3 && r.mult === 2.5, 'Full House chips/mult');
}
{
  const flush = makeCards([[2,'D'],[5,'D'],[8,'D'],[11,'D'],[13,'D']]);
  const r = CardEngine.evaluateHand(flush);
  assert(r.handName === 'Flush', 'Flush detected');
  assert(r.chips === 5 && r.mult === 5, 'Flush chips/mult');
}
{
  const straight = makeCards([[6,'H'],[7,'D'],[8,'C'],[9,'S'],[10,'H']]);
  const r = CardEngine.evaluateHand(straight);
  assert(r.handName === 'Straight', 'Straight detected');
  assert(r.chips === 4 && r.mult === 4, 'Straight chips/mult');
}
{
  // Ace-low straight: A-2-3-4-5
  const aceLow = makeCards([[14,'H'],[2,'D'],[3,'C'],[4,'S'],[5,'H']]);
  const r = CardEngine.evaluateHand(aceLow);
  assert(r.handName === 'Straight', 'Ace-low straight (A-2-3-4-5) detected');
}
{
  const tok = makeCards([[6,'H'],[6,'D'],[6,'C'],[9,'S'],[11,'H']]);
  const r = CardEngine.evaluateHand(tok);
  // rank 6 is mid-range, no quality modification
  assert(r.handName === 'Three of a Kind', 'Three of a Kind detected');
  assert(r.chips === 3 && r.mult === 3, 'Three of a Kind chips/mult');
}
{
  // Two Pair with mid-range ranks (no quality modification)
  const tp = makeCards([[8,'H'],[8,'D'],[9,'C'],[9,'S'],[2,'H']]);
  const r = CardEngine.evaluateHand(tp);
  assert(r.handName === 'Two Pair', 'Two Pair detected');
  assert(r.chips === 2 && r.mult === 2, 'Two Pair chips/mult');
}
{
  // Pair with mid-range rank
  const pair = makeCards([[8,'H'],[8,'D'],[3,'C'],[5,'S'],[11,'H']]);
  const r = CardEngine.evaluateHand(pair);
  assert(r.handName === 'Pair', 'Pair detected');
  assert(r.chips === 1 && r.mult === 1.5, 'Pair chips/mult');
}
{
  const hc = makeCards([[2,'H'],[5,'D'],[8,'C'],[11,'S'],[13,'H']]);
  const r = CardEngine.evaluateHand(hc);
  assert(r.handName === 'High Card', 'High Card detected');
  assert(r.chips === 0 && r.mult === 1, 'High Card chips/mult');
}
{
  // 2-card selection → Pair
  const twoCards = makeCards([[8,'H'],[8,'D']]);
  const r = CardEngine.evaluateHand(twoCards);
  assert(r.handName === 'Pair', '2 matching cards → Pair');
}
{
  // 1-card selection → High Card
  const oneCard = makeCards([[14,'S']]);
  const r = CardEngine.evaluateHand(oneCard);
  assert(r.handName === 'High Card', '1 card → High Card');
}
{
  // playedDescription populated
  const pair = makeCards([[8,'H'],[8,'D'],[3,'C'],[5,'S'],[11,'H']]);
  const r = CardEngine.evaluateHand(pair);
  assert(r.playedDescription === 'Pair of 8s', 'playedDescription populated ("Pair of 8s")');
}
{
  // score = chips * mult
  const straight = makeCards([[6,'H'],[7,'D'],[8,'C'],[9,'S'],[10,'H']]);
  const r = CardEngine.evaluateHand(straight);
  assert(r.score === Math.round(r.chips * r.mult), 'score = chips * mult');
}

// ── 1b. Rank Quality ────────────────────────────────────

group('1b. Rank Quality (statistical, N=1000)');

{
  // Low pair (rank 2-5): ~40% groundout rate
  let groundouts = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const cards = makeCards([[3,'H'],[3,'D'],[7,'C'],[9,'S'],[11,'H']]);
    const r = CardEngine.evaluateHand(cards);
    if (r.handName === 'Groundout') groundouts++;
  }
  const rate = groundouts / N;
  assertClose(rate, 0.30, 0.50, `Low Pair groundout rate ~40%`);
}
{
  // Low Two Pair: ~20% groundout rate
  let groundouts = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const cards = makeCards([[3,'H'],[3,'D'],[4,'C'],[4,'S'],[11,'H']]);
    const r = CardEngine.evaluateHand(cards);
    if (r.handName === 'Groundout') groundouts++;
  }
  const rate = groundouts / N;
  assertClose(rate, 0.10, 0.30, `Low Two Pair groundout rate ~20%`);
}
{
  // Low Three of a Kind: ~10% flyout rate
  let flyouts = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const cards = makeCards([[4,'H'],[4,'D'],[4,'C'],[9,'S'],[11,'H']]);
    const r = CardEngine.evaluateHand(cards);
    if (r.handName === 'Flyout') flyouts++;
  }
  const rate = flyouts / N;
  assertClose(rate, 0.03, 0.18, `Low Three of a Kind flyout rate ~10%`);
}
{
  // High pair (10-14): bonus chips
  // Pair of 10s → +1 chip, Pair of Aces → +5 chips
  const tens = makeCards([[10,'H'],[10,'D'],[3,'C'],[5,'S'],[7,'H']]);
  const r10 = CardEngine.evaluateHand(tens);
  assert(r10.chips === HAND_TABLE[8].chips + 1, 'Pair of 10s: +1 bonus chip');

  const aces = makeCards([[14,'H'],[14,'D'],[3,'C'],[5,'S'],[7,'H']]);
  const rA = CardEngine.evaluateHand(aces);
  assert(rA.chips === HAND_TABLE[8].chips + 5, 'Pair of Aces: +5 bonus chips');
}
{
  // Mid-range (6-9): no modification
  const sixes = makeCards([[6,'H'],[6,'D'],[3,'C'],[9,'S'],[11,'H']]);
  const r = CardEngine.evaluateHand(sixes);
  // Mid-range pair should not get groundouted or get bonus chips
  // (occasionally might still be 'Pair' — just check it's not modified when it's Pair)
  if (r.handName === 'Pair') {
    assert(r.chips === HAND_TABLE[8].chips, 'Mid-range pair (6s): no modification');
  } else {
    // This shouldn't happen for rank 6 (only 2-5 get groundout)
    assert(false, 'Mid-range pair (6s): no modification (unexpected hand)');
  }
}

// ── 1c. Deck Integrity ─────────────────────────────────

group('1c. Deck Integrity');

{
  const ce = new CardEngine();
  // After construct: 52 unique cards
  const allCards = [...ce.deck, ...ce.hand, ...ce.discardPile];
  assert(allCards.length === 52, 'Fresh deck = 52 cards');

  const ids = new Set(allCards.map(c => c.id));
  assert(ids.size === 52, '52 unique card IDs');

  // 4 suits x 13 ranks
  const suits = new Set(allCards.map(c => c.suit));
  const ranks = new Set(allCards.map(c => c.rank));
  assert(suits.size === 4, '4 suits');
  assert(ranks.size === 13, '13 ranks');
}
{
  const ce = new CardEngine();
  ce.draw(5);
  assert(ce.deck.length === 47, 'draw(5) → deck=47');
  assert(ce.hand.length === 5, 'draw(5) → hand=5');
}
{
  const ce = new CardEngine();
  ce.draw(5);
  ce.discard([0, 1]);
  assert(ce.hand.length === 5, 'discard([0,1]) → hand still 5 (replacements drawn)');
  assert(ce.deck.length === 45, 'discard([0,1]) → deck=45');
}
{
  const ce = new CardEngine();
  ce.draw(5);
  ce.playHand([0, 1, 2, 3, 4]);
  assert(ce.hand.length === 0, 'playHand clears hand');
}
{
  const ce = new CardEngine();
  ce.draw(5);
  ce.playHand([0, 1, 2, 3, 4]);
  const hand = ce.newAtBat();
  assert(hand.length === 5, 'newAtBat gives 5 cards');
  assert(ce.discardsRemaining === 2, 'newAtBat resets discards to 2');
}
{
  // No duplicate IDs after multiple shuffles
  const ce = new CardEngine();
  ce.resetDeck();
  ce.shuffle();
  ce.shuffle();
  const ids = new Set(ce.deck.map(c => c.id));
  assert(ids.size === 52, 'No duplicate IDs after shuffles');
}

// ── 1d. Batter Modifiers ───────────────────────────────

group('1d. Batter Modifiers');

{
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);

  // Buck Fournier: power=9 → powerBonus = 9-5 = 4 (but plan says power 8 → +3; let's test actual)
  // Actually first batter is Moose Leblanc: power=5, contact=8, speed=8
  const batter = rm.getCurrentBatter();
  assert(batter.name === 'Moose Leblanc', 'Current batter is first in lineup');

  // Hit result
  const hitResult = { outcome: 'Single', handName: 'Pair', chips: 1, mult: 1.5, score: 2 };
  const { result, bonuses } = rm.applyBatterModifiers(hitResult, { inning: 1 });

  // power=5 → powerBonus = max(0, 5-5) = 0
  assert(bonuses.powerChips === 0, 'Power 5 → +0 chips on hits');

  // contact=8 → contactBonus = 8/10 = 0.8
  assert(bonuses.contactMult === 0.8, 'Contact 8 → +0.8 mult on hits');

  // speed=8 → extraBaseChance = 8 * 0.05 = 0.4
  assert(result.extraBaseChance === 0.4, 'Speed 8 → extraBaseChance = 0.4');
}
{
  // Test with higher power batter (Buck Fournier: power=9)
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  // Advance to batter index 2 (Buck Fournier, power=9)
  rm.advanceBatter(); // → index 1
  rm.advanceBatter(); // → index 2
  const batter = rm.getCurrentBatter();
  assert(batter.name === 'Buck Fournier', 'Advance to Buck Fournier');

  const hitResult = { outcome: 'Double', handName: 'Two Pair', chips: 2, mult: 2, score: 4 };
  const { result, bonuses } = rm.applyBatterModifiers(hitResult, { inning: 1 });
  assert(bonuses.powerChips === 4, 'Power 9 → +4 chips on hits');
}
{
  // Outs return unmodified result with zero bonuses
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  const outResult = { outcome: 'Strikeout', handName: 'High Card', chips: 0, mult: 1, score: 0 };
  const { result, bonuses } = rm.applyBatterModifiers(outResult, { inning: 1 });
  assert(bonuses.powerChips === 0 && bonuses.contactMult === 0, 'Outs: zero bonuses');
  assert(result.chips === 0, 'Outs: chips unmodified');
}

// ── 1e. Pitcher Modifiers ──────────────────────────────

group('1e. Pitcher Modifiers');

{
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);

  // Fresh pitcher at inning 1 → fatigue = 1.0
  const fatigue = rm._getPitcherFatigue(rm.pitcher, 1);
  assert(fatigue === 1.0, 'Fresh pitcher (inning 1) → fatigue = 1.0');
}
{
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);

  // Velocity/control penalties on hits
  const hitResult = { outcome: 'Single', handName: 'Pair', chips: 5, mult: 3, score: 15 };
  const modified = rm.applyPitcherModifiers(hitResult, { inning: 1 });
  // Pitcher is USA's ace: Viper Knox (velocity=10, control=4)
  // velPenalty = max(0, (10*1.0) - 6) = 4, chips = max(0, 5 - floor(4/2)) = 5-2 = 3
  // controlPenalty = (4*1.0) * 0.05 = 0.2, mult = max(1, 3 - 0.2) = 2.8
  assert(modified.chips === 3, 'Pitcher velocity penalty applied to Singles');
  assert(modified.mult === 2.8, 'Pitcher control penalty applied');
}
{
  // Stamina 5 pitcher at inning 9 → significant fatigue
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  // Viper Knox: stamina=5, fatigueStart = max(3, 5-1) = 4
  // inning 9: fatigueInnings = 9 - 4 = 5, fatigue = max(0.5, 1.0 - 5*0.08) = max(0.5, 0.6) = 0.6
  const fatigue = rm._getPitcherFatigue(rm.pitcher, 9);
  assert(fatigue === 0.6, 'Stamina 5 pitcher at inning 9 → fatigue = 0.6');
}
{
  // Score is recalculated after penalties
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  const hitResult = { outcome: 'Double', handName: 'Two Pair', chips: 4, mult: 3, score: 12 };
  const modified = rm.applyPitcherModifiers(hitResult, { inning: 1 });
  assert(modified.score === Math.round(modified.chips * modified.mult), 'Score recalculated after pitcher penalties');
}

// ── 1f. Trait Effects via EffectEngine ─────────────────

group('1f. Trait Effects via EffectEngine');

{
  // Pre: upgrade_lowest boosts lowest card (force chance=1.0)
  const cards = makeCards([[3,'H'],[7,'D'],[10,'C'],[12,'S'],[14,'H']]);
  const effect = { type: 'upgrade_lowest', chance: 1.0, amount: 3 };
  const result = EffectEngine.applyPre(cards, effect);
  assert(result[0].rank === 6, 'upgrade_lowest: rank 3 → 6 (+3)');
}
{
  // Pre: downgrade_highest reduces highest card (force chance=1.0)
  const cards = makeCards([[3,'H'],[7,'D'],[10,'C'],[12,'S'],[14,'H']]);
  const effect = { type: 'downgrade_highest', chance: 1.0, amount: 3 };
  const result = EffectEngine.applyPre(cards, effect);
  assert(result[4].rank === 11, 'downgrade_highest: rank 14 → 11 (-3)');
}
{
  // Post: add_mult with outs_eq: 2 fires only at 2 outs
  const evalResult = { outcome: 'Single', handName: 'Pair', chips: 1, mult: 1.5 };
  const effect = { type: 'add_mult', value: 3, condition: { type: 'outs_eq', value: 2 } };

  const at0 = EffectEngine.applyPost(evalResult, effect, { outs: 0 });
  assert(at0.mult === 1.5, 'add_mult with outs_eq:2 does NOT fire at 0 outs');

  const at2 = EffectEngine.applyPost(evalResult, effect, { outs: 2 });
  assert(at2.mult === 4.5, 'add_mult with outs_eq:2 fires at 2 outs (+3)');
}
{
  // Post: upgrade_outcome (Single→Double when hand_is Pair)
  const evalResult = { outcome: 'Single', handName: 'Pair', chips: 1, mult: 1.5 };
  const effect = {
    type: 'upgrade_outcome', from: 'Single', to: 'Double',
    addChips: 1, addMult: 0.5, newHandName: 'Pair (Slugger!)',
    condition: { type: 'hand_is', value: 'Pair' },
  };
  const r = EffectEngine.applyPost(evalResult, effect, {});
  assert(r.outcome === 'Double', 'upgrade_outcome: Single → Double');
  assert(r.chips === 2 && r.mult === 2, 'upgrade_outcome: chips/mult adjusted');
}
{
  // Post: prevent_outcome (Groundout→Single)
  const evalResult = { outcome: 'Groundout', handName: 'Groundout', chips: 0, mult: 1 };
  const effect = {
    type: 'prevent_outcome', from: 'Groundout',
    toOutcome: 'Single', toHand: 'Pair (Contact!)', chips: 1, mult: 1.5,
  };
  const r = EffectEngine.applyPost(evalResult, effect, {});
  assert(r.outcome === 'Single', 'prevent_outcome: Groundout → Single');
  assert(r.handName === 'Pair (Contact!)', 'prevent_outcome: handName updated');
}
{
  // Post: set_flag (sacrificeFly)
  const evalResult = { outcome: 'Strikeout', handName: 'High Card', chips: 0, mult: 1 };
  const effect = {
    type: 'set_flag', flag: 'sacrificeFly',
    condition: { type: 'and', conditions: [
      { type: 'outcome_is', value: 'Strikeout' },
      { type: 'runner_on', base: 2 },
    ]},
  };
  const gs = { bases: [false, false, true] };
  const r = EffectEngine.applyPost(evalResult, effect, gs);
  assert(r.sacrificeFly === true, 'set_flag: sacrificeFly set when strikeout + runner on 3rd');

  // Should NOT fire without runner on 3rd
  const gs2 = { bases: [true, false, false] };
  const r2 = EffectEngine.applyPost(evalResult, effect, gs2);
  assert(!r2.sacrificeFly, 'set_flag: sacrificeFly NOT set without runner on 3rd');
}
{
  // Compound effects chain correctly
  const evalResult = { outcome: 'Single', handName: 'Pair', chips: 1, mult: 1.5 };
  const effect = {
    type: 'compound',
    effects: [
      { type: 'add_mult', value: 2, condition: { type: 'outs_eq', value: 1 } },
      { type: 'add_mult', value: 4, condition: { type: 'outs_eq', value: 2 } },
    ],
  };
  const r1 = EffectEngine.applyPost(evalResult, effect, { outs: 1 });
  assert(r1.mult === 3.5, 'compound: +2 mult at 1 out');

  const r2 = EffectEngine.applyPost(evalResult, effect, { outs: 2 });
  assert(r2.mult === 5.5, 'compound: +4 mult at 2 outs');
}
{
  // Conditions: always
  assert(checkCondition({ type: 'always' }, {}, {}) === true, 'condition: always = true');
}
{
  // Conditions: inning_range
  assert(checkCondition({ type: 'inning_range', min: 7, max: 9 }, {}, { inning: 8 }) === true, 'condition: inning_range 7-9 at inning 8');
  assert(checkCondition({ type: 'inning_range', min: 7, max: 9 }, {}, { inning: 3 }) === false, 'condition: inning_range 7-9 at inning 3');
}
{
  // Conditions: bases_loaded
  assert(checkCondition({ type: 'bases_loaded' }, {}, { bases: [true, true, true] }) === true, 'condition: bases_loaded = true');
  assert(checkCondition({ type: 'bases_loaded' }, {}, { bases: [true, false, true] }) === false, 'condition: bases_loaded = false');
}
{
  // Conditions: or
  const cond = { type: 'or', conditions: [
    { type: 'outs_eq', value: 0 },
    { type: 'outs_eq', value: 2 },
  ]};
  assert(checkCondition(cond, {}, { outs: 0 }) === true, 'condition: or (0 outs)');
  assert(checkCondition(cond, {}, { outs: 1 }) === false, 'condition: or (1 out)');
  assert(checkCondition(cond, {}, { outs: 2 }) === true, 'condition: or (2 outs)');
}

// ── 1g. BaseballState ──────────────────────────────────

group('1g. BaseballState');

{
  // 3 outs → SWITCH_SIDE
  const bs = new BaseballState();
  bs.resolveOutcome('Strikeout');
  bs.resolveOutcome('Groundout');
  const r = bs.resolveOutcome('Flyout');
  assert(r.state === 'SWITCH_SIDE', '3 outs → SWITCH_SIDE');
}
{
  // Single with runner on 1st → runner to 2nd, batter to 1st (possibly further)
  const bs = new BaseballState();
  bs.bases = [true, false, false]; // runner on 1st
  bs.resolveOutcome('Single');
  // After single: runner on 1st moves to 2nd, batter goes to 1st
  assert(bs.bases[0] === true, 'Single: batter on 1st');
  assert(bs.bases[1] === true, 'Single: previous runner on 2nd');
}
{
  // Home Run with bases loaded → 4 runs
  const bs = new BaseballState();
  bs.bases = [true, true, true];
  const r = bs.resolveOutcome('Home Run');
  assert(r.runsScored === 4, 'Home Run with bases loaded → 4 runs');
  assert(bs.bases.every(b => !b), 'Bases cleared after HR');
}
{
  // processSacrificeFly: runner on 3rd scores + caller handles out
  const bs = new BaseballState();
  bs.bases = [false, false, true];
  const runs = bs.processSacrificeFly();
  assert(runs === 1, 'processSacrificeFly: 1 run scored');
  assert(bs.bases[2] === false, 'processSacrificeFly: runner on 3rd cleared');
}
{
  // processStolenBase: 1st→2nd
  const bs = new BaseballState();
  bs.bases = [true, false, false];
  bs.processStolenBase();
  assert(bs.bases[0] === false, 'processStolenBase: 1st vacated');
  assert(bs.bases[1] === true, 'processStolenBase: runner now on 2nd');
}
{
  // Chips accumulate from hand scores
  const bs = new BaseballState();
  bs.resolveOutcome('Single', 10);
  bs.resolveOutcome('Double', 20);
  assert(bs.totalChips === 30, 'Chips accumulate from hand scores');
}
{
  // 9 innings of 3 outs each → GAME_OVER (force opponent to score different)
  const bs = new BaseballState();
  for (let inning = 1; inning <= 9; inning++) {
    bs.resolveOutcome('Strikeout');
    bs.resolveOutcome('Strikeout');
    bs.resolveOutcome('Strikeout');
    // switchSide with simRuns to control opponent score
    bs.switchSide(inning === 5 ? 1 : 0); // opponent scores 1 run in inning 5 to break tie
  }
  assert(bs.state === 'GAME_OVER', '9 innings of 3 outs → GAME_OVER');
  assert(bs.inning > 9, 'Inning counter advanced past 9');
}
{
  // Tied after 9 → extras continue
  const bs = new BaseballState();
  for (let inning = 1; inning <= 9; inning++) {
    bs.resolveOutcome('Strikeout');
    bs.resolveOutcome('Strikeout');
    bs.resolveOutcome('Strikeout');
    bs.switchSide(0); // opponent scores 0 each inning → tied 0-0
  }
  assert(bs.state === 'BATTING', 'Tied after 9 → extras continue (BATTING)');
  assert(bs.inning === 10, 'Inning is 10 (extras)');
}
{
  // Double with runner on 1st → runner advances to 3rd (0+2=2), batter to 2nd
  const bs = new BaseballState();
  bs.bases = [true, false, false];
  const r = bs.resolveOutcome('Double');
  assert(r.runsScored === 0, 'Double with runner on 1st → runner to 3rd, 0 runs');
  assert(bs.bases[2] === true, 'Double: previous runner on 3rd');
  assert(bs.bases[1] === true, 'Double: batter on 2nd');
}
{
  // Triple with runner on 2nd → runner scores
  const bs = new BaseballState();
  bs.bases = [false, true, false];
  const r = bs.resolveOutcome('Triple');
  assert(r.runsScored === 1, 'Triple with runner on 2nd → 1 run scored');
}

// ── 1c-extra. Deck Exhaustion ────────────────────────────

group('1c-extra. Deck Exhaustion');

{
  // Deplete deck to < 5 cards → newAtBat() resets and gives 5 cards
  const ce = new CardEngine();
  while (ce.deck.length >= 5) {
    ce.hand = [];
    ce.draw(5);
    ce.playHand([0, 1, 2, 3, 4]);
  }
  assert(ce.deck.length < 5, 'Deck depleted to < 5 cards');
  const hand = ce.newAtBat();
  assert(hand.length === 5, 'newAtBat on near-empty deck still gives 5 cards');
}
{
  // Play 15+ consecutive at-bats draining the deck → no crash
  const ce = new CardEngine();
  let ok = true;
  for (let i = 0; i < 20; i++) {
    try {
      ce.newAtBat();
      ce.playHand([0, 1, 2, 3, 4]);
    } catch (e) { ok = false; break; }
  }
  assert(ok, '20 consecutive at-bats draining deck → no crash');
}
{
  // draw() on empty deck → returns current hand, no crash
  const ce = new CardEngine();
  ce.deck = [];
  ce.hand = [];
  const result = ce.draw(5);
  assert(Array.isArray(result), 'draw() on empty deck returns array');
  assert(result.length === 0, 'draw() on empty deck returns empty hand');
}
{
  // Heavy discard scenario (2 discards per at-bat, 10 at-bats) → no crash
  const ce = new CardEngine();
  let ok = true;
  for (let i = 0; i < 10; i++) {
    try {
      ce.newAtBat();
      if (ce.hand.length >= 2) ce.discard([0, 1]);
      if (ce.hand.length >= 2 && ce.discardsRemaining > 0) ce.discard([0, 1]);
      ce.playHand(ce.hand.map((_, j) => j));
    } catch (e) { ok = false; break; }
  }
  assert(ok, 'Heavy discard scenario (10 at-bats) → no crash');
}

// ── 1d-extra. Batter Cycling ─────────────────────────────

group('1d-extra. Batter Cycling');

{
  // 9 advanceBatter() calls wraps back to batter 0
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  assert(rm.currentBatterIndex === 0, 'Starts at batter 0');
  for (let i = 0; i < 9; i++) rm.advanceBatter();
  assert(rm.currentBatterIndex === 0, '9 advances wraps back to batter 0');
}
{
  // Batter index persists across innings (doesn't reset to 0)
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  rm.advanceBatter(); // → 1
  rm.advanceBatter(); // → 2
  rm.advanceBatter(); // → 3
  // Simulate inning change (nothing in RosterManager resets batter index)
  assert(rm.currentBatterIndex === 3, 'Batter index persists (3 after 3 advances)');
}
{
  // Player and opponent batter indices are independent
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  rm.advanceBatter(); // player → 1
  rm.advanceBatter(); // player → 2
  assert(rm.currentBatterIndex === 2, 'Player batter at 2');
  assert(rm.opponentBatterIndex === 0, 'Opponent batter still at 0');
}

// ── 1f-extra. Trait Combo Interactions ───────────────────

group('1f-extra. Trait Combo Interactions');

{
  // contact_lens overrides heater: Pitcher heater forces groundout on low pair,
  // then batter contact_lens converts back to Single (batter post runs after pitcher post)
  const heater = PITCHER_TRAITS.find(t => t.id === 'heater');
  const contactLens = BATTER_TRAITS.find(t => t.id === 'contact_lens');
  const pitcherPost = TraitManager.buildPitcherPostModifier([heater]);
  const batterPost = TraitManager.buildPostModifier([contactLens]);

  const evalResult = { outcome: 'Single', handName: 'Pair', chips: 1, mult: 1.5, score: 2 };
  // Pitcher post runs first: heater forces groundout on low Pair (chips <= 1)
  let result = pitcherPost(evalResult, {});
  assert(result.outcome === 'Groundout', 'Heater forces groundout on low Pair');
  // Batter post runs second: contact_lens converts Groundout back to Single
  result = batterPost(result, {});
  assert(result.outcome === 'Single', 'Contact lens overrides heater groundout → Single');
}
{
  // heater without contact_lens: Groundout sticks on low pair
  const heater = PITCHER_TRAITS.find(t => t.id === 'heater');
  const pitcherPost = TraitManager.buildPitcherPostModifier([heater]);
  const evalResult = { outcome: 'Single', handName: 'Pair', chips: 1, mult: 1.5, score: 2 };
  const result = pitcherPost(evalResult, {});
  assert(result.outcome === 'Groundout', 'Heater without contact_lens: groundout sticks');
}
{
  // heater bonus on strong hands: +2 chips on Three of a Kind
  const heater = PITCHER_TRAITS.find(t => t.id === 'heater');
  const pitcherPost = TraitManager.buildPitcherPostModifier([heater]);
  const evalResult = { outcome: 'Triple', handName: 'Three of a Kind', chips: 3, mult: 3, score: 9 };
  const result = pitcherPost(evalResult, {});
  assert(result.chips === 5, 'Heater: +2 chips on Three of a Kind');
}
{
  // slugger_serum + eye_of_the_tiger: Upgrade outcome + add_mult stack
  const slugger = BATTER_TRAITS.find(t => t.id === 'slugger_serum');
  const eye = BATTER_TRAITS.find(t => t.id === 'eye_of_the_tiger');
  const batterPost = TraitManager.buildPostModifier([slugger, eye]);
  const evalResult = { outcome: 'Single', handName: 'Pair', chips: 1, mult: 1.5, score: 2 };
  const result = batterPost(evalResult, { outs: 2 });
  assert(result.outcome === 'Double', 'Slugger upgrades Single → Double');
  // slugger adds +0.5 mult (1.5 → 2.0), eye adds +3 (2.0 → 5.0)
  assert(result.mult === 5, 'Eye of the Tiger stacks +3 mult on top of Slugger');
}
{
  // contact_lens no-op: When no groundout happens, contact_lens does nothing
  const contactLens = BATTER_TRAITS.find(t => t.id === 'contact_lens');
  const batterPost = TraitManager.buildPostModifier([contactLens]);
  const evalResult = { outcome: 'Double', handName: 'Two Pair', chips: 2, mult: 2, score: 4 };
  const result = batterPost(evalResult, {});
  assert(result.outcome === 'Double', 'Contact lens no-op: Double stays Double');
  assert(result.chips === 2 && result.mult === 2, 'Contact lens no-op: chips/mult unchanged');
}

// ── 1g-extra. Walk-Off Wins ──────────────────────────────

group('1g-extra. Walk-Off Wins');

{
  // Inning 9: player scores Home Run to take lead → GAME_OVER (walk-off)
  const bs = new BaseballState();
  bs.inning = 9;
  bs.half = 'top';
  bs.playerScore = 3;
  bs.opponentScore = 3;
  bs.outs = 0;
  bs.state = 'BATTING';
  const r = bs.resolveOutcome('Home Run');
  assert(r.runsScored >= 1, 'Walk-off HR scores at least 1 run');
  assert(bs.playerScore > bs.opponentScore, 'Player takes lead');
  assert(bs.state === 'GAME_OVER', 'Walk-off HR → GAME_OVER');
}
{
  // Inning 9 tied, opponent scores in switchSide → extras (inning 10)
  const bs = new BaseballState();
  bs.inning = 9;
  bs.half = 'top';
  bs.playerScore = 3;
  bs.opponentScore = 3;
  bs.outs = 0;
  // 3 outs to trigger SWITCH_SIDE
  bs.resolveOutcome('Strikeout');
  bs.resolveOutcome('Strikeout');
  bs.resolveOutcome('Strikeout');
  // Opponent scores 1 to tie-break... but then check extras logic
  bs.switchSide(0); // opponent scores 0, still tied
  assert(bs.state === 'BATTING', 'Tied after 9 → extras continue');
  assert(bs.inning === 10, 'Inning advances to 10');
}
{
  // Inning 10+ walk-off works
  const bs = new BaseballState();
  bs.inning = 10;
  bs.half = 'top';
  bs.playerScore = 4;
  bs.opponentScore = 4;
  bs.outs = 0;
  bs.state = 'BATTING';
  const r = bs.resolveOutcome('Home Run');
  assert(bs.state === 'GAME_OVER', 'Walk-off in extras (inning 10) → GAME_OVER');
}
{
  // Walk-off only triggers on hits, not outs
  const bs = new BaseballState();
  bs.inning = 9;
  bs.half = 'top';
  bs.playerScore = 5;
  bs.opponentScore = 3;
  bs.outs = 0;
  bs.state = 'BATTING';
  const r = bs.resolveOutcome('Strikeout');
  assert(bs.state !== 'GAME_OVER', 'Outs do not trigger walk-off even when leading');
}

// ── 1g-extra. Shop Flow ──────────────────────────────────

group('1g-extra. Shop Flow');

{
  // shouldShowShop true in innings 1-9, false in 10+
  const bs = new BaseballState();
  bs.inning = 5;
  assert(bs.shouldShowShop() === true, 'shouldShowShop true at inning 5');
  bs.inning = 10;
  assert(bs.shouldShowShop() === false, 'shouldShowShop false at inning 10');
}
{
  // markShopVisited prevents double-showing
  const bs = new BaseballState();
  bs.inning = 3;
  assert(bs.shouldShowShop() === true, 'Shop available at inning 3');
  bs.markShopVisited();
  assert(bs.shouldShowShop() === false, 'Shop not available after markShopVisited');
}
{
  // getShopBuyLimit: 1/2/3 by inning tier
  const bs = new BaseballState();
  bs.inning = 2;
  assert(bs.getShopBuyLimit() === 1, 'Buy limit = 1 at inning 2');
  bs.inning = 5;
  assert(bs.getShopBuyLimit() === 2, 'Buy limit = 2 at inning 5');
  bs.inning = 8;
  assert(bs.getShopBuyLimit() === 3, 'Buy limit = 3 at inning 8');
}
{
  // spendChips fails with insufficient funds
  const bs = new BaseballState();
  bs.totalChips = 10;
  const ok = bs.spendChips(15);
  assert(ok === false, 'spendChips fails with insufficient funds');
  assert(bs.totalChips === 10, 'Chips unchanged after failed spend');
}
{
  // spendChips deducts correctly
  const bs = new BaseballState();
  bs.totalChips = 50;
  const ok = bs.spendChips(20);
  assert(ok === true, 'spendChips succeeds with sufficient funds');
  assert(bs.totalChips === 30, 'Chips deducted correctly (50 - 20 = 30)');
}

// ═══════════════════════════════════════════════════════
//  PART 2: INTEGRATION — Full Game Simulation
// ═══════════════════════════════════════════════════════

group('2a. Single Game Walkthrough');

{
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const ce = new CardEngine();
  const bs = new BaseballState();
  const rm = new RosterManager(canada, 0, usa);
  const tm = new TraitManager();

  // Equip some traits
  const shopTraits = BATTER_TRAITS.slice(0, 2);
  for (const trait of shopTraits) {
    rm.equipTrait(0, trait);
    tm.markOwned(trait.id);
  }

  // Assign pitcher traits
  const pitcherTraits = PITCHER_TRAITS.slice(0, 1);
  rm.setPitcherTraits(pitcherTraits);

  let safetyCounter = 0;
  const maxAtBats = 500;

  while (!bs.isGameOver() && safetyCounter < maxAtBats) {
    safetyCounter++;

    if (bs.state === 'SWITCH_SIDE') {
      bs.switchSide();
      continue;
    }

    // New at-bat
    ce.newAtBat();

    // Build modifiers from batter traits
    const batter = rm.getCurrentBatter();
    const allTraits = [...(batter.traits || []), ...(rm.pitcher.traits || [])];
    const preMod = TraitManager.buildPreModifier(allTraits);
    const postMod = TraitManager.buildPostModifier(allTraits);
    const pitcherPreMod = TraitManager.buildPitcherPreModifier(rm.pitcher.traits || []);
    const pitcherPostMod = TraitManager.buildPitcherPostModifier(rm.pitcher.traits || []);

    // Combine pre-modifiers
    const combinedPre = (cards) => {
      let c = cards;
      if (preMod) c = preMod(c);
      if (pitcherPreMod) c = pitcherPreMod(c);
      return c;
    };

    // Play random selection of 1-5 cards
    const handSize = ce.hand.length;
    const selectCount = Math.min(handSize, Math.floor(Math.random() * 5) + 1);
    const indices = [];
    const available = Array.from({ length: handSize }, (_, i) => i);
    for (let i = 0; i < selectCount; i++) {
      const pick = Math.floor(Math.random() * available.length);
      indices.push(available.splice(pick, 1)[0]);
    }

    const evalResult = ce.playHand(indices, combinedPre, null, null);

    // Apply post modifiers manually
    let finalResult = { ...evalResult };
    if (postMod) finalResult = postMod(finalResult, bs.getStatus());
    if (pitcherPostMod) finalResult = pitcherPostMod(finalResult, bs.getStatus());

    // Apply batter/pitcher stat modifiers
    const { result: afterBatter } = rm.applyBatterModifiers(finalResult, bs.getStatus());
    const afterPitcher = rm.applyPitcherModifiers(afterBatter, bs.getStatus());

    // Resolve
    bs.resolveOutcome(afterPitcher.outcome, afterPitcher.score);
    rm.advanceBatter();
  }

  assert(bs.isGameOver(), 'Full game reaches GAME_OVER');
  const result = bs.getResult();
  assert(typeof result.playerScore === 'number' && !isNaN(result.playerScore), 'Player score is a number');
  assert(typeof result.opponentScore === 'number' && !isNaN(result.opponentScore), 'Opponent score is a number');
  assert(typeof result.totalChips === 'number' && !isNaN(result.totalChips), 'Total chips is a number');
  assert(safetyCounter < maxAtBats, `Game completed within ${maxAtBats} at-bats (took ${safetyCounter})`);
}

// ── 2b. Statistical Sim ────────────────────────────────

group('2b. Statistical Sim (N=100 games)');

{
  const N_GAMES = 100;
  let crashes = 0;
  let totalPlayerRuns = 0;
  let totalOpponentRuns = 0;
  let wins = 0;
  let totalChipsEarned = 0;
  const outcomeCount = {};
  let totalAtBats = 0;

  for (let g = 0; g < N_GAMES; g++) {
    try {
      const canada = TEAMS.find(t => t.id === 'CAN');
      const opponents = TEAMS.filter(t => t.id !== 'CAN');
      const opp = opponents[g % opponents.length];
      const ce = new CardEngine();
      const bs = new BaseballState();
      const rm = new RosterManager(canada, 0, opp);

      // Random traits
      const traitPool = [...BATTER_TRAITS];
      for (let i = 0; i < 3 && i < traitPool.length; i++) {
        rm.equipTrait(i % 9, traitPool[i]);
      }
      rm.setPitcherTraits(PITCHER_TRAITS.slice(0, 1));

      let safety = 0;
      while (!bs.isGameOver() && safety < 500) {
        safety++;

        if (bs.state === 'SWITCH_SIDE') {
          bs.switchSide();
          continue;
        }

        ce.newAtBat();
        totalAtBats++;

        const handSize = ce.hand.length;
        const selectCount = Math.min(handSize, Math.floor(Math.random() * 5) + 1);
        const available = Array.from({ length: handSize }, (_, i) => i);
        const indices = [];
        for (let i = 0; i < selectCount; i++) {
          const pick = Math.floor(Math.random() * available.length);
          indices.push(available.splice(pick, 1)[0]);
        }

        const evalResult = ce.playHand(indices);
        const { result } = rm.applyBatterModifiers(evalResult, bs.getStatus());
        const final = rm.applyPitcherModifiers(result, bs.getStatus());

        outcomeCount[final.outcome] = (outcomeCount[final.outcome] || 0) + 1;
        bs.resolveOutcome(final.outcome, final.score);
        rm.advanceBatter();
      }

      const res = bs.getResult();
      if (res) {
        totalPlayerRuns += res.playerScore;
        totalOpponentRuns += res.opponentScore;
        totalChipsEarned += res.totalChips;
        if (res.won) wins++;
      }
    } catch (e) {
      crashes++;
      console.log(`  \x1b[31mCRASH in game ${g}: ${e.message}\x1b[0m`);
      console.log(`  ${e.stack?.split('\n')[1]?.trim()}`);
    }
  }

  assert(crashes === 0, `0 crashes in ${N_GAMES} games`);

  // Print statistics
  console.log(`\n\x1b[1m  ── Statistics (${N_GAMES} games) ──\x1b[0m`);
  console.log(`  Avg player runs/game:   ${(totalPlayerRuns / N_GAMES).toFixed(1)}`);
  console.log(`  Avg opponent runs/game: ${(totalOpponentRuns / N_GAMES).toFixed(1)}`);
  console.log(`  Player win rate:        ${((wins / N_GAMES) * 100).toFixed(1)}%`);
  console.log(`  Avg chips earned:       ${(totalChipsEarned / N_GAMES).toFixed(0)}`);
  console.log(`  Avg at-bats/game:       ${(totalAtBats / N_GAMES).toFixed(1)}`);
  console.log(`\n  \x1b[1mOutcome breakdown:\x1b[0m`);
  const sorted = Object.entries(outcomeCount).sort((a, b) => b[1] - a[1]);
  for (const [outcome, count] of sorted) {
    const pct = ((count / totalAtBats) * 100).toFixed(1);
    console.log(`    ${outcome.padEnd(20)} ${count.toString().padStart(5)}  (${pct}%)`);
  }
}

// ═══════════════════════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(50));
console.log(`\x1b[1m  RESULTS: \x1b[32m${passed} passed\x1b[0m, \x1b[${failed > 0 ? '31' : '32'}m${failed} failed\x1b[0m`);
if (failures.length > 0) {
  console.log('\n  \x1b[31mFailures:\x1b[0m');
  for (const f of failures) {
    console.log(`    - ${f}`);
  }
}
console.log('═'.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);

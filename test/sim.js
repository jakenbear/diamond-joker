/**
 * Aces Loaded! — Headless Simulation Test Suite
 * Run: node test/sim.js
 */

import CardEngine from '../src/CardEngine.js';
import BaseballState from '../src/BaseballState.js';
import RosterManager, { PITCH_TYPES } from '../src/RosterManager.js';
import TraitManager from '../src/TraitManager.js';
import EffectEngine, { checkCondition } from '../src/EffectEngine.js';
import HAND_TABLE from '../data/hand_table.js';
import TEAMS from '../data/teams.js';
import BATTER_TRAITS from '../data/batter_traits.js';
import PITCHER_TRAITS from '../data/pitcher_traits.js';
import COACHES from '../data/coaches.js';
import MASCOTS from '../data/mascots.js';
import BONUS_PLAYERS from '../data/bonus_players.js';

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
  // Pair with Aces (high rank, low groundout chance ~8%)
  // Retry to account for rank quality groundout chance
  let found = false;
  for (let i = 0; i < 50; i++) {
    const pair = makeCards([[14,'H'],[14,'D'],[3,'C'],[5,'S'],[7,'H']]);
    const r = CardEngine.evaluateHand(pair);
    if (r.handName === 'Pair') {
      // Aces get +5 bonus chips: base 1 + 5 = 6
      assert(r.chips === 6 && r.mult === 1.5, 'Pair chips/mult (Aces: 6 chips, 1.5 mult)');
      found = true;
      break;
    }
  }
  assert(found, 'Pair detected (Aces, within 50 tries)');
}
{
  const hc = makeCards([[2,'H'],[5,'D'],[8,'C'],[11,'S'],[13,'H']]);
  const r = CardEngine.evaluateHand(hc);
  assert(r.handName === 'High Card', 'High Card detected');
  assert(r.chips === 0 && r.mult === 1, 'High Card chips/mult');
}
{
  // 2-card selection → Pair (Aces to minimize groundout chance)
  let found = false;
  for (let i = 0; i < 50; i++) {
    const twoCards = makeCards([[14,'H'],[14,'D']]);
    const r = CardEngine.evaluateHand(twoCards);
    if (r.handName === 'Pair') { found = true; break; }
  }
  assert(found, '2 matching cards → Pair (within 50 tries)');
}
{
  // 1-card selection → High Card
  const oneCard = makeCards([[14,'S']]);
  const r = CardEngine.evaluateHand(oneCard);
  assert(r.handName === 'High Card', '1 card → High Card');
}
{
  // playedDescription populated (use Aces to minimize groundout chance)
  let found = false;
  for (let i = 0; i < 50; i++) {
    const pair = makeCards([[14,'H'],[14,'D'],[3,'C'],[5,'S'],[7,'H']]);
    const r = CardEngine.evaluateHand(pair);
    if (r.handName === 'Pair') {
      assert(r.playedDescription === 'Pair of As', 'playedDescription populated ("Pair of As")');
      found = true;
      break;
    }
  }
  assert(found, 'playedDescription test: got Pair within 50 tries');
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
  // Low pair (rank 3): ~74% out rate (0.80 - (3-2)*0.06 = 0.74), split groundout/flyout
  let outs = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const cards = makeCards([[3,'H'],[3,'D'],[7,'C'],[9,'S'],[11,'H']]);
    const r = CardEngine.evaluateHand(cards);
    if (r.handName === 'Groundout' || r.handName === 'Flyout') outs++;
  }
  const rate = outs / N;
  assertClose(rate, 0.64, 0.84, `Low Pair (3s) out rate ~74%`);
}
{
  // Mid pair (rank 8): ~44% out rate (0.80 - 6*0.06 = 0.44)
  let outs = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const cards = makeCards([[8,'H'],[8,'D'],[3,'C'],[5,'S'],[11,'H']]);
    const r = CardEngine.evaluateHand(cards);
    if (r.handName === 'Groundout' || r.handName === 'Flyout') outs++;
  }
  const rate = outs / N;
  assertClose(rate, 0.34, 0.54, `Mid Pair (8s) out rate ~44%`);
}
{
  // High pair (rank A): ~8% out rate (0.80 - 12*0.06 = 0.08)
  let outs = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const cards = makeCards([[14,'H'],[14,'D'],[3,'C'],[5,'S'],[7,'H']]);
    const r = CardEngine.evaluateHand(cards);
    if (r.handName === 'Groundout' || r.handName === 'Flyout') outs++;
  }
  const rate = outs / N;
  assertClose(rate, 0.02, 0.16, `High Pair (Aces) out rate ~8%`);
}
{
  // Low Two Pair: ~20% out rate, split groundout/flyout
  let outs = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const cards = makeCards([[3,'H'],[3,'D'],[4,'C'],[4,'S'],[11,'H']]);
    const r = CardEngine.evaluateHand(cards);
    if (r.handName === 'Groundout' || r.handName === 'Flyout') outs++;
  }
  const rate = outs / N;
  assertClose(rate, 0.10, 0.30, `Low Two Pair out rate ~20%`);
}
{
  // Low Three of a Kind: ~10% flyout rate (unchanged)
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
  // High pair bonus chips still apply when pair survives out check
  // Run many trials to get one that survives (Aces have 92% survival)
  let found = false;
  for (let i = 0; i < 100; i++) {
    const tens = makeCards([[10,'H'],[10,'D'],[3,'C'],[5,'S'],[7,'H']]);
    const r10 = CardEngine.evaluateHand(tens);
    if (r10.handName === 'Pair') {
      assert(r10.chips === HAND_TABLE[8].chips + 1, 'Pair of 10s (when surviving): +1 bonus chip');
      found = true;
      break;
    }
  }
  if (!found) assert(false, 'Pair of 10s: could not get surviving pair in 100 tries');
}
{
  // Pair groundout carries pairRank for contact save
  const cards = makeCards([[3,'H'],[3,'D'],[7,'C'],[9,'S'],[11,'H']]);
  let foundGroundout = false;
  for (let i = 0; i < 50; i++) {
    const r = CardEngine.evaluateHand(cards);
    if (r.wasGroundout) {
      assert(r.pairRank === 3, 'Groundout from pair carries pairRank');
      foundGroundout = true;
      break;
    }
  }
  if (!foundGroundout) assert(false, 'Could not get groundout from low pair in 50 tries');
}
{
  // Contact save: high contact batter rescues groundout pairs (statistical)
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const N = 2000;
  let lowContactSaves = 0, highContactSaves = 0;
  // Test with a pair of 6s (outChance ~56%)
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    // Force batter to have contact=3
    rm.roster[0] = { ...rm.roster[0], contact: 3 };
    const groundoutResult = {
      outcome: 'Groundout', handName: 'Groundout', chips: 0, mult: 1, score: 0,
      wasGroundout: true, originalHand: 'Pair', pairRank: 6,
    };
    const { bonuses } = rm.applyBatterModifiers(groundoutResult, { inning: 1 });
    if (bonuses.contactSave) lowContactSaves++;
  }
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    rm.roster[0] = { ...rm.roster[0], contact: 9 };
    const groundoutResult = {
      outcome: 'Groundout', handName: 'Groundout', chips: 0, mult: 1, score: 0,
      wasGroundout: true, originalHand: 'Pair', pairRank: 6,
    };
    const { bonuses } = rm.applyBatterModifiers(groundoutResult, { inning: 1 });
    if (bonuses.contactSave) highContactSaves++;
  }
  assert(highContactSaves > lowContactSaves,
    `High contact saves more (${highContactSaves}) than low contact (${lowContactSaves})`);
  assertClose(lowContactSaves / N, 0.05, 0.21, `Contact 3 save rate ~12%`);
  assertClose(highContactSaves / N, 0.26, 0.46, `Contact 9 save rate ~36%`);
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
  assert(ce.hand.length === 8, 'discard([0,1]) → hand still 8 (replacements drawn)');
  assert(ce.deck.length === 42, 'discard([0,1]) → deck=42');
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
  assert(hand.length === 8, 'newAtBat gives 8 cards');
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

// ── 1h. Pitch Type Modifiers ────────────────────────────

group('1h. Pitch Type Modifiers');

{
  // PITCH_TYPES export exists with expected keys
  assert(PITCH_TYPES.fastball && PITCH_TYPES.breaking && PITCH_TYPES.slider && PITCH_TYPES.changeup && PITCH_TYPES.ibb,
    'PITCH_TYPES has fastball, breaking, slider, changeup, ibb');
}
{
  // Fastball hit rate < changeup hit rate (statistical, N=2000)
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const N = 2000;
  let fastballHits = 0, changeupHits = 0;
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    const bases = [false, false, false];
    const fb = rm.simSingleAtBat(1, 'fastball', bases);
    if (!fb.isOut && !fb.walked) fastballHits++;
  }
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    const bases = [false, false, false];
    const cu = rm.simSingleAtBat(1, 'changeup', bases);
    if (!cu.isOut && !cu.walked) changeupHits++;
  }
  assert(fastballHits < changeupHits, `Fastball hit rate (${fastballHits}) < changeup hit rate (${changeupHits})`);
}
{
  // Fastball K rate > changeup K rate (statistical, N=2000)
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const N = 2000;
  let fastballKs = 0, changeupKs = 0;
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    const bases = [false, false, false];
    const fb = rm.simSingleAtBat(1, 'fastball', bases);
    if (fb.outcome === 'Strikeout') fastballKs++;
  }
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    const bases = [false, false, false];
    const cu = rm.simSingleAtBat(1, 'changeup', bases);
    if (cu.outcome === 'Strikeout') changeupKs++;
  }
  assert(fastballKs > changeupKs, `Fastball K rate (${fastballKs}) > changeup K rate (${changeupKs})`);
}
{
  // Fastball XBH rate > changeup XBH rate (statistical, N=3000)
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const N = 3000;
  let fastballXBH = 0, changeupXBH = 0;
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    const bases = [false, false, false];
    const fb = rm.simSingleAtBat(1, 'fastball', bases);
    if (['Double', 'Triple', 'Home Run'].includes(fb.outcome)) fastballXBH++;
  }
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    const bases = [false, false, false];
    const cu = rm.simSingleAtBat(1, 'changeup', bases);
    if (['Double', 'Triple', 'Home Run'].includes(cu.outcome)) changeupXBH++;
  }
  assert(fastballXBH > changeupXBH, `Fastball XBH (${fastballXBH}) > changeup XBH (${changeupXBH})`);
}
{
  // Slider XBH rate < fastball XBH rate (lowest XBH mult at 0.5x)
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const N = 3000;
  let sliderXBH = 0, fastballXBH = 0;
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    const bases = [false, false, false];
    const sl = rm.simSingleAtBat(1, 'slider', bases);
    if (['Double', 'Triple', 'Home Run'].includes(sl.outcome)) sliderXBH++;
  }
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    const bases = [false, false, false];
    const fb = rm.simSingleAtBat(1, 'fastball', bases);
    if (['Double', 'Triple', 'Home Run'].includes(fb.outcome)) fastballXBH++;
  }
  assert(sliderXBH < fastballXBH, `Slider XBH (${sliderXBH}) < fastball XBH (${fastballXBH})`);
}
{
  // Slider stamina cost is 3%
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  rm.simSingleAtBat(1, 'slider', [false, false, false]);
  assertClose(rm.getMyPitcherStamina(), 0.96, 0.98, 'Stamina after slider ~0.97');
}
{
  // Breaking ball walk rate with low control pitcher (control=3 → 12% walk chance)
  // Use a custom pitcher with low control
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const N = 2000;
  let walks = 0;
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    rm.myPitcher = { ...rm.myPitcher, control: 3 };
    const bases = [false, false, false];
    const r = rm.simSingleAtBat(1, 'breaking', bases);
    if (r.walked) walks++;
  }
  const walkRate = walks / N;
  assertClose(walkRate, 0.05, 0.20, `Breaking ball walk rate with control 3 ~12%`);
}
{
  // Breaking ball no walks with high control (control=6+)
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const N = 500;
  let walks = 0;
  for (let i = 0; i < N; i++) {
    const rm = new RosterManager(canada, 0, usa);
    rm.myPitcher = { ...rm.myPitcher, control: 7 };
    const bases = [false, false, false];
    const r = rm.simSingleAtBat(1, 'breaking', bases);
    if (r.walked) walks++;
  }
  assert(walks === 0, `Breaking ball 0 walks with control 7 (got ${walks})`);
}
{
  // IBB always walks
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  const bases = [null, null, null];
  const r = rm.simSingleAtBat(1, 'ibb', bases);
  assert(r.walked === true, 'IBB always walks');
  assert(r.outcome === 'Walk (IBB)', 'IBB outcome is Walk (IBB)');
  assert(!!bases[0], 'IBB puts batter on 1st');
}
{
  // Stamina drains correctly per pitch type
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  assert(rm.getMyPitcherStamina() === 1.0, 'Stamina starts at 1.0');
  const bases = [false, false, false];
  rm.simSingleAtBat(1, 'fastball', bases);
  assertClose(rm.getMyPitcherStamina(), 0.93, 0.95, 'Stamina after fastball ~0.94');
  rm.simSingleAtBat(1, 'changeup', [false, false, false]);
  assertClose(rm.getMyPitcherStamina(), 0.91, 0.93, 'Stamina after changeup ~0.92');
  rm.simSingleAtBat(1, 'ibb', [false, false, false]);
  assertClose(rm.getMyPitcherStamina(), 0.91, 0.93, 'Stamina unchanged after IBB');
}
{
  // Existing simOpponentHalfInning backward compat
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  const sim = rm.simOpponentHalfInning(1);
  assert(typeof sim.runs === 'number', 'simOpponentHalfInning still returns runs');
  assert(Array.isArray(sim.log), 'simOpponentHalfInning still returns log array');
  assert(sim.log.length >= 3, 'simOpponentHalfInning log has at least 3 entries (3 outs)');
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
  assert(!!bs.bases[0], 'Single: batter on 1st');
  assert(!!bs.bases[1], 'Single: previous runner on 2nd');
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
  assert(!bs.bases[2], 'processSacrificeFly: runner on 3rd cleared');
}
{
  // processStolenBase: 1st→2nd
  const bs = new BaseballState();
  bs.bases = [true, false, false];
  bs.processStolenBase();
  assert(!bs.bases[0], 'processStolenBase: 1st vacated');
  assert(!!bs.bases[1], 'processStolenBase: runner now on 2nd');
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
  assert(!!bs.bases[2], 'Double: previous runner on 3rd');
  assert(!!bs.bases[1], 'Double: batter on 2nd');
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
  assert(hand.length === 8, 'newAtBat on near-empty deck still gives 8 cards');
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
{
  // Discard with nearly empty deck reshuffles and refills hand to 5
  const ce = new CardEngine();
  // Drain deck to exactly 3 cards remaining
  while (ce.deck.length > 3) {
    ce.hand = [];
    ce.draw(5);
    ce.playHand([0, 1, 2, 3, 4]);
  }
  ce.hand = [];
  ce.draw(5); // draws only 3 from deck (deck now 0), hand has 3
  // Now discard 2 — needs to reshuffle discard pile to draw replacements
  const result = ce.discard([0, 1]);
  assert(result.length === 8, `Discard with empty deck refills hand to 8 (got ${result.length})`);
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
//  SMART TEST BRAIN — plays like a real player
// ═══════════════════════════════════════════════════════

/**
 * Evaluate every non-empty subset of a hand, return the best play.
 * Prefers highest score; breaks ties by preferring more cards (5-card hands
 * unlock flushes/straights). Avoids Strikeout (score 0) when possible.
 */
function findBestPlay(hand) {
  let bestScore = -1;
  let bestSize = 0;
  let bestIndices = [0];

  for (let mask = 1; mask < (1 << hand.length); mask++) {
    const indices = [];
    for (let i = 0; i < hand.length; i++) {
      if (mask & (1 << i)) indices.push(i);
    }
    const cards = indices.map(i => hand[i]);
    const result = CardEngine.evaluateHand(cards);

    // Rank: score first, then prefer more cards for tie-breaking
    const score = result.score;
    if (score > bestScore || (score === bestScore && indices.length > bestSize)) {
      bestScore = score;
      bestSize = indices.length;
      bestIndices = indices;
    }
  }

  return bestIndices;
}

/**
 * Decide which card indices to discard (if any).
 * Strategy:
 *  - If we already have a pair+ (score > 0), don't discard
 *  - If 4-to-a-flush, keep the 4 suited cards, discard the outlier
 *  - If we have a pair, keep the pair + highest kicker, discard 2
 *  - Otherwise keep 2 highest cards, discard 3
 */
function pickDiscards(hand) {
  // Check current best
  const bestIndices = findBestPlay(hand);
  const bestCards = bestIndices.map(i => hand[i]);
  const bestResult = CardEngine.evaluateHand(bestCards);
  if (bestResult.score > 0) return []; // already have a hit, don't risk it

  // 4-to-a-flush check
  const suitCounts = {};
  for (let i = 0; i < hand.length; i++) {
    const s = hand[i].suit;
    if (!suitCounts[s]) suitCounts[s] = [];
    suitCounts[s].push(i);
  }
  for (const indices of Object.values(suitCounts)) {
    if (indices.length >= 4) {
      // Keep these 4, discard the rest
      const keepSet = new Set(indices);
      return hand.map((_, i) => i).filter(i => !keepSet.has(i));
    }
  }

  // 4-to-a-straight check
  const sorted = hand.map((c, i) => ({ rank: c.rank, idx: i })).sort((a, b) => a.rank - b.rank);
  for (let start = 0; start <= sorted.length - 4; start++) {
    const window = sorted.slice(start, start + 4);
    const uniqueRanks = new Set(window.map(c => c.rank));
    if (uniqueRanks.size === 4) {
      const minR = window[0].rank;
      const maxR = window[3].rank;
      if (maxR - minR <= 4) {
        // Keep these 4, discard the outlier
        const keepSet = new Set(window.map(c => c.idx));
        return hand.map((_, i) => i).filter(i => !keepSet.has(i));
      }
    }
  }

  // Keep paired cards
  const rankIndices = {};
  for (let i = 0; i < hand.length; i++) {
    const r = hand[i].rank;
    if (!rankIndices[r]) rankIndices[r] = [];
    rankIndices[r].push(i);
  }
  const pairedIndices = [];
  for (const indices of Object.values(rankIndices)) {
    if (indices.length >= 2) pairedIndices.push(...indices);
  }
  if (pairedIndices.length > 0) {
    const keepSet = new Set(pairedIndices);
    return hand.map((_, i) => i).filter(i => !keepSet.has(i));
  }

  // No draws, no pairs: keep 2 highest, discard 3
  const byRank = hand.map((c, i) => ({ rank: c.rank, idx: i })).sort((a, b) => b.rank - a.rank);
  const keepSet = new Set([byRank[0].idx, byRank[1].idx]);
  return hand.map((_, i) => i).filter(i => !keepSet.has(i));
}

/**
 * Average brain — plays like a casual human.
 * - Looks at the full 5-card hand first (no subset hunting)
 * - Spots obvious pairs/two-pairs but misses straights ~60% and flushes ~40% of the time
 * - Uses at most 1 discard, and only if the hand is garbage
 * - Sometimes plays "good enough" hands without optimizing
 */
function averageFindPlay(hand) {
  // First, evaluate the full 5-card hand (what most players try first)
  const fullResult = CardEngine.evaluateHand(hand);
  const fullScore = fullResult.score;

  // If we got Two Pair or better from all 5, just play it
  if (fullScore >= 4) {
    return hand.map((_, i) => i);
  }

  // If full hand is a pair, 70% chance we just play all 5 (don't optimize)
  if (fullResult.handName === 'Pair' || fullResult.handName === 'Groundout') {
    if (Math.random() < 0.7) return hand.map((_, i) => i);
  }

  // Otherwise look for pairs/trips in subsets (but only obvious ones)
  // Check for pairs by scanning for matching ranks
  const rankMap = {};
  for (let i = 0; i < hand.length; i++) {
    const r = hand[i].rank;
    if (!rankMap[r]) rankMap[r] = [];
    rankMap[r].push(i);
  }

  // Play the biggest group we find
  let bestGroup = [];
  for (const indices of Object.values(rankMap)) {
    if (indices.length > bestGroup.length) bestGroup = indices;
    else if (indices.length === bestGroup.length && indices.length >= 2) {
      // Two pairs — play both pairs
      bestGroup = [...bestGroup, ...indices];
    }
  }

  if (bestGroup.length >= 2) return bestGroup;

  // No pairs found — just play all 5 and hope for the best
  return hand.map((_, i) => i);
}

function averagePickDiscards(hand) {
  const fullResult = CardEngine.evaluateHand(hand);

  // If we have a pair or better, don't discard (good enough)
  if (fullResult.score > 0 && fullResult.handName !== 'Groundout') return [];

  // 30% chance we don't bother discarding even with a bad hand (lazy/impatient)
  if (Math.random() < 0.3) return [];

  // Keep paired cards, discard the rest (basic strategy)
  const rankMap = {};
  for (let i = 0; i < hand.length; i++) {
    const r = hand[i].rank;
    if (!rankMap[r]) rankMap[r] = [];
    rankMap[r].push(i);
  }
  const keepers = new Set();
  for (const indices of Object.values(rankMap)) {
    if (indices.length >= 2) indices.forEach(i => keepers.add(i));
  }

  if (keepers.size > 0) {
    return hand.map((_, i) => i).filter(i => !keepers.has(i));
  }

  // No pairs — keep 2 highest, discard 3
  const sorted = hand.map((c, i) => ({ rank: c.rank, idx: i })).sort((a, b) => b.rank - a.rank);
  const keep = new Set([sorted[0].idx, sorted[1].idx]);
  return hand.map((_, i) => i).filter(i => !keep.has(i));
}

function averageAtBat(ce) {
  // Only use 1 discard max
  if (ce.discardsRemaining > 0) {
    const toDiscard = averagePickDiscards(ce.hand);
    if (toDiscard.length > 0) ce.discard(toDiscard);
  }
  const indices = averageFindPlay(ce.hand);
  return ce.playHand(indices);
}

/**
 * Full smart at-bat: discard if needed, then pick best play.
 */
function smartAtBat(ce) {
  // Discard phase (use up to 2 discards)
  for (let d = 0; d < 2; d++) {
    if (ce.discardsRemaining <= 0) break;
    const toDiscard = pickDiscards(ce.hand);
    if (toDiscard.length === 0) break;
    ce.discard(toDiscard);
  }
  // Play best hand
  const indices = findBestPlay(ce.hand);
  return ce.playHand(indices);
}

// ═══════════════════════════════════════════════════════
//  PART 2: INTEGRATION — Full Game Simulation
// ═══════════════════════════════════════════════════════

group('2a. Single Game Walkthrough (smart brain)');

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

    // Smart play: discard then pick best hand
    for (let d = 0; d < 2; d++) {
      if (ce.discardsRemaining <= 0) break;
      const toDiscard = pickDiscards(ce.hand);
      if (toDiscard.length === 0) break;
      ce.discard(toDiscard);
    }
    const indices = findBestPlay(ce.hand);
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

group('2b. Statistical Sim — smart brain (N=100 games)');

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

        const evalResult = smartAtBat(ce);
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
  console.log(`\n\x1b[1m  ── Statistics (${N_GAMES} games, smart brain) ──\x1b[0m`);
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

// ── 2c. Statistical Sim — Average Brain ─────────────────

group('2c. Statistical Sim — average brain (N=100 games)');

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

        const evalResult = averageAtBat(ce);
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

  assert(crashes === 0, `0 crashes in ${N_GAMES} games (avg brain)`);

  console.log(`\n\x1b[1m  ── Statistics (${N_GAMES} games, average brain) ──\x1b[0m`);
  console.log(`  Avg player runs/game:   ${(totalPlayerRuns / N_GAMES).toFixed(1)}`);
  console.log(`  Avg opponent runs/game: ${(totalOpponentRuns / N_GAMES).toFixed(1)}`);
  console.log(`  Player win rate:        ${((wins / N_GAMES) * 100).toFixed(1)}%`);
  console.log(`  Avg chips earned:       ${(totalChipsEarned / N_GAMES).toFixed(0)}`);
  console.log(`  Avg at-bats/game:       ${(totalAtBats / N_GAMES).toFixed(1)}`);
  console.log(`\n  \x1b[1mOutcome breakdown:\x1b[0m`);
  const sorted2 = Object.entries(outcomeCount).sort((a, b) => b[1] - a[1]);
  for (const [outcome, count] of sorted2) {
    const pct = ((count / totalAtBats) * 100).toFixed(1);
    console.log(`    ${outcome.padEnd(20)} ${count.toString().padStart(5)}  (${pct}%)`);
  }
}

// ═══════════════════════════════════════════════════════
//  COUNT SYSTEM TESTS
// ═══════════════════════════════════════════════════════

import CountManager, { COUNT_MODIFIERS } from '../src/CountManager.js';

group('Count System: Basic State');

{
  const cm = new CountManager();
  const count = cm.getCount();
  assert(count.balls === 0 && count.strikes === 0, 'New CountManager starts at 0-0');
}
{
  const cm = new CountManager();
  cm.balls = 2;
  cm.strikes = 1;
  cm.reset();
  const count = cm.getCount();
  assert(count.balls === 0 && count.strikes === 0, 'reset() clears count to 0-0');
}
{
  const cm = new CountManager();
  assert(!cm.isWalk(), 'isWalk() false at 0 balls');
  cm.balls = 3;
  assert(!cm.isWalk(), 'isWalk() false at 3 balls');
  cm.balls = 4;
  assert(cm.isWalk(), 'isWalk() true at 4 balls');
}
{
  const cm = new CountManager();
  cm.setStartingBalls(1);
  assert(cm.getCount().balls === 1, 'setStartingBalls(1) sets balls to 1');
  cm.setStartingBalls(5);
  assert(cm.getCount().balls === 3, 'setStartingBalls(5) caps at 3');
}

group('Count System: recordDiscard');

{
  // High control pitcher (7+): never throws balls
  const cm = new CountManager();
  let anyBall = false;
  for (let i = 0; i < 200; i++) {
    cm.reset();
    const result = cm.recordDiscard(8);
    if (result.isBall) anyBall = true;
  }
  assert(!anyBall, 'Control 8 pitcher never throws balls (200 trials)');
}
{
  // Strike increments correctly
  const cm = new CountManager();
  const r1 = cm.recordDiscard(10); // control 10 = no balls
  assert(r1.isStrike && cm.getCount().strikes === 1, 'First discard: strike 1');
  const r2 = cm.recordDiscard(10);
  assert(r2.isStrike && cm.getCount().strikes === 2, 'Second discard: strike 2');
  const r3 = cm.recordDiscard(10);
  assert(r3.isFoul && cm.getCount().strikes === 2, 'Third discard: foul (strikes stay at 2)');
}
{
  // Ball accumulation with wild pitcher (control 3, ballChance = 32%)
  const N = 2000;
  let totalBalls = 0;
  for (let i = 0; i < N; i++) {
    const cm = new CountManager();
    const result = cm.recordDiscard(3);
    if (result.isBall) totalBalls++;
  }
  const ballRate = totalBalls / N;
  assertClose(ballRate, 0.22, 0.42, `Wild pitcher (control 3) ball rate ~32%`);
}
{
  // Walk detection: force 4 balls
  const cm = new CountManager();
  cm.balls = 3;
  // Use control 1 for very high ball chance: (7-1)*0.08 = 48%
  let walked = false;
  for (let i = 0; i < 200 && !walked; i++) {
    cm.balls = 3; // reset to 3 each try
    const result = cm.recordDiscard(1);
    if (result.isWalk) walked = true;
  }
  assert(walked, 'Walk detected when 4th ball accumulates');
}

group('Count System: Count Modifiers');

{
  const cm = new CountManager();
  const mods = cm.getCountModifiers();
  assert(mods.chipsMod === 0 && mods.multMod === 0, '0-0 count: neutral modifiers');
}
{
  const cm = new CountManager();
  cm.balls = 3;
  cm.strikes = 0;
  const mods = cm.getCountModifiers();
  assert(mods.chipsMod === 2 && mods.multMod === 1.0, '3-0 count: +2 chips, +1.0 mult');
}
{
  const cm = new CountManager();
  cm.balls = 0;
  cm.strikes = 2;
  const mods = cm.getCountModifiers();
  assert(mods.chipsMod === -1 && mods.multMod === -0.5, '0-2 count: -1 chips, -0.5 mult');
}
{
  // All count modifier keys exist
  const expectedKeys = ['3-0','2-0','3-1','1-0','2-1','3-2','0-0','1-1','2-2','0-1','1-2','0-2'];
  const allExist = expectedKeys.every(k => COUNT_MODIFIERS[k] !== undefined);
  assert(allExist, 'All 12 count modifier entries exist');
}

group('Count System: Two-Strike Groundout Penalty');

{
  // Statistical test: pairs at 2 strikes should get out more than at 0 strikes
  const N = 3000;
  let outs0 = 0, outs2 = 0;
  const pair = makeCards([[8, 'H'], [8, 'D']]);
  for (let i = 0; i < N; i++) {
    const r0 = CardEngine.evaluateHand(pair, null, null, null, 0);
    if (r0.outcome === 'Groundout' || r0.outcome === 'Flyout') outs0++;
    const r2 = CardEngine.evaluateHand(pair, null, null, null, 2);
    if (r2.outcome === 'Groundout' || r2.outcome === 'Flyout') outs2++;
  }
  assert(outs2 > outs0, `Two-strike penalty: outs at 2 strikes (${outs2}) > at 0 strikes (${outs0})`);
}

group('Count System: Walk Machine Trait');

{
  const wm = BATTER_TRAITS.find(t => t.id === 'walk_machine');
  assert(wm, 'Walk Machine trait exists');
  assert(wm.effect.type === 'start_with_ball', 'Walk Machine uses start_with_ball effect');
  assert(wm.effect.value === 1, 'Walk Machine gives +1 starting ball');
}

// ═══════════════════════════════════════════════════════
//  SITUATIONAL ENGINE TESTS (Phase 2)
// ═══════════════════════════════════════════════════════

import SituationalEngine from '../src/SituationalEngine.js';

group('Situational Engine: Double Play');

{
  // DP requires: groundout + runner on 1st + < 2 outs
  const N = 2000;
  let dpCount = 0;
  for (let i = 0; i < N; i++) {
    const result = SituationalEngine.check('Groundout', {
      outs: 0, bases: [true, false, false], inning: 5,
    }, 5);
    if (result.type === 'double_play') dpCount++;
  }
  const dpRate = dpCount / N;
  // speed 5: chance = 35% - 15% = 20%
  assertClose(dpRate, 0.12, 0.28, `DP rate with speed 5 ~20%`);
}
{
  // No DP with 2 outs
  let anyDp = false;
  for (let i = 0; i < 500; i++) {
    const result = SituationalEngine.check('Groundout', {
      outs: 2, bases: [true, false, false], inning: 5,
    }, 5);
    if (result.type === 'double_play') anyDp = true;
  }
  assert(!anyDp, 'No double play with 2 outs');
}
{
  // No DP without runner on 1st
  let anyDp = false;
  for (let i = 0; i < 500; i++) {
    const result = SituationalEngine.check('Groundout', {
      outs: 0, bases: [false, true, false], inning: 5,
    }, 5);
    if (result.type === 'double_play') anyDp = true;
  }
  assert(!anyDp, 'No double play without runner on 1st');
}
{
  // Fast runners turn fewer DPs
  const N = 3000;
  let dpSlow = 0, dpFast = 0;
  for (let i = 0; i < N; i++) {
    const gs = { outs: 0, bases: [true, false, false], inning: 5 };
    if (SituationalEngine.check('Groundout', gs, 2).type === 'double_play') dpSlow++;
    if (SituationalEngine.check('Groundout', gs, 9).type === 'double_play') dpFast++;
  }
  assert(dpSlow > dpFast, `Slow runners DP more (${dpSlow}) than fast runners (${dpFast})`);
}

group('Situational Engine: Fielder\'s Choice');

{
  // FC happens on groundouts with runner on 1st (non-DP)
  // Need to exclude DP triggers — test with 2 outs where DP can't happen
  const N = 2000;
  let fcCount = 0;
  for (let i = 0; i < N; i++) {
    const result = SituationalEngine.check('Groundout', {
      outs: 2, bases: [true, false, false], inning: 5,
    }, 5);
    if (result.type === 'fielders_choice') fcCount++;
  }
  const fcRate = fcCount / N;
  assertClose(fcRate, 0.30, 0.50, `FC rate at 2 outs ~40%`);
}
{
  // No FC without runner on 1st
  let anyFc = false;
  for (let i = 0; i < 500; i++) {
    const result = SituationalEngine.check('Groundout', {
      outs: 0, bases: [false, false, false], inning: 5,
    }, 5);
    if (result.type === 'fielders_choice') anyFc = true;
  }
  assert(!anyFc, 'No FC without runner on 1st');
}

group('Situational Engine: Error');

{
  // Error on groundout/flyout, ~4% base + late inning bonus
  const N = 5000;
  let errorCount = 0;
  for (let i = 0; i < N; i++) {
    const result = SituationalEngine.check('Groundout', {
      outs: 0, bases: [false, false, false], inning: 3,
    }, 5);
    if (result.type === 'error') errorCount++;
  }
  const errRate = errorCount / N;
  assertClose(errRate, 0.02, 0.07, `Error rate in inning 3 ~4%`);
}
{
  // Late-inning bonus: inning 9 should have higher error rate
  const N = 5000;
  let earlyErrors = 0, lateErrors = 0;
  for (let i = 0; i < N; i++) {
    const earlyGs = { outs: 0, bases: [false, false, false], inning: 3 };
    const lateGs = { outs: 0, bases: [false, false, false], inning: 9 };
    if (SituationalEngine.check('Flyout', earlyGs, 5).type === 'error') earlyErrors++;
    if (SituationalEngine.check('Flyout', lateGs, 5).type === 'error') lateErrors++;
  }
  assert(lateErrors > earlyErrors, `Late-inning errors (${lateErrors}) > early-inning errors (${earlyErrors})`);
}
{
  // No error on non-outs (singles, etc.)
  let anyError = false;
  for (let i = 0; i < 200; i++) {
    const result = SituationalEngine.check('Single', {
      outs: 0, bases: [false, false, false], inning: 9,
    }, 5);
    if (result.type === 'error') anyError = true;
  }
  assert(!anyError, 'No errors on hits');
}

group('Situational Engine: BaseballState DP/FC/Error Resolution');

{
  // Double Play records 2 outs and removes runner from 1st
  const bs = new BaseballState();
  bs.bases = [true, false, false]; // runner on 1st
  bs.outs = 0;
  const result = bs.resolveOutcome('Double Play', 0);
  assert(bs.outs === 2 || bs.state === 'SWITCH_SIDE', 'DP records 2 outs');
  assert(!bs.bases[0], 'DP removes runner from 1st');
}
{
  // DP with 2 outs = 4 total outs → side retired (outs reset to 0)
  const bs = new BaseballState();
  bs.bases = [true, false, false];
  bs.outs = 2;
  bs.resolveOutcome('Double Play', 0);
  assert(bs.state === 'SWITCH_SIDE', 'DP with 2 outs retires side');
  assert(bs.outs === 0, 'Outs reset after side retired');
}
{
  // Fielder's Choice: lead runner out, batter on 1st
  const bs = new BaseballState();
  bs.bases = [true, true, false]; // runners on 1st and 2nd
  bs.outs = 0;
  bs.resolveOutcome("Fielder's Choice", 0);
  assert(bs.outs === 1, 'FC records 1 out');
  assert(bs.bases[0], 'FC: batter on 1st');
  assert(!bs.bases[1], 'FC: lead runner (2nd) removed');
}
{
  // Error: treated as single (runner advances)
  const bs = new BaseballState();
  bs.bases = [false, false, false];
  bs.outs = 0;
  bs.resolveOutcome('Error', 0);
  assert(bs.outs === 0, 'Error does not record an out');
  assert(bs.bases[0], 'Error: batter reaches 1st');
}

// ═══════════════════════════════════════════════════════
//  PHASE 3: WILD PITCH, HBP, SAC BUNT, DROPPED 3RD STRIKE
// ═══════════════════════════════════════════════════════

group('Phase 3: Dropped Third Strike');

{
  // D3K requires: strikeout + 1st base empty
  const N = 3000;
  let d3kCount = 0;
  for (let i = 0; i < N; i++) {
    const result = SituationalEngine.check('Strikeout', {
      outs: 1, bases: [false, false, false], inning: 5,
    }, 5);
    if (result.type === 'dropped_third_strike') d3kCount++;
  }
  const d3kRate = d3kCount / N;
  // speed 5: 5% + 5% = 10%
  assertClose(d3kRate, 0.06, 0.14, `D3K rate with speed 5 ~10%`);
}
{
  // No D3K when 1st base is occupied
  let anyD3k = false;
  for (let i = 0; i < 500; i++) {
    const result = SituationalEngine.check('Strikeout', {
      outs: 1, bases: [true, false, false], inning: 5,
    }, 5);
    if (result.type === 'dropped_third_strike') anyD3k = true;
  }
  assert(!anyD3k, 'No D3K with runner on 1st');
}
{
  // D3K only on strikeouts
  let anyD3k = false;
  for (let i = 0; i < 500; i++) {
    const result = SituationalEngine.check('Groundout', {
      outs: 1, bases: [false, false, false], inning: 5,
    }, 5);
    if (result.type === 'dropped_third_strike') anyD3k = true;
  }
  assert(!anyD3k, 'No D3K on groundouts');
}
{
  // D3K resolves as batter reaching 1st (not an out)
  const bs = new BaseballState();
  bs.bases = [false, false, false];
  bs.outs = 1;
  bs.resolveOutcome('Dropped Third Strike', 0);
  assert(bs.outs === 1, 'D3K does not record an out');
  assert(bs.bases[0], 'D3K: batter reaches 1st');
}

group('Phase 3: Wild Pitch');

{
  // Wild pitch only triggers with runners on base
  let anyWP = false;
  for (let i = 0; i < 500; i++) {
    const result = SituationalEngine.checkWildPitch(3, [false, false, false]);
    if (result.triggered) anyWP = true;
  }
  assert(!anyWP, 'No wild pitch without runners');
}
{
  // Wild pitch never triggers with high control
  let anyWP = false;
  for (let i = 0; i < 500; i++) {
    const result = SituationalEngine.checkWildPitch(7, [true, false, false]);
    if (result.triggered) anyWP = true;
  }
  assert(!anyWP, 'No wild pitch with control 7+');
}
{
  // Wild pitch rate with low control pitcher
  const N = 3000;
  let wpCount = 0;
  for (let i = 0; i < N; i++) {
    const result = SituationalEngine.checkWildPitch(3, [true, false, false]);
    if (result.triggered) wpCount++;
  }
  const wpRate = wpCount / N;
  // control 3: (6-3)*2% = 6%
  assertClose(wpRate, 0.03, 0.10, `Wild pitch rate with control 3 ~6%`);
}

group('Phase 3: HBP');

{
  // HBP never triggers with high control
  let anyHBP = false;
  for (let i = 0; i < 500; i++) {
    const result = SituationalEngine.checkHBP(6);
    if (result.triggered) anyHBP = true;
  }
  assert(!anyHBP, 'No HBP with control 6+');
}
{
  // HBP rate with low control
  const N = 5000;
  let hbpCount = 0;
  for (let i = 0; i < N; i++) {
    const result = SituationalEngine.checkHBP(3);
    if (result.triggered) hbpCount++;
  }
  const hbpRate = hbpCount / N;
  // control 3: (5-3)*1.5% = 3%
  assertClose(hbpRate, 0.01, 0.05, `HBP rate with control 3 ~3%`);
}
{
  // HBP resolves as batter reaching 1st
  const bs = new BaseballState();
  bs.outs = 0;
  bs.resolveOutcome('HBP', 0);
  assert(bs.outs === 0, 'HBP does not record an out');
  assert(bs.bases[0], 'HBP: batter reaches 1st');
}

group('Phase 3: Sac Bunt');

{
  // Sac Bunt: records 1 out, runners advance
  const bs = new BaseballState();
  bs.bases = [true, false, false]; // runner on 1st
  bs.outs = 0;
  bs.resolveOutcome('Sac Bunt', 0);
  assert(bs.outs === 1, 'Sac Bunt records 1 out');
  assert(bs.bases[1], 'Sac Bunt: runner advanced to 2nd');
  assert(!bs.bases[0], 'Sac Bunt: 1st base cleared');
}
{
  // Sac Bunt with runner on 3rd scores a run
  const bs = new BaseballState();
  bs.bases = [false, false, true]; // runner on 3rd
  bs.outs = 0;
  const result = bs.resolveOutcome('Sac Bunt', 0);
  assert(bs.outs === 1, 'Sac Bunt with runner on 3rd records 1 out');
  assert(bs.playerScore === 1, 'Sac Bunt with runner on 3rd scores 1 run');
}
{
  // Sac Bunt with runners on 1st and 3rd
  const bs = new BaseballState();
  bs.bases = [true, false, true]; // runners on 1st and 3rd
  bs.outs = 0;
  bs.resolveOutcome('Sac Bunt', 0);
  assert(bs.outs === 1, 'Sac Bunt records 1 out');
  assert(bs.playerScore === 1, 'Runner from 3rd scores');
  assert(bs.bases[1], 'Runner from 1st advanced to 2nd');
}

// ═══════════════════════════════════════════════════════
//  Deck Definitions
// ═══════════════════════════════════════════════════════

group('Deck Definitions');

{
  // Standard deck
  const ce = new CardEngine('standard');
  assert(ce.deck.length === 52, 'Standard deck has 52 cards');
  assert(ce.discardsRemaining === 2, 'Standard deck has 2 discards');
  assert(ce.handSize === 8, 'Standard hand size is 8');
}

{
  // No face deck
  const ce = new CardEngine('no_face');
  assert(ce.deck.length === 40, 'No Face deck has 40 cards (no J/Q/K)');
  const hasJack = ce.deck.some(c => c.rank === 11);
  assert(!hasJack, 'No Face deck has no Jacks');
}

{
  // Double deck
  const ce = new CardEngine('double');
  assert(ce.deck.length === 104, 'Double deck has 104 cards');
  assert(ce.discardsRemaining === 3, 'Double deck has 3 discards');
}

{
  // Default constructor uses standard
  const ce = new CardEngine();
  assert(ce.deck.length === 52, 'Default deck is standard 52');
}

{
  // resetDeck restores deck config discards
  const ce = new CardEngine('double');
  ce.discardsRemaining = 0;
  ce.resetDeck();
  assert(ce.discardsRemaining === 3, 'resetDeck restores deck config discards');
}

// ═══════════════════════════════════════════════════════
//  Sacrifice Fly (automatic)
// ═══════════════════════════════════════════════════════

group('Sacrifice Fly');

{
  // Flyout with runner on 3rd and < 2 outs should score the run
  const bs = new BaseballState();
  bs.bases = [false, false, true]; // runner on 3rd
  bs.outs = 0;
  const runs = bs.processSacrificeFly();
  assert(runs === 1, 'Sac fly scores 1 run');
  assert(!bs.bases[2], 'Sac fly clears runner from 3rd');
  assert(bs.playerScore === 1, 'Sac fly adds to player score');
}

{
  // No runner on 3rd — no sac fly
  const bs = new BaseballState();
  bs.bases = [true, true, false];
  bs.outs = 0;
  const runs = bs.processSacrificeFly();
  assert(runs === 0, 'No sac fly without runner on 3rd');
  assert(bs.playerScore === 0, 'No run scored without runner on 3rd');
}

{
  // Flyout resolves as an out (1 out recorded)
  const bs = new BaseballState();
  bs.bases = [false, false, true];
  bs.outs = 1;
  // processSacrificeFly scores the run; resolveOutcome records the out
  bs.processSacrificeFly();
  const result = bs.resolveOutcome('Flyout', 0);
  assert(bs.outs === 2, 'Sac fly still records the flyout');
  assert(bs.playerScore === 1, 'Run scored on sac fly');
}

{
  // 2 outs — sac fly should NOT trigger in game logic
  // (processSacrificeFly itself doesn't check outs, the caller does)
  // Verify processSacrificeFly still works mechanically
  const bs = new BaseballState();
  bs.bases = [false, false, true];
  bs.outs = 2;
  const runs = bs.processSacrificeFly();
  assert(runs === 1, 'processSacrificeFly works mechanically at 2 outs');
  // Note: GameScene checks outs < 2 before calling this
}

// ═══════════════════════════════════════════════════════
//  Bullpen
// ═══════════════════════════════════════════════════════

group('Bullpen');

{
  const team = TEAMS[0]; // first team
  const rm = new RosterManager(team, 0, TEAMS[1]);

  // Bullpen has all pitchers except the starter
  const bp = rm.getAvailableBullpen();
  assert(bp.length === team.pitchers.length - 1, `Bullpen has ${team.pitchers.length - 1} relievers`);
  assert(bp.every(p => !p.used), 'All relievers start unused');

  // Starter is the first pitcher
  assert(rm.getMyPitcher().name === team.pitchers[0].name, 'Starter is pitchers[0]');
}

{
  const team = TEAMS[0];
  const rm = new RosterManager(team, 0, TEAMS[1]);

  // Swap in first reliever
  const oldPitcher = rm.getMyPitcher().name;
  const reliever = rm.getAvailableBullpen()[0];
  const newPitcher = rm.swapPitcher(0);

  assert(newPitcher.name === reliever.name, 'Swapped pitcher is the reliever');
  assert(newPitcher.name !== oldPitcher, 'New pitcher differs from starter');
  assert(rm.getMyPitcherStamina() === 1.0, 'Reliever starts with full stamina');
  assert(rm.bullpen[0].used === true, 'Used reliever is marked');
}

{
  const team = TEAMS[0];
  const rm = new RosterManager(team, 0, TEAMS[1]);

  // Use all relievers
  const totalRelievers = rm.getAvailableBullpen().length;
  for (let i = 0; i < totalRelievers; i++) {
    rm.swapPitcher(i);
  }
  assert(rm.getAvailableBullpen().length === 0, 'No relievers left after using all');

  // Swapping with no available relievers returns current pitcher
  const current = rm.getMyPitcher();
  const same = rm.swapPitcher(0);
  assert(same.name === current.name, 'Swap with used reliever returns current');
}

// ── Pitcher Adjusts: pairsPlayedThisInning tracking ──
console.log('\n── Pitcher Adjusts: pair counter ──');

{
  const bs = new BaseballState();
  assert(bs.pairsPlayedThisInning === 0, 'pairsPlayedThisInning starts at 0');
  bs.pairsPlayedThisInning = 3;
  bs.switchSide(0);
  assert(bs.pairsPlayedThisInning === 0, 'pairsPlayedThisInning resets on switchSide');
}

{
  const bs = new BaseballState();
  bs.pairsPlayedThisInning = 5;
  bs.reset();
  assert(bs.pairsPlayedThisInning === 0, 'pairsPlayedThisInning resets on full reset');
}

console.log('\n── Pitcher Adjusts: escalating out chance ──');

{
  // With pairsPlayedThisInning = 3, pair of Aces (normally 8% out)
  // should have 8% + 45% = 53% out chance
  const bs = new BaseballState();
  const aceCards = [{ rank: 14, suit: 'H' }, { rank: 14, suit: 'D' }];
  let outs = 0;
  const trials = 1000;
  for (let i = 0; i < trials; i++) {
    bs.pairsPlayedThisInning = 3; // reset before each eval since it increments
    const r = CardEngine.evaluateHand(aceCards, null, null, { baseballState: bs });
    if (r.handName === 'Groundout' || r.handName === 'Flyout') outs++;
  }
  const outRate = outs / trials;
  assert(outRate > 0.35, `Aces with 3 prior pairs: out rate ${(outRate*100).toFixed(1)}% > 35%`);
  assert(outRate < 0.75, `Aces with 3 prior pairs: out rate ${(outRate*100).toFixed(1)}% < 75%`);
}

{
  // pairsPlayedThisInning should increment after each pair evaluation
  const bs = new BaseballState();
  assert(bs.pairsPlayedThisInning === 0, 'starts at 0 before play');
  const pairCards = [{ rank: 14, suit: 'H' }, { rank: 14, suit: 'D' }];
  CardEngine.evaluateHand(pairCards, null, null, { baseballState: bs });
  assert(bs.pairsPlayedThisInning === 1, 'incremented to 1 after first pair');
  CardEngine.evaluateHand(pairCards, null, null, { baseballState: bs });
  assert(bs.pairsPlayedThisInning === 2, 'incremented to 2 after second pair');
}

console.log('\n── Contact rescue nerf ──');

{
  const canada = TEAMS.find(t => t.id === 'CAN');
  const usa = TEAMS.find(t => t.id === 'USA');
  const rm = new RosterManager(canada, 0, usa);
  const origContact = rm.roster[0].contact;
  rm.roster[0].contact = 10;

  let saves = 0;
  const trials = 2000;
  for (let i = 0; i < trials; i++) {
    const fakeResult = {
      wasGroundout: true, originalHand: 'Pair', pairRank: 10,
      outcome: 'Groundout', handName: 'Groundout', chips: 0, mult: 1, score: 0,
    };
    const { bonuses } = rm.applyBatterModifiers(fakeResult, {});
    if (bonuses.contactSave) saves++;
  }

  rm.roster[0].contact = origContact;
  const saveRate = saves / trials;
  assert(saveRate > 0.25, `Contact-10 rescue rate ${(saveRate*100).toFixed(1)}% > 25%`);
  assert(saveRate < 0.55, `Contact-10 rescue rate ${(saveRate*100).toFixed(1)}% < 55%`);
}

// ═══════════════════════════════════════════════════════
//  PART 5: COACHES & MASCOTS DATA
// ═══════════════════════════════════════════════════════

group('5a. Coaches Data');

{
  assert(COACHES.length >= 8, `At least 8 coaches defined (got ${COACHES.length})`);
  const coachIds = new Set();
  for (const c of COACHES) {
    assert(c.id && c.name && c.price && c.effect, `Coach '${c.name || '?'}' has required fields`);
    assert(c.category === 'coach', `Coach '${c.name}' has category 'coach'`);
    assert(c.rarity, `Coach '${c.name}' has rarity`);
    assert(!coachIds.has(c.id), `Coach ID '${c.id}' is unique`);
    coachIds.add(c.id);
  }
}

group('5b. Mascots Data');

{
  assert(MASCOTS.length >= 15, `At least 15 mascots defined (got ${MASCOTS.length})`);
  const mascotIds = new Set();
  for (const m of MASCOTS) {
    assert(m.id && m.name && m.price && m.effect, `Mascot '${m.name || '?'}' has required fields`);
    assert(m.category === 'mascot', `Mascot '${m.name}' has category 'mascot'`);
    assert(typeof m.spriteIndex === 'number', `Mascot '${m.name}' has spriteIndex`);
    assert(m.rarity, `Mascot '${m.name}' has rarity`);
    assert(!mascotIds.has(m.id), `Mascot ID '${m.id}' is unique`);
    mascotIds.add(m.id);
  }

  // Verify rarity distribution: 3 common, 7 uncommon, 5 rare
  const byRarity = { common: 0, uncommon: 0, rare: 0 };
  for (const m of MASCOTS) byRarity[m.rarity]++;
  assert(byRarity.common === 3, `3 common mascots (got ${byRarity.common})`);
  assert(byRarity.uncommon === 7, `7 uncommon mascots (got ${byRarity.uncommon})`);
  assert(byRarity.rare === 5, `5 rare mascots (got ${byRarity.rare})`);
}

group('5c. Staff Slots (BaseballState)');

{
  const bs = new BaseballState();
  bs.reset();
  assert(bs.staffSlots === 2, 'Start with 2 staff slots');
  assert(Array.isArray(bs.staff) && bs.staff.length === 0, 'Start with no staff');

  const coach1 = { id: 'batting_coach', name: 'Batting Coach', price: 30, effect: { type: 'team_stat_boost' } };
  const mascot1 = { id: 'thunder_bear', name: 'Thunder Bear', price: 50, effect: { type: 'double_chips' } };
  const coach2 = { id: 'scout', name: 'Scout', price: 25, effect: { type: 'shop_extra_cards' } };

  assert(bs.addStaff(coach1) === true, 'Can add first staff');
  assert(bs.staff.length === 1, 'Staff count is 1');
  assert(bs.addStaff(mascot1) === true, 'Can add second staff');
  assert(bs.staff.length === 2, 'Staff count is 2');
  assert(bs.addStaff(coach2) === false, 'Cannot exceed 2 slot limit');
  assert(bs.staff.length === 2, 'Staff count still 2 after failed add');

  // Unlock a slot
  bs.staffSlots = 3;
  assert(bs.addStaff(coach2) === true, 'Can add after slot unlock');
  assert(bs.staff.length === 3, 'Staff count is 3');

  // Remove
  assert(bs.removeStaff('thunder_bear') === true, 'Can remove staff by ID');
  assert(bs.staff.length === 2, 'Staff count after removal');
  assert(bs.removeStaff('nonexistent') === false, 'Cannot remove nonexistent staff');

  // getStaff
  assert(bs.getStaff().length === 2, 'getStaff returns current staff');
}

// ═══════════════════════════════════════════════════════
//  PART 6: INNATE TRAIT PAIRS
// ═══════════════════════════════════════════════════════

group('6. Innate Trait Pairs');

{
  const traitIds = new Set(BATTER_TRAITS.map(t => t.id));

  for (const team of TEAMS) {
    for (const batter of team.batters) {
      assert(
        Array.isArray(batter.innateTraits) && batter.innateTraits.length === 2,
        `${team.name} ${batter.name} has 2 innate trait options`
      );
      if (Array.isArray(batter.innateTraits)) {
        for (const tid of batter.innateTraits) {
          assert(
            traitIds.has(tid),
            `${team.name} ${batter.name} innate trait '${tid}' exists in batter_traits`
          );
        }
      }
    }

    // No duplicate A/B pairs within a team
    const pairs = team.batters.map(b => b.innateTraits.join(','));
    const uniquePairs = new Set(pairs);
    assert(
      uniquePairs.size === pairs.length,
      `${team.name} has no duplicate innate trait pairs`
    );
  }
}

// ═══════════════════════════════════════════════════════
//  PART 7: STAFF EFFECT INTEGRATION
// ═══════════════════════════════════════════════════════

console.log('\n\x1b[1m── Part 7: Staff Effect Integration ──\x1b[0m');

{
  // 7a: Staff slot management
  const bs = new BaseballState();
  assert(bs.staffSlots === 2, 'Default staff slots is 2');

  const coach = COACHES.find(c => c.id === 'batting_coach');
  assert(bs.addStaff(coach), 'Can add first staff member');
  assert(bs.getStaff().length === 1, 'Staff length is 1 after adding');

  const coach2 = COACHES.find(c => c.id === 'bench_coach');
  assert(bs.addStaff(coach2), 'Can add second staff member');
  assert(!bs.addStaff(COACHES[2]), 'Cannot add 3rd member with 2 slots');

  // Equipment Manager unlocks slot
  const em = COACHES.find(c => c.id === 'equipment_manager');
  bs.removeStaff(coach2.id);
  bs.addStaff(em);
  assert(bs.staffSlots === 3, 'Equipment Manager unlocks +1 slot');

  // 7b: getStaffByEffect filtering
  const bs2 = new BaseballState();
  bs2.addStaff(COACHES.find(c => c.id === 'batting_coach'));
  bs2.addStaff(MASCOTS.find(m => m.id === 'cash_cow'));
  const statBoosts = bs2.getStaffByEffect('team_stat_boost');
  assert(statBoosts.length === 1, 'getStaffByEffect finds Batting Coach');
  assert(statBoosts[0].id === 'batting_coach', 'Filtered staff has correct ID');
  const chipStaff = bs2.getStaffByEffect('flat_chips_per_ab');
  assert(chipStaff.length === 1 && chipStaff[0].id === 'cash_cow', 'getStaffByEffect finds Cash Cow');

  // 7c: SituationalEngine error multiplier
  let errorCount = 0;
  const errorTrials = 5000;
  for (let i = 0; i < errorTrials; i++) {
    const result = SituationalEngine.check('Groundout', { inning: 1, bases: [null, null, null], outs: 0 }, 5, 3);
    if (result.transformed && result.type === 'error') errorCount++;
  }
  // With 3x multiplier, base 4% → 12%, expect ~600 in 5000 trials
  assert(errorCount > 300, `Sly Fox 3x error mult: ${errorCount}/5000 errors (expect ~600)`);
  assert(errorCount < 1000, `Sly Fox error rate not unreasonably high: ${errorCount}`);

  // Without multiplier (baseline)
  let baseErrors = 0;
  for (let i = 0; i < errorTrials; i++) {
    const result = SituationalEngine.check('Groundout', { inning: 1, bases: [null, null, null], outs: 0 }, 5);
    if (result.transformed && result.type === 'error') baseErrors++;
  }
  assert(errorCount > baseErrors, `3x error mult (${errorCount}) > baseline (${baseErrors})`);

  // 7d: simSingleAtBat with staff mods (hit reduction)
  const rm = new RosterManager(TEAMS[0], 0, TEAMS[1]);

  let hitsNoMod = 0;
  let hitsWithMod = 0;
  const simTrials = 2000;
  for (let i = 0; i < simTrials; i++) {
    rm.opponentBatterIndex = i % 9;
    rm.myPitcherStamina = 1.0;
    const bases = [null, null, null];
    const r = rm.simSingleAtBat(3, 'fastball', bases);
    if (!r.isOut) hitsNoMod++;
  }
  for (let i = 0; i < simTrials; i++) {
    rm.opponentBatterIndex = i % 9;
    rm.myPitcherStamina = 1.0;
    const bases = [null, null, null];
    const r = rm.simSingleAtBat(3, 'fastball', bases, { hitReduction: 0.15, fatigueDelay: 0 });
    if (!r.isOut) hitsWithMod++;
  }
  assert(hitsWithMod < hitsNoMod, `Hit reduction reduces hits: ${hitsWithMod} < ${hitsNoMod}`);

  // 7e: All mascot effect types are recognized
  const knownTypes = new Set([
    'team_convert_high_card', 'add_mult', 'strikeout_to_walk', 'flat_chips_per_ab',
    'ignore_pair_penalty', 'bonus_draw_on_discard', 'per_runner_chips', 'double_chips',
    'strikeout_redraw', 'pitcher_hit_reduction', 'mult_per_inning_run', 'team_extra_base',
    'add_hand_draw', 'error_multiplier',
  ]);
  for (const m of MASCOTS) {
    assert(knownTypes.has(m.effect.type), `Mascot "${m.name}" has known effect type: ${m.effect.type}`);
  }

  // 7f: All coach effect types are recognized
  const knownCoachTypes = new Set([
    'team_stat_boost', 'team_add_discard', 'pitcher_hit_reduction', 'unlock_staff_slot',
    'shop_extra_cards', 'pitcher_fatigue_delay',
  ]);
  for (const c of COACHES) {
    assert(knownCoachTypes.has(c.effect.type), `Coach "${c.name}" has known effect type: ${c.effect.type}`);
  }
}

// ═══════════════════════════════════════════════════════
//  PART 8: BONUS PLAYERS & CARD PACKS
// ═══════════════════════════════════════════════════════

console.log('\n\x1b[1m── Part 8: Bonus Players & Card Packs ──\x1b[0m');

{
  // 8a: Bonus player data validation
  assert(BONUS_PLAYERS.length >= 12, `At least 12 bonus players defined (got ${BONUS_PLAYERS.length})`);
  const bpIds = new Set();
  for (const bp of BONUS_PLAYERS) {
    assert(bp.id && bp.name, `Bonus player has id and name: ${bp.id}`);
    assert(bp.power && bp.contact && bp.speed, `${bp.name} has stats`);
    assert(bp.pos, `${bp.name} has position`);
    assert(bp.bats === 'L' || bp.bats === 'R', `${bp.name} has valid bats`);
    assert(bp.innateTraitId, `${bp.name} has innateTraitId`);
    assert(BATTER_TRAITS.some(t => t.id === bp.innateTraitId), `${bp.name} innate trait '${bp.innateTraitId}' exists in batter_traits`);
    assert(bp.lineupEffect && bp.lineupEffect.type, `${bp.name} has lineup effect`);
    assert(bp.lineupDescription, `${bp.name} has lineup description`);
    assert(['common', 'uncommon', 'rare'].includes(bp.rarity), `${bp.name} has valid rarity`);
    assert(!bpIds.has(bp.id), `${bp.name} has unique ID`);
    bpIds.add(bp.id);
  }

  // Rarity distribution
  const bpRarity = { common: 0, uncommon: 0, rare: 0 };
  for (const bp of BONUS_PLAYERS) bpRarity[bp.rarity]++;
  assert(bpRarity.common >= 3, `At least 3 common bonus players (got ${bpRarity.common})`);
  assert(bpRarity.uncommon >= 3, `At least 3 uncommon bonus players (got ${bpRarity.uncommon})`);
  assert(bpRarity.rare >= 2, `At least 2 rare bonus players (got ${bpRarity.rare})`);

  // 8b: Lineup effect types are valid
  const knownLineupTypes = new Set([
    'team_add_chips_on_xbh', 'team_pair_out_reduction', 'team_extra_base_chance',
    'team_power_mult', 'team_add_mult_on_hit', 'team_strikeout_chips',
    'team_first_pitch_mult', 'team_runner_mult', 'team_late_inning_chips',
    'team_contact_save_boost',
  ]);
  for (const bp of BONUS_PLAYERS) {
    assert(knownLineupTypes.has(bp.lineupEffect.type),
      `${bp.name} lineup effect type '${bp.lineupEffect.type}' is known`);
  }

  // 8c: RosterManager bonus player methods
  const rm2 = new RosterManager(TEAMS[0], 0, TEAMS[1]);
  assert(rm2.bonusPlayerCount === 0, 'Starts with 0 bonus players');
  assert(rm2.getActiveLineupEffects().length === 0, 'No lineup effects initially');

  // Add a bonus player
  const testBP = BONUS_PLAYERS[0]; // Knuckles McBride
  const originalPlayer = rm2.getRoster()[4]; // 5th batter
  assert(rm2.addBonusPlayer(testBP, 4), 'Can add bonus player');
  assert(rm2.bonusPlayerCount === 1, 'Bonus count is 1');
  assert(rm2.benchedPlayers.length === 1, 'One player benched');
  assert(rm2.benchedPlayers[0].name === originalPlayer.name, 'Correct player benched');

  const newPlayer = rm2.getRoster()[4];
  assert(newPlayer.isBonus === true, 'New player marked as bonus');
  assert(newPlayer.name === testBP.name, 'Bonus player has correct name');
  assert(newPlayer.traits.length === 1, 'Innate trait auto-equipped');
  assert(newPlayer.traits[0].isInnate === true, 'Innate trait marked');

  // Lineup effects
  const effects = rm2.getActiveLineupEffects();
  assert(effects.length === 1, 'One lineup effect active');
  assert(effects[0].type === testBP.lineupEffect.type, 'Correct lineup effect type');

  // Max 3 bonus players
  const rm3 = new RosterManager(TEAMS[0], 0, TEAMS[1]);
  assert(rm3.addBonusPlayer(BONUS_PLAYERS[0], 0), 'Add 1st bonus player');
  assert(rm3.addBonusPlayer(BONUS_PLAYERS[1], 1), 'Add 2nd bonus player');
  assert(rm3.addBonusPlayer(BONUS_PLAYERS[2], 2), 'Add 3rd bonus player');
  assert(!rm3.addBonusPlayer(BONUS_PLAYERS[3], 3), 'Cannot add 4th bonus player');
  assert(rm3.bonusPlayerCount === 3, 'Max 3 bonus players enforced');

  // 8d: Bonus players get 3 trait slots (innate + 2 shop)
  const rm4 = new RosterManager(TEAMS[0], 0, TEAMS[1]);
  rm4.addBonusPlayer(BONUS_PLAYERS[0], 0);
  const bp = rm4.getRoster()[0];
  assert(bp.traits.length === 1, 'Starts with innate trait');
  assert(rm4.equipTrait(0, BATTER_TRAITS[0]), 'Can equip 1st shop trait');
  assert(bp.traits.length === 2, 'Has 2 traits now');
  assert(rm4.equipTrait(0, BATTER_TRAITS[1]), 'Can equip 2nd shop trait');
  assert(bp.traits.length === 3, 'Has 3 traits (innate + 2 shop)');
  assert(!rm4.equipTrait(0, BATTER_TRAITS[2]), 'Cannot equip 4th trait');

  // 8e: Regular players still capped at 2 traits
  const rm5 = new RosterManager(TEAMS[0], 0, TEAMS[1]);
  assert(rm5.equipTrait(0, BATTER_TRAITS[0]), 'Regular player: equip 1st');
  assert(rm5.equipTrait(0, BATTER_TRAITS[1]), 'Regular player: equip 2nd');
  assert(!rm5.equipTrait(0, BATTER_TRAITS[2]), 'Regular player: cannot equip 3rd');
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

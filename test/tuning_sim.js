#!/usr/bin/env node
/**
 * tuning_sim.js — Monte Carlo batting simulation
 *
 * Simulates full 9-inning games with realistic mechanics:
 *   - Count-based discards (strike/ball/foul probabilities)
 *   - Contact rescue on failed pairs
 *   - Situational plays (DP, FC, Error, D3K)
 *   - Speed bonuses for extra bases
 *   - Batter stat bonuses on hits
 *   - Smart AI that considers degradation when picking hands
 *
 * Usage:
 *   node test/tuning_sim.js              # 200 games (default)
 *   node test/tuning_sim.js 1000         # 1000 games
 *   node test/tuning_sim.js 500 --verbose # 500 games, per-game log
 */

import CardEngine from '../src/CardEngine.js';
import BaseballState from '../src/BaseballState.js';
import SituationalEngine from '../src/SituationalEngine.js';
import BALANCE from '../data/balance.js';

// ── Config ──────────────────────────────────────────────

const NUM_GAMES = parseInt(process.argv[2]) || 200;
const VERBOSE = process.argv.includes('--verbose');
const INNINGS = 9;

// Simulated roster: 9 batters with varying stats
const SIM_LINEUP = [
  { name: 'Leadoff',  contact: 8, power: 4, speed: 8 },
  { name: 'Second',   contact: 7, power: 5, speed: 6 },
  { name: 'Third',    contact: 6, power: 8, speed: 5 },
  { name: 'Cleanup',  contact: 5, power: 9, speed: 4 },
  { name: 'Fifth',    contact: 6, power: 7, speed: 5 },
  { name: 'Sixth',    contact: 7, power: 5, speed: 6 },
  { name: 'Seventh',  contact: 5, power: 4, speed: 7 },
  { name: 'Eighth',   contact: 4, power: 3, speed: 5 },
  { name: 'Pitcher',  contact: 3, power: 2, speed: 3 },
];

// Opponent pitcher (average)
const OPP_PITCHER = { velocity: 6, control: 5, stamina: 6 };

// Hand priority: lower index = better hand
const HAND_PRIORITY = [
  'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House',
  'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Pair', 'High Card',
];

// ── Combination generator ───────────────────────────────

function* combinations(arr, k) {
  if (k === 0) { yield []; return; }
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...rest];
    }
  }
}

// ── Find best hand from cards ───────────────────────────

function findBestHand(cards) {
  let bestResult = null;
  let bestIndices = null;
  let bestPriority = 999;

  const indices = cards.map((_, i) => i);
  for (let size = 1; size <= Math.min(5, cards.length); size++) {
    for (const combo of combinations(indices, size)) {
      const subset = combo.map(i => cards[i]);
      const preview = CardEngine.evaluateHand(subset);
      const priority = HAND_PRIORITY.indexOf(preview.handName);
      const effectivePriority = priority === -1 ? 999 : priority;

      if (effectivePriority < bestPriority ||
          (effectivePriority === bestPriority && preview.score > (bestResult?.score || 0))) {
        bestResult = preview;
        bestIndices = combo;
        bestPriority = effectivePriority;
      }
    }
  }

  return { indices: bestIndices, preview: bestResult, priority: bestPriority };
}

// ── Count-based discard simulation ──────────────────────

function simulateDiscard(batter, pitcher, strikes, balls) {
  const baseStrikeChance = BALANCE.baseStrikeChance
    + (pitcher.velocity - 5) * BALANCE.strikeVelocityScale
    + (pitcher.control - 5) * BALANCE.strikeControlScale
    - (batter.contact - 5) * BALANCE.strikeContactScale;
  const strikeChance = Math.min(BALANCE.strikeMax, Math.max(BALANCE.strikeMin, baseStrikeChance));

  if (strikes >= 2) {
    // At 2 strikes: foul, strike, or ball
    const foulChance = batter.contact * BALANCE.foulContactScale;
    const remaining = 1.0 - foulChance;
    const roll = Math.random();
    if (roll < foulChance) return 'FOUL';
    if (roll < foulChance + remaining * strikeChance) return 'STRIKE';
    return 'BALL';
  }

  // Before 2 strikes: strike or ball
  return Math.random() < strikeChance ? 'STRIKE' : 'BALL';
}

// ── AI: should we discard or play? ──────────────────────

function shouldDiscard(bestPriority, strikes, balls, batter) {
  // Never discard with 2 strikes and low contact (too risky)
  if (strikes === 2 && batter.contact < 5) return false;

  // Always play if we have Full House or better
  if (bestPriority <= 3) return false;

  // Play Flush/Straight on first occurrence (10% out is fine)
  if (bestPriority <= 5 && strikes < 2) return false;
  if (bestPriority <= 5) return false; // play it even at 2 strikes

  // Three of a Kind: play if not too risky
  if (bestPriority === 6 && strikes < 2) return false;
  if (bestPriority === 6) return false;

  // Two Pair: play unless 0 strikes and we might improve
  if (bestPriority === 7 && strikes >= 1) return false;
  if (bestPriority === 7 && balls >= 2) return false;

  // Pair: try to improve if safe
  if (bestPriority === 8 && strikes >= 2) return false;
  if (bestPriority === 8 && strikes === 1 && batter.contact < 6) return false;

  // High Card: always discard if we can
  if (bestPriority === 9 && strikes >= 2 && batter.contact < 7) return false;

  return true;
}

// ── Contact rescue ──────────────────────────────────────

function contactRescue(result, batter) {
  if (result.wasGroundout && result.originalHand === 'Pair') {
    const saveChance = batter.contact * BALANCE.contactRescueScale;
    if (Math.random() < saveChance) {
      return {
        ...result,
        handName: 'Pair',
        outcome: 'Single',
        peanuts: 1,
        mult: 1.5,
        score: 2,
        contactRescue: true,
      };
    }
  }
  return result;
}

// ── Simulate one at-bat ─────────────────────────────────

function simulateAtBat(engine, bs, batter, pitcher, inning) {
  // HBP check at start
  const hbp = SituationalEngine.checkHBP(pitcher.control);
  if (hbp.triggered) {
    return { outcome: 'HBP', handName: 'HBP', peanuts: 0, mult: 1, score: 0, hbp: true };
  }

  const hand = engine.newAtBat();
  let strikes = 0;
  let balls = 0;

  // Count-based discard loop
  const MAX_DISCARDS = 10; // safety limit
  for (let d = 0; d < MAX_DISCARDS; d++) {
    const { indices, preview, priority } = findBestHand(engine.hand);

    if (!shouldDiscard(priority, strikes, balls, batter)) {
      break;
    }

    // Discard worst cards (keep the best hand's cards, discard the rest)
    const keepSet = new Set(indices);
    const discardIndices = engine.hand.map((_, i) => i).filter(i => !keepSet.has(i));
    if (discardIndices.length === 0) break;

    // Simulate the pitch for this discard
    const pitchResult = simulateDiscard(batter, pitcher, strikes, balls);

    if (pitchResult === 'STRIKE') {
      strikes++;
      if (strikes >= 3) {
        // Strikeout by count
        return { outcome: 'Strikeout', handName: 'Strikeout', peanuts: 0, mult: 1, score: 0, countStrikeout: true };
      }
    } else if (pitchResult === 'BALL') {
      balls++;
      if (balls >= 4) {
        // Walk
        return { outcome: 'Walk', handName: 'Walk', peanuts: 0, mult: 1, score: 0, walk: true };
      }
    }
    // FOUL: count stays the same

    // Actually discard and draw replacements
    engine.discard(discardIndices);
  }

  // Play the best hand
  const { indices } = findBestHand(engine.hand);
  const result = engine.playHand(indices, null, null, { baseballState: bs }, strikes);

  // Contact rescue
  const rescued = contactRescue(result, batter);

  // Batter stat bonuses on hits
  if (rescued.outcome !== 'Strikeout' && rescued.outcome !== 'Groundout' && rescued.outcome !== 'Flyout') {
    // Power bonus peanuts
    rescued.peanuts += Math.max(0, batter.power - 5);
    // Contact bonus mult
    rescued.mult += batter.contact / 10;
    rescued.score = Math.round(rescued.peanuts * rescued.mult);
  }

  return rescued;
}

// ── Simulate one full game ──────────────────────────────

function simulateGame() {
  const engine = new CardEngine('standard');
  const bs = new BaseballState();
  let batterIdx = 0;

  const stats = {
    runs: 0,
    totalAtBats: 0,
    totalOuts: 0,
    handTypes: {},
    outsByType: {},
    walks: 0,
    hbps: 0,
    contactRescues: 0,
    errors: 0,
    doublePlays: 0,
    countStrikeouts: 0,
    situationalHits: 0,
  };

  for (let inning = 1; inning <= INNINGS; inning++) {
    bs.outs = 0;
    bs.bases = [null, null, null];
    bs.pairsPlayedThisInning = 0;
    bs.tripsPlayedThisInning = 0;
    bs.straightsPlayedThisInning = 0;
    bs.flushesPlayedThisInning = 0;

    // Pitcher fatigue
    const fatigueStart = Math.max(3, OPP_PITCHER.stamina - 1);
    const fatigue = inning <= fatigueStart ? 1.0 : Math.max(0.5, 1.0 - (inning - fatigueStart) * 0.08);
    const pitcher = {
      ...OPP_PITCHER,
      velocity: Math.round(OPP_PITCHER.velocity * fatigue),
      control: Math.round(OPP_PITCHER.control * fatigue),
    };

    while (bs.outs < 3) {
      stats.totalAtBats++;
      const batter = SIM_LINEUP[batterIdx % 9];
      batterIdx++;

      const result = simulateAtBat(engine, bs, batter, pitcher, inning);

      // Track hand type
      const handName = result.originalHand || result.handName;
      stats.handTypes[handName] = (stats.handTypes[handName] || 0) + 1;

      // Special outcomes
      if (result.walk) { stats.walks++; }
      if (result.hbp) { stats.hbps++; }
      if (result.countStrikeout) { stats.countStrikeouts++; }
      if (result.contactRescue) { stats.contactRescues++; }

      const isOut = result.outcome === 'Groundout' || result.outcome === 'Flyout' ||
                    result.outcome === 'Strikeout';

      if (isOut) {
        // Situational checks
        const gameStatus = bs.getStatus();
        const sitResult = SituationalEngine.check(result.outcome, gameStatus, batter.speed);

        if (sitResult.transformed) {
          if (sitResult.type === 'error') stats.errors++;
          if (sitResult.type === 'double_play') stats.doublePlays++;
          if (sitResult.type === 'dropped_third_strike') stats.situationalHits++;

          const resolved = bs.resolveOutcome(sitResult.outcome, result.score, batter);
          if (sitResult.outcome === 'Double Play') {
            // DP already handled by resolveOutcome
          } else if (resolved.runsScored) {
            stats.runs += resolved.runsScored;
          }
          if (bs.state === 'SWITCH_SIDE') bs.outs = 3;
        } else {
          stats.totalOuts++;
          stats.outsByType[handName] = (stats.outsByType[handName] || 0) + 1;
          bs.outs++;
          if (bs.outs >= 3) {
            bs.bases = [null, null, null];
          }
        }
      } else {
        // Hit or walk/HBP
        const outcome = result.outcome;
        const resolved = bs.resolveOutcome(outcome, result.score, batter);
        stats.runs += resolved.runsScored || 0;

        // Speed bonus: extra base chance
        if (outcome === 'Single' || outcome === 'Double') {
          const extraBaseChance = batter.speed * 0.05;
          const extra = bs.tryExtraBase(extraBaseChance);
          if (extra.scored) stats.runs += extra.scored;
        }

        if (bs.state === 'SWITCH_SIDE') bs.outs = 3;
      }
    }
  }

  stats.runs = bs.playerScore;
  return stats;
}

// ── Run simulation ──────────────────────────────────────

console.log(`\n  Tuning Sim: ${NUM_GAMES} games, ${INNINGS} innings, 7-card hands`);
console.log(`  Lineup: 9 batters (avg CNT ${(SIM_LINEUP.reduce((s,b) => s+b.contact,0)/9).toFixed(1)}, PWR ${(SIM_LINEUP.reduce((s,b) => s+b.power,0)/9).toFixed(1)}, SPD ${(SIM_LINEUP.reduce((s,b) => s+b.speed,0)/9).toFixed(1)})`);
console.log(`  Pitcher: VEL ${OPP_PITCHER.velocity}, CTL ${OPP_PITCHER.control}, STA ${OPP_PITCHER.stamina}`);
console.log('  Includes: discards, contact rescue, situational plays, batter stats\n');
console.log('  Running...\n');

const allStats = [];
const aggHandTypes = {};
const aggOutsByType = {};
let totalRuns = 0;
let totalAtBats = 0;
let totalOuts = 0;
let totalWalks = 0;
let totalHBPs = 0;
let totalContactRescues = 0;
let totalErrors = 0;
let totalDPs = 0;
let totalCountKs = 0;
const runsDistribution = {};

for (let g = 0; g < NUM_GAMES; g++) {
  const stats = simulateGame();
  allStats.push(stats);

  totalRuns += stats.runs;
  totalAtBats += stats.totalAtBats;
  totalOuts += stats.totalOuts;
  totalWalks += stats.walks;
  totalHBPs += stats.hbps;
  totalContactRescues += stats.contactRescues;
  totalErrors += stats.errors;
  totalDPs += stats.doublePlays;
  totalCountKs += stats.countStrikeouts;

  for (const [type, count] of Object.entries(stats.handTypes)) {
    aggHandTypes[type] = (aggHandTypes[type] || 0) + count;
  }
  for (const [type, count] of Object.entries(stats.outsByType)) {
    aggOutsByType[type] = (aggOutsByType[type] || 0) + count;
  }

  const bucket = stats.runs;
  runsDistribution[bucket] = (runsDistribution[bucket] || 0) + 1;

  if (VERBOSE) {
    console.log(`  Game ${g + 1}: ${stats.runs} runs, ${stats.totalAtBats} ABs, ${stats.totalOuts} outs, ${stats.walks} BB`);
  }
}

// ── Results ─────────────────────────────────────────────

const avgRuns = (totalRuns / NUM_GAMES).toFixed(1);
const avgABs = (totalAtBats / NUM_GAMES).toFixed(1);
const outRate = ((totalOuts / totalAtBats) * 100).toFixed(1);
const runsArr = allStats.map(s => s.runs).sort((a, b) => a - b);
const medianRuns = runsArr[Math.floor(runsArr.length / 2)];
const minRuns = runsArr[0];
const maxRuns = runsArr[runsArr.length - 1];
const p10 = runsArr[Math.floor(runsArr.length * 0.1)];
const p90 = runsArr[Math.floor(runsArr.length * 0.9)];

console.log('  ══════════════════════════════════════════════════');
console.log('  BATTING BALANCE SUMMARY');
console.log('  ══════════════════════════════════════════════════\n');

console.log(`  Games:         ${NUM_GAMES}`);
console.log(`  Avg Runs:      ${avgRuns}`);
console.log(`  Median Runs:   ${medianRuns}`);
console.log(`  Range:         ${minRuns} - ${maxRuns}`);
console.log(`  10th/90th:     ${p10} / ${p90}`);
console.log(`  Avg ABs/game:  ${avgABs}`);
console.log(`  Out Rate:      ${outRate}%`);

console.log('\n  ── Situational Stats (per game avg) ──\n');
console.log(`  Walks:           ${(totalWalks / NUM_GAMES).toFixed(1)}`);
console.log(`  HBPs:            ${(totalHBPs / NUM_GAMES).toFixed(2)}`);
console.log(`  Count Ks:        ${(totalCountKs / NUM_GAMES).toFixed(1)}`);
console.log(`  Contact Rescues: ${(totalContactRescues / NUM_GAMES).toFixed(1)}`);
console.log(`  Errors:          ${(totalErrors / NUM_GAMES).toFixed(2)}`);
console.log(`  Double Plays:    ${(totalDPs / NUM_GAMES).toFixed(2)}`);

console.log('\n  ── Hand Type Distribution ──\n');
console.log('  Hand Type          | Played | Out Rate | Pct of ABs');
console.log('  -------------------|--------|----------|----------');

const sortedTypes = Object.entries(aggHandTypes)
  .sort((a, b) => b[1] - a[1]);

for (const [type, count] of sortedTypes) {
  const outs = aggOutsByType[type] || 0;
  const typeOutRate = count > 0 ? ((outs / count) * 100).toFixed(1) : '0.0';
  const pctABs = ((count / totalAtBats) * 100).toFixed(1);
  const padded = type.padEnd(19);
  console.log(`  ${padded}| ${String(count).padStart(6)} | ${typeOutRate.padStart(6)}% | ${pctABs.padStart(6)}%`);
}

console.log('\n  ── Runs Distribution ──\n');

const maxBucket = Math.max(...Object.keys(runsDistribution).map(Number));
const barScale = 40;
const maxCount = Math.max(...Object.values(runsDistribution));

for (let r = 0; r <= Math.min(maxBucket, 25); r++) {
  const count = runsDistribution[r] || 0;
  const barLen = Math.round((count / maxCount) * barScale);
  const bar = '#'.repeat(barLen);
  const pct = ((count / NUM_GAMES) * 100).toFixed(0);
  console.log(`  ${String(r).padStart(3)} runs: ${bar.padEnd(barScale)} ${pct}%`);
}
if (maxBucket > 25) {
  let overflow = 0;
  for (let r = 26; r <= maxBucket; r++) overflow += runsDistribution[r] || 0;
  console.log(`  26+ runs: ${'#'.repeat(Math.round((overflow/maxCount)*barScale)).padEnd(barScale)} ${((overflow/NUM_GAMES)*100).toFixed(0)}%`);
}

console.log('\n  ══════════════════════════════════════════════════\n');

// ── Quick health check ──────────────────────────────────

const warnings = [];
if (parseFloat(avgRuns) > 25) warnings.push(`AVG RUNS TOO HIGH (${avgRuns}) — target 10-20`);
if (parseFloat(avgRuns) < 5) warnings.push(`AVG RUNS TOO LOW (${avgRuns}) — target 10-20`);
if (parseFloat(outRate) < 40) warnings.push(`OUT RATE TOO LOW (${outRate}%) — target 45-65%`);
if (parseFloat(outRate) > 75) warnings.push(`OUT RATE TOO HIGH (${outRate}%) — target 45-65%`);
if (maxRuns > 60) warnings.push(`MAX RUNS EXTREME (${maxRuns}) — possible degenerate strategy`);

if (warnings.length > 0) {
  console.log('  WARNINGS:');
  for (const w of warnings) {
    console.log(`    !! ${w}`);
  }
  console.log('');
} else {
  console.log('  All checks passed.\n');
}

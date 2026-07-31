/**
 * Hand rankings table.
 * Order matters: index 0 = best hand, index 9 = worst.
 * Adjust peanuts/mult here to balance the game.
 *
 * INVARIANT — the ladder must stay MONOTONIC in hand strength: going down the
 * list, neither `peanuts * mult` nor the outcome's base value may ever increase.
 * A rarer hand must never pay less than a more common one. Enforced by the
 * "hand table ... is monotonic" tests in test/sim.js.
 *
 * INVARIANT — NO hand class maps directly to 'Triple'. In real baseball a triple
 * is the rarest hit, rarer than a home run. Flush and Straight used to map to
 * Triple, and since both are common in a 7-card draw that pushed triples to ~6.9%
 * of at-bats against a real-world ~0.5% — the second-most-common hit, and ~3x more
 * frequent than home runs. Triples now come only from three narrow paths: the
 * Straight Flush roll (CardEngine), the speed-driven stretch of a Double
 * (SituationalEngine._checkStretchTriple), and the Leg It Out batter trait.
 * See "The Triple Is Sacred" in the GDD.
 */
export default [
  { handName: 'Royal Flush',      outcome: 'Home Run',  peanuts: 15, mult: 20 },
  { handName: 'Straight Flush',   outcome: 'Home Run',  peanuts: 10, mult: 10, rollOutcome: true },
  { handName: 'Four of a Kind',   outcome: 'Home Run',  peanuts: 10, mult: 6 },
  { handName: 'Full House',       outcome: 'Home Run',  peanuts: 8,  mult: 5 },
  { handName: 'Flush',            outcome: 'Double',    peanuts: 5,  mult: 5 },
  { handName: 'Straight',         outcome: 'Double',             peanuts: 4,  mult: 4 },
  { handName: 'Three of a Kind',  outcome: 'Double',             peanuts: 3,  mult: 3 },
  { handName: 'Two Pair',         outcome: 'Single',             peanuts: 2,  mult: 2 },
  { handName: 'Pair',             outcome: 'Single',             peanuts: 1,  mult: 1.5 },
  { handName: 'High Card',        outcome: 'Strikeout',          peanuts: 0,  mult: 1 },
];

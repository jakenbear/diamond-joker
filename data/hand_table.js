/**
 * Hand rankings table.
 * Order matters: index 0 = best hand, index 9 = worst.
 * Adjust peanuts/mult here to balance the game.
 *
 * INVARIANT — the ladder must stay MONOTONIC in hand strength: going down the
 * list, neither `peanuts * mult` nor the outcome's base value may ever increase.
 * A rarer hand must never pay less than a more common one. Enforced by the
 * "hand table ... is monotonic" tests in test/sim.js.
 */
export default [
  { handName: 'Royal Flush',      outcome: 'Home Run',  peanuts: 15, mult: 20 },
  { handName: 'Straight Flush',   outcome: 'Home Run',  peanuts: 10, mult: 10, rollOutcome: true },
  { handName: 'Four of a Kind',   outcome: 'Home Run',  peanuts: 10, mult: 6 },
  { handName: 'Full House',       outcome: 'Home Run',  peanuts: 8,  mult: 5 },
  { handName: 'Flush',            outcome: 'Triple',    peanuts: 5,  mult: 5 },
  { handName: 'Straight',         outcome: 'Triple',             peanuts: 4,  mult: 4 },
  { handName: 'Three of a Kind',  outcome: 'Double',             peanuts: 3,  mult: 3 },
  { handName: 'Two Pair',         outcome: 'Double',             peanuts: 2,  mult: 2 },
  { handName: 'Pair',             outcome: 'Single',             peanuts: 1,  mult: 1.5 },
  { handName: 'High Card',        outcome: 'Strikeout',          peanuts: 0,  mult: 1 },
];

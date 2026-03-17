/**
 * Hand rankings table.
 * Order matters: index 0 = best hand, index 9 = worst.
 * Adjust peanuts/mult here to balance the game.
 */
export default [
  { handName: 'Royal Flush',      outcome: 'Home Run',  peanuts: 15, mult: 20 },
  { handName: 'Straight Flush',   outcome: 'Home Run',  peanuts: 10, mult: 10, rollOutcome: true },
  { handName: 'Four of a Kind',   outcome: 'Triple',    peanuts: 6,  mult: 6 },
  { handName: 'Full House',       outcome: 'Double',    peanuts: 3,  mult: 2.5 },
  { handName: 'Flush',            outcome: 'Double',    peanuts: 5,  mult: 5 },
  { handName: 'Straight',         outcome: 'Home Run',           peanuts: 4,  mult: 4 },
  { handName: 'Three of a Kind',  outcome: 'Triple',             peanuts: 3,  mult: 3 },
  { handName: 'Two Pair',         outcome: 'Double',             peanuts: 2,  mult: 2 },
  { handName: 'Pair',             outcome: 'Single',             peanuts: 1,  mult: 1.5 },
  { handName: 'High Card',        outcome: 'Strikeout',          peanuts: 0,  mult: 1 },
];

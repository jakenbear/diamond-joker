/**
 * Hand rankings table.
 * Order matters: index 0 = best hand, index 9 = worst.
 * Adjust chips/mult here to balance the game.
 */
export default [
  { handName: 'Royal Flush',      outcome: 'Perfect Game',       chips: 15, mult: 20 },
  { handName: 'Straight Flush',   outcome: 'Walk-Off',           chips: 10, mult: 10 },
  { handName: 'Four of a Kind',   outcome: 'Inside-the-Park HR', chips: 6,  mult: 6 },
  { handName: 'Full House',       outcome: 'RBI Double',         chips: 3,  mult: 2.5 },
  { handName: 'Flush',            outcome: 'Grand Slam',         chips: 5,  mult: 5 },
  { handName: 'Straight',         outcome: 'Home Run',           chips: 4,  mult: 4 },
  { handName: 'Three of a Kind',  outcome: 'Triple',             chips: 3,  mult: 3 },
  { handName: 'Two Pair',         outcome: 'Double',             chips: 2,  mult: 2 },
  { handName: 'Pair',             outcome: 'Single',             chips: 1,  mult: 1.5 },
  { handName: 'High Card',        outcome: 'Strikeout',          chips: 0,  mult: 1 },
];

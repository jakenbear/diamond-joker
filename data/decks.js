/**
 * Deck definitions.
 * Each deck has a name, description, and a cards array (or a build function).
 * CardEngine accepts a deck id to determine which cards to use.
 */

const SUITS = ['H', 'D', 'C', 'S'];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J, 12=Q, 13=K, 14=A

function buildCards(suits, ranks) {
  const cards = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      cards.push({ rank, suit, id: `${rank}${suit}` });
    }
  }
  return cards;
}

const DECKS = {
  standard: {
    name: 'Standard',
    description: '52-card deck — the classic.',
    discards: 2,
    handSize: 7,
    build: () => buildCards(SUITS, RANKS),
  },
  no_face: {
    name: 'No Face',
    description: '40 cards — no Jacks, Queens, or Kings. Straights are tighter.',
    discards: 2,
    handSize: 7,
    build: () => buildCards(SUITS, RANKS.filter(r => r < 11 || r === 14)),
  },
  double: {
    name: 'Double Deck',
    description: '104 cards — two full decks shuffled together. Pairs everywhere.',
    discards: 3,
    handSize: 7,
    build: () => [...buildCards(SUITS, RANKS), ...buildCards(SUITS, RANKS)],
  },
  all_hearts: {
    name: 'All Hearts',
    description: '52 cards, all Hearts. Flushes guaranteed, suits won\'t help.',
    discards: 2,
    handSize: 7,
    build: () => buildCards(['H'], RANKS).concat(
      buildCards(['H'], RANKS),
      buildCards(['H'], RANKS),
      buildCards(['H'], RANKS),
    ),
  },
  small_ball: {
    name: 'Small Ball',
    description: '32 cards — only 7 and up. High-value hands, smaller deck.',
    discards: 2,
    handSize: 7,
    build: () => buildCards(SUITS, RANKS.filter(r => r >= 7)),
  },
};

export default DECKS;
export { SUITS, RANKS, buildCards };

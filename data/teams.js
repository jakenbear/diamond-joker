/**
 * teams.js - 4 national teams with full rosters.
 * Each team: 9 position players (set batting order) + 5 pitchers.
 * Positions: C, 1B, 2B, 3B, SS, LF, CF, RF, DH
 * Stats range: 3-10
 */

const TEAMS = [
  // ── CANADA ─────────────────────────────────────────────
  {
    id: 'CAN',
    name: 'Canada',
    city: 'Toronto',
    nickname: 'Mounties',
    logo: '🍁',
    color: '#e53935',      // red
    colorAlt: '#ffffff',
    colorHex: 0xe53935,
    style: 'Balanced power and grit',
    batters: [
      { name: 'Moose Leblanc',     pos: 'CF',  power: 5, contact: 8, speed: 8, bats: 'L', innateTraits: ['leadoff_king', 'stolen_base'] },
      { name: 'Ace Tremblay',      pos: 'SS',  power: 6, contact: 7, speed: 7, bats: 'R', innateTraits: ['contact_lens', 'double_mcgee'] },
      { name: 'Buck Fournier',     pos: '1B',  power: 9, contact: 5, speed: 3, bats: 'L', innateTraits: ['slugger_serum', 'cleanup_crew'] },
      { name: 'Bear Campbell',     pos: 'DH',  power: 8, contact: 6, speed: 4, bats: 'R', innateTraits: ['eye_of_the_tiger', 'hot_corner'] },
      { name: 'Flash Bouchard',    pos: 'LF',  power: 7, contact: 6, speed: 7, bats: 'R', innateTraits: ['rally_cap', 'pinch_hitter'] },
      { name: 'Dusty Roy',         pos: '3B',  power: 6, contact: 7, speed: 5, bats: 'R', innateTraits: ['dugout_fire', 'sacrifice_fly'] },
      { name: 'Hawk Sinclair',     pos: 'RF',  power: 7, contact: 5, speed: 6, bats: 'R', innateTraits: ['closer', 'extra_innings'] },
      { name: 'Sparky Makinen',    pos: '2B',  power: 4, contact: 8, speed: 6, bats: 'L', innateTraits: ['switch_hitter', 'bunt_single'] },
      { name: 'Iron Mike Dumont',  pos: 'C',   power: 6, contact: 6, speed: 3, bats: 'R', innateTraits: ['batting_gloves', 'grand_ambition'] },
    ],
    pitchers: [
      { name: 'Blizzard Beaulieu', velocity: 9,  control: 5, stamina: 5, throws: 'R' },
      { name: 'Doc Savard',        velocity: 6,  control: 9, stamina: 6, throws: 'L' },
      { name: 'Timber Ouellet',    velocity: 8,  control: 6, stamina: 6, throws: 'R' },
      { name: 'Frostbite Carriere',velocity: 7,  control: 7, stamina: 7, throws: 'R' },
      { name: 'Northwind Picard',  velocity: 5,  control: 8, stamina: 8, throws: 'L' },
    ],
  },

  // ── USA ────────────────────────────────────────────────
  {
    id: 'USA',
    name: 'USA',
    city: 'New York',
    nickname: 'Eagles',
    logo: '🦅',
    color: '#1565c0',      // blue
    colorAlt: '#e53935',
    colorHex: 0x1565c0,
    style: 'Raw power and velocity',
    batters: [
      { name: 'Jet Williams',     pos: 'CF',  power: 5, contact: 7, speed: 9, bats: 'L', innateTraits: ['leadoff_king', 'stolen_base'] },
      { name: 'Slick Henderson',  pos: '2B',  power: 5, contact: 9, speed: 6, bats: 'R', innateTraits: ['contact_lens', 'double_mcgee'] },
      { name: 'Tank Morrison',    pos: '1B',  power: 10, contact: 4, speed: 3, bats: 'R', innateTraits: ['slugger_serum', 'grand_ambition'] },
      { name: 'Brick Callahan',   pos: 'DH',  power: 9, contact: 5, speed: 4, bats: 'R', innateTraits: ['cleanup_crew', 'eye_of_the_tiger'] },
      { name: 'Chopper Davis',    pos: '3B',  power: 7, contact: 7, speed: 5, bats: 'L', innateTraits: ['hot_corner', 'dugout_fire'] },
      { name: 'Sarge Johnson',    pos: 'LF',  power: 8, contact: 5, speed: 5, bats: 'R', innateTraits: ['closer', 'rally_cap'] },
      { name: 'Rocket Harper',    pos: 'RF',  power: 7, contact: 6, speed: 6, bats: 'R', innateTraits: ['extra_innings', 'pinch_hitter'] },
      { name: 'Scooter Patel',    pos: 'SS',  power: 4, contact: 8, speed: 8, bats: 'R', innateTraits: ['walk_machine', 'bunt_single'] },
      { name: 'Bulldog O\'Brien', pos: 'C',   power: 7, contact: 5, speed: 3, bats: 'R', innateTraits: ['sacrifice_fly', 'batting_gloves'] },
    ],
    pitchers: [
      { name: 'Viper Knox',       velocity: 10, control: 4, stamina: 5, throws: 'R' },
      { name: 'Rex "The Arm"',    velocity: 9,  control: 5, stamina: 5, throws: 'R' },
      { name: 'Blister McGraw',   velocity: 8,  control: 6, stamina: 6, throws: 'L' },
      { name: 'The Professor',    velocity: 5,  control: 10, stamina: 6, throws: 'R' },
      { name: 'Sandman Reeves',   velocity: 6,  control: 8, stamina: 7, throws: 'R' },
    ],
  },

  // ── JAPAN ──────────────────────────────────────────────
  {
    id: 'JPN',
    name: 'Japan',
    city: 'Tokyo',
    nickname: 'Dragons',
    logo: '🐉',
    color: '#c62828',      // deep red
    colorAlt: '#ffffff',
    colorHex: 0xc62828,
    style: 'Precision contact and control',
    batters: [
      { name: 'Zip Nakamura',     pos: 'CF',  power: 4, contact: 9, speed: 8, bats: 'R', innateTraits: ['leadoff_king', 'stolen_base'] },
      { name: 'Razor Suzuki',     pos: 'SS',  power: 5, contact: 9, speed: 7, bats: 'L', innateTraits: ['contact_lens', 'switch_hitter'] },
      { name: 'Blaze Tanaka',     pos: '1B',  power: 7, contact: 7, speed: 4, bats: 'R', innateTraits: ['cleanup_crew', 'hot_corner'] },
      { name: 'Hammer Matsui',    pos: 'DH',  power: 8, contact: 7, speed: 3, bats: 'L', innateTraits: ['slugger_serum', 'eye_of_the_tiger'] },
      { name: 'Silk Ohtani',      pos: 'RF',  power: 7, contact: 8, speed: 6, bats: 'L', innateTraits: ['double_mcgee', 'pinch_hitter'] },
      { name: 'Storm Yamada',     pos: '3B',  power: 6, contact: 8, speed: 5, bats: 'R', innateTraits: ['dugout_fire', 'sacrifice_fly'] },
      { name: 'Phantom Ichiro',   pos: 'LF',  power: 4, contact: 10, speed: 9, bats: 'L', innateTraits: ['bunt_single', 'walk_machine'] },
      { name: 'Dice Watanabe',    pos: '2B',  power: 5, contact: 8, speed: 6, bats: 'R', innateTraits: ['ace_in_the_hole', 'batting_gloves'] },
      { name: 'Shield Kobayashi', pos: 'C',   power: 5, contact: 7, speed: 4, bats: 'R', innateTraits: ['rally_cap', 'closer'] },
    ],
    pitchers: [
      { name: 'Razor Ikeda',      velocity: 8, control: 8, stamina: 4, throws: 'R' },
      { name: 'Phantom Yuen',     velocity: 7, control: 9, stamina: 5, throws: 'L' },
      { name: 'Samurai Darvish',  velocity: 9, control: 7, stamina: 4, throws: 'R' },
      { name: 'Mist Sasaki',      velocity: 7, control: 8, stamina: 7, throws: 'R' },
      { name: 'Tempest Uehara',   velocity: 6, control: 9, stamina: 6, throws: 'R' },
    ],
  },

  // ── MEXICO ─────────────────────────────────────────────
  {
    id: 'MEX',
    name: 'Mexico',
    city: 'Mexico City',
    nickname: 'Diablos',
    logo: '🔥',
    color: '#2e7d32',      // green
    colorAlt: '#e53935',
    colorHex: 0x2e7d32,
    style: 'Speed and clutch hitting',
    batters: [
      { name: 'Turbo Ramirez',    pos: 'CF',  power: 4, contact: 7, speed: 10, bats: 'R', innateTraits: ['leadoff_king', 'stolen_base'] },
      { name: 'Dizzy Flores',     pos: '2B',  power: 5, contact: 8, speed: 8, bats: 'L', innateTraits: ['double_mcgee', 'walk_machine'] },
      { name: 'El Toro Gonzalez', pos: '1B',  power: 9, contact: 5, speed: 4, bats: 'R', innateTraits: ['slugger_serum', 'grand_ambition'] },
      { name: 'Fuego Delgado',    pos: 'DH',  power: 8, contact: 6, speed: 5, bats: 'R', innateTraits: ['cleanup_crew', 'eye_of_the_tiger'] },
      { name: 'Venom Cruz',       pos: 'LF',  power: 7, contact: 7, speed: 7, bats: 'L', innateTraits: ['hot_corner', 'pinch_hitter'] },
      { name: 'Pantera Reyes',    pos: '3B',  power: 6, contact: 7, speed: 6, bats: 'R', innateTraits: ['dugout_fire', 'closer'] },
      { name: 'Lightning Herrera',pos: 'SS',  power: 5, contact: 6, speed: 9, bats: 'R', innateTraits: ['extra_glove', 'bunt_single'] },
      { name: 'Lobo Castillo',    pos: 'RF',  power: 6, contact: 7, speed: 7, bats: 'R', innateTraits: ['rally_cap', 'sacrifice_fly'] },
      { name: 'Piedra Morales',   pos: 'C',   power: 7, contact: 5, speed: 3, bats: 'R', innateTraits: ['extra_innings', 'batting_gloves'] },
    ],
    pitchers: [
      { name: 'Tornado Gomez',    velocity: 9,  control: 5, stamina: 6, throws: 'R' },
      { name: 'Wildfire Mendoza', velocity: 10, control: 4, stamina: 5, throws: 'L' },
      { name: 'Smooth Eddie V.',  velocity: 5,  control: 8, stamina: 8, throws: 'R' },
      { name: 'El Diablo Ruiz',   velocity: 8,  control: 6, stamina: 6, throws: 'R' },
      { name: 'Serpiente Luna',   velocity: 7,  control: 7, stamina: 7, throws: 'L' },
    ],
  },
];

export default TEAMS;

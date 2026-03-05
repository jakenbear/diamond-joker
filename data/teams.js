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
      { name: 'Moose Leblanc',     pos: 'CF',  power: 5, contact: 8, speed: 8 },
      { name: 'Ace Tremblay',      pos: 'SS',  power: 6, contact: 7, speed: 7 },
      { name: 'Buck Fournier',     pos: '1B',  power: 9, contact: 5, speed: 3 },
      { name: 'Bear Campbell',     pos: 'DH',  power: 8, contact: 6, speed: 4 },
      { name: 'Flash Bouchard',    pos: 'LF',  power: 7, contact: 6, speed: 7 },
      { name: 'Dusty Roy',         pos: '3B',  power: 6, contact: 7, speed: 5 },
      { name: 'Hawk Sinclair',     pos: 'RF',  power: 7, contact: 5, speed: 6 },
      { name: 'Sparky Makinen',    pos: '2B',  power: 4, contact: 8, speed: 6 },
      { name: 'Iron Mike Dumont',  pos: 'C',   power: 6, contact: 6, speed: 3 },
    ],
    pitchers: [
      { name: 'Blizzard Beaulieu', velocity: 9,  control: 5, stamina: 5 },
      { name: 'Doc Savard',        velocity: 6,  control: 9, stamina: 6 },
      { name: 'Timber Ouellet',    velocity: 8,  control: 6, stamina: 6 },
      { name: 'Frostbite Carriere',velocity: 7,  control: 7, stamina: 7 },
      { name: 'Northwind Picard',  velocity: 5,  control: 8, stamina: 8 },
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
      { name: 'Jet Williams',     pos: 'CF',  power: 5, contact: 7, speed: 9 },
      { name: 'Slick Henderson',  pos: '2B',  power: 5, contact: 9, speed: 6 },
      { name: 'Tank Morrison',    pos: '1B',  power: 10, contact: 4, speed: 3 },
      { name: 'Brick Callahan',   pos: 'DH',  power: 9, contact: 5, speed: 4 },
      { name: 'Chopper Davis',    pos: '3B',  power: 7, contact: 7, speed: 5 },
      { name: 'Sarge Johnson',    pos: 'LF',  power: 8, contact: 5, speed: 5 },
      { name: 'Rocket Harper',    pos: 'RF',  power: 7, contact: 6, speed: 6 },
      { name: 'Scooter Patel',    pos: 'SS',  power: 4, contact: 8, speed: 8 },
      { name: 'Bulldog O\'Brien', pos: 'C',   power: 7, contact: 5, speed: 3 },
    ],
    pitchers: [
      { name: 'Viper Knox',       velocity: 10, control: 4, stamina: 5 },
      { name: 'Rex "The Arm"',    velocity: 9,  control: 5, stamina: 5 },
      { name: 'Blister McGraw',   velocity: 8,  control: 6, stamina: 6 },
      { name: 'The Professor',    velocity: 5,  control: 10, stamina: 6 },
      { name: 'Sandman Reeves',   velocity: 6,  control: 8, stamina: 7 },
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
      { name: 'Zip Nakamura',     pos: 'CF',  power: 4, contact: 9, speed: 8 },
      { name: 'Razor Suzuki',     pos: 'SS',  power: 5, contact: 9, speed: 7 },
      { name: 'Blaze Tanaka',     pos: '1B',  power: 7, contact: 7, speed: 4 },
      { name: 'Hammer Matsui',    pos: 'DH',  power: 8, contact: 7, speed: 3 },
      { name: 'Silk Ohtani',      pos: 'RF',  power: 7, contact: 8, speed: 6 },
      { name: 'Storm Yamada',     pos: '3B',  power: 6, contact: 8, speed: 5 },
      { name: 'Phantom Ichiro',   pos: 'LF',  power: 4, contact: 10, speed: 9 },
      { name: 'Dice Watanabe',    pos: '2B',  power: 5, contact: 8, speed: 6 },
      { name: 'Shield Kobayashi', pos: 'C',   power: 5, contact: 7, speed: 4 },
    ],
    pitchers: [
      { name: 'Razor Ikeda',      velocity: 8, control: 8, stamina: 4 },
      { name: 'Phantom Yuen',     velocity: 7, control: 9, stamina: 5 },
      { name: 'Samurai Darvish',  velocity: 9, control: 7, stamina: 4 },
      { name: 'Mist Sasaki',      velocity: 7, control: 8, stamina: 7 },
      { name: 'Tempest Uehara',   velocity: 6, control: 9, stamina: 6 },
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
      { name: 'Turbo Ramirez',    pos: 'CF',  power: 4, contact: 7, speed: 10 },
      { name: 'Dizzy Flores',     pos: '2B',  power: 5, contact: 8, speed: 8 },
      { name: 'El Toro Gonzalez', pos: '1B',  power: 9, contact: 5, speed: 4 },
      { name: 'Fuego Delgado',    pos: 'DH',  power: 8, contact: 6, speed: 5 },
      { name: 'Venom Cruz',       pos: 'LF',  power: 7, contact: 7, speed: 7 },
      { name: 'Pantera Reyes',    pos: '3B',  power: 6, contact: 7, speed: 6 },
      { name: 'Lightning Herrera',pos: 'SS',  power: 5, contact: 6, speed: 9 },
      { name: 'Lobo Castillo',    pos: 'RF',  power: 6, contact: 7, speed: 7 },
      { name: 'Piedra Morales',   pos: 'C',   power: 7, contact: 5, speed: 3 },
    ],
    pitchers: [
      { name: 'Tornado Gomez',    velocity: 9,  control: 5, stamina: 6 },
      { name: 'Wildfire Mendoza', velocity: 10, control: 4, stamina: 5 },
      { name: 'Smooth Eddie V.',  velocity: 5,  control: 8, stamina: 8 },
      { name: 'El Diablo Ruiz',   velocity: 8,  control: 6, stamina: 6 },
      { name: 'Serpiente Luna',   velocity: 7,  control: 7, stamina: 7 },
    ],
  },
];

export default TEAMS;

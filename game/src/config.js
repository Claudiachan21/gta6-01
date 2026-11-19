// Solmar Bay — tuning, palette and layout constants for the whole game.
// The city is a grid: streets every 44 units, roads 12 wide, blocks 32 wide.
export const WORLD_HALF = 198;
export const PITCH = 44;
export const ROAD_HALF = 6;
export const STREETS = [-176, -132, -88, -44, 0, 44, 88, 132, 176];
export const BLOCK_CENTERS = [-154, -110, -66, -22, 22, 66, 110, 154];
export const SAVE_KEY = 'solmar-bay-save-v2';
export const SAVE_VERSION = 2;
export const START_CASH = 120;
export const DAY_LENGTH = 360;
export const DAY_START = 10;
export const GARAGE_POS = { x: 22, z: 154 };
export const STADIUM_POS = { x: -154, z: 154 };
export const STADIUM_GATE = { x: -134, z: 154 };
export const PLAZA_POS = { x: 66, z: -66 };
export const LIGHTHOUSE_POS = { x: 208, z: -168 };
export const HARBOR_POS = { x: 192, z: -122 };
export const PIER_POS = { x: 246, z: 60 };

export const COLORS = {
  sky: 0x8ec9ee,
  fog: 0xa9d1e8,
  sun: 0xfff1d6,
  ground: 0xcfc8b8,
  asphalt: 0x33373d,
  sidewalk: 0xb9b3a4,
  park: 0x7fae6a,
  sand: 0xe8d9a8,
  water: 0x2e7fb8,
  buildingTints: [0xf2e6cf, 0xe8b48f, 0x9fd4c5, 0xe89a8f, 0xf5f0e1, 0xc9d6e8, 0xd9c28a, 0xb8c9a3],
  downtownTints: [0x8fb4d6, 0x7fa8c9, 0xa8c4d8, 0x93a8bd],
  carPaint: [0xc23b2e, 0x2e6fc2, 0xe8c832, 0x3aa655, 0xeeeeee, 0x222222, 0x7a4fb0, 0xe87a2e],
  courierTeal: 0x1f8a7a,
  neonPink: 0xff5a8a,
  policeWhite: 0xf2f2f2,
  policeBlue: 0x1c3f8f,
};

export const TUNING = {
  walkSpeed: 6,
  runSpeed: 10.5,
  playerRadius: 0.6,
  carAccel: 24,
  carBrake: 34,
  carMaxSpeed: 40,
  carMaxReverse: 12,
  carTurn: 1.9,
  carRadius: 2.1,
  trafficSpeed: 11,
  pedSpeed: 1.6,
  copMaxSpeed: 42,
  copSpawnMin: 55,
  copSpawnMax: 95,
  wantedDecaySeconds: 9,
  bustedSeconds: 3,
  pistolDamage: 34,
  pistolAmmo: 12,
  rivalHealth: 68,
  rivalDamage: 7,
  playerHealth: 100,
  healthRegen: 2.5,
  bribeCost: 100,
  repaintCost: 50,
  roadblockWanted: 3,
};

/** Per-kind handling: muscle is fast and loose, trucks are slow and heavy. */
export const HANDLING = {
  sedan: { max: 40, accel: 24, turn: 1.9 },
  sport: { max: 44, accel: 28, turn: 2.0 },
  muscle: { max: 48, accel: 30, turn: 1.7 },
  pickup: { max: 36, accel: 22, turn: 1.8 },
  van: { max: 34, accel: 20, turn: 1.7 },
  taxi: { max: 40, accel: 24, turn: 1.9 },
  limo: { max: 34, accel: 18, turn: 1.5 },
  truck: { max: 30, accel: 16, turn: 1.4 },
  police: { max: 42, accel: 26, turn: 1.9 },
};

/** What Sunset Auto pays for a stolen car of each kind (plus a small vary). */
export const SALE_VALUE = {
  sedan: 100,
  sport: 150,
  muscle: 170,
  pickup: 120,
  van: 110,
  taxi: 80,
  limo: 160,
  truck: 130,
};

export const KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  enterCar: ['KeyE'],
  handbrake: ['Space'],
  reload: ['KeyR'],
  pause: ['Escape', 'KeyP'],
  mute: ['KeyM'],
  camera: ['KeyC'],
  garage: ['KeyG'],
  repaint: ['KeyB'],
  radio: ['KeyT'],
  photo: ['KeyF'],
};

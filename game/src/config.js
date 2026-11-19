// Solmar Bay v2 — tuning, palette, districts and layout constants.
// The city is a grid: streets every 44 units, roads 12 wide, blocks 32 wide.
export const WORLD_HALF = 198;
export const PITCH = 44;
export const ROAD_HALF = 6;
export const STREETS = [-176, -132, -88, -44, 0, 44, 88, 132, 176];
export const BLOCK_CENTERS = [-154, -110, -66, -22, 22, 66, 110, 154];
export const SAVE_KEY = 'solmar-bay-save-v2';
export const START_CASH = 120;

// A full day lasts 6 minutes of play; the game opens at 10:00 in the morning.
export const DAY_LENGTH_SECONDS = 360;
export const DAY_START_HOUR = 10;

// Nine named districts tile the map; the HUD toasts the name on arrival.
export const DISTRICTS = [
  { name: 'DOWNTOWN', x0: -66, z0: -66, x1: 66, z1: 66 },
  { name: 'HARBOR', x0: 66, z0: -198, x1: 198, z1: -66 },
  { name: 'MARINA', x0: 66, z0: 66, x1: 198, z1: 198 },
  { name: 'BEACHFRONT', x0: 66, z0: -66, x1: 198, z1: 66 },
  { name: 'OLD TOWN', x0: -198, z0: -198, x1: -66, z1: -66 },
  { name: 'UPTOWN', x0: -198, z0: 66, x1: -66, z1: 198 },
  { name: 'WESTSIDE', x0: -198, z0: -66, x1: -66, z1: 66 },
  { name: 'NORTHGATE', x0: -66, z0: -198, x1: 66, z1: -66 },
  { name: 'SOUTHSIDE', x0: -66, z0: 66, x1: 66, z1: 198 },
];

// Sunset Auto: sell any stolen car here, or pay off the heat on foot.
export const GARAGE = {
  x: 22,
  z: 154,
  radius: 11,
  bribe: 100,
  prices: { sedan: 80, sport: 150, van: 120, taxi: 100, pickup: 130, muscle: 180 },
};

// Per-kind handling: acceleration, top speed (units/s) and steering.
export const VEHICLE_HANDLING = {
  sedan: { accel: 24, maxSpeed: 40, turn: 1.9 },
  sport: { accel: 30, maxSpeed: 46, turn: 2.1 },
  van: { accel: 18, maxSpeed: 32, turn: 1.5 },
  taxi: { accel: 24, maxSpeed: 40, turn: 1.9 },
  police: { accel: 27, maxSpeed: 42, turn: 2.0 },
  pickup: { accel: 22, maxSpeed: 38, turn: 1.7 },
  muscle: { accel: 32, maxSpeed: 48, turn: 1.8 },
};

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
  policeWhite: 0xf2f2f2,
  policeBlue: 0x1c3f8f,
  // Day/night keyframes: the sky and fog lerp between these through the day.
  daySky: 0x8ec9ee,
  duskSky: 0xff8a4d,
  nightSky: 0x0d1626,
  nightFog: 0x16233a,
  moon: 0x9db8e8,
  lampGlow: 0xffe9a8,
  neonPink: 0xff5a8a,
  neonCyan: 0x4de8ff,
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
  trafficCount: 20,
  pedSpeed: 1.6,
  pedCount: 28,
  copMaxSpeed: 42,
  copSpawnMin: 55,
  copSpawnMax: 95,
  wantedDecaySeconds: 9,
  bustedSeconds: 3,
  roadblockWanted: 3,
  pistolDamage: 34,
  pistolAmmo: 12,
  rivalHealth: 68,
  rivalDamage: 7,
  playerHealth: 100,
  healthRegen: 2.5,
  stashCount: 12,
  stashReward: 50,
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
};

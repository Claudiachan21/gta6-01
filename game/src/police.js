// The wanted system: stars rise with crime, cruisers spawn and chase,
// heat fades out of sight; at 3+ stars the cops throw a roadblock ahead.
import { TUNING } from './config.js';
import { randomRoadPoint } from './city.js';
import { driveCar, steerToward, updateLightBar } from './driving.js';
import { spawnPoliceCar } from './vehicles.js';
import { playerPosition, playerSpeed } from './player.js';

export function createPolice() {
  return {
    wanted: 0,
    cops: [],
    roadblock: [],
    unseen: 0,
    bustedTimer: 0,
    sirenOn: false,
    /** Staged shots set this to keep their own roadblock the only one. */
    noRoadblock: false,
    /** Max cruisers in the chase; null means 2 + wanted level. */
    cap: null,
  };
}

/** Raise the wanted level, up to five stars. */
export function addWanted(police, amount) {
  police.wanted = Math.min(5, police.wanted + amount);
  police.unseen = 0;
}

/** Set the wanted level outright (mission starts that want full heat). */
export function setWanted(police, level) {
  police.wanted = Math.max(0, Math.min(5, level));
  police.unseen = 0;
}

/** Drop all heat (after being busted, or a mission that clears it). */
export function clearWanted(police) {
  police.wanted = 0;
  police.unseen = 0;
  police.bustedTimer = 0;
}

function spawnCop(world) {
  const pos = playerPosition(world.player);
  let x = pos.x;
  let z = pos.z;
  for (let tries = 0; tries < 8; tries += 1) {
    const point = randomRoadPoint(world.rng);
    const d = Math.hypot(point.x - pos.x, point.z - pos.z);
    if (d > TUNING.copSpawnMin && d < TUNING.copSpawnMax) {
      x = point.x;
      z = point.z;
      break;
    }
  }
  const heading = Math.atan2(pos.x - x, pos.z - z);
  const cop = spawnPoliceCar(world.scene, x, z, heading);
  world.allCars.push(cop);
  world.police.cops.push(cop);
  return cop;
}

function removeCop(world, cop) {
  world.scene.remove(cop.mesh);
  world.allCars = world.allCars.filter((c) => c !== cop);
  world.police.cops = world.police.cops.filter((c) => c !== cop);
}

/** Two cruisers angled across the road ahead of the player. */
function placeRoadblock(world) {
  const player = world.player;
  const pos = playerPosition(player);
  const heading = player.onFoot ? player.heading : player.car.heading;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const ahead = 42;
  const cx = pos.x + fx * ahead;
  const cz = pos.z + fz * ahead;
  const px = -fz;
  const pz = fx;
  const cars = [];
  for (const [side, tilt] of [[-3.2, 0.7], [3.2, -0.6]]) {
    const car = spawnPoliceCar(world.scene, cx + px * side, cz + pz * side, heading + tilt);
    car.state = 'police';
    world.allCars.push(car);
    cars.push(car);
  }
  world.police.roadblock = cars;
}

function clearRoadblock(world) {
  for (const car of world.police.roadblock) {
    world.scene.remove(car.mesh);
    world.allCars = world.allCars.filter((c) => c !== car);
  }
  world.police.roadblock = [];
}

/** Where the player will be in `lead` seconds (for interception steering). */
function playerVelocity(player) {
  if (player.onFoot) {
    return { x: Math.sin(player.heading) * player.speed, z: Math.cos(player.heading) * player.speed };
  }
  return { x: Math.sin(player.car.heading) * player.car.speed, z: Math.cos(player.car.heading) * player.car.speed };
}

/**
 * Run the chase: spawn cruisers to match the wanted level, drive them at
 * the player, fade stars when unseen, and time a bust. Returns 'busted'
 * when the player is caught, else null.
 */
export function updatePolice(dt, world) {
  const police = world.police;
  const player = world.player;
  const pos = playerPosition(player);
  const want = police.wanted === 0 ? 0 : Math.min(police.cap ?? 2 + police.wanted, 6);
  while (police.cops.length < want) spawnCop(world);
  while (police.cops.length > want) removeCop(world, police.cops[police.cops.length - 1]);

  // Roadblock: up while the heat is 3+ and the player is driving, gone
  // when it cools off. The block sits ahead of the player's nose.
  if (police.wanted >= TUNING.roadblockWanted && !player.onFoot && police.roadblock.length === 0 && !police.noRoadblock) {
    placeRoadblock(world);
    world.hud.toast('Roadblock ahead!');
  } else if ((police.wanted < TUNING.roadblockWanted || player.onFoot) && police.roadblock.length > 0) {
    clearRoadblock(world);
  }
  for (const car of police.roadblock) updateLightBar(car, dt);

  const vel = playerVelocity(player);
  let nearest = Infinity;
  police.cops.forEach((cop, i) => {
    // Intercept: aim where the player will be, fanning out per cruiser.
    const lead = 0.9;
    const side = (i % 2 === 0 ? 1 : -1) * (3 + i * 1.5);
    const tx = pos.x + vel.x * lead - Math.cos(player.heading) * side * 0.4;
    const tz = pos.z + vel.z * lead + Math.sin(player.heading) * side * 0.4;
    const axes = steerToward(cop, tx, tz);
    driveCar(dt, cop, axes, world);
    const d = Math.hypot(cop.mesh.position.x - pos.x, cop.mesh.position.z - pos.z);
    if (d < nearest) nearest = d;
  });
  for (const car of police.roadblock) {
    const d = Math.hypot(car.mesh.position.x - pos.x, car.mesh.position.z - pos.z);
    if (d < nearest) nearest = d;
  }
  police.sirenOn = (police.cops.length > 0 || police.roadblock.length > 0) && nearest < 120;

  if (police.wanted > 0) {
    if (nearest > 70) {
      police.unseen += dt;
      if (police.unseen > TUNING.wantedDecaySeconds) {
        police.wanted -= 1;
        police.unseen = 0;
      }
    } else {
      police.unseen = 0;
    }
    if (nearest < 7 && playerSpeed(player) < 3) {
      police.bustedTimer += dt;
      if (police.bustedTimer > TUNING.bustedSeconds) return 'busted';
    } else {
      police.bustedTimer = 0;
    }
  }
  return null;
}

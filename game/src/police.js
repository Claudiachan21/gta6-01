// The wanted system: stars rise with crime, police cruisers spawn and chase
// the player, and the heat fades when the player stays out of sight. Get
// caught standing still next to a cruiser and Mara is busted.
import { TUNING } from './config.js';
import { randomRoadPoint } from './city.js';
import { driveCar, steerToward } from './driving.js';
import { spawnPoliceCar } from './vehicles.js';
import { playerPosition, playerSpeed } from './player.js';

export function createPolice() {
  return {
    wanted: 0,
    cops: [],
    unseen: 0,
    bustedTimer: 0,
    sirenOn: false,
    /** Max cruisers in the chase; null means 2 + wanted level. */
    cap: null,
  };
}

/** Raise the wanted level, up to five stars. */
export function addWanted(police, amount) {
  police.wanted = Math.min(5, police.wanted + amount);
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

  let nearest = Infinity;
  for (const cop of police.cops) {
    const axes = steerToward(cop, pos.x, pos.z);
    driveCar(dt, cop, axes, world);
    const d = Math.hypot(cop.mesh.position.x - pos.x, cop.mesh.position.z - pos.z);
    if (d < nearest) nearest = d;
  }
  police.sirenOn = police.cops.length > 0 && nearest < 120;

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

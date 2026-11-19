// The wanted system: stars rise with crime, police cruisers spawn and chase
// the player, and the heat fades when the player stays out of sight. Get
// caught standing still next to a cruiser and Mara is busted. At three
// stars and up the cops set roadblocks ahead of the player, and cruisers
// steer to an intercept point ahead of a moving target instead of chasing
// its tail.
import { TUNING } from './config.js';
import { nearestStreet, randomRoadPoint } from './city.js';
import { driveCar, steerToward } from './driving.js';
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
    /** Max cruisers in the chase; null means 2 + wanted level. */
    cap: null,
    /** Staged screenshots can switch live roadblocks off (they place their own). */
    roadblockEnabled: true,
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
  world.police.roadblock = world.police.roadblock.filter((c) => c !== cop);
}

/** Where the player is heading, so cruisers can cut them off. */
function interceptPoint(player) {
  const pos = playerPosition(player);
  const heading = player.onFoot ? player.heading : player.car.heading;
  const speed = playerSpeed(player);
  const lead = Math.min(1.2, speed * 0.045);
  return { x: pos.x + Math.sin(heading) * speed * lead, z: pos.z + Math.cos(heading) * speed * lead };
}

/**
 * Set a roadblock: two cruisers angled across the player's street ahead of
 * them. Blockers sit still until the player gets close, then join the chase.
 */
function setRoadblock(world) {
  const player = world.player;
  const pos = playerPosition(player);
  const heading = player.onFoot ? player.heading : player.car.heading;
  const ahead = 55;
  const cx = pos.x + Math.sin(heading) * ahead;
  const cz = pos.z + Math.cos(heading) * ahead;
  const streetX = nearestStreet(cx);
  const streetZ = nearestStreet(cz);
  const onXStreet = Math.abs(cx - streetX) < Math.abs(cz - streetZ);
  const bx = onXStreet ? streetX : cx;
  const bz = onXStreet ? cz : streetZ;
  const angle = onXStreet ? Math.PI / 2 : 0;
  const spots = onXStreet
    ? [[bx, bz - 4], [bx, bz + 4]]
    : [[bx - 4, bz], [bx + 4, bz]];
  for (const [x, z] of spots) {
    const cop = spawnPoliceCar(world.scene, x, z, angle + (Math.random() - 0.5) * 0.6);
    cop.roadblock = true;
    world.allCars.push(cop);
    world.police.cops.push(cop);
    world.police.roadblock.push(cop);
  }
  world.hud.toast('Roadblock ahead!');
}

function clearRoadblock(world) {
  for (const cop of [...world.police.roadblock]) removeCop(world, cop);
  world.police.roadblock = [];
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
  if (police.wanted === 0) {
    // Heat gone: every cruiser leaves, converted roadblockers included.
    for (const cop of [...police.cops]) removeCop(world, cop);
  } else {
    // Converted roadblock cops chase without counting against the cap.
    const counted = police.cops.filter((c) => !c.roadblock && !c.converted);
    while (counted.length < want) {
      spawnCop(world);
      counted.push(police.cops[police.cops.length - 1]);
    }
    while (counted.length > want) {
      removeCop(world, counted[counted.length - 1]);
      counted.pop();
    }
  }

  // Roadblocks live and die with the heat: three stars or more, one block
  // ahead of the player; below that, the street stays clear.
  if (police.wanted >= TUNING.roadblockWanted && police.roadblock.length === 0 && police.roadblockEnabled) {
    setRoadblock(world);
  } else if (police.wanted < TUNING.roadblockWanted && police.roadblock.length > 0) {
    clearRoadblock(world);
  }
  if (police.wanted === 0 && police.roadblock.length > 0) clearRoadblock(world);

  const target = interceptPoint(player);
  let nearest = Infinity;
  for (const cop of police.cops) {
    const d = Math.hypot(cop.mesh.position.x - pos.x, cop.mesh.position.z - pos.z);
    if (cop.roadblock) {
      if (d < 30) {
        cop.roadblock = false;
        cop.converted = true;
      } else {
        // Parked blockers only flash their light bars.
        cop.flash += dt * 9;
        const on = Math.sin(cop.flash) > 0;
        cop.lightBar.userData.red.material.emissiveIntensity = on ? 2.2 : 0.15;
        cop.lightBar.userData.blue.material.emissiveIntensity = on ? 0.15 : 2.2;
      }
    }
    if (!cop.roadblock) {
      const axes = steerToward(cop, target.x, target.z);
      driveCar(dt, cop, axes, world);
    }
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

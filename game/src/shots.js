// The screenshot scenes behind ?shot=cover|chase|mission|combat. Each one
// sets up real game state (a real chase, a real timed mission, a real
// firefight), runs the simulation forward with a scripted driver, and the
// frame the browser paints is what a short game really looks like. The
// time of day comes from &tod= in the query (see main.js): cover and chase
// at golden hour, the mission at dusk, combat at night.
import { addWanted } from './police.js';
import { RIVAL_SPOTS, startMission } from './missions.js';
import { spawnRivals } from './combat.js';
import { spawnCar, spawnPoliceCar } from './vehicles.js';

// Move every traffic car that could cross a scripted route out of the
// way: cars on the route street itself, and cars on crossing streets
// within the route's span. Parked cars near the route move too — a kerb
// car the scripted driver cannot steer around would jam the shot. They
// are sent to far northern avenues, driving east-west (or parked at their
// kerbs), so they cannot wander back during the shot.
function clearRoute(world, street, axis, from, to) {
  const northStreets = [-176, -132, -88];
  for (const other of world.traffic) {
    const pos = other.mesh.position;
    const onRoute = axis === 'x'
      ? Math.abs(pos.z - street) < 8 && pos.x > from && pos.x < to
      : Math.abs(pos.x - street) < 8 && pos.z > from && pos.z < to;
    const crossing = axis === 'x'
      ? other.axis === 'z' && other.street > from && other.street < to
      : other.axis === 'x' && other.street > from && other.street < to;
    if (!onRoute && !crossing) continue;
    const z = world.rng.pick(northStreets);
    pos.set(world.rng.range(-170, 170), 0, z);
    other.axis = 'x';
    other.dir = 1;
    other.heading = Math.PI / 2;
    other.street = z;
  }
  for (const parked of world.parked) {
    const pos = parked.mesh.position;
    const nearRoute = axis === 'x'
      ? Math.abs(pos.z - street) < 10 && pos.x > from && pos.x < to
      : Math.abs(pos.x - street) < 10 && pos.z > from && pos.z < to;
    if (!nearRoute) continue;
    const z = world.rng.pick(northStreets);
    pos.set(world.rng.range(-170, 170), 0, z + world.rng.pick([-4.6, 4.6]));
  }
}

/**
 * Stage a scene and return the plan: how many frames to simulate, whether
 * to orbit the title camera, a scripted input override, and whether to
 * fire the pistol on the final frame (muzzle flash in the shot).
 */
export function stageShot(name, world) {
  const hud = world.hud;
  if (name === 'cover' || name === 'start') {
    world.screen = 'title';
    hud.setScreen('title');
    // Orbit the coast, not the grid: from over the sea the frame holds
    // the lighthouse, the harbor cranes, the beach and the city — the
    // signature the brief promises — instead of dark rooftops.
    return {
      frames: 80,
      orbit: true,
      orbitCentre: { x: 200, z: -120 },
      orbitRadius: 75,
      orbitHeight: 42,
      orbitOffset: 9,
    };
  }
  world.screen = 'play';
  hud.setScreen('play');

  if (name === 'chase') {
    const car = spawnCar(world.scene, 'muscle', 0xc23b2e, -120, 44, Math.PI / 2);
    world.allCars.push(car);
    car.state = 'player';
    car.speed = 26;
    world.player.car = car;
    world.player.onFoot = false;
    world.player.mesh.visible = false;
    startMission(world, 1);
    world.missions.step = 1;
    world.missions.beacon.visible = false;
    addWanted(world.police, 3);
    // Two cruisers pre-placed behind the player so the chase reads at a
    // clean distance: a random spawn could drop a cruiser ahead of the
    // player and the scripted driver would rear-end it (the overlap that
    // ruined the first chase shot). Cap 2 means no random spawns.
    const cop1 = spawnPoliceCar(world.scene, -152, 44, Math.PI / 2);
    const cop2 = spawnPoliceCar(world.scene, -176, 40, Math.PI / 2);
    cop1.speed = 30;
    cop2.speed = 28;
    world.allCars.push(cop1, cop2);
    world.police.cops.push(cop1, cop2);
    world.police.cap = 2;
    // The live roadblock system would drop a block right in the scripted
    // driver's path; this shot stages its own pair of cruisers instead.
    world.police.roadblockEnabled = false;
    // Clear the getaway street so the chase runs instead of jamming up.
    clearRoute(world, 44, 'x', -150, 90);
    // A roadblock ahead: two cruisers angled across the avenue, so the
    // chase is visible in front of the camera, not only behind it.
    const block1 = spawnCar(world.scene, 'police', 0xf2f2f2, 35, 44, 0.9);
    const block2 = spawnCar(world.scene, 'police', 0xf2f2f2, 60, 44, 2.2);
    world.allCars.push(block1, block2);
    world.cameraRig.yaw = Math.PI / 2;
    world.cameraRig.pitch = 0.5;
    world.cameraRig.target.set(-120, 1.6, 44);
    world.cameraRig.camera.position.set(-132, 8, 44);
    // 85 frames: the player covers ~128 units and is captured with the
    // roadblock 27 units ahead — any longer and the scripted driver
    // rams the staged blockers.
    return {
      frames: 85,
      noBanner: true,
      override: { move: { x: 0, z: 0 }, drive: { throttle: 1, steer: 0, handbrake: false } },
    };
  }

  if (name === 'mission') {
    // Mission 4, the timed run: Mara has the case and 58 seconds to reach
    // the stadium. A courier van races south down 132nd Street — a van
    // fits the courier job, and its 115 km/h reads differently from the
    // chase shot's 173. The stadium bowl and its beacon wait ahead on
    // the right, against the dusk sky.
    startMission(world, 3);
    world.missions.step = 1;
    world.missions.timer = 58;
    world.missions.timerTotal = 80;
    world.missions.beacon.position.set(-138, 0, 154);
    world.missions.beacon.visible = true;
    const car = spawnCar(world.scene, 'van', 0x1f8a7a, -132, 88, 0);
    world.allCars.push(car);
    car.state = 'player';
    car.speed = 20;
    world.player.car = car;
    world.player.onFoot = false;
    world.player.mesh.visible = false;
    // Clear the whole route, crossings included, so the run never jams.
    clearRoute(world, -132, 'z', 60, 190);
    world.cameraRig.yaw = 0;
    world.cameraRig.pitch = 0.3;
    world.cameraRig.target.set(-132, 1.6, 88);
    world.cameraRig.camera.position.set(-132, 10, 76);
    // 48 frames: the van covers ~47 units in 1.6 s of sim and is captured
    // 29 m out, past the corner building that hid the stadium — the bowl,
    // its floodlights and the beacon read ahead on the right. The higher
    // pitch (0.65) looks over the rooftops toward the beacon. No banner:
    // the objective box and the timer already tell the story.
    return {
      frames: 48,
      noBanner: true,
      override: { move: { x: 0, z: 0 }, drive: { throttle: 1, steer: 0, handbrake: false } },
    };
  }

  if (name === 'combat') {
    startMission(world, 2);
    // Mara holds the street west of the yard and looks east down its
    // length: the rivals, the beacon, the cranes, the pink HARBOR neon
    // and the sea all stack in one frame. She stands ON the street
    // (z=-132), not beside the container stacks — the first framing put
    // the camera inside the containers and they filled a fifth of the
    // frame. The 'clear' step is entered directly (the player is 18 m
    // from the yard marker, past the 7 m trigger) and the rivals are
    // spawned by hand, exactly as the mission would spawn them. The
    // yard street is cleared of traffic so nothing drives through the
    // firefight. No banner: the objective box already names the job,
    // and the banner hid the fight.
    world.missions.step = 1;
    spawnRivals(world.scene, world.combat, RIVAL_SPOTS);
    clearRoute(world, -132, 'x', 130, 200);
    const player = world.player;
    player.mesh.position.set(166, 0, -132);
    player.heading = Math.atan2(176 - 166, -132 - (-132));
    player.mesh.rotation.y = player.heading;
    player.aiming = true;
    world.cameraRig.yaw = player.heading;
    world.cameraRig.pitch = 0.55;
    world.cameraRig.target.set(166, 1.6, -132);
    addWanted(world.police, 2);
    world.police.cap = 2;
    return { frames: 120, finalFire: true, noBanner: true };
  }

  if (name === 'garage') {
    // Behavior-probe staging (not one of the four submitted shots): Mara
    // sits in a stolen sedan inside the Sunset Auto yard, so the sell
    // prompt shows and pressing G sells the car for real.
    const car = spawnCar(world.scene, 'sedan', 0x2e6fc2, 22, 150, Math.PI);
    world.allCars.push(car);
    car.state = 'player';
    world.player.car = car;
    world.player.onFoot = false;
    world.player.mesh.visible = false;
    world.cameraRig.yaw = Math.PI;
    world.cameraRig.pitch = 0.5;
    world.cameraRig.target.set(22, 1.6, 150);
    world.cameraRig.camera.position.set(22, 8, 138);
    return { frames: 30, noBanner: true };
  }

  return { frames: 60 };
}

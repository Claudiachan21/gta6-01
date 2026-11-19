// Staged screenshot scenes (?shot=cover|chase|mission|combat|garage): real
// game state, scripted forward, painted by the browser as the screenshots.
import { addWanted } from './police.js';
import { jumpToStep, startMission } from './missions.js';
import { spawnCar } from './vehicles.js';
import { nearestStreet, randomRoadPoint } from './city.js';

/** Move traffic off one avenue so a staged drive runs instead of jamming. */
function clearAvenue(world, axis, at, from, to) {
  for (const other of world.traffic) {
    const pos = other.mesh.position;
    const onAvenue = axis === 'x' ? Math.abs(pos.z - at) < 8 : Math.abs(pos.x - at) < 8;
    const inRange = axis === 'x' ? pos.x > from && pos.x < to : pos.z > from && pos.z < to;
    if (!onAvenue || !inRange) continue;
    const point = randomRoadPoint(world.rng, axis === 'x' ? 'z' : 'x');
    pos.set(point.x, 0, point.z);
    other.axis = axis === 'x' ? 'z' : 'x';
    other.dir = 1;
    other.heading = other.axis === 'z' ? 0 : Math.PI / 2;
    other.street = other.axis === 'z' ? nearestStreet(point.x) : nearestStreet(point.z);
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
    return { frames: 80, vista: { pos: [280, 35, 0], look: [120, 14, -110] } };
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
    world.police.cap = 3;
    world.police.noRoadblock = true;
    clearAvenue(world, 'x', 44, -150, 130);
    // A roadblock ahead: two cruisers angled across the avenue, close
    // enough to read at capture — the chase is visible in front of the
    // camera, not only behind it.
    const block1 = spawnCar(world.scene, 'police', 0xf2f2f2, 35, 44, 0.9);
    const block2 = spawnCar(world.scene, 'police', 0xf2f2f2, 55, 44, 2.2);
    block1.state = 'police';
    block2.state = 'police';
    world.allCars.push(block1, block2);
    world.cameraRig.yaw = Math.PI / 2;
    world.cameraRig.pitch = 0.32;
    world.cameraRig.target.set(-120, 1.6, 44);
    world.cameraRig.camera.position.set(-132, 8, 44);
    return {
      frames: 100,
      noBanner: true,
      override: { move: { x: 0, z: 0 }, drive: { throttle: 1, steer: 0, handbrake: false } },
    };
  }

  if (name === 'mission') {
    // SUNSET RUN, timed leg: a courier van running the stadium gate with
    // the clock ticking, staged on the north-south avenue west of the bowl.
    startMission(world, 3);
    jumpToStep(world, 1);
    const van = spawnCar(world.scene, 'van', 0x1f8a7a, -132, 64, 0);
    world.allCars.push(van);
    van.state = 'player';
    van.speed = 0;
    world.player.car = van;
    world.player.onFoot = false;
    world.player.mesh.visible = false;
    clearAvenue(world, 'z', -132, 40, 180);
    world.cameraRig.yaw = 0;
    world.cameraRig.pitch = 0.3;
    world.cameraRig.target.set(-132, 1.6, 64);
    world.cameraRig.camera.position.set(-132, 8, 52);
    return {
      frames: 60,
      noBanner: true,
      override: { move: { x: 0, z: 0 }, drive: { throttle: 1, steer: 0, handbrake: false } },
    };
  }

  if (name === 'combat') {
    startMission(world, 2);
    const player = world.player;
    // Mara stands on the harbor avenue facing east-northeast: the beacon
    // ahead-left, the pink HARBOR neon ahead-right, rivals all around it.
    player.mesh.position.set(173, 0, -127);
    player.heading = 1.96;
    player.mesh.rotation.y = player.heading;
    player.aiming = true;
    world.cameraRig.yaw = player.heading;
    world.cameraRig.pitch = 0.55;
    world.cameraRig.target.set(173, 1.6, -127);
    // Wide lens for the firefight: beacon left, pink HARBOR neon right,
    // crane and sea at the frame's edge.
    world.cameraRig.fovOverride = 72;
    addWanted(world.police, 2);
    world.police.cap = 2;
    return { frames: 120, finalFire: true, noBanner: true, fallRivalAt: 60 };
  }

  if (name === 'garage') {
    // Sunset Auto: Mara idles a stolen sedan in the yard, sale on offer.
    const car = spawnCar(world.scene, 'sedan', 0x2e6fc2, 22, 158, Math.PI / 2);
    world.allCars.push(car);
    car.state = 'player';
    car.stolen = true;
    car.speed = 0;
    world.player.car = car;
    world.player.onFoot = false;
    world.player.mesh.visible = false;
    world.cameraRig.yaw = Math.PI;
    world.cameraRig.pitch = 0.5;
    world.cameraRig.target.set(22, 1.6, 158);
    world.cameraRig.camera.position.set(22, 7, 170);
    return { frames: 90, noBanner: true };
  }

  return { frames: 60 };
}

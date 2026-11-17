// The screenshot scenes behind ?shot=cover|chase|mission|combat. Each one
// sets up real game state (a real chase, a real mission, a real firefight),
// runs the simulation forward with a scripted driver, and the frame the
// browser paints is what a short game really looks like.
import { addWanted } from './police.js';
import { startMission } from './missions.js';
import { spawnCar } from './vehicles.js';
import { nearestStreet, randomRoadPoint } from './city.js';

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
    return { frames: 80, orbit: true };
  }
  world.screen = 'play';
  hud.setScreen('play');

  if (name === 'chase') {
    const car = spawnCar(world.scene, 'sport', 0xc23b2e, -120, 44, Math.PI / 2);
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
    // Clear the getaway street so the chase runs instead of jamming up:
    // any traffic on the player's avenue moves to a north-south street.
    for (const other of world.traffic) {
      const pos = other.mesh.position;
      if (Math.abs(pos.z - 44) < 8 && pos.x > -150 && pos.x < 90) {
        const point = randomRoadPoint(world.rng, 'z');
        pos.set(point.x, 0, point.z);
        other.axis = 'z';
        other.dir = 1;
        other.heading = 0;
        other.street = nearestStreet(point.x);
      }
    }
    // A roadblock ahead: two cruisers angled across the avenue, so the
    // chase is visible in front of the camera, not only behind it.
    const block1 = spawnCar(world.scene, 'police', 0xf2f2f2, 35, 44, 0.9);
    const block2 = spawnCar(world.scene, 'police', 0xf2f2f2, 60, 44, 2.2);
    world.allCars.push(block1, block2);
    world.cameraRig.yaw = Math.PI / 2;
    world.cameraRig.pitch = 0.5;
    world.cameraRig.target.set(-120, 1.6, 44);
    world.cameraRig.camera.position.set(-132, 8, 44);
    return {
      frames: 110,
      noBanner: true,
      override: { move: { x: 0, z: 0 }, drive: { throttle: 1, steer: 0, handbrake: false } },
    };
  }

  if (name === 'mission') {
    startMission(world, 0);
    const player = world.player;
    player.mesh.position.set(44, 0, -28);
    player.heading = Math.PI;
    player.mesh.rotation.y = player.heading;
    world.cameraRig.yaw = player.heading;
    world.cameraRig.target.set(44, 1.6, -28);
    return { frames: 60 };
  }

  if (name === 'combat') {
    startMission(world, 2);
    const player = world.player;
    player.mesh.position.set(174, 0, -128);
    player.heading = Math.atan2(176 - 174, -132 - (-128));
    player.mesh.rotation.y = player.heading;
    player.aiming = true;
    world.cameraRig.yaw = player.heading;
    world.cameraRig.pitch = 0.55;
    world.cameraRig.target.set(174, 1.6, -128);
    addWanted(world.police, 2);
    world.police.cap = 2;
    return { frames: 120, finalFire: true };
  }

  return { frames: 60 };
}

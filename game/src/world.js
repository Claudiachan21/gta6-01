// The world: builds the scene, the city, traffic, pedestrians, the player
// and every system, then advances them all one fixed step at a time.
import * as THREE from 'three';
import { COLORS, KEYS, START_CASH, TUNING } from './config.js';
import { createRandom } from './random.js';
import { createCityLayout, districtAt } from './city.js';
import { buildCityMeshes } from './buildings.js';
import { buildGround, buildProps } from './roads.js';
import { buildLandmarks, buildSky, updateLandmarks, updateSky } from './landmarks.js';
import { createDayNight, updateDayNight } from './daynight.js';
import { createGarage, updateGarage } from './garage.js';
import { createParkedCars, createTraffic, updateTrafficCar } from './vehicles.js';
import { createPedestrians, updatePeds } from './pedestrians.js';
import { createPlayer, exitCar, playerPosition, tryEnterCar, updateOnFoot } from './player.js';
import { driveCar } from './driving.js';
import { addWanted, clearWanted, createPolice, updatePolice } from './police.js';
import { createCombat, firePistol, updateRivals } from './combat.js';
import { createMissions, startMission, updateMissions } from './missions.js';
import { createEffects } from './effects.js';
import { createAudio } from './audio.js';
import { addShake, createCameraRig, updateCamera } from './camera.js';
import { createHUD } from './hud.js';

/** Build a whole Solmar Bay from a seed and an optional save. */
export function createWorld(seed, save) {
  const rng = createRandom(seed);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.fog, 130, 460);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 40, 80);

  const hemi = new THREE.HemisphereLight(0xbcd9ff, 0xe8d9b0, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(COLORS.sun, 2.6);
  sun.position.set(140, 200, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -230;
  sun.shadow.camera.right = 230;
  sun.shadow.camera.top = 230;
  sun.shadow.camera.bottom = -230;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  const layout = createCityLayout(rng);
  const buildings = buildCityMeshes(scene, layout);
  buildGround(scene, layout);
  const props = buildProps(scene, layout, rng);
  const landmarks = buildLandmarks(scene, layout, rng);
  const sky = buildSky(scene, rng);
  const garage = createGarage(scene);
  const daynight = createDayNight(scene, {
    sun,
    hemi,
    lampHeads: props.lampHeadMaterial,
    neonMats: buildings.neonMats,
    setWindowsLit: buildings.setWindowsLit,
    lighthouseBeam: landmarks.beamPivot,
  });
  const traffic = createTraffic(scene, layout, rng, TUNING.trafficCount);
  const parked = createParkedCars(scene, layout, rng, 10);
  const peds = createPedestrians(scene, rng, TUNING.pedCount);
  const spawn = save ? save.player : { x: 0, z: 88, heading: Math.PI };
  const player = createPlayer(scene, spawn, save ? save.cash : START_CASH);

  return {
    seed,
    rng,
    scene,
    camera,
    layout,
    buildings,
    props,
    landmarks,
    sky,
    daynight,
    garage,
    traffic,
    parked,
    allCars: [...traffic, ...parked],
    peds,
    player,
    police: createPolice(),
    combat: createCombat(scene),
    missions: createMissions(scene, save),
    effects: createEffects(scene),
    audio: createAudio(),
    cameraRig: createCameraRig(camera),
    hud: createHUD(),
    time: 0,
    screen: 'title',
    nextMissionAt: null,
    lastDamageAt: -99,
    districtNow: null,
  };
}

/**
 * Advance the world one fixed step. Returns 'busted', 'wasted' or
 * 'mission-done' when one of those happens, else null.
 */
export function updateWorld(world, dt, input) {
  world.time += dt;
  updateDayNight(dt, world.daynight);
  updateLandmarks(world.landmarks, dt, world.time);
  updateSky(world.sky, dt, world.daynight.hour);
  for (const car of world.traffic) {
    if (car.state === 'traffic') updateTrafficCar(car, dt, world.allCars, world.rng);
  }
  updatePeds(dt, world.peds, world.rng);
  world.effects.update(dt);
  if (world.screen !== 'play') return null;

  const player = world.player;
  const pos = playerPosition(player);
  world.districtNow = districtAt(pos.x, pos.z);
  if (!world.missions.active && !world.missions.storyDone && world.nextMissionAt !== null && world.time >= world.nextMissionAt) {
    world.nextMissionAt = null;
    startMission(world, world.missions.index);
  }

  if (input.takePressed(KEYS.enterCar)) {
    if (player.onFoot) {
      const got = tryEnterCar(player, world);
      if (got) {
        world.audio.click();
        if (got.stolen) {
          addWanted(world.police, 1);
          world.hud.toast('Car stolen! The cops noticed. +1 star');
        }
      } else {
        world.hud.toast('No car nearby — get closer and press E.');
      }
    } else {
      exitCar(player, world);
      world.audio.click();
    }
  }
  updateGarage(world, input.takePressed(KEYS.garage));

  if (player.onFoot) {
    updateOnFoot(dt, player, input, world.cameraRig.yaw, world);
    player.aiming = input.mouseIsDown();
    if (input.mouseIsDown()) firePistol(world);
    if (input.takePressed(KEYS.reload) && world.combat.ammo < TUNING.pistolAmmo && world.combat.reloading <= 0) {
      world.combat.reloading = 1.1;
    }
  } else {
    const axes = input.driveAxes();
    const events = driveCar(dt, player.car, axes, world);
    if (events.crashed) {
      addShake(world.cameraRig, 0.5);
      world.audio.thud();
      world.effects.sparks(player.car.mesh.position);
      world.effects.smoke(player.car.mesh.position);
    }
    if (events.hitPed) {
      addWanted(world.police, 1);
      world.hud.toast('You hit a pedestrian! +1 star');
    }
    if (axes.handbrake && Math.abs(player.car.speed) > 12 && Math.random() < dt * 18) {
      world.effects.smoke(player.car.mesh.position);
    }
    // A battered car trails dark smoke from its bonnet until it is sold
    // or swapped.
    if (player.car.damage >= 3 && Math.random() < dt * 6) {
      const hood = player.car.mesh.position.clone();
      hood.x += Math.sin(player.car.heading) * 1.8;
      hood.z += Math.cos(player.car.heading) * 1.8;
      world.effects.damageSmoke(hood);
    }
  }

  if (updatePolice(dt, world) === 'busted') return 'busted';

  const damage = updateRivals(dt, world);
  if (damage > 0) {
    player.health -= damage;
    world.lastDamageAt = world.time;
    addShake(world.cameraRig, 0.25);
    if (player.health <= 0) return 'wasted';
  } else if (world.time - world.lastDamageAt > 6 && player.health < TUNING.playerHealth) {
    player.health = Math.min(TUNING.playerHealth, player.health + TUNING.healthRegen * dt);
  }

  if (updateMissions(dt, world) === 'done') {
    if (!world.missions.storyDone) world.nextMissionAt = world.time + 3;
    return 'mission-done';
  }

  const driving = !player.onFoot;
  const speedNorm = driving ? Math.abs(player.car.speed) / player.car.handling.maxSpeed : 0;
  world.audio.setEngine(speedNorm, driving);
  world.audio.setSiren(world.police.sirenOn, dt);
  updateCamera(dt, world.cameraRig, playerPosition(player), driving, input.takeLook(), speedNorm);
  return null;
}

/** After a bust or a wipe-out: fine Mara, clear the heat, drop her off. */
export function respawn(world, kind) {
  const player = world.player;
  if (!player.onFoot) exitCar(player, world);
  clearWanted(world.police);
  player.health = TUNING.playerHealth;
  player.cash = Math.max(0, player.cash - (kind === 'busted' ? 100 : 150));
  const spot = kind === 'busted' ? { x: -44, z: 44 } : { x: 44, z: -88 };
  player.mesh.position.set(spot.x, 0, spot.z);
  player.heading = 0;
  player.mesh.rotation.y = 0;
  player.mesh.visible = true;
  world.cameraRig.target.set(spot.x, 1.6, spot.z);
}

/** The save payload for this world (localStorage). */
export function collectSave(world) {
  const pos = playerPosition(world.player);
  return {
    cash: world.player.cash,
    missionIndex: world.missions.index,
    missionsDone: world.missions.index,
    stashesTaken: world.missions.stashes.filter((s) => s.taken).map((s) => s.index),
    player: { x: Math.round(pos.x), z: Math.round(pos.z), heading: world.player.heading },
    storyDone: world.missions.storyDone,
    version: 2,
  };
}

// Story and missions: six jobs for Mara Solis, each a chain of objectives
// with a beacon marker, plus twelve cash stashes as a free-roam activity.
import * as THREE from 'three';
import { addWanted, clearWanted, setWanted } from './police.js';
import { spawnCar } from './vehicles.js';
import { clearRivals, rivalsAlive, spawnRivals } from './combat.js';
import { playerPosition } from './player.js';

export const MISSIONS = [
  {
    id: 'first-delivery',
    title: 'MISSION 1 — FIRST DELIVERY',
    briefing: 'Dax needs a package moved across town. Pick it up, then deliver it to the marina.',
    reward: 150,
    steps: [
      { text: 'Pick up the package at Coral Plaza', type: 'goto', x: 44, z: -44 },
      { text: 'Deliver the package to the marina', type: 'goto', x: 176, z: 88 },
    ],
  },
  {
    id: 'borrowed-wheels',
    title: 'MISSION 2 — BORROWED WHEELS',
    briefing: 'Lena needs a Comet GT for parts. Take the marked car, lose the cops, bring it to the garage.',
    reward: 300,
    steps: [
      { text: 'Steal the marked Comet GT', type: 'steal', x: -88, z: 88 },
      { text: 'Lose the cops', type: 'escape' },
      { text: 'Deliver the Comet GT to Sunset Auto', type: 'deliver', x: 22, z: 154 },
    ],
  },
  {
    id: 'harbor-heat',
    title: 'MISSION 3 — HARBOR HEAT',
    briefing: 'The Harbor Kings are leaning on Dax. Clear them out of the harbor yard, then get out.',
    reward: 500,
    steps: [
      { text: 'Reach the harbor yard', type: 'goto', x: 176, z: -132 },
      { text: 'Clear out the Harbor Kings', type: 'clear' },
      { text: 'Escape to the safe house', type: 'goto', x: -132, z: -132 },
    ],
  },
  {
    id: 'sunset-run',
    title: 'MISSION 4 — SUNSET RUN',
    briefing: 'A buyer at the stadium pays double if the package lands before the match starts. Eighty seconds — go.',
    reward: 400,
    steps: [
      { text: 'Pick up the package at Coral Plaza', type: 'goto', x: 66, z: -66 },
      { text: 'Reach the stadium before time runs out', type: 'timed', x: -134, z: 154, seconds: 80 },
    ],
  },
  {
    id: 'last-stand',
    title: 'MISSION 5 — LAST STAND',
    briefing: 'Every cruiser in Solmar Bay is coming for you. Stay hot, stay moving, survive ninety seconds.',
    reward: 600,
    steps: [
      { text: 'Survive the 5-star heat', type: 'survive', seconds: 90 },
    ],
  },
  {
    id: 'neon-heist',
    title: 'MISSION 6 — NEON HEIST',
    briefing: 'One muscle car, one harbor, one night. Take it quiet, bring it to Sunset Auto before dawn.',
    reward: 800,
    steps: [
      { text: 'Steal the muscle car at the harbor', type: 'steal', x: 176, z: -100 },
      { text: 'Deliver it to Sunset Auto before dawn', type: 'timed', x: 22, z: 154, seconds: 120 },
    ],
  },
];

export const RIVAL_SPOTS = [
  { x: 170, z: -124 },
  { x: 182, z: -140 },
  { x: 170, z: -144 },
  { x: 184, z: -120 },
];

// kind: normal $50 · beach $75 (buried in the sand) · cold $75 (only when clean).
export const STASH_SPOTS = [
  { x: -168, z: -168, kind: 'normal' },
  { x: 168, z: -168, kind: 'normal' },
  { x: -168, z: 168, kind: 'normal' },
  { x: 168, z: 168, kind: 'normal' },
  { x: -84, z: -84, kind: 'normal' },
  { x: 84, z: -84, kind: 'normal' },
  { x: -84, z: 84, kind: 'normal' },
  { x: 84, z: 84, kind: 'normal' },
  { x: 190, z: 60, kind: 'beach' },
  { x: 190, z: -60, kind: 'beach' },
  { x: 0, z: 0, kind: 'cold' },
  { x: -44, z: 132, kind: 'cold' },
];

function makeBeacon() {
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 20;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 3.4, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  group.add(beam, ring);
  group.visible = false;
  return group;
}

function makeStashMesh(kind) {
  const group = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.6, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x2e8f5b, emissive: 0x0d3a22 }),
  );
  box.position.y = 0.7;
  box.castShadow = true;
  const glowColor = kind === 'beach' ? 0xffd94d : kind === 'cold' ? 0x7dc4ff : 0x7dffb0;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.5 }),
  );
  glow.position.y = 0.7;
  group.add(box, glow);
  return group;
}

/** Mission state: beacon marker, stashes and the active job. */
export function createMissions(scene, save) {
  const beacon = makeBeacon();
  scene.add(beacon);
  const stashes = STASH_SPOTS.map((spot, i) => {
    const mesh = makeStashMesh(spot.kind);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.visible = !(save && save.stashesTaken.includes(i));
    scene.add(mesh);
    return { ...spot, mesh, taken: mesh.visible === false, index: i, warnedAt: -99 };
  });
  return {
    index: save ? save.missionIndex : 0,
    step: 0,
    active: false,
    storyDone: save ? save.storyDone : false,
    beacon,
    stashes,
    targetCar: null,
    banner: null,
    timer: null,
    lastAlarm: -1,
  };
}

/** The objective the HUD and minimap should show right now. */
export function currentObjective(missions) {
  if (!missions.active || missions.index >= MISSIONS.length) return null;
  const mission = MISSIONS[missions.index];
  const step = mission.steps[missions.step];
  return { mission, step, x: step.x ?? null, z: step.z ?? null };
}

function moveBeacon(missions, x, z) {
  if (x === null || z === null) {
    missions.beacon.visible = false;
    return;
  }
  missions.beacon.visible = true;
  missions.beacon.position.set(x, 0, z);
}

/** Set up the current step: beacon, countdown, rivals, heat. */
function enterStep(world) {
  const missions = world.missions;
  const step = MISSIONS[missions.index].steps[missions.step];
  missions.timer = null;
  missions.lastAlarm = -1;
  if (step.type === 'clear') {
    spawnRivals(world.scene, world.combat, RIVAL_SPOTS);
    moveBeacon(missions, 176, -132);
  } else if (step.type === 'escape' || step.type === 'survive') {
    moveBeacon(missions, null, null);
    if (step.type === 'survive') {
      missions.timer = step.seconds;
      setWanted(world.police, 5);
      world.police.cap = 6;
    }
  } else if (step.type === 'timed') {
    missions.timer = step.seconds;
    moveBeacon(missions, step.x, step.z);
  } else {
    moveBeacon(missions, step.x ?? null, step.z ?? null);
  }
}

/** Jump an active mission to a step (screenshot staging). */
export function jumpToStep(world, step) {
  world.missions.step = step;
  enterStep(world);
}

/** Start mission `index` for the world: brief the player, place the marker. */
export function startMission(world, index) {
  const missions = world.missions;
  missions.index = index;
  missions.step = 0;
  missions.active = true;
  const mission = MISSIONS[index];
  missions.banner = { title: mission.title, sub: mission.briefing };
  if (index === 1) {
    const car = spawnCar(world.scene, 'sport', 0xc23b2e, -88, 88, Math.PI / 2);
    car.jobCar = true;
    world.allCars.push(car);
    missions.targetCar = car;
  } else if (index === 5) {
    const car = spawnCar(world.scene, 'muscle', 0x1a1a1a, 176, -100, Math.PI);
    car.jobCar = true;
    world.allCars.push(car);
    missions.targetCar = car;
    world.daynight.tod = 21.5;
  }
  enterStep(world);
  world.audio.jingle();
}

/** Advance the mission state machine; returns 'done' when a job completes. */
export function updateMissions(dt, world) {
  const missions = world.missions;
  const player = world.player;
  const pos = playerPosition(player);
  missions.beacon.rotation.y += dt * 0.8;

  for (const stash of missions.stashes) {
    if (stash.taken) continue;
    stash.mesh.rotation.y += dt * 1.5;
    stash.mesh.position.y = Math.sin(world.time * 2 + stash.index) * 0.15;
    if (Math.hypot(pos.x - stash.x, pos.z - stash.z) < 2.6) {
      if (stash.kind === 'cold' && world.police.wanted > 0) {
        if (world.time - stash.warnedAt > 8) {
          stash.warnedAt = world.time;
          world.hud.toast('Too hot — lose the cops first.');
        }
        continue;
      }
      stash.taken = true;
      stash.mesh.visible = false;
      const value = stash.kind === 'normal' ? 50 : 75;
      player.cash += value;
      world.stats.cashEarned += value;
      world.audio.pickup();
      world.hud.toast(`Cash stash found: +$${value}`);
      world.effects.burst(new THREE.Vector3(stash.x, 1, stash.z), 0x7dffb0, 14, 4);
    }
  }

  if (!missions.active || missions.index >= MISSIONS.length) return null;
  const mission = MISSIONS[missions.index];
  const step = mission.steps[missions.step];

  // Countdown steps: tick, beep when low, fail the job when it runs out.
  if (missions.timer !== null) {
    const running = step.type !== 'survive' || world.police.wanted > 0;
    if (running) {
      missions.timer -= dt;
      const whole = Math.ceil(missions.timer);
      if (whole <= 10 && whole !== missions.lastAlarm && whole > 0) {
        missions.lastAlarm = whole;
        world.audio.alarm();
      }
      if (missions.timer <= 0) {
        if (step.type === 'survive') {
          missions.step += 1;
        } else {
          missions.step = 0;
          missions.timer = null;
          world.hud.toast('Too slow — Dax wants another run.');
          enterStep(world);
          return null;
        }
      }
    }
  }

  let advance = missions.timer !== null && step.type === 'survive' && missions.step >= mission.steps.length;
  if (!advance) {
    if (step.type === 'goto' || step.type === 'deliver' || step.type === 'timed') {
      if (Math.hypot(pos.x - step.x, pos.z - step.z) < 7) advance = true;
    } else if (step.type === 'steal') {
      if (!player.onFoot && player.car === missions.targetCar) {
        advance = true;
        addWanted(world.police, 2);
        world.hud.toast(missions.index === 5 ? 'The muscle car is yours — now run it to the garage!' : 'The Comet GT is yours — now lose the cops!');
      }
    } else if (step.type === 'escape') {
      if (world.police.wanted === 0) advance = true;
    } else if (step.type === 'clear') {
      if (rivalsAlive(world.combat) === 0) advance = true;
    }
  }
  if (!advance) return null;
  if (!(step.type === 'survive' && missions.timer !== null && missions.timer <= 0)) missions.step += 1;
  world.audio.pickup();
  if (missions.step >= mission.steps.length) {
    missions.active = false;
    missions.timer = null;
    player.cash += mission.reward;
    world.stats.cashEarned += mission.reward;
    world.stats.missionsDone += 1;
    clearWanted(world.police);
    world.police.cap = null;
    missions.banner = { title: 'MISSION COMPLETE', sub: `${mission.title} — +$${mission.reward}` };
    world.audio.jingle();
    if (missions.index >= MISSIONS.length - 1) {
      missions.storyDone = true;
      missions.banner = { title: 'STORY COMPLETE', sub: 'Mara owns Solmar Bay now. Free roam — the city is yours.' };
    } else {
      missions.index += 1;
    }
    moveBeacon(missions, null, null);
    return 'done';
  }
  enterStep(world);
  return 'advanced';
}

/** Remove mission leftovers (rivals, target car) when restarting. */
export function resetMissionActors(world) {
  clearRivals(world.scene, world.combat);
  if (world.missions.targetCar) {
    world.scene.remove(world.missions.targetCar.mesh);
    world.allCars = world.allCars.filter((c) => c !== world.missions.targetCar);
    world.missions.targetCar = null;
  }
  moveBeacon(world.missions, null, null);
  world.missions.active = false;
}

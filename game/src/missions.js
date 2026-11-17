// Story and missions: three jobs for Mara Solis in Solmar Bay, each a
// chain of objectives with a beacon marker, plus cash stashes hidden
// around the city as a free-roam activity.
import * as THREE from 'three';
import { addWanted, clearWanted } from './police.js';
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
];

const RIVAL_SPOTS = [
  { x: 170, z: -124 },
  { x: 182, z: -140 },
  { x: 170, z: -144 },
  { x: 184, z: -120 },
];

const STASH_SPOTS = [
  { x: -168, z: -168 },
  { x: 168, z: -168 },
  { x: -168, z: 168 },
  { x: 168, z: 168 },
  { x: -84, z: -84 },
  { x: 84, z: -84 },
  { x: -84, z: 84 },
  { x: 84, z: 84 },
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

function makeStashMesh() {
  const group = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.6, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x2e8f5b, emissive: 0x0d3a22 }),
  );
  box.position.y = 0.7;
  box.castShadow = true;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.5 }),
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
    const mesh = makeStashMesh();
    mesh.position.set(spot.x, 0, spot.z);
    mesh.visible = !(save && save.stashesTaken.includes(i));
    scene.add(mesh);
    return { ...spot, mesh, taken: mesh.visible === false, index: i };
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
    world.allCars.push(car);
    missions.targetCar = car;
    moveBeacon(missions, -88, 88);
  } else if (index === 2) {
    moveBeacon(missions, 176, -132);
  } else {
    moveBeacon(missions, mission.steps[0].x, mission.steps[0].z);
  }
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
      stash.taken = true;
      stash.mesh.visible = false;
      player.cash += 50;
      world.audio.pickup();
      world.hud.toast('Cash stash found: +$50');
      world.effects.burst(new THREE.Vector3(stash.x, 1, stash.z), 0x7dffb0, 14, 4);
    }
  }

  if (!missions.active || missions.index >= MISSIONS.length) return null;
  const mission = MISSIONS[missions.index];
  const step = mission.steps[missions.step];
  let advance = false;
  if (step.type === 'goto' || step.type === 'deliver') {
    if (Math.hypot(pos.x - step.x, pos.z - step.z) < 7) advance = true;
  } else if (step.type === 'steal') {
    if (!player.onFoot && player.car === missions.targetCar) {
      advance = true;
      addWanted(world.police, 2);
      world.hud.toast('The Comet GT is yours — now lose the cops!');
    }
  } else if (step.type === 'escape') {
    if (world.police.wanted === 0) advance = true;
  } else if (step.type === 'clear') {
    if (rivalsAlive(world.combat) === 0) advance = true;
  }
  if (!advance) return null;
  missions.step += 1;
  world.audio.pickup();
  if (missions.step >= mission.steps.length) {
    missions.active = false;
    player.cash += mission.reward;
    clearWanted(world.police);
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
  const next = mission.steps[missions.step];
  if (next.type === 'clear') {
    spawnRivals(world.scene, world.combat, RIVAL_SPOTS);
    moveBeacon(missions, 176, -132);
  } else if (next.type === 'escape') {
    moveBeacon(missions, null, null);
  } else {
    moveBeacon(missions, next.x, next.z);
  }
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

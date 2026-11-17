// Pedestrians: simple low-poly walkers on the sidewalks. They stroll along
// the kerb, turn at corners, and flee from gunfire or a speeding car.
import * as THREE from 'three';
import { STREETS, TUNING, WORLD_HALF } from './config.js';
import { nearestStreet, randomRoadPoint } from './city.js';

const SHIRTS = [0xd95f4b, 0x4b8fd9, 0x7ab648, 0xd9b44b, 0x9b59b6, 0x4bd9c0, 0xe8e8e8, 0x333333];
const SKINS = [0xf2c89b, 0xc98a5a, 0x8a5a33, 0xe8b88a];

function makePedMesh(rng) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: rng.pick(SHIRTS) });
  const skin = new THREE.MeshLambertMaterial({ color: rng.pick(SKINS) });
  const pants = new THREE.MeshLambertMaterial({ color: rng.pick([0x2c3e50, 0x555555, 0x6b4f35]) });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.34), shirt);
  torso.position.y = 1.15;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.78;
  head.castShadow = true;
  const legGeometry = new THREE.BoxGeometry(0.24, 0.8, 0.28);
  legGeometry.translate(0, -0.4, 0);
  const legL = new THREE.Mesh(legGeometry, pants);
  legL.position.set(-0.16, 0.8, 0);
  const legR = new THREE.Mesh(legGeometry, pants);
  legR.position.set(0.16, 0.8, 0);
  group.add(torso, head, legL, legR);
  return { group, legL, legR };
}

/** Spawn sidewalk walkers. */
export function createPedestrians(scene, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const point = randomRoadPoint(rng);
    const { group, legL, legR } = makePedMesh(rng);
    group.position.set(point.x, 0, point.z);
    scene.add(group);
    peds.push({
      mesh: group,
      legL,
      legR,
      heading: rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]),
      speed: rng.range(TUNING.pedSpeed * 0.7, TUNING.pedSpeed * 1.3),
      phase: rng.range(0, Math.PI * 2),
      flee: 0,
      down: false,
    });
  }
  return peds;
}

/** Make every pedestrian near a point run away from it. */
export function scatterPeds(x, z, radius, peds) {
  for (const ped of peds) {
    if (ped.down) continue;
    const dx = ped.mesh.position.x - x;
    const dz = ped.mesh.position.z - z;
    if (dx * dx + dz * dz < radius * radius) {
      ped.flee = 4;
      ped.heading = Math.atan2(dx, dz);
    }
  }
}

/** Walk the sidewalks; fleeing peds sprint away, then slow back to a stroll. */
export function updatePeds(dt, peds, rng) {
  for (const ped of peds) {
    if (ped.down) continue;
    if (ped.flee > 0) {
      ped.flee -= dt;
      if (ped.flee <= 0) ped.heading = Math.round(ped.heading / (Math.PI / 2)) * (Math.PI / 2);
    }
    const speed = ped.flee > 0 ? 7 : ped.speed;
    const pos = ped.mesh.position;
    pos.x += Math.sin(ped.heading) * speed * dt;
    pos.z += Math.cos(ped.heading) * speed * dt;
    ped.phase += dt * speed * 1.6;
    ped.legL.rotation.x = Math.sin(ped.phase) * 0.6;
    ped.legR.rotation.x = -Math.sin(ped.phase) * 0.6;
    const onStreetX = Math.abs(pos.x - nearestStreet(pos.x)) < 1;
    const onStreetZ = Math.abs(pos.z - nearestStreet(pos.z)) < 1;
    if ((onStreetX || onStreetZ) && rng.chance(dt * 0.8)) {
      ped.heading += rng.pick([-Math.PI / 2, Math.PI / 2, 0]);
    }
    if (Math.abs(pos.x) > WORLD_HALF - 6 || Math.abs(pos.z) > WORLD_HALF - 6) {
      ped.heading += Math.PI;
    }
    ped.mesh.rotation.y = ped.heading;
    // Keep walkers near the kerb line of their street.
    const sx = nearestStreet(pos.x);
    const sz = nearestStreet(pos.z);
    if (Math.abs(pos.x - sx) < Math.abs(pos.z - sz)) {
      const target = sx + (pos.x > sx ? 8 : -8);
      pos.x += (target - pos.x) * Math.min(1, dt * 0.5);
    } else {
      const target = sz + (pos.z > sz ? 8 : -8);
      pos.z += (target - pos.z) * Math.min(1, dt * 0.5);
    }
  }
}

/** Knock a pedestrian down (hit by a car or a bullet). */
export function knockPedDown(ped) {
  ped.down = true;
  ped.mesh.rotation.x = -Math.PI / 2;
  ped.mesh.position.y = 0.3;
}

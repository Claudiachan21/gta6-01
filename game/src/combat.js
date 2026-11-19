// Combat: Mara's pistol (aim with the mouse, click to fire, R to reload),
// rival crew members who shoot back, muzzle flash and hit sparks.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { collideCircle } from './city.js';
import { knockPedDown, scatterPeds } from './pedestrians.js';
import { playerPosition } from './player.js';
import { addWanted } from './police.js';

const raycaster = new THREE.Raycaster();
const SCREEN_CENTRE = new THREE.Vector2(0, 0);

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function makeRivalMesh() {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: 0xb03030 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5a });
  const pants = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const torso = box(0.66, 0.78, 0.36, shirt, 0, 1.16, 0);
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), skin);
  head.position.y = 1.8;
  const legGeometry = new THREE.BoxGeometry(0.26, 0.82, 0.3);
  legGeometry.translate(0, -0.41, 0);
  const legL = new THREE.Mesh(legGeometry, pants);
  legL.position.set(-0.17, 0.82, 0);
  const legR = new THREE.Mesh(legGeometry, pants);
  legR.position.set(0.17, 0.82, 0);
  group.add(torso, head, legL, legR, box(0.09, 0.14, 0.42, dark, 0.45, 1.35, 0.3));
  return group;
}

export function createCombat(scene) {
  const flash = new THREE.PointLight(0xffcc66, 0, 18, 2);
  scene.add(flash);
  const flashMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
  );
  flashMesh.visible = false;
  scene.add(flashMesh);
  return {
    ammo: TUNING.pistolAmmo,
    reloading: 0,
    cooldown: 0,
    flash,
    flashMesh,
    flashTime: 0,
    rivals: [],
  };
}

/** Spawn rival crew members at fixed points (mission 3). */
export function spawnRivals(scene, combat, positions) {
  for (const p of positions) {
    const mesh = makeRivalMesh();
    mesh.position.set(p.x, 0, p.z);
    scene.add(mesh);
    combat.rivals.push({
      mesh,
      health: TUNING.rivalHealth,
      shootTimer: 1 + Math.random(),
      alive: true,
      hitFlash: 0,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      strafeTimer: 0.8 + Math.random() * 1.4,
    });
  }
}

export function rivalsAlive(combat) {
  return combat.rivals.filter((r) => r.alive).length;
}

export function clearRivals(scene, combat) {
  for (const rival of combat.rivals) scene.remove(rival.mesh);
  combat.rivals = [];
}

/** Light the muzzle flash at `pos` for `seconds` (player and rivals share it). */
function showFlash(combat, pos, intensity, seconds, camera) {
  combat.flash.position.copy(pos);
  combat.flash.intensity = intensity;
  combat.flashTime = seconds;
  combat.flashMesh.position.copy(pos);
  if (camera) {
    combat.flashMesh.lookAt(camera.position);
    combat.flashMesh.visible = true;
  }
}

/** Walk a raycast hit up to its top-level object (a rival, a ped, a car). */
function hitRoot(hit) {
  let node = hit.object;
  while (node.parent && node.parent.type !== 'Scene') node = node.parent;
  return node;
}

/** Fire the pistol toward the centre of the screen. */
export function firePistol(world) {
  const combat = world.combat;
  const player = world.player;
  if (!player.onFoot || combat.reloading > 0 || combat.cooldown > 0) return false;
  if (combat.ammo <= 0) {
    world.audio.denied();
    combat.reloading = 1.1;
    return false;
  }
  combat.ammo -= 1;
  combat.cooldown = 0.22;
  const muzzle = playerPosition(player).clone();
  muzzle.x += Math.sin(player.heading) * 1.1;
  muzzle.z += Math.cos(player.heading) * 1.1;
  muzzle.y = 1.5;
  showFlash(combat, muzzle, 180, 0.09, world.camera);
  world.audio.shot();
  world.effects.burst(muzzle, 0xffcc66, 6, 4);
  raycaster.setFromCamera(SCREEN_CENTRE, world.camera);
  const targets = [];
  for (const rival of combat.rivals) if (rival.alive) targets.push(rival.mesh);
  for (const ped of world.peds) if (!ped.down) targets.push(ped.mesh);
  for (const car of world.allCars) targets.push(car.mesh);
  const hits = raycaster.intersectObjects(targets, true);
  if (hits.length === 0) return true;
  const node = hitRoot(hits[0]);
  const point = hits[0].point;
  const rival = combat.rivals.find((r) => r.mesh === node);
  if (rival) {
    rival.health -= TUNING.pistolDamage;
    rival.hitFlash = 0.15;
    world.effects.burst(point, 0xff4444, 8, 5);
    if (rival.health <= 0) {
      rival.alive = false;
      rival.mesh.rotation.x = -Math.PI / 2;
      rival.mesh.position.y = 0.3;
      world.audio.thud();
    }
    return true;
  }
  const ped = world.peds.find((p) => p.mesh === node);
  if (ped) {
    knockPedDown(ped);
    scatterPeds(point.x, point.z, 20, world.peds);
    addWanted(world.police, 1);
    return true;
  }
  world.effects.burst(point, 0xffe9a8, 5, 4);
  return true;
}

/** One rival's shot at Mara: flash, bang, and a coin-flip hit. */
function rivalShot(dt, world, rival) {
  const combat = world.combat;
  rival.shootTimer -= dt;
  if (rival.shootTimer > 0) return 0;
  rival.shootTimer = 1.1 + Math.random() * 1.1;
  const rp = rival.mesh.position;
  const at = new THREE.Vector3(rp.x, 1.5, rp.z);
  showFlash(combat, at, 40, 0.07, null);
  world.audio.shot();
  world.effects.burst(at, 0xffcc66, 4, 3);
  return Math.random() < 0.45 ? TUNING.rivalDamage : 0;
}

/** Rivals aim at Mara, strafe across her aim and shoot; returns damage dealt. */
export function updateRivals(dt, world) {
  const combat = world.combat;
  const pos = playerPosition(world.player);
  let damage = 0;
  for (const rival of combat.rivals) {
    if (!rival.alive) continue;
    const rp = rival.mesh.position;
    const dist = Math.hypot(pos.x - rp.x, pos.z - rp.z);
    rival.mesh.rotation.y = Math.atan2(pos.x - rp.x, pos.z - rp.z);
    // Strafe sideways across the player's aim, flipping every second or
    // so — a moving rival is a harder target than a standing one.
    rival.strafeTimer -= dt;
    if (rival.strafeTimer <= 0) {
      rival.strafeTimer = 0.8 + Math.random() * 1.4;
      rival.strafeDir *= -1;
    }
    if (dist < 45 && dist > 4) {
      const nx = (pos.x - rp.x) / dist;
      const nz = (pos.z - rp.z) / dist;
      const before = { x: rp.x, z: rp.z };
      rp.x += -nz * rival.strafeDir * 2.1 * dt;
      rp.z += nx * rival.strafeDir * 2.1 * dt;
      collideCircle(rp, 0.6, world.layout);
      if (Math.hypot(rp.x - before.x, rp.z - before.z) < 0.001) rival.strafeDir *= -1;
    }
    if (rival.hitFlash > 0) {
      rival.hitFlash -= dt;
      rival.mesh.children[0].material.emissive.setHex(rival.hitFlash > 0 ? 0x661111 : 0x000000);
    }
    if (dist <= 45) damage += rivalShot(dt, world, rival);
  }
  if (combat.cooldown > 0) combat.cooldown -= dt;
  if (combat.reloading > 0) {
    combat.reloading -= dt;
    if (combat.reloading <= 0) combat.ammo = TUNING.pistolAmmo;
  }
  if (combat.flashTime > 0) {
    combat.flashTime -= dt;
    if (combat.flashTime <= 0) {
      combat.flash.intensity = 0;
      combat.flashMesh.visible = false;
    }
  }
  return damage;
}

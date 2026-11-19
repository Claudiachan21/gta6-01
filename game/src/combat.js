// Combat: Mara's pistol (aim with the mouse, click to fire, R to reload),
// rival crew members who shoot back, muzzle flash and hit sparks. Rivals
// strafe sideways between shots, so a firefight moves instead of standing
// still.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { knockPedDown, scatterPeds } from './pedestrians.js';
import { playerPosition } from './player.js';
import { addWanted } from './police.js';

const raycaster = new THREE.Raycaster();

function makeRivalMesh() {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: 0xb03030 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5a });
  const pants = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.78, 0.36), shirt);
  torso.position.y = 1.16;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), skin);
  head.position.y = 1.8;
  const legGeometry = new THREE.BoxGeometry(0.26, 0.82, 0.3);
  legGeometry.translate(0, -0.41, 0);
  const legL = new THREE.Mesh(legGeometry, pants);
  legL.position.set(-0.17, 0.82, 0);
  const legR = new THREE.Mesh(legGeometry, pants);
  legR.position.set(0.17, 0.82, 0);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.42), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gun.position.set(0.45, 1.35, 0.3);
  group.add(torso, head, legL, legR, gun);
  return group;
}

export function createCombat(scene) {
  const flash = new THREE.PointLight(0xffcc66, 0, 18, 2);
  scene.add(flash);
  const flashMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.8),
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
      homeX: p.x,
      homeZ: p.z,
      health: TUNING.rivalHealth,
      shootTimer: 1 + Math.random(),
      strafeTimer: 0.8 + Math.random(),
      strafeDir: 0,
      alive: true,
      hitFlash: 0,
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
  combat.flashTime = 0.09;
  const muzzle = playerPosition(player).clone();
  muzzle.x += Math.sin(player.heading) * 1.1;
  muzzle.z += Math.cos(player.heading) * 1.1;
  muzzle.y = 1.5;
  combat.flash.position.copy(muzzle);
  combat.flash.intensity = 120;
  combat.flashMesh.position.copy(muzzle);
  combat.flashMesh.lookAt(world.camera.position);
  combat.flashMesh.visible = true;
  world.audio.shot();
  world.effects.burst(muzzle, 0xffcc66, 6, 4);
  raycaster.setFromCamera(new THREE.Vector2(0, 0), world.camera);
  const targets = [];
  for (const rival of combat.rivals) if (rival.alive) targets.push(rival.mesh);
  for (const ped of world.peds) if (!ped.down) targets.push(ped.mesh);
  for (const car of world.allCars) targets.push(car.mesh);
  const hits = raycaster.intersectObjects(targets, true);
  if (hits.length === 0) return true;
  const hit = hits[0];
  let node = hit.object;
  while (node.parent && node.parent.type !== 'Scene') node = node.parent;
  const rival = combat.rivals.find((r) => r.mesh === node);
  if (rival) {
    rival.health -= TUNING.pistolDamage;
    rival.hitFlash = 0.15;
    world.effects.burst(hit.point, 0xff4444, 8, 5);
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
    scatterPeds(hit.point.x, hit.point.z, 20, world.peds);
    addWanted(world.police, 1);
    return true;
  }
  world.effects.burst(hit.point, 0xffe9a8, 5, 4);
  return true;
}

/** Rivals aim at Mara, strafe between shots, and shoot with loose aim. */
export function updateRivals(dt, world) {
  const combat = world.combat;
  const pos = playerPosition(world.player);
  let damage = 0;
  for (const rival of combat.rivals) {
    if (!rival.alive) continue;
    const rp = rival.mesh.position;
    const dist = Math.hypot(pos.x - rp.x, pos.z - rp.z);
    rival.mesh.rotation.y = Math.atan2(pos.x - rp.x, pos.z - rp.z);
    if (rival.hitFlash > 0) {
      rival.hitFlash -= dt;
      rival.mesh.children[0].material.emissive.setHex(rival.hitFlash > 0 ? 0x661111 : 0x000000);
    }
    // Strafe: sidestep left or right for a second or two, staying near
    // home so the fight does not wander off across the yard.
    rival.strafeTimer -= dt;
    if (rival.strafeTimer <= 0) {
      rival.strafeTimer = 1 + Math.random() * 1.6;
      rival.strafeDir = Math.random() < 0.5 ? -1 : 1;
      const homeDist = Math.hypot(rp.x - rival.homeX, rp.z - rival.homeZ);
      if (homeDist > 6) rival.strafeDir = 0;
    }
    if (rival.strafeDir !== 0 && dist < 45) {
      const face = Math.atan2(pos.x - rp.x, pos.z - rp.z);
      const sideX = Math.cos(face) * rival.strafeDir;
      const sideZ = -Math.sin(face) * rival.strafeDir;
      rp.x += sideX * 2.2 * dt;
      rp.z += sideZ * 2.2 * dt;
    }
    if (dist > 45) continue;
    rival.shootTimer -= dt;
    if (rival.shootTimer <= 0) {
      rival.shootTimer = 1.1 + Math.random() * 1.1;
      combat.flash.position.set(rp.x, 1.5, rp.z);
      combat.flash.intensity = 40;
      combat.flashTime = 0.07;
      world.audio.shot();
      world.effects.burst(new THREE.Vector3(rp.x, 1.5, rp.z), 0xffcc66, 4, 3);
      if (Math.random() < 0.45) damage += TUNING.rivalDamage;
    }
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

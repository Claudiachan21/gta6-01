// Mara Solis, the player: on-foot movement and animation, getting in and
// out of cars, health and cash. Stealing a car (any car that is not already
// hers) draws police attention.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { collideCircle } from './city.js';
import { nearestCar } from './vehicles.js';

function makePlayerMesh() {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x1f8a7a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const hair = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.78, 0.36), jacket);
  torso.position.y = 1.16;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), skin);
  head.position.y = 1.8;
  head.castShadow = true;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 6, 0, Math.PI * 2, 0, 1.1), hair);
  cap.position.y = 1.86;
  const legGeometry = new THREE.BoxGeometry(0.26, 0.82, 0.3);
  legGeometry.translate(0, -0.41, 0);
  const legL = new THREE.Mesh(legGeometry, pants);
  legL.position.set(-0.17, 0.82, 0);
  const legR = new THREE.Mesh(legGeometry, pants);
  legR.position.set(0.17, 0.82, 0);
  const armGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.24);
  armGeometry.translate(0, -0.35, 0);
  const armL = new THREE.Mesh(armGeometry, jacket);
  armL.position.set(-0.44, 1.5, 0);
  const armR = new THREE.Mesh(armGeometry, jacket);
  armR.position.set(0.44, 1.5, 0);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.42), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  gun.position.set(0, -0.72, 0.12);
  armR.add(gun);
  group.add(torso, head, cap, legL, legR, armL, armR);
  return { group, legL, legR, armL, armR };
}

/** Create the player at a spawn point. */
export function createPlayer(scene, spawn, cash) {
  const { group, legL, legR, armL, armR } = makePlayerMesh();
  group.position.set(spawn.x, 0, spawn.z);
  group.rotation.y = spawn.heading;
  scene.add(group);
  return {
    mesh: group,
    legL,
    legR,
    armL,
    armR,
    heading: spawn.heading,
    speed: 0,
    phase: 0,
    onFoot: true,
    car: null,
    health: TUNING.playerHealth,
    cash,
    aiming: false,
  };
}

/** Move on foot relative to the camera yaw; returns the speed. */
export function updateOnFoot(dt, player, input, cameraYaw, world) {
  const axes = input.moveAxes();
  const len = Math.hypot(axes.x, axes.z);
  const running = input.running();
  const target = len > 0.1 ? (running ? TUNING.runSpeed : TUNING.walkSpeed) : 0;
  player.speed += (target - player.speed) * Math.min(1, dt * 10);
  if (len > 0.1) {
    const nx = axes.x / len;
    const nz = axes.z / len;
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    const wx = nz * sin - nx * cos;
    const wz = nz * cos + nx * sin;
    player.heading = Math.atan2(wx, wz);
    const pos = player.mesh.position;
    pos.x += wx * player.speed * dt;
    pos.z += wz * player.speed * dt;
    collideCircle(pos, TUNING.playerRadius, world.layout);
    player.phase += dt * player.speed * 1.5;
  }
  const swing = Math.min(1, player.speed / TUNING.walkSpeed) * 0.7;
  player.legL.rotation.x = Math.sin(player.phase) * swing;
  player.legR.rotation.x = -Math.sin(player.phase) * swing;
  player.armL.rotation.x = -Math.sin(player.phase) * swing * 0.7;
  player.armR.rotation.x = player.aiming ? -1.2 : Math.sin(player.phase) * swing * 0.7;
  player.mesh.rotation.y = player.heading;
  return player.speed;
}

/** Get into the nearest car (stealing it if it is not already the player's). */
export function tryEnterCar(player, world) {
  const pos = player.mesh.position;
  const car = nearestCar(pos.x, pos.z, 4.5, world.allCars.filter((c) => c.state !== 'police' && c !== player.car));
  if (!car) return null;
  const stolen = car.state !== 'player';
  car.state = 'player';
  if (stolen) car.stolen = true;
  player.car = car;
  player.onFoot = false;
  player.mesh.visible = false;
  return { car, stolen };
}

/** Step out of the car beside it; the car stays parked where it stops. */
export function exitCar(player, world) {
  const car = player.car;
  if (!car) return;
  car.state = 'parked';
  car.speed = 0;
  const sideX = Math.cos(car.heading);
  const sideZ = -Math.sin(car.heading);
  const pos = player.mesh.position;
  pos.set(car.mesh.position.x + sideX * 2.6, 0, car.mesh.position.z + sideZ * 2.6);
  collideCircle(pos, TUNING.playerRadius, world.layout);
  player.heading = car.heading;
  player.mesh.rotation.y = player.heading;
  player.mesh.visible = true;
  player.car = null;
  player.onFoot = true;
}

/** Where the player is right now — the car, or Mara on foot. */
export function playerPosition(player) {
  return player.onFoot ? player.mesh.position : player.car.mesh.position;
}

/** How fast the player is moving right now. */
export function playerSpeed(player) {
  return player.onFoot ? player.speed : Math.abs(player.car.speed);
}

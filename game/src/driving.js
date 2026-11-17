// Arcade car physics, shared by the player's car and police cruisers:
// throttle and steering, grip that bleeds sideways slide, the handbrake,
// and collisions with buildings, other cars and pedestrians.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { collideCircle } from './city.js';
import { knockPedDown, scatterPeds } from './pedestrians.js';

function collideWithCars(car, cars, events) {
  const pos = car.mesh.position;
  for (const other of cars) {
    if (other === car) continue;
    const ox = other.mesh.position.x - pos.x;
    const oz = other.mesh.position.z - pos.z;
    const d2 = ox * ox + oz * oz;
    const min = TUNING.carRadius + TUNING.carRadius;
    if (d2 < min * min && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      const push = (min - d) / 2;
      const nx = ox / d;
      const nz = oz / d;
      pos.x -= nx * push;
      pos.z -= nz * push;
      other.mesh.position.x += nx * push;
      other.mesh.position.z += nz * push;
      if (Math.abs(car.speed) > 6) events.crashed = true;
      car.speed *= 0.55;
      if (other.state === 'traffic') other.speed *= 0.4;
    }
  }
}

function collideWithPeds(car, peds, events) {
  const pos = car.mesh.position;
  if (Math.abs(car.speed) < 4) return;
  for (const ped of peds) {
    if (ped.down) continue;
    const dx = ped.mesh.position.x - pos.x;
    const dz = ped.mesh.position.z - pos.z;
    if (dx * dx + dz * dz < 2.4 * 2.4) {
      knockPedDown(ped);
      scatterPeds(pos.x, pos.z, 18, peds);
      events.hitPed = true;
    }
  }
}

/** Advance one car a step under `axes` { throttle, steer, handbrake }. */
export function driveCar(dt, car, axes, world) {
  const events = { crashed: false, hitPed: false };
  const maxSpeed = car.state === 'police' ? TUNING.copMaxSpeed : TUNING.carMaxSpeed;
  if (axes.throttle > 0) car.speed += TUNING.carAccel * dt;
  else if (axes.throttle < 0) {
    car.speed += car.speed > 0.5 ? -TUNING.carBrake * dt : -TUNING.carAccel * 0.5 * dt;
  } else {
    car.speed -= car.speed * Math.min(1, dt * 0.6);
  }
  if (axes.handbrake) car.speed -= car.speed * Math.min(1, dt * 2.2);
  car.speed = Math.max(-TUNING.carMaxReverse, Math.min(maxSpeed, car.speed));
  const speedFactor = Math.min(1, Math.abs(car.speed) / 8);
  const grip = axes.handbrake ? 0.35 : 1;
  car.heading += axes.steer * TUNING.carTurn * speedFactor * grip * dt * (car.speed >= 0 ? 1 : -1);
  const pos = car.mesh.position;
  const wantX = pos.x + Math.sin(car.heading) * car.speed * dt;
  const wantZ = pos.z + Math.cos(car.heading) * car.speed * dt;
  pos.x = wantX;
  pos.z = wantZ;
  collideCircle(pos, TUNING.carRadius, world.layout);
  if ((pos.x !== wantX || pos.z !== wantZ) && Math.abs(car.speed) > 5) {
    events.crashed = true;
    car.speed *= 0.45;
  }
  collideWithCars(car, world.allCars, events);
  collideWithPeds(car, world.peds, events);
  car.mesh.rotation.y = car.heading;
  const spin = (car.speed * dt) / 0.38;
  for (const wheel of car.wheels) wheel.rotation.x += spin;
  if (car.lightBar) {
    car.flash += dt * 9;
    const on = Math.sin(car.flash) > 0;
    car.lightBar.userData.red.material.emissiveIntensity = on ? 2.2 : 0.15;
    car.lightBar.userData.blue.material.emissiveIntensity = on ? 0.15 : 2.2;
  }
  return events;
}

/** Steering axes that drive a car toward a point (police chase AI). */
export function steerToward(car, targetX, targetZ) {
  const pos = car.mesh.position;
  const want = Math.atan2(targetX - pos.x, targetZ - pos.z);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const dist = Math.hypot(targetX - pos.x, targetZ - pos.z);
  return {
    throttle: dist > 4 ? 1 : 0.3,
    steer: Math.max(-1, Math.min(1, diff * 2.2)),
    handbrake: Math.abs(diff) > 2.2 && car.speed > 14,
  };
}

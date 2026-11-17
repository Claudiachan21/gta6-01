// Cars: low-poly box-built meshes (sedan, sport, van, taxi, police) and the
// traffic system — cars drive their lanes, turn at intersections and brake
// for the car ahead.
import * as THREE from 'three';
import { COLORS, STREETS, TUNING, WORLD_HALF } from './config.js';
import { nearestStreet, randomRoadPoint } from './city.js';

const WHEEL_GEOMETRY = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
const WHEEL_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const GLASS_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x1d2f42 });

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** Build a car mesh of `kind` in `color`; returns { group, wheels, lightBar }. */
export function createCarMesh(kind, color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const long = kind === 'van' ? 5.0 : kind === 'sport' ? 4.0 : 4.3;
  const wide = kind === 'van' ? 2.1 : 1.9;
  group.add(box(wide, 0.62, long, paint, 0, 0.62, 0));
  if (kind === 'van') {
    group.add(box(wide - 0.1, 0.85, long - 1.2, paint, 0, 1.3, 0));
    group.add(box(wide - 0.3, 0.6, 0.2, GLASS_MATERIAL, 0, 1.25, long / 2 - 0.5));
  } else {
    group.add(box(wide - 0.3, 0.55, long * 0.45, GLASS_MATERIAL, 0, 1.18, -long * 0.05));
    group.add(box(wide - 0.25, 0.12, long * 0.42, paint, 0, 1.48, -long * 0.05));
  }
  if (kind === 'sport') {
    group.add(box(wide + 0.1, 0.1, 0.5, paint, 0, 1.05, -long / 2 + 0.1));
  }
  if (kind === 'taxi') {
    group.add(box(0.9, 0.28, 0.5, new THREE.MeshLambertMaterial({ color: 0xffd94d, emissive: 0x554400 }), 0, 1.68, 0));
  }
  let lightBar = null;
  if (kind === 'police') {
    const stripe = new THREE.MeshLambertMaterial({ color: COLORS.policeBlue });
    group.add(box(wide + 0.02, 0.3, long * 0.7, stripe, 0, 0.72, 0));
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.22, 0.35),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff0000 }),
    );
    red.position.x = -0.35;
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.22, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x0011ff }),
    );
    blue.position.x = 0.35;
    lightBar.add(red);
    lightBar.add(blue);
    lightBar.position.y = 1.62;
    lightBar.userData.red = red;
    lightBar.userData.blue = blue;
    group.add(lightBar);
  }
  const wheels = [];
  for (const [wx, wz] of [[-wide / 2, long / 2 - 0.8], [wide / 2, long / 2 - 0.8], [-wide / 2, -long / 2 + 0.8], [wide / 2, -long / 2 + 0.8]]) {
    const wheel = new THREE.Mesh(WHEEL_GEOMETRY, WHEEL_MATERIAL);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.38, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  return { group, wheels, lightBar };
}

function makeCar(scene, kind, color, x, z, heading) {
  const { group, wheels, lightBar } = createCarMesh(kind, color);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);
  return {
    mesh: group,
    wheels,
    lightBar,
    kind,
    color,
    heading,
    speed: 0,
    state: 'traffic',
    axis: 'x',
    street: 0,
    dir: 1,
    flash: 0,
    damage: 0,
  };
}

/** Spawn flowing traffic on the avenues. */
export function createTraffic(scene, layout, rng, count) {
  const cars = [];
  const kinds = ['sedan', 'sedan', 'sedan', 'sport', 'van', 'taxi'];
  for (let i = 0; i < count; i += 1) {
    const axis = rng.chance(0.5) ? 'x' : 'z';
    const point = randomRoadPoint(rng, axis);
    const dir = rng.chance(0.5) ? 1 : -1;
    const kind = rng.pick(kinds);
    const car = makeCar(
      scene,
      kind,
      kind === 'taxi' ? 0xe8c832 : rng.pick(COLORS.carPaint),
      point.x,
      point.z,
      axis === 'x' ? (dir === 1 ? Math.PI / 2 : -Math.PI / 2) : dir === 1 ? 0 : Math.PI,
    );
    car.axis = axis;
    car.street = axis === 'x' ? nearestStreet(point.z) : nearestStreet(point.x);
    car.dir = dir;
    car.speed = rng.range(8, TUNING.trafficSpeed + 3);
    cars.push(car);
  }
  return cars;
}

/** Parked cars along the kerbs, ready to be stolen. */
export function createParkedCars(scene, layout, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const axis = rng.chance(0.5) ? 'x' : 'z';
    const street = rng.pick(STREETS);
    const along = rng.range(-170, 170);
    const side = rng.pick([-4.6, 4.6]);
    const kind = rng.pick(['sedan', 'sedan', 'sport', 'van']);
    const car = makeCar(
      scene,
      kind,
      rng.pick(COLORS.carPaint),
      axis === 'x' ? along : street + side,
      axis === 'x' ? street + side : along,
      axis === 'x' ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : side > 0 ? Math.PI : 0,
    );
    car.state = 'parked';
    cars.push(car);
  }
  return cars;
}

/** A police cruiser at a road position, ready to chase. */
export function spawnPoliceCar(scene, x, z, heading) {
  const car = makeCar(scene, 'police', COLORS.policeWhite, x, z, heading);
  car.state = 'police';
  return car;
}

/** Any car at a fixed spot (mission vehicles), parked until taken. */
export function spawnCar(scene, kind, color, x, z, heading) {
  const car = makeCar(scene, kind, color, x, z, heading);
  car.state = 'parked';
  return car;
}

function carAhead(car, cars, gap) {
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  for (const other of cars) {
    if (other === car) continue;
    const dx = other.mesh.position.x - car.mesh.position.x;
    const dz = other.mesh.position.z - car.mesh.position.z;
    const ahead = dx * fx + dz * fz;
    const side = Math.abs(dx * fz - dz * fx);
    if (ahead > 0 && ahead < gap && side < 2.2) return true;
  }
  return false;
}

/** Drive one traffic car along its lane; it may turn at an intersection. */
export function updateTrafficCar(car, dt, cars, rng) {
  const pos = car.mesh.position;
  const cruise = TUNING.trafficSpeed;
  car.speed += ((carAhead(car, cars, 9) ? 0 : cruise) - car.speed) * Math.min(1, dt * 2);
  const step = car.speed * dt;
  if (car.axis === 'x') pos.x += car.dir * step;
  else pos.z += car.dir * step;
  const cross = car.axis === 'x' ? pos.x : pos.z;
  if (Math.abs(cross - nearestStreet(cross)) < 0.6 && rng.chance(dt * 2)) {
    const turn = rng.chance(0.5) ? 1 : -1;
    if (car.axis === 'x') {
      car.axis = 'z';
      car.dir = turn;
      pos.x = nearestStreet(pos.x) + (turn === 1 ? -3 : 3);
      car.heading = turn === 1 ? 0 : Math.PI;
    } else {
      car.axis = 'x';
      car.dir = turn;
      pos.z = nearestStreet(pos.z) + (turn === 1 ? 3 : -3);
      car.heading = turn === 1 ? Math.PI / 2 : -Math.PI / 2;
    }
    car.street = car.axis === 'x' ? nearestStreet(pos.z) : nearestStreet(pos.x);
  }
  if (Math.abs(pos.x) > WORLD_HALF - 4 || Math.abs(pos.z) > WORLD_HALF - 4) {
    const point = randomRoadPoint(rng, car.axis);
    pos.x = point.x;
    pos.z = point.z;
    car.street = car.axis === 'x' ? nearestStreet(point.z) : nearestStreet(point.x);
  }
  car.mesh.rotation.y = car.heading;
  for (const wheel of car.wheels) wheel.rotation.x += (car.speed * dt) / 0.38;
}

/** The car nearest to a point within maxDist, from a list. */
export function nearestCar(x, z, maxDist, cars) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const dx = car.mesh.position.x - x;
    const dz = car.mesh.position.z - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

// Traffic lights at four intersections: two phases (north-south, then
// east-west), 12 s green + 2 s yellow each. Traffic obeys the red; the
// player is free to run it — the cops do not keep score, the city does.
import * as THREE from 'three';

export const LIGHT_INTERSECTIONS = [
  { x: 0, z: 0 },
  { x: 44, z: -44 },
  { x: -88, z: 88 },
  { x: 132, z: 132 },
];

const ON = { red: 0xff2222, yellow: 0xffcc00, green: 0x22ff44 };
const OFF = { red: 0x330000, yellow: 0x332200, green: 0x002200 };
const PHASES = ['ns-green', 'ns-yellow', 'ew-green', 'ew-yellow'];
const LENGTHS = { 'ns-green': 12, 'ns-yellow': 2, 'ew-green': 12, 'ew-yellow': 2 };

function makeHead() {
  // One signal head: a dark box with three lamps, lit by plain colour.
  const head = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.9, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  box.castShadow = true;
  head.add(box);
  const lamps = {};
  ['red', 'yellow', 'green'].forEach((name, i) => {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 10),
      new THREE.MeshBasicMaterial({ color: OFF[name] }),
    );
    lamp.position.set(0, 0.6 - i * 0.6, 0.3);
    head.add(lamp);
    lamps[name] = lamp.material;
  });
  return { group: head, lamps };
}

/** Build the signals: a pole at each corner, one head per direction. */
export function createTrafficLights(scene) {
  const heads = [];
  for (const spot of LIGHT_INTERSECTIONS) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 5.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x3a3a3a }),
    );
    pole.position.set(spot.x + 5, 2.7, spot.z + 5);
    pole.castShadow = true;
    scene.add(pole);
    const ns = makeHead();
    ns.group.position.set(spot.x + 5, 5.2, spot.z + 5);
    scene.add(ns.group);
    const ew = makeHead();
    ew.group.position.set(spot.x + 5, 5.2, spot.z + 5);
    ew.group.rotation.y = Math.PI / 2;
    scene.add(ew.group);
    heads.push({ ns: ns.lamps, ew: ew.lamps });
  }
  return { heads, phase: 'ns-green', timer: 0 };
}

function paint(lamps, colour) {
  for (const name of Object.keys(lamps)) lamps[name].color.setHex(name === colour ? ON[name] : OFF[name]);
}

/** Advance the light cycle and repaint the lamps. */
export function updateTrafficLights(dt, lights) {
  lights.timer += dt;
  if (lights.timer >= LENGTHS[lights.phase]) {
    lights.timer = 0;
    lights.phase = PHASES[(PHASES.indexOf(lights.phase) + 1) % PHASES.length];
  }
  const nsColour = lights.phase === 'ns-green' ? 'green' : lights.phase === 'ns-yellow' ? 'yellow' : 'red';
  const ewColour = lights.phase === 'ew-green' ? 'green' : lights.phase === 'ew-yellow' ? 'yellow' : 'red';
  for (const head of lights.heads) {
    paint(head.ns, nsColour);
    paint(head.ew, ewColour);
  }
}

/** The light a car on `axis` ('x' east-west, 'z' north-south) sees. */
export function lightFor(lights, axis) {
  if (!lights) return 'green';
  if (axis === 'z') return lights.phase === 'ns-green' ? 'green' : lights.phase === 'ns-yellow' ? 'yellow' : 'red';
  return lights.phase === 'ew-green' ? 'green' : lights.phase === 'ew-yellow' ? 'yellow' : 'red';
}

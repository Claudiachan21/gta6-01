// Landmarks: the sights that make Solmar Bay a place, not a grid — a
// striped lighthouse on the north beach, harbor cranes and container
// stacks, a boardwalk pier with a Ferris wheel, a stadium bowl and a
// marina plaza with a fountain. Each adds its colliders to the layout.
import * as THREE from 'three';
import { COLORS } from './config.js';

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addCollider(layout, x, z, halfW, halfD) {
  layout.colliders.push({
    minX: x - halfW,
    maxX: x + halfW,
    minZ: z - halfD,
    maxZ: z + halfD,
  });
}

function buildLighthouse(group, layout) {
  const x = 208;
  const z = -168;
  const white = new THREE.MeshLambertMaterial({ color: 0xf5f0e1 });
  const red = new THREE.MeshLambertMaterial({ color: 0xc23b2e });
  const tower = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6 - i * 0.18, 2.8 - i * 0.18, 4.4, 12),
      i % 2 === 0 ? white : red,
    );
    band.position.y = 2.2 + i * 4.4;
    band.castShadow = true;
    tower.add(band);
  }
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 2.6, 10),
    new THREE.MeshLambertMaterial({ color: 0x222222 }),
  );
  lampRoom.position.y = 23.2;
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(1.3, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  );
  lamp.position.y = 23.2;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 2, 10),
    new THREE.MeshLambertMaterial({ color: 0xc23b2e }),
  );
  roof.position.y = 25.4;
  // The beam sweeps the sea at night; the day/night cycle shows it.
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(6, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff2b0,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.set(30, 0, 0);
  const beamPivot = new THREE.Group();
  beamPivot.position.y = 23.2;
  beamPivot.add(beam);
  beamPivot.visible = false;
  tower.add(lampRoom, lamp, roof, beamPivot);
  tower.position.set(x, 0, z);
  group.add(tower);
  addCollider(layout, x, z, 3.4, 3.4);
  return beamPivot;
}

function buildHarbor(group, layout, rng) {
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xe87a2e });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  for (const [cx, cz] of [[168, -150], [186, -118]]) {
    const crane = new THREE.Group();
    crane.add(box(1.4, 26, 1.4, craneMat, -4, 13, 0));
    crane.add(box(1.4, 26, 1.4, craneMat, 4, 13, 0));
    crane.add(box(12, 1.6, 2, craneMat, 0, 26, 0));
    crane.add(box(20, 1.2, 1.4, craneMat, 6, 27.4, 0));
    crane.add(box(1, 8, 1, darkMat, 14, 23, 0));
    crane.add(box(2.4, 1.6, 2, darkMat, 14, 18.4, 0));
    crane.position.set(cx, 0, cz);
    crane.rotation.y = cx > 175 ? -0.4 : 0.5;
    group.add(crane);
    addCollider(layout, cx, cz, 5, 3);
  }
  // A pink neon HARBOR sign on two posts at the yard's east edge: the
  // harbor's night signature, and the neon-pink token made visible in
  // the world. It stands at eye level facing the yard — the first
  // version hung on the crane at y 24, above every ground camera's
  // frame, and was never seen.
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256;
  signCanvas.height = 64;
  const signCtx = signCanvas.getContext('2d');
  signCtx.fillStyle = '#160a12';
  signCtx.fillRect(0, 0, 256, 64);
  signCtx.fillStyle = '#ff5a8a';
  signCtx.font = 'bold 40px system-ui, sans-serif';
  signCtx.textAlign = 'center';
  signCtx.fillText('HARBOR', 128, 46);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const harborSign = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 3),
    new THREE.MeshLambertMaterial({
      map: signTexture,
      emissive: 0xffffff,
      emissiveMap: signTexture,
      emissiveIntensity: 1.1,
    }),
  );
  harborSign.position.set(192, 3, -122);
  harborSign.rotation.y = -Math.PI / 2;
  group.add(harborSign);
  group.add(box(0.3, 3.5, 0.3, darkMat, 186.5, 1.75, -122));
  group.add(box(0.3, 3.5, 0.3, darkMat, 197.5, 1.75, -122));
  addCollider(layout, 192, -122, 6, 0.5);
  const containerColors = [0xc23b2e, 0x2e6fc2, 0x3aa655, 0xe8c832, 0x7a4fb0];
  const spots = [
    [150, -140, 0],
    [156, -140, 0],
    [153, -140, 2.6],
    [146, -162, 0.3],
    [152, -162, 0.3],
    [162, -166, 0],
    [168, -166, 0],
  ];
  for (const [x, z, ry] of spots) {
    const stack = 1 + Math.floor(rng.next() * 2);
    for (let i = 0; i < stack; i += 1) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(6, 2.6, 2.6),
        new THREE.MeshLambertMaterial({ color: rng.pick(containerColors) }),
      );
      c.position.set(x, 1.3 + i * 2.6, z);
      c.rotation.y = ry;
      c.castShadow = true;
      c.receiveShadow = true;
      group.add(c);
    }
    addCollider(layout, x, z, 3.4, 1.8);
  }
}

function buildPier(group, layout) {
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x9a7a52 });
  const postMat = new THREE.MeshLambertMaterial({ color: 0x6b4f35 });
  const deck = box(54, 0.8, 8, deckMat, 225, 1.2, 60);
  group.add(deck);
  for (let x = 202; x <= 248; x += 8) {
    group.add(box(0.8, 2.4, 0.8, postMat, x, 0, 56.5));
    group.add(box(0.8, 2.4, 0.8, postMat, x, 0, 63.5));
  }
  // A slow Ferris wheel at the pier's end: the skyline's moving signature.
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(11, 0.5, 8, 32),
    new THREE.MeshLambertMaterial({ color: 0xff5a8a }),
  );
  wheel.add(rim);
  for (let i = 0; i < 8; i += 1) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 22, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
    );
    spoke.rotation.z = (i / 8) * Math.PI;
    wheel.add(spoke);
    const angle = (i / 8) * Math.PI * 2;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.4, 1.4),
      new THREE.MeshLambertMaterial({ color: COLORS.carPaint[i % COLORS.carPaint.length] }),
    );
    cabin.position.set(Math.cos(angle) * 11, Math.sin(angle) * 11, 0);
    wheel.add(cabin);
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 2, 10),
    new THREE.MeshLambertMaterial({ color: 0x33373d }),
  );
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  wheel.position.set(246, 13.5, 60);
  const legL = box(1, 14, 1, postMat, 241, 7, 60);
  legL.rotation.z = 0.25;
  const legR = box(1, 14, 1, postMat, 251, 7, 60);
  legR.rotation.z = -0.25;
  group.add(wheel, legL, legR);
  addCollider(layout, 246, 60, 3, 3);
  return wheel;
}

function buildStadium(group, layout) {
  const x = -154;
  const z = 154;
  // A bowl small enough to fit its block, with walls the player can walk
  // around — and an east gate, so mission 4's finish line at the centre
  // is reachable on foot or by car. The gate is a real gap in the bowl
  // mesh (theta gap facing east), not just in the colliders, so the car
  // and the camera pass through an opening instead of clipping a wall.
  const bowlMat = new THREE.MeshLambertMaterial({ color: 0xd9d2c0 });
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(13, 14, 9, 24, 1, true, Math.PI / 2 + 0.22, Math.PI * 2 - 0.44),
    bowlMat,
  );
  bowl.position.set(x, 4.5, z);
  bowl.material.side = THREE.DoubleSide;
  bowl.castShadow = true;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(13.5, 0.9, 8, 24),
    new THREE.MeshLambertMaterial({ color: 0x1f8a7a }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, 9.2, z);
  const field = new THREE.Mesh(
    new THREE.CircleGeometry(12, 24),
    new THREE.MeshLambertMaterial({ color: 0x4d9e57 }),
  );
  field.rotation.x = -Math.PI / 2;
  field.position.set(x, 0.15, z);
  field.receiveShadow = true;
  group.add(bowl, rim, field);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xfff6c9, emissive: 0x554d1f });
  for (const [ox, oz] of [[-11, -11], [11, -20], [-11, 11], [11, 11]]) {
    group.add(box(0.8, 16, 0.8, poleMat, x + ox, 8, z + oz));
    const head = box(3.4, 1.6, 0.5, lampMat, x + ox, 16.4, z + oz);
    head.lookAt(x, 0, z);
    group.add(head);
  }
  // Bowl walls as four thin colliders; the east wall leaves a gate open.
  addCollider(layout, x, z + 14, 13, 1);
  addCollider(layout, x, z - 14, 13, 1);
  // A name board on the bowl's north-east curve, angled toward the
  // street the driver comes down: a board flat on the east wall is
  // seen edge-on from the north, and one on the south wall is 40 m
  // away. Without a readable name the bowl is a blank curved wall.
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const signCtx = signCanvas.getContext('2d');
  signCtx.fillStyle = '#0e1a24';
  signCtx.fillRect(0, 0, 512, 128);
  signCtx.fillStyle = '#ffd94d';
  signCtx.font = 'bold 72px system-ui, sans-serif';
  signCtx.textAlign = 'center';
  signCtx.fillText('STADIUM', 256, 92);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const stadiumSign = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 1.75),
    new THREE.MeshLambertMaterial({ map: signTexture }),
  );
  stadiumSign.position.set(x + 9.4, 6, z - 9.4);
  stadiumSign.rotation.y = (Math.PI * 3) / 4;
  group.add(stadiumSign);
  addCollider(layout, x - 14, z, 1, 13);
  addCollider(layout, x + 14, z - 8, 1, 5);
  addCollider(layout, x + 14, z + 8, 1, 5);
}

function buildPlaza(group, layout) {
  const x = 154;
  const z = 154;
  const stone = new THREE.MeshLambertMaterial({ color: 0xb9b3a4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.9, 8, 28), stone);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, 0.9, z);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(6, 28),
    new THREE.MeshLambertMaterial({ color: COLORS.water }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(x, 0.4, z);
  const jet = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 4.5, 10),
    new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.75 }),
  );
  jet.position.set(x, 3, z);
  group.add(ring, pool, jet);
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    group.add(box(2.4, 0.5, 0.7, benchMat, x + Math.cos(angle) * 10, 0.5, z + Math.sin(angle) * 10));
  }
  // A tight collider: the fountain rim is low enough to step over, and
  // mission 4 starts at the plaza centre — the player must reach it.
  addCollider(layout, x, z, 5, 5);
  return jet;
}

/** Build every landmark into the scene; returns the animated parts. */
export function buildLandmarks(scene, layout, rng) {
  const group = new THREE.Group();
  const beamPivot = buildLighthouse(group, layout);
  buildHarbor(group, layout, rng);
  const wheel = buildPier(group, layout);
  buildStadium(group, layout);
  const jet = buildPlaza(group, layout);
  buildBoats(group);
  scene.add(group);
  return { group, beamPivot, wheel, jet };
}

// A few sailboats off the beach: the sea reads as water with life in it,
// not a flat blue triangle, from the coastal cover orbit.
function buildBoats(group) {
  const hullMat = new THREE.MeshLambertMaterial({ color: 0x7a4a2b });
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e0, side: THREE.DoubleSide });
  const mastMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
  for (const [bx, bz, rot] of [[230, -95, 0.4], [248, -160, -0.3], [225, -55, 1.2], [265, -100, 0.9]]) {
    const boat = new THREE.Group();
    boat.add(box(2.2, 0.9, 5.5, hullMat, 0, 0.5, 0));
    boat.add(box(0.14, 5, 0.14, mastMat, 0, 3.2, 0));
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6), sailMat);
    sail.position.set(0, 3.4, 0.4);
    sail.rotation.y = Math.PI / 2;
    boat.add(sail);
    boat.position.set(bx, 0, bz);
    boat.rotation.y = rot;
    boat.scale.setScalar(1.6);
    group.add(boat);
  }
}

/** Spin the Ferris wheel, sweep the lighthouse beam, pulse the fountain. */
export function updateLandmarks(landmarks, dt, time) {
  if (landmarks.wheel) landmarks.wheel.rotation.z += dt * 0.12;
  if (landmarks.beamPivot) landmarks.beamPivot.rotation.y += dt * 0.5;
  if (landmarks.jet) {
    const s = 1 + Math.sin(time * 2.2) * 0.08;
    landmarks.jet.scale.set(s, 1 + Math.sin(time * 2.2) * 0.12, s);
  }
}

// The sky needs a sun and something in it, or dusk reads as a flat orange
// wedge: a low sun disc in the west (hidden at night) and slow clouds.
/** Build the sun disc and a handful of drifting clouds. */
export function buildSky(scene, rng) {
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(18, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.95, fog: false }),
  );
  // West-northwest, on the cover camera's view axis: from the coastal
  // orbit the sun sits in the left third of the frame instead of being
  // cut off at the corner.
  sun.position.set(-350, 55, -180);
  sun.lookAt(0, 40, 0);
  scene.add(sun);
  // Low, broad clouds near the camera's height, unlit so they stay
  // bright white against the dusk sky (lit clouds went orange and
  // vanished into it). Three sit in the northwest sky on purpose —
  // the cover camera looks that way — and five more drift anywhere.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xfff6e8, transparent: true, opacity: 0.9, fog: false });
  const puffGeo = new THREE.IcosahedronGeometry(1, 0);
  const clouds = [];
  const spots = [
    [-150, 60, -250],
    [-60, 65, -300],
    [-260, 55, -180],
  ];
  for (let i = 0; i < 5; i += 1) {
    spots.push([rng.next() * 600 - 300, 50 + rng.next() * 20, rng.next() * 500 - 250]);
  }
  for (const [cx, cy, cz] of spots) {
    const cloud = new THREE.Group();
    const puffs = 2 + Math.floor(rng.next() * 2);
    for (let j = 0; j < puffs; j += 1) {
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      puff.scale.set(18 + rng.next() * 12, 5, 10 + rng.next() * 6);
      puff.position.set(j * 14 - puffs * 7, rng.next() * 2, rng.next() * 4);
      cloud.add(puff);
    }
    cloud.position.set(cx, cy, cz);
    scene.add(cloud);
    clouds.push(cloud);
  }
  return { sun, clouds };
}

/** Drift the clouds east; hide the sun after dark. */
export function updateSky(sky, dt, hour) {
  sky.sun.visible = hour > 6 && hour < 19.2;
  for (const cloud of sky.clouds) {
    cloud.position.x += dt * 1.5;
    if (cloud.position.x > 360) cloud.position.x = -360;
  }
}

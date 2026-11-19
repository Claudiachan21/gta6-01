// Landmarks (lighthouse, crane, pier, stadium, plaza, sailboats, sun,
// clouds) plus the nine named districts the HUD toasts.
import * as THREE from 'three';
import { HARBOR_POS, LIGHTHOUSE_POS, PIER_POS, PLAZA_POS, STADIUM_POS } from './config.js';

export const DISTRICTS = [
  ['Old Town', 'Northside', 'Harbor'],
  ['West End', 'Downtown', 'Marina'],
  ['Stadium District', 'Southside', 'Beachfront'],
];

/** Which of the nine named districts holds (x, z). */
export function districtAt(x, z) {
  const col = x < -66 ? 0 : x <= 66 ? 1 : 2;
  const row = z < -66 ? 0 : z <= 66 ? 1 : 2;
  return DISTRICTS[row][col];
}

function textPanel(text, fg, bg, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = fg;
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture });
  // Two panels back to back: the sign reads correctly from both sides
  // (a DoubleSide plane would mirror the text from behind).
  const group = new THREE.Group();
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  back.position.z = -0.05;
  back.rotation.y = Math.PI;
  group.add(front, back);
  return group;
}

function box(w, h, d, color, x, y, z, parent) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function collider(layout, minX, maxX, minZ, maxZ) {
  layout.colliders.push({ minX, maxX, minZ, maxZ });
}

function buildLighthouse(group, layout) {
  const [lx, lz] = [LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.z];
  const tower = new THREE.Group();
  tower.position.set(lx, 0, lz);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 5.5, 3, 12),
    new THREE.MeshLambertMaterial({ color: 0xd8d2c4 }),
  );
  base.position.y = 1.5;
  tower.add(base);
  for (let i = 0; i < 5; i += 1) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6 - i * 0.25, 2.9 - i * 0.25, 4, 12),
      new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0xf2ede0 : 0xc23b2e }),
    );
    seg.position.y = 5 + i * 4;
    seg.castShadow = true;
    tower.add(seg);
  }
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 3, 12),
    new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffedb0, emissiveIntensity: 1.4 }),
  );
  lampRoom.position.y = 26.5;
  tower.add(lampRoom);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.8, 2.4, 12),
    new THREE.MeshLambertMaterial({ color: 0x8f2f26 }),
  );
  roof.position.y = 29.2;
  tower.add(roof);
  group.add(tower);
  // Rotating beam: a long translucent cone sweeping the sea.
  const beamGroup = new THREE.Group();
  beamGroup.position.set(lx, 26.5, lz);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c0, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(7, 70, 12, 1, true), beamMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(35, 0, 0);
  beamGroup.add(beam);
  const beamLight = new THREE.PointLight(0xfff2c0, 0, 110, 1.6);
  beamLight.position.set(lx, 27, lz);
  group.add(beamGroup, beamLight);
  // The keeper's cottage beside it, one warm window.
  box(6, 4, 5, 0xe8dcc0, lx - 8, 2, lz + 14, group);
  const cottageRoof = new THREE.Mesh(
    new THREE.ConeGeometry(4.6, 2.4, 4),
    new THREE.MeshLambertMaterial({ color: 0x8f2f26 }),
  );
  cottageRoof.position.set(lx - 8, 5.2, lz + 14);
  cottageRoof.rotation.y = Math.PI / 4;
  group.add(cottageRoof);
  const windowGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.MeshBasicMaterial({ color: 0xffd94d }),
  );
  windowGlow.position.set(lx - 8, 2.2, lz + 16.6);
  group.add(windowGlow);
  return { beamGroup, beamMat, beamLight };
}

function buildHarbor(group, layout) {
  const [hx, hz] = [HARBOR_POS.x, HARBOR_POS.z];
  // Crane: tower, jib toward the sea, hanging hook cable.
  box(3, 26, 3, 0xd88f2e, hx - 2, 13, hz + 6, group);
  box(24, 2, 2, 0xd88f2e, hx + 9, 25, hz + 6, group);
  box(1, 1, 8, 0xd88f2e, hx - 2, 27, hz + 6, group);
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 12, 6),
    new THREE.MeshLambertMaterial({ color: 0x222222 }),
  );
  cable.position.set(hx + 18, 19, hz + 6);
  group.add(cable);
  box(2.4, 1.6, 2.4, 0x8a8f94, hx + 18, 12.5, hz + 6, group);
  collider(layout, hx - 4, hx, hz + 4, hz + 8);
  // Container stacks in yard colours.
  const stacks = [
    { x: hx - 8, z: hz + 14, c: 0xc23b2e },
    { x: hx - 6, z: hz - 24, c: 0x2e6fc2 },
    { x: hx + 4, z: hz - 18, c: 0x3aa655 },
  ];
  for (const s of stacks) {
    box(8, 2.6, 2.6, s.c, s.x, 1.3, s.z, group);
    box(8, 2.6, 2.6, s.c === 0xc23b2e ? 0xe8c832 : s.c, s.x + 0.5, 3.9, s.z, group);
    collider(layout, s.x - 4.4, s.x + 4.4, s.z - 1.7, s.z + 1.7);
  }
  // Pink neon HARBOR sign over the yard gate.
  const sign = textPanel('HARBOR', '#ff5a8a', '#1a0e18', 16, 4);
  sign.position.set(hx, 7, hz);
  sign.rotation.y = -Math.PI / 2;
  group.add(sign);
  box(0.5, 7, 0.5, 0x333333, hx, 3.5, hz - 6, group);
  box(0.5, 7, 0.5, 0x333333, hx, 3.5, hz + 6, group);
}

function buildPier(group) {
  const [px, pz] = [PIER_POS.x, PIER_POS.z];
  box(64, 1, 8, 0x9a7a52, px - 30, 0.6, pz, group);
  for (let i = 0; i < 8; i += 1) {
    box(0.8, 3, 0.8, 0x6b543a, 202 + i * 8, -0.5, pz - 3, group);
    box(0.8, 3, 0.8, 0x6b543a, 202 + i * 8, -0.5, pz + 3, group);
  }
  // Ferris wheel at the pier end, facing the city.
  const outer = new THREE.Group();
  outer.position.set(px, 17, pz);
  outer.rotation.y = Math.PI / 2;
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(13, 0.5, 8, 32),
    new THREE.MeshLambertMaterial({ color: 0xffd94d }),
  );
  wheel.add(rim);
  for (let i = 0; i < 8; i += 1) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 26, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
    );
    spoke.rotation.z = (i * Math.PI) / 8;
    wheel.add(spoke);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.8, 1.6),
      new THREE.MeshLambertMaterial({ color: [0xff5a8a, 0x2e7fb8, 0xff6b35, 0x1f8a7a][i % 4] }),
    );
    const a = (i * Math.PI) / 4;
    cabin.position.set(Math.cos(a) * 13, Math.sin(a) * 13, 0);
    wheel.add(cabin);
  }
  outer.add(wheel);
  group.add(outer);
  box(1.2, 17, 1.2, 0xcccccc, px - 4, 8.5, pz, group);
  box(1.2, 17, 1.2, 0xcccccc, px + 4, 8.5, pz, group);
  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xff5a8a, emissive: 0x881144 }),
  );
  hub.position.set(px, 17, pz);
  group.add(hub);
  return wheel;
}

function buildStadium(group, layout) {
  const [sx, sz] = [STADIUM_POS.x, STADIUM_POS.z];
  const field = new THREE.Mesh(
    new THREE.CircleGeometry(11, 24),
    new THREE.MeshLambertMaterial({ color: 0x5da24a }),
  );
  field.rotation.x = -Math.PI / 2;
  field.position.set(sx, 0.12, sz);
  group.add(field);
  // Bowl wall: twelve segments around the field, the east one left open
  // as the gate the SUNSET RUN delivery aims for.
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xd8d2c4 });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x1f8a7a });
  for (let i = 0; i < 12; i += 1) {
    const a = (i * Math.PI) / 6;
    if (i === 0) continue;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(7.5, 7, 2), wallMat);
    seg.position.set(sx + Math.cos(a) * 13.5, 3.5, sz + Math.sin(a) * 13.5);
    seg.rotation.y = -a + Math.PI / 2;
    seg.castShadow = true;
    group.add(seg);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.8, 2.2), trimMat);
    trim.position.set(sx + Math.cos(a) * 13.5, 7.2, sz + Math.sin(a) * 13.5);
    trim.rotation.y = -a + Math.PI / 2;
    group.add(trim);
  }
  // Colliders: square ring with the east gate gap (z 150..158).
  collider(layout, sx - 15, sx + 15, sz - 15, sz - 11);
  collider(layout, sx - 15, sx + 15, sz + 11, sz + 15);
  collider(layout, sx - 15, sx - 11, sz - 11, sz + 11);
  collider(layout, sx + 11, sx + 15, sz - 11, sz - 4);
  collider(layout, sx + 11, sx + 15, sz + 4, sz + 11);
  // Floodlights on the four corners, bright after dark.
  const floodMats = [];
  for (const [fx, fz] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) {
    box(0.8, 12, 0.8, 0x555555, sx + fx, 6, sz + fz, group);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xfff6c9, emissive: 0xfff2c0, emissiveIntensity: 0.2 });
    floodMats.push(headMat);
    const head = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 0.6), headMat);
    head.position.set(sx + fx, 12.5, sz + fz);
    head.lookAt(sx, 0, sz);
    group.add(head);
  }
  const sign = textPanel('STADIUM', '#ffd94d', '#12202c', 12, 3);
  sign.position.set(-144.6, 6, 144.6);
  sign.rotation.y = Math.PI / 4;
  group.add(sign);
  return floodMats;
}

function buildPlaza(group, layout) {
  const [fx, fz] = [PLAZA_POS.x, PLAZA_POS.z];
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(5, 0.5, 8, 28),
    new THREE.MeshLambertMaterial({ color: 0xcfc8b8 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(fx, 0.8, fz);
  group.add(rim);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 24),
    new THREE.MeshLambertMaterial({ color: 0x2e7fb8 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(fx, 0.75, fz);
  group.add(water);
  const jet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.8, 3, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8d2c4 }),
  );
  jet.position.set(fx, 1.5, fz);
  group.add(jet);
  const spray = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.75 }),
  );
  spray.position.set(fx, 3.4, fz);
  group.add(spray);
  collider(layout, fx - 5, fx + 5, fz - 5, fz + 5);
}

function buildBoats(group, rng) {
  const boats = [];
  const spots = [[240, -80], [260, 20], [230, 120], [270, -160]];
  for (const [x, z] of spots) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1, 4.4),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
    );
    hull.position.y = 0.4;
    boat.add(hull);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 6.5, 6),
      new THREE.MeshLambertMaterial({ color: 0x8a7a5a }),
    );
    mast.position.y = 3.6;
    boat.add(mast);
    const sail = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 3.6, 2.2),
      new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
    );
    sail.position.set(0, 3.8, 0.6);
    sail.rotation.x = 0.12;
    boat.add(sail);
    boat.position.set(x, -0.2, z);
    boat.rotation.y = rng.range(0, Math.PI * 2);
    group.add(boat);
    boats.push({ group: boat, phase: rng.range(0, Math.PI * 2) });
  }
  return boats;
}

function buildSky(group, rng) {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(20, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd94d, fog: false }),
  );
  group.add(disc);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  const clouds = [];
  for (let i = 0; i < 8; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rng.next() * 3);
    for (let p = 0; p < puffs; p += 1) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(rng.range(4, 8), 0), cloudMat);
      puff.scale.y = 0.42;
      puff.position.set(rng.gauss() * 10, rng.gauss() * 2, rng.gauss() * 6);
      cloud.add(puff);
    }
    cloud.position.set(rng.range(-300, 300), rng.range(62, 92), rng.range(-300, 300));
    group.add(cloud);
    clouds.push(cloud);
  }
  return { disc, clouds, cloudMat };
}

function buildExtras(group, layout) {
  // Casino sign on the Downtown edge, gold on purple.
  const casino = textPanel('CASINO', '#ffd94d', '#2a1230', 13, 3.2);
  casino.position.set(-40, 6, 22);
  casino.rotation.y = Math.PI / 2;
  group.add(casino);
  box(0.5, 6, 0.5, 0x333333, -40, 3, 17, group);
  box(0.5, 6, 0.5, 0x333333, -40, 3, 27, group);
  // Boardwalk along the sand with three beach umbrellas.
  box(8, 0.4, 130, 0x9a7a52, 202, 0.25, 0, group);
  for (const [z, c] of [[-40, 0xff5a8a], [0, 0xffd94d], [40, 0x2e7fb8]]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6),
      new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
    );
    pole.position.set(202, 1.5, z);
    group.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 1.2, 10),
      new THREE.MeshLambertMaterial({ color: c }),
    );
    top.position.set(202, 3, z);
    group.add(top);
  }
  // Market stalls in Old Town: tables, striped-colour awnings, crates.
  const stallColors = [0xc23b2e, 0x1f8a7a, 0xe8c832, 0xff5a8a];
  for (let i = 0; i < 4; i += 1) {
    const x = -76 + i * 7;
    const z = -154;
    box(2.6, 1, 1.4, 0x8a6a4a, x, 0.5, z, group);
    box(3.2, 0.15, 2.2, stallColors[i], x, 2.6, z, group);
    for (const [ox, oz] of [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]]) {
      box(0.12, 2.6, 0.12, 0x666666, x + ox, 1.3, z + oz, group);
    }
    box(1, 1, 1, 0xa8845a, x + 2, 0.5, z + 2.5, group);
    collider(layout, x - 1.8, x + 1.8, z - 1.4, z + 1.4);
  }
  // Construction site: half-built frame, small crane, dirt pile.
  const [cx, cz] = [154, 66];
  for (const [ox, oz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {
    box(1.1, 9, 1.1, 0xb8b0a0, cx + ox, 4.5, cz + oz, group);
  }
  box(12, 0.5, 12, 0xb8b0a0, cx, 4.5, cz, group);
  box(12, 0.5, 12, 0xb8b0a0, cx, 9, cz, group);
  box(1.6, 16, 1.6, 0xd88f2e, cx - 9, 8, cz - 9, group);
  box(14, 1.2, 1.2, 0xd88f2e, cx - 3, 15.5, cz - 9, group);
  const dirt = new THREE.Mesh(
    new THREE.ConeGeometry(3.5, 2.2, 10),
    new THREE.MeshLambertMaterial({ color: 0x8a6a4a }),
  );
  dirt.position.set(cx + 9, 1.1, cz + 9);
  group.add(dirt);
  collider(layout, cx - 6.5, cx + 6.5, cz - 6.5, cz + 6.5);
}

/** Build every landmark into the scene; returns the animated parts. */
export function buildLandmarks(scene, layout, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const light = buildLighthouse(group, layout);
  buildHarbor(group, layout);
  const wheel = buildPier(group);
  const floodMats = buildStadium(group, layout);
  buildPlaza(group, layout);
  const boats = buildBoats(group, rng);
  const sky = buildSky(group, rng);
  buildExtras(group, layout);
  return { group, ...light, wheel, boats, ...sky, floodMats };
}

/** Animate the landmarks: beam, wheel, boats, clouds, sun disc, floods. */
export function updateLandmarks(dt, lm, daynight, camera, time) {
  lm.beamGroup.rotation.y += dt * 0.5;
  lm.beamMat.opacity = 0.04 + daynight.nightFactor * 0.16;
  lm.beamLight.intensity = daynight.nightFactor * 60;
  lm.wheel.rotation.z += dt * 0.12;
  for (const boat of lm.boats) {
    boat.group.position.y = -0.2 + Math.sin(time * 0.7 + boat.phase) * 0.3;
    boat.group.rotation.z = Math.sin(time * 0.5 + boat.phase) * 0.05;
  }
  for (const cloud of lm.clouds) {
    cloud.position.x += dt * 1.1;
    if (cloud.position.x > 320) cloud.position.x = -320;
  }
  const night = daynight.nightFactor;
  lm.cloudMat.color.setRGB(1 - night * 0.75, 1 - night * 0.78, 1 - night * 0.7);
  const discColor = new THREE.Color(0xffd94d).lerp(new THREE.Color(0xff6b35), daynight.goldenFactor);
  discColor.lerp(new THREE.Color(0xdfe8f0), night);
  lm.disc.material.color.copy(discColor);
  lm.disc.position.copy(daynight.sunDir).multiplyScalar(420);
  lm.disc.lookAt(camera.position);
  for (const mat of lm.floodMats) mat.emissiveIntensity = 0.2 + night * 2.2;
}

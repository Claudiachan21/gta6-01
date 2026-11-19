// Ground, water, mountains and street props. The ground is one big plane
// painted by a canvas texture: asphalt streets with dashes and crosswalks,
// sidewalks, parks, parking lots and the landmark aprons, all aligned with
// the city layout.
import * as THREE from 'three';
import { BLOCK_CENTERS, COLORS, STREETS, WORLD_HALF } from './config.js';

const TEX = 1024;
const SCALE = TEX / (WORLD_HALF * 2);

function toPx(v) {
  return (v + WORLD_HALF) * SCALE;
}

function groundTexture(layout) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX;
  canvas.height = TEX;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#cfc8b8';
  ctx.fillRect(0, 0, TEX, TEX);
  for (const park of layout.parks) {
    ctx.fillStyle = '#7fae6a';
    ctx.fillRect(toPx(park.x - 16), toPx(park.z - 16), 32 * SCALE, 32 * SCALE);
    ctx.fillStyle = '#8fbf77';
    ctx.beginPath();
    ctx.arc(toPx(park.x), toPx(park.z), 8 * SCALE, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const lot of layout.lots) {
    ctx.fillStyle = '#8f8a80';
    ctx.fillRect(toPx(lot.x - 16), toPx(lot.z - 16), 32 * SCALE, 32 * SCALE);
    ctx.strokeStyle = '#e8e4d8';
    ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i += 1) {
      ctx.strokeRect(toPx(lot.x + i * 5 - 2.4), toPx(lot.z - 12), 4.8 * SCALE, 9 * SCALE);
      ctx.strokeRect(toPx(lot.x + i * 5 - 2.4), toPx(lot.z + 3), 4.8 * SCALE, 9 * SCALE);
    }
  }
  // Landmark aprons: the stadium's green pitch, the harbor's concrete,
  // the plaza's stone and the garage's asphalt yard.
  for (const block of layout.landmarkBlocks) {
    if (block.kind === 'stadium') {
      ctx.fillStyle = '#4d9e57';
      ctx.beginPath();
      ctx.arc(toPx(block.x), toPx(block.z), 14 * SCALE, 0, Math.PI * 2);
      ctx.fill();
    } else if (block.kind === 'harbor') {
      ctx.fillStyle = '#9a958a';
      ctx.fillRect(toPx(block.x - 16), toPx(block.z - 16), 32 * SCALE, 32 * SCALE);
    } else if (block.kind === 'plaza') {
      ctx.fillStyle = '#d9d2c0';
      ctx.fillRect(toPx(block.x - 16), toPx(block.z - 16), 32 * SCALE, 32 * SCALE);
      ctx.strokeStyle = '#b9b3a4';
      ctx.lineWidth = 2;
      ctx.strokeRect(toPx(block.x - 12), toPx(block.z - 12), 24 * SCALE, 24 * SCALE);
    } else if (block.kind === 'garage') {
      ctx.fillStyle = '#8f8a80';
      ctx.fillRect(toPx(block.x - 16), toPx(block.z - 16), 32 * SCALE, 32 * SCALE);
    }
  }
  for (const s of STREETS) {
    ctx.fillStyle = '#b9b3a4';
    ctx.fillRect(0, toPx(s - 9), TEX, 18 * SCALE);
    ctx.fillRect(toPx(s - 9), 0, 18 * SCALE, TEX);
    ctx.fillStyle = '#33373d';
    ctx.fillRect(0, toPx(s - 6), TEX, 12 * SCALE);
    ctx.fillRect(toPx(s - 6), 0, 12 * SCALE, TEX);
  }
  ctx.fillStyle = '#e8c832';
  for (const s of STREETS) {
    for (let v = -WORLD_HALF + 8; v < WORLD_HALF - 8; v += 11) {
      // No centre dashes through intersections: real roads leave the
      // crossing clear (the crosswalks mark it), and crossed dashes
      // read as a giant yellow plus from the low chase camera.
      if (STREETS.some((t) => Math.abs(v - t) < 9)) continue;
      ctx.fillRect(toPx(v), toPx(s - 0.4), 5 * SCALE, 0.8 * SCALE);
      ctx.fillRect(toPx(s - 0.4), toPx(v), 0.8 * SCALE, 5 * SCALE);
    }
  }
  ctx.fillStyle = '#e8e4d8';
  for (const sx of STREETS) {
    for (const sz of STREETS) {
      for (let i = -2; i <= 2; i += 1) {
        ctx.fillRect(toPx(sx + i * 2 - 0.7), toPx(sz - 8.4), 1.4 * SCALE, 2.4 * SCALE);
        ctx.fillRect(toPx(sx + i * 2 - 0.7), toPx(sz + 6), 1.4 * SCALE, 2.4 * SCALE);
        ctx.fillRect(toPx(sx - 8.4), toPx(sz + i * 2 - 0.7), 2.4 * SCALE, 1.4 * SCALE);
        ctx.fillRect(toPx(sx + 6), toPx(sz + i * 2 - 0.7), 2.4 * SCALE, 1.4 * SCALE);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function billboardTexture(lines) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, '#1c4f7a');
  gradient.addColorStop(1, '#0e2c47');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(lines[0], 128, 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(lines[1], 128, 92);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Ground plane, sea, sand, mountains and billboards. */
export function buildGround(scene, layout) {
  const group = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF * 2, WORLD_HALF * 2),
    new THREE.MeshLambertMaterial({ map: groundTexture(layout) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(26, WORLD_HALF * 2),
    new THREE.MeshLambertMaterial({ color: COLORS.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(WORLD_HALF + 13, 0.05, 0);
  sand.receiveShadow = true;
  group.add(sand);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(220, WORLD_HALF * 2 + 260),
    new THREE.MeshLambertMaterial({ color: COLORS.water }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(WORLD_HALF + 136, -0.4, 0);
  group.add(water);

  const mountainMaterial = new THREE.MeshLambertMaterial({ color: 0x5d7d8f });
  const mountainSpots = [
    [-260, -120, 70, 60],
    [-275, -20, 90, 85],
    [-260, 90, 75, 65],
    [-290, 170, 100, 90],
  ];
  for (const [x, z, r, h] of mountainSpots) {
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mountainMaterial);
    mountain.position.set(x, h / 2 - 2, z);
    group.add(mountain);
  }

  const boards = [
    { pos: [-66, 22], lines: ['SOLMAR BAY', 'sun · sea · speed'] },
    { pos: [66, -66], lines: ['MARINA DR', 'harbor eats & fuel'] },
    { pos: [22, 154], lines: ['SUNSET AUTO', 'we buy any car'] },
  ];
  for (const board of boards) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 10),
      new THREE.MeshLambertMaterial({ map: billboardTexture(board.lines), side: THREE.DoubleSide }),
    );
    panel.position.set(board.pos[0], 12, board.pos[1]);
    panel.rotation.y = Math.PI / 4;
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(1, 12, 1),
      new THREE.MeshLambertMaterial({ color: 0x555555 }),
    );
    post.position.set(board.pos[0], 6, board.pos[1]);
    group.add(panel);
    group.add(post);
  }
  scene.add(group);
  return group;
}

/**
 * Street lamps along the avenues and palm trees in parks and by the beach.
 * Returns the lamp-head material so the day/night cycle can make the
 * lamps glow after dark.
 */
export function buildProps(scene, layout, rng) {
  const group = new THREE.Group();
  const lampPole = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  const lampHead = new THREE.SphereGeometry(0.45, 8, 6);
  const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  const headMaterial = new THREE.MeshLambertMaterial({ color: 0xfff6c9, emissive: 0x554d1f });
  const lampSpots = [];
  for (const s of STREETS) {
    for (const v of BLOCK_CENTERS) {
      lampSpots.push([s + 8, v]);
      lampSpots.push([v, s - 8]);
    }
  }
  const poles = new THREE.InstancedMesh(lampPole, poleMaterial, lampSpots.length);
  const heads = new THREE.InstancedMesh(lampHead, headMaterial, lampSpots.length);
  const matrix = new THREE.Matrix4();
  lampSpots.forEach(([x, z], i) => {
    matrix.makeTranslation(x, 3.5, z);
    poles.setMatrixAt(i, matrix);
    matrix.makeTranslation(x, 7.1, z);
    heads.setMatrixAt(i, matrix);
  });
  poles.castShadow = true;
  group.add(poles);
  group.add(heads);

  const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.3, 5, 6);
  const crownGeometry = new THREE.IcosahedronGeometry(2.4, 0);
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
  const palmSpots = [];
  for (const park of layout.parks) {
    for (let i = 0; i < 5; i += 1) {
      palmSpots.push([park.x + rng.range(-12, 12), park.z + rng.range(-12, 12)]);
    }
  }
  for (let z = -180; z <= 180; z += 22) {
    palmSpots.push([WORLD_HALF + 6 + rng.range(-2, 2), z + rng.range(-4, 4)]);
  }
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, palmSpots.length);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, palmSpots.length);
  palmSpots.forEach(([x, z], i) => {
    matrix.makeTranslation(x, 2.5, z);
    trunks.setMatrixAt(i, matrix);
    matrix.makeTranslation(x, 6, z);
    crowns.setMatrixAt(i, matrix);
  });
  trunks.castShadow = true;
  crowns.castShadow = true;
  group.add(trunks);
  group.add(crowns);
  scene.add(group);
  return { group, lampHeadMaterial: headMaterial };
}

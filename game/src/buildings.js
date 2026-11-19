// Building meshes: boxes with procedurally painted window facades, tinted
// per building, with darker roofs, rooftop plant, water towers and neon
// signs on some downtown towers. Facades are canvas textures generated at
// load, so the game ships no image files — and at night the same canvases
// are repainted with lit windows, so the city glows after dark.
import * as THREE from 'three';
import { COLORS } from './config.js';

const NEON_WORDS = ['HOTEL', 'BAR', '24H', 'CAFE', 'CLUB', 'MOTEL'];

function paintFacade(ctx, variant, lit) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 128);
  const cols = variant === 0 ? 4 : variant === 1 ? 3 : variant === 2 ? 5 : 6;
  const rows = variant === 0 ? 10 : variant === 1 ? 8 : variant === 2 ? 12 : 14;
  const cw = 64 / cols;
  const rh = 128 / rows;
  for (let x = 0; x < cols; x += 1) {
    for (let y = 0; y < rows; y += 1) {
      // A fixed pseudo-random pick per window so day and night agree on
      // which windows are lit: (x*7 + y*13) % 5 decides.
      const litWindow = lit && (x * 7 + y * 13) % 5 < 2;
      ctx.fillStyle = litWindow ? '#ffd97a' : (x + y) % 5 === 0 ? '#5a6b80' : '#20242c';
      ctx.fillRect(x * cw + 2, y * rh + 3, cw - 4, rh - 6);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, 64, 4);
}

function facadeTexture(variant) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  paintFacade(ctx, variant, false);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, ctx, variant };
}

function neonTexture(word, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(0, 0, 128, 32);
  ctx.fillStyle = color;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(word, 64, 24);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Raise the building meshes for a layout into the scene. */
export function buildCityMeshes(scene, layout) {
  const group = new THREE.Group();
  const facades = [facadeTexture(0), facadeTexture(1), facadeTexture(2), facadeTexture(3)];
  const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x55504a });
  const plantMaterial = new THREE.MeshLambertMaterial({ color: 0x8a8f94 });
  const towerMaterial = new THREE.MeshLambertMaterial({ color: 0x6b4f35 });
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  boxGeometry.translate(0, 0.5, 0);
  const neonMats = [];
  let neonWord = 0;
  for (const b of layout.buildings) {
    const facade = facades[b.tex];
    const side = new THREE.MeshLambertMaterial({ map: facade.texture, color: b.tint });
    const mesh = new THREE.Mesh(boxGeometry, [side, side, roofMaterial, roofMaterial, side, side]);
    mesh.scale.set(b.w, b.h, b.d);
    mesh.position.set(b.x, 0, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (b.roof) {
      const plant = new THREE.Mesh(boxGeometry, plantMaterial);
      plant.scale.set(3, 1.6, 2.4);
      plant.position.set(b.x + b.w * 0.2, b.h, b.z - b.d * 0.15);
      plant.castShadow = true;
      group.add(plant);
    }
    if (b.tower) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 3.2, 10), towerMaterial);
      tank.position.set(b.x - b.w * 0.25, b.h + 3.4, b.z + b.d * 0.2);
      tank.castShadow = true;
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 0.4), towerMaterial);
      legs.position.set(b.x - b.w * 0.25, b.h + 1.2, b.z + b.d * 0.2);
      group.add(tank, legs);
    }
    if (b.neon) {
      const word = NEON_WORDS[neonWord % NEON_WORDS.length];
      neonWord += 1;
      const neonColor = neonWord % 2 === 0 ? '#ff5a8a' : '#4de8ff';
      const mat = new THREE.MeshLambertMaterial({
        map: neonTexture(word, neonColor),
        emissive: 0xffffff,
        emissiveMap: neonTexture(word, neonColor),
        emissiveIntensity: 0.5,
      });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), mat);
      sign.position.set(b.x, Math.min(b.h * 0.7, 26), b.z + b.d / 2 + 0.15);
      group.add(sign);
      neonMats.push(mat);
    }
  }
  scene.add(group);
  return {
    group,
    neonMats,
    /** Repaint every facade with lit (or dark) windows for the night. */
    setWindowsLit(lit) {
      for (const facade of facades) {
        paintFacade(facade.ctx, facade.variant, lit);
        facade.texture.needsUpdate = true;
      }
    },
  };
}

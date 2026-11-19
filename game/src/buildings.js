// Building meshes: boxes with procedural canvas window facades (tinted per
// building), darker roofs, rooftop plant, and a lit night variant.
import * as THREE from 'three';

function facadeTexture(variant, night) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = night ? '#000000' : '#ffffff';
  ctx.fillRect(0, 0, 64, 128);
  const cols = variant === 0 ? 4 : variant === 1 ? 3 : 5;
  const rows = variant === 0 ? 10 : variant === 1 ? 8 : 12;
  const cw = 64 / cols;
  const rh = 128 / rows;
  for (let x = 0; x < cols; x += 1) {
    for (let y = 0; y < rows; y += 1) {
      if (night) {
        // A fixed pseudo-random scatter of lit windows per cell.
        const lit = ((x * 7 + y * 13 + variant * 5) % 9) < 3;
        ctx.fillStyle = lit ? (x + y) % 3 === 0 ? '#ffb45e' : '#ffd94d' : '#050505';
      } else {
        ctx.fillStyle = (x + y) % 5 === 0 ? '#5a6b80' : '#20242c';
      }
      ctx.fillRect(x * cw + 2, y * rh + 3, cw - 4, rh - 6);
    }
  }
  if (!night) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, 64, 4);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Raise the building meshes for a layout into the scene. Returns the group
 * and every facade material, so the day/night system can light the windows.
 */
export function buildCityMeshes(scene, layout) {
  const group = new THREE.Group();
  const facades = [facadeTexture(0), facadeTexture(1), facadeTexture(2)];
  const nightFacades = [facadeTexture(0, true), facadeTexture(1, true), facadeTexture(2, true)];
  const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x55504a });
  const plantMaterial = new THREE.MeshLambertMaterial({ color: 0x8a8f94 });
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  boxGeometry.translate(0, 0.5, 0);
  const sideMaterials = [];
  for (const b of layout.buildings) {
    const facade = facades[b.tex];
    const side = new THREE.MeshLambertMaterial({
      map: facade,
      color: b.tint,
      emissive: 0xffffff,
      emissiveMap: nightFacades[b.tex],
      emissiveIntensity: 0,
    });
    sideMaterials.push(side);
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
  }
  scene.add(group);
  return { group, sideMaterials };
}

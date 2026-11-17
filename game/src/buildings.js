// Building meshes: boxes with procedurally painted window facades, tinted
// per building, with darker roofs and rooftop plant on some. Facades are
// canvas textures generated at load, so the game ships no image files.
import * as THREE from 'three';

function facadeTexture(variant) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = '#20242c';
  const cols = variant === 0 ? 4 : variant === 1 ? 3 : 5;
  const rows = variant === 0 ? 10 : variant === 1 ? 8 : 12;
  const cw = 64 / cols;
  const rh = 128 / rows;
  for (let x = 0; x < cols; x += 1) {
    for (let y = 0; y < rows; y += 1) {
      ctx.fillStyle = (x + y) % 5 === 0 ? '#5a6b80' : '#20242c';
      ctx.fillRect(x * cw + 2, y * rh + 3, cw - 4, rh - 6);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, 64, 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Raise the building meshes for a layout into the scene. */
export function buildCityMeshes(scene, layout) {
  const group = new THREE.Group();
  const facades = [facadeTexture(0), facadeTexture(1), facadeTexture(2)];
  const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x55504a });
  const plantMaterial = new THREE.MeshLambertMaterial({ color: 0x8a8f94 });
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  boxGeometry.translate(0, 0.5, 0);
  for (const b of layout.buildings) {
    const facade = facades[b.tex];
    const side = new THREE.MeshLambertMaterial({ map: facade, color: b.tint });
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
  return group;
}

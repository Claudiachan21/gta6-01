// Particles: one THREE.Points pool for sparks, smoke puffs and pickup
// sparkles. Particles fly, fade and fall back into the pool.
import * as THREE from 'three';

const MAX = 400;

export function createEffects(scene) {
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.55,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  const parts = [];
  for (let i = 0; i < MAX; i += 1) {
    parts.push({ alive: false, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, gravity: 0 });
    positions[i * 3 + 1] = -50;
  }
  let cursor = 0;
  return {
    /** A burst of coloured sparks at `pos`. */
    burst(pos, color, count, speed) {
      const c = new THREE.Color(color);
      for (let n = 0; n < count; n += 1) {
        const p = parts[cursor];
        const i = cursor;
        cursor = (cursor + 1) % MAX;
        p.alive = true;
        p.maxLife = 0.4 + Math.random() * 0.5;
        p.life = p.maxLife;
        p.gravity = 6;
        const a = Math.random() * Math.PI * 2;
        const up = Math.random() * 0.9 + 0.3;
        p.vx = Math.cos(a) * speed;
        p.vy = up * speed;
        p.vz = Math.sin(a) * speed;
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    },
    /** A grey smoke puff (handbrake slides, crash damage). */
    smoke(pos) {
      const p = parts[cursor];
      const i = cursor;
      cursor = (cursor + 1) % MAX;
      p.alive = true;
      p.maxLife = 0.9;
      p.life = 0.9;
      p.gravity = -1.5;
      p.vx = (Math.random() - 0.5) * 1.5;
      p.vy = 1.5 + Math.random();
      p.vz = (Math.random() - 0.5) * 1.5;
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y + 0.4;
      positions[i * 3 + 2] = pos.z;
      colors[i * 3] = 0.55;
      colors[i * 3 + 1] = 0.55;
      colors[i * 3 + 2] = 0.55;
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    },
    update(dt) {
      let changed = false;
      for (let i = 0; i < MAX; i += 1) {
        const p = parts[i];
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          positions[i * 3 + 1] = -50;
          changed = true;
          continue;
        }
        p.vy -= p.gravity * dt;
        positions[i * 3] += p.vx * dt;
        positions[i * 3 + 1] += p.vy * dt;
        positions[i * 3 + 2] += p.vz * dt;
        changed = true;
      }
      if (changed) geometry.attributes.position.needsUpdate = true;
    },
  };
}

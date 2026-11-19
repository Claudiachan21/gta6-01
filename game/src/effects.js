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
    size: 0.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  const parts = Array.from({ length: MAX }, () => ({ alive: false, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, gravity: 0 }));
  for (let i = 0; i < MAX; i += 1) positions[i * 3 + 1] = -50;
  let cursor = 0;
  let colorDirty = false;

  // One particle, recycled from the pool: opts shapes its flight
  // (life, gravity, speed, spread, up-range, lift).
  function spawn(pos, color, opts) {
    const p = parts[cursor];
    const i = cursor;
    cursor = (cursor + 1) % MAX;
    p.alive = true;
    p.maxLife = opts.life[0] + Math.random() * (opts.life[1] - opts.life[0]);
    p.life = p.maxLife;
    p.gravity = opts.gravity;
    const a = Math.random() * Math.PI * 2;
    const spread = opts.spread ?? 1;
    p.vx = Math.cos(a) * opts.speed * spread;
    p.vy = (opts.up[0] + Math.random() * (opts.up[1] - opts.up[0])) * opts.speed;
    p.vz = Math.sin(a) * opts.speed * spread;
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y + (opts.lift ?? 0);
    positions[i * 3 + 2] = pos.z;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    colorDirty = true;
  }

  function flush() {
    geometry.attributes.position.needsUpdate = true;
    if (colorDirty) {
      geometry.attributes.color.needsUpdate = true;
      colorDirty = false;
    }
  }

  return {
    /** A burst of coloured sparks at `pos`. */
    burst(pos, color, count, speed) {
      const c = new THREE.Color(color);
      for (let n = 0; n < count; n += 1) {
        spawn(pos, c, { life: [0.4, 0.9], gravity: 6, speed, up: [0.3, 1.2] });
      }
      flush();
    },
    /** A grey smoke puff (handbrake slides, crash damage). */
    smoke(pos) {
      spawn(pos, new THREE.Color(0x8a8a8a), { life: [0.9, 0.9], gravity: -1.5, speed: 1.5, spread: 0.5, up: [1, 1.67], lift: 0.4 });
      flush();
    },
    /** Hot white-yellow sparks for a hard impact (metal on metal). */
    sparks(pos) {
      const yellow = new THREE.Color(0xffe066);
      const white = new THREE.Color(0xffffff);
      for (let n = 0; n < 10; n += 1) {
        spawn(pos, yellow, { life: [0.25, 0.6], gravity: 9, speed: 7, up: [0.4, 1.2], lift: 0.5 });
      }
      for (let n = 0; n < 5; n += 1) {
        spawn(pos, white, { life: [0.25, 0.6], gravity: 9, speed: 9, up: [0.4, 1.2], lift: 0.5 });
      }
      flush();
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

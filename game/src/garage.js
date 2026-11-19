// Sunset Auto: the chop shop on the south side. Drive a stolen car into
// the yard to sell it, pay a bribe to clear the heat on foot, or repaint
// a ride. Mission cars are never for sale — they belong to the job.
import * as THREE from 'three';
import { COLORS, GARAGE_POS, SALE_VALUE, TUNING } from './config.js';
import { exitCar, playerPosition } from './player.js';
import { clearWanted } from './police.js';

const ZONE = { minX: 10, maxX: 34, minZ: 150, maxZ: 168 };

function signTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#12202c';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SUNSET AUTO', 256, 50);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Build the garage (workshop, sign, painted yard) on its reserved block. */
export function createGarage(scene, layout) {
  const group = new THREE.Group();
  const [gx, gz] = [GARAGE_POS.x, GARAGE_POS.z];
  const walls = new THREE.MeshLambertMaterial({ color: 0xe8dcc0 });
  const hall = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 8), walls);
  hall.position.set(gx, 3.5, gz - 11);
  hall.castShadow = true;
  group.add(hall);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(21, 0.6, 9),
    new THREE.MeshLambertMaterial({ color: 0x1f8a7a }),
  );
  roof.position.set(gx, 7.2, gz - 11);
  group.add(roof);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(14, 5, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x14181d }),
  );
  door.position.set(gx, 2.5, gz - 6.9);
  group.add(door);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 3.4),
    new THREE.MeshBasicMaterial({ map: signTexture() }),
  );
  sign.position.set(gx, 8.6, gz - 6.8);
  group.add(sign);
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xfff6c9, emissive: 0xffedb0, emissiveIntensity: 1.2 });
  for (const ox of [-8, 8]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), lampMat);
    lamp.position.set(gx + ox, 6.4, gz - 6.6);
    group.add(lamp);
  }
  // Teal yard outline on the ground: this is where the dealing happens.
  const lineMat = new THREE.MeshBasicMaterial({ color: COLORS.courierTeal });
  const yard = [
    [24, 0.5, (ZONE.minX + ZONE.maxX) / 2, ZONE.minZ],
    [24, 0.5, (ZONE.minX + ZONE.maxX) / 2, ZONE.maxZ],
    [0.5, 18, ZONE.minX, (ZONE.minZ + ZONE.maxZ) / 2],
    [0.5, 18, ZONE.maxX, (ZONE.minZ + ZONE.maxZ) / 2],
  ];
  for (const [w, d, x, z] of yard) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), lineMat);
    line.position.set(x, 0.1, z);
    group.add(line);
  }
  scene.add(group);
  layout.colliders.push({ minX: gx - 10.4, maxX: gx + 10.4, minZ: gz - 15.4, maxZ: gz - 6.6 });
  return { group, zone: ZONE };
}

/** What Sunset Auto pays for this car (kind base + a small per-car vary). */
export function garagePrice(car) {
  return (SALE_VALUE[car.kind] ?? 90) + (car.color % 23);
}

/** Is a point inside the garage yard? */
export function inGarageZone(x, z) {
  return x >= ZONE.minX && x <= ZONE.maxX && z >= ZONE.minZ && z <= ZONE.maxZ;
}

function nextPaint(color) {
  const idx = COLORS.carPaint.indexOf(color);
  return COLORS.carPaint[(idx + 1) % COLORS.carPaint.length];
}

/**
 * Run the garage for one step: show the right prompt for the player's
 * situation (sell, bribe, repaint) and act on the G / B keys.
 */
export function updateGarage(dt, world, input) {
  const player = world.player;
  const pos = playerPosition(player);
  const hud = world.hud;
  if (!inGarageZone(pos.x, pos.z) || world.screen !== 'play') {
    hud.hidePrompt();
    return;
  }
  void dt;
  if (!player.onFoot) {
    const car = player.car;
    if (car.jobCar) {
      hud.showPrompt('Job car — deliver it, don\'t sell it.');
      return;
    }
    const price = garagePrice(car);
    hud.showPrompt(`Press G to sell this ${car.kind} for $${price} · B repaint $${TUNING.repaintCost}`);
    if (input.takePressed('KeyG')) {
      const spot = car.mesh.position.clone();
      exitCar(player, world);
      world.scene.remove(car.mesh);
      world.allCars = world.allCars.filter((c) => c !== car);
      player.cash += price;
      world.stats.carsSold += 1;
      world.stats.cashEarned += price;
      world.audio.playChaChing();
      world.effects.burst(new THREE.Vector3(spot.x, 1, spot.z), 0x7dffb0, 16, 5);
      hud.toast(`Sold the ${car.kind} for $${price}`);
      hud.hidePrompt();
    } else if (input.takePressed('KeyB')) {
      if (player.cash < TUNING.repaintCost) {
        hud.toast(`Repaint costs $${TUNING.repaintCost} — not enough cash.`);
      } else {
        player.cash -= TUNING.repaintCost;
        car.color = nextPaint(car.color);
        car.paintMaterial.color.setHex(car.color);
        world.audio.click();
        hud.toast('Fresh paint — looking sharp.');
      }
    }
    return;
  }
  if (world.police.wanted > 0) {
    hud.showPrompt(`Press G to bribe the cops ($${TUNING.bribeCost})`);
    if (input.takePressed('KeyG')) {
      if (player.cash < TUNING.bribeCost) {
        hud.toast(`A bribe costs $${TUNING.bribeCost} — not enough cash.`);
      } else {
        player.cash -= TUNING.bribeCost;
        clearWanted(world.police);
        world.audio.playChaChing();
        hud.toast('Bribe paid — the heat is off.');
        hud.hidePrompt();
      }
    }
    return;
  }
  hud.hidePrompt();
}

// Sunset Auto, the garage: drive a stolen car into the yard and press G
// to sell it to Lena for cash, or walk in on foot and press G to pay off
// the heat. The garage is the game's money loop: steal, sell, spend.
import * as THREE from 'three';
import { GARAGE } from './config.js';
import { clearWanted } from './police.js';
import { exitCar, playerPosition } from './player.js';

function signTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#12202c';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SUNSET AUTO', 256, 66);
  ctx.fillStyle = '#7dffb0';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('WE BUY ANY CAR · NO QUESTIONS', 256, 104);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Build the garage shed, its sign and the painted sell zone. */
export function createGarage(scene) {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8a949e });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  const shed = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 12), wallMat);
  shed.position.set(GARAGE.x, 3, GARAGE.z + 10);
  shed.castShadow = true;
  shed.receiveShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(19, 0.6, 13), roofMat);
  roof.position.set(GARAGE.x, 6.3, GARAGE.z + 10);
  roof.castShadow = true;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 4),
    new THREE.MeshLambertMaterial({ map: signTexture() }),
  );
  sign.position.set(GARAGE.x, 8.6, GARAGE.z + 3.8);
  const zone = new THREE.Mesh(
    new THREE.RingGeometry(GARAGE.radius - 1, GARAGE.radius, 32),
    new THREE.MeshBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  );
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(GARAGE.x, 0.12, GARAGE.z);
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(GARAGE.radius - 1, 32),
    new THREE.MeshBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.08, side: THREE.DoubleSide }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(GARAGE.x, 0.1, GARAGE.z);
  group.add(shed, roof, sign, zone, pad);
  scene.add(group);
  return {
    group,
    x: GARAGE.x,
    z: GARAGE.z,
    radius: GARAGE.radius,
    zone,
    prompt: null,
    sold: 0,
    earned: 0,
  };
}

/** Is the player inside the sell zone? */
export function inGarageZone(garage, pos) {
  return Math.hypot(pos.x - garage.x, pos.z - garage.z) < garage.radius;
}

/** The price Lena pays for a car of this kind. */
export function sellPrice(kind) {
  return GARAGE.prices[kind] ?? 60;
}

function sellCar(world) {
  const player = world.player;
  const car = player.car;
  if (!car || car.kind === 'police') return;
  if (car === world.missions.targetCar) {
    // The Comet GT belongs to Dax's job — selling it would soft-lock
    // mission 2, so Lena refuses it.
    world.audio.denied();
    world.hud.toast('Not that one — Dax needs the Comet GT for the job.');
    return;
  }
  const price = sellPrice(car.kind);
  world.scene.remove(car.mesh);
  world.allCars = world.allCars.filter((c) => c !== car);
  if (world.missions.targetCar === car) world.missions.targetCar = null;
  exitCar(player, world);
  player.mesh.position.set(world.garage.x + 4, 0, world.garage.z - 4);
  player.cash += price;
  world.garage.sold += 1;
  world.garage.earned += price;
  world.audio.chaChing();
  world.hud.toast(`Sold the ${car.kind} to Lena: +$${price}`);
  world.effects.burst(
    new THREE.Vector3(world.garage.x, 1.5, world.garage.z),
    0x7dffb0,
    16,
    5,
  );
}

function payBribe(world) {
  const player = world.player;
  if (world.police.wanted === 0 || player.cash < GARAGE.bribe) {
    world.audio.denied();
    world.hud.toast(
      world.police.wanted === 0 ? 'No heat to pay off.' : `Need $${GARAGE.bribe} to pay off the heat.`,
    );
    return;
  }
  player.cash -= GARAGE.bribe;
  clearWanted(world.police);
  world.audio.chaChing();
  world.hud.toast(`Heat paid off: -$${GARAGE.bribe}. The cops look away.`);
}

/**
 * Run the garage: set the prompt the HUD shows, and handle the G key.
 * `pressedG` is true on the frame the player presses G.
 */
export function updateGarage(world, pressedG) {
  const garage = world.garage;
  const player = world.player;
  const pos = playerPosition(player);
  garage.zone.rotation.z += 0.01;
  if (!inGarageZone(garage, pos)) {
    garage.prompt = null;
    return;
  }
  if (!player.onFoot) {
    if (player.car.kind === 'police') {
      garage.prompt = 'Lena does not buy police cruisers.';
    } else if (player.car === world.missions.targetCar) {
      garage.prompt = 'The Comet GT — deliver it for Dax, do not sell it.';
    } else {
      garage.prompt = `Press G to sell this ${player.car.kind} — $${sellPrice(player.car.kind)}`;
      if (pressedG) sellCar(world);
    }
  } else if (world.police.wanted > 0) {
    garage.prompt = `Press G to pay off the heat — $${GARAGE.bribe}`;
    if (pressedG) payBribe(world);
  } else {
    garage.prompt = 'Sunset Auto — bring a car to sell, or pay off heat here.';
  }
}

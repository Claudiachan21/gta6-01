// The circular minimap: streets, blocks, the sea, Mara's arrow, police,
// the mission marker, cash stashes and the Sunset Auto garage, drawn on a
// 2D canvas each frame.
import { GARAGE, STREETS, WORLD_HALF } from './config.js';
import { currentObjective } from './missions.js';
import { playerPosition } from './player.js';

function toMap(v, size) {
  return ((v + WORLD_HALF) / (WORLD_HALF * 2)) * size;
}

export function drawMinimap(canvas, world) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / (WORLD_HALF * 2);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#10151c';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(toMap(WORLD_HALF, size), 0, size - toMap(WORLD_HALF, size), size);
  ctx.fillStyle = '#3a4149';
  for (const s of STREETS) {
    ctx.fillRect(0, toMap(s - 6, size), size, 12 * scale);
    ctx.fillRect(toMap(s - 6, size), 0, 12 * scale, size);
  }
  ctx.fillStyle = '#565e66';
  for (const b of world.layout.buildings) {
    ctx.fillRect(toMap(b.x - b.w / 2, size), toMap(b.z - b.d / 2, size), b.w * scale, b.d * scale);
  }
  for (const stash of world.missions.stashes) {
    if (stash.taken) continue;
    ctx.fillStyle = '#7dffb0';
    ctx.beginPath();
    ctx.arc(toMap(stash.x, size), toMap(stash.z, size), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Sunset Auto: a green wrench-square so the player can always find the
  // garage that buys their stolen cars.
  ctx.fillStyle = '#7dffb0';
  ctx.fillRect(toMap(GARAGE.x, size) - 3.5, toMap(GARAGE.z, size) - 3.5, 7, 7);
  ctx.fillStyle = '#10151c';
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('$', toMap(GARAGE.x, size), toMap(GARAGE.z, size) + 3);
  const objective = currentObjective(world.missions);
  if (objective && objective.x !== null) {
    const pulse = 5 + Math.sin(world.time * 5) * 2;
    ctx.fillStyle = '#ffd94d';
    ctx.save();
    ctx.translate(toMap(objective.x, size), toMap(objective.z, size));
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
    ctx.restore();
  }
  for (const rival of world.combat.rivals) {
    if (!rival.alive) continue;
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(toMap(rival.mesh.position.x, size), toMap(rival.mesh.position.z, size), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of world.police.cops) {
    ctx.fillStyle = '#4d8dff';
    ctx.beginPath();
    ctx.arc(toMap(cop.mesh.position.x, size), toMap(cop.mesh.position.z, size), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const pos = playerPosition(world.player);
  const heading = world.player.onFoot ? world.player.heading : world.player.car.heading;
  ctx.save();
  ctx.translate(toMap(pos.x, size), toMap(pos.z, size));
  ctx.rotate(Math.PI - heading);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', size / 2, 12);
}

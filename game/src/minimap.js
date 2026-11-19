// The circular minimap: streets, blocks, the sea, Mara's arrow, police,
// the mission marker and cash stashes, drawn on a 2D canvas each frame.
import { GARAGE_POS, STREETS, WORLD_HALF } from './config.js';
import { currentObjective } from './missions.js';
import { playerPosition } from './player.js';

export function drawMinimap(canvas, world) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / (WORLD_HALF * 2);
  const px = (v) => ((v + WORLD_HALF) / (WORLD_HALF * 2)) * size;
  const dot = (x, z, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px(x), px(z), r, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#10151c';
  ctx.fillRect(0, 0, size, size);
  // The sea, east of the beach.
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(px(WORLD_HALF), 0, size - px(WORLD_HALF), size);
  // Streets, then building footprints.
  ctx.fillStyle = '#3a4149';
  for (const s of STREETS) {
    ctx.fillRect(0, px(s - 6), size, 12 * scale);
    ctx.fillRect(px(s - 6), 0, 12 * scale, size);
  }
  ctx.fillStyle = '#565e66';
  for (const b of world.layout.buildings) ctx.fillRect(px(b.x - b.w / 2), px(b.z - b.d / 2), b.w * scale, b.d * scale);
  // Cash stashes, coloured by kind.
  for (const stash of world.missions.stashes) {
    if (!stash.taken) dot(stash.x, stash.z, 3, stash.kind === 'beach' ? '#ffd94d' : stash.kind === 'cold' ? '#7dc4ff' : '#7dffb0');
  }
  // Sunset Auto: a teal G so the player can always find the chop shop.
  ctx.fillStyle = '#1f8a7a';
  ctx.fillRect(px(GARAGE_POS.x) - 5, px(GARAGE_POS.z) - 5, 10, 10);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('G', px(GARAGE_POS.x), px(GARAGE_POS.z) + 3);
  // The pulsing mission diamond.
  const objective = currentObjective(world.missions);
  if (objective && objective.x !== null) {
    const pulse = 5 + Math.sin(world.time * 5) * 2;
    ctx.fillStyle = '#ffd94d';
    ctx.save();
    ctx.translate(px(objective.x), px(objective.z));
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
    ctx.restore();
  }
  for (const rival of world.combat.rivals) if (rival.alive) dot(rival.mesh.position.x, rival.mesh.position.z, 3.5, '#ff4444');
  for (const cop of world.police.cops) dot(cop.mesh.position.x, cop.mesh.position.z, 4, '#4d8dff');
  // Mara's arrow, rotated to her heading.
  const pos = playerPosition(world.player);
  const heading = world.player.onFoot ? world.player.heading : world.player.car.heading;
  ctx.save();
  ctx.translate(px(pos.x), px(pos.z));
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
  ctx.fillText('N', size / 2, 12);
}

// Solmar Bay's layout: a street grid, city blocks, building footprints and
// collision. Everything derives from the seed, so the same seed builds the
// same city for every player and every screenshot. Three blocks are
// reserved for landmarks (stadium, harbor, marina plaza) and hold no
// buildings; nine named districts tile the map for the HUD.
import { BLOCK_CENTERS, COLORS, DISTRICTS, PITCH, ROAD_HALF, STREETS, WORLD_HALF } from './config.js';

// Blocks kept clear of buildings so landmarks can stand there. The garage
// block is reserved too: mission 2 delivers a car to Sunset Auto, and a
// random building on that spot would soft-lock the job.
export const LANDMARK_BLOCKS = {
  '-154,154': 'stadium',
  '154,-154': 'harbor',
  '154,154': 'plaza',
  '22,154': 'garage',
};

/** Is (x, z) on a road (inside any street band)? */
export function isOnRoad(x, z) {
  for (const s of STREETS) {
    if (Math.abs(x - s) <= ROAD_HALF || Math.abs(z - s) <= ROAD_HALF) return true;
  }
  return false;
}

/** Nearest street centre on one axis. */
export function nearestStreet(value) {
  let best = STREETS[0];
  for (const s of STREETS) if (Math.abs(s - value) < Math.abs(best - value)) best = s;
  return best;
}

/** The district name for a position (DOWNTOWN, HARBOR, MARINA, ...). */
export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  }
  return 'SOLMAR BAY';
}

/** Push a circle (pos, radius) out of every building collider and the world edge. */
export function collideCircle(pos, radius, layout) {
  for (const box of layout.colliders) {
    const cx = Math.max(box.minX, Math.min(pos.x, box.maxX));
    const cz = Math.max(box.minZ, Math.min(pos.z, box.maxZ));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        pos.x = box.maxX + radius;
      }
    }
  }
  pos.x = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, pos.x));
  pos.z = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, pos.z));
}

/** A random point on a road, optionally on one axis (for traffic lanes). */
export function randomRoadPoint(rng, axis) {
  const street = rng.pick(STREETS);
  const along = rng.range(-WORLD_HALF + 12, WORLD_HALF - 12);
  const lane = rng.pick([-3, 3]);
  if (axis === 'x') return { x: along, z: street + lane };
  if (axis === 'z') return { x: street + lane, z: along };
  return rng.chance(0.5) ? { x: along, z: street + lane } : { x: street + lane, z: along };
}

function buildingAt(rng, x, z, w, d, downtown) {
  const tall = downtown ? rng.range(22, 48) : rng.range(7, 20);
  return {
    x,
    z,
    w,
    d,
    h: tall,
    tex: rng.int(0, 3),
    tint: rng.pick(downtown ? COLORS.downtownTints : COLORS.buildingTints),
    roof: rng.chance(0.6),
    tower: rng.chance(0.25),
    neon: downtown && rng.chance(0.35),
  };
}

/**
 * Build the city layout: 64 blocks; downtown blocks near the centre grow
 * tall towers, some blocks become parks or parking lots, landmark blocks
 * stay clear, the rest hold one, two or four buildings each.
 */
export function createCityLayout(rng) {
  const buildings = [];
  const parks = [];
  const lots = [];
  const colliders = [];
  const landmarkBlocks = [];
  for (const bx of BLOCK_CENTERS) {
    for (const bz of BLOCK_CENTERS) {
      const landmark = LANDMARK_BLOCKS[`${bx},${bz}`];
      if (landmark) {
        landmarkBlocks.push({ x: bx, z: bz, kind: landmark });
        continue;
      }
      const downtown = Math.abs(bx) <= 66 && Math.abs(bz) <= 66;
      const roll = rng.next();
      if (roll < 0.1) {
        parks.push({ x: bx, z: bz });
        continue;
      }
      if (roll < 0.17) {
        lots.push({ x: bx, z: bz });
        continue;
      }
      const split = rng.next();
      if (split < 0.45) {
        buildings.push(buildingAt(rng, bx, bz, 26, 26, downtown));
      } else if (split < 0.75) {
        const horizontal = rng.chance(0.5);
        if (horizontal) {
          buildings.push(buildingAt(rng, bx - 8, bz, 13, 26, downtown));
          buildings.push(buildingAt(rng, bx + 8, bz, 13, 26, downtown));
        } else {
          buildings.push(buildingAt(rng, bx, bz - 8, 26, 13, downtown));
          buildings.push(buildingAt(rng, bx, bz + 8, 26, 13, downtown));
        }
      } else {
        for (const ox of [-8, 8]) {
          for (const oz of [-8, 8]) {
            buildings.push(buildingAt(rng, bx + ox, bz + oz, 13, 13, downtown));
          }
        }
      }
    }
  }
  for (const b of buildings) {
    colliders.push({
      minX: b.x - b.w / 2 - 0.4,
      maxX: b.x + b.w / 2 + 0.4,
      minZ: b.z - b.d / 2 - 0.4,
      maxZ: b.z + b.d / 2 + 0.4,
    });
  }
  return {
    streets: STREETS,
    pitch: PITCH,
    roadHalf: ROAD_HALF,
    buildings,
    parks,
    lots,
    landmarkBlocks,
    colliders,
    worldHalf: WORLD_HALF,
  };
}

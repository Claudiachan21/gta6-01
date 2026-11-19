// Deterministic seeded random numbers (mulberry32) so the city, traffic and
// screenshot scenes are the same for a given seed.
export function createRandom(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(p) {
      return next() < p;
    },
    /** Roughly normal value around 0 (mean of three uniforms, -1.5..1.5). */
    gauss() {
      return (next() + next() + next()) / 3 - 0.5;
    },
    /** A random sign, -1 or 1. */
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
    /** A shuffled copy of `list` (Fisher-Yates). */
    shuffle(list) {
      const out = [...list];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

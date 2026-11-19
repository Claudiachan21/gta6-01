// The day/night cycle: the sun travels, the sky warms into dusk and cools
// into night, lamps and neon switch on, and building windows light up. A
// full day takes DAY_LENGTH_SECONDS of play. Shots can pin the time with
// setTimeOfDay(hour).
import * as THREE from 'three';
import { COLORS, DAY_LENGTH_SECONDS, DAY_START_HOUR } from './config.js';

// Sky keyframes: [hour, sky color, fog color, sun intensity, sun color].
const KEYS = [
  [0, 0x0d1626, 0x16233a, 0.25, 0x9db8e8],
  [5, 0x0d1626, 0x16233a, 0.25, 0x9db8e8],
  [6.5, 0xff9a5c, 0xf0a878, 1.1, 0xffd9a0],
  [9, 0x8ec9ee, 0xa9d1e8, 2.6, 0xfff1d6],
  [16, 0x8ec9ee, 0xa9d1e8, 2.6, 0xfff1d6],
  [18, 0xff8a4d, 0xe8966a, 1.4, 0xffb36b],
  [19.5, 0x2a2440, 0x2c2a4a, 0.4, 0x9db8e8],
  [21, 0x0d1626, 0x16233a, 0.25, 0x9db8e8],
  [24, 0x0d1626, 0x16233a, 0.25, 0x9db8e8],
];

const skyColor = new THREE.Color();
const fogColor = new THREE.Color();
const sunColor = new THREE.Color();

function sample(hour) {
  let a = KEYS[0];
  let b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i += 1) {
    if (hour >= KEYS[i][0] && hour <= KEYS[i + 1][0]) {
      a = KEYS[i];
      b = KEYS[i + 1];
      break;
    }
  }
  const t = b[0] === a[0] ? 0 : (hour - a[0]) / (b[0] - a[0]);
  skyColor.setHex(a[1]).lerp(new THREE.Color(b[1]), t);
  fogColor.setHex(a[2]).lerp(new THREE.Color(b[2]), t);
  sunColor.setHex(a[4]).lerp(new THREE.Color(b[4]), t);
  return { sky: skyColor, fog: fogColor, intensity: a[3] + (b[3] - a[3]) * t, sun: sunColor };
}

/**
 * Create the cycle. `lights` carries the sun, the hemisphere light and the
 * night-glow materials the cycle drives (lamp heads, neon, lit windows).
 */
export function createDayNight(scene, lights) {
  const state = {
    hour: DAY_START_HOUR,
    isNight: false,
    scene,
    sun: lights.sun,
    hemi: lights.hemi,
    lampHeads: lights.lampHeads || null,
    neonMats: lights.neonMats || [],
    setWindowsLit: lights.setWindowsLit || null,
    lighthouseBeam: lights.lighthouseBeam || null,
  };
  applyTime(state);
  return state;
}

/** Night is lamp time: roughly 19:30 to 05:30. */
function nightNow(hour) {
  return hour >= 19.5 || hour < 5.5;
}

function applyTime(state) {
  const sampleNow = sample(state.hour);
  state.scene.background.copy(sampleNow.sky);
  if (state.scene.fog) state.scene.fog.color.copy(sampleNow.fog);
  // The sun arcs from east (06:00) to west (18:00); at night it parks low
  // as moonlight so shadows keep a direction.
  const dayAngle = ((state.hour - 6) / 12) * Math.PI;
  const elevation = Math.sin(dayAngle);
  const sunX = Math.cos(dayAngle) * 200;
  const sunY = Math.max(30, elevation * 220);
  state.sun.position.set(sunX, sunY, 80);
  state.sun.intensity = sampleNow.intensity;
  state.sun.color.copy(sampleNow.sun);
  state.hemi.intensity = state.isNight ? 0.35 : 1.15;
  const glow = state.isNight ? 1 : 0;
  if (state.lampHeads) state.lampHeads.emissiveIntensity = 0.4 + glow * 2.4;
  for (const mat of state.neonMats) mat.emissiveIntensity = 0.5 + glow * 2.2;
  if (state.lighthouseBeam) state.lighthouseBeam.visible = state.isNight;
}

/** Advance the clock; flips the night state (and the windows) on change. */
export function updateDayNight(dt, daynight) {
  daynight.hour = (daynight.hour + (dt / DAY_LENGTH_SECONDS) * 24) % 24;
  const night = nightNow(daynight.hour);
  if (night !== daynight.isNight) {
    daynight.isNight = night;
    if (daynight.setWindowsLit) daynight.setWindowsLit(night);
  }
  applyTime(daynight);
}

/** Pin the clock (screenshot staging); re-applies the whole look at once. */
export function setTimeOfDay(daynight, hour) {
  daynight.hour = ((hour % 24) + 24) % 24;
  daynight.isNight = nightNow(daynight.hour);
  if (daynight.setWindowsLit) daynight.setWindowsLit(daynight.isNight);
  applyTime(daynight);
}

/** "18:42" for the HUD clock. */
export function clockText(daynight) {
  const h = Math.floor(daynight.hour);
  const m = Math.floor((daynight.hour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** A short label for the time of day (title screen flavour). */
export function timeLabel(daynight) {
  const h = daynight.hour;
  if (h < 5.5) return 'night';
  if (h < 9) return 'morning';
  if (h < 16) return 'afternoon';
  if (h < 19.5) return 'golden hour';
  return 'night';
}

// The day/night cycle: one day lasts DAY_LENGTH sim-seconds (24 game-hours)
// from 10:00; golden hour, then lamps and windows light up at night.
import * as THREE from 'three';
import { DAY_LENGTH, DAY_START } from './config.js';

const SKY_DAY = new THREE.Color(0x8ec9ee);
const SKY_GOLDEN = new THREE.Color(0xff8c42);
const SKY_NIGHT = new THREE.Color(0x0e1a24);
const FOG_DAY = new THREE.Color(0xa9d1e8);
const FOG_GOLDEN = new THREE.Color(0xe8a06a);
const FOG_NIGHT = new THREE.Color(0x16222e);
const SUN_DAY = new THREE.Color(0xfff1d6);
const SUN_GOLDEN = new THREE.Color(0xffb066);
const SUN_NIGHT = new THREE.Color(0x8fb4d6);

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function ramp(x, from, to) {
  return clamp01((x - from) / (to - from));
}

/** Day part for a time of day (hours): morning, day, golden hour, night. */
export function daypartAt(tod) {
  if (tod >= 20 || tod < 6) return 'night';
  if (tod < 11) return 'morning';
  if (tod < 17) return 'day';
  return 'golden hour';
}

export function createDayNight(scene, sun, hemi, sideMaterials, lampHeadMaterial) {
  return {
    scene,
    sun,
    hemi,
    sideMaterials,
    lampHeadMaterial,
    tod: DAY_START,
    nightFactor: 0,
    goldenFactor: 0,
    daypart: daypartAt(DAY_START),
    sunDir: new THREE.Vector3(0.5, 0.8, 0.3).normalize(),
  };
}

/** Advance the clock and repaint the sky, sun, lamps and windows. */
export function updateDayNight(dt, dn) {
  dn.tod = (dn.tod + (dt * 24) / DAY_LENGTH) % 24;
  dn.daypart = daypartAt(dn.tod);
  // Night ramps in 18:30–19:30 and out 05:30–06:30; golden peaks at sunset.
  if (dn.tod >= 19.5 || dn.tod < 5.5) dn.nightFactor = 1;
  else if (dn.tod >= 18.5) dn.nightFactor = ramp(dn.tod, 18.5, 19.5);
  else if (dn.tod < 6.5) dn.nightFactor = 1 - ramp(dn.tod, 5.5, 6.5);
  else dn.nightFactor = 0;
  const sunset = 1 - Math.abs(dn.tod - 18.2) / 2.2;
  const sunrise = 1 - Math.abs(dn.tod - 6.3) / 1.8;
  dn.goldenFactor = clamp01(Math.max(sunset, sunrise)) * (1 - dn.nightFactor * 0.5);

  const sky = SKY_DAY.clone().lerp(SKY_GOLDEN, dn.goldenFactor).lerp(SKY_NIGHT, dn.nightFactor);
  const fog = FOG_DAY.clone().lerp(FOG_GOLDEN, dn.goldenFactor).lerp(FOG_NIGHT, dn.nightFactor);
  dn.scene.background.copy(sky);
  dn.scene.fog.color.copy(fog);
  const sunColor = SUN_DAY.clone().lerp(SUN_GOLDEN, dn.goldenFactor).lerp(SUN_NIGHT, dn.nightFactor);
  dn.sun.color.copy(sunColor);
  dn.sun.intensity = 2.6 - dn.nightFactor * 2.1 - dn.goldenFactor * 0.3;
  dn.hemi.intensity = 1.15 - dn.nightFactor * 0.8;

  // Sun path: rises east (+x), sets west (-x); at night a fixed moon.
  if (dn.nightFactor < 1) {
    const angle = ((dn.tod - 6) / 12) * Math.PI;
    const x = Math.cos(angle) * 200;
    const y = Math.max(12, Math.sin(angle) * 220);
    dn.sun.position.set(x, y, 80);
    dn.sunDir.set(x, y, 80).normalize();
  } else {
    dn.sun.position.set(-120, 180, -60);
    dn.sunDir.set(-120, 180, -60).normalize();
  }
  if (dn.lampHeadMaterial) dn.lampHeadMaterial.emissiveIntensity = 0.4 + dn.nightFactor * 2.4;
  for (const mat of dn.sideMaterials) mat.emissiveIntensity = dn.nightFactor;

  return dn;
}

/** "18:36" style clock text for the HUD. */
export function clockText(dn) {
  const h = Math.floor(dn.tod);
  const m = Math.floor((dn.tod - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Save / load through localStorage: cash, mission progress, player position
// and collected stashes. Storage may be unavailable; then progress lasts
// only for the visit. Version 2: five missions and twelve stashes; the
// save key changed with it, so v1 saves do not carry over.
import { SAVE_KEY, START_CASH } from './config.js';

const SAVE_VERSION = 2;

export function freshSave() {
  return {
    cash: START_CASH,
    missionIndex: 0,
    missionsDone: 0,
    stashesTaken: [],
    player: { x: 0, z: 88, heading: Math.PI },
    storyDone: false,
    version: SAVE_VERSION,
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION || typeof data.cash !== 'number') return null;
    return { ...freshSave(), ...data };
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, version: SAVE_VERSION }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear when storage is off.
  }
}

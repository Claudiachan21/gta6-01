// Save / load through localStorage: cash, mission progress, player position
// and collected stashes. Storage may be unavailable; then progress lasts
// only for the visit.
import { SAVE_KEY, START_CASH } from './config.js';

export function freshSave() {
  return {
    cash: START_CASH,
    missionIndex: 0,
    missionsDone: 0,
    stashesTaken: [],
    player: { x: 0, z: 88, heading: Math.PI },
    storyDone: false,
    version: 1,
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || typeof data.cash !== 'number') return null;
    return { ...freshSave(), ...data };
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, version: 1 }));
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

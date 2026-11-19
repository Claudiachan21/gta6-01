// Save / load through localStorage: cash, mission progress, player position,
// collected stashes and run stats. Storage may be unavailable; then progress
// lasts only for the visit. Version 2 adds the stats block; v1 saves load
// fine and are upgraded silently on the next write.
import { SAVE_KEY, SAVE_VERSION, START_CASH } from './config.js';

export function freshSave() {
  return {
    cash: START_CASH,
    missionIndex: 0,
    missionsDone: 0,
    stashesTaken: [],
    player: { x: 0, z: 88, heading: Math.PI },
    storyDone: false,
    stats: { missionsDone: 0, carsSold: 0, cashEarned: 0, playTime: 0 },
    version: SAVE_VERSION,
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || (data.version !== 1 && data.version !== SAVE_VERSION) || typeof data.cash !== 'number') return null;
    const save = { ...freshSave(), ...data };
    save.stats = { ...freshSave().stats, ...(data.stats ?? {}) };
    return save;
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

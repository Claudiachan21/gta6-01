// Solmar Bay — boot and the one loop. The world advances in fixed 1/60 s
// steps; the renderer paints every animation frame. Screens: title, play,
// paused, busted, wasted.
//
// ?seed=N fixes the city. ?shot=cover|chase|mission|combat (with &seed=N)
// stages that scene instead of running the game, paints it, and sets
// window.__shotReady for a screenshot.
import * as THREE from 'three';
import { KEYS } from './config.js';
import { createInput } from './input.js';
import { clearSave, freshSave, loadSave, writeSave } from './save.js';
import { collectSave, createWorld, respawn, updateWorld } from './world.js';
import { firePistol } from './combat.js';
import { MISSIONS } from './missions.js';
import { orbitCamera } from './camera.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const input = createInput(canvas);
let world = createWorld(seed, loadSave());
let endKind = null;

function saveGame() {
  if (world.screen === 'title') return;
  writeSave(collectSave(world));
}

function showTitle() {
  world.screen = 'title';
  world.hud.setScreen('title');
  world.hud.showSaveInfo(loadSave());
  world.audio.stopMusic();
  world.audio.setEngine(0, false);
  world.audio.setSiren(false, 0);
}

function startGame(fresh) {
  const prevAudio = world.audio;
  const saveData = fresh ? freshSave() : loadSave() || freshSave();
  if (fresh) clearSave();
  world = createWorld(seed, saveData);
  world.audio = prevAudio;
  world.screen = 'play';
  world.hud.setScreen('play');
  world.audio.ensure();
  world.audio.startMusic();
  if (!saveData.storyDone) world.nextMissionAt = world.time + 2;
  else world.hud.toast('Free roam — the city is yours.');
}

function showEnd(kind) {
  endKind = kind;
  world.screen = kind;
  world.hud.setScreen(kind);
  world.audio.setEngine(0, false);
  world.audio.setSiren(false, 0);
}

function resumeFromEnd() {
  respawn(world, endKind);
  endKind = null;
  world.screen = 'play';
  world.hud.setScreen('play');
  saveGame();
}

function runShot(name) {
  const plan = stageShot(name, world);
  if (plan.override) input.override = plan.override;
  let frame = 0;
  function tick() {
    // Two sim steps per painted frame: the scene advances at full speed
    // while software rendering keeps the frame count (and wall time) low.
    updateWorld(world, STEP, input);
    updateWorld(world, STEP, input);
    if (plan.orbit) orbitCamera(STEP, world.cameraRig, { x: 0, z: 0 }, 95, 55, 0.06, world.time);
    // Banners run on wall-clock time, so re-show the mission banner just
    // before the capture frame; otherwise it would have faded long ago.
    // (The chase shot skips it: the objective box already names the job.)
    if (frame === plan.frames - 3 && world.missions.active && !plan.noBanner) {
      const mission = MISSIONS[world.missions.index];
      world.hud.showBanner(mission.title, mission.briefing);
    }
    world.hud.update(world);
    renderer.render(world.scene, world.camera);
    frame += 1;
    if (frame < plan.frames) {
      requestAnimationFrame(tick);
      return;
    }
    if (plan.finalFire) {
      firePistol(world);
      world.hud.update(world);
      renderer.render(world.scene, world.camera);
    }
    window.__shotReady = true;
  }
  requestAnimationFrame(tick);
}

function runGame() {
  world.hud.bindMenu({
    onContinue: () => startGame(false),
    onNew: () => startGame(true),
    onResume: () => {
      if (endKind) resumeFromEnd();
      else if (world.screen === 'pause') {
        world.screen = 'play';
        world.hud.setScreen('play');
      }
    },
    onRestart: () => startGame(true),
    onQuit: () => {
      saveGame();
      showTitle();
    },
    onMute: () => {
      world.audio.setMuted(!world.audio.isMuted());
      world.hud.toast(world.audio.isMuted() ? 'Sound off' : 'Sound on');
    },
    onClick: () => world.audio.click(),
  });
  showTitle();

  let last = performance.now();
  let accumulator = 0;

  function handleKeys() {
    if (KEYS.pause.some((code) => input.wasPressed(code))) {
      if (world.screen === 'play') {
        world.screen = 'pause';
        world.hud.setScreen('pause');
        saveGame();
      } else if (world.screen === 'pause') {
        world.screen = 'play';
        world.hud.setScreen('play');
      }
    }
    if (KEYS.mute.some((code) => input.wasPressed(code))) {
      world.audio.setMuted(!world.audio.isMuted());
    }
    if (input.wasPressed('Enter') && world.screen === 'title') startGame(!loadSave());
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleKeys();
    if (world.screen === 'title' || world.screen === 'play') {
      while (accumulator >= STEP && (world.screen === 'title' || world.screen === 'play')) {
        const event = updateWorld(world, STEP, input);
        accumulator -= STEP;
        if (event === 'busted' || event === 'wasted') showEnd(event);
        else if (event === 'mission-done') saveGame();
      }
    } else {
      accumulator = 0;
    }
    if (world.screen === 'title') {
      orbitCamera(0, world.cameraRig, { x: 0, z: 0 }, 95, 55, 0.05, world.time);
    }
    world.hud.update(world);
    renderer.render(world.scene, world.camera);
    input.endFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (world.screen === 'play') {
        world.screen = 'pause';
        world.hud.setScreen('pause');
      }
      saveGame();
    }
  });
  window.addEventListener('beforeunload', saveGame);
  window.addEventListener('resize', () => {
    world.camera.aspect = window.innerWidth / window.innerHeight;
    world.camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

// Solmar Bay — boot and the one loop (fixed 1/60 s steps; screens: title,
// play, paused, busted, wasted). ?shot=cover|chase|mission|combat|garage
// stages that scene; ?tod=<hours> pins the time of day; ?seed=N fixes the city.
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
const todParam = Number(params.get('tod'));
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

function applyTod() {
  if (Number.isFinite(todParam)) world.daynight.tod = todParam;
}
applyTod();

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
  applyTod();
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

/** Photo mode: hide the HUD, let the camera drift in a slow orbit. */
function togglePhoto() {
  world.photo = !world.photo;
  world.hud.root.classList.toggle('photo', world.photo);
  if (world.photo) world.hud.toast('Photo mode — F to exit, drag to look.');
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
    // The combat shot hides the mission beacon: the firefight is the
    // subject, and the 40-unit beam would dominate the frame.
    if (plan.hideBeacon) world.missions.beacon.visible = false;
    // A fixed vista (the cover): camera over the sea, looking west at the
    // sunset skyline — lighthouse left, downtown right, water foreground.
    if (plan.vista) {
      world.camera.position.set(plan.vista.pos[0], plan.vista.pos[1], plan.vista.pos[2]);
      world.camera.lookAt(plan.vista.look[0], plan.vista.look[1], plan.vista.look[2]);
    } else if (plan.orbit) orbitCamera(STEP, world.cameraRig, { x: 0, z: 0 }, 130, 45, 0.06, world.time, 3 * Math.PI / 2);
    // Stage one fallen rival mid-shot (a real game state, posed for the
    // frame — the same as the staged roadblock cars in the chase shot).
    if (plan.fallRivalAt === frame) {
      const fallen = world.combat.rivals.find((r) => r.alive);
      if (fallen) {
        fallen.alive = false;
        fallen.health = 0;
        fallen.mesh.rotation.x = -Math.PI / 2;
        fallen.mesh.position.y = 0.3;
      }
    }
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
      // Esc leaves photo mode before it pauses — one press, one layer.
      if (world.photo) {
        togglePhoto();
        return;
      }
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
    if (KEYS.radio.some((code) => input.wasPressed(code)) && world.screen === 'play') {
      world.audio.nextTrack();
      world.hud.toast(`♪ ${world.audio.trackName()}`);
    }
    if (KEYS.photo.some((code) => input.wasPressed(code)) && world.screen === 'play') {
      togglePhoto();
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
        if (world.photo) world.cameraRig.yaw += STEP * 0.08;
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

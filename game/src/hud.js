// The HUD and the menus: stars, cash, health, speed, objective, banners,
// toasts, clock, timer, district toast, prompt, radio, stats, start/pause.
import { TUNING } from './config.js';
import { currentObjective } from './missions.js';
import { playerPosition, playerSpeed } from './player.js';
import { clockText } from './daynight.js';
import { drawMinimap } from './minimap.js';

function el(id) {
  return document.getElementById(id);
}

function formatTimer(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function createHUD() {
  const hud = {
    root: el('hud'),
    stars: el('stars'),
    cash: el('cash'),
    objectiveTitle: el('objective-title'),
    objectiveText: el('objective-text'),
    objectiveDist: el('objective-dist'),
    healthBar: el('health-bar'),
    ammo: el('ammo'),
    speed: el('speed'),
    hint: el('hint'),
    crosshair: el('crosshair'),
    banner: el('banner'),
    bannerTitle: el('banner-title'),
    bannerSub: el('banner-sub'),
    toastEl: el('toast'),
    vignette: el('vignette'),
    menu: el('menu'),
    pause: el('pause'),
    busted: el('busted'),
    wasted: el('wasted'),
    minimap: el('minimap'),
    clock: el('clock'),
    timer: el('timer'),
    district: el('district'),
    prompt: el('prompt'),
    radio: el('radio'),
    stats: el('stats'),
    bannerUntil: 0,
    toastUntil: 0,
    districtUntil: 0,
    toast(text) {
      hud.toastEl.textContent = text;
      hud.toastEl.classList.add('show');
      hud.toastUntil = performance.now() + 3200;
    },
    showBanner(title, sub) {
      hud.bannerTitle.textContent = title;
      hud.bannerSub.textContent = sub;
      hud.banner.classList.add('show');
      hud.bannerUntil = performance.now() + 4200;
    },
    /** The district toast: a big name flash when crossing into a new area. */
    showDistrict(name) {
      hud.district.textContent = name;
      hud.district.classList.add('show');
      hud.districtUntil = performance.now() + 2600;
    },
    /** The contextual prompt line (garage sell / bribe / repaint). */
    showPrompt(text) {
      if (hud.prompt.textContent !== text) hud.prompt.textContent = text;
      hud.prompt.classList.add('show');
    },
    hidePrompt() {
      hud.prompt.classList.remove('show');
    },
    /** Switch the visible screen: title, play, pause, busted, wasted. */
    setScreen(name) {
      hud.menu.classList.toggle('hidden', name !== 'title');
      hud.pause.classList.toggle('hidden', name !== 'pause');
      hud.busted.classList.toggle('hidden', name !== 'busted');
      hud.wasted.classList.toggle('hidden', name !== 'wasted');
      hud.root.classList.toggle('hidden', name === 'title');
    },
    showSaveInfo(save) {
      const info = el('save-info');
      const btn = el('btn-continue');
      if (save) {
        btn.classList.remove('hidden');
        info.textContent = `Saved game — $${save.cash} · ${save.storyDone ? 'story complete' : `mission ${save.missionIndex + 1} of 6`} · ${save.stashesTaken.length}/12 stashes`;
      } else {
        btn.classList.add('hidden');
        info.textContent = 'No saved game yet.';
      }
    },
    bindMenu(actions) {
      el('btn-continue').addEventListener('click', actions.onContinue);
      el('btn-new').addEventListener('click', actions.onNew);
      el('btn-howto').addEventListener('click', () => {
        el('howto').classList.toggle('hidden');
        actions.onClick();
      });
      el('btn-resume').addEventListener('click', actions.onResume);
      el('btn-restart').addEventListener('click', actions.onRestart);
      el('btn-quit').addEventListener('click', actions.onQuit);
      el('btn-busted').addEventListener('click', actions.onResume);
      el('btn-wasted').addEventListener('click', actions.onResume);
      el('btn-mute').addEventListener('click', actions.onMute);
    },
    /** Refresh every HUD readout from the world state. */
    update(world) {
      const now = performance.now();
      if (now > hud.bannerUntil) hud.banner.classList.remove('show');
      if (now > hud.toastUntil) hud.toastEl.classList.remove('show');
      if (now > hud.districtUntil) hud.district.classList.remove('show');
      if (world.missions.banner) {
        hud.showBanner(world.missions.banner.title, world.missions.banner.sub);
        world.missions.banner = null;
      }
      const wanted = world.police.wanted;
      let stars = '';
      for (let i = 0; i < 5; i += 1) stars += i < wanted ? '★' : '☆';
      hud.stars.textContent = stars;
      hud.stars.classList.toggle('hot', wanted > 0);
      hud.cash.textContent = `$${world.player.cash}`;
      const health = Math.max(0, Math.round(world.player.health));
      hud.healthBar.style.width = `${health}%`;
      hud.healthBar.classList.toggle('low', health < 30);
      hud.ammo.textContent = world.player.onFoot ? `AMMO ${world.combat.ammo} / ${TUNING.pistolAmmo}` : '';
      const driving = !world.player.onFoot;
      hud.speed.textContent = driving ? `${Math.round(Math.abs(world.player.car.speed) * 3.6)} km/h` : '';
      hud.crosshair.classList.toggle('show', world.player.onFoot && world.screen === 'play');
      hud.vignette.style.opacity = String(Math.min(0.65, (1 - world.player.health / TUNING.playerHealth) * 0.9));
      const objective = currentObjective(world.missions);
      if (objective) {
        hud.objectiveTitle.textContent = objective.mission.title;
        hud.objectiveText.textContent = objective.step.text;
        if (objective.x !== null) {
          const pos = playerPosition(world.player);
          hud.objectiveDist.textContent = `${Math.round(Math.hypot(pos.x - objective.x, pos.z - objective.z))} m`;
        } else {
          hud.objectiveDist.textContent = '';
        }
      } else if (world.missions.storyDone) {
        hud.objectiveTitle.textContent = 'FREE ROAM';
        hud.objectiveText.textContent = 'The city is yours — stashes, cars and trouble await.';
        hud.objectiveDist.textContent = '';
      } else {
        hud.objectiveTitle.textContent = 'FREE ROAM';
        hud.objectiveText.textContent = 'Your next job from Dax starts shortly — explore the city.';
        hud.objectiveDist.textContent = '';
      }
      // Clock pill: time of day plus the day part (golden hour, night...).
      hud.clock.textContent = `${clockText(world.daynight)} · ${world.daynight.daypart}`;
      // Mission timer: top right, red and urgent under ten seconds.
      const timer = world.missions.timer;
      if (timer !== null && world.missions.active) {
        hud.timer.textContent = formatTimer(timer);
        hud.timer.classList.add('show');
        hud.timer.classList.toggle('urgent', timer <= 10);
      } else {
        hud.timer.classList.remove('show');
      }
      hud.radio.textContent = `♪ ${world.audio.trackName()}`;
      hud.hint.textContent = driving
        ? 'W/S drive · A/D steer · SPACE handbrake · E exit · G garage · T radio · F photo · ESC pause'
        : 'WASD move · SHIFT run · mouse look · CLICK shoot · R reload · E car · G garage · T radio · F photo · ESC pause';
      // Pause-screen stats: the run so far, in one line each.
      if (!hud.pause.classList.contains('hidden')) {
        const stats = world.stats;
        const mins = Math.floor(stats.playTime / 60);
        hud.stats.innerHTML = `Missions done <b>${stats.missionsDone} / 6</b> · Cars sold <b>${stats.carsSold}</b><br>Cash earned <b>$${stats.cashEarned}</b> · Time in the city <b>${mins} min</b> · Stashes <b>${world.missions.stashes.filter((s) => s.taken).length} / 12</b>`;
      }
      drawMinimap(hud.minimap, world);
    },
  };
  return hud;
}

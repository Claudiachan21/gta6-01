// The HUD and the menus: wanted stars, cash, health, speed, the day/night
// clock, the mission timer, the objective, prompts, banners, toasts, the
// district toast, the start screen, pause, busted and wasted.
import { TUNING } from './config.js';
import { clockText, timeLabel } from './daynight.js';
import { currentObjective } from './missions.js';
import { playerPosition, playerSpeed } from './player.js';
import { drawMinimap } from './minimap.js';

function el(id) {
  return document.getElementById(id);
}

export function createHUD() {
  const hud = {
    root: el('hud'),
    stars: el('stars'),
    cash: el('cash'),
    clock: el('clock'),
    timer: el('timer'),
    district: el('district'),
    prompt: el('prompt'),
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
    bannerUntil: 0,
    toastUntil: 0,
    districtUntil: 0,
    lastDistrict: null,
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
        info.textContent = `Saved game — $${save.cash} · ${save.storyDone ? 'story complete' : `mission ${save.missionIndex + 1} of 5`} · ${save.stashesTaken.length}/12 stashes`;
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
      if (world.daynight) {
        hud.clock.textContent = `${clockText(world.daynight)} · ${timeLabel(world.daynight)}`;
      }
      // Mission timer: counts down during timed and survive steps, red
      // under ten seconds.
      if (world.missions.active && world.missions.timerTotal > 0) {
        const t = Math.max(0, world.missions.timer);
        hud.timer.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
        hud.timer.classList.add('show');
        hud.timer.classList.toggle('urgent', t <= 10);
      } else {
        hud.timer.classList.remove('show', 'urgent');
      }
      // District toast: only when the player crosses a border, never on
      // the first frame.
      const district = world.districtNow ?? null;
      if (district) {
        if (hud.lastDistrict !== null && district !== hud.lastDistrict && world.screen === 'play') {
          hud.district.textContent = district;
          hud.district.classList.add('show');
          hud.districtUntil = performance.now() + 2400;
        }
        hud.lastDistrict = district;
      }
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
      } else if (world.missions.failed && world.nextMissionAt !== null) {
        hud.objectiveTitle.textContent = 'MISSION FAILED';
        hud.objectiveText.textContent = 'Dax will call again shortly.';
        hud.objectiveDist.textContent = `Next job in ${Math.max(0, Math.ceil(world.nextMissionAt - world.time))}s`;
      } else {
        hud.objectiveTitle.textContent = 'FREE ROAM';
        hud.objectiveText.textContent = 'Your next job from Dax starts shortly — explore the city.';
        hud.objectiveDist.textContent = '';
      }
      // Context prompt: the garage's offer wins over the controls reminder.
      const garagePrompt = world.garage ? world.garage.prompt : null;
      if (garagePrompt) {
        hud.prompt.textContent = garagePrompt;
        hud.prompt.classList.add('show');
      } else {
        hud.prompt.classList.remove('show');
      }
      hud.hint.textContent = driving
        ? 'W/S drive · A/D steer · SPACE handbrake · E exit · G garage · ESC pause'
        : 'WASD move · SHIFT run · mouse look · CLICK shoot · E car · G garage · ESC pause';
      drawMinimap(hud.minimap, world);
    },
  };
  return hud;
}

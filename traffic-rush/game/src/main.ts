/**
 * Traffic Rush: Qyteti — pika hyrëse. Lidh modulet përmes kontratave (core/contracts.ts):
 * qyteti, makinat + fizika, trafiku + policia, misionet + progresi, UI, kontrollet dhe zëri.
 */
import type {
  FrameContext, GameApi, GameEvents, HudState, MapState, MissionDef, MissionResult, Vec2, Vehicle, VehicleInput,
} from './core/contracts';
import * as THREE from 'three';
import { Emitter } from './core/events';
import { Engine, CameraRig } from './core/engine';
import { clamp } from './core/math';
import { PLAYER_CARS } from './data/catalog';
import { PROPERTIES } from './data/properties';
import { createCity } from './world';
import { createVehicleFactory, createPhysics, VehicleEffects } from './vehicles';
import { createTraffic, createPolice, createEnforcement } from './traffic';
import { createProgression, createMissions } from './missions';
import { createUi } from './ui';
import { createInput } from './input';
import { createAudio } from './audio';

const loading = document.getElementById('loading');
function fatal(e: unknown) {
  console.error(e);
  if (loading) {
    loading.hidden = false;
    loading.textContent = 'Gabim gjatë nisjes: ' + (e instanceof Error ? e.message : String(e));
  }
}
addEventListener('error', e => { if (loading && !loading.hidden) fatal(e.error ?? e.message); });

try {
  start();
} catch (e) {
  fatal(e);
}

function start() {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui') as HTMLElement;
  const controlsRoot = document.getElementById('controls') as HTMLElement;

  const events = new Emitter<GameEvents>();
  const progression = createProgression();
  let settings = progression.profile.settings;

  const engine = new Engine(canvas, settings.quality);
  const scene = engine.scene;
  const rig = new CameraRig(engine.camera);
  rig.mode = settings.camera;

  const city = createCity(20260930, settings.quality);
  scene.add(city.root);

  const factory = createVehicleFactory();
  const physics = createPhysics();
  const effects = new VehicleEffects(scene, settings.quality);

  // ---------- Lojtari ----------
  let player: Vehicle = makePlayer();
  function carSignature() {
    const p = progression.profile;
    return p.selectedCar + '|' + (p.carColors[p.selectedCar] ?? '') + '|' + JSON.stringify(p.upgrades[p.selectedCar] ?? {});
  }
  let playerSig = carSignature();
  function makePlayer(): Vehicle {
    const p = progression.profile;
    const spec = PLAYER_CARS.find(c => c.id === p.selectedCar) ?? PLAYER_CARS[0];
    const v = factory.create(spec, p.carColors[spec.id] ?? spec.defaultColor, { lod: 'high' });
    const up = p.upgrades[spec.id];
    if (up) v.upgrades = { ...up };
    v.kinematic = false;
    v.object3d.userData.isPlayer = true;
    const s = city.playerSpawn;
    v.x = s.x; v.z = s.z; v.heading = s.heading; v.vx = 0; v.vz = 0; v.yawRate = 0;
    v.nitroFuel = 1;
    v.object3d.traverse(o => { if ((o as any).isMesh) { o.castShadow = true; } });
    scene.add(v.object3d);
    physics.add(v);
    return v;
  }
  function replacePlayer() {
    const { x, z, heading } = player;
    physics.remove(player);
    scene.remove(player.object3d);
    player.dispose();
    player = makePlayer();
    player.x = x; player.z = z; player.heading = heading;
    playerSig = carSignature();
  }
  function respawn() {
    const s = city.playerSpawn;
    player.x = s.x; player.z = s.z; player.heading = s.heading;
    player.vx = 0; player.vz = 0; player.yawRate = 0; player.damage = 0; player.nitroFuel = 1;
    traffic.clearAround(s.x, s.z, 40);
    rig.reset();
  }

  // ---------- Sistemet ----------
  const traffic = createTraffic({ city, factory, physics, events, scene });
  traffic.density = settings.trafficDensity;
  const police = createPolice({ city, factory, physics, events, scene, traffic });
  const enforcement = createEnforcement({ city, events, scene, police });
  const missions = createMissions({ city, progression, events, police, traffic, getPlayer: () => player });
  const audio = createAudio();
  const input = createInput(controlsRoot, {
    getCity: () => city,
    getPlayer: () => player,
    vibrate: ms => { if (settings.vibration && navigator.vibrate) navigator.vibrate(ms); },
  });
  input.scheme = settings.controls;
  audio.setMuted(!settings.sound);
  audio.setMusic(settings.music);

  let paused = false;
  let waypoint: Vec2 | null = null;
  let lastLevel = progression.profile.level;
  let nearStreak = 0, nearStreakT = 0;
  let districtId = city.districtAt(player.x, player.z).id;

  // ---------- Ngjarjet ----------
  events.on('nearMiss', e => { nearStreak = e.streak; nearStreakT = 4; });
  events.on('levelUp', () => audio.ui('levelup'));
  events.on('missionEnded', (r: MissionResult) => audio.ui(r.success ? 'success' : 'fail'));
  events.on('speedCamera', () => audio.ui('camera'));
  events.on('money', e => { if (e.amount > 0) audio.ui('coin'); });

  // ---------- API për UI-në ----------
  const hud: HudState = {
    speedKmh: 0, gear: 1, rpm: 0, nitro: 1, damage: 0, money: 0, level: 1, xpFrac: 0, district: '',
    timeOfDay: 0, wanted: 0, bustedProgress: 0, mission: null, speedLimitKmh: null, nearMissStreak: 0,
  };
  const policePts: Vec2[] = [];
  const api: GameApi = {
    progression,
    catalog: PLAYER_CARS,
    properties: PROPERTIES,
    vehicles: factory,
    events,
    audio,
    availableMissions: () => missions.available(),
    startMission: id => { if (missions.start(id)) rig.reset(); },
    abortMission: () => missions.abort(),
    pause: p => { paused = p; },
    isPaused: () => paused,
    respawn,
    setWaypoint: p => { waypoint = p; (missions as any).setWaypoint?.(p); },
    hud: () => hud,
    map: (): MapState => ({
      city,
      player: { x: player.x, z: player.z, heading: player.heading },
      markers: missions.markers,
      route: missions.route,
      police: policePts,
    }),
  };
  const ui = createUi();
  ui.mount(uiRoot, api);
  const uiX = ui as any;

  // Leja për anim (tilt) në iOS kërkohet nga një prekje e përdoruesit.
  let needTiltPermission = settings.controls === 'tilt';
  addEventListener('pointerdown', () => {
    audio.unlock();
    if (needTiltPermission) {
      needTiltPermission = false;
      input.requestPermissions().then(ok => {
        if (!ok) { progression.updateSettings({ controls: 'wheel' }); events.emit('toast', { text: 'Anim i telefonit s\'lejohet — u kalua te timoni.', kind: 'bad' }); }
      });
    }
  }, { capture: true });

  // ---------- Cikli ----------
  const NEUTRAL: VehicleInput = { throttle: 0, brake: 0, steer: 0, handbrake: true, nitro: false, horn: false };
  const focus = new THREE.Vector3();
  let last = performance.now(), time = 0, slowTimer = 0;
  let briefingCooldown = 0, lastBriefingId = '';

  function applySettings() {
    const s = progression.profile.settings;
    if (s === settings) return;
    if (s.quality !== settings.quality) engine.setQuality(s.quality);
    if (s.controls !== settings.controls) { input.scheme = s.controls; needTiltPermission = s.controls === 'tilt'; }
    rig.mode = s.camera;
    traffic.density = s.trafficDensity;
    audio.setMuted(!s.sound);
    audio.setMusic(s.music);
    (input as any).tiltSensitivity = s.tiltSensitivity;
    settings = s;
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    const screen = ui.screen;
    const playing = screen === 'play' && !paused;
    input.setVisible(playing);

    const ctx: FrameContext = {
      time, dt, timeOfDay: engine.timeOfDay, isNight: engine.isNight,
      camera: engine.camera, scene, player, quality: engine.quality,
    };

    if (!paused) {
      focus.set(player.x, 0, player.z);
      engine.updateSky(dt, focus, true);
      const inp = playing ? input.read(ctx) : NEUTRAL;
      player.lights.head = engine.isNight;
      player.lights.brake = inp.brake > 0.1 && player.speed > 0.5;
      player.lights.reverse = player.speed < -0.3;
      player.drive(inp, dt);

      traffic.update(ctx);
      police.update(ctx);
      enforcement.update(ctx);
      const collisions = physics.step(dt, city);
      for (const c of collisions) {
        events.emit('collision', c);
        const other = c.a === player ? c.b : c.b === player ? c.a : undefined;
        if (other !== undefined) {
          const k = clamp(c.impulse / 16, 0, 1);
          if (k > 0.08) {
            audio.crash(k);
            effects.sparks(c.x, 0.6, c.z, k);
            if (settings.vibration && navigator.vibrate) navigator.vibrate(20 + k * 60);
            nearStreak = 0;
          }
          if (other && other.spec.body === 'police') police.addHeat(0.6 + k, 'Përplasje me policinë');
        }
      }
      missions.update(ctx);
      city.update(ctx);
      for (const v of physics.vehicles) v.syncVisual(dt, ctx);
      effects.update(dt, physics.vehicles);

      // Zëri i makinës dhe i sirenave.
      audio.engine(playing, player.rpm, inp.throttle, Math.abs(player.speed));
      audio.skid(playing ? player.skid : 0);
      audio.nitro(playing && inp.nitro && player.nitroFuel > 0.01);
      audio.horn(playing && inp.horn);
      let nearestCop = Infinity;
      policePts.length = 0;
      for (const u of police.units) {
        policePts.push({ x: u.x, z: u.z });
        nearestCop = Math.min(nearestCop, Math.hypot(u.x - player.x, u.z - player.z));
      }
      audio.siren(police.wanted > 0 && police.units.length > 0, nearestCop);
      audio.update(ctx);

      // Nisja e misionit: ndalo te shënuesi.
      briefingCooldown = Math.max(0, briefingCooldown - dt);
      if (playing && !missions.active && Math.abs(player.speed) < 1.5 && briefingCooldown === 0) {
        const def: MissionDef | null = (missions as any).nearbyMissionAt?.(player.x, player.z) ?? null;
        if (def && def.id !== lastBriefingId && uiX.showBriefing) {
          lastBriefingId = def.id;
          briefingCooldown = 2;
          uiX.showBriefing(def, () => api.startMission(def.id));
        }
        if (!def) lastBriefingId = '';
      }

      // Lagjet.
      const d = city.districtAt(player.x, player.z);
      if (d.id !== districtId) {
        districtId = d.id;
        events.emit(d.unlockLevel > progression.profile.level ? 'districtLocked' : 'districtEntered', { district: d });
      }

      nearStreakT -= dt;
      if (nearStreakT <= 0) nearStreak = 0;
    }

    // Kontrolle të rralla: cilësimet, makina e re, niveli.
    slowTimer -= dt;
    if (slowTimer <= 0) {
      slowTimer = 0.4;
      applySettings();
      if (carSignature() !== playerSig) replacePlayer();
      const lvl = progression.profile.level;
      if (lvl > lastLevel) { lastLevel = lvl; }
    }

    // Kamera.
    if (screen === 'play' || screen === 'pause' || screen === 'result' || screen === 'briefing') rig.follow(player, dt, city);
    else rig.showcase(player, dt);

    updateHud();
    ui.update(dt);
    engine.render();
    requestAnimationFrame(frame);
  }

  function updateHud() {
    const p = progression.profile;
    hud.speedKmh = Math.abs(player.speed) * 3.6;
    hud.gear = player.gear;
    hud.rpm = player.rpm;
    hud.nitro = player.spec.nitro ? player.nitroFuel : 0;
    hud.damage = player.damage;
    hud.money = p.money;
    hud.level = p.level;
    const a = progression.xpForLevel(p.level), b = progression.xpForLevel(p.level + 1);
    hud.xpFrac = b > a ? clamp((p.xp - a) / (b - a), 0, 1) : 0;
    const d = city.districtAt(player.x, player.z);
    hud.district = d.name;
    hud.timeOfDay = engine.timeOfDay;
    hud.wanted = police.wanted;
    hud.bustedProgress = police.bustedProgress;
    hud.mission = missions.active;
    const ne = city.nearestEdge(player.x, player.z);
    hud.speedLimitKmh = ne && ne.dist < 10 ? Math.round(ne.edge.speedLimit * 3.6 / 10) * 10 : null;
    hud.nearMissStreak = nearStreak;
  }

  requestAnimationFrame(t => {
    last = t;
    frame(t);
    if (loading) loading.hidden = true;
  });

  // Për testim nga konsola.
  (window as any).game = { engine, city, physics, traffic, police, missions, progression, ui, input, audio, get player() { return player; }, api, respawn };
  void waypoint;
}

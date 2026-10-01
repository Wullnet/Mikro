/**
 * Demo e trafikut: qytet i vërtetë + makina + fizikë + trafik/polici/radarë, lojtar i skriptuar.
 * #top (nga lart), #chase (pas lojtarit), #police (ndjekje). ?night, ?q=low|medium|high
 */
import * as THREE from 'three';
import type { FrameContext, GameEvents, Quality } from '../core/contracts';
import { Emitter } from '../core/events';
import { createCity } from '../world';
import { createVehicleFactory, createPhysics } from '../vehicles';
import { PLAYER_CARS } from '../data/catalog';
import { createTraffic, createPolice, createEnforcement, AiDriver, Traffic } from '../traffic';

const view = location.hash.slice(1) || 'chase';
const qs = new URLSearchParams(location.search);
const quality = (qs.get('q') ?? 'medium') as Quality;
const night = qs.has('night');
const canvas = document.getElementById('c') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLDivElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = night ? 0.65 : 0.9;
const scene = new THREE.Scene();
const sky = new THREE.Color(night ? 0x0d1526 : 0xbcd4ea);
scene.background = sky;
scene.fog = new THREE.Fog(sky, 160, 650);
scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x4a4238, night ? 0.3 : 1.2));
const sun = new THREE.DirectionalLight(night ? 0x99b3ff : 0xfff1dc, night ? 0.35 : 2.2);
sun.position.set(80, 140, 40);
scene.add(sun, sun.target);

const events = new Emitter<GameEvents>();
const city = createCity(20260930, quality);
scene.add(city.root);
const factory = createVehicleFactory();
const physics = createPhysics();
const traffic = createTraffic({ city, factory, physics, events, scene }) as Traffic;
const police = createPolice({ city, factory, physics, events, scene, traffic });
const enforcement = createEnforcement({ city, events, scene, police });

// lojtari i skriptuar
const player = factory.create(PLAYER_CARS[1], 0xc8202a, { lod: 'high' });
player.kinematic = false;
const sp = city.playerSpawn;
player.x = sp.x; player.z = sp.z; player.heading = sp.heading;
scene.add(player.object3d);
physics.add(player);
const ai = new AiDriver(player, city);
ai.laneOffset = 1.7;
ai.cruise = view === 'police' ? 24 : 19;
let goal = { x: sp.x, z: sp.z };
function newGoal() {
  const n = city.nodes[(Math.random() * city.nodes.length) | 0];
  goal = { x: n.x, z: n.z };
  if (Math.hypot(goal.x - player.x, goal.z - player.z) < 200) return newGoal();
  ai.replan(goal.x, goal.z);
}
newGoal();
if (view === 'police') police.startPursuit(2);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.3, 1200);
const n = { near: 0, crash: 0, cam: 0, red: 0, busted: 0, wanted: 0 };
events.on('nearMiss', () => n.near++);
events.on('speedCamera', () => n.cam++);
events.on('redLight', () => n.red++);
events.on('busted', () => n.busted++);
events.on('wanted', e => { n.wanted = e.level; });

let time = 0, last = performance.now(), logT = 0, maxMs = 0, overlaps = 0;
const ctx: FrameContext = { time: 0, dt: 0.016, timeOfDay: night ? 22 : 11, isNight: night, camera, scene, player, quality };
const target = new THREE.Vector3();

function sim(dt: number) {
  time += dt;
  ctx.time = time; ctx.dt = dt;
  if (Math.hypot(goal.x - player.x, goal.z - player.z) < 30) newGoal();
  const inp = ai.update(dt, goal.x, goal.z, 0, 0, 0);
  player.lights.head = night; player.lights.brake = inp.brake > 0.1;
  player.drive(inp, dt);
  const t0 = performance.now();
  traffic.update(ctx);
  const tms = performance.now() - t0;
  maxMs = Math.max(maxMs, tms);
  police.update(ctx);
  enforcement.update(ctx);
  for (const c of physics.step(dt, city)) { events.emit('collision', c); if (c.a === player || c.b === player) n.crash++; }
  city.update(ctx);
  for (const v of physics.vehicles) v.syncVisual(dt, ctx);

  // mbivendosje mes makinave kinematike (s'duhet të ndodhë)
  const ag = traffic.agents;
  for (let i = 0; i < ag.length; i++) for (let j = i + 1; j < ag.length; j++) {
    const a = ag[i].v, b = ag[j].v;
    if (a.kinematic && b.kinematic && Math.hypot(a.x - b.x, a.z - b.z) < 1.6) overlaps++;
  }

  // kamera
  if (view === 'top') {
    camera.position.set(player.x, 90, player.z + 1);
    camera.lookAt(player.x, 0, player.z);
  } else {
    const h = player.heading;
    target.set(player.x - Math.sin(h) * 9, 4.2, player.z - Math.cos(h) * 9);
    camera.position.lerp(target, time < 0.5 ? 1 : 1 - Math.exp(-4 * dt));
    camera.lookAt(player.x + Math.sin(h) * 6, 1.2, player.z + Math.cos(h) * 6);
  }
  camera.updateMatrixWorld();
  logT -= dt;
  if (logT <= 0) {
    logT = 10;
    const s = traffic.stats;
    const line = `cars ${traffic.vehicles.length} patrol ${traffic.patrols.length} units ${police.units.length} wanted ${police.wanted} busted ${police.bustedProgress.toFixed(2)} | redStops ${s.redStops} nearMiss ${n.near} crashes ${n.crash} wrecks ${s.wrecks} overlaps ${overlaps} | upd ${s.ms.toFixed(2)}ms max ${maxMs.toFixed(1)} | radar ${n.cam} redLight ${n.red} | ${(player.speed * 3.6).toFixed(0)} km/h calls ${renderer.info.render.calls}`;
    console.log('[demo] ' + line);
    hud.textContent = line.replace(/ \| /g, '\n');
  }
}
function frame(now: number) {
  sim(Math.min(0.05, (now - last) / 1000));
  last = now;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
// para-simulim i shpejtë (?sim=sekonda)
const pre = +(qs.get('sim') ?? 0);
for (let i = 0; i < pre * 30; i++) sim(1 / 30);
requestAnimationFrame(t => { last = t; frame(t); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
(window as any).demo = { traffic, police, player, city, sim };

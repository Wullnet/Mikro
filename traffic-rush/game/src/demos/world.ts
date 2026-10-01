/**
 * Demo e qytetit: #street (kamera mbi rrugë), #aerial, #night, #top (plani), #spawn.
 * ?q=low|medium|high. Lëvizje: tërhiq me gisht/maus (rrotullim), rrota (zoom) në #aerial.
 */
import * as THREE from 'three';
import type { FrameContext, Quality } from '../core/contracts';
import { createCity, cityStats, cityLandmarks } from '../world';

const view = (location.hash.slice(1) || 'street') as 'street' | 'aerial' | 'night' | 'top' | 'spawn';
const quality = (new URLSearchParams(location.search).get('q') ?? 'medium') as Quality;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLDivElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = quality !== 'low';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const night = view === 'night';
const scene = new THREE.Scene();
const skyCol = new THREE.Color(night ? 0x0d1526 : 0xbcd4ea);
scene.background = skyCol;
scene.fog = new THREE.Fog(skyCol, 180, 700);

// Harta e mjedisit: gradient i thjeshtë qielli (për reflektimet e xhamave dhe ujit).
{
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const g = new THREE.SphereGeometry(50, 32, 16);
  const cols: number[] = [];
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 50;
    const c = night ? new THREE.Color(0x0a1020).lerp(new THREE.Color(0x1c2a44), Math.max(0, 1 - Math.abs(y) * 2))
      : y > 0 ? new THREE.Color(0xd8e6f2).lerp(new THREE.Color(0x4f86c6), Math.pow(y, 0.6)) : new THREE.Color(0xa59a88).lerp(new THREE.Color(0x5b554c), -y);
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  env.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  scene.environment = pm.fromScene(env, 0.02).texture;
  scene.environmentIntensity = night ? 0.15 : 0.8;
}

const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x4a4238, night ? 0.28 : 1.1);
const sun = new THREE.DirectionalLight(night ? 0x99b3ff : 0xfff1dc, night ? 0.35 : 2.3);
sun.castShadow = renderer.shadowMap.enabled;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(hemi, sun, sun.target);
if (night) renderer.toneMappingExposure = 0.62;

const t0 = performance.now();
const city = createCity(20260930, quality);
const buildMs = performance.now() - t0;
scene.add(city.root);
const stats = cityStats(city)!;
const lm = cityLandmarks(city);

// Kamerat.
const persp = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.3, 1400);
const ortho = new THREE.OrthographicCamera(-600, 600, 600, -600, 1, 2000);
let camera: THREE.Camera = persp;
const focus = new THREE.Vector3();
let yaw = Math.PI, pitch = 0;
const sp = city.playerSpawn;
const pos = new THREE.Vector3();
if (view === 'street' || view === 'night') { pos.set(605.4, 4.5, 656); yaw = Math.PI - 0.12; pitch = -0.07; }
else if (view === 'spawn') { pos.set(sp.x - Math.sin(sp.heading) * 7, 4.5, sp.z - Math.cos(sp.heading) * 7); yaw = sp.heading; pitch = -0.12; }
else if (view === 'aerial') { pos.set(470, 190, 830); yaw = Math.atan2(640 - 470, 560 - 830); pitch = -0.5; }
if (view === 'top') {
  const a = innerWidth / innerHeight, h = a < 1 ? 600 / a : 600;
  Object.assign(ortho, { left: -h * a, right: h * a, top: h, bottom: -h });
  ortho.position.set(600, 1000, 600); ortho.up.set(0, 0, -1); ortho.lookAt(600, 0, 600); ortho.updateProjectionMatrix();
  camera = ortho;
}
function placeCam() {
  persp.position.copy(pos);
  const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  persp.lookAt(pos.clone().add(d));
  persp.fov = persp.aspect < 1 ? 72 : 60;
  persp.updateProjectionMatrix();
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  persp.aspect = innerWidth / innerHeight;
  placeCam();
}
addEventListener('resize', resize);
resize();

// Tërheqje për rrotullim.
let drag: { x: number; y: number } | null = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', () => { drag = null; });
addEventListener('pointermove', e => {
  if (!drag) return;
  yaw -= (e.clientX - drag.x) * 0.005; pitch = Math.max(-1.4, Math.min(0.5, pitch - (e.clientY - drag.y) * 0.004));
  drag = { x: e.clientX, y: e.clientY };
});
addEventListener('keydown', e => {
  const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), s = e.shiftKey ? 20 : 5;
  if (e.key === 'w') pos.addScaledVector(f, s); if (e.key === 's') pos.addScaledVector(f, -s);
  if (e.key === 'a') pos.add(new THREE.Vector3(f.z, 0, -f.x).multiplyScalar(s)); if (e.key === 'd') pos.add(new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(s));
  if (e.key === 'q') pos.y += s; if (e.key === 'e') pos.y = Math.max(1.5, pos.y - s);
});

// Mbivendosja e planit (#top): POI dhe semaforët.
function overlay() {
  const ov = document.getElementById('ov') as HTMLCanvasElement;
  ov.width = innerWidth; ov.height = innerHeight;
  const g = ov.getContext('2d')!;
  const o = ortho;
  const toS = (x: number, z: number) => [((x - 600 - o.left) / (o.right - o.left)) * innerWidth, ((z - 600 + o.top) / (o.top - o.bottom)) * innerHeight];
  for (const d of city.districts) {
    const [a, b] = toS(d.minX, d.minZ), [c, e] = toS(d.maxX, d.maxZ);
    g.strokeStyle = '#' + d.color.toString(16).padStart(6, '0'); g.lineWidth = 2; g.strokeRect(a + 2, b + 2, c - a - 4, e - b - 4);
    g.fillStyle = g.strokeStyle; g.font = 'bold 12px sans-serif'; g.fillText(d.name, a + 6, b + 16);
  }
  for (const n of city.nodes) if (n.signalized) { const [x, y] = toS(n.x, n.z); g.fillStyle = '#ff3b30'; g.fillRect(x - 1.5, y - 1.5, 3, 3); }
  for (const p of city.pois) {
    const [x, y] = toS(p.x, p.z);
    g.fillStyle = p.kind === 'garage' ? '#ffcc00' : p.kind === 'business' ? '#00e676' : p.kind === 'landmark' ? '#ff4081' : '#40c4ff';
    g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill();
  }
  const [sx, sy] = toS(sp.x, sp.z); g.strokeStyle = '#fff'; g.beginPath(); g.arc(sx, sy, 6, 0, 7); g.stroke();
}

const ctx: FrameContext = { time: 0, dt: 0.016, timeOfDay: night ? 22 : 10, isNight: night, camera: persp, scene, player: null, quality };
let frames = 0, last = performance.now();
const kinds: Record<string, number> = {};
for (const p of city.pois) kinds[p.kind] = (kinds[p.kind] ?? 0) + 1;
function frame(now: number) {
  ctx.dt = Math.min(0.05, (now - last) / 1000); last = now; ctx.time += ctx.dt;
  if (camera === persp) placeCam();
  const fc = camera === persp ? persp : new THREE.Vector3(600, 0, 600);
  focus.copy(camera === persp ? persp.position : (fc as THREE.Vector3));
  sun.position.copy(focus).add(new THREE.Vector3(-60, 95, 45)); sun.target.position.copy(focus);
  if (camera !== persp) { persp.position.set(600, 400, 600); persp.lookAt(600, 0, 601); persp.updateMatrixWorld(); }
  city.update(ctx);
  renderer.render(scene, camera);
  frames++;
  if (frames === 4) {
    const total = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
    renderer.shadowMap.autoUpdate = false;
    renderer.render(scene, camera);
    const main = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
    renderer.shadowMap.autoUpdate = true;
    const msg = `[demo] view=${view} q=${quality} build=${buildMs.toFixed(0)}ms (inner ${stats.buildMs}ms) drawCalls=${main.calls} (with shadows ${total.calls}) tris=${main.tris} (with shadows ${total.tris}) ` +
      `obstacles=${stats.obstacles} pois=${city.pois.length} nodes=${city.nodes.length} edges=${city.edges.length} signals=${stats.signals} buildings=${stats.buildings} staticTris=${stats.staticTris} staticMeshes=${stats.staticMeshes} props=${stats.propInstances} poiKinds=${JSON.stringify(kinds)} timings=${JSON.stringify((city as any).timings)}`;
    console.log(msg);
    hud.textContent = `pamja: ${view}  cilësia: ${quality}\nndërtimi: ${buildMs.toFixed(0)} ms\ndraw calls: ${main.calls}  trek.: ${(main.tris / 1000).toFixed(0)}k\nPOI: ${city.pois.length}  nyje: ${city.nodes.length}  brinjë: ${city.edges.length}`;
    if (view === 'top') overlay();
    (window as any).city = city; (window as any).lm = lm;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

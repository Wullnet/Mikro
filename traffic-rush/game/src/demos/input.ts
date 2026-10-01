/** Demo: kontrollet (3 skemat) + zëri, me një "makinë" kuti mbi një qytet 3×3 të thjeshtë. */
import * as THREE from 'three';
import type { CityWorld, ControlScheme, District, FrameContext, RoadEdge, RoadNode, UiSound, Vehicle, VehicleInput } from '../core/contracts';
import { clamp } from '../core/math';
import { createInput } from '../input';
import { createAudio } from '../audio';

// ---------- Qyteti i vogël (3×3 nyje, rrugët e mesit me 2 korsi) ----------
const P = [30, 110, 190];
const nodes: RoadNode[] = [];
const edges: RoadEdge[] = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) nodes.push({ id: r * 3 + c, x: P[c], z: P[r], edges: [], signalized: false });
function addEdge(a: number, b: number, axis: 'x' | 'z', lanes: number) {
  const e: RoadEdge = { id: edges.length, a, b, axis, lanes, laneWidth: 3.2, sidewalk: 2, speedLimit: lanes === 2 ? 60 / 3.6 : 45 / 3.6,
    kind: lanes === 2 ? 'avenue' : 'street', length: 80 };
  edges.push(e); nodes[a].edges.push(e.id); nodes[b].edges.push(e.id);
}
for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) addEdge(r * 3 + c, r * 3 + c + 1, 'x', r === 1 ? 2 : 1);
for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) addEdge(r * 3 + c, (r + 1) * 3 + c, 'z', c === 1 ? 2 : 1);
const district: District = { id: 'qendra', name: 'Qendra', unlockLevel: 1, minX: 0, maxX: 220, minZ: 0, maxZ: 220, color: 0xff5a2e };
const root = new THREE.Group();
const city: CityWorld = {
  seed: 1, size: 220, nodes, edges, districts: [district], pois: [], root,
  playerSpawn: { x: 70, z: 110 + 1.6 * 3, heading: Math.PI / 2 },
  queryObstacles: () => 0,
  districtAt: () => district,
  nearestEdge(x, z) {
    let best: ReturnType<CityWorld['nearestEdge']> = null;
    for (const e of edges) {
      const A = nodes[e.a], B = nodes[e.b];
      const t = e.axis === 'x' ? clamp((x - A.x) / (B.x - A.x), 0, 1) : clamp((z - A.z) / (B.z - A.z), 0, 1);
      const px = A.x + (B.x - A.x) * t, pz = A.z + (B.z - A.z) * t, dist = Math.hypot(x - px, z - pz);
      if (!best || dist < best.dist) best = { edge: e, x: px, z: pz, t, dist };
    }
    return best;
  },
  signal: () => 'green',
  groundHeight: () => 0,
  update: () => {},
};

// ---------- Skena ----------
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14181f);
scene.fog = new THREE.Fog(0x14181f, 60, 190);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(0xbcd2ff, 0x202028, 1.6));
const sun = new THREE.DirectionalLight(0xfff1dd, 1.6); sun.position.set(40, 80, 20); scene.add(sun);
scene.add(root);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x1d2a24 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(110, -0.02, 110); root.add(ground);
const asphalt = new THREE.MeshStandardMaterial({ color: 0x2c3038 });
const walk = new THREE.MeshStandardMaterial({ color: 0x575d66 });
const white = new THREE.MeshBasicMaterial({ color: 0xe8e8e0 });
const yellow = new THREE.MeshBasicMaterial({ color: 0xffc933 });
const dash = new THREE.BoxGeometry(0.15, 0.02, 3);
const dashes: THREE.Matrix4[] = [];
for (const e of edges) {
  const A = nodes[e.a], B = nodes[e.b], w = e.lanes * e.laneWidth * 2;
  const cx = (A.x + B.x) / 2, cz = (A.z + B.z) / 2, along = e.axis === 'x';
  const road = new THREE.Mesh(new THREE.BoxGeometry(along ? e.length : w, 0.04, along ? w : e.length), asphalt);
  road.position.set(cx, 0, cz); root.add(road);
  for (const s of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(along ? e.length - w : e.sidewalk, 0.18, along ? e.sidewalk : e.length - w), walk);
    sw.position.set(cx + (along ? 0 : s * (w / 2 + e.sidewalk / 2)), 0.09, cz + (along ? s * (w / 2 + e.sidewalk / 2) : 0)); root.add(sw);
  }
  const line = new THREE.Mesh(new THREE.BoxGeometry(along ? e.length - 14 : 0.18, 0.03, along ? 0.18 : e.length - 14), e.lanes === 2 ? yellow : white);
  line.position.set(cx, 0.02, cz); root.add(line);
  if (e.lanes === 2) for (const s of [-1, 1]) for (let d = -32; d <= 32; d += 6) {
    const m = new THREE.Matrix4();
    if (along) m.makeRotationY(Math.PI / 2);
    m.setPosition(cx + (along ? d : s * e.laneWidth), 0.025, cz + (along ? s * e.laneWidth : d));
    dashes.push(m);
  }
}
const dm = new THREE.InstancedMesh(dash, white, dashes.length);
dashes.forEach((m, i) => dm.setMatrixAt(i, m)); root.add(dm);
for (const n of nodes) {
  const j = new THREE.Mesh(new THREE.BoxGeometry(14, 0.04, 14), asphalt); j.position.set(n.x, 0.001, n.z); root.add(j);
}
// Ndërtesa në blloqe.
const bGeo = new THREE.BoxGeometry(1, 1, 1);
const bMat = new THREE.MeshStandardMaterial({ color: 0x3a4250 });
const blocks: THREE.Matrix4[] = [];
let sd = 7;
const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
for (const bx of [70, 150]) for (const bz of [70, 150]) for (let i = 0; i < 4; i++) {
  const h = 6 + rnd() * 22, ox = (i & 1 ? 1 : -1) * 14, oz = (i & 2 ? 1 : -1) * 14;
  blocks.push(new THREE.Matrix4().compose(new THREE.Vector3(bx + ox, h / 2, bz + oz), new THREE.Quaternion(), new THREE.Vector3(22, h, 22)));
}
const bm = new THREE.InstancedMesh(bGeo, bMat, blocks.length);
blocks.forEach((m, i) => bm.setMatrixAt(i, m)); root.add(bm);

// ---------- Makina (model biçiklete) ----------
const carObj = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 4.2), new THREE.MeshStandardMaterial({ color: 0xff5a2e, roughness: 0.4 }));
body.position.y = 0.55; carObj.add(body);
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 2.1), new THREE.MeshStandardMaterial({ color: 0x1b2028 }));
cabin.position.set(0, 1.1, -0.2); carObj.add(cabin);
const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 14); wheelGeo.rotateZ(Math.PI / 2);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const front: THREE.Mesh[] = [];
for (const [x, z] of [[-0.9, 1.35], [0.9, 1.35], [-0.9, -1.35], [0.9, -1.35]]) {
  const w = new THREE.Mesh(wheelGeo, wheelMat); w.position.set(x, 0.36, z); carObj.add(w); if (z > 0) front.push(w);
}
const hl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff6d0 }));
hl.position.set(0, 0.62, 2.11); carObj.add(hl);
const blinkL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.06), new THREE.MeshBasicMaterial({ color: 0xffa000 }));
const blinkR = blinkL.clone(); blinkL.position.set(0.8, 0.62, -2.12); blinkR.position.set(-0.8, 0.62, -2.12);
carObj.add(blinkL, blinkR);
scene.add(carObj);

const spawn = city.playerSpawn;
const car = {
  spec: { id: 'demo', name: 'Demo', steer: 0.6 }, object3d: carObj,
  x: spawn.x, z: spawn.z, heading: spawn.heading, vx: 0, vz: 0, yawRate: 0, speed: 0,
  halfW: 0.9, halfL: 2.1, damage: 0, nitroFuel: 1, kinematic: false, color: 0xff5a2e,
  lights: { head: false, brake: false, reverse: false, left: false, right: false, hazard: false, siren: false },
  skid: 0, rpm: 0, gear: 1,
};
const player = car as unknown as Vehicle;
const GEARS = [0, 8, 15, 23, 31, 40, 60];
function drive(inp: VehicleInput, dt: number) {
  const L = 2.6, v = car.speed, nit = inp.nitro && car.nitroFuel > 0.01 && inp.throttle > 0.1;
  let a = 0;
  if (inp.throttle > 0) a += inp.throttle * (nit ? 10 : 5.5) * Math.max(0, 1 - v / (nit ? 50 : 40));
  if (inp.brake > 0) a += v > 0.3 ? -inp.brake * 11 : v > -6 ? -inp.brake * 3.5 : 0;
  if (inp.handbrake && Math.abs(v) > 0.1) a -= Math.sign(v) * 6;
  a -= v * 0.03 + (Math.abs(v) > 0.05 ? Math.sign(v) * 0.3 : 0);
  car.speed = v + a * dt;
  if (Math.abs(car.speed) < 0.05 && inp.throttle < 0.05 && inp.brake < 0.05) car.speed = 0;
  const ang = (inp.steer * car.spec.steer) / (1 + Math.abs(car.speed) / 35);
  car.yawRate = (-car.speed / L) * Math.tan(ang) * (inp.handbrake ? 1.4 : 1);
  car.heading += car.yawRate * dt;
  car.vx = Math.sin(car.heading) * car.speed; car.vz = Math.cos(car.heading) * car.speed;
  car.x = clamp(car.x + car.vx * dt, -40, 260); car.z = clamp(car.z + car.vz * dt, -40, 260);
  car.nitroFuel = clamp(car.nitroFuel + (nit ? -0.3 : 0.06) * dt, 0, 1);
  car.skid = clamp(inp.handbrake && Math.abs(car.speed) > 4 ? 0.85 : Math.abs(car.yawRate * car.speed) / 40 - 0.25, 0, 1);
  const s = Math.abs(car.speed);
  let g = 1; while (g < GEARS.length - 2 && s > GEARS[g]) g++;
  car.gear = g;
  car.rpm = clamp(0.12 + 0.85 * (s - GEARS[g - 1]) / (GEARS[g] - GEARS[g - 1]), 0.1, 1);
  carObj.position.set(car.x, 0, car.z); carObj.rotation.y = car.heading;
  for (const w of front) w.rotation.y = ang;
}

// ---------- Kontrollet dhe zëri ----------
const input = createInput(document.getElementById('controls')!, {
  getCity: () => city, getPlayer: () => player, vibrate: ms => navigator.vibrate?.(ms),
});
const audio = createAudio();
addEventListener('pointerdown', () => audio.unlock(), { capture: true });

const out = document.getElementById('out')!;
const bar = document.getElementById('bar')!;
function setScheme(s: ControlScheme) {
  input.scheme = s;
  for (const b of bar.querySelectorAll<HTMLButtonElement>('button[data-s]')) b.classList.toggle('on', b.dataset.s === s);
  if (s === 'tilt') input.requestPermissions().then(ok => console.log('[demo] tilt leje:', ok));
}
for (const b of bar.querySelectorAll<HTMLButtonElement>('button[data-s]')) b.onclick = () => setScheme(b.dataset.s as ControlScheme);
const qs = new URLSearchParams(location.search);
setScheme((qs.get('s') as ControlScheme) || 'wheel');

let sirenOn = false, musicOn = false, muted = false;
const snd = document.getElementById('snd')!;
function btn(label: string, fn: (b: HTMLButtonElement) => void) {
  const b = document.createElement('button'); b.textContent = label;
  b.onclick = () => { audio.unlock(); fn(b); }; snd.appendChild(b);
}
btn('Zëri', b => { muted = !muted; audio.setMuted(muted); b.classList.toggle('on', muted); b.textContent = muted ? 'Pa zë' : 'Zëri'; });
btn('Muzika', b => { musicOn = !musicOn; audio.setMusic(musicOn); b.classList.toggle('on', musicOn); });
btn('Sirena', b => { sirenOn = !sirenOn; b.classList.toggle('on', sirenOn); });
btn('Përplasje', () => audio.crash(0.35));
btn('Xham', () => audio.crash(1));
for (const s of ['click', 'coin', 'levelup', 'success', 'fail', 'checkpoint', 'camera', 'error'] as UiSound[]) btn(s, () => audio.ui(s));

// ---------- Cikli ----------
const ctx: FrameContext = { time: 0, dt: 0, timeOfDay: 21, isNight: true, camera, scene, player, quality: 'medium' };
let last = performance.now(), inp: VehicleInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false, horn: false };
const camPos = new THREE.Vector3(car.x - 9, 5, car.z), look = new THREE.Vector3();
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 70 : 55; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
const bar01 = (v: number, n = 10) => { const k = Math.round(clamp(v, 0, 1) * n); return '█'.repeat(k) + '·'.repeat(n - k); };
function frame(t: number) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  ctx.time += dt; ctx.dt = dt;
  inp = input.read(ctx);
  drive(inp, dt);
  const blink = Math.floor(ctx.time * 3) & 1;
  blinkL.visible = car.lights.left && !!blink; blinkR.visible = car.lights.right && !!blink;
  // Kamera nga pas.
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  camPos.lerp(new THREE.Vector3(car.x - fx * 10, 5.2, car.z - fz * 10), 1 - Math.exp(-4 * dt));
  camera.position.copy(camPos); look.set(car.x + fx * 6, 1, car.z + fz * 6); camera.lookAt(look);
  renderer.render(scene, camera);
  // Zëri.
  audio.engine(true, car.rpm, inp.throttle, Math.abs(car.speed));
  audio.skid(car.skid);
  audio.nitro(inp.nitro && car.nitroFuel > 0.01);
  audio.horn(inp.horn);
  audio.siren(sirenOn, 30 + 120 * (1 + Math.sin(ctx.time * 0.5)));
  audio.update(ctx);
  // Leximi.
  const la = input.lanes;
  const steerBar = (inp.steer < 0 ? bar01(-inp.steer, 5).split('').reverse().join('') : '·····') + '|' + (inp.steer > 0 ? bar01(inp.steer, 5) : '·····');
  out.textContent =
    `skema   ${input.scheme}\ngazi    ${bar01(inp.throttle)} ${inp.throttle.toFixed(2)}\nfrena   ${bar01(inp.brake)} ${inp.brake.toFixed(2)}\n` +
    `timoni  ${steerBar} ${inp.steer >= 0 ? '+' : ''}${inp.steer.toFixed(2)}\ndorezë ${inp.handbrake ? ' PO' : ' jo'}  nitro ${inp.nitro ? 'PO' : 'jo'}  bori ${inp.horn ? 'PO' : 'jo'}\n` +
    `km/h    ${(car.speed * 3.6).toFixed(0)}  marsha ${car.gear}` +
    (input.scheme === 'lanes' && la.edge ? `\nrruga   #${la.edge.id} korsia ${la.lane}  kthesa ${la.wantTurn}\nsynimi  ${(la.targetSpeed * 3.6).toFixed(0)} km/h` : '');
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
(window as any).__demo = { input, audio, car, city, setScheme, get inp() { return inp; } };
console.log('[demo] gati');

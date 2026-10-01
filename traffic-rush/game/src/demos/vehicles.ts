/**
 * Demo e makinave: #showroom | #closeup=<stil>&a=<kënd>&e=<lartësi>&night&brake&left&siren&lod=low | #test
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { BodyStyle, CityWorld, FrameContext, Obstacle, VehicleInput, VehicleSpec } from '../core/contracts';
import { PLAYER_CARS, POLICE_CAR, TRAFFIC_CARS } from '../data/catalog';
import { createPhysics, createVehicleFactory, setVehicleQuality, Car, VehicleEffects } from '../vehicles';

const hash = new URLSearchParams(location.hash.slice(1).replace(/&/g, '&'));
const mode = hash.has('test') ? 'test' : hash.has('closeup') ? 'closeup' : 'showroom';
const log = (...a: unknown[]) => console.log('[demo]', ...a);
const info = document.getElementById('info')!;

const STYLES: BodyStyle[] = ['hatch', 'sedan', 'taxi', 'police', 'coupe', 'sport', 'suv', 'pickup', 'van', 'furgon', 'bus', 'truck'];
const ALL: VehicleSpec[] = [...PLAYER_CARS, ...TRAFFIC_CARS, POLICE_CAR];
const specFor = (b: BodyStyle) => ALL.find(s => s.body === b)!;

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const night = hash.has('night');
scene.background = new THREE.Color(night ? 0x0b0f18 : 0x2b3036);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = night ? 0.12 : 0.9;
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 400);

if (mode === 'test') runTests();
else setupStudio();

function setupStudio(): void {
  setVehicleQuality((hash.get('q') as 'high' | 'medium') ?? 'high');
  const key = new THREE.DirectionalLight(0xffffff, night ? 0.15 : 2.2);
  key.position.set(8, 14, 10); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -22; sc.right = sc.top = 22; sc.far = 60;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03;
  scene.add(key, new THREE.HemisphereLight(0xdfe8ff, 0x3a3530, night ? 0.1 : 0.6));
  // dyshemeja e studios
  const fc = document.createElement('canvas'); fc.width = fc.height = 256;
  const g = fc.getContext('2d')!;
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, night ? '#2a2d33' : '#8a9097'); gr.addColorStop(1, night ? '#0b0f18' : '#2b3036');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.55, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const factory = createVehicleFactory();
  const lod = hash.get('lod') === 'low' ? 'low' : 'high';
  const cars: Car[] = [];
  let center = new THREE.Vector3(), radius = 10, elev = 0.35, ang0 = 0.6;
  if (mode === 'closeup') {
    const body = (hash.get('closeup') || 'sport') as BodyStyle;
    const spec = specFor(body);
    const car = factory.create(spec, hash.has('color') ? parseInt(hash.get('color')!, 16) : spec.defaultColor, { lod }) as Car;
    cars.push(car);
    const L = car.halfL * 2;
    radius = Math.max(6, L * 1.35) * (innerWidth < innerHeight ? 1.5 : 1);
    center.set(0, L > 7 ? 1.4 : 0.6, 0);
    ang0 = (parseFloat(hash.get('a') ?? '35') * Math.PI) / 180;
    elev = (parseFloat(hash.get('e') ?? '14') * Math.PI) / 180;
    if (hash.has('dmg')) car.damage = 0.8;
  } else {
    const cols = innerWidth > innerHeight ? 4 : 3;
    const small = STYLES.filter(s => s !== 'bus' && s !== 'truck');
    small.forEach((b, i) => {
      const spec = specFor(b);
      const car = factory.create(spec, spec.defaultColor, { lod }) as Car;
      const cx = (i % cols) - (cols - 1) / 2, cz = Math.floor(i / cols);
      car.x = cx * 3.4; car.z = cz * -6.2; car.heading = 0.55;
      cars.push(car);
    });
    const rows = Math.ceil(small.length / cols);
    ['bus', 'truck'].forEach((b, i) => {
      const spec = specFor(b as BodyStyle);
      const car = factory.create(spec, spec.defaultColor, { lod }) as Car;
      car.x = (i - 0.5) * 7; car.z = -rows * 6.2 - 4; car.heading = 0.55;
      cars.push(car);
    });
    center.set(0, 0.8, -rows * 3.4);
    radius = innerWidth > innerHeight ? 26 : 34;
    elev = 0.42;
  }
  for (const c of cars) {
    c.lights.head = night || hash.has('head'); c.lights.brake = hash.has('brake'); c.lights.left = hash.has('left');
    c.lights.siren = hash.has('siren') || (mode === 'showroom' && c.spec.body === 'police'); c.lights.reverse = hash.has('rev');
    c.object3d.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(c.object3d);
  }
  // statistikat për makinë
  for (const c of cars) {
    const only = new THREE.Scene(); only.environment = scene.environment;
    const par = c.object3d.parent!; only.add(c.object3d);
    c.syncVisual(0, ctxAt(0));
    const sc2 = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    sc2.position.set(c.x + c.halfL * 2.2, 4, c.z + c.halfL * 2.2); sc2.lookAt(c.x, 0.5, c.z);
    renderer.info.reset(); renderer.info.autoReset = false;
    renderer.render(only, sc2);
    const day = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
    par.add(c.object3d);
    renderer.info.autoReset = true;
    log(`${c.spec.body} (${lod}): ${day.calls} draw calls, ${day.tris} tris (model ${Math.round(c.model.tris)})`);
  }
  const t0 = performance.now();
  const fx = new VehicleEffects(scene, 'high');
  let last = t0;
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    const ang = ang0 + (hash.has('still') ? 0 : t * 0.12);
    camera.position.set(center.x + Math.sin(ang) * radius * Math.cos(elev), center.y + Math.sin(elev) * radius, center.z + Math.cos(ang) * radius * Math.cos(elev));
    camera.lookAt(center);
    const ctx = ctxAt(t);
    for (const c of cars) c.syncVisual(dt, ctx);
    fx.update(dt, cars);
    renderer.render(scene, camera);
    info.textContent = `${mode} · ${renderer.info.render.calls} draw calls · ${(renderer.info.render.triangles / 1000).toFixed(1)}k tris`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}

function ctxAt(t: number): FrameContext {
  return { time: t, dt: 1 / 60, timeOfDay: night ? 22 : 12, isNight: night, camera, scene, player: null, quality: 'high' };
}

// ======================================================================
// Testet e fizikës (pa kohë reale)
// ======================================================================
function runTests(): void {
  const boxes: Obstacle[] = [];
  const city = {
    queryObstacles(minX: number, minZ: number, maxX: number, maxZ: number, out: Obstacle[]) {
      let n = 0;
      for (const b of boxes) if (b.maxX >= minX && b.minX <= maxX && b.maxZ >= minZ && b.minZ <= maxZ) out[n++] = b;
      return n;
    },
    groundHeight: () => 0,
  } as unknown as CityWorld;
  const factory = createVehicleFactory();
  const inp = (o: Partial<VehicleInput> = {}): VehicleInput => ({ throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false, horn: false, ...o });
  const mk = (spec: VehicleSpec) => { const c = factory.create(spec, undefined, { lod: 'low' }) as Car; c.kinematic = false; return c; };
  const kmh = (v: number) => (v * 3.6).toFixed(1);

  // 1) Nxitimi 0–100 dhe shpejtësia maksimale (dt 1/60 dhe 1/30)
  for (const spec of [...PLAYER_CARS, POLICE_CAR, TRAFFIC_CARS[6]]) {
    const res: string[] = [];
    for (const dt of [1 / 60, 1 / 30]) {
      const c = mk(spec);
      let t = 0, t100 = -1, gears = 0, lastG = 1;
      while (t < 60) {
        c.drive(inp({ throttle: 1 }), dt); t += dt;
        if (c.gear !== lastG) { gears++; lastG = c.gear; }
        if (t100 < 0 && c.speed >= 100 / 3.6) t100 = t;
      }
      res.push(`dt=${dt < 0.02 ? '1/60' : '1/30'}: 0-100 ${t100 < 0 ? '—' : t100.toFixed(2) + 's'}, vmax@60s ${kmh(c.speed)} km/h (spec ${kmh(spec.topSpeed)}), gear ${c.gear}, rpm ${c.rpm.toFixed(2)}`);
    }
    log(`${spec.name}: ${res.join(' | ')}`);
  }
  // nitro
  {
    const c = mk(PLAYER_CARS[7]); let t = 0;
    while (t < 3) { c.drive(inp({ throttle: 1, nitro: true }), 1 / 60); t += 1 / 60; }
    log(`Shqiponja GT me nitro: 0-3s → ${kmh(c.speed)} km/h, nitroFuel ${c.nitroFuel.toFixed(2)}`);
  }
  // 2) Frenimi 100→0
  for (const spec of [PLAYER_CARS[0], PLAYER_CARS[7], PLAYER_CARS[8], TRAFFIC_CARS[6]]) {
    const c = mk(spec); c.setPose(0, 0, 0, 100 / 3.6); c.kinematic = false;
    let t = 0;
    while (c.speed > 0.05 && t < 20) { c.drive(inp({ brake: 1 }), 1 / 60); t += 1 / 60; }
    log(`Frenimi 100→0 ${spec.name}: ${c.z.toFixed(1)} m, ${t.toFixed(2)} s`);
  }
  // 3) Drift me frenën e dorës nga 60 km/h
  for (const spec of [PLAYER_CARS[0], PLAYER_CARS[7]]) {
    const c = mk(spec); c.setPose(0, 0, 0, 60 / 3.6); c.kinematic = false;
    let t = 0, maxBeta = 0, maxSkid = 0;
    while (t < 4) {
      const i = t < 0.8 ? inp({ throttle: 0.6, steer: 1, handbrake: t < 0.6 }) : t < 2.2 ? inp({ throttle: 0.7, steer: -0.6 }) : inp({ throttle: 0.4 });
      c.drive(i, 1 / 60); t += 1 / 60;
      const u = c.speed, lat = c.vx * Math.cos(c.heading) - c.vz * Math.sin(c.heading);
      maxBeta = Math.max(maxBeta, Math.abs(Math.atan2(lat, Math.abs(u) + 1e-3)));
      maxSkid = Math.max(maxSkid, c.skid);
      if (hash.has('trace') && Math.round(t * 60) % 12 === 0) log(`  t ${t.toFixed(2)} h ${(c.heading * 57.3).toFixed(0)} β ${(Math.atan2(lat, Math.abs(u)) * 57.3).toFixed(0)} u ${u.toFixed(1)} lat ${lat.toFixed(1)} yaw ${c.yawRate.toFixed(2)}`);
    }
    log(`Drift ${spec.name}: β maks ${(maxBeta * 57.3).toFixed(0)}°, skid maks ${maxSkid.toFixed(2)}, kthesa ${(c.heading * 57.3).toFixed(0)}°, shpejtësia ${kmh(c.speed)} km/h, yaw ${c.yawRate.toFixed(2)} rad/s`);
  }
  // 3b) Kthesa e qëndrueshme 80 km/h
  {
    const c = mk(PLAYER_CARS[1]); c.setPose(0, 0, 0, 80 / 3.6); c.kinematic = false;
    let t = 0; while (t < 3) { c.drive(inp({ throttle: 0.5, steer: 1 }), 1 / 60); t += 1 / 60; if (hash.has('trace') && Math.round(t * 60) % 15 === 0) log(`  turn t ${t.toFixed(2)} u ${c.speed.toFixed(1)} yaw ${c.yawRate.toFixed(2)} δ ${c.steerAngle.toFixed(2)}`); }
    log(`Kthesë 80 km/h (Vjosa, timon plot): yaw ${c.yawRate.toFixed(2)} rad/s, ay ${(c.speed * c.yawRate).toFixed(1)} m/s², skid ${c.skid.toFixed(2)}`);
  }
  // 4) Përplasja me mur
  {
    const phys = createPhysics();
    boxes.push({ minX: -5, maxX: 5, minZ: 20, maxZ: 22, height: 10, kind: 'wall' });
    const c = mk(PLAYER_CARS[0]); c.setPose(0, 0, 0.15, 20); c.kinematic = false; phys.add(c);
    let t = 0, hit = '';
    while (t < 3) {
      c.drive(inp({ throttle: 0.3 }), 1 / 60);
      const ev = phys.step(1 / 60, city);
      if (ev.length && !hit) hit = `impulse ${ev[0].impulse.toFixed(1)} m/s, b=${ev[0].b}`;
      t += 1 / 60;
    }
    log(`Muri: ${hit}; pas: v ${kmh(c.speed)} km/h, z ${c.z.toFixed(2)} (muri në 20), dëm ${c.damage.toFixed(2)}, heading ${(c.heading * 57.3).toFixed(0)}°`);
    // shpejtësi e lartë (CCD)
    const f = mk(PLAYER_CARS[8]); f.setPose(0, 0, 0, 85); f.kinematic = false; phys.remove(c); phys.add(f);
    t = 0; while (t < 1) { f.drive(inp({ throttle: 1 }), 1 / 30); phys.step(1 / 30, city); t += 1 / 30; }
    log(`Muri në 306 km/h (dt 1/30): z ${f.z.toFixed(2)} (duhet < 20), dëm ${f.damage.toFixed(2)}`);
    boxes.length = 0;
  }
  // 5) Makinë–makinë: lojtari godet autobusin kinematik dhe një sedan kinematik
  {
    const phys = createPhysics();
    const p = mk(PLAYER_CARS[3]); p.setPose(0, 0, 0, 15); p.kinematic = false;
    const bus = factory.create(TRAFFIC_CARS[6], undefined, { lod: 'low' }) as Car; bus.setPose(0, 12, 0, 0);
    const sed = factory.create(TRAFFIC_CARS[1], undefined, { lod: 'low' }) as Car; sed.setPose(30, 0, Math.PI / 2, 0);
    phys.add(p); phys.add(bus); phys.add(sed);
    let t = 0; const evs: string[] = [];
    while (t < 2) {
      p.drive(inp({ throttle: 1 }), 1 / 60);
      for (const e of phys.step(1 / 60, city)) if (evs.length < 2) evs.push(`${e.a.spec.body}↔${e.b?.spec.body} ${e.impulse.toFixed(1)} m/s`);
      t += 1 / 60;
    }
    log(`SUV→autobus: ${evs.join(', ')}; autobusi kinematic=${bus.kinematic} v=${Math.hypot(bus.vx, bus.vz).toFixed(2)} dëm ${bus.damage.toFixed(2)}; SUV v=${kmh(p.speed)} dëm ${p.damage.toFixed(2)}`);
    const a = mk(PLAYER_CARS[0]); a.setPose(0, 40, Math.PI / 2, 18); a.kinematic = false;
    sed.setPose(14, 40, 0, 0); sed.kinematic = true;
    const ph2 = createPhysics(); ph2.add(a); ph2.add(sed);
    t = 0; let ev2 = '';
    while (t < 2) { a.drive(inp({ throttle: 0.5 }), 1 / 60); for (const e of ph2.step(1 / 60, city)) if (!ev2) ev2 = `${e.impulse.toFixed(1)} m/s`; t += 1 / 60; }
    log(`Hatch→sedan anash: ${ev2}; sedan kinematic=${sed.kinematic}, v=${Math.hypot(sed.vx, sed.vz).toFixed(1)}, yaw ${sed.yawRate.toFixed(2)}, dëm ${sed.damage.toFixed(2)}; hatch dëm ${a.damage.toFixed(2)}`);
  }
  // 6) Kostoja e hapit për 40 makina
  {
    const phys = createPhysics();
    const cars: Car[] = [];
    for (let i = 0; i < 40; i++) { const c = mk(TRAFFIC_CARS[i % 5]); c.setPose((i % 8) * 6, Math.floor(i / 8) * 9, 0, 10); c.kinematic = i % 2 === 0; phys.add(c); cars.push(c); }
    const t0 = performance.now();
    for (let f = 0; f < 300; f++) { for (const c of cars) c.drive(inp({ throttle: 0.4 }), 1 / 60); phys.step(1 / 60, city); }
    log(`40 makina × 300 hapa: ${((performance.now() - t0) / 300).toFixed(3)} ms/hap (drive + step)`);
  }
  log('TESTET U KRYEN');
  info.textContent = 'Testet: shih konsolën';
}

/* Traffic Rush — versioni web (Three.js). Rregullat dhe numrat janë të njëjtë me versionin Unity
   (Assets/Scripts/GameConfig.cs, Themes.cs, Missions.cs), që të dy versionet të luhen njësoj. */
(function () {
  'use strict';

  const loading = document.getElementById('loading');
  if (typeof THREE === 'undefined') {
    loading.textContent = 'Nuk u ngarkua loja. Kontrollo internetin dhe rifresko faqen.';
    loading.style.cssText += ';font:600 1.1rem Barlow,Arial,sans-serif;padding:24px;text-align:center';
    return;
  }
  const T = THREE;
  const A = window.GameAudio || new Proxy({}, { get: () => () => {} });
  const DEG = Math.PI / 180;

  // ---------- Konfigurimi ----------
  const CFG = {
    lanes: [-2.6, 0, 2.6], roadWidth: 9, segLen: 30, segCount: 8,
    startSpeed: 18, accel: 0.35,
    trafficMin: 8, trafficMax: 14, spawnAhead: 110, despawnBehind: 15, startGap: 26, minGap: 13,
    coinsPerLine: 5, coinSpacing: 2.5,
    nearGap: 1.2, nearWindow: 0.6, nearBonus: 50,
  };
  const PLAYER_W = 1.7, PLAYER_L = 3.9;

  const CARS = [
    { name: 'Golf Dyshi', price: 0, color: 0xd92626, top: 32, handling: 10 },
    { name: 'Benz 190', price: 250, color: 0xf2f2f2, top: 36, handling: 11 },
    { name: 'Audi A4', price: 600, color: 0x2640cc, top: 40, handling: 12.5 },
    { name: 'BMW M3', price: 1200, color: 0x1a1a1a, top: 45, handling: 14, spoiler: true },
    { name: 'Porsche 911', price: 2500, color: 0xffbf0d, top: 52, handling: 16, spoiler: true },
  ];

  const THEMES = [
    { name: 'Tiranë – Durrës', code: 'SH2', unlockAt: 0, decor: 'trees',
      sky: 0x8cc7f2, ambient: 0x9ea3a6, sun: 0xfff5e0, sunI: 1.1, fog: [70, 170],
      asphalt: 0x383840, grass: 0x52993f, line: 0xf2f2e6 },
    { name: 'Llogara', code: 'SH8', unlockAt: 1500, decor: 'mountain',
      sky: 0x9ebdd1, ambient: 0x808a8f, sun: 0xffebcc, sunI: 1.0, fog: [50, 150],
      asphalt: 0x333336, grass: 0x2e6129, line: 0xf2e699 },
    { name: 'Prishtinë natën', code: 'R7', unlockAt: 3000, decor: 'city',
      sky: 0x080d1f, ambient: 0x4a5072, sun: 0x8ca6ff, sunI: 0.25, fog: [35, 140],
      asphalt: 0x212129, grass: 0x141f1a, line: 0xccccbf },
  ];

  const TRAFFIC_COLORS = [0x3380d9, 0xe6e6e6, 0x4d4d4d, 0xd9731a, 0x339959, 0x8c2680];

  // ---------- Ruajtja (localStorage mund të mungojë, p.sh. në private mode) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* s'ruhet, loja vazhdon */ } },
  };
  const Save = {
    get coins() { return store.get('tr_coins', 0); },
    set coins(v) { store.set('tr_coins', Math.max(0, v | 0)); },
    get best() { return store.get('tr_best', 0); },
    set best(v) { store.set('tr_best', v | 0); },
    get car() { return Math.min(Math.max(store.get('tr_selected', 0), 0), CARS.length - 1); },
    set car(v) { store.set('tr_selected', v); },
    isUnlocked(i) { return ((store.get('tr_unlocked', 1) | 1) & (1 << i)) !== 0; },
    unlock(i) { store.set('tr_unlocked', store.get('tr_unlocked', 1) | 1 | (1 << i)); },
    tryBuy(i) {
      if (this.isUnlocked(i)) return true;
      if (this.coins < CARS[i].price) return false;
      this.coins -= CARS[i].price;
      this.unlock(i);
      return true;
    },
    themeUnlocked(i) { return this.best >= THEMES[i].unlockAt; },
    get theme() { const i = Math.min(Math.max(store.get('tr_theme', 0), 0), THEMES.length - 1); return this.themeUnlocked(i) ? i : 0; },
    set theme(v) { store.set('tr_theme', v); },
  };

  // ---------- Misionet ditore ----------
  const MISSION_POOL = [
    { type: 'coinsRun', target: 30, reward: 100, text: 'Mblidh 30 monedha në një lojë' },
    { type: 'coinsRun', target: 60, reward: 200, text: 'Mblidh 60 monedha në një lojë' },
    { type: 'nearRun', target: 5, reward: 150, text: 'Bëj 5 near-miss në një lojë' },
    { type: 'nearToday', target: 15, reward: 150, text: 'Bëj 15 near-miss sot' },
    { type: 'distRun', target: 1000, reward: 100, text: 'Arri 1000 m' },
    { type: 'distRun', target: 2000, reward: 200, text: 'Arri 2000 m' },
    { type: 'runs', target: 3, reward: 80, text: 'Luaj 3 lojëra' },
    { type: 'runs', target: 6, reward: 150, text: 'Luaj 6 lojëra' },
    { type: 'coinsToday', target: 100, reward: 150, text: 'Mblidh 100 monedha sot' },
  ];
  const Missions = {
    date() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); },
    // Përzierje deterministe nga data; 3 misione me lloje të ndryshme.
    today() {
      const date = this.date();
      if (this._date === date) return this._list;
      let seed = date;
      const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const order = MISSION_POOL.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      const list = [];
      for (const i of order) {
        if (list.some(m => m.type === MISSION_POOL[i].type)) continue;
        list.push(MISSION_POOL[i]);
        if (list.length === 3) break;
      }
      this._date = date; this._list = list;
      const s = store.get('tr_missions', null);
      if (!s || s.date !== date) store.set('tr_missions', { date, p: [0, 0, 0], c: [false, false, false] });
      return list;
    },
    state() { this.today(); return store.get('tr_missions', { date: this.date(), p: [0, 0, 0], c: [false, false, false] }); },
    progress(i) { return Math.min(this.state().p[i], this.today()[i].target); },
    canClaim(i) { const s = this.state(); return !s.c[i] && s.p[i] >= this.today()[i].target; },
    claimable() { let n = 0; for (let i = 0; i < 3; i++) if (this.canClaim(i)) n++; return n; },
    claim(i) {
      if (!this.canClaim(i)) return false;
      const s = this.state(); s.c[i] = true; store.set('tr_missions', s);
      Save.coins += this.today()[i].reward;
      return true;
    },
    // Vlerat e lojës janë totale (idempotente); delta-t janë shtesat që nga raporti i kaluar.
    report(dist, runCoins, runNear, coinsDelta, nearDelta, newRun) {
      const list = this.today(), s = this.state();
      list.forEach((m, i) => {
        let p = s.p[i];
        if (m.type === 'coinsRun') p = Math.max(p, runCoins);
        else if (m.type === 'nearRun') p = Math.max(p, runNear);
        else if (m.type === 'distRun') p = Math.max(p, dist);
        else if (m.type === 'runs') { if (newRun) p++; }
        else if (m.type === 'coinsToday') p += coinsDelta;
        else if (m.type === 'nearToday') p += nearDelta;
        s.p[i] = p;
      });
      store.set('tr_missions', s);
    },
  };

  // ---------- Renderimi ----------
  const canvas = document.getElementById('scene');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(60, 1, 0.3, 260);
  const ambient = new T.AmbientLight(0xffffff, 1);
  const sun = new T.DirectionalLight(0xffffff, 1);
  sun.position.set(-4, 10, 6);
  scene.add(ambient, sun);

  // Gjeometritë bazë (si primitivat e Unity: kubi 1 m, cilindri 2 m i lartë, sfera 1 m).
  const BASE = {
    box: new T.BoxGeometry(1, 1, 1).toNonIndexed(),
    cyl: new T.CylinderGeometry(0.5, 0.5, 2, 14).toNonIndexed(),
    sph: new T.SphereGeometry(0.5, 12, 8).toNonIndexed(),
  };
  const matCache = new Map();
  function material(color, glow) {
    const key = (glow ? 'g' : 'm') + color;
    let m = matCache.get(key);
    if (!m) {
      m = glow ? new T.MeshBasicMaterial({ color }) : new T.MeshLambertMaterial({ color });
      matCache.set(key, m);
    }
    return m;
  }

  // Bashkon shumë kuti/cilindra me të njëjtën ngjyrë në një mesh të vetëm (pak draw call-e në telefon).
  class Batch {
    constructor() { this.parts = new Map(); }
    add(kind, color, pos, scale, rot, glow) {
      const key = (glow ? 'g' : 'm') + color;
      if (!this.parts.has(key)) this.parts.set(key, []);
      const e = rot ? new T.Euler(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG) : new T.Euler();
      const m = new T.Matrix4().compose(new T.Vector3(pos[0], pos[1], pos[2]), new T.Quaternion().setFromEuler(e), new T.Vector3(scale[0], scale[1], scale[2]));
      this.parts.get(key).push([BASE[kind], m]);
    }
    build() {
      const group = new T.Group();
      for (const [key, list] of this.parts) {
        const mesh = new T.Mesh(mergeGeometries(list), material(+key.slice(1), key[0] === 'g'));
        mesh.matrixAutoUpdate = false;
        group.add(mesh);
      }
      return group;
    }
  }
  function mergeGeometries(list) {
    let n = 0;
    for (const [g] of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    const v = new T.Vector3(), nm = new T.Matrix3();
    let o = 0;
    for (const [g, m] of list) {
      nm.getNormalMatrix(m);
      const P = g.attributes.position.array, N = g.attributes.normal.array;
      for (let i = 0; i < P.length; i += 3, o += 3) {
        v.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(m);
        pos[o] = v.x; pos[o + 1] = v.y; pos[o + 2] = v.z;
        v.set(N[i], N[i + 1], N[i + 2]).applyMatrix3(nm).normalize();
        nor[o] = v.x; nor[o + 1] = v.y; nor[o + 2] = v.z;
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    geo.computeBoundingSphere();
    return geo;
  }
  function disposeGroup(g) {
    g.traverse(o => { if (o.isMesh && o.geometry && o.userData.own !== false) o.geometry.dispose(); });
  }

  // ---------- Makinat (numrat nga CarFactory.cs; përpara = +z lokalisht) ----------
  const GLASS = 0x26334a, TIRE = 0x141414, CHASSIS = 0x1f1f21, CARGO = 0xd9d9d1;
  const HEAD = 0xfff2bf, TAIL = 0xf2140d;
  const SIZES = { sedan: [1.7, 3.9], van: [1.9, 4.8], truck: [2.1, 6.5] };
  const shadowGeo = new T.PlaneGeometry(1, 1);
  const shadowMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });

  function buildCar(color, body, spoiler) {
    const b = new Batch();
    const box = (p, s, c, glow) => b.add('box', c, p, s, null, glow);
    const wheel = (x, z) => b.add('cyl', TIRE, [x, 0.35, z], [0.7, 0.15, 0.7], [0, 0, 90]);
    const wheels = (wx, f, r) => { wheel(-wx, f); wheel(wx, f); wheel(-wx, r); wheel(wx, r); };
    const lights = (x, y, front, back, backY) => {
      const s = [0.4, 0.16, 0.06];
      box([-x, y, front], s, HEAD, true); box([x, y, front], s, HEAD, true);
      box([-x, backY, back], s, TAIL, true); box([x, backY, back], s, TAIL, true);
    };
    if (body === 'van') {
      box([0, 1.05, 0], [1.9, 1.5, 4.8], color);
      box([0, 1.45, 2.41], [1.7, 0.55, 0.04], GLASS);
      box([-0.96, 1.45, 1.3], [0.04, 0.5, 1.4], GLASS);
      box([0.96, 1.45, 1.3], [0.04, 0.5, 1.4], GLASS);
      wheels(0.95, 1.6, -1.6);
      lights(0.6, 0.7, 2.42, -2.42, 0.85);
    } else if (body === 'truck') {
      box([0, 0.45, 0], [1.6, 0.25, 6.4], CHASSIS);
      box([0, 1.15, 2.4], [1.9, 1.5, 1.8], color);
      box([0, 1.5, 3.31], [1.7, 0.6, 0.04], GLASS);
      box([0, 1.6, -0.9], [2.1, 2.2, 4.6], CARGO);
      wheels(0.95, 2.4, -1.4);
      wheel(-0.95, -2.5); wheel(0.95, -2.5);
      lights(0.65, 0.75, 3.31, -3.21, 0.7);
    } else {
      box([0, 0.55, 0], [1.8, 0.6, 4], color);
      box([0, 1.1, -0.3], [1.55, 0.5, 2], GLASS);
      wheels(0.92, 1.3, -1.3);
      lights(0.55, 0.62, 2.01, -2.01, 0.65);
      if (spoiler) {
        box([-0.55, 0.95, -1.75], [0.08, 0.3, 0.12], CHASSIS);
        box([0.55, 0.95, -1.75], [0.08, 0.3, 0.12], CHASSIS);
        box([0, 1.12, -1.8], [1.7, 0.06, 0.4], color);
      }
    }
    const model = b.build();
    model.rotation.y = Math.PI; // bota e web-it ecën drejt -z
    const root = new T.Group();
    root.add(model);
    const [w, l] = SIZES[body];
    const shadow = new T.Mesh(shadowGeo, shadowMat);
    shadow.userData.own = false;
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(w * 1.15, l * 1.05, 1);
    shadow.position.y = 0.015;
    root.add(shadow);
    root.userData.model = model;
    return root;
  }

  // ---------- Rruga ----------
  // Segmentet ndërtohen në koordinatat e Unity (z përpara) dhe pasqyrohen në -z.
  function buildSegment(theme, index) {
    const len = CFG.segLen, half = CFG.roadWidth / 2;
    const b = new Batch();
    const add = (kind, c, p, s, r, glow) => b.add(kind, c, [p[0], p[1], -p[2]], s, r ? [-r[0], -r[1], r[2]] : null, glow);
    const R = (a, c) => a + Math.random() * (c - a);

    add('box', theme.asphalt, [0, -0.05, len / 2], [CFG.roadWidth, 0.1, len]);
    add('box', theme.grass, [-half - 20, -0.1, len / 2], [40, 0.1, len]);
    add('box', theme.grass, [half + 20, -0.1, len / 2], [40, 0.1, len]);
    const edge = half - 0.25;
    add('box', theme.line, [-edge, 0.01, len / 2], [0.15, 0.02, len]);
    add('box', theme.line, [edge, 0.01, len / 2], [0.15, 0.02, len]);
    for (let l = 0; l < CFG.lanes.length - 1; l++) {
      const x = (CFG.lanes[l] + CFG.lanes[l + 1]) / 2;
      for (let z = 1.5; z < len; z += 6) add('box', theme.line, [x, 0.01, z], [0.15, 0.02, 3]);
    }

    const TRUNK = 0x66421f, LEAVES = 0x26732e, PINE = 0x144d24, ROCK = 0x736e66, ROCK_D = 0x5c5752;
    const RAIL = 0xbfc2c7, POLE = 0x404247, LAMP = 0xffd959, POOL = 0x3a362c, BUILDING = 0x1a1c26, WINDOW = 0xffcc73;
    const pine = (x, z, s) => {
      add('cyl', TRUNK, [x, 0.6 * s, z], [0.3 * s, 0.6 * s, 0.3 * s]);
      for (let k = 0; k < 3; k++) {
        const w = (2.2 - k * 0.6) * s;
        add('box', PINE, [x, (1.7 + k * 1.1) * s, z], [w, 1.2 * s, w], [0, 45 * k, 0]);
      }
    };

    if (theme.decor === 'mountain') {
      // Llogara: mur mali majtas që "gjarpëron", guardrail djathtas, pisha.
      const wave = Math.sin(index * 0.9) * 2.5;
      for (let r = 0; r < 4; r++) {
        const z = (r + R(0.1, 0.9)) * len / 4, h = R(4, 10);
        add('box', r % 2 === 0 ? ROCK : ROCK_D, [-(half + 5 + wave + R(0, 2)), h / 2 - 0.5, z], [R(4, 7), h, R(6, 9)], [0, R(-25, 25), R(-6, 6)]);
      }
      add('box', RAIL, [half + 0.6, 0.6, len / 2], [0.1, 0.3, len]);
      for (let z = 1; z < len; z += 5) add('box', POLE, [half + 0.65, 0.35, z], [0.12, 0.7, 0.12]);
      for (let t = 0; t < 4; t++) pine(t < 1 ? -(half + 2 + wave * 0.3) : R(half + 3, half + 18), R(0, len), R(0.8, 1.3));
      if (Math.random() < 0.6) add('sph', ROCK_D, [R(half + 4, half + 14), 0.3, R(0, len)], [2, 1.3, 1.8]);
    } else if (theme.decor === 'city') {
      // Prishtinë natën: shtylla me llamba dhe ndërtesa me dritare të ndezura.
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? -1 : 1, z = s === 0 ? 2 : len / 2 + 2, px = side * (half + 0.7);
        add('cyl', POLE, [px, 2.6, z], [0.18, 2.6, 0.18]);
        add('box', POLE, [px - side * 0.8, 5.15, z], [1.7, 0.1, 0.15]);
        add('sph', LAMP, [px - side * 1.55, 5, z], [0.55, 0.55, 0.55], null, true);
        add('cyl', POOL, [px - side * 2.4, 0.005, z], [3.6, 0.005, 3.6], null, true);
      }
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? -1 : 1, h = R(7, 18), x = side * R(half + 10, half + 16), z = R(6, len - 6);
        add('box', BUILDING, [x, h / 2, z], [8, h, 10]);
        const face = x - side * 4.02;
        for (let w = 0; w < 4; w++) {
          if (Math.random() < 0.35) continue;
          add('box', WINDOW, [face, R(2, h - 1.5), z + R(-3.5, 3.5)], [0.05, 1, 1.4], null, true);
        }
      }
    } else {
      for (let t = 0; t < 4; t++) {
        const side = t % 2 === 0 ? -1 : 1, x = side * R(half + 3, half + 16), z = R(0, len);
        add('cyl', TRUNK, [x, 1, z], [0.4, 1, 0.4]);
        add('sph', LEAVES, [x, 2.8, z], [2.4, 2.4, 2.4]);
      }
    }
    return b.build();
  }

  // ---------- Gjendja e lojës ----------
  const S = {
    state: 'menu', themeIndex: Save.theme, garageIndex: Save.car,
    time: 0, runCoins: 0, runCoinsTotal: 0, bonus: 0, nearMisses: 0, reportedNear: 0,
    continueUsed: false, newBest: false, unlockedTheme: null, orbit: 0,
  };
  const player = { x: 0, z: 0, lane: 1, speed: 0, driving: false, lastLane: -10, def: CARS[Save.car], mesh: new T.Group(), model: null };
  scene.add(player.mesh);
  let segments = [];
  const cars = [], coins = [];
  let laneSpeeds = [], nextRowZ = 0, lastFreeLane = 1;

  const coinGeo = new T.CylinderGeometry(0.4, 0.4, 0.16, 18);
  coinGeo.rotateX(Math.PI / 2);
  const coinMat = new T.MeshLambertMaterial({ color: 0xffcc1a, emissive: 0x4d3300 });

  const distance = () => Math.max(0, Math.floor(player.z));
  const score = () => distance() + S.bonus;

  function setPlayerCar(def) {
    player.def = def;
    if (player.model) { player.mesh.remove(player.model); disposeGroup(player.model); }
    player.model = buildCar(def.color, 'sedan', !!def.spoiler);
    player.mesh.add(player.model);
  }

  function applyTheme(i) {
    const t = THEMES[i];
    S.themeIndex = i;
    scene.background = new T.Color(t.sky);
    scene.fog = new T.Fog(t.sky, t.fog[0], t.fog[1]);
    ambient.color.setHex(t.ambient);
    ambient.intensity = 0.95;
    sun.color.setHex(t.sun);
    sun.intensity = t.sunI * 0.65;
    for (const s of segments) { scene.remove(s.group); disposeGroup(s.group); }
    segments = [];
    for (let k = 0; k < CFG.segCount; k++) {
      const group = buildSegment(t, k);
      scene.add(group);
      segments.push({ group, start: 0 });
    }
    resetRoad();
  }

  function resetRoad() {
    const z0 = player.z - CFG.segLen;
    segments.forEach((s, k) => { s.start = z0 + k * CFG.segLen; s.group.position.z = -s.start; });
  }

  function resetTraffic() {
    for (const c of cars) { c.active = false; c.mesh.visible = false; }
    for (const c of coins) { c.active = false; c.mesh.visible = false; }
    const n = CFG.lanes.length;
    laneSpeeds = CFG.lanes.map((_, i) => CFG.trafficMax + (CFG.trafficMin - CFG.trafficMax) * (i / (n - 1)));
    nextRowZ = player.z + 60;
    lastFreeLane = 1;
  }

  function spawnCar(lane, z) {
    let car = cars.find(c => !c.active);
    if (!car) {
      const r = Math.random();
      const body = r < 0.08 ? 'truck' : r < 0.22 ? 'van' : 'sedan';
      const mesh = buildCar(TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)], body, false);
      scene.add(mesh);
      car = { mesh, w: SIZES[body][0], l: SIZES[body][1] };
      cars.push(car);
    }
    Object.assign(car, { active: true, lane, x: CFG.lanes[lane], z, speed: laneSpeeds[lane], minGap: Infinity, passed: false });
    car.mesh.visible = true;
    car.mesh.position.set(car.x, 0, -z);
  }

  function spawnCoins(lane, startZ, count) {
    for (let i = 0; i < count; i++) {
      let coin = coins.find(c => !c.active);
      if (!coin) {
        const mesh = new T.Mesh(coinGeo, coinMat);
        scene.add(mesh);
        coin = { mesh };
        coins.push(coin);
      }
      Object.assign(coin, { active: true, x: CFG.lanes[lane], z: startZ + i * CFG.coinSpacing, speed: laneSpeeds[lane] });
      coin.mesh.visible = true;
      coin.mesh.position.set(coin.x, 1, -coin.z);
    }
  }

  function spawnRow(z, gapToNext) {
    const n = CFG.lanes.length;
    const difficulty = Math.min(1, player.z / 3000);
    const twoCars = Math.random() < 0.15 + 0.4 * difficulty;
    // Korsia e lirë lëviz maksimumi një korsi nga rreshti i kaluar, që të ketë gjithmonë rrugëdalje.
    const freeLane = Math.min(n - 1, Math.max(0, lastFreeLane + Math.floor(Math.random() * 3) - 1));
    lastFreeLane = freeLane;
    if (twoCars) {
      for (let l = 0; l < n; l++) if (l !== freeLane) spawnCar(l, z);
    } else {
      let blocked = Math.floor(Math.random() * (n - 1));
      if (blocked >= freeLane) blocked++;
      spawnCar(blocked, z);
    }
    const coinCount = Math.min(CFG.coinsPerLine, Math.floor((gapToNext - 7.5) / CFG.coinSpacing) + 1);
    if (coinCount > 0 && Math.random() < 0.45) spawnCoins(freeLane, z + 3, coinCount);
  }

  // ---------- Gjendjet ----------
  function goToMenu() {
    S.state = 'menu';
    S.garageIndex = Save.car;
    setPlayerCar(CARS[Save.car]);
    Object.assign(player, { x: 0, z: 0, lane: 1, speed: 0, driving: false, lastLane: -10 });
    resetRoad();
    resetTraffic();
    showScreen();
  }

  function startRun() {
    if (!Save.themeUnlocked(S.themeIndex)) return;
    goToMenu();
    Object.assign(S, { runCoins: 0, runCoinsTotal: 0, bonus: 0, nearMisses: 0, reportedNear: 0, continueUsed: false, newBest: false, unlockedTheme: null, time: 0 });
    player.speed = CFG.startSpeed;
    player.driving = true;
    S.state = 'playing';
    hintUntil = 4;
    requestWakeLock();
    showScreen();
  }

  function setPaused(p) {
    if (p && S.state === 'playing') S.state = 'paused';
    else if (!p && S.state === 'paused') S.state = 'playing';
    else return;
    showScreen();
  }

  function onNearMiss() {
    S.nearMisses++;
    S.bonus += CFG.nearBonus;
    A.nearMiss();
    const pop = ui.nearPop;
    pop.hidden = true;
    void pop.offsetWidth; // rinis animacionin
    pop.hidden = false;
    clearTimeout(onNearMiss.t);
    onNearMiss.t = setTimeout(() => { pop.hidden = true; }, 900);
  }

  function crash() {
    player.driving = false;
    S.state = 'over';
    A.crash();
    if (navigator.vibrate) navigator.vibrate(120);
    Save.coins += S.runCoins;
    const before = THEMES.filter((_, i) => Save.themeUnlocked(i)).length;
    if (score() > Save.best) { Save.best = score(); S.newBest = true; }
    const after = THEMES.filter((_, i) => Save.themeUnlocked(i)).length;
    if (after > before) S.unlockedTheme = THEMES[after - 1].name;
    Missions.report(distance(), S.runCoinsTotal, S.nearMisses, S.runCoins, S.nearMisses - S.reportedNear, !S.continueUsed);
    S.reportedNear = S.nearMisses;
    showScreen();
  }

  // Në web s'ka reklama: "Vazhdo" jepet falas, një herë për lojë.
  function continueRun() {
    if (S.continueUsed || S.state !== 'over') return;
    S.continueUsed = true;
    S.runCoins = 0;
    for (const c of cars) if (c.active && c.z > player.z - 20 && c.z < player.z + 40) { c.active = false; c.mesh.visible = false; }
    player.speed = Math.max(CFG.startSpeed, player.speed * 0.8);
    player.driving = true;
    S.state = 'playing';
    showScreen();
  }

  function changeLane(dir) {
    if (S.state !== 'playing') return;
    const lane = Math.min(CFG.lanes.length - 1, Math.max(0, player.lane + dir));
    if (lane === player.lane) return;
    player.lane = lane;
    player.lastLane = S.time;
    A.lane();
  }

  // ---------- Cikli i lojës ----------
  let hintUntil = 0;
  function update(dt) {
    const playing = S.state === 'playing';
    if (playing) {
      S.time += dt;
      const def = player.def;
      player.speed = Math.min(def.top, player.speed + CFG.accel * dt);
      player.z += player.speed * dt;
      const tx = CFG.lanes[player.lane];
      const step = def.handling * dt;
      player.x = Math.abs(tx - player.x) <= step ? tx : player.x + Math.sign(tx - player.x) * step;
      const yaw = Math.max(-14, Math.min(14, (tx - player.x) * 8)) * DEG;
      player.mesh.rotation.y = -yaw;

      while (nextRowZ < player.z + CFG.spawnAhead) {
        const difficulty = Math.min(1, player.z / 3000);
        const gap = (CFG.startGap + (CFG.minGap - CFG.startGap) * difficulty) * (0.85 + Math.random() * 0.4);
        spawnRow(nextRowZ, gap);
        nextRowZ += gap;
      }

      const limit = player.z - CFG.despawnBehind;
      for (const c of cars) {
        if (!c.active) continue;
        c.z += c.speed * dt;
        c.mesh.position.z = -c.z;
        const dz = c.z - player.z, dx = Math.abs(c.x - player.x);
        if (dx < (c.w + PLAYER_W) / 2 && Math.abs(dz) < (c.l + PLAYER_L) / 2) { crash(); break; }
        // Near-miss: hapësira anësore më e vogël ndërsa lojtari ishte krah makinës duke ndërruar korsi.
        if (!c.passed) {
          const reach = (c.l + PLAYER_L) / 2;
          if (dz < reach) {
            if (dz > -reach) {
              const gap = dx - (c.w + PLAYER_W) / 2;
              if (S.time - player.lastLane < CFG.nearWindow && gap < c.minGap) c.minGap = gap;
            } else {
              c.passed = true;
              if (c.minGap < CFG.nearGap) onNearMiss();
            }
          }
        }
        if (c.z < limit) { c.active = false; c.mesh.visible = false; }
      }
      for (const c of coins) {
        if (!c.active) continue;
        c.z += c.speed * dt;
        c.mesh.position.z = -c.z;
        if (S.state === 'playing' && Math.abs(c.x - player.x) < 1.2 && Math.abs(c.z - player.z) < 2.4) {
          c.active = false; c.mesh.visible = false;
          S.runCoins++; S.runCoinsTotal++;
          A.coin();
        } else if (c.z < limit) { c.active = false; c.mesh.visible = false; }
      }
    }
    for (const c of coins) if (c.active) c.mesh.rotation.y += 3.2 * dt;

    const total = CFG.segCount * CFG.segLen;
    for (const s of segments) {
      if (s.start + CFG.segLen < player.z - CFG.segLen) { s.start += total; s.group.position.z = -s.start; }
    }
    player.mesh.position.set(player.x, 0, -player.z);

    A.engine(S.state === 'playing' && player.driving, player.speed / player.def.top);
    A.music(S.state === 'menu' || S.state === 'garage' || S.state === 'missions');
    updateCamera(dt);
    if (playing || S.state === 'paused') updateHud();
    if (playing && hintUntil > 0 && S.time > hintUntil) { ui.hint.hidden = true; hintUntil = 0; }
  }

  const camTarget = new T.Vector3();
  function updateCamera(dt) {
    const px = player.x, pz = -player.z;
    if (S.state === 'menu' || S.state === 'garage' || S.state === 'missions') {
      S.orbit += 20 * DEG * dt;
      const r = 8.5, pitch = 17 * DEG;
      camera.position.set(px + Math.sin(S.orbit) * r * Math.cos(pitch), 0.6 + r * Math.sin(pitch), pz + Math.cos(S.orbit) * r * Math.cos(pitch));
      camTarget.set(px, S.state === 'menu' ? 0.2 : 0.9, pz);
    } else {
      camera.position.set(px * 0.6, 6.8, pz + 8.6);
      camTarget.set(px * 0.6, 0.6, pz - 8);
    }
    camera.lookAt(camTarget);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Në portret mbajmë rreth 46° pamje horizontale, që rruga me 3 korsi të duket e plotë.
    const vfov = 2 * Math.atan(Math.tan(23 * DEG) / camera.aspect) / DEG;
    camera.fov = Math.min(80, Math.max(55, vfov));
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  // ---------- UI ----------
  const $ = id => document.getElementById(id);
  const ui = {
    screens: { menu: $('menu'), hud: $('hud'), pause: $('pause'), over: $('over'), garage: $('garage'), missions: $('missions') },
    nearPop: $('near-pop'), hint: $('hint'), toast: $('toast'),
    hudScore: $('hud-score'), hudDist: $('hud-dist'), hudSpeed: $('hud-speed'), hudCoins: $('hud-coins'),
  };

  function showScreen() {
    const st = S.state;
    const visible = {
      menu: st === 'menu', hud: st === 'playing' || st === 'paused', pause: st === 'paused',
      over: st === 'over', garage: st === 'garage', missions: st === 'missions',
    };
    for (const k in ui.screens) ui.screens[k].hidden = !visible[k];
    document.querySelectorAll('[data-coins]').forEach(e => { e.textContent = Save.coins; });
    if (st === 'menu') renderMenu();
    if (st === 'garage') renderGarage();
    if (st === 'missions') renderMissions();
    if (st === 'over') renderOver();
    if (st === 'playing') { ui.hint.hidden = hintUntil === 0; updateHud(); }
  }

  const hudCache = {};
  function setText(el, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; el.textContent = v; } }
  function updateHud() {
    setText(ui.hudScore, 's', score());
    setText(ui.hudDist, 'd', distance());
    setText(ui.hudSpeed, 'v', Math.round(player.speed * 3.6));
    setText(ui.hudCoins, 'c', S.runCoinsTotal);
  }

  function renderMenu() {
    const t = THEMES[S.themeIndex], open = Save.themeUnlocked(S.themeIndex);
    $('map-code').textContent = t.code;
    $('map-name').textContent = t.name;
    const foot = $('map-foot');
    foot.textContent = open ? 'Rekordi ' + Save.best + ' m' : 'Hapet me rekord ' + t.unlockAt + ' m';
    foot.classList.toggle('locked', !open);
    const play = $('play');
    play.disabled = !open;
    play.textContent = open ? 'LUAJ' : 'E MBYLLUR';
    const n = Missions.claimable(), badge = $('mission-badge');
    badge.hidden = n === 0;
    badge.textContent = n;
    const muted = !!A.muted;
    $('mute-wave').style.display = muted ? 'none' : '';
    $('mute-x').style.display = muted ? '' : 'none';
    $('mute').setAttribute('aria-label', muted ? 'Ndiz zërin' : 'Fik zërin');
  }

  function renderGarage() {
    const i = S.garageIndex, car = CARS[i];
    $('garage-idx').textContent = 'Garazhi · ' + (i + 1) + ' / ' + CARS.length;
    $('garage-name').textContent = car.name;
    $('stat-speed').textContent = Math.round(car.top * 3.6) + ' km/h';
    $('stat-handling').textContent = car.handling;
    $('bar-speed').style.width = (car.top / 52 * 100) + '%';
    $('bar-handling').style.width = (car.handling / 16 * 100) + '%';
    const selected = i === Save.car, unlocked = Save.isUnlocked(i);
    const btn = $('car-action');
    btn.disabled = selected;
    btn.textContent = selected ? 'E ZGJEDHUR' : unlocked ? 'ZGJIDH' : 'BLEJ · ' + car.price;
  }

  function renderMissions() {
    const list = $('mission-list');
    list.textContent = '';
    const s = Missions.state();
    Missions.today().forEach((m, i) => {
      const p = Missions.progress(i), done = p >= m.target;
      const li = document.createElement('li');
      li.className = 'mission' + (done ? ' done' : '');
      li.innerHTML =
        '<div class="mission-top"><span class="mission-text"></span><span class="mission-reward"></span></div>' +
        '<div class="mission-bottom"><div class="bar"><i></i></div><span class="mission-prog"></span></div>';
      li.querySelector('.mission-text').textContent = m.text;
      li.querySelector('.mission-reward').textContent = '+' + m.reward;
      li.querySelector('.bar i').style.width = (p / m.target * 100) + '%';
      li.querySelector('.mission-prog').textContent = p + ' / ' + m.target;
      const bottom = li.querySelector('.mission-bottom');
      if (s.c[i]) {
        const tag = document.createElement('span');
        tag.className = 'claimed';
        tag.textContent = 'U mor';
        bottom.appendChild(tag);
      } else if (done) {
        const b = document.createElement('button');
        b.className = 'claim';
        b.textContent = 'MERR';
        b.addEventListener('click', () => { if (Missions.claim(i)) { A.coin(); toast('+' + m.reward + ' monedha'); showScreen(); } });
        bottom.appendChild(b);
      }
      list.appendChild(li);
    });
  }

  function renderOver() {
    $('over-score').textContent = score();
    $('over-dist').textContent = distance() + ' m';
    $('over-near').textContent = S.nearMisses;
    $('over-coins').textContent = '+' + S.runCoinsTotal;
    $('over-best').textContent = S.newBest ? 'Rekord i ri!' : 'Rekordi: ' + Save.best;
    $('over-best').classList.toggle('gold', S.newBest);
    const u = $('over-unlock');
    u.hidden = !S.unlockedTheme;
    if (S.unlockedTheme) u.textContent = 'U hap harta: ' + S.unlockedTheme;
    $('continue').hidden = S.continueUsed;
  }

  function toast(msg) {
    ui.toast.textContent = msg;
    ui.toast.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { ui.toast.hidden = true; }, 1800);
  }

  function on(id, fn) {
    $(id).addEventListener('click', e => { A.unlock(); A.click(); fn(e); });
  }
  on('play', startRun);
  on('open-garage', () => { S.state = 'garage'; S.garageIndex = Save.car; showScreen(); });
  on('open-missions', () => { S.state = 'missions'; showScreen(); });
  on('garage-back', goToMenu);
  on('missions-back', () => { S.state = 'menu'; showScreen(); });
  on('car-prev', () => browseCar(-1));
  on('car-next', () => browseCar(1));
  on('car-action', () => {
    if (!Save.tryBuy(S.garageIndex)) { toast('S\'ke monedha të mjaftueshme'); return; }
    Save.car = S.garageIndex;
    showScreen();
  });
  on('map-prev', () => browseTheme(-1));
  on('map-next', () => browseTheme(1));
  on('mute', () => { A.muted = !A.muted; renderMenu(); });
  on('pause-btn', () => setPaused(true));
  on('resume', () => setPaused(false));
  on('pause-menu', goToMenu);
  on('continue', continueRun);
  on('retry', startRun);
  on('over-menu', goToMenu);

  function browseCar(dir) {
    const n = CARS.length;
    S.garageIndex = (S.garageIndex + dir + n) % n;
    setPlayerCar(CARS[S.garageIndex]);
    renderGarage();
  }
  function browseTheme(dir) {
    const n = THEMES.length;
    const i = (S.themeIndex + dir + n) % n;
    applyTheme(i);
    if (Save.themeUnlocked(i)) Save.theme = i;
    renderMenu();
  }

  // ---------- Kontrolli: swipe, prekje majtas/djathtas, tastiera ----------
  let press = null;
  window.addEventListener('pointerdown', e => {
    A.unlock();
    if (e.target.closest && e.target.closest('button')) return;
    press = { x: e.clientX, y: e.clientY, t: performance.now(), used: false };
  });
  window.addEventListener('pointermove', e => {
    if (!press || press.used || S.state !== 'playing') return;
    const dx = e.clientX - press.x;
    if (Math.abs(dx) > window.innerWidth * 0.06) { changeLane(dx > 0 ? 1 : -1); press.used = true; }
  });
  window.addEventListener('pointerup', e => {
    if (!press) return;
    // Prekje e shkurtër pa lëvizje = ndërrim korsie drejt anës së prekur.
    if (!press.used && S.state === 'playing' && performance.now() - press.t < 300 && Math.abs(e.clientX - press.x) < 12) {
      changeLane(e.clientX < window.innerWidth / 2 ? -1 : 1);
    }
    press = null;
  });
  window.addEventListener('pointercancel', () => { press = null; });
  document.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => { e.preventDefault(); });
  window.addEventListener('keydown', e => {
    A.unlock();
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') changeLane(-1);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') changeLane(1);
    else if (k === 'Escape' || k === 'p' || k === 'P') setPaused(S.state === 'playing');
    else if ((k === 'Enter' || k === ' ') && (S.state === 'menu' || S.state === 'over') && !(e.target && e.target.closest && e.target.closest('button'))) startRun();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

  let wakeLock = null;
  function requestWakeLock() {
    try {
      if (!wakeLock && navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
    } catch (e) { /* s'mbështetet */ }
  }

  // ---------- Nisja ----------
  resize();
  applyTheme(S.themeIndex);
  goToMenu();
  requestAnimationFrame(t => { last = t; frame(t); loading.hidden = true; });
  window.TrafficRush = { S, player, cars, coins, CARS, THEMES, Save, Missions, startRun, changeLane, crash };
})();

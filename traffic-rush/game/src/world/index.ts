/**
 * Moduli i qytetit — implementon CityWorld (contracts.ts).
 * createCity(seed, quality): plani + gjeometria + pengesat (hash hapësinor) + semaforët + POI-të.
 */
import * as THREE from 'three';
import type { Axis, CityWorld, District, DistrictId, FrameContext, Obstacle, Poi, PoiKind, Quality, RoadEdge, RoadNode, SignalLight } from '../core/contracts';
import { rng } from '../core/math';
import { lanePoint, type Dir } from '../core/roads';
import { generateLayout, SIZE, type Layout } from './layout';
import { buildWorld, type BuildResult } from './build';
import { makeMaterials, type Mats } from './textures';

export { SIZE as CITY_SIZE } from './layout';

/** Statistika për demo/debug. */
export interface CityStats { buildMs: number; buildings: number; staticTris: number; staticMeshes: number; obstacles: number; propInstances: number; signals: number }

const CYCLE = 32; // 12 jeshile + 3 e verdhë + 1 e kuqe për çdo bosht

// Lista e vendeve me emër (lloji, emri, ankorimi opsional te një monument).
type PoiDef = [PoiKind, string, string?];
const POI_DEFS: Record<DistrictId, PoiDef[]> = {
  qendra: [
    ['garage', 'Garazhi Qendror', 'spawn'], ['landmark', 'Sheshi Skënderbej', 'plaza'], ['landmark', 'Kulla e Sahatit', 'clock'],
    ['landmark', 'Piramida', 'pyramid'], ['landmark', 'Pallati i Kulturës', 'palace'], ['landmark', 'Ura e Tabakëve', 'bridge'],
    ['landmark', 'Parku Rinia', 'park'], ['office', 'Qendra e Biznesit', 'towers'], ['landmark', 'Xhamia e Vjetër', 'mosque'],
    ['business', 'Parkimi Qendror'], ['business', 'Taksi Ylli'], ['police', 'Komisariati Nr. 1'], ['hospital', 'Spitali i Qytetit'],
    ['station', 'Stacioni i Taksive'], ['office', 'Bashkia e Qytetit'], ['hotel', 'Hotel Arbëria'], ['cafe', 'Kafe Sahati'],
    ['restaurant', 'Restorant Tradita'], ['shop', 'Farmacia Qendrore'], ['shop', 'Libraria Dituria'], ['school', 'Universiteti i Arteve'],
  ],
  blloku: [
    ['garage', 'Garazhi i Bllokut'], ['business', 'Kafe Blloku'], ['business', 'Lavazhi i Bllokut'], ['cafe', 'Kafe Flora'],
    ['cafe', 'Kafe Mimoza'], ['cafe', 'Kafe Arti'], ['cafe', 'Bar Lulishtja'], ['restaurant', 'Pica Napoli'], ['restaurant', 'Zgara Korçare'],
    ['shop', 'Pastiçeri Dajti'], ['shop', 'Butiku Elegant'], ['shop', 'Ëmbëltore Sheqerka'], ['hotel', 'Hotel Diamanti'],
    ['office', 'Studio Dizajni Pika'], ['home', 'Vila me Lule'], ['home', 'Pallati Rozë'], ['hospital', 'Poliklinika e Bllokut'],
  ],
  lagjja: [
    ['garage', 'Servisi i Lagjes'], ['business', 'Taksi Lagjja'], ['business', 'Furgonat e Veriut'], ['station', 'Stacioni i Autobusëve'],
    ['police', 'Policia e Lagjes'], ['school', 'Shkolla Drita'], ['school', 'Kopshti Lulet'], ['shop', 'Market Ylli'],
    ['shop', 'Furra e Lagjes'], ['shop', 'Farmacia'], ['shop', 'Berber Arti'], ['cafe', 'Kafe Lagjja'], ['restaurant', 'Byrektore Gjyshja'],
    ['restaurant', 'Qebaptore Shqiponja'], ['home', 'Pallati 7'], ['home', 'Pallati me Shigjeta'], ['home', 'Pallati i Kuq'],
  ],
  liqeni: [
    ['garage', 'Garazhi Liqeni'], ['business', 'Parkingu i Liqenit'], ['business', 'Lavazhi Liqeni'], ['landmark', 'Parku i Liqenit', 'lakeNorth'],
    ['landmark', 'Diga e Liqenit', 'lakeSouth'], ['hotel', 'Hotel Liqeni'], ['hotel', 'Hotel Panorama'], ['restaurant', 'Taverna e Liqenit'],
    ['restaurant', 'Restorant Kodra'], ['cafe', 'Kafe Panorama'], ['cafe', 'Kafe Ylberi'], ['home', 'Vila e Bardhë'], ['home', 'Vila Mimoza'],
    ['home', 'Rezidenca Liqeni'], ['school', 'Universiteti'], ['hospital', 'Klinika e Liqenit'], ['shop', 'Lulishte Trëndafili'],
  ],
  industria: [
    ['garage', 'Autoservis Industria'], ['business', 'Depo Transporti'], ['business', 'Autolarja e Lanës'], ['business', 'Auto Salloni Shqiponja'],
    ['business', 'Kantieri i Ndërtimit'], ['station', 'Stacioni i Trenit'], ['station', 'Terminali i Mallrave'], ['police', 'Policia Rrugore'],
    ['office', 'Fabrika e Tekstilit'], ['office', 'Punishtja e Mobiljeve'], ['office', 'Fabrika e Pijeve'], ['shop', 'Gomisteria Rruga'],
    ['shop', 'Pjesë Këmbimi Ura'], ['restaurant', 'Qebaptore e Punëtorëve'], ['cafe', 'Kafe Stacioni'], ['home', 'Pallati i Punëtorëve'],
  ],
};

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

class CityImpl implements CityWorld {
  readonly size = SIZE;
  readonly nodes: RoadNode[];
  readonly edges: RoadEdge[];
  readonly districts: District[];
  pois: Poi[] = [];
  root!: THREE.Object3D;
  playerSpawn = { x: 0, z: 0, heading: 0 };
  stats!: CityStats;
  /** Pikat e monumenteve (për misionet/kamerën). */
  landmarks: Record<string, { x: number; z: number }> = {};

  private obs: Obstacle[] = [];
  private oStart!: Int32Array; private oIdx!: Int32Array; private stamp!: Uint32Array; private qid = 0;
  private static OC = 16; private static OM = 64; private oG = 0;
  private eCells: number[][] = []; private static EC = 50; private eG = 0;
  private off: Float32Array; private first: Axis[];
  private t = 0;
  private night = -1;
  private build!: BuildResult;
  private mats!: Mats;
  private bulbState = new Int8Array(0);
  private lastCam = new THREE.Vector3(1e9, 0, 0); private lastDir = new THREE.Vector3(); private refreshT = 0;
  private frustum = new THREE.Frustum(); private pm = new THREE.Matrix4(); private tmpDir = new THREE.Vector3();
  private quality: Quality;

  constructor(readonly seed: number, readonly layout: Layout, quality: Quality) {
    this.nodes = layout.nodes; this.edges = layout.edges; this.districts = layout.districts;
    this.quality = quality;
    const r = rng(seed ^ 0x51c4a1);
    this.off = new Float32Array(this.nodes.length);
    this.first = [];
    for (let i = 0; i < this.nodes.length; i++) { this.off[i] = r() * CYCLE; this.first.push(r() < 0.5 ? 'x' : 'z'); }
    this.indexEdges();
  }

  attach(b: BuildResult, mats: Mats) {
    this.build = b; this.mats = mats; this.root = b.root; this.landmarks = b.landmarks;
    this.obs = b.obstacles;
    this.indexObstacles();
    this.bulbState = new Int8Array(b.heads.length).fill(-1);
  }

  // ---------------- Pengesat (hash hapësinor CSR) ----------------
  private indexObstacles() {
    const C = CityImpl.OC, M = CityImpl.OM, G = Math.ceil((SIZE + 2 * M) / C);
    this.oG = G;
    const cell = (v: number) => Math.max(0, Math.min(G - 1, Math.floor((v + M) / C)));
    const count = new Int32Array(G * G + 1);
    for (const o of this.obs) for (let gz = cell(o.minZ); gz <= cell(o.maxZ); gz++) for (let gx = cell(o.minX); gx <= cell(o.maxX); gx++) count[gz * G + gx + 1]++;
    for (let i = 1; i < count.length; i++) count[i] += count[i - 1];
    const idx = new Int32Array(count[count.length - 1]), fillp = count.slice(0, G * G);
    this.obs.forEach((o, id) => { for (let gz = cell(o.minZ); gz <= cell(o.maxZ); gz++) for (let gx = cell(o.minX); gx <= cell(o.maxX); gx++) idx[fillp[gz * G + gx]++] = id; });
    this.oStart = count; this.oIdx = idx; this.stamp = new Uint32Array(this.obs.length);
  }

  queryObstacles(minX: number, minZ: number, maxX: number, maxZ: number, out: Obstacle[]): number {
    out.length = 0;
    const C = CityImpl.OC, M = CityImpl.OM, G = this.oG;
    if (++this.qid >= 0xffffffff) { this.stamp.fill(0); this.qid = 1; }
    const q = this.qid;
    const gx0 = Math.max(0, Math.floor((minX + M) / C)), gx1 = Math.min(G - 1, Math.floor((maxX + M) / C));
    const gz0 = Math.max(0, Math.floor((minZ + M) / C)), gz1 = Math.min(G - 1, Math.floor((maxZ + M) / C));
    for (let gz = gz0; gz <= gz1; gz++) for (let gx = gx0; gx <= gx1; gx++) {
      const c = gz * G + gx;
      for (let k = this.oStart[c], e = this.oStart[c + 1]; k < e; k++) {
        const id = this.oIdx[k];
        if (this.stamp[id] === q) continue;
        this.stamp[id] = q;
        const o = this.obs[id];
        if (o.maxX < minX || o.minX > maxX || o.maxZ < minZ || o.minZ > maxZ) continue;
        out.push(o);
      }
    }
    return out.length;
  }

  // ---------------- Rrugët ----------------
  private indexEdges() {
    const C = CityImpl.EC, G = Math.ceil(SIZE / C);
    this.eG = G;
    this.eCells = Array.from({ length: G * G }, () => []);
    const cl = (v: number) => Math.max(0, Math.min(G - 1, Math.floor(v / C)));
    for (const e of this.edges) {
      const A = this.nodes[e.a], B = this.nodes[e.b];
      for (let gz = cl(Math.min(A.z, B.z)); gz <= cl(Math.max(A.z, B.z)); gz++)
        for (let gx = cl(Math.min(A.x, B.x)); gx <= cl(Math.max(A.x, B.x)); gx++) this.eCells[gz * G + gx].push(e.id);
    }
  }

  nearestEdge(x: number, z: number): { edge: RoadEdge; x: number; z: number; t: number; dist: number } | null {
    const C = CityImpl.EC, G = this.eG;
    const cx = Math.max(0, Math.min(G - 1, Math.floor(x / C))), cz = Math.max(0, Math.min(G - 1, Math.floor(z / C)));
    let best = -1, bd = Infinity, bx = 0, bz = 0, bt = 0;
    for (let r = 0; r < G; r++) {
      for (let gz = cz - r; gz <= cz + r; gz++) {
        if (gz < 0 || gz >= G) continue;
        const edgeRow = gz === cz - r || gz === cz + r;
        for (let gx = cx - r; gx <= cx + r; gx += edgeRow ? 1 : 2 * r || 1) {
          if (gx < 0 || gx >= G) continue;
          for (const id of this.eCells[gz * G + gx]) {
            const e = this.edges[id], A = this.nodes[e.a], B = this.nodes[e.b];
            let t: number, px: number, pz: number;
            if (e.axis === 'x') { t = (x - A.x) / (B.x - A.x); t = t < 0 ? 0 : t > 1 ? 1 : t; px = A.x + (B.x - A.x) * t; pz = A.z; }
            else { t = (z - A.z) / (B.z - A.z); t = t < 0 ? 0 : t > 1 ? 1 : t; px = A.x; pz = A.z + (B.z - A.z) * t; }
            const d = Math.hypot(px - x, pz - z);
            if (d < bd) { bd = d; best = id; bx = px; bz = pz; bt = t; }
          }
        }
      }
      if (best >= 0 && bd <= r * C) break;
    }
    if (best < 0) return null;
    return { edge: this.edges[best], x: bx, z: bz, t: bt, dist: bd };
  }

  districtAt(x: number, z: number): District {
    const cx = Math.max(0, Math.min(SIZE - 0.001, x)), cz = Math.max(0, Math.min(SIZE - 0.001, z));
    for (const d of this.districts) if (cx >= d.minX && cx < d.maxX && cz >= d.minZ && cz < d.maxZ) return d;
    return this.districts[0];
  }

  signal(nodeId: number, approachAxis: Axis): SignalLight {
    const n = this.nodes[nodeId];
    if (!n || !n.signalized) return 'green';
    let ph = (this.t + this.off[nodeId]) % CYCLE;
    if (ph < 0) ph += CYCLE;
    if (approachAxis === this.first[nodeId]) return ph < 12 ? 'green' : ph < 15 ? 'yellow' : 'red';
    return ph >= 16 && ph < 28 ? 'green' : ph >= 28 && ph < 31 ? 'yellow' : 'red';
  }

  groundHeight(_x: number, _z: number): number { return 0; }

  // ---------------- Kuadri ----------------
  update(ctx: FrameContext): void {
    this.t = ctx.time;
    const M = this.mats, b = this.build;
    // nata: tranzicion i butë
    const target = ctx.isNight ? 1 : 0;
    this.night = this.night < 0 ? target : this.night + (target - this.night) * (1 - Math.exp(-ctx.dt * 1.2));
    const n = this.night;
    M.night.value = n;
    M.lampHead.emissiveIntensity = n * 3.2;
    M.pool.opacity = n * 0.55;
    // uji lëviz
    M.waterTex.offset.set((ctx.time * 0.012) % 1, (ctx.time * 0.007) % 1);
    // semaforët
    if (b.bulbs) {
      const bulbs = b.bulbs, col = bulbs.instanceColor!;
      let dirty = false;
      for (let i = 0; i < b.heads.length; i++) {
        const h = b.heads[i], s = this.signal(h.node, h.axis), si = s === 'red' ? 0 : s === 'yellow' ? 1 : 2;
        if (this.bulbState[i] === si) continue;
        this.bulbState[i] = si; dirty = true;
        for (let k = 0; k < h.n; k++) {
          const which = k % 3, on = which === si;
          const c = which === 0 ? (on ? [1.0, 0.07, 0.04] : [0.16, 0.03, 0.02]) : which === 1 ? (on ? [1.0, 0.62, 0.05] : [0.15, 0.1, 0.02]) : (on ? [0.15, 1.0, 0.5] : [0.02, 0.13, 0.07]);
          col.setXYZ(h.bulb + k, c[0], c[1], c[2]);
        }
      }
      if (dirty) col.needsUpdate = true;
    }
    // props afër kamerës
    const cam = ctx.camera;
    cam.updateMatrixWorld();
    cam.getWorldDirection(this.tmpDir);
    this.refreshT -= ctx.dt;
    const moved = cam.position.distanceToSquared(this.lastCam) > 16 || this.tmpDir.dot(this.lastDir) < 0.985 || this.refreshT <= 0;
    if (moved) {
      this.lastCam.copy(cam.position); this.lastDir.copy(this.tmpDir); this.refreshT = 0.6;
      this.pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.pm);
      const high = cam.position.y > 60;
      for (const p of b.props) p.refresh(cam.position.x, cam.position.z, this.frustum, high ? Math.min(p.radius * 1.6, 380) : p.radius);
    }
    for (const p of b.props) p.setVisible(n, ctx.quality !== 'low' || !['bench', 'bush', 'umb', 'kiosk', 'blob', 'bus'].includes(p.name));
    // LOD: detajet e copave larg fshihen
    const far = ctx.quality === 'low' ? 450 : 650;
    for (const c of b.chunkMisc) c.mesh.visible = Math.hypot(c.x - cam.position.x, c.z - cam.position.z) < far;
  }

  // ---------------- Vendet (POI) ----------------
  placePois() {
    const r = rng(this.seed ^ 0x9071);
    const used = new Set<string>();
    const pois: Poi[] = [];
    const far = (x: number, z: number, d: number) => pois.every(p => (p.x - x) ** 2 + (p.z - z) ** 2 > d * d);
    const add = (kind: PoiKind, name: string, district: DistrictId, p: { x: number; z: number; heading: number }) => {
      let id = slug(name); while (used.has(id)) id += '-2';
      used.add(id);
      pois.push({ id, name, kind, district, x: p.x, z: p.z, heading: p.heading });
    };
    // Pika në korsinë e djathtë më afër një objektivi.
    const anchorPoint = (tx: number, tz: number) => {
      let best: { x: number; z: number; heading: number } | null = null, bd = Infinity;
      for (const e of this.edges) {
        if (e.kind === 'bridge' && e.length < 40) continue;
        const A = this.nodes[e.a], B = this.nodes[e.b];
        const t0 = e.axis === 'x' ? (tx - A.x) / (B.x - A.x) : (tz - A.z) / (B.z - A.z);
        const t = Math.max(0.22, Math.min(0.78, t0));
        for (const dir of [1, -1] as Dir[]) {
          const p = lanePoint(this, e, dir, e.lanes - 1, dir === 1 ? t : 1 - t);
          const d = Math.hypot(p.x - tx, p.z - tz);
          if (d < bd && far(p.x, p.z, 18)) { bd = d; best = p; }
        }
      }
      return best;
    };
    for (const d of this.districts) {
      const defs = POI_DEFS[d.id];
      const cand = this.edges.filter(e => {
        const A = this.nodes[e.a], B = this.nodes[e.b], mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
        return e.kind !== 'bridge' && e.length >= 50 && mx > d.minX + 5 && mx < d.maxX - 5 && mz > d.minZ + 5 && mz < d.maxZ - 5;
      });
      for (const [kind, name, anchor] of defs) {
        if (anchor) {
          const lm = anchor === 'spawn' ? { x: 616, z: 640 } : this.landmarks[anchor];
          const p = lm ? anchorPoint(lm.x, lm.z) : null;
          if (p) { add(kind, name, d.id, p); continue; }
        }
        let placed = false;
        for (let tries = 0; tries < 80 && !placed; tries++) {
          const e = cand[(r() * cand.length) | 0];
          if (!e) break;
          const dir: Dir = r() < 0.5 ? 1 : -1;
          const p = lanePoint(this, e, dir, e.lanes - 1, 0.25 + r() * 0.5);
          if (!far(p.x, p.z, tries < 50 ? 34 : 18)) continue;
          add(kind, name, d.id, p); placed = true;
        }
      }
    }
    this.pois = pois;
    const sp = pois.find(p => p.kind === 'garage' && p.district === 'qendra') ?? pois[0];
    this.playerSpawn = { x: sp.x, z: sp.z, heading: sp.heading };
  }
}

/** Krijon qytetin. */
export function createCity(seed: number, quality: Quality): CityWorld {
  const t0 = performance.now();
  const layout = generateLayout(seed);
  const city = new CityImpl(seed, layout, quality);
  const t1 = performance.now();
  const mats = makeMaterials(seed);
  const t2 = performance.now();
  const b = buildWorld(layout, quality, mats);
  const t3 = performance.now();
  city.attach(b, mats);
  city.placePois();
  const t4 = performance.now();
  (city as any).timings = { layout: Math.round(t1 - t0), textures: Math.round(t2 - t1), geometry: Math.round(t3 - t2), index: Math.round(t4 - t3) };
  city.stats = {
    buildMs: Math.round(performance.now() - t0), buildings: b.stats.buildings, staticTris: b.stats.staticTris, staticMeshes: b.stats.staticMeshes,
    obstacles: b.obstacles.length, propInstances: b.stats.propInstances, signals: layout.nodes.filter(n => n.signalized).length,
  };
  return city;
}

/** Statistikat e ndërtimit (vetëm për qytetet e krijuara nga createCity). */
export function cityStats(city: CityWorld): CityStats | null {
  return city instanceof CityImpl ? city.stats : null;
}
/** Pikat e monumenteve kryesore (sheshi, kulla, piramida, liqeni...). */
export function cityLandmarks(city: CityWorld): Record<string, { x: number; z: number }> {
  return city instanceof CityImpl ? city.landmarks : {};
}

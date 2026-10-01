/**
 * Trafiku AI: makina kinematike që ndjekin korsitë (IDM), semaforët, kryqëzimet dhe kthesat me bezier.
 */
import * as THREE from 'three';
import type {
  CityWorld, FrameContext, GameEvents, PhysicsSystem, Quality, RoadEdge, TrafficSystem, Vehicle, VehicleFactory, VehicleSpec,
} from '../core/contracts';
import type { Emitter } from '../core/events';
import { angleDiff, clamp } from '../core/math';
import { dirFrom, junctionHalfSize, otherNode, travelHeading, type Dir } from '../core/roads';
import { TRAFFIC_CARS, TRAFFIC_COLORS } from '../data/catalog';

export type TrafficDeps = { city: CityWorld; factory: VehicleFactory; physics: PhysicsSystem; events: Emitter<GameEvents>; scene: THREE.Scene };

const POOL: Record<Quality, number> = { low: 14, medium: 24, high: 34 };
const SPAWN_MIN = 70, SPAWN_MAX = 220, DESPAWN = 260;
const LOD_FAR = 78, LOD_NEAR = 62;
// Peshat e llojeve: hatch, sedan, taxi, suv, furgon, van, bus, truck
const WEIGHTS = [22, 22, 10, 16, 8, 7, 3, 3];
const NEAR_MISS_SPEED = 60 / 3.6;

export interface Agent {
  v: Vehicle;
  spec: VehicleSpec;
  color: number;
  lod: 'high' | 'low';
  e: RoadEdge; dir: Dir; lane: number; s: number;
  turning: boolean;
  bx: number[]; bz: number[]; blen: number; u: number;
  ne: RoadEdge; ndir: Dir; nlane: number; turnSign: number; node: number;
  speed: number; factor: number;
  reserved: number;          // nyja e rezervuar (-1 = asnjë)
  committed: boolean;        // vazhdon me të verdhë
  redCounted: boolean;
  stillT: number; outT: number; wreckT: number; ignoreT: number;
  patrol: boolean;
  nmIn: boolean; nmGap: number; nmSpeed: number; touched: boolean;
  h: number;
}

interface NodeRes { axis: 'x' | 'z' | null; count: number; seen: { x: number; z: number }; since: { x: number; z: number } }

export class Traffic implements TrafficSystem {
  readonly vehicles: Vehicle[] = [];
  readonly patrols: Agent[] = [];
  density = 1;
  readonly agents: Agent[] = [];
  /** Statistika për demon. */
  stats = { redStops: 0, nearMisses: 0, ms: 0, spawned: 0, wrecks: 0 };
  private cache = new Map<string, Vehicle[]>();
  private jhs: Float32Array;
  private res: NodeRes[];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4();
  private sph = new THREE.Sphere();
  private player: Vehicle | null = null;
  private streak = 0; private lastNear = -99; private time = 0;
  private swapsLeft = 0;
  // buferë për skanimin e makinave
  private bufN = 0;
  private bx = new Float32Array(128); private bz = new Float32Array(128); private bs = new Float32Array(128); private bc = new Float32Array(128);
  private bw = new Float32Array(128); private bl = new Float32Array(128); private bvx = new Float32Array(128); private bvz = new Float32Array(128);
  private bk = new Uint8Array(128); private bref: Vehicle[] = [];

  constructor(private d: TrafficDeps) {
    const { city } = d;
    this.jhs = new Float32Array(city.nodes.length);
    for (const n of city.nodes) this.jhs[n.id] = junctionHalfSize(city, n);
    this.res = city.nodes.map(() => ({ axis: null, count: 0, seen: { x: -9, z: -9 }, since: { x: 0, z: 0 } }));
    d.events.on('collision', c => {
      const p = this.player;
      if (!p || (c.a !== p && c.b !== p)) return;
      const o = c.a === p ? c.b : c.a;
      if (c.impulse > 1) this.streak = 0;
      if (o) { const ag = this.agentOf(o); if (ag) ag.touched = true; }
    });
  }

  private agentOf(v: Vehicle): Agent | undefined {
    for (const a of this.agents) if (a.v === v) return a;
    for (const a of this.patrols) if (a.v === v) return a;
    return undefined;
  }

  // ---------------- Pishina e makinave ----------------
  private acquire(spec: VehicleSpec, color: number, lod: 'high' | 'low'): Vehicle {
    const key = spec.id + '|' + lod;
    const arr = this.cache.get(key);
    const v = arr && arr.length ? arr.pop()! : this.d.factory.create(spec, color, { lod });
    if (v.color !== color) v.setColor(color);
    v.kinematic = true; v.damage = 0; v.yawRate = 0;
    const L = v.lights; L.head = L.brake = L.reverse = L.left = L.right = L.hazard = L.siren = false;
    this.d.scene.add(v.object3d);
    this.d.physics.add(v);
    return v;
  }
  private releaseVehicle(v: Vehicle, lod: 'high' | 'low'): void {
    this.d.scene.remove(v.object3d);
    this.d.physics.remove(v);
    const key = v.spec.id + '|' + lod;
    let arr = this.cache.get(key);
    if (!arr) this.cache.set(key, (arr = []));
    if (arr.length < 6) arr.push(v); else v.dispose();
  }

  private pickSpec(): VehicleSpec {
    let r = Math.random() * 91;
    for (let i = 0; i < WEIGHTS.length; i++) { r -= WEIGHTS[i]; if (r <= 0) return TRAFFIC_CARS[i]; }
    return TRAFFIC_CARS[0];
  }

  /** Krijon një agjent në korsi (përdoret edhe nga policia për patrullat). */
  spawnAgent(spec: VehicleSpec, color: number, e: RoadEdge, dir: Dir, lane: number, s: number, lod: 'high' | 'low', patrol = false): Agent {
    const v = this.acquire(spec, color, lod);
    const a: Agent = {
      v, spec, color, lod, e, dir, lane, s, turning: false, bx: [0, 0, 0, 0], bz: [0, 0, 0, 0], blen: 1, u: 0,
      ne: e, ndir: dir, nlane: lane, turnSign: 0, node: 0, speed: 0, factor: 0.85 + Math.random() * 0.2,
      reserved: -1, committed: false, redCounted: false, stillT: 0, outT: 0, wreckT: 0, ignoreT: 0, patrol,
      nmIn: false, nmGap: 99, nmSpeed: 0, touched: false, h: 0,
    };
    this.planNext(a);
    a.speed = this.limit(a) * 0.8;
    this.place(a, 0.016);
    (patrol ? this.patrols : this.agents).push(a);
    if (!patrol) this.vehicles.push(v);
    this.stats.spawned++;
    return a;
  }

  /** Heq agjentin; `keep` = makina mbetet në skenë/fizikë (p.sh. patrulla bëhet ndjekëse). */
  removeAgent(a: Agent, keep = false): void {
    this.unreserve(a);
    const list = a.patrol ? this.patrols : this.agents;
    const i = list.indexOf(a);
    if (i >= 0) { list[i] = list[list.length - 1]; list.pop(); }
    const j = this.vehicles.indexOf(a.v);
    if (j >= 0) { this.vehicles[j] = this.vehicles[this.vehicles.length - 1]; this.vehicles.pop(); }
    if (!keep) this.releaseVehicle(a.v, a.lod);
  }

  clearAround(x: number, z: number, radius: number): void {
    const r2 = radius * radius;
    for (const list of [this.agents, this.patrols])
      for (let i = list.length - 1; i >= 0; i--) {
        const a = list[i];
        if ((a.v.x - x) ** 2 + (a.v.z - z) ** 2 < r2) this.removeAgent(a);
      }
  }

  // ---------------- Gjeometria e korsive ----------------
  private startNode(a: { e: RoadEdge; dir: Dir }) { return a.dir === 1 ? a.e.a : a.e.b; }
  private endNode(a: { e: RoadEdge; dir: Dir }) { return a.dir === 1 ? a.e.b : a.e.a; }
  private sStart(a: Agent) { return this.jhs[this.startNode(a)]; }
  private sEnd(a: Agent) { return Math.max(this.sStart(a) + 0.5, a.e.length - this.jhs[this.endNode(a)]); }

  private lanePos(e: RoadEdge, dir: Dir, lane: number, s: number, out: number[]): void {
    const A = this.d.city.nodes[dir === 1 ? e.a : e.b];
    const h = travelHeading(e, dir), fx = Math.sin(h), fz = Math.cos(h);
    const off = (Math.min(lane, e.lanes - 1) + 0.5) * e.laneWidth;
    out[0] = A.x + fx * s - fz * off;
    out[1] = A.z + fz * s + fx * off;
  }

  /** Zgjedh rrugën e radhës në nyjen ku po shkon agjenti dhe ndërton kthesën. */
  private planNext(a: Agent): void {
    const city = this.d.city, node = this.endNode(a), n = city.nodes[node];
    const h0 = travelHeading(a.e, a.dir);
    let best: RoadEdge | null = null, bestDir: Dir = 1, bestTurn = 0, total = 0;
    const two = a.e.lanes > 1;
    for (const id of n.edges) {
      if (id === a.e.id) continue;
      const c = city.edges[id], nd = dirFrom(c, node);
      const turn = angleDiff(h0, travelHeading(c, nd));
      const side = Math.abs(turn) < 0.3 ? 0 : turn > 0 ? 1 : -1;
      if (two && side === -1 && a.lane === 0 && n.edges.length > 2) continue;      // korsia e brendshme s'kthehet djathtas
      if (two && side === 1 && a.lane === a.e.lanes - 1 && n.edges.length > 2) continue;
      const w = side === 0 ? 3 : side === -1 ? 1.3 : 1;
      total += w;
      if (Math.random() * total < w) { best = c; bestDir = nd; bestTurn = side; }
    }
    if (!best) { best = a.e; bestDir = (a.dir === 1 ? -1 : 1) as Dir; bestTurn = 2; } // U-kthesë (rrugë qorre)
    a.ne = best; a.ndir = bestDir; a.turnSign = bestTurn; a.node = node;
    const L = best.lanes;
    a.nlane = L === 1 ? 0 : bestTurn === -1 ? L - 1 : bestTurn === 1 ? 0 : bestTurn === 2 ? 0 : Math.min(a.lane, L - 1);
    // bezier nga vija e ndalimit te hyrja e rrugës tjetër
    const p0 = [0, 0], p3 = [0, 0];
    this.lanePos(a.e, a.dir, a.lane, this.sEnd(a), p0);
    const nStart = this.jhs[node];
    this.lanePos(best, bestDir, a.nlane, nStart, p3);
    const h1 = travelHeading(best, bestDir);
    const dist = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
    const k = bestTurn === 2 ? 5 : Math.max(1, dist * (bestTurn === 0 ? 0.33 : 0.55));
    a.bx[0] = p0[0]; a.bz[0] = p0[1];
    a.bx[1] = p0[0] + Math.sin(h0) * k; a.bz[1] = p0[1] + Math.cos(h0) * k;
    a.bx[2] = p3[0] - Math.sin(h1) * k; a.bz[2] = p3[1] - Math.cos(h1) * k;
    a.bx[3] = p3[0]; a.bz[3] = p3[1];
    let len = 0, px = p0[0], pz = p0[1];
    for (let i = 1; i <= 8; i++) {
      const t = i / 8, q = 1 - t;
      const x = q * q * q * a.bx[0] + 3 * q * q * t * a.bx[1] + 3 * q * t * t * a.bx[2] + t * t * t * a.bx[3];
      const z = q * q * q * a.bz[0] + 3 * q * q * t * a.bz[1] + 3 * q * t * t * a.bz[2] + t * t * t * a.bz[3];
      len += Math.hypot(x - px, z - pz); px = x; pz = z;
    }
    a.blen = Math.max(0.5, len);
  }

  private limit(a: Agent): number {
    return Math.min(a.e.speedLimit * a.factor, a.spec.topSpeed * 0.85);
  }

  /** Vendos pozën e makinës sipas gjendjes. */
  private place(a: Agent, dt: number): void {
    let x: number, z: number, h: number;
    if (!a.turning) {
      const p = [0, 0];
      this.lanePos(a.e, a.dir, a.lane, a.s, p);
      x = p[0]; z = p[1]; h = travelHeading(a.e, a.dir);
    } else {
      const t = clamp(a.u, 0, 1), q = 1 - t, B = a.bx, C = a.bz;
      x = q * q * q * B[0] + 3 * q * q * t * B[1] + 3 * q * t * t * B[2] + t * t * t * B[3];
      z = q * q * q * C[0] + 3 * q * q * t * C[1] + 3 * q * t * t * C[2] + t * t * t * C[3];
      const dx = 3 * q * q * (B[1] - B[0]) + 6 * q * t * (B[2] - B[1]) + 3 * t * t * (B[3] - B[2]);
      const dz = 3 * q * q * (C[1] - C[0]) + 6 * q * t * (C[2] - C[1]) + 3 * t * t * (C[3] - C[2]);
      h = dx * dx + dz * dz > 1e-6 ? Math.atan2(dx, dz) : a.h;
    }
    a.v.yawRate = dt > 0 ? angleDiff(a.h, h) / dt : 0;
    a.h = h;
    a.v.setPose(x, z, h, a.speed);
  }

  // ---------------- Kryqëzimet ----------------
  private canReserve(a: Agent): boolean {
    const r = this.res[a.node], ax = a.e.axis, other = ax === 'x' ? 'z' : 'x';
    if (this.d.city.nodes[a.node].edges.length <= 2) return true;
    if (r.count === 0) return true;
    if (r.axis !== ax) return false;
    // mos e lër rrugën tjetër të presë pafundësisht
    return !(this.time - r.seen[other] < 0.3 && this.time - r.since[other] > 2.5);
  }
  private markWaiting(a: Agent): void {
    const r = this.res[a.node], ax = a.e.axis;
    if (this.time - r.seen[ax] > 0.3) r.since[ax] = this.time;
    r.seen[ax] = this.time;
  }
  private reserve(a: Agent): void {
    if (this.d.city.nodes[a.node].edges.length <= 2) return;
    const r = this.res[a.node];
    if (r.count === 0) r.axis = a.e.axis;
    r.count++;
    a.reserved = a.node;
    r.seen[a.e.axis] = -9;
  }
  private unreserve(a: Agent): void {
    if (a.reserved < 0) return;
    const r = this.res[a.reserved];
    r.count = Math.max(0, r.count - 1);
    if (r.count === 0) r.axis = null;
    a.reserved = -1;
  }

  // ---------------- Kuadri ----------------
  update(ctx: FrameContext): void {
    const t0 = performance.now();
    const { dt } = ctx;
    this.time = ctx.time;
    const p = ctx.player;
    this.player = p;
    const px = p ? p.x : this.d.city.playerSpawn.x, pz = p ? p.z : this.d.city.playerSpawn.z;
    const cam = ctx.camera;
    this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.m4);
    this.fillBuffer();
    this.swapsLeft = 1;

    for (const list of [this.agents, this.patrols])
      for (let i = list.length - 1; i >= 0; i--) {
        const a = list[i];
        const dx = a.v.x - px, dz = a.v.z - pz, d2 = dx * dx + dz * dz;
        const vis = this.visible(a.v.x, a.v.z);
        a.outT = vis ? 0 : a.outT + dt;
        if (d2 > DESPAWN * DESPAWN) { this.removeAgent(a); continue; }
        if (!a.v.kinematic) {
          // e goditur: rrëshqet (fizika), me sinjale rreziku
          if (a.wreckT === 0) { this.stats.wrecks++; this.unreserve(a); }
          a.wreckT += dt;
          const L = a.v.lights; L.hazard = true; L.brake = false; L.left = L.right = false; L.head = ctx.isNight;
          if ((a.outT > 8 && d2 > 30 * 30) || a.wreckT > 45) this.removeAgent(a);
          continue;
        }
        if (a.speed < 0.1) a.stillT += dt; else a.stillT = 0;
        if (a.stillT > 25 && a.outT > 3) { this.removeAgent(a); continue; }
        this.step(a, ctx, d2);
        if (p) this.nearMiss(a, p);
        // LOD me histerezë
        if (this.swapsLeft > 0 && !a.patrol) {
          const want = a.lod === 'low' ? (d2 < LOD_NEAR * LOD_NEAR ? 'high' : 'low') : (d2 > LOD_FAR * LOD_FAR ? 'low' : 'high');
          if (want !== a.lod) { this.swapLod(a, want); this.swapsLeft--; }
        }
      }

    // Plotëso pishinën
    const target = Math.round(POOL[ctx.quality] * clamp(this.density, 0, 1.2));
    let tries = 6;
    while (this.agents.length < target && tries-- > 0) if (this.trySpawn(px, pz, null, false)) break; // maks. 1 në kuadër
    while (this.agents.length > target + 2) {
      // tepricë (ndryshim cilësie): hiq një të padukshme
      const a = this.agents.find(q => q.outT > 0.5);
      if (!a) break;
      this.removeAgent(a);
    }
    this.stats.ms = this.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
  }

  private visible(x: number, z: number): boolean {
    this.sph.center.set(x, 1, z); this.sph.radius = 3;
    return this.frustum.intersectsSphere(this.sph);
  }

  private swapLod(a: Agent, lod: 'high' | 'low'): void {
    const old = a.v, L = old.lights;
    const nv = this.acquire(a.spec, a.color, lod);
    Object.assign(nv.lights, L);
    nv.setPose(old.x, old.z, old.heading, a.speed);
    nv.yawRate = old.yawRate;
    const j = this.vehicles.indexOf(old);
    if (j >= 0) this.vehicles[j] = nv;
    this.releaseVehicle(old, a.lod);
    a.v = nv; a.lod = lod;
  }

  /** Gjen një vend në korsi larg lojtarit dhe krijon makinë. */
  trySpawn(px: number, pz: number, spec: VehicleSpec | null, patrol: boolean, minD = SPAWN_MIN, maxD = SPAWN_MAX): Agent | null {
    const city = this.d.city;
    for (let k = 0; k < 3; k++) {
      const ang = Math.random() * Math.PI * 2, r = minD + Math.random() * (maxD - minD);
      const qx = px + Math.sin(ang) * r, qz = pz + Math.cos(ang) * r;
      if (qx < 0 || qz < 0 || qx > city.size || qz > city.size) continue;
      const ne = city.nearestEdge(qx, qz);
      if (!ne || ne.dist > 25) continue;
      const e = ne.edge, dir: Dir = Math.random() < 0.5 ? 1 : -1;
      const lane = Math.floor(Math.random() * e.lanes);
      const s0 = this.jhs[dir === 1 ? e.a : e.b], s1 = e.length - this.jhs[dir === 1 ? e.b : e.a];
      if (s1 - s0 < 10) continue;
      const tt = dir === 1 ? ne.t : 1 - ne.t;
      const s = clamp(tt * e.length, s0 + 3, s1 - 6);
      const pos = [0, 0];
      this.lanePos(e, dir, lane, s, pos);
      const d = Math.hypot(pos[0] - px, pos[1] - pz);
      if (d < minD * 0.9 || d > maxD * 1.1) continue;
      if (this.visible(pos[0], pos[1]) && d < 150 && Math.random() < 0.85) continue;  // më mirë jashtë pamjes
      let free = true;
      for (const v of this.d.physics.vehicles) if ((v.x - pos[0]) ** 2 + (v.z - pos[1]) ** 2 < 14 * 14) { free = false; break; }
      if (!free) continue;
      const sp = spec ?? this.pickSpec();
      const big = sp.body === 'bus' || sp.body === 'truck' || sp.body === 'police';
      const col = big ? sp.defaultColor : sp.body === 'taxi' ? sp.defaultColor : TRAFFIC_COLORS[(Math.random() * TRAFFIC_COLORS.length) | 0];
      return this.spawnAgent(sp, col, e, dir, lane, s, d > LOD_FAR && sp.body !== 'police' ? 'low' : 'high', patrol);
    }
    return null;
  }

  private fillBuffer(): void {
    const vs = this.d.physics.vehicles;
    let n = 0;
    for (const v of vs) {
      if (n >= 128) break;
      this.bx[n] = v.x; this.bz[n] = v.z; this.bs[n] = Math.sin(v.heading); this.bc[n] = Math.cos(v.heading);
      this.bw[n] = v.halfW; this.bl[n] = v.halfL; this.bvx[n] = v.vx; this.bvz[n] = v.vz;
      this.bk[n] = v.kinematic ? 1 : 0; this.bref[n] = v;
      n++;
    }
    this.bufN = n;
  }

  /** Makina para (gap në metra nga parakolpi, shpejtësia e saj përgjatë drejtimit tonë). */
  private leader(a: Agent, fx: number, fz: number): { gap: number; vl: number } {
    let gap = 99, vl = 0;
    const v = a.v, rx = -fz, rz = fx, ignore = a.ignoreT > 0;
    for (let i = 0; i < this.bufN; i++) {
      const o = this.bref[i];
      if (o === v) continue;
      const dx = this.bx[i] - v.x, dz = this.bz[i] - v.z;
      const along = dx * fx + dz * fz;
      if (along <= 0 || along > 50) continue;
      const lat = dx * rx + dz * rz;
      const dot = fx * this.bs[i] + fz * this.bc[i];
      const c = Math.abs(dot), s = Math.sqrt(Math.max(0, 1 - c * c));
      const extR = this.bw[i] * c + this.bl[i] * s;
      if (Math.abs(lat) > v.halfW + extR + 0.3) continue;
      const isPlayer = o === this.player;
      if (!isPlayer && this.bk[i] && (dot < -0.5 || ignore)) continue;  // trafik përballë
      const g = along - v.halfL - (this.bl[i] * c + this.bw[i] * s);
      if (g < gap) { gap = g; vl = this.bvx[i] * fx + this.bvz[i] * fz; }
    }
    return { gap, vl: Math.max(0, vl) };
  }

  private idm(v: number, v0: number, gap: number, vl: number, amax: number): number {
    const b = 3, s0 = 2.2, T = 1.2;
    const ss = s0 + Math.max(0, v * T + v * (v - vl) / (2 * Math.sqrt(amax * b)));
    const g = Math.max(0.1, gap);
    return amax * (1 - Math.pow(v / Math.max(0.1, v0), 4) - (ss / g) * (ss / g));
  }

  private step(a: Agent, ctx: FrameContext, d2: number): void {
    const dt = ctx.dt, v = a.v, city = this.d.city;
    if (a.ignoreT > 0) a.ignoreT -= dt;
    const amax = a.spec.body === 'bus' || a.spec.body === 'truck' ? 1.3 : a.spec.body === 'van' || a.spec.body === 'furgon' ? 1.8 : 2.4;
    const fx = Math.sin(a.h), fz = Math.cos(a.h);
    // shpejtësia e dëshiruar
    let v0 = this.limit(a);
    const vTurn = a.turnSign === 0 ? v0 : a.turnSign === 2 ? 3.5 : a.turnSign === -1 ? 5.5 : 7;
    let stopGap = 99;
    let distToLine = 0;
    if (!a.turning) {
      const sEnd = this.sEnd(a);
      distToLine = sEnd - a.s;
      v0 = Math.min(v0, Math.sqrt(vTurn * vTurn + 2 * 2.2 * Math.max(0, distToLine)));
      // semafori / përparësia
      if (distToLine < 70) {
        const n = city.nodes[a.node];
        let go = true;
        const front = distToLine - v.halfL;
        if (n.signalized) {
          const sig = city.signal(a.node, a.e.axis);
          if (sig === 'red') go = a.committed && front < 0.5;
          else if (sig === 'yellow') {
            if (!a.committed) a.committed = a.speed * a.speed / (2 * 3.5) > front - 1;
            go = a.committed;
          } else a.committed = false;
          if (!go && sig === 'red' && a.speed < 0.3 && front < 6 && !a.redCounted) { a.redCounted = true; this.stats.redStops++; }
        }
        if (go && front < 10 && n.edges.length > 2 && !this.canReserve(a)) { go = false; this.markWaiting(a); }
        if (!go) stopGap = distToLine - v.halfL - 0.6 + 2.2; // +s0: ndalon te vija
      }
    } else v0 = vTurn;

    const L = this.leader(a, fx, fz);
    let acc = this.idm(a.speed, v0, L.gap, L.vl, amax);
    if (stopGap < 99) acc = Math.min(acc, this.idm(a.speed, v0, stopGap, 0, amax));
    acc = clamp(acc, -9, amax);
    a.speed = Math.max(0, a.speed + acc * dt);
    let ds = a.speed * dt;
    if (L.gap < 60) ds = Math.min(ds, Math.max(0, L.gap - 0.4));
    if (stopGap < 99) {
      const room = Math.max(0, distToLine - v.halfL - 0.6);
      if (ds > room) { ds = room; if (room < 0.05) a.speed = 0; }
    }
    if (ds <= 0.0001 && a.speed < 0.5) a.speed = Math.min(a.speed, 0.3);

    // bllokim brenda kryqëzimit → injoro trafikun për pak
    if (a.turning && a.speed < 0.1 && a.stillT > 4) a.ignoreT = 2;

    // lëvizja
    if (!a.turning) {
      a.s += ds;
      const sEnd = this.sEnd(a);
      if (a.s >= sEnd) {
        if (stopGap < 99 && a.reserved < 0 && !this.canReserve(a)) { a.s = sEnd; a.speed = 0; }
        else {
          const over = a.s - sEnd;
          this.reserve(a);
          a.turning = true; a.u = over / a.blen;
        }
      }
    } else {
      a.u += ds / a.blen;
      if (a.u >= 1) {
        const over = (a.u - 1) * a.blen;
        this.unreserve(a);
        a.e = a.ne; a.dir = a.ndir; a.lane = a.nlane; a.turning = false;
        a.s = this.sStart(a) + over; a.committed = false; a.redCounted = false;
        this.planNext(a);
      }
    }
    this.place(a, dt);

    // dritat
    const lt = v.lights;
    lt.head = ctx.isNight;
    lt.brake = acc < -1 || a.speed < 0.3;
    const sig = a.turning || distToLine < 30;
    lt.left = sig && (a.turnSign === 1 || a.turnSign === 2);
    lt.right = sig && a.turnSign === -1;
    lt.hazard = false;
    lt.siren = false;
    void d2;
  }

  // ---------------- Kalim i ngushtë (near miss) ----------------
  private nearMiss(a: Agent, p: Vehicle): void {
    const ps = Math.abs(p.speed);
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
    const dx = a.v.x - p.x, dz = a.v.z - p.z;
    const along = dx * fx + dz * fz, lat = dx * -fz + dz * fx;
    if (Math.abs(along) > 12 || Math.abs(lat) > 6) { if (a.nmIn) this.nmExit(a); return; }
    const c = Math.abs(fx * Math.sin(a.h) + fz * Math.cos(a.h)), s = Math.sqrt(Math.max(0, 1 - c * c));
    const extF = a.v.halfL * c + a.v.halfW * s, extR = a.v.halfW * c + a.v.halfL * s;
    if (Math.abs(along) < p.halfL + extF) {
      const gap = Math.abs(lat) - p.halfW - extR;
      if (!a.nmIn) { a.nmIn = true; a.nmGap = gap; a.nmSpeed = ps; }
      else { a.nmGap = Math.min(a.nmGap, gap); a.nmSpeed = Math.max(a.nmSpeed, ps); }
    } else if (a.nmIn) this.nmExit(a);
  }
  private nmExit(a: Agent): void {
    if (!a.touched && a.v.kinematic && a.speed > 1 && a.nmGap < 1.0 && a.nmGap > -0.05 && a.nmSpeed > NEAR_MISS_SPEED) {
      this.streak = this.time - this.lastNear < 4 ? this.streak + 1 : 1;
      this.lastNear = this.time;
      this.stats.nearMisses++;
      this.d.events.emit('nearMiss', { other: a.v, speed: a.nmSpeed, streak: this.streak });
    }
    a.nmIn = false; a.nmGap = 99; a.nmSpeed = 0; a.touched = false;
  }
}

/**
 * Ndihma e korsisë (skema 'lanes'): ndjek korsinë aktuale me "pure pursuit",
 * ndërron korsi ose kthehet në kryqëzim sipas rrëshqitjeve të lojtarit.
 */
import type { CityWorld, RoadEdge, Vehicle } from '../core/contracts';
import { angleDiff, clamp, fwdX, fwdZ, rightX, rightZ } from '../core/math';
import { type Dir, dirFrom, junctionHalfSize, lanePoint, travelHeading } from '../core/roads';

/** -1 majtas, 0 drejt, 1 djathtas, 2 kthim U (rrugë pa krye). */
export type Turn = -1 | 0 | 1 | 2;

interface Next { edge: RoadEdge; dir: Dir; lane: number; turn: Turn }

const MAXP = 32;

export class LaneAssist {
  edge: RoadEdge | null = null;
  dir: Dir = 1;
  lane = 0;
  next: Next | null = null;
  /** Kthesa që ka kërkuar lojtari për kryqëzimin e ardhshëm. */
  wantTurn: -1 | 0 | 1 = 0;
  /** Dalja: timoni -1..1 dhe shpejtësia e dëshiruar (m/s). */
  steer = 0;
  targetSpeed = 0;
  /** Distanca deri te hyrja e kryqëzimit (m). */
  toJunction = Infinity;

  private px = new Float64Array(MAXP);
  private pz = new Float64Array(MAXP);
  private cum = new Float64Array(MAXP);
  private n = 0;
  private entryS = 0;
  private exitS = 0;
  private prevH = NaN;
  private yaw = 0;
  private s = 0;

  reset() { this.edge = null; this.next = null; this.wantTurn = 0; this.prevH = NaN; }

  /** Gjej rrugën, drejtimin dhe korsinë nga pozicioni dhe drejtimi i makinës. */
  acquire(city: CityWorld, x: number, z: number, h: number): boolean {
    let best: RoadEdge | null = null, bestScore = -Infinity, align = 0;
    for (let i = 0; i < 2; i++) {
      const sx = x + fwdX(h) * 6 * i, sz = z + fwdZ(h) * 6 * i;
      const ne = city.nearestEdge(sx, sz);
      if (!ne) continue;
      const a = ne.edge.axis === 'x' ? fwdX(h) : fwdZ(h);
      const score = Math.abs(a) - ne.dist * 0.03;
      if (score > bestScore) { bestScore = score; best = ne.edge; align = a; }
    }
    if (!best) return false;
    this.edge = best;
    this.dir = align >= 0 ? 1 : -1;
    // Korsia nga zhvendosja anësore (rruga është paralele me boshtin).
    const th = travelHeading(best, this.dir);
    const A = city.nodes[best.a];
    const lat = best.axis === 'x' ? (z - A.z) * rightZ(th) : (x - A.x) * rightX(th);
    this.lane = clamp(Math.floor(lat / best.laneWidth), 0, best.lanes - 1);
    this.build(city);
    return true;
  }

  private push(x: number, z: number) {
    const i = this.n;
    if (i >= MAXP) return;
    this.px[i] = x; this.pz[i] = z;
    this.cum[i] = i === 0 ? 0 : this.cum[i - 1] + Math.hypot(x - this.px[i - 1], z - this.pz[i - 1]);
    this.n++;
  }

  private chooseNext(city: CityWorld): Next {
    const e = this.edge!, end = this.dir === 1 ? e.b : e.a;
    const h = travelHeading(e, this.dir);
    const opts: (Next | undefined)[] = [];   // indeksi = turn + 1
    for (const id of city.nodes[end].edges) {
      if (id === e.id) continue;
      const o = city.edges[id], d = dirFrom(o, end);
      const diff = angleDiff(h, travelHeading(o, d));
      const turn: Turn = Math.abs(diff) < 0.4 ? 0 : diff < 0 ? 1 : -1;
      const lane = turn === 0 ? Math.min(this.lane, o.lanes - 1) : turn === 1 ? o.lanes - 1 : 0;
      opts[turn + 1] = { edge: o, dir: d, lane, turn };
    }
    const w = this.wantTurn;
    return (w !== 0 && opts[w + 1]) || opts[1] || opts[2] || opts[0]
      || { edge: e, dir: (this.dir === 1 ? -1 : 1) as Dir, lane: 0, turn: 2 };
  }

  /** Ndërto polilinjën: korsia aktuale → kurba e kryqëzimit → korsia e ardhshme. */
  private build(city: CityWorld) {
    const e = this.edge!, d = this.dir;
    const end = d === 1 ? e.b : e.a;
    const j = junctionHalfSize(city, city.nodes[end]);
    // Kthesa djathtas është e ngushtë: fillo/mbaro kurbën më larg nga kryqëzimi.
    const nx = this.next = this.chooseNext(city);
    const ne = nx.edge;
    const ext = nx.turn === 1 ? 4.5 : nx.turn === -1 ? 1.5 : 0;
    const t1 = clamp(1 - (j + ext) / e.length, 0.4, 1);
    this.n = 0;
    const p0 = lanePoint(city, e, d, this.lane, 0);
    this.push(p0.x, p0.z);
    const pe = lanePoint(city, e, d, this.lane, t1);
    this.push(pe.x, pe.z);
    this.entryS = this.cum[1];
    const t0 = clamp((j + ext) / ne.length, 0, 0.5);
    const px = lanePoint(city, ne, nx.dir, nx.lane, t0);
    const dist = Math.hypot(px.x - pe.x, px.z - pe.z);
    const k = nx.turn === 2 ? dist * 0.9 + 4 : nx.turn === 0 ? dist / 3 : dist * 0.42;
    const h0 = travelHeading(e, d), h1 = travelHeading(ne, nx.dir);
    const c1x = pe.x + fwdX(h0) * k, c1z = pe.z + fwdZ(h0) * k;
    const c2x = px.x - fwdX(h1) * k, c2z = px.z - fwdZ(h1) * k;
    const SEG = nx.turn === 0 ? 2 : 10;
    for (let i = 1; i <= SEG; i++) {
      const t = i / SEG, u = 1 - t;
      const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, f = t * t * t;
      this.push(a * pe.x + b * c1x + c * c2x + f * px.x, a * pe.z + b * c1z + c * c2z + f * px.z);
    }
    this.exitS = this.cum[this.n - 1];
    const nEnd = nx.dir === 1 ? ne.b : ne.a;
    const jn = junctionHalfSize(city, city.nodes[nEnd]);
    const pf = lanePoint(city, ne, nx.dir, nx.lane, clamp(1 - jn / ne.length, t0 + 0.01, 1));
    this.push(pf.x, pf.z);
  }

  /** Projeksioni mbi polilinjë: kthen distancën anësore; vendos this.s. */
  private project(x: number, z: number): number {
    let bd = Infinity, bs = 0;
    for (let i = 0; i < this.n - 1; i++) {
      const ax = this.px[i], az = this.pz[i], dx = this.px[i + 1] - ax, dz = this.pz[i + 1] - az;
      const L2 = dx * dx + dz * dz || 1e-6;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
      const qx = ax + dx * t - x, qz = az + dz * t - z;
      const d2 = qx * qx + qz * qz;
      if (d2 < bd) { bd = d2; bs = this.cum[i] + (this.cum[i + 1] - this.cum[i]) * t; }
    }
    this.s = bs;
    return Math.sqrt(bd);
  }

  private pointAt(s: number, out: { x: number; z: number; h: number }) {
    const n = this.n;
    s = clamp(s, 0, this.cum[n - 1]);
    let i = 0;
    while (i < n - 2 && this.cum[i + 1] < s) i++;
    const seg = this.cum[i + 1] - this.cum[i] || 1e-6, t = (s - this.cum[i]) / seg;
    const dx = this.px[i + 1] - this.px[i], dz = this.pz[i + 1] - this.pz[i];
    out.x = this.px[i] + dx * t; out.z = this.pz[i] + dz * t; out.h = Math.atan2(dx, dz);
    return out;
  }

  private tmp = { x: 0, z: 0, h: 0 };

  /** Llogarit timonin dhe shpejtësinë e dëshiruar. `boost` 0..1 = gazi (deri +50% mbi kufirin). */
  update(city: CityWorld, v: Vehicle, dt: number, boost: number): boolean {
    const x = v.x, z = v.z, h = v.heading, sp = v.speed;
    // Shpejtësia këndore e matur (s'varemi nga konventa e yawRate).
    if (Number.isFinite(this.prevH) && dt > 0) this.yaw += (angleDiff(this.prevH, h) / dt - this.yaw) * Math.min(1, dt * 12);
    this.prevH = h;
    if (!this.edge && !this.acquire(city, x, z, h)) { this.steer = 0; this.targetSpeed = 0; return false; }
    let off = this.project(x, z);
    const ph = this.pointAt(this.s, this.tmp).h;
    if (off > 9 || (Math.abs(angleDiff(h, ph)) > 2.2 && sp > 1)) {
      if (!this.acquire(city, x, z, h)) return false;
      off = this.project(x, z);
    }
    // Kalo te rruga tjetër pasi mbaron kurba.
    if (this.next && this.s > this.exitS) {
      const nx = this.next;
      if (nx.turn === this.wantTurn) this.wantTurn = 0;
      this.edge = nx.edge; this.dir = nx.dir; this.lane = nx.lane;
      this.build(city);
      this.project(x, z);
    }
    // Pure pursuit drejt pikës përpara.
    const Ld = clamp(4.5 + 0.45 * Math.max(0, sp), 6.5, 14);
    const tp = this.pointAt(this.s + Ld, this.tmp);
    const dx = tp.x - x, dz = tp.z - z;
    const f = dx * fwdX(h) + dz * fwdZ(h), r = dx * rightX(h) + dz * rightZ(h);
    const alpha = Math.atan2(r, f);
    const kappa = (2 * Math.sin(alpha)) / Math.max(4, Math.hypot(dx, dz));
    const wb = Math.max(1.8, v.halfL * 1.2), maxSteer = v.spec.steer || 0.6;
    let st = Math.atan(wb * kappa) / maxSteer;
    st += 0.18 * (this.yaw + sp * kappa);   // korrigjim i lehtë sipas rrotullimit real
    this.steer = sp < -0.3 ? 0 : clamp(st, -1, 1);
    // Shpejtësia: kufiri i rrugës, më ngadalë para kthesave.
    const e = this.edge!;
    let target = e.speedLimit * (1 + 0.5 * clamp(boost, 0, 1));
    this.toJunction = this.entryS - this.s;
    const nx = this.next;
    if (nx) {
      const vt = nx.turn === 2 ? 3.5 : nx.turn === 0 ? nx.edge.speedLimit * (1 + 0.5 * boost) : nx.turn === 1 ? 6 : 7.5;
      if (this.s < this.entryS) target = Math.min(target, Math.sqrt(vt * vt + 2 * 3.2 * this.toJunction));
      else target = Math.min(target, vt);
    }
    this.targetSpeed = target;
    return true;
  }

  /** Rrëshqitje majtas (-1) / djathtas (1). Kthen çfarë ndodhi. */
  swipe(city: CityWorld, side: -1 | 1): 'lane' | 'turn' | 'cancel' | null {
    const e = this.edge;
    if (!e) return null;
    const far = this.s < this.entryS - 18;
    const nl = this.lane + side;
    if (far && nl >= 0 && nl < e.lanes && this.wantTurn === 0) {
      this.lane = nl;
      this.build(city);
      return 'lane';
    }
    if (this.wantTurn === -side) this.wantTurn = 0;
    else this.wantTurn = side;
    // Para kurbës: rindërto që të zgjidhet dalja e re.
    if (this.s < this.entryS - 2) this.build(city);
    return this.wantTurn === 0 ? 'cancel' : 'turn';
  }
}

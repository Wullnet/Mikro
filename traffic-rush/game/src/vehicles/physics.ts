/** Përplasjet: makinë–qytet (OBB kundër AABB) dhe makinë–makinë (SAT me impulse sipas masës). */
import type { CityWorld, CollisionEvent, Obstacle, PhysicsSystem, Vehicle } from '../core/contracts';
import { clamp } from '../core/math';
import { Car } from './car';

const E_WALL = 0.15, E_CAR = 0.2, MU = 0.35, YAWK = 0.7;
const KICK_MIN = 1.5;      // m/s: nën këtë, makina kinematike s'kthehet në dinamike

interface Hit { ov: number; nx: number; nz: number }
const obs: Obstacle[] = [];

function k2c(v: Vehicle): number { return v instanceof Car ? v.k2c : ((2 * v.halfL) ** 2 + (2 * v.halfW) ** 2) / 12; }

/** SAT: OBB e makinës kundër AABB; normalja nga kutia te makina. */
function obbAabb(x: number, z: number, h: number, hl: number, hw: number, o: Obstacle, out: Hit): boolean {
  const fx = Math.sin(h), fz = Math.cos(h), lx = Math.cos(h), lz = -Math.sin(h);
  const bx = (o.minX + o.maxX) / 2, bz = (o.minZ + o.maxZ) / 2, ex = (o.maxX - o.minX) / 2, ez = (o.maxZ - o.minZ) / 2;
  const dx = x - bx, dz = z - bz;
  out.ov = Infinity;
  const axes = [1, 0, 0, 1, fx, fz, lx, lz];
  for (let i = 0; i < 8; i += 2) {
    const ax = axes[i], az = axes[i + 1];
    const rc = hl * Math.abs(fx * ax + fz * az) + hw * Math.abs(lx * ax + lz * az);
    const rb = ex * Math.abs(ax) + ez * Math.abs(az);
    const d = dx * ax + dz * az, ov = rc + rb - Math.abs(d);
    if (ov <= 0) return false;
    if (ov < out.ov) { out.ov = ov; const s = d >= 0 ? 1 : -1; out.nx = ax * s; out.nz = az * s; }
  }
  return true;
}
/** SAT: OBB kundër OBB; normalja nga A te B. */
function obbObb(A: Vehicle, B: Vehicle, out: Hit): boolean {
  const ha = A.heading, hb = B.heading;
  const ax = [Math.sin(ha), Math.cos(ha), Math.cos(ha), -Math.sin(ha), Math.sin(hb), Math.cos(hb), Math.cos(hb), -Math.sin(hb)];
  const dx = B.x - A.x, dz = B.z - A.z;
  out.ov = Infinity;
  for (let i = 0; i < 8; i += 2) {
    const nx = ax[i], nz = ax[i + 1];
    const ra = A.halfL * Math.abs(ax[0] * nx + ax[1] * nz) + A.halfW * Math.abs(ax[2] * nx + ax[3] * nz);
    const rb = B.halfL * Math.abs(ax[4] * nx + ax[5] * nz) + B.halfW * Math.abs(ax[6] * nx + ax[7] * nz);
    const d = dx * nx + dz * nz, ov = ra + rb - Math.abs(d);
    if (ov <= 0) return false;
    if (ov < out.ov) { out.ov = ov; const s = d >= 0 ? 1 : -1; out.nx = nx * s; out.nz = nz * s; }
  }
  return true;
}
/** Këndi më i thellë i makinës në drejtimin (nx,nz). */
function support(v: Vehicle, nx: number, nz: number, o: number[]): void {
  const fx = Math.sin(v.heading), fz = Math.cos(v.heading), lx = Math.cos(v.heading), lz = -Math.sin(v.heading);
  const s1 = fx * nx + fz * nz >= 0 ? 1 : -1, s2 = lx * nx + lz * nz >= 0 ? 1 : -1;
  o[0] = v.x + fx * v.halfL * s1 + lx * v.halfW * s2;
  o[1] = v.z + fz * v.halfL * s1 + lz * v.halfW * s2;
}

function addDamage(v: Vehicle, imp: number, k: number): void {
  if (imp < 2.5) return;
  v.damage = clamp(v.damage + Math.min(0.4, (imp - 2.5) * 0.02 * k), 0, 1);
}

export class Physics implements PhysicsSystem {
  readonly vehicles: Vehicle[] = [];
  private hit: Hit = { ov: 0, nx: 0, nz: 0 };
  private p = [0, 0]; private q = [0, 0];

  add(v: Vehicle): void { if (!this.vehicles.includes(v)) this.vehicles.push(v); }
  remove(v: Vehicle): void { const i = this.vehicles.indexOf(v); if (i >= 0) this.vehicles.splice(i, 1); }

  step(dt: number, city: CityWorld): CollisionEvent[] {
    const ev: CollisionEvent[] = [];
    const vs = this.vehicles;
    for (const v of vs) {
      if (v instanceof Car) {
        if (!v.kinematic && !v.driven) v.coast(dt);
        v.driven = false;
        v.groundY = city.groundHeight(v.x, v.z);
      }
    }
    // 1) makinë – qytet
    for (const v of vs) if (!v.kinematic) this.vsCity(v, city, ev);
    // 2) makinë – makinë (broadphase me distancë)
    const n = vs.length;
    for (let i = 0; i < n; i++) {
      const A = vs[i], ra = A.halfL + 0.2;
      for (let j = i + 1; j < n; j++) {
        const B = vs[j];
        if (A.kinematic && B.kinematic) continue;
        const r = ra + B.halfL;
        if (Math.abs(A.x - B.x) > r || Math.abs(A.z - B.z) > r) continue;
        if (obbObb(A, B, this.hit)) this.resolvePair(A, B, ev);
      }
    }
    return ev;
  }

  private vsCity(v: Vehicle, city: CityWorld, ev: CollisionEvent[]): void {
    const R = Math.hypot(v.halfL, v.halfW);
    let px = v.x, pz = v.z;
    if (v instanceof Car) { px = v.prevX; pz = v.prevZ; }
    const dist = Math.hypot(v.x - px, v.z - pz);
    const steps = dist > 0.6 && dist < 30 ? Math.ceil(dist / 0.6) : 1;
    const ex = v.x, ez = v.z;
    const cnt = city.queryObstacles(Math.min(px, ex) - R, Math.min(pz, ez) - R, Math.max(px, ex) + R, Math.max(pz, ez) + R, obs);
    if (!cnt) return;
    // CCD e thjeshtë: kontrollo pozicionet e ndërmjetme
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const x = steps === 1 ? ex : px + (ex - px) * t, z = steps === 1 ? ez : pz + (ez - pz) * t;
      let any = false;
      for (let i = 0; i < cnt; i++) if (obbAabb(x, z, v.heading, v.halfL, v.halfW, obs[i], this.hit)) { any = true; break; }
      if (any) { v.x = x; v.z = z; break; }
    }
    for (let it = 0; it < 3; it++) {
      let resolved = true;
      for (let i = 0; i < cnt; i++) {
        const o = obs[i];
        if (!obbAabb(v.x, v.z, v.heading, v.halfL, v.halfW, o, this.hit)) continue;
        resolved = false;
        const { ov, nx, nz } = this.hit;
        v.x += nx * ov; v.z += nz * ov;
        support(v, -nx, -nz, this.p);
        const cx = clamp(this.p[0], o.minX, o.maxX), cz = clamp(this.p[1], o.minZ, o.maxZ);
        const rx = cx - v.x, rz = cz - v.z, k2 = k2c(v);
        const vpx = v.vx + v.yawRate * rz, vpz = v.vz - v.yawRate * rx;
        const vn = vpx * nx + vpz * nz;
        if (vn >= 0) continue;
        const c = rz * nx - rx * nz;
        const j = -(1 + E_WALL) * vn / (1 + (c * c) / k2);
        v.vx += j * nx; v.vz += j * nz; v.yawRate += (j * c / k2) * YAWK;
        const tx = -nz, tz = nx, vt = vpx * tx + vpz * tz, ct = rz * tx - rx * tz;
        const jt = clamp(-vt / (1 + (ct * ct) / k2), -MU * j, MU * j);
        v.vx += jt * tx; v.vz += jt * tz; v.yawRate += (jt * ct / k2) * YAWK;
        const imp = -vn;
        addDamage(v, imp, Math.sqrt(1400 / v.spec.mass) * 1.1);
        if (imp > 0.5) ev.push({ a: v, b: null, impulse: imp, x: cx, z: cz });
      }
      if (resolved) break;
    }
  }

  private resolvePair(A: Vehicle, B: Vehicle, ev: CollisionEvent[]): void {
    const { ov, nx, nz } = this.hit;
    support(A, nx, nz, this.p); support(B, -nx, -nz, this.q);
    const px = (this.p[0] + this.q[0]) / 2, pz = (this.p[1] + this.q[1]) / 2;
    const rAx = px - A.x, rAz = pz - A.z, rBx = px - B.x, rBz = pz - B.z;
    const vAx = A.vx + A.yawRate * rAz, vAz = A.vz - A.yawRate * rAx;
    const vBx = B.vx + B.yawRate * rBz, vBz = B.vz - B.yawRate * rBx;
    const vrel = (vBx - vAx) * nx + (vBz - vAz) * nz;
    // makina kinematike: kthehet në dinamike vetëm nga goditje të forta
    if (vrel < -KICK_MIN) { if (A.kinematic) A.kinematic = false; if (B.kinematic) B.kinematic = false; }
    const iA = A.kinematic ? 0 : 1 / A.spec.mass, iB = B.kinematic ? 0 : 1 / B.spec.mass;
    if (iA + iB === 0) return;
    A.x -= nx * ov * iA / (iA + iB); A.z -= nz * ov * iA / (iA + iB);
    B.x += nx * ov * iB / (iA + iB); B.z += nz * ov * iB / (iA + iB);
    if (vrel >= 0) return;
    const kA = k2c(A), kB = k2c(B);
    const cA = rAz * nx - rAx * nz, cB = rBz * nx - rBx * nz;
    const den = iA + iB + cA * cA * iA / kA + cB * cB * iB / kB;
    const j = -(1 + E_CAR) * vrel / den;
    A.vx -= j * nx * iA; A.vz -= j * nz * iA; A.yawRate -= (j * cA * iA / kA) * YAWK;
    B.vx += j * nx * iB; B.vz += j * nz * iB; B.yawRate += (j * cB * iB / kB) * YAWK;
    // fërkimi tangjencial
    const tx = -nz, tz = nx;
    const vt = (vBx - vAx) * tx + (vBz - vAz) * tz;
    const ctA = rAz * tx - rAx * tz, ctB = rBz * tx - rBx * tz;
    const dt = iA + iB + ctA * ctA * iA / kA + ctB * ctB * iB / kB;
    const jt = clamp(-vt / dt, -MU * j, MU * j);
    A.vx -= jt * tx * iA; A.vz -= jt * tz * iA; A.yawRate -= (jt * ctA * iA / kA) * YAWK;
    B.vx += jt * tx * iB; B.vz += jt * tz * iB; B.yawRate += (jt * ctB * iB / kB) * YAWK;
    const imp = -vrel, mA = A.spec.mass, mB = B.spec.mass;
    addDamage(A, imp, (2 * mB) / (mA + mB));
    addDamage(B, imp, (2 * mA) / (mA + mB));
    if (imp > 0.5) ev.push({ a: A, b: B, impulse: imp, x: px, z: pz });
  }
}

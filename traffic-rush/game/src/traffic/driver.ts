/**
 * Shofer AI për makina me fizikë (policia në ndjekje, makina e skriptuar e demos).
 * Rruga me A* kur objektivi është larg, ndjekje e drejtpërdrejtë kur është afër, "mustaqe" kundër pengesave.
 */
import type { CityWorld, Obstacle, Vec2, Vehicle, VehicleInput } from '../core/contracts';
import { angleDiff, clamp, headingOf } from '../core/math';
import { findRoute } from '../core/roads';

const obs: Obstacle[] = [];

export class AiDriver {
  input: VehicleInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false, horn: false };
  route: Vec2[] = [];
  private wp = 0;
  private routeT = 0;
  private stuckT = 0;
  private revT = 0;
  private revSteer = 0;
  /** Zhvendosja djathtas nga vija qendrore kur ndjek rrugën (m). */
  laneOffset = 0;
  cruise = 0;   // 0 = shpejtësia maksimale

  constructor(readonly v: Vehicle, private city: CityWorld) {}

  /** Llogarit komandat për drejt objektivit (tx,tz) me shpejtësi objektivi (tvx,tvz). */
  update(dt: number, tx: number, tz: number, tvx: number, tvz: number, directRange = 70): VehicleInput {
    const v = this.v, inp = this.input;
    const dist = Math.hypot(tx - v.x, tz - v.z);
    let gx = tx, gz = tz, near = dist < directRange;
    if (near) {
      // parashikim i pozicionit
      const k = Math.min(1.2, dist / 25);
      gx += tvx * k; gz += tvz * k;
    } else {
      this.routeT -= dt;
      if (this.routeT <= 0 || this.wp >= this.route.length) this.replan(tx, tz);
      while (this.wp < this.route.length - 1 && Math.hypot(this.route[this.wp].x - v.x, this.route[this.wp].z - v.z) < 12) this.wp++;
      const p = this.route[this.wp] ?? { x: tx, z: tz };
      gx = p.x; gz = p.z;
      if (this.laneOffset && this.wp > 0) {
        const q = this.route[this.wp - 1], h = headingOf(p.x - q.x, p.z - q.z);
        gx += -Math.cos(h) * this.laneOffset; gz += Math.sin(h) * this.laneOffset;
      }
    }
    const want = headingOf(gx - v.x, gz - v.z);
    const diff = angleDiff(v.heading, want);
    let steer = clamp(-diff * 2.2 - v.yawRate * 0.25, -1, 1);
    // mustaqet
    const sp = Math.max(0, v.speed);
    const look = 5 + sp * 0.55;
    const r = look + 2;
    const n = this.city.queryObstacles(v.x - r, v.z - r, v.x + r, v.z + r, obs);
    const hitL = this.ray(v, 0.35, look, n), hitC = this.ray(v, 0, look, n), hitR = this.ray(v, -0.35, look, n);
    if (hitL < hitR) steer += 0.7 * (1 - hitL / look);
    else if (hitR < hitL) steer -= 0.7 * (1 - hitR / look);
    else if (hitC < look) steer += steer >= 0 ? 0.6 : -0.6;
    steer = clamp(steer, -1, 1);

    let target = this.cruise > 0 ? this.cruise : v.spec.topSpeed * 0.95;
    if (Math.abs(diff) > 0.5) target = Math.min(target, 9 + 14 * (1 - Math.min(1, Math.abs(diff) / 1.5)));
    if (hitC < look) target = Math.min(target, 4 + hitC * 0.8);
    if (near && dist < 18) target = Math.min(target, Math.hypot(tvx, tvz) + 2 + dist * 0.6);
    if (!near && this.route.length > this.wp + 1) {
      // ngadalëso para kthesës së radhës
      const p = this.route[this.wp], q = this.route[this.wp + 1];
      const turn = Math.abs(angleDiff(headingOf(p.x - v.x, p.z - v.z), headingOf(q.x - p.x, q.z - p.z)));
      const d = Math.hypot(p.x - v.x, p.z - v.z);
      if (turn > 0.6) target = Math.min(target, Math.sqrt(9 * 9 + 2 * 5 * Math.max(0, d - 8)));
    }

    // ngecur → mbrapa
    if (this.revT > 0) {
      this.revT -= dt;
      inp.throttle = 0; inp.brake = 1; inp.steer = this.revSteer; inp.handbrake = false;
      return inp;
    }
    if (inp.throttle > 0.4 && sp < 1) this.stuckT += dt; else this.stuckT = Math.max(0, this.stuckT - dt * 2);
    if (this.stuckT > 1.4) { this.stuckT = 0; this.revT = 1.3; this.revSteer = steer > 0 ? -1 : 1; }

    const err = target - sp;
    inp.throttle = err > 0 ? clamp(err * 0.4, 0.25, 1) : 0;
    inp.brake = err < -1.5 ? clamp(-err * 0.15, 0, 1) : 0;
    if (inp.brake > 0 && sp < 1) inp.brake = 0;
    inp.steer = steer;
    inp.handbrake = false;
    return inp;
  }

  replan(tx: number, tz: number): void {
    const r = findRoute(this.city, { x: this.v.x, z: this.v.z }, { x: tx, z: tz });
    this.route = r.points.slice(1);
    this.wp = 0;
    this.routeT = 2;
  }

  /** Distanca deri te pengesa e parë përgjatë një rrezeje (kënd relativ `a`, +majtas). */
  private ray(v: Vehicle, a: number, len: number, n: number): number {
    const h = v.heading + a, fx = Math.sin(h), fz = Math.cos(h);
    const x0 = v.x + Math.sin(v.heading) * v.halfL, z0 = v.z + Math.cos(v.heading) * v.halfL;
    for (let d = 1; d <= len; d += 1.5) {
      const x = x0 + fx * d, z = z0 + fz * d;
      for (let i = 0; i < n; i++) {
        const o = obs[i];
        if (o.kind === 'tree' && o.maxX - o.minX < 1) continue;
        if (x > o.minX - 0.4 && x < o.maxX + 0.4 && z > o.minZ - 0.4 && z < o.maxZ + 0.4) return d;
      }
    }
    return 99;
  }
}

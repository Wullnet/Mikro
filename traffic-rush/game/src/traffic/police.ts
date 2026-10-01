/** Policia: patrulla kur s'ka kërkim, ndjekje me fizikë, arrestim dhe shmangie. */
import * as THREE from 'three';
import type { FrameContext, PoliceSystem, Vehicle } from '../core/contracts';
import { clamp } from '../core/math';
import { POLICE_CAR } from '../data/catalog';
import { AiDriver } from './driver';
import type { Agent, Traffic, TrafficDeps } from './traffic';

interface Unit { v: Vehicle; ai: AiDriver; outT: number }

export class Police implements PoliceSystem {
  wanted = 0;
  bustedProgress = 0;
  readonly units: Vehicle[] = [];
  private pursuers: Unit[] = [];
  private heat = 0;
  private evadeT = 0;
  private spawnT = 0;
  private lastReason = ''; private lastReasonT = -9;
  private time = 0;
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private sph = new THREE.Sphere();

  constructor(private d: TrafficDeps, private traffic: Traffic | null) {}

  private setWanted(level: number): void {
    level = clamp(Math.round(level), 0, 5);
    if (level === this.wanted) return;
    this.wanted = level;
    this.evadeT = 0;
    this.d.events.emit('wanted', { level });
  }

  addHeat(amount: number, reason: string): void {
    // e njëjta arsye shumë shpesh (p.sh. kontakt i vazhdueshëm) llogaritet një herë
    if (reason === this.lastReason && this.time - this.lastReasonT < 1.5) return;
    this.lastReason = reason; this.lastReasonT = this.time;
    this.heat = clamp(Math.max(this.heat, this.wanted) + amount, 0, 5.4);
    this.setWanted(Math.min(5, Math.floor(this.heat + 0.4)));
  }

  startPursuit(level: number): void {
    this.heat = clamp(level, 1, 5);
    this.setWanted(this.heat);
  }

  stop(): void {
    this.heat = 0;
    this.setWanted(0);
    this.bustedProgress = 0;
    for (const u of [...this.pursuers]) this.removeUnit(u);
  }

  private removeUnit(u: Unit): void {
    const i = this.pursuers.indexOf(u);
    if (i >= 0) this.pursuers.splice(i, 1);
    this.d.scene.remove(u.v.object3d);
    this.d.physics.remove(u.v);
    u.v.dispose();
  }

  private addUnit(v: Vehicle): void {
    v.kinematic = false;
    const ai = new AiDriver(v, this.d.city);
    this.pursuers.push({ v, ai, outT: 0 });
  }

  private visible(x: number, z: number): boolean {
    this.sph.center.set(x, 1, z); this.sph.radius = 3;
    return this.frustum.intersectsSphere(this.sph);
  }

  /** Krijon një njësi ndjekëse 150–250 m larg, mundësisht jashtë pamjes. */
  private spawnPursuer(px: number, pz: number): void {
    const t = this.traffic;
    if (!t) return;
    const a = t.trySpawn(px, pz, POLICE_CAR, true, 150, 250);
    if (!a) return;
    a.v.lights.siren = true;
    t.removeAgent(a, true);
    this.addUnit(a.v);
  }

  update(ctx: FrameContext): void {
    const dt = ctx.dt, p = ctx.player;
    this.time = ctx.time;
    this.m4.multiplyMatrices(ctx.camera.projectionMatrix, ctx.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.m4);
    const t = this.traffic;
    const px = p ? p.x : this.d.city.playerSpawn.x, pz = p ? p.z : this.d.city.playerSpawn.z;

    if (this.wanted > 0 && p) {
      // patrullat afër bëhen ndjekëse
      if (t) for (let i = t.patrols.length - 1; i >= 0; i--) {
        const a: Agent = t.patrols[i];
        if (a.v.kinematic && Math.hypot(a.v.x - px, a.v.z - pz) < 160 && this.pursuers.length < Math.min(5, 1 + this.wanted)) {
          t.removeAgent(a, true);
          this.addUnit(a.v);
        }
      }
      this.spawnT -= dt;
      if (this.pursuers.length < Math.min(5, 1 + this.wanted) && this.spawnT <= 0) { this.spawnT = 1.2; this.spawnPursuer(px, pz); }
    } else if (t) {
      // patrulla të qeta
      const want = ctx.quality === 'low' ? 1 : 2;
      if (t.patrols.length < want && Math.random() < 0.05) t.trySpawn(px, pz, POLICE_CAR, true, 90, 220);
    }

    // drejtimi i njësive
    let nearest = Infinity;
    for (let i = this.pursuers.length - 1; i >= 0; i--) {
      const u = this.pursuers[i], v = u.v;
      const d = Math.hypot(v.x - px, v.z - pz);
      u.outT = this.visible(v.x, v.z) ? 0 : u.outT + dt;
      if (this.wanted === 0 || !p) {
        // ndjekja mbaroi: ndalo dhe largohu kur s'shihet
        v.lights.siren = false;
        v.drive({ throttle: 0, brake: 0.6, steer: 0, handbrake: false, nitro: false, horn: false }, dt);
        if ((u.outT > 2 && d > 40) || d > 260) this.removeUnit(u);
        continue;
      }
      if (d > 320 && u.outT > 1) { this.removeUnit(u); continue; }
      nearest = Math.min(nearest, d);
      v.lights.siren = true;
      v.lights.head = true;
      const inp = u.ai.update(dt, p.x, p.z, p.vx, p.vz);
      v.lights.brake = inp.brake > 0.1 && v.speed > 0.5;
      v.lights.reverse = v.speed < -0.3;
      v.drive(inp, dt);
    }

    // arrestimi
    if (this.wanted > 0 && p) {
      if (Math.abs(p.speed) < 2 && nearest < 7) this.bustedProgress = Math.min(1, this.bustedProgress + dt / 3);
      else this.bustedProgress = Math.max(0, this.bustedProgress - dt / 1.5);
      if (this.bustedProgress >= 1) {
        const fine = 5000 * this.wanted;
        this.d.events.emit('busted', { fine });
        this.stop();
      }
      // shmangia
      if (nearest > 140) {
        this.evadeT += dt;
        if (this.evadeT > 10 + 3 * this.wanted) {
          this.heat = this.wanted - 1;
          this.setWanted(this.wanted - 1);
        }
      } else this.evadeT = 0;
    } else this.bustedProgress = 0;

    // lista e njësive (ndjekëse + patrulla)
    this.units.length = 0;
    for (const u of this.pursuers) this.units.push(u.v);
    if (t) for (const a of t.patrols) this.units.push(a.v);
  }
}

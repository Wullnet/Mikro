/** Makina: gjendja, fizika arcade (model biçiklete) dhe pamja (rrotat, dritat, varja). */
import * as THREE from 'three';
import type { FrameContext, Upgrades, Vehicle, VehicleInput, VehicleLights, VehicleSpec } from '../core/contracts';
import { angleDiff, clamp, lerp } from '../core/math';
import { CH, NCH, getDetailMaterial, getGlowAlpha, getPaint, getTaxiMaterial, makeDecalTexture, randomPlate } from './geo';
import { getModel, type CarModel } from './models';
import { axleSpan } from './styles';

const G = 9.81;
const CRR = 0.16;          // rezistenca e rrotullimit (m/s²)
const REV_MAX = 8;
const GEARS5 = [0.22, 0.38, 0.56, 0.78, 1.08];
const GEARS6 = [0.18, 0.31, 0.45, 0.61, 0.8, 1.08];

/** Teksturë 32×1 me ngjyrat e dritave të një makine. */
class LightTex {
  readonly data = new Uint8Array(NCH * 4);
  readonly tex: THREE.DataTexture;
  readonly glowTex: THREE.Texture;
  private dirty = true;
  constructor() {
    this.tex = new THREE.DataTexture(this.data, NCH, 1);
    this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.needsUpdate = true;
    this.glowTex = this.tex.clone();
    this.glowTex.channel = 1;
  }
  set(ch: number, r: number, g: number, b: number): void {
    const i = ch * 4, R = Math.round(r * 255), Gg = Math.round(g * 255), B = Math.round(b * 255);
    if (this.data[i] !== R || this.data[i + 1] !== Gg || this.data[i + 2] !== B || this.data[i + 3] !== 255) {
      this.data[i] = R; this.data[i + 1] = Gg; this.data[i + 2] = B; this.data[i + 3] = 255; this.dirty = true;
    }
  }
  commit(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.tex.needsUpdate = true; this.glowTex.needsUpdate = true;
  }
  dispose(): void { this.tex.dispose(); this.glowTex.dispose(); }
}

const IDLE: VehicleInput = { throttle: 0, brake: 0.35, steer: 0, handbrake: false, nitro: false, horn: false };

export class Car implements Vehicle {
  readonly spec: VehicleSpec;
  readonly object3d = new THREE.Group();
  x = 0; z = 0; heading = 0; vx = 0; vz = 0; yawRate = 0;
  damage = 0; nitroFuel = 1;
  lights: VehicleLights = { head: false, brake: false, reverse: false, left: false, right: false, hazard: false, siren: false };
  kinematic = true;
  color: number;
  upgrades: Upgrades = { engine: 0, brakes: 0, handling: 0, nitro: 0 };
  readonly halfW: number; readonly halfL: number;
  readonly lod: 'high' | 'low';
  readonly model: CarModel;
  /** Distancat qendër→bosht i përparmë (a) / i pasmë (b), gjysmë-gjurma, rrezja e rrotës. */
  readonly a: number; readonly b: number; readonly track: number; readonly wheelR: number;
  readonly k2: number;       // inercia/masë (m²) për modelin e biçikletës
  readonly k2c: number;      // inercia/masë për përplasjet
  // gjendje e brendshme (e përdor PhysicsSystem)
  groundY = 0; prevX = 0; prevZ = 0; driven = false; noReverse = false;
  /** Këndi aktual i rrotave (rad, + = majtas). */
  steerAngle = 0;
  nitroActive = false;
  private _skid = 0; private _rpm = 0.14; private _gear = 1;
  private shiftT = 0; private driftT = 0;
  private gears: number[];
  // pamja
  private bodyPivot = new THREE.Group();
  private paintMesh: THREE.Mesh;
  private lt: LightTex;
  private litMat: THREE.MeshBasicMaterial;
  private glowMesh: THREE.Mesh | null = null;
  private glowMat: THREE.MeshBasicMaterial | null = null;
  private decalTex: THREE.CanvasTexture | null = null;
  private decalMat: THREE.Material | null = null;
  private wheelObjs: { pivot: THREE.Object3D; mesh: THREE.Object3D; steer: boolean }[] = [];
  private spin = 0; private roll = 0; private rollV = 0; private pitch = 0; private pitchV = 0;
  private lastHeading = 0; private lastSpeed = 0; private lonAcc = 0; private damagedLook = false;
  private visYaw = 0;

  constructor(spec: VehicleSpec, color: number, lod: 'high' | 'low') {
    this.spec = spec; this.color = color; this.lod = lod;
    const m = this.model = getModel(spec.body, lod === 'low');
    const st = m.st;
    this.halfW = Math.max(...(st.width ?? [[0, 1]]).map(p => p[1])) * st.W + 0.02;
    this.halfL = st.L / 2;
    const span = axleSpan(st);
    this.a = span.a; this.b = span.b; this.track = st.track; this.wheelR = st.R;
    this.k2 = this.a * this.b * 0.95;
    this.k2c = ((2 * this.halfL) ** 2 + (2 * this.halfW) ** 2) / 12;
    this.gears = (spec.body === 'sport' ? GEARS6 : GEARS5).map(r => r * spec.topSpeed);

    // pamja
    const low = lod === 'low';
    const inner = new THREE.Group();
    inner.position.y = -st.cgH;
    this.bodyPivot.position.y = st.cgH;
    this.bodyPivot.add(inner);
    this.object3d.add(this.bodyPivot);
    this.paintMesh = new THREE.Mesh(m.paint, getPaint(color, false, low));
    inner.add(this.paintMesh, new THREE.Mesh(m.detail, getDetailMaterial()));
    this.lt = new LightTex();
    this.litMat = new THREE.MeshBasicMaterial({ map: this.lt.tex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    if (m.lights) inner.add(new THREE.Mesh(m.lights, this.litMat));
    if (m.decal) {
      this.decalTex = makeDecalTexture(m.decalKind, randomPlate());
      this.decalMat = new THREE.MeshStandardMaterial({ map: this.decalTex, roughness: 0.5, alphaTest: 0.5, emissive: 0xffffff, emissiveMap: this.decalTex, emissiveIntensity: 0.12, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      inner.add(new THREE.Mesh(m.decal, this.decalMat));
    }
    if (m.sign) inner.add(new THREE.Mesh(m.sign, getTaxiMaterial()));
    if (m.glow) {
      this.glowMat = new THREE.MeshBasicMaterial({ map: this.lt.glowTex, alphaMap: getGlowAlpha(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const gm = this.glowMesh = new THREE.Mesh(m.glow, this.glowMat);
      gm.renderOrder = 2; gm.visible = false;
      // shkëlqimi s'hedh hije edhe nëse dikush i vendos castShadow të gjithave
      Object.defineProperty(gm, 'castShadow', { get: () => false, set: () => { /* asgjë */ } });
      inner.add(gm);
    }
    if (m.wheelR && m.wheelL) {
      for (const w of m.wheels) {
        const pivot = new THREE.Group();
        pivot.position.set(w.x, w.y, w.z);
        const mesh = new THREE.Mesh(w.x > 0 ? m.wheelR : m.wheelL, getDetailMaterial());
        pivot.add(mesh);
        this.object3d.add(pivot);
        this.wheelObjs.push({ pivot, mesh, steer: w.steer });
      }
    }
    this.object3d.userData.vehicle = this;
    this.updateLights(0, false);
  }

  get speed(): number { return this.vx * Math.sin(this.heading) + this.vz * Math.cos(this.heading); }
  get skid(): number { return this._skid; }
  get rpm(): number { return this._rpm; }
  get gear(): number { return this._gear; }
  get mass(): number { return this.spec.mass; }

  setPose(x: number, z: number, heading: number, speed: number): void {
    this.prevX = this.x; this.prevZ = this.z;
    this.x = x; this.z = z; this.heading = heading;
    this.vx = Math.sin(heading) * speed; this.vz = Math.cos(heading) * speed;
  }

  drive(inp: VehicleInput, dt: number): void {
    if (this.kinematic) return;
    this.driven = true;
    this.prevX = this.x; this.prevZ = this.z;
    const n = Math.max(1, Math.ceil(dt * 60 - 0.01)), h = dt / n;
    for (let i = 0; i < n; i++) this.integrate(inp, h);
  }
  /** Rrëshqitje pa shofer (p.sh. makinë trafiku e goditur). */
  coast(dt: number): void { this.noReverse = true; this.drive(IDLE, dt); this.noReverse = false; }

  private integrate(inp: VehicleInput, h: number): void {
    const s = this.spec, up = this.upgrades;
    const sinH = Math.sin(this.heading), cosH = Math.cos(this.heading);
    let u = this.vx * sinH + this.vz * cosH;     // përpara
    let v = this.vx * cosH - this.vz * sinH;     // majtas
    let w = this.yawRate;
    const a = this.a, b = this.b, wb = a + b;
    const absU = Math.abs(u);
    const thr = clamp(inp.throttle, 0, 1), brk = clamp(inp.brake, 0, 1);

    // motori, nitro, kufiri i shpejtësisë
    const eng = 1 + 0.08 * up.engine, nk = 1 + 0.08 * up.nitro;
    const nitro = s.nitro && inp.nitro && this.nitroFuel > 0.01;
    this.nitroActive = nitro;
    if (s.nitro) this.nitroFuel = nitro ? Math.max(0, this.nitroFuel - h / (5 * nk)) : Math.min(1, this.nitroFuel + h * 0.035);
    const nb = nitro ? 1 + 0.5 * nk : 1;
    const vTopB = s.topSpeed * eng * (1 - 0.25 * this.damage);
    const vTop = vTopB * (nitro ? 1 + 0.15 * nk : 1);
    const vk = 6.3 + 0.33 * s.accel;   // shpejtësia ku fuqia fillon të kufizojë nxitimin
    const A = s.accel * eng * nb, P = s.accel * eng * vk * nb;
    const vt = vTopB * 1.05, Pb = s.accel * eng * vk;
    const kd = Math.max(0, (Pb / vt - CRR) / (vt * vt));
    const Bk = (6 + 0.3 * s.brake) * (1 + 0.08 * up.brakes);

    let drive = 0, decel = CRR + kd * u * u;
    if (this._gear === -1) {
      if (thr > 0.05 && u < -0.3) decel += Bk * thr;
      else if (thr > 0.05) this._gear = 1;
      if (brk > 0.05 && u > -REV_MAX && this._gear === -1) drive = -A * 0.5 * brk;
    } else if (brk > 0.05 && u < 0.8 && thr < 0.05 && !this.noReverse) {
      this._gear = -1; drive = -A * 0.5 * brk;
    } else {
      decel += Bk * brk;
      drive = thr * Math.min(A, P / Math.max(absU, 1)) * clamp((vTop - u) / 0.6, 0, 1);
      if (this.shiftT > 0) drive *= 0.3;
    }
    const hb = inp.handbrake && absU > 1;
    if (hb) decel += 4.5;

    // drejtimi sipas shpejtësisë
    const steerMax = s.steer * (1 + 0.05 * up.handling) / (1 + absU / 14);
    const target = -clamp(inp.steer, -1, 1) * steerMax;
    this.steerAngle += clamp(target - this.steerAngle, -3.5 * h, 3.5 * h);
    const d = this.steerAngle;

    // forcat anësore (gomat)
    const mu = s.grip * (1 + 0.08 * up.handling) * 1.2;
    if (hb) this.driftT = 0.7; else this.driftT = Math.max(0, this.driftT - h);
    const beta = absU > 1 ? Math.atan2(Math.abs(v), absU) : 0;
    // drift i kontrollueshëm: gazi e mban, kundër-timoni dhe heqja e gazit e mbyllin
    if (!hb && this.driftT > 0 && beta > 0.15 && thr > 0.3) this.driftT = Math.max(this.driftT, 0.15);
    const drifting = hb || this.driftT > 0;
    let rearMu = 1, frontMu = 1;
    if (hb) { rearMu = 0.5; frontMu = 0.9; }
    else if (this.driftT > 0 && beta > 0.08) { rearMu = lerp(0.95, 0.68, thr); frontMu = 0.95; }
    const maxF = mu * G * b / wb * frontMu, maxR = mu * G * a / wb * rearMu;
    const Cf = maxF / 0.12, Cr = (maxR / 0.1) * (hb ? 0.6 : 1);
    let Fyf = 0, Fyr = 0;
    if (absU > 0.3) {
      const sg = u >= 0 ? 1 : -1;
      const af = Math.atan2(v + a * w, absU) - d * sg;
      const ar = Math.atan2(v - b * w, absU);
      Fyf = clamp(-Cf * af, -maxF, maxF);
      Fyr = clamp(-Cr * ar, -maxR, maxR);
    }
    const sp0 = Math.hypot(u, v);
    const cd = Math.cos(d), sd = Math.sin(d);
    const du = -Fyf * sd + v * w;
    const dv = Fyf * cd + Fyr - u * w;
    const dw = (a * Fyf * cd - b * Fyr) / this.k2;
    u += du * h; v += dv * h; w += dw * h;
    if (drifting) {
      // ruaj vrullin gjatë driftit (humbje maks. 2.5 m/s²)
      const sp1 = Math.hypot(u, v), lim = sp0 - 2.5 * h;
      if (sp1 > 1e-3 && sp1 < lim) { u *= lim / sp1; v *= lim / sp1; }
      // kontroll arcade: timoni cakton rrotullimin; këndi i rrëshqitjes kufizohet (~60°)
      if (!hb) w = lerp(w, -clamp(inp.steer, -1, 1) * 1.5 * clamp(absU / 10, 0, 1), 1 - Math.exp(-2.5 * h));
      if (beta > 0.85 && v * w < 0) w *= Math.exp(-7 * h);
      w = clamp(w, -2.2, 2.2);
    } else if (absU > 3) {
      // stabilizim arcade: shpejtësia e kthimit s'kalon kufirin e kapjes
      const wMax = (mu * G) / absU * 1.15;
      if (Math.abs(w) > wMax) w = Math.sign(w) * lerp(Math.abs(w), wMax, 1 - Math.exp(-8 * h));
    }
    // shpejtësi e ulët → model kinematik
    const kin = clamp((absU - 1.5) / 3, 0, 1);
    w = lerp(u * Math.tan(d) / wb, w, kin);
    v *= lerp(Math.max(0, 1 - 12 * h), 1, kin);
    if (beta > 1.1) w *= Math.exp(-2.5 * h);
    // gjatësore
    u += drive * h;
    const dd = decel * h;
    if (drive === 0 || Math.sign(drive) !== Math.sign(u)) { if (Math.abs(u) <= dd) u = 0; else u -= Math.sign(u) * dd; }
    else u -= Math.sign(u) * dd;
    if (u === 0 && drive === 0) { v *= Math.max(0, 1 - 6 * h); w *= Math.max(0, 1 - 6 * h); }

    // ekuacionet janë në sistemin e makinës: kthe në botë me drejtimin e ri
    this.yawRate = w;
    this.heading += w * h;
    if (this.heading > Math.PI) this.heading -= Math.PI * 2; else if (this.heading < -Math.PI) this.heading += Math.PI * 2;
    const s2 = Math.sin(this.heading), c2 = Math.cos(this.heading);
    this.vx = u * s2 + v * c2; this.vz = u * c2 - v * s2;
    this.x += this.vx * h; this.z += this.vz * h;

    // marshi automatik dhe rrotullimet
    this.shiftT -= h;
    const au = Math.abs(u);
    if (this._gear > 0) {
      const N = this.gears.length, top = this.gears[this._gear - 1] * eng;
      if (au > top * 0.95 && this._gear < N && this.shiftT <= -0.25) { this._gear++; this.shiftT = 0.18; }
      else if (this._gear > 1 && au < this.gears[this._gear - 2] * eng * 0.6) { this._gear--; this.shiftT = 0.08; }
    } else if (u > 0.5) this._gear = 1;
    const r = this._gear > 0 ? au / (this.gears[this._gear - 1] * eng) : au / REV_MAX;
    const rt = clamp(Math.max(r, 0.14 + (this._gear === 1 ? 0.45 * thr * (1 - clamp(r * 1.5, 0, 1)) : 0)), 0.14, 1);
    this._rpm += (rt - this._rpm) * Math.min(1, h * (this.shiftT > 0 ? 25 : 12));

    // rrëshqitja (për zërin dhe tymin)
    const vr = Math.abs(v - b * w);
    let sk = clamp((vr - 1.3) / 4.5, 0, 1);
    if (brk > 0.7 && au > 8 && this._gear > 0) sk = Math.max(sk, 0.3 * brk);
    if (hb && au > 3) sk = Math.max(sk, 0.45);
    if (thr > 0.9 && au < 6 && A > 9.5) sk = Math.max(sk, 0.4 * (1 - au / 6));
    this._skid += (sk - this._skid) * Math.min(1, h * 10);
  }

  // ---------------------------------------------------------------- pamja
  syncVisual(dt: number, ctx: FrameContext): void {
    const o = this.object3d;
    o.position.set(this.x, this.groundY, this.z);
    o.rotation.y = this.heading;
    const spd = this.speed;
    if (dt > 0) {
      if (this.kinematic) {
        const dh = angleDiff(this.lastHeading, this.heading);
        const yr = Math.abs(dh) > 0.5 ? 0 : clamp(dh / dt, -3, 3);
        this.visYaw = lerp(this.visYaw, yr, 0.25);
        this.yawRate = this.visYaw;
      }
      const acc = clamp((spd - this.lastSpeed) / dt, -15, 15);
      this.lonAcc = lerp(this.lonAcc, acc, Math.min(1, dt * 8));
    }
    this.lastHeading = this.heading; this.lastSpeed = spd;
    // rrotat
    this.spin = (this.spin + (spd / this.wheelR) * dt) % (Math.PI * 2);
    const st = this.kinematic ? clamp(Math.atan(this.yawRate * (this.a + this.b) / Math.max(Math.abs(spd), 2)) * Math.sign(spd || 1), -0.5, 0.5) : this.steerAngle;
    for (const w of this.wheelObjs) { w.mesh.rotation.x = this.spin; if (w.steer) w.pivot.rotation.y = st; }
    // varja (roll/pitch me sustë)
    const heavy = this.spec.mass > 5000 ? 0.5 : 1;
    const tRoll = clamp(spd * this.yawRate * 0.0065 * heavy, -0.065, 0.065);
    const tPitch = clamp(-this.lonAcc * 0.0035 * heavy, -0.04, 0.04);
    const k = Math.min(dt, 0.05);
    this.rollV += ((tRoll - this.roll) * 90 - this.rollV * 11) * k; this.roll += this.rollV * k;
    this.pitchV += ((tPitch - this.pitch) * 80 - this.pitchV * 10) * k; this.pitch += this.pitchV * k;
    this.bodyPivot.rotation.set(this.pitch, 0, this.roll);
    // dëmtimi
    const dmg = this.damage > 0.5;
    if (dmg !== this.damagedLook) { this.damagedLook = dmg; this.paintMesh.material = getPaint(this.color, dmg, this.lod === 'low'); }
    this.updateLights(ctx.time, ctx.isNight);
  }

  private updateLights(t: number, night: boolean): void {
    const L = this.lights, lt = this.lt;
    const blink = (t * 1.5) % 1 < 0.5;
    const il = (L.left || L.hazard) && blink, ir = (L.right || L.hazard) && blink;
    const brake = L.brake;
    lt.set(CH.head, ...(L.head ? [1, 1, 0.94] : [0.3, 0.33, 0.37]) as [number, number, number]);
    lt.set(CH.drl, 0.95, 0.97, 1);
    lt.set(CH.tail, ...(brake ? [1, 0.12, 0.09] : L.head ? [0.7, 0.05, 0.05] : [0.34, 0.03, 0.04]) as [number, number, number]);
    lt.set(CH.brake, ...(brake ? [1, 0.1, 0.07] : [0.25, 0.02, 0.02]) as [number, number, number]);
    lt.set(CH.rev, ...(L.reverse ? [1, 1, 1] : [0.55, 0.56, 0.58]) as [number, number, number]);
    lt.set(CH.indL, ...(il ? [1, 0.62, 0.1] : [0.5, 0.29, 0.06]) as [number, number, number]);
    lt.set(CH.indR, ...(ir ? [1, 0.62, 0.1] : [0.5, 0.29, 0.06]) as [number, number, number]);
    const cyc = (t * 1.6) % 1;
    const sr = L.siren && cyc < 0.5 && ((cyc * 6) % 1) < 0.55, sb = L.siren && cyc >= 0.5 && (((cyc - 0.5) * 6) % 1) < 0.55;
    lt.set(CH.sirR, ...(sr ? [1, 0.12, 0.12] : [0.36, 0.04, 0.05]) as [number, number, number]);
    lt.set(CH.sirB, ...(sb ? [0.25, 0.45, 1] : [0.05, 0.08, 0.38]) as [number, number, number]);
    const n = night ? 1 : 0;
    lt.set(CH.gHead, L.head ? n * 1 : 0, L.head ? n * 0.93 : 0, L.head ? n * 0.8 : 0);
    lt.set(CH.gPool, L.head ? n * 0.5 : 0, L.head ? n * 0.46 : 0, L.head ? n * 0.38 : 0);
    lt.set(CH.gTail, n * (brake ? 1 : L.head ? 0.4 : 0), n * (brake ? 0.08 : 0.01), n * (brake ? 0.05 : 0.01));
    lt.set(CH.gIndL, il ? n : 0, il ? n * 0.55 : 0, il ? n * 0.08 : 0);
    lt.set(CH.gIndR, ir ? n : 0, ir ? n * 0.55 : 0, ir ? n * 0.08 : 0);
    lt.set(CH.gSirR, sr ? 1 : 0, sr ? 0.1 : 0, sr ? 0.1 : 0);
    lt.set(CH.gSirB, sb ? 0.2 : 0, sb ? 0.4 : 0, sb ? 1 : 0);
    lt.commit();
    if (this.glowMesh) this.glowMesh.visible = (night && (L.head || brake || il || ir)) || L.siren;
  }

  setColor(color: number): void {
    this.color = color;
    this.paintMesh.material = getPaint(color, this.damagedLook, this.lod === 'low');
  }

  dispose(): void {
    this.object3d.parent?.remove(this.object3d);
    this.lt.dispose(); this.litMat.dispose();
    this.glowMat?.dispose(); this.decalTex?.dispose(); this.decalMat?.dispose();
  }
}

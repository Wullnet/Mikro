/** Efektet: tymi i gomave, tymi i dëmtimit dhe xixat (grimca në pishinë, 2 draw call). */
import * as THREE from 'three';
import type { Quality, Vehicle } from '../core/contracts';
import { Car } from './car';
import { setVehicleQuality } from './geo';

const VS = `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
uniform float uScale; varying float vA; varying vec3 vC;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = min(256.0, aSize * uScale / max(0.1, -mvPosition.z));
  vA = aAlpha; vC = aColor;
  #include <fog_vertex>
}`;
const FS = `
varying float vA; varying vec3 vC; uniform float uHard;
#include <fog_pars_fragment>
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(uHard, 1.0, d)) * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vC, a);
  #include <fog_fragment>
}`;

class Pool {
  readonly n: number; count = 0;
  readonly pos: Float32Array; readonly vel: Float32Array; readonly life: Float32Array; readonly max: Float32Array;
  readonly s0: Float32Array; readonly s1: Float32Array; readonly a0: Float32Array; readonly col: Float32Array;
  readonly size: Float32Array; readonly alpha: Float32Array; readonly color: Float32Array;
  readonly points: THREE.Points; readonly geo: THREE.BufferGeometry;
  constructor(n: number, additive: boolean, hard: number, readonly grav: number, readonly drag: number) {
    this.n = n;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.s0 = new Float32Array(n); this.s1 = new Float32Array(n); this.a0 = new Float32Array(n); this.col = new Float32Array(n * 3);
    this.size = new Float32Array(n); this.alpha = new Float32Array(n); this.color = new Float32Array(n * 3);
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uScale: { value: 400 }, uHard: { value: hard } }]),
    });
    const p = this.points = new THREE.Points(g, mat);
    p.frustumCulled = false; p.renderOrder = 3;
    p.onBeforeRender = (r, _s, cam) => {
      const h = r.getDrawingBufferSize(_v2).y;
      mat.uniforms.uScale.value = h * 0.5 * (cam as THREE.PerspectiveCamera).projectionMatrix.elements[5];
    };
  }
  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, s0: number, s1: number, a: number, r: number, g: number, b: number): void {
    if (this.count >= this.n) return;
    const i = this.count++;
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3); this.col.set([r, g, b], i * 3);
    this.life[i] = 0; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a;
  }
  update(dt: number): void {
    let i = 0;
    const dk = Math.exp(-this.drag * dt);
    while (i < this.count) {
      this.life[i] += dt;
      if (this.life[i] >= this.max[i]) {
        const l = --this.count;
        if (i !== l) {
          this.pos.copyWithin(i * 3, l * 3, l * 3 + 3); this.vel.copyWithin(i * 3, l * 3, l * 3 + 3); this.col.copyWithin(i * 3, l * 3, l * 3 + 3);
          this.life[i] = this.life[l]; this.max[i] = this.max[l]; this.s0[i] = this.s0[l]; this.s1[i] = this.s1[l]; this.a0[i] = this.a0[l];
        }
        continue;
      }
      const k = i * 3;
      this.vel[k + 1] += this.grav * dt;
      this.vel[k] *= dk; this.vel[k + 1] *= dk; this.vel[k + 2] *= dk;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      if (this.pos[k + 1] < 0.02) { this.pos[k + 1] = 0.02; this.vel[k + 1] *= -0.3; }
      const t = this.life[i] / this.max[i];
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.alpha[i] = this.a0[i] * (1 - t) * Math.min(1, t * 8);
      this.color[k] = this.col[k]; this.color[k + 1] = this.col[k + 1]; this.color[k + 2] = this.col[k + 2];
      i++;
    }
    this.geo.setDrawRange(0, this.count);
    for (const name of ['position', 'aSize', 'aAlpha', 'aColor']) (this.geo.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
  }
  dispose(): void { this.geo.dispose(); (this.points.material as THREE.Material).dispose(); this.points.parent?.remove(this.points); }
}
const _v2 = new THREE.Vector2();

export class VehicleEffects {
  private smoke: Pool; private sparkPool: Pool;
  private acc = new WeakMap<Vehicle, number>();
  private rate: number;
  constructor(scene: THREE.Scene, quality: Quality) {
    setVehicleQuality(quality); // llaku i makinave të reja ndjek cilësinë
    const n = quality === 'low' ? 70 : quality === 'medium' ? 140 : 240;
    this.rate = quality === 'low' ? 0.5 : quality === 'medium' ? 0.8 : 1;
    this.smoke = new Pool(n, false, 0.15, 0.25, 1.2);
    this.sparkPool = new Pool(quality === 'low' ? 40 : 96, true, 0.3, -9.8, 0.6);
    scene.add(this.smoke.points, this.sparkPool.points);
  }

  update(dt: number, vehicles: readonly Vehicle[]): void {
    for (const v of vehicles) {
      const sk = v.skid, dmg = v.damage;
      if (sk < 0.3 && dmg < 0.55) continue;
      let a = this.acc.get(v) ?? 0;
      const rate = (sk > 0.3 ? (sk - 0.25) * 45 : 0) * this.rate;
      a += rate * dt;
      const fx = Math.sin(v.heading), fz = Math.cos(v.heading), lx = Math.cos(v.heading), lz = -Math.sin(v.heading);
      const b = v instanceof Car ? v.b : v.halfL * 0.6, tr = v instanceof Car ? v.track : v.halfW * 0.85;
      while (a >= 1) {
        a -= 1;
        const s = Math.random() < 0.5 ? 1 : -1;
        const x = v.x - fx * b + lx * tr * s, z = v.z - fz * b + lz * tr * s;
        this.smoke.spawn(x, 0.25, z, v.vx * 0.15 + (Math.random() - 0.5), 0.5 + Math.random() * 0.5, v.vz * 0.15 + (Math.random() - 0.5),
          1.3 + Math.random() * 0.8, 0.9, 3.2 + sk * 1.5, 0.32 * sk, 0.86, 0.86, 0.86);
      }
      this.acc.set(v, a);
      if (dmg > 0.55 && Math.random() < (dmg - 0.5) * 18 * dt * this.rate) {
        const ahead = v.halfL * 0.7;
        this.smoke.spawn(v.x + fx * ahead, 0.9, v.z + fz * ahead, (Math.random() - 0.5) * 0.4, 1.0 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4,
          1.8 + Math.random(), 0.5, 2.6, 0.55, 0.13 + Math.random() * 0.08, 0.13, 0.14);
      }
    }
    this.smoke.update(dt);
    this.sparkPool.update(dt);
  }

  sparks(x: number, y: number, z: number, intensity: number): void {
    const n = Math.round(6 + 22 * Math.min(1, intensity));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 6 * (0.5 + intensity);
      this.sparkPool.spawn(x, y, z, Math.cos(a) * sp, 1.5 + Math.random() * 4, Math.sin(a) * sp,
        0.25 + Math.random() * 0.35, 0.18, 0.06, 1, 1, 0.62 + Math.random() * 0.25, 0.22);
    }
  }

  dispose(): void { this.smoke.dispose(); this.sparkPool.dispose(); }
}

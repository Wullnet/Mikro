/**
 * Motori grafik: renderer-i, qielli me diell, cikli ditë/natë, dritat, hijet dhe kamera që ndjek makinën.
 */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import type { CameraMode, CityWorld, Quality, Vehicle } from './contracts';
import { clamp, fwdX, fwdZ, smooth, angleDiff, lerp } from './math';

const QUALITY = {
  low: { pixelRatio: 1, antialias: false, shadows: false, shadowSize: 0 },
  medium: { pixelRatio: 1.5, antialias: true, shadows: true, shadowSize: 1024 },
  high: { pixelRatio: 2, antialias: true, shadows: true, shadowSize: 2048 },
} as const;

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, 1, 0.3, 1400);
  readonly sun = new THREE.DirectionalLight(0xffffff, 2.2);
  readonly hemi = new THREE.HemisphereLight(0xcfe6ff, 0x4a4238, 1.1);
  readonly sky = new Sky();
  quality: Quality = 'medium';
  /** Ora e ditës 0..24; një ditë e plotë zgjat `dayLength` sekonda reale. */
  timeOfDay = 9.5;
  dayLength = 24 * 60;
  private pmrem: THREE.PMREMGenerator;
  private envScene = new THREE.Scene();
  private envSky = new Sky();
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private envAge = Infinity;
  private stars: THREE.Points;
  private sunDir = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: QUALITY[quality].antialias, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    this.sky.scale.setScalar(4000);
    this.envSky.scale.setScalar(100);
    this.envScene.add(this.envSky);
    for (const s of [this.sky, this.envSky]) {
      const u = s.material.uniforms;
      u.turbidity.value = 6;
      u.rayleigh.value = 1.6;
      u.mieCoefficient.value = 0.005;
      u.mieDirectionalG.value = 0.8;
    }
    this.scene.add(this.sky, this.hemi, this.sun, this.sun.target);
    this.scene.fog = new THREE.Fog(0xbfd6ea, 180, 700);

    // Yjet për natën.
    const starGeo = new THREE.BufferGeometry();
    const pts = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const u = Math.random() * Math.PI * 2, v = Math.random() * 0.45 + 0.08;
      pts.set([Math.cos(u) * Math.cos(v) * 1500, Math.sin(v) * 1500, Math.sin(u) * Math.cos(v) * 1500], i * 3);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.scene.add(this.stars);

    this.setQuality(quality);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  get isNight(): boolean { return this.timeOfDay < 6.3 || this.timeOfDay > 19.4; }

  setQuality(q: Quality): void {
    this.quality = q;
    const cfg = QUALITY[q];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cfg.pixelRatio));
    this.renderer.shadowMap.enabled = cfg.shadows;
    this.sun.castShadow = cfg.shadows;
    if (cfg.shadows) {
      this.sun.shadow.mapSize.set(cfg.shadowSize, cfg.shadowSize);
      const c = this.sun.shadow.camera;
      c.left = -45; c.right = 45; c.top = 45; c.bottom = -45; c.near = 1; c.far = 260;
      this.sun.shadow.bias = -0.0004;
      this.sun.shadow.normalBias = 0.04;
      this.sun.shadow.map?.dispose();
      (this.sun.shadow as any).map = null;
    }
    this.envAge = Infinity;
    this.resize();
  }

  resize(): void {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Përditëson diellin, qiellin, dritat dhe mjegullën sipas orës; `focus` = ku janë hijet. */
  updateSky(dt: number, focus: THREE.Vector3, advanceTime: boolean): void {
    if (advanceTime) this.timeOfDay = (this.timeOfDay + (24 / this.dayLength) * dt) % 24;
    const t = this.timeOfDay;
    // Dielli lind ~6:00, perëndon ~19:30; lartësia maksimale ~62°.
    const dayFrac = (t - 6) / 13.5;
    const elev = Math.sin(clamp(dayFrac, -0.25, 1.25) * Math.PI) * 62; // gradë
    const azim = lerp(100, 260, clamp(dayFrac, 0, 1));                // lindje → perëndim
    const phi = THREE.MathUtils.degToRad(90 - elev), theta = THREE.MathUtils.degToRad(azim);
    this.sunDir.setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);

    const day = clamp((elev + 4) / 20, 0, 1);            // 0 natë → 1 ditë
    const golden = clamp(1 - Math.abs(elev - 6) / 12, 0, 1) * day;
    this.sun.intensity = 2.4 * day;
    this.sun.color.setRGB(1, lerp(0.95, 0.72, golden), lerp(0.88, 0.5, golden));
    this.hemi.intensity = lerp(0.28, 1.15, day);
    this.hemi.color.setRGB(lerp(0.32, 0.8, day), lerp(0.38, 0.9, day), lerp(0.62, 1.0, day));
    this.hemi.groundColor.setRGB(lerp(0.08, 0.3, day), lerp(0.08, 0.27, day), lerp(0.12, 0.23, day));
    this.renderer.toneMappingExposure = lerp(0.62, 0.9, day);

    const fog = this.scene.fog as THREE.Fog;
    const night = new THREE.Color(0x0d1526), dayFog = new THREE.Color(0xc4d8ea), dusk = new THREE.Color(0xe0a27a);
    fog.color.copy(night).lerp(dayFog, day).lerp(dusk, golden * 0.55);
    (this.stars.material as THREE.PointsMaterial).opacity = clamp(1 - day * 1.6, 0, 0.9);
    this.sky.visible = day > 0.02;
    this.scene.background = this.sky.visible ? null : fog.color;

    // Drita e diellit (hijet) ndjek fokusin; natën drita vjen nga "hëna" e zbehtë.
    const dir = day > 0.02 ? this.sunDir : this.sunDir.clone().set(-0.3, 0.8, 0.4).normalize();
    if (day <= 0.02) { this.sun.intensity = 0.35; this.sun.color.setRGB(0.6, 0.7, 1); }
    this.sun.position.copy(focus).addScaledVector(dir, 120);
    this.sun.target.position.copy(focus);
    this.stars.position.copy(focus);
    this.sky.position.copy(focus);

    // Harta e mjedisit (reflektimet e llakut) rifreskohet rrallë.
    this.envAge += dt;
    if (this.envAge > 20) {
      this.envAge = 0;
      const u = this.envSky.material.uniforms;
      u.sunPosition.value.copy(this.sunDir);
      u.rayleigh.value = day > 0.02 ? 1.6 : 0.2;
      const rt = this.pmrem.fromScene(this.envScene, 0.02);
      this.envTarget?.dispose();
      this.envTarget = rt;
      this.scene.environment = rt.texture;
      this.scene.environmentIntensity = lerp(0.15, 0.8, day);
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

/** Kamera që ndjek makinën, me butë, FOV sipas shpejtësisë dhe pa hyrë në ndërtesa. */
export class CameraRig {
  mode: CameraMode = 'chase';
  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private yaw = 0;
  private init = false;
  private orbit = 0;
  private obstacles: import('./contracts').Obstacle[] = [];

  constructor(private camera: THREE.PerspectiveCamera) {}

  reset(): void { this.init = false; }

  follow(v: Vehicle, dt: number, city: CityWorld | null): void {
    const speed = Math.hypot(v.vx, v.vz);
    // Drejtimi i kamerës ndjek makinën, por kur makina rrëshqet ndjek pak edhe lëvizjen.
    let target = v.heading;
    if (speed > 3 && v.speed > 0) target = v.heading + angleDiff(v.heading, Math.atan2(v.vx, v.vz)) * 0.35;
    if (v.speed < -1) target = v.heading;
    if (!this.init) { this.yaw = target; }
    this.yaw += angleDiff(this.yaw, target) * (1 - Math.exp(-(this.mode === 'hood' ? 14 : 5) * dt));

    const cfg = this.mode === 'far' ? { dist: 11.5, height: 5.2, lookH: 1.4, ahead: 6 }
      : this.mode === 'hood' ? { dist: -0.4, height: 1.35, lookH: 1.2, ahead: 20 }
      : { dist: 6.8, height: 2.9, lookH: 1.3, ahead: 5 };
    const fx = fwdX(this.yaw), fz = fwdZ(this.yaw);
    let dist = cfg.dist;
    // Mos lër kamerën të hyjë brenda ndërtesave: shkurto distancën nëse ka pengesë prapa.
    if (city && this.mode !== 'hood') {
      for (let d = 1.5; d <= cfg.dist; d += 1) {
        const px = v.x - fx * d, pz = v.z - fz * d;
        if (city.queryObstacles(px - 0.4, pz - 0.4, px + 0.4, pz + 0.4, this.obstacles) > 0 &&
            this.obstacles.some(o => o.height > cfg.height * 0.6 && o.kind !== 'water')) { dist = Math.max(1.5, d - 1); break; }
      }
    }
    const want = new THREE.Vector3(v.x - fx * dist, cfg.height + (this.mode === 'hood' ? 0 : Math.min(1.2, speed * 0.02)), v.z - fz * dist);
    const wantLook = new THREE.Vector3(v.x + fx * cfg.ahead, cfg.lookH, v.z + fz * cfg.ahead);
    if (!this.init) { this.pos.copy(want); this.look.copy(wantLook); this.init = true; }
    const k = this.mode === 'hood' ? 1 : 1 - Math.exp(-9 * dt);
    this.pos.lerp(want, k);
    this.look.lerp(wantLook, 1 - Math.exp(-12 * dt));
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
    const fov = (this.mode === 'hood' ? 68 : 60) + clamp(speed * 3.6 - 40, 0, 160) * 0.08;
    this.camera.fov = smooth(this.camera.fov, this.camera.aspect < 1 ? fov + 12 : fov, 4, dt);
    this.camera.updateProjectionMatrix();
  }

  /** Rrotullim i ngadaltë rreth makinës për menutë. */
  showcase(v: Vehicle, dt: number): void {
    this.orbit += dt * 0.18;
    const r = this.camera.aspect < 1 ? 11 : 8.5;
    this.camera.position.set(v.x + Math.sin(this.orbit) * r, 2.6, v.z + Math.cos(this.orbit) * r);
    this.camera.lookAt(v.x, 0.9, v.z);
    this.camera.fov = this.camera.aspect < 1 ? 62 : 50;
    this.camera.updateProjectionMatrix();
    this.init = false;
  }
}

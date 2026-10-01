/**
 * Ndërtues i shpejtë gjeometrie (vargje të thjeshta → BufferGeometry) dhe gjeometritë e objekteve të vogla (props).
 */
import * as THREE from 'three';
import type { Tile } from './textures';

export type RGB = [number, number, number];
export type GeoKind = 'ground' | 'bld' | 'col' | 'uv';

const _c = new THREE.Color();
/** Ngjyrë hex (sRGB) → lineare. */
export function lin(hex: number, k = 1): RGB {
  _c.setHex(hex);
  return [_c.r * k, _c.g * k, _c.b * k];
}
export const mulc = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
export const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const ZT: Tile = { u: 0, v: 0, w: 0, h: 0 };

export class Geo {
  pos: number[] = []; nor: number[] = []; idx: number[] = [];
  col: number[] = []; uv: number[] = []; tl: number[] = []; ww: number[] = []; pat: number[] = [];
  c: RGB = [1, 1, 1];
  t: Tile = ZT;
  w0 = 0; w1 = 0; p = 0;
  constructor(readonly kind: GeoKind) {}
  get n() { return this.pos.length / 3; }
  get tris() { return this.idx.length / 3; }

  v(x: number, y: number, z: number, nx: number, ny: number, nz: number, u = 0, w = 0, k = 1): number {
    this.pos.push(x, y, z); this.nor.push(nx, ny, nz);
    const c = this.c;
    switch (this.kind) {
      case 'ground': this.col.push(c[0] * k, c[1] * k, c[2] * k); this.pat.push(this.p); break;
      case 'bld':
        this.col.push(c[0] * k, c[1] * k, c[2] * k); this.uv.push(u, w);
        this.tl.push(this.t.u, this.t.v, this.t.w, this.t.h); this.ww.push(this.w0, this.w1); break;
      case 'col': this.col.push(c[0] * k, c[1] * k, c[2] * k); break;
      case 'uv': this.uv.push(u, w); break;
    }
    return this.n - 1;
  }

  /** Katërkëndësh (4 pika × 3) me normale n; renditja e trekëndëshave rregullohet sipas normales. */
  q(p: ArrayLike<number>, nx: number, ny: number, nz: number, uv?: ArrayLike<number>, ks?: ArrayLike<number>) {
    const i = this.n;
    for (let k = 0; k < 4; k++) this.v(p[k * 3], p[k * 3 + 1], p[k * 3 + 2], nx, ny, nz, uv ? uv[k * 2] : 0, uv ? uv[k * 2 + 1] : 0, ks ? ks[k] : 1);
    const ax = p[3] - p[0], ay = p[4] - p[1], az = p[5] - p[2], bx = p[6] - p[0], by = p[7] - p[1], bz = p[8] - p[2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    if (cx * nx + cy * ny + cz * nz >= 0) this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    else this.idx.push(i, i + 2, i + 1, i, i + 3, i + 2);
  }

  /** Trekëndësh me normalen e vet (ose të dhënë, me kontroll renditjeje). */
  tri(p: ArrayLike<number>, uv?: ArrayLike<number>, n?: [number, number, number]) {
    const ax = p[3] - p[0], ay = p[4] - p[1], az = p[5] - p[2], bx = p[6] - p[0], by = p[7] - p[1], bz = p[8] - p[2];
    let cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    const l = Math.hypot(cx, cy, cz) || 1;
    cx /= l; cy /= l; cz /= l;
    let flip = false;
    if (n) { flip = cx * n[0] + cy * n[1] + cz * n[2] < 0; cx = n[0]; cy = n[1]; cz = n[2]; }
    const i = this.n;
    for (let k = 0; k < 3; k++) this.v(p[k * 3], p[k * 3 + 1], p[k * 3 + 2], cx, cy, cz, uv ? uv[k * 2] : 0, uv ? uv[k * 2 + 1] : 0);
    if (flip) this.idx.push(i, i + 2, i + 1); else this.idx.push(i, i + 1, i + 2);
  }

  /** Sipërfaqe horizontale lart. */
  flat(x0: number, z0: number, x1: number, z1: number, y: number, s = 0) {
    if (x1 - x0 < 1e-3 || z1 - z0 < 1e-3) return;
    this.q([x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0], 0, 1, 0, s ? [x0 * s, z0 * s, x0 * s, z1 * s, x1 * s, z1 * s, x1 * s, z0 * s] : undefined);
  }

  /** Mur vertikal nga (x0,z0) te (x1,z1); jashtë = në të djathtë të ecjes. u në njësi të dhëna. */
  wall(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, u0 = 0, u1 = 1, v0 = 0, v1 = 1, kb = 1, kt = 1) {
    const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1;
    this.q([x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y1, z0], -dz / l, 0, dx / l, [u0, v0, u1, v0, u1, v1, u0, v1], [kb, kb, kt, kt]);
  }

  /** Kuti e drejtuar me boshtet; uv në metra × s. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, s = 0.25, bottom = false, top = true) {
    if (top) this.flat(x0, z0, x1, z1, y1, s);
    if (bottom) this.q([x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1], 0, -1, 0);
    const W = (x1 - x0) * s, D = (z1 - z0) * s, H0 = y0 * s, H1 = y1 * s;
    this.wall(x1, z0, x0, z0, y0, y1, 0, W, H0, H1);
    this.wall(x0, z0, x0, z1, y0, y1, 0, D, H0, H1);
    this.wall(x0, z1, x1, z1, y0, y1, 0, W, H0, H1);
    this.wall(x1, z1, x1, z0, y0, y1, 0, D, H0, H1);
  }

  /** Cilindër/kon me normale të buta. */
  cyl(x: number, z: number, y0: number, y1: number, r0: number, r1: number, seg = 8, cap = true) {
    const base = this.n, dr = r0 - r1, h = y1 - y0, sl = Math.hypot(dr, h) || 1;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const nx = ca * h / sl, ny = dr / sl, nz = sa * h / sl;
      this.v(x + ca * r0, y0, z + sa * r0, nx, ny, nz, i / seg, 0);
      this.v(x + ca * r1, y1, z + sa * r1, nx, ny, nz, i / seg, 1);
    }
    for (let i = 0; i < seg; i++) {
      const a = base + i * 2;
      this.idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
    if (cap && r1 > 0.01) {
      const c = this.v(x, y1, z, 0, 1, 0);
      const rs = this.n;
      for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; this.v(x + Math.cos(a) * r1, y1, z + Math.sin(a) * r1, 0, 1, 0); }
      for (let i = 0; i < seg; i++) this.idx.push(c, rs + i + 1, rs + i);
    }
  }

  /** Shto një gjeometri ekzistuese (me matricë dhe ngjyrë sipas pozicionit). */
  add(src: THREE.BufferGeometry, m?: THREE.Matrix4, colFn?: (x: number, y: number, z: number) => RGB) {
    const g = src.index ? src.toNonIndexed() : src;
    const P = g.getAttribute('position'), N = g.getAttribute('normal');
    const v = new THREE.Vector3(), nn = new THREE.Vector3(), nm = new THREE.Matrix3();
    if (m) nm.getNormalMatrix(m);
    const base = this.n, keep = this.c;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); nn.fromBufferAttribute(N, i);
      if (m) { v.applyMatrix4(m); nn.applyMatrix3(nm).normalize(); }
      if (colFn) this.c = colFn(v.x, v.y, v.z);
      this.v(v.x, v.y, v.z, nn.x, nn.y, nn.z);
    }
    this.c = keep;
    for (let i = 0; i < P.count; i++) this.idx.push(base + i);
  }

  build(): THREE.BufferGeometry | null {
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    switch (this.kind) {
      case 'ground': g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); g.setAttribute('apat', new THREE.Float32BufferAttribute(this.pat, 1)); break;
      case 'bld':
        g.setAttribute('atint', new THREE.Float32BufferAttribute(this.col, 3));
        g.setAttribute('auv', new THREE.Float32BufferAttribute(this.uv, 2));
        g.setAttribute('atile', new THREE.Float32BufferAttribute(this.tl, 4));
        g.setAttribute('aw', new THREE.Float32BufferAttribute(this.ww, 2)); break;
      case 'col': g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); break;
      case 'uv': g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); break;
    }
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

// ---------------------------------------------------------------------------------------------
// Gjeometritë e props (lokale: baza në (0,0,0), përpara = +Z)
// ---------------------------------------------------------------------------------------------

function hash3(x: number, y: number, z: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

/** Kurorë peme organike nga ikosaedri me zhvendosje. */
function canopy(g: Geo, r: number, detail: number, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, dark: RGB, light: RGB) {
  const ico = new THREE.IcosahedronGeometry(r, detail);
  const P = ico.getAttribute('position') as THREE.BufferAttribute, Nn = ico.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const k = 1 + (hash3(Math.round(x * 100), Math.round(y * 100), Math.round(z * 100)) - 0.5) * 0.28;
    P.setXYZ(i, x * k * sx, y * k * sy, z * k * sz);
    const nx = x / sx, ny = y / sy, nz = z / sz, l = Math.hypot(nx, ny, nz) || 1;
    Nn.setXYZ(i, nx / l, ny / l, nz / l);
  }
  const m = new THREE.Matrix4().makeTranslation(cx, cy, cz);
  const ymin = cy - r * sy, ymax = cy + r * sy;
  g.add(ico, m, (x, y, z) => {
    const t = (y - ymin) / (ymax - ymin);
    return mixc(dark, light, Math.min(1, t * 1.1 + (hash3(x, y, z) - 0.5) * 0.2));
  });
}

export function treeRoundGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  g.c = lin(0x5a4130); g.cyl(0, 0, 0, 3.2, 0.2, 0.14, 6, false);
  canopy(g, 2.3, 1, 0, 4.3, 0, 1.05, 0.9, 1.05, lin(0x2f5a22), lin(0x7aa04a));
  canopy(g, 1.6, 0, 0.9, 5.4, -0.5, 1, 0.9, 1, lin(0x3c6a2a), lin(0x8db45a));
  return g.build()!;
}
export function treeCypressGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  g.c = lin(0x4a3628); g.cyl(0, 0, 0, 1.2, 0.16, 0.12, 5, false);
  canopy(g, 1.0, 1, 0, 4.4, 0, 1.05, 3.9, 1.05, lin(0x1d3b1c), lin(0x4f7a38));
  return g.build()!;
}
export function treePineGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  g.c = lin(0x6b4a33); g.cyl(0, 0, 0, 6.2, 0.24, 0.15, 6, false);
  g.c = lin(0x6b4a33); g.cyl(0, 0, 5.2, 6.5, 0.1, 0.08, 4, false);
  canopy(g, 2.0, 1, 0.2, 7.0, 0, 1.6, 0.55, 1.6, lin(0x2b4d25), lin(0x6f9246));
  return g.build()!;
}
export function bushGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  canopy(g, 0.8, 0, 0, 0.45, 0, 1.3, 0.75, 1.3, lin(0x2e5524), lin(0x6c9a44));
  return g.build()!;
}

/** Shtylla e ndriçimit; krahu drejt +Z (rrugës). */
export function lampGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  g.c = lin(0x3b4046);
  g.cyl(0, 0, 0, 0.5, 0.16, 0.13, 6, false);
  g.cyl(0, 0, 0.5, 7.4, 0.09, 0.07, 6, true);
  g.box(-0.04, 7.15, 0, 0.04, 7.25, 1.6);
  g.box(-0.2, 7.05, 1.3, 0.2, 7.28, 2.1, 0.25, true);
  return g.build()!;
}
export function lampHeadGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  g.box(-0.17, 6.94, 1.36, 0.17, 7.05, 2.04, 0.25, true);
  const geo = g.build()!; geo.deleteAttribute('color');
  return geo;
}
/** Pellg drite në tokë para llambës. */
export function poolGeo(): THREE.BufferGeometry {
  const g = new Geo('uv');
  const r = 6.5, y = 0.03, cz = 2.2;
  g.q([-r, y, cz - r, -r, y, cz + r, r, y, cz + r, r, y, cz - r], 0, 1, 0, [0, 0, 0, 1, 1, 1, 1, 0]);
  return g.build()!;
}
export function blobGeo(r = 2.4): THREE.BufferGeometry {
  const g = new Geo('uv'); const y = 0.04;
  g.q([-r, y, -r, -r, y, r, r, y, r, r, y, -r], 0, 1, 0, [0, 0, 0, 1, 1, 1, 1, 0]);
  return g.build()!;
}
export function benchGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  g.c = lin(0x2d2f33);
  for (const x of [-0.75, 0.75]) { g.box(x - 0.04, 0, -0.25, x + 0.04, 0.45, 0.2); g.box(x - 0.04, 0.45, -0.28, x + 0.04, 0.9, -0.22); }
  g.c = lin(0x8a5a36);
  g.box(-0.95, 0.42, -0.25, 0.95, 0.48, 0.22, 0.25, true);
  g.box(-0.95, 0.6, -0.3, 0.95, 0.85, -0.25, 0.25, true);
  return g.build()!;
}
/** Stacion autobusi: përpara (+Z) = rruga. */
export function busStopGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  g.c = lin(0x4a5058);
  for (const x of [-1.9, 1.9]) g.box(x - 0.06, 0, -0.75, x + 0.06, 2.5, -0.63);
  g.c = lin(0x1f6fb2); g.box(-2.1, 2.5, -0.95, 2.1, 2.7, 0.75, 0.25, true);
  g.c = lin(0x9cb7c7); g.box(-1.9, 0.3, -0.72, 1.9, 2.4, -0.66);
  g.c = lin(0x6b4a33); g.box(-1.4, 0.42, -0.6, 1.4, 0.5, -0.2);
  g.c = lin(0x4a5058); g.box(2.3, 0, 0.3, 2.38, 2.6, 0.38);
  g.c = lin(0xf0c419); g.box(2.12, 2.2, 0.32, 2.56, 2.75, 0.36, 0.25, true);
  g.c = lin(0x1f6fb2); g.box(2.15, 2.25, 0.36, 2.53, 2.7, 0.37);
  return g.build()!;
}
export function kioskGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  g.c = lin(0xe9e3d6); g.box(-1.1, 0, -1.1, 1.1, 2.4, 1.1);
  g.c = lin(0x2a4f7a); g.box(-0.9, 0.9, 1.1, 0.9, 2.0, 1.12);
  g.c = lin(0xc8322b); g.box(-1.35, 2.4, -1.35, 1.35, 2.75, 1.35, 0.25, true);
  g.c = lin(0xf0c419); g.box(-1.0, 2.75, -0.2, 1.0, 3.2, 0.2);
  return g.build()!;
}
/** Tabela e shpejtësisë; which 0 = 60, 1 = 80. Përpara (+Z) = drejt shoferit. */
export function signGeo(which: number): THREE.BufferGeometry {
  const g = new Geo('uv');
  const seg = 6, gu = 0.02, gv = 0.02;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, r = 0.05;
    const p = [Math.cos(a0) * r, 0, Math.sin(a0) * r, Math.cos(a1) * r, 0, Math.sin(a1) * r, Math.cos(a1) * r, 2.3, Math.sin(a1) * r, Math.cos(a0) * r, 2.3, Math.sin(a0) * r];
    const am = (a0 + a1) / 2;
    g.q(p, Math.cos(am), 0, Math.sin(am), [gu, gv, gu, gv, gu, gv, gu, gv]);
  }
  const N = 16, R = 0.38, cy = 2.3, cu = 0.25 + which * 0.5;
  const c = g.v(0, cy, 0.07, 0, 0, 1, cu, 0.5);
  const b = g.v(0, cy, 0.05, 0, 0, -1, gu, gv);
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    const f0 = g.v(Math.cos(a0) * R, cy + Math.sin(a0) * R, 0.07, 0, 0, 1, cu + Math.cos(a0) * 0.236, 0.5 + Math.sin(a0) * 0.472);
    const f1 = g.v(Math.cos(a1) * R, cy + Math.sin(a1) * R, 0.07, 0, 0, 1, cu + Math.cos(a1) * 0.236, 0.5 + Math.sin(a1) * 0.472);
    g.idx.push(c, f0, f1);
    const b0 = g.v(Math.cos(a0) * R, cy + Math.sin(a0) * R, 0.05, 0, 0, -1, gu, gv);
    const b1 = g.v(Math.cos(a1) * R, cy + Math.sin(a1) * R, 0.05, 0, 0, -1, gu, gv);
    g.idx.push(b, b1, b0);
  }
  return g.build()!;
}
/** Çadër kafeneje me tavolinë (ngjyra e çadrës vjen nga instanceColor). */
export function umbrellaGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  g.c = [0.06, 0.06, 0.06]; g.cyl(0, 0, 0, 2.3, 0.035, 0.035, 4, false);
  g.cyl(0, 0, 0, 0.72, 0.05, 0.05, 5, false); g.cyl(0, 0, 0.72, 0.76, 0.42, 0.42, 8, true);
  for (const [x, z] of [[-0.75, 0], [0.75, 0]]) g.box(x - 0.2, 0, z - 0.2, x + 0.2, 0.45, z + 0.2);
  g.c = [1, 1, 1];
  const seg = 8, r = 1.5, y0 = 2.0, y1 = 2.55;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    g.tri([0, y1, 0, Math.cos(a1) * r, y0, Math.sin(a1) * r, Math.cos(a0) * r, y0, Math.sin(a0) * r], undefined, [0, 1, 0]);
    g.c = [0.8, 0.8, 0.8];
    g.tri([0, y1 - 0.02, 0, Math.cos(a0) * r, y0 - 0.02, Math.sin(a0) * r, Math.cos(a1) * r, y0 - 0.02, Math.sin(a1) * r], undefined, [0, -1, 0]);
    g.c = [1, 1, 1];
  }
  return g.build()!;
}
/** Semafor në shtyllë (koka përballë +Z). */
export function tlPoleGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  g.c = lin(0x2c3035); g.cyl(0, 0, 0, 3.6, 0.07, 0.06, 6, true);
  g.c = lin(0x1d2024); g.box(-0.2, 2.5, -0.12, 0.2, 3.55, 0.16, 0.25, true);
  g.c = lin(0xe8e8e8); g.box(-0.26, 2.44, -0.14, 0.26, 3.61, -0.12);
  return g.build()!;
}
/** Semafor me krah mbi rrugë (krahu drejt -X lokal). */
export function tlArmGeo(): THREE.BufferGeometry {
  const g = new Geo('col');
  g.c = lin(0x2c3035); g.cyl(0, 0, 0, 6.2, 0.11, 0.09, 6, true);
  g.box(-4.6, 5.9, -0.05, 0, 6.02, 0.05);
  g.c = lin(0x1d2024); g.box(-4.4, 4.95, -0.12, -4.0, 6.0, 0.16, 0.25, true);
  g.c = lin(0xe8e8e8); g.box(-4.46, 4.89, -0.14, -3.94, 6.06, -0.12);
  g.c = lin(0x1d2024); g.box(-0.2, 2.5, -0.12, 0.2, 3.55, 0.16, 0.25, true);
  return g.build()!;
}
/** Llamba e semaforit (disk i vogël përballë +Z). */
export function bulbGeo(): THREE.BufferGeometry {
  const g = new Geo('col'); g.c = [1, 1, 1];
  const N = 8, r = 0.13;
  const c = g.v(0, 0, 0, 0, 0, 1);
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2; g.v(Math.cos(a) * r, Math.sin(a) * r, 0, 0, 0, 1); }
  for (let i = 0; i < N; i++) g.idx.push(c, c + 1 + i, c + 2 + i);
  const geo = g.build()!; geo.deleteAttribute('color');
  return geo;
}

/** Mjetet e gjeometrisë: buferat sipas materialit, loft-i i prerjeve, patch-et mbi sipërfaqe, materialet e përbashkëta. */
import * as THREE from 'three';
import type { Quality } from '../core/contracts';
import { clamp, lerp } from '../core/math';

export const PI = Math.PI;

// ---------- Atlasi i detajeve (plastikë, gomë, krom, xham...) ----------
export const SLOT = {
  black: 0, rubber: 1, chrome: 2, silver: 3, gun: 4, wall: 5, disc: 6, red: 7,
  glass: 8, dark: 9, gap: 10, amber: 11, white: 12, grey: 13, accent: 14, accent2: 15,
} as const;
const ATLAS: Array<[number, number, number]> = [
  [0x141518, 0.5, 0.0], [0x1b1b1c, 0.9, 0.0], [0xf0f0f2, 0.07, 1.0], [0xc4c8cc, 0.22, 1.0],
  [0x44484e, 0.3, 1.0], [0x262628, 0.82, 0.0], [0x77777a, 0.45, 0.85], [0xc0141c, 0.35, 0.0],
  [0x0b1116, 0.03, 0.4], [0x09090a, 0.9, 0.0], [0x040404, 0.95, 0.0], [0xff8c1a, 0.3, 0.0],
  [0xf1f1ee, 0.42, 0.0], [0x8d9298, 0.5, 0.25], [0xc21f26, 0.35, 0.1], [0x1f4fa8, 0.35, 0.1],
];

/** Kanalet e dritave (teksel në teksturën 32×1 të çdo makine). */
export const CH = {
  head: 0, drl: 1, tail: 2, brake: 3, rev: 4, indL: 5, indR: 6, sirR: 7, sirB: 8,
  gHead: 9, gTail: 10, gIndL: 11, gIndR: 12, gSirR: 13, gSirB: 14, gPool: 15, sign: 16,
} as const;
export const NCH = 32;

// ---------- Buferat ----------
export class GB {
  p: number[] = []; n: number[] = []; t: number[] = []; t1: number[] = []; i: number[] = [];
  get vc(): number { return this.p.length / 3; }
  v(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number, u1: number, w1: number): number {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.t.push(u, w); this.t1.push(u1, w1);
    return this.vc - 1;
  }
  geo(uv1 = false): THREE.BufferGeometry | null {
    if (!this.i.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.t, 2));
    if (uv1) g.setAttribute('uv1', new THREE.Float32BufferAttribute(this.t1, 2));
    g.setIndex(this.i);
    g.computeBoundingSphere();
    return g;
  }
}

export interface Tgt { b: GB; u: number; v: number; u1: number; v1: number }

/** Grupi i buferave për një model (paint = ngjyra, det = atlasi, lit = dritat, dec = targat/mbishkrimet, glow = shkëlqimi natën). */
export class Kit {
  paint = new GB(); det = new GB(); lit = new GB(); dec = new GB(); glow = new GB(); sign = new GB();
  readonly P: Tgt;
  readonly D: Tgt;
  private sc: Tgt[] = []; private cc: Tgt[] = [];
  constructor(readonly low: boolean) {
    this.P = { b: this.paint, u: 0, v: 0, u1: 0, v1: 0 };
    this.D = { b: this.dec, u: 0, v: 0, u1: 0, v1: 0 };
  }
  S(s: number): Tgt {
    return this.sc[s] ??= { b: this.det, u: ((s % 4) + 0.5) / 4, v: (Math.floor(s / 4) + 0.5) / 4, u1: 0, v1: 0 };
  }
  C(c: number): Tgt {
    const u = (c + 0.5) / NCH;
    return this.cc[c] ??= { b: this.lit, u, v: 0.5, u1: u, v1: 0.5 };
  }
}

// ---------- Primitivët ----------
const _T = new THREE.Vector3(), _S = new THREE.Vector3(), _Q = new THREE.Quaternion(), _E = new THREE.Euler();
export function mat(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): THREE.Matrix4 {
  return new THREE.Matrix4().compose(_T.set(x, y, z), _Q.setFromEuler(_E.set(rx, ry, rz)), _S.set(sx, sy, sz));
}

/** Shton një gjeometri Three në bufer (uv = sloti i target-it, ose uv e gjeometrisë nëse keepUv). */
export function addGeo(t: Tgt, g: THREE.BufferGeometry, m: THREE.Matrix4 | null, keepUv = false, invert = false): void {
  const pos = g.getAttribute('position'), nor = g.getAttribute('normal'), uv = g.getAttribute('uv');
  const nm = m ? new THREE.Matrix3().getNormalMatrix(m) : null;
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  const base = t.b.vc;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i);
    if (invert) n.negate();
    if (m) { v.applyMatrix4(m); n.applyMatrix3(nm!).normalize(); }
    t.b.v(v.x, v.y, v.z, n.x, n.y, n.z, keepUv && uv ? uv.getX(i) : t.u, keepUv && uv ? uv.getY(i) : t.v, t.u1, t.v1);
  }
  const idx = g.index;
  const flip = (m ? m.determinant() < 0 : false) !== invert;
  const cnt = idx ? idx.count : pos.count;
  for (let i = 0; i < cnt; i += 3) {
    const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
    if (flip) t.b.i.push(base + a, base + c, base + b); else t.b.i.push(base + a, base + b, base + c);
  }
  g.dispose();
}
export function box(t: Tgt, w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void {
  addGeo(t, new THREE.BoxGeometry(w, h, d), mat(x, y, z, rx, ry, rz));
}
export function cyl(t: Tgt, r0: number, r1: number, h: number, seg: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, open = false): void {
  addGeo(t, new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat(x, y, z, rx, ry, rz));
}
export function roundRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
/** Formë e sheshtë mbi faqen e përparme (end=1) ose të pasme (end=-1). */
export function capShape(t: Tgt, shape: THREE.Shape, x: number, y: number, z: number, end = 1, seg = 3): void {
  addGeo(t, new THREE.ShapeGeometry(shape, seg), mat(x, y, z, 0, end > 0 ? 0 : PI, 0));
}

/** Katërkëndësh me orientim automatik sipas normaleve. a..d = [x,y,z,nx,ny,nz]. */
export function emitQuad(t: Tgt, a: ArrayLike<number>, b: ArrayLike<number>, c: ArrayLike<number>, d: ArrayLike<number>, uv?: number[][]): void {
  const fx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]) + (c[1] - a[1]) * (d[2] - a[2]) - (c[2] - a[2]) * (d[1] - a[1]);
  const fy = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) + (c[2] - a[2]) * (d[0] - a[0]) - (c[0] - a[0]) * (d[2] - a[2]);
  const fz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) + (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]);
  const sx = a[3] + b[3] + c[3] + d[3], sy = a[4] + b[4] + c[4] + d[4], sz = a[5] + b[5] + c[5] + d[5];
  const flip = fx * sx + fy * sy + fz * sz < 0;
  const B = t.b, P = [a, b, c, d];
  const ids = P.map((p, k) => B.v(p[0], p[1], p[2], p[3], p[4], p[5], uv ? uv[k][0] : t.u, uv ? uv[k][1] : t.v, t.u1, t.v1));
  if (flip) B.i.push(ids[0], ids[2], ids[1], ids[0], ids[3], ids[2]);
  else B.i.push(ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]);
}

// ---------- Kurbat (PCHIP monotone) ----------
export function pchip(keys: number[][]): (x: number) => number {
  const k = keys.map(p => [p[0], p[1]]).sort((a, b) => a[0] - b[0]);
  const n = k.length;
  if (n === 1) { const y = k[0][1]; return () => y; }
  const xs = k.map(p => p[0]), ys = k.map(p => p[1]);
  const d: number[] = [], m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const q = 3 / Math.sqrt(s); m[i] = q * a * d[i]; m[i + 1] = q * b * d[i]; }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// ---------- Loft-i (trup nga prerje tërthore simetrike) ----------
export interface Loft {
  n: number;                 // pikat e gjysmë-konturit (nga mesi poshtë te mesi lart)
  zF: number; zR: number; rF: number; rR: number; cy: number;
  sec(z: number, o: number[]): void;
}
export function set2(o: number[], j: number, x: number, y: number): void { o[j * 2] = x; o[j * 2 + 1] = y; }

/** Ndërton rrjetën e loft-it; cls(zMes, segmenti) zgjedh materialin (null = hiqe). */
export function emitLoft(L: Loft, zs: number[], cls: (zm: number, j: number) => Tgt | null, capF: Tgt | null, capR: Tgt | null): void {
  const n = L.n, cols = 2 * n - 2, rows = zs.length;
  const P = new Float64Array(rows * cols * 3), N = new Float64Array(rows * cols * 3);
  const h: number[] = [];
  for (let r = 0; r < rows; r++) {
    L.sec(zs[r], h);
    for (let c = 0; c < cols; c++) {
      const j = c < n ? c : cols - c, sx = c < n ? 1 : -1, o = (r * cols + c) * 3;
      P[o] = h[j * 2] * sx; P[o + 1] = h[j * 2 + 1]; P[o + 2] = zs[r];
    }
  }
  const id = (r: number, c: number) => (r * cols + c) * 3;
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols; c++) {
    const c2 = (c + 1) % cols;
    const a = id(r, c), b = id(r + 1, c), cc = id(r + 1, c2), d = id(r, c2);
    const e1x = P[cc] - P[a], e1y = P[cc + 1] - P[a + 1], e1z = P[cc + 2] - P[a + 2];
    const e2x = P[d] - P[b], e2y = P[d + 1] - P[b + 1], e2z = P[d + 2] - P[b + 2];
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    for (const q of [a, b, cc, d]) { N[q] += nx; N[q + 1] += ny; N[q + 2] += nz; }
  }
  // Orientimi: normalja në anën e djathtë (x>0) në mes duhet të shohë nga +x.
  const rm = Math.floor(rows / 2), probe = id(rm, Math.floor(n / 2));
  const sgn = N[probe] < 0 ? -1 : 1;
  for (let q = 0; q < N.length; q += 3) {
    const l = Math.hypot(N[q], N[q + 1], N[q + 2]) || 1;
    N[q] *= sgn / l; N[q + 1] *= sgn / l; N[q + 2] *= sgn / l;
  }
  const maps = new Map<Tgt, Int32Array>();
  const vid = (t: Tgt, r: number, c: number) => {
    let m = maps.get(t);
    if (!m) { m = new Int32Array(rows * cols).fill(-1); maps.set(t, m); }
    const k = r * cols + c;
    if (m[k] >= 0) return m[k];
    const o = k * 3;
    return (m[k] = t.b.v(P[o], P[o + 1], P[o + 2], N[o], N[o + 1], N[o + 2], t.u, t.v, t.u1, t.v1));
  };
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols; c++) {
    const c2 = (c + 1) % cols, j = c < n - 1 ? c : cols - c - 1;
    const t = cls((zs[r] + zs[r + 1]) / 2, j);
    if (!t) continue;
    const q = [vid(t, r, c), vid(t, r + 1, c), vid(t, r + 1, c2), vid(t, r, c2)];
    triOriented(t.b, q[0], q[1], q[2]); triOriented(t.b, q[0], q[2], q[3]);
  }
  const cap = (r: number, t: Tgt, dir: number) => {
    let cx = 0, cy = 0;
    for (let c = 0; c < cols; c++) { cy += P[id(r, c) + 1]; }
    cy /= cols;
    const z = zs[r], B = t.b;
    const ci = B.v(cx, cy, z, 0, 0, dir, t.u, t.v, t.u1, t.v1);
    const ids: number[] = [];
    for (let c = 0; c < cols; c++) { const o = id(r, c); ids.push(B.v(P[o], P[o + 1], z, 0, 0, dir, t.u, t.v, t.u1, t.v1)); }
    for (let c = 0; c < cols; c++) {
      const a = ids[c], b = ids[(c + 1) % cols];
      const ax = B.p[a * 3] - cx, ay = B.p[a * 3 + 1] - cy, bx = B.p[b * 3] - cx, by = B.p[b * 3 + 1] - cy;
      const cr = ax * by - ay * bx;
      if (Math.abs(cr) < 1e-9) continue;
      if (cr * dir > 0) B.i.push(ci, a, b); else B.i.push(ci, b, a);
    }
  };
  if (capF) cap(0, capF, zs[0] > zs[rows - 1] ? 1 : -1);
  if (capR) cap(rows - 1, capR, zs[0] > zs[rows - 1] ? -1 : 1);
}

function triOriented(B: GB, a: number, b: number, c: number): void {
  const p = B.p, n = B.n;
  const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
  const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
  if (fx * fx + fy * fy + fz * fz < 1e-14) return;
  const s = fx * (n[a * 3] + n[b * 3] + n[c * 3]) + fy * (n[a * 3 + 1] + n[b * 3 + 1] + n[c * 3 + 1]) + fz * (n[a * 3 + 2] + n[b * 3 + 2] + n[c * 3 + 2]);
  if (s < 0) B.i.push(a, c, b); else B.i.push(a, b, c);
}

/** Stacionet: rrumbullakimet e skajeve (sipas këndit), harqet e rrotave dhe hapa të njëtrajtshëm. */
export function stations(L: Loft, axles: number[], Ra: number, step: number, mEnd: number, mArch: number, extra: number[] = []): number[] {
  const zs: number[] = [...extra];
  for (let i = 0; i <= mEnd; i++) {
    const ph = (i / mEnd) * PI / 2;
    zs.push(L.zF - L.rF * (1 - Math.sin(ph)), L.zR + L.rR * (1 - Math.sin(ph)));
  }
  for (let z = L.zF - L.rF; z > L.zR + L.rR; z -= step) zs.push(z);
  for (const za of axles) {
    for (let i = 0; i <= mArch; i++) zs.push(za + Ra * Math.cos(PI * i / mArch));
    zs.push(za + Ra + 0.025, za - Ra - 0.025);
  }
  const s = zs.filter(z => z <= L.zF + 1e-9 && z >= L.zR - 1e-9).sort((a, b) => b - a);
  const out: number[] = [];
  for (const z of s) if (!out.length || out[out.length - 1] - z > 0.01) out.push(z);
  if (out[0] < L.zF) out.unshift(L.zF);
  if (out[out.length - 1] > L.zR) out.push(L.zR);
  return out;
}

// ---------- Mostrimi i sipërfaqes ----------
const _h0: number[] = [], _p = [0, 0], _q = [0, 0], _r = [0, 0], _w = [0, 0];
export function halfAt(L: Loft, z: number, s: number, o: number[]): void {
  L.sec(z, _h0);
  const j = Math.max(0, Math.min(L.n - 2, Math.floor(s))), f = clamp(s - j, 0, 1);
  o[0] = lerp(_h0[j * 2], _h0[j * 2 + 2], f); o[1] = lerp(_h0[j * 2 + 1], _h0[j * 2 + 3], f);
}
/** s sipas lartësisë y (në pjesën anësore të konturit). */
export function sAtY(L: Loft, z: number, y: number): number {
  L.sec(z, _h0);
  for (let j = 1; j < L.n - 2; j++) {
    const y0 = _h0[j * 2 + 1], y1 = _h0[j * 2 + 3];
    if (y1 > y0 && y >= y0 && y <= y1) return j + (y - y0) / (y1 - y0);
  }
  return y < _h0[3] ? 1 : L.n - 2;
}
/** Pika + normalja e sipërfaqes në (z, s), e zhvendosur `off` sipas normales. out = [x,y,z,nx,ny,nz]. */
export function surf(L: Loft, z: number, s: number, side: number, off: number, out: number[]): number[] {
  z = clamp(z, L.zR, L.zF);
  halfAt(L, z, s, _p);
  const e = 0.003, za = Math.min(L.zF, z + e), zb = Math.max(L.zR, z - e);
  halfAt(L, za, s, _q); halfAt(L, zb, s, _r);
  const tzx = (_q[0] - _r[0]) * side, tzy = _q[1] - _r[1], tzz = za - zb;
  const ds = 0.05, sa = Math.min(L.n - 1, s + ds), sb = Math.max(0, s - ds);
  halfAt(L, z, sa, _q); halfAt(L, z, sb, _w);
  const tsx = (_q[0] - _w[0]) * side, tsy = _q[1] - _w[1];
  let nx = tsy * tzz, ny = -tsx * tzz, nz = tsx * tzy - tsy * tzx;
  const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  const px = _p[0] * side, py = _p[1];
  if (nx * px + ny * (py - L.cy) + nz * (z - (L.zF + L.zR) / 2) * 0.3 < 0) { nx = -nx; ny = -ny; nz = -nz; }
  out[0] = px + nx * off; out[1] = py + ny * off; out[2] = z + nz * off; out[3] = nx; out[4] = ny; out[5] = nz;
  return out;
}

/** Patch mbi sipërfaqe: f(u,v) → [z, s]; tg zgjedh target-in për çdo katërkëndësh. */
export function patch(L: Loft, side: number, nu: number, nv: number, f: (u: number, v: number, o: number[]) => void, off: number,
  tg: (u: number, v: number) => Tgt | null, uvf?: (u: number, v: number) => number[]): void {
  const pts: number[][] = [], o = [0, 0];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { f(i / nu, j / nv, o); pts.push(surf(L, o[0], o[1], side, off, [])); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const t = tg((i + 0.5) / nu, (j + 0.5) / nv);
    if (!t) continue;
    const k = (a: number, b: number) => a * (nv + 1) + b;
    emitQuad(t, pts[k(i, j)], pts[k(i + 1, j)], pts[k(i + 1, j + 1)], pts[k(i, j + 1)],
      uvf ? [uvf(i / nu, j / nv), uvf((i + 1) / nu, j / nv), uvf((i + 1) / nu, (j + 1) / nv), uvf(i / nu, (j + 1) / nv)] : undefined);
  }
}

export interface LampDef { depth: number; s0: number; s1: number; b0: number; b1: number; cap: number; rise: number }
/** Fener që mbështillet nga anësori te faqja fundore. byY: s0..b1 janë lartësi (m). */
export function lampWrap(L: Loft, end: number, lp: LampDef, off: number, grow: number, low: boolean,
  tg: (u: number, v: number, side: number) => Tgt | null, byY = false, sides: number[] = [1, -1]): void {
  const zEnd = end > 0 ? L.zF : L.zR, R = Math.max(0.01, end > 0 ? L.rF : L.rR);
  const depth = lp.depth + grow;
  const zl: number[] = [];
  if (depth > R + 0.01) zl.push(zEnd - end * depth);
  const ph0 = depth > R ? 0 : Math.asin(clamp(1 - depth / R, 0, 1));
  const m = low ? 2 : 5;
  for (let i = 0; i <= m; i++) zl.push(zEnd - end * R * (1 - Math.sin(lerp(ph0, PI / 2, i / m))));
  const nC = lp.cap > 0 ? (low ? 1 : 2) : 0, nv = low ? 1 : 3, cols = zl.length + nC;
  const sv = (z: number, val: number) => (byY ? sAtY(L, z, val) : val);
  const g = byY ? grow * 1.0 : grow * 4;
  for (const side of sides) {
    const pts: number[][] = [];
    for (let ci = 0; ci < cols; ci++) for (let vi = 0; vi <= nv; vi++) {
      const v = vi / nv;
      if (ci < zl.length) {
        const z = zl[ci], us = ci / (zl.length - 1);
        const sEnd = lerp(sv(z, lp.s0 - g), sv(z, lp.s1 + g), v), sBack = lerp(sv(z, lp.b0 - g), sv(z, lp.b1 + g), v);
        pts.push(surf(L, z, lerp(sBack, sEnd, us), side, off, []));
      } else {
        const cc = (ci - zl.length + 1) / nC;
        const q = surf(L, zEnd, lerp(sv(zEnd, lp.s0 - g), sv(zEnd, lp.s1 + g), v), side, 0, []);
        pts.push([q[0] - side * (lp.cap + grow) * cc, q[1] + lp.rise * cc, zEnd + end * off, 0, 0, end]);
      }
    }
    for (let ci = 0; ci < cols - 1; ci++) for (let vi = 0; vi < nv; vi++) {
      const t = tg((ci + 0.5) / (cols - 1), (vi + 0.5) / nv, side);
      if (!t) continue;
      const k = (a: number, b: number) => a * (nv + 1) + b;
      emitQuad(t, pts[k(ci, vi)], pts[k(ci + 1, vi)], pts[k(ci + 1, vi + 1)], pts[k(ci, vi + 1)]);
    }
  }
}

// ---------- Materialet e përbashkëta ----------
let detailMat: THREE.MeshStandardMaterial | null = null;
export function getDetailMaterial(): THREE.MeshStandardMaterial {
  if (detailMat) return detailMat;
  const c = new Uint8Array(64), mr = new Uint8Array(64);
  ATLAS.forEach(([hex, r, m], i) => {
    c[i * 4] = (hex >> 16) & 255; c[i * 4 + 1] = (hex >> 8) & 255; c[i * 4 + 2] = hex & 255; c[i * 4 + 3] = 255;
    mr[i * 4] = 255; mr[i * 4 + 1] = Math.round(r * 255); mr[i * 4 + 2] = Math.round(m * 255); mr[i * 4 + 3] = 255;
  });
  const mk = (d: Uint8Array, srgb: boolean) => {
    const t = new THREE.DataTexture(d, 4, 4);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  const mrt = mk(mr, false);
  detailMat = new THREE.MeshStandardMaterial({
    map: mk(c, true), roughnessMap: mrt, metalnessMap: mrt, roughness: 1, metalness: 1,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  detailMat.name = 'car-detail';
  return detailMat;
}

let paintQuality: Quality = 'medium';
const paintCache = new Map<string, THREE.Material>();
/** Cilësia e llakut për makinat e reja ('high' = MeshPhysicalMaterial me clearcoat). */
export function setVehicleQuality(q: Quality): void { paintQuality = q; }
export function getPaint(color: number, damaged: boolean, low: boolean): THREE.Material {
  const q = low && paintQuality === 'high' ? 'medium' : paintQuality;
  const key = `${color}|${damaged ? 1 : 0}|${q}`;
  let m = paintCache.get(key);
  if (m) return m;
  const col = new THREE.Color(color);
  if (damaged) col.multiplyScalar(0.62);
  if (q === 'high') {
    m = new THREE.MeshPhysicalMaterial({ color: col, metalness: damaged ? 0.1 : 0.22, roughness: damaged ? 0.75 : 0.4, clearcoat: damaged ? 0.15 : 1, clearcoatRoughness: damaged ? 0.6 : 0.05 });
  } else {
    m = new THREE.MeshStandardMaterial({ color: col, metalness: damaged ? 0.1 : 0.3, roughness: damaged ? 0.75 : q === 'low' ? 0.45 : 0.32 });
  }
  m.name = 'car-paint';
  paintCache.set(key, m);
  return m;
}

let glowAlpha: THREE.DataTexture | null = null;
export function getGlowAlpha(): THREE.DataTexture {
  if (glowAlpha) return glowAlpha;
  const S = 32, d = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x + 0.5) / S * 2 - 1, dy = (y + 0.5) / S * 2 - 1;
    const r = Math.min(1, Math.hypot(dx, dy));
    const a = Math.pow(1 - r, 2.2) * 255, i = (y * S + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = a; d[i + 3] = 255;
  }
  glowAlpha = new THREE.DataTexture(d, S, S);
  glowAlpha.magFilter = glowAlpha.minFilter = THREE.LinearFilter;
  glowAlpha.needsUpdate = true;
  return glowAlpha;
}

let taxiMat: THREE.MeshBasicMaterial | null = null;
export function getTaxiMaterial(): THREE.MeshBasicMaterial {
  if (taxiMat) return taxiMat;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffd21a'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#111'; g.font = 'bold 36px "Saira Extra Condensed", "Arial Narrow", Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TAXI', 64, 30);
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#111' : '#fff'; g.fillRect(i * 8, 54, 8, 5); g.fillStyle = i % 2 ? '#fff' : '#111'; g.fillRect(i * 8, 59, 8, 5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  taxiMat = new THREE.MeshBasicMaterial({ map: t });
  return taxiMat;
}

// ---------- Targat dhe mbishkrimet (kanavacë 256×128 për makinë) ----------
const CITIES = ['TR', 'TR', 'TR', 'DR', 'SH', 'EL', 'VL', 'FR', 'KO', 'BR', 'LB', 'KR', 'GJ'];
const LET = 'ABCDEFGHJKLMNPRSTUVZ';
let plateSeed = 7;
export function randomPlate(): string {
  const r = () => { plateSeed = (plateSeed * 16807) % 2147483647; return plateSeed / 2147483647; };
  const num = String(100 + Math.floor(r() * 900));
  return `${CITIES[Math.floor(r() * CITIES.length)]} ${num} ${LET[Math.floor(r() * LET.length)]}${LET[Math.floor(r() * LET.length)]}`;
}
/** UV për targën (u,v ∈ 0..1) dhe për rajonin e dytë (mbishkrime). */
export const plateUV = (u: number, v: number) => [u, lerp(0.5625, 1, v)];
export const decalUV = (u: number, v: number) => [u, lerp(0.125, 0.5, v)];

export function makeDecalTexture(kind: string, plate: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  const F = '"Saira Extra Condensed", "Arial Narrow", Arial, sans-serif';
  // targa shqiptare: e bardhë, shirit blu majtas me "AL"
  g.fillStyle = '#1b1b1b'; g.beginPath(); g.roundRect(0, 0, 256, 56, 7); g.fill();
  g.fillStyle = '#f4f4f0'; g.beginPath(); g.roundRect(2, 2, 252, 52, 6); g.fill();
  g.fillStyle = '#1d3fa0'; g.beginPath(); g.roundRect(2, 2, 34, 52, [6, 0, 0, 6]); g.fill();
  g.fillStyle = '#d61f26'; g.fillRect(12, 10, 14, 10);
  g.fillStyle = '#fff'; g.font = `bold 17px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AL', 19, 40);
  g.fillStyle = '#111'; g.font = `bold 38px ${F}`; g.fillText(plate, 146, 30, 204);
  const R2 = (txt: string, bg: string | null, fg: string, size: number) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 64, 256, 48); }
    g.fillStyle = fg; g.font = `bold ${size}px ${F}`; g.fillText(txt, 128, 89, 244);
  };
  if (kind === 'police') {
    g.fillStyle = '#f7f7f7'; g.fillRect(0, 64, 256, 48);
    g.fillStyle = '#16348c'; g.fillRect(0, 64, 256, 5); g.fillRect(0, 107, 256, 5);
    g.font = `bold 38px ${F}`; g.fillText('POLICIA', 128, 89);
  } else if (kind === 'taxi') {
    for (let i = 0; i < 32; i++) for (let j = 0; j < 3; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#f5f5f5'; g.fillRect(i * 8, 64 + j * 16, 8, 16); }
  } else if (kind === 'furgon') {
    g.fillStyle = '#fafaf5'; g.fillRect(0, 64, 256, 48); g.strokeStyle = '#c21f26'; g.lineWidth = 4; g.strokeRect(3, 67, 250, 42);
    R2('TIRANË – DURRËS', null, '#c21f26', 30);
  } else if (kind === 'bus') {
    R2('12  TIRANA E RE', '#0b0b0b', '#ffb21e', 32);
  } else if (kind === 'van') {
    R2('DËRGESA EKSPRES', null, '#13306e', 34);
    g.fillStyle = '#e8742a'; g.fillRect(28, 104, 200, 5);
  } else if (kind === 'truck') {
    R2('TRANSPORT MALLRASH', null, '#18263f', 31);
    g.fillStyle = '#c21f26'; g.fillRect(20, 104, 216, 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

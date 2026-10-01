/** Ndërtimi i modeleve procedurale për 12 stilet e trupit (gjeometria ndahet sipas stilit + LOD). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { BodyStyle } from '../core/contracts';
import { clamp, lerp } from '../core/math';
import {
  CH, Kit, SLOT, PI, addGeo, box, capShape, cyl, emitLoft, emitQuad, halfAt, lampWrap, mat, patch, pchip, plateUV, decalUV,
  roundRect, sAtY, set2, stations, surf, type Loft, type Tgt,
} from './geo';
import { STYLES, type StyleDef } from './styles';
import { addWheel, wheelGeometry } from './wheels';

export interface WheelPos { x: number; y: number; z: number; steer: boolean }
export interface CarModel {
  paint: THREE.BufferGeometry; detail: THREE.BufferGeometry; lights: THREE.BufferGeometry | null;
  decal: THREE.BufferGeometry | null; glow: THREE.BufferGeometry | null; sign: THREE.BufferGeometry | null;
  wheelR: THREE.BufferGeometry | null; wheelL: THREE.BufferGeometry | null;
  wheels: WheelPos[]; st: StyleDef; height: number; tris: number; decalKind: string;
}

const _a = [0, 0];
function rbox(t: Tgt, w: number, h: number, d: number, r: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void {
  addGeo(t, new RoundedBoxGeometry(w, h, d, 1, Math.min(r, w / 2, h / 2, d / 2)), mat(x, y, z, rx, ry, rz));
}
/** Katërkëndësh i sheshtë (p.sh. targa) me uv; end = drejtimi i normales në z. */
function flatQuad(t: Tgt, cx: number, cy: number, z: number, w: number, h: number, end: number, uv: (u: number, v: number) => number[]): void {
  const s = end > 0 ? 1 : -1;
  const P = (u: number, v: number) => [cx + s * (u - 0.5) * w, cy + (v - 0.5) * h, z, 0, 0, end];
  emitQuad(t, P(0, 0), P(1, 0), P(1, 1), P(0, 1), [uv(0, 0), uv(1, 0), uv(1, 1), uv(0, 1)]);
}
/** Katërkëndësh shkëlqimi (uv = 0..1 për alphaMap, uv1 = kanali). */
function glowQuad(k: Kit, ch: number, x: number, y: number, z: number, w: number, h: number, dir: 'f' | 'b' | 'l' | 'r' | 'up'): void {
  const c = k.C(ch), t: Tgt = { b: k.glow, u: 0, v: 0, u1: c.u1, v1: c.v1 };
  const P = (u: number, v: number) => {
    const a = (u - 0.5) * w, b = (v - 0.5) * h;
    if (dir === 'f') return [x + a, y + b, z, 0, 0, 1];
    if (dir === 'b') return [x - a, y + b, z, 0, 0, -1];
    if (dir === 'l') return [x, y + b, z - a, 1, 0, 0];
    if (dir === 'r') return [x, y + b, z + a, -1, 0, 0];
    return [x + a, y, z + b, 0, 1, 0];
  };
  emitQuad(t, P(0, 0), P(1, 0), P(1, 1), P(0, 1), [[0, 0], [1, 0], [1, 1], [0, 1]]);
}

// ======================================================================
// Makinat e zakonshme (loft trupi + kabinë)
// ======================================================================
function buildCar(style: BodyStyle, st: StyleDef, k: Kit): number {
  const low = k.low;
  const zF = st.L / 2, zR = -st.L / 2;
  const topF = pchip(st.top), widF = st.width ? pchip(st.width) : () => 1;
  const Ra = st.R + st.archGap, yc = st.R + 0.01;
  const black = k.S(SLOT.black);

  const body: Loft = {
    n: 10, zF, zR, rF: st.noseR, rR: st.tailR, cy: (st.sill + topF(0)) / 2,
    sec(z, o) {
      let W = st.W * widF(z), yt = topF(z), yb = st.sill;
      let d = 0, kt = 0, kb = 0;
      if (z > zF - st.noseR) { const q = Math.min(1, (z - zF + st.noseR) / st.noseR); d = st.noseR * (1 - Math.sqrt(1 - q * q)); [kt, kb] = st.noseK; }
      else if (z < zR + st.tailR) { const q = Math.min(1, (zR + st.tailR - z) / st.tailR); d = st.tailR * (1 - Math.sqrt(1 - q * q)); [kt, kb] = st.tailK; }
      W -= d; yt -= d * kt; yb += d * kb;
      const ys = Math.max(yt - st.sh, yb + 0.06), cr = st.crown;
      set2(o, 0, 0, yb); set2(o, 1, 0.8 * W, yb); set2(o, 2, 0.95 * W, yb + 0.035);
      set2(o, 3, 0.993 * W, yb + 0.4 * (ys - yb)); set2(o, 4, W, ys); set2(o, 5, 0.975 * W, yt - st.sh * 0.38);
      set2(o, 6, 0.925 * W, yt - 0.012); set2(o, 7, 0.8 * W, yt + cr * 0.3); set2(o, 8, 0.45 * W, yt + cr * 0.82); set2(o, 9, 0, yt + cr);
      let ya = -1;
      for (const za of st.axles) { const dz = z - za; if (Math.abs(dz) < Ra) ya = Math.max(ya, yc + Math.sqrt(Ra * Ra - dz * dz)); }
      if (ya > yb) for (let j = 0; j <= 4; j++) o[j * 2 + 1] = Math.min(Math.max(o[j * 2 + 1], ya), o[11] - 0.004 * (5 - j));
    },
  };
  const bed = style === 'pickup' ? { z0: -0.68, z1: zR + 0.06, floor: 1.0, rail: 1.25, t: 0.07 } : null;
  const c = st.cabin!;
  const zs = stations(body, st.axles, Ra, low ? 0.6 : 0.24, low ? 3 : 6, low ? 4 : 9, bed ? [-0.56, -0.6, -0.64, -0.68, -0.72] : []);
  const darkUnder = k.S(SLOT.dark);
  emitLoft(body, zs, (zm, j) => {
    if (j === 0) return darkUnder;
    if (st.clad && j <= 1) return black;
    if (bed && j >= 6 && zm < bed.z0 + 0.02 && zm > bed.z1 - 0.1) return k.S(SLOT.black);
    return k.P;
  }, k.P, k.P);

  // ---------- Kabina (xhamat) ----------
  const belt = (z: number) => topF(z);
  const roofF = c.roof, roofR = c.roof - (c.drop ?? 0);
  const roofAt = (z: number) => {
    if (z >= c.zWT) { const t = clamp((c.zA - z) / (c.zA - c.zWT), 0, 1); return belt(z) + (roofF - belt(z)) * (t + 0.22 * t * (1 - t)); }
    if (z >= c.zRT || c.capR) { const t = clamp((c.zWT - z) / (c.zWT - c.zRT), 0, 1); return lerp(roofF, roofR, t) + (c.bulge ?? 0.02) * Math.sin(PI * t); }
    const t = clamp((c.zRT - z) / (c.zRT - c.zRB), 0, 1);
    return roofR - (roofR - belt(z)) * (t - 0.3 * t * (1 - t));
  };
  const hr = roofF - belt((c.zA + c.zRB) / 2);
  const cab: Loft = {
    n: 7, zF: c.zA, zR: c.zRB, rF: 0, rR: c.capR ?? 0, cy: belt(0) + 0.15,
    sec(z, o) {
      const yb = belt(z) - 0.004;
      let Wb = st.W * widF(z) - c.inset, yr = roofAt(z);
      if (c.capR && z < c.zRB + c.capR) {
        const q = Math.min(1, (c.zRB + c.capR - z) / c.capR), d = c.capR * (1 - Math.sqrt(1 - q * q));
        Wb -= d; yr -= d * 0.6;
      }
      const h = Math.max(0, yr - yb), f = Math.min(1, h / hr);
      const Wt = Wb - c.tumble * f, rr = Math.min(0.1, h * 0.3), cr = (c.crown ?? 0.03) * f;
      const y1 = yb + Math.min(0.035, h * 0.25);
      set2(o, 0, Wb + 0.004, yb - 0.06); set2(o, 1, Wb, y1);
      set2(o, 2, Wt + rr * 0.5, Math.max(y1, yr - rr)); set2(o, 3, Wt + rr * 0.1, Math.max(y1, yr - rr * 0.3));
      set2(o, 4, Wt - rr * 0.55, yr); set2(o, 5, (Wt - rr * 0.55) * 0.5, yr + cr * 0.75); set2(o, 6, 0, yr + cr);
    },
  };
  const cz: number[] = [];
  const nW = low ? 2 : 6, nRf = low ? 2 : 5, nRr = low ? 2 : 5;
  for (let i = 0; i <= nW; i++) cz.push(lerp(c.zA, c.zWT, i / nW));
  for (let i = 1; i <= nRf; i++) cz.push(lerp(c.zWT, c.capR ? c.zRB + c.capR : c.zRT, i / nRf));
  if (c.capR) { const m = low ? 2 : 4; for (let i = 1; i <= m; i++) cz.push(c.zRB + c.capR * (1 - Math.sin(i / m * PI / 2))); }
  else for (let i = 1; i <= nRr; i++) cz.push(lerp(c.zRT, c.zRB, i / nRr));
  const glass = k.S(SLOT.glass), roofT = c.roofGlass ? glass : k.P;
  const beltT = k.S(c.belt === 'chrome' ? SLOT.chrome : SLOT.black);
  emitLoft(cab, cz, (zm, j) => {
    if (j === 0) return beltT;
    if (j <= 3) return k.P;
    if (zm > c.zWT) return glass;
    if (zm > c.zRT || c.capR) return roofT;
    return glass;
  }, null, c.capR ? k.P : null);

  // dritaret anësore: kornizë e zezë + xham
  for (const w of c.windows) for (const side of [1, -1]) {
    const nu = low ? 2 : Math.max(2, Math.ceil(Math.abs(w[0] - w[2]) / 0.22));
    if (!low) patch(cab, side, nu, 1, (u, v, o) => {
      o[0] = lerp(lerp(w[0], w[1], v) + 0.035, lerp(w[2], w[3], v) - 0.035, u); o[1] = lerp(0.9, 2.3, v);
    }, 0.004, () => black);
    patch(cab, side, nu, 1, (u, v, o) => {
      o[0] = lerp(lerp(w[0], w[1], v), lerp(w[2], w[3], v), u); o[1] = lerp(1.1, 1.94, v);
    }, 0.008, () => glass);
  }
  // xhamat e pasëm të sheshtë (furgonë / pickup)
  const yRoofEnd = roofR, yBeltEnd = belt(c.zRB);
  if (c.capR) {
    const zb = c.zRB - 0.006, cw = st.W - c.inset - c.capR - 0.06;
    if (style === 'pickup') rbox(glass, 1.0, (yRoofEnd - yBeltEnd) * 0.45, 0.01, 0.04, 0, yBeltEnd + (yRoofEnd - yBeltEnd) * 0.55, zb);
    else {
      const hh = (yRoofEnd - yBeltEnd) * 0.5, yy = yBeltEnd + (yRoofEnd - yBeltEnd) * 0.58;
      for (const s of [1, -1]) rbox(glass, cw * 0.86, hh, 0.012, 0.05, s * cw * 0.5, yy, zb);
      box(k.S(SLOT.gap), 0.012, yRoofEnd - st.sill - 0.15, 0.012, 0, (yRoofEnd + st.sill) / 2, c.zRB - 0.002);
    }
  }

  // pasqyrat
  if (!low || st.W > 0.95) {
    const mz = c.zA - (style === 'van' || style === 'furgon' ? 0.12 : 0.2);
    halfAt(cab, mz, 1.0, _a);
    const mx = _a[0], my = Math.max(_a[1], belt(mz)) + (style === 'van' || style === 'furgon' ? 0.32 : 0.1);
    for (const s of [1, -1]) {
      if (style === 'van' || style === 'furgon') {
        rbox(black, 0.06, 0.26, 0.09, 0.02, s * (mx + 0.16), my, mz - 0.02);
        box(black, 0.16, 0.025, 0.025, s * (mx + 0.07), my - 0.08, mz);
      } else {
        rbox(k.P, 0.2, 0.11, 0.09, 0.035, s * (mx + 0.12), my, mz - 0.03, 0, s * 0.12, 0);
        if (!low) box(k.S(SLOT.glass), 0.165, 0.08, 0.006, s * (mx + 0.125), my, mz - 0.077, 0, s * 0.12, 0);
        box(black, 0.08, 0.03, 0.05, s * (mx + 0.03), my - 0.03, mz);
      }
    }
  }

  // ---------- Harqet e rrotave ----------
  for (const za of st.axles) for (const s of [1, -1]) {
    const dep = 0.42, xc = s * (st.W * widF(za) - dep / 2 - 0.01);
    const g = new THREE.CylinderGeometry(Ra - 0.01, Ra - 0.01, dep, low ? 6 : 12, 1, true, -0.25, PI + 0.5);
    addGeo(darkUnder, g, mat(xc, yc, za, 0, 0, PI / 2), false, true);
    addGeo(darkUnder, new THREE.CircleGeometry(Ra - 0.01, low ? 5 : 10, -0.25, PI + 0.5), mat(s * (st.W * widF(za) - dep), yc, za, 0, s * PI / 2, 0));
  }

  // ---------- Fenerët ----------
  const hd = st.head;
  if (!low) lampWrap(body, 1, hd, 0.004, 0.025, low, () => black);
  lampWrap(body, 1, hd, 0.008, 0, low, (u, v, side) =>
    low ? k.C(CH.head) : u < 0.17 ? k.C(side > 0 ? CH.indL : CH.indR) : v > 0.66 ? k.C(CH.drl) : k.C(CH.head));
  const tl = st.tail;
  if (style !== 'pickup') {
    if (!low) lampWrap(body, -1, tl, 0.004, 0.02, low, () => black);
    lampWrap(body, -1, tl, 0.008, 0, low, (u, v, side) =>
      low ? k.C(CH.tail) : u < 0.16 ? k.C(side > 0 ? CH.indL : CH.indR) : (tl.cap > 0.1 && u > 0.82) ? k.C(CH.rev) : k.C(CH.tail));
  }
  // fytyra e përparme
  const cap = (s: number) => { halfAt(body, zF, s, _a); return [_a[0], _a[1]]; };
  const [hx0, hy0] = cap(hd.s0), [, ybF] = cap(0.5);
  const innerX = hx0 - hd.cap;
  front(style, st, k, zF, ybF, hy0, innerX, low);
  // fytyra e pasme
  const [tx0, ty0] = cap2(body, zR, tl.s0), [, ty1] = cap2(body, zR, tl.s1), [, ybR] = cap2(body, zR, 0.5);
  rear(style, st, k, zR, ybR, ty0, ty1, tx0 - tl.cap, low);

  // ---------- Detajet anësore ----------
  if (!low) {
    for (const [z, s0] of st.doors) for (const side of [1, -1]) {
      patch(body, side, 1, 4, (u, v, o) => { o[0] = z + (u - 0.5) * 0.012; o[1] = lerp(s0, 6.05, v); }, 0.003, () => k.S(SLOT.gap));
      if (style === 'van' || style === 'furgon') patch(cab, side, 1, 1, (u, v, o) => { o[0] = z + (u - 0.5) * 0.012; o[1] = lerp(0.9, 2.2, v); }, 0.003, () => k.S(SLOT.gap));
    }
    for (const z of st.handles) for (const side of [1, -1]) {
      const p = surf(body, z, 5.3, side, 0.01, []);
      box(k.S(SLOT.chrome), 0.025, 0.028, 0.15, p[0], p[1], p[2]);
    }
  }
  extras(style, st, k, body, cab, topF, roofAt, low);
  return Math.max(c.roof, 1.2);
}

function cap2(L: Loft, z: number, s: number): number[] { halfAt(L, z, s, _a); return [_a[0], _a[1]]; }

/** Grila, marrja e ajrit, targa e përparme, shkëlqimet e fenerëve. */
function front(style: BodyStyle, st: StyleDef, k: Kit, zF: number, yb: number, yH: number, xIn: number, low: boolean): void {
  const z = zF + 0.004, black = k.S(SLOT.black), chrome = k.S(SLOT.chrome), dark = k.S(SLOT.dark);
  const g = st.grille;
  const gTop = yH - 0.025, span = gTop - yb;
  if (g === 'sport') {
    capShape(dark, roundRect(0.9, span * 0.42, 0.06), 0, yb + span * 0.33, z);
    for (const s of [1, -1]) capShape(dark, roundRect(0.34, span * 0.5, 0.08), s * 0.7, yb + span * 0.36, z);
    box(black, 1.5, 0.03, 0.14, 0, yb - 0.01, zF - 0.06);
    if (!low) for (let i = 0; i < 3; i++) box(black, 0.86, 0.012, 0.02, 0, yb + span * (0.22 + i * 0.1), z + 0.005);
  } else if (g === 'suv') {
    const gw = Math.max(0.5, xIn * 2 - 0.04);
    capShape(black, roundRect(gw, span * 0.5, 0.05), 0, gTop - span * 0.26, z);
    if (!low) for (let i = 0; i < 4; i++) box(chrome, gw - 0.04, 0.018, 0.02, 0, gTop - span * (0.07 + i * 0.12), z + 0.006);
    capShape(dark, roundRect(1.1, span * 0.18, 0.04), 0, yb + span * 0.2, z);
    box(k.S(SLOT.grey), 0.9, 0.05, 0.08, 0, yb + 0.02, zF - 0.02);
    if (!low) for (const s of [1, -1]) addGeo(k.C(CH.drl), new THREE.CircleGeometry(0.045, 10), mat(s * 0.62, yb + span * 0.22, z + 0.004));
  } else if (g === 'van') {
    const gw = Math.max(0.5, xIn * 2 - 0.06);
    capShape(black, roundRect(gw, span * 0.42, 0.03), 0, gTop - span * 0.2, z);
    if (!low) for (let i = 0; i < 3; i++) box(k.S(SLOT.grey), gw - 0.05, 0.02, 0.02, 0, gTop - span * (0.08 + i * 0.12), z + 0.006);
    box(k.S(SLOT.grey), st.W * 2 - 0.25, span * 0.3, 0.12, 0, yb + span * 0.15, zF - 0.02);
  } else if (g !== 'none') {
    const gw = g === 'hatch' ? Math.max(0.4, xIn * 2 - 0.1) : Math.max(0.5, xIn * 2 - 0.04);
    const gh = g === 'hatch' ? span * 0.22 : span * 0.36;
    capShape(black, roundRect(gw, gh, 0.04), 0, gTop - gh / 2 - 0.01, z);
    if (!low && g === 'sedan') for (let i = 0; i < 3; i++) box(chrome, gw - 0.05, 0.012, 0.016, 0, gTop - 0.03 - i * gh * 0.32, z + 0.006);
    if (!low && g === 'hatch') box(chrome, gw, 0.012, 0.014, 0, gTop - 0.005, z + 0.005);
    capShape(dark, roundRect(g === 'hatch' ? 1.0 : 1.15, span * 0.2, 0.05), 0, yb + span * 0.2, z);
    if (g === 'police') {
      // shufra mbrojtëse
      for (const s of [1, -1]) box(black, 0.05, span * 0.75, 0.05, s * 0.32, yb + span * 0.45, zF + 0.12);
      box(black, 0.74, 0.05, 0.05, 0, yb + span * 0.72, zF + 0.12);
      box(black, 0.74, 0.05, 0.05, 0, yb + span * 0.25, zF + 0.12);
      if (!low) for (const s of [1, -1]) box(k.C(s > 0 ? CH.sirR : CH.sirB), 0.12, 0.04, 0.02, s * 0.2, yb + span * 0.72, zF + 0.15);
    }
  }
  // targa
  const py = Math.max(yb + 0.08, st.plateF);
  box(black, 0.56, 0.13, 0.02, 0, py, zF - 0.002);
  if (low) box(k.S(SLOT.white), 0.52, 0.11, 0.01, 0, py, zF + 0.008);
  else flatQuad(k.D, 0, py, zF + 0.012, 0.52, 0.11, 1, plateUV);
  if (!low) {
    const hy = yH + (st.head.s1 - st.head.s0) * 0.035, hx = xIn + st.head.cap * 0.5;
    for (const s of [1, -1]) {
      glowQuad(k, CH.gHead, s * hx, hy, zF + 0.05, 0.7, 0.42, 'f');
      glowQuad(k, s > 0 ? CH.gIndL : CH.gIndR, s * (hx + 0.12), hy, zF + 0.03, 0.3, 0.3, 'f');
    }
    glowQuad(k, CH.gPool, 0, 0.03, zF + 4.2, 3.6, 7.5, 'up');
  }
}

/** Pjesa e pasme: shiriti i dritave, difuzori, marmitat, targa. */
function rear(style: BodyStyle, st: StyleDef, k: Kit, zR: number, yb: number, ty0: number, ty1: number, xIn: number, low: boolean): void {
  const z = zR - 0.004, black = k.S(SLOT.black), dark = k.S(SLOT.dark);
  if (st.tailBar) {
    const y = (ty0 + ty1) / 2;
    box(k.C(CH.tail), xIn * 2 + 0.06, 0.035, 0.012, 0, y, z - 0.002);
  }
  const span = ty0 - yb;
  if (style === 'sport' || style === 'coupe') {
    capShape(dark, roundRect(style === 'sport' ? 1.3 : 1.0, span * 0.36, 0.05), 0, yb + span * 0.2, z, -1);
    if (style === 'sport' && !low) for (let i = -3; i <= 3; i++) box(black, 0.015, span * 0.3, 0.09, i * 0.14, yb + span * 0.15, zR + 0.02);
  } else if (style !== 'pickup') {
    capShape(black, roundRect(st.W * 2 - 0.5, span * 0.22, 0.04), 0, yb + span * 0.12, z, -1);
  }
  for (const x of st.exhaust) {
    if (low) { box(dark, 0.08, 0.07, 0.02, x, yb + 0.06, zR - 0.01); continue; }
    cyl(k.S(SLOT.chrome), 0.04, 0.04, 0.12, 10, x, yb + 0.07, zR + 0.03, PI / 2, 0, 0, true);
    addGeo(dark, new THREE.CircleGeometry(0.035, 10), mat(x, yb + 0.07, zR - 0.025, 0, PI, 0));
  }
  const py = Math.max(yb + 0.1, st.plateR);
  box(black, 0.56, 0.13, 0.02, 0, py, zR + 0.002);
  if (low) box(k.S(SLOT.white), 0.52, 0.11, 0.01, 0, py, zR - 0.008);
  else flatQuad(k.D, 0, py, zR - 0.012, 0.52, 0.11, -1, plateUV);
  if (!low) {
    const ty = (ty0 + ty1) / 2, tx = xIn + st.tail.cap * 0.4 + 0.08;
    for (const s of [1, -1]) {
      glowQuad(k, CH.gTail, s * tx, ty, zR - 0.05, 0.7, 0.4, 'b');
      glowQuad(k, s > 0 ? CH.gIndL : CH.gIndR, s * (tx + 0.12), ty, zR - 0.03, 0.3, 0.3, 'b');
    }
  }
}

/** Pjesë të veçanta për çdo stil: spoiler, krahë, shina çatie, tabela, sirena, karroceria e pickup-it... */
function extras(style: BodyStyle, st: StyleDef, k: Kit, body: Loft, cab: Loft, topF: (z: number) => number, roofAt: (z: number) => number, low: boolean): void {
  const c = st.cabin!, black = k.S(SLOT.black), chrome = k.S(SLOT.chrome);
  const roofW = (z: number) => { halfAt(cab, z, 4, _a); return _a[0]; };
  const roofY = (z: number) => { halfAt(cab, z, 6, _a); return _a[1]; };
  if (style === 'hatch') {
    const z = c.zRT + 0.02, w = roofW(z);
    rbox(k.P, w * 2 - 0.04, 0.04, 0.2, 0.02, 0, roofY(z) - 0.005, z - 0.06, -0.12, 0, 0);
    if (!low) box(k.C(CH.brake), 0.3, 0.02, 0.01, 0, roofY(z) - 0.02, z - 0.16);
  } else if (style === 'coupe') {
    rbox(k.P, st.W * 1.5, 0.03, 0.12, 0.012, 0, topF(-2.1) + 0.02, -2.12, 0.15, 0, 0);
  } else if (style === 'sport') {
    const wy = 1.1, wz = -1.98;
    rbox(black, 1.72, 0.035, 0.3, 0.015, 0, wy, wz, 0.08, 0, 0);
    for (const s of [1, -1]) {
      rbox(black, 0.025, 0.22, 0.16, 0.01, s * 0.55, wy - 0.12, wz + 0.02);
      rbox(black, 0.02, 0.1, 0.34, 0.01, s * 0.86, wy + 0.02, wz);
    }
    if (!low) for (const s of [1, -1]) patch(body, s, 2, 1, (u, v, o) => { o[0] = lerp(-0.86, -1.22, u) + v * 0.08; o[1] = lerp(2.4, 4.3, v); }, 0.005, () => k.S(SLOT.dark));
    if (!low) for (const s of [1, -1]) patch(body, s, 2, 1, (u, v, o) => { o[0] = lerp(1.5, 1.85, u); o[1] = lerp(7.3, 7.5, v); }, 0.004, () => k.S(SLOT.dark));
  } else if (style === 'suv') {
    for (const s of [1, -1]) {
      const z0 = c.zWT - 0.15, z1 = c.zRT + 0.12, x = roofW((z0 + z1) / 2) - 0.08, y = roofY((z0 + z1) / 2);
      box(k.S(SLOT.grey), 0.035, 0.035, z0 - z1, s * x, y + 0.06, (z0 + z1) / 2);
      for (const z of [z0 - 0.05, z1 + 0.05]) box(black, 0.05, 0.07, 0.1, s * x, y + 0.025, z);
    }
  } else if (style === 'taxi') {
    const z = (c.zWT + c.zRT) / 2 + 0.05, y = roofY(z);
    box(black, 0.6, 0.03, 0.26, 0, y + 0.015, z);
    if (low) box(k.S(SLOT.amber), 0.56, 0.15, 0.22, 0, y + 0.1, z);
    else {
      const g = new THREE.BoxGeometry(0.56, 0.15, 0.2);
      const uv = g.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) if (i < 16) uv.setXY(i, 0.04, 0.5);
      addGeo({ b: k.sign, u: 0, v: 0, u1: 0, v1: 0 }, g, mat(0, y + 0.105, z), true);
      for (const s of [1, -1]) patch(body, s, 6, 1, (u, v, o) => { o[0] = lerp(0.85, -1.3, u); o[1] = lerp(4.55, 4.85, v); }, 0.005, () => k.D,
        (u, v) => decalUV(s > 0 ? u : 1 - u, lerp(0.02, 0.6, v)));
    }
  } else if (style === 'police') {
    const z = (c.zWT + c.zRT) / 2 + 0.05, y = roofY(z);
    box(black, 1.1, 0.06, 0.3, 0, y + 0.03, z);
    for (const s of [1, -1]) rbox(k.C(s > 0 ? CH.sirR : CH.sirB), 0.48, 0.09, 0.26, 0.03, s * 0.27, y + 0.1, z);
    if (!low) {
      box(chrome, 0.06, 0.1, 0.27, 0, y + 0.1, z);
      for (const s of [1, -1]) {
        const ch = s > 0 ? CH.gSirR : CH.gSirB;
        glowQuad(k, ch, s * 0.3, y + 0.1, z + 0.2, 1.3, 0.8, 'f');
        glowQuad(k, ch, s * 0.3, y + 0.1, z - 0.2, 1.3, 0.8, 'b');
        glowQuad(k, ch, s * 0.6, y + 0.1, z, 1.1, 0.8, s > 0 ? 'l' : 'r');
        patch(body, s, 6, 1, (u, v, o) => { o[0] = lerp(0.8, -1.25, u); o[1] = lerp(3.55, 4.75, v); }, 0.005, () => k.D,
          (u, v) => decalUV(s > 0 ? u : 1 - u, v));
      }
      for (const s of [1, -1]) patch(body, s, 6, 1, (u, v, o) => { o[0] = lerp(0.8, -1.25, u); o[1] = lerp(3.4, 3.55, v); }, 0.005, () => k.S(SLOT.accent2));
    } else for (const s of [1, -1]) patch(body, s, 2, 1, (u, v, o) => { o[0] = lerp(0.8, -1.25, u); o[1] = lerp(3.5, 4.75, v); }, 0.005, () => k.S(SLOT.white));
  } else if (style === 'pickup') {
    const W = st.W, f = 1.0, r = 1.25, t = 0.07, z0 = -0.66, z1 = -st.L / 2 + 0.04;
    for (const s of [1, -1]) rbox(k.P, t, r - f + 0.03, z0 - z1, 0.025, s * (W * 0.97 - t / 2), (f + r) / 2 - 0.015, (z0 + z1) / 2);
    rbox(k.P, W * 2 * 0.97 - t * 2, r - f, t, 0.02, 0, (f + r) / 2 - 0.02, z1 + t / 2);
    if (!low) box(black, 0.22, 0.04, 0.01, 0, r - 0.07, z1 - 0.003);
    for (const s of [1, -1]) {
      box(k.C(CH.tail), 0.055, 0.2, 0.05, s * (W * 0.97 - 0.03), r - 0.14, z1 + 0.005);
      box(k.C(s > 0 ? CH.indL : CH.indR), 0.055, 0.05, 0.05, s * (W * 0.97 - 0.03), r - 0.27, z1 + 0.005);
      if (!low) glowQuad(k, CH.gTail, s * (W - 0.1), r - 0.14, z1 - 0.04, 0.5, 0.5, 'b');
    }
    if (!low) for (let i = -2; i <= 2; i++) box(k.S(SLOT.dark), 0.05, 0.015, z0 - z1 - 0.1, i * 0.32, f + 0.01, (z0 + z1) / 2);
    box(black, W * 2 - 0.1, 0.12, 0.14, 0, st.sill + 0.06, -st.L / 2 + 0.02);
    // flaret e zeza mbi harqe
    if (!low) for (const za of st.axles) for (const s of [1, -1]) {
      const Ra = st.R + st.archGap;
      const g = new THREE.TorusGeometry(Ra + 0.02, 0.035, 4, 12, PI);
      addGeo(black, g, mat(s * (st.W - 0.01), st.R + 0.01, za, 0, PI / 2, 0, 1, 1, 0.6));
    }
  } else if (style === 'furgon' || style === 'van') {
    if (style === 'furgon') {
      // portbagazhi me valixhe
      const z0 = 0.9, z1 = -2.2, y = roofY(-0.5);
      for (const s of [1, -1]) box(black, 0.04, 0.04, z0 - z1, s * 0.78, y + 0.12, (z0 + z1) / 2);
      for (let z = z0; z >= z1 - 0.01; z -= (z0 - z1) / 4) box(black, 1.6, 0.03, 0.04, 0, y + 0.1, z);
      for (const s of [1, -1]) for (const z of [z0, z1]) box(black, 0.04, 0.12, 0.04, s * 0.78, y + 0.05, z);
      if (!low) {
        rbox(k.S(SLOT.accent2), 0.7, 0.28, 0.5, 0.06, -0.3, y + 0.27, 0.2);
        rbox(k.S(SLOT.grey), 0.55, 0.22, 0.45, 0.06, 0.38, y + 0.24, -0.4);
        rbox(k.S(SLOT.accent), 0.5, 0.2, 0.4, 0.05, -0.2, y + 0.22, -1.2);
        // pllaka "Tiranë–Durrës" pas xhamit të përparmë (ana e djathtë = -x)
        patch(cab, -1, 1, 1, (u, v, o) => { o[0] = lerp(1.55, 1.42, v); o[1] = lerp(5.0, 4.15, u) - 0.0 * v; }, 0.006, () => k.D,
          (u, v) => decalUV(u, v));
      }
      for (const s of [1, -1]) patch(body, s, low ? 3 : 8, 1, (u, v, o) => { o[0] = lerp(st.L / 2 - 0.35, -st.L / 2 + 0.12, u); o[1] = lerp(5.3, 5.75, v); }, 0.004, () => k.S(SLOT.accent));
    } else if (!low) {
      for (const s of [1, -1]) patch(cab, s, 6, 1, (u, v, o) => { o[0] = lerp(0.2, -2.2, u); o[1] = lerp(1.15, 1.85, v); }, 0.005, () => k.D,
        (u, v) => decalUV(s > 0 ? u : 1 - u, v));
      for (const s of [1, -1]) patch(cab, s, 1, 1, (u, v, o) => { o[0] = -0.5 + (u - 0.5) * 0.04; o[1] = lerp(0.95, 1.4, v); }, 0.006, () => k.S(SLOT.black));
    }
    // rrotat rezervë/sinjalet anësore
    if (!low) for (const s of [1, -1]) { const p = surf(body, st.axles[0] - 0.55, 5.2, s, 0.005, []); box(k.C(s > 0 ? CH.indL : CH.indR), 0.01, 0.03, 0.08, p[0], p[1], p[2]); }
  }
}

// ======================================================================
// Autobusi i Tiranës
// ======================================================================
function busLike(st: StyleDef, topF: (z: number) => number, n8: boolean, zF: number, zR: number, rF: number, rR: number, yb0: number, W: number, kF: [number, number], kR: [number, number], axles: number[], Ra: number, yc: number): Loft {
  return {
    n: 8, zF, zR, rF, rR, cy: (yb0 + topF(0)) / 2,
    sec(z, o) {
      let w = W, yt = topF(z), yb = yb0, d = 0, kt = 0, kb = 0;
      if (z > zF - rF) { const q = Math.min(1, (z - zF + rF) / rF); d = rF * (1 - Math.sqrt(1 - q * q)); [kt, kb] = kF; }
      else if (z < zR + rR) { const q = Math.min(1, (zR + rR - z) / rR); d = rR * (1 - Math.sqrt(1 - q * q)); [kt, kb] = kR; }
      w -= d; yt -= d * kt; yb += d * kb;
      const r = n8 ? 0.3 : 0.08;
      set2(o, 0, 0, yb); set2(o, 1, 0.9 * w, yb); set2(o, 2, 0.995 * w, yb + 0.05); set2(o, 3, w, yb + 0.45);
      set2(o, 4, w, yt - r); set2(o, 5, w - r * 0.05, yt - r * 0.35); set2(o, 6, w - r * 0.3, yt - 0.012); set2(o, 7, 0, yt + (n8 ? 0.04 : 0));
      let ya = -1;
      for (const za of axles) { const dz = z - za; if (Math.abs(dz) < Ra) ya = Math.max(ya, yc + Math.sqrt(Ra * Ra - dz * dz)); }
      if (ya > yb) for (let j = 0; j <= 3; j++) o[j * 2 + 1] = Math.min(Math.max(o[j * 2 + 1], ya), o[9] - 0.01 * (4 - j));
    },
  };
}

function buildBus(st: StyleDef, k: Kit): number {
  const low = k.low, zF = st.L / 2, zR = -st.L / 2, W = st.W, topF = pchip(st.top);
  const Ra = st.R + st.archGap, yc = st.R + 0.01;
  const L = busLike(st, topF, true, zF, zR, st.noseR, st.tailR, st.sill, W, st.noseK, st.tailK, st.axles, Ra, yc);
  const zs = stations(L, st.axles, Ra, low ? 2.5 : 0.9, low ? 2 : 5, low ? 4 : 8);
  const black = k.S(SLOT.black), glass = k.S(SLOT.glass), grey = k.S(SLOT.grey), dark = k.S(SLOT.dark);
  emitLoft(L, zs, (zm, j) => (j === 0 ? dark : j === 1 ? grey : k.P), k.P, k.P);
  const sy = (z: number, y: number) => sAtY(L, z, y);
  const band = (side: number, z0: number, z1: number, y0: number, y1: number, off: number, t: Tgt, nu = 1) =>
    patch(L, side, nu, 1, (u, v, o) => { const z = lerp(z0, z1, u); o[0] = z; o[1] = sy(z, lerp(y0, y1, v)); }, off, () => t);
  // shiriti i dritareve (ana e majtë +x: plot; e djathta -x: me dyer)
  const doors = [[5.35, 4.3], [1.2, 0.0], [-3.7, -4.75]];
  for (const side of [1, -1]) {
    band(side, zF - 0.32, zR + 0.4, 1.0, 2.7, 0.006, black, low ? 2 : 8);
    band(side, zF - 0.32, zR + 0.4, 0.33, 0.55, 0.006, grey, low ? 2 : 8);
    const panes: number[][] = [];
    let z = zF - 0.4;
    while (z > zR + 0.5) {
      const z1 = Math.max(zR + 0.5, z - 1.35);
      panes.push([z, z1]); z = z1 - 0.1;
    }
    for (const [a, b] of panes) {
      if (side < 0 && doors.some(d => a > d[1] - 0.05 && b < d[0] + 0.05)) {
        for (const d of doors) {
          if (a > d[1] && b < d[0]) {
            if (a > d[0] + 0.15) band(side, a, d[0] + 0.08, 1.06, 2.64, 0.01, glass, 1);
            if (b < d[1] - 0.15) band(side, d[1] - 0.08, b, 1.06, 2.64, 0.01, glass, 1);
          }
        }
        continue;
      }
      band(side, a, b, 1.06, 2.64, 0.01, glass, low ? 1 : 2);
    }
    if (side < 0) for (const [d0, d1] of doors) {
      band(side, d0, d1, 0.36, 2.7, 0.009, black, 2);
      const m = (d0 + d1) / 2;
      band(side, d0 - 0.05, m + 0.015, 0.42, 2.62, 0.013, glass, 1);
      band(side, m - 0.015, d1 + 0.05, 0.42, 2.62, 0.013, glass, 1);
    }
  }
  // xhami i përparmë mbështjellës + ekrani i destinacionit
  const ws = { depth: st.noseR, s0: 1.0, s1: 2.62, b0: 1.05, b1: 2.62, cap: W, rise: 0 };
  lampWrap(L, 1, ws, 0.006, 0.0, low, () => glass, true);
  lampWrap(L, 1, { ...ws, s0: 0.98, s1: 2.95, b0: 0.98, b1: 2.95 }, 0.003, 0, low, () => black, true);
  if (low) box(k.S(SLOT.amber), 1.5, 0.2, 0.01, 0, 2.8, zF + 0.01);
  else flatQuad(k.D, 0, 2.8, zF + 0.008, 1.7, 0.24, 1, (u, v) => decalUV(u, lerp(0.05, 0.85, v)));
  // fenerët poshtë
  lampWrap(L, 1, st.head, 0.008, 0.02, low, () => black, true);
  lampWrap(L, 1, st.head, 0.012, 0, low, (u, v, side) => (u < 0.25 ? k.C(side > 0 ? CH.indL : CH.indR) : k.C(CH.head)), true);
  lampWrap(L, 1, { depth: st.noseR + 0.2, s0: 0.33, s1: 0.5, b0: 0.33, b1: 0.5, cap: W, rise: 0 }, 0.007, 0, low, () => grey, true);
  box(black, 0.56, 0.13, 0.02, 0, st.plateF, zF + 0.005);
  if (!low) flatQuad(k.D, 0, st.plateF, zF + 0.017, 0.52, 0.11, 1, plateUV);
  // pjesa e pasme
  lampWrap(L, -1, st.tail, 0.008, 0, low, (u, v, side) => (v > 0.8 ? k.C(side > 0 ? CH.indL : CH.indR) : k.C(CH.tail)), true);
  capShape(glass, roundRect(1.9, 0.6, 0.08), 0, 2.33, zR - 0.004, -1);
  capShape(black, roundRect(1.6, 0.7, 0.05), 0, 1.0, zR - 0.004, -1);
  if (!low) for (let i = 0; i < 6; i++) box(grey, 1.5, 0.03, 0.02, 0, 0.72 + i * 0.11, zR - 0.01);
  box(black, 0.56, 0.13, 0.02, 0, 0.45, zR - 0.004);
  if (!low) flatQuad(k.D, 0, 0.45, zR - 0.016, 0.52, 0.11, -1, plateUV);
  // çatia: kondicioneri
  rbox(grey, 1.8, 0.26, 2.6, 0.1, 0, topF(0) + 0.15, 0.8);
  if (!low) rbox(grey, 1.2, 0.12, 0.9, 0.05, 0, topF(0) + 0.08, -3.2);
  // pasqyrat "veshë lepuri"
  for (const s of [1, -1]) {
    box(black, 0.04, 0.04, 0.42, s * (W + 0.02), 2.75, zF - 0.1, 0, 0, 0);
    rbox(black, 0.1, 0.32, 0.1, 0.03, s * (W + 0.04), 2.55, zF + 0.1);
  }
  if (!low) {
    for (const s of [1, -1]) {
      glowQuad(k, CH.gHead, s * (W - 0.25), 0.68, zF + 0.05, 0.8, 0.5, 'f');
      glowQuad(k, CH.gTail, s * (W - 0.05), 1.1, zR - 0.05, 0.5, 1.2, 'b');
    }
    glowQuad(k, CH.gPool, 0, 0.03, zF + 4.5, 4, 8, 'up');
  }
  for (const za of st.axles) for (const s of [1, -1]) {
    addGeo(dark, new THREE.CylinderGeometry(Ra - 0.01, Ra - 0.01, 0.5, low ? 6 : 12, 1, true, -0.2, PI + 0.4), mat(s * (W - 0.26), yc, za, 0, 0, PI / 2), false, true);
    addGeo(dark, new THREE.CircleGeometry(Ra - 0.01, 8, -0.2, PI + 0.4), mat(s * (W - 0.5), yc, za, 0, s * PI / 2, 0));
  }
  return 3.3;
}

// ======================================================================
// Kamioni (kabinë mbi motor + kuti mallrash)
// ======================================================================
function buildTruck(st: StyleDef, k: Kit): number {
  const low = k.low, W = st.W, black = k.S(SLOT.black), glass = k.S(SLOT.glass), grey = k.S(SLOT.grey), dark = k.S(SLOT.dark), white = k.S(SLOT.white);
  const Ra = st.R + st.archGap, yc = st.R + 0.01;
  const cabF = st.L / 2, cabR = 2.25;
  const topF = pchip(st.top);
  const cab = busLike(st, topF, true, cabF, cabR, st.noseR, 0.08, st.sill, W - 0.03, st.noseK, st.tailK, [st.axles[0]], Ra, yc);
  const zs = stations(cab, [st.axles[0]], Ra, low ? 1 : 0.35, low ? 2 : 5, low ? 4 : 8);
  emitLoft(cab, zs, (zm, j) => (j <= 1 ? dark : k.P), k.P, k.P);
  const ws = { depth: st.noseR, s0: 1.85, s1: 2.75, b0: 1.9, b1: 2.75, cap: W, rise: 0 };
  lampWrap(cab, 1, ws, 0.006, 0, low, () => glass, true);
  lampWrap(cab, 1, { ...ws, s0: 1.8, s1: 2.82, b0: 1.8, b1: 2.82 }, 0.003, 0, low, () => black, true);
  const sy = (z: number, y: number) => sAtY(cab, z, y);
  for (const side of [1, -1]) {
    patch(cab, side, 2, 1, (u, v, o) => { const z = lerp(3.98, 3.05, u) + v * 0.12; o[0] = z; o[1] = sy(z, lerp(1.85, 2.72, v)); }, 0.006, () => black);
    patch(cab, side, 2, 1, (u, v, o) => { const z = lerp(3.94, 3.1, u) + v * 0.12; o[0] = z; o[1] = sy(z, lerp(1.9, 2.67, v)); }, 0.01, () => glass);
    if (!low) for (const z of [4.0, 2.95]) patch(cab, side, 1, 1, (u, v, o) => { const zz = z + (u - 0.5) * 0.014; o[0] = zz; o[1] = sy(zz, lerp(1.1, 2.75, v)); }, 0.004, () => k.S(SLOT.gap));
    rbox(black, 0.06, 0.06, 0.4, 0.02, side * (W - 0.05), 0.8, 3.75);
    // pasqyra
    box(black, 0.3, 0.035, 0.035, side * (W + 0.12), 2.35, 4.05);
    rbox(black, 0.08, 0.42, 0.18, 0.03, side * (W + 0.27), 2.2, 4.0);
  }
  // grila dhe parakolpi
  capShape(black, roundRect(1.6, 0.6, 0.05), 0, 1.35, cabF + 0.004);
  if (!low) for (let i = 0; i < 5; i++) box(grey, 1.5, 0.03, 0.02, 0, 1.12 + i * 0.12, cabF + 0.01);
  rbox(grey, W * 2 - 0.02, 0.38, 0.22, 0.05, 0, 0.78, cabF - 0.02);
  for (const s of [1, -1]) {
    rbox(k.C(CH.head), 0.34, 0.14, 0.03, 0.03, s * 0.86, 0.82, cabF + 0.09);
    box(k.C(s > 0 ? CH.indL : CH.indR), 0.12, 0.14, 0.03, s * 1.11, 0.82, cabF + 0.09);
  }
  box(black, 0.56, 0.13, 0.02, 0, 0.6, cabF + 0.1);
  if (!low) flatQuad(k.D, 0, 0.6, cabF + 0.112, 0.52, 0.11, 1, plateUV);
  // deflektori i çatisë
  rbox(k.P, W * 2 - 0.3, 0.42, 1.2, 0.12, 0, 3.22, 2.9, 0.16, 0, 0);
  // kutia e mallrave
  const bz0 = 2.12, bz1 = -st.L / 2;
  const boxL: Loft = busLike(st, () => 3.62, false, bz0, bz1, 0.05, 0.05, 1.18, W + 0.02, [1, 1], [1, 1], [], 0, 0);
  const bzs = [bz0, bz0 - 0.02, bz0 - 0.05, -0.5, bz1 + 0.05, bz1 + 0.02, bz1];
  emitLoft(boxL, bzs, () => white, white, white);
  for (const side of [1, -1]) {
    patch(boxL, side, 2, 1, (u, v, o) => { const z = lerp(bz0 - 0.1, bz1 + 0.1, u); o[0] = z; o[1] = sAtY(boxL, z, lerp(1.35, 1.55, v)); }, 0.006, () => k.P);
    if (!low) patch(boxL, side, 3, 1, (u, v, o) => { const z = lerp(1.0, -3.5, u); o[0] = z; o[1] = sAtY(boxL, z, lerp(2.15, 3.15, v)); }, 0.008, () => k.D,
      (u, v) => decalUV(side > 0 ? u : 1 - u, v));
  }
  if (!low) {
    box(k.S(SLOT.gap), 0.015, 2.35, 0.01, 0, 2.4, bz1 - 0.003);
    for (const s of [1, -1]) for (const x of [0.25, 0.75]) box(k.S(SLOT.chrome), 0.03, 2.2, 0.03, s * x, 2.4, bz1 - 0.015);
  }
  // shasia, rezervuari, mbrojtëset
  for (const s of [1, -1]) box(black, 0.14, 0.3, bz0 - bz1 + 0.2, s * 0.48, 0.92, (bz0 + bz1) / 2);
  cyl(k.S(SLOT.chrome), 0.28, 0.28, 1.1, low ? 8 : 16, W - 0.38, 0.8, 1.3, PI / 2, 0, 0);
  box(grey, 0.05, 0.25, 2.4, -(W - 0.1), 0.75, 0.6);
  box(black, W * 2 - 0.2, 0.12, 0.12, 0, 0.55, bz1 + 0.1);
  for (const s of [1, -1]) {
    box(k.C(CH.tail), 0.3, 0.12, 0.05, s * 0.8, 0.85, bz1 - 0.02);
    box(k.C(s > 0 ? CH.indL : CH.indR), 0.1, 0.12, 0.05, s * 1.05, 0.85, bz1 - 0.02);
    box(k.C(CH.rev), 0.08, 0.12, 0.05, s * 0.6, 0.85, bz1 - 0.02);
    // baltëmbrojtëset mbi rrotat e pasme
    box(black, 0.62, 0.04, 2.0, s * (st.track), 1.08, -2.78);
  }
  box(black, 0.56, 0.13, 0.02, 0, 0.55, bz1 - 0.01);
  if (!low) {
    flatQuad(k.D, 0, 0.55, bz1 - 0.022, 0.52, 0.11, -1, plateUV);
    for (const s of [1, -1]) {
      glowQuad(k, CH.gHead, s * 0.86, 0.82, cabF + 0.15, 0.8, 0.5, 'f');
      glowQuad(k, CH.gTail, s * 0.8, 0.85, bz1 - 0.08, 0.6, 0.4, 'b');
    }
    glowQuad(k, CH.gPool, 0, 0.03, cabF + 4.5, 3.8, 8, 'up');
  }
  for (const s of [1, -1]) {
    addGeo(dark, new THREE.CylinderGeometry(Ra - 0.01, Ra - 0.01, 0.45, 10, 1, true, -0.2, PI + 0.4), mat(s * (W - 0.25), yc, st.axles[0], 0, 0, PI / 2), false, true);
  }
  return 3.62;
}

// ======================================================================
// Cache-i dhe montimi
// ======================================================================
const cache = new Map<string, CarModel>();

export function getModel(style: BodyStyle, low: boolean): CarModel {
  const key = style + (low ? '|low' : '|high');
  const hit = cache.get(key);
  if (hit) return hit;
  const st = STYLES[style];
  const k = new Kit(low);
  const height = style === 'bus' ? buildBus(st, k) : style === 'truck' ? buildTruck(st, k) : buildCar(style, st, k);
  const wheels: WheelPos[] = [];
  for (let i = 0; i < st.axles.length; i++) for (const s of [1, -1]) wheels.push({ x: s * st.track, y: st.R, z: st.axles[i], steer: i === 0 });
  if (low) for (const w of wheels) addWheel(k, st.R, st.tireW, st.rim, st.rimFrac, true, mat(w.x, w.y, w.z, 0, w.x < 0 ? PI : 0, 0));
  const decalKind = style === 'police' ? 'police' : style === 'taxi' ? 'taxi' : style;
  const m: CarModel = {
    paint: k.paint.geo()!, detail: k.det.geo()!, lights: k.lit.geo(), decal: low ? null : k.dec.geo(),
    glow: low ? null : k.glow.geo(true), sign: low ? null : k.sign.geo(),
    wheelR: low ? null : wheelGeometry(st.R, st.tireW, st.rim, st.rimFrac, false),
    wheelL: low ? null : wheelGeometry(st.R, st.tireW, st.rim, st.rimFrac, true),
    wheels, st, height, tris: 0, decalKind,
  };
  const tri = (g: THREE.BufferGeometry | null) => (g ? (g.index ? g.index.count : g.getAttribute('position').count) / 3 : 0);
  m.tris = tri(m.paint) + tri(m.detail) + tri(m.lights) + tri(m.decal) + tri(m.sign) + (low ? 0 : tri(m.wheelR) * wheels.length);
  cache.set(key, m);
  return m;
}

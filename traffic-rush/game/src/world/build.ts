/**
 * Ndërtuesi grafik i qytetit: toka (asfalt, trotuare, bar, sheshe), shenjat rrugore, ndërtesat (atlas),
 * lumi, liqeni, monumentet, ndriçimi dhe objektet e vogla (InstancedMesh me kompaktim sipas kamerës).
 * Gjeometria statike bashkohet për copë 200×200 m dhe për material.
 */
import * as THREE from 'three';
import type { Axis, Obstacle, ObstacleKind, Quality } from '../core/contracts';
import { rng } from '../core/math';
import { travelHeading } from '../core/roads';
import { CURB, SIZE, SW, type Layout, type Region } from './layout';
import {
  Geo, lin, mulc, type RGB, treeRoundGeo, treeCypressGeo, treePineGeo, bushGeo, lampGeo, lampHeadGeo, poolGeo, blobGeo,
  benchGeo, busStopGeo, kioskGeo, signGeo, umbrellaGeo, tlPoleGeo, tlArmGeo, bulbGeo,
} from './geo';
import { SHOPS, type CellName, type Mats, type Tile } from './textures';

export const CH = 200;
const NC = Math.ceil(SIZE / CH);
type Rect = { x0: number; x1: number; z0: number; z1: number };
interface Inst { x: number; z: number; y?: number; rot: number; s: number; sy?: number; col?: RGB }

// ---------------------------------------------------------------------------------------------
// Objektet e vogla me instancim; çdo kuadër mbahen vetëm ato afër kamerës (pak draw calls).
// ---------------------------------------------------------------------------------------------
export interface PropPart { geo: THREE.BufferGeometry; mat: THREE.Material; cast?: boolean; nightOnly?: boolean }

export class PropSet {
  readonly meshes: THREE.InstancedMesh[] = [];
  readonly parts: PropPart[];
  count = 0;
  private src: Float32Array;
  private srcCol: Float32Array | null;
  private px: Float32Array; private pz: Float32Array;
  private attr: THREE.InstancedBufferAttribute;
  private colAttr: THREE.InstancedBufferAttribute | null = null;
  private grid = new Map<number, number[]>();
  private static C = 40;
  private sph = new THREE.Sphere();

  constructor(readonly name: string, items: Inst[], parts: PropPart[], readonly radius: number) {
    const n = items.length;
    this.parts = parts;
    this.src = new Float32Array(n * 16);
    this.px = new Float32Array(n); this.pz = new Float32Array(n);
    const hasCol = items.some(i => i.col);
    this.srcCol = hasCol ? new Float32Array(n * 3) : null;
    items.forEach((it, i) => {
      const c = Math.cos(it.rot), s = Math.sin(it.rot), sx = it.s, sy = it.sy ?? it.s;
      this.src.set([c * sx, 0, -s * sx, 0, 0, sy, 0, 0, s * sx, 0, c * sx, 0, it.x, it.y ?? CURB, it.z, 1], i * 16);
      this.px[i] = it.x; this.pz[i] = it.z;
      if (this.srcCol) { const col = it.col ?? [1, 1, 1]; this.srcCol.set(col, i * 3); }
      const key = this.key(Math.floor(it.x / PropSet.C), Math.floor(it.z / PropSet.C));
      let l = this.grid.get(key); if (!l) { l = []; this.grid.set(key, l); } l.push(i);
    });
    this.attr = new THREE.InstancedBufferAttribute(new Float32Array(n * 16), 16);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    if (this.srcCol) { this.colAttr = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); this.colAttr.setUsage(THREE.DynamicDrawUsage); }
    for (const p of parts) {
      const m = new THREE.InstancedMesh(p.geo, p.mat, Math.max(1, n));
      m.instanceMatrix = this.attr;
      if (this.colAttr) m.instanceColor = this.colAttr;
      m.frustumCulled = false; m.castShadow = !!p.cast; m.receiveShadow = !p.nightOnly;
      m.matrixAutoUpdate = false; m.count = 0; m.visible = false;
      m.name = name;
      this.meshes.push(m);
    }
  }
  private key(gx: number, gz: number) { return (gx + 64) * 4096 + (gz + 64); }

  /** Mbush buferin me instancat brenda rrezes dhe pamjes. */
  refresh(cx: number, cz: number, fr: THREE.Frustum | null, radius = this.radius) {
    const C = PropSet.C, r2 = radius * radius, dst = this.attr.array as Float32Array, dc = this.colAttr?.array as Float32Array | undefined;
    let n = 0;
    const gx0 = Math.floor((cx - radius) / C), gx1 = Math.floor((cx + radius) / C), gz0 = Math.floor((cz - radius) / C), gz1 = Math.floor((cz + radius) / C);
    for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
      const l = this.grid.get(this.key(gx, gz));
      if (!l) continue;
      if (fr) {
        this.sph.center.set(gx * C + C / 2, 6, gz * C + C / 2); this.sph.radius = C * 0.72 + 34;
        if (!fr.intersectsSphere(this.sph)) continue;
      }
      for (const i of l) {
        const dx = this.px[i] - cx, dz = this.pz[i] - cz;
        if (dx * dx + dz * dz > r2) continue;
        for (let k = 0; k < 16; k++) dst[n * 16 + k] = this.src[i * 16 + k];
        if (dc && this.srcCol) { dc[n * 3] = this.srcCol[i * 3]; dc[n * 3 + 1] = this.srcCol[i * 3 + 1]; dc[n * 3 + 2] = this.srcCol[i * 3 + 2]; }
        n++;
      }
    }
    this.count = n;
    this.attr.clearUpdateRanges(); this.attr.addUpdateRange(0, Math.max(16, n * 16)); this.attr.needsUpdate = true;
    if (this.colAttr) { this.colAttr.clearUpdateRanges(); this.colAttr.addUpdateRange(0, Math.max(3, n * 3)); this.colAttr.needsUpdate = true; }
    for (const m of this.meshes) m.count = n;
  }
  setVisible(night: number, enabled = true) {
    this.meshes.forEach((m, i) => { m.visible = enabled && this.count > 0 && (!this.parts[i].nightOnly || night > 0.02); });
  }
}

export interface SignalHead { node: number; axis: Axis; bulb: number; n: number }
export interface BuildResult {
  root: THREE.Group;
  obstacles: Obstacle[];
  props: PropSet[];
  lamps: PropSet | null;
  heads: SignalHead[];
  bulbs: THREE.InstancedMesh | null;
  chunkMisc: { mesh: THREE.Object3D; x: number; z: number }[];
  landmarks: Record<string, { x: number; z: number }>;
  stats: { buildings: number; staticTris: number; staticMeshes: number; propInstances: number };
}

// ---------------------------------------------------------------------------------------------
export function buildWorld(L: Layout, q: Quality, M: Mats): BuildResult {
  const Q = q === 'low' ? 0 : q === 'medium' ? 1 : 2;
  const R = rng(L.seed * 7 + 13);
  const A = M.atlas;
  const pick = <T,>(a: readonly T[]): T => a[(R() * a.length) | 0];
  const rand = (a: number, b: number) => a + R() * (b - a);
  const root = new THREE.Group(); root.name = 'city';
  const obstacles: Obstacle[] = [];
  const obs = (x0: number, z0: number, x1: number, z1: number, h: number, kind: ObstacleKind) =>
    obstacles.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), height: h, kind });
  const landmarks: Record<string, { x: number; z: number }> = {};

  // Copat.
  interface Chunk { g: Geo; b: Geo; m: Geo; w: Geo }
  const chunks: Chunk[] = [];
  for (let k = 0; k < NC * NC; k++) chunks.push({ g: new Geo('ground'), b: new Geo('bld'), m: new Geo('col'), w: new Geo('uv') });
  const cAt = (x: number, z: number): Chunk => {
    const i = Math.max(0, Math.min(NC - 1, Math.floor(x / CH))), j = Math.max(0, Math.min(NC - 1, Math.floor(z / CH)));
    return chunks[j * NC + i];
  };

  // Ngjyrat (lineare).
  const C = {
    asphalt: lin(0x505155), sidewalk: lin(0xbdb6aa), curb: lin(0xd2cfc8), grass: lin(0x5d8c38), grassDry: lin(0x7f8f45),
    plaza: lin(0xdcd0b8), yard: lin(0xa29d94), concrete: lin(0xaaa69f), mark: lin(0xf2f2ee), dirt: lin(0x8f7f62),
    stone: lin(0xcbbfa8), stoneDark: lin(0x8c8375), bronze: lin(0x4f4330), metal: lin(0x3a3f45), wood: lin(0x8a5a36),
    white: lin(0xf2f0ea), rail: lin(0x2d3136),
  };
  const PAL = [0xe63946, 0xf4c430, 0x2a9d8f, 0xe76f51, 0x8e44ad, 0x3a86ff, 0x06d6a0, 0xff006e, 0xfb8500, 0x43aa8b];

  // Listat e props.
  const P = {
    treeR: [] as Inst[], treeC: [] as Inst[], treeP: [] as Inst[], bush: [] as Inst[], blob: [] as Inst[], lamp: [] as Inst[],
    bench: [] as Inst[], bus: [] as Inst[], kiosk: [] as Inst[], s60: [] as Inst[], s80: [] as Inst[], umb: [] as Inst[],
    tlPole: [] as Inst[], tlArm: [] as Inst[],
  };
  const tree = (x: number, z: number, kind: 'r' | 'c' | 'p' = 'r', s = rand(0.8, 1.2), y = CURB) => {
    const col: RGB = [rand(0.8, 1.12), rand(0.86, 1.1), rand(0.72, 1.0)];
    (kind === 'r' ? P.treeR : kind === 'c' ? P.treeC : P.treeP).push({ x, z, y, rot: R() * 6.283, s, col });
    P.blob.push({ x, z, y, rot: 0, s: s * (kind === 'c' ? 0.45 : kind === 'p' ? 1.25 : 0.95) });
    obs(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 5, 'tree');
  };
  const lamp = (x: number, z: number, rot: number, y = CURB) => { P.lamp.push({ x, z, y, rot, s: 1 }); obs(x - 0.18, z - 0.18, x + 0.18, z + 0.18, 7, 'prop'); };
  const bench = (x: number, z: number, rot: number) => { if (Q >= 1) { P.bench.push({ x, z, rot, s: 1 }); obs(x - 0.9, z - 0.9, x + 0.9, z + 0.9, 0.9, 'prop'); } };
  const bush = (x: number, z: number, s = rand(0.8, 1.4)) => { if (Q >= 1) P.bush.push({ x, z, rot: R() * 6.28, s }); };
  const kiosk = (x: number, z: number, rot: number) => { if (Q >= 1) { P.kiosk.push({ x, z, rot, s: 1 }); obs(x - 1.4, z - 1.4, x + 1.4, z + 1.4, 3, 'prop'); } };

  // ===========================================================================================
  // A. Asfalti bazë (pa kanalin e lumit dhe liqenin) + toka jashtë qytetit
  // ===========================================================================================
  const holes: Rect[] = [
    { x0: -100, x1: SIZE + 100, z0: L.river.z0, z1: L.river.z1 },
    { x0: L.lake.x0, x1: L.lake.x1, z0: L.lake.z0, z1: L.lake.z1 },
  ];
  for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) {
    const r: Rect = { x0: i * CH, x1: Math.min(SIZE, (i + 1) * CH), z0: j * CH, z1: Math.min(SIZE, (j + 1) * CH) };
    const bx = [r.x0, r.x1], bz = [r.z0, r.z1];
    for (const h of holes) {
      if (h.x0 > r.x0 && h.x0 < r.x1) bx.push(h.x0); if (h.x1 > r.x0 && h.x1 < r.x1) bx.push(h.x1);
      if (h.z0 > r.z0 && h.z0 < r.z1) bz.push(h.z0); if (h.z1 > r.z0 && h.z1 < r.z1) bz.push(h.z1);
    }
    bx.sort((a, b) => a - b); bz.sort((a, b) => a - b);
    const g = chunks[j * NC + i].g; g.c = C.asphalt; g.p = 0;
    for (let a = 0; a + 1 < bx.length; a++) for (let b = 0; b + 1 < bz.length; b++) {
      const mx = (bx[a] + bx[a + 1]) / 2, mz = (bz[b] + bz[b + 1]) / 2;
      if (holes.some(h => mx > h.x0 && mx < h.x1 && mz > h.z0 && mz < h.z1)) continue;
      g.flat(bx[a], bz[b], bx[a + 1], bz[b + 1], 0);
    }
  }
  {
    const g = new Geo('ground'); g.c = lin(0x6b7f45); g.p = 2;
    const E = 2600;
    g.flat(-E, -E, SIZE + E, 0, -0.05); g.flat(-E, SIZE, SIZE + E, SIZE + E, -0.05);
    g.flat(-E, 0, 0, SIZE, -0.05); g.flat(SIZE, 0, SIZE + E, SIZE, -0.05);
    const mesh = new THREE.Mesh(g.build()!, M.ground); mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; mesh.name = 'outside';
    root.add(mesh);
  }

  // ===========================================================================================
  // B. Platformat (trotuar + bordurë) dhe sipërfaqet e brendshme
  // ===========================================================================================
  const RAD = 2.6, SEG = 4;
  function platform(x0: number, z0: number, x1: number, z1: number, road: readonly boolean[], swc: RGB = C.sidewalk, swp = 1): Rect {
    const g = cAt((x0 + x1) / 2, (z0 + z1) / 2).g;
    const [rn, re, rs, rw] = road;
    const ix0 = x0 + (rw ? SW : 0), ix1 = x1 - (re ? SW : 0), iz0 = z0 + (rn ? SW : 0), iz1 = z1 - (rs ? SW : 0);
    const y = CURB;
    const cs = [
      { x: x0, z: z0, sx: 1, sz: 1, a0: Math.PI, rnd: rn && rw },
      { x: x1, z: z0, sx: -1, sz: 1, a0: Math.PI * 1.5, rnd: rn && re },
      { x: x1, z: z1, sx: -1, sz: -1, a0: 0, rnd: rs && re },
      { x: x0, z: z1, sx: 1, sz: -1, a0: Math.PI * 0.5, rnd: rs && rw },
    ];
    const pts: number[][][] = cs.map(c => {
      if (!c.rnd) return [[c.x, c.z]];
      const ccx = c.x + c.sx * RAD, ccz = c.z + c.sz * RAD, l: number[][] = [];
      for (let k = 0; k <= SEG; k++) { const a = c.a0 + (k / SEG) * Math.PI / 2; l.push([ccx + Math.cos(a) * RAD, ccz + Math.sin(a) * RAD]); }
      return l;
    });
    const inner = [[ix0, iz0], [ix1, iz0], [ix1, iz1], [ix0, iz1]];
    const sides = [rn, re, rs, rw];
    g.c = swc; g.p = swp;
    for (let k = 0; k < 4; k++) {
      const Pk = pts[k], I = inner[k];
      for (let m = 0; m + 1 < Pk.length; m++) g.tri([I[0], y, I[1], Pk[m][0], y, Pk[m][1], Pk[m + 1][0], y, Pk[m + 1][1]], undefined, [0, 1, 0]);
      if (!sides[k]) continue;
      const k2 = (k + 1) % 4, a = Pk[Pk.length - 1], b = pts[k2][0], I2 = inner[k2];
      g.q([a[0], y, a[1], b[0], y, b[1], I2[0], y, I2[1], I[0], y, I[1]], 0, 1, 0);
    }
    // bordura
    g.c = C.curb; g.p = 4;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const seg = (a: number[], b: number[]) => {
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 1e-3) return;
      let nx = dz / l, nz = -dx / l;
      if (nx * ((a[0] + b[0]) / 2 - mx) + nz * ((a[1] + b[1]) / 2 - mz) < 0) { nx = -nx; nz = -nz; }
      g.q([a[0], 0, a[1], b[0], 0, b[1], b[0], y, b[1], a[0], y, a[1]], nx, 0, nz);
    };
    for (let k = 0; k < 4; k++) {
      const Pk = pts[k];
      for (let m = 0; m + 1 < Pk.length; m++) seg(Pk[m], Pk[m + 1]);
      if (sides[k]) seg(Pk[Pk.length - 1], pts[(k + 1) % 4][0]);
    }
    return { x0: ix0, x1: ix1, z0: iz0, z1: iz1 };
  }
  const lot = (r: Rect, col: RGB, pat: number) => { const g = cAt((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2).g; g.c = col; g.p = pat; g.flat(r.x0, r.z0, r.x1, r.z1, CURB); };
  const strip = (x0: number, z0: number, x1: number, z1: number, col: RGB, pat: number, y = CURB + 0.02) => {
    const g = cAt((x0 + x1) / 2, (z0 + z1) / 2).g; g.c = col; g.p = pat; g.flat(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), y);
  };

  // ===========================================================================================
  // C. Ndërtesat
  // ===========================================================================================
  interface Style {
    tile: Tile; pat: boolean; tint: RGB; fh: number; bw: number; lit: number; shops: number[] | null; shopP: number;
    balc: boolean; roof: 'flat' | 'hip' | 'gable'; corn: number; ground?: CellName; roofTile?: CellName;
  }
  const st = (cell: CellName | number, tintHex: number, o: Partial<Style> = {}): Style => ({
    tile: typeof cell === 'number' ? A.pat[cell] : A.c[cell], pat: typeof cell === 'number', tint: lin(typeof cell === 'number' ? 0xffffff : tintHex),
    fh: 3.2, bw: 3.2, lit: 0.36, shops: null, shopP: 0, balc: false, roof: 'flat', corn: 0.82, ...o,
  });
  const SHOPSET = {
    qendra: [0, 1, 2, 3, 5, 7, 8, 9, 13, 17, 19, 23, 11, 6],
    blloku: [0, 7, 18, 23, 0, 18, 3, 1, 11, 9, 10, 17, 19],
    lagjja: [5, 6, 2, 4, 10, 12, 15, 16, 17, 14, 4, 6],
    liqeni: [19, 3, 0, 18, 1, 14, 7],
    industria: [20, 21, 22, 20, 15],
  };
  const T = {
    warm: [0xf1e3c6, 0xe9d3a8, 0xf3e7d3, 0xe8c9a0, 0xdcb995, 0xf0dcc0, 0xe6d8c3, 0xf3d9b1],
    pastel: [0xf2c6a0, 0xe7a977, 0xf5e1a4, 0xc9dcb3, 0xa9c8d9, 0xe9b8b0, 0xf0d58c, 0xd8c3e0, 0xf4b98a, 0xb6d7c2],
    vivid: [0xe9a23b, 0xd95d39, 0x6aa84f, 0x3d85c6, 0xc27ba0, 0xf1c232, 0x45b39d, 0xe76f51, 0x9b6bd0],
    grey: [0xdedbd5, 0xcfcbc3, 0xe7e3dc, 0xc6cacd, 0xd8d2c8],
    ind: [0x9fb3c8, 0xd8d0bd, 0xb5714e, 0xc9ccc9, 0x7d8f9c, 0xe0dccf, 0x8fa88a],
  };
  let nBld = 0;

  interface Bld { x0: number; x1: number; z0: number; z1: number; floors: number; st: Style; street: number; yb?: number; noRoof?: boolean }
  /** Shton ndërtesën; kthen lartësinë e çatisë. */
  function building(b: Bld): number {
    const ch = cAt((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2), g = ch.b, s = b.st, yb = b.yb ?? 0;
    const seed = R() * 1000;
    nBld++;
    const shopOk = !!s.shops && b.street !== 0 && R() < s.shopP;
    const gh = shopOk ? 4.2 : s.fh;
    const h = yb + gh + (b.floors - 1) * s.fh;
    const faces: [number, number, number, number, number][] = [[b.x1, b.z0, b.x0, b.z0, 1], [b.x0, b.z0, b.x0, b.z1, 2], [b.x0, b.z1, b.x1, b.z1, 4], [b.x1, b.z1, b.x1, b.z0, 8]];
    const ps = s.pat ? 0.25 : 1;
    g.w0 = seed;
    for (const [ax, az, bx, bz, bit] of faces) {
      const len = Math.hypot(bx - ax, bz - az); if (len < 0.5) continue;
      const bays = Math.max(1, Math.round(len / s.bw)), bl = len / bays;
      const dx = (bx - ax) / len, dz = (bz - az) / len, nx = -dz, nz = dx;
      const street = (b.street & bit) !== 0;
      g.c = s.tint;
      if (shopOk && street && bays >= 2) {
        const units = Math.floor(bays / 2), door = bays % 2 ? Math.floor(R() * (units + 1)) : -1;
        let pos = 0;
        for (let u = 0; u <= units; u++) {
          if (u === door) {
            g.t = A.c.door; g.w1 = 0.5; g.c = [1, 1, 1];
            g.wall(ax + dx * pos, az + dz * pos, ax + dx * (pos + bl), az + dz * (pos + bl), yb, yb + gh, 0, 1, 0, 1, 0.75, 1);
            pos += bl;
          }
          if (u < units) {
            const si = s.shops![(R() * s.shops!.length) | 0];
            g.t = A.shop[si]; g.w1 = 0.85; g.c = [1, 1, 1];
            const x0 = ax + dx * pos, z0 = az + dz * pos, x1 = ax + dx * (pos + 2 * bl), z1 = az + dz * (pos + 2 * bl);
            g.wall(x0, z0, x1, z1, yb, yb + gh, 0, 1, 0, 1, 0.75, 1);
            if (Q >= 1 && (SHOPS[si].kind === 'cafe' || SHOPS[si].kind === 'food') && R() < 0.75) {
              g.t = SHOPS[si].kind === 'cafe' ? A.c.awnG : A.c.awnR; g.w1 = 0; g.c = [1, 1, 1];
              const o = 1.5, y0 = yb + 3.75, y1 = yb + 3.05, ww = 2 * bl / 2;
              const pa = [x0 + dx * 0.3, z0 + dz * 0.3], pb = [x1 - dx * 0.3, z1 - dz * 0.3];
              const p = [pa[0], y0, pa[1], pb[0], y0, pb[1], pb[0] + nx * o, y1, pb[1] + nz * o, pa[0] + nx * o, y1, pa[1] + nz * o];
              const uv = [0, 0, ww, 0, ww, 1, 0, 1];
              g.q(p, nx * 0.4, 0.9, nz * 0.4, uv); g.q(p, -nx * 0.4, -0.9, -nz * 0.4, uv);
              g.q([pa[0] + nx * o, y1, pa[1] + nz * o, pb[0] + nx * o, y1, pb[1] + nz * o, pb[0] + nx * o, y1 - 0.3, pb[1] + nz * o, pa[0] + nx * o, y1 - 0.3, pa[1] + nz * o], nx, 0, nz, uv);
            }
            pos += 2 * bl;
          }
        }
        g.c = s.tint;
      } else {
        const gt = shopOk ? A.c.plinth : s.ground ? A.c[s.ground] : s.tile;
        g.t = gt; g.w1 = shopOk ? 0 : s.lit; g.c = shopOk ? [1, 1, 1] : s.tint;
        const pp = gt === s.tile ? ps : 1;
        g.wall(ax, az, bx, bz, yb, yb + gh, 0, bays * pp, 0, (shopOk ? 1 : 1) * pp, 0.7, 1);
        g.c = s.tint;
      }
      if (b.floors > 1) {
        g.t = s.tile; g.w1 = s.lit;
        const v0 = shopOk ? 0 : 1;
        g.wall(ax, az, bx, bz, yb + gh, h, 0, bays * ps, v0 * ps, (v0 + b.floors - 1) * ps, 1, 1);
      }
      // ballkonet
      if (s.balc && Q >= 1 && b.floors >= 3 && len >= 9) {
        const segs = bays >= 7 ? [[1, 3], [bays - 3, bays - 1]] : bays >= 4 ? [[Math.floor(bays / 2) - 1, Math.floor(bays / 2) + 1]] : [];
        g.t = A.c.balc; g.w1 = 0; g.c = mulc(s.tint, 1.04);
        for (let f = 1; f < b.floors; f++) {
          const y = yb + gh + (f - 1) * s.fh;
          for (const [sa, sb] of segs) {
            const p0x = ax + dx * sa * bl, p0z = az + dz * sa * bl, p1x = ax + dx * sb * bl, p1z = az + dz * sb * bl;
            const qx = p1x + nx * 1.15, qz = p1z + nz * 1.15;
            g.box(Math.min(p0x, qx), y - 0.15, Math.min(p0z, qz), Math.max(p0x, qx), y + 1.0, Math.max(p0z, qz), 0.6, true);
          }
        }
      }
    }
    // kornizë + çati
    g.w1 = 0;
    let top = h;
    if (b.noRoof) return h;
    if (s.roof === 'flat') {
      const o = 0.28;
      g.t = A.c.white; g.c = mulc(s.tint, s.corn);
      g.box(b.x0 - o, h, b.z0 - o, b.x1 + o, h + 0.55, b.z1 + o, 0.5, true, false);
      g.t = A.c[s.roofTile ?? 'roofGravel']; g.c = [1, 1, 1];
      g.flat(b.x0 - o, b.z0 - o, b.x1 + o, b.z1 + o, h + 0.55, 0.2);
      top = h + 0.55;
      const W = b.x1 - b.x0, D = b.z1 - b.z0;
      if (Q >= 1 && h > 13 && W > 8 && D > 8) {
        g.t = A.c.white; g.c = lin(0xc9c5bd);
        const hx = b.x0 + rand(2, W - 6), hz = b.z0 + rand(2, D - 5);
        g.box(hx, top, hz, hx + 3.8, top + 2.8, hz + 3, 0.5);
      }
      if (Q >= 2 && W > 7 && D > 7) {
        const nT = 1 + ((R() * 4) | 0);
        for (let k = 0; k < nT; k++) {
          g.t = A.c.white; g.c = lin(pick([0xf2f2f2, 0x2a2a2a, 0x3a6fb0, 0xd8d8d8]));
          const tx = b.x0 + rand(1.5, W - 1.5), tz = b.z0 + rand(1.5, D - 1.5);
          g.cyl(tx, tz, top, top + 1.5, 0.65, 0.65, 7, true);
        }
        g.c = lin(0xb9bcbf);
        for (let k = 0; k < 3; k++) { const tx = b.x0 + rand(1, W - 2), tz = b.z0 + rand(1, D - 2); g.box(tx, top, tz, tx + 1.0, top + 0.7, tz + 0.7, 0.5); }
      }
    } else if (s.roof === 'hip') {
      top = hipRoof(g, b.x0, b.z0, b.x1, b.z1, h, 0.6, 0.3, s.roofTile ?? 'roofTile');
    } else {
      top = gableRoof(g, b.x0, b.z0, b.x1, b.z1, h, s);
    }
    obs(b.x0, b.z0, b.x1, b.z1, top, 'building');
    return top;
  }

  function hipRoof(g: Geo, x0: number, z0: number, x1: number, z1: number, y: number, o: number, pitch: number, tile: CellName, tint: RGB = [1, 1, 1]): number {
    const X0 = x0 - o, X1 = x1 + o, Z0 = z0 - o, Z1 = z1 + o;
    const alongX = X1 - X0 >= Z1 - Z0;
    const W = alongX ? X1 - X0 : Z1 - Z0, D = alongX ? Z1 - Z0 : X1 - X0, rh = D * pitch;
    const sl = Math.hypot(D / 2, rh), s = 0.45;
    g.t = A.c[tile]; g.c = tint; g.w1 = 0;
    const nU = D / 2 / sl, nH = rh / sl;
    // koordinata lokale (a = gjatësi, b = thellësi) → botë
    const P = (a: number, yy: number, bb: number) => alongX ? [X0 + a, yy, Z0 + bb] : [X0 + bb, yy, Z0 + a];
    const N = (na: number, ny: number, nb: number): [number, number, number] => alongX ? [na, ny, nb] : [nb, ny, na];
    const yt = y + rh;
    // dy trapezët
    let n = N(0, nU, -nH);
    g.q([...P(0, y, 0), ...P(W, y, 0), ...P(W - D / 2, yt, D / 2), ...P(D / 2, yt, D / 2)], n[0], n[1], n[2], [0, 0, W * s, 0, (W - D / 2) * s, sl * s, D / 2 * s, sl * s]);
    n = N(0, nU, nH);
    g.q([...P(W, y, D), ...P(0, y, D), ...P(D / 2, yt, D / 2), ...P(W - D / 2, yt, D / 2)], n[0], n[1], n[2], [0, 0, W * s, 0, (W - D / 2) * s, sl * s, D / 2 * s, sl * s]);
    n = N(-nH, nU, 0);
    g.tri([...P(0, y, D), ...P(0, y, 0), ...P(D / 2, yt, D / 2)], [0, 0, D * s, 0, D / 2 * s, sl * s], n);
    n = N(nH, nU, 0);
    g.tri([...P(W, y, 0), ...P(W, y, D), ...P(W - D / 2, yt, D / 2)], [0, 0, D * s, 0, D / 2 * s, sl * s], n);
    g.t = A.c.white; g.c = [0.8, 0.78, 0.74];
    g.q([X0, y, Z0, X1, y, Z0, X1, y, Z1, X0, y, Z1], 0, -1, 0);
    return yt;
  }
  function gableRoof(g: Geo, x0: number, z0: number, x1: number, z1: number, y: number, s: Style): number {
    const alongX = x1 - x0 >= z1 - z0, o = 0.4;
    const D = alongX ? z1 - z0 : x1 - x0, rh = D * 0.18, yt = y + rh;
    const P = (a: number, yy: number, bb: number) => alongX ? [a, yy, bb] : [bb, yy, a];
    const a0 = (alongX ? x0 : z0) - o, a1 = (alongX ? x1 : z1) + o, b0 = (alongX ? z0 : x0) - o, b1 = (alongX ? z1 : x1) + o, bm = (b0 + b1) / 2;
    const sl = Math.hypot(D / 2 + o, rh), nU = (D / 2) / Math.hypot(D / 2, rh), nH = rh / Math.hypot(D / 2, rh);
    g.t = A.c[s.roofTile ?? 'roofMetal']; g.c = [1, 1, 1]; g.w1 = 0;
    const L2 = (a1 - a0) * 0.3, S2 = sl * 0.3;
    let n: number[] = alongX ? [0, nU, -nH] : [-nH, nU, 0];
    g.q([...P(a0, y, b0), ...P(a1, y, b0), ...P(a1, yt, bm), ...P(a0, yt, bm)], n[0], n[1], n[2], [0, 0, L2, 0, L2, S2, 0, S2]);
    n = alongX ? [0, nU, nH] : [nH, nU, 0];
    g.q([...P(a1, y, b1), ...P(a0, y, b1), ...P(a0, yt, bm), ...P(a1, yt, bm)], n[0], n[1], n[2], [0, 0, L2, 0, L2, S2, 0, S2]);
    // trekëndëshat e frontoneve
    g.t = s.tile; g.c = s.tint;
    const c0 = alongX ? z0 : x0, c1 = alongX ? z1 : x1, cm = (c0 + c1) / 2, bw = (c1 - c0) / s.bw;
    for (const [a, sg] of [[(alongX ? x0 : z0), -1], [(alongX ? x1 : z1), 1]] as [number, number][]) {
      const nn: [number, number, number] = alongX ? [sg, 0, 0] : [0, 0, sg];
      g.tri([...P(a, y, c0), ...P(a, y, c1), ...P(a, yt, cm)], [0, 0.999, bw, 0.999, bw / 2, 0.999 + rh / s.fh * 0.3], nn);
    }
    return yt;
  }

  // Blloku perimetral (oborr në mes).
  interface PerimOpts { depth: [number, number]; width: [number, number]; floors: () => number; style: () => Style; tower?: number; towerStyle?: () => Style; gap?: number }
  function perimeter(Lr: Rect, road: readonly boolean[], o: PerimOpts, court?: (r: Rect) => void) {
    const W = Lr.x1 - Lr.x0, D = Lr.z1 - Lr.z0;
    const d = rand(o.depth[0], o.depth[1]);
    const bits = (n: boolean, e: boolean, s: boolean, w: boolean) => (n && road[0] ? 1 : 0) | (w && road[3] ? 2 : 0) | (s && road[2] ? 4 : 0) | (e && road[1] ? 8 : 0);
    const row = (a0: number, a1: number, b0: number, b1: number, alongX: boolean, side: number, startBit: number, endBit: number, corners: boolean) => {
      let p = a0;
      while (a1 - p > 3) {
        let w = rand(o.width[0], o.width[1]);
        if (a1 - p - w < o.width[0] * 0.8) w = a1 - p;
        const q0 = p, q1 = Math.min(a1, p + w);
        const first = q0 <= a0 + 0.01, last = q1 >= a1 - 0.01;
        const mask = side | (first ? startBit : 0) | (last ? endBit : 0);
        const isCorner = corners && (first || last);
        const tower = isCorner && o.tower && R() < o.tower && o.towerStyle;
        const bb: Bld = alongX ? { x0: q0, x1: q1, z0: b0, z1: b1, floors: 0, st: o.style(), street: mask } : { x0: b0, x1: b1, z0: q0, z1: q1, floors: 0, st: o.style(), street: mask };
        if (tower) { bb.st = o.towerStyle!(); bb.floors = 13 + ((R() * 12) | 0); }
        else bb.floors = o.floors();
        building(bb);
        p = q1 + (R() < (o.gap ?? 0.1) ? rand(2, 5) : 0);
      }
    };
    if (W < 2 * d + 10 || D < 2 * d + 10) {
      if (W >= D) row(Lr.x0, Lr.x1, Lr.z0, Lr.z1, true, bits(true, false, true, false), bits(false, false, false, true), bits(false, true, false, false), true);
      else row(Lr.z0, Lr.z1, Lr.x0, Lr.x1, false, bits(false, true, false, true), bits(true, false, false, false), bits(false, false, true, false), true);
      return;
    }
    row(Lr.x0, Lr.x1, Lr.z0, Lr.z0 + d, true, bits(true, false, false, false), bits(false, false, false, true), bits(false, true, false, false), true);
    row(Lr.x0, Lr.x1, Lr.z1 - d, Lr.z1, true, bits(false, false, true, false), bits(false, false, false, true), bits(false, true, false, false), true);
    row(Lr.z0 + d, Lr.z1 - d, Lr.x0, Lr.x0 + d, false, bits(false, false, false, true), 0, 0, false);
    row(Lr.z0 + d, Lr.z1 - d, Lr.x1 - d, Lr.x1, false, bits(false, true, false, false), 0, 0, false);
    const cr = { x0: Lr.x0 + d + 2, x1: Lr.x1 - d - 2, z0: Lr.z0 + d + 2, z1: Lr.z1 - d - 2 };
    if (court) court(cr);
    else if (cr.x1 - cr.x0 > 8 && cr.z1 - cr.z0 > 8) {
      const n = 1 + ((R() * 4) | 0);
      for (let k = 0; k < n; k++) tree(rand(cr.x0 + 2, cr.x1 - 2), rand(cr.z0 + 2, cr.z1 - 2), 'r', rand(0.8, 1.1));
    }
  }

  // Stilet sipas lagjes.
  const S = {
    qendra: () => {
      const r = R();
      if (r < 0.22) return st('classic', pick(T.warm), { shops: SHOPSET.qendra, shopP: 0.9 });
      if (r < 0.4) return st('plaster', pick(T.warm), { shops: SHOPSET.qendra, shopP: 0.85, balc: R() < 0.4 });
      if (r < 0.55) return st('office', pick(T.grey), { shops: SHOPSET.qendra, shopP: 0.8, lit: 0.5 });
      if (r < 0.7) return st('modern', pick(T.grey), { shops: SHOPSET.qendra, shopP: 0.85, lit: 0.45 });
      if (r < 0.85) return st('tilemod', pick(T.grey), { shops: SHOPSET.qendra, shopP: 0.85, balc: R() < 0.5 });
      return st('shutter', pick(T.pastel), { shops: SHOPSET.qendra, shopP: 0.9 });
    },
    tower: () => R() < 0.5 ? st('glassB', 0xffffff, { fh: 3.5, lit: 0.45, corn: 0.5, shops: SHOPSET.qendra, shopP: 0.6 }) : st('glassG', 0xffffff, { fh: 3.5, lit: 0.45, corn: 0.5, shops: SHOPSET.qendra, shopP: 0.6 }),
    blloku: () => {
      if (R() < 0.55) return st((R() * 8) | 0, 0xffffff, { shops: SHOPSET.blloku, shopP: 0.92, balc: R() < 0.25, lit: 0.4 });
      return st(pick(['plaster', 'shutter', 'tilemod'] as CellName[]), pick(R() < 0.6 ? T.vivid : T.pastel), { shops: SHOPSET.blloku, shopP: 0.9, balc: R() < 0.4, lit: 0.4 });
    },
    pallat: () => {
      if (R() < 0.32) return st((R() * 8) | 0, 0xffffff, { fh: 2.9, shops: SHOPSET.lagjja, shopP: 0.5, balc: true, lit: 0.42 });
      return st(R() < 0.6 ? 'pallat' : 'pallat2', pick(R() < 0.5 ? T.pastel : T.grey), { fh: 2.9, shops: SHOPSET.lagjja, shopP: 0.5, balc: true, lit: 0.42 });
    },
    villa: () => st(pick(['villa', 'shutter', 'villa'] as CellName[]), pick([0xfaf6ee, 0xf6ead2, 0xf3d7b8, 0xf7e7a8, 0xe9d4c4, 0xffffff]), { fh: 3.1, roof: 'hip', lit: 0.5 }),
    hotel: () => st(pick(['tilemod', 'modern', 'plaster'] as CellName[]), pick([0xf4f1ea, 0xe9e1d3, 0xdfe6ea]), { shops: SHOPSET.liqeni, shopP: 0.85, balc: true, lit: 0.55 }),
  };

  // ===========================================================================================
  // D. Zonat
  // ===========================================================================================
  const ctr = (r: Rect) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });

  function park(I: Rect, dense = 1) {
    lot(I, C.grass, 2);
    const c = ctr(I), pw = 2.2;
    strip(I.x0, c.z - pw, I.x1, c.z + pw, C.sidewalk, 1);
    strip(c.x - pw, I.z0, c.x + pw, c.z - pw, C.sidewalk, 1);
    strip(c.x - pw, c.z + pw, c.x + pw, I.z1, C.sidewalk, 1);
    const area = (I.x1 - I.x0) * (I.z1 - I.z0), nT = Math.round(area / 260 * dense);
    for (let k = 0; k < nT; k++) {
      const x = rand(I.x0 + 2, I.x1 - 2), z = rand(I.z0 + 2, I.z1 - 2);
      if (Math.abs(x - c.x) < 4.5 || Math.abs(z - c.z) < 4.5) continue;
      const r = R(); tree(x, z, r < 0.65 ? 'r' : r < 0.85 ? 'p' : 'c');
    }
    for (let k = 0; k < nT / 3; k++) { const x = rand(I.x0 + 2, I.x1 - 2), z = rand(I.z0 + 2, I.z1 - 2); if (Math.abs(x - c.x) > 4 && Math.abs(z - c.z) > 4) bush(x, z); }
    for (let x = I.x0 + 10; x < I.x1 - 6; x += 22) { lamp(x, c.z - pw - 0.5, 0); bench(x + 6, c.z + pw + 0.8, Math.PI); }
    for (let z = I.z0 + 10; z < I.z1 - 6; z += 22) { if (Math.abs(z - c.z) > 8) { lamp(c.x + pw + 0.5, z, -Math.PI / 2); bench(c.x - pw - 0.8, z + 6, Math.PI / 2); } }
    kiosk(c.x + 6, c.z - 7, Math.PI);
  }

  function blockContent(reg: Region, I: Rect) {
    const W = I.x1 - I.x0, D = I.z1 - I.z0;
    switch (reg.district) {
      case 'qendra':
        lot(I, C.yard, 1);
        perimeter(I, reg.road, { depth: [15, 21], width: [15, 30], floors: () => 6 + ((R() * 6) | 0), style: S.qendra, tower: 0.2, towerStyle: S.tower });
        break;
      case 'blloku':
        lot(I, C.yard, 1);
        perimeter(I, reg.road, { depth: [12, 16], width: [10, 22], floors: () => 4 + ((R() * 5) | 0), style: S.blloku, gap: 0.05 });
        break;
      case 'lagjja': {
        lot(I, C.grassDry, 2);
        const alongX = W >= D, len = alongX ? W : D, dep = alongX ? D : W;
        const sd = rand(11, 13), gap = rand(15, 21);
        const rows = Math.max(1, Math.floor((dep + gap) / (sd + gap)));
        const tot = rows * sd + (rows - 1) * gap, st0 = (dep - tot) / 2;
        for (let r = 0; r < rows; r++) {
          const b0 = st0 + r * (sd + gap), b1 = b0 + sd;
          const two = len > 72 && R() < 0.8;
          const spans = two ? (() => { const m = len / 2 + rand(-6, 6), g2 = rand(5, 9); return [[2, m - g2], [m + g2, len - 2]]; })() : [[3, len - 3]];
          for (const [a0, a1] of spans) {
            let street = 0;
            if (alongX) { if (r === 0 && b0 < 5 && reg.road[0]) street |= 1; if (r === rows - 1 && dep - b1 < 5 && reg.road[2]) street |= 4; if (a0 < 4 && reg.road[3]) street |= 2; if (len - a1 < 4 && reg.road[1]) street |= 8; }
            else { if (r === 0 && b0 < 5 && reg.road[3]) street |= 2; if (r === rows - 1 && dep - b1 < 5 && reg.road[1]) street |= 8; if (a0 < 4 && reg.road[0]) street |= 1; if (len - a1 < 4 && reg.road[2]) street |= 4; }
            const bb: Bld = alongX ? { x0: I.x0 + a0, x1: I.x0 + a1, z0: I.z0 + b0, z1: I.z0 + b1, floors: 5 + ((R() * 4) | 0), st: S.pallat(), street }
              : { x0: I.x0 + b0, x1: I.x0 + b1, z0: I.z0 + a0, z1: I.z0 + a1, floors: 5 + ((R() * 4) | 0), st: S.pallat(), street };
            building(bb);
          }
          if (r < rows - 1) {
            const m0 = b1 + 3, m1 = b1 + gap - 3;
            for (let k = 0; k < 2 + R() * 4; k++) {
              const a = rand(4, len - 4), bq = rand(m0, m1);
              if (alongX) tree(I.x0 + a, I.z0 + bq); else tree(I.x0 + bq, I.z0 + a);
            }
            const a = rand(8, len - 8), bq = (m0 + m1) / 2;
            if (alongX) bench(I.x0 + a, I.z0 + bq, 0); else bench(I.x0 + bq, I.z0 + a, Math.PI / 2);
          }
        }
        break;
      }
      case 'liqeni': {
        if (R() < 0.25) {
          lot(I, C.yard, 1);
          perimeter(I, reg.road, { depth: [14, 18], width: [18, 30], floors: () => 6 + ((R() * 5) | 0), style: S.hotel });
          break;
        }
        lot(I, C.grass, 2);
        const nX = Math.max(1, Math.round(W / 24)), nZ = Math.max(1, Math.round(D / 24)), pw = W / nX, pd = D / nZ;
        for (let i = 0; i < nX; i++) for (let j = 0; j < nZ; j++) {
          const px0 = I.x0 + i * pw, pz0 = I.z0 + j * pd;
          if (R() < 0.12) { tree(px0 + pw / 2, pz0 + pd / 2, 'p'); continue; }
          const bw = Math.min(pw - 6, rand(9, 14)), bd = Math.min(pd - 6, rand(9, 13));
          const bx = px0 + (pw - bw) / 2 + rand(-1.5, 1.5), bz = pz0 + (pd - bd) / 2 + rand(-1.5, 1.5);
          building({ x0: bx, x1: bx + bw, z0: bz, z1: bz + bd, floors: 2 + ((R() * 2) | 0), st: S.villa(), street: 0 });
          for (let k = 0; k < 2; k++) {
            const tx = R() < 0.5 ? px0 + 1.5 : px0 + pw - 1.5, tz = pz0 + rand(2, pd - 2);
            if (R() < 0.7) tree(tx, tz, R() < 0.3 ? 'c' : 'r', rand(0.7, 1));
          }
          bush(px0 + pw / 2 + rand(-4, 4), pz0 + 1.5); bush(px0 + rand(2, pw - 2), pz0 + pd - 1.5);
        }
        break;
      }
      case 'industria': {
        lot(I, C.concrete, 3);
        industrial(reg, I);
        break;
      }
    }
  }

  function industrial(reg: Region, I: Rect) {
    const g = cAt((I.x0 + I.x1) / 2, (I.z0 + I.z1) / 2).m;
    // muri rrethues me portë
    const gateSide = [0, 1, 2, 3].filter(k => reg.road[k]);
    const gs = gateSide.length ? pick(gateSide) : -1;
    g.c = lin(0xb7b2a9);
    const wall = (x0: number, z0: number, x1: number, z1: number) => { g.box(x0, CURB, z0, x1, CURB + 2.2, z1, 0.25); obs(x0, z0, x1, z1, 2.2, 'wall'); };
    const t = 0.3, e = 0.4;
    const runs: [number, number, number, number, number][] = [
      [I.x0 + e, I.z0 + e, I.x1 - e, I.z0 + e + t, 0], [I.x1 - e - t, I.z0 + e, I.x1 - e, I.z1 - e, 1],
      [I.x0 + e, I.z1 - e - t, I.x1 - e, I.z1 - e, 2], [I.x0 + e, I.z0 + e, I.x0 + e + t, I.z1 - e, 3],
    ];
    for (const [x0, z0, x1, z1, k] of runs) {
      if (k !== gs) { wall(x0, z0, x1, z1); continue; }
      if (k === 0 || k === 2) { const m = (x0 + x1) / 2; wall(x0, z0, m - 6, z1); wall(m + 6, z0, x1, z1); }
      else { const m = (z0 + z1) / 2; wall(x0, z0, x1, m - 6); wall(x0, m + 6, x1, z1); }
    }
    const W = I.x1 - I.x0, D = I.z1 - I.z0, alongX = W >= D;
    const m = 6;
    // depoja kryesore
    const depth = (alongX ? D : W) * rand(0.42, 0.55);
    const len = Math.min((alongX ? W : D) - 2 * m, rand(50, 95));
    const a0 = (alongX ? I.x0 : I.z0) + m, b0 = (alongX ? I.z0 : I.x0) + m;
    const wst = st(pick(['corr', 'corrWin', 'corrWin', 'brick'] as CellName[]), pick(T.ind), { fh: rand(8, 11), bw: 4, roof: R() < 0.6 ? 'gable' : 'flat', roofTile: 'roofMetal', lit: 0.25 });
    if (wst.tile === A.c.brick) wst.tint = lin(0xffffff);
    building(alongX ? { x0: a0, x1: a0 + len, z0: b0, z1: b0 + depth, floors: 1, st: wst, street: 0 } : { x0: b0, x1: b0 + depth, z0: a0, z1: a0 + len, floors: 1, st: wst, street: 0 });
    // punishte me garazhe
    const rest0 = b0 + depth + 8, restEnd = (alongX ? I.z1 : I.x1) - m;
    if (restEnd - rest0 > 14) {
      const ws = st('brick', 0xffffff, { fh: 4.4, bw: 4, ground: 'garage', shops: SHOPSET.industria, shopP: 0.7, lit: 0.3 });
      const dd = Math.min(14, restEnd - rest0), l2 = Math.min(len, rand(25, 45));
      const sideBit = alongX ? (reg.road[2] ? 4 : 0) : (reg.road[1] ? 8 : 0);
      const r2: Bld = alongX ? { x0: a0, x1: a0 + l2, z0: restEnd - dd, z1: restEnd, floors: 2, st: ws, street: sideBit }
        : { x0: restEnd - dd, x1: restEnd, z0: a0, z1: a0 + l2, floors: 2, st: ws, street: sideBit };
      building(r2);
      // kontejnerë
      const cA = a0 + l2 + 6, cB = a0 + len;
      for (let c = cA; c + 6.2 < cB; c += 7) {
        const hN = 1 + ((R() * 3) | 0);
        for (let k = 0; k < hN; k++) {
          g.c = lin(pick([0xb8342b, 0x2f5d8a, 0x3f7f4a, 0xd97a28, 0x8b8f94, 0x6b3d8f]));
          const y0 = CURB + k * 2.6;
          if (alongX) g.box(c, y0, restEnd - 2.5, c + 6.1, y0 + 2.55, restEnd, 0.4); else g.box(restEnd - 2.5, y0, c, restEnd, y0 + 2.55, c + 6.1, 0.4);
        }
        if (alongX) obs(c, restEnd - 2.5, c + 6.1, restEnd, hN * 2.6, 'prop'); else obs(restEnd - 2.5, c, restEnd, c + 6.1, hN * 2.6, 'prop');
      }
    }
    // oxhak / depozita
    if (R() < 0.3) {
      const cx = I.x1 - 10, cz = I.z1 - 10;
      for (let k = 0; k < 5; k++) { g.c = lin(k % 2 ? 0xf2f0ea : 0xc0392b); g.cyl(cx, cz, CURB + k * 6, CURB + (k + 1) * 6, 1.4 - k * 0.12, 1.4 - (k + 1) * 0.12, 10, k === 4); }
      obs(cx - 1.5, cz - 1.5, cx + 1.5, cz + 1.5, 30, 'building');
    } else if (R() < 0.5) {
      for (let k = 0; k < 2; k++) {
        const cx = I.x1 - 9 - k * 10, cz = I.z0 + 9;
        g.c = lin(0xe8e6e0); g.cyl(cx, cz, CURB, CURB + 9, 4, 4, 14, true);
        obs(cx - 4, cz - 4, cx + 4, cz + 4, 9, 'building');
      }
    }
  }

  function plaza(reg: Region) {
    const I = platform(reg.x0, reg.z0, reg.x1, reg.z1, reg.road, C.plaza, 3);
    lot(I, C.plaza, 3);
    const c = ctr(I); landmarks.plaza = c;
    const m = cAt(c.x, c.z).m, w = cAt(c.x, c.z).w;
    // shatërvani
    const fx = c.x + 8, fz = c.z;
    m.c = C.stone; m.cyl(fx, fz, CURB, CURB + 0.7, 7.2, 7.2, 24, true);
    m.c = lin(0xe9e4d8); m.cyl(fx, fz, CURB + 0.7, CURB + 2.6, 0.7, 0.45, 10, false); m.cyl(fx, fz, CURB + 2.3, CURB + 2.6, 2.0, 2.0, 14, true);
    m.c = lin(0xdff3ff); m.cyl(fx, fz, CURB + 2.6, CURB + 4.4, 0.18, 0.05, 6, false);
    w.cyl(fx, fz, CURB + 0.72, CURB + 0.73, 6.7, 6.7, 24, true);
    obs(fx - 7.2, fz - 7.2, fx + 7.2, fz + 7.2, 0.9, 'wall');
    // monumenti (kalorës bronzi)
    const mx = I.x0 + 16, mz = c.z;
    m.c = C.stoneDark; m.box(mx - 2.4, CURB, mz - 4, mx + 2.4, CURB + 0.6, mz + 4, 0.4);
    m.c = lin(0x9b8f7c); m.box(mx - 1.6, CURB + 0.6, mz - 3, mx + 1.6, CURB + 4.2, mz + 3, 0.4);
    m.c = C.bronze; const y = CURB + 4.2;
    m.box(mx - 0.5, y + 1.2, mz - 1.6, mx + 0.5, y + 2.2, mz + 1.4, 0.5);
    for (const [lx, lz] of [[-0.35, -1.3], [0.35, -1.3], [-0.35, 1.1], [0.35, 1.1]]) m.box(mx + lx - 0.12, y, mz + lz - 0.12, mx + lx + 0.12, y + 1.3, mz + lz + 0.12, 0.5);
    m.box(mx - 0.25, y + 1.9, mz - 2.3, mx + 0.25, y + 3.0, mz - 1.5, 0.5);
    m.box(mx - 0.2, y + 2.6, mz - 2.75, mx + 0.2, y + 3.0, mz - 2.2, 0.5);
    m.box(mx - 0.35, y + 2.2, mz - 0.4, mx + 0.35, y + 3.4, mz + 0.3, 0.5);
    m.box(mx - 0.18, y + 3.4, mz - 0.25, mx + 0.18, y + 3.8, mz + 0.1, 0.5);
    m.box(mx - 0.1, y + 2.9, mz - 1.4, mx + 0.1, y + 3.1, mz - 0.3, 0.5);
    obs(mx - 2.4, mz - 4, mx + 2.4, mz + 4, 8, 'wall');
    landmarks.monument = { x: mx, z: mz };
    // flamujt
    for (let k = 0; k < 3; k++) {
      const px = c.x + 22 + k * 4, pz = I.z0 + 6;
      m.c = lin(0xd9d9d9); m.cyl(px, pz, CURB, CURB + 12, 0.08, 0.06, 6, true);
      m.c = lin(0xc8102e); const fq = [px, CURB + 11.8, pz, px + 2.6, CURB + 11.8, pz, px + 2.6, CURB + 10.1, pz, px, CURB + 10.1, pz];
      m.q(fq, 0, 0, 1); m.q(fq, 0, 0, -1);
      obs(px - 0.15, pz - 0.15, px + 0.15, pz + 0.15, 12, 'prop');
    }
    for (let x = I.x0 + 6; x < I.x1 - 4; x += 9) { tree(x, I.z1 - 3, 'r', 0.9); tree(x + 4, I.z0 + 2.5, 'r', 0.85); }
    for (let a = 0; a < 8; a++) { const an = (a / 8) * Math.PI * 2; bench(fx + Math.cos(an) * 10.5, fz + Math.sin(an) * 10.5, Math.atan2(-Math.cos(an), -Math.sin(an))); }
    for (let a = 0; a < 6; a++) { const an = (a / 6) * Math.PI * 2 + 0.3; lamp(fx + Math.cos(an) * 16, fz + Math.sin(an) * 16, Math.atan2(-Math.cos(an), -Math.sin(an))); }
    kiosk(I.x1 - 5, I.z1 - 9, -Math.PI / 2);
  }

  function clockBlock(reg: Region) {
    const I = platform(reg.x0, reg.z0, reg.x1, reg.z1, reg.road);
    lot(I, C.plaza, 3);
    const g = cAt(I.x0, I.z1).b, m = cAt(I.x0, I.z1).m;
    // Kulla e Sahatit
    const tx = I.x0 + 7, tz = I.z1 - 16, ts = 5.2, th = 26;
    g.t = A.c.stone; g.c = [1, 1, 1]; g.w0 = 3; g.w1 = 0;
    const walls = [[tx + ts, tz, tx, tz], [tx, tz, tx, tz + ts], [tx, tz + ts, tx + ts, tz + ts], [tx + ts, tz + ts, tx + ts, tz]];
    for (const [a, b, c2, d] of walls) g.wall(a, b, c2, d, CURB, CURB + th, 0, ts / 2.4, 0, th / 2.4, 0.8, 1);
    const cy = CURB + th;
    g.t = A.c.white; g.c = lin(0xe9dfca);
    g.box(tx - 0.4, cy, tz - 0.4, tx + ts + 0.4, cy + 4.6, tz + ts + 0.4, 0.4);
    g.c = lin(0x9b8a70); g.box(tx - 0.8, cy + 4.6, tz - 0.8, tx + ts + 0.8, cy + 4.9, tz + ts + 0.8, 0.4, true);
    const top = hipRoof(g, tx - 0.2, tz - 0.2, tx + ts + 0.2, tz + ts + 0.2, cy + 4.9, 0.3, 0.85, 'roofMetal', lin(0x5b6670));
    m.c = lin(0xd4af37); m.cyl(tx + ts / 2, tz + ts / 2, top, top + 1.4, 0.08, 0.02, 4, false);
    // faqet e orës
    const ccx = tx + ts / 2, ccz = tz + ts / 2, ry = cy + 2.3, fr = 1.65;
    for (const [nx, nz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const ox = ccx + nx * (ts / 2 + 0.42), oz = ccz + nz * (ts / 2 + 0.42);
      const N = 16, tx2 = -nz, tz2 = nx;
      m.c = lin(0xf8f4e8);
      const c0 = m.v(ox, ry, oz, nx, 0, nz);
      for (let k = 0; k <= N; k++) { const a = (k / N) * Math.PI * 2; m.v(ox + tx2 * Math.cos(a) * fr, ry + Math.sin(a) * fr, oz + tz2 * Math.cos(a) * fr, nx, 0, nz); }
      for (let k = 0; k < N; k++) {
        const ia = c0 + 1 + k, ib = c0 + 2 + k;
        const ax = m.pos[ia * 3] - ox, ay = m.pos[ia * 3 + 1] - ry, az = m.pos[ia * 3 + 2] - oz, bx = m.pos[ib * 3] - ox, by = m.pos[ib * 3 + 1] - ry, bz = m.pos[ib * 3 + 2] - oz;
        const cxp = ay * bz - az * by, czp = ax * by - ay * bx;
        if (cxp * nx + czp * nz >= 0) m.idx.push(c0, ia, ib); else m.idx.push(c0, ib, ia);
      }
      m.c = lin(0x111111);
      const hx = ox + nx * 0.03, hz = oz + nz * 0.03;
      m.q([hx - tx2 * 0.06, ry, hz - tz2 * 0.06, hx + tx2 * 0.06, ry, hz + tz2 * 0.06, hx + tx2 * 0.06, ry + 1.25, hz + tz2 * 0.06, hx - tx2 * 0.06, ry + 1.25, hz - tz2 * 0.06], nx, 0, nz);
      m.q([hx, ry - 0.06, hz, hx + tx2 * 0.9, ry - 0.06, hz + tz2 * 0.9, hx + tx2 * 0.9, ry + 0.06, hz + tz2 * 0.9, hx, ry + 0.06, hz], nx, 0, nz);
    }
    obs(tx, tz, tx + ts, tz + ts, top, 'building');
    landmarks.clock = { x: tx + ts / 2, z: tz + ts / 2 };
    // Xhamia
    const mx0 = I.x0 + 18, mz0 = I.z1 - 30, ms = 15;
    building({ x0: mx0, x1: mx0 + ms, z0: mz0, z1: mz0 + ms, floors: 2, st: st('classic', 0xf1e6cf, { fh: 4.2, corn: 0.9, lit: 0.6 }), street: 0, noRoof: true });
    const mh = CURB + 8.4;
    g.t = A.c.white; g.c = lin(0xd9cdb4); g.box(mx0 - 0.4, mh, mz0 - 0.4, mx0 + ms + 0.4, mh + 0.6, mz0 + ms + 0.4, 0.4, true);
    g.t = A.c.roofGravel; g.c = [1, 1, 1]; g.flat(mx0 - 0.4, mz0 - 0.4, mx0 + ms + 0.4, mz0 + ms + 0.4, mh + 0.6, 0.2);
    const dcx = mx0 + ms / 2, dcz = mz0 + ms / 2;
    m.c = lin(0xd9cdb4); m.cyl(dcx, dcz, mh + 0.6, mh + 1.8, 5.4, 5.4, 16, false);
    const dome = new THREE.SphereGeometry(5.4, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    m.add(dome, new THREE.Matrix4().makeTranslation(dcx, mh + 1.8, dcz), () => lin(0x7d8790));
    m.c = lin(0xd4af37); m.cyl(dcx, dcz, mh + 7.2, mh + 8.6, 0.1, 0.03, 4, false);
    const mnx = mx0 + ms + 3, mnz = mz0 + 2;
    m.c = lin(0xf1e9d8); m.cyl(mnx, mnz, CURB, CURB + 27, 1.0, 0.85, 10, false);
    m.c = lin(0xe2d7c2); m.cyl(mnx, mnz, CURB + 20, CURB + 20.6, 1.6, 1.6, 10, true);
    m.c = lin(0x7d8790); m.cyl(mnx, mnz, CURB + 27, CURB + 32, 0.9, 0.03, 10, false);
    obs(mnx - 1, mnz - 1, mnx + 1, mnz + 1, 30, 'building');
    landmarks.mosque = { x: dcx, z: dcz };
    // kopshti
    const gx0 = mx0 + ms + 6;
    if (I.x1 - gx0 > 10) {
      strip(gx0, I.z0 + 2, I.x1 - 2, I.z1 - 2, C.grass, 2);
      for (let k = 0; k < 10; k++) tree(rand(gx0 + 2, I.x1 - 4), rand(I.z0 + 4, I.z1 - 4), R() < 0.3 ? 'c' : 'r');
    }
    for (let k = 0; k < 6; k++) tree(rand(I.x0 + 3, mx0 + ms), rand(I.z0 + 3, mz0 - 4), 'r');
    bench(tx + 9, tz + 3, Math.PI / 2); bench(tx + 9, tz - 4, Math.PI / 2);
  }

  function palace(reg: Region) {
    const I = platform(reg.x0, reg.z0, reg.x1, reg.z1, reg.road, C.plaza, 3);
    lot(I, C.plaza, 3);
    const x0 = I.x0 + 5, x1 = I.x1 - 5, z0 = I.z0 + 8, z1 = I.z1 - 14;
    const hTop = building({ x0, x1, z0, z1, floors: 4, st: st('palace', 0xf3ead6, { fh: 4.2, corn: 0.92, lit: 0.55 }), street: 0 });
    const m = cAt((x0 + x1) / 2, z1).m;
    m.c = lin(0xe9e2d2);
    m.box(x0 + 4, CURB, z1, x1 - 4, CURB + 0.5, z1 + 6, 0.4);
    m.box(x0 + 4, CURB + 0.5, z1, x1 - 4, CURB + 0.9, z1 + 5, 0.4);
    for (let x = x0 + 6; x <= x1 - 6; x += 4.4) m.cyl(x, z1 + 3.8, CURB + 0.9, CURB + 13.4, 0.6, 0.5, 10, false);
    m.c = lin(0xddd3bf); m.box(x0 + 4, CURB + 13.4, z1 - 0.1, x1 - 4, CURB + 15.2, z1 + 4.8, 0.4, true);
    obs(x0 + 4, z1, x1 - 4, z1 + 6, 15, 'building');
    landmarks.palace = { x: (x0 + x1) / 2, z: z1 + 6 };
    for (let x = I.x0 + 4; x < I.x1 - 2; x += 10) tree(x, I.z1 - 3, 'c', 0.9);
    void hTop;
  }

  function pyramid(reg: Region) {
    const I = platform(reg.x0, reg.z0, reg.x1, reg.z1, reg.road, C.plaza, 3);
    lot(I, C.plaza, 3);
    const c = ctr(I), base = Math.min(I.x1 - I.x0, I.z1 - I.z0) - 6, half = base / 2, top = 6, H = 19;
    const g = cAt(c.x, c.z).b, m = cAt(c.x, c.z).m;
    g.t = A.c.pyramid; g.c = [1, 1, 1]; g.w0 = 77; g.w1 = 0.4;
    const y0 = CURB, y1 = CURB + H, inset = half - top, sl = Math.hypot(inset, H), nU = inset / sl, nH = H / sl;
    const s = 1 / 4, vs = sl / 3.2;
    const quads: [number[], number[]][] = [
      [[c.x + half, y0, c.z - half, c.x - half, y0, c.z - half, c.x - top, y1, c.z - top, c.x + top, y1, c.z - top], [0, -nH, nU]],
      [[c.x - half, y0, c.z + half, c.x + half, y0, c.z + half, c.x + top, y1, c.z + top, c.x - top, y1, c.z + top], [0, nH, nU]],
      [[c.x - half, y0, c.z - half, c.x - half, y0, c.z + half, c.x - top, y1, c.z + top, c.x - top, y1, c.z - top], [-nH, 0, nU]],
      [[c.x + half, y0, c.z + half, c.x + half, y0, c.z - half, c.x + top, y1, c.z - top, c.x + top, y1, c.z + top], [nH, 0, nU]],
    ];
    for (const [p, n] of quads) g.q(p, n[0], n[2], n[1], [0, 0, base * s, 0, (half + top) * s, vs, (half - top) * s, vs]);
    g.t = A.c.white; g.c = lin(0xeeeeea); g.w1 = 0; g.flat(c.x - top, c.z - top, c.x + top, c.z + top, y1);
    g.t = A.c.glassDark; g.w1 = 0.6; g.box(c.x - 3, y1, c.z - 3, c.x + 3, y1 + 1.6, c.z + 3, 0.3);
    // kubet shumëngjyrëshe
    for (let k = 0; k < 14; k++) {
      const side = k % 4, f = rand(0.12, 0.75), along = rand(-0.7, 0.7);
      const hh = y0 + f * H, d = half - f * inset, sz = rand(1.8, 2.8);
      let px = c.x, pz = c.z;
      if (side === 0) { pz = c.z - d; px = c.x + along * d; } else if (side === 1) { pz = c.z + d; px = c.x + along * d; }
      else if (side === 2) { px = c.x - d; pz = c.z + along * d; } else { px = c.x + d; pz = c.z + along * d; }
      m.c = lin(pick(PAL));
      m.box(px - sz / 2, hh - sz * 0.4, pz - sz / 2, px + sz / 2, hh + sz * 0.6, pz + sz / 2, 0.4, true);
    }
    obs(c.x - half, c.z - half, c.x + half, c.z + half, H, 'building');
    landmarks.pyramid = c;
    for (let x = I.x0 + 3; x < I.x1; x += 8) { if (Math.abs(x - c.x) > half + 2) { tree(x, I.z0 + 3); tree(x, I.z1 - 3); } }
  }

  function towers(reg: Region) {
    const I = platform(reg.x0, reg.z0, reg.x1, reg.z1, reg.road, C.plaza, 3);
    lot(I, C.plaza, 3);
    const W = I.x1 - I.x0, D = I.z1 - I.z0;
    // kulla A me shkallëzim
    const ax0 = I.x1 - 30, az0 = I.z0 + 4, aw = 26;
    const stA = st('glassB', 0xffffff, { fh: 3.5, lit: 0.5, corn: 0.5, shops: SHOPSET.qendra, shopP: 1 });
    const nA = 15 + ((R() * 6) | 0);
    const hA = building({ x0: ax0, x1: ax0 + aw, z0: az0, z1: az0 + aw, floors: nA, st: stA, street: (reg.road[0] ? 1 : 0) | (reg.road[1] ? 8 : 0) });
    building({ x0: ax0 + 3, x1: ax0 + aw - 3, z0: az0 + 3, z1: az0 + aw - 3, floors: 6 + ((R() * 4) | 0), st: st('glassB', 0xffffff, { fh: 3.5, lit: 0.5, corn: 0.5 }), street: 0, yb: hA });
    // kulla B
    const bx0 = I.x0 + 4, bz0 = I.z1 - 34;
    building({ x0: bx0, x1: bx0 + 22, z0: bz0, z1: bz0 + 30, floors: 14 + ((R() * 6) | 0), st: st('glassG', 0xffffff, { fh: 3.5, lit: 0.5, corn: 0.5, shops: SHOPSET.qendra, shopP: 1 }), street: (reg.road[3] ? 2 : 0) | (reg.road[2] ? 4 : 0) });
    // ndërtesë zyrash
    if (W > 70) building({ x0: I.x0 + 4, x1: I.x0 + 28, z0: I.z0 + 4, z1: I.z0 + Math.min(30, D - 40), floors: 9, st: st('office', 0xd8d6d2, { shops: SHOPSET.qendra, shopP: 1, lit: 0.55 }), street: (reg.road[0] ? 1 : 0) | (reg.road[3] ? 2 : 0) });
    landmarks.towers = { x: ax0 + aw / 2, z: az0 + aw / 2 };
    const c = ctr(I);
    for (let k = 0; k < 8; k++) tree(c.x + rand(-14, 6), c.z + rand(-10, 10), 'r', 0.9);
    bench(c.x - 4, c.z, 0); bench(c.x + 2, c.z + 6, Math.PI); kiosk(c.x - 10, c.z + 8, 0);
  }

  function outer(reg: Region, I: Rect) {
    lot(I, C.grass, 2);
    const W = I.x1 - I.x0, D = I.z1 - I.z0;
    const n = Math.round(W * D / 140);
    for (let k = 0; k < n; k++) {
      const x = rand(I.x0 + 1.5, I.x1 - 1.5), z = rand(I.z0 + 1.5, I.z1 - 1.5);
      tree(x, z, R() < 0.5 ? 'c' : R() < 0.5 ? 'p' : 'r', rand(0.9, 1.3));
    }
  }

  function riverRegion(reg: Region) {
    const rv = L.river;
    const banks: [number, number, boolean[]][] = [
      [reg.z0, rv.z0, [reg.road[0], reg.road[1], false, reg.road[3]]],
      [rv.z1, reg.z1, [false, reg.road[1], reg.road[2], reg.road[3]]],
    ];
    for (const [z0, z1, road] of banks) {
      const I = platform(reg.x0, z0, reg.x1, z1, road);
      lot(I, C.grass, 2);
      const north = z1 === rv.z0;
      const pz0 = north ? I.z1 - 5 : I.z0, pz1 = north ? I.z1 : I.z0 + 5;
      strip(I.x0, pz0, I.x1, pz1, C.plaza, 3);
      const tz = north ? pz0 - 3 : pz1 + 3, bz = north ? pz1 - 1.2 : pz0 + 1.2;
      for (let x = I.x0 + 4; x < I.x1 - 3; x += 9) tree(x + rand(-1, 1), tz + rand(-0.8, 0.8), R() < 0.2 ? 'c' : 'r', rand(0.9, 1.2));
      for (let x = I.x0 + 10; x < I.x1 - 6; x += 26) { bench(x, bz, north ? 0 : Math.PI); lamp(x + 13, north ? pz0 + 0.6 : pz1 - 0.6, north ? Math.PI : 0); }
      const mid = north ? (I.z0 + pz0 - 3) / 2 : (pz1 + 3 + I.z1) / 2;
      for (let k = 0; k < (I.x1 - I.x0) / 18; k++) { const x = rand(I.x0 + 3, I.x1 - 3); if (R() < 0.5) tree(x, mid + rand(-6, 6), 'r'); else bush(x, mid + rand(-6, 6)); }
      // parmaku mbi kanal
      const m = cAt((reg.x0 + reg.x1) / 2, z0).m, ez = north ? rv.z0 - 0.35 : rv.z1 + 0.05;
      m.c = C.rail;
      m.box(reg.x0, CURB + 0.95, ez, reg.x1, CURB + 1.02, ez + 0.3, 0.3);
      for (let x = reg.x0 + 1; x < reg.x1; x += 2.5) m.box(x, CURB, ez + 0.1, x + 0.07, CURB + 0.95, ez + 0.17, 0.3, false, false);
    }
  }

  function lakeRegion(reg: Region) {
    const I = platform(reg.x0, reg.z0, reg.x1, reg.z1, reg.road);
    const lk = L.lake, poly = lk.poly, N = poly.length;
    landmarks.lake = { x: lk.cx, z: lk.cz };
    landmarks.lakeNorth = { x: lk.cx, z: I.z0 };
    landmarks.lakeSouth = { x: lk.cx + 40, z: I.z1 };
    const prom = poly.map(p => { const dx = p.x - lk.cx, dz = p.z - lk.cz, l = Math.hypot(dx / lk.rx, dz / lk.rz) || 1; const k = 7 / Math.hypot(dx, dz); return { x: p.x + dx * k * l, z: p.z + dz * k * l }; });
    const g = cAt(lk.cx, lk.cz).g;
    // bari me vrimë
    const contour = [new THREE.Vector2(I.x0, I.z0), new THREE.Vector2(I.x1, I.z0), new THREE.Vector2(I.x1, I.z1), new THREE.Vector2(I.x0, I.z1)];
    const hole = prom.map(p => new THREE.Vector2(p.x, p.z));
    const all = [...contour, ...hole];
    const tris = THREE.ShapeUtils.triangulateShape(contour, [hole]);
    g.c = C.grass; g.p = 2;
    for (const t of tris) g.tri([all[t[0]].x, CURB, all[t[0]].y, all[t[1]].x, CURB, all[t[1]].y, all[t[2]].x, CURB, all[t[2]].y], undefined, [0, 1, 0]);
    // shëtitorja
    g.c = C.plaza; g.p = 3;
    for (let k = 0; k < N; k++) {
      const a = poly[k], b = poly[(k + 1) % N], c = prom[(k + 1) % N], d = prom[k];
      g.q([a.x, CURB, a.z, b.x, CURB, b.z, c.x, CURB, c.z, d.x, CURB, d.z], 0, 1, 0);
    }
    // muri i bregut + uji
    const wq = cAt(lk.cx, lk.cz).w, mm = cAt(lk.cx, lk.cz).m;
    mm.c = C.stone;
    for (let k = 0; k < N; k++) {
      const a = poly[k], b = poly[(k + 1) % N];
      const nx = lk.cx - (a.x + b.x) / 2, nz = lk.cz - (a.z + b.z) / 2, l = Math.hypot(nx, nz);
      mm.q([a.x, -1, a.z, b.x, -1, b.z, b.x, CURB, b.z, a.x, CURB, a.z], nx / l, 0, nz / l);
    }
    const yw = -0.45, us = 1 / 14;
    const c0 = wq.v(lk.cx, yw, lk.cz, 0, 1, 0, lk.cx * us, lk.cz * us);
    for (let k = 0; k < N; k++) { const p = poly[k]; wq.v(p.x, yw, p.z, 0, 1, 0, p.x * us, p.z * us); }
    for (let k = 0; k < N; k++) {
      const ia = c0 + 1 + k, ib = c0 + 1 + ((k + 1) % N);
      const ax = wq.pos[ia * 3] - lk.cx, az = wq.pos[ia * 3 + 2] - lk.cz, bx = wq.pos[ib * 3] - lk.cx, bz = wq.pos[ib * 3 + 2] - lk.cz;
      if (az * bx - ax * bz >= 0) wq.idx.push(c0, ia, ib); else wq.idx.push(c0, ib, ia);
    }
    // pengesat e ujit (feta horizontale)
    let zmin = Infinity, zmax = -Infinity;
    for (const p of poly) { zmin = Math.min(zmin, p.z); zmax = Math.max(zmax, p.z); }
    const NS = 16, dzs = (zmax - zmin) / NS;
    for (let s = 0; s < NS; s++) {
      const za = zmin + s * dzs, zb = za + dzs;
      let xa = Infinity, xb = -Infinity;
      for (const zz of [za + 0.01, (za + zb) / 2, zb - 0.01]) for (let k = 0; k < N; k++) {
        const a = poly[k], b = poly[(k + 1) % N];
        if ((a.z - zz) * (b.z - zz) > 0 || a.z === b.z) continue;
        const x = a.x + (b.x - a.x) * (zz - a.z) / (b.z - a.z);
        xa = Math.min(xa, x); xb = Math.max(xb, x);
      }
      if (xb > xa) obs(xa - 0.3, za, xb + 0.3, zb, 0.5, 'water');
    }
    // pema, llamba, stola
    for (let k = 0; k < N; k += 2) {
      const p = prom[k], q2 = poly[k], dx = p.x - q2.x, dz = p.z - q2.z, l = Math.hypot(dx, dz) || 1;
      const rot = Math.atan2(-dx, -dz);
      if (k % 6 === 0) lamp(p.x - dx / l * 0.8, p.z - dz / l * 0.8, rot);
      else if (k % 6 === 2) bench(q2.x + dx / l * 2.2, q2.z + dz / l * 2.2, rot);
      tree(p.x + dx / l * 3.5, p.z + dz / l * 3.5, k % 8 === 0 ? 'c' : 'r', rand(0.9, 1.25));
    }
    for (let k = 0; k < 90; k++) {
      const x = rand(I.x0 + 3, I.x1 - 3), z = rand(I.z0 + 3, I.z1 - 3);
      const e = ((x - lk.cx) / (lk.rx + 18)) ** 2 + ((z - lk.cz) / (lk.rz + 18)) ** 2;
      if (e < 1) continue;
      const r = R(); tree(x, z, r < 0.55 ? 'r' : r < 0.85 ? 'p' : 'c', rand(0.9, 1.35));
    }
    // skela + barka
    const pz = lk.cz - lk.rz * 0.98;
    mm.c = C.wood; mm.box(lk.cx - 1.6, -0.1, pz - 2, lk.cx + 1.6, 0.25, pz + 16, 0.3, true);
    for (let k = 0; k < 5; k++) {
      const bx = lk.cx + rand(-lk.rx * 0.6, lk.rx * 0.6), bz = lk.cz + rand(-lk.rz * 0.5, lk.rz * 0.5);
      mm.c = lin(pick([0xf2f2f2, 0xf4c430, 0xe63946, 0x3a86ff])); mm.box(bx - 1.1, yw - 0.1, bz - 0.7, bx + 1.1, yw + 0.45, bz + 0.7, 0.4, true);
      mm.c = lin(0xffffff); mm.box(bx - 0.5, yw + 0.45, bz - 0.5, bx + 0.3, yw + 1.1, bz + 0.5, 0.4);
    }
  }

  for (const reg of L.regions) {
    switch (reg.use) {
      case 'river': riverRegion(reg); break;
      case 'lake': lakeRegion(reg); break;
      case 'plaza': plaza(reg); break;
      case 'clock': clockBlock(reg); break;
      case 'palace': palace(reg); break;
      case 'pyramid': pyramid(reg); break;
      case 'towers': towers(reg); break;
      case 'park': { const I = platform(reg.x0, reg.z0, reg.x1, reg.z1, reg.road); park(I); if (reg.cj === L.jMid && reg.ci === L.iBlv - 1) landmarks.park = ctr(I); break; }
      case 'outer': { const I = platform(reg.x0, reg.z0, reg.x1, reg.z1, reg.road); outer(reg, I); break; }
      default: { const I = platform(reg.x0, reg.z0, reg.x1, reg.z1, reg.road); blockContent(reg, I); }
    }
  }

  // ===========================================================================================
  // E. Lumi: uji, muret, urat
  // ===========================================================================================
  {
    const rv = L.river, us = 1 / 14;
    for (let x = -100; x < SIZE + 100; x += 100) {
      const c = cAt(x + 50, rv.zc);
      c.w.q([x, -1.0, rv.z0, x + 100, -1.0, rv.z0, x + 100, -1.0, rv.z1, x, -1.0, rv.z1], 0, 1, 0, [x * us, rv.z0 * us, (x + 100) * us, rv.z0 * us, (x + 100) * us, rv.z1 * us, x * us, rv.z1 * us]);
      const b = c.b; b.t = A.c.stone; b.c = lin(0xd8cdb8); b.w1 = 0;
      b.wall(x, rv.z0, x + 100, rv.z0, -1.6, CURB, x / 3, (x + 100) / 3, -0.6, 0.6, 0.6, 1);
      b.wall(x + 100, rv.z1, x, rv.z1, -1.6, CURB, x / 3, (x + 100) / 3, -0.6, 0.6, 0.6, 1);
    }
    const decks: [number, number][] = [];
    for (const e of L.edges) {
      if (e.kind !== 'bridge') continue;
      const line = L.edgeLine[e.id], x = line.pos, hw = line.hw, ow = hw + SW;
      decks.push([x - ow, x + ow]);
      const c = cAt(x, rv.zc), g = c.g, m = c.m, b = c.b;
      const z0 = rv.z0 - 0.2, z1 = rv.z1 + 0.2;
      g.c = C.asphalt; g.p = 0; g.flat(x - hw, z0, x + hw, z1, 0);
      for (const sg of [-1, 1]) {
        const a = x + sg * hw, o = x + sg * ow;
        g.c = C.sidewalk; g.p = 1; g.flat(Math.min(a, o), z0, Math.max(a, o), z1, CURB);
        g.c = C.curb; g.p = 4; g.wall(a, sg > 0 ? z0 : z1, a, sg > 0 ? z1 : z0, 0, CURB);
        b.t = A.c.stone; b.c = lin(0xcfc3ad); b.w1 = 0;
        b.wall(o, sg > 0 ? z1 : z0, o, sg > 0 ? z0 : z1, -1.4, CURB, 0, (z1 - z0) / 3, -0.5, 0.6, 0.7, 1);
        m.c = lin(0xe6dfd0);
        const r0 = sg > 0 ? o - 0.35 : o, r1 = sg > 0 ? o : o + 0.35;
        m.box(r0, CURB, z0 - 1, r1, CURB + 1.0, z1 + 1, 0.3);
        m.box(r0 - 0.1, CURB + 1.0, z0 - 1, r1 + 0.1, CURB + 1.12, z1 + 1, 0.3);
        for (const pz of [z0 - 1, z1 + 0.4]) m.box(r0 - 0.15, CURB, pz, r1 + 0.15, CURB + 1.4, pz + 0.6, 0.3);
        obs(r0, z0 - 1, r1, z1 + 1, 1.1, 'wall');
        lamp(sg > 0 ? r0 - 0.1 : r1 + 0.1, rv.zc, sg > 0 ? -Math.PI / 2 : Math.PI / 2, CURB);
      }
      m.c = lin(0x8f8778); m.q([x - ow, -1.4, z0, x + ow, -1.4, z0, x + ow, -1.4, z1, x - ow, -1.4, z1], 0, -1, 0);
      if (Math.abs(x - 600) < 1 || !landmarks.bridge) landmarks.bridge = { x, z: rv.zc };
    }
    decks.sort((a, b) => a[0] - b[0]);
    let px = -100;
    for (const [d0, d1] of decks) { if (d0 > px) obs(px, rv.z0, d0, rv.z1, 0.5, 'water'); px = d1; }
    obs(px, rv.z0, SIZE + 100, rv.z1, 0.5, 'water');
  }

  // ===========================================================================================
  // F. Rrugët: shenjat, mesorja, ndriçimi, pemët, tabelat, stacionet
  // ===========================================================================================
  const jHalf = (nodeId: number, axis: Axis) => {
    let w = 0;
    for (const id of L.nodes[nodeId].edges) if (L.edges[id].axis !== axis) w = Math.max(w, L.edgeLine[id].hw);
    return w;
  };
  const zebraAt = L.nodes.map(n => n.signalized || (n.edges.length >= 3 && R() < 0.3));
  for (const e of L.edges) {
    const line = L.edgeLine[e.id], hw = line.hw, pc = line.pos, ax = e.axis;
    const A0 = L.nodes[e.a], B0 = L.nodes[e.b];
    const sA = (ax === 'x' ? A0.x : A0.z) + jHalf(e.a, ax), sB = (ax === 'x' ? B0.x : B0.z) - jHalf(e.b, ax);
    if (sB - sA < 2) continue;
    const W = (s: number, o: number): [number, number] => ax === 'x' ? [s, pc + o] : [pc + o, s];
    const mark = (s0: number, s1: number, o0: number, o1: number, col: RGB = C.mark) => {
      const [x0, z0] = W(s0, o0), [x1, z1] = W(s1, o1);
      const g = cAt((x0 + x1) / 2, (z0 + z1) / 2).g; g.c = col; g.p = 5;
      g.flat(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), 0.025);
    };
    const zA = zebraAt[e.a], zB = zebraAt[e.b];
    const m0 = sA + (zA ? 5 : 0.5), m1 = sB - (zB ? 5 : 0.5);
    // zebrat + vijat e ndalimit
    for (const [end, s0, dirS, sideSign] of [[zA, sA, 1, ax === 'x' ? -1 : 1], [zB, sB, -1, ax === 'x' ? 1 : -1]] as [boolean, number, number, number][]) {
      if (!end) continue;
      for (let o = -hw + 0.45; o + 0.5 <= hw - 0.3; o += 1.0) mark(s0 + dirS * 0.7, s0 + dirS * 3.7, o, o + 0.5);
      const stopOn = (dirS === 1 ? zA : zB) && L.nodes[dirS === 1 ? e.a : e.b].signalized;
      if (stopOn) mark(s0 + dirS * 4.3, s0 + dirS * 4.7, sideSign > 0 ? (line.kind === 'blv' ? 0.6 : 0.1) : -hw + 0.2, sideSign > 0 ? hw - 0.2 : (line.kind === 'blv' ? -0.6 : -0.1));
    }
    const dashed = (o: number, w: number, dash: number, gap: number) => { for (let s = m0 + 1; s + dash < m1; s += dash + gap) mark(s, s + dash, o - w / 2, o + w / 2); };
    if (line.kind === 'blv') {
      const a = sA + 7, b = sB - 7;
      if (b - a > 4) {
        const [x0, z0] = W(a, -0.6), [x1, z1] = W(b, 0.6);
        const g = cAt((x0 + x1) / 2, (z0 + z1) / 2).g;
        g.c = C.curb; g.p = 4; g.box(Math.min(x0, x1), 0, Math.min(z0, z1), Math.max(x0, x1), 0.2, Math.max(z0, z1), 1, false, false);
        g.c = C.grass; g.p = 2; g.flat(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), 0.2);
        if (e.kind !== 'bridge') for (let s = a + 4; s < b - 3; s += 10) { const [tx, tz] = W(s, 0); tree(tx, tz, 'c', rand(0.8, 1.0), 0.2); }
      }
      for (const sg of [-1, 1]) { dashed(sg * line.lw, 0.12, 3, 6); mark(m0, m1, sg * (hw - 0.3) - 0.075, sg * (hw - 0.3) + 0.075); }
    } else if (line.lanes === 2) {
      mark(m0, m1, -0.22, -0.1); mark(m0, m1, 0.1, 0.22);
      for (const sg of [-1, 1]) { dashed(sg * line.lw, 0.12, 3, 6); mark(m0, m1, sg * (hw - 0.3) - 0.075, sg * (hw - 0.3) + 0.075); }
    } else {
      dashed(0, 0.12, 3, 4.5);
    }
    // objektet anësore
    const bridge = e.kind === 'bridge';
    const big = line.kind !== 'street';
    const dist = L.districts.find(d => { const [mx, mz] = W((sA + sB) / 2, 0); return mx >= d.minX && mx < d.maxX && mz >= d.minZ && mz < d.maxZ; })?.id ?? 'qendra';
    const rotTo = (sg: number) => ax === 'x' ? (sg > 0 ? Math.PI : 0) : (sg > 0 ? -Math.PI / 2 : Math.PI / 2);
    const busS = big && !bridge && e.length > 90 && R() < 0.4 ? (sA + sB) / 2 + rand(-10, 10) : NaN, busSide = R() < 0.5 ? 1 : -1;
    const cafes = dist === 'blloku' && !bridge && R() < 0.55;
    const treeP = bridge ? 0 : dist === 'industria' ? 0.2 : big ? 0.85 : 0.7;
    const hasTrees = R() < treeP;
    for (const sg of [-1, 1]) {
      const lampStep = big ? 30 : 40;
      if (!bridge && (big || (sg > 0) === ((e.id & 1) === 0))) {
        for (let s = sA + 9 + (sg > 0 ? lampStep / 2 : 0); s < sB - 6; s += lampStep) { const [x, z] = W(s, sg * (hw + 0.55)); lamp(x, z, rotTo(sg)); }
      }
      if (!Number.isNaN(busS) && sg === busSide) {
        const [x, z] = W(busS, sg * (hw + 2.0));
        if (Q >= 1) P.bus.push({ x, z, rot: rotTo(sg), s: 1 });
        const ex = ax === 'x' ? 2.4 : 1.1, ez = ax === 'x' ? 1.1 : 2.4;
        obs(x - ex, z - ez, x + ex, z + ez, 2.7, 'prop');
      }
      if (cafes && sg === (e.id % 3 === 0 ? 1 : -1)) {
        for (let s = sA + 12; s < sB - 10; s += rand(14, 30)) {
          const n = 2 + ((R() * 2) | 0), col = lin(pick(PAL));
          for (let k = 0; k < n; k++) {
            const [x, z] = W(s + k * 3.4, sg * (hw + 1.9));
            if (Q >= 1) P.umb.push({ x, z, rot: R() * 6.28, s: 1, col });
            obs(x - 0.25, z - 0.25, x + 0.25, z + 0.25, 2.4, 'prop');
          }
          s += n * 3.4;
        }
        continue;
      }
      if (hasTrees) {
        for (let s = sA + 7 + rand(0, 3); s < sB - 5; s += rand(10, 14)) {
          if (!Number.isNaN(busS) && sg === busSide && Math.abs(s - busS) < 6) continue;
          const [x, z] = W(s, sg * (hw + 2.0));
          tree(x, z, dist === 'liqeni' && R() < 0.3 ? 'c' : 'r', rand(0.62, 0.82));
        }
      }
    }
    // tabelat e shpejtësisë
    if (big && !bridge && e.length > 70) {
      for (const dir of [1, -1] as const) {
        const s = dir === 1 ? sA + 12 : sB - 12, sg = ax === 'x' ? dir : -dir;
        const [x, z] = W(s, sg * (hw + 0.45));
        const it = { x, z, rot: travelHeading(e, dir) + Math.PI, s: 1 };
        (e.kind === 'ring' ? P.s80 : P.s60).push(it);
        obs(x - 0.1, z - 0.1, x + 0.1, z + 0.1, 2.7, 'prop');
      }
    }
  }

  // ===========================================================================================
  // G. Semaforët
  // ===========================================================================================
  const heads: SignalHead[] = [];
  const bulbMats: THREE.Matrix4[] = [];
  const bm = new THREE.Matrix4(), bq = new THREE.Quaternion(), bs = new THREE.Vector3(1, 1, 1), bp = new THREE.Vector3(), yAx = new THREE.Vector3(0, 1, 0);
  for (const n of L.nodes) {
    if (!n.signalized) continue;
    for (const id of n.edges) {
      const e = L.edges[id], line = L.edgeLine[id];
      const dir = e.b === n.id ? 1 : -1;
      const h = travelHeading(e, dir as 1 | -1), fx = Math.sin(h), fz = Math.cos(h), rx = -Math.cos(h), rz = Math.sin(h);
      const jh = jHalf(n.id, e.axis);
      const px = n.x - fx * (jh + 5.2) + rx * (line.hw + 0.7), pz = n.z - fz * (jh + 5.2) + rz * (line.hw + 0.7);
      const rot = h + Math.PI, arm = line.lanes === 2;
      (arm ? P.tlArm : P.tlPole).push({ x: px, z: pz, rot, s: 1 });
      obs(px - 0.15, pz - 0.15, px + 0.15, pz + 0.15, 4, 'prop');
      const c = Math.cos(rot), s = Math.sin(rot);
      const local: [number, number][] = arm ? [[-4.2, 5.47], [0, 3.02]] : [[0, 3.02]];
      const first = bulbMats.length;
      for (const [lx, ly] of local) for (const dy of [0.31, 0, -0.31]) {
        const lz = 0.17;
        bp.set(px + lx * c + lz * s, CURB + ly + dy, pz - lx * s + lz * c);
        bq.setFromAxisAngle(yAx, rot);
        bulbMats.push(new THREE.Matrix4().compose(bp, bq, bs));
      }
      heads.push({ node: n.id, axis: e.axis, bulb: first, n: bulbMats.length - first });
    }
  }
  let bulbs: THREE.InstancedMesh | null = null;
  if (bulbMats.length) {
    bulbs = new THREE.InstancedMesh(bulbGeo(), M.bulb, bulbMats.length);
    bulbMats.forEach((mm, i) => { bulbs!.setMatrixAt(i, mm); bulbs!.setColorAt(i, new THREE.Color(0.1, 0.1, 0.1)); });
    bulbs.matrixAutoUpdate = false; bulbs.name = 'bulbs';
    bulbs.computeBoundingSphere();
    root.add(bulbs);
  }
  void bm;

  // ===========================================================================================
  // H. Muri kufitar + periferia
  // ===========================================================================================
  {
    const t = 3;
    obs(-t, -t, SIZE + t, 0, 4, 'wall'); obs(-t, SIZE, SIZE + t, SIZE + t, 4, 'wall');
    obs(-t, 0, 0, SIZE, 4, 'wall'); obs(SIZE, 0, SIZE + t, SIZE, 4, 'wall');
    for (let k = 0; k < SIZE; k += 100) {
      for (const [x0, z0, x1, z1] of [[k, 0.2, k + 100, 0.6], [k, SIZE - 0.6, k + 100, SIZE - 0.2], [0.2, k, 0.6, k + 100], [SIZE - 0.6, k, SIZE - 0.2, k + 100]]) {
        if (z0 > L.river.z0 - 1 && z1 < L.river.z1 + 1) continue;
        const m = cAt((x0 + x1) / 2, (z0 + z1) / 2).m; m.c = lin(0xbdb5a6);
        m.box(x0, CURB, z0, x1, CURB + 1.6, z1, 0.3);
      }
    }
    const subSt = [() => st('pallat', pick(T.grey), { fh: 2.9 }), () => st('plaster', pick(T.pastel)), () => st('pallat2', pick(T.pastel), { fh: 2.9 }), () => st((R() * 8) | 0, 0xffffff, { fh: 2.9 })];
    for (let side = 0; side < 4; side++) {
      for (let a = -60; a < SIZE + 60;) {
        const len = rand(22, 46), dep = rand(12, 16), off = rand(14, 30);
        const a1 = a + len;
        let bb: Bld;
        if (side === 0) bb = { x0: a, x1: a1, z0: -off - dep, z1: -off, floors: 0, st: pick(subSt)(), street: 0 };
        else if (side === 1) bb = { x0: a, x1: a1, z0: SIZE + off, z1: SIZE + off + dep, floors: 0, st: pick(subSt)(), street: 0 };
        else if (side === 2) bb = { x0: -off - dep, x1: -off, z0: a, z1: a1, floors: 0, st: pick(subSt)(), street: 0 };
        else bb = { x0: SIZE + off, x1: SIZE + off + dep, z0: a, z1: a1, floors: 0, st: pick(subSt)(), street: 0 };
        const rv = L.river;
        if ((side === 2 || side === 3) && a1 > rv.z0 - 8 && a < rv.z1 + 8) { a = rv.z1 + 10; continue; }
        bb.floors = 4 + ((R() * 6) | 0);
        building(bb);
        obstacles.pop();
        a = a1 + rand(4, 16);
      }
    }
  }

  // ===========================================================================================
  // I. Rrjetat statike
  // ===========================================================================================
  let staticTris = 0, staticMeshes = 0;
  const chunkMisc: { mesh: THREE.Object3D; x: number; z: number }[] = [];
  chunks.forEach((c, k) => {
    const cx = (k % NC) * CH + CH / 2, cz = Math.floor(k / NC) * CH + CH / 2;
    const parts: [Geo, THREE.Material, boolean, boolean][] = [[c.g, M.ground, false, true], [c.b, M.bld, true, true], [c.m, M.misc, true, true], [c.w, M.water, false, false]];
    for (const [geo, mat, cast, recv] of parts) {
      const bg = geo.build(); if (!bg) continue;
      const mesh = new THREE.Mesh(bg, mat);
      mesh.castShadow = cast; mesh.receiveShadow = recv; mesh.matrixAutoUpdate = false;
      mesh.name = `chunk${k}`;
      root.add(mesh);
      staticTris += geo.tris; staticMeshes++;
      if (geo === c.m) chunkMisc.push({ mesh, x: cx, z: cz });
    }
  });

  // Props.
  const props: PropSet[] = [];
  const rad = Q === 0 ? 140 : Q === 1 ? 190 : 250;
  const mk = (name: string, items: Inst[], parts: PropPart[], radius = rad) => {
    if (!items.length) return null;
    const s = new PropSet(name, items, parts, radius);
    props.push(s); s.meshes.forEach(m => root.add(m));
    return s;
  };
  const thin = <T,>(a: T[], keep: number) => a.filter(() => R() < keep);
  if (Q === 0) { P.treeR = thin(P.treeR, 0.6); P.treeP = thin(P.treeP, 0.6); P.treeC = thin(P.treeC, 0.6); }
  mk('treeR', P.treeR, [{ geo: treeRoundGeo(), mat: M.plant, cast: true }]);
  mk('treeC', P.treeC, [{ geo: treeCypressGeo(), mat: M.plant, cast: true }]);
  mk('treeP', P.treeP, [{ geo: treePineGeo(), mat: M.plant, cast: true }]);
  if (Q >= 1) {
    mk('bush', P.bush, [{ geo: bushGeo(), mat: M.plant }], rad * 0.7);
    mk('blob', P.blob, [{ geo: blobGeo(), mat: M.blob }], rad * 0.8);
    mk('bench', P.bench, [{ geo: benchGeo(), mat: M.misc }], rad * 0.6);
    mk('bus', P.bus, [{ geo: busStopGeo(), mat: M.misc }], rad * 0.8);
    mk('kiosk', P.kiosk, [{ geo: kioskGeo(), mat: M.misc }], rad * 0.8);
    mk('umb', P.umb, [{ geo: umbrellaGeo(), mat: M.misc }], rad * 0.6);
  }
  const lamps = mk('lamp', P.lamp, [{ geo: lampGeo(), mat: M.misc }, { geo: lampHeadGeo(), mat: M.lampHead }, { geo: poolGeo(), mat: M.pool, nightOnly: true }], Math.max(rad, 220));
  mk('s60', P.s60, [{ geo: signGeo(0), mat: M.sign }], rad * 0.7);
  mk('s80', P.s80, [{ geo: signGeo(1), mat: M.sign }], rad * 0.7);
  mk('tlPole', P.tlPole, [{ geo: tlPoleGeo(), mat: M.misc }], 320);
  mk('tlArm', P.tlArm, [{ geo: tlArmGeo(), mat: M.misc }], 320);

  const propInstances = props.reduce((a, s) => a + (s as any).px.length, 0);
  return { root, obstacles, props, lamps, heads, bulbs, chunkMisc, landmarks, stats: { buildings: nBld, staticTris, staticMeshes, propInstances } };
}

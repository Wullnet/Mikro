/**
 * Plani i qytetit: vijat e rrugëve (rrjetë), nyjet, brinjët, lagjet, lumi Lana, liqeni dhe zonat (blloqet).
 * E pastër (pa Three.js) — përdoret nga ndërtuesi grafik dhe nga CityWorld.
 */
import type { Axis, District, DistrictId, RoadEdge, RoadKind, RoadNode, Vec2 } from '../core/contracts';
import { rng } from '../core/math';

export const SIZE = 1200;
export const SW = 3;          // trotuari
export const CURB = 0.15;     // lartësia e bordurës

export type LineKind = 'border' | 'blv' | 'ring' | 'avenue' | 'street';
export interface Line { pos: number; kind: LineKind; lanes: number; lw: number; hw: number }
export type Use = 'outer' | 'river' | 'lake' | 'plaza' | 'clock' | 'palace' | 'pyramid' | 'towers' | 'park' | 'block';

export interface Region {
  ci: number; cj: number; ci1: number; cj1: number;     // qelizat [ci, ci1) × [cj, cj1)
  x0: number; x1: number; z0: number; z1: number;       // kufijtë e platformës (pas asfaltit)
  road: [boolean, boolean, boolean, boolean];            // rrugë në V(N), L(E), J(S), P(W)
  use: Use; district: DistrictId; seed: number;
}

export interface Layout {
  seed: number;
  xs: Line[]; zs: Line[];
  vSeg: boolean[][]; hSeg: boolean[][];
  nodeAt: number[][];
  nodes: RoadNode[]; edges: RoadEdge[]; edgeLine: Line[];
  regions: Region[]; districts: District[];
  ring: { x0: number; x1: number; z0: number; z1: number };
  iBlv: number; jMid: number; jRiver: number;
  river: { z0: number; z1: number; zc: number };
  lake: { x0: number; x1: number; z0: number; z1: number; cx: number; cz: number; rx: number; rz: number; poly: Vec2[] };
}

const mk = (pos: number, kind: LineKind): Line => {
  const lanes = kind === 'border' ? 0 : kind === 'street' ? 1 : 2;
  const lw = kind === 'blv' ? 3.6 : 3.2;
  return { pos, kind, lanes, lw, hw: lanes * lw };
};

/** Vijat e brendshme midis dy ankorave, me hapësirë 80–140 m. */
function fill(a: number, b: number, r: () => number): number[] {
  const gap = b - a;
  let n = Math.max(1, Math.round(gap / (100 + r() * 25)));
  while (gap / n > 140) n++;
  while (n > 1 && gap / n < 80) n--;
  const sp = gap / n, j = Math.max(0, Math.min(16, 2 * (sp - 80), 2 * (140 - sp)));
  const out: number[] = [];
  for (let k = 1; k < n; k++) out.push(Math.round(a + sp * k + (r() - 0.5) * j));
  return out;
}

function genLines(anchors: [number, LineKind][], r: () => number): Line[] {
  const out: Line[] = [mk(0, 'border')];
  for (let k = 0; k < anchors.length; k++) {
    out.push(mk(anchors[k][0], anchors[k][1]));
    if (k + 1 < anchors.length) for (const p of fill(anchors[k][0], anchors[k + 1][0], r)) out.push(mk(p, 'street'));
  }
  out.push(mk(SIZE, 'border'));
  return out;
}

const nearestIdx = (ls: Line[], p: number) => {
  let bi = 1, bd = Infinity;
  for (let i = 1; i < ls.length - 1; i++) { const d = Math.abs(ls[i].pos - p); if (d < bd) { bd = d; bi = i; } }
  return bi;
};

export function generateLayout(seed: number): Layout {
  const r = rng(seed);
  const xs = genLines([[30, 'street'], [350, 'ring'], [600, 'blv'], [850, 'ring'], [1170, 'street']], r);
  const zs = genLines([[30, 'street'], [350, 'ring'], [600, 'avenue'], [680, 'street'], [770, 'street'], [850, 'ring'], [1170, 'street']], r);
  // Disa rrugë bëhen avenida.
  for (const p of [140, 1060]) { const i = nearestIdx(xs, p); if (xs[i].kind === 'street') xs[i] = mk(xs[i].pos, 'avenue'); }
  { const j = nearestIdx(zs, 240); if (zs[j].kind === 'street') zs[j] = mk(zs[j].pos, 'avenue'); }

  const nx = xs.length, nz = zs.length;
  const iBlv = xs.findIndex(l => l.kind === 'blv');
  const iRingW = xs.findIndex(l => l.pos === 350), iRingE = xs.findIndex(l => l.pos === 850);
  const jRingN = zs.findIndex(l => l.pos === 350), jRingS = zs.findIndex(l => l.pos === 850);
  const jMid = zs.findIndex(l => l.pos === 600), jRiver = zs.findIndex(l => l.pos === 680);
  const ring = { x0: 350, x1: 850, z0: 350, z1: 850 };

  // Liqeni: qelizat nga vija para Bulevardit deri pas Unazës lindore, në jug të Unazës.
  const iL0 = iBlv - 1, iL1 = iRingE + 1, jL0 = jRingS + 1, jL1 = nz - 2;
  const lakeCell = (ci: number, cj: number) => ci >= iL0 && ci < iL1 && cj >= jL0 && cj < jL1;
  const real = (l: Line) => l.kind !== 'border';

  const vSeg: boolean[][] = [], hSeg: boolean[][] = [];
  for (let i = 0; i < nx; i++) {
    vSeg.push([]);
    for (let j = 0; j < nz - 1; j++) {
      let ok = real(xs[i]) && real(zs[j]) && real(zs[j + 1]) && !(lakeCell(i - 1, j) && lakeCell(i, j));
      if (ok && j === jRiver && xs[i].kind === 'street' && r() < 0.45) ok = false; // jo çdo rrugë ka urë
      vSeg[i].push(ok);
    }
  }
  for (let j = 0; j < nz; j++) {
    hSeg.push([]);
    for (let i = 0; i < nx - 1; i++) hSeg[j].push(real(zs[j]) && real(xs[i]) && real(xs[i + 1]) && !(lakeCell(i, j - 1) && lakeCell(i, j)));
  }

  // Nyjet.
  const nodes: RoadNode[] = [];
  const nodeAt: number[][] = xs.map(() => zs.map(() => -1));
  for (let i = 1; i < nx - 1; i++) for (let j = 1; j < nz - 1; j++) {
    const has = vSeg[i][j - 1] || vSeg[i][j] || hSeg[j][i - 1] || hSeg[j][i];
    if (!has) continue;
    nodeAt[i][j] = nodes.length;
    nodes.push({ id: nodes.length, x: xs[i].pos, z: zs[j].pos, edges: [], signalized: false });
  }

  // Brinjët.
  const edges: RoadEdge[] = [], edgeLine: Line[] = [];
  const addEdge = (axis: Axis, line: Line, a: number, b: number, c0: number, c1: number, bridge: boolean) => {
    let kind: RoadKind = line.kind === 'street' ? 'street' : 'avenue';
    let speed = line.kind === 'street' ? 13.9 : 16.7;
    if (line.kind === 'ring' && c0 >= 349 && c1 <= 851) { kind = 'ring'; speed = 22; }
    if (bridge) kind = 'bridge';
    const A = nodes[a], B = nodes[b];
    const e: RoadEdge = {
      id: edges.length, a, b, axis, lanes: line.lanes, laneWidth: line.lw, sidewalk: SW, speedLimit: speed, kind,
      length: Math.abs(axis === 'x' ? B.x - A.x : B.z - A.z),
    };
    edges.push(e); edgeLine.push(line);
    A.edges.push(e.id); B.edges.push(e.id);
  };
  for (let i = 1; i < nx - 1; i++) for (let j = 1; j < nz - 2; j++)
    if (vSeg[i][j]) addEdge('z', xs[i], nodeAt[i][j], nodeAt[i][j + 1], zs[j].pos, zs[j + 1].pos, j === jRiver);
  for (let j = 1; j < nz - 1; j++) for (let i = 1; i < nx - 2; i++)
    if (hSeg[j][i]) addEdge('x', zs[j], nodeAt[i][j], nodeAt[i + 1][j], xs[i].pos, xs[i + 1].pos, false);

  // Semaforët: kryqëzime (≥3 brinjë) ku takohet një avenidë/unazë.
  for (const n of nodes) {
    if (n.edges.length < 3) continue;
    n.signalized = n.edges.some(id => edgeLine[id].kind !== 'street');
  }

  // Lagjet (rrota rreth qendrës).
  const S = SIZE;
  const districts: District[] = [
    { id: 'qendra', name: 'Qendra', unlockLevel: 1, minX: ring.x0, maxX: ring.x1, minZ: ring.z0, maxZ: ring.z1, color: 0xe2483d },
    { id: 'lagjja', name: 'Lagjja', unlockLevel: 1, minX: 0, maxX: ring.x1, minZ: 0, maxZ: ring.z0, color: 0x6fbf4a },
    { id: 'blloku', name: 'Blloku', unlockLevel: 2, minX: 0, maxX: ring.x0, minZ: ring.z0, maxZ: S, color: 0xc95fd8 },
    { id: 'liqeni', name: 'Liqeni', unlockLevel: 3, minX: ring.x0, maxX: S, minZ: ring.z1, maxZ: S, color: 0x3aa6dd },
    { id: 'industria', name: 'Industria', unlockLevel: 4, minX: ring.x1, maxX: S, minZ: 0, maxZ: ring.z1, color: 0xa88a5c },
  ];
  const districtOf = (x: number, z: number): DistrictId => {
    for (const d of districts) if (x >= d.minX && x < d.maxX && z >= d.minZ && z < d.maxZ) return d.id;
    return 'qendra';
  };

  // Zonat.
  const regions: Region[] = [];
  const mkRegion = (ci: number, cj: number, ci1: number, cj1: number, use: Use) => {
    const rn = cj > 0 && hSeg[cj][ci] === true && real(zs[cj]);
    const rs = hSeg[cj1][ci1 - 1] === true;
    const rw = vSeg[ci][cj] === true;
    const re = vSeg[ci1][cj1 - 1] === true;
    const reg: Region = {
      ci, cj, ci1, cj1,
      x0: xs[ci].pos + (rw ? xs[ci].hw : 0), x1: xs[ci1].pos - (re ? xs[ci1].hw : 0),
      z0: zs[cj].pos + (rn ? zs[cj].hw : 0), z1: zs[cj1].pos - (rs ? zs[cj1].hw : 0),
      road: [rn, re, rs, rw], use, district: 'qendra', seed: (r() * 1e9) | 0,
    };
    reg.district = districtOf((reg.x0 + reg.x1) / 2, (reg.z0 + reg.z1) / 2);
    regions.push(reg);
    return reg;
  };
  for (let ci = 0; ci < nx - 1; ci++) for (let cj = 0; cj < nz - 1; cj++) {
    if (lakeCell(ci, cj)) continue;
    const outer = !real(xs[ci]) || !real(xs[ci + 1]) || !real(zs[cj]) || !real(zs[cj + 1]);
    let use: Use = outer ? 'outer' : 'block';
    if (cj === jRiver) use = 'river';
    else if (!outer) {
      if (ci === iBlv && cj === jMid - 1) use = 'plaza';
      else if (ci === iBlv + 1 && cj === jMid - 1) use = 'clock';
      else if (ci === iBlv && cj === jMid - 2) use = 'palace';
      else if (ci === iBlv - 1 && cj === jMid - 1) use = 'towers';
      else if (ci === iBlv && cj === jMid) use = 'pyramid';
      else if (ci === iBlv - 1 && cj === jMid) use = 'park';
    }
    const reg = mkRegion(ci, cj, ci + 1, cj + 1, use);
    if (reg.use === 'block' && reg.district !== 'qendra' && reg.district !== 'industria' && r() < 0.08) reg.use = 'park';
  }
  const lakeReg = mkRegion(iL0, jL0, iL1, jL1, 'lake');
  lakeReg.district = 'liqeni';

  // Lumi Lana.
  const zc = (zs[jRiver].pos + zs[jRiver + 1].pos) / 2;
  const river = { z0: zc - 11, z1: zc + 11, zc };

  // Liqeni: elips me valëzim.
  const lx0 = lakeReg.x0 + SW, lx1 = lakeReg.x1 - SW, lz0 = lakeReg.z0 + SW, lz1 = lakeReg.z1 - SW;
  const cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2, rx = (lx1 - lx0) / 2 - 30, rz = (lz1 - lz0) / 2 - 26;
  const poly: Vec2[] = [];
  const ph = r() * 6;
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2;
    const w = 1 + 0.05 * Math.sin(3 * a + ph) + 0.035 * Math.sin(5 * a + ph * 2) - 0.06 * Math.max(0, Math.cos(a - 0.6)) ** 6;
    poly.push({ x: cx + Math.cos(a) * rx * w, z: cz + Math.sin(a) * rz * w });
  }
  const lake = { x0: lakeReg.x0, x1: lakeReg.x1, z0: lakeReg.z0, z1: lakeReg.z1, cx, cz, rx, rz, poly };

  return { seed, xs, zs, vSeg, hSeg, nodeAt, nodes, edges, edgeLine, regions, districts, ring, iBlv, jMid, jRiver, river, lake };
}

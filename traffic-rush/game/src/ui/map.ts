/** Minimap-i dhe harta e madhe (canvas 2D). Shtresa statike ruhet; rrugët vizatohen si Path2D. */
import type { CityWorld, District, MapState, Marker, Obstacle, PropertyDef, Vec2 } from '../core/contracts';
import { mix, hex } from './util';

export const FD = '"Saira Extra Condensed","Arial Narrow",sans-serif';
const TAU = Math.PI * 2;

interface RoadGroup { path: Path2D; color: string; w: number }

/** Shtresat e qytetit (rindërtohen kur ndryshon qyteti ose niveli). */
export class MapLayers {
  city: CityWorld | null = null;
  level = -1;
  base: HTMLCanvasElement | null = null;
  roads: RoadGroup[] = [];

  ensure(city: CityWorld, level: number): void {
    if (city !== this.city || level !== this.level) this.build(city, level);
  }

  private build(city: CityWorld, level: number): void {
    this.city = city; this.level = level;
    const S = city.size, n = Math.min(1024, Math.ceil(S)), k = n / S;
    const cv = this.base ?? document.createElement('canvas');
    cv.width = cv.height = n;
    const c = cv.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#10151b'; c.fillRect(0, 0, n, n);
    c.setTransform(k, 0, 0, k, 0, 0);
    for (const d of city.districts) {
      const locked = d.unlockLevel > level;
      c.fillStyle = locked ? 'rgba(120,124,132,.07)' : hexA(d.color, 0.11);
      c.fillRect(d.minX, d.minZ, d.maxX - d.minX, d.maxZ - d.minZ);
      if (locked) { // vija të pjerrëta
        c.save(); c.beginPath(); c.rect(d.minX, d.minZ, d.maxX - d.minX, d.maxZ - d.minZ); c.clip();
        c.strokeStyle = 'rgba(255,255,255,.035)'; c.lineWidth = 6;
        for (let s = d.minX - (d.maxZ - d.minZ); s < d.maxX; s += 26) { c.beginPath(); c.moveTo(s, d.maxZ); c.lineTo(s + (d.maxZ - d.minZ), d.minZ); c.stroke(); }
        c.restore();
      }
    }
    // Pengesat: ujë, ndërtesa, pemë.
    const obs: Obstacle[] = [];
    let cnt = 0;
    try { cnt = city.queryObstacles(0, 0, S, S, obs); } catch { cnt = 0; }
    cnt = Math.min(cnt, obs.length);
    const groups: Record<string, string> = { water: '#18435e', building: 'rgba(255,255,255,.07)', tree: 'rgba(80,160,90,.22)' };
    for (const kind of ['water', 'tree', 'building']) {
      c.fillStyle = groups[kind];
      c.beginPath();
      for (let i = 0; i < cnt; i++) { const o = obs[i]; if (o && o.kind === kind) c.rect(o.minX, o.minZ, o.maxX - o.minX, o.maxZ - o.minZ); }
      c.fill();
    }
    this.base = cv;

    // Rrugët, të grupuara sipas ngjyrës dhe gjerësisë.
    const map = new Map<string, RoadGroup>();
    for (const e of city.edges) {
      const A = city.nodes[e.a], B = city.nodes[e.b];
      if (!A || !B) continue;
      const d = city.districtAt((A.x + B.x) / 2, (A.z + B.z) / 2);
      const locked = d.unlockLevel > level;
      const major = e.kind !== 'street';
      const col = locked ? (major ? 0x666b73 : 0x50555c) : mix(major ? 0xeef1f4 : 0xaab3bd, d.color, major ? 0.22 : 0.3);
      const w = Math.max(6, e.lanes * 2 * e.laneWidth);
      const key = col + '|' + w;
      let g = map.get(key);
      if (!g) map.set(key, (g = { path: new Path2D(), color: hex(col), w }));
      g.path.moveTo(A.x, A.z); g.path.lineTo(B.x, B.z);
    }
    this.roads = [...map.values()].sort((a, b) => a.w - b.w);
  }

  /** Vizaton bazën + rrugët me transformimin aktual (njësi = metra). */
  drawWorld(c: CanvasRenderingContext2D, pxPerM: number, minPx: number): void {
    const S = this.city!.size;
    c.imageSmoothingEnabled = true;
    c.drawImage(this.base!, 0, 0, this.base!.width, this.base!.height, 0, 0, S, S);
    c.lineCap = 'round';
    for (const g of this.roads) {
      c.strokeStyle = g.color;
      c.lineWidth = Math.max(g.w, minPx / pxPerM);
      c.stroke(g.path);
    }
  }
}

export function hexA(c: number, a: number): string {
  return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
}

function strokeRoute(c: CanvasRenderingContext2D, route: readonly Vec2[], k: number, px: number): void {
  if (route.length < 2) return;
  c.beginPath();
  c.moveTo(route[0].x, route[0].z);
  for (let i = 1; i < route.length; i++) c.lineTo(route[i].x, route[i].z);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = 'rgba(40,14,4,.75)'; c.lineWidth = (px + 3) / k; c.stroke();
  c.strokeStyle = '#ff5a2e'; c.lineWidth = px / k; c.stroke();
}

const MK: Record<string, { c: string; t?: string }> = {
  mission: { c: '#ff5a2e', t: '!' }, pickup: { c: '#2fbf71' }, dropoff: { c: '#2fbf71' }, checkpoint: { c: '#ffc933' },
  finish: { c: '#ffffff' }, parking: { c: '#2f7bff', t: 'P' }, garage: { c: '#3a8dde' }, business: { c: '#ffc933', t: 'L' },
  property: { c: '#6b6450', t: 'L' }, landmark: { c: '#e9e4d8' }, waypoint: { c: '#ff5a2e' },
};

/** Ikona e një shënuesi në pikën (x, y) me rreze r (piksela CSS). */
export function drawGlyph(c: CanvasRenderingContext2D, kind: string, x: number, y: number, r: number): void {
  const m = MK[kind] ?? MK.mission;
  c.save();
  c.translate(x, y);
  if (kind === 'waypoint') { // kunja
    c.beginPath();
    c.moveTo(0, 0); c.bezierCurveTo(-r * 0.3, -r * 0.9, -r * 1.1, -r * 1.3, -r * 1.1, -r * 2.1);
    c.arc(0, -r * 2.1, r * 1.1, Math.PI, 0); c.bezierCurveTo(r * 1.1, -r * 1.3, r * 0.3, -r * 0.9, 0, 0);
    c.fillStyle = m.c; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#fff'; c.stroke();
    c.beginPath(); c.arc(0, -r * 2.1, r * 0.42, 0, TAU); c.fillStyle = '#fff'; c.fill();
    c.restore(); return;
  }
  c.beginPath(); c.arc(0, 0, r + 1.5, 0, TAU); c.fillStyle = 'rgba(0,0,0,.55)'; c.fill();
  c.beginPath(); c.arc(0, 0, r, 0, TAU);
  c.fillStyle = kind === 'finish' ? '#111' : m.c; c.fill();
  c.lineWidth = Math.max(1.2, r * 0.18); c.strokeStyle = '#fff'; c.stroke();
  const ink = kind === 'checkpoint' || kind === 'business' || kind === 'landmark' ? '#1b1606' : '#fff';
  c.fillStyle = ink; c.strokeStyle = ink;
  const s = r * 0.55;
  if (m.t) {
    c.font = `800 ${Math.round(r * 1.45)}px ${FD}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(m.t, 0, r * 0.08);
  } else if (kind === 'pickup') {
    c.beginPath(); c.arc(0, -s * 0.45, s * 0.42, 0, TAU); c.fill();
    c.beginPath(); c.arc(0, s * 0.95, s * 0.85, Math.PI, 0); c.fill();
  } else if (kind === 'dropoff') {
    c.lineWidth = Math.max(1.4, r * 0.16);
    c.beginPath(); c.moveTo(-s * 0.6, s); c.lineTo(-s * 0.6, -s); c.stroke();
    c.beginPath(); c.moveTo(-s * 0.6, -s); c.lineTo(s * 0.9, -s * 0.5); c.lineTo(-s * 0.6, 0); c.fill();
  } else if (kind === 'checkpoint') {
    c.beginPath(); c.arc(0, 0, s * 0.5, 0, TAU); c.fill();
  } else if (kind === 'finish') {
    c.fillStyle = '#fff';
    const q = s * 0.62;
    c.fillRect(-q, -q, q, q); c.fillRect(0, 0, q, q);
  } else if (kind === 'garage') {
    c.beginPath(); c.moveTo(-s, -s * 0.05); c.lineTo(0, -s); c.lineTo(s, -s * 0.05); c.lineTo(s * 0.75, -s * 0.05); c.lineTo(s * 0.75, s * 0.85);
    c.lineTo(-s * 0.75, s * 0.85); c.lineTo(-s * 0.75, -s * 0.05); c.closePath(); c.fill();
  } else if (kind === 'landmark') {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i & 1 ? s * 0.45 : s; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  c.restore();
}

function drawArrow(c: CanvasRenderingContext2D, x: number, y: number, rot: number, sz: number): void {
  c.save();
  c.translate(x, y); c.rotate(rot);
  c.beginPath(); c.arc(0, 0, sz * 1.9, 0, TAU); c.fillStyle = 'rgba(255,90,46,.18)'; c.fill();
  c.beginPath();
  c.moveTo(0, -sz * 1.15); c.lineTo(sz * 0.85, sz * 0.9); c.lineTo(0, sz * 0.45); c.lineTo(-sz * 0.85, sz * 0.9); c.closePath();
  c.lineJoin = 'round';
  c.lineWidth = 3.5; c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke();
  c.fillStyle = '#fff'; c.fill();
  c.lineWidth = 1.6; c.strokeStyle = '#ff5a2e'; c.stroke();
  c.restore();
}

function policeDot(c: CanvasRenderingContext2D, x: number, y: number, i: number, t: number, r: number): void {
  const ph = (Math.floor(t * 5) + i) & 1;
  c.beginPath(); c.arc(x, y, r + 3.5, 0, TAU); c.fillStyle = ph ? 'rgba(255,60,60,.28)' : 'rgba(60,120,255,.28)'; c.fill();
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = ph ? '#ff3b3b' : '#3b7bff'; c.fill();
  c.lineWidth = 1.5; c.strokeStyle = '#fff'; c.stroke();
}

const TARGETISH = new Set(['pickup', 'dropoff', 'checkpoint', 'finish', 'parking']);

export interface MiniOpts { t: number; level: number; range: number; waypoint: Vec2 | null; target: Vec2 | null }

/** Minimap me drejtimin lart (heading-up). W, H në piksela CSS. */
export function drawMinimap(c: CanvasRenderingContext2D, W: number, H: number, dpr: number, L: MapLayers, ms: MapState, o: MiniOpts): void {
  const { player: p } = ms;
  const cx = W / 2, cy = H * 0.6, k = (W * 0.5) / o.range;
  const th = p.heading - Math.PI, cs = Math.cos(th), sn = Math.sin(th);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#10151b'; c.fillRect(0, 0, W, H);
  c.save();
  c.translate(cx, cy); c.rotate(th); c.scale(k, k); c.translate(-p.x, -p.z);
  L.drawWorld(c, k, 2.5);
  strokeRoute(c, ms.route, k, 4.5);
  c.restore();
  const toS = (x: number, z: number): [number, number] => {
    const dx = x - p.x, dz = z - p.z;
    return [cx + k * (dx * cs - dz * sn), cy + k * (dx * sn + dz * cs)];
  };
  const clampEdge = (sx: number, sy: number, m: number): [number, number, boolean] => {
    const dx = sx - cx, dy = sy - cy;
    let f = 1;
    if (sx < m) f = Math.min(f, (m - cx) / dx); if (sx > W - m) f = Math.min(f, (W - m - cx) / dx);
    if (sy < m) f = Math.min(f, (m - cy) / dy); if (sy > H - m) f = Math.min(f, (H - m - cy) / dy);
    return [cx + dx * f, cy + dy * f, f < 1];
  };
  const r = Math.max(6, W * 0.055);
  for (const mk of ms.markers) {
    let [sx, sy] = toS(mk.x, mk.z);
    const tgt = TARGETISH.has(mk.kind);
    const inside = sx > -r && sx < W + r && sy > -r && sy < H + r;
    if (!inside && !tgt) continue;
    let out = false;
    if (tgt) [sx, sy, out] = clampEdge(sx, sy, r + 4);
    c.globalAlpha = out ? 0.85 : 1;
    drawGlyph(c, mk.kind, sx, sy, out ? r * 0.85 : r);
  }
  c.globalAlpha = 1;
  if (o.waypoint) { const [wx, wy] = clampEdge(...toS(o.waypoint.x, o.waypoint.z), r * 2.6); drawGlyph(c, 'waypoint', wx, wy + r * 1.2, r * 0.8); }
  ms.police.forEach((q, i) => { const [sx, sy] = toS(q.x, q.z); if (sx > -6 && sx < W + 6 && sy > -6 && sy < H + 6) policeDot(c, sx, sy, i, o.t, Math.max(3.5, W * 0.03)); });
  drawArrow(c, cx, cy, 0, Math.max(6, W * 0.06));
  // Veriu
  const nx = -Math.sin(p.heading), nz = Math.cos(p.heading);
  const [vx, vy] = clampEdge(cx + nx * W, cy + nz * W, 11);
  c.beginPath(); c.arc(vx, vy, 8.5, 0, TAU); c.fillStyle = 'rgba(14,17,22,.9)'; c.fill();
  c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.4)'; c.stroke();
  c.fillStyle = '#ffc933'; c.font = `800 11px ${FD}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('V', vx, vy + 0.5);
}

export interface BigOpts {
  t: number; level: number; waypoint: Vec2 | null;
  props: readonly PropertyDef[]; owned: ReadonlySet<string>;
}
export interface View { cx: number; cz: number; k: number }

/** Harta e madhe me veriun lart. */
export function drawBigMap(c: CanvasRenderingContext2D, W: number, H: number, dpr: number, L: MapLayers, ms: MapState, v: View, o: BigOpts): void {
  const city = ms.city, k = v.k;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#0b0e12'; c.fillRect(0, 0, W, H);
  const toS = (x: number, z: number): [number, number] => [W / 2 + (x - v.cx) * k, H / 2 + (z - v.cz) * k];
  c.save();
  c.translate(W / 2, H / 2); c.scale(k, k); c.translate(-v.cx, -v.cz);
  L.drawWorld(c, k, 1.6);
  // Kufijtë e lagjeve
  c.setLineDash([6 / k, 5 / k]); c.lineWidth = 1.4 / k;
  for (const d of city.districts) { c.strokeStyle = d.unlockLevel > o.level ? 'rgba(255,255,255,.18)' : hexA(d.color, 0.55); c.strokeRect(d.minX, d.minZ, d.maxX - d.minX, d.maxZ - d.minZ); }
  c.setLineDash([]);
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2 / k; c.strokeRect(0, 0, city.size, city.size);
  strokeRoute(c, ms.route, k, 5);
  c.restore();

  // Emrat e lagjeve
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const fs = Math.max(15, Math.min(30, k * 60));
  for (const d of city.districts) {
    const [sx, sy] = toS((d.minX + d.maxX) / 2, (d.minZ + d.maxZ) / 2);
    if (sx < -200 || sx > W + 200 || sy < -60 || sy > H + 60) continue;
    const locked = d.unlockLevel > o.level;
    c.font = `800 ${fs}px ${FD}`;
    const name = spaced(d.name.toUpperCase());
    c.lineWidth = 4; c.strokeStyle = 'rgba(8,10,14,.85)'; c.strokeText(name, sx, sy);
    c.fillStyle = locked ? 'rgba(200,204,210,.55)' : hex(mix(d.color, 0xffffff, 0.35)); c.fillText(name, sx, sy);
    if (locked) {
      const f2 = Math.round(fs * 0.55), y2 = sy + fs * 0.9, t = 'NIVELI ' + d.unlockLevel;
      c.font = `800 ${f2}px ${FD}`;
      const tw = c.measureText(t).width, lx = sx - tw / 2 - f2 * 0.55;
      c.strokeText(t, sx + f2 * 0.35, y2); c.fillStyle = '#ffc933'; c.fillText(t, sx + f2 * 0.35, y2);
      // dryni
      c.fillRect(lx - f2 * 0.3, y2 - f2 * 0.1, f2 * 0.6, f2 * 0.45);
      c.beginPath(); c.arc(lx, y2 - f2 * 0.1, f2 * 0.2, Math.PI, 0); c.lineWidth = 2; c.strokeStyle = '#ffc933'; c.stroke();
    }
  }
  // POI: garazhet dhe pikat e njohura
  const r = 10;
  for (const p of city.pois) {
    if (p.kind !== 'garage' && p.kind !== 'landmark') continue;
    const [sx, sy] = toS(p.x, p.z);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    drawGlyph(c, p.kind, sx, sy, p.kind === 'garage' ? r : r * 0.8);
    if (p.kind === 'landmark' && k > 0.55 || p.kind === 'garage' && k > 0.9) label(c, p.name, sx, sy + r + 9);
  }
  for (const p of o.props) {
    const [sx, sy] = toS(p.x, p.z);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    const own = o.owned.has(p.id);
    drawGlyph(c, own ? 'business' : 'property', sx, sy, r);
    if (k > 0.8) label(c, p.name, sx, sy + r + 9);
  }
  for (const m of ms.markers) {
    const [sx, sy] = toS(m.x, m.z);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    drawGlyph(c, m.kind, sx, sy, m.kind === 'mission' ? 12 : 11);
    if (m.label && k > 0.45) label(c, m.label, sx, sy + 22);
  }
  ms.police.forEach((q, i) => { const [sx, sy] = toS(q.x, q.z); policeDot(c, sx, sy, i, o.t, 5); });
  if (o.waypoint) { const [sx, sy] = toS(o.waypoint.x, o.waypoint.z); drawGlyph(c, 'waypoint', sx, sy, 9); }
  const [px, py] = toS(ms.player.x, ms.player.z);
  drawArrow(c, px, py, Math.PI - ms.player.heading, 9);
}

function spaced(s: string): string { return s.split('').join(String.fromCharCode(8202)); }

function label(c: CanvasRenderingContext2D, s: string, x: number, y: number): void {
  c.font = `700 12px Barlow, Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 3; c.strokeStyle = 'rgba(8,10,14,.9)'; c.strokeText(s, x, y);
  c.fillStyle = '#eef0f2'; c.fillText(s, x, y);
}

/** Gjen shënuesin/POI-në më të afërt brenda `maxPx` nga pika e ekranit. */
export function pickAt(ms: MapState, v: View, props: readonly PropertyDef[], W: number, H: number, sx: number, sy: number, maxPx: number):
  { x: number; z: number; label: string } | null {
  let best: { x: number; z: number; label: string } | null = null, bd = maxPx;
  const test = (x: number, z: number, lab: string) => {
    const dx = W / 2 + (x - v.cx) * v.k - sx, dy = H / 2 + (z - v.cz) * v.k - sy, d = Math.hypot(dx, dy);
    if (d < bd) { bd = d; best = { x, z, label: lab }; }
  };
  for (const m of ms.markers) test(m.x, m.z, m.label ?? markerName(m));
  for (const p of props) test(p.x, p.z, p.name);
  for (const p of ms.city.pois) if (p.kind === 'garage' || p.kind === 'landmark') test(p.x, p.z, p.name);
  return best;
}

export function markerName(m: Marker): string {
  return ({ mission: 'Mision', pickup: 'Merr pasagjerin', dropoff: 'Destinacioni', checkpoint: 'Pikë kontrolli', garage: 'Garazhi',
    business: 'Biznes', finish: 'Fundi', parking: 'Parkimi' } as Record<string, string>)[m.kind] ?? 'Pika';
}

export function districtAt(city: CityWorld, x: number, z: number): District | null {
  try { return city.districtAt(x, z); } catch { return null; }
}

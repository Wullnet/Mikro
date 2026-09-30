/**
 * Ndihmës për rrjetin rrugor (të përbashkët për trafikun, GPS-in dhe kontrollin "korsi").
 * Trafiku ecën në të djathtë: korsia 0 është ajo pranë vijës qendrore, korsia lanes-1 pranë trotuarit.
 */
import type { CityWorld, RoadEdge, RoadNode, Vec2 } from './contracts';
import { rightX, rightZ } from './math';

/** +1 = udhëtim nga a te b (koordinata rritet), -1 = nga b te a. */
export type Dir = 1 | -1;

export const otherNode = (e: RoadEdge, nodeId: number) => (e.a === nodeId ? e.b : e.a);
export const dirFrom = (e: RoadEdge, fromNode: number): Dir => (e.a === fromNode ? 1 : -1);
export const roadHalfWidth = (e: RoadEdge) => e.lanes * e.laneWidth;

/** Drejtimi (heading) i udhëtimit përgjatë rrugës. */
export function travelHeading(e: RoadEdge, dir: Dir): number {
  if (e.axis === 'x') return dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  return dir === 1 ? 0 : Math.PI;
}

/** Pika në qendër të korsisë; t = 0..1 nga nyja ku nis udhëtimi. */
export function lanePoint(city: CityWorld, e: RoadEdge, dir: Dir, lane: number, t: number) {
  const A = city.nodes[dir === 1 ? e.a : e.b], B = city.nodes[dir === 1 ? e.b : e.a];
  const h = travelHeading(e, dir);
  const off = (lane + 0.5) * e.laneWidth;
  return {
    x: A.x + (B.x - A.x) * t + rightX(h) * off,
    z: A.z + (B.z - A.z) * t + rightZ(h) * off,
    heading: h,
  };
}

export function edgeBetween(city: CityWorld, a: number, b: number): RoadEdge | null {
  for (const id of city.nodes[a].edges) {
    const e = city.edges[id];
    if (otherNode(e, a) === b) return e;
  }
  return null;
}

/** Gjysma e madhësisë së kryqëzimit (sa larg nga qendra e nyjes fillon rruga e lirë). */
export function junctionHalfSize(city: CityWorld, n: RoadNode): number {
  let w = 0;
  for (const id of n.edges) w = Math.max(w, roadHalfWidth(city.edges[id]));
  return w + 1.5;
}

/** Nyja më e afërt me një pikë (lineare, përdoret rrallë). */
export function nearestNode(city: CityWorld, x: number, z: number): RoadNode {
  let best = city.nodes[0], bd = Infinity;
  for (const n of city.nodes) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

/**
 * Rruga më e shkurtër (A*) nga një pikë te tjetra përmes rrjetit.
 * Kthen nyjet dhe një polilinjë (pika fillestare → nyjet → pika e fundit) mbi vijat qendrore.
 */
export function findRoute(city: CityWorld, from: Vec2, to: Vec2): { nodes: number[]; points: Vec2[] } {
  const fe = city.nearestEdge(from.x, from.z), te = city.nearestEdge(to.x, to.z);
  if (!fe || !te) return { nodes: [], points: [from, to] };
  const starts = [fe.edge.a, fe.edge.b], goals = new Set([te.edge.a, te.edge.b]);
  const N = city.nodes.length;
  const g = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
  const open: number[] = [];
  const hCost = (id: number) => Math.abs(city.nodes[id].x - to.x) + Math.abs(city.nodes[id].z - to.z);
  for (const s of starts) {
    g[s] = Math.hypot(city.nodes[s].x - from.x, city.nodes[s].z - from.z);
    open.push(s);
  }
  const closed = new Uint8Array(N);
  let goal = -1;
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (g[open[i]] + hCost(open[i]) < g[open[bi]] + hCost(open[bi])) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (goals.has(cur)) { goal = cur; break; }
    for (const eid of city.nodes[cur].edges) {
      const e = city.edges[eid], nb = otherNode(e, cur);
      const cost = g[cur] + e.length * (e.kind === 'avenue' || e.kind === 'ring' ? 0.85 : 1);
      if (cost < g[nb]) { g[nb] = cost; prev[nb] = cur; open.push(nb); }
    }
  }
  if (goal < 0) return { nodes: [], points: [from, to] };
  const nodes: number[] = [];
  for (let n = goal; n >= 0; n = prev[n]) nodes.unshift(n);
  const points: Vec2[] = [{ x: fe.x, z: fe.z }, ...nodes.map(id => ({ x: city.nodes[id].x, z: city.nodes[id].z })), { x: te.x, z: te.z }];
  return { nodes, points };
}

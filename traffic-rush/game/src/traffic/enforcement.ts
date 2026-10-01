/** Radarët e shpejtësisë dhe kalimi me të kuq. */
import * as THREE from 'three';
import type { CityWorld, FrameContext, GameEvents, PoliceSystem } from '../core/contracts';
import type { Emitter } from '../core/events';
import { clamp } from '../core/math';
import { junctionHalfSize, roadHalfWidth, travelHeading } from '../core/roads';

type Deps = { city: CityWorld; events: Emitter<GameEvents>; scene: THREE.Scene; police: PoliceSystem };
export interface RadarPost { x: number; z: number; limit: number; edge: number; cool: number }

function signTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#1d4fd6'; g.fillRect(3, 3, 58, 58);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 30, 13, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1a1a1c'; g.fillRect(22, 24, 20, 13); g.fillStyle = '#9aa'; g.beginPath(); g.arc(32, 30, 4, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText('RADAR', 32, 57);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildEnforcement({ city, events, scene, police }: Deps) {
  // ~12 radarë në bulevarde/unazë, të shpërndarë
  const cand = city.edges.filter(e => (e.kind === 'avenue' || e.kind === 'ring') && e.length > 50);
  const posts: RadarPost[] = [];
  const order = cand.map((e, i) => ({ e, k: ((i * 2654435761) >>> 0) % 1000 })).sort((a, b) => a.k - b.k);
  for (const { e } of order) {
    if (posts.length >= 12) break;
    const A = city.nodes[e.a], B = city.nodes[e.b];
    const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
    if (posts.some(p => Math.hypot(p.x - mx, p.z - mz) < 160)) continue;
    // në trotuarin e djathtë të drejtimit +1
    const h = travelHeading(e, 1), off = roadHalfWidth(e) + Math.min(1.2, e.sidewalk * 0.5);
    posts.push({ x: mx - Math.cos(h) * off, z: mz + Math.sin(h) * off, limit: e.speedLimit, edge: e.id, cool: 0 });
  }

  // pamja: 3 InstancedMesh (shtyllë, kuti, tabelë)
  const n = posts.length;
  const grey = new THREE.MeshStandardMaterial({ color: 0x8d9296, roughness: 0.5, metalness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.6 });
  const signMat = new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.6 });
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 3.6, 6).translate(0, 1.8, 0), grey, n);
  const box = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.4, 0.6).translate(0, 3.7, 0), dark, n);
  const sign = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.62, 0.62).translate(0, 2.7, 0), signMat, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), y = new THREE.Vector3(0, 1, 0);
  posts.forEach((p, i) => {
    const e = city.edges[p.edge];
    q.setFromAxisAngle(y, e.axis === 'x' ? Math.PI / 2 : 0);
    m.compose(new THREE.Vector3(p.x, city.groundHeight(p.x, p.z), p.z), q, one);
    pole.setMatrixAt(i, m); box.setMatrixAt(i, m); sign.setMatrixAt(i, m);
  });
  const group = new THREE.Group();
  group.name = 'radaret';
  for (const im of [pole, box, sign]) { im.castShadow = false; im.computeBoundingSphere(); group.add(im); }
  // blici i bardhë
  const flashMat = new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  const flash = new THREE.Sprite(flashMat);
  flash.visible = false;
  group.add(flash);
  scene.add(group);
  let flashT = 0;

  // kalimi me të kuq
  let lastNode = -1, lastDist = Infinity, lastAxis: 'x' | 'z' = 'x';
  const redCool = new Map<number, number>();
  const jhs = city.nodes.map(nd => junctionHalfSize(city, nd));

  return {
    cameras: posts as { x: number; z: number; limit: number }[],
    update(ctx: FrameContext) {
      const dt = ctx.dt, p = ctx.player;
      if (flashT > 0) {
        flashT -= dt;
        const k = clamp(flashT / 0.25, 0, 1);
        flashMat.opacity = k;
        flash.scale.setScalar(2 + (1 - k) * 6);
        flash.visible = flashT > 0;
      }
      for (const r of posts) r.cool = Math.max(0, r.cool - dt);
      if (!p) return;
      const spd = Math.abs(p.speed);
      for (const r of posts) {
        if (r.cool > 0) continue;
        const d = Math.hypot(p.x - r.x, p.z - r.z);
        if (d > 12 + roadHalfWidth(city.edges[r.edge])) continue;
        if (spd * 3.6 <= r.limit * 3.6 + 10) continue;
        const over = (spd - r.limit) * 3.6;
        const fine = Math.round(clamp(2000 + (over - 10) * 160, 2000, 10000) / 100) * 100;
        r.cool = 8;
        flash.position.set(r.x, 3.8, r.z);
        flashT = 0.25; flash.visible = true;
        events.emit('speedCamera', { speed: spd, limit: r.limit, fine });
      }
      // semafori: kalim i vijës së ndalimit me të kuq
      const ne = city.nearestEdge(p.x, p.z);
      if (!ne || ne.dist > 12) { lastNode = -1; return; }
      const e = ne.edge;
      const along = e.axis === 'x' ? Math.sin(p.heading) : Math.cos(p.heading);
      if (Math.abs(along) < 0.5) { lastNode = -1; return; }
      const node = along > 0 ? e.b : e.a, nd = city.nodes[node];
      const dist = e.axis === 'x' ? Math.abs(nd.x - p.x) : Math.abs(nd.z - p.z);
      if (node === lastNode && lastDist > jhs[node] && dist <= jhs[node] && nd.signalized && spd > 5) {
        if (city.signal(node, lastAxis) === 'red' && (redCool.get(node) ?? 0) < ctx.time) {
          redCool.set(node, ctx.time + 3);
          events.emit('redLight', { nodeId: node });
          for (const u of police.units) if (Math.hypot(u.x - p.x, u.z - p.z) < 70) { police.addHeat(1, 'Kalim me të kuq'); break; }
        }
      }
      lastNode = node; lastDist = dist; lastAxis = e.axis;
    },
  };
}

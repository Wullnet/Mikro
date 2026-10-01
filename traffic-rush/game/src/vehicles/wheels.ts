/** Rrotat: gomë e rrumbullakët (Lathe) + disk me rreze (Extrude me vrima). Boshti = X, faqja e jashtme nga +X. */
import * as THREE from 'three';
import { Kit, SLOT, addGeo, mat, PI } from './geo';
import type { RimKind } from './styles';

function spokes(kind: RimKind): { ang: number[]; ws: number } {
  const a: number[] = [];
  if (kind === 'five') { for (let i = 0; i < 5; i++) a.push(i * 2 * PI / 5); return { ang: a, ws: 0.024 }; }
  if (kind === 'six') { for (let i = 0; i < 6; i++) a.push(i * 2 * PI / 6); return { ang: a, ws: 0.026 }; }
  if (kind === 'multi') { for (let i = 0; i < 10; i++) a.push(i * 2 * PI / 10); return { ang: a, ws: 0.011 }; }
  for (let i = 0; i < 5; i++) { const c = i * 2 * PI / 5; a.push(c - 0.15, c + 0.15); }
  return { ang: a, ws: 0.012 };
}

/** Shton rrotën në target-in e detajeve (x = boshti). sideSign: +1 faqja nga +X. */
export function addWheel(k: Kit, R: number, w: number, kind: RimKind, rimFrac: number, low: boolean, m: THREE.Matrix4): void {
  const D = (s: number) => k.S(s);
  const rr = R * rimFrac;
  if (low) {
    addGeo(D(SLOT.rubber), new THREE.CylinderGeometry(R, R, w, 10, 1, true), mat(0, 0, 0, 0, 0, PI / 2).premultiply(m));
    addGeo(D(kind === 'steel' ? SLOT.grey : SLOT.silver), new THREE.CircleGeometry(rr, 10), mat(w * 0.42, 0, 0, 0, PI / 2, 0).premultiply(m));
    return;
  }
  // goma: profil i rrumbullakosur
  const prof: Array<[number, number, number]> = [
    [rr * 0.97, -w * 0.4, SLOT.wall], [R * 0.82, -w * 0.5, SLOT.wall], [R * 0.95, -w * 0.47, SLOT.rubber], [R, -w * 0.35, SLOT.rubber],
    [R, w * 0.35, SLOT.rubber], [R * 0.95, w * 0.47, SLOT.rubber], [R * 0.82, w * 0.5, SLOT.wall], [rr * 0.97, w * 0.4, SLOT.wall],
  ];
  const lathe = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 20);
  const uv = lathe.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    const s = prof[Math.round(uv.getY(i) * (prof.length - 1))][2];
    uv.setXY(i, ((s % 4) + 0.5) / 4, (Math.floor(s / 4) + 0.5) / 4);
  }
  addGeo(D(0), lathe, mat(0, 0, 0, 0, 0, -PI / 2).premultiply(m), true);

  // fuçia e brendshme dhe disku i frenave
  const barrel = new THREE.CylinderGeometry(rr * 0.96, rr * 0.96, w * 0.75, 16, 1, true);
  addGeo(D(SLOT.gun), barrel, mat(-w * 0.02, 0, 0, 0, 0, PI / 2).premultiply(m), false, true);
  addGeo(D(SLOT.disc), new THREE.CircleGeometry(rr * 0.78, 14), mat(-w * 0.05, 0, 0, 0, PI / 2, 0).premultiply(m));

  // disku me rreze
  const face = new THREE.Shape();
  face.absarc(0, 0, rr, 0, PI * 2, false);
  const rimSlot = kind === 'steel' ? SLOT.grey : kind === 'six' || kind === 'multi' ? SLOT.gun : SLOT.silver;
  if (kind === 'steel') {
    for (let i = 0; i < 8; i++) {
      const a = i * PI / 4, h = new THREE.Path();
      h.absarc(Math.cos(a) * rr * 0.68, Math.sin(a) * rr * 0.68, rr * 0.1, 0, PI * 2, true);
      face.holes.push(h);
    }
  } else {
    const { ang, ws } = spokes(kind);
    const sc = R / 0.33, wsS = ws * sc;
    const rO = rr * 0.88, rI0 = rr * 0.34;
    for (let i = 0; i < ang.length; i++) {
      const a0 = ang[i], a1 = i + 1 < ang.length ? ang[i + 1] : ang[0] + PI * 2;
      const gap = a1 - a0;
      const rI = Math.max(rI0, 1.3 * wsS / Math.sin(Math.min(gap / 2, 1.2)));
      if (rI > rO - 0.02) continue;
      const aO = Math.asin(Math.min(0.99, wsS / rO)), aI = Math.asin(Math.min(0.99, wsS / rI));
      const h = new THREE.Path();
      const o0 = a0 + aO, o1 = a1 - aO, i0 = a0 + aI, i1 = a1 - aI;
      if (o1 <= o0 || i1 <= i0) continue;
      h.moveTo(Math.cos(i0) * rI, Math.sin(i0) * rI);
      const mO = 3;
      for (let j = 0; j <= mO; j++) { const a = o0 + (o1 - o0) * j / mO; h.lineTo(Math.cos(a) * rO, Math.sin(a) * rO); }
      h.lineTo(Math.cos(i1) * rI, Math.sin(i1) * rI);
      face.holes.push(h);
    }
  }
  const ex = new THREE.ExtrudeGeometry(face, { depth: 0.03, bevelEnabled: false, curveSegments: kind === 'steel' ? 5 : 24 });
  // konkaviteti: qendra del jashtë
  const p = ex.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i));
    p.setZ(i, p.getZ(i) + 0.028 * Math.max(0, 1 - r / rr) * (kind === 'steel' ? 0.3 : 1));
  }
  ex.computeVertexNormals();
  addGeo(D(rimSlot), ex, mat(w * 0.27, 0, 0, 0, PI / 2, 0).premultiply(m));
  // kapaku i qendrës
  const hubR = kind === 'steel' ? rr * 0.46 : rr * 0.2;
  const hub = new THREE.CylinderGeometry(hubR * 0.8, hubR, 0.035, 12);
  addGeo(D(kind === 'steel' ? SLOT.silver : SLOT.chrome), hub, mat(w * 0.27 + 0.045, 0, 0, 0, 0, -PI / 2).premultiply(m));
}


/** Gjeometria e një rrote të vetme (e ndarë për të gjitha makinat me të njëjtin stil). */
export function wheelGeometry(R: number, w: number, kind: RimKind, rimFrac: number, mirror: boolean): THREE.BufferGeometry {
  const k = new Kit(false);
  addWheel(k, R, w, kind, rimFrac, false, new THREE.Matrix4().makeScale(mirror ? -1 : 1, 1, 1));
  return k.det.geo()!;
}

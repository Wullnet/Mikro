/** Ekrani i hartës së madhe: zvarritje, zmadhim me dy gishta, prekje → GPS. */
import type { Ctx } from './ctx';
import { IC } from './icons';
import { drawBigMap, pickAt, type View } from './map';
import { $, html, setText, toggle, fmtDist } from './util';

export interface MapScreen { el: HTMLElement; open(): void; update(dt: number): void }

export function createMapScreen(ctx: Ctx, back: () => void): MapScreen {
  const el = html(`<div class="scr s-map blk"><canvas></canvas>
  <div class="hdr"><button class="ibtn" data-a="back" aria-label="Mbrapa">${IC.back}</button><h2>Harta</h2>
    <button class="ibtn" data-a="loc" aria-label="Pozicioni im">${IC.locate}</button></div>
  <div class="mzoom"><button class="ibtn" data-a="in" aria-label="Zmadho">${IC.plus}</button><button class="ibtn" data-a="out" aria-label="Zvogëlo">${IC.minus}</button></div>
  <div class="mleg"><span><i style="background:#ff5a2e"></i>Misione</span><span><i style="background:#3a8dde"></i>Garazh</span>
    <span><i style="background:#ffc933"></i>Biznes</span><span><i style="background:#e9e4d8"></i>Pikë e njohur</span><span><i style="background:#ff3b3b"></i>Policia</span></div>
  <div class="wpt">${IC.pin}<div><b></b><span></span></div><button class="btn" data-a="clr">Hiq</button></div>
</div>`);
  const cv = $(el, 'canvas') as HTMLCanvasElement, c2 = cv.getContext('2d')!;
  const wpt = $(el, '.wpt'), wB = $(el, '.wpt b'), wS = $(el, '.wpt span');
  const v: View = { cx: 0, cz: 0, k: 1 };
  let W = 0, H = 0, dpr = 1, dirty = true, t = 0, redraw = 0;

  const kRange = () => { const S = ctx.api.map().city.size; return [Math.min(W, H) / S * 0.85, 4] as const; };
  function zoom(f: number, sx = W / 2, sy = H / 2) {
    const [a, b] = kRange();
    const nk = Math.min(b, Math.max(a, v.k * f));
    // pika nën gisht mbetet në vend
    const wx = v.cx + (sx - W / 2) / v.k, wz = v.cz + (sy - H / 2) / v.k;
    v.k = nk; v.cx = wx - (sx - W / 2) / nk; v.cz = wz - (sy - H / 2) / nk;
    clampView(); dirty = true;
  }
  function clampView() {
    const S = ctx.api.map().city.size;
    v.cx = Math.min(S, Math.max(0, v.cx)); v.cz = Math.min(S, Math.max(0, v.cz));
  }
  function center() { const p = ctx.api.map().player; v.cx = p.x; v.cz = p.z; clampView(); dirty = true; }
  function resize() {
    W = cv.clientWidth; H = cv.clientHeight; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); dirty = true;
  }

  el.addEventListener('click', e => {
    const a = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
    if (!a) return;
    ctx.sfx('click');
    const k = a.dataset.a;
    if (k === 'back') back();
    else if (k === 'loc') center();
    else if (k === 'in') zoom(1.5);
    else if (k === 'out') zoom(1 / 1.5);
    else if (k === 'clr') { ctx.setWaypoint(null); dirty = true; }
  });

  // Gjestet
  const pts = new Map<number, { x: number; y: number }>();
  let moved = 0, pinch = 0;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); if (pts.size === 1) moved = 0; pinch = 0; });
  cv.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    const nx = e.offsetX, ny = e.offsetY;
    if (pts.size === 1) {
      moved += Math.abs(nx - p.x) + Math.abs(ny - p.y);
      v.cx -= (nx - p.x) / v.k; v.cz -= (ny - p.y) / v.k; clampView(); dirty = true;
    } else if (pts.size === 2) {
      moved = 99;
      const [a, b] = [...pts.values()];
      const o = a === p ? b : a;
      const d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(nx - o.x, ny - o.y);
      if (pinch && d0 > 10) zoom(d1 / d0, (nx + o.x) / 2, (ny + o.y) / 2);
      pinch = 1;
    }
    p.x = nx; p.y = ny;
  });
  const up = (e: PointerEvent) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size === 0 && moved < 10 && e.type === 'pointerup') tap(e.offsetX, e.offsetY);
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.offsetX, e.offsetY); }, { passive: false });

  function tap(sx: number, sy: number) {
    const ms = ctx.api.map();
    const hit = pickAt(ms, v, ctx.api.properties, W, H, sx, sy, 26);
    const w = hit ?? { x: v.cx + (sx - W / 2) / v.k, z: v.cz + (sy - H / 2) / v.k, label: 'Pikë e zgjedhur' };
    const d = ms.city.districtAt(w.x, w.z);
    ctx.setWaypoint({ x: w.x, z: w.z, label: w.label + (d ? ' · ' + d.name : '') });
    ctx.sfx('checkpoint');
    dirty = true;
  }

  return {
    el,
    open() {
      resize();
      v.k = Math.min(W, H) / 520;
      center();
    },
    update(dt) {
      t += dt; redraw -= dt;
      if (cv.clientWidth !== W || cv.clientHeight !== H) resize();
      const wp = ctx.waypoint;
      toggle(wpt, 'on', !!wp);
      if (wp) {
        const p = ctx.api.map().player;
        setText(wB, wp.label); setText(wS, 'GPS · ' + fmtDist(Math.hypot(wp.x - p.x, wp.z - p.z)));
      }
      if (!dirty && redraw > 0) return;
      dirty = false; redraw = 0.1;
      const ms = ctx.api.map(), prof = ctx.api.progression.profile;
      ctx.layers.ensure(ms.city, prof.level);
      drawBigMap(c2, W, H, dpr, ctx.layers, ms, v, { t, level: prof.level, waypoint: wp, props: ctx.api.properties, owned: new Set(prof.properties) });
    },
  };
}

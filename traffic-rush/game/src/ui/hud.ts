/** HUD-i gjatë lojës: minimap, paratë/niveli, misioni, yjet e policisë, shpejtësimatësi, njoftimet. */
import type { HudState, MissionView } from '../core/contracts';
import type { Ctx } from './ctx';
import { MISSION_KIND } from './ctx';
import { IC, missionIcon } from './icons';
import { drawMinimap } from './map';
import { $, html, setText, setStyle, toggle, fmtMoney, fmtClock, fmtTimer, fmtDist, esc } from './util';

const ARC = 'M20.3 79.7A42 42 0 1 1 79.7 79.7';

export interface Hud {
  el: HTMLElement;
  update(dt: number, h: HudState): void;
  moneyFloat(amount: number): void;
  sign(cls: string, small: string, big: string, ms?: number): void;
}

function face(mood: number): string {
  const m = mood < 0.35 ? 'M8 16.5q4-3 8 0' : mood < 0.65 ? 'M8.5 15.5h7' : 'M8 14.5q4 3.5 8 0';
  const col = mood < 0.35 ? '#ff4545' : mood < 0.65 ? '#ffc933' : '#38d27a';
  return `<svg class="face" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="${col}"/><circle cx="8.7" cy="10" r="1.3" fill="#15181d"/><circle cx="15.3" cy="10" r="1.3" fill="#15181d"/><path d="${m}" stroke="#15181d" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;
}

export function createHud(ctx: Ctx): Hud {
  const el = html(`<div class="hud">
  <div class="htop">
    <div class="mmw pe" role="button" aria-label="Harta"><div class="mm"><canvas></canvas></div>
      <div class="loc"><b data-d></b><span>${IC.clock}<i data-c style="font-style:normal"></i></span></div></div>
    <div class="mis panel">
      <div class="mis-h"><span data-mi></span><span class="mis-k"></span><span class="mis-tm">${IC.clock}<b></b></span></div>
      <div class="mis-o"></div><div class="mis-p"></div>
      <div class="pas"><span data-face></span><span class="pas-n"></span><span class="pbar"><i></i></span></div>
      <div class="bub"></div>
    </div>
    <div class="hr"><div class="wal"><div class="money"><span class="coin">${IC.coin}</span><span data-m></span></div>
      <div class="lvr">NIV <b data-l></b><span class="xpb"><i></i></span></div><div class="mfl"></div></div>
      <button class="ibtn pbtn pe" aria-label="Pauzë">${IC.pause}</button></div>
    <div class="wan"><div class="stars">${IC.star.repeat(5)}</div><div class="bust"><i></i><span>ARRESTIM</span></div></div>
  </div>
  <div class="feed"><div class="nm"></div></div>
  <div class="bc"><div class="lim"></div><div class="spd">
    <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="rgba(14,17,22,.86)" stroke="rgba(255,255,255,.22)"/>
      <path d="${ARC}" pathLength="100" fill="none" stroke="rgba(255,255,255,.13)" stroke-width="5" stroke-linecap="round"/>
      <path data-r d="${ARC}" pathLength="100" fill="none" stroke="#ff5a2e" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 100"/>
      <text data-g x="50" y="31" text-anchor="middle" font-family="Saira Extra Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="13" fill="#ffc933">1</text>
      <text data-s x="50" y="61" text-anchor="middle" font-family="Saira Extra Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="34" fill="#fff">0</text>
      <text x="50" y="72" text-anchor="middle" font-family="Barlow,Arial,sans-serif" font-weight="700" font-size="8" letter-spacing="1.5" fill="#a3abb5">KM/H</text>
      <g data-n><rect x="33" y="79" width="34" height="5" rx="2.5" fill="rgba(255,255,255,.14)"/><rect data-nv x="33" y="79" width="34" height="5" rx="2.5" fill="#3b9cff"/></g>
    </svg><div class="dmg">${IC.damage}</div></div></div>
</div>`);
  const q = <T extends Element = HTMLElement>(s: string) => $(el, s) as unknown as T;
  const cv = q<HTMLCanvasElement>('.mm canvas'), c2 = cv.getContext('2d')!;
  const dEl = q('[data-d]'), cEl = q('[data-c]'), mEl = q('[data-m]'), lEl = q('[data-l]'), xpI = q('.lvr .xpb>i'), mfl = q('.mfl');
  const mis = q('.mis'), mi = q('[data-mi]'), mk = q('.mis-k'), tm = q('.mis-tm'), tmB = q('.mis-tm b'), mo = q('.mis-o'), mp = q('.mis-p');
  const pas = q('.pas'), faceEl = q('[data-face]'), pasN = q('.pas-n'), pbar = q('.pbar>i'), bub = q('.bub');
  const wan = q('.wan'), stars = Array.from(el.querySelectorAll('.stars .ic')), bust = q('.bust'), bustI = q('.bust>i');
  const feed = q('.feed'), nm = q('.nm'), lim = q('.lim'), dmg = q('.dmg');
  const rArc = q<SVGPathElement>('[data-r]'), gT = q<SVGTextElement>('[data-g]'), sT = q<SVGTextElement>('[data-s]');
  const nG = q<SVGGElement>('[data-n]'), nV = q<SVGRectElement>('[data-nv]');

  onTapEl(q('.mmw'), () => ctx.go('map'));
  onTapEl(q('.pbtn'), () => ctx.go('pause'));

  let mmT = 0, t = 0, lastMisId = '', lastLine: string | null = null, bubT = 0, lastStreak = 0, faceK = -1;
  const attr = (e: Element, k: string, v: string) => { const kk = '__a' + k; if ((e as any)[kk] !== v) { (e as any)[kk] = v; e.setAttribute(k, v); } };

  function mission(m: MissionView | null, h: HudState, dt: number) {
    toggle(mis, 'on', !!m);
    if (!m) { lastMisId = ''; return; }
    if (m.def.id !== lastMisId) {
      lastMisId = m.def.id;
      mi.innerHTML = missionIcon(m.def.kind);
      setText(mk, MISSION_KIND[m.def.kind] + ' · ' + m.def.title);
      lastLine = null; bubT = 0; toggle(bub, 'on', false);
    }
    setText(mo, m.objective);
    toggle(tm, 'on', m.timeLeft != null);
    if (m.timeLeft != null) { setText(tmB, fmtTimer(m.timeLeft)); toggle(tm, 'low', m.timeLeft < 10); }
    const pl = ctx.api.map().player;
    const dist = m.target ? fmtDist(Math.hypot(m.target.x - pl.x, m.target.z - pl.z)) : '';
    const ph = (m.progress ? `<b>${esc(m.progress)}</b>` : '<span></span>') + (dist ? `<span>${dist}</span>` : '');
    if ((mp as any).__h !== ph) { (mp as any).__h = ph; mp.innerHTML = m.progress || dist ? ph : ''; }
    const p = m.passenger;
    toggle(pas, 'on', !!p);
    if (p) {
      const k = p.mood < 0.35 ? 0 : p.mood < 0.65 ? 1 : 2;
      if (k !== faceK) { faceK = k; faceEl.innerHTML = face(p.mood); setStyle(pbar, 'background-color', ['#ff4545', '#ffc933', '#38d27a'][k]); }
      setText(pasN, p.name);
      setStyle(pbar, 'transform', `scaleX(${Math.round(p.mood * 50) / 50})`);
      if (p.line && p.line !== lastLine) { setText(bub, '“' + p.line + '”'); bubT = 4.5; }
      lastLine = p.line;
    }
    if (bubT > 0) bubT -= dt;
    toggle(bub, 'on', bubT > 0);
    void h;
  }

  return {
    el,
    update(dt, h) {
      t += dt;
      const api = ctx.api, prof = api.progression.profile;
      // Minimap ~15 fps
      mmT -= dt;
      if (mmT <= 0) {
        mmT = 1 / 15;
        const W = cv.clientWidth, H = cv.clientHeight;
        if (W > 0) {
          const dpr = Math.min(2, devicePixelRatio || 1);
          if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
          const ms = api.map();
          ctx.layers.ensure(ms.city, prof.level);
          drawMinimap(c2, W, H, dpr, ctx.layers, ms, { t, level: prof.level, range: 150, waypoint: ctx.waypoint, target: h.mission?.target ?? null });
        }
      }
      setText(dEl, h.district);
      setText(cEl, fmtClock(h.timeOfDay));
      setText(mEl, fmtMoney(h.money));
      setText(lEl, String(h.level));
      setStyle(xpI, 'transform', `scaleX(${Math.round(h.xpFrac * 100) / 100})`);
      mission(h.mission, h, dt);
      // Policia
      toggle(wan, 'on', h.wanted > 0 || h.bustedProgress > 0);
      for (let i = 0; i < 5; i++) toggle(stars[i], 'f', i < h.wanted);
      toggle(bust, 'on', h.bustedProgress > 0.01);
      setStyle(bustI, 'transform', `scaleX(${Math.round(h.bustedProgress * 50) / 50})`);
      // Near miss
      const st = h.nearMissStreak;
      toggle(nm, 'on', st > 0);
      if (st > 0 && st !== lastStreak) {
        nm.innerHTML = `PËR PAK!${st > 1 ? `<b>×${st}</b>` : ''}`;
        nm.classList.remove('pop'); void nm.offsetWidth; nm.classList.add('pop');
      }
      lastStreak = st;
      // Shpejtësimatësi
      const kmh = Math.round(h.speedKmh);
      setText(sT as unknown as HTMLElement, String(kmh));
      setText(gT as unknown as HTMLElement, h.gear <= 0 ? (h.gear < 0 ? 'R' : 'N') : String(h.gear));
      const r = Math.round(Math.min(1, Math.max(0, h.rpm)) * 100);
      attr(rArc, 'stroke-dasharray', `${r} 100`);
      attr(rArc, 'stroke', r > 86 ? '#ff4545' : '#ff5a2e');
      const spec = api.catalog.find(c => c.id === prof.selectedCar);
      const hasN = !!spec?.nitro;
      attr(nG, 'visibility', hasN ? 'visible' : 'hidden');
      if (hasN) attr(nV, 'width', (34 * Math.round(h.nitro * 40) / 40).toFixed(1));
      toggle(dmg, 'on', h.damage > 0.2);
      if (h.damage > 0.2) setStyle(dmg, 'color', h.damage > 0.65 ? '#ff4545' : '#ffc933');
      toggle(lim, 'on', h.speedLimitKmh != null);
      if (h.speedLimitKmh != null) { setText(lim, String(h.speedLimitKmh)); toggle(lim, 'over', h.speedKmh > h.speedLimitKmh + 5); }
    },
    moneyFloat(amount) {
      const s = document.createElement('span');
      if (amount < 0) s.className = 'neg';
      s.textContent = (amount > 0 ? '+' : '') + fmtMoney(amount);
      mfl.appendChild(s);
      setTimeout(() => s.remove(), 1700);
    },
    sign(cls, small, big, ms = 2600) {
      feed.querySelectorAll('.sign').forEach(e => e.remove());
      const s = html(`<div class="sign ${cls}"><small>${small}</small>${esc(big)}</div>`);
      feed.appendChild(s);
      setTimeout(() => s.classList.add('out'), ms);
      setTimeout(() => s.remove(), ms + 450);
    },
  };
}

export function onTapEl(el: Element, fn: () => void): void {
  let last = 0;
  el.addEventListener('click', () => { const n = performance.now(); if (n - last < 300) return; last = n; fn(); });
}

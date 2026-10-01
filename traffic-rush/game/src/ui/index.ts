/** UI e lojës: titulli, menuja, HUD-i, pauza, harta, garazhi, bizneset, cilësimet, brifingu, rezultati. */
import type { GameApi, MissionDef, MissionResult, Settings, UiSound, UiSystem } from '../core/contracts';
import type { ProgressionX } from '../missions';
import { CSS } from './styles';
import { IC, missionIcon } from './icons';
import { MapLayers } from './map';
import { MISSION_KIND, PROP_KIND, header, levelFrac, type Ctx, type Screen, type ToastKind, type Waypoint } from './ctx';
import { $, html, esc, fmtMoney, fmtClock, fmtInt, hex, setText, toggle } from './util';
import { createHud, onTapEl, type Hud } from './hud';
import { createMapScreen, type MapScreen } from './mapscreen';
import { createGarage, type Garage } from './garage';

/** Rregullime të vogla mbi styles.ts. */
const EXTRA = `.tru .wm h1{font-size:clamp(2.4rem,min(10.5vw,24vh),7.5rem)}
.tru .pgrid{grid-template-columns:minmax(0,1fr)}
.tru .pgrid>.btn{min-width:0;overflow:hidden;text-overflow:ellipsis}
@media (orientation:landscape){.tru .pgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.tru .pgrid>.btn{font-size:1.15rem;padding:0 10px}}
.tru .loc b{letter-spacing:.02em}
.tru .hdr h2{font-size:clamp(1.5rem,7vw,2rem)}
.tru[data-s=briefing] .toasts,.tru[data-s=result] .toasts{top:auto;bottom:calc(var(--sab) + 12px)}
.tru .lvup{z-index:7}`;

type UiX = UiSystem & { showBriefing(def: MissionDef, onAccept: () => void): void; showResult(r: MissionResult): void };

/** Ekranet ku bota ndalon. */
const PAUSED = new Set<Screen>(['pause', 'map', 'settings', 'briefing', 'result', 'garage', 'business']);
const HUD_ON = new Set<Screen>(['play', 'pause', 'briefing', 'result']);

export function createUi(): UiX {
  let screen: Screen = 'title';
  let api: GameApi, prog: ProgressionX, root: HTMLElement, tru: HTMLElement;
  const scr: Partial<Record<Screen, HTMLElement>> = {};
  let hud: Hud, mapS: MapScreen, gar: Garage, toasts: HTMLElement, lvup: HTMLElement;
  let backFrom: Screen = 'menu';            // ku kthehen harta/cilësimet
  let briefAccept: (() => void) | null = null;
  let suppressResult = false;
  let menuT = 0;

  const ctx: Ctx = {
    get api() { return api; },
    get root() { return root; },
    layers: new MapLayers(),
    get screen() { return screen; },
    go,
    toast,
    sfx: (s: UiSound) => { try { api.audio.ui(s); } catch { /* pa zë */ } },
    waypoint: null,
    setWaypoint(w: Waypoint | null) { ctx.waypoint = w; api.setWaypoint(w ? { x: w.x, z: w.z } : null); },
    refreshMoney,
    district: id => api.map().city.districts.find(d => d.id === id),
  };

  function go(s: Screen) {
    const prev = screen;
    if (prev === s) return;
    if (prev === 'garage') gar.close();
    if ((s === 'map' || s === 'settings') && prev !== 'map' && prev !== 'settings') backFrom = prev;
    screen = s;
    tru.dataset.s = s;
    if (HUD_ON.has(s)) tru.setAttribute('data-hud', ''); else tru.removeAttribute('data-hud');
    for (const k in scr) toggle(scr[k as Screen]!, 'on', k === s);
    api.pause(PAUSED.has(s));
    if (s === 'menu') renderMenu();
    else if (s === 'pause') renderPause();
    else if (s === 'map') mapS.open();
    else if (s === 'garage') gar.open();
    else if (s === 'business') renderBusiness();
    else if (s === 'settings') renderSettings();
  }

  function toast(text: string, kind: ToastKind = 'info') {
    const icon = kind === 'good' ? IC.check : kind === 'bad' ? IC.close : IC.flagX;
    const t = html(`<div class="toast ${kind}">${icon}<span>${esc(text)}</span></div>`);
    toasts.appendChild(t);
    while (toasts.children.length > 3) toasts.firstElementChild!.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3000);
  }

  function refreshMoney() {
    const m = fmtMoney(prog.profile.money);
    root.querySelectorAll<HTMLElement>('[data-money]').forEach(e => setText(e, m));
  }

  function toMenu() { ctx.sfx('click'); go('menu'); }
  function back() { ctx.sfx('click'); go(backFrom === 'map' || backFrom === 'settings' ? 'menu' : backFrom); }

  // ---------- Titulli ----------
  function buildTitle() {
    const el = html(`<div class="scr s-title blk"><div class="wm"><h1>TRAFFIC <em>RUSH</em></h1><div class="bar"></div><div class="plate">QYTETI</div></div>
      <div class="tap">Prek për të filluar</div><div class="ver">v0.1</div></div>`);
    onTapEl(el, () => { api.audio.unlock(); ctx.sfx('click'); go('menu'); });
    return el;
  }

  // ---------- Menuja ----------
  function buildMenu() {
    const el = html(`<div class="scr s-menu"></div>`);
    el.addEventListener('click', e => {
      const a = ((e.target as HTMLElement).closest('[data-a]') as HTMLElement | null)?.dataset.a;
      if (!a) return;
      ctx.sfx('click');
      if (a === 'play') go('play');
      else if (a === 'collect') {
        const n = api.progression.collectIncome();
        if (n > 0) { ctx.sfx('coin'); toast(`Mblodhe ${fmtMoney(n)} nga bizneset!`, 'good'); }
        renderMenu();
      } else go(a as Screen);
    });
    return el;
  }
  function renderMenu() {
    const p = prog.profile, el = scr.menu!;
    const car = api.catalog.find(c => c.id === p.selectedCar);
    const a = api.progression.xpForLevel(p.level), b = api.progression.xpForLevel(p.level + 1);
    const pend = prog.pendingIncome();
    el.innerHTML = `<div class="mtop"><div class="prof"><span class="lvb">${p.level}</span><span class="xpw"><span>Niveli ${p.level} · ${fmtInt(p.xp - a)}/${fmtInt(b - a)} XP</span>
        <span class="xpb"><i style="transform:scaleX(${levelFrac(api).toFixed(3)})"></i></span></span></div>
        <span class="chip"><span class="coin">${IC.coin}</span><span data-money>${fmtMoney(p.money)}</span></span></div>
      <div class="mlogo"><b>TRAFFIC <em>RUSH</em></b><span>QYTETI</span></div>
      <div class="mpan panel"><div class="mhead"><b>TRAFFIC <em>RUSH</em></b><span>QYTETI</span></div>
        <div class="mcar"><div><span class="eb">Makina jote</span><b>${esc(car?.name ?? '')}</b></div>
          <button class="ibtn" data-a="garage" aria-label="Ndrysho makinën">${IC.car}</button></div>
        <button class="btn pri big" data-a="play">${IC.play}Luaj</button>
        ${pend > 0 ? `<button class="btn gold inc" data-a="collect">${IC.income}Mblidh të ardhurat <small>+${fmtMoney(pend)}</small></button>` : ''}
        <div class="mgrid">
          <button class="tile" data-a="garage">${IC.car}Garazhi</button><button class="tile" data-a="business">${IC.building}Bizneset</button>
          <button class="tile" data-a="map">${IC.map}Harta</button><button class="tile" data-a="settings">${IC.gear}Cilësimet</button>
        </div></div>`;
    (el as any).__pend = pend > 0;
  }

  // ---------- Pauza ----------
  function buildPause() {
    const el = html(`<div class="scr cen dim blk"><div class="card"></div></div>`);
    el.addEventListener('click', e => {
      const a = ((e.target as HTMLElement).closest('[data-a]') as HTMLElement | null)?.dataset.a;
      if (!a) return;
      ctx.sfx('click');
      if (a === 'resume') go('play');
      else if (a === 'abort') { suppressResult = true; api.abortMission(); suppressResult = false; toast('Misioni u braktis.', 'bad'); go('play'); }
      else if (a === 'respawn') { api.respawn(); go('play'); }
      else go(a as Screen);
    });
    return el;
  }
  function renderPause() {
    const h = api.hud(), m = h.mission;
    $(scr.pause!, '.card').innerHTML = `<h3>Pauzë</h3>
      <div class="pinfo"><span>${m ? esc(MISSION_KIND[m.def.kind] + ' · ' + m.def.title) : esc(h.district)}</span><span>${IC.clock} ${fmtClock(h.timeOfDay)}</span></div>
      <div class="pgrid"><button class="btn pri big wide" data-a="resume">${IC.play}Vazhdo</button>
        <button class="btn" data-a="map">${IC.map}Harta</button><button class="btn" data-a="settings">${IC.gear}Cilësimet</button>
        ${m ? `<button class="btn warn" data-a="abort">${IC.flagX}Braktis misionin</button>` : ''}
        <button class="btn" data-a="respawn">${IC.garageHome}Kthehu në garazh</button>
        <button class="btn dng ${m ? '' : 'wide'}" data-a="menu">${IC.exit}Menuja</button></div>`;
  }

  // ---------- Brifingu ----------
  function buildBrief() {
    const el = html(`<div class="scr cen dim blk"><div class="card"></div></div>`);
    el.addEventListener('click', e => {
      const a = ((e.target as HTMLElement).closest('[data-a]') as HTMLElement | null)?.dataset.a;
      if (!a) return;
      ctx.sfx('click');
      const f = briefAccept; briefAccept = null;
      go('play');
      if (a === 'ok' && f) f();
    });
    return el;
  }
  function showBriefing(def: MissionDef, onAccept: () => void) {
    if (!api) return;
    briefAccept = onAccept;
    const d = ctx.district(def.district);
    $(scr.briefing!, '.card').innerHTML = `<div class="bkind"><i>${missionIcon(def.kind)}</i><div><span class="eb">${MISSION_KIND[def.kind]}</span><h3>${esc(def.title)}</h3></div></div>
      <div class="tags">${d ? `<span class="tag"><i style="background:${hex(d.color)}"></i>${esc(d.name)}</span>` : ''}<span class="tag">${IC.star} Niveli ${def.unlockLevel}+</span>
        ${def.requiresProperty ? `<span class="tag">${IC.building} Biznes</span>` : ''}</div>
      <p class="btxt">${esc(def.brief)}</p>
      <div class="rew"><div><span class="eb">Shpërblimi</span><b><span class="coin">${IC.coin}</span>${fmtMoney(def.reward)}</b></div>
        <div><span class="eb">Përvoja</span><b style="color:var(--gold)">+${fmtInt(def.xp)} XP</b></div></div>
      <div class="brow"><button class="btn" data-a="no">Jo tani</button><button class="btn pri" data-a="ok">${IC.check}Prano</button></div>`;
    go('briefing');
  }

  // ---------- Rezultati ----------
  function buildResult() {
    const el = html(`<div class="scr cen dim blk"><div class="card res"></div></div>`);
    el.addEventListener('click', e => { if ((e.target as HTMLElement).closest('[data-a]')) { ctx.sfx('click'); go('play'); } });
    return el;
  }
  function showResult(r: MissionResult) {
    if (!api) return;
    const c = $(scr.result!, '.card');
    c.className = 'card res ' + (r.success ? 'win' : 'fail');
    const st = [0, 1, 2].map(i => i < r.stars ? IC.star.replace('class="ic"', `class="ic f" style="animation-delay:${0.15 + i * 0.2}s"`) : IC.star).join('');
    c.innerHTML = `<h3>${r.success ? 'Misioni u krye!' : 'Misioni dështoi'}</h3><div class="rtitle">${esc(r.def.title)}</div>
      ${r.success ? `<div class="rst">${st}</div>` : ''}
      <div class="rew"><div><span class="eb">Para</span><b><span class="coin">${IC.coin}</span>${r.reward > 0 ? '+' : ''}${fmtMoney(r.reward)}</b></div>
        <div><span class="eb">Përvoja</span><b style="color:var(--gold)">+${fmtInt(r.xp)} XP</b></div></div>
      ${r.lines.length ? `<div class="rlines">${r.lines.map(l => { const i = l.indexOf(':'); return i > 0 ? `<div><span>${esc(l.slice(0, i))}</span><span>${esc(l.slice(i + 1).trim())}</span></div>` : `<div><span>${esc(l)}</span></div>`; }).join('')}</div>` : ''}
      <button class="btn pri big" data-a="ok">Vazhdo</button>`;
    go('result');
  }

  // ---------- Bizneset ----------
  function buildBusiness() {
    const el = html(`<div class="scr page opq blk"></div>`);
    el.appendChild(header('Bizneset', api, toMenu));
    el.appendChild(html(`<div class="body"></div>`));
    el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('[data-buy],[data-a]') as HTMLElement | null;
      if (!b) return;
      if (b.dataset.a === 'collect') {
        const n = api.progression.collectIncome();
        if (n > 0) { ctx.sfx('coin'); toast(`Mblodhe ${fmtMoney(n)}!`, 'good'); }
      } else if (b.dataset.a === 'gps') {
        const d = api.properties.find(x => x.id === b.dataset.id)!;
        ctx.setWaypoint({ x: d.x, z: d.z, label: d.name }); ctx.sfx('checkpoint'); toast(`GPS: ${d.name}`, 'info'); return;
      } else if (b.dataset.buy) {
        const d = api.properties.find(x => x.id === b.dataset.buy)!;
        if (api.progression.buyProperty(d.id)) { ctx.sfx('coin'); toast(`Bleve ${d.name}!`, 'good'); }
        else { ctx.sfx('error'); toast('Nuk ke mjaftueshëm para.', 'bad'); }
      }
      refreshMoney(); renderBusiness();
    });
    return el;
  }
  function renderBusiness() {
    const p = prog.profile, own = new Set(p.properties), pend = prog.pendingIncome(), per = prog.incomePerHour();
    const cards = api.properties.map(d => {
      const k = PROP_KIND[d.kind], o = own.has(d.id), dist = ctx.district(d.district);
      const lock = dist && dist.unlockLevel > p.level;
      return `<div class="bc2 ${o ? 'own' : ''}"><div class="bh"><i style="background:${k.color}">${k.icon}</i><div><b>${esc(d.name)}</b><span>${k.name} · ${esc(dist?.name ?? '')}</span></div></div>
        <div class="bstat"><div><small>Çmimi</small><b>${fmtMoney(d.price)}</b></div><div><small>Fitimi / orë</small><b style="color:var(--ok)">+${fmtMoney(d.incomePerHour)}</b></div></div>
        <div class="perk">${IC.star}<span>${esc(d.unlocks)}</span></div>
        <div class="gact">${o ? `<div class="owned" style="flex:1">${IC.check}E jotja</div>`
          : lock ? `<button class="btn" disabled>${IC.lock}Niveli ${dist!.unlockLevel}</button>`
          : `<button class="btn gold" data-buy="${d.id}" ${p.money < d.price ? 'disabled' : ''}>Bli</button>`}
          <button class="ibtn" data-a="gps" data-id="${d.id}" aria-label="Shfaq në hartë">${IC.pin}</button></div></div>`;
    }).join('');
    $(scr.business!, '.body').innerHTML = `<div class="bsum"><div><b>+${fmtMoney(pend)}</b><span>Të ardhura në pritje · ${fmtMoney(per)}/orë (deri në 8 orë)</span></div>
      <button class="btn gold" data-a="collect" ${pend > 0 ? '' : 'disabled'}>${IC.coin}Mblidh</button></div><div class="bgrid">${cards}</div>`;
  }

  // ---------- Cilësimet ----------
  function buildSettings() {
    const el = html(`<div class="scr page opq blk"></div>`);
    el.appendChild(header('Cilësimet', api, back));
    el.appendChild(html(`<div class="body"></div>`));
    const set = (patch: Partial<Settings>) => { api.progression.updateSettings(patch); ctx.sfx('click'); renderSettings(); };
    el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('[data-k]') as HTMLElement | null;
      if (!b) return;
      const k = b.dataset.k as keyof Settings, v = b.dataset.v;
      const s = prog.profile.settings;
      if (v === undefined) set({ [k]: !s[k] } as Partial<Settings>);
      else set({ [k]: v } as Partial<Settings>);
    });
    el.addEventListener('input', e => {
      const r = e.target as HTMLInputElement;
      const k = r.dataset.r as 'tiltSensitivity' | 'trafficDensity';
      if (!k) return;
      const v = +r.value;
      r.style.setProperty('--p', ((v - +r.min) / (+r.max - +r.min) * 100).toFixed(1) + '%');
      const out = r.closest('.sld')!.querySelector('output')!;
      out.textContent = k === 'tiltSensitivity' ? v.toFixed(1).replace('.', ',') + '×' : Math.round(v * 100) + '%';
      api.progression.updateSettings({ [k]: v });
    });
    return el;
  }
  function renderSettings() {
    const s = prog.profile.settings;
    const opt = (v: string, icon: string, name: string, txt: string) =>
      `<button class="opt ${s.controls === v ? 'on' : ''}" data-k="controls" data-v="${v}">${icon}<div><b>${name}</b><span>${txt}</span></div><span class="rad"></span></button>`;
    const seg = (k: keyof Settings, items: [string, string][]) =>
      `<div class="seg">${items.map(([v, n]) => `<button class="${s[k] === v ? 'on' : ''}" data-k="${k}" data-v="${v}">${n}</button>`).join('')}</div>`;
    const sld = (k: 'tiltSensitivity' | 'trafficDensity', icon: string, name: string, min: number, max: number, step: number, val: string, off = false) =>
      `<div class="sld ${off ? 'off' : ''}"><div class="row">${icon}<div><b>${name}</b></div><output>${val}</output></div>
        <input type="range" data-r="${k}" min="${min}" max="${max}" step="${step}" value="${s[k]}" style="--p:${((s[k] - min) / (max - min) * 100).toFixed(1)}%" ${off ? 'disabled' : ''}></div>`;
    const tg = (k: 'sound' | 'music' | 'vibration', icon: string, name: string, txt: string) =>
      `<button class="row" data-k="${k}" style="width:100%">${icon}<div><b>${name}</b><small>${txt}</small></div><span class="tg ${s[k] ? 'on' : ''}"></span></button>`;
    $(scr.settings!, '.body').innerHTML = `<div class="sgrid"><div>
      <div class="sec">Kontrollet</div><div class="opts">
        ${opt('wheel', IC.wheelCtl, 'Timon + pedale', 'Timon majtas, gaz dhe frena djathtas. Më i sakti.')}
        ${opt('tilt', IC.tiltCtl, 'Anim i telefonit', 'Anoje telefonin për të kthyer. Pedalet mbeten në ekran.')}
        ${opt('lanes', IC.lanesCtl, 'Korsi (e lehtë)', 'Prek majtas/djathtas për të ndërruar korsi. Makina drejton vetë.')}
      </div><div style="height:10px"></div>
      ${sld('tiltSensitivity', IC.tiltCtl, 'Ndjeshmëria e animit', 0.5, 2, 0.1, s.tiltSensitivity.toFixed(1).replace('.', ',') + '×', s.controls !== 'tilt')}
      <div class="sec">Kamera</div>${seg('camera', [['chase', 'Pas makinës'], ['far', 'Larg'], ['hood', 'Kapaku']])}
      </div><div>
      <div class="sec">Grafika</div>${seg('quality', [['low', 'E ulët'], ['medium', 'Mesatare'], ['high', 'E lartë']])}
      <div style="height:10px"></div>${sld('trafficDensity', IC.traffic, 'Dendësia e trafikut', 0.3, 1, 0.05, Math.round(s.trafficDensity * 100) + '%')}
      <div class="sec">Zëri dhe dridhja</div>
      ${tg('sound', IC.sound, 'Efektet zanore', 'Motori, borija, përplasjet')}${tg('music', IC.music, 'Muzika', 'Radioja e qytetit')}${tg('vibration', IC.vibrate, 'Dridhja', 'Në përplasje dhe në kontroll')}
      </div></div>`;
  }

  // ---------- Ngjarjet ----------
  function wire() {
    const ev = api.events;
    ev.on('missionEnded', r => { if (!suppressResult) showResult(r); });
    ev.on('toast', e => toast(e.text, e.kind));
    ev.on('money', e => { refreshMoney(); if (screen === 'play' && e.amount !== 0) hud.moneyFloat(e.amount); });
    ev.on('speedCamera', e => toast(`Radar: ${Math.round(e.speed * 3.6)} km/h (limiti ${Math.round(e.limit * 3.6)}) · gjobë ${fmtMoney(e.fine)}`, 'bad'));
    ev.on('busted', e => { hud.sign('bust', 'Policia', 'ARRESTUAR', 3000); toast(`Gjobë ${fmtMoney(e.fine)}`, 'bad'); });
    ev.on('districtEntered', e => { if (screen === 'play') hud.sign('', `${IC.pin}Po hyn në`, e.district.name); });
    ev.on('districtLocked', e => { hud.sign('lock', `${IC.lock}Hapet në nivelin ${e.district.unlockLevel}`, e.district.name, 3000); });
    ev.on('levelUp', e => {
      lvup.innerHTML = `<em>NIVEL I RI</em><b>${e.level}</b><span>Makina, lagje dhe misione të reja!</span>`;
      lvup.classList.remove('on'); void lvup.offsetWidth; lvup.classList.add('on');
      setTimeout(() => lvup.classList.remove('on'), 3500);
    });
    prog.onChange?.(() => { refreshMoney(); });
  }

  const ui: UiX = {
    get screen() { return screen; },
    mount(r, a) {
      root = r; api = a; prog = a.progression as ProgressionX;
      if (!document.getElementById('tru-css')) { const st = document.createElement('style'); st.id = 'tru-css'; st.textContent = CSS + EXTRA; document.head.appendChild(st); }
      tru = html(`<div class="tru" data-s="title" style="position:absolute;inset:0"></div>`);
      root.appendChild(tru);
      hud = createHud(ctx);
      tru.appendChild(hud.el);
      scr.title = buildTitle();
      scr.menu = buildMenu();
      scr.pause = buildPause();
      scr.briefing = buildBrief();
      scr.result = buildResult();
      mapS = createMapScreen(ctx, back); scr.map = mapS.el;
      gar = createGarage(ctx, toMenu); scr.garage = gar.el;
      scr.business = buildBusiness();
      scr.settings = buildSettings();
      for (const k in scr) tru.appendChild(scr[k as Screen]!);
      lvup = html(`<div class="lvup"></div>`);
      toasts = html(`<div class="toasts"></div>`);
      tru.append(lvup, toasts);
      wire();
      screen = 'menu'; // që go('title') të zbatohet
      go('title');
    },
    update(dt) {
      if (!api) return;
      if (HUD_ON.has(screen)) hud.update(dt, api.hud());
      if (screen === 'map') mapS.update(dt);
      else if (screen === 'garage') gar.update(dt);
      else if (screen === 'menu' && (menuT -= dt) <= 0) {
        menuT = 1;
        const has = prog.pendingIncome() > 0;
        if (has !== !!(scr.menu as any).__pend || has) {
          const b = scr.menu!.querySelector('[data-a=collect] small') as HTMLElement | null;
          if (b) setText(b, '+' + fmtMoney(prog.pendingIncome())); else if (has) renderMenu();
        }
      }
    },
    showBriefing,
    showResult,
  };
  return ui;
}

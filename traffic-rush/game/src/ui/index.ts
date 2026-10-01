// UI e përkohshme minimale (zëvendësohet nga UI e plotë): titulli, HUD-i bazë, pauza me cilësimet.
import type { GameApi, MissionDef, MissionResult, UiSystem, Settings } from '../core/contracts';

const CSS = `
#ui .p{pointer-events:auto}
#ui .title{position:absolute;inset:0;display:grid;place-content:center;text-align:center;gap:10px;background:linear-gradient(transparent 40%,rgba(10,12,16,.85));}
#ui .title h1{margin:0;font:800 clamp(3rem,14vmin,6rem)/.85 "Saira Extra Condensed","Arial Narrow",sans-serif;letter-spacing:.02em;text-shadow:0 4px 18px rgba(0,0,0,.5)}
#ui .title h1 span{display:block;color:#ff5a2e;font-size:.55em;letter-spacing:.3em}
#ui .title p{font:600 1.1rem Barlow,Arial,sans-serif;opacity:.9}
#ui .hud{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);transform:translateX(-50%);text-align:center;font:800 2.6rem/1 "Saira Extra Condensed","Arial Narrow",sans-serif;text-shadow:0 2px 6px rgba(0,0,0,.6);font-variant-numeric:tabular-nums}
#ui .hud small{display:block;font:600 .8rem Barlow,Arial,sans-serif}
#ui .top{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);left:12px;right:12px;display:flex;justify-content:space-between;align-items:flex-start;font:700 1rem Barlow,Arial,sans-serif;text-shadow:0 1px 4px rgba(0,0,0,.7)}
#ui .btn{border:1px solid rgba(255,255,255,.25);background:rgba(14,17,22,.86);color:#f4f1e8;border-radius:12px;padding:12px 16px;font:700 1rem Barlow,Arial,sans-serif;min-height:44px}
#ui .btn.on{background:#ff5a2e;border-color:#ff5a2e}
#ui .panel{position:absolute;inset:0;display:grid;place-items:center;background:rgba(8,10,14,.6);overflow:auto}
#ui .box{background:rgba(14,17,22,.94);border:1px solid rgba(255,255,255,.18);border-radius:16px;padding:18px;width:min(92vw,460px);display:grid;gap:12px;color:#f4f1e8;font:600 1rem Barlow,Arial,sans-serif;margin:16px}
#ui .box h2{margin:0;font:800 2rem "Saira Extra Condensed",sans-serif}
#ui .row{display:flex;gap:8px;flex-wrap:wrap}
#ui .toast{position:absolute;top:22%;left:50%;transform:translateX(-50%);background:rgba(14,17,22,.9);padding:10px 16px;border-radius:12px;font:700 1rem Barlow,Arial,sans-serif;white-space:nowrap}
`;

export function createUi(): UiSystem & { showBriefing(def: MissionDef, onAccept: () => void): void; showResult(r: MissionResult): void } {
  let screen = 'title';
  let api: GameApi;
  let root: HTMLElement;
  const el = (h: string) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstElementChild as HTMLElement; };
  let title: HTMLElement, hud: HTMLElement, top: HTMLElement, panel: HTMLElement | null = null, toastEl: HTMLElement;
  let last = '';

  function setScreen(s: string) {
    screen = s;
    title.hidden = s !== 'title';
    hud.hidden = top.hidden = !(s === 'play' || s === 'pause');
    if (s !== 'pause' && panel) { panel.remove(); panel = null; }
    api.pause(s === 'pause');
  }

  function choice<K extends keyof Settings>(label: string, key: K, opts: [Settings[K], string][]) {
    const s = api.progression.profile.settings;
    return `<div>${label}<div class="row">${opts.map(([v, t]) => `<button class="btn p ${s[key] === v ? 'on' : ''}" data-k="${String(key)}" data-v="${String(v)}">${t}</button>`).join('')}</div></div>`;
  }

  function openPause() {
    setScreen('pause');
    panel = el(`<div class="panel p"><div class="box">
      <h2>Pauzë</h2>
      ${choice('Kontrolli', 'controls', [['wheel', 'Timon + pedale'], ['tilt', 'Anim i telefonit'], ['lanes', 'Korsi (e lehtë)']])}
      ${choice('Kamera', 'camera', [['chase', 'Pas makinës'], ['far', 'Larg'], ['hood', 'Kapaku']])}
      ${choice('Cilësia', 'quality', [['low', 'E ulët'], ['medium', 'Mesatare'], ['high', 'E lartë']])}
      ${choice('Zëri', 'sound', [[true, 'Po'], [false, 'Jo']])}
      ${choice('Muzika', 'music', [[true, 'Po'], [false, 'Jo']])}
      <div class="row"><button class="btn p on" data-a="resume">Vazhdo</button><button class="btn p" data-a="respawn">Kthehu në garazh</button></div>
    </div></div>`);
    panel.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (!b) return;
      api.audio.ui('click');
      if (b.dataset.a === 'resume') { setScreen('play'); return; }
      if (b.dataset.a === 'respawn') { api.respawn(); setScreen('play'); return; }
      const k = b.dataset.k as keyof Settings, raw = b.dataset.v!;
      const v = raw === 'true' ? true : raw === 'false' ? false : raw;
      api.progression.updateSettings({ [k]: v } as Partial<Settings>);
      b.parentElement!.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    });
    root.appendChild(panel);
  }

  let toastT = 0;
  function toast(t: string) { toastEl.textContent = t; toastEl.hidden = false; toastT = 2.5; }

  return {
    get screen() { return screen; },
    mount(r, a) {
      root = r; api = a;
      const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      title = el(`<div class="title p"><h1>TRAFFIC RUSH<span>QYTETI</span></h1><p>Prek për të filluar</p></div>`);
      hud = el(`<div class="hud"></div>`);
      top = el(`<div class="top"><div class="info"></div><button class="btn p" aria-label="Pauzë">II</button></div>`);
      toastEl = el(`<div class="toast" hidden></div>`);
      root.append(title, hud, top, toastEl);
      title.addEventListener('click', () => { api.audio.unlock(); api.audio.ui('click'); setScreen('play'); });
      top.querySelector('button')!.addEventListener('click', () => { api.audio.ui('click'); openPause(); });
      api.events.on('toast', e => toast(e.text));
      api.events.on('districtEntered', e => toast(e.district.name));
      api.events.on('districtLocked', e => toast(`${e.district.name} — hapet në nivelin ${e.district.unlockLevel}`));
      setScreen('title');
    },
    update(dt) {
      if (toastT > 0 && (toastT -= dt) <= 0) toastEl.hidden = true;
      if (screen !== 'play') return;
      const h = api.hud();
      const hh = String(Math.floor(h.timeOfDay)).padStart(2, '0'), mm = String(Math.floor((h.timeOfDay % 1) * 60)).padStart(2, '0');
      const s = `${Math.round(h.speedKmh)}|${h.gear}|${h.district}|${hh}${mm}|${h.speedLimitKmh}`;
      if (s === last) return;
      last = s;
      hud.innerHTML = `${Math.round(h.speedKmh)}<small>km/h · marsha ${h.gear}${h.speedLimitKmh ? ` · limiti ${h.speedLimitKmh}` : ''}</small>`;
      (top.querySelector('.info') as HTMLElement).textContent = `${h.district} · ${hh}:${mm}`;
    },
    showBriefing(_def, onAccept) { onAccept(); },
    showResult(r) { toast(r.success ? 'Misioni u krye!' : 'Misioni dështoi'); },
  };
}

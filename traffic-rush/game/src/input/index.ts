/**
 * Kontrollet e lojtarit: timon (rrëshqitës + pedale), anim i telefonit (tilt), korsi (ndihmë automatike)
 * dhe tastiera. Kontrollet në ekran zënë vetëm këndet poshtë-majtas dhe poshtë-djathtas.
 */
import type { CityWorld, ControlScheme, FrameContext, InputSystem, Vehicle, VehicleInput } from '../core/contracts';
import { clamp, DEG, smooth } from '../core/math';
import { LaneAssist } from './lanes';

export { LaneAssist } from './lanes';
export type { Turn } from './lanes';

export interface InputDeps {
  getCity: () => CityWorld | null;
  getPlayer: () => Vehicle | null;
  vibrate?: (ms: number) => void;
}

/** InputSystem + shtesat (opsionale për main.ts). */
export type GameInput = InputSystem & {
  tiltSensitivity: number;
  /** Rivendos pozicionin neutral të animit. */
  calibrate(): void;
  /** Ndihma e korsisë (për debug/HUD). */
  readonly lanes: LaneAssist;
};

// ---------- Ikonat (24×24, vija me currentColor) ----------
const svg = (b: string, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${b}</svg>`;
const IC = {
  wheel: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/><path d="M3.8 11.2h6M14.2 11.2h6M12 14.2v6.2"/>'),
  chevL: svg('<path d="M14.5 6l-6 6 6 6"/>', 'tri-chev'),
  chevR: svg('<path d="M9.5 6l6 6-6 6"/>', 'tri-chev'),
  hand: svg('<circle cx="12" cy="12" r="6.3"/><path d="M10.4 15.3V8.7h2.3a1.9 1.9 0 0 1 0 3.8h-2.3"/><path d="M4.6 6.8a9.5 9.5 0 0 0 0 10.4M19.4 6.8a9.5 9.5 0 0 1 0 10.4"/>'),
  bolt: svg('<path d="M13.2 2.8L5.6 13.4h5.6l-1 7.8 7.6-10.6h-5.6z" fill="currentColor" stroke="none"/>'),
  horn: svg('<path d="M3.5 10v4h3.2l5.8 4V6l-5.8 4z"/><path d="M15.8 9.2a4 4 0 0 1 0 5.6M18.4 6.6a7.6 7.6 0 0 1 0 10.8"/>'),
  left: svg('<path d="M14.5 5.5L8 12l6.5 6.5"/>'),
  right: svg('<path d="M9.5 5.5L16 12l-6.5 6.5"/>'),
  up: svg('<path d="M6.5 13.5L12 8l5.5 5.5"/>'),
  down: svg('<path d="M6.5 10.5L12 16l5.5-5.5"/>'),
  target: svg('<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>'),
  turn: svg('<path d="M7 21v-7.5a4.5 4.5 0 0 1 4.5-4.5H19"/><path d="M14.5 4.5L19 9l-4.5 4.5"/>'),
  lane: svg('<path d="M8 21v-5.5l8-6.5V3.5"/><path d="M12.4 6.6L16 3l3.6 3.6"/>'),
  straight: svg('<path d="M12 21V4"/><path d="M7.5 8.5L12 4l4.5 4.5"/>'),
};

const CSS = `
.tri{position:absolute;inset:0;pointer-events:none;--u:min(1vmin,6.4px);color:#f4f1e8;
 font-family:"Saira Extra Condensed","Arial Narrow",sans-serif;-webkit-user-select:none;user-select:none;
 -webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
.tri[hidden],.tri [hidden]{display:none!important}
.tri svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tri .c{pointer-events:auto;touch-action:none;cursor:pointer}
.tri-l,.tri-r{position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 3*var(--u))}
.tri-l{left:calc(env(safe-area-inset-left,0px) + 3*var(--u))}
.tri-r{right:calc(env(safe-area-inset-right,0px) + 3*var(--u));display:flex;flex-direction:column;align-items:flex-end;gap:calc(2.4*var(--u))}
.tri-panel{background:linear-gradient(180deg,rgba(30,35,43,.66),rgba(14,17,22,.6));border:1.5px solid rgba(255,255,255,.2);
 box-shadow:0 4px 14px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.08)}
.tri-steer,.tri-tilt,.tri-lanes{display:none}
.tri[data-scheme=wheel] .tri-steer,.tri[data-scheme=tilt] .tri-tilt,.tri[data-scheme=lanes] .tri-lanes{display:flex}
.tri-steer{width:min(calc(42vw - 8*var(--u)),calc(72*var(--u)));
 height:calc(24*var(--u));align-items:flex-end}
.tri-track{position:relative;width:100%;height:calc(13*var(--u));border-radius:calc(6.5*var(--u));box-sizing:border-box}
.tri-track::before{content:"";position:absolute;left:50%;top:22%;bottom:22%;width:2px;margin-left:-1px;background:rgba(255,255,255,.28);border-radius:1px}
.tri-chev{position:absolute;top:50%;width:calc(6*var(--u))!important;height:calc(6*var(--u))!important;margin-top:calc(-3*var(--u));opacity:.5}
.tri-track>.tri-chev:first-of-type{left:calc(1.6*var(--u))}
.tri-track>.tri-chev:last-of-type{right:calc(1.6*var(--u))}
.tri-fill{position:absolute;top:28%;bottom:28%;left:50%;width:0;border-radius:calc(2*var(--u));background:rgba(255,90,46,.55)}
.tri-knob{position:absolute;left:50%;top:50%;width:calc(15.5*var(--u));height:calc(15.5*var(--u));margin:calc(-7.75*var(--u)) 0 0 calc(-7.75*var(--u));
 border-radius:50%;box-sizing:border-box;padding:calc(2.6*var(--u));background:radial-gradient(circle at 50% 30%,rgba(90,98,112,.95),rgba(32,37,46,.95));
 border:2px solid rgba(255,255,255,.62);box-shadow:0 4px 12px rgba(0,0,0,.45);transition:transform .24s cubic-bezier(.3,1.45,.55,1),border-color .15s}
.tri-steer.on .tri-knob{transition:none;border-color:#ff5a2e;box-shadow:0 0 0 calc(1.2*var(--u)) rgba(255,90,46,.22),0 4px 12px rgba(0,0,0,.45)}
.tri-pedals{display:flex;gap:calc(2.4*var(--u));align-items:flex-end}
.tri-pedal{position:relative;width:calc(17.5*var(--u));border-radius:calc(3.6*var(--u));display:flex;flex-direction:column;align-items:center;
 justify-content:flex-end;padding-bottom:calc(2*var(--u));box-sizing:border-box;overflow:hidden;transition:transform .07s,background .07s}
.tri-pedal::before{content:"";position:absolute;left:22%;right:22%;top:calc(3*var(--u));bottom:calc(10.5*var(--u));border-radius:calc(1.4*var(--u));
 background:repeating-linear-gradient(180deg,rgba(255,255,255,.16) 0 calc(.8*var(--u)),transparent 0 calc(2.6*var(--u)))}
.tri-pedal svg{width:calc(5*var(--u));height:calc(5*var(--u));margin-bottom:calc(-.6*var(--u))}
.tri-pedal b{font-weight:800;font-size:calc(4.3*var(--u));letter-spacing:.06em;line-height:1}
.tri-gas{height:calc(30*var(--u))}
.tri-brake{height:calc(23*var(--u))}
.tri-pedal.on{transform:scale(.95) translateY(calc(.6*var(--u)))}
.tri-gas.on{background:linear-gradient(180deg,rgba(30,160,96,.88),rgba(14,106,64,.88));border-color:#7dffb8}
.tri-brake.on{background:linear-gradient(180deg,rgba(255,110,64,.88),rgba(176,52,22,.88));border-color:#ffb199}
.tri-btns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:calc(2*var(--u));width:calc(37.4*var(--u))}
.tri-btn{aspect-ratio:1/1;min-width:0;overflow:hidden;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(.2*var(--u));box-sizing:border-box;transition:transform .07s}
.tri-btn svg{width:calc(5.4*var(--u));height:calc(5.4*var(--u))}
.tri-btn span{font-size:calc(2.4*var(--u));font-weight:700;letter-spacing:0;font-stretch:condensed;text-transform:uppercase;line-height:1}
.tri-btn.on{transform:scale(.93);background:linear-gradient(180deg,rgba(255,110,64,.85),rgba(176,52,22,.85));border-color:#ffb199}
.tri-nitro{--f:1;color:#ffc933;background:linear-gradient(0deg,rgba(255,201,51,.36) calc(var(--f)*100%),rgba(14,17,22,.62) 0)}
.tri-nitro.on{color:#1a1408;background:linear-gradient(0deg,#ffc933 calc(var(--f)*100%),rgba(120,90,10,.8) 0);border-color:#fff3c4;box-shadow:0 0 calc(3*var(--u)) rgba(255,201,51,.6)}
.tri-nitro.empty{opacity:.45}
.tri-tilt,.tri-lanes{width:min(calc(42vw - 8*var(--u)),calc(72*var(--u)));flex-direction:column;gap:calc(2*var(--u))}
.tri-row{display:flex;align-items:center;gap:calc(2*var(--u))}
.tri-cal{flex:none;overflow:visible!important;width:auto!important;aspect-ratio:auto!important;border-radius:calc(5*var(--u))!important;flex-direction:row!important;padding:0 calc(2.4*var(--u));height:calc(10*var(--u));gap:calc(1.2*var(--u))!important}
.tri-cal span{font-size:calc(3.4*var(--u))!important}
.tri-cal svg{flex:none}
.tri-hint{font:600 calc(3*var(--u))/1.15 Barlow,Arial,sans-serif;color:#c9ced6;text-shadow:0 1px 3px rgba(0,0,0,.8)}
.tri-needle{position:absolute;left:50%;top:14%;bottom:14%;width:calc(3*var(--u));margin-left:calc(-1.5*var(--u));border-radius:calc(1.5*var(--u));background:#ff5a2e;box-shadow:0 0 calc(2*var(--u)) rgba(255,90,46,.6)}
.tri-tilt .tri-track{height:calc(9*var(--u))}
.tri-lanes{gap:calc(1.4*var(--u))}
.tri-lt{display:flex;align-items:baseline;gap:calc(1.6*var(--u));padding-left:calc(1.5*var(--u));text-shadow:0 1px 3px rgba(0,0,0,.85);white-space:nowrap}
.tri-lt b{font-size:calc(4.4*var(--u));letter-spacing:.08em}
.tri-lt span{font:600 calc(2.8*var(--u)) Barlow,Arial,sans-serif;color:#c9ced6}
.tri-lrow{display:flex;height:calc(15*var(--u));border-radius:calc(4.5*var(--u));overflow:hidden}
.tri-arrow{flex:1 1 0;border-radius:0!important;aspect-ratio:auto!important;border:0!important;background:transparent!important}
.tri-arrow+.tri-arrow{border-left:1.5px solid rgba(255,255,255,.18)!important}
.tri-arrow svg{width:calc(8.5*var(--u));height:calc(8.5*var(--u));stroke-width:2.6}
.tri-arrow.on{background:rgba(255,90,46,.6)!important;transform:none}
.tri-turn{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 24vh);transform:translateX(-50%);display:flex;align-items:center;gap:calc(2*var(--u));
 padding:calc(1.6*var(--u)) calc(4*var(--u)) calc(1.6*var(--u)) calc(2.4*var(--u));border-radius:calc(4*var(--u));background:rgba(14,17,22,.72);
 border:2px solid #ffc933;color:#ffc933;white-space:nowrap;animation:tri-pop .25s ease-out}
.tri-turn svg{width:calc(10*var(--u));height:calc(10*var(--u));stroke-width:2.6}
.tri-turn b{font-size:calc(6*var(--u));font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.tri-turn.left svg{transform:scaleX(-1)}
@keyframes tri-pop{from{transform:translateX(-50%) scale(.8);opacity:0}}
@media (orientation:landscape){
 .tri-r{flex-direction:row;align-items:flex-end}
 .tri-btns{grid-template-columns:repeat(2,calc(13.5*var(--u)));grid-template-rows:repeat(2,calc(13.5*var(--u)));width:auto}
 .tri-btns .tri-nitro{grid-column:2;grid-row:1/3;border-radius:calc(6.75*var(--u));aspect-ratio:auto}
 .tri-turn{top:calc(env(safe-area-inset-top,0px) + 22vh)}
}`;

export function createInput(root: HTMLElement, deps: InputDeps): GameInput {
  if (!document.getElementById('tri-style')) {
    const st = document.createElement('style');
    st.id = 'tri-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const el = document.createElement('div');
  el.className = 'tri';
  el.innerHTML = `
  <div class="tri-l">
    <div class="tri-steer c" role="slider" aria-label="Timoni"><div class="tri-track tri-panel">${IC.chevL}${IC.chevR}<div class="tri-fill"></div><div class="tri-knob">${IC.wheel}</div></div></div>
    <div class="tri-tilt">
      <div class="tri-row"><div class="c tri-btn tri-panel tri-cal" role="button">${IC.target}<span>Kalibro</span></div><div class="tri-hint">Anim telefonin për të kthyer</div></div>
      <div class="tri-track tri-panel">${IC.chevL}${IC.chevR}<div class="tri-needle"></div></div>
    </div>
    <div class="tri-lanes">
      <div class="tri-lt"><b>KORSI</b><span>rrëshqit ← → në ekran</span></div>
      <div class="tri-lrow tri-panel c" data-tri-swipe>
        <div class="c tri-btn tri-arrow" data-side="-1" role="button" aria-label="Majtas">${IC.left}</div>
        <div class="c tri-btn tri-arrow" data-side="1" role="button" aria-label="Djathtas">${IC.right}</div>
      </div>
    </div>
  </div>
  <div class="tri-r">
    <div class="tri-btns">
      <div class="c tri-btn tri-panel tri-horn" role="button">${IC.horn}<span>Bori</span></div>
      <div class="c tri-btn tri-panel tri-hb" role="button">${IC.hand}<span>Dorezë</span></div>
      <div class="c tri-btn tri-panel tri-nitro" role="button">${IC.bolt}<span>Nitro</span></div>
    </div>
    <div class="tri-pedals">
      <div class="c tri-pedal tri-panel tri-brake" role="button">${IC.down}<b>FRENA</b></div>
      <div class="c tri-pedal tri-panel tri-gas" role="button">${IC.up}<b>GAZ</b></div>
    </div>
  </div>
  <div class="tri-turn" hidden>${IC.turn}<b></b></div>`;
  root.appendChild(el);
  const q = <T extends HTMLElement = HTMLElement>(s: string) => el.querySelector(s) as T;
  const steerEl = q('.tri-steer'), knob = q('.tri-knob'), fill = q('.tri-fill');
  const needle = q('.tri-needle'), hintEl = q('.tri-hint');
  const nitroEl = q('.tri-nitro'), brakeLabel = q('.tri-brake b');
  const turnEl = q('.tri-turn'), turnLabel = q('.tri-turn b');

  const assist = new LaneAssist();
  const out: VehicleInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false, horn: false };
  const vib = (ms: number) => { try { deps.vibrate?.(ms); } catch { /* asgjë */ } };

  let scheme: ControlScheme = 'wheel';
  let visible = true;
  let tiltSensitivity = 1;
  // Gjendja e prekjeve.
  let gas = false, brake = false, hb = false, nitro = false, horn = false;
  let steerId: number | null = null, touchSteer = 0, steerCx = 0, steerHalf = 1;
  // Tastiera.
  const keys = new Set<string>();
  // Vlerat e zbutura.
  let thr = 0, brk = 0, steer = 0;
  // Animi.
  let tiltRoll = 0, tiltNeutral = 0, tiltSeen = false, needCalib = true, tiltSince = 0;
  // Treguesit.
  let laneFlash = 0, laneFlashSide = 0, flashKind: 'lane' | 'cancel' = 'lane';
  let turnKey = '', fuelShown = -1, revShown = false, blinkersOwned = false;
  let lastKnobPx = NaN, lastNeedle = NaN;

  // ---------- Ndihmës për prekjet ----------
  const listeners: [EventTarget, string, EventListener, AddEventListenerOptions | boolean | undefined][] = [];
  function on(t: EventTarget, type: string, fn: (e: any) => void, opt?: AddEventListenerOptions | boolean) {
    t.addEventListener(type, fn as EventListener, opt);
    listeners.push([t, type, fn as EventListener, opt]);
  }
  // Pa zmadhim, pa menu me shtypje të gjatë, pa zgjedhje teksti.
  on(el, 'touchstart', (e: TouchEvent) => { if ((e.target as Element).closest('.c')) e.preventDefault(); }, { passive: false });
  on(el, 'contextmenu', (e: Event) => e.preventDefault());
  on(el, 'selectstart', (e: Event) => e.preventDefault());

  const releasers: (() => void)[] = [];
  /** Buton që mbahet shtypur; mbështet disa gishta (pointer capture për secilin). */
  function hold(sel: string, set: (down: boolean) => void, onDown?: () => void) {
    const b = q(sel);
    const ids = new Set<number>();
    const up = (e: PointerEvent) => {
      if (!ids.delete(e.pointerId) || ids.size) return;
      b.classList.remove('on');
      set(false);
    };
    on(b, 'pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      try { b.setPointerCapture(e.pointerId); } catch { /* asgjë */ }
      if (!ids.size) { b.classList.add('on'); set(true); onDown?.(); }
      ids.add(e.pointerId);
    });
    on(b, 'pointerup', up); on(b, 'pointercancel', up); on(b, 'lostpointercapture', up);
    releasers.push(() => { ids.clear(); b.classList.remove('on'); set(false); });
  }
  hold('.tri-gas', d => { gas = d; });
  hold('.tri-brake', d => { brake = d; });
  hold('.tri-hb', d => { hb = d; }, () => vib(12));
  hold('.tri-nitro', d => { nitro = d; }, () => vib(18));
  hold('.tri-horn', d => { horn = d; });

  // ---------- Timoni (rrëshqitës) ----------
  function steerFromX(x: number) {
    let u = clamp((x - steerCx) / steerHalf, -1, 1);
    const a = Math.abs(u), dz = 0.06;
    const k = a < dz ? 0 : (a - dz) / (1 - dz);
    u = Math.sign(u) * (0.45 * k + 0.55 * k * k);     // më i saktë rreth qendrës
    touchSteer = u;
    placeKnob((x - steerCx) / steerHalf);
  }
  function placeKnob(raw: number) {
    const px = Math.round(clamp(raw, -1, 1) * steerHalf);
    if (px === lastKnobPx) return;
    lastKnobPx = px;
    knob.style.transform = `translateX(${px}px) rotate(${clamp(raw, -1, 1) * 80}deg)`;
    fill.style.width = Math.abs(px) + 'px';
    fill.style.marginLeft = px < 0 ? px + 'px' : '0px';
  }
  on(steerEl, 'pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    try { steerEl.setPointerCapture(e.pointerId); } catch { /* asgjë */ }
    const r = steerEl.getBoundingClientRect(), kw = knob.offsetWidth || 50;
    steerCx = r.left + r.width / 2;
    steerHalf = Math.max(20, (r.width - kw) / 2);
    steerId = e.pointerId;
    steerEl.classList.add('on');
    steerFromX(e.clientX);
  });
  on(steerEl, 'pointermove', (e: PointerEvent) => { if (e.pointerId === steerId) steerFromX(e.clientX); });
  const steerUp = (e: PointerEvent) => {
    if (e.pointerId !== steerId) return;
    steerId = null; touchSteer = 0;
    steerEl.classList.remove('on');
    placeKnob(0);                                       // kthehet me "sustë" (tranzicion CSS)
  };
  on(steerEl, 'pointerup', steerUp); on(steerEl, 'pointercancel', steerUp); on(steerEl, 'lostpointercapture', steerUp);
  releasers.push(() => { steerId = null; touchSteer = 0; steerEl.classList.remove('on'); placeKnob(0); });

  // ---------- Korsi: rrëshqitjet ----------
  function doSwipe(side: -1 | 1) {
    if (scheme !== 'lanes') return;
    const city = deps.getCity(), p = deps.getPlayer();
    if (!city || !p) return;
    if (!assist.edge) assist.acquire(city, p.x, p.z, p.heading);
    const r = assist.swipe(city, side);
    if (!r) return;
    if (r === 'lane' || r === 'cancel') { laneFlash = 1.1; laneFlashSide = side; flashKind = r; }
    vib(r === 'turn' ? 14 : 8);
  }
  for (const a of el.querySelectorAll<HTMLElement>('.tri-arrow')) {
    const side = +(a.dataset.side ?? 1) as -1 | 1;
    on(a, 'pointerdown', (e: PointerEvent) => { e.preventDefault(); e.stopPropagation(); a.classList.add('on'); doSwipe(side); });
    const up = () => a.classList.remove('on');
    on(a, 'pointerup', up); on(a, 'pointercancel', up); on(a, 'pointerleave', up);
  }
  const swipes = new Map<number, { x: number; y: number; t: number; done: boolean }>();
  const swipeOk = (t: EventTarget | null) => {
    if (!(t instanceof Element)) return false;
    if (t.closest('.tri-arrow')) return false;
    return t instanceof HTMLCanvasElement || t === document.body || t === document.documentElement || !!t.closest('[data-tri-swipe]');
  };
  on(window, 'pointerdown', (e: PointerEvent) => {
    if (scheme === 'lanes' && visible && swipeOk(e.target)) swipes.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), done: false });
  }, { passive: true });
  on(window, 'pointermove', (e: PointerEvent) => {
    const s = swipes.get(e.pointerId);
    if (!s || s.done) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    const thr = Math.max(28, 0.07 * Math.min(innerWidth, innerHeight));
    if (performance.now() - s.t > 700) { swipes.delete(e.pointerId); return; }
    if (Math.abs(dx) > thr && Math.abs(dx) > 1.4 * Math.abs(dy)) { s.done = true; doSwipe(dx < 0 ? -1 : 1); }
  }, { passive: true });
  const swipeEnd = (e: PointerEvent) => { swipes.delete(e.pointerId); };
  on(window, 'pointerup', swipeEnd, { passive: true });
  on(window, 'pointercancel', swipeEnd, { passive: true });

  // ---------- Tastiera ----------
  const KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyH']);
  on(window, 'keydown', (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (!KEYS.has(e.code)) return;
    e.preventDefault();
    if (!e.repeat && scheme === 'lanes' && visible) {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') doSwipe(-1);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') doSwipe(1);
    }
    keys.add(e.code);
  });
  on(window, 'keyup', (e: KeyboardEvent) => { keys.delete(e.code); });
  const releaseAll = () => { keys.clear(); swipes.clear(); for (const r of releasers) r(); };
  on(window, 'blur', releaseAll);
  on(document, 'visibilitychange', () => { if (document.hidden) releaseAll(); });

  // ---------- Animi i telefonit ----------
  const screenAngle = () => {
    const a = (screen as any).orientation?.angle;
    if (typeof a === 'number') return a;
    const w = (window as any).orientation;
    return typeof w === 'number' ? w : 0;
  };
  on(window, 'deviceorientation', (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    const b = e.beta * DEG, g = e.gamma * DEG, a = screenAngle() * DEG;
    // Graviteti në boshtet e pajisjes, pastaj në boshtin X të ekranit.
    const gx = Math.cos(b) * Math.sin(g), gy = -Math.sin(b);
    const sx = gx * Math.cos(a) - gy * Math.sin(a);
    const roll = Math.asin(clamp(sx, -1, 1));
    tiltRoll = tiltSeen ? tiltRoll + (roll - tiltRoll) * 0.4 : roll;
    tiltSeen = true;
    if (needCalib) { tiltNeutral = tiltRoll; needCalib = false; }
  });
  const recal = () => { needCalib = true; };
  on(window, 'orientationchange', recal);
  if ((screen as any).orientation?.addEventListener) on((screen as any).orientation, 'change', recal);
  let tiltGranted = !(typeof (window as any).DeviceOrientationEvent?.requestPermission === 'function');
  function requestPermissions(): Promise<boolean> {
    const DOE = (window as any).DeviceOrientationEvent;
    if (!DOE) return Promise.resolve(false);
    if (typeof DOE.requestPermission !== 'function') { tiltGranted = true; return Promise.resolve(true); }
    try {
      // Duhet thirrur sinkronisht brenda prekjes së përdoruesit (iOS).
      return Promise.resolve(DOE.requestPermission()).then((r: string) => (tiltGranted = r === 'granted'), () => false);
    } catch { return Promise.resolve(false); }
  }
  on(q('.tri-cal'), 'pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    if (!tiltGranted) requestPermissions();
    needCalib = true;
    vib(10);
  });
  function tiltValue(): number {
    if (!tiltSeen) return 0;
    const full = 0.38 / clamp(tiltSensitivity, 0.3, 3);   // ~22° për kthesë të plotë
    const d = tiltRoll - tiltNeutral, dz = 2 * DEG;
    const a = Math.abs(d) < dz ? 0 : (Math.abs(d) - dz) / full;
    return Math.sign(d) * clamp(0.6 * a + 0.4 * a * a, 0, 1);
  }

  // ---------- Pamja ----------
  function setTurnView(dt: number) {
    let key = '';
    if (scheme === 'lanes' && visible) {
      laneFlash = Math.max(0, laneFlash - dt);
      if (assist.wantTurn) key = assist.wantTurn < 0 ? 'tl' : 'tr';
      else if (laneFlash > 0) key = flashKind === 'cancel' ? 'st' : laneFlashSide < 0 ? 'll' : 'lr';
    }
    if (key === turnKey) return;
    turnKey = key;
    turnEl.hidden = !key;
    if (!key) return;
    const icon = key[0] === 't' ? IC.turn : key === 'st' ? IC.straight : IC.lane;
    turnEl.querySelector('svg')!.outerHTML = icon;
    turnEl.classList.toggle('left', key[1] === 'l');
    turnLabel.textContent = key === 'tl' ? 'Kthesë majtas' : key === 'tr' ? 'Kthesë djathtas' : key === 'st' ? 'Drejt' : key === 'll' ? 'Korsia majtas' : 'Korsia djathtas';
    turnEl.style.animation = 'none'; void turnEl.offsetWidth; turnEl.style.animation = '';
  }
  function setBlinkers(p: Vehicle | null) {
    if (!p) return;
    const want = scheme === 'lanes' && visible;
    if (!want && !blinkersOwned) return;
    const l = want && (assist.wantTurn < 0 || (laneFlash > 0 && flashKind === 'lane' && laneFlashSide < 0));
    const r = want && (assist.wantTurn > 0 || (laneFlash > 0 && flashKind === 'lane' && laneFlashSide > 0));
    p.lights.left = l; p.lights.right = r;
    blinkersOwned = want;
  }

  const ramp = (cur: number, target: number, up: number, down: number, dt: number) =>
    target > cur ? Math.min(target, cur + dt / up) : Math.max(target, cur - dt / down);

  function read(ctx: FrameContext): VehicleInput {
    const dt = Math.max(0, Math.min(0.1, ctx.dt));
    const p = deps.getPlayer();
    const kUp = keys.has('KeyW') || keys.has('ArrowUp'), kDn = keys.has('KeyS') || keys.has('ArrowDown');
    const kL = keys.has('KeyA') || keys.has('ArrowLeft'), kR = keys.has('KeyD') || keys.has('ArrowRight');
    thr = ramp(thr, gas || kUp ? 1 : 0, 0.15, 0.08, dt);
    brk = ramp(brk, brake || kDn ? 1 : 0, 0.1, 0.06, dt);
    out.handbrake = hb || keys.has('Space');
    out.nitro = nitro || keys.has('ShiftLeft') || keys.has('ShiftRight');
    out.horn = horn || keys.has('KeyH');
    out.throttle = thr; out.brake = brk;

    const city = scheme === 'lanes' ? deps.getCity() : null;
    if (scheme === 'lanes' && city && p && assist.update(city, p, dt, thr)) {
      steer = smooth(steer, assist.steer, 14, dt);
      if (brk > 0.02) { out.throttle = 0; out.brake = brk; }
      else {
        const err = assist.targetSpeed - p.speed;
        out.throttle = err > -0.4 ? clamp(err * 0.45 + 0.08, 0, 1) : 0;
        out.brake = err < -1.2 ? clamp(-err * 0.12, 0, 0.6) : 0;
      }
    } else {
      const kb = (kR ? 1 : 0) - (kL ? 1 : 0);
      if (scheme !== 'lanes' && steerId !== null) steer = smooth(steer, touchSteer, 22, dt);
      else if (scheme !== 'lanes' && kb !== 0) steer = ramp(steer, kb, Math.sign(steer) === -kb ? 0.18 : 0.32, 0.18, dt);
      else if (scheme === 'tilt') steer = smooth(steer, tiltValue(), 12, dt);
      else steer = smooth(steer, 0, 12, dt);
      if (scheme === 'lanes') assist.reset();
    }
    if (Math.abs(steer) < 1e-4) steer = 0;
    out.steer = clamp(steer, -1, 1);

    // Pamja: karburanti i nitros, "MBRAPA", animi, kthesa.
    if (p) {
      const f = Math.round(clamp(p.nitroFuel, 0, 1) * 50) / 50;
      if (f !== fuelShown) { fuelShown = f; nitroEl.style.setProperty('--f', String(f)); nitroEl.classList.toggle('empty', f < 0.02); }
      const rev = p.speed < -0.3;
      if (rev !== revShown) { revShown = rev; brakeLabel.textContent = rev ? 'MBRAPA' : 'FRENA'; }
    }
    if (scheme === 'tilt') {
      if (!tiltSeen) { tiltSince += dt; }
      const v = Math.round(out.steer * 100) / 100;
      if (v !== lastNeedle) {
        lastNeedle = v;
        const w = needle.parentElement!.clientWidth;
        needle.style.transform = `translateX(${v * (w / 2 - 14)}px)`;
      }
      const hint = tiltSeen ? 'Anim telefonin për të kthyer' : tiltSince > 1.5 ? (tiltGranted ? 'Sensori i animit s\'u gjet' : 'Prek “Kalibro” për leje') : 'Duke pritur sensorin…';
      if (hintEl.textContent !== hint) hintEl.textContent = hint;
    }
    setTurnView(dt);
    setBlinkers(p);
    return out;
  }

  const api: GameInput = {
    get scheme() { return scheme; },
    set scheme(s: ControlScheme) {
      if (s !== 'wheel' && s !== 'tilt' && s !== 'lanes') s = 'wheel';
      if (s === scheme && el.dataset.scheme) return;
      scheme = s;
      el.dataset.scheme = s;
      assist.reset();
      laneFlash = 0; swipes.clear();
      if (s === 'tilt') { needCalib = true; tiltSince = 0; lastNeedle = NaN; }
    },
    get tiltSensitivity() { return tiltSensitivity; },
    set tiltSensitivity(v: number) { tiltSensitivity = clamp(+v || 1, 0.3, 3); },
    get lanes() { return assist; },
    calibrate() { needCalib = true; },
    read,
    setVisible(v: boolean) {
      v = !!v;
      if (v === visible) return;
      visible = v;
      el.hidden = !v;
      if (!v) { releaseAll(); thr = 0; brk = 0; steer = 0; setTurnView(0); setBlinkers(deps.getPlayer()); }
    },
    requestPermissions,
    dispose() {
      releaseAll();
      for (const [t, type, fn, opt] of listeners) t.removeEventListener(type, fn, opt);
      listeners.length = 0;
      el.remove();
    },
  };
  api.scheme = 'wheel';
  return api;
}

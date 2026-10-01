/**
 * Zëri procedural me Web Audio (pa skedarë): motori, gomat, përplasjet, bori, sirena, nitro,
 * tingujt e UI-së dhe muzikë lo-fi. Çdo metodë është e sigurt (no-op) para unlock() ose pa Web Audio.
 *
 * Grafi: [motori, gomat, bori, sirena, nitro, përplasjet] → game → sfx (mute) ─┐
 *        [ui] ─────────────────────────────────────────────────→ sfx            ├→ mix → kufizues i butë → dalja
 *        [muzika] → music ───────────────────────────────────────────────────────┘
 * setMuted() hesht efektet; muzika ndjek vetëm setMusic().
 */
import type { AudioSystem, FrameContext, UiSound } from '../core/contracts';

export interface AudioDebug { context: AudioContext; mix: AudioNode; out: AudioNode }
export type GameAudio = AudioSystem & {
  /** Për teste: konteksti dhe nyjet para/pas kufizuesit (null para unlock). */
  readonly debug: AudioDebug | null;
  readonly unlocked: boolean;
};

const ENGINE_MAX = 0.18, MUSIC_VOL = 0.07;
const c01 = (x: number) => (x > 0 ? (x < 1 ? x : 1) : 0);
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const warn = (e: unknown) => { try { console.warn('[audio]', e); } catch { /* asgjë */ } };

type Eng = {
  o1: OscillatorNode; o2: OscillatorNode; lfo: OscillatorNode; noise: AudioBufferSourceNode;
  drive: GainNode; lp: BiquadFilterNode; am: GainNode; nbp: BiquadFilterNode; ng: GainNode;
  road: BiquadFilterNode; rg: GainNode; out: GainNode; f: number; lp0: number; vol: number; stopAt: number;
};
type Loop = { nodes: AudioScheduledSourceNode[]; out: GainNode; stopAt: number; [k: string]: any };

export function createAudio(): GameAudio {
  const AC: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
  let ctx: AudioContext | null = null;
  let mix!: GainNode, game!: GainNode, sfx!: GainNode, music!: GainNode, clip!: WaveShaperNode;
  let noiseBuf!: AudioBuffer, crackleBuf!: AudioBuffer, engWave: PeriodicWave | null = null;
  let muted = false, wantMusic = false, hidden = false;
  let eng: Eng | null = null, skidL: Loop | null = null, hornL: Loop | null = null, sirenL: Loop | null = null, nitroL: Loop | null = null;
  let lastCrash = -1, lastCrashK = 0, lastUi = '', lastUiT = -1;
  let lastUpdate = 0, ducked = false, timer: number | null = null;
  let mus: { next: number; step: number; bar: number; lfo: OscillatorNode; lfoG: GainNode; crackle: AudioBufferSourceNode; seed: number } | null = null;

  // ---------- Ndihmës ----------
  function softClipCurve() {
    const N = 2048, c = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * 2 - 1, a = Math.abs(x);
      const y = a < 0.6 ? a : 0.6 + 0.36 * Math.tanh((a - 0.6) / 0.36);
      c[i] = Math.sign(x) * y;                       // maksimumi ≈ 0.88 < 1.0
    }
    return c;
  }
  function init(c: AudioContext) {
    clip = c.createWaveShaper();
    clip.curve = softClipCurve();
    clip.connect(c.destination);
    mix = c.createGain(); mix.connect(clip);
    sfx = c.createGain(); sfx.gain.value = muted ? 0 : 1; sfx.connect(mix);
    game = c.createGain(); game.connect(sfx);
    music = c.createGain(); music.gain.value = 0;
    const warm = c.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 3200; warm.Q.value = 0.5;
    music.connect(warm); warm.connect(mix);
    // Zhurmë e bardhë 2 s, dhe kërcitje vinili (impulse të rralla).
    const sr = c.sampleRate;
    noiseBuf = c.createBuffer(1, sr * 2, sr);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    crackleBuf = c.createBuffer(1, sr * 3, sr);
    const k = crackleBuf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < k.length; i++) {
      lp += ((Math.random() * 2 - 1) - lp) * 0.08;
      k[i] = lp * 0.05 + (Math.random() < 0.00035 ? (Math.random() * 2 - 1) * 0.9 : 0);
    }
    // Vala e motorit: baza = gjysma e frekuencës së ndezjes (rendet gjysmë → "gurgullimë").
    const amps = [0, 0.32, 1, 0.22, 0.6, 0.12, 0.34, 0.07, 0.2, 0.05, 0.12, 0.03, 0.07, 0.02, 0.04, 0.01, 0.03];
    const re = new Float32Array(amps.length), im = new Float32Array(amps.length);
    for (let i = 1; i < amps.length; i++) { const ph = i * 1.7; re[i] = amps[i] * Math.cos(ph); im[i] = amps[i] * Math.sin(ph); }
    try { engWave = c.createPeriodicWave(re, im); } catch { engWave = null; }
  }
  const now = () => ctx!.currentTime;
  const live = () => !!ctx && ctx.state === 'running' && !hidden;
  function gainNode(v: number, dest: AudioNode | AudioParam) { const g = ctx!.createGain(); g.gain.value = v; g.connect(dest as AudioNode); return g; }
  function filt(type: BiquadFilterType, f: number, q: number, dest: AudioNode) {
    const b = ctx!.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(dest); return b;
  }
  function noiseSrc(loop = true) {
    const s = ctx!.createBufferSource(); s.buffer = noiseBuf; s.loop = loop; return s;
  }
  /** Mbështjellëse: hyrje e shpejtë → rënie eksponenciale → zero. */
  function env(p: AudioParam, t: number, att: number, dur: number, vol: number) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(vol, t + att);
    p.exponentialRampToValueAtTime(Math.max(1e-4, vol * 0.004), t + dur);
    p.linearRampToValueAtTime(0, t + dur + 0.01);
  }
  function tone(type: OscillatorType, f: number, t: number, dur: number, vol: number, dest: AudioNode, att = 0.005, f2?: number) {
    const o = ctx!.createOscillator(), g = ctx!.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
    env(g.gain, t, att, dur, vol);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.03);
    return o;
  }
  function burst(t: number, dur: number, type: BiquadFilterType, f: number, q: number, vol: number, dest: AudioNode, f2?: number, att = 0.002) {
    const s = noiseSrc(false), b = ctx!.createBiquadFilter(), g = ctx!.createGain();
    b.type = type; b.frequency.setValueAtTime(f, t); b.Q.value = q;
    if (f2) b.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g.gain, t, att, dur, vol);
    s.connect(b); b.connect(g); g.connect(dest);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.03);
  }
  function stopLoop(l: Loop | null, fade = 0.06) {
    if (!l || !ctx) return;
    const t = now();
    l.out.gain.cancelScheduledValues(t);
    l.out.gain.setTargetAtTime(0, t, fade);
    for (const n of l.nodes) { try { n.stop(t + fade * 6 + 0.05); } catch { /* asgjë */ } }
    setTimeout(() => { try { l.out.disconnect(); } catch { /* asgjë */ } }, (fade * 6 + 0.3) * 1000);
  }
  const safe = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => { if (ctx) { try { fn(...a); } catch (e) { warn(e); } } };

  // ---------- Motori ----------
  function engineStart(): Eng {
    const c = ctx!, t = now();
    const out = gainNode(0, game);
    const am = gainNode(0.82, out);
    const lp = filt('lowpass', 400, 1.0, am);
    const shaper = c.createWaveShaper();
    const N = 1024, curve = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 2 - 1; curve[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); }
    shaper.curve = curve; shaper.connect(lp);
    const drive = gainNode(0.5, shaper);
    const o1 = c.createOscillator(), o2 = c.createOscillator();
    if (engWave) { o1.setPeriodicWave(engWave); o2.setPeriodicWave(engWave); } else { o1.type = 'sawtooth'; o2.type = 'square'; }
    o1.frequency.value = 20; o2.frequency.value = 20.2;
    o1.connect(drive);
    const g2 = gainNode(0.45, drive); o2.connect(g2);
    // Luhatje e amplitudës (çrregullsi e cilindrave).
    const lfo = c.createOscillator(); lfo.frequency.value = 10;
    const depth = gainNode(0.18, am.gain); lfo.connect(depth);
    // Zhurma e marrjes së ajrit + zhurma e rrugës.
    const noise = noiseSrc();
    const ng = gainNode(0, out); const nbp = filt('bandpass', 600, 0.9, ng);
    const rg = gainNode(0, out); const road = filt('lowpass', 500, 0.7, rg);
    noise.connect(nbp); noise.connect(road);
    o1.start(t); o2.start(t); lfo.start(t); noise.start(t, Math.random());
    return { o1, o2, lfo, noise, drive, lp, am, nbp, ng, road, rg, out, f: 0, lp0: 0, vol: -1, stopAt: 0 };
  }
  function engineStop(e: Eng) {
    const t = now();
    e.out.gain.cancelScheduledValues(t);
    e.out.gain.setTargetAtTime(0, t, 0.08);
    for (const n of [e.o1, e.o2, e.lfo, e.noise]) { try { n.stop(t + 0.6); } catch { /* asgjë */ } }
    setTimeout(() => { try { e.out.disconnect(); } catch { /* asgjë */ } }, 900);
  }
  const engine = safe((on: boolean, rpm: number, load: number, speed: number) => {
    if (!on || muted || !live()) { if (eng) { engineStop(eng); eng = null; } return; }
    if (!eng) eng = engineStart();
    const e = eng, t = now(), r = c01(rpm), l = c01(load), v = Math.abs(speed) || 0;
    const f = 30 + 150 * r;                               // frekuenca e ndezjes 30–180 Hz
    if (Math.abs(f - e.f) > 0.2) {
      const tc = e.f === 0 ? 0.001 : 0.05;
      e.o1.frequency.setTargetAtTime(f / 2, t, tc);
      e.o2.frequency.setTargetAtTime((f / 2) * 1.013, t, tc);
      e.lfo.frequency.setTargetAtTime(f / 4, t, tc);
      e.nbp.frequency.setTargetAtTime(450 + 2400 * r, t, 0.06);
      e.f = f;
    }
    const lpf = 260 + 900 * r + 1700 * l * (0.4 + 0.6 * r);
    if (Math.abs(lpf - e.lp0) > 10) {
      e.lp.frequency.setTargetAtTime(lpf, t, 0.06);
      e.drive.gain.setTargetAtTime(0.45 + 1.6 * l, t, 0.06);
      e.ng.gain.setTargetAtTime(0.05 + 0.4 * l * (0.3 + r), t, 0.06);
      e.lp0 = lpf;
    }
    const vol = ENGINE_MAX * 0.72 * (0.42 + 0.33 * l + 0.25 * r);   // 0.72 = normalizim i majës
    if (Math.abs(vol - e.vol) > 0.002) { e.out.gain.setTargetAtTime(vol, t, 0.07); e.vol = vol; }
    const rv = Math.min(0.32, v * 0.012);
    if (Math.abs(rv - e.rg.gain.value) > 0.01) {
      e.rg.gain.setTargetAtTime(rv, t, 0.2);
      e.road.frequency.setTargetAtTime(300 + v * 18, t, 0.2);
    }
  });

  // ---------- Gomat ----------
  const skid = safe((intensity: number) => {
    const k = muted || !live() ? 0 : c01(intensity);
    const t = now();
    if (k < 0.05) {
      if (skidL && skidL.on) { skidL.out.gain.setTargetAtTime(0, t, 0.05); skidL.on = false; skidL.stopAt = t + 1.5; }
      return;
    }
    if (!skidL) {
      const out = gainNode(0, game);
      const n = noiseSrc();
      const pre = ctx!.createGain(); pre.gain.value = 3.5;
      const b1 = filt('bandpass', 1050, 10, out), b2 = filt('bandpass', 2150, 8, out);
      n.connect(pre); pre.connect(b1); pre.connect(b2);
      const o = ctx!.createOscillator(); o.type = 'triangle'; o.frequency.value = 1000;
      const og = gainNode(0.1, out); o.connect(og);
      const vib = ctx!.createOscillator(); vib.frequency.value = 7.3;
      const vd = gainNode(28, o.frequency); vib.connect(vd);
      n.start(t, Math.random()); o.start(t); vib.start(t);
      skidL = { nodes: [n, o, vib], out, stopAt: 0, on: false, b1, o, k: -1 };
    }
    const s = skidL;
    if (!s.on || Math.abs(k - s.k) > 0.03) {
      s.out.gain.setTargetAtTime(0.14 * Math.pow(k, 1.3), t, 0.04);
      s.b1.frequency.setTargetAtTime(950 + 260 * k, t, 0.1);
      s.o.frequency.setTargetAtTime(920 + 220 * k, t, 0.1);
      s.k = k; s.on = true; s.stopAt = 0;
    }
  });

  // ---------- Përplasja ----------
  const crash = safe((intensity: number) => {
    if (muted || !live()) return;
    const k = c01(intensity), t0 = now();
    if (k < 0.02) return;
    if (t0 - lastCrash < 0.12 || (t0 - lastCrash < 0.4 && k < lastCrashK * 0.8)) return;
    lastCrash = t0; lastCrashK = k;
    const t = t0 + 0.005, v = 0.16 + 0.4 * k;
    const bus = gainNode(1, game);
    setTimeout(() => { try { bus.disconnect(); } catch { /* asgjë */ } }, 1500);
    tone('sine', 95, t, 0.42, v * 0.9, bus, 0.003, 30);                       // goditja e ulët
    burst(t, 0.45, 'lowpass', 3200, 0.8, v * 0.8, bus, 220);                   // shtypja e karrocerisë
    const hits = 2 + Math.round(k * 5);                                         // kërcitje metali
    for (let i = 0; i < hits; i++) {
      const th = t + 0.01 + Math.random() * 0.32 * (0.5 + k), f = 500 + Math.random() * 1900, d = 0.08 + Math.random() * 0.22;
      tone('sine', f, th, d, v * 0.09, bus, 0.001);
      tone('sine', f * 2.76, th, d * 0.6, v * 0.05, bus, 0.001);
      burst(th, 0.05, 'bandpass', f * 1.5, 6, v * 0.25, bus);
    }
    if (k > 0.45) {                                                             // xhami
      burst(t + 0.02, 0.28, 'highpass', 4200, 0.7, v * 0.28, bus);
      const n = 5 + Math.round(k * 6);
      for (let i = 0; i < n; i++) tone('sine', 2600 + Math.random() * 3800, t + 0.04 + Math.random() * 0.55, 0.05 + Math.random() * 0.1, v * 0.045, bus, 0.001);
    }
  });

  // ---------- Bori ----------
  const horn = safe((on: boolean) => {
    const want = on && !muted && live();
    if (!want) { if (hornL) { stopLoop(hornL, 0.025); hornL = null; } return; }
    if (hornL) return;
    const t = now(), out = gainNode(0, game);
    const lp = filt('lowpass', 2300, 0.9, out);
    const pk = filt('peaking', 950, 2, lp); pk.gain.value = 5;
    const nodes: OscillatorNode[] = [];
    for (const [f, a] of [[405, 0.5], [508, 0.42]] as const) {
      const o = ctx!.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const g = gainNode(a, pk); o.connect(g); o.start(t); nodes.push(o);
    }
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.13, t + 0.015);
    hornL = { nodes, out, stopAt: 0 };
  });

  // ---------- Sirena (dy tone evropiane, 450/600 Hz, nga 0.5 s) ----------
  const siren = safe((on: boolean, distance: number) => {
    const d = Number.isFinite(distance) ? Math.max(0, distance) : 1e9;
    const want = on && !muted && live() && d < 250;
    if (!want) { if (sirenL) { stopLoop(sirenL, 0.08); sirenL = null; } return; }
    const t = now();
    if (!sirenL) {
      const out = gainNode(0, game);
      const lp = filt('lowpass', 3000, 0.7, out);
      const o1 = ctx!.createOscillator(); o1.type = 'sawtooth';
      const o2 = ctx!.createOscillator(); o2.type = 'triangle';
      o1.connect(gainNode(0.35, lp)); o2.connect(gainNode(0.6, lp));
      o1.start(t); o2.start(t);
      sirenL = { nodes: [o1, o2], out, stopAt: 0, lp, o1, o2, next: t, hi: false, d: -1 };
      scheduleSiren();
    }
    const s = sirenL;
    if (Math.abs(d - s.d) > 1) {
      const a = 1 - d / 250;
      s.out.gain.setTargetAtTime(0.13 * Math.pow(a, 1.5) / (1 + d / 80), t, 0.1);
      s.lp.frequency.setTargetAtTime(700 + 2800 * a, t, 0.1);
      s.d = d;
    }
  });
  function scheduleSiren() {
    const s = sirenL;
    if (!s || !ctx) return;
    const t = now();
    if (s.next < t) s.next = t + 0.01;
    while (s.next < t + 0.35) {
      const f = s.hi ? 600 : 450, prev = s.hi ? 450 : 600;
      for (const o of [s.o1, s.o2] as OscillatorNode[]) {
        o.frequency.setValueAtTime(prev, s.next);
        o.frequency.linearRampToValueAtTime(f, s.next + 0.03);
      }
      s.hi = !s.hi; s.next += 0.5;
    }
  }

  // ---------- Nitro ----------
  const nitro = safe((on: boolean) => {
    const want = on && !muted && live();
    if (!want) {
      if (nitroL) {
        const t = now();
        nitroL.bp.frequency.cancelScheduledValues(t);
        nitroL.bp.frequency.setTargetAtTime(450, t, 0.12);
        stopLoop(nitroL, 0.1); nitroL = null;
      }
      return;
    }
    if (nitroL) return;
    const t = now(), out = gainNode(0, game);
    const n = noiseSrc();
    const bp = filt('bandpass', 400, 0.9, out);
    const hp = filt('highpass', 3500, 0.7, gainNode(0.35, out));
    n.connect(bp); n.connect(hp);
    const o = ctx!.createOscillator(); o.type = 'sine'; o.frequency.value = 52;
    o.connect(gainNode(0.5, out));
    n.start(t, Math.random()); o.start(t);
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.35);
    bp.frequency.setTargetAtTime(1700, t + 0.35, 0.25);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.14, t + 0.12);
    out.gain.setTargetAtTime(0.09, t + 0.35, 0.3);
    nitroL = { nodes: [n, o], out, stopAt: 0, bp };
  });

  // ---------- Tingujt e UI-së ----------
  const ui = safe((sound: UiSound) => {
    if (muted || !live()) return;
    const t0 = now();
    if (sound === lastUi && t0 - lastUiT < 0.05) return;     // pa dyfishime në të njëjtin kuadër
    lastUi = sound; lastUiT = t0;
    const t = t0 + 0.005, d = sfx;
    switch (sound) {
      case 'click':
        tone('sine', 1150, t, 0.04, 0.09, d); burst(t, 0.02, 'highpass', 2500, 0.7, 0.03, d); break;
      case 'coin':
        tone('sine', 1318.5, t, 0.08, 0.16, d); tone('square', 1318.5, t, 0.08, 0.025, d);
        tone('sine', 1760, t + 0.075, 0.22, 0.16, d); tone('square', 1760, t + 0.075, 0.2, 0.025, d); break;
      case 'levelup':
        [60, 64, 67, 72, 76].forEach((n, i) => {
          tone('triangle', midi(n + 12), t + i * 0.085, 0.32, 0.12, d);
          tone('sine', midi(n + 24), t + i * 0.085, 0.2, 0.04, d);
        });
        tone('triangle', midi(84), t + 0.45, 0.6, 0.1, d); break;
      case 'success':
        [67, 71, 74, 79].forEach((n, i) => tone('triangle', midi(n), t + i * 0.09, 0.35 + i * 0.08, 0.13, d));
        tone('sine', midi(91), t + 0.36, 0.5, 0.05, d); break;
      case 'fail':
        [64, 60, 57].forEach((n, i) => {
          const o = tone('sawtooth', midi(n - 12), t + i * 0.2, 0.26 + (i === 2 ? 0.3 : 0), 0.07, d, 0.01);
          if (i === 2) o.frequency.linearRampToValueAtTime(midi(n - 13), t + 0.8);
        });
        break;
      case 'checkpoint':
        tone('square', 880, t, 0.07, 0.05, d); tone('sine', 880, t, 0.08, 0.12, d);
        tone('sine', 1318.5, t + 0.08, 0.2, 0.14, d); tone('square', 1318.5, t + 0.08, 0.16, 0.035, d); break;
      case 'camera':
        burst(t, 0.03, 'bandpass', 3200, 1.5, 0.35, d); burst(t + 0.07, 0.05, 'bandpass', 2200, 1.5, 0.3, d);
        tone('sine', 2093, t + 0.13, 0.18, 0.08, d); break;
      case 'error':
        tone('square', 165, t, 0.11, 0.08, d); tone('square', 155, t + 0.14, 0.16, 0.08, d); break;
    }
  });

  // ---------- Muzika lo-fi (90 BPM, Am7–Dm7–G7–Cmaj7) ----------
  const BEAT = 60 / 90, E8 = BEAT / 2, SWING = E8 * 0.12;
  const CH = [[57, 60, 64, 67], [57, 60, 62, 65], [55, 59, 62, 65], [55, 59, 60, 64]];
  const BASS = [45, 38, 43, 36];
  const PENTA = [69, 72, 74, 76, 79, 81];
  function rnd(m: NonNullable<typeof mus>) { m.seed = (m.seed * 1664525 + 1013904223) >>> 0; return m.seed / 4294967296; }
  function epNote(n: number, t: number, dur: number, vol: number, m: NonNullable<typeof mus>) {
    const c = ctx!, g = c.createGain();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.025);
    g.gain.setTargetAtTime(vol * 0.35, t + 0.03, 0.6);
    g.gain.setTargetAtTime(0, t + dur, 0.12);
    lp.connect(g); g.connect(music);
    for (const [mul, a] of [[1, 1], [2, 0.18], [3.01, 0.05]] as const) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = midi(n) * mul;
      m.lfoG.connect(o.detune);
      o.onended = () => { try { m.lfoG.disconnect(o.detune); } catch { /* asgjë */ } };
      const og = c.createGain(); og.gain.value = a; o.connect(og); og.connect(lp);
      o.start(t); o.stop(t + dur + 0.8);
    }
  }
  function musicStep(m: NonNullable<typeof mus>, t: number) {
    const s = m.step, bar = m.bar & 3, ch = CH[bar], mu = music;
    const tt = t + (s & 1 ? SWING : 0);
    // Akordet (piano elektrik) në hapin 0; ri-goditje e lehtë në "e"-në e 2.
    if (s === 0) ch.forEach((n, i) => epNote(n, tt + i * 0.012, BEAT * 3.6, 0.11, m));
    if (s === 3 && (m.bar & 1)) ch.slice(1).forEach(n => epNote(n, tt, BEAT * 1.2, 0.06, m));
    // Basi.
    if (s === 0 || s === 4) tone('triangle', midi(BASS[bar] + (s === 4 && bar === 1 ? 7 : 0)), tt, BEAT * 1.6, 0.42, mu, 0.012);
    if (s === 7 && rnd(m) < 0.5) tone('triangle', midi(BASS[(bar + 1) & 3] + 2), tt, E8 * 0.9, 0.25, mu, 0.01);
    // Kick i butë.
    if (s === 0 || s === 4 || (s === 5 && (m.bar & 1))) tone('sine', 115, tt, 0.28, s === 5 ? 0.45 : 0.75, mu, 0.002, 42);
    // Rim/snare i lehtë në 2 dhe 4.
    if (s === 2 || s === 6) { burst(tt, 0.13, 'bandpass', 1900, 1.1, 0.26, mu); tone('sine', 200, tt, 0.07, 0.12, mu, 0.002); }
    // Hi-hat çdo të tetën.
    burst(tt, s & 1 ? 0.03 : 0.045, 'highpass', 7600, 0.7, s & 1 ? 0.08 : 0.14, mu);
    // Melodi e rrallë pentatonike.
    if (m.bar % 8 >= 4 && (s === 1 || s === 4 || s === 6) && rnd(m) < 0.45) {
      const n = PENTA[Math.floor(rnd(m) * PENTA.length)];
      tone('sine', midi(n), tt, E8 * 1.8, 0.1, mu, 0.02); tone('triangle', midi(n + 12), tt, E8, 0.015, mu, 0.02);
    }
  }
  function musicStart() {
    if (!ctx || mus) return;
    const t = now();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.45;
    const lfoG = ctx.createGain(); lfoG.gain.value = 7;            // "wow" i vinilit (cent)
    lfo.connect(lfoG); lfo.start(t);
    const crackle = ctx.createBufferSource(); crackle.buffer = crackleBuf; crackle.loop = true;
    const cg = gainNode(0.35, music); const hp = filt('highpass', 900, 0.7, cg); crackle.connect(hp); crackle.start(t);
    crackle.onended = () => { try { cg.disconnect(); lfoG.disconnect(); } catch { /* asgjë */ } };
    music.gain.cancelScheduledValues(t);
    music.gain.setTargetAtTime(MUSIC_VOL, t, 0.4);
    mus = { next: t + 0.1, step: 0, bar: 0, lfo, lfoG, crackle, seed: 12345 };
  }
  function musicStop() {
    if (!ctx || !mus) return;
    const m = mus, t = now();
    mus = null;
    music.gain.cancelScheduledValues(t);
    music.gain.setTargetAtTime(0, t, 0.25);
    try { m.lfo.stop(t + 2); m.crackle.stop(t + 2); } catch { /* asgjë */ }
  }
  function musicTick() {
    const m = mus;
    if (!m || !live()) return;
    const t = now();
    if (m.next < t) m.next = t + 0.05;                     // pas pezullimit, mos luaj nota të vjetra
    while (m.next < t + 0.3) {
      musicStep(m, m.next);
      m.next += E8;
      if (++m.step === 8) { m.step = 0; m.bar++; }
    }
  }

  // ---------- Kohëmatësi (muzika, sirena, heshtja kur loja ndalet) ----------
  function tick() {
    if (!ctx) return;
    try {
      musicTick();
      if (sirenL) scheduleSiren();
      const t = now();
      if (skidL && !skidL.on && skidL.stopAt && t > skidL.stopAt) { stopLoop(skidL); skidL = null; }
      // update() s'thirret më (pauzë) → hesht tingujt e lojës.
      if (!ducked && lastUpdate > 0 && t - lastUpdate > 0.3) { ducked = true; game.gain.setTargetAtTime(0, t, 0.05); }
    } catch (e) { warn(e); }
  }

  // ---------- Dukshmëria e faqes ----------
  function onVis() {
    hidden = document.visibilityState === 'hidden';
    if (!ctx) return;
    try {
      if (hidden) ctx.suspend().catch(() => {});
      else ctx.resume().catch(() => {});
    } catch (e) { warn(e); }
  }
  document.addEventListener('visibilitychange', onVis);
  addEventListener('pagehide', () => { hidden = true; try { ctx?.suspend().catch(() => {}); } catch { /* asgjë */ } });
  addEventListener('pageshow', () => { hidden = document.visibilityState === 'hidden'; if (!hidden) try { ctx?.resume().catch(() => {}); } catch { /* asgjë */ } });

  return {
    get debug() { return ctx ? { context: ctx, mix, out: clip } : null; },
    get unlocked() { return !!ctx && ctx.state === 'running'; },
    unlock() {
      if (!AC) return;
      try {
        if (ctx && ctx.state === 'running') return;
        if (!ctx) {
          try { ctx = new AC({ latencyHint: 'interactive' }); } catch { ctx = new AC(); }
          init(ctx);
          timer = window.setInterval(tick, 50);
        }
        if (ctx.state !== 'running' && !hidden) {
          ctx.resume().catch(() => {});
          // iOS: një buffer bosh brenda gjestit "zhbllokon" daljen.
          const b = ctx.createBufferSource();
          b.buffer = ctx.createBuffer(1, 1, 22050);
          b.connect(ctx.destination);
          b.start(0);
        }
        if (wantMusic && !mus) musicStart();
      } catch (e) { warn(e); }
    },
    setMuted(m: boolean) {
      muted = !!m;
      if (!ctx) return;
      try {
        sfx.gain.setTargetAtTime(muted ? 0 : 1, now(), 0.02);
        if (muted) { horn(false); nitro(false); skid(0); siren(false, 1e9); engine(false, 0, 0, 0); }
      } catch (e) { warn(e); }
    },
    setMusic(on: boolean) {
      wantMusic = !!on;
      if (!ctx) return;
      try { if (wantMusic) musicStart(); else musicStop(); } catch (e) { warn(e); }
    },
    engine, skid, crash, horn, siren, nitro, ui,
    update(_c: FrameContext) {
      if (!ctx) return;
      lastUpdate = now();
      if (ducked) { ducked = false; try { game.gain.setTargetAtTime(1, lastUpdate, 0.05); } catch (e) { warn(e); } }
    },
  };
}

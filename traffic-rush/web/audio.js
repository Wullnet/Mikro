/* Traffic Rush — zë krejt procedural me Web Audio API (port i AudioManager.cs), pa asnjë skedar audio.
   Përdorimi: GameAudio.unlock() në prekjen e parë; pastaj coin(), crash(), engine(on, speed01), music(on) etj. */
(function () {
  'use strict';

  var AC = window.AudioContext || window.webkitAudioContext;
  var KEY = 'tr_muted';
  var ENGINE_MAX = 0.12, MUSIC_VOL = 0.08;

  var ctx = null, master = null, noise = null, pulseWave = null;
  var muted = false, eng = null, mus = null, wantMusic = false;

  try { muted = window.localStorage.getItem(KEY) === '1'; } catch (e) { /* localStorage i bllokuar */ }

  function warn(e) { try { console.warn('GameAudio:', e); } catch (_) { /* asgjë */ } }
  function quiet(p) { if (p && typeof p.catch === 'function') p.catch(function () {}); }
  function clamp01(x) { x = +x || 0; return x < 0 ? 0 : x > 1 ? 1 : x; }
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  // Krijimi i kontekstit, i nyjës kryesore (mute) dhe i buffer-it të përbashkët të zhurmës (1 s).
  function init() {
    var c = new AC();
    var m = c.createGain();
    m.gain.value = muted ? 0 : 1;
    m.connect(c.destination);
    var n = c.sampleRate, buf = c.createBuffer(1, n, n), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // Valë katrore 25% (tingull chiptune) për arpexhon; nëse s'mbështetet, përdoret 'square'.
    try {
      var N = 32, re = new Float32Array(N), im = new Float32Array(N);
      for (var k = 1; k < N; k++) re[k] = 2 * Math.sin(Math.PI * k * 0.25) / (Math.PI * k);
      pulseWave = c.createPeriodicWave(re, im);
    } catch (e) { pulseWave = null; }
    ctx = c; master = m; noise = buf;
  }

  // Mbështjellëse: hyrje 4 ms → rënie eksponenciale deri në vol*sus → dalje lineare 12 ms (pa klikime).
  function env(p, t, dur, vol, sus) {
    var end = t + dur;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(vol, t + 0.004);
    p.exponentialRampToValueAtTime(Math.max(vol * (sus || 0.01), 1e-4), end - 0.012);
    p.linearRampToValueAtTime(0, end);
  }

  // Një notë oshilatori me mbështjellëse; kthen oshilatorin (për ndryshime frekuence).
  function tone(type, f, t, dur, vol, sus, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    if (type === 'pulse') { if (pulseWave) o.setPeriodicWave(pulseWave); else o.type = 'square'; }
    else o.type = type;
    o.frequency.setValueAtTime(f, t);
    env(g.gain, t, dur, vol, sus);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.02);
    return o;
  }

  // Zhurmë e bardhë (buffer i përbashkët) përmes filtri; kthen parametrat frekuencë/volum.
  function hiss(t, dur, type, freq, q) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; s.loop = true;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 0.7;
    g.gain.setValueAtTime(0, t);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.02);
    return { f: f.frequency, g: g.gain };
  }

  // Mbështjellëse "kambanë": 0 → vol në mes → 0.
  function bell(p, t, dur, vol) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(vol, t + dur * 0.45);
    p.linearRampToValueAtTime(0, t + dur);
  }

  // Mbështjellëse për efektet e shkurtra: no-op para unlock, kur është pa zë ose faqja e fshehur.
  function sfx(fn) {
    return function () {
      if (!ctx || muted || document.hidden) return;
      try { fn(ctx.currentTime + 0.005); } catch (e) { warn(e); }
    };
  }

  // ---------- Motori: sharrë + sinus + harmonika e dytë → lowpass → luhatje 15 Hz → volum ----------
  function engineStart(f) {
    var t = ctx.currentTime;
    var e = { g: ctx.createGain(), lp: ctx.createBiquadFilter(), wob: ctx.createGain(), o: [], f: f, v: -1 };
    e.g.gain.setValueAtTime(0, t);
    e.lp.type = 'lowpass'; e.lp.frequency.setValueAtTime(450, t); e.lp.Q.value = 0.8;
    e.wob.gain.value = 0.85;
    [['sawtooth', 1, 0.35], ['sine', 1, 0.55], ['sine', 2, 0.3]].forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = p[0]; o.frequency.setValueAtTime(f * p[1], t); g.gain.value = p[2];
      o.connect(g); g.connect(e.lp); o.start(t);
      e.o.push({ n: o, m: p[1] });
    });
    // LFO ~f/4 (15 Hz në 60 Hz) moduloj volumin ±0.15 për "gurgullimë".
    var lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.setValueAtTime(f / 4, t); depth.gain.value = 0.15;
    lfo.connect(depth); depth.connect(e.wob.gain); lfo.start(t);
    e.o.push({ n: lfo, m: 0.25 });
    e.lp.connect(e.wob); e.wob.connect(e.g); e.g.connect(master);
    return e;
  }

  function engineStop() {
    var t = ctx.currentTime;
    eng.g.gain.setTargetAtTime(0, t, 0.12);
    eng.o.forEach(function (o) { o.n.stop(t + 1); });
    eng = null;
  }

  // ---------- Muzika: 8 takte × 8 hapa × 0.125 s, Am–F–C–G (2 takte secili), planifikues me lookahead ----------
  var STEP = 0.125, AHEAD = 0.1;
  var CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  var ARP = [0, 1, 2, 1, 0, 2, 1, 2];

  function musicTick() {
    if (!mus || !ctx) return;
    try {
      var now = ctx.currentTime;
      if (mus.next < now) mus.next = now + 0.02; // pas vonesës së timer-it, mos luaj nota të vjetra
      while (mus.next < now + AHEAD) {
        var i = mus.i, s = i & 7, ch = CHORDS[i >> 4], t = mus.next;
        // Bas trekëndor: rrënja një oktavë poshtë, oktavë lart në hapat tek.
        tone('triangle', midi(ch[0] - 12 + (s & 1 ? 12 : 0)), t, STEP, 0.7, 0.6, mus.bus);
        // Arpexho me valë pulsi 25%, oktavë lart.
        tone('pulse', midi(ch[ARP[s]] + 12), t, STEP * 0.85, 0.28, 0.12, mus.bus);
        mus.next += STEP;
        mus.i = (i + 1) & 63;
      }
    } catch (e) { warn(e); }
  }

  function musicStart() {
    var t = ctx.currentTime, bus = ctx.createGain();
    bus.gain.setValueAtTime(0, t);
    bus.gain.setTargetAtTime(MUSIC_VOL, t, 0.05);
    bus.connect(master);
    mus = { bus: bus, next: t + 0.05, i: 0, timer: setInterval(musicTick, 25) };
    musicTick();
  }

  function musicStop() {
    var m = mus;
    mus = null;
    clearInterval(m.timer);
    m.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    setTimeout(function () { try { m.bus.disconnect(); } catch (e) { /* asgjë */ } }, 1200);
  }

  // ---------- API publike ----------
  var GameAudio = {
    unlock: function () {
      if (!AC) return;
      try {
        if (!ctx) init();
        if (ctx.state !== 'running') {
          quiet(ctx.resume());
          // iOS i vjetër: një buffer bosh i luajtur brenda gjestit "zhbllokon" daljen.
          var b = ctx.createBufferSource();
          b.buffer = ctx.createBuffer(1, 1, 22050);
          b.connect(ctx.destination);
          b.start(0);
        }
        if (wantMusic && !mus) musicStart();
      } catch (e) { warn(e); }
    },

    // Monedhë: dy tone të larta E6 → A6, sinus + pak katrore për shkëlqim.
    coin: sfx(function (t) {
      tone('sine', 1318.5, t, 0.075, 0.3, 0.4); tone('square', 1318.5, t, 0.075, 0.04, 0.4);
      tone('sine', 1760, t + 0.07, 0.16, 0.3, 0.1); tone('square', 1760, t + 0.07, 0.16, 0.04, 0.1);
    }),

    // Përplasje: zhurmë lowpass që errësohet + goditje e ulët me frekuencë që bie (110 → 40 Hz), ~0.6 s.
    crash: sfx(function (t) {
      var n = hiss(t, 0.65, 'lowpass', 3000, 0.7);
      n.f.exponentialRampToValueAtTime(300, t + 0.6);
      env(n.g, t, 0.65, 0.45, 0.03);
      var o = tone('triangle', 110, t, 0.6, 0.5, 0.02);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    }),

    // "Whoosh": zhurmë bandpass, frekuenca ngjitet e pastaj bie.
    nearMiss: sfx(function (t) {
      var n = hiss(t, 0.35, 'bandpass', 500, 1.4);
      n.f.exponentialRampToValueAtTime(3500, t + 0.16);
      n.f.exponentialRampToValueAtTime(700, t + 0.35);
      bell(n.g, t, 0.35, 0.9);
    }),

    // Ndërrim korsie: fërshëllimë e butë ~0.12 s.
    lane: sfx(function (t) {
      var n = hiss(t, 0.12, 'lowpass', 900, 0.7);
      n.f.exponentialRampToValueAtTime(2500, t + 0.12);
      bell(n.g, t, 0.12, 0.3);
    }),

    // Klik UI ~35 ms: sinus 1100 Hz + pak zhurmë.
    click: sfx(function (t) {
      tone('sine', 1100, t, 0.035, 0.35, 0.02);
      env(hiss(t, 0.02, 'highpass', 2000, 0.7).g, t, 0.02, 0.06, 0.05);
    }),

    // Motori (thirret çdo frame): tonaliteti 58 → 116 Hz dhe volumi ndjekin speed01 butësisht.
    engine: function (on, speed01) {
      if (!ctx) return;
      try {
        if (!on) { if (eng) engineStop(); return; }
        var s = clamp01(speed01), f = 58 * (1 + s), v = ENGINE_MAX * (0.6 + 0.4 * s), t = ctx.currentTime;
        if (!eng) eng = engineStart(f);
        // Përditëso vetëm kur ndryshimi ka rëndësi (mos mbush timeline-in çdo frame).
        if (Math.abs(f - eng.f) > 0.3) {
          eng.o.forEach(function (o) { o.n.frequency.setTargetAtTime(f * o.m, t, 0.25); });
          eng.lp.frequency.setTargetAtTime(450 + 900 * s, t, 0.25);
          eng.f = f;
        }
        if (Math.abs(v - eng.v) > 0.001) { eng.g.gain.setTargetAtTime(v, t, 0.2); eng.v = v; }
      } catch (e) { warn(e); }
    },

    // Muzika në sfond; music(true) kur po luan = no-op. Kërkesa para unlock mbahet mend dhe nis pas unlock.
    music: function (on) {
      wantMusic = !!on;
      if (!ctx) return;
      try {
        if (on && !mus) musicStart();
        else if (!on && mus) musicStop();
      } catch (e) { warn(e); }
    }
  };

  // Pa zë: ruhet në localStorage; zbatohet me nyjën kryesore GainNode.
  Object.defineProperty(GameAudio, 'muted', {
    enumerable: true,
    get: function () { return muted; },
    set: function (v) {
      muted = !!v;
      try { window.localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* asgjë */ }
      if (master) {
        try { master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.015); } catch (e) { warn(e); }
      }
    }
  });

  // Faqja e fshehur → pezullo kontekstin; e dukshme → rifillo (vetëm nëse ishte zhbllokuar).
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    try {
      if (document.hidden) quiet(ctx.suspend());
      else quiet(ctx.resume());
    } catch (e) { warn(e); }
  });

  window.GameAudio = GameAudio;
})();

// Sistemi i misioneve: karriera, punët e gjeneruara, shënuesit, GPS-i, gjobat dhe statistikat.
import type {
  CityWorld, FrameContext, GameEvents, Marker, MissionDef, MissionKind, MissionResult, MissionSystem, MissionView,
  PoliceSystem, Poi, PoiKind, TrafficSystem, Vec2, Vehicle,
} from '../core/contracts';
import type { Emitter } from '../core/events';
import { findRoute } from '../core/roads';
import { angleDiff } from '../core/math';
import { CAREER, CARGO, PASSENGERS, type CareerSpec, type PassengerDef, type PoiRef } from '../data/missions';
import { PROPERTIES, placeProperties } from '../data/properties';
import type { ProgressionX } from './progression';

export interface MissionDeps {
  city: CityWorld; progression: ProgressionX; events: Emitter<GameEvents>;
  police: PoliceSystem; traffic: TrafficSystem; getPlayer: () => Vehicle | null;
}
export type MissionsX = MissionSystem & {
  setWaypoint(p: Vec2 | null): void;
  nearbyMissionAt(x: number, z: number): MissionDef | null;
  /** Misioni i radhës i historisë (ose null kur mbaron karriera). */
  nextStory(): MissionDef | null;
};

/** Punë e zgjidhur: def + vendet reale. */
interface Job { def: MissionDef; spec: CareerSpec; start: Poi; to?: Poi; drops: Poi[]; passenger?: PassengerDef; gen: boolean }
interface Stage { x: number; z: number; kind: Marker['kind']; label: string; radius: number; stop?: number; heading?: number }

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const pick = <T>(a: readonly T[], r: number) => a[Math.floor(r * a.length) % a.length];
const r50 = (v: number) => Math.round(v / 50) * 50;
const routeLen = (pts: readonly Vec2[]) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); return s; };
const KIND_LABEL: Record<MissionKind, string> = { taxi: 'Taksi', delivery: 'Dërgesë', race: 'Garë', escape: 'Arratisje', parking: 'Parkim', stunt: 'Akrobaci' };

function distToPolyline(p: Vec2, pts: readonly Vec2[]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz;
    const t = L > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L)) : 0;
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t));
  }
  return pts.length === 1 ? Math.hypot(p.x - pts[0].x, p.z - pts[0].z) : best;
}

/** Pika çdo `step` metra përgjatë polilinjës (pa pikën e fundit). */
export function samplePolyline(pts: readonly Vec2[], step: number): Vec2[] {
  const out: Vec2[] = []; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.z - a.z);
    let d = step - acc;
    while (d < L) { out.push({ x: a.x + (b.x - a.x) * d / L, z: a.z + (b.z - a.z) * d / L }); d += step; }
    acc = (acc + L) % step;
  }
  return out;
}

/** Zgjidh një referencë vendi te një POI reale (deterministike sipas `salt`). */
export function resolvePoi(city: CityWorld, ref: PoiRef, salt: string): Poi {
  const inD = city.pois.filter(p => p.district === ref.d);
  const byKind = ref.k ? inD.filter(p => p.kind === ref.k) : inD;
  return (ref.n && city.pois.find(p => p.name === ref.n)) || pick(byKind.length ? byKind : inD.length ? inD : city.pois, (hash(salt) % 997) / 997);
}

export function createMissions(d: MissionDeps): MissionsX {
  const { city, progression: prog, events, police, traffic, getPlayer } = d;
  placeProperties(city);
  const lvl = () => prog.profile.level;
  const unlocked = (id: string) => (city.districts.find(x => x.id === id)?.unlockLevel ?? 1) <= lvl();

  // --- Karriera (e zgjidhur një herë)
  const career: Job[] = CAREER.map(s => {
    const start = resolvePoi(city, s.start, s.id + 's');
    return {
      spec: s, start, gen: false,
      to: s.to ? resolvePoi(city, s.to, s.id + 't') : undefined,
      drops: (s.drops ?? []).map((r, i) => resolvePoi(city, r, s.id + 'd' + i)),
      passenger: s.passenger ? PASSENGERS.find(p => p.name === s.passenger) : undefined,
      def: { id: s.id, kind: s.kind, title: s.title, brief: s.brief, district: start.district, unlockLevel: s.lvl, reward: s.reward,
        xp: (100 + 40 * s.lvl) * (s.id === 'c30' ? 2 : 1), start: { x: start.x, z: start.z } },
    };
  });
  const jobDistricts = (j: Job) => [j.start, j.to, ...j.drops].every(p => !p || unlocked(p.district));

  // --- Punët e gjeneruara (taksi/dërgesë, pafund)
  let seed = (city.seed ^ 0x9e3779b9) >>> 0, genN = 0;
  const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gens: Job[] = [];
  const PAX_KINDS: PoiKind[] = ['home', 'office', 'shop', 'restaurant', 'cafe', 'hotel', 'landmark', 'station', 'school', 'hospital'];
  const SRC_KINDS: PoiKind[] = ['shop', 'restaurant', 'business', 'station', 'office'];
  function genJob(kind: 'taxi' | 'delivery'): Job | null {
    const pool = city.pois.filter(p => unlocked(p.district));
    const srcs = pool.filter(p => (kind === 'taxi' ? PAX_KINDS : SRC_KINDS).includes(p.kind) && !gens.some(g => g.start.id === p.id));
    if (!srcs.length) return null;
    const start = pick(srcs, rnd()), L = lvl(), mult = 1 + 0.1 * (L - 1);
    const far = (a: Poi, mn: number, mx: number) => {
      const c = pool.filter(p => p !== a && PAX_KINDS.includes(p.kind) && Math.hypot(p.x - a.x, p.z - a.z) > mn && Math.hypot(p.x - a.x, p.z - a.z) < mx);
      return c.length ? pick(c, rnd()) : null;
    };
    const id = `gen-${kind}-${++genN}`;
    if (kind === 'taxi') {
      const to = far(start, 220, 800); if (!to) return null;
      const len = routeLen(findRoute(city, start, to).points);
      const pax = pick(PASSENGERS.filter(p => p.name !== 'Genti' && p.name !== 'Dritani'), rnd());
      const spec: CareerSpec = { id, kind, title: `Taksi: ${pax.name}`, brief: `${pax.name} pret te ${start.name}. Çoje te ${to.name}.`, lvl: 1, reward: r50((150 + 0.9 * len) * mult), start: { d: start.district } };
      return { spec, start, to, drops: [], passenger: pax, gen: true, def: { id, kind, title: spec.title, brief: spec.brief, district: start.district, unlockLevel: 1, reward: spec.reward, xp: 50 + 15 * L, start: { x: start.x, z: start.z } } };
    }
    const n = 1 + Math.floor(rnd() * 3), drops: Poi[] = [];
    let at = start, len = 0;
    for (let i = 0; i < n; i++) { const q = far(at, 180, 650); if (!q || drops.includes(q)) break; len += routeLen(findRoute(city, at, q).points); drops.push(q); at = q; }
    if (!drops.length) return null;
    const fragile = rnd() < 0.25, cargo = fragile ? 'xhami' : pick(CARGO, rnd());
    const reward = r50((200 + 1.0 * len) * mult * (fragile ? 1.3 : 1));
    const spec: CareerSpec = { id, kind, title: `Dërgesë: ${cargo}${fragile ? ' (e brishtë)' : ''}`, brief: `Merr ${cargo} te ${start.name} dhe shpërndaji në ${drops.length} adresa.`, lvl: 1, reward, start: { d: start.district }, fragile, cargo };
    return { spec, start, drops, gen: true, def: { id, kind, title: spec.title, brief: spec.brief, district: start.district, unlockLevel: 1, reward, xp: 50 + 15 * L + 10 * (drops.length - 1), start: { x: start.x, z: start.z } } };
  }
  function refillGens() {
    for (let i = gens.length - 1; i >= 0; i--) if (!jobDistricts(gens[i])) gens.splice(i, 1);
    let guard = 0;
    while (gens.length < 6 && guard++ < 12) { const j = genJob(gens.filter(g => g.spec.kind === 'taxi').length < 3 ? 'taxi' : 'delivery'); if (j) gens.push(j); }
  }

  const storyIndex = () => career.findIndex(j => !(prog.profile.missionStars[j.def.id] > 0));
  function availableJobs(): Job[] {
    const out: Job[] = [];
    const si = storyIndex();
    for (let i = 0; i < career.length; i++) {
      const j = career[i];
      const done = prog.profile.missionStars[j.def.id] > 0;
      if ((done || i === si) && j.def.unlockLevel <= lvl() && jobDistricts(j)) {
        out.push(done ? { ...j, def: { ...j.def, reward: r50(j.def.reward * 0.4), xp: Math.round(j.def.xp * 0.4) } } : j);
      }
    }
    return out.concat(gens);
  }

  // ---------------- Misioni aktiv ----------------
  interface Run {
    job: Job; def: MissionDef; t: number; limit: number | null; stages: Stage[]; si: number;
    started: boolean; countdown: number; mood: number; line: string | null; lineT: number; happyT: number;
    cargo: number; hits: number; nm: number; boardedT: number; bonus: string[]; fineSum: number;
  }
  let run: Run | null = null;
  let view: MissionView | null = null;
  let markers: Marker[] = [];
  let route: Vec2[] = [];
  let routeT = 0, routeTarget: Vec2 | null = null, waypoint: Vec2 | null = null;
  let markerT = 0, saveT = 0, genT = 0;
  let prevSpeed = 0, harshCd = 0, lastPos: Vec2 | null = null;

  const toast = (text: string, kind: 'info' | 'good' | 'bad' = 'info') => events.emit('toast', { text, kind });
  const money = (amount: number, reason: string) => {
    if (amount) prog.addMoney(amount, reason);
    events.emit('money', { amount, reason, total: prog.profile.money });
  };
  prog.onLevelUp(level => {
    events.emit('levelUp', { level });
    const nd = city.districts.filter(x => x.unlockLevel === level).map(x => x.name);
    toast(`Niveli ${level}!` + (nd.length ? ` U hap: ${nd.join(', ')}` : ''), 'good');
  });

  const say = (arr: string[] | undefined) => { if (run && arr?.length) { run.line = pick(arr, Math.random()); run.lineT = 4; } };
  const moodHit = (kind: 'brake' | 'corner' | 'red' | 'crash') => {
    if (!run || !run.job.passenger || run.si < 1) return;
    const m = run.job.passenger.mood;
    const table: Record<string, Record<string, number>> = {
      qete: { brake: 0.06, corner: 0.06, red: 0.08, crash: 0.2 }, nervoz: { brake: 0.1, corner: 0.1, red: 0.12, crash: 0.3 },
      nxitim: { brake: 0.03, corner: 0.02, red: 0.02, crash: 0.15 }, llafazan: { brake: 0.05, corner: 0.05, red: 0.06, crash: 0.2 },
      vip: { brake: 0.08, corner: 0.08, red: 0.05, crash: 0.3 },
    };
    run.mood = Math.max(0, run.mood - table[m][kind]);
    say(kind === 'crash' ? run.job.passenger.crash : run.job.passenger.angry);
  };

  function stagesFor(j: Job, p: Vec2): { stages: Stage[]; limit: number | null } {
    const s = j.spec, st = (q: Poi, kind: Stage['kind'], label: string, stop?: number, radius = 6): Stage => ({ x: q.x, z: q.z, kind, label, radius, stop, heading: q.heading });
    switch (s.kind) {
      case 'taxi': return { stages: [st(j.start, 'pickup', `Merr ${j.passenger?.name ?? 'pasagjerin'} te ${j.start.name}`, 2), st(j.to!, 'dropoff', `Çoje te ${j.to!.name}`, 2)], limit: null };
      case 'delivery': return { stages: [st(j.start, 'pickup', `Ngarko ${s.cargo ?? 'mallin'} te ${j.start.name}`, 2), ...j.drops.map((q, i) => st(q, 'dropoff', `Dorëzo te ${q.name} (${i + 1}/${j.drops.length})`, 2))], limit: null };
      case 'race': {
        const pts = findRoute(city, j.start, j.to!).points;
        const cps = samplePolyline(pts, 120).filter(c => Math.hypot(c.x - j.to!.x, c.z - j.to!.z) > 60);
        return { stages: [st(j.start, 'mission', 'Shko te vija e nisjes', 3, 8), ...cps.map(c => ({ x: c.x, z: c.z, kind: 'checkpoint' as const, label: 'Checkpoint', radius: 10 })), st(j.to!, 'finish', `Finishi: ${j.to!.name}`, undefined, 10)], limit: null };
      }
      case 'escape': return { stages: [st(j.to!, 'garage', `Fshihu te ${j.to!.name}`, 6, 8)], limit: 240 };
      case 'parking': {
        const len = routeLen(findRoute(city, p, j.to!).points);
        return { stages: [{ ...st(j.to!, 'parking', `Parko te ${j.to!.name}`, 0.8, 2.2) }], limit: Math.round((s.time ?? 60) + len / 9) };
      }
      case 'stunt': return { stages: [], limit: s.time ?? 90 };
    }
  }

  function start(id: string): boolean {
    if (run) return false;
    const j = availableJobs().find(x => x.def.id === id);
    const p = getPlayer();
    if (!j || !p) return false;
    const { stages, limit } = stagesFor(j, p);
    run = { job: j, def: j.def, t: 0, limit, stages, si: 0, started: j.spec.kind !== 'race', countdown: -1, mood: 0.85, line: null, lineT: 0, happyT: 12,
      cargo: 1, hits: 0, nm: 0, boardedT: 0, bonus: [], fineSum: 0 };
    if (j.gen) gens.splice(gens.indexOf(gens.find(g => g.def.id === id)!), 1);
    if (j.spec.kind === 'escape') police.startPursuit(j.spec.wanted ?? 1);
    if (j.spec.kind === 'race') traffic.clearAround(j.start.x, j.start.z, 40);
    waypoint = null; routeT = 0;
    events.emit('missionStarted', { def: j.def });
    refreshView(p);
    return true;
  }

  function finish(success: boolean, why: string, stars = 0, extra: string[] = []) {
    const r = run!; run = null; view = null;
    if (r.job.spec.kind === 'escape') police.stop();
    let reward = 0, xp = 0;
    const lines = [why, ...extra];
    if (success) {
      reward = r.def.reward;
      const k = r.job.spec.kind, car = prog.profile.selectedCar;
      let mult = 1;
      if (k === 'taxi' && car === 'taksi') { mult += 0.25; lines.push('Makina taksi: +25%'); }
      if (k === 'taxi' && prog.hasPerk('taxi')) { mult += 0.5; lines.push('Taksi Ylli: +50%'); }
      if (k === 'delivery' && car === 'furgon') { mult += 0.25; lines.push('Furgoni: +25%'); }
      reward = r50(reward * mult * (k === 'delivery' ? r.cargo : 1));
      if (k === 'delivery' && r.cargo < 1) lines.push(`Ngarkesa e dëmtuar: ${Math.round(r.cargo * 100)}%`);
      if (k === 'taxi') { const tip = r50(r.def.reward * 0.35 * r.mood * mult); if (tip > 0) { reward += tip; lines.push(`Bakshish: ${tip} L`); } }
      xp = Math.round(r.def.xp * (0.6 + 0.2 * stars));
      lines.push(`Koha: ${Math.round(r.t)} s`, `+${xp} XP`);
    }
    const res: MissionResult = { def: r.def, success, reward, xp, stars: success ? stars : 0, lines };
    if (success) {
      prog.recordMission(r.def.id, stars);
      money(reward, r.def.title);
      events.emit('missionEnded', res);
      prog.addXp(xp);
      if (r.job.spec.outro && !r.job.gen) toast(r.job.spec.outro, 'good');
    } else events.emit('missionEnded', res);
    route = []; routeTarget = null; markerT = 0;
  }

  function starsBy(frac: number, a: number, b: number) { return frac <= a ? 3 : frac <= b ? 2 : 1; }

  function reachStage(p: Vehicle) {
    const r = run!, s = r.stages[r.si], k = r.job.spec.kind;
    r.si++;
    if (k === 'taxi' && r.si === 1) {
      const len = routeLen(findRoute(city, p, r.job.to!).points), hurried = r.job.passenger?.mood === 'nxitim';
      r.limit = r.t + Math.round(25 + len / (hurried ? 10 : 8.5)); r.boardedT = r.t;
      say(r.job.passenger?.greet);
    } else if (k === 'delivery' && r.si === 1) {
      let at: Vec2 = p, len = 0; for (const q of r.job.drops) { len += routeLen(findRoute(city, at, q).points); at = q; }
      r.limit = r.t + Math.round(30 + len / 8.5); r.boardedT = r.t;
      toast(r.job.spec.fragile ? 'Kujdes: ngarkesë e brishtë!' : 'Ngarkesa u mor!');
    } else if (k === 'race' && r.si === 1) { r.countdown = 3; r.started = false; }
    else if (s.kind === 'checkpoint') events.emit('toast', { text: `Checkpoint ${r.si - 1}/${r.stages.length - 2}`, kind: 'info' });
    if (r.si < r.stages.length) { routeT = 0; return; }
    // objektivi i fundit
    const used = r.limit ? (r.t - r.boardedT) / Math.max(1, r.limit - r.boardedT) : 0.5;
    switch (k) {
      case 'taxi': {
        say(r.job.passenger?.bye);
        const st = r.mood >= 0.75 && used < 0.85 ? 3 : r.mood >= 0.45 ? 2 : 1;
        finish(true, `${r.job.passenger?.name ?? 'Pasagjeri'}: ${r.line ?? 'Faleminderit!'}`, st, [`Kënaqësia: ${Math.round(r.mood * 100)}%`]);
        break;
      }
      case 'delivery': finish(true, 'Të gjitha dërgesat u dorëzuan!', r.cargo >= 0.9 && used < 0.75 ? 3 : r.cargo >= 0.6 ? 2 : 1); break;
      case 'race': {
        const len = routeLen(findRoute(city, r.job.start, r.job.to!).points), t = r.t - r.boardedT;
        finish(true, 'Fitore ndaj Dritanit!', t <= len / 16 ? 3 : t <= len / 13 ? 2 : 1, [`3★ nën ${Math.round(len / 16)} s`]);
        break;
      }
      case 'escape': finish(true, 'U zhduke nga radari!', starsBy(r.t / (r.limit ?? 240), 0.4, 0.7)); break;
      case 'parking': finish(true, 'Parkim i përsosur!', starsBy(r.t / (r.limit ?? 60), 0.5, 0.8) - (r.hits > 1 ? 1 : 0) || 1); break;
      default: break;
    }
  }

  function refreshView(p: Vehicle) {
    if (!run) { view = null; return; }
    const r = run, s = r.stages[r.si] ?? null, k = r.job.spec.kind;
    let objective = s?.label ?? '', progress: string | null = null;
    if (k === 'race') {
      if (r.countdown > 0) objective = `Nisja për ${Math.ceil(r.countdown)}…`;
      if (r.si >= 1) progress = `Checkpoint ${Math.min(r.si, r.stages.length - 1)}/${r.stages.length - 1}`;
    } else if (k === 'delivery' && r.si >= 1) progress = `Dorëzuar ${r.si - 1}/${r.job.drops.length}` + (r.cargo < 1 ? ` · ngarkesa ${Math.round(r.cargo * 100)}%` : '');
    else if (k === 'stunt') { objective = `Kalime të ngushta mbi ${r.job.spec.minKmh} km/h`; progress = `${r.nm}/${r.job.spec.count ?? 3}`; }
    else if (k === 'escape') progress = `Yje: ${police.wanted}`;
    else if (k === 'parking' && s) {
      const dd = Math.hypot(p.x - s.x, p.z - s.z);
      if (dd < 10) progress = `${dd.toFixed(1)} m · kënd ${Math.round(Math.abs(angleDiff(p.heading, s.heading ?? 0)) * 57.3)}°`;
    }
    view = {
      def: r.def, objective, progress,
      timeLeft: r.limit != null ? Math.max(0, r.limit - r.t) : null,
      target: s ? { x: s.x, z: s.z } : null,
      passenger: r.job.passenger && k === 'taxi' && r.si >= 1 ? { name: r.job.passenger.name, mood: r.mood, line: r.lineT > 0 ? r.line : null } : undefined,
    };
  }

  function buildMarkers(p: Vehicle | null) {
    const out: Marker[] = [];
    if (run) {
      const r = run;
      if (r.job.spec.kind === 'delivery' && r.si >= 1) {
        r.stages.slice(r.si).forEach((s, i) => out.push({ id: `obj-${r.si + i}`, kind: s.kind, x: s.x, z: s.z, radius: s.radius, label: s.label }));
      } else {
        r.stages.slice(r.si, r.si + 2).forEach((s, i) => out.push({ id: `obj-${r.si + i}`, kind: s.kind, x: s.x, z: s.z, radius: s.radius, label: s.label, heading: s.kind === 'parking' ? s.heading : undefined }));
      }
    } else {
      const av = availableJobs(), si = storyIndex(), story = si >= 0 ? av.find(j => j.def.id === career[si].def.id) : undefined;
      const px = p?.x ?? city.playerSpawn.x, pz = p?.z ?? city.playerSpawn.z;
      const sorted = av.filter(j => j !== story).sort((a, b) => Math.hypot(a.def.start.x - px, a.def.start.z - pz) - Math.hypot(b.def.start.x - px, b.def.start.z - pz));
      for (const j of (story ? [story, ...sorted] : sorted).slice(0, 12)) out.push({ id: j.def.id, kind: 'mission', x: j.def.start.x, z: j.def.start.z, radius: 6, label: `${KIND_LABEL[j.def.kind]}: ${j.def.title}` });
      for (const g of city.pois) if (g.kind === 'garage') out.push({ id: 'garage-' + g.id, kind: 'garage', x: g.x, z: g.z, radius: 6, label: g.name });
      const own = new Set(prog.profile.properties);
      for (const b of PROPERTIES) out.push({ id: 'biz-' + b.id, kind: 'business', x: b.x, z: b.z, radius: 6, label: b.name + (own.has(b.id) ? ' ✓' : ` · ${b.price} L`) });
    }
    markers = out;
  }

  // ---------------- Ngjarjet ----------------
  const isP = (v: Vehicle | null) => !!v && v === getPlayer();
  events.on('collision', c => {
    if (!isP(c.a) && !isP(c.b)) return;
    if (c.impulse > 3) prog.stat('crashes', 1);
    if (!run || c.impulse < 2) return;
    run.hits++;
    const k = run.job.spec.kind;
    if (k === 'taxi') moodHit('crash');
    if (k === 'delivery' && run.si >= 1) {
      run.cargo = Math.max(0, run.cargo - (run.job.spec.fragile ? 0.08 + c.impulse * 0.02 : 0.03));
      if (run.cargo <= 0.05) finish(false, 'Ngarkesa u shkatërrua!');
    }
  });
  events.on('nearMiss', e => {
    prog.stat('nearMisses', 1); prog.addXp(2);
    if (run?.job.spec.kind === 'stunt' && e.speed * 3.6 >= (run.job.spec.minKmh ?? 0)) {
      run.nm++;
      toast(`Kalim i ngushtë! ${run.nm}/${run.job.spec.count}`, 'good');
      if (run.nm >= (run.job.spec.count ?? 3)) finish(true, 'Turma po të duartroket!', starsBy(run.t / (run.limit ?? 90), 0.5, 0.8));
    }
  });
  events.on('redLight', () => { if (run?.job.spec.kind === 'taxi') moodHit('red'); });
  const fine = (amount: number, why: string) => {
    if (amount <= 0) return;
    prog.stat('fines', amount);
    money(-amount, why);
    toast(`${why}: −${amount} L`, 'bad');
  };
  events.on('speedCamera', e => fine(e.fine, `Gjobë shpejtësie (${Math.round(e.speed * 3.6)} km/h)`));
  events.on('busted', e => {
    fine(e.fine, 'U arrestove');
    if (run) finish(false, 'U arrestove nga policia!');
  });

  // ---------------- Kuadri ----------------
  function update(ctx: FrameContext) {
    const p = getPlayer(), dt = ctx.dt;
    if (!p) return;
    // statistikat
    if (lastPos) { const dd = Math.hypot(p.x - lastPos.x, p.z - lastPos.z); if (dd < 50) prog.stat('distance', dd); }
    lastPos = { x: p.x, z: p.z };
    prog.stat('topSpeed', Math.abs(p.speed) * 3.6, 'max');
    if ((saveT -= dt) <= 0) { saveT = 5; prog.save(); }
    if ((genT -= dt) <= 0) { genT = 2; refillGens(); }

    if (run) {
      const r = run, k = r.job.spec.kind, spd = Math.abs(p.speed);
      if (r.countdown > 0) { r.countdown -= dt; if (r.countdown <= 0) { r.started = true; r.boardedT = r.t; r.limit = r.t + Math.round(routeLen(findRoute(city, r.job.start, r.job.to!).points) / 9.5 + 10); toast('Nisu!', 'good'); } }
      r.t += dt;
      // pasagjeri
      if (k === 'taxi' && r.si >= 1 && r.job.passenger) {
        const pm = r.job.passenger.mood;
        const decel = (prevSpeed - spd) / Math.max(dt, 1e-3);
        harshCd = Math.max(0, harshCd - dt);
        if (harshCd === 0 && spd > 3 && decel > 9) { moodHit('brake'); harshCd = 1.5; }
        else if (harshCd === 0 && spd > 6 && Math.abs(p.yawRate * spd) > 8) { moodHit('corner'); harshCd = 1.5; }
        const lim = city.nearestEdge(p.x, p.z)?.edge.speedLimit ?? 14;
        if (pm === 'nxitim') r.mood += (spd > lim * 0.9 ? 0.02 : spd < 4 ? -0.008 : 0) * dt;
        else if (spd > lim + 4) r.mood -= (pm === 'nervoz' ? 0.06 : pm === 'vip' ? 0.02 : 0.03) * dt;
        else r.mood += 0.004 * dt;
        r.mood = Math.max(0, Math.min(1, r.mood));
        if ((r.happyT -= dt) <= 0 && r.mood > 0.7) { r.happyT = 15; say(r.job.passenger.happy); }
        if (r.mood <= 0) { finish(false, `${r.job.passenger.name} zbriti i zemëruar!`); }
      }
      if (run) {
        run.lineT = Math.max(0, run.lineT - dt);
        // objektivi
        const s = run.stages[run.si];
        if (s && (run.started || run.si === 0)) {
          const dd = Math.hypot(p.x - s.x, p.z - s.z);
          const headOk = s.kind !== 'parking' || Math.abs(angleDiff(p.heading, s.heading ?? 0)) < 20 * Math.PI / 180;
          if (dd < s.radius && (s.stop == null || spd < s.stop) && headOk) reachStage(p);
        }
      }
      if (run && run.limit != null && run.t > run.limit) {
        const k2 = run.job.spec.kind;
        finish(false, k2 === 'taxi' ? 'Pasagjeri u mërzit nga vonesa.' : k2 === 'escape' ? 'Policia të rrethoi.' : 'Koha mbaroi!');
      }
    }
    prevSpeed = Math.abs(p.speed);
    if (run) refreshView(p);

    // GPS
    const target: Vec2 | null = view?.target ?? waypoint;
    if (!run && waypoint && Math.hypot(p.x - waypoint.x, p.z - waypoint.z) < 20) { waypoint = null; toast('Arrite në destinacion.'); }
    if (!target) { route = []; routeTarget = null; }
    else {
      routeT -= dt;
      const moved = !routeTarget || routeTarget.x !== target.x || routeTarget.z !== target.z;
      if (moved || routeT <= 0 || distToPolyline(p, route) > 25) {
        routeT = 1.5; routeTarget = { ...target };
        route = findRoute(city, { x: p.x, z: p.z }, target).points;
      }
    }
    if ((markerT -= dt) <= 0 || run) { markerT = 0.5; buildMarkers(p); }
  }

  refillGens();
  buildMarkers(getPlayer());

  return {
    get active() { return view; },
    get markers() { return markers; },
    get route() { return route; },
    available: () => availableJobs().map(j => j.def),
    start,
    abort() { if (run) finish(false, 'Misioni u anulua.'); },
    update,
    setWaypoint(p) { waypoint = p ? { x: p.x, z: p.z } : null; routeT = 0; },
    nearbyMissionAt(x, z) {
      let best: MissionDef | null = null, bd = 7;
      // misioni i historisë ka përparësi ndaj përsëritjeve në të njëjtin vend
      const si = storyIndex(), sid = si >= 0 ? career[si].def.id : '';
      for (const j of availableJobs()) {
        const dd = Math.hypot(j.def.start.x - x, j.def.start.z - z) - (j.def.id === sid ? 5 : 0) + (prog.profile.missionStars[j.def.id] ? 1 : 0);
        if (dd < bd) { bd = dd; best = j.def; }
      }
      return best;
    },
    nextStory() { const i = storyIndex(); return i >= 0 ? career[i].def : null; },
  };
}

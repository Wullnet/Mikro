// Demo/test i misioneve: skenarë të skriptuar mbi qytetin REAL me lojtar të rremë.
import type { FrameContext, GameEvents, MissionResult, PoliceSystem, TrafficSystem, Vec2, Vehicle } from '../core/contracts';
import { Emitter } from '../core/events';
import { findRoute } from '../core/roads';
import { createCity } from '../world';
import { createMissions, createProgression, PROFILE_KEY, xpForLevel } from '../missions';
import { PROPERTIES } from '../data/properties';
import { CAREER } from '../data/missions';

const logEl = document.getElementById('log')!;
logEl.textContent = '';
let fails = 0;
function check(name: string, ok: boolean, info = '') {
  if (!ok) fails++;
  console.log(`[demo] ${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
  const d = document.createElement('div'); d.className = ok ? 'p' : 'f'; d.textContent = `${ok ? 'PASS' : 'FAIL'} ${name} ${info}`; logEl.append(d);
}

class MemStorage implements Storage {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

const t0 = performance.now();
const city = createCity(20260930, 'low');
const events = new Emitter<GameEvents>();
const police = { wanted: 0, units: [], bustedProgress: 0, addHeat() {}, startPursuit(l: number) { this.wanted = l; }, stop() { this.wanted = 0; }, update() {} };
const traffic: TrafficSystem = { vehicles: [], density: 1, update() {}, clearAround() {} };
const player = { x: city.playerSpawn.x, z: city.playerSpawn.z, heading: city.playerSpawn.heading, speed: 0, yawRate: 0, vx: 0, vz: 0, halfW: 0.9, halfL: 2 } as unknown as Vehicle & { speed: number };

// ---- Progresi
const store = new MemStorage();
store.setItem(PROFILE_KEY, JSON.stringify({ version: 1, money: 9000, xp: 1200, level: 2, ownedCars: ['liqeni', 'xxx'], settings: { quality: 'high' } }));
const prog = createProgression(store);
check('migrim nga stub-i', prog.profile.version === 2 && prog.profile.money === 9000 && prog.profile.level === 2 && prog.profile.settings.quality === 'high' && prog.profile.settings.sound === true && prog.profile.ownedCars.join() === 'liqeni', JSON.stringify({ l: prog.profile.level, c: prog.profile.ownedCars }));
check('kurba e niveleve', xpForLevel(10) > 12000 && xpForLevel(10) < 20000, `L10=${xpForLevel(10)} L2=${xpForLevel(2)}`);
check('blerja e makinës (niveli)', !prog.buyCar('shqiponja') && prog.buyCar('vjosa') && prog.profile.money === 1000 && prog.profile.selectedCar === 'vjosa');
prog.addMoney(50000, 'test');
const up = [prog.upgradePrice('vjosa', 'engine'), 0, 0];
const b1 = prog.buyUpgrade('vjosa', 'engine'); up[1] = prog.upgradePrice('vjosa', 'engine');
prog.buyUpgrade('vjosa', 'engine'); prog.buyUpgrade('vjosa', 'engine');
check('përmirësimet maks 3', b1 && prog.profile.upgrades.vjosa.engine === 3 && !prog.buyUpgrade('vjosa', 'engine') && !prog.buyUpgrade('vjosa', 'nitro'), `çmimet ${up[0]}, ${up[1]}`);
check('biznesi', prog.buyProperty('lavazh-bllok') && !prog.buyProperty('lavazh-bllok'));
(prog.profile as any).lastIncomeAt = Date.now() - 10 * 3.6e6;
const inc = prog.collectIncome();
check('të ardhurat (kufiri 8 orë)', inc === 300 * 8, `${inc} L`);
prog.setColor('vjosa', 0x123456); prog.updateSettings({ camera: 'far' });
const prog2 = createProgression(store);
check('ruaj/ngarko', prog2.profile.money === prog.profile.money && prog2.profile.carColors.vjosa === 0x123456 && prog2.profile.settings.camera === 'far' && prog2.profile.properties[0] === 'lavazh-bllok');
const prog3 = createProgression({ getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } } as unknown as Storage);
check('storage i bllokuar', prog3.profile.money === 2500 && prog3.profile.ownedCars[0] === 'liqeni');
check('bizneset e vendosura', PROPERTIES.length >= 7 && PROPERTIES.every(p => p.price >= 5000 && p.price <= 250000));

// ---- Misionet me profil të ri
const p = createProgression(new MemStorage());
let changes = 0; p.onChange(() => changes++);
const ms = createMissions({ city, progression: p, events, police: police as unknown as PoliceSystem, traffic, getPlayer: () => player });
check('bizneset te POI reale', PROPERTIES.every(b => city.pois.some(q => q.x === b.x && q.z === b.z)));
const results: MissionResult[] = []; let levelUps = 0, started = 0;
events.on('missionEnded', r => results.push(r));
events.on('levelUp', () => levelUps++);
events.on('missionStarted', () => started++);

let time = 0;
const ctx = (dt: number) => ({ time: (time += dt), dt, timeOfDay: 12, isNight: false, camera: null, scene: null, player, quality: 'low' } as unknown as FrameContext);
function step(dt = 0.1) { ms.update(ctx(dt)); }
const locked = new Set(city.districts.filter(d => d.unlockLevel > 1).map(d => d.id));
step();
check('lagjet e kyçura përjashtohen', ms.available().length > 0 && ms.available().every(d => !locked.has(d.district)), `${ms.available().length} misione`);
check('shënuesit ≤ 12 misione', ms.markers.filter(m => m.kind === 'mission').length <= 12 && ms.markers.some(m => m.kind === 'garage') && ms.markers.some(m => m.kind === 'business'));

/** Ngas lojtarin përgjatë rrugës deri te `to`, pastaj ndalo butë. */
function drive(to: Vec2, v: number, heading?: number) {
  const pts = findRoute(city, player, to).points.concat([to]);
  for (let i = 1; i < pts.length && ms.active; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.z - a.z);
    if (L < 0.01) continue;
    player.heading = Math.atan2(b.x - a.x, b.z - a.z);
    for (let d = 0; d < L && ms.active; d += v * 0.1) { player.x = a.x + (b.x - a.x) * d / L; player.z = a.z + (b.z - a.z) * d / L; player.speed = v; step(); }
    player.x = b.x; player.z = b.z;
  }
  if (heading != null) player.heading = heading;
  for (let s = v; s > 0 && ms.active; s -= 0.6) { player.speed = s; step(); }
  player.speed = 0; for (let i = 0; i < 5 && ms.active; i++) step();
}
function autoplay(id: string, hook?: (stage: number) => void): MissionResult | null {
  const n = results.length;
  if (!ms.start(id)) return null;
  let stage = 0;
  for (let it = 0; it < 80 && ms.active; it++) {
    hook?.(stage++);
    if (!ms.active) break;
    const v = ms.active, kind = v.def.kind;
    if (!v.target) { events.emit('nearMiss', { other: player, speed: 25, streak: 1 }); step(); continue; }
    const park = ms.markers.find(m => m.kind === 'parking');
    drive(v.target, kind === 'race' || kind === 'escape' ? 20 : 10, park?.heading);
    if (kind === 'race') for (let i = 0; i < 40 && ms.active?.timeLeft == null; i++) step();
  }
  return results.length > n ? results[results.length - 1] : null;
}

// skenarë të veçantë
check('fillimi i misionit 1 nga largësia', ms.available().some(d => d.id === 'c01'));
let mood0 = 1, cargoLines = '';
for (const c of CAREER) {
  while (p.profile.level < c.lvl) p.addXp(p.xpForLevel(p.profile.level + 1) - p.profile.xp);
  const near = ms.nearbyMissionAt(ms.available().find(d => d.id === c.id)?.start.x ?? -1e4, ms.available().find(d => d.id === c.id)?.start.z ?? -1e4);
  const r = autoplay(c.id, st => {
    if (c.id === 'c03' && st === 1) { events.emit('redLight', { nodeId: 0 }); step(); mood0 = ms.active?.passenger?.mood ?? 1; }
    if (c.id === 'c09' && st === 1) events.emit('collision', { a: player, b: null, impulse: 4, x: player.x, z: player.z });
    if (c.id === 'c11' && st === 0) check('arratisja nis ndjekjen', police.wanted === 1);
  });
  if (c.id === 'c09') cargoLines = r?.lines.join(' | ') ?? '';
  check(`karriera ${c.id} ${c.kind} "${c.title}"`, !!r && r.success && r.stars >= 1 && near?.id === c.id, r ? `${r.stars}★ ${r.reward} L, ${r.xp} XP` : 'nuk nisi/përfundoi');
}
check('humori i pasagjerit (semafor i kuq)', mood0 < 0.85, mood0.toFixed(2));
check('ngarkesa e brishtë humb vlerë', cargoLines.includes('dëmtuar'), cargoLines);
check('policia ndalet pas arratisjes', police.wanted === 0);
check('nivelet + levelUp', levelUps >= 9 && p.profile.level >= 10, `niveli ${p.profile.level}, ${levelUps} levelUp`);

// punët e gjeneruara
const gt = ms.available().find(d => d.id.startsWith('gen-taxi'))!, gd = ms.available().find(d => d.id.startsWith('gen-delivery'))!;
const rt = gt && autoplay(gt.id), rd = gd && autoplay(gd.id);
check('taksi e gjeneruar', !!rt?.success, rt ? `${rt.reward} L ${rt.stars}★` : '');
check('dërgesë e gjeneruar', !!rd?.success, rd ? `${rd.reward} L ${rd.stars}★ ${gd.title}` : '');
step(); for (let i = 0; i < 30; i++) step();
check('punët rimbushen', ms.available().filter(d => d.id.startsWith('gen-')).length === 6);
// arrestimi + gjobat
const m0 = p.profile.money;
events.emit('speedCamera', { speed: 25, limit: 14, fine: 2000 });
check('gjoba e kamerës', p.profile.money === m0 - 2000 && p.profile.stats.fines === 2000);
const g2 = ms.available().find(d => d.id.startsWith('gen-'))!;
ms.start(g2.id); step();
const tv = ms.active;
check('MissionView i plotë', !!tv && !!tv.objective && !!tv.target, JSON.stringify(tv && { o: tv.objective, p: tv.progress, t: tv.timeLeft }));
events.emit('busted', { fine: 5000 });
check('arrestimi dështon misionin', !ms.active && results[results.length - 1].success === false && p.profile.money === m0 - 7000);
// taksi me makinë taksi + abort
ms.start(ms.available().find(d => d.id.startsWith('gen-'))!.id); ms.abort();
check('abort', !ms.active && !results[results.length - 1].success);
// waypoint
ms.setWaypoint({ x: 600, z: 300 }); step();
check('GPS i lirë', ms.route.length >= 2);
ms.setWaypoint(null); step();
check('GPS fshihet', ms.route.length === 0);
check('statistikat', p.profile.stats.distance > 1000 && p.profile.stats.nearMisses > 0 && p.profile.stats.missions >= 32 && changes > 0, JSON.stringify(p.profile.stats));
console.log(`[demo] ${fails ? 'FAIL' : 'PASS'} gjithsej (${fails} gabime) në ${Math.round(performance.now() - t0)} ms; para ${p.profile.money} L`);

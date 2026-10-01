// Progresi: profili, ekonomia, makinat, përmirësimet, bizneset. Ruhet në localStorage ('trc_profile').
import type { Progression, Profile, Settings, Upgrades } from '../core/contracts';
import { PLAYER_CARS } from '../data/catalog';
import { PROPERTIES } from '../data/properties';

export const PROFILE_KEY = 'trc_profile';
export const PROFILE_VERSION = 2;
export const INCOME_CAP_H = 8;
export const DEFAULT_SETTINGS: Settings = { controls: 'wheel', quality: 'medium', sound: true, music: true, camera: 'chase', vibration: true, trafficDensity: 0.8, tiltSensitivity: 1 };

/** XP totale për të arritur nivelin l (niveli 10 ≈ 16 200 XP ≈ 3–5 orë lojë). */
export const xpForLevel = (l: number) => (l <= 1 ? 0 : 120 * (l - 1) * (l + 5));
export const levelForXp = (xp: number) => { let l = 1; while (l < 50 && xp >= xpForLevel(l + 1)) l++; return l; };

export function freshProfile(): Profile {
  return {
    version: PROFILE_VERSION, money: 2500, xp: 0, level: 1, ownedCars: ['liqeni'], selectedCar: 'liqeni', carColors: {}, upgrades: {},
    properties: [], missionStars: {}, stats: { distance: 0, nearMisses: 0, missions: 0, crashes: 0, fines: 0, topSpeed: 0 },
    settings: { ...DEFAULT_SETTINGS }, tutorialDone: false, lastIncomeAt: Date.now(),
  };
}

const num = (v: unknown, d: number) => (typeof v === 'number' && isFinite(v) ? v : d);
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);

/** Migrim nga çdo format i vjetër/i pjesshëm (përfshirë stub-in v1). */
export function migrateProfile(raw: unknown): Profile {
  const f = freshProfile(), r = obj(raw);
  const cars = new Set(PLAYER_CARS.map(c => c.id));
  const owned = Array.from(new Set(['liqeni', ...strs(r.ownedCars).filter(id => cars.has(id))]));
  const ups: Record<string, Upgrades> = {};
  for (const [id, u] of Object.entries(obj(r.upgrades))) {
    if (!cars.has(id)) continue;
    const o = obj(u), c = (k: string) => Math.max(0, Math.min(3, Math.round(num(o[k], 0))));
    ups[id] = { engine: c('engine'), brakes: c('brakes'), handling: c('handling'), nitro: c('nitro') };
  }
  const colors: Record<string, number> = {};
  for (const [id, c] of Object.entries(obj(r.carColors))) if (typeof c === 'number') colors[id] = c;
  const stars: Record<string, number> = {};
  for (const [id, s] of Object.entries(obj(r.missionStars))) if (typeof s === 'number') stars[id] = Math.max(0, Math.min(3, s));
  const st = obj(r.stats), se = obj(r.settings);
  const xp = Math.max(0, num(r.xp, 0));
  const props = new Set(PROPERTIES.map(p => p.id));
  const settings = { ...DEFAULT_SETTINGS } as Settings;
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) if (typeof se[k] === typeof DEFAULT_SETTINGS[k]) (settings as any)[k] = se[k];
  return {
    version: PROFILE_VERSION,
    money: Math.max(0, Math.round(num(r.money, f.money))),
    xp, level: levelForXp(xp),
    ownedCars: owned,
    selectedCar: owned.includes(r.selectedCar) ? r.selectedCar : 'liqeni',
    carColors: colors, upgrades: ups,
    properties: Array.from(new Set(strs(r.properties).filter(id => props.has(id)))),
    missionStars: stars,
    stats: {
      distance: num(st.distance, 0), nearMisses: num(st.nearMisses, 0), missions: num(st.missions, 0),
      crashes: num(st.crashes, 0), fines: num(st.fines, 0), topSpeed: num(st.topSpeed, 0),
    },
    settings,
    tutorialDone: r.tutorialDone === true,
    lastIncomeAt: num(r.lastIncomeAt, Date.now()),
  };
}

export type StatKey = keyof Profile['stats'];

export interface ProgressionX extends Progression {
  onChange(fn: () => void): () => void;
  /** Thirret për çdo nivel të ri (createMissions e kthen në ngjarjen 'levelUp'). */
  onLevelUp(fn: (level: number) => void): () => void;
  /** Çmimi i makinës pas zbritjes (salloni −15%). */
  carPrice(id: string): number;
  hasPerk(kind: 'taxi' | 'garage' | 'dealership'): boolean;
  pendingIncome(now?: number): number;
  incomePerHour(): number;
  stat(key: StatKey, value: number, mode?: 'add' | 'max'): void;
  recordMission(id: string, stars: number): void;
  setTutorialDone(): void;
}

export function createProgression(storage?: Storage): ProgressionX {
  const st = (): Storage | null => { try { return storage ?? globalThis.localStorage ?? null; } catch { return null; } };
  let p: Profile = freshProfile();
  try { const s = st()?.getItem(PROFILE_KEY); if (s) p = migrateProfile(JSON.parse(s)); } catch { p = freshProfile(); }
  const listeners = new Set<() => void>(), lvlFns = new Set<(l: number) => void>();
  const save = () => { try { st()?.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* bosh */ } };
  const changed = () => { save(); for (const f of listeners) { try { f(); } catch (e) { console.error(e); } } };
  const spec = (id: string) => PLAYER_CARS.find(c => c.id === id);
  const hasPerk = (kind: string) => p.properties.some(id => PROPERTIES.find(d => d.id === id)?.kind === kind);
  const incomePerHour = () => p.properties.reduce((s, id) => s + (PROPERTIES.find(d => d.id === id)?.incomePerHour ?? 0), 0);
  const pendingIncome = (now = Date.now()) => {
    const h = Math.min(INCOME_CAP_H, Math.max(0, (now - p.lastIncomeAt) / 3.6e6));
    return Math.floor(incomePerHour() * h);
  };
  const carPrice = (id: string) => { const s = spec(id); return s ? Math.round(s.price * (hasPerk('dealership') ? 0.85 : 1)) : Infinity; };
  const spend = (a: number) => { if (a < 0 || p.money < a) return false; p.money -= Math.round(a); return true; };

  const api: ProgressionX = {
    get profile() { return p; },
    addMoney(a) { p.money = Math.max(0, Math.round(p.money + a)); changed(); },
    spend(a) { const ok = spend(a); if (ok) changed(); return ok; },
    addXp(a) {
      if (!(a > 0)) return;
      p.xp += Math.round(a);
      const from = p.level, to = levelForXp(p.xp);
      p.level = to;
      changed();
      for (let l = from + 1; l <= to; l++) for (const f of lvlFns) { try { f(l); } catch (e) { console.error(e); } }
    },
    xpForLevel,
    buyCar(id) {
      const s = spec(id);
      if (!s || p.ownedCars.includes(id) || p.level < s.unlockLevel || !spend(carPrice(id))) return false;
      p.ownedCars.push(id); p.selectedCar = id; changed(); return true;
    },
    selectCar(id) { if (p.ownedCars.includes(id)) { p.selectedCar = id; changed(); } },
    setColor(carId, color) { p.carColors[carId] = color; changed(); },
    upgradePrice(carId, kind) {
      const s = spec(carId), cur = p.upgrades[carId]?.[kind] ?? 0;
      if (!s || cur >= 3 || (kind === 'nitro' && !s.nitro)) return 0;
      const base = Math.max(s.price, 6000) * 0.1 + 1500;
      return Math.round(base * [1, 2, 3.5][cur] * (hasPerk('garage') ? 0.8 : 1) / 50) * 50;
    },
    buyUpgrade(carId, kind) {
      if (!p.ownedCars.includes(carId)) return false;
      const price = api.upgradePrice(carId, kind);
      if (!price || !spend(price)) return false;
      const u = p.upgrades[carId] ?? { engine: 0, brakes: 0, handling: 0, nitro: 0 };
      p.upgrades[carId] = { ...u, [kind]: u[kind] + 1 };
      changed(); return true;
    },
    buyProperty(id) {
      const d = PROPERTIES.find(q => q.id === id);
      if (!d || p.properties.includes(id) || p.money < d.price) return false;
      // mblidh të ardhurat e vjetra para se të shtohet biznesi i ri
      p.money += pendingIncome(); p.lastIncomeAt = Date.now();
      spend(d.price); p.properties.push(id); changed(); return true;
    },
    collectIncome() {
      const a = pendingIncome();
      p.lastIncomeAt = Date.now();
      p.money += a; changed(); return a;
    },
    updateSettings(patch) { p.settings = { ...p.settings, ...patch }; changed(); },
    save,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    onLevelUp(fn) { lvlFns.add(fn); return () => lvlFns.delete(fn); },
    carPrice, hasPerk, pendingIncome, incomePerHour,
    stat(key, v, mode = 'add') { p.stats[key] = mode === 'max' ? Math.max(p.stats[key], v) : p.stats[key] + v; },
    recordMission(id, stars) { p.missionStars[id] = Math.max(p.missionStars[id] ?? 0, stars); p.stats.missions++; changed(); },
    setTutorialDone() { p.tutorialDone = true; changed(); },
  };
  return api;
}

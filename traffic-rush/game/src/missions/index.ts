// STUB i përkohshëm: progresi bazë në localStorage, pa misione.
import type { Progression, Profile, Settings, Upgrades, MissionSystem, CityWorld, GameEvents, PoliceSystem, TrafficSystem, Vehicle, Vec2 } from '../core/contracts';
import type { Emitter } from '../core/events';
const KEY = 'trc_profile';
const defSettings: Settings = { controls: 'wheel', quality: 'medium', sound: true, music: true, camera: 'chase', vibration: true, trafficDensity: 0.8, tiltSensitivity: 1 };
function fresh(): Profile {
  return { version: 1, money: 2500, xp: 0, level: 1, ownedCars: ['liqeni'], selectedCar: 'liqeni', carColors: {}, upgrades: {}, properties: [], missionStars: {},
    stats: { distance: 0, nearMisses: 0, missions: 0, crashes: 0, fines: 0, topSpeed: 0 }, settings: { ...defSettings }, tutorialDone: false, lastIncomeAt: Date.now() };
}
export function createProgression(): Progression {
  let p: Profile = fresh();
  try { const s = localStorage.getItem(KEY); if (s) p = { ...p, ...JSON.parse(s), settings: { ...defSettings, ...JSON.parse(s).settings } }; } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };
  return {
    get profile() { return p; },
    addMoney(a) { p = { ...p, money: p.money + a }; save(); },
    spend(a) { if (p.money < a) return false; p = { ...p, money: p.money - a }; save(); return true; },
    addXp(a) { p = { ...p, xp: p.xp + a }; save(); },
    xpForLevel: (l: number) => (l - 1) * (l - 1) * 500,
    buyCar: () => false, selectCar() {}, setColor() {}, buyUpgrade: () => false, upgradePrice: (_c: string, _k: keyof Upgrades) => 0,
    buyProperty: () => false, collectIncome: () => 0,
    updateSettings(patch) { p = { ...p, settings: { ...p.settings, ...patch } }; save(); },
    save,
  };
}
export function createMissions(_d: { city: CityWorld; progression: Progression; events: Emitter<GameEvents>; police: PoliceSystem; traffic: TrafficSystem; getPlayer: () => Vehicle | null }): MissionSystem & { setWaypoint(p: Vec2 | null): void } {
  return { active: null, markers: [], route: [], available: () => [], start: () => false, abort() {}, update() {}, setWaypoint() {} };
}

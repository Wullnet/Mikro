/** Konteksti i përbashkët i ekraneve të UI-së + emërtime dhe ndërtues të vegjël. */
import type { District, GameApi, MissionKind, PropertyDef, UiSound, Vec2 } from '../core/contracts';
import type { MapLayers } from './map';
import { IC } from './icons';
import { esc, fmtMoney } from './util';

export type Screen = 'title' | 'menu' | 'play' | 'pause' | 'map' | 'garage' | 'business' | 'settings' | 'briefing' | 'result';
export type ToastKind = 'info' | 'good' | 'bad';
export type Waypoint = Vec2 & { label: string };

export interface Ctx {
  api: GameApi;
  root: HTMLElement;
  layers: MapLayers;
  readonly screen: Screen;
  go(s: Screen): void;
  toast(text: string, kind?: ToastKind): void;
  sfx(s: UiSound): void;
  waypoint: Waypoint | null;
  setWaypoint(w: Waypoint | null): void;
  refreshMoney(): void;
  district(id: string): District | undefined;
}

export const MISSION_KIND: Record<MissionKind, string> = {
  taxi: 'Taksi', delivery: 'Dërgesë', race: 'Garë', escape: 'Arratisje', parking: 'Parkim', stunt: 'Akrobaci',
};

export const PROP_KIND: Record<PropertyDef['kind'], { name: string; icon: string; color: string }> = {
  carwash: { name: 'Autolarje', icon: IC.drop, color: '#1e88c9' },
  taxi: { name: 'Kompani taksie', icon: IC.taxi, color: '#d9a400' },
  garage: { name: 'Servis makinash', icon: IC.wrench, color: '#5b6b7d' },
  cafe: { name: 'Kafene', icon: IC.cup, color: '#9a5b34' },
  dealership: { name: 'Sallon makinash', icon: IC.tag, color: '#c8202a' },
  parking: { name: 'Parkim', icon: IC.parking, color: '#2f6fe0' },
};

export function moneyChip(api: GameApi): string {
  return `<span class="chip"><span class="coin">${IC.coin}</span><span data-money>${fmtMoney(api.progression.profile.money)}</span></span>`;
}

/** Koka e faqeve të plota: butoni mbrapa + titulli + paratë. */
export function header(title: string, api: GameApi, onBack: () => void, extra = ''): HTMLElement {
  const h = document.createElement('div');
  h.className = 'hdr';
  h.innerHTML = `<button class="ibtn" aria-label="Mbrapa">${IC.back}</button><h2>${esc(title)}</h2>${extra}${moneyChip(api)}`;
  h.querySelector('button')!.addEventListener('click', onBack);
  return h;
}

/** Të ardhurat që presin të mblidhen (vlerësim, sipas orës reale). */
export function pendingIncome(api: GameApi): number {
  const p = api.progression.profile;
  if (!p.properties.length) return 0;
  const perH = incomePerHour(api);
  const h = Math.max(0, (Date.now() - (p.lastIncomeAt || Date.now())) / 3.6e6);
  return Math.floor(perH * h);
}

export function incomePerHour(api: GameApi): number {
  const own = new Set(api.progression.profile.properties);
  let s = 0;
  for (const d of api.properties) if (own.has(d.id)) s += d.incomePerHour;
  return s;
}

export function levelFrac(api: GameApi): number {
  const p = api.progression.profile, a = api.progression.xpForLevel(p.level), b = api.progression.xpForLevel(p.level + 1);
  return b > a ? Math.min(1, Math.max(0, (p.xp - a) / (b - a))) : 0;
}

/** Pret një ekran, zbaton `fn` vetëm një herë për çdo prekje (pa klikim të dyfishtë). */
export function onTap(el: Element, fn: (e: Event) => void): void {
  let last = 0;
  el.addEventListener('click', e => { const n = performance.now(); if (n - last < 250) return; last = n; fn(e); });
}

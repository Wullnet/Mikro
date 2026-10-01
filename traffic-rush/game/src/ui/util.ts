/** Ndihmës të vegjël për DOM-in dhe formatimin (UI). */

const NBSP = ' ';

/** "12 500 L" — ndarësi i mijësheve në shqip është hapësira. */
export function fmtMoney(n: number, withUnit = true): string {
  const v = Math.round(n);
  const s = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return (v < 0 ? '−' : '') + s + (withUnit ? NBSP + 'L' : '');
}

/** "+2 500 L" / "−300 L". */
export function fmtSigned(n: number): string {
  return (n >= 0 ? '+' : '') + fmtMoney(n);
}

export function fmtInt(n: number): string {
  return fmtMoney(n, false);
}

/** Ora e ditës 0..24 → "08:45". */
export function fmtClock(t: number): string {
  const m = Math.floor((((t % 24) + 24) % 24) * 60);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/** Sekonda → "1:05" ose "0:09". */
export function fmtTimer(s: number): string {
  const v = Math.max(0, Math.ceil(s));
  return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0');
}

/** Distanca: "850 m" / "1,2 km" (presje dhjetore në shqip). */
export function fmtDist(m: number): string {
  if (m < 1000) return Math.round(m / 10) * 10 + NBSP + 'm';
  return (m / 1000).toFixed(1).replace('.', ',') + NBSP + 'km';
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function hex(c: number): string {
  return '#' + (c & 0xffffff).toString(16).padStart(6, '0');
}

export function rgba(c: number, a: number): string {
  return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
}

/** Përzien dy ngjyra (0xRRGGBB); t = 0 → a, 1 → b. */
export function mix(a: number, b: number, t: number): number {
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Krijon element nga HTML (një rrënjë). */
export function html<T extends HTMLElement = HTMLElement>(s: string): T {
  const t = document.createElement('template');
  t.innerHTML = s.trim();
  return t.content.firstElementChild as T;
}

export function $<T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string): T {
  const el = root.querySelector(sel);
  if (!el) throw new Error('[ui] mungon ' + sel);
  return el as T;
}

/** Shkruan tekst vetëm kur ndryshon (pa layout thrash). */
export function setText(el: HTMLElement, v: string): void {
  if ((el as any).__t !== v) { (el as any).__t = v; el.textContent = v; }
}

/** Vendos një stil vetëm kur ndryshon. */
export function setStyle(el: HTMLElement, prop: string, v: string): void {
  const k = '__s_' + prop;
  if ((el as any)[k] !== v) { (el as any)[k] = v; el.style.setProperty(prop, v); }
}

export function toggle(el: Element, cls: string, on: boolean): void {
  const k = '__c_' + cls;
  if ((el as any)[k] !== on) { (el as any)[k] = on; el.classList.toggle(cls, on); }
}

export function reducedMotion(): boolean {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** Ruajtje lokale e sigurt (preferencat e UI-së që s'janë te Settings). */
export const store = {
  get(key: string, def: string): string {
    try { return localStorage.getItem('tr-ui:' + key) ?? def; } catch { return def; }
  },
  set(key: string, v: string): void {
    try { localStorage.setItem('tr-ui:' + key, v); } catch { /* s'ka ruajtje */ }
  },
};

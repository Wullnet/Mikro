/** Ikonat SVG (24×24, vija me currentColor). */
const s = (body: string, extra = '') =>
  `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${body}</svg>`;

export const IC = {
  back: s('<path d="M15 5l-7 7 7 7"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  pause: s('<path d="M9 6v12M15 6v12"/>'),
  play: s('<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>'),
  map: s('<path d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5z"/><path d="M9 4v13M15 6.5v13"/>'),
  car: s('<path d="M4 16v-3.5L6 8h12l2 4.5V16"/><path d="M3 16h18v2H3z"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/><path d="M6.5 12h11"/>'),
  building: s('<path d="M4 20V8l6-3v15M10 20V4l10 3v13M3 20h18"/><path d="M13 9h1M16 9h1M13 12h1M16 12h1M13 15h1M16 15h1M6.5 11h1M6.5 14h1"/>'),
  gear: s('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"/><circle cx="12" cy="12" r="6.6"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  minus: s('<path d="M5 12h14"/>'),
  locate: s('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  lock: s('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  star: s('<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z" fill="currentColor" stroke="none"/>'),
  starLine: s('<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z"/>'),
  wrench: s('<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-5-5l2.5 2.5-1 2-2 1z"/>'),
  bolt: s('<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="currentColor" stroke="none"/>'),
  engine: s('<path d="M4 10h2V8h4V6h4v2h3l2 3h2v5h-2l-2 3H9l-3-3H4z"/>'),
  brake: s('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M5.5 7.5A8 8 0 0 1 9 4.6"/>'),
  handling: s('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M3.8 11h6.2M14 11h6.2M12 14v6.3"/>'),
  coin: s('<circle cx="12" cy="12" r="8.5" fill="currentColor" stroke="none"/><path d="M9.2 8v8h5.6" stroke="#1a1408" stroke-width="2.2"/>'),
  clock: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  xp: s('<path d="M12 3l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 15.2 7 18l1.2-5.6L4 8.6 9.6 8z"/>'),
  sun: s('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  moon: s('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  damage: s('<path d="M3.5 15v-3l2-4h8l2.5 4H20v3z"/><circle cx="7.5" cy="15.8" r="1.5"/><circle cx="16.5" cy="15.8" r="1.5"/><path d="M17 3.5l-1.5 3 2.5.5-1.5 3" stroke-width="1.8"/>'),
  sound: s('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  music: s('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  vibrate: s('<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4.5 8v8M19.5 8v8M2 10v4M22 10v4"/>'),
  camera: s('<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  quality: s('<path d="M4 18l5-7 4 5 3-3 4 5"/><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="16" cy="8.5" r="1.5"/>'),
  traffic: s('<rect x="8" y="2.5" width="8" height="19" rx="3"/><circle cx="12" cy="7" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="17" r="1.6"/>'),
  compass: s('<circle cx="12" cy="12" r="9"/><path d="M12 5.5l2.5 6.5h-5z" fill="currentColor"/><path d="M9.5 12L12 18.5l2.5-6.5"/>'),
  menu: s('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  garageHome: s('<path d="M3 10.5L12 4l9 6.5V20H3z"/><path d="M7 20v-6h10v6M7 17h10"/>'),
  flagX: s('<path d="M5 21V4h11l-2 4 2 4H5"/>'),
  exit: s('<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>'),
  pin: s('<path d="M12 21s-6.5-6.2-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
  paint: s('<path d="M4 15a3 3 0 0 0 3 3h1a2 2 0 0 1 2 2 1 1 0 0 0 1 1 9 9 0 1 0-7-6z"/><circle cx="8.5" cy="10.5" r="1.1" fill="currentColor"/><circle cx="12" cy="7.5" r="1.1" fill="currentColor"/><circle cx="15.5" cy="10.5" r="1.1" fill="currentColor"/>'),
  trophy: s('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3.5 3.5 0 0 0 3.8 4M16 6h3.5a3.5 3.5 0 0 1-3.8 4M12 13v4M8.5 20h7M9.5 17h5v3h-5z"/>'),
  income: s('<path d="M4 17l5-5 4 4 7-7"/><path d="M15 9h5v5"/>'),
  // Llojet e misioneve
  taxi: s('<path d="M4 16v-3l2-4h12l2 4v3"/><path d="M3 16h18v2.5H3z"/><rect x="9" y="5.5" width="6" height="3.5" rx="1"/><circle cx="7.5" cy="16.8" r="1.4"/><circle cx="16.5" cy="16.8" r="1.4"/>'),
  delivery: s('<path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9M7.8 5.5l8.4 4"/>'),
  race: s('<path d="M5 21V4"/><path d="M5 4h14v9H5"/><path d="M5 4h3.5v3H5zM12 4h3.5v3H12zM8.5 7H12v3H8.5zM15.5 7H19v3h-3.5zM5 10h3.5v3H5zM12 10h3.5v3H12z" fill="currentColor" stroke="none"/>'),
  escape: s('<path d="M7 20v-7a5 5 0 0 1 10 0v7z"/><path d="M4 20h16M12 3v2.5M4.5 6.5l1.8 1.8M19.5 6.5l-1.8 1.8"/>'),
  parking: s('<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M9.5 16.5v-9h3.2a2.7 2.7 0 0 1 0 5.4H9.5"/>'),
  stunt: s('<path d="M2.5 19.5h19M4 19.5L17 11v8.5"/><path d="M16 4.5l2.5 2.5M19.5 3l-1 3.5"/>'),
  person: s('<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5a7 7 0 0 1 14 0"/>'),
  // Bizneset
  cup: s('<path d="M5 8.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5c0 1 1 1.3 1 2.5M12 3.5c0 1 1 1.3 1 2.5M4 21h14"/>'),
  drop: s('<path d="M12 3.5s6 6.6 6 10.5a6 6 0 0 1-12 0c0-3.9 6-10.5 6-10.5z"/><path d="M9 14.5a3 3 0 0 0 3 3"/>'),
  tag: s('<path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5z"/><circle cx="8" cy="8.5" r="1.6"/>'),
  chevR: s('<path d="M9 5l7 7-7 7"/>'),
  retry: s('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5v4h4"/>'),
  // Kontrollet
  wheelCtl: s('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M3.6 11h6.4M14 11h6.4M12 14v6.4"/>'),
  tiltCtl: s('<rect x="7.5" y="3" width="9" height="18" rx="2" transform="rotate(-18 12 12)"/><path d="M2.5 15.5a10 10 0 0 0 5 5.5M21.5 8.5a10 10 0 0 0-5-5.5"/>'),
  lanesCtl: s('<path d="M6 3v18M18 3v18M12 4v2.5M12 10.5v3M12 17.5v2.5"/>'),
};

export type IconName = keyof typeof IC;

/** Ikona e llojit të misionit. */
export function missionIcon(kind: string): string {
  return (IC as Record<string, string>)[kind] ?? IC.flagX;
}

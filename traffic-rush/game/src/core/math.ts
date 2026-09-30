/** Ndihmës matematikorë sipas konventave te contracts.ts. */
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

/** Vektori përpara për drejtimin h: (sin h, cos h). */
export const fwdX = (h: number) => Math.sin(h);
export const fwdZ = (h: number) => Math.cos(h);
/** Vektori djathtas për drejtimin h (kthesë djathtas zvogëlon h). */
export const rightX = (h: number) => -Math.cos(h);
export const rightZ = (h: number) => Math.sin(h);

/** Drejtimi që shikon nga (dx, dz). */
export const headingOf = (dx: number, dz: number) => Math.atan2(dx, dz);

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (current: number, target: number, rate: number, dt: number) =>
  target + (current - target) * Math.exp(-rate * dt);

/** Ndryshimi më i shkurtër këndor nga a te b, në (-π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

/** RNG deterministe (mulberry32). */
export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Përmasat dhe profilet e çdo stili trupi (metra; makina shikon nga +Z, qendra në tokë). */
import type { BodyStyle } from '../core/contracts';

export type RimKind = 'five' | 'split' | 'multi' | 'six' | 'steel';

/** Fener që mbështillet nga anësori te faqja e përparme/e pasme. s = indeks i konturit (4 = shpatulla, 6 = buza e sipërme). */
export interface Lamp { depth: number; s0: number; s1: number; b0: number; b1: number; cap: number; rise: number }

export interface CabinDef {
  zA: number; zWT: number; zRT: number; zRB: number;   // baza e xhamit të parë, maja e tij, fundi i çatisë, baza e xhamit të pasëm
  roof: number; drop?: number; bulge?: number; crown?: number;
  inset: number; tumble: number;
  capR?: number;                                      // pjesa e pasme e sheshtë (furgonë, pickup)
  roofGlass?: boolean;
  belt?: 'black' | 'chrome';
  /** Dritaret anësore: [zParaPoshtë, zParaLart, zPasPoshtë, zPasLart] */
  windows: number[][];
}

export interface StyleDef {
  L: number; W: number; R: number; tireW: number; track: number; axles: number[];
  rim: RimKind; rimFrac: number;
  sill: number; top: number[][]; width?: number[][];
  crown: number; sh: number;
  noseR: number; tailR: number; noseK: [number, number]; tailK: [number, number];
  archGap: number; clad?: boolean;
  cabin?: CabinDef;
  head: Lamp; tail: Lamp; tailBar?: boolean;
  grille: 'hatch' | 'sedan' | 'sport' | 'suv' | 'van' | 'police' | 'none';
  doors: number[][];        // [z, sPoshtë]
  handles: number[];
  plateF: number; plateR: number;
  exhaust: number[];        // x të tubave
  cgH: number;
}

const sedanCabin: CabinDef = {
  zA: 0.86, zWT: 0.04, zRT: -0.92, zRB: -1.66, roof: 1.45, drop: 0.04, inset: 0.07, tumble: 0.16, crown: 0.045, belt: 'chrome',
  windows: [[0.72, 0.1, -0.4, -0.38], [-0.48, -0.46, -1.3, -0.97]],
};
const sedan: StyleDef = {
  L: 4.6, W: 0.9, R: 0.33, tireW: 0.225, track: 0.775, axles: [1.38, -1.36], rim: 'split', rimFrac: 0.68,
  sill: 0.29, top: [[2.3, 0.76], [1.8, 0.85], [1.2, 0.92], [0.86, 0.95], [-0.8, 0.99], [-1.6, 1.03], [-2.3, 1.0]],
  width: [[2.3, 0.94], [1.4, 1.0], [-1.4, 1.0], [-2.3, 0.95]],
  crown: 0.045, sh: 0.21, noseR: 0.4, tailR: 0.3, noseK: [0.28, 0.16], tailK: [0.3, 0.2], archGap: 0.055,
  cabin: sedanCabin,
  head: { depth: 0.55, s0: 4.35, s1: 5.75, b0: 5.2, b1: 5.85, cap: 0.24, rise: -0.03 },
  tail: { depth: 0.4, s0: 4.45, s1: 5.75, b0: 5.0, b1: 5.8, cap: 0.26, rise: 0 },
  grille: 'sedan', doors: [[0.82, 1.5], [-0.43, 1.5], [-1.38, 3.7]], handles: [-0.25, -1.18],
  plateF: 0.42, plateR: 0.62, exhaust: [-0.5], cgH: 0.55,
};

export const STYLES: Record<BodyStyle, StyleDef> = {
  hatch: {
    L: 3.95, W: 0.865, R: 0.31, tireW: 0.205, track: 0.745, axles: [1.21, -1.29], rim: 'five', rimFrac: 0.66,
    sill: 0.28, top: [[1.975, 0.77], [1.5, 0.86], [0.9, 0.92], [0.62, 0.95], [-0.6, 0.98], [-1.6, 1.0], [-1.975, 0.98]],
    width: [[1.975, 0.95], [1.2, 1.0], [-1.3, 1.0], [-1.975, 0.96]],
    crown: 0.04, sh: 0.2, noseR: 0.36, tailR: 0.22, noseK: [0.3, 0.18], tailK: [0.25, 0.2], archGap: 0.055,
    cabin: { zA: 0.62, zWT: -0.12, zRT: -1.42, zRB: -1.88, roof: 1.48, drop: 0.03, inset: 0.065, tumble: 0.15, crown: 0.04, belt: 'black',
      windows: [[0.5, -0.07, -0.34, -0.32], [-0.44, -0.42, -1.36, -1.24]] },
    head: { depth: 0.5, s0: 4.35, s1: 5.75, b0: 5.15, b1: 5.85, cap: 0.2, rise: -0.02 },
    tail: { depth: 0.32, s0: 4.4, s1: 5.7, b0: 4.9, b1: 5.8, cap: 0.18, rise: 0 },
    grille: 'hatch', doors: [[0.6, 1.5], [-0.38, 1.5], [-1.22, 3.7]], handles: [-0.24, -1.08],
    plateF: 0.4, plateR: 0.6, exhaust: [-0.45], cgH: 0.55,
  },
  sedan,
  taxi: { ...sedan },
  police: { ...sedan, rim: 'six', grille: 'police' },
  coupe: {
    L: 4.5, W: 0.91, R: 0.335, tireW: 0.235, track: 0.78, axles: [1.32, -1.33], rim: 'multi', rimFrac: 0.7,
    sill: 0.26, top: [[2.25, 0.69], [1.7, 0.79], [1.1, 0.86], [0.74, 0.9], [-0.6, 0.94], [-1.5, 0.99], [-2.25, 0.98]],
    width: [[2.25, 0.93], [1.3, 1.0], [0.0, 0.985], [-1.33, 1.01], [-2.25, 0.95]],
    crown: 0.04, sh: 0.18, noseR: 0.42, tailR: 0.3, noseK: [0.3, 0.15], tailK: [0.35, 0.2], archGap: 0.05,
    cabin: { zA: 0.74, zWT: -0.12, zRT: -0.7, zRB: -1.78, roof: 1.32, drop: 0.03, inset: 0.1, tumble: 0.19, crown: 0.04, belt: 'black',
      windows: [[0.62, -0.06, -1.22, -0.68]] },
    head: { depth: 0.6, s0: 4.6, s1: 5.8, b0: 5.4, b1: 5.85, cap: 0.26, rise: -0.02 },
    tail: { depth: 0.42, s0: 4.7, s1: 5.75, b0: 5.2, b1: 5.8, cap: 0.05, rise: 0 }, tailBar: true,
    grille: 'sedan', doors: [[0.78, 1.5], [-0.55, 1.5]], handles: [-0.42],
    plateF: 0.38, plateR: 0.58, exhaust: [-0.45, 0.45], cgH: 0.5,
  },
  sport: {
    L: 4.55, W: 0.97, R: 0.345, tireW: 0.27, track: 0.83, axles: [1.4, -1.34], rim: 'split', rimFrac: 0.74,
    sill: 0.2, top: [[2.275, 0.58], [1.9, 0.72], [1.4, 0.84], [0.84, 0.86], [0, 0.88], [-0.9, 0.93], [-1.34, 0.98], [-1.9, 0.97], [-2.275, 0.94]],
    width: [[2.275, 0.9], [1.4, 1.0], [0.4, 0.95], [-0.6, 0.97], [-1.34, 1.02], [-2.275, 0.97]],
    crown: -0.03, sh: 0.14, noseR: 0.42, tailR: 0.26, noseK: [0.22, 0.12], tailK: [0.3, 0.2], archGap: 0.045, clad: true,
    cabin: { zA: 0.84, zWT: 0.0, zRT: -0.62, zRB: -1.6, roof: 1.14, drop: 0.02, inset: 0.13, tumble: 0.2, crown: 0.035, belt: 'black', roofGlass: true,
      windows: [[0.72, 0.04, -0.86, -0.56]] },
    head: { depth: 0.62, s0: 4.75, s1: 5.75, b0: 5.45, b1: 5.85, cap: 0.22, rise: 0 },
    tail: { depth: 0.3, s0: 4.6, s1: 5.6, b0: 5.0, b1: 5.6, cap: 0.05, rise: 0 }, tailBar: true,
    grille: 'sport', doors: [[0.8, 1.6], [-0.7, 2.2]], handles: [],
    plateF: 0.33, plateR: 0.5, exhaust: [-0.38, -0.26, 0.26, 0.38], cgH: 0.45,
  },
  suv: {
    L: 4.7, W: 0.95, R: 0.38, tireW: 0.255, track: 0.8, axles: [1.42, -1.38], rim: 'six', rimFrac: 0.64,
    sill: 0.44, top: [[2.35, 0.99], [1.9, 1.07], [1.3, 1.12], [0.98, 1.15], [-1.0, 1.18], [-2.0, 1.19], [-2.35, 1.17]],
    width: [[2.35, 0.95], [1.42, 1.0], [-1.38, 1.0], [-2.35, 0.97]],
    crown: 0.04, sh: 0.24, noseR: 0.34, tailR: 0.2, noseK: [0.22, 0.18], tailK: [0.2, 0.25], archGap: 0.07, clad: true,
    cabin: { zA: 0.98, zWT: 0.24, zRT: -1.92, zRB: -2.24, roof: 1.8, drop: 0.04, inset: 0.075, tumble: 0.13, crown: 0.035, belt: 'chrome',
      windows: [[0.86, 0.3, -0.36, -0.34], [-0.45, -0.43, -1.24, -1.22], [-1.34, -1.32, -2.0, -1.86]] },
    head: { depth: 0.45, s0: 4.4, s1: 5.75, b0: 5.1, b1: 5.8, cap: 0.26, rise: 0 },
    tail: { depth: 0.3, s0: 4.5, s1: 5.8, b0: 4.9, b1: 5.85, cap: 0.12, rise: 0 },
    grille: 'suv', doors: [[0.94, 1.8], [-0.4, 1.8], [-1.3, 3.5]], handles: [-0.22, -1.1],
    plateF: 0.6, plateR: 0.78, exhaust: [-0.5], cgH: 0.75,
  },
  pickup: {
    L: 5.3, W: 0.97, R: 0.39, tireW: 0.265, track: 0.82, axles: [1.75, -1.52], rim: 'six', rimFrac: 0.62,
    sill: 0.5, top: [[2.65, 1.05], [2.1, 1.14], [1.4, 1.19], [1.02, 1.2], [-0.58, 1.22], [-0.68, 1.0], [-2.65, 1.0]],
    crown: 0.03, sh: 0.24, noseR: 0.3, tailR: 0.12, noseK: [0.2, 0.2], tailK: [0.15, 0.2], archGap: 0.075,
    cabin: { zA: 1.02, zWT: 0.32, zRT: -0.5, zRB: -0.6, capR: 0.06, roof: 1.88, inset: 0.08, tumble: 0.12, crown: 0.03, belt: 'black',
      windows: [[0.9, 0.37, 0.0, 0.0], [-0.08, -0.08, -0.46, -0.46]] },
    head: { depth: 0.4, s0: 4.3, s1: 5.8, b0: 5.0, b1: 5.85, cap: 0.3, rise: 0 },
    tail: { depth: 0.1, s0: 4.0, s1: 5.6, b0: 4.0, b1: 5.6, cap: 0.0, rise: 0 },
    grille: 'suv', doors: [[0.98, 1.8], [-0.04, 1.8], [-0.56, 1.8]], handles: [0.12, -0.42],
    plateF: 0.62, plateR: 0.72, exhaust: [-0.6], cgH: 0.8,
  },
  van: {
    L: 5.1, W: 0.99, R: 0.34, tireW: 0.225, track: 0.84, axles: [1.72, -1.58], rim: 'steel', rimFrac: 0.6,
    sill: 0.36, top: [[2.55, 0.98], [2.25, 1.1], [1.75, 1.2], [-2.55, 1.22]],
    crown: 0.03, sh: 0.22, noseR: 0.3, tailR: 0.1, noseK: [0.25, 0.2], tailK: [0.1, 0.15], archGap: 0.06, clad: true,
    cabin: { zA: 1.74, zWT: 1.0, zRT: -2.5, zRB: -2.53, capR: 0.1, roof: 2.32, inset: 0.025, tumble: 0.07, crown: 0.04, belt: 'black',
      windows: [[1.62, 1.04, 0.42, 0.44]] },
    head: { depth: 0.3, s0: 4.5, s1: 5.85, b0: 5.0, b1: 5.85, cap: 0.22, rise: 0 },
    tail: { depth: 0.08, s0: 3.2, s1: 5.8, b0: 3.2, b1: 5.8, cap: 0.06, rise: 0 },
    grille: 'van', doors: [[1.66, 1.6], [0.38, 1.6], [-0.5, 1.6]], handles: [0.5, -0.38],
    plateF: 0.5, plateR: 0.62, exhaust: [-0.6], cgH: 0.9,
  },
  furgon: {
    L: 5.45, W: 0.99, R: 0.34, tireW: 0.215, track: 0.84, axles: [1.78, -1.62], rim: 'steel', rimFrac: 0.58,
    sill: 0.34, top: [[2.725, 0.95], [2.4, 1.05], [1.85, 1.14], [-2.725, 1.16]],
    crown: 0.03, sh: 0.2, noseR: 0.32, tailR: 0.1, noseK: [0.22, 0.18], tailK: [0.1, 0.15], archGap: 0.06,
    cabin: { zA: 1.86, zWT: 1.08, zRT: -2.66, zRB: -2.69, capR: 0.12, roof: 2.42, inset: 0.02, tumble: 0.08, crown: 0.05, belt: 'black',
      windows: [[1.74, 1.12, 0.55, 0.55], [0.42, 0.42, -0.36, -0.36], [-0.46, -0.46, -1.24, -1.24], [-1.34, -1.34, -2.08, -2.08], [-2.18, -2.18, -2.56, -2.5]] },
    head: { depth: 0.25, s0: 4.3, s1: 5.7, b0: 4.6, b1: 5.7, cap: 0.2, rise: 0 },
    tail: { depth: 0.08, s0: 3.2, s1: 5.8, b0: 3.2, b1: 5.8, cap: 0.06, rise: 0 },
    grille: 'van', doors: [[1.72, 1.6], [0.48, 1.6]], handles: [0.62],
    plateF: 0.48, plateR: 0.6, exhaust: [-0.6], cgH: 0.95,
  },
  bus: {
    L: 11.6, W: 1.27, R: 0.5, tireW: 0.3, track: 1.02, axles: [3.1, -2.8], rim: 'steel', rimFrac: 0.56,
    sill: 0.32, top: [[5.8, 2.95], [5.4, 3.05], [-5.8, 3.05]],
    crown: 0.04, sh: 0.3, noseR: 0.34, tailR: 0.26, noseK: [0.5, 0.15], tailK: [0.4, 0.15], archGap: 0.08,
    head: { depth: 0.2, s0: 0.58, s1: 0.78, b0: 0.6, b1: 0.76, cap: 0.22, rise: 0 },
    tail: { depth: 0.14, s0: 0.62, s1: 1.55, b0: 0.62, b1: 1.55, cap: 0.06, rise: 0 },
    grille: 'none', doors: [], handles: [], plateF: 0.4, plateR: 0.5, exhaust: [], cgH: 1.2,
  },
  truck: {
    L: 8.6, W: 1.25, R: 0.5, tireW: 0.3, track: 1.0, axles: [3.25, -2.2, -3.35], rim: 'steel', rimFrac: 0.56,
    sill: 0.95, top: [[4.3, 2.92], [3.9, 3.05], [2.25, 3.05]],
    crown: 0.04, sh: 0.3, noseR: 0.3, tailR: 0.08, noseK: [0.45, 0.1], tailK: [0.3, 0.1], archGap: 0.07,
    head: { depth: 0.12, s0: 0.0, s1: 0.0, b0: 0, b1: 0, cap: 0, rise: 0 },
    tail: { depth: 0.1, s0: 0, s1: 0, b0: 0, b1: 0, cap: 0, rise: 0 },
    grille: 'none', doors: [], handles: [], plateF: 0.62, plateR: 0.55, exhaust: [], cgH: 1.3,
  },
};

/** Distancat nga qendra te boshtet e përparme/të pasme (për fizikën). */
export function axleSpan(st: StyleDef): { a: number; b: number } {
  const rear = st.axles.slice(1);
  return { a: st.axles[0], b: -rear.reduce((s, z) => s + z, 0) / rear.length };
}

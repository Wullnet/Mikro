/**
 * Teksturat procedurale të qytetit (atlasi i fasadave, detajet e tokës, uji) dhe materialet e përbashkëta.
 * Atlasi: kanali alfa = maska e xhamave (255 mur, ~128 xham) → reflektime ditën, dritare të ndezura natën.
 */
import * as THREE from 'three';
import { rng } from '../core/math';

export interface Tile { u: number; v: number; w: number; h: number }
export const AW = 2048, AH = 1024, CS = 128;
const FONT = '"Saira Extra Condensed","Arial Narrow","Roboto Condensed",Arial,sans-serif';

export const CELLS = ['plaster', 'shutter', 'pallat', 'pallat2', 'classic', 'modern', 'office', 'glassB', 'glassG', 'corr',
  'corrWin', 'blank', 'villa', 'brick', 'garage', 'tilemod', 'door', 'pyramid', 'stone', 'palace', 'white', 'roofGravel',
  'roofTile', 'roofMetal', 'awnR', 'awnG', 'concrete', 'balc', 'glassDark', 'plinth'] as const;
export type CellName = typeof CELLS[number];

export interface ShopDef { name: string; bg: string; fg: string; kind: 'cafe' | 'shop' | 'food' | 'auto' }
export const SHOPS: ShopDef[] = [
  { name: 'KAFE FLORA', bg: '#2f6b3f', fg: '#fff3d6', kind: 'cafe' },
  { name: 'PASTIÇERI DAJTI', bg: '#f3d9e2', fg: '#8a1f4a', kind: 'food' },
  { name: 'FARMACIA', bg: '#1d9a55', fg: '#ffffff', kind: 'shop' },
  { name: 'PICA NAPOLI', bg: '#c62828', fg: '#ffffff', kind: 'food' },
  { name: 'BYREKTORE', bg: '#f2b632', fg: '#4a2a0a', kind: 'food' },
  { name: 'MARKET YLLI', bg: '#1f5fae', fg: '#ffd84a', kind: 'shop' },
  { name: 'FURRA E BUKËS', bg: '#7a4a24', fg: '#ffe7b8', kind: 'food' },
  { name: 'BAR LULISHTJA', bg: '#e86c2c', fg: '#ffffff', kind: 'cafe' },
  { name: 'LIBRARIA', bg: '#2b2b2b', fg: '#f4d35e', kind: 'shop' },
  { name: 'OPTIKA DRITA', bg: '#ffffff', fg: '#1a4f8b', kind: 'shop' },
  { name: 'BERBER ARTI', bg: '#20262e', fg: '#e0c27a', kind: 'shop' },
  { name: 'ËMBËLTORE', bg: '#f6c8d3', fg: '#9c2350', kind: 'food' },
  { name: 'MISHTORE', bg: '#a3201c', fg: '#ffffff', kind: 'food' },
  { name: 'ELEKTRO SHTËPIA', bg: '#f5f5f5', fg: '#d0331f', kind: 'shop' },
  { name: 'LULISHTE', bg: '#6aa84f', fg: '#ffffff', kind: 'shop' },
  { name: 'QEBAPTORE', bg: '#5b2c12', fg: '#ffb84d', kind: 'food' },
  { name: 'FRUTA PERIME', bg: '#3f8f2b', fg: '#fff07a', kind: 'shop' },
  { name: 'TELEFONA', bg: '#5a2ca0', fg: '#ffffff', kind: 'shop' },
  { name: 'KAFE MIMOZA', bg: '#f0c419', fg: '#2a2a2a', kind: 'cafe' },
  { name: 'RESTORANT TRADITA', bg: '#3b2416', fg: '#e8c48a', kind: 'food' },
  { name: 'GOMISTERI', bg: '#222222', fg: '#ffcc00', kind: 'auto' },
  { name: 'PJESË KËMBIMI', bg: '#0f4c81', fg: '#ffffff', kind: 'auto' },
  { name: 'AUTO SERVIS', bg: '#d32f2f', fg: '#ffffff', kind: 'auto' },
  { name: 'KAFE ARTI', bg: '#14213d', fg: '#fca311', kind: 'cafe' },
];

export interface Atlas {
  tex: THREE.DataTexture;
  c: Record<CellName, Tile>;
  pat: Tile[];
  shop: Tile[];
}

const PAL = ['#e63946', '#f4c430', '#2a9d8f', '#e76f51', '#8e44ad', '#3a86ff', '#06d6a0', '#ff006e', '#fb8500', '#43aa8b', '#f2e8cf', '#1d3557'];

/** Ndërton atlasin e fasadave (2048×1024). */
export function makeAtlas(seed: number): Atlas {
  const R = rng(seed ^ 0xa71a5);
  const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH;
  const mv = document.createElement('canvas'); mv.width = AW; mv.height = AH;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  const m = mv.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#d8d4cc'; g.fillRect(0, 0, AW, AH);
  m.fillStyle = '#000'; m.fillRect(0, 0, AW, AH);

  const rect = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const unmask = (x: number, y: number, w: number, h: number) => { m.fillStyle = '#000'; m.fillRect(x, y, w, h); };
  const glass = (x: number, y: number, w: number, h: number, a = '#7f95a6', b = '#2a3a48', c = '#18222c') => {
    const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h);
    gr.addColorStop(0, a); gr.addColorStop(0.55, b); gr.addColorStop(1, c);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.10)';
    g.beginPath(); g.moveTo(x + w * 0.1, y + h); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.72, y); g.lineTo(x + w * 0.32, y + h); g.fill();
    m.fillStyle = '#fff'; m.fillRect(x, y, w, h);
  };
  // Dritare me kornizë dhe kryq.
  const win = (x: number, y: number, w: number, h: number, fr = '#f4f1ea', t = 4, cross = true) => {
    rect(x, y, w, h, fr);
    glass(x + t, y + t, w - 2 * t, h - 2 * t);
    if (cross) {
      rect(x + w / 2 - t / 2, y + t, t, h - 2 * t, fr); unmask(x + w / 2 - t / 2, y + t, t, h - 2 * t);
      rect(x + t, y + h * 0.36, w - 2 * t, t * 0.8, fr); unmask(x + t, y + h * 0.36, w - 2 * t, t * 0.8);
    }
  };
  const shade = (x: number, y: number, w: number, h: number) => {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(0,0,0,0.0)'); gr.addColorStop(1, 'rgba(0,0,0,0.10)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  };

  const cells = {} as Record<CellName, Tile>;
  const tileOf = (x: number, y: number, w: number, h: number): Tile => ({ u: (x + 1.5) / AW, v: (y + 1.5) / AH, w: (w - 3) / AW, h: (h - 3) / AH });
  const S = CS;
  const draw: Record<CellName, (x: number, y: number) => void> = {
    plaster: (x, y) => { rect(x, y, S, S, '#efe9df'); rect(x + 26, y + 20, 76, 8, '#e2dbcf'); win(x + 32, y + 28, 64, 70); rect(x + 26, y + 98, 76, 7, '#d6cfc3'); shade(x, y, S, S); },
    shutter: (x, y) => {
      rect(x, y, S, S, '#f1eadf'); win(x + 40, y + 24, 48, 78, '#f6f3ee', 4);
      for (const sx of [x + 22, x + 88]) { rect(sx, y + 24, 18, 78, '#3f6b4a'); for (let k = 0; k < 13; k++) rect(sx + 1, y + 27 + k * 6, 16, 2, '#2f533a'); }
      rect(x + 20, y + 102, 88, 6, '#dcd4c6');
    },
    pallat: (x, y) => {
      rect(x, y, S, S, '#dcd7cf'); rect(x, y + 120, S, 3, '#bdb7ad'); rect(x, y, 3, S, '#c9c3b9');
      win(x + 28, y + 26, 72, 64, '#ebe8e2', 4, false); rect(x + 62, y + 30, 4, 56, '#ebe8e2'); unmask(x + 62, y + 30, 4, 56);
      rect(x + 24, y + 90, 80, 6, '#c8c2b8');
    },
    pallat2: (x, y) => {
      rect(x, y, S, S, '#dad4ca'); rect(x + 12, y + 10, 104, 110, '#7f7a72');
      glass(x + 20, y + 18, 50, 96); glass(x + 76, y + 18, 32, 50);
      rect(x + 12, y + 78, 104, 42, '#d6d0c6'); unmask(x + 12, y + 78, 104, 42);
      for (let k = 0; k < 4; k++) rect(x + 12, y + 84 + k * 9, 104, 2, '#bfb8ad');
    },
    classic: (x, y) => {
      rect(x, y, S, S, '#e8dfcc'); for (let k = 0; k < 8; k++) rect(x, y + k * 16, S, 1, '#d8cdb6');
      rect(x + 30, y + 8, 68, 10, '#d4c7ad'); win(x + 38, y + 20, 52, 86, '#f5efe3', 4);
      rect(x + 32, y + 106, 64, 7, '#cdbfa4');
    },
    modern: (x, y) => {
      rect(x, y, S, S, '#e6e4e0'); glass(x, y + 30, S, 74, '#8ea4b4', '#3d5466', '#1e2b36');
      for (const mx of [0, 42, 86]) { rect(x + mx, y + 30, 3, 74, '#cfd3d6'); unmask(x + mx, y + 30, 3, 74); }
    },
    office: (x, y) => {
      rect(x, y, S, S, '#d9d7d3'); win(x + 12, y + 22, 48, 74, '#5a5f66', 3, false); win(x + 68, y + 22, 48, 74, '#5a5f66', 3, false);
      rect(x, y + 112, S, 4, '#c3c0bb');
    },
    glassB: (x, y) => {
      glass(x, y, S, S, '#9cc0db', '#3f6788', '#1d3550'); rect(x, y + 106, S, 22, '#26313d'); unmask(x, y + 106, S, 22);
      rect(x, y + 106, S, 2, '#8796a5');
      for (const mx of [0, 64]) { rect(x + mx, y, 3, S, '#b8c4ce'); unmask(x + mx, y, 3, S); }
    },
    glassG: (x, y) => {
      glass(x, y, S, S, '#9fd6cf', '#2f6e6a', '#173d3b'); rect(x, y + 110, S, 18, '#1f2b2b'); unmask(x, y + 110, S, 18);
      for (const mx of [0, 42, 86]) { rect(x + mx, y, 2, S, '#c7d6d4'); unmask(x + mx, y, 2, S); }
    },
    corr: (x, y) => { rect(x, y, S, S, '#d2d2d2'); for (let k = 0; k < 16; k++) { rect(x + k * 8, y, 3, S, '#b5b5b5'); rect(x + k * 8 + 3, y, 1, S, '#ececec'); } },
    corrWin: (x, y) => {
      rect(x, y, S, S, '#d2d2d2'); for (let k = 0; k < 16; k++) { rect(x + k * 8, y, 3, S, '#b5b5b5'); rect(x + k * 8 + 3, y, 1, S, '#ececec'); }
      rect(x, y + 12, S, 26, '#9a9a9a'); glass(x + 2, y + 15, S - 4, 20, '#a9bccb', '#5a7083', '#3a4a58');
      for (let k = 0; k < 4; k++) { rect(x + k * 32, y + 15, 3, 20, '#9a9a9a'); unmask(x + k * 32, y + 15, 3, 20); }
    },
    blank: (x, y) => { rect(x, y, S, S, '#ebe5db'); shade(x, y, S, S); for (let k = 0; k < 6; k++) rect(x + R() * S, y + R() * S, 20 + R() * 30, 2, 'rgba(0,0,0,0.04)'); },
    villa: (x, y) => {
      rect(x, y, S, S, '#f3ebde');
      g.fillStyle = '#f7f4ee'; g.beginPath(); g.moveTo(x + 38, y + 104); g.lineTo(x + 38, y + 44); g.arc(x + 64, y + 44, 26, Math.PI, 0); g.lineTo(x + 90, y + 104); g.fill();
      g.save(); g.beginPath(); g.moveTo(x + 42, y + 100); g.lineTo(x + 42, y + 46); g.arc(x + 64, y + 46, 22, Math.PI, 0); g.lineTo(x + 86, y + 100); g.closePath(); g.clip();
      glass(x + 42, y + 24, 44, 76); g.restore();
      m.fillStyle = '#000'; m.fillRect(x + 38, y + 20, 52, 28); m.fillStyle = '#fff';
      m.beginPath(); m.moveTo(x + 42, y + 100); m.lineTo(x + 42, y + 46); m.arc(x + 64, y + 46, 22, Math.PI, 0); m.lineTo(x + 86, y + 100); m.fill();
      for (const sx of [x + 22, x + 92]) { rect(sx, y + 34, 14, 70, '#7a4b2a'); for (let k = 0; k < 11; k++) rect(sx + 1, y + 37 + k * 6, 12, 2, '#5e3a20'); }
      rect(x + 34, y + 104, 60, 6, '#ddd3c4');
    },
    brick: (x, y) => {
      rect(x, y, S, S, '#9a4a35');
      for (let r = 0; r < 16; r++) for (let c = -1; c < 9; c++) {
        const bx = x + c * 16 + (r % 2) * 8, by = y + r * 8;
        g.fillStyle = `rgb(${150 + R() * 30 | 0},${70 + R() * 20 | 0},${50 + R() * 15 | 0})`;
        g.fillRect(Math.max(x, bx), by, Math.min(15, x + S - Math.max(x, bx)), 7);
      }
      rect(x + 30, y + 26, 68, 8, '#7c3a2a'); win(x + 34, y + 34, 60, 62, '#ece6dc', 4);
    },
    garage: (x, y) => {
      rect(x, y, S, S, '#8f8f8f'); rect(x + 8, y + 18, 112, 110, '#5f6266');
      for (let k = 0; k < 13; k++) { rect(x + 12, y + 22 + k * 8, 104, 6, k % 2 ? '#c4c8cc' : '#b2b7bc'); }
      rect(x + 8, y + 8, 112, 8, '#d8b23a');
    },
    tilemod: (x, y) => {
      rect(x, y, S, S, '#f2f1ec'); rect(x, y, 18, S, '#8d939a'); glass(x + 24, y + 10, 98, 96, '#8fb0c8', '#3b566c', '#1c2a36');
      rect(x + 72, y + 10, 3, 96, '#dfe3e6'); unmask(x + 72, y + 10, 3, 96);
      g.fillStyle = 'rgba(190,215,225,0.45)'; g.fillRect(x + 24, y + 70, 98, 36); rect(x + 24, y + 68, 98, 3, '#dfe3e6'); unmask(x + 24, y + 68, 98, 3);
    },
    door: (x, y) => {
      rect(x, y, S, S, '#e2dcd2'); rect(x + 30, y + 26, 68, 102, '#cfc6b8'); rect(x + 36, y + 32, 56, 96, '#5b3a26');
      glass(x + 44, y + 40, 40, 54, '#b9a77f', '#6b5532', '#3a2a14'); rect(x + 60, y + 12, 8, 8, '#fff2b0');
    },
    pyramid: (x, y) => {
      rect(x, y, S, 56, '#ecebe7'); rect(x, y + 50, S, 6, '#c9c7c2');
      glass(x, y + 56, S, 72, '#8aa1b3', '#34495a', '#1a242e'); for (const mx of [0, 64]) { rect(x + mx, y + 56, 3, 72, '#d8d8d4'); unmask(x + mx, y + 56, 3, 72); }
    },
    stone: (x, y) => {
      rect(x, y, S, S, '#c8b79c');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
        const bx = x + c * 44 - (r % 2) * 22, by = y + r * 32;
        g.fillStyle = `rgb(${190 + R() * 25 | 0},${172 + R() * 22 | 0},${142 + R() * 20 | 0})`;
        g.fillRect(Math.max(x, bx + 2), by + 2, Math.min(42, x + S - bx - 2), 29);
      }
    },
    palace: (x, y) => {
      rect(x, y, S, S, '#efe6d3'); rect(x, y + 4, S, 6, '#ddd1b8');
      win(x + 34, y + 18, 60, 96, '#f8f3e8', 5); rect(x + 28, y + 114, 72, 6, '#d9ccb2');
    },
    white: (x, y) => { rect(x, y, S, S, '#ffffff'); },
    roofGravel: (x, y) => {
      rect(x, y, S, S, '#8e8c87');
      for (let k = 0; k < 900; k++) { const c = 110 + R() * 60 | 0; g.fillStyle = `rgb(${c},${c - 2},${c - 6})`; g.fillRect(x + R() * S, y + R() * S, 2, 2); }
    },
    roofTile: (x, y) => {
      rect(x, y, S, S, '#a9482a');
      for (let r = 0; r < 8; r++) {
        const gr = g.createLinearGradient(0, y + r * 16, 0, y + r * 16 + 16);
        gr.addColorStop(0, '#c45f37'); gr.addColorStop(0.8, '#a4462a'); gr.addColorStop(1, '#6e2c18');
        g.fillStyle = gr; g.fillRect(x, y + r * 16, S, 16);
        for (let c = 0; c < 9; c++) rect(x + c * 16 + (r % 2) * 8, y + r * 16, 2, 16, 'rgba(70,25,10,0.5)');
      }
    },
    roofMetal: (x, y) => { rect(x, y, S, S, '#9aa1a7'); for (let k = 0; k < 8; k++) { rect(x + k * 16, y, 4, S, '#7f868c'); rect(x + k * 16 + 4, y, 2, S, '#c4cacf'); } },
    awnR: (x, y) => { for (let k = 0; k < 8; k++) rect(x + k * 16, y, 16, S, k % 2 ? '#f3eee4' : '#c8322b'); },
    awnG: (x, y) => { for (let k = 0; k < 8; k++) rect(x + k * 16, y, 16, S, k % 2 ? '#f3eee4' : '#2f7a4a'); },
    concrete: (x, y) => {
      rect(x, y, S, S, '#bebab2'); for (let k = 0; k < 4; k++) rect(x, y + k * 32, S, 1, '#a8a49c');
      for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(0,0,0,${0.02 + R() * 0.04})`; g.beginPath(); g.arc(x + R() * S, y + R() * S, 4 + R() * 14, 0, 7); g.fill(); }
    },
    balc: (x, y) => { rect(x, y, S, S, '#e4dfd6'); for (let k = 0; k < 8; k++) rect(x, y + k * 16 + 6, S, 3, '#cdc6ba'); },
    glassDark: (x, y) => { glass(x, y, S, S, '#5d6e7c', '#24313c', '#11181f'); for (const mx of [0, 64]) { rect(x + mx, y, 2, S, '#6c7884'); unmask(x + mx, y, 2, S); } },
    plinth: (x, y) => { rect(x, y, S, S, '#b9b1a3'); for (let k = 0; k < 4; k++) rect(x, y + k * 32 + 30, S, 2, '#9c9486'); rect(x, y, S, 6, '#d4ccbe'); },
  };
  CELLS.forEach((name, k) => {
    const x = (k % 16) * S, y = Math.floor(k / 16) * S;
    draw[name](x, y);
    cells[name] = tileOf(x, y, S, S);
  });

  // Fasadat e pikturuara të Tiranës (4×4 qeliza në 256 px).
  const pat: Tile[] = [];
  for (let k = 0; k < 8; k++) {
    const x = (k % 4) * 256, y = 256 + Math.floor(k / 4) * 256;
    const P = () => PAL[(R() * PAL.length) | 0];
    const cols = [P(), P(), P(), P()];
    g.save(); g.beginPath(); g.rect(x, y, 256, 256); g.clip();
    switch (k) {
      case 0: for (let b = 0; b < 8; b++) rect(x, y + b * 32, 256, 32, cols[b % 4]); break;
      case 1: for (let b = 0; b < 8; b++) rect(x + b * 32, y, 32, 256, cols[(b * 3) % 4]); break;
      case 2: for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) rect(x + i * 64, y + j * 64, 64, 64, P()); break;
      case 3: rect(x, y, 256, 256, cols[0]); for (let b = -8; b < 8; b++) { g.fillStyle = cols[1 + (b & 1) * 2] ?? cols[1]; g.beginPath(); g.moveTo(x + b * 64, y + 256); g.lineTo(x + b * 64 + 256, y); g.lineTo(x + b * 64 + 288, y); g.lineTo(x + b * 64 + 32, y + 256); g.fill(); } break;
      case 4: {
        rect(x, y, 256, 256, '#f2e8cf');
        for (let i = 0; i < 9; i++) rect(x + ((R() * 6) | 0) * 42, y + ((R() * 6) | 0) * 42, 42 * (1 + ((R() * 3) | 0)), 42 * (1 + ((R() * 3) | 0)), P());
        break;
      }
      case 5: {
        for (let b = 0; b < 6; b++) {
          g.fillStyle = cols[b % 4]; g.beginPath(); g.moveTo(x, y + b * 48);
          for (let s = 0; s <= 8; s++) g.lineTo(x + s * 32, y + b * 48 + (s % 2 ? 24 : 0));
          g.lineTo(x + 256, y + 256); g.lineTo(x, y + 256); g.fill();
        }
        break;
      }
      case 6: rect(x, y, 256, 256, cols[0]); for (let i = 0; i < 14; i++) { g.fillStyle = cols[1 + (i % 3)]; g.beginPath(); g.arc(x + R() * 256, y + R() * 256, 16 + R() * 40, 0, 7); g.fill(); } break;
      default: for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) rect(x + i * 16, y + j * 16, 16, 16, cols[(R() * 3) | 0]);
    }
    g.restore();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) win(x + i * 64 + 17, y + j * 64 + 12, 30, 38, '#f7f7f2', 3, false);
    pat.push(tileOf(x, y, 256, 256));
  }

  // Dyqanet: 2 kolona × kati përdhes (256×128).
  const shop: Tile[] = [];
  SHOPS.forEach((s, k) => {
    const x = 1024 + (k % 4) * 256, y = 256 + Math.floor(k / 4) * 128;
    rect(x, y, 256, 128, '#3a3836'); rect(x, y, 10, 128, '#cfc8bb'); rect(x + 246, y, 10, 128, '#cfc8bb');
    rect(x + 10, y + 4, 236, 32, s.bg); rect(x + 10, y + 34, 236, 3, 'rgba(0,0,0,0.35)');
    let fs = 28; g.font = `700 ${fs}px ${FONT}`;
    const tw = g.measureText(s.name).width; if (tw > 220) { fs = Math.floor(fs * 220 / tw); g.font = `700 ${fs}px ${FONT}`; }
    g.fillStyle = s.fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.name, x + 128, y + 21);
    let top = 40;
    if (s.kind === 'cafe' || (s.kind === 'food' && k % 2 === 0)) {
      for (let a = 0; a < 15; a++) rect(x + 10 + a * 16, y + 38, 16, 14, a % 2 ? '#f3eee4' : s.bg);
      for (let a = 0; a < 15; a++) { g.fillStyle = a % 2 ? '#f3eee4' : s.bg; g.beginPath(); g.arc(x + 18 + a * 16, y + 52, 8, 0, Math.PI); g.fill(); }
      top = 58;
    }
    glass(x + 14, y + top, 166, 120 - top, '#6f8496', '#33475a', '#1a2530');
    // brendësia e dyqanit (rafte, ngjyra)
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
      g.fillStyle = `hsla(${(R() * 360) | 0},50%,55%,0.35)`; g.fillRect(x + 22 + c * 26, y + top + 8 + r * ((120 - top) / 3.2), 18, 8);
    }
    rect(x + 186, y + top - 2, 52, 124 - top, '#2b2b2b'); glass(x + 192, y + top + 4, 40, 116 - top, '#7d8b96', '#3a4652', '#1d252d');
    for (const mx of [70, 124]) { rect(x + 14 + mx, y + top, 3, 120 - top, '#2b2b2b'); unmask(x + 14 + mx, y + top, 3, 120 - top); }
    rect(x + 10, y + 120, 236, 8, '#262626'); unmask(x + 10, y + 120, 236, 8);
    shop.push(tileOf(x, y, 256, 128));
  });

  // Bashko ngjyrën + maskën; pak zhurmë për material.
  const img = g.getImageData(0, 0, AW, AH).data, mk = m.getImageData(0, 0, AW, AH).data;
  const data = new Uint8Array(AW * AH * 4);
  let s = seed | 1;
  for (let i = 0; i < data.length; i += 4) {
    s = (s * 1664525 + 1013904223) | 0;
    const n = ((s >>> 24) - 128) / 128 * 5;
    const mm = mk[i] / 255;
    const k = n * (1 - mm * 0.7);
    data[i] = Math.max(0, Math.min(255, img[i] + k));
    data[i + 1] = Math.max(0, Math.min(255, img[i + 1] + k));
    data[i + 2] = Math.max(0, Math.min(255, img[i + 2] + k));
    data[i + 3] = 255 - Math.round(mm * 127);
  }
  const tex = new THREE.DataTexture(data, AW, AH, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return { tex, c: cells, pat, shop };
}

/** Zhurmë vlerash periodike. */
function makeNoise(R: () => number) {
  const cache = new Map<number, Float32Array>();
  return (x: number, y: number, P: number) => {
    let L = cache.get(P);
    if (!L) { L = new Float32Array(P * P); for (let i = 0; i < L.length; i++) L[i] = R(); cache.set(P, L); }
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % P) + P) % P, y0 = ((yi % P) + P) % P, x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
    const a = L[y0 * P + x0], b = L[y0 * P + x1], c = L[y1 * P + x0], d = L[y1 * P + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

/** Detajet e tokës (4 m për periodë): R asfalt, G pllaka trotuari, B bar, A gurë sheshi. */
export function makeDetailTexture(seed: number): THREE.DataTexture {
  const N = 512, R = rng(seed ^ 0xd37a11), vn = makeNoise(R);
  const d = new Uint8Array(N * N * 4);
  const tileB = new Float32Array(64), slabB = new Float32Array(64);
  for (let i = 0; i < 64; i++) { tileB[i] = (R() - 0.5) * 0.16; slabB[i] = (R() - 0.5) * 0.2; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, f = R();
    // asfalti
    let a = 0.5 * vn(u * 64, v * 64, 64) + 0.3 * vn(u * 16, v * 16, 16) + 0.2 * f;
    if (f > 0.992) a += 0.35;
    // pllakat 0.5 m
    const tx = x & 63, ty = y & 63, ti = ((x >> 6) + (y >> 6) * 8) & 63;
    let t = 0.72 + tileB[ti] + (f - 0.5) * 0.12 + (vn(u * 32, v * 32, 32) - 0.5) * 0.1;
    if (tx < 2 || ty < 2) t = 0.35;
    // bari
    const gb = 0.45 * vn(u * 8, v * 8, 8) + 0.3 * vn(u * 32, v * 32, 32) + 0.25 * f;
    // pllaka guri 1 m × 0.5 m (lidhje e zhvendosur)
    const row = y >> 6, sx = (x + (row & 1) * 64) & 511, sxi = (sx >> 7) + row * 4;
    let st = 0.72 + slabB[sxi & 63] + (f - 0.5) * 0.08 + (vn(u * 24, v * 24, 24) - 0.5) * 0.12;
    if ((sx & 127) < 2 || (y & 63) < 2) st = 0.42;
    const o = (y * N + x) * 4;
    d[o] = Math.min(255, a * 255); d[o + 1] = Math.min(255, t * 255); d[o + 2] = Math.min(255, gb * 255); d[o + 3] = Math.min(255, st * 255);
  }
  const tex = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8; tex.needsUpdate = true;
  return tex;
}

/** Harta e normaleve për ujin (valë të buta). */
export function makeWaterNormal(seed: number): THREE.DataTexture {
  const N = 128, R = rng(seed ^ 0x3a7e5), vn = makeNoise(R);
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    h[y * N + x] = vn(u * 8, v * 8, 8) * 0.6 + vn(u * 16, v * 16, 16) * 0.3 + vn(u * 32, v * 32, 32) * 0.1;
  }
  const d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (h[y * N + ((x + 1) % N)] - h[y * N + ((x - 1 + N) % N)]) * 6;
    const dy = (h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x]) * 6;
    const l = Math.hypot(dx, dy, 1), o = (y * N + x) * 4;
    d[o] = (-dx / l * 0.5 + 0.5) * 255; d[o + 1] = (-dy / l * 0.5 + 0.5) * 255; d[o + 2] = (1 / l * 0.5 + 0.5) * 255; d[o + 3] = 255;
  }
  const tex = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Njollë rrethore e butë (drita e llambës / hija e pemës). */
export function makeRadial(): THREE.DataTexture {
  const N = 64, d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const r = Math.min(1, Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2));
    const a = Math.pow(1 - r, 1.8), o = (y * N + x) * 4;
    d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = a * 255;
  }
  const tex = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Tabelat e kufirit të shpejtësisë: 60 (majtas) dhe 80 (djathtas); këndi = gri për shtyllën. */
export function makeSignTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8a8f94'; g.fillRect(0, 0, 256, 128);
  ['60', '80'].forEach((t, i) => {
    const cx = 64 + i * 128;
    g.fillStyle = '#d7261e'; g.beginPath(); g.arc(cx, 64, 60, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, 64, 46, 0, 7); g.fill();
    g.fillStyle = '#111'; g.font = `700 52px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, cx, 67);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------------------------------------
// Materialet
// ---------------------------------------------------------------------------------------------

export interface Mats {
  night: { value: number };
  bld: THREE.MeshStandardMaterial;
  ground: THREE.MeshStandardMaterial;
  misc: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  plant: THREE.MeshStandardMaterial;
  lampHead: THREE.MeshStandardMaterial;
  pool: THREE.MeshBasicMaterial;
  blob: THREE.MeshBasicMaterial;
  sign: THREE.MeshStandardMaterial;
  bulb: THREE.MeshBasicMaterial;
  glassProp: THREE.MeshStandardMaterial;
  waterTex: THREE.Texture;
  atlas: Atlas;
  textures: THREE.Texture[];
}

export function makeMaterials(seed: number): Mats {
  const atlas = makeAtlas(seed);
  const detail = makeDetailTexture(seed);
  const waterTex = makeWaterNormal(seed);
  waterTex.repeat.set(1, 1);
  const radial = makeRadial();
  const signTex = makeSignTexture();
  const night = { value: 0 };

  const bld = new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0 });
  bld.onBeforeCompile = (sh) => {
    sh.uniforms.uAtlas = { value: atlas.tex };
    sh.uniforms.uNight = night;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 auv; attribute vec4 atile; attribute vec3 atint; attribute vec2 aw;
varying vec2 vAUv; varying vec4 vTile; varying vec3 vTint; varying vec2 vW;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vAUv = auv; vTile = atile; vTint = atint; vW = aw;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uAtlas; uniform float uNight;
varying vec2 vAUv; varying vec4 vTile; varying vec3 vTint; varying vec2 vW;
float hsh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`)
      .replace('#include <map_fragment>', `
vec2 cuv = fract(vAUv);
vec2 auvA = vTile.xy + vec2(cuv.x, 1.0 - cuv.y) * vTile.zw;
vec4 tx = textureGrad(uAtlas, auvA, dFdx(vAUv) * vTile.zw, dFdy(vAUv) * vTile.zw);
float win = clamp((1.0 - tx.a) * 2.02, 0.0, 1.0);
diffuseColor.rgb *= tx.rgb * mix(vTint, vec3(1.0), win);`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(roughness, 0.1, win);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = mix(metalness, 0.55, win);')
      .replace('#include <emissivemap_fragment>', `
{ vec2 cell = floor(vAUv + 0.001) + vec2(vW.x * 7.31, vW.x * 3.17);
  float hh = hsh(cell);
  float lit = step(hh, vW.y) * uNight;
  vec3 wc = mix(vec3(1.0, 0.68, 0.36), vec3(0.78, 0.86, 1.0), step(0.78, fract(hh * 7.3)));
  totalEmissiveRadiance += wc * win * lit * (0.55 + 0.7 * fract(hh * 13.7)) * (0.6 + tx.r * 0.8) * 1.6; }`);
  };

  const ground = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 });
  ground.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = { value: detail };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute float apat; varying float vPat; varying vec2 vGW;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vPat = apat; vGW = (modelMatrix * vec4(transformed, 1.0)).xz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uDetail; varying float vPat; varying vec2 vGW;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec4 d1 = texture2D(uDetail, vGW * 0.25);
  vec4 d2 = texture2D(uDetail, vGW * 0.031 + 0.37);
  float f = 1.0;
  if (vPat < 0.5) f = (0.62 + d1.r * 0.55) * (0.82 + d2.r * 0.36);
  else if (vPat < 1.5) f = 0.45 + d1.g * 0.75;
  else if (vPat < 2.5) f = (0.5 + d1.b * 0.7) * (0.7 + d2.b * 0.6);
  else if (vPat < 3.5) f = 0.45 + d1.a * 0.75;
  diffuseColor.rgb *= f; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vPat > 4.5 ? 0.55 : roughness;');
  };

  const misc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.02 });
  const plant = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const water = new THREE.MeshStandardMaterial({ color: 0x2f5f66, roughness: 0.06, metalness: 0.2, normalMap: waterTex, normalScale: new THREE.Vector2(0.28, 0.28) });
  const lampHead = new THREE.MeshStandardMaterial({ color: 0xf2efe6, emissive: 0xffc98a, emissiveIntensity: 0, roughness: 0.4 });
  const pool = new THREE.MeshBasicMaterial({ map: radial, color: 0xffb466, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: true });
  pool.polygonOffset = true; pool.polygonOffsetFactor = -2; pool.polygonOffsetUnits = -2;
  const blob = new THREE.MeshBasicMaterial({ map: radial, color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
  blob.polygonOffset = true; blob.polygonOffsetFactor = -1; blob.polygonOffsetUnits = -1;
  const sign = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5, metalness: 0.1 });
  const bulb = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const glassProp = new THREE.MeshStandardMaterial({ color: 0x9fb8c8, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.45, depthWrite: false });
  return { night, bld, ground, misc, water, plant, lampHead, pool, blob, sign, bulb, glassProp, waterTex, atlas, textures: [atlas.tex, detail, waterTex, radial, signTex] };
}

/** Garazhi: lista e makinave, pamje 3D rrotulluese (renderer më vete), blerja, ngjyrat, përmirësimet. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Upgrades, Vehicle, VehicleSpec } from '../core/contracts';
import type { ProgressionX } from '../missions';
import { PAINT_COLORS } from '../data/catalog';
import type { Ctx } from './ctx';
import { header } from './ctx';
import { IC } from './icons';
import { $, html, esc, fmtMoney, hex } from './util';

export interface Garage { el: HTMLElement; open(): void; close(): void; update(dt: number): void }

const UPS: { k: keyof Upgrades; name: string; icon: string; txt: string }[] = [
  { k: 'engine', name: 'Motori', icon: IC.engine, txt: 'Më shumë shpejtësi dhe përshpejtim' },
  { k: 'brakes', name: 'Frenat', icon: IC.brake, txt: 'Ndalon më shpejt' },
  { k: 'handling', name: 'Drejtimi', icon: IC.handling, txt: 'Mban më mirë në kthesa' },
  { k: 'nitro', name: 'Nitro', icon: IC.bolt, txt: 'Më shumë nitro, mbushet më shpejt' },
];

function stats(s: VehicleSpec, u?: Upgrades) {
  const up = (n = 0) => 1 + n * 0.06;
  return [
    ['Shpejtësia', s.topSpeed / 86, up(u?.engine)],
    ['Përshpejtimi', s.accel / 13.5, up(u?.engine)],
    ['Frenat', s.brake / 14, up(u?.brakes)],
    ['Kontrolli', s.grip / 1.35, up(u?.handling)],
  ] as [string, number, number][];
}

export function createGarage(ctx: Ctx, back: () => void): Garage {
  const api = ctx.api, prog = api.progression as ProgressionX;
  const el = html(`<div class="scr s-gar opq blk"></div>`);
  el.appendChild(header('Garazhi', api, back));
  const prev = html(`<div class="gprev"><canvas></canvas><div class="gname"><b></b><span></span></div><div class="grot">↻ Rrotullo me gisht</div></div>`);
  const strip = html(`<div class="gstrip"></div>`);
  const det = html(`<div class="gdet"></div>`);
  el.append(prev, strip, det);
  const cv = $(prev, 'canvas') as HTMLCanvasElement;
  let sel = '';

  // ---------- 3D ----------
  let R: THREE.WebGLRenderer | null = null, scene: THREE.Scene, cam: THREE.PerspectiveCamera, env: THREE.Texture | null = null;
  let car: Vehicle | null = null, carKey = '', ang = 0.7, spin = 0.35, dragX: number | null = null, gnd: THREE.Mesh | null = null;
  function init3d() {
    try {
      R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch { R = null; return; }
    R.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    R.toneMapping = THREE.ACESFilmicToneMapping;
    scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(R), room = new RoomEnvironment();
    env = pm.fromScene(room, 0.04).texture;
    scene.environment = env;
    (room as any).dispose?.(); pm.dispose();
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(3, 6, 4); scene.add(sun);
    // hija e butë poshtë makinës
    const sc = document.createElement('canvas'); sc.width = sc.height = 128;
    const g = sc.getContext('2d')!, gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    gnd = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.y = 0.01; scene.add(gnd);
    cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  }
  function setCar(spec: VehicleSpec) {
    if (!R) return;
    const col = prog.profile.carColors[spec.id] ?? spec.defaultColor;
    const key = spec.id + '|' + col;
    if (key === carKey) return;
    carKey = key;
    if (car) { scene.remove(car.object3d); car.dispose(); car = null; }
    try { car = api.vehicles.create(spec, col, { lod: 'high' }); } catch { car = null; return; }
    scene.add(car.object3d);
    const b = new THREE.Box3().setFromObject(car.object3d), sz = b.getSize(new THREE.Vector3());
    const L = Math.max(sz.x, sz.z, 3);
    gnd!.scale.set(sz.x * 1.9, sz.z * 1.35, 1);
    const d = L * 2.25;
    cam.position.set(0, L * 0.42, d); cam.lookAt(0, sz.y * 0.38, 0);
  }
  function dispose3d() {
    if (car) { car.dispose(); car = null; }
    carKey = '';
    if (gnd) { gnd.geometry.dispose(); const m = gnd.material as THREE.MeshBasicMaterial; m.map?.dispose(); m.dispose(); gnd = null; }
    env?.dispose(); env = null;
    if (R) { R.dispose(); R.forceContextLoss(); R = null; }
  }
  prev.addEventListener('pointerdown', e => { dragX = e.clientX; prev.setPointerCapture(e.pointerId); spin = 0; });
  prev.addEventListener('pointermove', e => { if (dragX == null) return; ang += (e.clientX - dragX) * 0.012; dragX = e.clientX; });
  const end = () => { dragX = null; spin = 0.35; };
  prev.addEventListener('pointerup', end); prev.addEventListener('pointercancel', end);

  // ---------- DOM ----------
  function renderStrip() {
    const p = prog.profile;
    strip.innerHTML = api.catalog.map(s => {
      const own = p.ownedCars.includes(s.id), lock = p.level < s.unlockLevel;
      const st = p.selectedCar === s.id ? `<span class="st cur">${IC.check}Në përdorim</span>`
        : own ? `<span class="st own">${IC.check}E jotja</span>`
        : lock ? `<span class="st">${IC.lock}Niveli ${s.unlockLevel}</span>`
        : `<span class="st pr">${fmtMoney(prog.carPrice(s.id))}</span>`;
      const mini = stats(s).map(([, v]) => `<i><i style="width:${Math.round(v * 100)}%"></i></i>`).join('');
      return `<button class="gc${s.id === sel ? ' on' : ''}" data-car="${s.id}"><b>${esc(s.name)}</b>${st}<span class="mini">${mini}</span></button>`;
    }).join('');
  }
  function renderDet() {
    const p = prog.profile, s = api.catalog.find(c => c.id === sel)!;
    const own = p.ownedCars.includes(s.id), lock = p.level < s.unlockLevel, price = prog.carPrice(s.id);
    $(prev, '.gname b').textContent = s.name;
    $(prev, '.gname span').textContent = s.description;
    const u = p.upgrades[s.id];
    let act: string;
    if (p.selectedCar === s.id) act = `<button class="btn" disabled>${IC.check}Në përdorim</button><button class="btn pri" data-a="drive">${IC.play}Luaj</button>`;
    else if (own) act = `<button class="btn pri" data-a="select">${IC.check}Zgjidh këtë makinë</button>`;
    else if (lock) act = `<button class="btn" disabled>${IC.lock}Hapet në nivelin ${s.unlockLevel}</button>`;
    else act = `<button class="btn gold" data-a="buy" ${p.money < price ? 'disabled' : ''}>Bli · ${fmtMoney(price)}</button>`;
    const st = stats(s, u).map(([n, v, m]) => `<div class="srow"><span>${n}</span><span class="sbar"><i class="x" style="width:${Math.min(100, v * m * 100).toFixed(1)}%"></i><i class="b" style="width:${(v * 100).toFixed(1)}%"></i></span><span>${Math.round(Math.min(1, v * m) * 100)}</span></div>`).join('');
    const cur = p.carColors[s.id] ?? s.defaultColor;
    const sw = PAINT_COLORS.map(c => `<button data-col="${c}" class="${c === cur ? 'on' : ''}" style="background:${hex(c)}" aria-label="Ngjyra"></button>`).join('');
    const ups = UPS.filter(x => x.k !== 'nitro' || s.nitro).map(x => {
      const lv = u?.[x.k] ?? 0, pr = lv < 3 ? api.progression.upgradePrice(s.id, x.k) : 0;
      const pips = [0, 1, 2].map(i => `<i class="${i < lv ? 'f' : ''}"></i>`).join('');
      const b = lv >= 3 ? `<button class="btn" disabled>Maks</button>` : `<button class="btn gold" data-up="${x.k}" ${!own || p.money < pr ? 'disabled' : ''}>${fmtMoney(pr)}</button>`;
      return `<div class="up">${x.icon}<div><b>${x.name}</b><span class="note">${x.txt}</span><div class="pips">${pips}</div></div>${b}</div>`;
    }).join('');
    det.innerHTML = `<div class="stats">${st}</div><div class="gact">${act}</div>
      <div class="sec">Ngjyra</div>${own ? `<div class="sw">${sw}</div>` : `<p class="note">Bli makinën për ta lyer me ngjyrën që do.</p>`}
      <div class="sec">Përmirësime</div>${own ? '' : `<p class="note" style="margin-bottom:8px">Përmirësimet hapen pasi ta blesh makinën.</p>`}<div class="ups">${ups}</div>`;
    setCar(s);
  }
  function refresh() { renderStrip(); renderDet(); }

  strip.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest('[data-car]') as HTMLElement | null;
    if (!b || b.dataset.car === sel) return;
    ctx.sfx('click'); sel = b.dataset.car!; refresh();
  });
  det.addEventListener('click', e => {
    const t = e.target as HTMLElement, s = api.catalog.find(c => c.id === sel)!;
    const a = (t.closest('[data-a]') as HTMLElement | null)?.dataset.a;
    const col = (t.closest('[data-col]') as HTMLElement | null)?.dataset.col;
    const upk = (t.closest('[data-up]') as HTMLElement | null)?.dataset.up as keyof Upgrades | undefined;
    if (a === 'buy') {
      if (api.progression.buyCar(s.id)) { api.progression.selectCar(s.id); ctx.sfx('coin'); ctx.toast(`${s.name} është e jotja!`, 'good'); }
      else { ctx.sfx('error'); ctx.toast('Nuk ke mjaftueshëm para.', 'bad'); }
    } else if (a === 'select') { api.progression.selectCar(s.id); ctx.sfx('click'); }
    else if (a === 'drive') { ctx.sfx('click'); ctx.go('play'); return; }
    else if (col) { api.progression.setColor(s.id, +col); ctx.sfx('click'); }
    else if (upk) {
      if (api.progression.buyUpgrade(s.id, upk)) { ctx.sfx('coin'); ctx.toast('Përmirësimi u instalua!', 'good'); }
      else { ctx.sfx('error'); ctx.toast('Nuk ke mjaftueshëm para.', 'bad'); }
    } else return;
    ctx.refreshMoney(); refresh();
  });

  let lastW = 0, lastH = 0;
  return {
    el,
    open() {
      sel = prog.profile.selectedCar;
      init3d();
      refresh();
      lastW = 0;
      requestAnimationFrame(() => strip.querySelector('.gc.on')?.scrollIntoView({ inline: 'center', block: 'nearest' }));
    },
    close() { dispose3d(); },
    update(dt) {
      if (!R || !car) return;
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      if (w !== lastW || h !== lastH) { lastW = w; lastH = h; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      ang += spin * dt;
      car.object3d.rotation.y = ang;
      R.render(scene, cam);
    },
  };
}

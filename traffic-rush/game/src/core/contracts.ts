/**
 * KONTRATAT MES MODULEVE — Traffic Rush: Qyteti
 *
 * Çdo modul (world, vehicles, traffic, missions, ui, input, audio) implementon ndërfaqet këtu
 * dhe përdor modulet e tjera VETËM përmes tyre. main.ts i lidh implementimet konkrete.
 *
 * KONVENTAT (të detyrueshme për të gjithë):
 *  - Njësitë: metra, sekonda, radianë. Shpejtësitë në m/s (UI i shfaq në km/h).
 *  - Boshtet: Y lart. X = lindje, Z = jug. Veriu = -Z (lart në minimap/hartë).
 *  - Drejtimi (heading) h: vektori përpara = (sin h, 0, cos h). h = 0 → +Z (jug).
 *    Kthesë djathtas → h zvogëlohet. Shih core/math.ts (fwd, right).
 *  - Modelet 3D të makinave shikojnë nga +Z lokalisht, qendra në (0,0,0) në tokë;
 *    object3d.rotation.y = heading.
 *  - Trafiku ecën në të DJATHTË (si në Shqipëri).
 *  - Qyteti është rrjetë: të gjitha rrugët janë paralele me X ose Z.
 */
import type * as THREE from 'three';

export type Vec2 = { x: number; z: number };
export type Quality = 'low' | 'medium' | 'high';
export type Axis = 'x' | 'z';

/** Të dhënat e një kuadri, që i jep main.ts çdo moduli në update(). */
export interface FrameContext {
  time: number;            // sekonda që nga nisja
  dt: number;              // sekonda (maks 0.05)
  timeOfDay: number;       // 0..24
  isNight: boolean;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  player: Vehicle | null;
  quality: Quality;
}

// ======================================================================
// QYTETI (modul: src/world)
// ======================================================================

export type DistrictId = 'qendra' | 'blloku' | 'liqeni' | 'lagjja' | 'industria';

export interface District {
  id: DistrictId;
  name: string;            // p.sh. "Blloku"
  unlockLevel: number;
  minX: number; maxX: number; minZ: number; maxZ: number;
  color: number;           // ngjyra në hartë
}

export interface RoadNode {
  id: number;              // = indeksi në CityWorld.nodes
  x: number; z: number;
  edges: number[];         // id-të e RoadEdge që takohen këtu
  signalized: boolean;     // ka semafor
}

export type RoadKind = 'street' | 'avenue' | 'ring' | 'bridge';

export interface RoadEdge {
  id: number;              // = indeksi në CityWorld.edges
  a: number; b: number;    // id-të e nyjeve; gjithmonë a ka koordinatën më të vogël në boshtin e rrugës
  axis: Axis;              // 'x' = rruga shtrihet lindje–perëndim
  lanes: number;           // korsi PËR ÇDO DREJTIM (1 ose 2)
  laneWidth: number;       // zakonisht 3.2
  sidewalk: number;        // gjerësia e trotuarit në secilën anë
  speedLimit: number;      // m/s
  kind: RoadKind;
  length: number;
}

export type ObstacleKind = 'building' | 'wall' | 'prop' | 'water' | 'tree';

/** Kuti statike e drejtuar me boshtet (AABB) për përplasjet. */
export interface Obstacle {
  minX: number; maxX: number; minZ: number; maxZ: number;
  height: number;
  kind: ObstacleKind;
}

export type PoiKind =
  | 'home' | 'office' | 'shop' | 'restaurant' | 'cafe' | 'hotel' | 'landmark'
  | 'garage' | 'business' | 'police' | 'hospital' | 'station' | 'school';

/** Vend me emër ku mund të ndalet makina (në anë të rrugës), për misionet. */
export interface Poi {
  id: string;
  name: string;            // p.sh. "Sheshi Skënderbej", "Kafe Blloku"
  kind: PoiKind;
  district: DistrictId;
  x: number; z: number;    // pika e ndalimit në korsinë e djathtë
  heading: number;         // drejtimi i makinës kur ndalon aty
}

export type SignalLight = 'green' | 'yellow' | 'red';

export interface CityWorld {
  readonly seed: number;
  readonly size: number;                 // brinja e qytetit (m); qyteti shtrihet në [0,size] × [0,size]
  readonly nodes: readonly RoadNode[];
  readonly edges: readonly RoadEdge[];
  readonly districts: readonly District[];
  readonly pois: readonly Poi[];
  readonly root: THREE.Object3D;         // shtohet te skena nga main.ts
  readonly playerSpawn: { x: number; z: number; heading: number };
  /** Mbush `out` me pengesat që prekin drejtkëndëshin; kthen numrin. */
  queryObstacles(minX: number, minZ: number, maxX: number, maxZ: number, out: Obstacle[]): number;
  districtAt(x: number, z: number): District;
  /** Brinja e rrugës më e afërt dhe pika mbi vijën qendrore të saj (t = 0..1 nga a te b). */
  nearestEdge(x: number, z: number): { edge: RoadEdge; x: number; z: number; t: number; dist: number } | null;
  /** Gjendja e semaforit për makinat që vijnë drejt nyjes përgjatë boshtit `approachAxis`. */
  signal(nodeId: number, approachAxis: Axis): SignalLight;
  /** Lartësia e tokës (qyteti është i sheshtë përveç urave/rampave; kthen 0 në të shumtën). */
  groundHeight(x: number, z: number): number;
  update(ctx: FrameContext): void;       // semaforët, dritat e natës, LOD
}

// ======================================================================
// MAKINAT (modul: src/vehicles)
// ======================================================================

export type BodyStyle =
  | 'hatch' | 'sedan' | 'coupe' | 'sport' | 'suv' | 'pickup' | 'van'
  | 'furgon' | 'bus' | 'truck' | 'taxi' | 'police';

export interface VehicleSpec {
  id: string;
  name: string;
  body: BodyStyle;
  price: number;            // lekë (0 = s'shitet / fillestare)
  unlockLevel: number;
  topSpeed: number;         // m/s
  accel: number;            // m/s² në shpejtësi të ulët
  brake: number;            // m/s²
  grip: number;             // 0.6..1.4 (sa mban në kthesa)
  steer: number;            // kënd maks. i rrotave (rad)
  mass: number;             // kg (për përplasjet)
  nitro: boolean;
  defaultColor: number;
  description: string;
}

export interface Upgrades { engine: number; brakes: number; handling: number; nitro: number } // 0..3 secili

export interface VehicleInput {
  throttle: number;         // 0..1
  brake: number;            // 0..1 (kur makina ka ndaluar, frena = mbrapa)
  steer: number;            // -1..1, +1 = djathtas
  handbrake: boolean;
  nitro: boolean;
  horn: boolean;
}

export interface VehicleLights {
  head: boolean;
  brake: boolean;
  reverse: boolean;
  left: boolean;            // sinjali majtas (pulson vetë)
  right: boolean;
  hazard: boolean;
  siren: boolean;           // vetëm policia
}

export interface Vehicle {
  readonly spec: VehicleSpec;
  readonly object3d: THREE.Object3D;
  x: number; z: number; heading: number;
  vx: number; vz: number;   // shpejtësia në botë (m/s)
  yawRate: number;          // rad/s
  readonly speed: number;   // komponenti përpara i shpejtësisë (m/s, negativ = mbrapa)
  readonly halfW: number;   // gjysma e gjerësisë (m) për përplasjet
  readonly halfL: number;   // gjysma e gjatësisë
  damage: number;           // 0..1
  nitroFuel: number;        // 0..1
  lights: VehicleLights;
  kinematic: boolean;       // true = e lëviz AI me setPose(); false = fizika
  color: number;
  upgrades: Upgrades;
  /** Sa po rrëshqet (drift) 0..1 — për zërin e gomave dhe tymin. */
  readonly skid: number;
  /** Rrotullimet e motorit 0..1 dhe marsha, për zërin. */
  readonly rpm: number;
  readonly gear: number;
  setPose(x: number, z: number, heading: number, speed: number): void;
  /** Fizika arcade e makinës (pa përplasje; ato i zgjidh PhysicsSystem). */
  drive(input: VehicleInput, dt: number): void;
  /** Rrotat, timoni, dritat, sinjalet, dëmtimi vizual. */
  syncVisual(dt: number, ctx: FrameContext): void;
  setColor(color: number): void;
  dispose(): void;
}

export interface VehicleFactory {
  create(spec: VehicleSpec, color?: number, opts?: { lod?: 'high' | 'low' }): Vehicle;
}

export interface CollisionEvent {
  a: Vehicle;
  b: Vehicle | null;        // null = u përplas me ndërtesë/mur
  impulse: number;          // m/s shpejtësi relative në drejtim të goditjes
  x: number; z: number;
}

export interface PhysicsSystem {
  readonly vehicles: readonly Vehicle[];
  add(v: Vehicle): void;
  remove(v: Vehicle): void;
  /** Zgjidh përplasjet makinë–qytet dhe makinë–makinë pasi çdo makinë ka bërë drive(). */
  step(dt: number, city: CityWorld): CollisionEvent[];
}

// ======================================================================
// TRAFIKU DHE POLICIA (modul: src/traffic)
// ======================================================================

export interface TrafficSystem {
  readonly vehicles: readonly Vehicle[];
  density: number;                         // 0..1 (nga cilësimet dhe ora e ditës)
  update(ctx: FrameContext): void;
  /** Heq trafikun afër një pike (p.sh. kur nis misioni). */
  clearAround(x: number, z: number, radius: number): void;
}

export interface PoliceSystem {
  readonly wanted: number;                 // 0..5 yje
  readonly units: readonly Vehicle[];
  readonly bustedProgress: number;         // 0..1; në 1 → arrestim
  /** Rrit nivelin e kërkimit (p.sh. përplasje me policinë, kalim me të kuq para policisë). */
  addHeat(amount: number, reason: string): void;
  startPursuit(level: number): void;
  stop(): void;
  update(ctx: FrameContext): void;
}

// ======================================================================
// MISIONET, PROGRESI, EKONOMIA (modul: src/missions)
// ======================================================================

export type ControlScheme = 'wheel' | 'tilt' | 'lanes';
export type CameraMode = 'chase' | 'far' | 'hood';

export interface Settings {
  controls: ControlScheme;
  quality: Quality;
  sound: boolean;
  music: boolean;
  camera: CameraMode;
  vibration: boolean;
  trafficDensity: number;  // 0.3..1
  tiltSensitivity: number; // 0.5..2
}

export interface Profile {
  version: number;
  money: number;           // lekë
  xp: number;
  level: number;
  ownedCars: string[];
  selectedCar: string;
  carColors: Record<string, number>;
  upgrades: Record<string, Upgrades>;
  properties: string[];    // id-të e bizneseve të blera
  missionStars: Record<string, number>; // 0..3
  stats: { distance: number; nearMisses: number; missions: number; crashes: number; fines: number; topSpeed: number };
  settings: Settings;
  tutorialDone: boolean;
  lastIncomeAt: number;    // Date.now() kur u mblodhën të ardhurat e bizneseve
}

export type MissionKind = 'taxi' | 'delivery' | 'race' | 'escape' | 'parking' | 'stunt';

export interface MissionDef {
  id: string;
  kind: MissionKind;
  title: string;
  brief: string;
  district: DistrictId;
  unlockLevel: number;
  reward: number;
  xp: number;
  /** Ku nis misioni (shënues në qytet ku lojtari ndalon për ta pranuar). */
  start: Vec2;
  requiresProperty?: string;
}

export type MarkerKind = 'mission' | 'pickup' | 'dropoff' | 'checkpoint' | 'garage' | 'business' | 'finish' | 'parking';

export interface Marker {
  id: string;
  kind: MarkerKind;
  x: number; z: number;
  radius: number;
  label?: string;
  heading?: number;        // për parking: drejtimi i kërkuar
}

export interface MissionView {
  def: MissionDef;
  objective: string;       // p.sh. "Merr pasagjerin te Piramida"
  timeLeft: number | null; // sekonda
  progress: string | null; // p.sh. "Checkpoint 3/8"
  target: Vec2 | null;     // ku të shkojë GPS-i
  passenger?: { name: string; mood: number; line: string | null }; // taksi: 0..1 kënaqësia
}

export interface MissionResult {
  def: MissionDef;
  success: boolean;
  reward: number;
  xp: number;
  stars: number;
  lines: string[];         // detajet e rezultatit (koha, dëmtimi, bonuset)
}

export interface PropertyDef {
  id: string;
  name: string;            // p.sh. "Autolarja e Lanës"
  kind: 'carwash' | 'taxi' | 'garage' | 'cafe' | 'dealership' | 'parking';
  district: DistrictId;
  price: number;
  incomePerHour: number;   // lekë në orë reale (mblidhen kur kthehesh)
  unlocks: string;         // p.sh. "Misionet e taksisë me pagesë dyfish"
  x: number; z: number;
}

export interface Progression {
  readonly profile: Readonly<Profile>;
  addMoney(amount: number, reason: string): void;
  spend(amount: number): boolean;
  addXp(amount: number): void;
  xpForLevel(level: number): number;
  buyCar(id: string): boolean;
  selectCar(id: string): void;
  setColor(carId: string, color: number): void;
  buyUpgrade(carId: string, kind: keyof Upgrades): boolean;
  upgradePrice(carId: string, kind: keyof Upgrades): number;
  buyProperty(id: string): boolean;
  collectIncome(): number;
  updateSettings(patch: Partial<Settings>): void;
  save(): void;
}

export interface MissionSystem {
  readonly active: MissionView | null;
  readonly markers: readonly Marker[];     // shënuesit që duken në qytet dhe hartë
  readonly route: readonly Vec2[];         // rruga e GPS-it drejt objektivit (polilinjë)
  available(): MissionDef[];
  start(id: string): boolean;
  abort(): void;
  update(ctx: FrameContext): void;
}

// ======================================================================
// NGJARJET (core/events.ts)
// ======================================================================

export interface GameEvents {
  collision: CollisionEvent;
  nearMiss: { other: Vehicle; speed: number; streak: number };
  money: { amount: number; reason: string; total: number };
  levelUp: { level: number };
  missionStarted: { def: MissionDef };
  missionEnded: MissionResult;
  toast: { text: string; kind?: 'info' | 'good' | 'bad' };
  speedCamera: { speed: number; limit: number; fine: number };
  redLight: { nodeId: number };
  wanted: { level: number };
  busted: { fine: number };
  districtEntered: { district: District };
  districtLocked: { district: District };
}

// ======================================================================
// HYRJA, ZËRI, UI
// ======================================================================

export interface InputSystem {
  scheme: ControlScheme;
  /** Kthen komandat e makinës për këtë kuadër (lojtari). */
  read(ctx: FrameContext): VehicleInput;
  /** Shfaq/fsheh kontrollet në ekran (pedalet, timoni). */
  setVisible(v: boolean): void;
  /** Për 'tilt' në iOS duhet leje nga një prekje e përdoruesit. */
  requestPermissions(): Promise<boolean>;
  dispose(): void;
}

export type UiSound = 'click' | 'coin' | 'levelup' | 'success' | 'fail' | 'checkpoint' | 'camera' | 'error';

export interface AudioSystem {
  unlock(): void;
  setMuted(muted: boolean): void;
  setMusic(on: boolean): void;
  /** Motori i lojtarit: rpm 0..1, load 0..1 (gazi), speed m/s. */
  engine(on: boolean, rpm: number, load: number, speed: number): void;
  skid(intensity: number): void;           // 0..1
  crash(intensity: number): void;          // 0..1
  horn(on: boolean): void;
  siren(on: boolean, distance: number): void;
  nitro(on: boolean): void;
  ui(sound: UiSound): void;
  update(ctx: FrameContext): void;
}

/** Çfarë i jep loja UI-së për HUD-in çdo kuadër. */
export interface HudState {
  speedKmh: number;
  gear: number;
  rpm: number;
  nitro: number;           // 0..1
  damage: number;          // 0..1
  money: number;
  level: number;
  xpFrac: number;          // 0..1 drejt nivelit tjetër
  district: string;
  timeOfDay: number;
  wanted: number;
  bustedProgress: number;
  mission: MissionView | null;
  speedLimitKmh: number | null;
  nearMissStreak: number;
}

/** Të dhënat për minimap dhe hartën e madhe. */
export interface MapState {
  city: CityWorld;
  player: { x: number; z: number; heading: number };
  markers: readonly Marker[];
  route: readonly Vec2[];
  police: readonly Vec2[];
}

/** Veprimet që UI mund të kërkojë nga loja (i implementon main.ts). */
export interface GameApi {
  readonly progression: Progression;
  readonly catalog: readonly VehicleSpec[];
  readonly properties: readonly PropertyDef[];
  readonly vehicles: VehicleFactory;
  availableMissions(): MissionDef[];
  startMission(id: string): void;
  abortMission(): void;
  pause(paused: boolean): void;
  isPaused(): boolean;
  /** Kthen lojtarin te garazhi (spawn) dhe riparon makinën. */
  respawn(): void;
  setWaypoint(p: Vec2 | null): void;
  hud(): HudState;
  map(): MapState;
  events: import('./events').Emitter<GameEvents>;
  audio: AudioSystem;
}

export interface UiSystem {
  /** Ndërton DOM-in brenda `root`; lidhet me lojën përmes GameApi. */
  mount(root: HTMLElement, api: GameApi): void;
  /** Përditëso HUD-in dhe minimap-in (thirret çdo kuadër). */
  update(dt: number): void;
  /** Ekrani aktual ('play' = loja po luhet me HUD). */
  readonly screen: string;
}

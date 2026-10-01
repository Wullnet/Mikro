// STUB i përkohshëm (zëvendësohet nga moduli i plotë i trafikut).
import type * as THREE from 'three';
import type { CityWorld, FrameContext, GameEvents, PhysicsSystem, PoliceSystem, TrafficSystem, Vehicle, VehicleFactory } from '../core/contracts';
import type { Emitter } from '../core/events';
type Deps = { city: CityWorld; factory: VehicleFactory; physics: PhysicsSystem; events: Emitter<GameEvents>; scene: THREE.Scene };
export function createTraffic(_d: Deps): TrafficSystem {
  return { vehicles: [] as Vehicle[], density: 1, update(_c: FrameContext) {}, clearAround() {} };
}
export function createPolice(_d: Deps & { traffic: TrafficSystem }): PoliceSystem {
  return { wanted: 0, units: [], bustedProgress: 0, addHeat() {}, startPursuit() {}, stop() {}, update() {} };
}
export function createEnforcement(_d: { city: CityWorld; events: Emitter<GameEvents>; scene: THREE.Scene; police: PoliceSystem }) {
  return { update(_c: FrameContext) {}, cameras: [] as { x: number; z: number; limit: number }[] };
}

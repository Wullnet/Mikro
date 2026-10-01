/** Moduli i trafikut: makinat AI, policia dhe radarët. */
import type * as THREE from 'three';
import type { CityWorld, FrameContext, GameEvents, PhysicsSystem, PoliceSystem, TrafficSystem, VehicleFactory } from '../core/contracts';
import type { Emitter } from '../core/events';
import { Traffic } from './traffic';
import { Police } from './police';
import { buildEnforcement } from './enforcement';

export { Traffic } from './traffic';
export { Police } from './police';
export { AiDriver } from './driver';

type Deps = { city: CityWorld; factory: VehicleFactory; physics: PhysicsSystem; events: Emitter<GameEvents>; scene: THREE.Scene };

export function createTraffic(d: Deps): TrafficSystem {
  return new Traffic(d);
}

export function createPolice(d: Deps & { traffic: TrafficSystem }): PoliceSystem {
  return new Police(d, d.traffic instanceof Traffic ? d.traffic : null);
}

export function createEnforcement(d: { city: CityWorld; events: Emitter<GameEvents>; scene: THREE.Scene; police: PoliceSystem }): {
  update(c: FrameContext): void; cameras: { x: number; z: number; limit: number }[];
} {
  return buildEnforcement(d);
}

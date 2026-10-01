/** Moduli i makinave: fabrika e modeleve, fizika dhe efektet. */
import type { PhysicsSystem, VehicleFactory } from '../core/contracts';
import { Car } from './car';
import { Physics } from './physics';

export function createVehicleFactory(): VehicleFactory {
  return { create: (spec, color, opts) => new Car(spec, color ?? spec.defaultColor, opts?.lod ?? 'high') };
}

export function createPhysics(): PhysicsSystem {
  return new Physics();
}

export { VehicleEffects } from './effects';
export { Car } from './car';
export { setVehicleQuality } from './geo';
export { getModel } from './models';
export { STYLES } from './styles';

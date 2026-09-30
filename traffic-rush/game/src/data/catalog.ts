/**
 * Katalogu i makinave. Emrat dhe dizajnet janë origjinale (pa marka reale),
 * të frymëzuara nga vende shqiptare. Shpejtësitë në m/s (×3.6 = km/h).
 */
import type { VehicleSpec } from '../core/contracts';

export const PLAYER_CARS: VehicleSpec[] = [
  { id: 'liqeni', name: 'Liqeni Hatch', body: 'hatch', price: 0, unlockLevel: 1, topSpeed: 45, accel: 6.0, brake: 10, grip: 0.9, steer: 0.6, mass: 1100, nitro: false, defaultColor: 0xc8202a, description: 'Makina e parë: e vogël, e lehtë për rrugicat e qytetit.' },
  { id: 'vjosa', name: 'Vjosa Sedan', body: 'sedan', price: 8000, unlockLevel: 2, topSpeed: 50, accel: 6.6, brake: 10.5, grip: 0.95, steer: 0.55, mass: 1350, nitro: false, defaultColor: 0xe9e9ea, description: 'E rehatshme dhe e qetë — pasagjerët e taksisë e duan.' },
  { id: 'taksi', name: 'Taksi Tirana', body: 'taxi', price: 12000, unlockLevel: 2, topSpeed: 49, accel: 6.4, brake: 10.5, grip: 0.95, steer: 0.56, mass: 1380, nitro: false, defaultColor: 0xf2c200, description: 'Me tabelë taksie: misionet e taksisë paguajnë +25%.' },
  { id: 'dajti', name: 'Dajti SUV', body: 'suv', price: 15000, unlockLevel: 3, topSpeed: 48, accel: 6.8, brake: 9.5, grip: 0.9, steer: 0.5, mass: 1950, nitro: false, defaultColor: 0x1f4a3a, description: 'E rëndë dhe e fortë: përplasjet e dëmtojnë më pak.' },
  { id: 'furgon', name: 'Furgoni', body: 'furgon', price: 18000, unlockLevel: 3, topSpeed: 40, accel: 5.2, brake: 8.5, grip: 0.8, steer: 0.5, mass: 2500, nitro: false, defaultColor: 0xdfe3e6, description: 'Legjenda e rrugëve shqiptare. Dërgesat paguajnë +25%.' },
  { id: 'tomorri', name: 'Tomorri Pickup', body: 'pickup', price: 20000, unlockLevel: 3, topSpeed: 50, accel: 7.0, brake: 9.5, grip: 0.9, steer: 0.52, mass: 2000, nitro: false, defaultColor: 0x8a3b1e, description: 'Pickup i fortë për punë dhe aventura.' },
  { id: 'rinas', name: 'Rinas Coupé', body: 'coupe', price: 25000, unlockLevel: 4, topSpeed: 58, accel: 8.2, brake: 11.5, grip: 1.05, steer: 0.55, mass: 1400, nitro: true, defaultColor: 0x1d4fd6, description: 'Coupé sportive me nitro.' },
  { id: 'shqiponja', name: 'Shqiponja GT', body: 'sport', price: 60000, unlockLevel: 6, topSpeed: 75, accel: 11, brake: 13, grip: 1.25, steer: 0.52, mass: 1450, nitro: true, defaultColor: 0x9e0f14, description: 'Gran turismo e fuqishme — mbretëresha e unazës.' },
  { id: 'butrint', name: 'Butrint RS', body: 'sport', price: 120000, unlockLevel: 8, topSpeed: 86, accel: 13.5, brake: 14, grip: 1.35, steer: 0.5, mass: 1380, nitro: true, defaultColor: 0xf0b400, description: 'Superveturë. Vetëm për shoferët më të mirë të qytetit.' },
];

/** Vetëm për trafikun (s'shiten). */
export const TRAFFIC_CARS: VehicleSpec[] = [
  { ...PLAYER_CARS[0], id: 't-hatch' },
  { ...PLAYER_CARS[1], id: 't-sedan' },
  { ...PLAYER_CARS[2], id: 't-taxi' },
  { ...PLAYER_CARS[3], id: 't-suv' },
  { ...PLAYER_CARS[4], id: 't-furgon' },
  { id: 't-van', name: 'Furgon dërgesash', body: 'van', price: 0, unlockLevel: 99, topSpeed: 36, accel: 4.5, brake: 8, grip: 0.8, steer: 0.5, mass: 2800, nitro: false, defaultColor: 0xffffff, description: '' },
  { id: 't-bus', name: 'Autobusi i qytetit', body: 'bus', price: 0, unlockLevel: 99, topSpeed: 30, accel: 3, brake: 7, grip: 0.8, steer: 0.45, mass: 12000, nitro: false, defaultColor: 0xe8742a, description: '' },
  { id: 't-truck', name: 'Kamion', body: 'truck', price: 0, unlockLevel: 99, topSpeed: 30, accel: 3, brake: 7, grip: 0.8, steer: 0.45, mass: 9000, nitro: false, defaultColor: 0x3b6ea5, description: '' },
];

export const POLICE_CAR: VehicleSpec = {
  id: 'policia', name: 'Policia', body: 'police', price: 0, unlockLevel: 99, topSpeed: 62, accel: 9, brake: 12, grip: 1.1, steer: 0.55, mass: 1500, nitro: false, defaultColor: 0x1b3a8c, description: '',
};

/** Ngjyrat e trafikut (realiste, jo shumë të ndezura). */
export const TRAFFIC_COLORS = [0xe9e9ea, 0x1a1a1c, 0x8d9296, 0x5a6066, 0x1e3a6b, 0x7a1418, 0x2d4a36, 0xc9b28f, 0x3b2a22, 0xb7babd];

/** Ngjyrat që lojtari mund të zgjedhë në garazh. */
export const PAINT_COLORS = [
  0xc8202a, 0x9e0f14, 0xf0b400, 0xf2c200, 0xff6a13, 0x1d4fd6, 0x0f2a6b, 0x18a0b8,
  0x1f4a3a, 0x3f8f3a, 0xe9e9ea, 0x8d9296, 0x1a1a1c, 0x5b2a86, 0xd94f8a, 0x8a3b1e,
];

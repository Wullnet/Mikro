import type { CityWorld, PropertyDef } from '../core/contracts';

/** Bizneset që mund të blihen. x/z vendosen nga placeProperties(city) te POI-të 'business'. */
export const PROPERTIES: PropertyDef[] = [
  { id: 'lavazh-bllok', name: 'Lavazhi i Bllokut', kind: 'carwash', district: 'blloku', price: 5000, incomePerHour: 300, unlocks: 'Të ardhura të vogla, por të sigurta', x: 0, z: 0 },
  { id: 'kafe-bllok', name: 'Kafe Blloku', kind: 'cafe', district: 'blloku', price: 15000, incomePerHour: 750, unlocks: 'Kafeneja më e njohur e Bllokut', x: 0, z: 0 },
  { id: 'parkim-qendror', name: 'Parkimi Qendror', kind: 'parking', district: 'qendra', price: 22000, incomePerHour: 1000, unlocks: 'Parkim në zemër të qytetit', x: 0, z: 0 },
  { id: 'taksi-ylli', name: 'Taksi Ylli', kind: 'taxi', district: 'qendra', price: 35000, incomePerHour: 1300, unlocks: 'Misionet e taksisë paguajnë +50%', x: 0, z: 0 },
  { id: 'lavazh-liqeni', name: 'Lavazhi Liqeni', kind: 'carwash', district: 'liqeni', price: 28000, incomePerHour: 1150, unlocks: 'Lavazh luksoz pranë liqenit', x: 0, z: 0 },
  { id: 'parking-liqeni', name: 'Parkingu i Liqenit', kind: 'parking', district: 'liqeni', price: 60000, incomePerHour: 2400, unlocks: 'Parkingu më i kërkuar në fundjavë', x: 0, z: 0 },
  { id: 'servisi-depo', name: 'Servisi i Depos', kind: 'garage', district: 'industria', price: 90000, incomePerHour: 3000, unlocks: 'Përmirësimet −20% dhe riparim falas', x: 0, z: 0 },
  { id: 'salloni', name: 'Auto Salloni Shqiponja', kind: 'dealership', district: 'industria', price: 150000, incomePerHour: 4800, unlocks: 'Makinat −15%', x: 0, z: 0 },
  { id: 'autolarja-lane', name: 'Autolarja e Lanës', kind: 'carwash', district: 'industria', price: 250000, incomePerHour: 7500, unlocks: 'Perandoria e lavazheve të qytetit', x: 0, z: 0 },
];

/** Emri i POI-së 'business' ku ndodhet secili biznes. */
const POI_NAME: Record<string, string> = { 'servisi-depo': 'Depo Transporti' };

/** Vendos x/z të bizneseve te POI-të reale të qytetit (deterministike). */
export function placeProperties(city: CityWorld): PropertyDef[] {
  const used = new Set<string>();
  for (const p of PROPERTIES) {
    const want = POI_NAME[p.id] ?? p.name;
    const list = city.pois.filter(q => q.kind === 'business' && q.district === p.district);
    const poi = list.find(q => q.name === want && !used.has(q.id)) ?? list.find(q => !used.has(q.id))
      ?? city.pois.find(q => q.district === p.district) ?? city.pois[0];
    if (!poi) continue;
    used.add(poi.id);
    p.x = poi.x; p.z = poi.z;
  }
  return PROPERTIES;
}

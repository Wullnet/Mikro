/**
 * Misionet e karrierës (historia) + pasagjerët e taksisë.
 * Vendet referohen me lagje/lloj/emër dhe zgjidhen te POI-të reale gjatë lojës (deterministikisht).
 */
import type { DistrictId, MissionKind, PoiKind } from '../core/contracts';

export type PoiRef = { d: DistrictId; k?: PoiKind; n?: string };
export type Mood = 'qete' | 'nxitim' | 'nervoz' | 'llafazan' | 'vip';

export interface PassengerDef {
  name: string;
  mood: Mood;
  greet: string[];
  happy: string[];
  angry: string[];
  crash: string[];
  bye: string[];
}

export const PASSENGERS: PassengerDef[] = [
  { name: 'Genti', mood: 'llafazan', greet: ['Hajde kushëri! Mirë se erdhe në Tiranë!'], happy: ['E sheh? Je lindur për taksist!', 'Ky qytet do të jetë yti.'], angry: ['Ngadalë, more, s\'jemi në rally!'], crash: ['Ej! Makina e xhaxhait kjo!'], bye: ['Faleminderit kushëri, nesër ke punë!'] },
  { name: 'Nënë Drita', mood: 'qete', greet: ['Mirëmëngjes, bir. Shko ngadalë, të lutem.'], happy: ['Sa shofer i mirë, të lumtë!', 'Ma kujton nipin tim.'], angry: ['O bir, më ra zemra!', 'Ngadalë, se jam e moshuar!'], crash: ['Ah, Zot i madh!'], bye: ['Zoti të bekoftë, bir.'] },
  { name: 'Z. Arben', mood: 'nxitim', greet: ['Kam takim pas pak minutash. Shpejt!'], happy: ['Bravo, kështu! Gaz!', 'Do ia dalim në kohë.'], angry: ['Po fle? Më shpejt!', 'Po humbas kontratën!'], crash: ['Kostumi im! Kujdes!'], bye: ['Mbaje kusurin. Je i shpejtë.'] },
  { name: 'Sara', mood: 'vip', greet: ['Përshëndetje! Po bëj live, mos më turpëro.'], happy: ['Ndjekësit po të duan!', 'Sa elegant që ngas!'], angry: ['Ugh, po më prishet videoja.'], crash: ['Telefoni më ra! Seriozisht?!'], bye: ['Do të të bëj tag, ciao!'] },
  { name: 'Turisti Hans', mood: 'nervoz', greet: ['Hello... Tirana traffic, very crazy, ja?'], happy: ['Very good driver, faleminderit!'], angry: ['Oh nein, too fast, too fast!', 'Please, slowly!'], crash: ['Mein Gott!'], bye: ['Faleminderit! Tirana is beautiful!'] },
  { name: 'Studentja Era', mood: 'llafazan', greet: ['Kam provim sot, më çon te Universiteti?'], happy: ['Haha, të paktën ti je i qetë.', 'Kjo muzikë është e mirë!'], angry: ['Mos, se do vjell para provimit!'], crash: ['Kafeja ime u derdh!'], bye: ['Uroj të marr 10! Ciao!'] },
  { name: 'Xha Petriti', mood: 'qete', greet: ['Ç\'kemi djalë. Para 30 vjetësh ngisja furgon.'], happy: ['Ti di të ngasësh, jo si këta të rinjtë.'], angry: ['Hë mor hë, ku po shkon kështu?'], crash: ['Ore, s\'ke sy?!'], bye: ['Të fala babait!'] },
  { name: 'Dr. Mira', mood: 'nxitim', greet: ['Kam operacion urgjent! Shpejt, të lutem!'], happy: ['Shumë mirë, vazhdo kështu!'], angry: ['Çdo sekondë ka rëndësi!'], crash: ['Kujdes! Duhet të arrij e plotë!'], bye: ['Faleminderit, më shpëtove ditën.'] },
  { name: 'Dritani', mood: 'nervoz', greet: ['Mos qesh. Makina ime u prish. Vetëm ço më.'], happy: ['Hm... nuk ngas keq, e pranoj.'], angry: ['Kështu ngas edhe unë, por më mirë.'], crash: ['Ha! E di pse nuk do më mundësh kurrë.'], bye: ['Shihemi në Unazë. Mos u vono.'] },
  { name: 'Dasma e Lirës', mood: 'vip', greet: ['Jemi me vonesë për dasmën! Por me stil!'], happy: ['Si mbretër! Hajde, i bie borisë!'], angry: ['Fustani! Kujdes fustanin!'], crash: ['Nusja po qan, të lumtë...'], bye: ['Eja edhe ti në dasmë!'] },
];

export interface CareerSpec {
  id: string;
  kind: MissionKind;
  title: string;
  brief: string;
  lvl: number;
  reward: number;
  start: PoiRef;
  to?: PoiRef;            // taksi: destinacioni; gara: finishi; arratisje: strehimi; parking: vendi
  from?: PoiRef;          // taksi/dërgesë: ku merret
  drops?: PoiRef[];       // dërgesë
  passenger?: string;
  fragile?: boolean;
  cargo?: string;
  wanted?: number;
  count?: number;         // stunt: sa near-miss
  minKmh?: number;
  time?: number;          // sekonda (parking/stunt)
  outro?: string;         // rreshti i historisë pas suksesit
}

const T = (d: DistrictId, k: PoiKind, n?: string): PoiRef => ({ d, k, n });

export const CAREER: CareerSpec[] = [
  // --- Kapitulli 1: Mbërritja (Qendra, Lagjja)
  { id: 'c01', kind: 'parking', title: 'Mirë se erdhe në Tiranë', brief: 'Mbërrite me hatchback-un e vjetër të xhaxhait. Parkoje mirë te Parkimi Qendror.', lvl: 1, reward: 400, start: T('qendra', 'garage'), to: T('qendra', 'business', 'Parkimi Qendror'), time: 90, outro: 'Genti: "Bravo kushëri! Eja te stacioni i taksive."' },
  { id: 'c02', kind: 'taxi', title: 'Kushëriri Genti', brief: 'Genti të gjen punë si taksist. Çoje te Sheshi Skënderbej për t\'u njohur me qytetin.', lvl: 1, reward: 600, start: T('qendra', 'station', 'Stacioni i Taksive'), to: T('qendra', 'landmark', 'Sheshi Skënderbej'), passenger: 'Genti', outro: 'Genti: "Nga nesër je taksist i Tiranës!"' },
  { id: 'c03', kind: 'taxi', title: 'Nëna e lagjes', brief: 'Nënë Drita ka vizitë te mjeku. Ngadalë dhe butë.', lvl: 1, reward: 700, start: T('lagjja', 'shop', 'Market Ylli'), to: T('qendra', 'hospital'), passenger: 'Nënë Drita' },
  { id: 'c04', kind: 'delivery', title: 'Byrek i nxehtë', brief: 'Byrektore Gjyshja ka porosi për pallatet e lagjes. Para se të ftohet!', lvl: 1, reward: 800, start: T('lagjja', 'restaurant', 'Byrektore Gjyshja'), drops: [T('lagjja', 'home', 'Pallati 7'), T('lagjja', 'home', 'Pallati i Kuq')], cargo: 'byrek' },
  { id: 'c05', kind: 'stunt', title: 'Adrenalinë', brief: 'Genti thotë se taksistët e vërtetë kalojnë "milimetër". Bëj 3 kalime për pak mbi 45 km/h.', lvl: 2, reward: 900, start: T('qendra', 'landmark', 'Parku Rinia'), count: 3, minKmh: 45, time: 90 },
  { id: 'c06', kind: 'taxi', title: 'Biznesmeni me nxitim', brief: 'Z. Arben ka takimin e vitit. Koha është para.', lvl: 2, reward: 1100, start: T('qendra', 'hotel', 'Hotel Arbëria'), to: T('qendra', 'office', 'Qendra e Biznesit'), passenger: 'Z. Arben' },
  { id: 'c07', kind: 'race', title: 'Dritani', brief: 'Një djalë me makinë të zezë të sfidon: "Ti, i ardhuri. Garë deri te stacioni i autobusëve."', lvl: 2, reward: 1500, start: T('qendra', 'landmark', 'Kulla e Sahatit'), to: T('lagjja', 'station'), outro: 'Dritani: "Fat. Kjo s\'mbaron këtu."' },
  // --- Kapitulli 2: Blloku
  { id: 'c08', kind: 'taxi', title: 'Nata në Bllok', brief: 'Sara, influencere, po transmeton live. Ngarje elegante!', lvl: 2, reward: 1300, start: T('blloku', 'cafe', 'Kafe Flora'), to: T('blloku', 'home', 'Vila me Lule'), passenger: 'Sara' },
  { id: 'c09', kind: 'delivery', title: 'Torta e dasmës', brief: 'Torta me pesë kate për Hotel Diamanti. E brishtë — çdo përplasje kushton!', lvl: 2, reward: 1600, start: T('blloku', 'shop', 'Pastiçeri Dajti'), drops: [T('blloku', 'hotel', 'Hotel Diamanti')], fragile: true, cargo: 'tortë' },
  { id: 'c10', kind: 'parking', title: 'Valet në Bllok', brief: 'Hotel Diamanti kërkon valet. Parko makinën e mysafirit pa gërvishtje.', lvl: 3, reward: 1400, start: T('blloku', 'hotel', 'Hotel Diamanti'), to: T('blloku', 'business', 'Lavazhi i Bllokut'), time: 70 },
  { id: 'c11', kind: 'escape', title: 'Kurthi i Dritanit', brief: 'Dritani thirri policinë për ty. Fshihu te Garazhi i Bllokut!', lvl: 3, reward: 2000, start: T('blloku', 'cafe', 'Kafe Arti'), to: T('blloku', 'garage'), wanted: 1, outro: 'Genti: "Ky Dritani po luan me zjarrin."' },
  { id: 'c12', kind: 'race', title: 'Sprint në Bllok', brief: 'Revansh me Dritanin nëpër rrugicat e Bllokut.', lvl: 3, reward: 2600, start: T('blloku', 'restaurant', 'Pica Napoli'), to: T('qendra', 'landmark', 'Piramida') },
  { id: 'c13', kind: 'taxi', title: 'Turisti i humbur', brief: 'Hans kërkon Piramidën. Trafiku i Tiranës e tremb.', lvl: 3, reward: 1700, start: T('qendra', 'hotel', 'Hotel Arbëria'), to: T('qendra', 'landmark', 'Piramida'), passenger: 'Turisti Hans' },
  { id: 'c14', kind: 'delivery', title: 'Furgonat e Veriut', brief: 'Kompania e dërgesave të provon: tri pako nëpër qytet.', lvl: 3, reward: 2400, start: T('lagjja', 'business', 'Furgonat e Veriut'), drops: [T('lagjja', 'shop', 'Farmacia'), T('qendra', 'shop', 'Libraria Dituria'), T('blloku', 'shop', 'Butiku Elegant')], cargo: 'pako', outro: 'Shefi: "Ke punë te ne kur të duash."' },
  // --- Kapitulli 3: Liqeni
  { id: 'c15', kind: 'taxi', title: 'Provimi i Erës', brief: 'Era ka provim në Universitet. Mos e vono!', lvl: 3, reward: 1900, start: T('blloku', 'cafe', 'Kafe Mimoza'), to: T('liqeni', 'school', 'Universiteti'), passenger: 'Studentja Era' },
  { id: 'c16', kind: 'delivery', title: 'Furnizimi i tavernës', brief: 'Peshk i freskët për tavernat e Liqenit.', lvl: 4, reward: 2800, start: T('lagjja', 'shop', 'Market Ylli'), drops: [T('liqeni', 'restaurant', 'Taverna e Liqenit'), T('liqeni', 'restaurant', 'Restorant Kodra')], cargo: 'peshk' },
  { id: 'c17', kind: 'stunt', title: 'Shfaqja e Liqenit', brief: 'Turma e fundjavës po sheh. 5 kalime për pak mbi 55 km/h.', lvl: 4, reward: 3000, start: T('liqeni', 'landmark', 'Parku i Liqenit'), count: 5, minKmh: 55, time: 120 },
  { id: 'c18', kind: 'parking', title: 'Parkim i ngushtë', brief: 'Parkingu i Liqenit është plot. Gjej vendin dhe futu saktë.', lvl: 4, reward: 2500, start: T('liqeni', 'hotel', 'Hotel Panorama'), to: T('liqeni', 'business', 'Parkingu i Liqenit'), time: 60 },
  { id: 'c19', kind: 'race', title: 'Rreth Liqenit', brief: 'Gara e diellit të perëndimit. Dritani ka sjellë miqtë.', lvl: 4, reward: 4000, start: T('liqeni', 'landmark', 'Diga e Liqenit'), to: T('qendra', 'landmark', 'Pallati i Kulturës') },
  { id: 'c20', kind: 'escape', title: 'Ndjekje në Liqen', brief: 'Gara u pa nga policia. Dy yje. Fshihu te Garazhi Liqeni!', lvl: 5, reward: 4500, start: T('liqeni', 'cafe', 'Kafe Panorama'), to: T('liqeni', 'garage'), wanted: 2 },
  // --- Kapitulli 4: Industria
  { id: 'c21', kind: 'delivery', title: 'Mallra të brishta', brief: 'Shishe xhami nga Fabrika e Pijeve. Asnjë e thyer!', lvl: 5, reward: 4800, start: T('industria', 'office', 'Fabrika e Pijeve'), drops: [T('industria', 'business', 'Kantieri i Ndërtimit'), T('qendra', 'restaurant', 'Restorant Tradita')], fragile: true, cargo: 'xhami' },
  { id: 'c22', kind: 'taxi', title: 'Doktoresha', brief: 'Dr. Mira ka operacion urgjent në Spitalin e Qytetit.', lvl: 5, reward: 4200, start: T('industria', 'station', 'Stacioni i Trenit'), to: T('qendra', 'hospital'), passenger: 'Dr. Mira' },
  { id: 'c23', kind: 'race', title: 'Fabrikat', brief: 'Garë nëpër depot e Industrisë. Dritani ka makinë të re.', lvl: 6, reward: 6500, start: T('industria', 'station', 'Terminali i Mallrave'), to: T('lagjja', 'station') },
  { id: 'c24', kind: 'escape', title: 'Tre yje', brief: 'Dikush të ka shitur te policia. Tre yje — arrij te Autoservis Industria!', lvl: 6, reward: 7000, start: T('industria', 'shop', 'Gomisteria Rruga'), to: T('industria', 'garage'), wanted: 3 },
  { id: 'c25', kind: 'stunt', title: 'Mbreti i milimetrit', brief: '8 kalime mbi 65 km/h. Vetëm të çmendurit.', lvl: 7, reward: 8000, start: T('qendra', 'landmark', 'Sheshi Skënderbej'), count: 8, minKmh: 65, time: 150 },
  { id: 'c26', kind: 'delivery', title: 'Ekspresi i natës', brief: 'Tri dërgesa urgjente nga Depo Transporti në tre lagje.', lvl: 7, reward: 8500, start: T('industria', 'business', 'Depo Transporti'), drops: [T('liqeni', 'home', 'Rezidenca Liqeni'), T('blloku', 'office', 'Studio Dizajni Pika'), T('lagjja', 'home', 'Pallati me Shigjeta')], cargo: 'dokumente' },
  { id: 'c27', kind: 'taxi', title: 'Armiku në sediljen e pasme', brief: 'Makina e Dritanit u prish. Ai ka nevojë për ty, sado t\'i vijë rëndë.', lvl: 8, reward: 7500, start: T('lagjja', 'garage'), to: T('liqeni', 'home', 'Vila e Bardhë'), passenger: 'Dritani', outro: 'Dritani: "Finalja. Unaza. E shtunë."' },
  { id: 'c28', kind: 'parking', title: 'Gala në Pallatin e Kulturës', brief: 'Valet për ministrat. Saktësi absolute.', lvl: 8, reward: 6000, start: T('qendra', 'landmark', 'Pallati i Kulturës'), to: T('qendra', 'business', 'Taksi Ylli'), time: 55 },
  { id: 'c29', kind: 'escape', title: 'Qyteti në alarm', brief: 'Katër yje. I gjithë qyteti të kërkon. Fshihu te Garazhi Qendror.', lvl: 9, reward: 12000, start: T('liqeni', 'landmark', 'Diga e Liqenit'), to: T('qendra', 'garage'), wanted: 4 },
  { id: 'c30', kind: 'race', title: 'Mbreti i Rrugëve', brief: 'Finalja me Dritanin, nga Industria deri te Liqeni. Fituesi merr kurorën e qytetit.', lvl: 10, reward: 30000, start: T('industria', 'station', 'Stacioni i Trenit'), to: T('liqeni', 'landmark', 'Diga e Liqenit'), outro: 'Ti je Mbreti i Rrugëve të Tiranës!' },
];

/** Tekstet për punët e gjeneruara. */
export const CARGO = ['ushqime', 'lule', 'pako', 'ilaçe', 'pica', 'elektronikë', 'mobilje', 'libra'];

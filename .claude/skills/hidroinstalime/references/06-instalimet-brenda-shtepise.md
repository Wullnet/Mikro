# 06. Instalimet brenda shtëpisë

Rrjedha: pusetë ujëmatësi → valvula kryesore → (filtër/PRV nëse s'janë në pusetë) → shpërndarja e
ftohtë → bojleri → shpërndarja e ngrohtë (+ qarkullimi) → pajisjet → sifonët → degët e shkarkimit →
vertikalet me ventilim → kolektori nën pllakë → puseta fekale e oborrit. Çatia → ulluqet → tubat
vertikalë → atmosferiku i oborrit → puseta atmosferike / infiltrimi.

## A. Uji i ftohtë (EN 806-2/-3, DIN 1988-300)

### A1. Sistemi i shpërndarjes
- **Kolektor (manifold) për çdo banjo/kat** me tub më vete për çdo pajisje (16×2): pa bashkime në
  mur, e lehtë për t'u mbyllur, por me më shumë metra. Default për shtëpi individuale.
- **Unazor (ring)**: pajisjet lidhen në seri në një lak që kthehet te kolektori; uji qarkullon
  sa herë hapet një rubinet. Zgjidhja më e mirë higjienike (pa tuba të ndenjur).
- **T-degë**: më pak gyp, por me degë qorre; e pranueshme vetëm me degë të shkurtra (vëllimi ≤ 1.5 l).
- Pajisjet që përdoren rrallë (rubineti i oborrit, dhoma e mysafirëve) i vendos në **fund të unazës**
  ose ku ka qarkullim, jo në degë të gjata qorre.

### A2. Njësitë e ngarkesës dhe prurja (`hidro_calc.py water-in`)
| Pajisja | LU (EN 806-3) [V] | VR i ftohtë / i ngrohtë (DIN 1988-300) [N] | Lidhja tipike |
|---|---|---|---|
| Lavaman, bide | 1 | 0.07 / 0.07 l/s | 16×2 |
| WC me rezervuar | 1 | 0.13 / – | 16×2 |
| Dush | 2 | 0.15 / 0.15 | 16×2 |
| Vaskë | 4 | 0.15 / 0.15 | 16×2 (20×2 për mbushje të shpejtë) |
| Lavaman kuzhine | 2 | 0.07 / 0.07 | 16×2 |
| Enëlarëse | 2 | 0.07 / – | 16×2 |
| Lavatriçe | 2 | 0.15 / – | 16×2 |
| Rubinet oborri DN 15 | 5 | 0.30 / – | 20×2 |
1 LU = 0.1 l/s (EN 806-3). Prurja e pikut për ndërtesa banimi (DIN 1988-300 [V]):
```
Vs = 1.48 × (ΣVR)^0.19 − 0.94      [l/s],   me kufizimin VR_max ≤ Vs ≤ ΣVR
ΣVR = shuma e VR të ftohta + të ngrohta (tubi para bojlerit mbart edhe të ngrohtën)
```
Shembull (2 banjo + kuzhinë + lavanderi + rubinet oborri): ΣLU = 21, ΣVR = 1.80 l/s, **Vs = 0.71 l/s**.

### A3. Diametrat (PE-X / shumështresor, v ≤ 2 m/s)
| Tubi | ID | Q max në 2 m/s | Përdorimi tipik |
|---|---|---|---|
| 16×2 | 12 mm | 0.23 l/s | lidhja e një pajisjeje |
| 20×2 | 16 mm | 0.40 l/s | një banjo/kuzhinë, kolektor i vogël |
| 26×3 | 20 mm | 0.63 l/s | kolona e katit, shtëpi e vogël |
| 32×3 | 26 mm | 1.06 l/s | tubi kryesor i shtëpisë (2 banjo + oborr) |
| 40×3.5 | 33 mm | 1.71 l/s | shtëpi dyfamiljare, objekte të vogla |
Kufiri 2 m/s është konservativ kundër zhurmës dhe goditjes hidraulike [P]. Me PP-R ose bakër
përdor ID-në e tyre në të njëjtën llogaritje.

### A4. Buxheti i presionit (kontrolli te pajisja më e pafavorshme)
```
p_pajisje = p_kyçje − ρ·g·Δz − Δp_ujëmatës − Δp_filtër − Δp_EA − Δp_PRV − R·L·(1 + ζ) ≥ p_min
p_min = 1.0 bar (bateri e zakonshme), 1.0–1.5 bar (termostatike, dush me shumë dalje) [P]
Δp e pajisjeve së bashku zakonisht 0.4–0.8 bar; shtesa për humbjet lokale 30–60 %
```
Presioni statik te rubinetat mos të kalojë ~5 bar (EN 806-2 [N]); sipër tij vendos PRV në hyrje.

### A5. Mbrojtja nga rrjedhja kthyese (EN 1717)
- **EA** (valvul kthimi e kontrollueshme) pas ujëmatësit: e detyrueshme.
- Rubineti i oborrit: me mbrojtje HA/HD (vakum-thyes) sepse zorra mund të jetë në ujë të ndotur.
- Mbushja e sistemit të ngrohjes: **BA** (zonë me presion të reduktuar) ose ndarje e lirë AA/AB,
  sepse uji i ngrohjes me inhibitorë është kategoria 4.
- Rezervuari i ujit të shiut: kurrë i lidhur drejtpërdrejt me ujin e pijshëm; plotësimi vetëm
  përmes ndarjes së lirë AA/AB (EN 1717, EN 16941-1).

### A6. Izolimi dhe instalimi
- Uji i ftohtë izolohet kundër kondensimit dhe ngrohjes (≥ 9–13 mm; në hapësira të ngrohta ose
  pranë tubave të ngrohtë më shumë); i ftohti ≤ 25 °C [V].
- Tubi i ftohtë **poshtë** të ngrohtit kur shkojnë paralel, me ≥ 25 mm largësi ose të izoluar.
- Asnjë tub uji në mure të jashtme të pambrojtura nga ngrirja; tubat në pllakë në këmishë.
- Prova e presionit dhe shpëlarja sipas EN 806-4 dhe prodhuesit para mbylljes së mureve.

## B. Uji i ngrohtë sanitar (`hidro_calc.py dhw`)
- **Burimi**: pompë nxehtësie ajër–ujë me bojler 200–300 l, kaldajë me bojler, solar termik me
  bojler bivalent 300 l, ose bojler elektrik.
- **Nevoja**: 40 l/person/ditë në 60 °C (default; 30–60 sipas standardit të jetesës, EN 12831-3).
  5 persona → 200 l/ditë → bojler 250 l; me pompë nxehtësie merr 1.2–1.5 × nevojën ditore.
- **Temperaturat (DVGW W 551 [V])**: dalja e bojlerit ≥ 60 °C, kthimi i qarkullimit ≥ 55 °C,
  i ftohti ≤ 25 °C pas 3 litrash.
- **Rregulla e 3 litrave**: vëllimi i tubit të ngrohtë nga bojleri (ose nga linja e qarkullimit)
  deri te rubineti më i largët ≤ 3 l; përndryshe **linjë qarkullimi** me pompë (me orar, ≤ 8 h
  pushim në ditë), valvula termostatike balancimi, tub 16×2/20×2. Kontrolli: `dhw --pipes "20x2:8,16x2:4"`.
- **Siguria**: grup sigurie EN 1487 në hyrjen e ftohtë të bojlerit (valvul sigurie 6 bar, valvul
  kthimi, ndalëse, shkarkim me hinkë); enë ekspansioni sanitare (me rrjedhje) ≈ 5–8 % e vëllimit
  të bojlerit; **përzierës termostatik** në dalje (≤ 45–50 °C te rubinetat; 38–41 °C në dushe për
  fëmijë/të moshuar).
- **Izolimi** i tubave të ngrohtë dhe të qarkullimit: rreth sa diametri i tubit (≤ 22 mm → 20 mm;
  22–35 mm → 30 mm, me λ = 0.035) [P].

## C. Shkarkimi brenda (EN 12056-2, Sistemi I) (`hidro_calc.py drain-in`)
Sistemi I (vertikale e vetme, degë pjesërisht të mbushura) është standardi në shumicën e Europës.

### C1. Njësitë e shkarkimit DU (Sistemi I) [V/N] dhe diametrat e lidhjes
| Pajisja | DU (l/s) | Lidhja tipike (OD) |
|---|---|---|
| Lavaman, bide | 0.5 | 40 (32 minimale) |
| Dush pa tapë / me tapë | 0.6 / 0.8 | 50 |
| Vaskë | 0.8 | 50 |
| Lavaman kuzhine, enëlarëse | 0.8 | 50 |
| Lavatriçe ≤ 6 kg / ≤ 12 kg | 0.8 / 1.5 | 50 |
| WC me rezervuar 6 l | 2.0 | **110** |
| Pisuar me rezervuar | 0.8 | 50 |
| Sifon dyshemeje DN 50 / 70 / 100 | 0.8 / 1.5 / 2.0 | 50 / 75 / 110 |

```
Qww = K × √ΣDU      K = 0.5 banim, pensione, zyra; 0.7 spitale, shkolla, restorante, hotele;
                    1.0 tualete publike; 1.2 laboratorë
Qww ≥ DU më i madh i një pajisjeje;  Q_tot = Qww + Q_vazhdueshëm + Q_pompë
```
Shembull (2 banjo, kuzhinë, lavanderi, 2 sifona): ΣDU = 10.4 → 0.5·√10.4 = 1.61 < 2.0 (WC) → **Qww = 2.0 l/s**.

### C2. Vertikalet me ventilim primar (Sistemi I) [N]
| DN | Q max, hyrje drejtkëndore | Q max, hyrje e harkuar |
|---|---|---|
| 70 | 1.5 l/s | 2.0 l/s |
| 80 | 2.0 | 2.6 |
| 90 | 2.7 | 3.5 |
| **100** | **4.0** | **5.2** |
| 125 | 5.8 | 7.6 |
| 150 | 9.5 | 12.4 |
Vertikalja me WC: **min DN 100 (OD 110)**, gjithmonë. Një shtëpi P+1 me 2 banjo del DN 100.

### C3. Degët e paventiluara (Sistemi I) [N]
| Qww e degës | ≤ 0.5 | ≤ 0.8 | ≤ 1.5 | ≤ 2.0 (pa WC) | me WC |
|---|---|---|---|---|---|
| DN | 40 | 50 | 60 | 70 | 100 |
Kufijtë: gjatësia ≤ 4 m, ≤ 3 kthesa 90° (pa kthesën e lidhjes), rënia ≤ 1 m, pjerrësia ≥ 1 %.
Degë më të gjata ose me më shumë kthesa: rrit DN-në me një shkallë ose ventiloje.

### C4. Rregullat e instalimit
- Pjerrësia e degëve dhe kolektorëve brenda: **1–2 %** (DN 100 në kolektor nën pllakë ≥ 1 %).
- Kolektori nën pllakë: **min DN 100 (OD 110)**; kapacitetet me kb = 1 mm (nga skripta):
  OD 110: 3.1 l/s (1 %, h/D 0.5), 5.2 l/s (2 %); OD 125: 4.3 / 7.3 l/s; OD 160: 8.5 / 14.3 l/s.
- **Baza e vertikales**: dy kthesa 45° (ose kthesë me rreze të madhe); asnjë degë në ~1 m të parë
  pas bazës; dega më e ulët ≥ 0.45 m mbi fundin e kolektorit në shtëpi P+2 e lart [P].
- Kthesat horizontale me 2 × 45°, jo 90°; T me hyrje 45° (ose 87.5° vetëm në vertikale).
- Sifonët: shtresa e ujit ≥ 50 mm.
- **Ventilimi**: vertikalja vazhdon me të njëjtin DN mbi çati, ≥ 0.5 m mbi mbulesë, ≥ 1 m mbi
  (ose ≥ 2–3 m larg) dritareve dhe hapjeve [P]. Valvula ajrimi (EN 12380) vetëm si shtesë;
  çdo sistem ka të paktën një ventilim të hapur në atmosferë.
- **Revizionet**: në bazën e çdo vertikaleje, në çdo kthesë > 45° të kolektorit, çdo ≤ 20 m [V],
  dhe në daljen nga shtëpia (ose puseta e oborrit ≤ 15 m).
- Zhurma: tuba shkarkimi me izolim akustik (PP me 3 shtresa) nëpër dhoma banimi; kapëse me gomë.
- Pajisjet nën nivelin e kthimit (bodrum): stacion ngritës (EN 12056-4 / EN 12050) ose valvul kundër kthimit (EN 13564).

## D. Ulluqet dhe tubat vertikalë të shiut (EN 12056-3) (`hidro_calc.py roof`)
```
Q = r × A × C        r në l/(s·m²), A = sipërfaqja e çatisë në projeksion horizontal, C = 1.0
                     (shtesë për shiun me erë: A = L × (B + H/2) për muret që marrin shi të pjerrët)
r: Reinhold r(5 min, T = 5 vjet) = 0.046 l/(s·m²) me r15,1 = 150 (SUPOZIM); ose nga IDF lokale.
```
Kapaciteti i tubit vertikal (EN 12056-3: Q = 2.5·10⁻⁴·kb^−0.167·d^2.667·f^1.667, kb = 0.25 mm):

| ID (mm) | 60 | 75 | 80 | 87 | 100 | 110 | 120 | 150 |
|---|---|---|---|---|---|---|---|---|
| f = 0.20 | 1.2 | 2.2 | 2.6 | 3.2 | 4.6 | 6.0 | 7.6 | 13.7 |
| f = 0.33 | 2.7 | 5.0 | 5.9 | 7.4 | 10.7 | 13.8 | 17.4 | 31.6 |

Ulluku gjysmërrethor i niveluar: QN = 2.78·10⁻⁵ × AE^1.25 (AE në mm²): gjerësia 100 mm → 0.86 l/s,
125 mm → 1.51 l/s, 150 mm → 2.38 l/s, 180 mm → 3.76 l/s; me dalje në mes merr nga dy anët (× 2),
me 0.9 për gjatësinë. **Zakonisht ulluku, jo tubi vertikal, përcakton numrin e daljeve.**

Rregulla praktike [P]:
- Pjerrësia e ulluqit 3–5 mm/m drejt daljes; ulluk metalik me fugë dilatimi çdo 10–15 m.
- Dalje çdo ≤ 10–12 m ulluk, në çdo anë të çatisë dhe pranë qosheve; ≥ 2 tuba vertikalë për
  çdo çati > 60–80 m² (nëse bllokohet njëri).
- Shtëpi 12×10 m, çati katër-ujëshe (≈ 150 m² në projeksion): ulluk 125–150 mm, 3–4 tuba vertikalë 87–100 mm.
- Në bazë: kovë rëre/gjethesh me revizion, pastaj tub OD 110/125 në tokë me ≥ 1 % deri te puseta atmosferike.
- Çati e sheshtë: dalje gravitacionale ose sifonike + **dalje emergjente** (tejderdhje) për shiun T = 100 vjet.

## E. Gjatësitë dhe sasitë e shtëpisë (`hidro_calc.py house`)
Rregullat e matjes nga planet (kur ka plane):
- Tubat horizontalë: gjatësia përgjatë mureve/dyshemesë + 10 % për pjesët dhe kthesat.
- Vertikalet: lartësia e katit × numri i kateve + dalja mbi çati (1.0–1.5 m për ventilimin).
- Çdo pajisje me kolektor: distanca kolektor–pajisje + 1.0 m (ngritja në mur).
- Degët e shkarkimit: sifoni → vertikalja/kolektori, 1.5–2.5 m secila.
- Ulluqet: perimetri i strehëve (katër-ujëshe) ose 2 × gjatësia (dy-ujëshe); tubat vertikalë:
  numri × (lartësia e strehës + 0.5–0.8 m).
- Atmosferiku në oborr: tubat vertikalë lidhen me një rreth rreth shtëpisë (≈ 0.6 × perimetri) +
  shkarkimi deri te puseta atmosferike.

Vlerësimi paraprak për shtëpinë tip 12 × 10 m, P+1, 2 banjo, me kolektor (dalja e `house`):

| Instalimi | Gjatësia |
|---|---|
| Uji i ftohtë PE-X/shumështresor (16×2 te pajisjet; 20×2–26×3; 32×3 kryesori) | ~89 m |
| Uji i ngrohtë | ~55 m |
| Qarkullimi (kur kërkohet) | ~16 m |
| Shkarkimi OD 110: vertikale + ventilim (2 vertikale) | ~15 m |
| Shkarkimi OD 110–125 nën pllakë | ~21 m |
| Degë OD 40/50 | ~22 m |
| Shtëpi → pusetë fekale OD 160 | ~8 m |
| Ulluqe | ~44 m |
| Tuba vertikalë të shiut | 4 × 6.8 m ≈ 27 m |
| Atmosferik në oborr OD 125–160 | ~32 m |
Saktësia ±25 %; për paramasën përfundimtare matet nga skema izometrike.

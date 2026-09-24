# 03. Kanalizimi fekal i jashtëm me gravitet

## 1. Sistemi
Në lagje të reja: **sistem ndarës** (EN 752). Fekali merr vetëm ujërat e zeza të shtëpive; uji i
shiut shkon në atmosferik ose infiltrohet. Kyçjet e gabuara (ulluqe në fekal) mbingarkojnë
kanalin dhe impiantin, prandaj kontrollohen në marrjen në dorëzim.

## 2. Prurjet (`hidro_calc.py demand`)
```
Q_mes,z = P × q × f_k / 86 400                  [l/s]   f_k = 0.8–0.9 (85 % default)
PF      = 1 + 14 / (4 + √(P/1000))               Harmon; alternativë Babbitt 5/(P/1000)^0.2
Q_inf   = q_inf × A_ha  (0.05 l/(s·ha) rrjet i ri i testuar; 0.1–0.15 i vjetër)
Q_pik   = PF × Q_mes,z + Q_inf
```
- Llogarite **për çdo segment** me popullsinë kumulative në rrjedhën e sipërme.
- Për kyçjen e një shtëpie përdor metodën DU (EN 12056-2): Q = 0.5·√ΣDU, zakonisht 1.5–2.5 l/s.
  Kjo metodë nuk përdoret për rrjetin publik sepse e mbivlerëson shumë pikun e shumë shtëpive.
- Objektet jo-banimi shtohen si ekuivalent-banorë (shkolla 0.1–0.2 EB/nxënës, zyra 0.3–0.5 EB/punonjës) [P].

## 3. Hidraulika (`hidro_calc.py sewer`)
- **Prandtl-Colebrook** me rrashtësi operative (DWA-A 110 [V]): 0.25 mm pa puseta, 0.50 mm
  transport me puseta, **0.75 mm kolektorë me puseta dhe kyçje (default)**, 1.50 mm kanale
  muri/betoni të papërcaktuar.
- Mbushja e pjesshme: rrezja hidraulike e segmentit rrethor, diametri hidraulik 4R.
- Kufijtë e kontrollit [P]:

| Parametri | Fekal | Atmosferik |
|---|---|---|
| DN minimal | 200 (OD 200 PVC); 250 kur e kërkon kompania | 300 |
| h/D në Q projekt | ≤ 0.5 (DN ≤ 300), ≤ 0.7 (DN > 300) | Q ≤ 0.9 Q_plotë (pa mbingarkesë) |
| v minimale | ≥ 0.6 m/s (në degët e sipërme pranohet më pak me pjerrësi ≥ 1/DN dhe shpëlarje) | ≥ 0.7 m/s |
| v maksimale | 5 m/s plastikë, 3 m/s beton | 5 / 3 m/s |
| Sforcimi τ = ρgRJ | ≥ 1.5 N/m² kur është e mundur | ≥ 2 N/m² |
| Pjerrësia minimale | ≈ 1/DN (DN 200 → 0.5 %, DN 250 → 0.4 %, DN 300 → 0.33 %) | njësoj |
| Kyçja e shtëpisë | DN 150, 1.5–3 % (min 1 %) | DN 150 |

Kapacitetet me kb = 0.75 mm (PVC SN8, nga `sewer --table`):

| Pjerrësia | OD 200 | OD 250 | OD 315 | OD 400 |
|---|---|---|---|---|
| 0.5 % | 22.1 l/s, 0.79 m/s | 40.0 l/s, 0.92 m/s | 73.7 l/s, 1.07 m/s | 138.5 l/s, 1.24 m/s |
| 1.0 % | 31.4 l/s, 1.13 m/s | 56.8 l/s, 1.30 m/s | 104.6 l/s, 1.51 m/s | 196.5 l/s, 1.76 m/s |
Një lagje me 300 shtëpi (Q_pik ≈ 9 l/s) mbulohet hidraulikisht nga OD 200 edhe në 0.5 %.
Diametri i fekalit në lagjet e banimit rrallë del nga hidraulika; del nga DN minimal dhe mirëmbajtja.

## 4. Strategjia e pusetave të cekëta
Qëllimi: thellësia minimale që (a) lejon çdo kyçje me gravitet dhe (b) ruan mbulesën minimale.

### 4.1 Kuota e nevojshme e fundit të kanalit në pikën e kyçjes
```
z_dalje  = ±0.00 e shtëpisë − 0.6…0.8 m        (dalja nën pllakë, përmes themelit)
z_P      = z_dalje − i_1 × L_1                  (puseta e oborrit; i_1 = 2 %, L_1 = 5–10 m)
           dhe z_P ≤ z_oborr − 0.8 m            (mbulesa kundër ngrirjes)
z_K,1    = z_P − i_k × L_k − 0.5 × D            (kyçja hyn në gjysmën e sipërme të kanalit;
                                                 i_k = 1.5–2 %, L_k = trotuar + karrexhata/2 + 1.5 m)
z_K,2    = z_rrugë − (mbulesa_min + D + e)      (mbulesa_min = 1.0 m në karrexhatë)
z_kanal ≤ min(z_K,1 ; z_K,2)
```
Shembull (terren i sheshtë, rruga = oborri = 0.00, ±0.00 e shtëpisë = +0.30):
z_P = −0.80; z_K,1 = −0.80 − 0.02 × 6.5 − 0.10 = −1.03; z_K,2 = −(1.0 + 0.20 + 0.006) = −1.21 →
**fundi i kanalit ≈ −1.21 m, puseta ≈ 1.3 m e thellë**. Kyçja nuk e thellon kanalin; e përcakton mbulesa.
Parcela 0.5 m nën rrugë: z_P = −1.30, z_K,1 = −1.53: kjo shtëpi e thellon kanalin me 0.3 m.
Parcela me bodrum: **mos e thello rrjetin**; bodrumi merr stacion ngritës (EN 12056-4) ose
valvul kundër kthimit (EN 13564) sepse ndodhet nën nivelin e kthimit (kapaku i pusetës në rrugë).

### 4.2 Profili gjatësor
1. Puseta e kokës: thellësia minimale nga 4.1 (zakonisht 1.2–1.5 m).
2. **Terreni bie ≥ i_min**: kanali ndjek terrenin me thellësi konstante.
3. **Terreni bie < i_min ose është i sheshtë**: kanali thellohet me (i_min − i_terren) × L. Masat:
   segmente më të shkurtra me dalje të shumta, DN më i madh (ul i_min), rrugë me profil "sharrë",
   stacion pompimi i ndërmjetëm kur thellësia kalon 4–5 m.
4. **Terreni bie shumë** (v > v_max): kanali shkon me pjerrësi më të vogël dhe ndjek terrenin me
   **puseta me kaskadë** (rënie > 0.5 m: kaskadë e jashtme ose e brendshme; ≤ 0.5 m: brenda kinetës).
   Pa kaskada kanali do të dilte mbi terren. Mbi 15–20 % pjerrësi: ankorim i gypave [P].
5. Kryqëzimet me ujin: kanali poshtë; kontrollo ≥ 0.3–0.5 m ndarje vertikale në çdo kryqëzim
   dhe shëno në profil.
6. Kanali i rrugës dytësore hyn në pusetën e kolektorit me fundin në të njëjtën kuotë ose më lart
   (kurrë poshtë fundit të kolektorit), mundësisht kurorë me kurorë.

## 5. Pusetat
### 5.1 Ku
- Në çdo ndryshim drejtimi, pjerrësie, diametri, materiali; në çdo bashkim kanalesh; në krye të
  çdo dege; para dhe pas kryqëzimeve të vështira.
- Në drejtim të drejtë [P, V]: **40–60 m** për DN 200–400 (praktika gjermane: deri 40 m me
  pjerrësi ≥ 0.8 %, më pak në pjerrësi të vogla); deri **80–100 m** vetëm me pajisje moderne
  shpëlarjeje dhe kamere, kur kompania e pranon. Default: 50 m fekal, 60 m atmosferik.

### 5.2 Llojet dhe dimensionet
| Lloji | Kur | Dimensioni [N/P] |
|---|---|---|
| Pusetë me hyrje njeriu, beton (EN 1917) ose PP/PE (EN 13598-2) | rrjeti publik | DN 1000 (DN 1200 për DN kanali ≥ 500 ose thellësi > 5 m); hapja e kapakut ≥ 600 mm (zakonisht 625) |
| Pusetë kontrolli pa hyrje njeriu, PP (EN 13598-1) | kyçjet, oborret, degët e cekëta kur lejohet | DN 400–630, thellësi sipas prodhuesit (zakonisht ≤ 1.2–2.0 m) |
| Pusetë me kaskadë | rënie > 0.5 m | kaskadë e jashtme me T dhe gyp vertikal, ose e brendshme në PP |
| Pusetë bashkimi | 3–4 hyrje | kinetë e formuar për çdo hyrje, këndi ≤ 90° me rrjedhën |

Përbërja: fund me **kinetë** (kanal gjysmërrethor deri në kurorë, banketë me pjerrësi 1:20 drejt
kinetës), lidhje fleksibël në mur dhe gyp i shkurtër "lëkundës" 0.5–1.0 m jashtë murit,
unaza, konus ekscentrik, unaza rregulluese, kapak EN 124, shkallë ose këmbëza mbi banketë.

### 5.3 Klasat e kapakëve (EN 124)
| Vendi | Klasa |
|---|---|
| Karrexhatë, rrugë me trafik | **D400** |
| Zona e bordurës/kanali i rrugës (≤ 0.5 m në karrexhatë) | C250 |
| Trotuar, parkim për vetura | B125 |
| Gjelbërim, oborr pa automjete | A15 (B125 kur mund të kalojë veturë) |

## 6. Kyçjet e shtëpive në kanal
- Kyçja hyn **nga sipër**: degë Y 45° në drejtim të rrjedhës ose shalë kyçjeje në gjysmën e
  sipërme të gypit (ndërmjet orës 10 dhe 2), kurrë nga poshtë dhe pa u zgjatur brenda kanalit.
- Kur puseta e rrugës është afër (≤ 5–10 m), kyçja mund të hyjë në pusetë, mbi banketë, me kinetë.
- Një kyçje për parcelë, DN 150, pjerrësi 1.5–3 %, pa kthesa > 45° pa pusetë.
- Kyçjet vendosen gjatë ndërtimit të kolektorit (deri 1 m brenda parcelës, me kapak) që rruga
  të mos gërmohet sërish.

## 7. Materialet [P]
| Material | Përdorimi |
|---|---|
| PVC-U kompakt SN8 (EN 1401) | OD 160–500, rrjeti fekal |
| PP i brinjëzuar SN8 (EN 13476-3) | DN 300–1000, fekal dhe atmosferik |
| Beton/beton i armuar (EN 1916) | DN ≥ 600, atmosferik |
| PE (EN 12666), GRP | raste të veçanta, gypa presioni |
Nën rrugë minimum SN8; SN16 ose mbrojtje me mbulesë < 1.0 m ose > 6 m.

## 8. Stacioni i pompimit (EN 16932, kur graviteti nuk mjafton) [P]
- 2 pompa (1 punë + 1 rezervë), me grirëse kur prurja është e vogël.
- Vëllimi i dobishëm i pusit: V ≈ 0.9 × Q_p / z [m³] (Q_p në l/s, z = ndezje/orë, 10–15).
- Gypi i presionit: v 0.7–2.0 m/s, ID ≥ 80 mm (≥ 50 mm me pompa me grirëse); ajrosëse në pikat e larta.
- Alarm niveli, rezervë ose tejderdhje emergjente, ventilim me filtër ere, rrymë rezervë.

## 9. Rezultatet që dorëzohen
- Tabela e segmenteve: puseta–puseta, L, P kumulative, Q_pik, DN, i, h/D, v, τ, kotat
  (terreni, fundi, kurora) dhe thellësitë.
- Profilet gjatësore me kotat e kyçjeve kritike dhe kryqëzimet.
- Lista e pusetave me thellësinë, tipin, kaskadat dhe klasën e kapakut.
- Detajet: pusetë tip, pusetë me kaskadë, kyçje, gropë tip.

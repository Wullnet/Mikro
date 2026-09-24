# 07. Shembull i plotë: lagje me 300 shtëpi (Kosovë)

Të gjithë numrat këtu dalin nga `scripts/hidro_calc.py` me komandat e shënuara. Terreni,
kuotat dhe pika e kyçjes janë **hipotetike**; shembulli tregon rrjedhën e punës dhe logjikën.
Për një projekt real zëvendëso të dhënat hyrëse dhe riprodho çdo hap.

## 1. Të dhënat hyrëse (hipotetike)
| Parametri | Vlera |
|---|---|
| Shtëpi / banorë | 300 shtëpi individuale P+1 × 5 = 1 500 banorë |
| Parcelat | 15 m ballinë × 30 m thellësi (450 m²), shtëpi 12 × 10 m, pa bodrum |
| Rrugët | Rruga A (lidhëse, perëndim) 450 m, bie 612 → 598 m (3.1 %); 6 rrugë tërthore (1–6) nga 375 m, 50 shtëpi secila, bien 1 % drejt A-së; Rruga B (lindje) 450 m, pa shtëpi, vetëm për unazën e ujit |
| Prerja e rrugës | 10 m: karrexhatë 6.0 m + 2 × trotuar 2.0 m (A: 14 m) |
| Uji ekzistues | tubi rajonal në veri jep maksimum 6 l/s |
| Kodra në veri | 600 m larg, e mjaftueshme për rezervar në kuotën 650 m |
| Fekali | kyçje në kanalin e qytetit në jug (kuota 598), kapacitet i konfirmuar |
| Atmosferiku | përroi në jug; leja lejon 15 l/(s·ha) × 16.4 ha ≈ 246 l/s |
| Shiu | pa IDF lokale → Reinhold r15,1 = 150 l/(s·ha) (SUPOZIM) |

```
                 Rezervari 200 m³ (niveli 650–654 m)
                          │ PE100 OD200, 600 m
   N  612.0 ──────────────●──────── Rruga 1 (OD125) ───────────────────● 615.8 (pika më e lartë)
            Rruga A       ├──────── Rruga 2 (OD110) ───────────────────┤
            OD160 uji     ├──────── Rruga 3 ───────────────────────────┤   Rruga B
            OD200 fekal   ├──────── Rruga 4 ───────────────────────────┤   OD160 uji
            DN400→700 atm.├──────── Rruga 5 ───────────────────────────┤   (unaza)
                          ├──────── Rruga 6 ───────────────────────────┤
   S  598.0 ──────────────● dalja: fekali → kanali i qytetit; atmosferiku → retencion → përroi
```

## 2. Faza 1–2: terreni dhe trasetë
- Terreni bie nga veriu në jug (3.1 %) dhe nga lindja në perëndim (1 %): një pellg i vetëm me
  dalje në jug. Graviteti funksionon kudo; nuk ka nevojë për pompim.
- Fekali në aksin e çdo rruge; atmosferiku 1.5 m anash aksit; uji në trotuarin verior/perëndimor
  1.0 m nga kufiri; hidrantët në të njëjtin trotuar, 0.5–1.0 m nga bordura.
- Rruga A ka pjerrësi 3.1 %: kolektorët shtrihen me 1.5 % dhe e ndjekin terrenin me puseta me kaskadë.

## 3. Faza 3: ujësjellësi
**Kërkesa** (`demand --houses 300 --area-ha 16.4`):

| Madhësia | Vlera |
|---|---|
| Konsumi mesatar | 225.0 m³/d |
| Q mesatar (me 10 % humbje) | 2.86 l/s |
| Q max ditor | 4.30 l/s = 371.2 m³/d |
| Q max orar | 8.59 l/s |
| Zjarri | 13.3 l/s × 2 h = 96 m³ |
| **Q dimensionues = Q max ditor + zjarri** | **17.60 l/s** |

**Rezervari** (`reservoir --qmaxday 371.2 --qmaxhour 8.59 --source-ls 6 --z-highest 616 --z-lowest 598 --level-min 650`):
burimi (6 l/s) < Q max orar + zjarri (21.9 l/s) → **rezervari është i nevojshëm**.
V = 92.8 (balancim 25 %) + 95.8 (zjarr) = 188.6 m³ → **200 m³ në 2 dhoma**. Niveli minimal i
nevojshëm 645.0 m; zgjidhet **650 m** (rezervë për 2.5 bar te hidrantët në zjarr), maksimal 654 m.
Presioni statik te pika më e ulët: **5.49 bar ≤ 6 bar**, pa zona presioni. Tubi rajonal mbush rezervarin me 6 l/s.

**Tubat** (rasti i zjarrit, i pafavorshëm):

| Segmenti | Komanda | Zgjedhja | v | hf | Presioni në fund |
|---|---|---|---|---|---|
| Rezervar → hyrja (600 m) | `pipe --q 17.6 --length 600 --min-nom 110 --h-start 38 --k 0.1 --p-min 3.4` | **PE100 OD200 SDR17** | 0.72 m/s | 1.86 m | 3.53 bar |
| Rruga A (450 m, zbret 14 m) | `pipe --q 17.6 --length 450 --min-nom 160 --h-start 35.9 --dz -14` | **OD160** | 1.13 m/s | 5.55 m | 4.29 bar |
| Rruga 2–6, zjarr në fund, furnizim nga dy anët (7.0 l/s, +4 m) | `pipe --q 7.0 --length 375 --min-nom 110 --h-start 35.9 --dz 4 --p-min 2.5` | **OD110 (DN 100)** | 0.95 m/s | 5.33 m | 2.55 bar |
| Rruga 1 (më e larta), njësoj | `pipe --q 7.0 --length 375 --min-nom 125 ...` | **OD125** (rezervë) | 0.73 m/s | 2.75 m | 2.83 bar |
| Rruga 1, ora e pikut (1.43 l/s) | `pipe --q 1.43 --length 375 --min-nom 110 --h-start 35.9 --dz 4 --p-min 2.35` | OD110 | 0.19 m/s | 0.26 m | 3.10 bar ≥ 2.35 |
Rruga B: OD160 (mbyll unazat). Llogaritja përfundimtare e unazave: EPANET.

**Armaturat:**
- Hidrantë mbitokësorë DN 80: 5 në çdo rrugë tërthore (çdo ~75 m) = 30, + 6 në Rrugën A + 2 në B = **38**.
- Valvula: 12 nyje T (6 në A, 6 në B) × 3 = 36, + 38 për hidrantët, + 2 (rezervari, hyrja/ujëmatësi zonal) = **76**.
  Çdo rrugë tërthore mbyllet nga dy skajet: seksion prej 50 shtëpish.
- Ajrosëse: 3 (pika më e lartë në Rrugën B/1 dhe në tubin e rezervarit); shkarkues: 2 (skajet jugore të A dhe B, ose hidrantët atje).
- Kyçje: 300 × PE100 OD32 SDR11, mesatarisht 6.5 m = **1 950 m**; 300 shalë kyçjeje, 300 puseta ujëmatësi.

## 4. Faza 4: kanalizimi fekal
**Prurjet:** gjithë lagjja (`demand --houses 300 --area-ha 16.4`): Q_mes 2.21 l/s, Harmon 3.68,
infiltrim 0.82 l/s → **Q_pik = 8.96 l/s**. Një rrugë me 50 shtëpi (`demand --houses 50 --area-ha 2.625`): **1.65 l/s**.

| Segmenti | Komanda | DN | h/D | v | τ |
|---|---|---|---|---|---|
| Rrugët 1–6 (1 %) | `sewer --q 1.65 --slope 1.0` | **PVC SN8 OD200** | 0.16 | 0.60 m/s | 1.78 N/m² |
| Rruga A, dalja (3.1 %) | `sewer --q 8.96 --slope 3.1` | **OD200** (OD250 nëse e kërkon kompania) | 0.27 | 1.47 m/s | 8.99 N/m² |
DN del nga minimumi dhe mirëmbajtja, jo nga prurja: OD200 në 1 % mban 31.4 l/s.

**Thellësitë (puseta të cekëta):** kyçja tip (03 § 4.1): puseta e oborrit −0.80, kyçja 6.5 m me 2 %
→ −1.03; mbulesa 1.0 m mbi kurorë → −1.21. Mbulesa e përcakton: **fundi −1.21…−1.30 m, puseta 1.3 m**.
Rrugët tërthore bien 1 % sa kanali: thellësia mbetet konstante 1.30 m. Profili i Rrugës 3:

| Puseta | Stacioni (m) | Terreni (m) | Fundi i kanalit (m) | Thellësia (m) |
|---|---|---|---|---|
| F3-1 (koka, lindje) | 0.0 | 611.10 | 609.80 | 1.30 |
| F3-2 | 46.9 | 610.63 | 609.33 | 1.30 |
| F3-3 | 93.8 | 610.16 | 608.86 | 1.30 |
| F3-4 | 140.6 | 609.69 | 608.39 | 1.30 |
| F3-5 | 187.5 | 609.23 | 607.93 | 1.30 |
| F3-6 | 234.4 | 608.76 | 607.46 | 1.30 |
| F3-7 | 281.3 | 608.29 | 606.99 | 1.30 |
| F3-8 | 328.1 | 607.82 | 606.52 | 1.30 |
| FA-3 (në Rrugën A) | 375.0 | 607.35 | 606.05 → 605.85 (fundi i A) | 1.50 |
Nëse një parcelë në stacionin ~200 do të ishte 0.5 m nën rrugë: z_K,1 = −1.53 m, pra kanali
thellohet 0.23 m nga F3-5 e poshtë (kjo shtëpi vendos kuotën). Asnjë bodrum nuk e thellon rrjetin.

**Pusetat:** 8 për rrugë × 6 = 48 + Rruga A (6 nyje + 6 të ndërmjetme + 1 dalje) = **61 puseta DN 1000**,
thellësi 1.3–1.6 m, kapakë D400. Rezultati i `neighborhood`: ~61 ✓.

## 5. Faza 5: atmosferiku (dy variante)
Nënpellgu i një rruge: 375 m × (2 × 30 m parcela + 10 m rrugë) = 2.625 ha.

| Sipërfaqja | ha | ψ variant A (çatitë në rrjet) | ψ variant B (çatitë infiltrohen, oborr i përshkueshëm) |
|---|---|---|---|
| Çati (50 × 150 m²) | 0.750 | 0.95 | 0.00 |
| Rrugë + trotuare | 0.375 | 0.90 | 0.90 |
| Oborr i shtruar (50 × 100 m²) | 0.500 | 0.70 | 0.50 |
| Gjelbërim | 1.000 | 0.15 | 0.15 |
| **ψ mesatar** | 2.625 | **0.59** | **0.28** |

| Madhësia | Komanda | Variant A | Variant B |
|---|---|---|---|
| Rrugë tërthore, t_c = 5 + 375/60 = 11.2 min, T = 2 | `storm --surface … --length 375` | r = 230.9 → **Q = 357.9 l/s** | **Q = 170.3 l/s** |
| DN në 1 % | `sewer --type atmosferik --series id` | **DN 500** (h/D 0.72, v 2.36) | **DN 400** (h/D 0.64, v 2.00) |
| Dalja e lagjes, 16.38 ha, t_c = 14.3 min | `storm --surface anesore:15.75:ψ --surface kryesore:0.63:0.9 --tc 14.3` | **Q = 1 979.9 l/s** | **Q = 1 002.1 l/s** |
| Kolektori A në 1.5 % (me kaskada) | `sewer --q … --slope 1.5 --type atmosferik --series id` | **DN 1000** | **DN 700** |
| Retencioni para përroit (246 l/s, T = 5, f_Z = 1.2) | `storm … --outflow 246` | **3 015 m³** | **1 255 m³** |

Kolektori A në variantin B, segment pas segmenti (t_c rritet me 75 m / 2 m/s):

| Pas rrugës | A (ha) | A_u (ha) | t_c (min) | r | Q (l/s) | DN (1.5 %) |
|---|---|---|---|---|---|---|
| 1 | 2.73 | 0.833 | 11.2 | 231 | 193 | 400 |
| 2 | 5.46 | 1.665 | 11.8 | 224 | 374 | 500 |
| 3 | 8.19 | 2.498 | 12.4 | 218 | 544 | 600 |
| 4 | 10.92 | 3.330 | 13.1 | 212 | 705 | 600 |
| 5 | 13.65 | 4.162 | 13.7 | 206 | 857 | 700 |
| 6 → dalja | 16.38 | 4.995 | 14.3 | 200 | 1 001 | 700 |

**Përfundim:** infiltrimi i çative në parcelë e përgjysmon prurjen, e zvogëlon kolektorin kryesor
nga DN 1000 në DN 700 dhe retencionin nga 3 015 në 1 255 m³. Rekomandohet varianti B, me
tejderdhje të pusit të infiltrimit drejt atmosferikut publik.
Kolektori A bie 14 m në 450 m, ndërsa gypi me 1.5 % bie vetëm 6.75 m. Diferenca prej 7.25 m
merret me **13 puseta me kaskadë, ~0.56 m secila**.

**Grilat:** rrugët tërthore 2 anë × 13 = 26 × 6 = 156; Rruga A (3.1 %, çdo 25 m) 2 × 18 = 36 → **192 grila**,
lidhjet DN 160 × ~4 m = 768 m. **Pusetat e atmosferikut:** 7 për rrugë (çdo ~54 m) × 6 = 42 + 13 në A = **55**.

## 6. Faza 6–7: parcela dhe shtëpia tip
Shtëpia tip 12 × 10 m, P+1, 2 banjo, kuzhinë, lavanderi, rubinet oborri:

| Llogaritja | Komanda | Rezultati |
|---|---|---|
| Uji | `water-in --p-avail 3.5 --z 6 --length 30` | ΣLU 21, ΣVR 1.80 l/s, **Vs 0.71 l/s**, tubi kryesor **32×3** (v 1.35 m/s), presioni te pajisja kritike **1.92 bar ≥ 1.0** |
| Uji i ngrohtë | `dhw --pipes "20x2:8,16x2:4"` | 200 l/ditë → **bojler 250 l**, 7.3 kW për 2 h; vëllimi i tubit 2.06 l ≤ 3 l → pa qarkullim |
| Shkarkimi | `drain-in` | ΣDU 10.4, **Qww 2.0 l/s**, vertikale **DN 100**, kolektor **OD 110 me 1 %** (3.10 l/s) |
| Çatia 150 m² | `roof --area 150` | 6.88 l/s; tub vertikal 100 mm mban 10.7 l/s; ulluku 125 mm (dalje në mes) 2.72 l/s → **min 3, merren 4 tuba vertikalë** (një për çdo anë) |
| Gjatësitë | `house --circulation` | ftohtë ~89 m, ngrohtë ~55 m, (qarkullim ~16 m), OD110 ~36 m, OD40/50 ~22 m, OD160 ~8 m, ulluqe ~44 m, tuba shiu 4 × 6.8 m, atmosferik oborri ~32 m |
Parcela: pusetë fekale DN 400 (0.8–1.0 m), pus infiltrimi me pusetë sedimentimi, pusetë ujëmatësi me EA.

## 7. Faza 8: paramasa e lagjes (varianti B)
| Pozicioni | Njësia | Sasia |
|---|---|---|
| PE100 OD200 SDR17 (rezervar → lagje) | m | 600 |
| PE100 OD160 SDR17 (Rruga A + B) | m | 900 |
| PE100 OD125 SDR17 (Rruga 1) | m | 375 |
| PE100 OD110 SDR17 (Rrugët 2–6) | m | 1 875 |
| Rezervar betoni 200 m³ (2 dhoma) me dhomë valvulash | copë | 1 |
| Hidrantë mbitokësorë DN 80 (EN 14384) me valvul dhe degë | copë | 38 |
| Valvula DN 100–200 me kuti rrugore | copë | 76 |
| Ajrosëse / shkarkues | copë | 3 / 2 |
| Kyçje uji PE100 OD32 SDR11 + shalë + valvul rruge | m / copë | 1 950 / 300 |
| Pusetë ujëmatësi me armaturat (valvul, filtër, ujëmatës, EA, valvul me shkarkim) | copë | 300 |
| PVC SN8 OD200 fekal | m | 2 700 |
| Puseta fekale DN 1000, h = 1.3–1.6 m, kapak D400 | copë | 61 |
| Kyçje fekale OD160 | m / copë | 1 950 / 300 |
| Puseta fekale në oborr PP DN 400–600 | copë | 300 |
| PP SN8 DN 400 atmosferik (rrugët) | m | 2 250 |
| PP SN8 / beton DN 400–700 (kolektori A, sipas segmenteve) | m | 450 |
| Puseta atmosferike DN 1000–1200 (13 me kaskadë) | copë | 55 |
| Grila rruge C250 me kovë + lidhje DN 160 | copë / m | 192 / 768 |
| Basen retencioni 1 255 m³ + rregullator + dalje me klapë | copë | 1 |
| Puse infiltrimi / rezervuarë shiu në parcela (me tejderdhje) | copë | 300 |
| Gërmim gropash (përafërsisht, shih më poshtë) | m³ | ~15 650 |

Gërmimi i përafërt (L × b × h, ±20 %): uji 3 750 m × 0.6 × 1.4 = 3 150; fekali 2 700 × 0.9 × 1.5 = 3 645;
atmosferiku 2 250 × 1.17 × 1.6 = 4 212 dhe 450 × 1.55 × 1.9 = 1 325; kyçjet e ujit 1 950 × 0.4 × 1.2 = 936;
kyçjet fekale 1 950 × 0.8 × 1.2 = 1 872; lidhjet e grilave 768 × 0.6 × 1.1 = 507 m³.
Fekali dhe atmosferiku në të njëjtën gropë me shkallë e ulin gërmimin me 15–25 %.
Shtëpitë: paramasa e shtëpisë tip (§ 6) × 300.

## 8. E njëjta lagje me 200 shtëpi
| Madhësia | 300 shtëpi | 200 shtëpi (`demand --houses 200 --area-ha 11`, `neighborhood --houses 200 --collector 300 --streets 4 --junctions 5`) |
|---|---|---|
| Banorë | 1 500 | 1 000 |
| Q max ditor / Q max orar | 4.30 / 8.59 l/s | 2.86 / 5.73 l/s |
| Q dimensionues (me zjarr) | 17.60 l/s | 16.16 l/s |
| Rezervari | 188.6 → 200 m³ | 157.6 → 200 m³ |
| Fekal Q_pik | 8.96 l/s | 6.16 l/s |
| Gjatësia e rrjetit | 2 700 m | 1 800 m |
| Hidrantë / valvula (vlerësim) | 34 / ~59 | 23 / ~41 |
| Puseta fekale / atmosferike (vlerësim) | ~61 / ~52 | ~41 / ~35 |
| Grila | ~180 | ~120 |
Zjarri e dominon ujësjellësin: DN-të e rrugëve nuk ndryshojnë kur kalon nga 200 në 300 shtëpi,
dhe rezervari mbetet 200 m³, sepse rezerva e zjarrit (96 m³) është gjysma e tij.

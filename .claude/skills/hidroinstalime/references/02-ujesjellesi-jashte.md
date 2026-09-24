# 02. Ujësjellësi i jashtëm: kërkesa, rezervari, rrjeti, hidrantët, valvulat

## 1. Kërkesa për ujë (`hidro_calc.py demand`)
```
P        = shtëpi × banorë/shtëpi
Q_kons   = P × q / 1000                       [m³/d]   q = 150 l/banor/ditë (default)
Q_mes    = Q_kons × (1 + humbjet) / 86.4      [l/s]    humbjet 10 % për rrjet të ri
Q_maxd   = k_d × Q_mes                        k_d = 1.3–1.5
Q_maxh   = k_h × Q_maxd                       k_h = 1.5–2.5 (sa më e vogël lagjja, aq më i madh)
Q_dim    = max(Q_maxh ; Q_maxd + Q_zjarr)
```
| Banorë | k_d | k_h | k_d × k_h [P] |
|---|---|---|---|
| < 1 000 | 1.5–1.8 | 2.0–2.5 | 3.0–4.5 |
| 1 000–5 000 | 1.4–1.5 | 1.8–2.0 | 2.5–3.0 |
| 5 000–20 000 | 1.3–1.4 | 1.5–1.8 | 2.0–2.5 |

Për lagjet me 200–300 shtëpi (1 000–1 500 banorë) përdor k_d = 1.5 dhe k_h = 2.0.
Objektet publike (shkollë, xhami, market) shtohen si konsum më vete (shkolla 10–20 l/nxënës/ditë,
zyra 40–60 l/punonjës/ditë) [P].

## 2. Uji për zjarr
- **DVGW W 405** [V]: shtëpi individuale dhe ndërtim i rrallë 48 m³/h (13.3 l/s), përndryshe
  96 m³/h (26.7 l/s), për 2 orë; presioni ≥ 1.5 bar kudo në rrjet; sasia duhet të mblidhet nga
  hidrantët brenda rrezes 300 m; çdo hidrant ≥ 400 l/min (6.7 l/s).
- **Rregullorja e rajonit (SFRJ 30/1991)** [V]: rrjet unazor DN ≥ 100, hidrantë çdo ≤ 80 m,
  5–80 m nga objekti, presioni ≥ 2.5 bar te hidranti.
- **Default për Kosovën:** Q_zjarr = 13.3 l/s × 2 h (96 m³) për lagje me shtëpi individuale;
  distanca e hidrantëve ≤ 80 m; kontrolli i presionit ≥ 2.5 bar te hidranti më i pafavorshëm
  (kërkesa më e rreptë). Nëse AME ose kompania pranon 1.5 bar, shënoje.

## 3. Rezervari (`hidro_calc.py reservoir`)
### Kur duhet?
Rezervari është i **nevojshëm** kur ndodh të paktën një nga këto:
1. Kapaciteti i burimit/kyçjes < Q_maxh + Q_zjarr (burimi jep mesataren, rezervari mbulon pikun dhe zjarrin).
2. Presioni në pikën e kyçjes luhatet ose bie nën kërkesën gjatë pikut të qytetit.
3. Lagjja është në kodër mbi zonën e presionit ekzistues (duhet stacion pompimi + rezervar lart).
4. Kompania kërkon rezervë emergjente për ndërprerjet.
Nëse kyçja jep me siguri Q_maxh + Q_zjarr me presionin e kërkuar, rezervari nuk është i
domosdoshëm hidraulikisht. Vendimin shkruaje në relacion me shifrat.

### Vëllimi
```
V = V_balancues + V_zjarr + V_emergjent
V_balancues = 20–30 % × Q_maxd [m³/d]         (25 % default; ose nga grafiku orar i konsumit)
V_zjarr     = Q_zjarr × 3.6 × orët              (13.3 l/s × 2 h = 96 m³)
V_emergjent = Q_maxd / 24 × orët_e_ndërprerjes  (opsionale, sipas kompanisë)
```
Rrumbullakoje lart në madhësi standarde dhe ndaje në **2 dhoma** (pastrimi pa ndërprerje).
Uji duhet të qarkullojë plotësisht brenda 1–3 ditësh (higjiena); vëllimi shumë i madh nuk është "më i sigurt".

### Kuota
```
Niveli minimal i ujit ≥ z_shtëpia_më_e_lartë + p_kërkuar × 10.2 + humbjet deri atje
p_kërkuar: 2.00 bar P+0, 2.35 bar P+1, 2.70 bar P+2 (+0.35 bar/kat, DVGW W 400-1 [V])
Presioni statik te pika më e ulët = (niveli maksimal − z_min) / 10.2 ≤ 6 bar (idealisht 3–5 bar)
```
Nëse statiku del > 6 bar: ndaj lagjen në zona presioni (PRV në rrjet), ose vendos PRV në çdo
shtëpi të zonës së ulët. Kontrollo edhe presionin në rastin e zjarrit (≥ 2.5 bar ose ≥ 1.5 bar).

### Pajisjet e rezervarit (EN 1508, DVGW W 300) [P]
Hyrja mbi nivelin maksimal (ose me valvul noton), dalja 0.15–0.20 m mbi fund me sitë, tejderdhja
me sifon ose klapë kundër insekteve, shkarkimi i fundit, ajrimi me filtër, hyrje e mbyllur me
kyç, dhomë valvulash, ujëmatës në dalje dhe matës niveli (SCADA nëse ka).

## 4. Rrjeti i shpërndarjes
### Konfigurimi
- **Unazor**: çdo rrugë lidhet në të dy skajet (p.sh. një rrugë paralele në fund të rrugëve
  tërthore). Me unaza, zjarri furnizohet nga dy drejtime dhe humbjet bien afërsisht 4 herë.
- Degët qorre vetëm kur nuk ka alternativë: me hidrant/shkarkues në fund dhe me DN minimal.
- Zonat e presionit sipas kuotave (diferenca e kuotave brenda një zone ≤ ~40 m).

### Dimensionimi (`hidro_calc.py pipe`)
- Darcy-Weisbach me Colebrook-White; rrashtësia operative: **k = 0.1 mm** tuba transmetimi,
  **0.4 mm** rrjet shpërndarjeje me kyçje dhe armatura [P].
- Shpejtësia: 0.5–1.5 m/s në rastin normal; ≤ 2.0 m/s në zjarr. Në rrugët fundore v del shumë
  e vogël në orët normale; kjo pranohet sepse DN përcaktohet nga zjarri.
- DN minimal: **DN 100** me hidrantë (PE100 OD 110; më mirë OD 125 në degë të gjata).
- Për rrjete unazore me shumë nyje, llogaritja përfundimtare bëhet me EPANET (falas) ose
  Hardy-Cross; skripta jep kontroll konservativ për një rrugë të vetme (gjysma e prurjes kur
  furnizohet nga të dy anët).
- Kontrollet: (a) ora e pikut: presioni te shtëpia më e lartë ≥ p_kërkuar; (b) zjarri: Q_maxd në
  gjithë rrjetin + Q_zjarr te hidranti më i pafavorshëm, presioni aty ≥ 2.5 (ose 1.5) bar;
  (c) nata: presioni statik ≤ 6 bar.

### Materialet [P]
| Material | Përdorimi | Klasa |
|---|---|---|
| PE100 SDR17 (PN10) | rrjet shpërndarjeje OD 110–250 | presioni i punës ≤ 10 bar |
| PE100 SDR11 (PN16) | kyçjet OD 32–63, zona me presion të lartë | ≤ 16 bar |
| Gize duktile (EN 545) | transmetim DN ≥ 200, ngarkesa të rënda | K9 / C40 |
| PVC-O / PVC-U (EN 1452) | alternativë për shpërndarje | PN10–16 |
Lidhjet: PE me elektrofuzion (≤ OD 110) ose fuzion ballor (≥ OD 90); armaturat me fllanxha
dhe adaptorë; gize/PVC me kyçje me gomë dhe **blloqe ankorimi** në kthesa, T, reduksione,
kapakë fundorë (ose kyçje të bllokuara).

## 5. Hidrantët (EN 14384 mbitokësor, EN 14339 nëntokësor)
Rregullat e vendosjes:
1. **Kurrë në karrexhatë.** Në trotuar ose në brezin e gjelbër, 0.5–1.0 m nga bordura (që kamioni
   i zjarrfikësve të lidhet pa bllokuar rrugën). Në trotuar shumë të ngushtë: në xhep parkimi, jo në korsi.
2. **Larg fasadave**: ≥ 5 m nga objekti (jashtë zonës së shembjes dhe të nxehtësisë), por ≤ 80 m
   nga hyrja e çdo objekti (≤ 100 m zorrë sipas praktikës gjermane).
3. **Distanca midis hidrantëve ≤ 80 m** (default Kosovë); DVGW: 100–150 m në zona banimi.
4. Mundësisht **te kryqëzimet** (shërben dy rrugë) dhe në pikat e ulëta/të larta (shërben edhe si shkarkues/ajrosës).
5. Çdo hidrant: T në tubin kryesor → degë DN 80/100 me **valvul ndalëse** (me kutinë e saj në
   trotuar) → hidrant në bllok betoni, me drenazh të trupit (gurë zhavorri) dhe tabelë shenjuese.
6. Mbitokësor (DN 80/100, dy dalje B dhe një A) kudo ku ka vend; nëntokësor vetëm aty ku
   mbitokësori pengon, me kapak në trotuar dhe shenjë.
7. Mos e vendos në hyrje garazhi, para portave ose pranë shtyllave elektrike.

## 6. Valvulat dhe armaturat
| Armatura | Ku | Rregulli [P] |
|---|---|---|
| Valvul ndalëse (portë, EN 1074-2) | çdo nyje | T: në të tri degët (min. 2); kryq: në 3–4 degë |
| Valvul seksionimi | rrugë të gjata | seksion që ndal ≤ ~50 shtëpi ose ≤ 300–500 m |
| Valvul e hidrantit | çdo hidrant | në degë, afër T-së |
| Ajrosëse automatike (EN 1074-4) | pikat e larta, pas ndryshimit të pjerrësisë | në pusetë me drenazh |
| Shkarkues | pikat e ulëta, fundet e degëve | hidranti mund ta zëvendësojë |
| Reduktues presioni (PRV) | kufiri i zonave të presionit | me bypass dhe filtër |
| Ujëmatës zonal | hyrja e lagjes | për kontrollin e humbjeve (zonë DMA) |
Valvulat në tokë: me zgjatim teleskopik dhe kuti rrugore (me klasën EN 124 përkatëse), me
tabelë shenjuese në mur/shtyllë (distanca dhe DN).

## 7. Kyçja e shtëpisë (detaji në 05)
Shalë kyçjeje me valvul (ose T elektrofuzioni + valvul rruge) → PE100 SDR11 OD 32 (OD 40 për
shtëpi të mëdha/dy familje) → kalim nën rrugë me këmishë PVC OD 110 → pusetë ujëmatësi 1–2 m brenda parcelës.
Mbulesa ≥ 1.0 m. Një kyçje për parcelë.

## 8. Rezultatet që dorëzohen
- Tabela e kërkesës (P, Q_mes, Q_maxd, Q_maxh, Q_zjarr, Q_dim).
- Rezervari: vendimi, vëllimi, kuota, presioni statik.
- Tabela e segmenteve: nyja–nyja, L, Q, DN, v, J, hf, presioni në nyje (pik dhe zjarr).
- Plani me hidrantët, valvulat, ajrosëset, shkarkuesit dhe kyçjet.
- Detajet tip: nyja me valvula, hidranti, kyçja, pusetë ujëmatësi, blloqet e ankorimit.

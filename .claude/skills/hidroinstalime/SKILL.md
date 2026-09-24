---
name: hidroinstalime
description: >-
  Projektim i hidroinstalimeve sipas standardeve EU (EN 752, EN 1610, EN 805, EN 806,
  EN 12056, EN 1717, EN 124, EN 14384) për lagje banimi (p.sh. 200–300 shtëpi) dhe
  për shtëpitë e tyre: analiza e terenit, trasetë në rrugë, ujësjellësi me hidrantë,
  valvula dhe rezervar, kanalizimi fekal me gravitet dhe puseta sa më të cekëta,
  atmosferiku me gravitet (grila, retencion, infiltrim), kyçjet dhe pusetat në oborr,
  instalimet brenda shtëpisë (ujë i ftohtë/i ngrohtë, qarkullim, shkarkim, ventilim,
  ulluqe), gjatësitë, sasitë dhe llogaritjet. Përdore sa herë që kërkohet projekt,
  llogaritje, kontroll ose paramasë për ujësjellës, kanalizim, atmosferik, hidrantë,
  puseta ose instalime sanitare. English triggers: water supply network, sewer design,
  stormwater drainage, manholes, fire hydrants, plumbing design, EN 806/EN 12056 sizing.
---

# Hidroinstalimet: nga terreni i lagjes deri te rubineti

Ky skill është metodologji pune për projektin e plotë të hidroinstalimeve të një lagjeje
(zakonisht 200–300 shtëpi individuale) dhe të shtëpive të saj. Vlerat default janë për
**Kosovën**. Për Shqipërinë shih shënimet në `references/00-standardet-dhe-burimet.md`.

## Parimet e punës

1. **Asnjë numër pa burim.** Çdo vlerë në raport vjen ose nga `scripts/hidro_calc.py`, ose
   nga një tabelë e cituar në `references/`, ose nga një supozim i shënuar si i tillë
   ("SUPOZIM: …"). Supozimet mblidhen në fund të raportit.
2. **EN së pari, pastaj plotësimi kombëtar.** Normat EN shpesh i lënë vlerat numerike në
   nivel kombëtar. Kur ndodh kjo, përdor DWA/DVGW/DIN (praktika gjermane, më e plota në BE)
   dhe thuaje hapur. Rregulli vendor (komuna, kompania rajonale e ujësjellësit, AME për
   zjarrin) ka përparësi kur është më i rreptë.
3. **Graviteti para pompimit.** Pompo vetëm kur krahasimi i kostos (gërmim i thellë kundrejt
   stacionit dhe mirëmbajtjes së tij për 30 vjet) e justifikon.
4. **Sa më cekët, aq më mirë.** Thellësia e kanalizimit përcaktohet nga kyçja kritike me
   gravitet dhe nga mbulesa minimale, jo nga "zakoni". Bodrumet nuk e thellojnë gjithë rrjetin.
5. **Sistem ndarës.** Në lagje të reja ujërat e zeza dhe ato të shiut shkojnë në rrjete të
   ndara. Uji i çative nuk futet kurrë në kanalin fekal.
6. **Verifiko me normën origjinale.** Normat EN janë me pagesë. Tabelat në `references/`
   janë mbledhur nga literatura dhe janë shënuar sipas besueshmërisë. Para dorëzimit
   krahasoji me botimin zyrtar që ka projektuesi.

## Rrjedha e punës (8 faza)

Ndiqi fazat me radhë. Në krye të çdo faze lexo referencën përkatëse.

| Faza | Çfarë bëhet | Referenca | Komandat e skriptës |
|---|---|---|---|
| 1 | Të dhënat hyrëse dhe analiza e terenit | `01-analiza-e-terenit-dhe-trasete.md` | – |
| 2 | Trasetë dhe prerjet tip të rrugëve | `01-analiza-e-terenit-dhe-trasete.md` | `neighborhood` |
| 3 | Ujësjellësi i jashtëm, hidrantët, valvulat, rezervari | `02-ujesjellesi-jashte.md` | `demand`, `reservoir`, `pipe` |
| 4 | Kanalizimi fekal me gravitet | `03-kanalizimi-fekal-jashte.md` | `demand`, `sewer` |
| 5 | Atmosferiku me gravitet | `04-atmosferiku-jashte.md` | `storm`, `sewer --type atmosferik` |
| 6 | Kyçjet dhe pusetat në oborr | `05-lidhjet-dhe-pusetat-ne-oborr.md` | – |
| 7 | Instalimet brenda shtëpisë | `06-instalimet-brenda-shtepise.md` | `water-in`, `dhw`, `drain-in`, `roof`, `house` |
| 8 | Sasitë, vizatimet, relacioni teknik | këtu poshtë + `07-shembull-lagje-300-shtepi.md` | `neighborhood`, `house` |

### Faza 1: të dhënat dhe terreni
Kërko ose supozo, dhe shëno si supozim çdo gjë që mungon:
- Topografi 1:500 ose 1:1000 me izohipsa çdo 0.5 m, kufijtë e parcelave dhe kuotat e rrugëve.
- Gjeoteknikë: kategoria e dheut, shkëmbi, niveli i ujit nëntokësor, përshkueshmëria
  (k_f, për infiltrim).
- Pikat e kyçjes: tubi ekzistues i ujit (DN, presioni statik/dinamik, kapaciteti), kanali
  fekal i qytetit (kuota e fundit, kapaciteti), recipienti i atmosferikut (përroi/lumi,
  prurja e lejuar, niveli i ujërave të larta).
- Plani rregullues: numri i shtëpive, madhësia e parcelave, P+1/P+2, bodrumet, rrugët.
Analiza e terenit përcakton: pellgjet ujëmbledhëse, pikat e ulëta, drejtimin e rrjedhjes,
parcelat që janë më poshtë se rruga (rrezik për kyçjen me gravitet) dhe vendin e daljes.
**Niveleta e rrugëve projektohet bashkë me kanalizimin**: kanali ndjek pjerrësinë e rrugës.

### Faza 2: trasetë në rrugë (rregulla default)
- **Fekali: në aksin e rrugës** (ose në mes të një korsie). Kyçjet nga të dy anët dalin të
  barabarta, kanali mbetet larg themeleve dhe ujit. Rrugë > 15–20 m ose me ndarës: dy kolektorë, një në çdo anë.
- **Atmosferiku: paralel me fekalin**, 1.0–1.5 m larg tij në të pastër (ose në korsinë tjetër), më i cekët se fekali kur kryqëzohen kyçjet.
- **Ujësjellësi: në trotuar**, rreth 1.0 m nga kufiri i parcelës. Mbi kanalet, me ndarje
  horizontale ≥ 1.0 m në të pastër (e rekomanduar 1.5 m ose më shumë) dhe ≥ 0.3–0.5 m në
  kryqëzim, **uji gjithmonë sipër**. Karrexhatë > 8–10 m ose trafik i rëndë: dy tuba, një në secilin trotuar.
- Kabllot, gazi dhe telekomi zënë zonat e tyre sipas DIN 1998 (zakonisht trotuari tjetër).
Detajet, prerjet tip dhe mbulesat minimale: `01-analiza-e-terenit-dhe-trasete.md`.

### Faza 3: ujësjellësi
`demand` jep Q mesatar, max ditor, max orar dhe rastin e zjarrit. Rrjeti dimensionohet për
**max(Q max orar, Q max ditor + zjarri)** dhe kontrollohet presioni te shtëpia më e lartë
(në orën e pikut) dhe te hidranti më i pafavorshëm (në rastin e zjarrit).
Rregullat e arta:
- Rrjet **unazor**. Degët qorre kanë hidrant ose shkarkues shpëlarjeje në fund.
- DN minimal me hidrantë: DN 100 (PE100 OD 110/125).
- **Hidranti nuk vendoset kurrë në karrexhatë.** Vendoset në trotuar ose në brezin e gjelbër,
  0.5–1.0 m nga bordura, ≥ 5 m nga fasada (jashtë zonës së shembjes), mundësisht te
  kryqëzimet, i lidhur me degë DN 80/100 **me valvul të vetën**. Distanca ≤ 80 m (rregullorja e rajonit; DVGW: 100–150 m).
  Mbitokësor (EN 14384) aty ku ka hapësirë; nëntokësor (EN 14339) vetëm aty ku nuk ka.
- Valvula (EN 1074-2): në çdo nyje T/kryq në të gjitha degët, seksione që ndalin ≤ ~50 shtëpi,
  ajrosëse (EN 1074-4) në pikat e larta, shkarkues/hidrant në pikat e ulëta.
- Presioni te kyçja: ≥ 2.00 bar (P+0), ≥ 2.35 bar (P+1), +0.35 bar për çdo kat (DVGW W 400-1).
  Statik > 6 bar: zona presioni ose PRV. Zjarri: ≥ 1.5 bar kudo (DVGW W 405). Rregullorja e rajonit kërkon ≥ 2.5 bar te hidranti.
- **Rezervari** duhet kur burimi/kyçja jep më pak se Q max orar + zjarri, ose kur presioni
  nuk është i qëndrueshëm. Vëllimi = balancimi (20–30 % e Q max ditor) + zjarri + emergjenca
  (`reservoir`). Kuota: shtëpia më e lartë + presioni i kërkuar + humbjet.

### Faza 4: kanalizimi fekal
`demand` jep prurjen e pikut (Harmon) dhe `sewer` zgjedh DN-në me Prandtl-Colebrook
(kb = 0.75 mm, DWA-A 110) duke kontrolluar h/D, shpejtësinë dhe sforcimin tangjencial.
- DN min 200 (PVC SN8 OD 200; OD 250 kur e kërkon kompania). Kyçja e shtëpisë DN 150 me 1.5–3 %.
- Pjerrësia minimale ≈ 1/DN (DN 200 → 0.5 %); v ≥ 0.6 m/s në prurjen e projektit kur
  është e mundur; v_max ≈ 5 m/s për plastikë (3 m/s për beton), përndryshe **pusetë me kaskadë**.
- Puseta **në çdo** ndryshim drejtimi, pjerrësie, diametri, në çdo bashkim dhe në krye të
  degës; në drejtim të drejtë çdo 40–60 m (deri 80–100 m vetëm me pastrim hidrodinamik
  dhe kamerë, sipas rregullit të kompanisë).
- **Puseta sa më të cekëta:** thellësia e pusetës së kokës = mbulesa minimale (≥ 1.0 m mbi
  kurorë në rrugë) + DN, ose sa kërkon kyçja kritike, cilado që është më e madhe; pastaj kanali ndjek terrenin.
  Llogaritja: `03-kanalizimi-fekal-jashte.md` § "Strategjia e pusetave të cekëta".
- Bodrumet dhe objektet nën nivelin e kthimit (kuota e kapakut të pusetës në rrugë):
  stacion ngritës (EN 12056-4) ose valvul kundër kthimit (EN 13564) për atë shtëpi.

### Faza 5: atmosferiku
`storm` përdor metodën racionale Q = ψ·r(D,T)·A me IDF lokale (`--idf a,b,c`) ose, në
mungesë, formulën e Reinhold me r15,1 të deklaruar si SUPOZIM (default 150 l/(s·ha), duhet
konfirmuar me IHMK ose me studimin hidrologjik).
- Frekuencat (EN 752): zonë banimi **T = 2 vjet pa mbingarkesë** në projektim dhe
  **1 herë në 20 vjet** për kontrollin e përmbytjes (qendër qyteti 5/30, zona rurale 1/10).
- Gjithmonë me gravitet. DN min 300. Grila çdo 20–40 m në secilën anë, te pikat e ulëta,
  para vendkalimeve dhe kryqëzimeve (EN 124: C250 te bordura, D400 në karrexhatë).
- Ulja e prurjes në burim (infiltrim/retencion në parcelë, EN 16941-1, DWA-A 138) e zvogëlon
  kolektorin me 1–2 DN. Llogarite gjithmonë si variant (shih shembullin 07).
- Para derdhjes në përrua: retencion nëse prurja e lejuar është e kufizuar (`storm --outflow`),
  ndarës vaji (EN 858) për rrugë me trafik, dalje me mbrojtje nga erozioni dhe me klapë.

### Faza 6: kyçjet dhe pusetat në oborr
- Puseta e revizionit (fekal) **brenda parcelës, 1–2 m pas kufirit**, ≤ 15 m nga kanali
  publik, ≥ 1–1.5 m nga themeli, në anën e rrugës dhe në pikën më të ulët të oborrit,
  jashtë hyrjes së makinave (ose me kapak B125). PP/PVC DN 400–600, sa më e cekët (0.8–1.2 m).
- Puseta atmosferike e veçantë, ose infiltrim/rezervuar shiu me tejderdhje në rrjetin publik.
- Ujëmatësi në pusetë ujëmatësi 1–2 m brenda kufirit: valvul, filtër, ujëmatës, **valvul
  kthimi EA (EN 1717)**, valvul me shkarkim, PRV kur presioni > 5–6 bar.
Detajet dhe kotat: `05-lidhjet-dhe-pusetat-ne-oborr.md`.

### Faza 7: brenda shtëpisë
- Uji: LU sipas EN 806-3 dhe prurja e pikut Vs sipas DIN 1988-300 (`water-in`); v ≤ 2 m/s;
  buxheti i presionit te pajisja kritike ≥ 1.0 bar.
- Uji i ngrohtë: bojleri ≥ 60 °C, kthimi i qarkullimit ≥ 55 °C, i ftohti ≤ 25 °C; pa
  qarkullim vetëm kur vëllimi i tubit të ngrohtë deri te rubineti ≤ 3 l (`dhw --pipes`);
  përzierës termostatik, grup sigurie EN 1487, enë ekspansioni.
- Shkarkimi: EN 12056-2 Sistemi I, DU dhe Qww = K·√ΣDU (`drain-in`); vertikalja me WC DN 100
  me ventilim mbi çati; revizion në bazën e çdo vertikaleje dhe çdo ≤ 20 m.
- Çatia: EN 12056-3 (`roof`); ulluqet me pjerrësi 3–5 mm/m; tubat vertikalë deri te
  puseta atmosferike ose infiltrimi, jo në fekal.
- Gjatësitë paraprake: `house`.

### Faza 8: dorëzimi
Çdo projekt del me këtë strukturë (në shqip):
1. **Relacioni teknik**: të dhënat hyrëse, supozimet, kriteret (tabela me normat), përshkrimi i zgjidhjeve.
2. **Llogaritjet**: tabelat e skriptës për kërkesën, rezervarin, çdo segment kryesor të
   ujit (Q, DN, v, J, presioni), çdo segment kanali (Q, DN, i, h/D, v, kotat, thellësitë),
   atmosferikun (A, ψ, tc, r, Q, DN) dhe instalimet e shtëpisë tip.
3. **Vizatimet**: situacioni 1:1000/1:500 me të tri rrjetet; profilet gjatësore 1:1000/1:100
   me kotat e terrenit, të fundit të kanalit, thellësitë, pusetat dhe kryqëzimet; prerjet
   tip të rrugës; detajet (puseta, hidrant, valvul, kyçje, pusetë ujëmatësi, grilë);
   skemat izometrike të shtëpisë tip.
4. **Paramasa (BoQ)**: gropa (m³, sipas EN 1610), gypat sipas DN (m), pusetat sipas
   thellësisë, kapakët sipas klasës EN 124, hidrantët, valvulat, kyçjet, rikthimi i asfaltit;
   plus paramasa e shtëpisë tip × numri i shtëpive.
5. **Lista e kontrollit** (më poshtë) e plotësuar.

## Skripta e llogaritjeve

`scripts/hidro_calc.py` punon vetëm me Python 3 standard. Çdo komandë printon rezultatet dhe
supozimet, `--json` jep të njëjtat të dhëna për tabelat. Shembuj:

```bash
S=.claude/skills/hidroinstalime/scripts/hidro_calc.py   # ose ~/.claude/skills/...
python3 $S demand --houses 300 --persons 5 --q 150 --area-ha 16.4
python3 $S reservoir --qmaxday 371.2 --qmaxhour 8.59 --source-ls 6 --z-highest 616 --z-lowest 598 --level-min 650
python3 $S pipe --q 17.6 --length 600 --min-nom 110 --h-start 38 --k 0.1 --p-min 3.4
python3 $S sewer --q 1.65 --slope 1.0                         # fekal, PVC SN8
python3 $S sewer --slope 0.5 --table                           # kapacitetet e të gjitha DN
python3 $S storm --surface cati:0.75:0.95 --surface rruge:0.375:0.9 --surface gjelber:1.0:0.15 --length 375
python3 $S sewer --q 358 --slope 1.0 --type atmosferik --series id
python3 $S water-in --fixtures "lavaman=2,wc=2,dush=1,vaske=1,kuzhine=1,enelarese=1,lavatrice=1" --p-avail 3.5
python3 $S dhw --persons 5 --pipes "20x2:8,16x2:4"
python3 $S drain-in --fixtures "lavaman=2,wc=2,dush=1,vaske=1,kuzhine=1,lavatrice=1,sifon50=2"
python3 $S roof --area 150
python3 $S neighborhood --houses 300 --frontage 15 --collector 450
python3 $S house --length 12 --width 10 --floors 2 --baths 2
```

Për çdo projekt: ndrysho parametrat me të dhënat reale, printoji tabelat në raport dhe
shëno si "SUPOZIM" çdo vlerë default që nuk u konfirmua.

## Parametrat default (Kosova)

| Parametri | Default | Burimi / shënim |
|---|---|---|
| Banorë për shtëpi | 5 | SUPOZIM (census); ndryshoje sipas planit |
| Konsumi specifik | 150 l/banor/ditë | praktikë rajonale 120–200 |
| Humbjet në rrjet të ri | 10 % | rrjetet ekzistuese në Kosovë kanë shumë më tepër |
| k_d / k_h | 1.5 / 2.0 | lagje 1 000–5 000 banorë |
| Zjarri | 48 m³/h (13.3 l/s) × 2 h | DVGW W 405, shtëpi individuale; 96 m³/h për ndërtim më të dendur |
| Hidrantët | ≤ 80 m, ≥ 5 m nga objekti, ≥ 2.5 bar | rregullorja e ish-Jugosllavisë (Sl. list SFRJ 30/1991), ende referencë në rajon; konfirmo me AME/komunën |
| Mbulesa e tubit të ujit | 1.0–1.2 m (min 0.8 m) | thellësia e ngrirjes 0.8–1.0 m; më shumë në zona malore |
| Mbulesa e kanalit në rrugë | ≥ 1.0 m mbi kurorë | ngarkesa e trafikut + ngrirja; më pak kërkon mbrojtje |
| Kthimi i ujit në kanal | 85 % | 80–90 % |
| Infiltrimi | 0.05 l/(s·ha) (rrjet i ri, i testuar) | 0.1–0.15 për rrjete më të vjetra |
| Shiu | IDF nga IHMK; përndryshe Reinhold r15,1 = 150 l/(s·ha) | **SUPOZIM**, duhet konfirmuar |
| Rrashtësia kb | 0.75 mm kanalet, 0.4 mm shpërndarja e ujit, 0.1 mm transmetimi | DWA-A 110, DVGW |

## Lista e kontrollit (përdore në fund të çdo projekti)

- [ ] Të gjitha supozimet janë të listuara dhe të shënuara.
- [ ] Rrjeti i ujit është unazor, DN ≥ 100 me hidrantë, presioni kontrolluar në pik dhe në zjarr.
- [ ] Asnjë hidrant në karrexhatë. Çdo hidrant ka valvulën e vet, ndodhet ≥ 5 m nga fasada dhe ≤ 80 m nga tjetri.
- [ ] Valvula në çdo nyje, ajrosëse në pikat e larta, shkarkues në pikat e ulëta.
- [ ] Nevoja për rezervar u vlerësua (po/jo me arsyetim), vëllimi dhe kuota janë llogaritur.
- [ ] Uji mbi kanalet, me ndarje ≥ 1.0 m horizontalisht dhe ≥ 0.3–0.5 m në kryqëzim.
- [ ] Fekali dhe atmosferiku janë të ndarë. Çatitë nuk derdhen në fekal.
- [ ] Çdo kanal: DN ≥ min, i ≥ min, h/D brenda kufirit, v kontrolluar (min/max), kaskada ku duhet.
- [ ] Puseta në çdo ndryshim, distancat brenda kufirit; thellësitë minimale të arsyetuara.
- [ ] Kyçja kritike (shtëpia më e ulët ose më e largët) del me gravitet; bodrumet kanë zgjidhje më vete.
- [ ] Atmosferiku: T sipas EN 752, tc dhe IDF të dokumentuara, varianti me retencion/infiltrim i llogaritur.
- [ ] Kapakët sipas klasës EN 124 për vendndodhjen.
- [ ] Brenda: Vs dhe DN sipas EN 806/DIN 1988-300, buxheti i presionit, EA pas ujëmatësit, 60/55 °C dhe rregulla e 3 l.
- [ ] Shkarkimi: DU/Qww, vertikalet DN 100 me ventilim, revizione, kyçja në pusetën e oborrit.
- [ ] Ulluqet dhe tubat vertikalë janë llogaritur dhe shkojnë në atmosferik ose infiltrim.
- [ ] Paramasa përfshin rrjetin, kyçjet, pusetat e oborrit dhe shtëpinë tip × N.

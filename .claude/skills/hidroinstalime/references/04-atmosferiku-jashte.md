# 04. Atmosferiku i jashtëm me gravitet

## 1. Parimet
1. **Gjithmonë me gravitet** deri te recipienti ose te basenti i retencionit.
2. **Hierarkia e menaxhimit të shiut** (drejtimi i BE-së, Direktiva 2024/3019 dhe DWA-A 102):
   infiltro në parcelë → mbaj/ripërdor (EN 16941-1) → vonoje (retencion) → shkarkoje ngadalë në
   rrjet/recipient. Çdo m² që nuk derdhet në rrjet e zvogëlon kolektorin.
3. Rruga është kanali i dytë: për shiun e jashtëzakonshëm (T = 20–30 vjet) uji duhet të rrjedhë
   mbi rrugë drejt pikës së daljes pa hyrë në shtëpi (bordura 12–15 cm, ±0.00 e shtëpive ≥ rruga + 0.30 m).

## 2. Kriteret e projektimit (EN 752) [N]
| Vendi | Shiu i projektimit (pa mbingarkesë) | Frekuenca e lejuar e përmbytjes |
|---|---|---|
| Zona rurale | 1 në 1 vit | 1 në 10 vjet |
| **Zona banimi** | **1 në 2 vjet** | **1 në 20 vjet** |
| Qendra qytetesh, zona industriale/tregtare | 1 në 5 vjet | 1 në 30 vjet |
| Nënkalime, hekurudha nëntokësore | 1 në 10 vjet | 1 në 50 vjet |
EN 752:2017 i ka kaluar këto në aneks informativ; rregulli vendor/kompania mund të kërkojë më shumë.
Brenda parcelës, DIN 1986-100 kërkon kontroll të përmbytjes me T = 30 vjet për parcela të mëdha të papërshkueshme [V].

## 3. Intensiteti i shiut
**Me radhë preference:** (1) kurba IDF e stacionit më të afërt nga IHMK (Kosovë) ose IGEWE
(Shqipëri), në trajtën r = a/(t+b)^c, `storm --idf a,b,c`; (2) IDF nga studimi hidrologjik i
komunës ose i një projekti të afërt; (3) **Reinhold** me r15,1 të deklaruar si SUPOZIM:
```
r(D,T) = r15,1 × 38/(D + 9) × (n^(−0.25) − 0.369),   n = 1/T     [l/(s·ha)], D ≥ 5 min
```
Me r15,1 = 150 l/(s·ha) (default, SUPOZIM për Kosovën; vlerat reale mund të jenë 120–200):

| D (min) | T=1 | T=2 | T=5 | T=10 | T=20 | T=30 |
|---|---|---|---|---|---|---|
| 5 | 257 | 334 | 459 | 574 | 711 | 803 |
| 10 | 189 | 246 | 338 | 423 | 524 | 591 |
| 15 | 150 | 195 | 268 | 335 | 415 | 468 |
| 20 | 124 | 161 | 221 | 277 | 343 | 387 |
| 30 | 92 | 120 | 165 | 206 | 255 | 288 |
| 60 | 52 | 68 | 93 | 116 | 144 | 163 |

## 4. Metoda racionale (`hidro_calc.py storm`)
```
Q = ψ_m × r(t_c, T) × A          [l/s]  (A në ha)
ψ_m = Σ(ψ_i × A_i) / ΣA_i
t_c = t_hyrjes + Σ L_i / v_i     t_hyrjes = 5 min (zonë e dendur) – 10 min (e rrallë); t_c ≥ 5 min
```
Vlen për pellgje deri ~200 ha dhe rrjete pa retencion të brendshëm. Për pellgje më të mëdha ose
me basene: simulim hidrodinamik (p.sh. EPA SWMM, falas).

### Koeficientët e rrjedhjes ψ [P; dy rreshtat e shtruar V nga DIN 1986-100]
| Sipërfaqja | ψ |
|---|---|
| Çati me pjerrësi (tjegull, llamarinë) | 0.90–1.00 |
| Çati e sheshtë me zhavorr | 0.70–0.80 |
| Çati e gjelbër ekstensive / intensive | 0.40–0.50 / 0.20–0.30 |
| Asfalt, beton | 0.85–0.95 |
| Kalldrëm me fuga të mbushura | 0.75–0.85 |
| Kalldrëm me fuga të hapura (> 15 %), zhavorr i ngjeshur | 0.60–0.70 |
| Zhavorr i lirë | 0.30–0.50 |
| Pllaka bari (rasengitter) | 0.15–0.25 |
| Oborr i gjelbër, kopsht (i sheshtë / i pjerrët) | 0.10–0.20 / 0.20–0.30 |
Për lagje me shtëpi individuale ψ_m del zakonisht 0.45–0.60 kur çatitë lidhen në rrjet dhe
0.25–0.35 kur çatitë infiltrohen në parcelë (shih shembullin 07).

## 5. Dimensionimi i kolektorëve (`sewer --type atmosferik --series id`)
- Q_projekt ≤ 0.9 × Q_plotë (pa mbingarkesë në T e projektimit); kb = 0.75 mm.
- DN minimal 300; lidhjet e grilave DN 150–160 me ≥ 2 %.
- Shpejtësia 0.7–5 m/s (plastikë), ≤ 3 m/s beton; pjerrësi të mëdha → puseta me kaskadë (03 § 4.2).
- Pusetat njësoj si te fekali (03 § 5), me distancë default 60 m.
- Kontrolli i përmbytjes (T = 20 vjet): kapaciteti i kolektorit + rrjedhja në rrugë; asnjë shtëpi
  nuk duhet të marrë ujë. Shëno rrugën e rrjedhjes sipërfaqësore në plan.

## 6. Grilat e rrugës (pusetat e shiut)
- Distanca [P]: 20–30 m në rrugë me pjerrësi < 1 %, 30–40 m në 1–4 %, 20–25 m në > 4 % (uji rrjedh
  shpejt dhe e kalon grilën); **në secilën anë** kur rruga ka pjerrësi tërthore nga të dy anët.
- Sipërfaqja e shërbyer: 200–400 m² rrugë/trotuar për grilë [P].
- Gjithmonë: në çdo pikë të ulët (dyfishe), para vendkalimeve të këmbësorëve, para kryqëzimeve
  (në rrjedhën e sipërme), para hyrjeve të urave.
- Grila 300×500 ose 400×400 në bordurë, klasa C250 (D400 kur është në karrexhatë), me kovë për
  rërën; lidhja DN 160 me kolektorin ose me pusetën më të afërt.
- Rrugë pa bordurë: kanal i hapur ose kanal linear me grilë (EN 1433).

## 7. Menaxhimi në parcelë (ulja e prurjes)
| Masa | Kushti | Efekti tipik |
|---|---|---|
| Pus/kanal infiltrimi (DWA-A 138) | k_f = 1·10⁻³ … 1·10⁻⁶ m/s; fundi ≥ 1 m mbi ujin nëntokësor; ≥ 1.5 × thellësia e bodrumit larg objekteve pa hidroizolim | çatia nuk derdhet në rrjet deri në T = 5 vjet |
| Rezervuar uji shiu (EN 16941-1) | ujitje, WC, lavatriçe (me rrjet të ndarë dhe shenjë "jo i pijshëm") | 3–6 m³ për shtëpi; ul pikun dhe konsumin |
| Kalldrëm i përshkueshëm | oborre, parkime | ψ nga 0.8 në 0.3–0.5 |
| Çati e gjelbër | çati të sheshta | ψ 0.3–0.5 |
Vëllimi i përafërt i një pusi infiltrimi (shembull i thjeshtuar, T = 5 vjet):
```
V = max_D [ (r(D,T) × A_u / 10 000 − k_f/2 × A_s × 1000) × D × 60 / 1000 ] × f_Z    [m³]
A_u në m², A_s = fundi + gjysma e anëve [m²], f_Z = 1.2; vëllimi bruto = V / porozitet
(zhavorr 0.35, kuti plastike 0.95)
```
Tejderdhja e pusit të infiltrimit lidhet me atmosferikun publik (me pusetë) ose me sipërfaqe
të gjelbër; kompania vendos nëse lejohet.

## 8. Retencioni dhe dalja në recipient
- Prurja e lejuar në përrua: nga leja ujore (shpesh 10–20 l/(s·ha) ose prurja natyrore para
  urbanizimit). Vëllimi: `storm --outflow Q_lejuar --T-ret 5` (bilanc i thjeshtuar, f_Z = 1.2);
  për projektin final: simulim me seri shirash.
- Basen i hapur (i gjelbër, me pjerrësi 1:3, me kanal të ulët) ose rezervuar i nëntokësor;
  rregullator prurjeje (vorteks, grykë), tejderdhje emergjente për T = 100 vjet.
- Ndarës vaji (EN 858) para derdhjes kur ka parkime/rrugë me trafik; ndarës rëre para basenit.
- Dalja: kokë betoni me krahë, mbrojtje nga erozioni (gurë), klapë kundër kthimit mbi nivelin
  e ujërave të mesme, kuota e daljes mbi nivelin e ujërave të larta kur është e mundur.

## 9. Rezultatet që dorëzohen
- Harta e nënpellgjeve me A, ψ dhe t_c për çdo nyje.
- Tabela e segmenteve: A kumulative, A_u, t_c, r, Q, DN, i, Q_plotë, v, kotat.
- Varianti me masa në parcelë (krahasimi i DN-ve dhe i kostos).
- Grilat (numri, pozita), basenti i retencionit, dalja dhe detajet.

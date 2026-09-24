# 01. Analiza e terenit dhe trasetë e rrjeteve

## 1. Të dhënat hyrëse (lista e kërkesave)
| Të dhëna | Detaji | Pse duhet |
|---|---|---|
| Topografia | 1:500 ose 1:1000, izohipsa çdo 0.5 m, kuotat e rrugëve dhe të parcelave | pjerrësitë, pellgjet, profilet gjatësore |
| Gjeoteknika | kategoria e dheut, shkëmbi, uji nëntokësor, k_f | kostoja e gërmimit, mbështetja e gropës, infiltrimi |
| Rrjetet ekzistuese | uji (DN, presioni, kapaciteti), kanali (kuota, kapaciteti), rryma, gazi, telekomi | pikat e kyçjes, kryqëzimet |
| Recipienti | përroi/lumi, prurja e lejuar, niveli i ujërave të larta, zona e përmbytjes | dalja e atmosferikut, retencioni |
| Plani rregullues | parcelat, P+n, bodrumet, gjerësia e rrugëve, objektet publike | kërkesa, zjarri, prerjet tip |
| Klima | IDF (IHMK), thellësia e ngrirjes | atmosferiku, mbulesat |

## 2. Analiza e terenit: hapat
1. **Harta e pjerrësive** nga izohipsat: zonat < 0.5 % (të sheshta, problem për gravitetin),
   0.5–5 % (ideale), > 5–8 % (duhen kaskada).
2. **Pellgjet ujëmbledhëse** dhe vijat natyrore të rrjedhjes: çdo pellg ka pikën e vet të
   daljes. Rrjeti fekal dhe atmosferik ndiqin pellgjet; mos kalo vijën ujëndarëse me gravitet.
3. **Pikat e ulëta**: aty shkojnë kolektorët kryesorë, grilat dhe shkarkuesit e ujësjellësit;
   pikat e larta marrin ajrosëset e ujësjellësit dhe, mundësisht, rezervarin.
4. **Parcelat nën nivelin e rrugës**: shëno çdo parcelë ku kuota e oborrit është më poshtë se
   kuota e rrugës para saj. Opsionet, sipas radhës:
   a) ngre niveletën e oborrit/shtëpisë (kuota ±0.00 e shtëpisë ≥ rruga + 0.30 m);
   b) kanal në pjesën e pasme të parcelave (servitut), aty ku terreni bie në atë anë;
   c) stacion ngritës i vogël për atë shtëpi (EN 12056-4) dhe valvul kundër kthimit.
5. **Uji nëntokësor dhe shkëmbi**: aty ku janë afër sipërfaqes, rrjeti mbahet sa më i cekët
   dhe llogaritet kostoja e thellimit kundrejt pompimit.
6. **Pompim apo gravitet?** Thellësia e kanalit mbi 4–5 m, ose një kodër midis lagjes dhe
   daljes, e bën pompimin kandidat. Krahaso: gërmimi shtesë (m³ × çmimi + mbështetja e gropës)
   kundrejt stacionit (ndërtimi + energjia + mirëmbajtja për 30 vjet). Gravitet kur diferenca
   nuk është e qartë [P].

## 3. Niveleta e rrugëve dhe kanalizimi
- Kanalet ndjekin pjerrësinë e rrugës: projektoji në të njëjtin profil gjatësor.
- Pjerrësia minimale e rrugës 0.5 % (rrjedhja në bordurë drejt grilave); në rrugë të sheshta
  bëj profil "sharrë" me pika të ulëta çdo 40–60 m, aty grila.
- Kryqëzimet: kuota e rrugës dytësore lidhet me atë kryesore pa krijuar pellg.

## 4. Pozita e rrjeteve në prerjen e rrugës
Parimi (DIN 1998 [V]): **kanalet në karrexhatë, rrjetet furnizuese në trotuar**.

**Rrugë banimi 10 m (6.0 m karrexhatë + 2 × 2.0 m trotuar):**
```
 kufiri i         trotuari A        karrexhata 6.0 m         trotuari B        kufiri i
 parcelës  |<----- 2.0 m ----->|<--------------------------->|<----- 2.0 m ----->| parcelës
           | W (uji)  E (rryma)|  S (atm.)   F (fekal, aks)   |  T (telekom) G (gaz)|
           |  1.0 m nga kufiri |  1.5 m        0.0 m          |                    |
   mbulesa:  W 1.0–1.2 m        S ≥ 1.0 m mbi kurorë          kabllot 0.6–0.8 m
                                F thellësia sipas kyçjeve (zakonisht 1.3–2.0 m në fund)
 Hidranti: në trotuarin A, 0.5–1.0 m nga bordura, me degë DN 80/100 dhe valvul.
```

**Rrugë 12–14 m ose me trafik më të rëndë:** njësoj, por me dy tuba uji (një në secilin trotuar)
që të mos kryqëzohet karrexhata nga çdo kyçje.

**Rrugë > 15–20 m ose me ndarës:** dy kolektorë fekalë (një në secilën anë të karrexhatës)
dhe dy atmosferikë; kyçjet nuk kalojnë kurrë gjithë rrugën.

**Rrugë e ngushtë e përbashkët 6–8 m (pa trotuar):** fekali në aks, atmosferiku 1.0 m anash
(ose kanal i përbashkët në të njëjtën gropë me shkallë), uji 1.0 m nga kufiri në anën tjetër.

### Pse fekali në aks?
- Kyçjet nga të dyja anët kanë gjatësi të barabartë dhe më të shkurtër mesatarisht.
- Kanali ndodhet larg themeleve (gërmimi nuk dobëson mbështetjen e mureve rrethuese dhe të objekteve).
- Largësia nga uji në trotuar del ≥ 2.5–3 m pa ndonjë përpjekje.
- Pusetat në aks janë larg rrotave (më pak goditje në kapak) kur korsitë janë 3 m.

### Ndarjet minimale (në të pastër)
| Midis | Horizontalisht | Vertikalisht (kryqëzim) | Burimi |
|---|---|---|---|
| Uji – kanali (fekal/atm.) | ≥ 1.0 m (rekomandohet ≥ 1.5 m; 3 m në praktikën e Amerikës së Veriut) | ≥ 0.3–0.5 m, uji sipër | [P], [V] për 3 m / 0.45 m |
| Uji – kabllo elektrike | ≥ 0.4 m | ≥ 0.2–0.3 m | [P] |
| Uji – gazi | ≥ 0.4 m | ≥ 0.2 m | [P] |
| Kanali – themeli i objektit | jashtë vijës 45° nga themeli; zakonisht ≥ 1.5 m | – | [P] |
| Çdo gyp – trung pemësh | ≥ 2.5 m (ose mbrojtje nga rrënjët) | – | [P] |
Kur uji duhet të kalojë poshtë kanalit: tub mbrojtës (këmishë) 3 m në secilën anë, ose kanal
me gyp presioni në atë segment.

## 5. Mbulesat minimale dhe thellësitë
| Rrjeti | Mbulesa minimale mbi kurorë | Shënim |
|---|---|---|
| Uji (Kosovë) | 1.0–1.2 m (min 0.8 m) | ngrirja 0.8–1.0 m; zona malore 1.2–1.5 m [P] |
| Kyçja e ujit | 1.0 m | e njëjta mbrojtje nga ngrirja |
| Kanali në karrexhatë | ≥ 1.0 m | nën këtë: SN16, gyp duktil ose pllakë betoni mbrojtëse [P] |
| Kanali në gjelbërim/trotuar | ≥ 0.8 m | [P] |
| Puseta e oborrit | 0.6–0.8 m mbi gypin | i ngrohtë nga shtëpia; shih 05 [P] |

## 6. Gropa dhe shtrati (EN 1610) [N]
Gjerësia minimale e gropës sipas DN (vlera më e madhe nga dy tabelat):

| DN | Gjerësia min. (OD + x) |
|---|---|
| ≤ 225 | OD + 0.40 m |
| 225–350 | OD + 0.50 m |
| 350–700 | OD + 0.70 m |
| 700–1200 | OD + 0.85 m |
| > 1200 | OD + 1.00 m |

| Thellësia e gropës | Gjerësia min. |
|---|---|
| < 1.00 m | pa minimum |
| 1.00–1.75 m | 0.80 m |
| 1.75–4.00 m | 0.90 m |
| > 4.00 m | 1.00 m |

- Shtrati: ≥ 100 mm (≥ 150 mm në shkëmb), material granular 0–16/0–22 mm.
- Zona e gypit: e mbushur dhe e ngjeshur me dorë në shtresa deri ≥ 150 mm mbi kurorë;
  mekanikisht vetëm pasi ka ≥ 300 mm mbi gyp. Ngjeshja ≥ 95–97 % Proctor nën rrugë [P].
- Mbështetja e gropës: e detyrueshme mbi 1.25 m thellësi (ose pjerrësi e sigurt e skarpatës).
- Shiriti paralajmërues 0.3–0.5 m mbi gyp (blu për ujin), tel gjurmues për PE.
- Testet: kanalet me ajër (L) ose ujë (W) sipas EN 1610 dhe inspektim me kamerë (EN 13508-2);
  uji me provë presioni sipas EN 805 (STP zakonisht min(MDP × 1.5; MDP + 5 bar)) dhe dezinfektim.

## 7. Rezultati i fazës
- Situacioni me pellgjet, drejtimin e rrjedhjes, daljet dhe trasetë e tre rrjeteve.
- Lista e parcelave problematike (nën rrugë, me bodrum) me zgjidhjen për secilën.
- Prerjet tip për çdo kategori rruge me pozitat dhe mbulesat.
- Vendimi për pompim/gravitet për çdo pellg, me arsyetim.

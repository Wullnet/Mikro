# Traffic Rush — Lista e publikimit (v0.1.0)

Hap pas hapi nga llogaritë deri te publikimi në **App Store** dhe **Google Play**.
Skedarët e tjerë në këtë folder:
[`listing-sq.md`](listing-sq.md) · [`listing-en.md`](listing-en.md) · [`data-safety.md`](data-safety.md) ·
[`privacy-policy.html`](privacy-policy.html) · `feature-graphic.png` · `play-icon-512.png` ·
`generate_art.py` (rigjeneron ikonat) · `check_limits.py` (kontrollon limitet e tekstit).

---

## 0. Para se të fillosh (kodi)
- [ ] **Unity:** përditëso në patch-in më të ri të **Unity 6000.0 LTS**. Projekti është në 6000.0.23f1; Google Play
      kërkon mbështetje për **16 KB page size** (Android 15+), e cila vjen me Unity **6000.0.38f1 ose më të ri**.
- [ ] **Target API (Android):** Player Settings → Android → *Target API Level* = **Automatic (highest installed)**, dhe
      kontrollo që është ≥ niveli që kërkon Google për aplikacione të reja (2025: API 35; kontrollo kërkesën e 2026).
- [ ] **AdMob:** zëvendëso ID-të TEST me ID-të reale (shih [`../MONETIZATION.md`](../MONETIZATION.md)) dhe aktivizo
      `ADMOB_ENABLED;UNITY_IAP_ENABLED` te Scripting Define Symbols.
- [ ] **Pëlqimi (GDPR):** shto Google **UMP** para inicializimit të reklamave + opsion "Privatësia" në menu
      (politika e privatësisë e përmend këtë opsion).
- [ ] **Blerjet:** shto butonin **"Rikthe blerjet"** (Apple e kërkon për "Hiq reklamat") → `IAPService.RestorePurchases`.
- [ ] Shto në menu një lidhje për **Politikën e privatësisë** (URL më poshtë).
- [ ] **Markat:** emrat Golf/Benz/Audi/BMW/Porsche janë marka tregtare. Mos i përdor në tekstin e dyqanit/screenshot-e
      (teksti ynë i shmang). Rekomandohet t'i ndryshosh edhe brenda lojës (p.sh. "Dyshi", "190-ka", "A-4shi",
      "M-ja", "Nëntë-njëmbëdhjetëshja") — ankesat e IP-së mund ta heqin aplikacionin nga dyqani.
- [ ] Ikona: `Assets/Art/Icon/icon-1024.png` vendoset automatikisht nga **Traffic Rush → Build → Apply App Icons**
      (edhe gjatë build-it). Android adaptive (foreground/background 432 px) vendoset vetëm nëse moduli Android është i
      instaluar; kontrollo te Player Settings → Android → Icon → *Adaptive*.
- [ ] Version: `PlayerSettings.bundleVersion = 0.1.0`; *Bundle Version Code* (Android) dhe *Build* (iOS) rriten në çdo
      ngarkim (CI përdor numrin e run-it të GitHub).

## 1. Llogaritë
- [ ] **Apple Developer Program** — **99 $/vit**: <https://developer.apple.com/programs/enroll/>
  - Individ (emri yt shfaqet si shitës) ose Organizatë (kërkon **D-U-N-S number** falas, zgjat 1–2 javë).
  - Kërkon Apple ID me verifikim me 2 hapa.
- [ ] **Google Play Console** — **25 $ një herë**: <https://play.google.com/console/signup>
  - Verifikimi i identitetit (dokument) dhe i telefonit; për organizatë duhet D-U-N-S.
  - ⚠️ **Llogaritë personale të reja** duhet të bëjnë **closed testing me të paktën 12 testues që qëndrojnë të
    regjistruar 14 ditë rresht** para se të mund të kërkojnë qasje në *Production* (shih hapin 7).
- [ ] **AdMob** (<https://admob.google.com>) — lidhe me llogarinë e pagesave; shto aplikacionet pasi të jenë në dyqan.
- [ ] Kontrollo që **Shqipëria / Kosova** janë vende të mbështetura për llogari tregtari (merchant) për blerjet
      (Google Payments profile; Apple *Paid Apps Agreement*). Nëse jo, përdor një llogari bankare/biznes në vend të mbështetur.
- [ ] **Unity ID** (falas) për licencën në CI dhe Unity IAP.

## 2. Marrëveshjet dhe të dhënat bankare
- [ ] App Store Connect → **Business** (Agreements, Tax, and Banking): prano *Paid Apps Agreement*, plotëso bankën dhe
      formularët e taksave (W-8BEN për jo-amerikanët). Pa këtë **IAP nuk funksionojnë**.
- [ ] Play Console → **Setup → Payments profile**: krijo profilin e tregtarit (merchant) dhe lidh bankën.

## 3. Nënshkrimi (signing)
**Android**
- [ ] Krijo **upload key** (një herë, ruaje me kujdes — humbja e tij kërkon procedurë rikuperimi te Google):
  ```bash
  keytool -genkeypair -v -keystore tr-upload.keystore -alias trafficrush -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] Ruaj keystore-in + fjalëkalimet në një password manager dhe në backup offline. **Mos e fut në git.**
- [ ] Në Play Console aktivizo **Play App Signing** (default për aplikacionet e reja) — Google mban çelësin e aplikacionit,
      ti nënshkruan vetëm me upload key.
- [ ] Build lokal: vendos env `TR_KEYSTORE_PATH`, `TR_KEYSTORE_PASS`, `TR_KEY_ALIAS`, `TR_KEY_PASS`, pastaj
      **Traffic Rush → Build → Android (AAB)** → `Builds/Android/TrafficRush.aab`.

**iOS**
- [ ] developer.apple.com → *Identifiers* → krijo **App ID** `com.wullnet.trafficrush` me capability **In-App Purchase**.
- [ ] **Traffic Rush → Build → iOS (Xcode)** → `Builds/iOS` → hape `Unity-iPhone.xcodeproj` në Xcode (Mac, versioni i
      Xcode që kërkon Apple në 2026) → *Signing & Capabilities* → Team → *Automatically manage signing*.
- [ ] Export compliance: loja përdor vetëm HTTPS standard → `ITSAppUsesNonExemptEncryption = NO`
      (ose përgjigju "None of the algorithms mentioned" në App Store Connect).
- [ ] Kontrollo që Info.plist ka `GADApplicationIdentifier` dhe `SKAdNetworkItems` (i shton plugin-i i AdMob).
- [ ] Pa Mac: Unity Build Automation ose një runner macOS në GitHub Actions (me fastlane) për *Archive → Upload*.

## 4. Krijimi i aplikacionit në dyqane
- [ ] **App Store Connect → Apps → +** → iOS, emri `Traffic Rush: Highway Racer`, gjuha kryesore **English (U.S.)**
      (shqipja nuk mbështetet), bundle ID, SKU `trafficrush001`.
- [ ] **Play Console → Create app** → emri, gjuha default **English (United States)** + përkthimi **Albanian (sq)**,
      *Game*, *Free*, pranimet e politikave.
- [ ] Hidh tekstet nga `listing-en.md` / `listing-sq.md`. Kategoria: **Games → Racing**. Ekzekuto `python3 store/check_limits.py`.
- [ ] **Privacy Policy URL:** aktivizo GitHub Pages për repo-n `Wullnet/Mikro` (Settings → Pages → branch `main`, `/ (root)`),
      pastaj: `https://wullnet.github.io/Mikro/traffic-rush/store/privacy-policy.html`.
      Zëvendëso **`CONTACT_EMAIL`** në `privacy-policy.html` me email-in real (dhe në Support URL).
- [ ] **app-ads.txt** (AdMob): duhet të jetë në rrënjën e domain-it të "Developer website" në dyqan, p.sh.
      `https://wullnet.github.io/app-ads.txt` → kërkon repo `Wullnet/wullnet.github.io` (ose domain tëndin).
      Përmbajtja: rreshti që jep AdMob (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).
- [ ] **Data safety** (Play) dhe **App Privacy** (Apple) sipas [`data-safety.md`](data-safety.md).
- [ ] **Vlerësimi i moshës**: IARC (Play) dhe Age Rating (Apple) sipas `listing-sq.md`; Play *Target audience* = **13+**;
      *Ads* = **Po**; *Advertising ID* = **Po**.
- [ ] **IAP**: krijo 4 produktet me ID-të nga `MONETIZATION.md` (emrat/përshkrimet në `listing-en.md`).
      Apple kërkon screenshot për rishikim për çdo produkt.

## 5. Grafikat
**Ikona**
- [ ] iOS: `Assets/Art/Icon/icon-1024.png` (1024×1024, pa transparencë) — Xcode e merr nga Unity.
- [ ] Play: `store/play-icon-512.png` (512×512, 32-bit PNG).
- [ ] Play: **Feature graphic** `store/feature-graphic.png` (**1024×500**, i detyrueshëm).

**Screenshots** (portrait; pa korniza pajisjesh të rreme, pa logo markash, pa çmime/"#1")
| Dyqani | Madhësia | Sa | Shënim |
|---|---|---|---|
| App Store — iPhone **6.9"** | **1320×2868** (ose 1290×2796) | 3–10 | E detyrueshme |
| App Store — iPhone **6.5"** | **1242×2688** (ose 1284×2778) | 3–10 | Kërkohet vetëm nëse s'ka 6.9"; Apple shkallëzon për ekranet më të vogla |
| App Store — iPad **13"** | **2064×2752** (ose 2048×2732) | 3–10 | **Vetëm nëse** build-i mbështet iPad. Për ta shmangur: Player Settings → iOS → *Target Device* = **iPhone Only** |
| Google Play — telefon | 9:16, p.sh. **1080×1920** (min 320 px, max 3840 px) | 2–8 (rekomandohen ≥4) | E detyrueshme |
| Google Play — tablet 7"/10" | 9:16 ose 16:9, ≥1080 px | opsionale | Nevojitet për t'u shfaqur në seksionet për tablet |

- [ ] Ide për 5 screenshot-e: (1) autostrada me trafik + titulli, (2) near-miss bonus, (3) garazhi, (4) harta Llogara,
      (5) Prishtinë natën. Shkrepi nga Unity Editor (Game view me rezolucionin e mësipërm) ose simulator.
- [ ] (Opsionale) App Preview video 15–30 s (iOS) / video YouTube (Play).

## 6. Testimi — iOS (TestFlight)
- [ ] Xcode → *Product → Archive* → *Distribute App → App Store Connect → Upload*.
- [ ] App Store Connect → **TestFlight**: build-i shfaqet pas përpunimit (10–30 min); plotëso *Export Compliance*.
- [ ] **Internal testers** (deri 100, anëtarë të ekipit) — pa rishikim.
- [ ] **External testers** (deri 10 000, me link publik) — kërkon *Beta App Review* (zakonisht < 1 ditë).
- [ ] Testo: blerjet me llogari **Sandbox**, "Rikthe blerjet", reklamat (ID test / pajisje test), rotacioni, notch/safe area,
      pa internet, pëlqimi UMP (me VPN në BE ose `DebugGeography`).

## 7. Testimi — Android (Play)
- [ ] **Internal testing** (deri 100 testues me email): ngarko `TrafficRush.aab`, shto testuesit, ndaj linkun.
      Blerjet: shto email-et te *Settings → License testing*.
- [ ] ⚠️ **Closed testing — e detyrueshme për llogari personale të krijuara pas 13 nëntorit 2023:**
  - krijo një *Closed testing track* (p.sh. "Alpha"), shto **të paktën 12 testues** (Google Group ose listë email-esh);
  - ata duhet të pranojnë ftesën (**opt-in**) dhe të mbeten të regjistruar **14 ditë rresht**;
  - pastaj *Dashboard → Apply for production* — përgjigju pyetjeve për testimin (sa testues, çfarë feedback-u more,
    çfarë ndryshove). Google shqyrton kërkesën (zakonisht ≤ 7 ditë).
  - Këshillë: fillo closed testing sa më herët (paralelisht me punën për art/zë) — 14 ditët janë rruga kritike.
- [ ] Kontrollo **Pre-launch report** (crash, akseshmëri, siguri) dhe *Android vitals*.

## 8. CI (GitHub Actions)
Workflow-i `.github/workflows/traffic-rush.yml` ndërton Android (AAB) dhe iOS (projekt Xcode) me game-ci në çdo push te
`traffic-rush/**` ose me dorë (*Actions → Traffic Rush build → Run workflow*). Pa sekretet Unity, job-i i build-it
anashkalohet (nuk del i kuq). Artefaktet: *TrafficRush-Android-N* (`.aab`) dhe *TrafficRush-iOS-N* (projekt Xcode).

Repo → **Settings → Secrets and variables → Actions → New repository secret**:
| Sekreti | Vlera | I detyrueshëm |
|---|---|---|
| `UNITY_LICENSE` | përmbajtja e skedarit `.ulf` (Unity Personal: shih <https://game.ci/docs/github/activation>) | Po |
| `UNITY_EMAIL` | email-i i Unity ID | Po |
| `UNITY_PASSWORD` | fjalëkalimi i Unity ID | Po |
| `TR_KEYSTORE_BASE64` | `base64 -w0 tr-upload.keystore` (macOS: `base64 -i tr-upload.keystore`) | Për AAB të ngarkueshëm |
| `TR_KEYSTORE_PASS` | fjalëkalimi i keystore | Për AAB të ngarkueshëm |
| `TR_KEY_ALIAS` | alias-i (p.sh. `trafficrush`) | Për AAB të ngarkueshëm |
| `TR_KEY_PASS` | fjalëkalimi i çelësit | Për AAB të ngarkueshëm |

- [ ] Pa sekretet e keystore-it AAB-ja nënshkruhet me çelës debug dhe Play e refuzon.
- [ ] Projekti iOS nga CI duhet ende të arkivohet dhe nënshkruhet në Mac (ose shto një job macOS me fastlane më vonë).

## 9. Shënime për rishikuesit (Review notes)
- [ ] **Apple** (App Review Information): teksti gati te `listing-en.md` → *App Review notes*. Kontakt: emri, telefoni,
      email-i. Nuk ka login → lëre bosh *Sign-in required*.
- [ ] **Google**: *App access* → "All functionality is available without special access".
- [ ] Rreziqe të zakonshme refuzimi: reklama që mbulojnë butonat ose dalin gjatë lojës (vetëm pas game over — në rregull);
      mungesa e "Restore Purchases"; privacy policy që nuk hapet; emra markash në metadata; crash në iPad.

## 10. Publikimi
- [ ] **iOS:** App Store Connect → versioni 0.1.0 → zgjidh build-in → IAP-të te "In-App Purchases and Subscriptions" →
      *Add for Review* → *Submit*. Zgjidh **Manually release** për të kontrolluar datën. Rishikimi: zakonisht 1–2 ditë.
- [ ] **Android:** pas miratimit të production access → *Production → Create new release* → ngarko AAB-në (ose
      *Promote* nga closed testing) → *Release notes* (What's new) → vendet (Shqipëri, Kosovë, Maqedoni e Veriut, BE, …) →
      **Staged rollout** 20% → 100% pas 2–3 ditësh pa crash-e.
- [ ] Pas publikimit: lidh aplikacionet te **AdMob** (App store linking), verifiko **app-ads.txt**, kontrollo crash-et
      (Xcode Organizer / Play Android vitals) dhe përgjigju review-ve.
- [ ] Tag në git: `traffic-rush-v0.1.0`.

# Monetizimi — Traffic Rush

Kodi i monetizimit (`AdsService.cs`, `IAPService.cs`) kompilohet **pa asnjë SDK** të instaluar. Në këtë gjendje:

| | Pa SDK (parazgjedhje) | Me SDK |
|---|---|---|
| Reklamë me shpërblim ("Vazhdo") | jep shpërblim menjëherë | AdMob `RewardedAd` |
| Interstitial (çdo game over i 3-të) | s'bën asgjë | AdMob `InterstitialAd` (asnjëherë nëse është blerë "Pa reklama") |
| Blerjet (monedha, pa reklama) | sukses në Editor, dështim në pajisje | Unity IAP (App Store / Google Play) |

SDK-të aktivizohen me dy **Scripting Define Symbols**: `ADMOB_ENABLED` dhe `UNITY_IAP_ENABLED`.

> Mos i shto simbolet para se të instalosh paketat — përndryshe projekti nuk kompilohet.

---

## 1. Google Mobile Ads (AdMob)

### 1.1 Instalimi i plugin-it
1. Shkarko versionin më të ri (**v9 ose më i ri**) të `GoogleMobileAds-vX.Y.Z.unitypackage` nga
   <https://github.com/googleads/googleads-mobile-unity/releases>
   (ose shtoje me OpenUPM: `com.google.ads.mobile`).
2. Unity → **Assets → Import Package → Custom Package…** → importo gjithçka.
3. Kur të pyesë **External Dependency Manager**, prano. Për Android: **Assets → External Dependency Manager → Android Resolver → Force Resolve**.

### 1.2 Krijimi i aplikacionit dhe njësive të reklamave
1. Hyr te <https://admob.google.com> → **Apps → Add app** — një herë për Android, një herë për iOS.
2. Për secilin aplikacion krijo dy **Ad units**:
   - **Rewarded** (p.sh. "TR Continue")
   - **Interstitial** (p.sh. "TR GameOver")
3. Kopjo **App ID**-të (`ca-app-pub-…~…`) dhe **Ad unit ID**-të (`ca-app-pub-…/…`).

### 1.3 Vendosja e ID-ve
- **App ID**: Unity → **Assets → Google Mobile Ads → Settings** → plotëso *Android App ID* dhe *iOS App ID*.
  (Për testim mund të përdorësh ID-të test: Android `ca-app-pub-3940256099942544~3347511713`, iOS `ca-app-pub-3940256099942544~1458002511`.)
- **Ad unit ID**: te `Assets/Scripts/AdsService.cs` janë konstantet `RewardedId` dhe `InterstitialId` për Android dhe iOS.
  Tani janë ID-të **TEST** të Google-it — **ZËVENDËSO me ID-të reale para publikimit**.

> Kurrë mos kliko reklamat reale në telefonin tënd — AdMob mund ta bllokojë llogarinë. Gjatë zhvillimit përdor ID-të test ose shto telefonin si *test device* (AdMob → Settings → Test devices).

---

## 2. Unity IAP (blerjet)

### 2.1 Instalimi
1. **Window → Package Manager → Unity Registry** → kërko **In-App Purchasing** (`com.unity.purchasing`) → instalo versionin **4.x** (API-ja klasike me `IDetailedStoreListener`; versioni 5 ka API tjetër).
2. **Project Settings → Services**: lidhe projektin me Unity Cloud (Organization + Project ID), pastaj aktivizo **In-App Purchasing**.
3. Për Google Play: **Services → In-App Purchasing → Google Play License Key** — ngjit çelësin nga Play Console (*Monetize → Monetization setup → Licensing*).

### 2.2 Produktet (ID-të duhet të jenë **saktësisht** këto)

| Product ID | Lloji | Çfarë jep | Çmimi i sugjeruar |
|---|---|---|---|
| `com.wullnet.trafficrush.coins_small` | Consumable | 1 000 monedha | 0,99 € |
| `com.wullnet.trafficrush.coins_medium` | Consumable | 3 000 monedha | 2,99 € |
| `com.wullnet.trafficrush.coins_large` | Consumable | 10 000 monedha | 7,99 € |
| `com.wullnet.trafficrush.noads` | Non-Consumable | Pa reklama interstitial | 2,99 € |

Çmimet në lojë merren nga dyqani (të lokalizuara); çmimet e tabelës janë vetëm rezervë kur dyqani s'është gati.

**App Store Connect** (iOS)
1. Plotëso **Agreements, Tax and Banking** (kontrata *Paid Apps*) — pa këtë blerjet nuk funksionojnë.
2. App-i → **Monetization → In-App Purchases → +** → zgjidh *Consumable* ose *Non-Consumable*, vendos Product ID nga tabela, çmimin, emrin, përshkrimin dhe një screenshot për rishikim.
3. Produktet dërgohen për rishikim bashkë me versionin e parë të aplikacionit.

**Google Play Console** (Android)
1. Ngarko një build (të paktën në *Internal testing*) që përmban Unity IAP — Play Console nuk lejon produkte pa një build me leje billing.
2. **Monetize → Products → In-app products → Create product** → vendos Product ID nga tabela dhe çmimin → **Activate**.
3. Në Google Play s'ka dallim consumable/non-consumable në Console — këtë e bën kodi (`ProductType` te `IAPService.cs`).

### 2.3 Rikthimi i blerjeve
- **iOS**: Apple kërkon një buton **"Rikthe blerjet"** → thërret `IAPService.RestorePurchases`.
- **Android**: blerjet non-consumable rikthehen automatikisht kur niset dyqani.

---

## 3. Aktivizimi i simboleve
**Edit → Project Settings → Player** → për **Android** dhe për **iOS** veç e veç:
**Other Settings → Script Compilation → Scripting Define Symbols** → shto:

```
ADMOB_ENABLED;UNITY_IAP_ENABLED
```

→ **Apply**. Mund t'i aktivizosh edhe veç e veç (p.sh. vetëm `ADMOB_ENABLED`).

---

## 4. Testimi

**Reklamat**: me ID-të test shfaqen reklama me etiketën "Test Ad". Provo: game over → "Vazhdo" (rewarded), dhe 3 game over radhazi (interstitial).

**iOS — Sandbox**
1. App Store Connect → **Users and Access → Sandbox → Test Accounts** → krijo një llogari testuese.
2. Në iPhone: **Settings → App Store → Sandbox Account** → hyr me atë llogari.
3. Instalo build-in nga Xcode ose TestFlight dhe bli — s'paguhet asgjë.

**Android — License testers**
1. Play Console → **Settings → License testing** → shto email-in e Google të telefonit.
2. Shto të njëjtin email te testuesit e *Internal testing*, instalo aplikacionin **nga lidhja e Play Store** (jo APK direkt).
3. Blerjet shfaqen si "Test card, always approves".

**Editor**: Unity IAP përdor një "Fake Store" — blerjet dalin të suksesshme pa dyqan real.

---

## 5. Privatësia dhe pëlqimi (GDPR)

- Përdoruesit në **BE/EEA dhe Mbretëri të Bashkuar** duhet të japin pëlqimin para reklamave të personalizuara. Edhe për **Shqipërinë** (ligji nr. 124/2024 për mbrojtjen e të dhënave, i harmonizuar me GDPR) dhe **Kosovën** (ligji nr. 06/L-082) rekomandohet i njëjti trajtim — shumë lojtarë shqiptarë jetojnë edhe në BE.
- Përdor **Google UMP** (User Messaging Platform, përfshihet në plugin-in e AdMob-it: `GoogleMobileAds.Ump.Api`):
  1. AdMob → **Privacy & messaging → European regulations** → krijo dhe publiko mesazhin e pëlqimit.
  2. Në kod, para `AdsService.Initialize()`: `ConsentInformation.Update(...)` → `ConsentForm.LoadAndShowConsentFormIfRequired(...)` → inicializo reklamat vetëm kur `ConsentInformation.CanRequestAds()` është `true`. (Ky hap ende s'është shtuar në kod — duhet para publikimit në BE.)
  3. Shto në menu një opsion "Privatësia" që hap `ConsentForm.ShowPrivacyOptionsForm` kur kërkohet.
- **iOS**: plotëso **App Privacy** në App Store Connect (AdMob mbledh Device ID, të dhëna përdorimi). Për reklama të personalizuara duhet **App Tracking Transparency** (`NSUserTrackingUsageDescription` në Info.plist); pa të, reklamat janë jo të personalizuara.
- **Android**: plotëso **Data safety** në Play Console dhe deklaro **Advertising ID**.
- Duhet një **Privacy Policy** publike (URL) në të dy dyqanet që përmend AdMob dhe blerjet.
- Loja është për të gjitha moshat? Nëse synon fëmijë, duhen cilësime shtesë (*Families Policy*, `TagForChildDirectedTreatment`) — aktualisht loja **nuk** është e deklaruar për fëmijë.

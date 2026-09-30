# Traffic Rush 🚗

Lojë endless runner me makina për iOS dhe Android, e ndërtuar me **Unity 6**. Shih [GDD.md](GDD.md) për dizajnin e plotë.

## Si ta hapësh
1. Instalo [Unity Hub](https://unity.com/download) dhe **Unity 6 LTS** (6000.0.x) me modulet **Android Build Support** dhe/ose **iOS Build Support**.
2. Unity Hub → **Add → Add project from disk** → zgjidh folderin `traffic-rush/`.
3. Herën e parë Unity krijon vetë skenën `Assets/Scenes/Game.unity` dhe cilësimet e build-it (ose: menuja **Traffic Rush → Setup Project**).
4. Shtyp **Play**. Kontrolli në editor: shigjetat ose A/D.

> Nëse ke version tjetër të Unity 6, Hub-i të pyet ta hapësh me atë version — prano.

## Luaje në telefon tani (versioni web)
Folderi `web/` ka të njëjtën lojë në HTML5 + Three.js (3D), që hapet në Safari/Chrome pa instalim:
- Rregullat, makinat, hartat dhe misionet janë të njëjta me versionin Unity; ruajtja bëhet në `localStorage`.
- Pa reklama/blerje: "Vazhdo" jepet falas një herë për lojë.
- Kontrolli: rrëshqit ose prek majtas/djathtas; në kompjuter shigjetat ose A/D.
- Si app në iPhone: pasi `web/` të jetë në GitHub Pages (merge në `main`), hape
  `https://wullnet.github.io/Mikro/traffic-rush/web/` në Safari → Share → **Add to Home Screen**.
- Provë lokale: `cd traffic-rush/web && python3 -m http.server` dhe hap `http://localhost:8000`.

## Build
**Android (Google Play)**
1. File → Build Profiles → Android → Switch Platform.
2. Për testim: Build → `.apk` dhe instaloje në telefon.
3. Për Play Store: aktivizo *Build App Bundle (.aab)*, krijo keystore te Player Settings → Publishing Settings, pastaj ngarkoje në Google Play Console (llogari $25 një herë).

**iOS (App Store)**
1. Switch Platform → iOS → Build. Unity nxjerr një projekt Xcode.
2. Hape në Xcode (kërkon Mac), vendos Team-in e Apple Developer ($99/vit), Archive → upload në App Store Connect → TestFlight.
3. Pa Mac: përdor Unity Build Automation (cloud build).

Bundle ID: `com.wullnet.trafficrush` (ndryshohet te `Assets/Editor/ProjectSetup.cs`).

## Struktura e kodit
| Skedari | Roli |
|---|---|
| `GameBootstrap.cs` | Krijon `GameManager` automatikisht në çdo skenë |
| `GameManager.cs` | Gjendjet (menu, lojë, pauzë, game over, garazh), kamera, mjedisi |
| `PlayerCar.cs` | Lëvizja, swipe/tastiera, përplasjet, monedhat |
| `RoadSpawner.cs` | Rruga pa fund me segmente të ricikluara |
| `TrafficSpawner.cs` | Rreshtat e trafikut + monedhat, vështirësia progresive |
| `TrafficCar.cs`, `Coin.cs` | Makinat e trafikut dhe monedhat |
| `CarFactory.cs` | Ndërton makina nga forma primitive (zëvendësohet me modele 3D në fazën e art-it) |
| `UIManager.cs` | UI (OnGUI) e shkallëzuar për çdo ekran, me safe area për notch |
| `SaveSystem.cs` | Monedhat, rekordi, makinat e blera (PlayerPrefs) |
| `AdsService.cs` | Vend-mbajtës për reklamat me shpërblim (AdMob në fazën 4) |
| `GameConfig.cs` | Të gjitha numrat e balancës + katalogu i makinave |

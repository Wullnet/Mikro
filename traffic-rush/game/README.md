# Traffic Rush: Qyteti

Lojë me makina në një qytet 3D të frymëzuar nga Tirana (Three.js + TypeScript + Vite), e paketuar me Capacitor për iOS dhe Android.

## Zhvillimi
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
```

## App për telefon (Capacitor)
```bash
npm run build && npx cap sync
npx cap open ios       # Xcode (kërkon Mac) → Signing → Run / Archive → App Store Connect
npx cap open android   # Android Studio → Run / Build → Generate Signed Bundle (.aab) → Google Play
```
- App ID: `com.wullnet.trafficrush` (te `capacitor.config.ts`).
- Pa Mac: build iOS në cloud (p.sh. Codemagic ose Ionic Appflow).
- Ikonat dhe tekstet për store: `../store/`, `../Assets/Art/Icon/`.

## Struktura
| Folderi | Çfarë ka |
|---|---|
| `src/core` | Kontratat mes moduleve, motori grafik (qielli, dita/nata, kamera), rrugët dhe A* |
| `src/world` | Qyteti: rrugët, lagjet, Lana, monumentet, semaforët, POI |
| `src/vehicles` | Modelet 3D origjinale, fizika, efektet |
| `src/traffic` | Trafiku AI, policia, radarët |
| `src/missions` | Misionet, historia, progresi, bizneset |
| `src/ui` | Menutë, HUD, minimapa, harta, garazhi, cilësimet |
| `src/input`, `src/audio` | Kontrollet (timon/tilt/korsi) dhe zëri procedural |

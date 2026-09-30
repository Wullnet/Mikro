# Traffic Rush — Game Design Document (v0.1)

## Koncepti
Lojë **endless runner** me makina për iOS dhe Android. Makina jote ecën vetë nëpër autostradën Tiranë–Durrës plot trafik; ti rrëshqet majtas/djathtas për të ndërruar korsi, shmang makinat dhe mbledh monedha. Sa më larg shkon, aq më shpejt ecën dhe aq më i dendur bëhet trafiku.

- **Platforma:** iOS (App Store), Android (Google Play)
- **Motori:** Unity 6 (C#)
- **Orientimi:** Portrait, luhet me një dorë
- **Publiku:** casual, 12+, seanca 1–3 minuta

## Loop-i kryesor
1. **Luaj** → makina niset me 65 km/h dhe përshpejton gradualisht deri në shpejtësinë maksimale të makinës.
2. **Shmang** trafikun (3 korsi; çdo korsi ka shpejtësinë e vet, e majta më e shpejta).
3. **Mblidh monedha** që shfaqen në korsinë e lirë.
4. **Përplasje** → Game Over: rezultati (metra), rekordi, monedhat.
5. **Vazhdo** një herë për lojë duke parë reklamë me shpërblim.
6. **Garazhi** → shpenzo monedhat për makina më të shpejta dhe më të lehta për t'u drejtuar.

## Kontrolli
- Mobile: swipe majtas/djathtas (pragu 6% e gjerësisë së ekranit)
- Editor/PC: shigjetat ose A/D

## Vështirësia
Rritet lineart deri në 3000 m:
| | Fillim | 3000 m+ |
|---|---|---|
| Distanca mes rreshtave | ~26 m | ~13 m |
| Gjasat për rresht me 2 makina | 15% | 55% |

Garanci: çdo rresht lë të paktën një korsi të lirë, dhe korsia e lirë lëviz maksimumi një korsi nga rreshti i kaluar.

## Makinat (garazhi)
| Makina | Çmimi | Shpejtësia maks. | Manovrimi |
|---|---|---|---|
| Golf Dyshi | falas | 115 km/h | ★★ |
| Benz 190 | 250 | 130 km/h | ★★ |
| Audi A4 | 600 | 144 km/h | ★★★ |
| BMW M3 | 1200 | 162 km/h | ★★★★ |
| Porsche 911 | 2500 | 187 km/h | ★★★★★ |

Balanca ndryshohet në `Assets/Scripts/GameConfig.cs`.

## Monetizimi (faza 2)
- **Rewarded ad** për "Vazhdo" (AdMob) — tashmë i lidhur te `AdsService.ShowRewarded`.
- **Interstitial** çdo 3 Game Over (jo më shpesh).
- **IAP:** paketa monedhash, "Hiq reklamat".

## Roadmap
| Faza | Përmbajtja | Statusi |
|---|---|---|
| 1. Prototip | Loop-i i plotë me forma primitive, UI bazë, ruajtje, garazh | ✅ |
| 2. Art & zë | Modele 3D makinash (low-poly), zëra motori/përplasje, muzikë, UI e dizajnuar | ⏳ |
| 3. Përmbajtje | Harta të tjera (Llogara, Prishtinë natën), misione ditore, near-miss bonus | ⏳ |
| 4. Monetizim | AdMob, IAP, analytics (Firebase) | ⏳ |
| 5. Publikim | Ikona, screenshots, privacy policy, TestFlight + Play Internal Testing, release | ⏳ |

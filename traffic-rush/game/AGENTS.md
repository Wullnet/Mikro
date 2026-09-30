# Traffic Rush: Qyteti — rregullat e punës për agjentët

Lojë me makina në një qytet 3D të frymëzuar nga Tirana (web + Three.js + TypeScript, më vonë Capacitor për App Store/Play Store).
Luhet kryesisht në **iPhone** (Safari/WebView) — performanca në telefon është kriter kryesor.

## Rregullat
- Kontratat mes moduleve: `src/core/contracts.ts`. **Mos e ndrysho.** Nëse të duhet diçka shtesë,
  eksporto tipe/funksione shtesë nga moduli yt dhe shkruaje te raporti final.
- Ndihmës të përbashkët (vetëm lexim): `src/core/math.ts` (konventat e drejtimit), `src/core/roads.ts`
  (korsitë, A*), `src/core/events.ts`, `src/data/catalog.ts` (makinat).
- Çdo agjent prek VETËM folderin e vet + faqen e vet demo (`demos/<emri>.html`, `src/demos/<emri>.ts`).
- Mos bëj `git commit`/`push`. Mos instalo paketa npm pa qenë e domosdoshme (shkruaje te raporti).
- TypeScript strict. Kontroll: `npx tsc --noEmit` — gabimet në folderat e agjentëve të tjerë (punë në progres) injoroji,
  por skedarët e tu duhet të jenë pa gabime.
- Tekstet që sheh lojtari: **shqip**. Komentet në kod: shqip, të shkurtra.
- Pa marka reale (makina, biznese). Emra origjinalë shqiptarë.
- Three.js 0.180: `import * as THREE from 'three'`; shtesat nga `three/addons/...`.

## Testimi vizual
- Nis serverin në portin tënd: `npx vite --port <PORT> --strictPort` (në background), pastaj
  `node tools/shot.mjs http://127.0.0.1:<PORT>/demos/<emri>.html /tmp/claude-0/<emri>-1.png 3000 390 844`
  (argumentet: url, png, pritja ms, gjerësia, lartësia, JS opsional për evaluate). Printon gabimet e konsolës
  (404 i favicon-it s'ka rëndësi). Shiko PNG-në me Read dhe përmirëso derisa të duket profesionale.
- Mbylle serverin në fund: `pkill -f "vite --port <PORT>"` (komandë më vete).
- WebGL në test është softuerik (swiftshader) — FPS aty nuk është treguesi; mat draw calls/trekëndësha me `renderer.info`.

| Agjenti | Folderi | Porti |
|---|---|---|
| world | src/world | 5301 |
| vehicles | src/vehicles | 5302 |
| traffic | src/traffic | 5303 |
| missions | src/missions, src/data/missions.ts, src/data/properties.ts | 5304 |
| ui | src/ui | 5305 |
| input+audio | src/input, src/audio | 5306 |

## Buxheti i performancës (telefon, cilësia 'medium')
- ≤ 250 draw calls në pamje, ≤ 500k trekëndësha, pa dritë dinamike përveç 1 DirectionalLight + ambient/hemisphere
  (main.ts i menaxhon). Përdor InstancedMesh, gjeometri të bashkuara, materiale të përbashkëta, tekstura të gjeneruara me canvas.
- Cilësia 'low' duhet të heqë detajet e vogla; 'high' mund të shtojë.

## Paraqitja e ekranit (UI dhe kontrollet)
- Zonat e rezervuara për kontrollet në ekran (moduli input): **këndi poshtë-majtas** dhe **këndi poshtë-djathtas**
  (secili deri në 42% të gjerësisë dhe 38% të lartësisë, brenda safe-area).
- HUD (moduli ui): minimap lart-majtas, para/niveli lart-djathtas, misioni lart-qendër, shpejtësimatësi poshtë-qendër (i vogël).
- Loja duhet të punojë në portret dhe peizazh (landscape rekomandohet për ngarje).
- Stili: panele të errëta (rgba), aksent portokalli-sinjal `#ff5a2e`, ari `#ffc933`, jeshile tabelash `#0e6a40`,
  shkronjat "Saira Extra Condensed" (tituj, numra) dhe "Barlow" (tekst) — të ngarkuara në index.html.

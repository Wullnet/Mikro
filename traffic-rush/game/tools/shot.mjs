// Përdorimi: node tools/shot.mjs <url> <out.png> [waitMs=2000] [width=390] [height=844] [evalJs]
// Hap faqen në Chromium (WebGL me swiftshader), pret, bën screenshot dhe printon gabimet e konsolës.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [url, out, wait = '2000', w = '390', h = '844', evalJs] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, isMobile: +w < 600, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); if (m.type() === 'log' && m.text().startsWith('[demo]')) console.log(m.text()); });
await page.goto(url);
await page.waitForTimeout(+wait);
if (evalJs) console.log('eval:', JSON.stringify(await page.evaluate(evalJs)));
await page.screenshot({ path: out });
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();

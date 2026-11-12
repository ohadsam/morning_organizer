// Renders the per-look widget cards (scripts/widget-looks/<skin>/wbg-<size>.svg) to PNG for the Android widgets:
//   android/app/src/main/res/drawable-nodpi/wbgk_<size>_<skin>.png (light) and drawable-night-nodpi/ (dark).
// The colours are the app's own: the look's k1..k8 (data/visual-kit.json) and its --surface (css/app.css). Run: node scripts/make-widget-looks.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const kit = JSON.parse(readFileSync('web/data/visual-kit.json', 'utf8')), css = readFileSync('web/css/app.css', 'utf8');
const PACK = { default: 'sunrise', ocean: 'ocean', forest: 'forest', sunset: 'sunset', candy: 'candy', slate: 'slate', calm: 'calm-mono', bold: 'bold-focus' };
const SIZES = { '2x2': [160, 160], '4x1': [320, 80], '4x2': [320, 160] }, SCALE = 3;
/** The --surface of a look in light or dark: the rule `:root[data-skin="x"]` (light) or the one with data-theme="dark" (dark); the default look has the plain :root rules. */
function surface(skin, dark) {
  const rules = [...css.matchAll(/([^{}\n]*?)\{([^{}]*--surface:\s*(#[0-9a-fA-F]{6})[^{}]*)\}/g)].map((m) => ({ sel: m[1], v: m[3] }));
  const pick = rules.filter((r) => (skin === 'default' ? !/data-skin/.test(r.sel) && /:root/.test(r.sel) : r.sel.includes(`data-skin="${skin}"`)) && (dark ? /dark/.test(r.sel) : !/dark/.test(r.sel)))[0];
  if (!pick) throw new Error(`no surface for ${skin} ${dark ? 'dark' : 'light'}`);
  return pick.v;
}
const browser = await chromium.launch();
for (const [skin, pack] of Object.entries(PACK)) {
  const p = kit.packs.find((x) => x.id === pack);
  for (const dark of [false, true]) {
    const k = p.k[dark ? 'dark' : 'light'], vars = k.map((c, i) => `--k${i + 1}:${c}`).join(';') + `;--surface:${surface(skin, dark)}`;
    for (const [size, [w, h]] of Object.entries(SIZES)) {
      const svg = readFileSync(`scripts/widget-looks/${skin}/wbg-${size}.svg`, 'utf8').replace(/ width="\d+" height="\d+"/, ` width="${w * SCALE}" height="${h * SCALE}"`);
      const page = await browser.newPage({ viewport: { width: w * SCALE, height: h * SCALE } });
      await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}${[1, 2, 3, 4, 5, 6, 7, 8].map((i) => `.k${i}{fill:var(--k${i})}`).join('')}.i-bg{fill:var(--surface)}[fill=none]{fill:none!important}:root{${vars}}</style>${svg}`);
      const dir = `android/app/src/main/res/drawable${dark ? '-night' : ''}-nodpi`; mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/wbgk_${size.replace('x', 'x')}_${skin}.png`.replace('wbgk_', 'wbgk_'), await page.screenshot({ omitBackground: true }));
      await page.close();
    }
  }
}
// The bell and balance pictures (ICONS=<dir with wi-bell-0..2, wi-bell-off, wi-balance-0..4 .svg>): transparent, in the Sunrise colours, 192 px -> drawable-nodpi/wi_<name>.png
if (process.env.ICONS) {
  const sun = kit.packs.find((x) => x.id === 'sunrise'), vars = sun.k.light.map((c, i) => `--k${i + 1}:${c}`).join(';') + ';--i-ink:#1f1b3a;--surface:#ffffff;--text:#1f1b3a';
  for (const name of ['wi-bell-0', 'wi-bell-1', 'wi-bell-2', 'wi-bell-off', ...[0, 1, 2, 3, 4].map((i) => `wi-balance-${i}`)]) {
    const svg = readFileSync(`${process.env.ICONS}/${name}.svg`, 'utf8').replace(/ width="\d+" height="\d+"/, ' width="192" height="192"');
    const page = await browser.newPage({ viewport: { width: 192, height: 192 } });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}${[1, 2, 3, 4, 5, 6, 7, 8].map((i) => `.k${i}{fill:var(--k${i})}`).join('')}.i-ink:not([fill=none]){fill:var(--i-ink)}.i-ink[stroke]{stroke:var(--i-ink)}.i-bg{fill:var(--surface)}.i-tint{fill:var(--text);fill-opacity:.15}[fill=none]{fill:none!important}:root{${vars}}</style>${svg}`);
    writeFileSync(`android/app/src/main/res/drawable-nodpi/${name.replace(/-/g, '_')}.png`, await page.screenshot({ omitBackground: true })); await page.close();
  }
}
await browser.close(); console.log('done');

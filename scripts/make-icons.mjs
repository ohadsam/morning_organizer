// Renders web/icon.svg / logo-maskable.svg to the PNG icons the PWA manifest and the Android launcher use. Run after scripts/make-logo.py.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const jobs = [['web/icon.svg', 'web/icons/icon-512.png', 512], ['web/icon.svg', 'web/icons/icon-192.png', 192], ['web/icons/logo-maskable.svg', 'web/icons/icon-maskable-512.png', 512],
  ...[['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]].map(([d, n]) => ['web/icon.svg', `android/app/src/main/res/mipmap-${d}/ic_launcher.png`, n])];
const b = await chromium.launch(); const p = await b.newPage();
for (const [src, out, n] of jobs) {
  await p.setViewportSize({ width: n, height: n });
  await p.setContent(`<body style="margin:0;background:transparent">${readFileSync(src, 'utf8').replace('<svg ', `<svg width="${n}" height="${n}" `)}</body>`);
  writeFileSync(out, await p.screenshot({ omitBackground: true, type: 'png' }));
}
await b.close(); console.log('icons ok');

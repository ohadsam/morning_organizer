// Renders web/icon.svg into PNG icons (PWA + Android launcher). Uses the Playwright that CI/dev machines already have.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const svg = readFileSync('web/icon.svg', 'utf8');
const sizes = { 'web/icons/icon-192.png': 192, 'web/icons/icon-512.png': 512 };
const android = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const browser = await chromium.launch();
const page = await browser.newPage();
async function render(size, maskable = false) {
  const inner = maskable ? `<div style="width:100%;height:100%;background:#6c5ce7;display:grid;place-items:center"><div style="width:72%;height:72%">${svg}</div></div>` : svg;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${inner.replace('<svg ', `<svg width="100%" height="100%" `)}</div></body>`);
  return page.screenshot({ omitBackground: true });
}
mkdirSync('web/icons', { recursive: true });
for (const [f, s] of Object.entries(sizes)) writeFileSync(f, await render(s));
writeFileSync('web/icons/icon-maskable-512.png', await render(512, true));
for (const [d, s] of Object.entries(android)) { const dir = `android/app/src/main/res/mipmap-${d}`; mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/ic_launcher.png`, await render(s)); }
await browser.close();

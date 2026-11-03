// End-to-end smoke test in real Chromium against the static site. Usage: node tests/e2e/smoke.mjs [--shots dir]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { serve } from '../../scripts/serve.mjs';

const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
if (shots) mkdirSync(shots, { recursive: true });
const server = await serve('web', 0); const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log('✓', name); } catch (e) { failures++; console.error('✗', name, '\n  ', e.message.split('\n')[0]); } };

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: opts.locale || 'en-US', serviceWorkers: 'block', ...opts.ctx });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return { page, errors, ctx };
}
const shot = async (page, name) => { if (shots) await page.screenshot({ path: `${shots}/${name}.png` }); };

await step('boots in English, seeds sample routines, no console errors', async () => {
  const { page, errors } = await newPage(); await page.goto(base);
  await page.waitForSelector('.routine'); assert.equal(await page.locator('.routine').count(), 2);
  assert.equal(await page.getAttribute('html', 'dir'), 'ltr'); assert.deepEqual(errors, []); await shot(page, 'home-en');
});

await step('Hebrew locale is RTL and fully translated', async () => {
  const { page, errors } = await newPage({ locale: 'he-IL' }); await page.goto(base);
  await page.waitForSelector('.routine'); assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
  assert.match(await page.textContent('h1'), /מארגן בוקר/); assert.deepEqual(errors, []); await shot(page, 'home-he');
  await page.click('.routine-main'); await page.waitForSelector('.task'); await shot(page, 'editor-he');
});

await step('create routine, set 5.5 min task, reorder with arrows, favourite', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await page.click('text=New routine'); await page.waitForSelector('.task');
  await page.fill('.field input[type=text]', 'My test'); await page.fill('.task-name', 'First');
  const dur = page.locator('.task .dur').first().locator('input'); await dur.nth(0).fill('5'); await dur.nth(1).fill('30');
  await page.click('text=Add task'); await page.locator('.task-name').nth(1).fill('Second');
  await page.locator('.task').nth(1).locator('button[aria-label="Move up"]').click();
  assert.equal(await page.locator('.task-name').first().inputValue(), 'Second');
  assert.match(await page.textContent('.row.between strong'), /Total: 10m 30s/);
  await page.waitForTimeout(500); await page.click('button[aria-label="Back"]'); await page.waitForSelector('.routine');
  await page.locator('.routine', { hasText: 'My test' }).locator('button[aria-label="Favorite"]').click();
  await page.waitForSelector('text=Favorites'); assert.deepEqual(errors, []);
});

await step('drag handle reorders tasks (pointer events)', async () => {
  const { page } = await newPage(); await page.goto(base); await page.waitForSelector('.routine'); await page.locator('.routine-main').first().click(); await page.waitForSelector('.task');
  const first = await page.locator('.task-name').first().inputValue();
  const h = await page.locator('.task .handle').first().boundingBox(), h2 = await page.locator('.task .handle').nth(1).boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down();
  await page.mouse.move(h2.x + h2.width / 2, h2.y + h2.height + 20, { steps: 8 }); await page.mouse.up();
  assert.notEqual(await page.locator('.task-name').first().inputValue(), first); assert.equal(await page.locator('.task-name').nth(1).inputValue(), first);
});

await step('run: countdown, 10s warning class, overtime, done, summary, statistics', async () => {
  const { page, errors } = await newPage(); await page.clock.install(); await page.goto(base); await page.waitForSelector('.routine');
  // build a 20s + 15s routine through the real UI
  await page.click('text=New routine'); await page.waitForSelector('.task'); await page.fill('.field input[type=text]', 'Zed');
  const d = page.locator('.task .dur').first().locator('input'); await d.nth(0).fill('0'); await d.nth(1).fill('20');
  await page.click('text=Add task'); const d2 = page.locator('.task').nth(1).locator('.dur').first().locator('input'); await d2.nth(0).fill('0'); await d2.nth(1).fill('15');
  await page.clock.runFor(600); await page.click('.sticky-actions .primary'); await page.waitForSelector('.ring');
  assert.match(await page.textContent('.big-time'), /0:20|0:19/);
  await page.clock.runFor(12_000); assert.ok(await page.locator('.ring.warn').count(), 'warn state at <=10s');
  await page.clock.runFor(12_000); assert.ok(await page.locator('.ring.over').count(), 'overtime after end'); await shot(page, 'run-over');
  await page.click('text=Done ✓'); await page.clock.runFor(5000); await page.click('text=Done ✓');
  await page.waitForSelector('.summary'); assert.match(await page.textContent('.summary'), /Great job/); await shot(page, 'summary');
  await page.click('text=View statistics'); await page.waitForSelector('.tiles'); assert.match(await page.textContent('.tiles'), /1 runs/);
  // second run so the chart appears
  await page.goto(base + '#/'); await page.locator('.routine', { hasText: 'Zed' }).locator('.start').click(); await page.waitForSelector('.ring');
  await page.click('text=Done ✓'); await page.click('text=Done ✓'); await page.waitForSelector('.summary');
  await page.goto(base + '#/stats'); await page.click('.link-card'); await page.waitForSelector('svg.chart'); await shot(page, 'stats');
  assert.deepEqual(errors, []);
});

await step('run survives reload (crash-safe) and checklist ticking works', async () => {
  const { page } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); await page.locator('.checklist li').nth(2).locator('.cb').click();
  await page.waitForTimeout(300); await page.reload(); await page.waitForSelector('.ring');
  assert.ok(await page.locator('.checklist li.done').count() >= 1);
});

await step('share code round-trips through the import dialog', async () => {
  const { page, ctx } = await newPage(); await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(base); await page.waitForSelector('.routine');
  await page.locator('.routine').first().locator('button[aria-label="Share"]').click(); await page.waitForSelector('textarea.code');
  const code = await page.inputValue('textarea.code'); assert.match(code, /^M[12]\./); await page.keyboard.press('Escape');
  await page.click('.toolbar >> text=Import'); await page.fill('dialog textarea', `check this out ${code}`); await page.click('dialog footer button');
  await page.waitForFunction(() => document.querySelectorAll('.routine').length === 3);
  await page.click('.toolbar >> text=Import'); await page.fill('dialog textarea', 'M1.@@@'); await page.click('dialog footer button');
  await page.waitForSelector('dialog .err');
});

await step('settings: theme toggle, APK link points at the latest release, guide renders', async () => {
  const { page, errors } = await newPage(); await page.goto(base + '#/settings'); await page.waitForSelector('h1');
  const href = await page.getAttribute('a[download]', 'href'); assert.equal(href, 'https://github.com/ohadsam/morning_organizer/releases/latest/download/morning-organizer.apk');
  await page.selectOption('select >> nth=1', 'dark'); assert.equal(await page.getAttribute('html', 'data-theme'), 'dark'); await shot(page, 'settings-dark');
  await page.goto(base + '#/guide'); await page.waitForSelector('.guide'); assert.ok(await page.locator('.guide').count() >= 8); assert.deepEqual(errors, []);
});

await step('no horizontal scroll at 320px wide', async () => {
  const { page } = await newPage({ ctx: { viewport: { width: 320, height: 640 } } }); await page.goto(base); await page.waitForSelector('.routine');
  for (const h of ['#/', '#/stats', '#/settings', '#/guide']) { await page.goto(base + h); await page.waitForTimeout(150); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow on ${h}`); }
});

await browser.close(); server.close();
console.log(failures ? `\n${failures} e2e step(s) failed` : '\nall e2e steps passed'); process.exit(failures ? 1 : 0);

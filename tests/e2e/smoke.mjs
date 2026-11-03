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
const step = async (name, fn) => { try { await fn(); console.log('✓', name); } catch (e) { failures++; console.error('✗', name, '\n  ', e.message.split('\n').slice(0, 4).join(' / '), '\n  ', (e.stack.split('\n').find((l) => l.includes('smoke.mjs')) || '').trim()); } };

const dismissWelcome = async (page) => { try { await page.waitForSelector('dialog.welcome', { timeout: 4000 }); await page.click('dialog.welcome footer button >> nth=0'); await page.waitForSelector('dialog.welcome', { state: 'detached' }); } catch { /* not shown */ } };
// The app is Hebrew/RTL by default; most steps below assert English text, so switch the language through the real Settings UI first.
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: opts.locale || 'en-US', serviceWorkers: 'block', ...opts.ctx });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (opts.clock) await page.clock.install();
  if (opts.lang !== 'he') {
    await page.goto(base + '#/settings'); await dismissWelcome(page); await page.waitForSelector('select');
    await page.selectOption('select >> nth=0', 'en'); await page.waitForFunction(() => document.documentElement.lang === 'en'); await page.waitForTimeout(150);
  }
  return { page, errors, ctx };
}
const shot = async (page, name) => { if (shots) await page.screenshot({ path: `${shots}/${name}.png` }); };

await step('boots in English, seeds sample routines, no console errors', async () => {
  const { page, errors } = await newPage(); await page.goto(base);
  await page.waitForSelector('.routine'); assert.equal(await page.locator('.routine').count(), 2);
  assert.equal(await page.getAttribute('html', 'dir'), 'ltr'); assert.deepEqual(errors, []); await shot(page, 'home-en');
});

await step('Hebrew + RTL is the default (fresh install), welcome dialog personalises, fully translated', async () => {
  const { page, errors } = await newPage({ lang: 'he', locale: 'en-US' }); await page.goto(base);
  await page.waitForSelector('dialog.welcome'); assert.equal(await page.getAttribute('html', 'dir'), 'rtl'); assert.equal(await page.getAttribute('html', 'lang'), 'he');
  await shot(page, 'welcome-he'); await page.fill('dialog.welcome input[type=text]', 'נועה'); await page.fill('dialog.welcome input[type=number]', '8'); await page.selectOption('dialog.welcome select', 'female');
  await page.click('dialog.welcome footer button >> nth=1'); await page.waitForSelector('dialog.welcome', { state: 'detached' });
  await page.waitForSelector('.routine'); assert.match(await page.textContent('.hero'), /בוקר טוב, נועה/);
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
  const { page, errors } = await newPage({ clock: true }); await page.goto(base); await page.waitForSelector('.routine');
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

await step('v1.1: name + buddy, encouragement bubble, progress widget, pause, active-run card, stars/streak, keep-awake chip', async () => {
  const { page, errors } = await newPage({ clock: true }); await page.goto(base + '#/settings'); await page.waitForSelector('h1');
  await page.fill('input[aria-describedby="pn-hint"]', 'Dana'); await page.dispatchEvent('input[aria-describedby="pn-hint"]', 'change');
  await page.click('button[aria-label="🐼"]'); await page.waitForTimeout(100);
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); assert.match(await page.textContent('.hero'), /Good morning, Dana/);
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring');
  assert.match(await page.textContent('.bubble'), /🐼/); assert.ok(await page.locator('.bubble .bt').textContent(), 'bubble text');
  assert.equal(await page.locator('.pw .seg').count(), 6); assert.equal(await page.getAttribute('.pw-track', 'aria-valuenow'), '0');
  await page.click('.pause-btn'); assert.ok(await page.locator('.ring.paused').count()); assert.ok(await page.isVisible('.paused-badge'));
  await page.clock.runFor(30_000); await page.click('.pause-btn'); assert.ok(!(await page.locator('.ring.paused').count()));
  assert.match(await page.textContent('.pw-foot'), /⏸ 0:30/); await shot(page, 'run-progress');
  await page.click('text=Done ✓'); assert.equal(await page.locator('.pw .seg.done').count(), 1); assert.notEqual(await page.getAttribute('.pw-track', 'aria-valuenow'), '0');
  await page.goto(base + '#/'); await page.waitForSelector('.active-run'); await shot(page, 'home-active');
  assert.equal(await page.locator('.active-run .pw-track').count(), 1);
  await page.click('.active-run .primary'); await page.waitForSelector('.ring'); assert.equal(await page.locator('.pw .seg.done').count(), 1);
  for (let i = 0; i < 5; i++) await page.click('text=Done ✓');
  await page.waitForSelector('.summary'); assert.equal(await page.locator('.star.on').count(), 3); assert.ok(await page.locator('.confetti').count());
  assert.match(await page.textContent('.summary'), /Paused/); await shot(page, 'summary-stars');
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); assert.match(await page.textContent('.chips'), /1-day streak/); assert.match(await page.textContent('.chips'), /3 stars/);
  await page.click('.btn-chip'); await page.waitForSelector('.btn-chip[aria-pressed="true"]'); assert.match(await page.textContent('.btn-chip'), /Screen stays on/);
  assert.deepEqual(errors, []);
});

await step('Hebrew encouragement without a name reads naturally and icons are shown', async () => {
  const { page, errors } = await newPage({ lang: 'he' }); await page.goto(base); await dismissWelcome(page); await page.waitForSelector('.routine');
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.bubble .bt');
  const txt = await page.textContent('.bubble .bt'); assert.ok(!/[{}]|undefined|null/.test(txt), txt); assert.ok(await page.locator('.ring .ti').textContent());
  await shot(page, 'run-he'); assert.deepEqual(errors, []);
});

await step('v1.2: mindful coach - tip button (task + main), age/gender personalisation, auto tips when late/stuck, voice settings', async () => {
  const { page, errors } = await newPage({ clock: true }); await page.goto(base + '#/settings'); await page.waitForSelector('h1');
  await page.fill('input[aria-describedby="pn-hint"]', 'Dana'); await page.dispatchEvent('input[aria-describedby="pn-hint"]', 'change');
  await page.fill('input[type=number][max="120"]', '8'); await page.dispatchEvent('input[type=number][max="120"]', 'change');
  await page.selectOption('.two select', 'female'); await page.waitForTimeout(150);
  await page.locator('label.switch', { hasText: 'Automatic tips' }).locator('input').check(); await page.waitForTimeout(150);
  assert.ok(await page.locator('text=Voice style').count(), 'voice controls present'); await shot(page, 'settings-coach');
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring');
  assert.ok(await page.locator('.checklist .tip-btn').count() >= 5, 'per-task tip buttons');
  await page.click('.tip-main'); await page.waitForSelector('.coach-card'); const t1 = await page.textContent('.coach-text'); assert.ok(t1.length > 20 && !/[{}]/.test(t1), t1);
  await page.click('text=Another tip'); const t2 = await page.textContent('.coach-text'); assert.notEqual(t1, t2); await shot(page, 'coach-tip');
  await page.locator('.checklist .tip-btn').nth(2).click(); assert.match(await page.textContent('.coach-head'), /Tip for/);
  await page.click('.coach-card .icon-btn'); assert.ok(!(await page.isVisible('.coach-card')));
  await page.clock.runFor(137_000); await page.waitForSelector('.coach-card'); // 2:00 task + 15 s overtime -> automatic tip
  await page.click('.coach-card .icon-btn'); await page.click('.pause-btn'); await page.clock.runFor(125_000);
  await page.waitForSelector('.coach-card'); assert.deepEqual(errors, []);
});

await step('Hebrew coach tips follow gender (no raw tokens, slash form only for neutral)', async () => {
  const { page, errors } = await newPage({ lang: 'he' }); await page.goto(base); await dismissWelcome(page); await page.waitForSelector('.routine');
  await page.goto(base + '#/settings'); await page.waitForSelector('.two select'); await page.selectOption('.two select', 'male'); await page.waitForTimeout(150);
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring');
  for (let i = 0; i < 8; i++) { await page.click('.tip-main'); const txt = await page.textContent('.coach-text'); assert.ok(!/[{}|]/.test(txt) && !/\/[א-ת]/.test(txt), txt); }
  await shot(page, 'coach-he'); assert.deepEqual(errors, []);
});

await step('voice: encouragement is spoken with the chosen voice style and the personalised text; text-only when off', async () => {
  const { page, errors } = await newPage();
  await page.addInitScript(() => {
    window.__spoken = [];
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [], speak(u) { window.__spoken.push({ text: u.text, pitch: u.pitch, rate: u.rate, lang: u.lang }); }, cancel() {}, addEventListener() {}, removeEventListener() {} } });
  });
  await page.reload(); await page.waitForSelector('h1'); // init script applies on the next document load
  await page.fill('input[aria-describedby="pn-hint"]', 'Dana'); await page.dispatchEvent('input[aria-describedby="pn-hint"]', 'change');
  await page.locator('label.switch', { hasText: 'Read encouragement aloud' }).locator('input').check();
  await page.selectOption('label.field:has-text("Voice style") select', 'robot'); await page.waitForTimeout(200);
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.bubble .bt');
  const spoken = await page.evaluate(() => window.__spoken); assert.ok(spoken.length >= 1, 'start message spoken');
  const bubbleText = (await page.textContent('.bubble .bt')).replace(/\s*\p{Extended_Pictographic}\uFE0F?\s*$/u, '').trim();
  assert.equal(spoken[0].text.trim(), bubbleText); assert.equal(spoken[0].pitch, 0.1); assert.equal(spoken[0].lang, 'en-US');
  await page.goto(base + '#/settings'); await page.locator('label.switch', { hasText: 'Read encouragement aloud' }).locator('input').uncheck(); await page.waitForTimeout(150);
  await page.evaluate(() => { window.__spoken.length = 0; }); await page.goto(base + '#/'); await page.waitForSelector('.active-run'); await page.click('.active-run .primary'); await page.waitForSelector('.ring');
  await page.click('text=Done ✓'); await page.waitForSelector('.bubble .bt'); assert.equal((await page.evaluate(() => window.__spoken)).length, 0, 'text-only when voice is off');
  assert.deepEqual(errors, []);
});

await step('manual sync: export a sync code on one "device", import (merge) on another, then replace; settings come along', async () => {
  const a = await newPage(); await a.ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await a.page.goto(base + '#/settings'); await a.page.waitForSelector('h1');
  await a.page.fill('input[aria-describedby="pn-hint"]', 'Dana'); await a.page.dispatchEvent('input[aria-describedby="pn-hint"]', 'change'); await a.page.waitForTimeout(150);
  await a.page.goto(base + '#/'); await a.page.waitForSelector('.routine'); await a.page.click('text=New routine'); await a.page.waitForSelector('.task');
  await a.page.fill('.field input[type=text]', 'Synced routine'); await a.page.waitForTimeout(500);
  await a.page.goto(base + '#/settings'); await a.page.click('text=Copy sync code'); await a.page.waitForTimeout(200);
  const code = await a.page.evaluate(() => navigator.clipboard.readText()); assert.match(code, /^MB1\./);
  const b = await newPage(); await b.page.goto(base + '#/settings'); await b.page.waitForSelector('h1');
  await b.page.click('text=Import backup'); await b.page.fill('dialog textarea', `code: ${code}`); await b.page.click('dialog footer button');
  await b.page.waitForSelector('.toast:has-text("Added 1")'); await b.page.goto(base + '#/'); await b.page.waitForSelector('.routine');
  assert.ok(await b.page.locator('.routine', { hasText: 'Synced routine' }).count()); assert.equal(await b.page.locator('.routine').count(), 3, 'samples have fixed ids, so merge does not duplicate them');
  await b.page.goto(base + '#/settings'); assert.equal(await b.page.inputValue('input[aria-describedby="pn-hint"]'), 'Dana');
  await b.page.click('text=Import backup'); await b.page.fill('dialog textarea', code); await b.page.check('input[value=replace]'); await b.page.click('dialog footer button'); await b.page.click('dialog:has-text("Replace all") footer button >> nth=1');
  await b.page.waitForSelector('.toast:has-text("Added 3")'); await b.page.goto(base + '#/'); await b.page.waitForSelector('.routine'); assert.equal(await b.page.locator('.routine').count(), 3, 'replace mirrors the source');
  await b.page.click('text=Import'); await b.page.fill('dialog textarea', 'MB1.garbage-garbage-garbage'); assert.ok(true);
  assert.deepEqual(a.errors, []); assert.deepEqual(b.errors, []);
});

await step('v1.4: leave-by line, quick/calm pace, accessibility settings, task photo, announce channel', async () => {
  const { page, errors } = await newPage({ clock: true }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  // leave-by + suggest start in the editor
  await page.locator('.routine-main').first().click(); await page.waitForSelector('.task');
  await page.fill('input[type=time][aria-label="Leave by"]', '23:59'); await page.click('text=Suggest start time'); await page.waitForSelector('.toast:has-text("Start by")');
  // photo on the first task: a real PNG goes through canvas resize
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGO4Y2NDEmIY1TCqYfhqAABhl1QQ50OvrwAAAABJRU5ErkJggg==', 'base64');
  await page.locator('.task-icon').first().click(); await page.setInputFiles('dialog input[type=file]', { name: 'p.png', mimeType: 'image/png', buffer: png });
  await page.waitForSelector('.task-icon img'); await page.waitForTimeout(500);
  await page.goto(base + '#/settings'); await page.waitForSelector('h1');
  await page.selectOption('label.field:has-text("Text size") select', '150'); await page.waitForFunction(() => getComputedStyle(document.body).fontSize === '24px');
  await page.locator('label.switch', { hasText: 'Color-blind' }).locator('input').check(); await page.waitForFunction(() => document.documentElement.dataset.colors === 'safe');
  await page.locator('label.switch', { hasText: 'High contrast' }).locator('input').check(); await page.waitForFunction(() => document.documentElement.dataset.contrast === 'high');
  await page.locator('label.switch', { hasText: 'Screen-reader' }).locator('input').check();
  await page.selectOption('label.field:has-text("Pace") select', 'quick'); await page.waitForTimeout(200);
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring');
  assert.ok(await page.locator('.ring .ti img').count(), 'photo shown in the run'); assert.match(await page.textContent('.leave-line'), /Leave 11:59/);
  assert.match(await page.textContent('.big-time'), /1:2\d/, 'quick = 2:00 -> 1:25 (-30%, 5 s steps)'); assert.ok((await page.textContent('#sr')).length > 3, 'screen-reader live region announced something');
  // calm mode: finish this run, switch to Calm, overrun a task - no pressure wording and no automatic tips
  await page.click('button.danger:has-text("Finish")'); await page.click('dialog footer button >> nth=1'); await page.waitForSelector('.summary');
  await page.goto(base + '#/settings'); await page.selectOption('label.field:has-text("Pace") select', 'calm'); await page.waitForTimeout(200);
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring.calm');
  await page.clock.runFor(125_000); await page.waitForFunction(() => document.querySelector('.ring .sub')?.textContent === 'take your time');
  assert.ok(!(await page.locator('.coach-card').count()), 'no automatic tips under calm');
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

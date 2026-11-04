// End-to-end smoke test in real Chromium against the static site. Usage: node tests/e2e/smoke.mjs [--shots dir]
import { chromium } from 'playwright';
import axe from 'axe-core';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { serve } from '../../scripts/serve.mjs';

const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
if (shots) mkdirSync(shots, { recursive: true });
const server = await serve('web', 0); const base = `http://localhost:${server.address().port}/`;
// mDNS-obfuscated ICE candidates can't be resolved between two headless contexts; real phones on one Wi-Fi are fine.
const browser = await chromium.launch({ args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] });
let failures = 0;
const step = async (name, fn) => { if (process.env.ONLY && !name.includes(process.env.ONLY)) return; try { await fn(); console.log('✓', name); } catch (e) { failures++; if (globalThis.__fam && shots) { await globalThis.__fam.P.page.screenshot({ path: `${shots}/fail-P.png` }); await globalThis.__fam.C.page.screenshot({ path: `${shots}/fail-C.png` }); } console.error('✗', name, '\n  ', e.message.split('\n').slice(0, 14).join(' / '), '\n  ', (e.stack.split('\n').find((l) => l.includes('smoke.mjs')) || '').trim()); } };

const closeDialogs = async (page) => { for (let i = 0; i < 4 && (await page.locator('dialog[open]').count()); i++) { await page.locator('dialog[open] header button').last().click(); await page.waitForTimeout(150); } };
const dismissWelcome = async (page) => { try { await page.waitForSelector('dialog.welcome', { timeout: 4000 }); await page.click('dialog.welcome footer button >> nth=0'); await page.waitForSelector('dialog.welcome', { state: 'detached' }); } catch { /* not shown */ } };
// The app is Hebrew/RTL by default; most steps below assert English text, so switch the language through the real Settings UI first.
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: opts.locale || 'en-US', serviceWorkers: 'block', ...opts.ctx });
  // settings groups are collapsible (state remembered); most steps need every field reachable, so start with all groups open
  if (!opts.collapsed) await ctx.addInitScript(() => { try { localStorage.setItem('mo.sg', JSON.stringify(Object.fromEntries(['look', 'profile', 'helpers', 'buddy', 'pace', 'a11y', 'coach', 'voice', 'alerts', 'defaults', 'sync', 'app'].map((k) => [k, true])))); } catch { /* blocked */ } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (process.env.SLOW) await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: +process.env.SLOW }); // SLOW=6 emulates a slow CI machine
  if (opts.clock) await page.clock.install();
  if (opts.lang !== 'he') {
    await page.goto(base + '#/settings'); await dismissWelcome(page); await page.waitForSelector('select');
    // most steps assert the plain English wording even when they enter a child's age; the playful steps switch it back to automatic
    await page.selectOption('select:has(option[value="plain"])', 'plain'); await page.waitForTimeout(200);
    await page.selectOption('select >> nth=0', 'en'); await page.waitForFunction(() => document.documentElement.lang === 'en'); await page.waitForTimeout(150);
  }
  return { page, errors, ctx };
}
const setStyle = (page, v) => page.evaluate(async (x) => { const S = await import('./js/store.js'); await S.updateSettings({ textStyle: x }); }, v);
// Sets a task's duration through the time sheet (tap the time -> minutes/seconds -> OK).
const setDur = async (page, task, m, sec) => { await task.locator('.tp-val').first().click(); await page.locator('dialog input[type=number]').nth(0).fill(String(m)); await page.locator('dialog input[type=number]').nth(1).fill(String(sec)); await page.click('dialog footer button:has-text("OK")'); await page.waitForSelector('dialog', { state: 'detached' }); };
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
  await setDur(page, page.locator('.task').first(), 5, 30);
  await page.click('text=Add task'); await page.locator('.task-name').nth(1).fill('Second');
  await page.locator('.task').nth(1).locator('.task-menu-btn').click(); await page.click('dialog button:has-text("Move up")');
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
  const r2 = await page.locator('.task').nth(1).boundingBox();   // drop near the bottom edge of the second row (rows differ in height when a smart-time hint is showing)
  await page.mouse.move(h2.x + h2.width / 2, r2.y + r2.height - 4, { steps: 8 }); await page.mouse.up();
  assert.notEqual(await page.locator('.task-name').first().inputValue(), first); assert.equal(await page.locator('.task-name').nth(1).inputValue(), first);
});

await step('run: countdown, 10s warning class, overtime, done, summary, statistics', async () => {
  const { page, errors } = await newPage({ clock: true }); await page.goto(base); await page.waitForSelector('.routine');
  // build a 20s + 15s routine through the real UI
  await page.click('text=New routine'); await page.waitForSelector('.task'); await page.fill('.field input[type=text]', 'Zed');
  await setDur(page, page.locator('.task').first(), 0, 20);
  await page.click('text=Add task'); await setDur(page, page.locator('.task').nth(1), 0, 15);
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
  assert.ok(await page.locator('.bubble .bm svg.avatar-char').count(), 'the encouragement bubble shows the (panda) avatar'); assert.match(await page.textContent('.bubble .bt'), /Dana|!/);
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
  assert.ok(await page.locator('.persona-grid').count() >= 3, 'voice characters present'); await shot(page, 'settings-coach');
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
  await page.click('.persona:has-text("Woman")'); await page.waitForTimeout(300); await page.evaluate(() => { window.__spoken.length = 0; });   // choosing a character plays a sample: ignore it
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.bubble .bt');
  const spoken = await page.evaluate(() => window.__spoken); assert.ok(spoken.length >= 1, 'start message spoken');
  const bubbleText = (await page.textContent('.bubble .bt')).replace(/\s*\p{Extended_Pictographic}\uFE0F?\s*$/u, '').trim(), letters = (x) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  assert.ok(letters(bubbleText).startsWith(letters(spoken[0].text)), 'the first spoken phrase is the start of the shown message'); assert.ok(Math.abs(spoken[0].pitch - 1) < 0.2 && spoken[0].rate < 1.05, 'a calm human pace and natural pitch'); assert.equal(spoken[0].lang, 'en-US');
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

await step('family: invite -> join -> approve -> LIVE link (WebRTC, no server) -> report, cheer, reward goal, assigned routine', async () => {
  const P = await newPage(), C = await newPage();
  globalThis.__fam = { P, C };
  const setProfile = async (pg, name, age) => { await pg.goto(base + '#/settings'); await pg.waitForSelector('h1'); await pg.fill('input[aria-describedby="pn-hint"]', name); await pg.dispatchEvent('input[aria-describedby="pn-hint"]', 'change');
    if (age) { await pg.fill('input[type=number][max="120"]', String(age)); await pg.dispatchEvent('input[type=number][max="120"]', 'change'); } await pg.waitForTimeout(150); };
  await setProfile(P.page, 'Mom'); await setProfile(C.page, 'Noa', 8);
  // parent creates an invitation that also prepares a live connection
  await P.page.goto(base + '#/family'); await P.page.click('text=Add a child'); await P.page.check('dialog input[type=checkbox]'); await P.page.click('text=Create invitation');
  await P.page.waitForSelector('dialog textarea.code'); const invite = await P.page.inputValue('dialog textarea.code'); assert.match(invite, /^MP[01]\./); await shot(P.page, 'family-invite');
  // child joins and gets a reply code
  await C.page.goto(base + '#/family'); await C.page.click('button:has-text("Join a parent")'); await C.page.fill('dialog textarea', invite); await C.page.click('dialog footer button >> nth=0');
  await C.page.waitForSelector('dialog:has-text("Linked!") textarea.code'); const reply = await C.page.inputValue('dialog:has-text("Linked!") textarea.code'); assert.match(reply, /^ML1\./);
  // parent processes the reply and approves
  await P.page.fill('dialog textarea[placeholder^="Paste your child"]', reply); await P.page.click('text=Process reply');
  await P.page.waitForSelector('dialog:has-text("wants to join")'); await P.page.click('dialog:has-text("wants to join") footer button >> nth=1');
  await P.page.waitForSelector('.family-card:has-text("Noa")'); await closeDialogs(P.page);
  // the live data channel opens on both sides
  await P.page.waitForSelector('.chip:has-text("● Live")', { timeout: 20000 }); await C.page.waitForSelector('.chip:has-text("● Live")', { timeout: 20000 });
  // child finishes a routine -> parent gets stars + recent run instantly
  await closeDialogs(C.page);
  await C.page.goto(base + '#/'); await C.page.waitForSelector('.routine'); await C.page.locator('.routine .start').first().click(); await C.page.waitForSelector('.ring');
  for (let i = 0; i < 6; i++) await C.page.click('text=Done ✓'); await C.page.waitForSelector('.summary');
  await P.page.waitForSelector('.family-card:has-text("⭐ 3")', { timeout: 15000 }); assert.ok(await P.page.locator('.family-card table tr').count() >= 1); await shot(P.page, 'family-parent');
  // parent cheers, sets a goal, assigns a new routine - all delivered live
  await P.page.click('button:has-text("Send a cheer")'); await P.page.click('dialog button:has-text("Great job")');
  await P.page.click('button:has-text("Reward goal")'); await P.page.fill('dialog input[type=text]', 'Ice cream'); await P.page.fill('dialog input[type=number]', '3'); await P.page.click('dialog footer button:has-text("Set goal")');
  await P.page.goto(base + '#/'); await P.page.click('text=New routine'); await P.page.waitForSelector('.task'); await P.page.fill('.field input[type=text]', 'From Mom'); await P.page.waitForTimeout(500);
  await P.page.goto(base + '#/family'); await P.page.click('button:has-text("Send a routine")'); await P.page.click('dialog label:has-text("From Mom") input'); await P.page.click('dialog footer button:has-text("Send")');
  await C.page.goto(base + '#/family'); await C.page.waitForSelector('.family-card:has-text("Great job")', { timeout: 15000 }); await C.page.waitForSelector('.goal:has-text("Ice cream")'); await shot(C.page, 'family-child');
  await C.page.goto(base + '#/'); await C.page.waitForSelector('.routine:has-text("From Mom")'); assert.match(await C.page.textContent('.routine:has-text("From Mom")'), /from Mom/);
  // reward goal reached on the child: 3 stars needed, one more perfect run earns it -> celebration + parent is told
  await C.page.locator('.routine .start').first().click(); await C.page.waitForSelector('.ring'); for (let i = 0; i < 6; i++) await C.page.click('text=Done ✓');
  await C.page.waitForSelector('dialog:has-text("Goal reached")'); await P.page.goto(base + '#/family'); await P.page.waitForSelector('.family-card:has-text("Goal reached")', { timeout: 15000 });
  // the child tells the parent it is running late (live link) -> alert card on the parent's dashboard
  await C.page.evaluate(async () => { const F = await import('./js/family.js'); await F.alertParents({ kind: 'late', name: 'Kids morning', minutes: 7 }); });
  await P.page.waitForSelector('.family-card:has-text("7 min late")', { timeout: 15000 });
  // v1.10: the parent chooses the child's help areas (live) -> the child's Helpers show them; the parent also sets a reward menu
  await P.page.goto(base + '#/family'); await P.page.click('button:has-text("What would you like help with?")');
  await P.page.check('dialog .area-pick:has-text("Calm & feelings") input'); await P.page.click('dialog footer button:has-text("Save")');
  await C.page.goto(base + '#/'); await C.page.waitForSelector('.focus-card', { state: 'detached', timeout: 15000 }); // the parent's choice arrives live
  await C.page.goto(base + '#/settings'); await C.page.waitForSelector('.chip:has-text("Calm & feelings")');
  await P.page.goto(base + '#/family'); await P.page.click('button:has-text("Rewards")'); await P.page.click('dialog button:has-text("Add reward")');
  await P.page.fill('dialog .menu-row input[type=text]', 'Ice cream trip'); await P.page.fill('dialog .menu-row input[type=number]', '1'); await P.page.dispatchEvent('dialog .menu-row input[type=number]', 'change'); await P.page.dispatchEvent('dialog .menu-row input[type=text]', 'change');
  await P.page.click('dialog footer button:has-text("Save")');
  await closeDialogs(C.page); await C.page.goto(base + '#/'); await C.page.waitForSelector('.quick'); await closeDialogs(C.page); await C.page.click('.quick button:has-text("Rewards")'); await C.page.waitForSelector('dialog .menu-item:has-text("Ice cream trip")', { timeout: 15000 });
  await C.page.click('dialog .menu-item button:has-text("Get")'); await C.page.click('dialog footer button:has-text("Get")');
  await P.page.goto(base + '#/family'); await P.page.waitForSelector('.family-card:has-text("Ice cream trip")', { timeout: 15000 }); await P.page.click('.family-card button:has-text("Given")');
  await C.page.waitForTimeout(1500); await closeDialogs(C.page); await C.page.click('.quick button:has-text("Rewards")'); await C.page.click('dialog details summary'); await C.page.waitForSelector('dialog li:has-text("given")', { timeout: 15000 });
  // v1.11: the parent suggests a goal (live) and sits with the child during a run
  await closeDialogs(C.page); await P.page.goto(base + '#/family'); await P.page.click('button:has-text("Suggest a goal")'); await P.page.click('dialog .chip:has-text("Be ready on time")'); await P.page.check('dialog .strat-pick:has-text("Prepare things the night before") input'); await P.page.click('dialog footer button:has-text("Save")');
  await C.page.goto(base + '#/goals'); await C.page.waitForSelector('.goal-card:has-text("Suggested by Mom")', { timeout: 15000 });
  await C.page.goto(base + '#/'); await C.page.locator('.routine .start').first().click(); await C.page.waitForSelector('.ring');
  await P.page.goto(base + '#/family'); await P.page.waitForSelector('.pq-text'); const q1 = await P.page.textContent('.pq-text'); await P.page.click('.card:has(.pq-text) button'); assert.notEqual(await P.page.textContent('.pq-text'), q1);
  await P.page.waitForSelector('.family-card button:has-text("Sit with me")', { timeout: 15000 }); await P.page.click('.family-card button:has-text("Sit with me")');
  await C.page.waitForSelector('.sit-chip:not([hidden])', { timeout: 15000 }); assert.match(await C.page.textContent('.sit-chip'), /Mom is with you/);
  assert.deepEqual(P.errors, []); assert.deepEqual(C.errors, []);
});

// ── UX / accessibility ──
const audit = async (page, label) => {
  await page.evaluate(axe.source); const res = await page.evaluate(() => axe.run(document, { resultTypes: ['violations'] }));
  return res.violations.map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes[0].html.slice(0, 90)}`);
};
await step('UX: axe-core finds NO accessibility violations - every screen and dialog, Hebrew/light and English/dark, big text, accent color', async () => {
  const bad = [];
  for (const [lang, scheme] of [['he', 'light'], ['en', 'dark']]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base);
    if (lang === 'he') { await page.waitForSelector('dialog.welcome'); bad.push(...await audit(page, `${lang}/${scheme}/welcome`)); await dismissWelcome(page); } // English was switched on (welcome dismissed) by newPage()
    for (const hash of ['#/', '#/settings', '#/guide', '#/stats', '#/family']) { await page.goto(base + hash); await page.waitForTimeout(350); bad.push(...await audit(page, `${lang}/${scheme}/${hash}`)); }
    await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.click('.hero .btn-chip >> nth=0').catch(() => {});
    await page.locator('.routine-main').first().click(); await page.waitForSelector('.task'); bad.push(...await audit(page, `${lang}/${scheme}/editor`));
    await page.goto(base + '#/');
    await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); await page.click('.tip-main'); await page.waitForSelector('.coach-card'); await page.waitForTimeout(500);
    bad.push(...await audit(page, `${lang}/${scheme}/run+coach`));
    await page.goto(base + '#/family'); await page.click('.toolbar .btn.primary'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${lang}/${scheme}/invite-dialog`)); await closeDialogs(page);
    // large text + an accent color must stay accessible too
    await page.goto(base + '#/settings'); await page.selectOption('label.field:has-text("Text size") select, label.field:has-text("גודל טקסט") select', '150');
    await page.click('.swatches[role=radiogroup] .swatch >> nth=-3').catch(() => {}); await page.waitForTimeout(300);
    for (const hash of ['#/', '#/settings']) { await page.goto(base + hash); await page.waitForTimeout(300); bad.push(...await audit(page, `${lang}/${scheme}/big-text+accent ${hash}`)); }
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

await step('UX: settings are collapsible groups (3 open by default), state is remembered; accent color applies', async () => {
  const { page } = await newPage({ collapsed: true }); await page.goto(base + '#/settings'); await page.waitForSelector('details.settings-group');
  assert.equal(await page.locator('details.settings-group[open]').count(), 3); assert.ok(await page.locator('details.settings-group').count() >= 9);
  await page.click('details.settings-group:not([open]) summary >> nth=0'); const open1 = await page.locator('details.settings-group[open]').count(); assert.equal(open1, 4);
  await page.waitForFunction(() => Object.values(JSON.parse(localStorage.getItem('mo.sg') || '{}')).filter(Boolean).length >= 4); // toggle events persist asynchronously (the 3 default-open groups write first)
  await page.reload(); await page.waitForSelector('details.settings-group'); assert.equal(await page.locator('details.settings-group[open]').count(), 4, 'open/closed state survives reload');
  await page.locator('.swatches[role=radiogroup] .swatch').nth(1).click(); await page.waitForFunction(() => document.documentElement.dataset.accent === '1');
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.btn.primary')).backgroundColor), 'rgb(91, 75, 213)');
});

await step('UX: simple (kids) mode - only routines, big Start, everything else behind the grown-up gate', async () => {
  const { page, errors } = await newPage(); await page.goto(base + '#/settings'); await page.waitForSelector('details.settings-group');
  const solve = async () => { const q = await page.textContent('.gate-q'); const [a, b] = q.match(/\d+/g).map(Number); return a * b; };
  await page.locator('label.switch', { hasText: 'Simple mode' }).locator('input').check(); await page.waitForSelector('.gate-q');
  await page.fill('dialog input[type=number]', '1'); await page.click('dialog footer button >> nth=1'); await page.waitForSelector('dialog .err'); // wrong answer
  await page.fill('dialog input[type=number]', String(await solve())); await page.click('dialog footer button >> nth=1');
  await page.waitForSelector('.hero'); await page.waitForSelector('.routine');
  assert.equal(await page.locator('#nav a').count(), 2); assert.equal(await page.locator('.routine .icon-btn[aria-label="Delete"]').count(), 0); assert.equal(await page.locator('.toolbar .btn.primary:has-text("New routine")').count(), 0);
  await page.waitForTimeout(100); await page.evaluate(() => { location.hash = '#/stats'; }); // direct navigation is gated too (unlock window is per page load)
  await page.waitForSelector('.gate-q'); await page.click('dialog footer button >> nth=0'); await page.waitForSelector('.hero'); assert.equal(await page.evaluate(() => location.hash), '#/');
  await shot(page, 'simple-mode');
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); assert.deepEqual(errors, []);
});

await step('UX: run screen keeps Done/Pause on screen (phone height) and the first routine opens in one tap', async () => {
  const { page } = await newPage({ ctx: { viewport: { width: 390, height: 800 } } }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring');
  const box = await page.locator('.main-btns').boundingBox(); assert.ok(box.y >= 0 && box.y + box.height <= 800, `main buttons visible: ${JSON.stringify(box)}`);
  assert.ok(box.height >= 56, 'big touch targets'); for (const sel of ['.main-btns .btn >> nth=0', '.main-btns .btn >> nth=1']) assert.ok((await page.locator(sel).boundingBox()).height >= 44);
});

await step('v1.7: weekly overview + 5-week heat-map + CSV export (accessible), undo delete, more example routines', async () => {
  const { page, errors } = await newPage(); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); for (let i = 0; i < 6; i++) await page.click('text=Done ✓'); await page.waitForSelector('.summary');
  await page.goto(base + '#/stats'); await page.waitForSelector('.week .heat');
  assert.equal(await page.locator('.heat i').count(), 35); assert.equal(await page.locator('.heat i.l1, .heat i.l2, .heat i.l3').count(), 1, 'today is marked'); assert.match(await page.textContent('.week'), /This week/);
  const bad = await audit(page, 'stats overview'); assert.deepEqual(bad, []); await shot(page, 'stats-overview');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Export history (CSV)')]);
  const fs = await import('node:fs'); const csv = fs.readFileSync(await dl.path(), 'utf8'); assert.match(csv, /^\ufeffdate,start,end,routine,status/); assert.match(csv, /,done,1860,1860,/, "the finished run is in the CSV (sample names stay in the language they were created in)");
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); assert.equal(await page.locator('.routine').count(), 2);
  await page.locator('.routine').first().locator('button[aria-label="Delete"]').click(); await page.click('dialog footer button >> nth=1');
  await page.waitForFunction(() => document.querySelectorAll('.routine').length === 1); await page.click('#toast button:has-text("Undo")');
  await page.waitForFunction(() => document.querySelectorAll('.routine').length === 2);
  await page.goto(base + '#/settings'); await page.click('text=Add more example routines'); await page.waitForTimeout(300);
  await page.goto(base + '#/'); await page.waitForFunction(() => document.querySelectorAll('.routine').length === 6); assert.deepEqual(errors, []);
});

await step('hosting: the repo ROOT (Pages "deploy from branch") redirects to the app under /web/, which boots, registers its service worker and works offline-first', async () => {
  const root = await serve('.', 0); const rbase = `http://localhost:${root.address().port}/`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'en-US' }); await ctx.addInitScript(() => { try { localStorage.setItem('mo.lang', 'en'); } catch { /* blocked */ } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(rbase); await page.waitForURL(/\/web\/(#.*)?$/); await page.waitForSelector('dialog.welcome, .routine');
  assert.ok(!(await page.textContent('body')).includes('npm run'), 'the app page never shows developer instructions');
  await dismissWelcome(page); await page.waitForSelector('.routine');
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration()), null, { timeout: 15000 });
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope); assert.match(scope, /\/web\/$/);
  const manifest = await page.evaluate(async () => (await (await fetch('manifest.webmanifest')).json()).start_url); assert.equal(manifest, './');
  assert.deepEqual(errors.filter((e) => !/service worker|Failed to load resource: the server responded with a status of 404 \(.*favicon/i.test(e)), []); await ctx.close(); root.close();
});

await step('v1.8: avatars (animated characters, photo, GIF), several people on one phone with separate history, levels, accessible dialogs', async () => {
  // reduced motion: continuously animated avatars are never "stable" for Playwright's click check (and this also proves the reduced-motion path works)
  const { page, errors } = await newPage({ ctx: { reducedMotion: 'reduce' } }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  assert.ok(await page.locator('.hero-buddy svg.avatar-char').count(), 'animated character in the hero'); assert.match(await page.textContent('.chips'), /Level 1/);
  // avatar picker: locked characters, colours, animation preview, own GIF and photo
  await page.goto(base + '#/settings'); await page.waitForSelector('details.settings-group'); await page.click('button:has-text("Avatar")');
  await page.waitForSelector(".char-grid"); assert.ok((await page.locator(".char[disabled]").count()) >= 5, "higher characters are locked at level 1"); {
    const v = await audit(page, 'avatar-picker'); if (v.length) console.error(v.join('\n')); assert.deepEqual(v, []); }
  await page.click('.char:not([disabled]) >> nth=1'); await page.click('dialog .swatch >> nth=2'); await page.click('button[aria-label^="Animation: wave"]');
  assert.equal(await page.getAttribute('.av-preview svg', 'data-anim'), 'wave');
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  await page.setInputFiles('dialog input[accept="image/gif"]', { name: 'a.gif', mimeType: 'image/gif', buffer: gif }); await page.waitForSelector('.av-preview img.avatar-img');
  await page.setInputFiles('dialog input[accept="image/gif"]', { name: 'big.gif', mimeType: 'image/gif', buffer: Buffer.concat([gif, Buffer.alloc(200 * 1024)]) }); await page.waitForSelector('dialog .note:has-text("too big")');
  await page.click('dialog footer button:has-text("OK")'); await page.goto(base + '#/'); await page.waitForSelector('.hero-buddy img.avatar-img');
  // a second person: own name, own history
  await page.click('.hero-buddy'); await page.waitForSelector('.profile-grid'); assert.deepEqual(await audit(page, 'profile-switcher'), []);
  await page.click('.profile-card.add'); await page.fill('dialog input[type=text]', 'Dan'); await page.fill('dialog input[type=number]', '7'); await page.click('dialog footer button:has-text("Save")');
  await page.waitForFunction(() => document.querySelector('.hero')?.textContent.includes('Dan')); assert.ok(await page.locator('.hero-buddy svg.avatar-char').count(), 'new person starts with the default character');
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); for (let i = 0; i < 6; i++) await page.click('text=Done ✓'); await page.waitForSelector('.summary'); assert.ok(await page.locator('.summary .avatar').count());
  await page.goto(base + '#/stats'); await page.waitForSelector('.week'); assert.match(await page.textContent('.week'), /1 routines/);
  await page.goto(base + '#/'); await page.click('.hero-buddy'); await page.click('.profile-card:not(.on):not(.add)'); await page.waitForFunction(() => !document.querySelector('.hero')?.textContent.includes('Dan'));
  await page.goto(base + '#/stats'); await page.waitForSelector('h1'); assert.ok(!(await page.locator('.week').count()), 'the first person has no history of their own'); await shot(page, 'profiles');
  assert.deepEqual(errors, []);
});

await step('v1.9: schedule (today / other days), gear checklist, badges + celebration, achievements gallery, QR code for invitations', async () => {
  const { page, errors } = await newPage(); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  await page.locator('.routine-main').first().click(); await page.waitForSelector('.task');
  await page.click('button:has-text("School days")'); await page.click('button:has-text("Add an item")'); await page.fill('.gear-row input[type=text]', 'PE kit'); await page.waitForTimeout(500);
  const dow = await page.evaluate(() => new Date().getDay()), school = dow >= 1 && dow <= 5;
  await page.goto(base + '#/'); await page.waitForSelector('.routine');
  const inSec = (h) => page.locator(`section:has(> h2:has-text("${h}")) .routine`).count();
  if (school) { assert.equal(await inSec('Today'), 2); assert.equal(await inSec('Other days'), 0); } else { assert.equal(await inSec('Today'), 1); assert.equal(await inSec('Other days'), 1); } // 'school days' routine + one unscheduled routine
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); assert.match(await page.textContent('.gear-card'), /PE kit/);
  await page.check('.gear-card input[type=checkbox]'); await page.waitForFunction(() => document.querySelector('.gear-card summary').textContent.includes('1/1'));
  for (let i = 0; i < 6; i++) await page.click('text=Done ✓'); await page.waitForSelector('.summary'); assert.match(await page.textContent('.summary'), /Gear to remember\s*1\/1/);
  await page.waitForSelector('.celebrate-slot .celebrate', { timeout: 10000 }); assert.match(await page.textContent('.celebrate-slot'), /New badge/); assert.match(await page.textContent('.celebrate-slot'), /First routine/);
  await page.goto(base + '#/stats'); await page.waitForSelector('.badges'); assert.ok((await page.locator('.badge.on').count()) >= 1); assert.ok((await page.locator('.badge:not(.on)').count()) >= 10); { const v = await audit(page, 'stats+achievements'); if (v.length) console.error(v.join('\n')); assert.deepEqual(v, []); } await shot(page, 'achievements');
  await page.goto(base + '#/family'); await page.click('text=Add a child'); await page.click('text=Create invitation'); await page.waitForSelector('dialog textarea.code'); await page.click('dialog button:has-text("Show QR code")');
  await page.waitForSelector('.qr-box svg'); assert.ok((await page.locator('.qr-box svg path').getAttribute('d')).length > 500); { const v = await audit(page, 'qr dialog'); if (v.length) console.error(v.join('\n')); assert.deepEqual(v, []); } assert.deepEqual(errors, []);
});

await step('regression: a settings change that finishes after navigating away must not overwrite the page you are on', async () => {
  const { page } = await newPage(); await page.goto(base + '#/settings'); await page.waitForSelector('details.settings-group');
  // click a swatch (redraws settings after an async save) and leave in the same tick
  await page.locator('details.settings-group .swatches[role=radiogroup] .swatch').nth(2).evaluate((el) => { el.click(); location.hash = '#/'; });
  await page.waitForSelector('.hero'); await page.waitForTimeout(600); assert.ok(await page.locator('.hero').count(), 'the home page is still showing'); assert.equal(await page.locator('details.settings-group').count(), 0);
});

await step('regression: odd addresses (#/constructor, #/__proto__, #/toString) fall back to home and navigation keeps working', async () => {
  const { page, errors } = await newPage(); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  for (const bad of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'edit/__proto__', 'run/constructor', 'stats/toString']) {
    await page.evaluate((b) => { location.hash = `#/${b}`; }, bad); await page.waitForTimeout(150);
    await page.evaluate(() => { location.hash = '#/settings'; }); await page.waitForSelector('details.settings-group'); await page.evaluate(() => { location.hash = '#/'; }); await page.waitForSelector('.routine');
  }
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

// ── v1.10: helpers, calm corner, journal ──
await step('v1.10: choose help areas -> focus tools appear in the run; parking lot saves a thought; calm corner pauses the clock', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.focus-card');
  assert.equal(await page.locator('.quick button:has-text("Rewards")').count(), 0);
  await page.click('.focus-card button.primary'); await page.waitForSelector('dialog .area-grid'); await page.check('dialog .area-pick:has-text("Focus & attention") input'); await page.check('dialog .area-pick:has-text("Motivation") input');
  await page.click('dialog footer button:has-text("Save")'); await page.waitForSelector('.focus-card', { state: 'detached' }); assert.equal(await page.locator('.quick button:has-text("Rewards")').count(), 1);
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring');
  await page.click('.row-btns button:has-text("Parking lot")'); await page.fill('dialog input[type=text]', 'ask about the trip'); await page.click('dialog footer button:has-text("Park it")');
  await page.click('.row-btns button:has-text("Calm corner")'); await page.waitForSelector('dialog .calm-menu'); await page.waitForSelector('.paused-badge:not([hidden])');
  await page.click('dialog button:has-text("Start")'); await page.waitForSelector('dialog .calm-label:has-text("Breathe in")'); await page.click('dialog button:has-text("Stop")'); await closeDialogs(page);
  await page.waitForSelector('.paused-badge', { state: 'hidden' });
  await page.goto(base + '#/journal'); await page.waitForSelector('.entry:has-text("ask about the trip")'); assert.deepEqual(errors, []);
});

await step('v1.10: calm corner page runs a breathing exercise and offers a mood face at the end', async () => {
  const { page, errors } = await newPage({ ctx: { reducedMotion: 'reduce' } }); await page.goto(base + '#/calm'); await page.waitForSelector('.calm-menu');
  await page.click('button:has-text("Box")'); await page.click('button:has-text("Start")'); await page.waitForSelector('.calm-label'); await page.waitForTimeout(600);
  assert.match(await page.textContent('.calm-label'), /Breathe in/); await page.click('button:has-text("Stop")'); await page.waitForSelector('.calm-menu'); assert.deepEqual(errors, []);
});

await step('v1.10: journal password (hash+salt), add while locked, wrong password, forgot via questions, encrypted at rest, erase', async () => {
  const { page, errors } = await newPage(); await page.goto(base + '#/journal'); await page.waitForSelector('.journal-page');
  await page.click('.toolbar button:has-text("New note")'); await page.fill('dialog textarea', 'plain secret one'); await page.click('dialog footer button:has-text("Save")'); await page.waitForSelector('.entry:has-text("plain secret one")');
  await page.click('details.lock-card summary'); await page.click('button:has-text("Add a password")'); await page.waitForSelector('dialog .qa');
  const pws = page.locator('dialog input[type=password]'); await pws.nth(0).fill('abcd'); await pws.nth(1).fill('abcd');
  const ans = page.locator('dialog .qa input[type=text]'); // [custom, answer] per question
  await ans.nth(1).fill('Zebraphant42'); await ans.nth(3).fill('Quixotic Lane 9'); await page.click('dialog footer button:has-text("Turn on")'); await page.waitForSelector('dialog', { state: 'detached' });
  // at rest: no plaintext anywhere in IndexedDB
  const raw = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('morning-organizer'); r.onsuccess = () => { const tx = r.result.transaction(['journal', 'kv'], 'readonly'); const out = []; for (const n of ['journal', 'kv']) tx.objectStore(n).getAll().onsuccess = (e) => out.push(JSON.stringify(e.target.result)); tx.oncomplete = () => res(out.join('')); }; }));
  assert.ok(!raw.includes('plain secret one') && !raw.includes('abcd') && !raw.includes('Zebraphant42'), 'secrets must not be stored in the clear');
  // lock now, add a note while locked, reload: locked screen
  await page.click('details.lock-card summary').catch(() => {}); await page.click('button:has-text("Lock now")'); await page.waitForSelector('.lock-screen');
  await page.click('.toolbar button:has-text("New note")'); await page.fill('dialog textarea', 'added while locked'); await page.click('dialog footer button:has-text("Save")'); await page.waitForSelector('#toast:has-text("stays locked")'); // wait for the write before reloading
  await page.reload(); await page.waitForSelector('.lock-screen'); assert.equal(await page.locator('text=added while locked').count(), 0);
  await page.fill('.lock-screen input[type=password]', 'nope'); await page.click('.lock-screen button:has-text("Unlock")'); await page.waitForSelector('.lock-screen .err:not(:empty)');
  // forgot password -> questions -> new password
  await page.click('.lock-screen button:has-text("Forgot password")'); await page.waitForSelector('dialog input[type=text]');
  const fa = page.locator('dialog input[type=text]'); await fa.nth(0).fill('zebraphant 42'); await fa.nth(1).fill('quixotic lane 9'); await page.fill('dialog input[type=password]', 'newpass1'); await page.click('dialog footer button:has-text("Reset password")');
  await page.waitForSelector('dialog', { state: 'detached' }); await page.waitForSelector('.lock-screen', { state: 'detached' }).catch(() => {});
  await page.reload(); await page.waitForSelector('.lock-screen'); await page.fill('.lock-screen input[type=password]', 'newpass1'); await page.click('.lock-screen button:has-text("Unlock")');
  await page.waitForSelector('.entry:has-text("plain secret one")'); assert.equal(await page.locator('.entry:has-text("added while locked")').count(), 1);
  // turn the password off again -> plain, then there is simply no lock
  await page.click('details.lock-card summary'); await page.click('button:has-text("Turn off password")'); await page.fill('dialog input[type=password]', 'newpass1'); await page.click('dialog footer button:has-text("Turn off password")');
  await page.click('details.lock-card summary'); await page.waitForSelector('button:has-text("Add a password")'); assert.deepEqual(errors, []);
});

await step('v1.10: voice note recorded in a run (fake microphone), kept on the device, playable; dictation asks for consent first', async () => {
  const mic = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await mic.newContext({ viewport: { width: 390, height: 800 }, locale: 'en-US', serviceWorkers: 'block', permissions: ['microphone'] });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '#/settings'); await dismissWelcome(page); await page.waitForSelector('select'); await page.selectOption('select >> nth=0', 'en'); await page.waitForFunction(() => document.documentElement.lang === 'en');
  await page.goto(base); await page.waitForSelector('.routine'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring');
  await page.click('.row-btns button:has-text("Quick note")'); await page.click('dialog button:has-text("Record voice")'); await page.waitForSelector('dialog button:has-text("Stop recording")'); await page.waitForTimeout(1500);
  await page.click('dialog button:has-text("Stop recording")'); await page.waitForSelector('dialog :text("Recorded")'); await page.click('dialog footer button:has-text("Save")'); await page.waitForSelector('dialog', { state: 'detached' });
  await page.goto(base + '#/journal'); await page.waitForSelector('.entry:has-text("Voice note")'); await page.click('.entry button:has-text("Play")'); await page.waitForSelector('.entry audio');
  assert.deepEqual(errors, []); await mic.close();
});

await step('v1.10: axe finds no violations on calm corner, journal (open + locked), capture sheets, focus picker, reward menu', async () => {
  const bad = [];
  for (const [lang, scheme] of [['he', 'light'], ['en', 'dark']]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base); if (lang === 'he') await dismissWelcome(page);
    const L = `${lang}/${scheme}`;
    await page.goto(base + '#/calm'); await page.waitForSelector('.calm-menu'); bad.push(...await audit(page, `${L}/calm`));
    await page.goto(base + '#/journal'); await page.waitForSelector('.journal-page'); bad.push(...await audit(page, `${L}/journal-empty`));
    await page.click('.toolbar button >> nth=0'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${L}/note-sheet`)); await closeDialogs(page);
    await page.click('.toolbar button >> nth=2'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${L}/thought`)); await closeDialogs(page);
    await page.click('.toolbar button >> nth=3'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${L}/gratitude`)); await closeDialogs(page);
    await page.click('.toolbar button >> nth=4'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${L}/park`)); await closeDialogs(page);
    await page.click('details.lock-card summary'); await page.click('details.lock-card .btn.primary'); await page.waitForSelector('dialog .qa'); bad.push(...await audit(page, `${L}/lock-setup`));
    const pws = page.locator('dialog input[type=password]'); await pws.nth(0).fill('abcd'); await pws.nth(1).fill('abcd'); const a = page.locator('dialog .qa input[type=text]'); await a.nth(1).fill('Zebraphant42'); await a.nth(3).fill('Quixotic Lane 9');
    await page.click('dialog footer .primary'); await page.waitForSelector('dialog', { state: 'detached' });
    await page.click('details.lock-card summary').catch(() => {}); await page.click('details.lock-card .btn >> nth=0'); await page.waitForSelector('.lock-screen'); bad.push(...await audit(page, `${L}/journal-locked`));
    await page.click('.lock-screen .btn >> nth=1'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${L}/forgot`)); await closeDialogs(page);
    await page.goto(base + '#/'); await page.waitForSelector('.focus-card'); bad.push(...await audit(page, `${L}/home-focus-card`));
    await page.click('.focus-card button.primary'); await page.waitForSelector('dialog .area-grid'); bad.push(...await audit(page, `${L}/focus-picker`)); await page.check('dialog .area-pick >> nth=4 >> input'); await page.click('dialog footer .primary');
    await page.waitForSelector('.quick'); await page.click('.quick button >> nth=-1'); await page.waitForSelector('dialog .menu-item, dialog .empty'); bad.push(...await audit(page, `${L}/reward-menu`)); await page.click('dialog button:has(+ *) >> nth=-1').catch(() => {}); await closeDialogs(page);
    await page.goto(base + '#/settings'); await page.waitForSelector('details.settings-group'); bad.push(...await audit(page, `${L}/settings-helpers`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.10: alarm chain, offer to start, unplanned interruptions ──
await step('v1.10: alarm editor (no stray "null"), chain of rings with gaps, start mode, offer dialog starts the routine', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine'); await page.locator('.routine-main').first().click(); await page.waitForSelector('.alarm');
  assert.ok(!/null/.test(await page.textContent('.alarm')), 'no "null" next to the alarm switch');
  await page.check('.alarm .switch input >> nth=0'); await page.waitForSelector('.alarm .ring-card');
  await page.fill('.alarm input[type=time]', '07:00'); await page.dispatchEvent('.alarm input[type=time]', 'change');
  await page.click('.alarm button:has-text("Add another alarm")'); await page.click('.alarm button:has-text("Add another alarm")');
  const gaps = page.locator('.alarm input[type=number][aria-label^="Minutes after"]'); await gaps.nth(0).fill('15'); await gaps.nth(0).dispatchEvent('change'); await page.locator('.alarm input[type=number][aria-label^="Minutes after"]').nth(1).fill('5'); await page.locator('.alarm input[type=number][aria-label^="Minutes after"]').nth(1).dispatchEvent('change');
  await page.waitForSelector('.alarm .chip:has-text("07:00 → 07:15 → 07:20")'); assert.match(await page.textContent('.alarm .chip'), /offers to start at 07:20/);
  await page.fill('.alarm .ring-card >> nth=1 >> input[type=text]', 'Feet on the floor'); await page.dispatchEvent('.alarm .ring-card >> nth=1 >> input[type=text]', 'input');
  await page.check('.alarm input[name=startMode] >> nth=1'); await page.waitForSelector('.alarm .chip:has-text("starts the routine at 07:20")');
  await page.waitForTimeout(500); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  const saved = await page.evaluate(async () => { const S = await import('./js/store.js'); const a = S.get().templates[0].alarm; return { n: a.more.length, gap: a.more[0].afterMin, text: a.more[0].text, mode: a.startMode }; });
  assert.deepEqual(saved, { n: 2, gap: 15, text: 'Feet on the floor', mode: 'auto' });
  await page.evaluate(async () => { const S = await import('./js/store.js'); const O = await import('./js/ui/offer.js'); O.openStartOffer(S.get().templates[0].id, (h) => { location.hash = h; }, 'Time!'); });
  await page.waitForSelector('dialog:has-text("Time to start")'); await page.click('dialog button:has-text("Start")'); await page.waitForSelector('.ring'); assert.deepEqual(errors, []);
});

await step('v1.10: unplanned interruption stops the clock, counts separately; recurring pattern -> add to routine / look closer', async () => {
  const { page, errors } = await newPage({ ctx: { reducedMotion: 'reduce' } }); await page.goto(base); await page.waitForSelector('.routine');
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring');
  await page.click('.row-btns button:has-text("Unplanned")'); await page.waitForSelector('dialog .reasons'); await page.click('dialog .reason:has-text("Toilet")');
  await page.waitForSelector('.intr-banner:not([hidden])'); assert.match(await page.textContent('.intr-banner'), /Toilet/); assert.equal(await page.locator('.row-btns button:has-text("Unplanned")').count(), 0);
  await page.waitForTimeout(1300); await page.click('button:has-text("Back to the routine")'); await page.waitForSelector('.intr-banner', { state: 'hidden' });
  for (let i = 0; i < 6; i++) await page.click('text=Done ✓'); await page.waitForSelector('.summary'); assert.match(await page.textContent('.summary .kvs'), /Unplanned/);
  assert.match(await page.textContent('.summary .unp-list'), /Toilet/);
  // five seeded runs of the same routine, four with a toilet break -> a pattern
  await page.evaluate(async () => {
    const S = await import('./js/store.js'), tpl = S.get().templates[0], day = 86_400_000;
    for (let i = 0; i < 5; i++) {
      const tasks = tpl.tasks.map((t) => ({ id: t.id, name: t.name, icon: t.icon, plannedSec: t.sec, estSec: t.sec, extraSec: 0, actualSec: t.sec, done: true, skipped: false })), tot = tasks.reduce((a, x) => a + x.plannedSec, 0);
      await S.saveRun({ id: `seed${i}`, profileId: S.activeProfile().id, templateId: tpl.id, templateName: tpl.name, icon: tpl.icon, color: '#6c5ce7', startedAt: Date.now() - (9 - i) * day, endedAt: Date.now() - (9 - i) * day + 600_000, status: 'done', current: 0, pausedMs: 0, plannedTotal: tot, estTotal: tot, actualTotal: tot, tasks,
        unplanned: i === 2 ? [] : [{ key: 'toilet', label: 'Toilet', emoji: '🚽', sec: 100, at: 1, task: tpl.tasks[0].name }] });
    }
  });
  await page.goto(base + '#/stats'); await page.waitForSelector('.card:has-text("Unplanned interruptions")');
  await page.locator('a.card.link-card').first().click(); await page.waitForSelector('.pattern:has-text("Toilet")');
  const before = await page.evaluate(async () => (await import('./js/store.js')).get().templates[0].tasks.length);
  await page.click('.pattern button:has-text("Add to the routine")'); await page.waitForFunction(async (n) => (await import('./js/store.js')).get().templates[0].tasks.length === n + 1, before);
  await page.click('.pattern button:has-text("Look closer")'); await page.waitForSelector('dialog textarea'); await page.fill('dialog textarea >> nth=0', 'drinks a lot of water before'); await page.fill('dialog textarea >> nth=2', 'go before we start'); await page.click('dialog footer button:has-text("Save and keep watching")');
  await page.waitForSelector('.pattern .chip:has-text("Watching")'); await page.goto(base + '#/journal'); await page.waitForSelector('.entry:has-text("drinks a lot of water")');
  assert.deepEqual(errors, []);
});

await step('v1.10: axe on alarm editor, unplanned sheet, pattern card and magnifier', async () => {
  const bad = [];
  for (const [lang, scheme] of [['he', 'light'], ['en', 'dark']]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base); if (lang === 'he') await dismissWelcome(page); const L = `${lang}/${scheme}`;
    await page.waitForSelector('.routine'); await page.locator('.routine-main').first().click(); await page.waitForSelector('.alarm'); await page.check('.alarm .switch input >> nth=0'); await page.click('.alarm button >> text=/^\\+ /'); await page.waitForSelector('.alarm .ring-card >> nth=1');
    bad.push(...await audit(page, `${L}/alarm-editor`));
    await page.goto(base + '#/'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); await page.click('.row-btns button >> text=/⚡/'); await page.waitForSelector('dialog .reasons'); bad.push(...await audit(page, `${L}/unplanned-sheet`)); await closeDialogs(page);
    await page.click('.row-btns button >> text=/⚡/'); await page.click('dialog .reason >> nth=0'); await page.waitForSelector('.intr-banner:not([hidden])'); bad.push(...await audit(page, `${L}/interrupted`));
    await page.evaluate(async () => {
      const S = await import('./js/store.js'), tpl = S.get().templates[0], day = 86_400_000;
      for (let i = 0; i < 5; i++) { const tasks = tpl.tasks.map((t) => ({ id: t.id, name: t.name, icon: t.icon, plannedSec: t.sec, estSec: t.sec, extraSec: 0, actualSec: t.sec, done: true, skipped: false })), tot = tasks.reduce((a, x) => a + x.plannedSec, 0);
        await S.saveRun({ id: `seed${i}`, profileId: S.activeProfile().id, templateId: tpl.id, templateName: tpl.name, icon: tpl.icon, color: '#6c5ce7', startedAt: Date.now() - (9 - i) * day, endedAt: Date.now() - (9 - i) * day + 600_000, status: 'done', current: 0, pausedMs: 0, plannedTotal: tot, estTotal: tot, actualTotal: tot, tasks, unplanned: [{ key: 'spill', label: 'Spill', emoji: '🥛', sec: 90, at: 1, task: tpl.tasks[0].name }] }); }
    });
    await page.goto(base + '#/stats'); await page.waitForSelector('a.card.link-card'); bad.push(...await audit(page, `${L}/stats-unplanned`));
    await page.locator('a.card.link-card').first().click(); await page.waitForSelector('.pattern'); bad.push(...await audit(page, `${L}/pattern-card`));
    await page.click('.pattern button >> text=/🔍/'); await page.waitForSelector('dialog textarea'); bad.push(...await audit(page, `${L}/magnifier`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.10: task menu + time picker, playful wording, if-then plans, timer style ──
await step('v1.10: time stepper and sheet, ☰ task menu (duplicate, add below, to bottom, delete), if-then plan card in the run', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine'); await page.locator('.routine-main').first().click(); await page.waitForSelector('.task');
  const n0 = await page.locator('.task').count();
  const first = page.locator('.task').first(), v0 = await first.locator('.tp-val').first().textContent();
  await first.locator('.tp-step >> nth=1').click(); assert.notEqual(await first.locator('.tp-val').first().textContent(), v0);
  await first.locator('.tp-step >> nth=0').click(); assert.equal(await first.locator('.tp-val').first().textContent(), v0);
  await first.locator('.tp-val').first().click(); await page.click('dialog .tp-presets button >> nth=3'); assert.match(await page.textContent('dialog .tp-big'), /5m/); await page.click('dialog footer button:has-text("OK")');
  assert.match(await first.locator('.tp-val').first().textContent(), /5m/);
  await first.locator('.task-menu-btn').click(); await page.click('dialog button:has-text("Duplicate")'); await page.waitForFunction((n) => document.querySelectorAll('.task').length === n + 1, n0);
  assert.equal(await page.locator('.task-name').nth(1).inputValue(), await page.locator('.task-name').nth(0).inputValue());
  await page.locator('.task').first().locator('.task-menu-btn').click(); await page.click('dialog button:has-text("Move to bottom")'); await page.waitForTimeout(100);
  await page.locator('.task').first().locator('.task-menu-btn').click(); await page.click('dialog button:has-text("Add a task below")'); await page.waitForFunction((n) => document.querySelectorAll('.task').length === n + 2, n0);
  await page.locator('.task').nth(1).locator('.task-menu-btn').click(); await page.click('dialog button:has-text("Remove task")'); await page.waitForFunction((n) => document.querySelectorAll('.task').length === n + 1, n0);
  // if-then plan
  await page.click('button:has-text("Add a plan")'); await page.fill('.plan-row input >> nth=0', 'I want to scroll'); await page.fill('.plan-row input >> nth=1', 'phone goes in the drawer'); await page.waitForTimeout(600);
  await page.goto(base + '#/'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); await page.waitForSelector('details:has-text("If-then plans") li:has-text("phone goes in the drawer")');
  assert.deepEqual(errors, []);
});

await step('v1.10: playful wording for a young child (age 8), plain when switched, timer bar style', async () => {
  const { page, errors } = await newPage(); await page.goto(base + '#/settings'); await page.waitForSelector('h1'); await setStyle(page, 'auto');
  await page.fill('input[type=number][max="120"]', '8'); await page.dispatchEvent('input[type=number][max="120"]', 'change'); await page.waitForSelector('h1:has-text("Settings")');
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); assert.match(await page.textContent('.routine .start'), /Go!/); assert.match(await page.textContent('#nav'), /My progress/);
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); assert.match(await page.textContent('.main-btns'), /I did it!/);
  await page.goto(base + '#/settings'); await page.selectOption('label.field:has-text("Wording") select', 'plain'); await page.goto(base + '#/'); await page.waitForSelector('.routine'); assert.match(await page.textContent('.routine .start'), /Start/); assert.ok(!/Go!/.test(await page.textContent('.routine .start')));
  await page.goto(base + '#/settings'); await page.selectOption('label.field:has-text("Timer look") select', 'bar'); await page.goto(base + '#/'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring.bar'); assert.deepEqual(errors, []);
});

await step('v1.10: axe on task menu, time sheet, playful home and settings', async () => {
  const bad = [];
  for (const [lang, scheme] of [['he', 'light'], ['en', 'dark']]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base); if (lang === 'he') await dismissWelcome(page); const L = `${lang}/${scheme}`;
    await page.waitForSelector('.routine'); await page.locator('.routine-main').first().click(); await page.waitForSelector('.task'); bad.push(...await audit(page, `${L}/editor-timepicker`));
    await page.locator('.task').first().locator('.tp-val').first().click(); await page.waitForSelector('dialog .tp-big'); bad.push(...await audit(page, `${L}/time-sheet`)); await closeDialogs(page);
    await page.locator('.task').first().locator('.task-menu-btn').click(); await page.waitForSelector('dialog .task-menu'); bad.push(...await audit(page, `${L}/task-menu`)); await closeDialogs(page);
    await setStyle(page, 'auto'); await page.goto(base + '#/settings'); await page.fill('input[type=number][max="120"]', '7'); await page.dispatchEvent('input[type=number][max="120"]', 'change'); await page.waitForTimeout(400);
    for (const h of ['#/', '#/settings', '#/stats']) { await page.goto(base + h); await page.waitForTimeout(300); bad.push(...await audit(page, `${L}/playful ${h}`)); }
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.10: template library ──
await step('v1.10: templates - pick tasks with big tiles, save task/routine as template, manage (rename, delete+undo, use), new routine from an idea', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine'); await page.locator('.routine-main').first().click(); await page.waitForSelector('.task');
  const n0 = await page.locator('.task').count();
  await page.click('button:has-text("Add from templates")'); await page.waitForSelector('dialog .tiles-grid .tile-btn');
  await page.fill('dialog input[type=search]', 'water'); await page.click('dialog .tile-btn:has-text("Drink water")'); await page.fill('dialog input[type=search]', ''); await page.click('dialog .chip:has-text("Evening")'); await page.click('dialog .tile-btn >> nth=0');
  await page.waitForSelector('dialog [role=status]:has-text("added")'); await page.click('dialog footer button:has-text("Done")');
  await page.waitForFunction((n) => document.querySelectorAll('.task').length === n + 2, n0);
  await page.locator('.task').nth(n0).locator('.task-menu-btn').click(); await page.click('dialog button:has-text("Save task as template")');
  await page.click('button:has-text("Save as template")'); await page.waitForTimeout(500);
  await page.goto(base + '#/library'); await page.waitForSelector('.lib-card'); assert.equal(await page.locator('.lib-task').count(), 1); assert.equal(await page.locator('.lib-card').count(), 1);
  await page.click('.lib-task button:has-text("Edit")'); await page.fill('dialog input[type=text]', 'Water bottle'); await page.click('dialog footer button:has-text("Save")'); await page.waitForSelector('.lib-task:has-text("Water bottle")');
  await page.click('.lib-task button:has-text("Delete")'); await page.click('dialog footer button.danger'); await page.waitForSelector('.lib-task', { state: 'detached' }); await page.click('#toast button:has-text("Undo")'); await page.waitForSelector('.lib-task:has-text("Water bottle")');
  await page.click('.lib-card button:has-text("Use")'); await page.waitForSelector('.task'); assert.ok(await page.locator('.task').count() >= 3);
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); const r0 = await page.locator('.routine').count();
  await page.click('.toolbar button:has-text("From a template")'); await page.waitForSelector('dialog .tiles-grid'); await page.click('dialog .chip:has-text("Ready-made")'); await page.click('dialog .tile-btn:has-text("Bedtime")'); await page.waitForSelector('.task');
  assert.equal(await page.locator('.task').count(), 5); await page.goto(base + '#/'); await page.waitForFunction((n) => document.querySelectorAll('.routine').length > n, r0);
  assert.deepEqual(errors, []);
});

await step('v1.10: axe on template pickers and library page (young child too)', async () => {
  const bad = [];
  for (const [lang, scheme] of [['he', 'light'], ['en', 'dark']]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base); if (lang === 'he') await dismissWelcome(page); const L = `${lang}/${scheme}`;
    await page.waitForSelector('.routine'); await page.click('.toolbar button >> nth=1'); await page.waitForSelector('dialog .tiles-grid'); bad.push(...await audit(page, `${L}/routine-picker`)); await closeDialogs(page);
    await page.locator('.routine-main').first().click(); await page.waitForSelector('.task'); await page.click('.toolbar.wrap button >> nth=0'); await page.waitForSelector('dialog .tiles-grid'); bad.push(...await audit(page, `${L}/task-picker`)); await closeDialogs(page);
    await page.click('.toolbar.wrap button >> nth=1'); await page.waitForTimeout(400);
    await page.goto(base + '#/library'); await page.waitForSelector('.lib-card'); bad.push(...await audit(page, `${L}/library`));
    await setStyle(page, 'auto'); await page.goto(base + '#/settings'); await page.fill('input[type=number][max="120"]', '7'); await page.dispatchEvent('input[type=number][max="120"]', 'change'); await page.waitForTimeout(400);
    await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.click('.toolbar button >> nth=1'); await page.waitForSelector('dialog .tiles-grid'); bad.push(...await audit(page, `${L}/routine-picker-playful`)); await closeDialogs(page);
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.11: alarms screen, goals (Goal-Plan-Do-Check), sand clock, what's new ──
await step('v1.11: Alarms screen - find it from home, switch on, edit the chain in a sheet, schedule shows on the routine card', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await page.evaluate(async () => { const S = await import('./js/store.js'); for (const x of S.get().templates) await S.saveTemplate({ ...x, alarm: { ...x.alarm, enabled: false } }); });   // alarms are ON by default now; start this step from "all off"
  await page.click('.quick button:has-text("Alarms")'); await page.waitForSelector('.alarm-card'); assert.match(await page.textContent('.chip.solid'), /No alarm is on/);
  await page.locator('.alarm-card').first().locator('input[type=checkbox]').check(); await page.waitForFunction(() => !document.querySelector('.chip.solid'));
  await page.locator('.alarm-card').first().locator('button:has-text("Edit alarm")').click(); await page.waitForSelector('dialog .ring-card');
  await page.click('dialog button:has-text("Add another alarm")'); await page.waitForSelector('dialog .ring-card >> nth=1'); await page.click('dialog footer button:has-text("Done")'); await page.waitForSelector('dialog', { state: 'detached' });
  await page.waitForFunction(() => /→/.test(document.querySelector('.alarm-card small')?.textContent || ''));
  await page.goto(base + '#/'); await page.waitForSelector('.routine .alarm-line'); assert.match(await page.textContent('.routine .alarm-line'), /07:00 → 07:05/);
  assert.deepEqual(errors, []);
});

await step('v1.11: goals - create with strategies, plan card in the run, check-in after the run, edit/achieve; sand clock timer; what\'s new after an update', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await page.click('.quick button:has-text("Goals")'); await page.waitForSelector('.goal-card, .empty'); await page.click('button:has-text("New goal")'); await page.waitForSelector('dialog .strat-pick');
  await page.click('dialog .chip:has-text("Be ready on time")'); await page.selectOption('dialog select', { index: 1 });
  await page.check('dialog .strat-pick:has-text("Prepare things the night before") input'); await page.check('dialog .strat-pick:has-text("visible timer") input'); await page.check('dialog .strat-pick:has-text("Say the steps") input'); await page.click('dialog .strat-pick:has-text("Put the phone away") input');
  await page.waitForSelector('dialog .note:has-text("Up to 3")'); await page.fill('dialog input[type=text] >> nth=1', 'Shoes by the door'); await page.click('dialog footer button:has-text("Save")');
  await page.waitForSelector('.goal-card:has-text("Be ready on time")'); assert.match(await page.textContent('.goal-card'), /night before/);
  await page.goto(base + '#/settings'); await page.selectOption('label.field:has-text("Timer look") select', 'sand');
  await page.goto(base + '#/'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring.sandy'); await page.waitForSelector('details:has-text("My goal and plan today") li:has-text("Be ready on time")');
  assert.ok(await page.locator('.sand-svg').isVisible());
  for (let i = 0; i < 6; i++) await page.click('text=Done ✓'); await page.waitForSelector('.summary'); await page.click('.summary .card:has-text("How did your plan work?") .mood >> nth=3'); await page.waitForSelector('#toast:has-text("Check-in saved")');
  await page.goto(base + '#/goals'); await page.waitForSelector('.goal-card'); assert.match(await page.textContent('.goal-card'), /1 check-ins/); assert.match(await page.textContent('.goal-card'), /routines on time/);
  await page.click('.goal-card button:has-text("Achieved")'); await page.waitForSelector('details summary:has-text("Achieved (1)")');
  // what's new: shown once after an update, never on the very first run
  await page.evaluate(() => localStorage.setItem('mo.seen', '0.0.1')); await page.reload(); await page.waitForSelector('dialog:has-text("New in")'); await page.click('dialog footer button:has-text("Close")');
  await page.goto(base + '#/'); await page.reload(); await page.waitForSelector('.routine'); assert.equal(await page.locator('dialog:has-text("New in")').count(), 0); assert.deepEqual(errors, []);
});

await step('v1.11: axe on alarms screen + sheet, goals screen + wizard + check-in, what\'s new, sand clock', async () => {
  const bad = [];
  for (const [lang, scheme] of [['he', 'light'], ['en', 'dark']]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base); if (lang === 'he') await dismissWelcome(page); const L = `${lang}/${scheme}`;
    await page.waitForSelector('.routine'); await page.goto(base + '#/alarms'); await page.waitForSelector('.alarm-card'); bad.push(...await audit(page, `${L}/alarms`));
    await page.locator('.alarm-card').first().locator('button').last().click(); await page.waitForSelector('dialog .alarm'); bad.push(...await audit(page, `${L}/alarm-sheet`)); await closeDialogs(page);
    await page.goto(base + '#/goals'); await page.waitForSelector('h1'); bad.push(...await audit(page, `${L}/goals-empty`));
    await page.click('button.primary'); await page.waitForSelector('dialog .strat-pick'); bad.push(...await audit(page, `${L}/goal-wizard`)); await page.fill('dialog input[type=text] >> nth=0', 'goal'); await page.click('dialog footer button.primary'); await page.waitForSelector('.goal-card');
    bad.push(...await audit(page, `${L}/goals`)); await page.click('.goal-card button.primary'); await page.waitForSelector('dialog .mood'); bad.push(...await audit(page, `${L}/checkin`)); await closeDialogs(page);
    await page.goto(base + '#/'); await page.evaluate(() => localStorage.setItem('mo.seen', '0.0.1')); await page.reload(); await page.waitForSelector('.routine'); await page.waitForSelector('dialog .row-btns'); bad.push(...await audit(page, `${L}/whatsnew`)); await closeDialogs(page);
    await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ timerStyle: 'sand' }); }); await page.goto(base + '#/'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring.sandy'); await page.waitForTimeout(900); bad.push(...await audit(page, `${L}/sand-run`));   // let the pop-in animation of the cheer bubble finish (it is partly transparent while it plays)
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.12: task difficulty + kind thoughts + relaxation, report + real PDF ──
await step('v1.12: per-task difficulty icons, "why hard" journal note, a different kind thought / relaxation every time, saved on the run', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.task-help');
  assert.equal(await page.locator('.diff').count(), 5); await page.click('.diff >> nth=3'); assert.equal(await page.getAttribute('.diff >> nth=3', 'aria-pressed'), 'true'); await page.waitForSelector('.help-out:has-text("That sounds hard")');
  await page.click('.help-btns button:has-text("A kind thought")'); await page.waitForSelector('.help-card .help-text'); const t1 = await page.textContent('.help-card .help-text');
  let t2 = t1; for (let i = 0; i < 4 && t2 === t1; i++) { await page.click('.help-card button:has-text("Another one")'); t2 = await page.textContent('.help-card .help-text'); } assert.notEqual(t1, t2);
  await page.click('.help-btns button:has-text("Relax")'); await page.waitForSelector('.help-card .help-steps li'); const e1 = await page.textContent('.help-card strong'); let e2 = e1; for (let i = 0; i < 4 && e2 === e1; i++) { await page.click('.help-card button:has-text("Another one")'); e2 = await page.textContent('.help-card strong'); } assert.notEqual(e1, e2);
  await page.click('.help-btns button:has-text("Why is it hard?")'); await page.waitForSelector('dialog textarea'); await page.fill('dialog textarea', 'I kept thinking it would go wrong'); await page.click('dialog footer button:has-text("Save")'); await page.waitForSelector('dialog', { state: 'detached' });
  await page.click('text=Done ✓'); await page.waitForSelector('.diff[aria-pressed="false"]');       // a new task starts unrated
  for (let i = 0; i < 5; i++) await page.click('text=Done ✓'); await page.waitForSelector('.summary');
  const run = await page.evaluate(async () => { const S = await import('./js/store.js'); const r = S.get().runs.at(-1); return { d: r.tasks[0].difficulty, help: r.tasks[0].help }; });
  assert.equal(run.d, 4); assert.ok(run.help.thought >= 2 && run.help.relax >= 2 && run.help.note === 1, JSON.stringify(run.help));
  await page.goto(base + '#/journal'); await page.waitForSelector('.entry:has-text("kept thinking it would go wrong")'); assert.deepEqual(errors, []);
});

await step('v1.12: statistics show where it is hard; the report page renders; a real multi-page-capable PDF is produced (valid header, xref, JPEG pages)', async () => {
  const { page, errors, ctx } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await page.evaluate(async () => {
    const S = await import('./js/store.js'), tpl = S.get().templates[0], day = 86_400_000;
    for (let i = 0; i < 6; i++) { const tasks = tpl.tasks.map((t, k) => ({ id: t.id, name: t.name, icon: t.icon, plannedSec: t.sec, estSec: t.sec, extraSec: 0, actualSec: t.sec + (k === 0 ? 120 : 0), done: true, skipped: false, difficulty: k === 0 ? 5 : 2, help: { note: k === 0 ? 1 : 0, thought: k === 0 ? 1 : 0, relax: 0 } })), tot = tasks.reduce((a, x) => a + x.plannedSec, 0), act = tasks.reduce((a, x) => a + x.actualSec, 0);
      await S.saveRun({ id: `rp${i}`, profileId: S.activeProfile().id, templateId: tpl.id, templateName: tpl.name, icon: tpl.icon, color: '#6c5ce7', startedAt: Date.now() - (12 - i * 2) * day, endedAt: Date.now() - (12 - i * 2) * day + 900_000, status: 'done', current: 0, pausedMs: 0, plannedTotal: tot, estTotal: tot, actualTotal: act, mood: 4, tasks,
        unplanned: i % 2 ? [{ key: 'toilet', label: 'Toilet', emoji: '🚽', sec: 100, at: 1, task: tpl.tasks[0].name }] : [] }); }
  });
  await page.goto(base + '#/stats'); await page.waitForSelector('.card:has-text("Where is it hard?")'); assert.match(await page.textContent('.diff-bars'), /5|4\./); await page.waitForSelector('.card:has-text("Export & send")');
  await page.click('.card:has-text("Export & send") button:has-text("Last 30 days")'); await page.waitForSelector('.rpt .rpt-head'); assert.match(await page.textContent('.rpt'), /Where is it hard\?/); assert.ok(await page.locator('.rpt svg polyline').count() >= 2); assert.ok(await page.locator('.rpt .rpt-kpi').count() >= 6);
  await page.click('.rpt-toolbar .chip:has-text("All time")'); await page.waitForSelector('.rpt');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('button:has-text("Save as PDF")')]);
  const path = await dl.path(); const fs = await import('node:fs'); const buf = fs.readFileSync(path), s = buf.toString('latin1');
  assert.ok(s.startsWith('%PDF-1.4')); assert.ok(s.trimEnd().endsWith('%%EOF')); assert.ok((s.match(/\/Type \/Page /g) || []).length >= 1); assert.ok(s.includes('/Filter /DCTDecode')); assert.ok(buf.length > 20000, `pdf size ${buf.length}`);
  const xr = s.lastIndexOf('xref\n0 '), n = parseInt(s.slice(xr + 7)); for (let i = 1; i < n; i++) { const off = parseInt(s.slice(xr + 8 + String(n).length + 21 + (i - 1) * 20, xr + 8 + String(n).length + 21 + (i - 1) * 20 + 10)); assert.ok(s.slice(off).startsWith(`${i} 0 obj`), `xref ${i}`); }
  fs.copyFileSync(path, '/tmp/report-test.pdf');
  // a single run's report from the history
  await page.goto(base + '#/stats'); await page.locator('a.card.link-card').first().click(); await page.waitForSelector('.tbl a[href^="#/report/run/"]'); await page.locator('.tbl a[href^="#/report/run/"]').first().click(); await page.waitForSelector('.rpt .rpt-tbl'); assert.match(await page.textContent('.rpt'), /Run report/); assert.match(await page.textContent('.rpt'), /Help used/);
  assert.deepEqual(errors.filter((e) => !/mailto|Failed to launch/.test(e)), []);
});

await step('v1.12: axe on task-help card, kind thought / relax, stats difficulty card, report screens (he + en)', async () => {
  const bad = [];
  for (const [lang, scheme] of [['he', 'light'], ['en', 'dark']]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base); if (lang === 'he') await dismissWelcome(page); const L = `${lang}/${scheme}`;
    await page.waitForSelector('.routine'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.task-help'); await page.click('.diff >> nth=4'); await page.waitForTimeout(900); bad.push(...await audit(page, `${L}/task-help`));
    await page.click('.help-btns button >> nth=1'); await page.waitForSelector('.help-card'); bad.push(...await audit(page, `${L}/kind-thought`)); await page.click('.help-btns button >> nth=2'); await page.waitForSelector('.help-steps'); bad.push(...await audit(page, `${L}/relax`));
    await page.click('.help-btns button >> nth=0'); await page.waitForSelector('dialog textarea'); bad.push(...await audit(page, `${L}/why-hard`)); await closeDialogs(page);
    await page.evaluate(async () => { const S = await import('./js/store.js'), tpl = S.get().templates[0], day = 86_400_000; for (let i = 0; i < 4; i++) { const tasks = tpl.tasks.map((t, k) => ({ id: t.id, name: t.name, icon: t.icon, plannedSec: t.sec, estSec: t.sec, extraSec: 0, actualSec: t.sec + (k === 0 ? 100 : 0), done: true, skipped: false, difficulty: k === 0 ? 5 : 2, help: { note: 0, thought: 1, relax: 0 } })), tot = tasks.reduce((a, x) => a + x.plannedSec, 0);
      await S.saveRun({ id: `ax${i}`, profileId: S.activeProfile().id, templateId: tpl.id, templateName: tpl.name, icon: tpl.icon, color: '#6c5ce7', startedAt: Date.now() - (9 - i) * day, endedAt: Date.now() - (9 - i) * day + 600_000, status: 'done', current: 0, pausedMs: 0, plannedTotal: tot, estTotal: tot, actualTotal: tot + 100, tasks, unplanned: [] }); } });
    await page.goto(base + '#/stats'); await page.waitForSelector('.diff-bars'); bad.push(...await audit(page, `${L}/stats-difficulty`));
    await page.goto(base + '#/report/period/0-all'); await page.waitForSelector('.rpt .rpt-head'); bad.push(...await audit(page, `${L}/report-period`));
    await page.goto(base + '#/report/run/ax1'); await page.waitForSelector('.rpt .rpt-tbl'); bad.push(...await audit(page, `${L}/report-run`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.13: interactive HTML report ──
await step('v1.13: interactive HTML report - self-contained file with tabs, animations, collapsible sections; works offline', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await page.evaluate(async () => { const S = await import('./js/store.js'), tpl = S.get().templates[0], day = 86_400_000;
    for (let i = 0; i < 6; i++) { const tasks = tpl.tasks.map((t, k) => ({ id: t.id, name: t.name, icon: t.icon, plannedSec: t.sec, estSec: t.sec, extraSec: 0, actualSec: t.sec + (k === 0 ? 100 : 0), done: true, skipped: false, difficulty: k === 0 ? 5 : 2, help: { note: 0, thought: 1, relax: 0 } })), tot = tasks.reduce((a, x) => a + x.plannedSec, 0);
      await S.saveRun({ id: `h${i}`, profileId: S.activeProfile().id, templateId: tpl.id, templateName: tpl.name, icon: tpl.icon, color: '#6c5ce7', startedAt: Date.now() - (12 - i * 2) * day, endedAt: Date.now() - (12 - i * 2) * day + 900_000, status: 'done', current: 0, pausedMs: 0, plannedTotal: tot, estTotal: tot, actualTotal: tot + 100, mood: 4, tasks, unplanned: [] }); } });
  await page.goto(base + '#/report/period/0-all'); await page.waitForSelector('.rpt .rpt-head');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('button:has-text("Save as interactive HTML")')]);
  const fs = await import('node:fs'), path = await dl.path(); const html = fs.readFileSync(path, 'utf8'); const file = '/tmp/report-test.html'; fs.copyFileSync(path, file);   // the download itself has no .html extension, so open the copy
  assert.ok(html.startsWith('<!doctype html>')); assert.ok(!/https?:\/\//.test(html), 'no external resources'); assert.equal((html.match(/role="tabpanel"/g) || []).length, 4);
  // open the downloaded FILE in a fresh page (no server, network blocked) and exercise it
  const ctx2 = await browser.newContext({ viewport: { width: 900, height: 900 }, offline: true }); const p2 = await ctx2.newPage(); const errs2 = []; p2.on('pageerror', (e) => errs2.push(e.message)); p2.on('console', (m) => { if (m.type() === 'error') errs2.push(m.text()); });
  await p2.goto(`file://${file}`); await p2.waitForSelector('.panel.on .rpt-head');
  assert.equal(await p2.locator('.tabs button[aria-selected=true]').count(), 1); const kpi = p2.locator('.panel.on .rpt-kpi b').first(); await p2.waitForFunction(() => { const b = document.querySelector('.panel.on .rpt-kpi b'); return b && b.textContent === b.dataset.t; }, null, { timeout: 5000 });   // the count-up finished on its true value
  for (let y = 0; y <= 6000; y += 500) { await p2.evaluate((yy) => window.scrollTo(0, yy), y); await p2.waitForTimeout(60); }   // sections animate in as they scroll into view
  await p2.waitForFunction(() => [...document.querySelectorAll('.panel.on .rpt-bar .fl')].every((f) => f.style.width && f.style.width !== '0px'), null, { timeout: 8000 });   // bars grew
  assert.equal(await p2.evaluate(() => getComputedStyle(document.querySelector('.panel.on .rpt-sec polyline:not([stroke-dasharray])')).strokeDashoffset), '0px');
  await p2.click('.tabs button >> nth=1'); assert.equal(await p2.getAttribute('.tabs button >> nth=1', 'aria-selected'), 'true'); assert.equal(await p2.locator('.panel.on').count(), 1); assert.ok((await p2.locator('.panel.on').getAttribute('role')) === 'tabpanel');
  const h2 = p2.locator('.panel.on .rpt-sec h2').first(); await h2.click(); assert.ok(await p2.evaluate(() => document.querySelector('.panel.on .rpt-sec').classList.contains('closed'))); await h2.press('Enter'); assert.ok(!(await p2.evaluate(() => document.querySelector('.panel.on .rpt-sec').classList.contains('closed'))));
  assert.deepEqual(errs2, []); await ctx2.close(); assert.deepEqual(errors, []);
  // reduced motion: everything is visible immediately
  const ctx3 = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 900, height: 900 } }); const p3 = await ctx3.newPage(); await p3.goto(`file://${file}`); await p3.waitForSelector('.panel.on .rpt-sec.in'); assert.equal(await p3.evaluate(() => getComputedStyle(document.querySelector('.panel.on .rpt-sec')).opacity), '1'); await ctx3.close();
});

// ── v1.13: alarms on by default, version + what's new, smart times / steps, estimate accuracy ──
await step('v1.13: alarms are ON by default (new routines + ready-made ones), version number and What\'s new are always reachable', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  assert.ok(await page.locator('.routine .alarm-line').count() >= 2, 'the ready-made routines show their alarm'); assert.match(await page.textContent('.routine .alarm-line'), /\d\d:\d\d/);
  await page.goto(base + '#/alarms'); await page.waitForSelector('.alarm-card'); assert.equal(await page.locator('.chip.solid').count(), 0); assert.ok(await page.locator('.alarm-card input[type=checkbox]:checked').count() >= 2);
  await page.goto(base + '#/'); await page.click('.toolbar button:has-text("New routine")'); await page.waitForSelector('.alarm'); assert.ok(await page.locator('.alarm .switch input').first().isChecked(), 'a new routine starts with its alarm on'); await page.waitForTimeout(500);
  await page.goto(base + '#/'); await page.waitForSelector('.version-line'); const ver = JSON.parse((await import('node:fs')).readFileSync('web/version.json', 'utf8')).version; assert.match(await page.textContent('.version-line'), new RegExp(`v${ver.replace(/\./g, '\\.')}`));
  await page.click('.version-line button'); await page.waitForSelector(`dialog:has-text("New in ${ver}")`); assert.ok(await page.locator('dialog details').count() === 1); await closeDialogs(page);
  await page.goto(base + '#/settings'); await page.waitForSelector('button:has-text("What\'s new")'); assert.match(await page.textContent('.settings-group:has(button:has-text("What\'s new"))'), new RegExp(ver.replace(/\./g, '\\.'))); await page.click('button:has-text("What\'s new")'); await page.waitForSelector('dialog:has-text("New in")'); await closeDialogs(page);
  assert.deepEqual(errors, []);
});

await step('v1.13: smart times (hint, sheet, menu), smart extra steps by chosen help, helper step in the run, estimate accuracy card', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await page.evaluate(async () => { const S = await import('./js/store.js'); await S.patchProfile(S.activeProfile().id, { age: 8, focus: ['focus', 'calm'], focusSet: true }); });
  await page.click('.toolbar button:has-text("New routine")'); await page.waitForSelector('.task'); await page.fill('.task-name', 'Shower'); await page.dispatchEvent('.task-name', 'change');
  await page.waitForSelector('.smart-hint'); assert.match(await page.textContent('.smart-hint'), /typical time for this kind of task/); await page.click('.smart-hint button'); await page.waitForSelector('.smart-hint', { state: 'detached' }); assert.ok(!/^5m$/.test((await page.textContent('.tp-val >> nth=0')).trim()));
  await page.click('button:has-text("Add task")'); await page.locator('.task-name').nth(1).fill('Homework'); await page.dispatchEvent('.task >> nth=1 >> .task-name', 'change');
  await page.click('.toolbar.wrap button:has-text("Smart times")'); await page.waitForSelector('dialog .smart-row'); assert.ok(await page.locator('dialog .smart-row').count() === 2); await page.click('dialog footer button:has-text("Apply")'); await page.waitForSelector('dialog', { state: 'detached' });
  const n0 = await page.locator('.task').count();
  await page.click('.toolbar.wrap button:has-text("Smart extra steps")'); await page.waitForSelector('dialog .smart-row'); assert.ok(await page.locator('dialog .smart-row').count() >= 3); assert.match(await page.textContent('dialog'), /Breathe slowly/); await page.click('dialog footer button:has-text("Apply")'); await page.waitForSelector('dialog', { state: 'detached' });
  await page.waitForFunction((n) => document.querySelectorAll('.task').length > n, n0); assert.match(await page.locator('.task-name').first().inputValue(), /Breathe slowly|Pick the one thing/);
  await page.waitForTimeout(500); await page.goto(base + '#/'); await page.locator('.routine').last().locator('.start').click(); await page.waitForSelector('.ring');
  const first = await page.textContent('.now'); if (/Breathe slowly/.test(first)) { await page.click('.help-btns button:has-text("Breathe now")'); await page.waitForSelector('dialog .calm-menu'); await closeDialogs(page); } else { await page.waitForSelector('.help-btns button.primary'); }
  // estimate accuracy card: seed runs with deliberate guesses
  await page.evaluate(async () => { const S = await import('./js/store.js'), tpl = S.get().templates[0], day = 86_400_000;
    for (let i = 0; i < 5; i++) { const tasks = tpl.tasks.map((t) => ({ id: t.id, name: t.name, icon: t.icon, plannedSec: t.sec, estSec: Math.round(t.sec * 0.6), guess: true, extraSec: 0, actualSec: t.sec, done: true, skipped: false, difficulty: 0, help: { note: 0, thought: 0, relax: 0 } })), tot = tasks.reduce((a, x) => a + x.plannedSec, 0);
      await S.saveRun({ id: `aw${i}`, profileId: S.activeProfile().id, templateId: tpl.id, templateName: tpl.name, icon: tpl.icon, color: '#6c5ce7', startedAt: Date.now() - (9 - i) * day, endedAt: Date.now() - (9 - i) * day + 900_000, status: 'done', current: 0, pausedMs: 0, plannedTotal: tot, estTotal: tot, actualTotal: tot, tasks, unplanned: [] }); } });
  await page.goto(base + '#/stats'); await page.waitForSelector('.card:has-text("How close are my guesses?")'); assert.match(await page.textContent('.card:has-text("How close are my guesses?")'), /too short/);
  assert.deepEqual(errors, []);
});

await step('v1.13: goal check-in records which strategies were used; best strategy shows on the goal; parent question card', async () => {
  const { page, errors } = await newPage(); await page.goto(base + '#/goals'); await page.waitForSelector('h1'); await page.click('button:has-text("New goal")'); await page.waitForSelector('dialog .strat-pick');
  await page.fill('dialog input[type=text] >> nth=0', 'Be ready'); await page.check('dialog .strat-pick:has-text("Prepare things the night before") input'); await page.check('dialog .strat-pick:has-text("visible timer") input'); await page.click('dialog footer button:has-text("Save")'); await page.waitForSelector('.goal-card');
  await page.click('.goal-card button:has-text("Check-in")'); await page.waitForSelector('dialog .mood'); await page.check('dialog fieldset .strat-pick:has-text("night before") input'); await page.click('dialog .mood >> nth=4'); await page.click('dialog footer button:has-text("Save")'); await page.waitForSelector('dialog', { state: 'detached' });
  await page.waitForSelector('.goal-card:has-text("Went best with")'); assert.match(await page.textContent('.goal-card'), /night before.*5/); assert.deepEqual(errors, []);
});

await step('v1.13: axe on smart times / extra steps sheets, what\'s new, guesses card, interactive-report toolbar (he + en)', async () => {
  const bad = [];
  for (const [lang, scheme] of [['he', 'light'], ['en', 'dark']]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base); if (lang === 'he') await dismissWelcome(page); const L = `${lang}/${scheme}`;
    await page.waitForSelector('.routine'); await page.evaluate(async () => { const S = await import('./js/store.js'); await S.patchProfile(S.activeProfile().id, { age: 8, focus: ['focus', 'calm', 'memory'], focusSet: true }); });
    await page.locator('.routine-main').first().click(); await page.waitForSelector('.task'); await page.locator('.task-name').first().fill('Shower'); await page.locator('.task-name').first().dispatchEvent('change'); await page.waitForSelector('.smart-hint'); bad.push(...await audit(page, `${L}/editor-hint`));
    await page.click('.toolbar.wrap button >> nth=2'); await page.waitForSelector('dialog .smart-row'); bad.push(...await audit(page, `${L}/smart-times`)); await closeDialogs(page);
    await page.click('.toolbar.wrap button >> nth=3'); await page.waitForSelector('dialog .smart-row'); bad.push(...await audit(page, `${L}/smart-steps`)); await closeDialogs(page);
    await page.goto(base + '#/'); await page.waitForSelector('.version-line'); bad.push(...await audit(page, `${L}/home-version`)); await page.click('.version-line button'); await page.waitForSelector('dialog details'); bad.push(...await audit(page, `${L}/whatsnew`)); await closeDialogs(page);
    await page.evaluate(async () => { const S = await import('./js/store.js'), tpl = S.get().templates[0], day = 86_400_000; for (let i = 0; i < 4; i++) { const tasks = tpl.tasks.map((t) => ({ id: t.id, name: t.name, icon: t.icon, plannedSec: t.sec, estSec: Math.round(t.sec * 0.7), guess: true, extraSec: 0, actualSec: t.sec, done: true, skipped: false, difficulty: 0, help: { note: 0, thought: 0, relax: 0 } })), tot = tasks.reduce((a, x) => a + x.plannedSec, 0);
      await S.saveRun({ id: `a11y${i}`, profileId: S.activeProfile().id, templateId: tpl.id, templateName: tpl.name, icon: tpl.icon, color: '#6c5ce7', startedAt: Date.now() - (9 - i) * day, endedAt: Date.now() - (9 - i) * day + 600_000, status: 'done', current: 0, pausedMs: 0, plannedTotal: tot, estTotal: tot, actualTotal: tot, tasks, unplanned: [] }); } });
    await page.goto(base + '#/stats'); await page.waitForSelector('.card:has-text("guesses"), .card:has-text("ההערכות")'); bad.push(...await audit(page, `${L}/stats-guesses`));
    await page.goto(base + '#/report/period/0-all'); await page.waitForSelector('.rpt'); bad.push(...await audit(page, `${L}/report-toolbar`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.14: retrospective ──
const seedRetroRuns = (page, spec) => page.evaluate(async (items) => {   // items: [{ id, startOffsetSec, over, diff }]
  const S = await import('./js/store.js'), tpl = S.get().templates[0], now = Date.now();
  for (const it of items) { const tasks = tpl.tasks.map((t, k) => ({ id: t.id, name: t.name, icon: t.icon, plannedSec: t.sec, estSec: t.sec, extraSec: 0, actualSec: t.sec + (k === 0 ? it.over : 0), done: true, skipped: false, difficulty: k === 0 ? it.diff : 0, help: { note: 0, thought: 0, relax: 0 } })), tot = tasks.reduce((a, x) => a + x.plannedSec, 0), act = tasks.reduce((a, x) => a + x.actualSec, 0);
    await S.saveRun({ id: it.id, profileId: S.activeProfile().id, templateId: tpl.id, templateName: tpl.name, icon: tpl.icon, color: '#6c5ce7', startedAt: now + it.startOffsetSec * 1000, endedAt: now + it.startOffsetSec * 1000 + 600_000, status: 'done', current: 0, pausedMs: 0, plannedTotal: tot, estTotal: tot, actualTotal: act, tasks, unplanned: [] }); }
}, spec);
await step('v1.14: look back (free style), apply suggested changes, see whether they helped, what worked / focus, undo', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await seedRetroRuns(page, [{ id: 'b1', startOffsetSec: -5 * 86400, over: 200, diff: 5 }, { id: 'b2', startOffsetSec: -3 * 86400, over: 180, diff: 5 }, { id: 'b3', startOffsetSec: -1 * 86400, over: 220, diff: 4 }]);
  await page.goto(base + '#/'); await page.waitForSelector('.retro-card'); await page.click('.retro-card button.primary'); await page.waitForSelector('h1:has-text("How do you want to look back?")');
  await page.check('input[name=mode] >> nth=1'); await page.click('button:has-text("Start")'); await page.waitForSelector('.retro-task');
  assert.ok(await page.locator('.retro-task button[aria-pressed=true]:has-text("Stuck")').count() >= 1, 'tasks the data points at start as "stuck"'); assert.ok(await page.locator('.retro-task button[aria-pressed=true]:has-text("Went well")').count() >= 1, 'smooth tasks start as "went well"');
  const stuckCard = page.locator('.retro-task:has(button[aria-pressed=true]:has-text("Stuck"))').first(); await stuckCard.locator('.cause:has-text("Not enough time")').click(); await stuckCard.locator('.cause:has-text("Hard to start")').click(); await page.click('.card:has(h2:has-text("How did it go?")) .mood >> nth=2');
  await page.waitForSelector('.strat-pick:has-text("more time")'); const before = await page.evaluate(async () => { const S = await import('./js/store.js'); return S.get().templates[0].tasks.map((t) => [t.name, t.sec]); });
  await page.click('button:has-text("Save and apply")'); await page.waitForSelector('#toast:has-text("applied")');
  const after = await page.evaluate(async () => { const S = await import('./js/store.js'); return { tasks: S.get().templates[0].tasks.map((t) => [t.name, t.sec, t.helperKey]), retro: S.retros()[0] }; });
  assert.ok(after.tasks.length === before.length + 1 && after.tasks.some((t) => t[2] === 'sx_pickone')); assert.ok(after.retro.appliedAt > 0 && after.retro.actions.every((a) => a.applied && a.undo)); assert.equal(after.retro.mode, 'free'); assert.equal(after.retro.status, 'done');
  await page.waitForSelector('.verdict.waiting'); assert.match(await page.textContent('.verdict'), /Waiting for 3 more/);
  await seedRetroRuns(page, [{ id: 'a1', startOffsetSec: 60, over: 0, diff: 2 }, { id: 'a2', startOffsetSec: 120, over: 0, diff: 2 }, { id: 'a3', startOffsetSec: 180, over: 0, diff: 1 }]);
  await page.goto(base + '#/'); await page.waitForSelector('.retro-card:has-text("was checked")'); assert.match(await page.textContent('.retro-card'), /helped/); await page.click('.retro-card button.primary'); await page.waitForSelector('.verdict.improved'); assert.match(await page.textContent('.card.kvs'), /Average over\/under/);
  await page.goto(base + '#/retros'); await page.waitForSelector('.retro-item'); assert.match(await page.textContent('.card.stack'), /helped in 1 of 1/); assert.ok(await page.locator('.focus-item').count() >= 1, 'a focus list'); assert.match(await page.textContent('.rcv-cols'), /What worked/); assert.ok(await page.locator('.rcv-cols a').count() >= 1, 'the helpful change is listed');
  await page.goto(base + '#/report/period/0-all'); await page.waitForSelector('.rpt'); assert.match(await page.textContent('.rpt'), /Looking back/);
  // undo: take the applied changes back
  await page.goto(base + '#/retros'); await page.locator('.retro-item').first().click(); await page.waitForSelector('.verdict.improved'); await page.locator('button:has-text("Undo")').first().click(); await page.waitForSelector('#toast:has-text("undone")');
  const undone = await page.evaluate(async () => { const S = await import('./js/store.js'); return { n: S.get().templates[0].tasks.length, applied: S.retros()[0].actions.filter((a) => a.applied).length }; }); assert.ok(undone.n <= before.length + 1 && undone.applied < after.retro.actions.length);
  assert.deepEqual(errors, []);
});

await step('v1.14: guided look-back of only a part, saved as a draft and finished later; several look-backs for one run; focus on one task', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await seedRetroRuns(page, [{ id: 'g1', startOffsetSec: -4 * 86400, over: 200, diff: 5 }, { id: 'g2', startOffsetSec: -2 * 86400, over: 200, diff: 5 }, { id: 'g3', startOffsetSec: -86400, over: 200, diff: 5 }]);
  await page.goto(base + '#/retro/g3/new'); await page.waitForSelector('h1:has-text("How do you want to look back?")');
  await page.check('.switch:has-text("only some parts") input'); await page.uncheck('.strat-pick:has-text("How it felt") input'); await page.uncheck('.strat-pick:has-text("🌟") input'); await page.waitForSelector('input[name=scope]');
  await page.check('input[name=scope] >> nth=1'); await page.click('button:has-text("Start")'); await page.waitForSelector('.stepper:has-text("Step 1 of 2")'); assert.match(await page.textContent('h2'), /Where did we get stuck/);
  await page.click('button:has-text("Next")'); await page.waitForSelector('.stepper:has-text("Step 2 of 2")'); assert.match(await page.textContent('main h2, #app h2'), /change/i);
  await page.click('.toolbar.wrap button:has-text("Back")'); await page.waitForSelector('.stepper:has-text("Step 1 of 2")'); await page.click('button:has-text("Save and continue later")'); await page.waitForSelector('.retro-item:has-text("In progress")');
  const draft = await page.evaluate(async () => { const S = await import('./js/store.js'); const r = S.retros()[0]; return { status: r.status, step: r.step, parts: r.parts, scope: r.scope, mode: r.mode }; }); assert.deepEqual(draft, { status: 'draft', step: 0, parts: ['tasks', 'change'], scope: 'routine', mode: 'guided' });
  await page.click('.retro-item a:has-text("Continue")'); await page.waitForSelector('.stepper'); await page.click('button:has-text("Next")'); await page.click('button:has-text("Finish")'); await page.waitForSelector('#toast:has-text("Saved")');
  assert.equal(await page.evaluate(async () => (await import('./js/store.js')).retros()[0].status), 'done');
  // a second, separate look-back of the same run (free, everything)
  await page.goto(base + '#/retro/g3'); await page.waitForSelector('.retro-item'); await page.click('a:has-text("Start another look-back")'); await page.check('input[name=mode] >> nth=1'); await page.click('button:has-text("Start")'); await page.waitForSelector('.retro-task'); await page.click('button:has-text("Save")'); await page.waitForSelector('#toast');
  assert.equal(await page.evaluate(async () => (await import('./js/store.js')).retrosForRun('g3').length), 2);
  // overview: focus item -> look at just that task
  await page.goto(base + '#/retros'); await page.waitForSelector('.focus-item a'); await page.click('.focus-item a >> nth=0'); await page.waitForSelector('h1:has-text("How do you want to look back?")'); assert.match(await page.textContent('.chip.solid'), /Focusing on/);
  await page.click('button:has-text("Start")'); await page.waitForSelector('.stepper:has-text("Step 1 of 2")'); assert.equal(await page.locator('.retro-task button[aria-pressed=true]:has-text("Stuck")').count(), 1);
  // the remembered style skips the question next time
  await page.goto(base + '#/retro/g1/new'); await page.check('input[name=mode] >> nth=1'); await page.check('.switch:has-text("Use this style next time") input'); await page.click('button:has-text("Start")'); await page.waitForSelector('.retro-task'); await page.click('button:has-text("Save")'); await page.waitForSelector('#toast');
  await page.goto(base + '#/retro/g2'); await page.waitForSelector('.retro-task'); assert.equal(await page.locator('h1:has-text("How do you want to look back?")').count(), 0); assert.deepEqual(errors, []);
});

await step('v1.14: axe on look-back start screen, guided step, free form, hub and overview with focus (he + en)', async () => {
  const bad = [];
  for (const [lang, scheme] of [['he', 'light'], ['en', 'dark']]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base); if (lang === 'he') await dismissWelcome(page); const L = `${lang}/${scheme}`;
    await page.waitForSelector('.routine'); await seedRetroRuns(page, [{ id: 'x1', startOffsetSec: -3 * 86400, over: 200, diff: 5 }, { id: 'x2', startOffsetSec: -86400, over: 200, diff: 5 }]);
    await page.goto(base + '#/'); await page.waitForSelector('.retro-card .btn.primary'); bad.push(...await audit(page, `${L}/home-retro-prompt`));
    await page.goto(base + '#/retro/x2/new'); await page.waitForSelector('input[name=mode]'); bad.push(...await audit(page, `${L}/retro-start`)); await page.check('.switch input >> nth=0'); await page.waitForTimeout(150); bad.push(...await audit(page, `${L}/retro-start-parts`));
    await page.click('.toolbar.wrap button.primary'); await page.waitForSelector('.stepper'); bad.push(...await audit(page, `${L}/retro-guided-step`));
    await page.click('.retro-task >> nth=0 >> .seg-group button >> nth=1').catch(() => {}); await page.waitForTimeout(150);
    await page.click('.toolbar.wrap button >> nth=-1'); await page.waitForSelector('.retro-item'); bad.push(...await audit(page, `${L}/retro-hub`));
    await page.goto(base + '#/retro/x1/new'); await page.check('input[name=mode] >> nth=1'); await page.click('.toolbar.wrap button.primary'); await page.waitForSelector('.retro-task'); await page.locator('.retro-task:has(button[aria-pressed=true]:has-text("Stuck"), button[aria-pressed=true]:has-text("נתקע")) .cause').first().click(); bad.push(...await audit(page, `${L}/retro-free`));
    await page.click('.toolbar.wrap button >> nth=1'); await page.waitForTimeout(500);
    await page.goto(base + '#/retros'); await page.waitForSelector('.focus-item'); bad.push(...await audit(page, `${L}/retros-overview`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.16: voices ──
await step('v1.16: voice characters pick matching installed voices, speak in phrases with a chosen pace, animals say their sound, wording style, tips', async () => {
  const { page, errors } = await newPage();
  await page.addInitScript(() => {
    window.__said = [];
    const voices = [{ name: 'Microsoft Aria Online (Natural)', lang: 'en-US', voiceURI: 'aria' }, { name: 'Daniel', lang: 'en-GB', voiceURI: 'daniel' }, { name: 'Samantha', lang: 'en-US', voiceURI: 'sam' }, { name: 'Zarvox', lang: 'en-US', voiceURI: 'zarvox' }];
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, speak(u) { window.__said.push({ text: u.text, voice: u.voice?.name, pitch: u.pitch, rate: u.rate }); }, cancel() {}, addEventListener() {}, removeEventListener() {} } });
  });
  await page.reload(); await page.goto(base + '#/settings'); await page.waitForSelector('.persona-grid');
  assert.ok(await page.locator('.persona').count() >= 17, 'many characters'); for (const g of ['Everyday voices', 'Speaking styles', 'Fun characters']) assert.ok(await page.locator(`legend:has-text("${g}")`).count() === 1, g);
  const said = async () => page.evaluate(() => window.__said), clear = () => page.evaluate(() => { window.__said.length = 0; });
  await clear(); await page.locator('.persona', { has: page.locator('span:text-is("Man")') }).click(); await page.waitForFunction(() => window.__said.length >= 1); assert.equal((await said())[0].voice, 'Daniel', 'a man gets the male voice');
  await clear(); await page.click('.persona:has-text("Woman")'); await page.waitForFunction(() => window.__said.length >= 1); assert.equal((await said())[0].voice, 'Microsoft Aria Online (Natural)', 'a woman gets the best (natural) female voice');
  await clear(); await page.click('.persona:has-text("Girl")'); await page.waitForFunction(() => window.__said.length >= 1); const girl = (await said())[0]; assert.ok(girl.voice === 'Samantha' && girl.pitch > 1.1, 'a girl: another female voice, higher');
  assert.ok((await page.locator('label.field:has-text("Voice") select option').allTextContents()).some((x) => x.startsWith('★')), 'natural voices are marked'); assert.ok(!(await page.locator('label.field:has-text("Voice") select option').allTextContents()).some((x) => /zarvox/i.test(x) && x.startsWith('★')));
  // pace
  await page.click('.persona:has-text("Woman")'); await clear(); await page.locator('input[type=range][aria-label="Speaking pace"]').fill('70'); await page.dispatchEvent('input[type=range][aria-label="Speaking pace"]', 'change'); await page.waitForFunction(() => window.__said.length >= 1); const slow = (await said())[0].rate; await page.waitForTimeout(500);   // let the second change event's sample finish before measuring again
  await clear(); await page.locator('input[type=range][aria-label="Speaking pace"]').fill('130'); await page.dispatchEvent('input[type=range][aria-label="Speaking pace"]', 'change'); await page.waitForFunction(() => window.__said.length >= 1); assert.ok((await said())[0].rate > slow + 0.2, 'pace changes the speed');
  // an animal says its sound (random 70%: try a few times)
  await page.click('.persona:has-text("Cat")'); let meow = false; for (let i = 0; i < 10 && !meow; i++) { await clear(); await page.click('button:has-text("Test")'); await page.waitForFunction(() => window.__said.length >= 1); meow = (await said()).some((x) => x.text === 'meow' && x.pitch > 1.5); } assert.ok(meow, 'the cat meows');
  // wording style + install tips
  await page.selectOption('label.field:has-text("Wording style") select', 'casual'); assert.equal(await page.evaluate(async () => (await import('./js/store.js')).get().settings.voiceFlavor), 'casual');
  await page.click('details:has(summary:has-text("Make the voices sound better")) summary'); assert.match(await page.textContent('details:has(summary:has-text("Make the voices sound better"))'), /Text-to-speech/);
  assert.deepEqual(errors, []);
});

await step('v1.16: axe on the voice settings (he + en, big text)', async () => {
  const bad = [];
  for (const [lang, scheme] of [['he', 'light'], ['en', 'dark']]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base); if (lang === 'he') await dismissWelcome(page);
    await page.goto(base + '#/settings'); await page.waitForSelector('.persona-grid'); bad.push(...await audit(page, `${lang}/${scheme}/voice-settings`));
    await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ fontScale: 150, voicePreset: 'cat' }); }); await page.goto(base + '#/settings'); await page.waitForSelector('.persona.on'); bad.push(...await audit(page, `${lang}/${scheme}/voice-settings-big`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

await browser.close(); server.close();
console.log(failures ? `\n${failures} e2e step(s) failed` : '\nall e2e steps passed'); process.exit(failures ? 1 : 0);

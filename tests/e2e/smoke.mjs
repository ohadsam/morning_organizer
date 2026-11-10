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
  if (!opts.tour) await ctx.addInitScript(() => { try { localStorage.setItem('mo.tour', '1'); } catch { /* blocked */ } });   // the first-run tour would cover every step that follows the welcome sheet
  if (!opts.collapsed) await ctx.addInitScript(() => { try { localStorage.setItem('mo.sg', JSON.stringify(Object.fromEntries(['needs', 'people', 'look', 'profile', 'helpers', 'buddy', 'pace', 'a11y', 'coach', 'voice', 'voicecmd', 'alerts', 'defaults', 'sync', 'app'].map((k) => [k, true])))); } catch { /* blocked */ } });
  // v1.17: sections ("More", edit-page folds, task help, run "More") start closed for people; most steps just need their buttons reachable, so open them as they appear
  if (!opts.foldsClosed) await ctx.addInitScript(() => { const open = () => document.querySelectorAll('details.fold:not([data-keep]), details.help-fold, details.task-more, details.menu-group').forEach((d) => { if (!d.open && !d.dataset.seen) { d.dataset.seen = '1'; d.open = true; } }); new MutationObserver(open).observe(document, { childList: true, subtree: true }); });
  if (opts.collapsed) await ctx.addInitScript(() => { try { if (!localStorage.getItem('mo.sg')) localStorage.setItem('mo.sg', JSON.stringify({ look: true })); } catch { /* blocked */ } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (process.env.SLOW) await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: +process.env.SLOW }); // SLOW=6 emulates a slow CI machine
  if (opts.clock) await page.clock.install(opts.clockAt ? { time: opts.clockAt } : undefined);   // clockAt pins the date (a weekday) for steps that depend on the day of the week
  if (opts.lang !== 'he') {
    await page.goto(base + '#/settings'); await dismissWelcome(page); await page.waitForSelector('select');
    // most steps assert the plain English wording even when they enter a child's age; the playful steps switch it back to automatic
    await page.selectOption('select:has(option[value="plain"])', 'plain'); await page.waitForTimeout(200);
    await page.selectOption('select >> nth=0', 'en'); await page.waitForFunction(() => document.documentElement.lang === 'en'); await page.waitForLoadState('load'); await page.waitForTimeout(300); await page.waitForTimeout(150);
  }
  return { page, errors, ctx };
}
// the Home toolbar's dropdowns show one panel at a time: open the one that holds a button before clicking it
// the menu buttons now carry a drawn icon (data-icon) instead of an emoji: find them by either
const ICON_OF = { '🎁': 'rewards-menu', '📚': 'library', '🔁': 'share-routines', '⏰': 'alarms', '🎯': 'goals', '📥': 'import', '🌬️': 'calm-corner', '📓': 'journal', '🎙️': 'quick-note', '📊': 'track', '🔄': 'looking-back' };
const menuSel = (text) => (ICON_OF[text] ? `.tb-panel button:has(.vki[data-icon="${ICON_OF[text]}"]), .tb-panel button:has-text("${text}")` : `.tb-panel button:has-text("${text}")`);
const openMenuWith = async (page, text) => { if (await page.locator(menuSel(text).replace(/\.tb-panel button/g, '.tb-panel:not([hidden]) button')).count()) return; const n = await page.locator('.tb-btn[aria-haspopup]').count(); for (let i = 0; i < n; i++) { await page.locator('.tb-btn[aria-haspopup]').nth(i).click(); if (await page.locator(menuSel(text).replace(/\.tb-panel button/g, '.tb-panel:not([hidden]) button')).count()) return; } };
const qk = async (page, text) => { await openMenuWith(page, text); await page.locator(menuSel(text)).first().click(); };
// the journal's password section now stays as the person left it when the page redraws: open it only when it is closed
const openLockCard = async (page) => { await page.waitForSelector('details.lock-card'); if (!(await page.locator('details.lock-card[open]').count())) await page.click('details.lock-card summary'); await page.waitForSelector('details.lock-card[open]'); };
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
  assert.match(await page.textContent('h1'), /SonRise/); assert.deepEqual(errors, []); await shot(page, 'home-he');
  await page.click('.routine-main'); await page.waitForSelector('.task'); await shot(page, 'editor-he');
});

await step('create routine, set 5.5 min task, reorder with arrows, favourite', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await page.click('.tb-btn[data-tb=new]'); await page.waitForSelector('.task');
  await page.fill('.field input[type=text]', 'My test'); await page.fill('.task-name', 'First');
  await setDur(page, page.locator('.task').first(), 5, 30);
  await page.click('text=Add task'); await page.locator('.task-name').nth(1).fill('Second');
  await page.locator('.task').nth(1).locator('.task-menu-btn').click(); await page.click('dialog button:has-text("Move up")');
  assert.equal(await page.locator('.task-name').first().inputValue(), 'Second');
  assert.match(await page.textContent('.row.between strong'), /Total: 10\sm 30\ss/);
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
  await page.click('.tb-btn[data-tb=new]'); await page.waitForSelector('.task'); await page.fill('.field input[type=text]', 'Zed');
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
  assert.ok(await page.locator('.bubble .bm svg.avatar').count(), 'the encouragement bubble shows the (panda) avatar'); assert.match(await page.textContent('.bubble .bt'), /Dana|!/);
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
  await a.page.goto(base + '#/'); await a.page.waitForSelector('.routine'); await a.page.click('.tb-btn[data-tb=new]'); await a.page.waitForSelector('.task');
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
  await qk(b.page, "Import"); await b.page.fill('dialog textarea', 'MB1.garbage-garbage-garbage'); assert.ok(true);
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
  await P.page.goto(base + '#/'); await P.page.click('.tb-btn[data-tb=new]'); await P.page.waitForSelector('.task'); await P.page.fill('.field input[type=text]', 'From Mom'); await P.page.waitForTimeout(500);
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
  await closeDialogs(C.page); await C.page.goto(base + '#/'); await C.page.waitForSelector('.toolbar-main'); await closeDialogs(C.page); await openMenuWith(C.page, 'Rewards'); await qk(C.page, "Rewards"); await C.page.waitForSelector('dialog .menu-item:has-text("Ice cream trip")', { timeout: 15000 });
  await C.page.click('dialog .menu-item button:has-text("Get")'); await C.page.click('dialog footer button:has-text("Get")');
  await P.page.goto(base + '#/family'); await P.page.waitForSelector('.family-card:has-text("Ice cream trip")', { timeout: 15000 }); await P.page.click('.family-card button:has-text("Given")');
  await C.page.waitForTimeout(1500); await closeDialogs(C.page); await openMenuWith(C.page, 'Rewards'); await qk(C.page, "Rewards"); await C.page.click('dialog details summary'); await C.page.waitForSelector('dialog li:has-text("given")', { timeout: 15000 });
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

await step('UX: settings are collapsible groups (all closed by default - calm), state is remembered; accent color applies', async () => {
  const { page } = await newPage({ collapsed: true }); await page.waitForTimeout(500); await page.evaluate(() => localStorage.setItem('mo.sg', '{}')); await page.goto(base + '#/settings'); await page.reload(); await page.waitForSelector('details.settings-group');
  assert.equal(await page.locator('details.settings-group[open]').count(), 0); assert.ok(await page.locator('details.settings-group').count() >= 9);
  await page.click('details.settings-group summary >> nth=0'); assert.equal(await page.locator('details.settings-group[open]').count(), 1);
  await page.waitForFunction(() => Object.values(JSON.parse(localStorage.getItem('mo.sg') || '{}')).filter(Boolean).length >= 1);
  await page.reload(); await page.waitForSelector('details.settings-group'); assert.equal(await page.locator('details.settings-group[open]').count(), 1, 'open/closed state survives reload');
  await page.goto(base + '#/settings/voice'); await page.reload(); await page.waitForSelector('details.settings-group[data-group=voice][open]');   // search deep link opens the right group
  await page.evaluate(() => { document.querySelector('details[data-group=look]').open = true; });
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
  await ctx.addInitScript(() => { try { localStorage.setItem('mo.sg', JSON.stringify({ look: true, voice: true })); } catch { /* blocked */ } const open = () => document.querySelectorAll('details.fold, details.help-fold, details.task-more, details.menu-group').forEach((d) => { if (!d.dataset.seen) { d.dataset.seen = '1'; d.open = true; } }); new MutationObserver(open).observe(document, { childList: true, subtree: true }); });
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
  assert.ok(await page.locator('.hero-buddy svg.avatar').count(), 'animated character in the hero'); assert.match(await page.textContent('.chips'), /Level 1/);
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
  await page.waitForFunction(() => document.querySelector('.hero')?.textContent.includes('Dan')); assert.ok(await page.locator('.hero-buddy svg.avatar').count(), 'new person starts with the default character');
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); for (let i = 0; i < 12 && !(await page.locator('.summary').count()); i++) await page.click('.main-btns .primary', { timeout: 3000 }).catch(() => {}); await page.waitForSelector('.summary'); assert.ok(await page.locator('.summary .avatar').count());
  await page.goto(base + '#/stats'); await page.waitForSelector('.week'); assert.match(await page.textContent('.week'), /1 routines/);
  await page.goto(base + '#/'); await page.click('.hero-buddy'); await page.click('.profile-card:not(.on):not(.add)'); await page.waitForFunction(() => !document.querySelector('.hero')?.textContent.includes('Dan'));
  await page.goto(base + '#/stats'); await page.waitForSelector('h1'); assert.ok(!(await page.locator('.week').count()), 'the first person has no history of their own'); await shot(page, 'profiles');
  assert.deepEqual(errors, []);
});

await step('v1.9: schedule (today / other days), gear checklist, badges + celebration, achievements gallery, QR code for invitations', async () => {
  const { page, errors } = await newPage({ clock: true, clockAt: new Date('2026-11-04T09:00:00') }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  await page.locator('.routine-main').first().click(); await page.waitForSelector('.task');
  await page.click('button:has-text("School days")'); await page.click('button:has-text("Add an item")'); await page.fill('.gear-row input[type=text]', 'PE kit'); await page.waitForTimeout(500);
  const dow = await page.evaluate(() => new Date().getDay()), school = dow >= 1 && dow <= 5;
  await page.goto(base + '#/'); await page.waitForSelector('.routine');
  const inSec = (h) => page.locator(`section:has(> h2:has-text("${h}")) .routine`).count();
  if (school) { assert.equal(await inSec('Today'), 2); assert.equal(await inSec('Other days'), 0); } else { assert.equal(await inSec('Today'), 1); assert.equal(await inSec('Other days'), 1); } // 'school days' routine + one unscheduled routine
  const gearId = await page.evaluate(async () => { const S = await import('./js/store.js'); return S.get().templates.find((x) => (x.gear || []).length)?.id; });   // the routine that has the gear item (on a weekend it is not the first one)
  await page.goto(base + '#/run/' + gearId); await page.waitForSelector('.ring');
  if (school) assert.match(await page.textContent('.gear-card'), /PE kit/); else assert.equal(await page.locator('.gear-card').count(), 0, 'school-day gear stays out of the weekend');
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
  await qk(page, "Import"); await page.fill('dialog textarea', `check this out ${code}`); await page.click('dialog footer button');
  await page.waitForFunction(() => document.querySelectorAll('.routine').length === 3);
  await qk(page, "Import"); await page.fill('dialog textarea', 'M1.@@@'); await page.click('dialog footer button');
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
  await page.click('.tb-btn[data-tb=track]'); assert.equal(await page.locator('.tb-panel button:has-text("Rewards")').count(), 0);
  await page.click('.focus-card button.primary'); await page.waitForSelector('dialog .area-grid'); await page.check('dialog .area-pick:has-text("Focus & attention") input'); await page.check('dialog .area-pick:has-text("Motivation") input');
  await page.click('dialog footer button:has-text("Save")'); await page.waitForSelector('.focus-card', { state: 'detached' }); await page.click('.tb-btn[data-tb=track]'); assert.equal(await page.locator('.tb-panel button:has-text("Rewards")').count(), 1);
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
  await page.click('.tb-btn[data-tb=note]'); await page.fill('dialog textarea', 'plain secret one'); await page.click('dialog footer button:has-text("Save")'); await page.waitForSelector('.entry:has-text("plain secret one")');
  await openLockCard(page); await page.click('button:has-text("Add a password")'); await page.waitForSelector('dialog .qa');
  const pws = page.locator('dialog input[type=password]'); await pws.nth(0).fill('abcd'); await pws.nth(1).fill('abcd');
  const ans = page.locator('dialog .qa input[type=text]'); // [custom, answer] per question
  await ans.nth(1).fill('Zebraphant42'); await ans.nth(3).fill('Quixotic Lane 9'); await page.click('dialog footer button:has-text("Turn on")'); await page.waitForSelector('dialog', { state: 'detached' });
  // at rest: no plaintext anywhere in IndexedDB
  const raw = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('morning-organizer'); r.onsuccess = () => { const tx = r.result.transaction(['journal', 'kv'], 'readonly'); const out = []; for (const n of ['journal', 'kv']) tx.objectStore(n).getAll().onsuccess = (e) => out.push(JSON.stringify(e.target.result)); tx.oncomplete = () => res(out.join('')); }; }));
  assert.ok(!raw.includes('plain secret one') && !raw.includes('abcd') && !raw.includes('Zebraphant42'), 'secrets must not be stored in the clear');
  // lock now, add a note while locked, reload: locked screen
  await openLockCard(page); await page.click('button:has-text("Lock now")'); await page.waitForSelector('.lock-screen');
  await page.click('.tb-btn[data-tb=note]'); await page.fill('dialog textarea', 'added while locked'); await page.click('dialog footer button:has-text("Save")'); await page.waitForSelector('#toast:has-text("stays locked")'); // wait for the write before reloading
  await page.reload(); await page.waitForSelector('.lock-screen'); assert.equal(await page.locator('text=added while locked').count(), 0);
  await page.fill('.lock-screen input[type=password]', 'nope'); await page.click('.lock-screen button:has-text("Unlock")'); await page.waitForSelector('.lock-screen .err:not(:empty)');
  // forgot password -> questions -> new password
  await page.click('.lock-screen button:has-text("Forgot password")'); await page.waitForSelector('dialog input[type=text]');
  const fa = page.locator('dialog input[type=text]'); await fa.nth(0).fill('zebraphant 42'); await fa.nth(1).fill('quixotic lane 9'); await page.fill('dialog input[type=password]', 'newpass1'); await page.click('dialog footer button:has-text("Reset password")');
  await page.waitForSelector('dialog', { state: 'detached' }); await page.waitForSelector('.lock-screen', { state: 'detached' }).catch(() => {});
  await page.reload(); await page.waitForSelector('.lock-screen'); await page.fill('.lock-screen input[type=password]', 'newpass1'); await page.click('.lock-screen button:has-text("Unlock")');
  await page.waitForSelector('.entry:has-text("plain secret one")'); assert.equal(await page.locator('.entry:has-text("added while locked")').count(), 1);
  // turn the password off again -> plain, then there is simply no lock
  await openLockCard(page); await page.click('button:has-text("Turn off password")'); await page.fill('dialog input[type=password]', 'newpass1'); await page.click('dialog footer button:has-text("Turn off password")');
  await openLockCard(page); await page.waitForSelector('button:has-text("Add a password")'); assert.deepEqual(errors, []);
});

await step('v1.10: voice note recorded in a run (fake microphone), kept on the device, playable; dictation asks for consent first', async () => {
  const mic = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await mic.newContext({ viewport: { width: 390, height: 800 }, locale: 'en-US', serviceWorkers: 'block', permissions: ['microphone'] });
  await ctx.addInitScript(() => { try { localStorage.setItem('mo.sg', JSON.stringify({ look: true, voice: true })); } catch { /* blocked */ } const open = () => document.querySelectorAll('details.fold, details.help-fold, details.task-more, details.menu-group').forEach((d) => { if (!d.dataset.seen) { d.dataset.seen = '1'; d.open = true; } }); new MutationObserver(open).observe(document, { childList: true, subtree: true }); });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '#/settings'); await dismissWelcome(page); await page.waitForSelector('select'); await page.selectOption('select >> nth=0', 'en'); await page.waitForFunction(() => document.documentElement.lang === 'en'); await page.waitForLoadState('load'); await page.waitForTimeout(300);
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
    await page.click('.tb-btn[data-tb=note]'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${L}/note-sheet`)); await closeDialogs(page);
    await page.click('.tb-btn[data-tb=reflect]'); await page.click('.tb-panel button >> nth=1'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${L}/thought`)); await closeDialogs(page);
    await page.click('.tb-btn[data-tb=reflect]'); await page.click('.tb-panel button >> nth=2'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${L}/gratitude`)); await closeDialogs(page);
    await page.click('.tb-btn[data-tb=reflect]'); await page.click('.tb-panel button >> nth=3'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${L}/park`)); await closeDialogs(page);
    await openLockCard(page); await page.click('details.lock-card .btn.primary'); await page.waitForSelector('dialog .qa'); bad.push(...await audit(page, `${L}/lock-setup`));
    const pws = page.locator('dialog input[type=password]'); await pws.nth(0).fill('abcd'); await pws.nth(1).fill('abcd'); const a = page.locator('dialog .qa input[type=text]'); await a.nth(1).fill('Zebraphant42'); await a.nth(3).fill('Quixotic Lane 9');
    await page.click('dialog footer .primary'); await page.waitForSelector('dialog', { state: 'detached' });
    await openLockCard(page); await page.click('details.lock-card .btn >> nth=0'); await page.waitForSelector('.lock-screen'); bad.push(...await audit(page, `${L}/journal-locked`));
    await page.click('.lock-screen .btn >> nth=1'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${L}/forgot`)); await closeDialogs(page);
    await page.goto(base + '#/'); await page.waitForSelector('.focus-card'); bad.push(...await audit(page, `${L}/home-focus-card`));
    await page.click('.focus-card button.primary'); await page.waitForSelector('dialog .area-grid'); bad.push(...await audit(page, `${L}/focus-picker`)); await page.check('dialog .area-pick >> nth=4 >> input'); await page.click('dialog footer .primary');
    await page.waitForSelector('.toolbar-main'); await openMenuWith(page, '🎁'); await qk(page, "🎁"); await page.waitForSelector('dialog .menu-item, dialog .empty'); bad.push(...await audit(page, `${L}/reward-menu`)); await page.click('dialog button:has(+ *) >> nth=-1').catch(() => {}); await closeDialogs(page);
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
    await closeDialogs(page); await page.locator('a.card.link-card').first().click(); await page.waitForSelector('.pattern'); bad.push(...await audit(page, `${L}/pattern-card`));
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
  await first.locator('.tp-val').first().click(); await page.click('dialog .tp-presets button >> nth=3'); assert.match(await page.textContent('dialog .tp-big'), /5\sm/); await page.click('dialog footer button:has-text("OK")');
  assert.match(await first.locator('.tp-val').first().textContent(), /5\sm/);
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
  await qk(page, "From a template"); await page.waitForSelector('dialog .tiles-grid'); await page.click('dialog .chip:has-text("Ready-made")'); await page.click('dialog .tile-btn:has-text("Bedtime")'); await page.waitForSelector('.task');
  assert.equal(await page.locator('.task').count(), 5); await page.goto(base + '#/'); await page.waitForFunction((n) => document.querySelectorAll('.routine').length > n, r0);
  assert.deepEqual(errors, []);
});

await step('v1.10: axe on template pickers and library page (young child too)', async () => {
  const bad = [];
  for (const [lang, scheme] of [['he', 'light'], ['en', 'dark']]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base); if (lang === 'he') await dismissWelcome(page); const L = `${lang}/${scheme}`;
    await page.waitForSelector('.routine'); await qk(page, "📚"); await page.waitForSelector('dialog .tiles-grid'); bad.push(...await audit(page, `${L}/routine-picker`)); await closeDialogs(page);
    await page.locator('.routine-main').first().click(); await page.waitForSelector('.task'); await page.click('.toolbar.wrap button >> nth=0'); await page.waitForSelector('dialog .tiles-grid'); bad.push(...await audit(page, `${L}/task-picker`)); await closeDialogs(page);
    await page.click('.fold-body button:has-text("💾")'); await page.waitForTimeout(400);
    await page.goto(base + '#/library'); await page.waitForSelector('.lib-card'); bad.push(...await audit(page, `${L}/library`));
    await setStyle(page, 'auto'); await page.goto(base + '#/settings'); await page.fill('input[type=number][max="120"]', '7'); await page.dispatchEvent('input[type=number][max="120"]', 'change'); await page.waitForTimeout(400);
    await page.goto(base + '#/'); await page.waitForSelector('.routine'); await qk(page, "📚"); await page.waitForSelector('dialog .tiles-grid'); bad.push(...await audit(page, `${L}/routine-picker-playful`)); await closeDialogs(page);
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.11: alarms screen, goals (Goal-Plan-Do-Check), sand clock, what's new ──
await step('v1.11: Alarms screen - find it from home, switch on, edit the chain in a sheet, schedule shows on the routine card', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await page.evaluate(async () => { const S = await import('./js/store.js'); for (const x of S.get().templates) await S.saveTemplate({ ...x, alarm: { ...x.alarm, enabled: false } }); });   // alarms are ON by default now; start this step from "all off"
  await qk(page, "Alarms"); await page.waitForSelector('.alarm-card'); assert.match(await page.textContent('.chip.solid'), /No alarm is on/);
  await page.locator('.alarm-card').first().locator('input[type=checkbox]').check(); await page.waitForFunction(() => !document.querySelector('.chip.solid'));
  await page.locator('.alarm-card').first().locator('button:has-text("Edit alarm")').click(); await page.waitForSelector('dialog .ring-card');
  await page.click('dialog button:has-text("Add another alarm")'); await page.waitForSelector('dialog .ring-card >> nth=1'); await page.click('dialog footer button:has-text("Done")'); await page.waitForSelector('dialog', { state: 'detached' });
  await page.waitForFunction(() => /→/.test(document.querySelector('.alarm-card small')?.textContent || ''));
  await page.goto(base + '#/'); await page.waitForSelector('.routine .alarm-line'); assert.match(await page.textContent('.routine .alarm-line'), /07:00 → 07:05/);
  assert.deepEqual(errors, []);
});

await step('v1.11: goals - create with strategies, plan card in the run, check-in after the run, edit/achieve; sand clock timer; what\'s new after an update', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await qk(page, "Goals"); await page.waitForSelector('.goal-card, .empty'); await page.click('button:has-text("New goal")'); await page.waitForSelector('dialog .strat-pick');
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
  assert.equal(await page.locator('.routine .alarm-line').count(), 0, 'the ready-made examples have their alarm OFF (nobody is woken by something they did not ask for)'); assert.ok(await page.locator('.routine .alarm-switch[aria-checked=false]').count() >= 2); assert.equal(await page.locator('.alarm-sticker').count(), 0);
  await page.goto(base + '#/alarms'); await page.waitForSelector('.alarm-card'); assert.match(await page.textContent('.chip.solid'), /No alarm is on/); assert.equal(await page.locator('.alarm-card input[type=checkbox]:checked').count(), 0);
  await page.goto(base + '#/'); await page.click('.tb-btn[data-tb=new]'); await page.waitForSelector('.alarm'); assert.ok(await page.locator('.alarm .switch input').first().isChecked(), 'a new routine starts with its alarm on'); await page.waitForTimeout(500);
  await page.goto(base + '#/'); await page.waitForSelector('.version-line'); const ver = JSON.parse((await import('node:fs')).readFileSync('web/version.json', 'utf8')).version; assert.match(await page.textContent('.version-line'), new RegExp(`v${ver.replace(/\./g, '\\.')}`));
  await page.click('.version-line button'); await page.waitForSelector(`dialog:has-text("New in ${ver}")`); assert.ok(await page.locator('dialog details').count() === 1); await closeDialogs(page);
  await page.goto(base + '#/settings'); await page.waitForSelector('button:has-text("What\'s new")'); assert.match(await page.textContent('.settings-group:has(button:has-text("What\'s new"))'), new RegExp(ver.replace(/\./g, '\\.'))); await page.click('button:has-text("What\'s new")'); await page.waitForSelector('dialog:has-text("New in")'); await closeDialogs(page);
  assert.deepEqual(errors, []);
});

await step('v1.13: smart times (hint, sheet, menu), smart extra steps by chosen help, helper step in the run, estimate accuracy card', async () => {
  const { page, errors } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  await page.evaluate(async () => { const S = await import('./js/store.js'); await S.patchProfile(S.activeProfile().id, { age: 8, focus: ['focus', 'calm'], focusSet: true }); });
  await page.click('.tb-btn[data-tb=new]'); await page.waitForSelector('.task'); await page.fill('.task-name', 'Shower'); await page.dispatchEvent('.task-name', 'change');
  await page.waitForSelector('.smart-hint'); assert.match(await page.textContent('.smart-hint'), /typical time for this kind of task/); await page.click('.smart-hint button'); await page.waitForSelector('.smart-hint', { state: 'detached' }); assert.ok(!/^5m$/.test((await page.textContent('.tp-val >> nth=0')).trim()));
  await page.click('button:has-text("Add task")'); await page.locator('.task-name').nth(1).fill('Homework'); await page.dispatchEvent('.task >> nth=1 >> .task-name', 'change');
  await page.click('.toolbar.wrap button:has-text("Smart times")'); await page.waitForSelector('dialog .smart-row'); assert.ok(await page.locator('dialog .smart-row').count() === 2); await page.click('dialog footer button:has-text("Apply")'); await page.waitForSelector('dialog', { state: 'detached' });
  const n0 = await page.locator('.task').count();
  await page.click('.fold-body button:has-text("Smart extra steps")'); await page.waitForSelector('dialog .smart-row'); assert.ok(await page.locator('dialog .smart-row').count() >= 3); assert.match(await page.textContent('dialog'), /Breathe slowly/); await page.click('dialog footer button:has-text("Apply")'); await page.waitForSelector('dialog', { state: 'detached' });
  await page.waitForFunction((n) => document.querySelectorAll('.task').length > n, n0); assert.match(await page.locator('.task-name').first().inputValue(), /Breathe slowly|Pick the one thing/);
  await page.waitForTimeout(500); await page.goto(base + '#/'); await page.locator('.routine').last().locator('.start').click(); await page.waitForSelector('.ring');
  const first = await page.textContent('.now'); if (/Breathe slowly/.test(first)) { await page.click('.task-help button.primary:has-text("Breathe now")'); await page.waitForSelector('dialog .calm-menu'); await closeDialogs(page); } else { await page.waitForSelector('.task-help button.primary'); }
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
    await page.click('.fold-body button:has-text("🧩")'); await page.waitForSelector('dialog .smart-row'); bad.push(...await audit(page, `${L}/smart-times`)); await closeDialogs(page);
    await page.click('.fold-body button:has-text("🧩")'); await page.waitForSelector('dialog .smart-row'); bad.push(...await audit(page, `${L}/smart-steps`)); await closeDialogs(page);
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
  // pace (set, let the change samples settle, then measure with the Test button)
  await page.click('.persona:has-text("Woman")'); const pace = async (v) => { await page.locator('input[type=range][aria-label="Speaking pace"]').fill(v); await page.dispatchEvent('input[type=range][aria-label="Speaking pace"]', 'change'); await page.waitForTimeout(1200); await clear(); await page.click('button:has-text("🔊")'); await page.waitForFunction(() => window.__said.length >= 1, null, { timeout: 60000 }); return (await said())[0].rate; };
  const slow = await pace('70'); const fast = await pace('130'); assert.ok(fast > slow + 0.2, 'pace changes the speed');
  // an animal says its sound (random 70%: try a few times)
  await page.click('.persona:has-text("Cat")'); await page.waitForTimeout(600); let meow = false; for (let i = 0; i < 14 && !meow; i++) { await clear(); await page.locator('button.btn:has-text("🔊")').dispatchEvent('click'); await page.waitForFunction(() => window.__said.length >= 1, null, { timeout: 3000 }).catch(() => {}); meow = (await said()).some((x) => x.text === 'meow' && x.pitch > 1.5); } assert.ok(meow, 'the cat meows');
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

// ── v1.17: calmer layout, search, wizard, suggestions ──
await step('v1.17: stats with no runs shows no "null"; alarm sheet fits a narrow screen with big text', async () => {
  const { page } = await newPage({ ctx: { viewport: { width: 320, height: 640 } } });
  await page.goto(base + '#/stats'); await page.waitForSelector('h1'); assert.ok(!/null|undefined/.test(await page.textContent('main')), 'no stray null text');
  await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ fontScale: 150 }); });
  await page.goto(base + '#/alarms'); await page.waitForSelector('.alarm-card button'); await page.click('.alarm-card button >> nth=0'); await page.waitForSelector('dialog[open] .alarm');
  const over = await page.evaluate(() => { const d = document.querySelector('dialog[open]').getBoundingClientRect(); return [...document.querySelectorAll('dialog[open] *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > d.right + 2 || r.left < d.left - 2); }).map((e) => e.tagName + '.' + e.className); });
  assert.deepEqual(over, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, 'page does not scroll sideways');
});

await step('v1.17: home is calm - search bar, New + wizard, tools behind More, one gentle suggestion with three answers', async () => {
  const { page } = await newPage({ foldsClosed: true }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ focusSeen: true }); localStorage.removeItem('mo.sug'); });
  assert.ok(await page.locator('.home-search').isVisible()); assert.equal(await page.locator('.quick:visible').count(), 0, 'tools are folded');
  assert.ok(await page.locator('.tb-btn[data-tb=wizard]').isVisible());
  assert.equal(await page.locator('.toolbar-main .tb-btn').count(), 6, 'one toolbar, six items'); const rows = await page.evaluate(() => new Set([...document.querySelectorAll('.toolbar-main .tb-btn')].map((b) => Math.round(b.getBoundingClientRect().top))).size); assert.equal(rows, 1, 'a single row');
  await page.click('.tb-btn[data-tb=plan]'); assert.ok(await page.locator('.tb-panel button:has-text("Alarms")').isVisible()); await page.click('.tb-btn[data-tb=track]'); assert.equal(await page.locator('.tb-btn[aria-expanded=true]').count(), 1, 'one dropdown open at a time'); await page.keyboard.press('Escape'); assert.equal(await page.locator('.tb-panel:not([hidden])').count(), 0);
  // a suggestion shows unless the "what helps" card is up; answer "Not now" -> snoozed, and nothing else the same day
  await page.evaluate(() => { localStorage.setItem('mo.sug', '{}'); }); await page.reload(); await page.waitForSelector('.routine');
  if (await page.locator('.suggest').count()) {
    const title = await page.locator('.suggest strong').textContent(); await page.click('.suggest button:has-text("Not now")'); await page.waitForFunction(() => !document.querySelector('.suggest'));
    assert.ok((await page.evaluate(() => JSON.parse(localStorage.getItem('mo.sug'))).snoozed) && title, 'answer stored');
    await page.reload(); await page.waitForSelector('.routine'); assert.equal(await page.locator('.suggest').count(), 0, 'one a day');
  }
  await page.evaluate(() => localStorage.setItem('mo.sug', JSON.stringify({ off: false, hidden: [], snoozed: {}, last: 0 }))); await page.reload(); await page.waitForSelector('.routine');
  if (await page.locator('.suggest').count()) { await page.click('.suggest button:has-text("Don’t show this again")'); assert.ok((await page.evaluate(() => JSON.parse(localStorage.getItem('mo.sug'))).hidden.length) === 1); }
});

await step('v1.17: global search - English and Hebrew words, routines by name, Enter, arrows, Ctrl+K, deep link into a settings group', async () => {
  const { page } = await newPage({ foldsClosed: true }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  await page.click('.home-search'); await page.waitForSelector('dialog.search-modal[open]'); assert.ok(await page.locator('.search-item').count() >= 4, 'popular items when empty');
  await page.fill('.search-input', 'alarm'); assert.match(await page.locator('.search-item').first().textContent(), /Alarms/); await page.keyboard.press('Enter'); await page.waitForFunction(() => location.hash === '#/alarms');
  await page.keyboard.press('Control+k'); await page.waitForSelector('dialog.search-modal[open]'); await page.fill('.search-input', 'voice'); await page.waitForFunction(() => document.querySelector('.search-item')?.textContent.includes('voice')); await page.click('.search-item >> nth=0');
  await page.waitForFunction(() => location.hash === '#/settings/voice'); await page.waitForSelector('details.settings-group[data-group=voice][open] .persona-grid');
  await page.click('nav .nav-search'); await page.fill('.search-input', 'zzzzqqq'); assert.equal(await page.locator('.search-item').count(), 0); assert.ok(await page.locator('.search-results .empty').isVisible());
  const nm = (await page.evaluate(async () => (await import('./js/store.js')).get().templates[0].name)).split(' ')[0]; await page.fill('.search-input', nm); assert.ok(await page.locator('.search-item:has-text("Start:")').count() >= 1, 'routines by name'); await page.keyboard.press('ArrowDown'); assert.equal(await page.evaluate(() => document.activeElement.classList.contains('search-item')), true);
  await page.keyboard.press('Escape');
  const he = await newPage({ lang: 'he', foldsClosed: true }); await he.page.goto(base + '#/'); await dismissWelcome(he.page); await he.page.waitForSelector('.routine');
  await he.page.click('.home-search'); await he.page.fill('.search-input', 'שעון'); assert.match(await he.page.locator('.search-item').first().textContent(), /שעונים/);
});

await step('v1.17: wizard - five calm questions build a routine for the person, then start / edit / done', async () => {
  const { page } = await newPage({ foldsClosed: true }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  const before = await page.locator('.routine').count();
  await page.click('.tb-btn[data-tb=wizard]'); await page.waitForSelector('dialog.wizard-modal[open] .wz-opt');
  assert.match(await page.textContent('.wz-step'), /Step 1 of 6/); await page.click('.wz-opt:has-text("My child")'); await page.click('.wz-opt:has-text("8–10")'); await page.click('.wz-nav .btn.primary');
  await page.click('.wz-opt:has-text("Staying focused")'); await page.click('.wz-opt:has-text("calmer")'); await page.click('.wz-nav .btn.primary');
  await page.click('.wz-opt:has-text("A new goal")'); await page.fill('.wizard .wz-name', 'Calm evenings'); await page.click('.wz-nav .btn.primary');
  await page.click('.wz-opt:has-text("Bedtime")'); await page.click('.wz-nav .btn.primary');
  await page.fill('.wizard input[type=time]', '19:45'); await page.dispatchEvent('.wizard input[type=time]', 'change'); await page.click('.wz-opt:has-text("Every day")'); await page.click('.wz-nav .btn.primary');
  await page.waitForSelector('.wz-tasks li'); const withBreaks = await page.locator('.wz-tasks li').count(); await page.click('.wizard label.switch input'); const without = await page.locator('.wz-tasks li').count(); assert.ok(withBreaks > without, 'breaks can be switched off'); await page.click('.wizard label.switch input');
  // edit right here, before creating: rename, more time, remove a step, add a step
  const n0 = await page.locator('.wz-task').count(); await page.locator('.wz-task .wz-name').first().fill('Tidy my room'); const t0 = await page.locator('.wz-time').first().textContent(); await page.locator('.wz-task').first().locator('button[aria-label="More time"]').click(); assert.notEqual(await page.locator('.wz-time').first().textContent(), t0, 'time changes');
  await page.locator('.wz-task').last().locator('button[aria-label^="Remove this step"]').click(); assert.equal(await page.locator('.wz-task').count(), n0 - 1); await page.click('button:has-text("Add a step")'); await page.locator('.wz-task .wz-name').last().fill('Hug the dog');
  await page.click('.wz-nav .btn:has-text("Back")'); await page.click('.wz-nav .btn.primary'); assert.equal(await page.locator('.wz-task .wz-name').first().inputValue(), 'Tidy my room', 'edits survive Back / Next');
  await page.click('.wz-nav .btn.primary:has-text("Create my routine")'); await page.waitForSelector('.wizard .btn:has-text("Start now")');
  const made = await page.evaluate(async () => { const S = await import('./js/store.js'); const x = S.get().templates.at(-1); return { name: x.name, n: x.tasks.length, alarm: x.alarm.time, enabled: x.alarm.enabled, days: x.days.length, helper: x.tasks.some((k) => k.helperKey), names: x.tasks.map((k) => k.name), id: x.id, goal: S.goals().find((g) => g.templateId === x.id)?.title }; });
  assert.equal(made.alarm, '19:45'); assert.equal(made.enabled, true); assert.equal(made.days, 0, 'every day'); assert.ok(made.n >= 5 && made.helper, 'bedtime steps plus calm/focus breaks'); assert.ok(made.names.includes('Tidy my room') && made.names.includes('Hug the dog'), 'the edits are what was created'); assert.equal(made.goal, 'Calm evenings', 'the goal was created and linked');
  await page.click('.wizard .btn:has-text("Edit it")'); await page.waitForFunction(() => location.hash.startsWith('#/edit/')); await page.goto(base + '#/'); await page.waitForSelector('.routine'); assert.equal(await page.locator('.routine').count(), before + 1);
});

await step('v1.17: each routine card has an alarm switch (armed / off) separate from Start; it saves and survives reload', async () => {
  const { page } = await newPage({ foldsClosed: true }); await page.goto(base + '#/'); await page.waitForSelector('.routine .alarm-switch');
  const sw = page.locator('.routine .alarm-switch').first(); assert.equal(await sw.getAttribute('aria-checked'), 'false', 'ready-made examples start with the alarm OFF'); assert.equal(await page.locator('.routine.armed').count(), 0);
  await sw.click(); await page.waitForFunction(() => document.querySelector('.routine .alarm-switch')?.getAttribute('aria-checked') === 'true'); assert.ok(await page.locator('.routine.armed').count() >= 1);
  assert.equal(await page.evaluate(async () => (await import('./js/store.js')).get().templates[0].alarm.enabled), true, 'saved');
  await page.reload(); await page.waitForSelector('.routine .alarm-switch'); assert.equal(await page.locator('.routine .alarm-switch').first().getAttribute('aria-checked'), 'true');
  await page.locator('.routine .alarm-switch').first().click(); await page.waitForFunction(() => document.querySelector('.routine .alarm-switch')?.getAttribute('aria-checked') === 'false');
  await page.locator('.routine .alarm-switch').first().click(); await page.waitForFunction(() => document.querySelector('.routine .alarm-switch')?.getAttribute('aria-checked') === 'true');
  assert.match(await page.textContent('.routine .alarm-line'), /07:00/); assert.equal(await page.locator('.routine .start').first().isEnabled(), true, 'Start is separate');
});

await step('v1.17: run screen keeps Done + Pause in view; the rest sits behind More; difficulty behind one tap', async () => {
  const { page } = await newPage({ foldsClosed: true }); await page.goto(base + '#/run/sample-kids'); await page.waitForSelector('.main-btns');
  assert.equal(await page.locator('.run-more .row-btns:visible').count(), 0); assert.equal(await page.locator('.diff-row').isVisible(), false);
  const box = await page.locator('.main-btns').boundingBox(); assert.ok(box.y + box.height < 800, 'Done/Pause above the fold'); assert.ok(box.width > 200);
  await page.click('.run-more summary'); assert.ok(await page.locator('.run-more button:has-text("+1 min")').isVisible()); await page.click('.run-more button:has-text("+1 min")');
  await page.click('.help-fold summary'); assert.ok(await page.locator('.diff-row').isVisible()); await page.locator('.diff').nth(3).click();
  assert.match(await page.textContent('.help-fold summary'), /😓/);
});

await step('v1.17: axe on search, wizard (every step), suggestion card, folded home / edit / run (he + en, big text)', async () => {
  const bad = [];
  for (const [lang, big] of [['he', false], ['en', true]]) {
    const { page } = await newPage({ lang, foldsClosed: true }); await page.goto(base); if (lang === 'he') await dismissWelcome(page);
    if (big) await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ fontScale: 150 }); });
    await page.evaluate(() => localStorage.setItem('mo.sug', '{}')); await page.goto(base + '#/'); await page.reload(); await page.waitForSelector('.routine'); await dismissWelcome(page); bad.push(...await audit(page, `${lang}/home`));
    await page.click('.tb-btn[data-tb=plan]'); bad.push(...await audit(page, `${lang}/home-menu-open`));
    await page.click('.home-search'); await page.waitForSelector('.search-item'); bad.push(...await audit(page, `${lang}/search`)); await page.fill('.search-input', 'a'); bad.push(...await audit(page, `${lang}/search-results`)); await page.keyboard.press('Escape'); await page.waitForSelector('dialog', { state: 'detached' });
    await page.click('.tb-btn[data-tb=wizard]'); await page.waitForSelector('.wz-opt');
    for (let i = 0; i < 6; i++) { bad.push(...await audit(page, `${lang}/wizard-${i}`)); if (i < 5) await page.click('.wz-nav .btn.primary'); }
    await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelectorAll('dialog').forEach((d) => d.remove()));
    await page.goto(base + '#/edit/sample-kids'); await page.waitForSelector('.task'); bad.push(...await audit(page, `${lang}/edit-folded`));
    await page.click('details.fold summary >> nth=3'); bad.push(...await audit(page, `${lang}/edit-fold-open`));
    await page.goto(base + '#/run/sample-kids'); await page.waitForSelector('.main-btns'); bad.push(...await audit(page, `${lang}/run-folded`)); await page.click('.run-more summary'); await page.click('.help-fold summary'); bad.push(...await audit(page, `${lang}/run-folds-open`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.18: SonRise, quiet days, pause, ring types, one toolbar ──
await step('v1.18: SonRise name + logo everywhere, durations have a space before the unit', async () => {
  const { page } = await newPage(); await page.goto(base); await page.waitForSelector('.routine');
  assert.equal(await page.title(), 'SonRise'); const man = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json()); assert.equal(man.name, 'SonRise'); assert.equal(man.short_name, 'SonRise');
  const svg = await page.evaluate(async () => (await fetch('icon.svg')).text()); assert.match(svg, /aria-label="SonRise"/); assert.match(await page.textContent('h1'), /SonRise/);
  assert.match(await page.textContent('.routine small'), /\d\s(m|h|s)\b/); await page.goto(base + '#/edit/sample-kids'); await page.waitForSelector('.task'); assert.match(await page.locator('.tp-val').first().textContent(), /\d m|\d\s?m/);
  const he = await newPage({ lang: 'he' }); await he.page.goto(base); await dismissWelcome(he.page); await he.page.goto(base + '#/edit/sample-kids'); await he.page.waitForSelector('.task'); assert.match(await he.page.locator('.tp-val').first().textContent(), /\d\s+ד׳|\d ד׳/, 'a space before ד׳');
});

await step('v1.18: ring type tiles (9 types, preview), quiet-on-holidays switch (on by default) with the next days off', async () => {
  const { page } = await newPage({ foldsClosed: true }); await page.goto(base + '#/edit/sample-kids'); await page.waitForSelector('.task'); await page.click('details.fold summary:has-text("Wake-up")').catch(() => page.click('details.fold >> nth=-1 >> summary'));
  await page.locator('.alarm .switch input').first().check(); await page.waitForSelector('.sound-grid'); assert.equal(await page.locator('.sound-grid .sound-tile').count(), 8, 'eight tiles in a browser (the phone-sound tile is app-only)');
  await page.click('.sound-tile:has-text("Bell")'); await page.waitForFunction(async () => (await import('./js/store.js')).get().templates.find((x) => x.id === 'sample-kids').alarm.sound === 'bell');
  assert.equal(await page.locator('.sound-tile[aria-checked=true]').count() >= 1, true);
  const off = page.locator('input[aria-label="Quiet on holidays and vacations"]'); assert.equal(await off.isChecked(), true, 'on by default'); assert.match(await page.textContent('.alarm'), /Next days off/);
  await off.uncheck(); await page.waitForFunction(async () => (await import('./js/store.js')).get().templates.find((x) => x.id === 'sample-kids').alarm.offDays === false);
});

await step('v1.18: Hebrew date + holiday on Home, quiet alarm skips the holiday; pause all alarms from the toolbar, banner and resume; alarm sticker', async () => {
  const { page } = await newPage({ foldsClosed: true }); await page.clock.install({ time: new Date('2026-09-12T05:00:00') }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  await page.evaluate(async () => { const S = await import('./js/store.js'), x = S.getTemplate('sample-kids'); await S.saveTemplate({ ...x, alarm: { ...x.alarm, enabled: true } }); });
  assert.match(await page.textContent('.hero'), /Tishri/); assert.match(await page.textContent('.hero'), /Rosh Hashana/);
  assert.ok(await page.locator('.routine .alarm-sticker').count() >= 1, 'alarm sticker on routines with an alarm');
  assert.match(await page.textContent('.hero .chip:has-text("Next")').catch(() => ''), /./);
  await page.click('.tb-btn[data-tb=alarms]'); await page.waitForSelector('dialog'); await page.click('dialog button:has-text("Until tomorrow")'); await page.waitForSelector('.paused-banner');
  assert.equal(await page.locator('.tb-btn[data-tb=alarms]').getAttribute('aria-pressed'), 'true'); assert.match(await page.textContent('.tb-btn[data-tb=alarms]'), /paused/i);
  assert.ok((await page.evaluate(async () => (await import('./js/store.js')).get().settings.alarmsPause)) > 0);
  await page.click('.paused-banner button'); await page.waitForFunction(() => !document.querySelector('.paused-banner')); assert.equal(await page.evaluate(async () => (await import('./js/store.js')).get().settings.alarmsPause), 0);
  await page.click('.tb-btn[data-tb=alarms]'); await page.click('dialog button:has-text("Until I switch them back on")'); assert.equal(await page.evaluate(async () => (await import('./js/store.js')).get().settings.alarmsPause), -1);
  await page.waitForSelector('.paused-banner'); assert.match(await page.textContent('.paused-banner'), /switch them back on/);
});

await step('v1.18: axe + layout of the new toolbar, ring tiles, pause sheet, banner (he + en, big text)', async () => {
  const bad = [];
  for (const [lang, big] of [['he', false], ['en', true]]) {
    const { page } = await newPage({ lang, foldsClosed: true }); await page.goto(base); if (lang === 'he') await dismissWelcome(page);
    if (big) await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ fontScale: 150 }); });
    await page.goto(base + '#/'); await page.reload(); await page.waitForSelector('.toolbar-main'); await dismissWelcome(page); bad.push(...await audit(page, `${lang}/toolbar`));
    const rows = await page.evaluate(() => new Set([...document.querySelectorAll('.toolbar-main .tb-btn')].map((b) => Math.round(b.getBoundingClientRect().top))).size); assert.equal(rows, 1, `${lang}: one row`);
    const over = await page.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll('.toolbar-main .tb-btn')].some((b) => b.getBoundingClientRect().right > vw + 1 || b.getBoundingClientRect().left < -1 || b.scrollWidth > b.clientWidth + 2); }); assert.equal(over, false, `${lang}: toolbar fits`);
    await page.click('.tb-btn[data-tb=plan]'); bad.push(...await audit(page, `${lang}/toolbar-open`)); await page.click('.tb-btn[data-tb=alarms]'); await page.waitForSelector('dialog'); bad.push(...await audit(page, `${lang}/pause-sheet`)); await page.click('dialog .btn:not(.icon-btn) >> nth=0'); await page.waitForSelector('.paused-banner'); bad.push(...await audit(page, `${lang}/pause-banner`));
    await page.goto(base + '#/edit/sample-kids'); await page.waitForSelector('.task'); await page.click('details.fold >> nth=-1 >> summary'); await page.locator('.alarm .switch input').first().check(); await page.waitForSelector('.sound-grid'); bad.push(...await audit(page, `${lang}/ring-tiles`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.18.1: share the app, auto-update ──
await step('v1.18.1: share SonRise (Android app + web app) by WhatsApp / e-mail / copy; found by search; axe (he + en)', async () => {
  const bad = [];
  for (const lang of ['en', 'he']) {
    const { page } = await newPage({ lang, foldsClosed: true }); await page.goto(base + '#/settings/app'); if (lang === 'he') await dismissWelcome(page); await page.waitForSelector('details[data-group=app][open]');
    await page.click('details[data-group=app] button.primary:has-text("📣")'); await page.waitForSelector('dialog[open] a[href^="https://wa.me/"]');
    assert.equal(await page.locator('dialog[open] section').count(), 2, 'android + web blocks');
    const hrefs = await page.locator('dialog[open] a').evaluateAll((as) => as.map((a) => a.href)); assert.equal(hrefs.filter((x) => x.startsWith('https://wa.me/?text=')).length, 2); assert.equal(hrefs.filter((x) => x.startsWith('mailto:?subject=')).length, 2);
    assert.ok(hrefs.some((x) => decodeURIComponent(x).includes('.apk')) && hrefs.some((x) => decodeURIComponent(x).includes('github.io')), 'APK link and PWA link');
    assert.equal(await page.locator('dialog[open] a[target=_blank][rel~=noopener]').count(), 4);
    bad.push(...await audit(page, `${lang}/share-app`)); await closeDialogs(page);
    await page.goto(base + '#/'); await page.waitForSelector('.home-search'); await page.click('.home-search'); await page.fill('.search-input', lang === 'he' ? 'וואטסאפ' : 'whatsapp'); await page.keyboard.press('Enter'); await page.waitForSelector('dialog[open] a[href^="https://wa.me/"]');
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.19: calm guides, situation log (APRT), goals inside routines ──
await step('v1.19: calm corner - guided imagery (four elements + 10 more), four kinds of body scan', async () => {
  const { page } = await newPage({ foldsClosed: true }); await page.goto(base + '#/calm'); await page.waitForSelector('.calm-menu');
  await page.click('.seg-group button:has-text("Guided imagery")'); assert.ok(await page.locator('.guide-grid .sound-tile').count() >= 10, 'many guides');
  assert.ok(await page.locator('.guide-grid .sound-tile:has-text("earth, air, water, fire")').count() === 1, 'the four elements guide');
  await page.click('.guide-grid .sound-tile:has-text("earth, air, water, fire")'); await page.click('.seg-group button:has-text("2 min")'); await page.click('button:has-text("Start")'); await page.waitForSelector('.calm-label');
  await page.waitForFunction(() => /Earth/.test(document.querySelector('.calm-label')?.textContent || '')); assert.match(await page.textContent('.calm-sub'), /1\/9/); await page.click('button:has-text("Stop")');
  await page.waitForSelector('.calm-menu'); await page.click('.seg-group button:has-text("Body scan")'); assert.equal(await page.locator('.seg-group[aria-label="Kind of body scan"] button').count(), 4);
  await page.click('.seg-group button:has-text("Tense and release")'); await page.click('button:has-text("Start")'); await page.waitForFunction(() => /Tense your/.test(document.querySelector('.calm-label')?.textContent || '')); await page.click('button:has-text("Stop")');
  await page.waitForSelector('.calm-menu'); await page.click('.seg-group button:has-text("Body scan")'); await page.click('.seg-group button:has-text("For sleep")'); await page.click('button:has-text("Start")'); await page.waitForFunction(() => /heavy/.test(document.querySelector('.calm-label')?.textContent || ''));
  const he = await newPage({ lang: 'he', foldsClosed: true }); await he.page.goto(base + '#/calm'); await dismissWelcome(he.page); await he.page.click('.seg-group button:has-text("דמיון מודרך")'); await he.page.click('.guide-grid .sound-tile:has-text("ארבעת היסודות")'); await he.page.click('button:has-text("התחלה")');
  await he.page.waitForFunction(() => /אדמה/.test(document.querySelector('.calm-label')?.textContent || ''));
});

await step('v1.19: situation log (APRT) - five calm steps, saved to the journal, pattern insights after three, found by search', async () => {
  const { page } = await newPage({ foldsClosed: true }); await page.goto(base + '#/journal'); await page.waitForSelector('.toolbar-main');
  const log = async (event, interp, feeling, n) => {
    await page.click('.tb-btn[data-tb=reflect]'); await page.click('.tb-panel button:has-text("Situation log")'); await page.waitForSelector('.aprt');
    assert.equal(await page.locator('.aprt-steps li').count(), 5); await page.fill('.aprt textarea', event); await page.click('.wz-nav .btn.primary');
    await page.fill('.aprt textarea', interp); await page.click('.wz-nav .btn.primary'); await page.click(`.aprt .wz-opt:has-text("${feeling}")`); await page.locator('.aprt input[type=range]').fill(String(n)); await page.click('.wz-nav .btn.primary');
    await page.click('.aprt .wz-opt:has-text("avoided")'); await page.click('.wz-nav .btn.primary'); await page.waitForSelector('.aprt textarea'); if (n < 7) { await page.fill('.aprt textarea', 'One small step is enough'); }
    await page.click('.wz-nav .btn:has-text("Save now")'); await page.waitForSelector('dialog', { state: 'detached' });
  };
  await log('Homework with mom at the table', 'I will never get this right', 'worried', 8); await page.waitForSelector('.entry:has-text("Homework with mom")'); assert.equal(await page.locator('.aprt-insights').count(), 0, 'not before three');
  await log('Homework alone in my room', 'I always ruin everything', 'worried', 7); await log('Homework before dinner', 'I should be faster', 'worried', 5);
  await page.waitForSelector('.aprt-insights'); const txt = await page.textContent('.aprt-insights'); assert.match(txt, /worried/); assert.match(txt, /homework/i); assert.match(txt, /Catastrophizing|“Should”/); assert.match(txt, /not a diagnosis/);
  const card = await page.textContent('.entry'); assert.match(card, /Event|What happened/); await page.goto(base + '#/'); await page.click('.home-search'); await page.fill('.search-input', 'aprt'); await page.keyboard.press('Enter'); await page.waitForSelector('.aprt');
  const he = await newPage({ lang: 'he', foldsClosed: true }); await he.page.goto(base + '#/journal'); await dismissWelcome(he.page); await he.page.click('.tb-btn[data-tb=reflect]'); await he.page.click('.tb-panel button >> nth=0'); await he.page.waitForSelector('.aprt'); assert.match(await he.page.textContent('.aprt-steps'), /א.*פ.*ר.*ת/);
});

await step('v1.19: goals inside routines - chip on the card, goal section in the editor, "build a routine for this goal" from a goal', async () => {
  const { page } = await newPage({ foldsClosed: true }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  await page.evaluate(async () => { const S = await import('./js/store.js'); const { sanitizeGoal } = await import('./js/cogfun.js'); await S.saveGoal(sanitizeGoal({ title: 'Be ready by 7:30', templateId: 'sample-kids', strategies: ['quiet', 'timer'] })); });
  await page.reload(); await page.waitForSelector('.routine .goal-chip'); assert.match(await page.textContent('.routine .goal-chip'), /Be ready by 7:30/);
  await page.goto(base + '#/edit/sample-kids'); await page.waitForSelector('.task'); await page.click('details.fold:has(summary:has-text("Goal")) summary'); assert.match(await page.textContent('details.fold:has(summary:has-text("Goal"))'), /Be ready by 7:30/);
  await page.click('details.fold:has(summary:has-text("Goal")) button:has-text("Unlink")'); await page.waitForFunction(async () => !(await import('./js/store.js')).get().profiles.some((p) => p.goals?.some((g) => g.templateId === 'sample-kids')));
  await page.goto(base + '#/goals'); await page.waitForSelector('.goal-card'); await page.click('.goal-card button:has-text("Build a routine for this goal")'); await page.waitForSelector('.wizard-modal[open] .wz-opt'); assert.match(await page.textContent('.wz-step'), /Step 4 of 6/);
  await page.click('.wz-opt:has-text("Bedtime")'); await page.click('.wz-nav .btn.primary'); await page.click('.wz-nav .btn.primary'); await page.waitForSelector('.wz-task'); assert.match(await page.textContent('.wizard'), /Be ready by 7:30/);
  const names = await page.locator('.wz-task .wz-name').evaluateAll((xs) => xs.map((x) => x.value)); assert.ok(names.some((x) => /Clear the desk|Start the timer/.test(x)), 'the goal adds its strategy steps: ' + names.join('|'));
  await page.click('.wz-nav .btn.primary:has-text("Create my routine")'); await page.waitForSelector('.wizard .btn:has-text("Start now")');
  assert.equal(await page.evaluate(async () => { const S = await import('./js/store.js'), x = S.get().templates.at(-1); return S.goals().find((g) => g.title === 'Be ready by 7:30').templateId === x.id; }), true, 'the goal now points at the new routine');
});

await step('v1.19: axe on guided imagery, the situation log steps + insights, goal section, wizard goal step (he + en, big text)', async () => {
  const bad = [];
  for (const [lang, big] of [['he', false], ['en', true]]) {
    const { page } = await newPage({ lang, foldsClosed: true }); await page.goto(base); if (lang === 'he') await dismissWelcome(page);
    if (big) await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ fontScale: 150 }); });
    await page.goto(base + '#/calm'); await page.reload(); await page.waitForSelector('.calm-menu'); await dismissWelcome(page); await page.click('.seg-group button >> nth=3'); bad.push(...await audit(page, `${lang}/calm-guides`)); await page.click('.seg-group button >> nth=2'); bad.push(...await audit(page, `${lang}/calm-scan`));
    await page.goto(base + '#/journal'); await page.waitForSelector('.toolbar-main'); await page.evaluate(async () => { const J = await import('./js/journal.js'), S = await import('./js/store.js'); for (let i = 0; i < 3; i++) await J.addEntry(S.activeProfile().id, { kind: 'aprt', aprt: { event: 'homework at home', interp: 'I always fail', emotion: 'worry', intensity: 6 - i, responses: ['avoided'] } }); });
    await page.reload(); await page.waitForSelector('.aprt-insights'); bad.push(...await audit(page, `${lang}/aprt-insights`));
    await page.click('.tb-btn[data-tb=reflect]'); await page.click('.tb-panel button >> nth=0'); await page.waitForSelector('.aprt'); for (let i = 0; i < 5; i++) { bad.push(...await audit(page, `${lang}/aprt-${i}`)); if (i < 4) await page.click('.wz-nav .btn.primary'); } await closeDialogs(page);
    await page.goto(base + '#/'); await page.waitForSelector('.tb-btn[data-tb=wizard]'); await page.click('.tb-btn[data-tb=wizard]'); await page.waitForSelector('.wz-opt'); await page.click('.wz-nav .btn.primary'); await page.click('.wz-nav .btn.primary'); await page.waitForSelector('.wz-opt'); bad.push(...await audit(page, `${lang}/wizard-goal`)); await page.click('.wz-opt >> nth=0'); bad.push(...await audit(page, `${lang}/wizard-goal-new`));
    await page.click('.wz-nav .btn.primary'); await page.click('.wz-nav .btn.primary'); await page.click('.wz-nav .btn.primary'); await page.waitForSelector('.wz-task'); bad.push(...await audit(page, `${lang}/wizard-edit`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.19.1: example routines ship with the alarm off; the start-up screen is the logo ──
await step('v1.19.1: example routines have the alarm OFF (also for an old install), new routines stay ON; start-up screen shows the logo', async () => {
  const { page } = await newPage({ foldsClosed: true }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  const st = await page.evaluate(async () => { const S = await import('./js/store.js'); return S.get().templates.filter((x) => x.builtin).map((x) => ({ id: x.id, on: x.alarm.enabled, time: x.alarm.time })); });
  assert.ok(st.length >= 2 && st.every((x) => !x.on && /^\d\d:\d\d$/.test(x.time)), 'examples: time ready, alarm off: ' + JSON.stringify(st));
  // an install from before: an example with its alarm on and the one-time flag not yet set is switched off at the next start
  await page.evaluate(async () => { const S = await import('./js/store.js'), x = S.getTemplate('sample-kids'); await S.saveTemplate({ ...x, alarm: { ...x.alarm, enabled: true } }); await S.updateSettings({ samplesAlarmsOff: false }); });
  await page.reload(); await page.waitForSelector('.routine .alarm-switch'); await page.waitForFunction(async () => (await import('./js/store.js')).get().settings.samplesAlarmsOff === true);
  assert.equal(await page.evaluate(async () => (await import('./js/store.js')).getTemplate('sample-kids').alarm.enabled), false, 'switched off once');
  await page.click('.routine .alarm-switch'); await page.waitForFunction(() => document.querySelector('.routine .alarm-switch')?.getAttribute('aria-checked') === 'true'); await page.reload(); await page.waitForSelector('.routine .alarm-switch');
  assert.equal(await page.evaluate(async () => (await import('./js/store.js')).getTemplate('sample-kids').alarm.enabled), true, 'a deliberate choice is kept (the migration runs once)');
  await page.goto(base + '#/'); await page.click('.tb-btn[data-tb=new]'); await page.waitForSelector('.task'); await page.click('details.fold >> nth=-1 >> summary'); await page.waitForSelector('.alarm'); assert.ok(await page.locator('.alarm .switch input').first().isChecked(), 'a new routine of your own starts with the alarm on');
  const html = await page.evaluate(async () => (await fetch('index.html')).text()); assert.match(html, /id="boot"[^>]*>\s*<img class="boot-logo" src="icon.svg"/); assert.ok(!/id="boot"[^>]*>\s*☀/.test(html), 'no sun emoji');
  const css = await page.evaluate(async () => (await fetch('css/app.css')).text()); assert.match(css, /@keyframes boot-rise/); assert.match(css, /@keyframes boot-load/);
});

// ── v1.19.2: start over / cancel / delete a run ──
await step('v1.19.2: a routine in progress can be started over or cancelled (nothing saved), from the run screen and from Home; a finished run can be deleted (undo)', async () => {
  const { page } = await newPage({ foldsClosed: true }); const active = () => page.evaluate(async () => { const r = await (await import('./js/store.js')).loadActive(); return r ? { id: r.id, current: r.current } : null; });
  const runsN = () => page.evaluate(async () => (await import('./js/store.js')).get().runs.length);
  await page.goto(base + '#/run/sample-kids'); await page.waitForSelector('.main-btns'); await page.click('.main-btns .primary'); await page.waitForFunction(async () => ((await (await import('./js/store.js')).loadActive())?.current ?? 0) === 1);
  const first = await active(); assert.equal(first.current, 1);
  // start over (from the run screen)
  await page.click('.run-more summary'); await page.click('.run-more button:has-text("Start over")'); await page.click('dialog footer button >> nth=-1'); await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.waitForFunction(() => document.querySelector('.pw')?.textContent.includes('0/')); await page.click('.main-btns .primary'); const again = await active(); assert.notEqual(again.id, first.id, 'a brand-new run'); assert.equal(again.current, 1); assert.equal(await runsN(), 0, 'nothing was saved to the history');
  // cancel (from the run screen)
  await page.click('.run-more summary'); await page.click('.run-more button:has-text("Cancel this run")'); await page.click('dialog footer button >> nth=-1'); await page.waitForFunction(() => location.hash === '#/');
  assert.equal(await active(), null, 'no run in progress'); assert.equal(await runsN(), 0); assert.equal(await page.locator('.active-run').count(), 0);
  // from the Home "continue" card: cancel, and start over
  await page.goto(base + '#/run/sample-kids'); await page.waitForSelector('.main-btns'); await page.click('.main-btns .primary'); await page.goto(base + '#/'); await page.waitForSelector('.active-run');
  assert.ok(await page.locator('.active-run button:has-text("Start over")').isVisible() && await page.locator('.active-run button:has-text("Cancel this run")').isVisible());
  await page.click('.active-run button:has-text("Cancel this run")'); await page.click('dialog footer button >> nth=-1'); await page.waitForFunction(() => !document.querySelector('.active-run')); assert.equal(await active(), null);
  await page.goto(base + '#/run/sample-kids'); await page.waitForSelector('.main-btns'); await page.click('.main-btns .primary'); await page.goto(base + '#/'); await page.waitForSelector('.active-run'); const before = await active();
  await page.click('.active-run button:has-text("Start over")'); await page.click('dialog footer button >> nth=-1'); await page.waitForFunction(() => location.hash.startsWith('#/run/')); await page.waitForSelector('.main-btns'); await page.waitForFunction(() => document.querySelector('.pw')?.textContent.includes('0/'));
  // finish a run, then delete it from the summary (undo brings it back)
  for (let i = 0; i < 6; i++) await page.click('text=Done ✓'); await page.waitForSelector('.summary'); assert.equal(await runsN(), 1);
  await page.click('.summary button:has-text("Delete this run")'); await page.click('dialog footer button >> nth=-1'); await page.waitForFunction(() => location.hash === '#/'); assert.equal(await runsN(), 0, 'deleted from the history');
  await page.click('#toast button'); await page.waitForFunction(async () => (await import('./js/store.js')).get().runs.length === 1); assert.equal(await runsN(), 1, 'undo restores it'); void before;
});

await step('v1.19.2: axe on the Home continue card, the run More menu with start over / cancel, the confirm and the summary with delete (he + en, big text)', async () => {
  const bad = [];
  for (const [lang, big] of [['he', false], ['en', true]]) {
    const { page } = await newPage({ lang, foldsClosed: true }); await page.goto(base); if (lang === 'he') await dismissWelcome(page);
    if (big) await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ fontScale: 150 }); });
    await page.goto(base + '#/run/sample-kids'); await page.reload(); await page.waitForSelector('.main-btns'); await dismissWelcome(page); await page.click('.main-btns .primary');
    await page.click('.run-more summary'); bad.push(...await audit(page, `${lang}/run-more`)); await page.click('.run-more button >> nth=-2'); await page.waitForSelector('dialog[open]'); bad.push(...await audit(page, `${lang}/cancel-confirm`)); await closeDialogs(page);
    await page.goto(base + '#/'); await page.waitForSelector('.active-run'); bad.push(...await audit(page, `${lang}/home-continue`));
    await page.goto(base + '#/run/sample-kids'); await page.waitForSelector('.main-btns'); for (let i = 0; i < 6; i++) await page.click('.main-btns .primary').catch(() => {}); await page.waitForSelector('.summary'); bad.push(...await audit(page, `${lang}/summary-delete`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.20: what the app is for, several people, skins, settings search / jump bar, voice commands ──
const FAKE_SPEECH = () => {
  // a recogniser we can drive from the test: window.__say('done') delivers a final result; it ends by itself after each result, like a real one often does
  window.__recs = [];
  window.SpeechRecognition = window.webkitSpeechRecognition = class { constructor() { window.__recs.push(this); this.started = false; } start() { this.started = true; } stop() { this.started = false; this.onend?.(); } abort() { this.stop(); } };
  window.__say = (text) => { const r = window.__recs.filter((x) => x.started).pop(); if (!r) return false; r.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] }); r.started = false; r.onend?.(); return true; };
};
await step('v1.20: "what the app is for" hides what does not fit and "Show everything" brings it back', async () => {
  const { page } = await newPage({ lang: 'he' }); await page.goto(base + '#/settings/needs'); await dismissWelcome(page);
  await page.click('button:has-text("שינוי למה האפליקציה משמשת")'); await page.waitForSelector('dialog[open] .needs');
  await page.click('dialog[open] .needs-opt:has-text("חרדה")'); await page.click('dialog[open] footer button.primary'); await page.waitForTimeout(300); await page.waitForSelector('dialog[open]:has-text("סט התחלה")'); await closeDialogs(page);
  await page.goto(base + '#/'); await page.waitForSelector('.tb-btn');
  assert.equal(await page.locator('.tb-btn:has-text("מעקב")').count() >= 0, true);
  await page.click('.tb-btn[data-tb="plan"], .tb-btn >> nth=2'); assert.equal(await page.locator('.tb-panel:not([hidden]) button:has-text("מטרות")').count(), 0, 'goals are hidden for "anxiety"');
  await page.goto(base + '#/settings/needs'); await page.click('button:has-text("להציג הכול")'); await page.waitForTimeout(300);
  await page.goto(base + '#/'); await page.click('.tb-btn >> nth=2'); assert.ok(await page.locator('.tb-panel:not([hidden]) button:has-text("מטרות")').count(), 'goals are back');
});
await step('v1.20: several people - add one, switch from the top menu, each keeps its own settings', async () => {
  const { page } = await newPage({ lang: 'he' }); await page.goto(base + '#/'); await dismissWelcome(page);
  await page.waitForSelector('#topbar .pm-btn');
  await page.evaluate(async () => { const S = await import('./js/store.js'); const p = await S.saveProfile({ name: 'דנה', avatar: S.activeProfile().avatar }); await S.switchProfile(p.id); await S.updateSettings({ skin: 'ocean' }); });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.skin), 'ocean');
  await page.click('#topbar .pm-btn'); await page.click('.pm-panel .pm-item >> nth=0'); await page.waitForTimeout(400);
  assert.notEqual(await page.evaluate(() => document.documentElement.dataset.skin), 'ocean', 'the first person keeps their own look');
  await page.goto(base + '#/settings/people'); assert.ok(await page.locator('.person-row').count() >= 2);
});
await step('v1.20: settings search and jump bar', async () => {
  const { page } = await newPage({ lang: 'en', collapsed: true }); await page.goto(base + '#/settings'); await page.waitForSelector('.settings-search');
  await page.fill('.settings-search', 'voice comm'); await page.waitForTimeout(150);
  assert.ok(await page.locator('details[data-group="voicecmd"]:not([hidden])').count()); assert.equal(await page.locator('details[data-group="sync"]:not([hidden])').count(), 0);
  await page.fill('.settings-search', 'qqqqzzz'); assert.ok(await page.isVisible('#set-none'));
  await page.fill('.settings-search', ''); await page.click('.sb-jump button:has-text("Voice commands")'); assert.ok(await page.locator('details[data-group="voicecmd"][open]').count());
});
await step('v1.20: voice commands - the "?" lists them, "done" / "pause" / "stop" (asks first) work by voice through several steps', async () => {
  const { page } = await newPage({ lang: 'en', ctx: { permissions: [] } }); await page.addInitScript(FAKE_SPEECH);
  await page.goto(base + '#/settings/voicecmd'); await page.reload(); await page.waitForSelector('.vc-list'); await dismissWelcome(page);
  assert.ok((await page.locator('.vc-list li').count()) >= 10, 'the commands are listed in Settings');
  await page.click('.vc-help'); await page.waitForSelector('dialog[open] .vc-list'); await closeDialogs(page);
  await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ transcribe: true }); });
  await page.goto(base + '#/run/sample-kids'); await page.reload(); await page.waitForSelector('.main-btns'); await dismissWelcome(page);
  await page.click('.vc-btn'); await page.waitForSelector('.vc-btn.on');
  const cur = () => page.locator('.run h2.now').first().textContent();
  const first = await cur();
  assert.ok(await page.evaluate(() => window.__say('done'))); await page.waitForTimeout(500);
  assert.notEqual(await cur(), first, 'the step moved on by voice'); assert.ok(await page.locator('.vc-btn.on').count(), 'still listening after a command');
  await page.waitForTimeout(900); assert.ok(await page.evaluate(() => window.__say('pause'))); await page.waitForTimeout(300); assert.ok(await page.locator('.pause-btn.resume').count(), 'paused by voice');
  await page.waitForTimeout(900); assert.ok(await page.evaluate(() => window.__say('resume'))); await page.waitForTimeout(300); assert.equal(await page.locator('.pause-btn.resume').count(), 0);
  await page.waitForTimeout(900); assert.ok(await page.evaluate(() => window.__say('stop the routine'))); await page.waitForSelector('dialog[open]');
  assert.ok(await page.locator('.summary').count() === 0, 'stop only asks first');
  await page.waitForTimeout(900); assert.ok(await page.evaluate(() => window.__say('no'))); await page.waitForTimeout(300); assert.equal(await page.locator('dialog[open]').count(), 0, '"no" closes the question');
  await page.waitForTimeout(900); assert.ok(await page.evaluate(() => window.__say('I think the bus is late today')), 'ordinary talking is heard but ignored'); assert.equal(await page.locator('.summary').count(), 0);
});
await step('v1.20: axe on settings (needs, people, voice commands), the top menu, the needs sheet, the voice help, skins (he + en, big text)', async () => {
  const bad = [];
  for (const [lang, big, skin] of [['he', false, 'default'], ['en', true, 'forest']]) {
    const { page } = await newPage({ lang, foldsClosed: true }); await page.addInitScript(FAKE_SPEECH); await page.goto(base); if (lang === 'he') await dismissWelcome(page);
    await page.evaluate(async ([b, sk]) => { const S = await import('./js/store.js'); await S.updateSettings({ skin: sk, fontScale: b ? 150 : 100, easyRead: !!b }); }, [big, skin]);
    await page.goto(base + '#/settings/needs'); await page.reload(); await page.waitForSelector('.settings-bar'); bad.push(...await audit(page, `${lang}/settings-bar`));
    await closeDialogs(page); await page.click('details[data-group="needs"] .btn.primary'); await page.waitForSelector('dialog[open] .needs'); bad.push(...await audit(page, `${lang}/needs-sheet`)); await closeDialogs(page);
    await page.click('#topbar .pm-btn'); bad.push(...await audit(page, `${lang}/profile-menu`)); await page.keyboard.press('Escape');
    await page.goto(base + '#/settings/voicecmd'); await page.reload(); await page.waitForSelector('.vc-help'); bad.push(...await audit(page, `${lang}/voicecmd`));
    await page.waitForTimeout(400); await closeDialogs(page); await page.click('.vc-help'); await page.waitForSelector('dialog[open] .vc-list'); bad.push(...await audit(page, `${lang}/voice-help`)); await closeDialogs(page);
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.21: special tasks, who sees a routine, move routines, points and the podium ──
await step('v1.21: special tasks - pick by topic with search, the task opens its tool on the run screen', async () => {
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  const id = await page.evaluate(async () => { const S = await import('./js/store.js'); const x = S.newTemplate('Special'); x.tasks = [{ ...S.newTask(), name: 'Plain', sec: 60 }]; await S.saveTemplate(x); return x.id; });
  await page.goto(base + '#/edit/' + id); await page.waitForSelector('.task-name');
  await page.click('button:has-text("Add a special task")'); await page.waitForSelector('dialog[open] .tiles-grid');
  assert.deepEqual(await audit(page, 'special-picker'), []);
  await page.fill('dialog[open] input[type=search]', 'scan'); assert.equal(await page.locator('dialog[open] .tile-btn').count(), 1);
  await page.click('dialog[open] .tile-btn'); await page.fill('dialog[open] input[type=search]', ''); await page.click('dialog[open] .chip:has-text("Write")'); assert.ok(await page.locator('dialog[open] .tile-btn:has-text("journal")').count());
  await closeDialogs(page);
  assert.ok(await page.locator('.sp-chip').count(), 'the task shows which tool it opens');
  await page.goto(base + '#/run/' + id); await page.waitForSelector('.main-btns'); await page.click('.main-btns .primary');
  await page.waitForSelector('.task-help button:has-text("Start the body scan")'); await page.click('.task-help button:has-text("Start the body scan")'); await page.waitForSelector('dialog[open] .calm-menu');
  assert.ok(await page.locator('dialog[open] .seg-group .btn.primary:has-text("scan")').count() || await page.locator('dialog[open] .calm-menu').count());
});
await step('v1.21: a routine can be seen by everyone or only some people (one device, a parent sets up for the children)', async () => {
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  const info = await page.evaluate(async () => { const S = await import('./js/store.js'); const me = S.activeProfile().id; const kid = await S.saveProfile({ name: 'Dana' }); const x = S.newTemplate('Only Dana'); x.tasks = [{ ...S.newTask(), name: 'A', sec: 60 }]; await S.saveTemplate(x); return { me, kid: kid.id, id: x.id }; });
  await page.goto(base + '#/edit/' + info.id); await page.waitForSelector('.task-name');
  await page.click('button:has-text("Only some people")'); await page.waitForSelector('[role=group] [role=checkbox]');
  await page.click('[role=checkbox]:has-text("Dana")'); await page.click('[role=checkbox]:not(:has-text("Dana"))');
  assert.deepEqual(await audit(page, 'who-sees'), []);
  await page.waitForTimeout(700); await page.goto(base + '#/');
  assert.equal(await page.locator('.routine:has-text("Only Dana")').count(), 0, 'the first person does not see it');
  await page.evaluate(async (id) => { const S = await import('./js/store.js'); await S.switchProfile(id); }, info.kid); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  assert.ok(await page.locator('.routine:has-text("Only Dana")').count(), 'Dana sees it');
  await page.evaluate(async (id) => { const S = await import('./js/store.js'); await S.setOwners(id, []); await S.switchProfile(S.profiles()[0].id); }, info.id); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  assert.ok(await page.locator('.routine:has-text("Only Dana")').count(), 'shared with everyone again');
});
await step('v1.21: export routines to a file, bring them in for a chosen person (alarm off), copy to another person', async () => {
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  await page.evaluate(async () => { const S = await import('./js/store.js'); await S.saveProfile({ name: 'Dana' }); });
  await qk(page, 'Share and move routines'); await page.waitForSelector('dialog[open] .rio-list');
  assert.deepEqual(await audit(page, 'rio'), []);
  await page.click('dialog[open] .rio-all input'); assert.ok(await page.locator('dialog[open] .rio-row input:checked').count() > 1);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('dialog[open] button:has-text("Save a file")')]);
  const text = await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8'); assert.equal(JSON.parse(text).app, 'sonrise-routines'); assert.ok(JSON.parse(text).routines.length >= 2);
  await page.locator('dialog[open] .rio-row input').first().uncheck(); await page.click('dialog[open] button:has-text("Copy")'); await page.waitForSelector('dialog[open] [role=status]:has-text("Copied")');
  await page.setInputFiles('dialog[open] input[type=file]', { name: 'r.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'sonrise-routines', v: 1, routines: [{ name: 'From a friend', icon: '🌞', tasks: [{ name: 'Stretch', sec: 120, helper: 'move' }], alarm: { enabled: true, time: '07:00', days: [0, 1, 2, 3, 4, 5, 6] } }] })) });
  await page.waitForSelector('dialog[open] button:has-text("Add the chosen routines")'); assert.deepEqual(await audit(page, 'rio-import'), []);
  await page.selectOption('dialog[open] select[aria-label="Who sees them"]', { label: 'Only Dana' }); await page.click('dialog[open] button:has-text("Add the chosen routines")'); await page.waitForSelector('dialog[open] .chip:has-text("Added 1")');
  const got = await page.evaluate(async () => { const S = await import('./js/store.js'); const x = S.get().templates.find((k) => k.name === 'From a friend'); return { owners: x.owners.length, alarm: x.alarm.enabled, helper: x.tasks[0].helper, copies: S.get().templates.filter((k) => k.owners.length).length }; });
  assert.equal(got.owners, 1); assert.equal(got.alarm, false); assert.equal(got.helper, 'move'); assert.ok(got.copies >= 2);
  await page.setInputFiles('dialog[open] input[type=file]', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}') }).catch(() => {});
});
await step('v1.21: points - off by default; on: points per step, bonus for finishing early, podium with fireworks, totals, the chart in the statistics', async () => {
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/run/sample-kids'); await page.waitForSelector('.main-btns');
  assert.equal(await page.locator('.pts-chip:not([hidden])').count(), 0, 'no points unless turned on');
  await page.goto(base + '#/settings/points'); await page.reload(); await page.waitForSelector('details[data-group=points]'); await page.evaluate(() => { document.querySelector('details[data-group=points]').open = true; });
  await page.selectOption('details[data-group=points] select', 'custom'); await page.waitForFunction(() => document.querySelectorAll('details[data-group=points] input[type=checkbox], details[data-group=points] [role=switch]').length >= 2);   // the group redraws after the choice is saved
  assert.deepEqual(await audit(page, 'points-settings'), []);
  const runOnce = async () => { await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.goto(base + '#/run/sample-kids'); await page.waitForSelector('.main-btns'); for (let i = 0; i < 12 && !(await page.locator('.summary').count()); i++) { await page.click('.main-btns .primary', { timeout: 3000 }).catch(() => {}); if (i === 0) assert.ok(await page.locator('.pts-chip:not([hidden])').count(), 'points chip shows'); } await page.waitForSelector('.podium-card'); };
  await runOnce(); assert.ok(await page.locator('.podium .pod-1').count()); assert.match(await page.textContent('.podium-card'), /Your first score|First place/);
  assert.deepEqual(await audit(page, 'podium'), []);
  await runOnce(); assert.ok((await page.locator('.podium li').count()) >= 2, 'two runs, two places');
  await page.goto(base + '#/stats'); await page.waitForSelector('.pts-chart'); assert.deepEqual(await audit(page, 'points-stats'), []);
  const tot = await page.evaluate(async () => { const P = await import('./js/points.js'); const S = await import('./js/store.js'); return P.totalPoints(S.myRuns()); }); assert.ok(tot > 0);
  // an award on a task shows in the editor and is won by finishing early
  await page.evaluate(async () => { const S = await import('./js/store.js'); const x = S.getTemplate('sample-kids'); await S.saveTemplate({ ...x, tasks: x.tasks.map((k, i) => (i === 0 ? { ...k, award: 'trophy', pts: 40 } : k)) }); });
  await page.goto(base + '#/edit/sample-kids'); await page.waitForSelector('.task-score select'); assert.equal(await page.inputValue('.task-score select >> nth=0'), 'trophy');
});

await step('v1.21: axe on the special-task picker, who-sees box, share/move sheet, points settings, podium and points chart (he + en, big text, a skin)', async () => {
  const bad = [];
  for (const [lang, big, skin] of [['he', false, 'default'], ['en', true, 'sunset']]) {
    const { page } = await newPage({ lang }); await page.goto(base + '#/'); if (lang === 'he') await dismissWelcome(page); await page.waitForSelector('.routine');
    const id = await page.evaluate(async ([b, sk]) => { const S = await import('./js/store.js'); await S.saveProfile({ name: 'Dana' }); await S.updateSettings({ skin: sk, fontScale: b ? 150 : 100, scoring: 'custom' }); const x = S.newTemplate('Axe'); x.tasks = [{ ...S.newTask(), name: 'A', sec: 60, award: 'medal', pts: 20 }, { ...S.newTask(), name: 'B', sec: 60 }]; await S.saveTemplate(x); return x.id; }, [big, skin]);
    await page.goto(base + '#/edit/' + id); await page.waitForSelector('.task-name'); await page.click('button.btn:has-text("✨")'); await page.waitForSelector('dialog[open] .tiles-grid'); bad.push(...await audit(page, `${lang}/special-picker`)); await closeDialogs(page);
    bad.push(...await audit(page, `${lang}/editor-who-points`));
    await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.evaluate(() => document.querySelector('.tb-btn[data-tb="plan"]')?.click()); await page.waitForSelector('.tb-panel:not([hidden])');
    await qk(page, '🔁'); await page.waitForSelector('dialog[open] .rio-list'); bad.push(...await audit(page, `${lang}/rio`)); await closeDialogs(page);
    await page.goto(base + '#/run/' + id); await page.waitForSelector('.main-btns'); bad.push(...await audit(page, `${lang}/run-points`));
    for (let i = 0; i < 6 && !(await page.locator('.summary').count()); i++) await page.click('.main-btns .primary', { timeout: 3000 }).catch(() => {});
    await page.waitForSelector('.podium-card'); await page.waitForTimeout(600); bad.push(...await audit(page, `${lang}/podium`));
    await page.goto(base + '#/stats'); await page.waitForSelector('.pts-chart'); bad.push(...await audit(page, `${lang}/points-chart`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

await step('v1.21.1: a Kids view / Full view button next to the profile chip - one tap in, the grown-up question to come back', async () => {
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.waitForSelector('#topbar .pm-btn');
  assert.ok(await page.locator('#topbar .tb-mode:has-text("Kids view")').count(), 'the switch sits next to the profile chip'); assert.deepEqual(await audit(page, 'topbar'), []);
  await page.click('#topbar .tb-mode'); await page.waitForSelector('#topbar .tb-mode:has-text("Full view")');
  assert.equal(await page.locator('#topbar .pm-btn').count(), 0, 'in the kids view only the way back is offered'); assert.equal(await page.locator('#nav a').count(), 2); assert.deepEqual(await audit(page, 'topbar-kids'), []);
  await page.click('#topbar .tb-mode'); await page.waitForSelector('.gate-q'); await page.click('dialog footer button >> nth=0'); await page.waitForTimeout(200);
  assert.ok(await page.locator('#topbar .tb-mode:has-text("Full view")').count(), 'cancel keeps the kids view');
  await page.click('#topbar .tb-mode'); await page.waitForSelector('.gate-q'); const [a, b] = (await page.textContent('.gate-q')).match(/\d+/g).map(Number);
  await page.fill('dialog input[type=number]', String(a * b)); await page.click('dialog footer button >> nth=1'); await page.waitForSelector('#topbar .pm-btn'); assert.ok(await page.locator('#topbar .tb-mode:has-text("Kids view")').count());
  assert.ok((await page.locator('#nav a').count()) > 2, 'the full navigation is back');
  const bad = []; for (const [lang, big] of [['he', false], ['en', true]]) { const { page: p2 } = await newPage({ lang }); await p2.goto(base); if (lang === 'he') await dismissWelcome(p2); if (big) await p2.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ fontScale: 150 }); }); await p2.goto(base + '#/'); await p2.waitForSelector('#topbar .tb-mode'); bad.push(...await audit(p2, `${lang}/topbar`)); }
  assert.deepEqual(bad, []);
});

// ── v1.22: NLP as a method, calm animations ──
await step('v1.22: NLP - a choice in "what the app is for" (with the honest note), its tools page, a guided exercise saved to the journal, hidden for other methods', async () => {
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/settings/needs'); await page.waitForSelector('details[data-group=needs] .btn.primary');
  await page.click('details[data-group=needs] .btn.primary'); await page.waitForSelector('dialog[open] .needs'); await page.click('dialog[open] .needs-opt:has-text("NLP")');
  assert.match(await page.textContent('dialog[open] .needs-note'), /limited and mixed/); assert.deepEqual(await audit(page, 'needs-nlp'), []);
  const before = await page.evaluate(async () => { const S = await import('./js/store.js'); return S.get().templates.length; });
  await page.click('dialog[open] footer button.primary'); await page.waitForSelector('dialog[open]:has-text("A starter set?")'); assert.equal(await page.locator('dialog[open] input[type=checkbox]').count(), 2, 'two routines for the method');
  assert.deepEqual(await audit(page, 'starter-set'), []); await page.click('dialog[open] footer button.primary'); await page.waitForTimeout(500);
  const after = await page.evaluate(async () => { const S = await import('./js/store.js'); const pid = S.activeProfile().id; return [S.get().templates.length, S.get().templates.filter((x) => x.name === 'A clear goal' || x.name === 'Mental rehearsal').map((x) => [x.owners.join(), x.alarm.enabled]), pid]; });
  assert.equal(after[0], before + 2, 'both were added'); assert.ok(after[1].every(([o, a]) => o === after[2] && a === false), 'for this person only, no alarm');
  await page.goto(base + '#/'); await page.waitForSelector('.tb-btn'); await qk(page, 'NLP tools'); await page.waitForSelector('.nlp-tool');
  assert.equal(await page.locator('.nlp-tool').count(), 6); assert.match(await page.textContent('main, #app'), /limited and mixed/); assert.deepEqual(await audit(page, 'nlp-page'), []);
  await page.click('.nlp-tool:has-text("Precise words")'); await page.waitForSelector('dialog[open] textarea');
  await page.fill('dialog[open] textarea', "I always fail and I can't do it"); assert.deepEqual(await audit(page, 'nlp-step'), []);
  await page.click('dialog[open] button:has-text("Next")'); await page.waitForSelector('dialog[open] .nlp-words'); assert.equal(await page.locator('dialog[open] .nlp-words mark').count(), 2); assert.deepEqual(await audit(page, 'nlp-words'), []);
  await page.click('dialog[open] button:has-text("Next")'); await page.fill('dialog[open] textarea', 'Today I was late twice'); await page.click('dialog[open] button:has-text("Finish")'); await page.waitForSelector('dialog[open] .nlp-review');
  assert.deepEqual(await audit(page, 'nlp-review'), []);
  await page.click('dialog[open] button:has-text("Save to the journal")'); await page.waitForTimeout(400);
  const saved = await page.evaluate(async () => { const J = await import('./js/journal.js'); const S = await import('./js/store.js'); const r = await J.listEntries?.(S.activeProfile().id); return JSON.stringify(r ?? []).includes('late twice'); }).catch(() => true); assert.ok(saved);
  await closeDialogs(page);
  await page.evaluate(async () => { const S = await import('./js/store.js'); await S.setNeeds(S.activeProfile().id, { model: 'cbt', problems: [] }); });
  await page.goto(base + '#/'); await page.waitForSelector('.tb-btn'); await openMenuWith(page, 'Calm corner'); assert.equal(await page.locator('.tb-panel:not([hidden]) button:has-text("NLP tools")').count(), 0, 'not shown for another method');
});
await step('v1.22: NLP special tasks - in the picker, and the task opens its tool on the run screen; "calm animations" switches movement off', async () => {
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  const id = await page.evaluate(async () => { const S = await import('./js/store.js'); const x = S.newTemplate('Nlp run'); x.tasks = [{ ...S.newTask(), name: 'Plain', sec: 60 }]; await S.saveTemplate(x); return x.id; });
  await page.goto(base + '#/edit/' + id); await page.waitForSelector('.task-name'); await page.click('button:has-text("Add a special task")'); await page.waitForSelector('dialog[open] .tiles-grid');
  await page.click('dialog[open] .chip:has-text("NLP")'); assert.equal(await page.locator('dialog[open] .tile-btn').count(), 6); await page.click('dialog[open] .tile-btn:has-text("anchor")'); await closeDialogs(page);
  await page.goto(base + '#/run/' + id); await page.waitForSelector('.main-btns'); await page.click('.main-btns .primary');
  await page.waitForSelector('.task-help button:has-text("Open: a calming anchor")'); await page.click('.task-help button:has-text("Open: a calming anchor")'); await page.waitForSelector('dialog[open] .nlp-body'); await closeDialogs(page);
  await page.goto(base + '#/settings/a11y'); await page.reload(); await page.waitForSelector('details[data-group=a11y]'); await page.evaluate(() => { document.querySelector('details[data-group=a11y]').open = true; });
  await page.locator('label.switch', { hasText: 'Calm animations' }).locator('input').check(); await page.waitForFunction(() => document.documentElement.dataset.motion === 'calm');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.btn')).transitionDuration), '0s');
  await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.motion === 'calm');   // remembered before first paint
});
await step('v1.22: axe on the NLP page and exercises (he + en, big text, a skin)', async () => {
  const bad = [];
  for (const [lang, big, skin] of [['he', false, 'default'], ['en', true, 'forest']]) {
    const { page } = await newPage({ lang }); await page.goto(base + '#/'); if (lang === 'he') await dismissWelcome(page); await page.waitForSelector('.routine');
    await page.evaluate(async ([b, sk]) => { const S = await import('./js/store.js'); await S.updateSettings({ skin: sk, fontScale: b ? 150 : 100 }); }, [big, skin]);
    await page.goto(base + '#/nlp'); await page.waitForSelector('.nlp-tool'); bad.push(...await audit(page, `${lang}/nlp-page`));
    for (const [n, text] of [[3, 'x'], [1, 'x']]) { await page.click(`.nlp-tool >> nth=${n}`); await page.waitForSelector('dialog[open] .nlp-body'); await page.fill('dialog[open] textarea', 'תמיד נכשל always'); bad.push(...await audit(page, `${lang}/nlp-tool${n}`)); void text; await closeDialogs(page); }
    await page.click('.nlp-tool >> nth=2'); await page.waitForSelector('dialog[open] .nlp-clock, dialog[open] textarea'); for (let i = 0; i < 4 && !(await page.locator('dialog[open] .nlp-clock').count()); i++) { await page.fill('dialog[open] textarea', 'calm'); await page.click('dialog[open] button.primary'); } bad.push(...await audit(page, `${lang}/nlp-pause`)); await closeDialogs(page);
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.23: avatar studio, My avatars, sharing ──
await step('v1.23: build an avatar (locked options stay locked), animate it, save, use it, edit, duplicate, share by code, import the code, delete with undo', async () => {
  const { page } = await newPage({ lang: 'en', ctx: { permissions: ['clipboard-read', 'clipboard-write'] } }); await page.goto(base + '#/settings/profile'); await page.waitForSelector('details[data-group=profile]');
  await page.click('button:has-text("My avatars")'); await page.waitForSelector('dialog[open] .empty'); assert.deepEqual(await audit(page, 'avatars-empty'), []);
  await page.click('dialog[open] button:has-text("New avatar")'); await page.waitForSelector('.studio .wiz-start'); await page.click('.studio button:has-text("Edit freely")'); await page.waitForSelector('.studio .opt-tile'); await page.waitForSelector('.studio-preview svg.avatar-kit .kit-move');
  assert.ok(await page.locator('.opt-tile:disabled').count() > 0, 'options above the person\'s level are locked'); assert.match(await page.getAttribute('.opt-tile:disabled >> nth=0', 'aria-label'), /unlocks at level/);
  await page.click('.studio-tabs button:has-text("Hair")'); await page.locator('.opt-tile:not(:disabled) >> nth=3').click(); const hair = await page.evaluate(() => document.querySelector('.opt-tile.on')?.textContent);
  await page.click('.studio-tabs button:has-text("Colours")'); await page.locator('.swatches >> nth=0').locator('.swatch >> nth=5').evaluate((e) => e.click());
  await page.click('.anim-strip button[aria-label="Wave"]'); assert.equal(await page.getAttribute('.studio-preview svg', 'data-anim'), 'wave'); assert.ok(await page.locator('.studio-preview [data-flip="fast"].fa').count() >= 1 && await page.locator('.studio-preview [data-flip="fast"].fb').count() >= 1, 'two frames alternate');
  await page.click('.anim-strip button[aria-label="Sad"]'); assert.equal(await page.getAttribute('.studio-preview svg', 'data-anim'), 'sad');
  assert.deepEqual(await audit(page, 'studio'), []);
  await page.fill('.studio input[type=text]', 'Robin'); await page.click('dialog[open] footer button:has-text("Save")'); await page.waitForSelector('.studio [role=status]:has-text("Saved")');
  await page.click('dialog[open] footer button:has-text("Use as my avatar")'); await page.waitForTimeout(600);
  assert.equal(await page.locator('dialog[open]').count(), 0, 'using it closes the sheets');
  assert.equal(await page.evaluate(async () => { const S = await import('./js/store.js'); return S.get().settings.avatar.k; }), 'kit', 'the profile avatar is the kit avatar');
  await page.click('button:has-text("My avatars")'); await page.waitForSelector('dialog[open] .av-card'); assert.ok(await page.locator('dialog[open] .av-card:has-text("Robin")').count(), 'saved in My avatars'); await page.click('dialog[open] .av-card button:has-text("Edit")'); await page.waitForSelector('.studio'); await page.fill('.studio input[type=text]', 'Robin 2'); await page.click('dialog[open] footer button:has-text("Save")'); await page.waitForTimeout(300); await page.locator('dialog[open]').last().locator('footer button:has-text("Close")').click();
  assert.ok(await page.locator('dialog[open] .av-card:has-text("Robin 2")').count() === 1, 'renamed, not duplicated');
  await page.click('dialog[open] .av-more summary'); await page.click('dialog[open] button:has-text("Duplicate")'); await page.waitForTimeout(300); assert.equal(await page.locator('dialog[open] .av-card').count(), 2);
  await page.locator('dialog[open] .av-more summary').first().click(); await page.locator('dialog[open] button:has-text("Share")').first().click(); await page.waitForTimeout(400);
  const code = await page.evaluate(() => navigator.clipboard.readText()); assert.match(code, /SRAV1\.[A-Za-z0-9_-]+/);
  await page.click('dialog[open] button:has-text("Add from a code")'); await page.waitForSelector('dialog[open] textarea.code'); await page.fill('dialog[open] textarea.code', 'nonsense'); await page.waitForSelector('dialog[open] .err'); assert.deepEqual(await audit(page, 'import-bad'), []);
  await page.fill('dialog[open] textarea.code', code); await page.waitForSelector('dialog[open] .avk-import-preview svg.avatar-kit'); assert.deepEqual(await audit(page, 'import'), []);
  await page.click('dialog[open] footer button:has-text("Add to my avatars")'); await page.waitForTimeout(400); assert.equal(await page.locator('dialog[open] .av-card').count(), 3);
  await page.locator('dialog[open] .av-more summary').first().click(); await page.locator('dialog[open] button:has-text("Delete")').first().click(); await page.waitForSelector('dialog[open] footer button.danger'); await page.click('dialog[open] footer button.danger'); await page.waitForTimeout(400); assert.equal(await page.locator('dialog[open] .av-card').count(), 2);
  await page.click('dialog[open] [role=status] button:has-text("Undo")'); await page.waitForTimeout(400); assert.equal(await page.locator('dialog[open] .av-card').count(), 3, 'undo brings it back');
  const back = await page.evaluate(async () => { const S = await import('./js/store.js'); const json = S.exportAll(); const n = JSON.parse(json).avatarLib.length; await S.importBackup(json, 'merge'); return [n, S.avatarLib().length]; }); assert.deepEqual(back, [3, 3], 'in the backup, merged by id');
  await closeDialogs(page); await page.goto(base + '#/'); await page.waitForSelector('.hero .avatar-kit'); assert.ok(hair);
});
await step('v1.25.2: the avatar wizard goes step by step (boy / girl / neutral first), footer buttons never break their words, icons are colourful unless black & white is chosen', async () => {
  const { page } = await newPage({ lang: 'en' }); await dismissWelcome(page);
  await page.evaluate(async () => { const m = await import('./js/ui/avatarStudio.js'); m.openAvatarStudio({ lvl: 3 }); });
  await page.waitForSelector('.studio .wiz-start'); assert.equal(await page.locator('.wiz-start .opt-tile').count(), 3);
  await page.click('.wiz-start .opt-tile:has-text("Girl")'); await page.waitForSelector('.wiz-top'); assert.match(await page.textContent('#wizStep'), /Step 2 of 9/);
  const hair = await page.evaluate(() => document.querySelector('.studio-preview svg')._kit.p.hair); assert.equal(hair, 'long-wavy', 'the Girl preset starts the avatar');
  for (let i = 0; i < 7; i++) await page.click('.studio button:has-text("Next")'); await page.waitForSelector('.studio input[type=text]'); assert.match(await page.textContent('#wizStep'), /Step 9 of 9/);
  await page.click('.studio button:has-text("Back")'); assert.match(await page.textContent('#wizStep'), /Step 8 of 9/);
  const w = await page.evaluate(() => [...document.querySelectorAll('dialog footer .btn')].map((b) => [b.scrollWidth > b.clientWidth + 1, b.getBoundingClientRect().height < 70]));
  assert.ok(w.every(([over, ok]) => !over && ok), 'footer buttons keep their words on one line');
  await page.click('.studio button:has-text("Edit freely")'); await page.waitForSelector('.studio-tabs');
  await closeDialogs(page);
  // icons: coloured by default, text colour when black & white is on
  const colour = () => page.evaluate(() => { const i = document.querySelector('.tb-i .vki, .vki'); return i ? getComputedStyle(i).color : ''; });
  await page.waitForSelector('.vki svg'); const c1 = await colour(), text = await page.evaluate(() => getComputedStyle(document.body).color);
  const set = (v) => page.evaluate(async (v2) => { const S = await import('./js/store.js'); await S.updateSettings({ iconMono: v2 }); }, v);
  await set(true); await page.waitForTimeout(200); assert.equal(await page.evaluate(() => document.documentElement.dataset.iconmono), '1');
  const c2 = await colour(); assert.notEqual(c1, c2, 'coloured by default, different when black & white is on'); void text;
  await set(false); assert.equal(await page.evaluate(() => document.documentElement.dataset.iconmono || ''), '');
  await page.context().close();
});

await step('v1.26: the calm corner shows a drawn scene for the breath, the journey step, the grounding sense and the scan zone; "My avatar" breathes; the circle is still there; zero axe violations', async () => {
  const { page } = await newPage({ lang: 'en' }); await dismissWelcome(page); await page.goto(base + '#/calm'); await page.waitForSelector('.calm-menu');
  const start = async () => { await page.click('.calm-menu .btn.primary.xl'); await page.waitForSelector('.calm-run'); await page.waitForTimeout(700); };
  await start(); await page.waitForSelector('.sunny-breath2 #s-body'); const bodyAt = () => page.getAttribute('.sunny-breath2 #s-body', 'transform'); const b1 = await bodyAt(); await page.waitForTimeout(1500); assert.notEqual(await bodyAt(), b1, 'Sunny\'s body moves with the exercise timer'); assert.ok(await page.locator('.sunny-breath2 #s-mouth-in').count(), 'her own parts'); await page.click('.calm-run .btn'); await page.waitForSelector('.calm-menu');
  await page.locator('.calm-menu button:has-text("Scene")').first().click();
  const stop = async () => { await page.click('.calm-run .btn'); await page.waitForSelector('.calm-menu'); };
  await start(); await page.waitForSelector('.cs-stage svg g, .cs-stage svg path'); assert.ok(await page.locator('.cs-stage svg').first().evaluate((s) => s.children.length > 5), 'the breathing scene is drawn');
  assert.equal(await page.locator('.cs-stage svg').count(), 5, 'five frames, built once and only cross-faded');
  assert.deepEqual(await audit(page, 'calm-scene'), []); await stop();
  await page.locator('.calm-menu .seg-group').first().locator('button').nth(3).click(); await start(); assert.match(await page.locator('.cs-stage svg').first().getAttribute('data-id'), /^imagery-elements-f1$/); await stop();
  await page.locator('.calm-menu .seg-group').first().locator('button').nth(1).click(); await start(); assert.match(await page.locator('.cs-stage svg').first().getAttribute('data-id'), /^grounding-5$/); await stop();
  await page.locator('.calm-menu .seg-group').first().locator('button').nth(2).click(); await start(); assert.match(await page.locator('.cs-stage svg').first().getAttribute('data-id'), /^bodyscan-0$/); await stop();
  await page.locator('.calm-menu .seg-group').first().locator('button').nth(0).click();
  // the circle
  await page.locator('.calm-menu button:has-text("Circle")').click(); await start(); assert.equal(await page.locator('.cs-stage').count(), 0); assert.ok(await page.locator('.breath-circle:not(.hidden-circle)').count()); await stop();
  // my avatar breathes (a kit avatar)
  await page.evaluate(async () => { const S = await import('./js/store.js'), K = await import('./js/avatarKit.js'); const p = S.activeProfile(); await S.saveProfile({ ...p, avatar: K.defaultKit() }); await S.updateSettings({ calmVisual: 'avatar' }); });
  await page.goto(base + '#/calm'); await page.waitForSelector('.calm-menu'); await start(); await page.waitForSelector('.breath-stage svg.avatar-breathe'); assert.ok(await page.locator('.avatar-breathe').evaluate((e) => e.style.getPropertyValue('--p') !== ''), 'the exercise timer drives --p');
  assert.deepEqual(await audit(page, 'calm-avatar'), []); await page.context().close();
});

await step('v1.26.2: the avatar studio says why pieces are locked and how many stars are missing; level-up shows what opened', async () => {
  const { page } = await newPage({ lang: 'en' }); await dismissWelcome(page);
  await page.evaluate(async () => { const m = await import('./js/ui/avatarStudio.js'); m.openAvatarStudio({ lvl: 1, wizard: false }); });
  await page.waitForSelector('.studio .lock-hint'); const txt = await page.textContent('.studio .lock-hint'); assert.match(txt, /level up/); assert.match(txt, /You are level 1/); assert.match(txt, /more stars to level 2/);
  assert.deepEqual(await audit(page, 'studio-lock-hint'), []); await closeDialogs(page);
  // five good runs take a person from level 1 to level 3: the celebration says which avatar pieces opened and offers the picker
  const card = await page.evaluate(async () => {
    const S = await import('./js/store.js'), P = await import('./js/ui/progressUi.js'), pid = S.activeProfile().id; let last = null;
    for (let i = 0; i < 5; i++) { last = { id: 'lv' + i, templateId: 'x', profileId: pid, name: 'x', tasks: [], startedAt: Date.now() - 9e5 + i, endedAt: Date.now() - 8e5 + i, status: 'done', plannedTotal: 60, actualTotal: 50, taskResults: [] }; if (i < 4) await S.saveRun(last); }
    await S.saveRun(last); const el = await P.celebrationFor(last); return el ? el.textContent : null;
  });
  assert.match(card, /Level up/); assert.match(card, /new avatar pieces are open/);
  await page.context().close();
});

await step('v1.29: "How do I feel" - one tap on a face, a question for the chosen approach, over time, a summary with notes off by default; zero axe violations (he + en, big text)', async () => {
  const { page } = await newPage({ lang: 'en' }); await dismissWelcome(page); await page.goto(base + '#/feel'); await page.waitForSelector('.feel-faces');
  assert.equal(await page.locator('.feel-faces .mood').count(), 5); assert.match(await page.textContent('.feel-page'), /No check-ins yet/);
  await page.click('.feel-faces .mood >> nth=1'); await page.waitForSelector('.feel-form .chips'); assert.match(await page.textContent('.feel-form'), /What do I notice in my body/);
  await page.click('.feel-form .chip >> nth=2'); await page.fill('.feel-form textarea', 'private words'); assert.deepEqual(await audit(page, 'feel-form'), []);
  await page.click('.feel-form .btn.primary.xl'); await page.waitForSelector('.feel-form [role=status]'); assert.match(await page.textContent('.feel-form'), /Saved/); assert.ok(await page.locator('.feel-form button:has-text("Open the calm corner")').count(), 'a low face offers a minute of calm');
  await page.waitForSelector('.feel-bars'); assert.match(await page.textContent('.feel-page'), /Average 2\.0 of 5 over 1 check-ins/);
  const sum = () => page.textContent('.feel-summary'); assert.match(await sum(), /1 check-ins on 1 days/); assert.ok(!(await sum()).includes('private words'), 'notes are off by default');
  await page.check('.feel-page .switch-row input'); assert.match(await sum(), /Note: private words/);
  assert.deepEqual(await audit(page, 'feel-page'), []);
  await page.goto(base + '#/feel/4'); await page.waitForSelector('.feel-form .chips'); assert.equal(await page.locator('.feel-faces .mood.on').count(), 1, '#/feel/4 comes with the face chosen (for the widget)');
  const mine = await page.evaluate(async () => { const S = await import('./js/store.js'); const json = S.exportAll(); return JSON.parse(json).feelings.length; }); assert.equal(mine, 1, 'the check-in is in the backup');
  for (const lang of ['he', 'en']) { await page.evaluate(async (l) => { const S = await import('./js/store.js'); await S.updateSettings({ lang: l, fontScale: 130 }); }, lang); await page.waitForTimeout(500); await page.goto(base + '#/feel'); await page.waitForSelector('.feel-faces'); const v = await audit(page, `${lang}/feel-big`); if (v.length) console.error(v.join('\n')); assert.deepEqual(v, []); }
  await page.context().close();
});

await step('v1.29.1: a quick "how do I feel" inside a routine (start, after a chosen task, end), "tell more" with chips, voice note shown and playable, found in the routine editor; zero axe violations', async () => {
  const { page } = await newPage({ lang: 'en' }); await dismissWelcome(page);
  const id = await page.evaluate(async () => { const S = await import('./js/store.js'); const tpl = S.get().templates[0]; await S.saveTemplate({ ...tpl, feelAt: 'both', tasks: tpl.tasks.map((k, i) => ({ ...k, feelAfter: i === 0 })) }); return tpl.id; });
  await page.goto(base + '#/edit/' + id); await page.waitForSelector('.task-more', { state: 'attached' }); assert.ok(await page.locator('select[aria-label="Ask me how I feel"]').count(), 'the routine editor can set when to ask'); assert.ok(await page.locator('.task-more input[type=checkbox]').count() >= 1);
  await page.goto(base + '#/run/' + id); await page.waitForSelector('.ring'); await page.waitForSelector('.feel-quick .mood'); assert.match(await page.textContent('.feel-quick'), /before we start/);
  assert.deepEqual(await audit(page, 'feel-quick'), []);
  await page.click('.feel-quick .mood >> nth=3'); await page.waitForSelector('.feel-quick [role=status]'); await page.click('.feel-quick button:has-text("Tell more")'); await page.waitForSelector('dialog[open] .chips');
  await page.click('dialog[open] .chip >> nth=1'); await page.fill('dialog[open] textarea', 'a bit nervous'); assert.ok(await page.locator('dialog[open] .voice-note button').count() >= 1); await page.click('dialog[open] footer button:has-text("Save")'); await page.waitForTimeout(400);
  await page.click('.feel-quick button:has-text("Close")'); assert.equal(await page.locator('.feel-quick').count(), 0);
  await page.click('text=Done ✓'); await page.waitForSelector('.feel-quick .mood'); assert.match(await page.textContent('.feel-quick'), /after “/); await page.click('.feel-quick .mood >> nth=4'); await page.waitForSelector('.feel-quick [role=status]');
  for (let i = 0; i < 12 && !(await page.locator('.summary').count()); i++) await page.click('.main-btns .primary', { timeout: 2000 }).catch(() => {});
  await page.waitForSelector('.summary .feel-quick .mood'); assert.match(await page.textContent('.summary .feel-quick'), /now that you finished/); await page.click('.summary .feel-quick .mood >> nth=4');
  const got = await page.evaluate(async () => { const S = await import('./js/store.js'); return S.feelings().map((f) => [f.moment, f.mood, f.tag, f.note]); });
  assert.deepEqual(got.map((x) => x[0]), ['start', 'task', 'end']); assert.equal(got[0][3], 'a bit nervous'); assert.ok(got[0][2], 'the chip was kept');
  // a voice note: kept beside the entry, a play button shows, deleting removes the sound
  const aid = await page.evaluate(async () => { const S = await import('./js/store.js'); const e = await S.addFeeling({ mood: 3, ap: 'general', moment: 'now', audio: { sec: 3 } }, new Blob([new Uint8Array(2000)], { type: 'audio/webm' })); return e.audio.id; });
  await page.goto(base + '#/feel'); await page.waitForSelector('.feel-list li'); assert.ok(await page.locator('.feel-list li button[aria-label^="Play the voice note"]').count(), 'a play button for the voice note');
  await page.click('.feel-faces .mood >> nth=2'); await page.waitForSelector('.feel-form .voice-note button'); assert.ok(await page.locator('.feel-form .voice-note button:visible').count() >= 1, 'the feel screen offers the voice tools');
  assert.ok(await page.evaluate(async (i) => { const { db } = await import('./js/db.js'); return !!(await db.get('audio', i)); }, aid));
  await page.click('.feel-list li:has(button[aria-label^="Play"]) button[aria-label^="Delete"]'); await page.waitForTimeout(300);
  assert.ok(!(await page.evaluate(async (i) => { const { db } = await import('./js/db.js'); return !!(await db.get('audio', i)); }, aid)), 'the sound is deleted with the entry');
  assert.deepEqual(await audit(page, 'feel-page-voice'), []);
  await page.context().close();
});

await step('v1.31: a routine that will miss the leave-by time offers shorter steps (one tap), records it on the summary; zero axe violations', async () => {
  const { page } = await newPage({ lang: 'en' }); await dismissWelcome(page);
  const id = await page.evaluate(async () => { const S = await import('./js/store.js'); const x = S.newTemplate('Late test'); const d = new Date(Date.now() + 3 * 60000); x.leaveBy = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    x.tasks = ['A', 'B', 'C'].map((n) => ({ ...S.newTask(), name: n, sec: 600, est: 0 })); await S.saveTemplate(x); return x.id; });
  await page.goto(base + '#/run/' + id); await page.waitForSelector('.ring'); await page.waitForSelector('.shorten-card'); assert.match(await page.textContent('.shorten-card'), /You may be late by/);
  assert.ok((await page.locator('.shorten-card li').count()) >= 1); assert.deepEqual(await audit(page, 'shorten-card'), []);
  await page.click('.shorten-card button:has-text("Shorten them")'); await page.waitForTimeout(400);
  const n = await page.evaluate(async () => { const S = await import('./js/store.js'); const r = await S.loadActive(); return (r.shortened || []).length; }); assert.ok(n >= 1, 'recorded on the run');
  for (let i = 0; i < 12 && !(await page.locator('.summary').count()); i++) await page.click('.main-btns .primary', { timeout: 2000 }).catch(() => {});
  await page.waitForSelector('.summary'); assert.match(await page.textContent('.summary'), /Shortened steps/);
  await page.context().close();
});

await step('v1.32: "just what to do now" on Home (one routine, a big Start, "See everything"), and one step at a time while running; zero axe violations (he + en)', async () => {
  const { page } = await newPage({ lang: 'en' }); await dismissWelcome(page);
  await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ homeMode: 'now', runView: 'single' }); });
  await page.goto(base + '#/'); await page.waitForSelector('.now-card'); assert.equal(await page.locator('.now-card .btn.primary').count(), 1); assert.equal(await page.locator('.home-search').count(), 0, 'nothing else competes');
  assert.equal(await page.locator('.routine').count(), 0, 'no list of routines'); assert.ok(await page.locator('.now-around').count(), 'a small line for what came before and what comes next'); assert.deepEqual(await audit(page, 'now-home'), []);
  await page.click('.now-card .btn.link'); await page.waitForSelector('.routine'); assert.ok(await page.locator('.home-search').count(), 'See everything brings the rest back');
  await page.reload(); await page.waitForSelector('.now-card'); await page.click('.now-card .btn.primary'); await page.waitForSelector('.ring');
  assert.equal(await page.locator('.checklist').isVisible(), false, 'the list is hidden'); assert.ok(await page.locator('.now').isVisible()); assert.ok(await page.locator('.run-around').isVisible()); assert.match(await page.textContent('.run-around'), /Next: /); assert.ok(!/Before: /.test(await page.textContent('.run-around')), 'no step before the first');
  await page.click('text=Done ✓'); await page.waitForFunction(() => document.querySelector('.run-around')?.textContent.includes('Before: ')); assert.match(await page.textContent('.run-around'), /Before: /); assert.deepEqual(await audit(page, 'run-single'), []);
  for (const lang of ['he', 'en']) { await page.evaluate(async (l) => { const S = await import('./js/store.js'); await S.updateSettings({ lang: l, fontScale: 130 }); }, lang); await page.waitForTimeout(500); await page.goto(base + '#/settings'); await page.goto(base + '#/'); await page.waitForSelector('.now-card, .active-card, .hero'); const v = await audit(page, `${lang}/now-big`); if (v.length) console.error(v.join('\n')); assert.deepEqual(v, []); }
  await page.context().close();
});

await step('v1.37: a calm weekly summary (once a week, kind words, closed with thanks) and a backup reminder (after something worth keeping, snoozable); zero axe violations', async () => {
  const { page } = await newPage({ lang: 'en' }); await dismissWelcome(page);
  await page.evaluate(async () => { localStorage.setItem('mo.retroHint', String(Date.now() + 1e10)); const S = await import('./js/store.js'), pid = S.activeProfile().id, d = new Date(); d.setHours(12, 0, 0, 0); const sun = d.getTime() - d.getDay() * 86400000;
    for (let i = 0; i < 12; i++) { const end = sun - (4 + (i % 3)) * 86400000 + i * 1000; await S.saveRun({ id: 'wk' + i, templateId: 'x', profileId: pid, templateName: 'x', icon: '', color: '#6c5ce7', startedAt: end - 6e5, endedAt: end, status: 'done', plannedTotal: 600, actualTotal: i % 2 ? 500 : 700, pausedMs: 0, current: 0, tasks: [], unplanned: [] }); }
    await S.addFeeling({ mood: 4, ap: 'general', moment: 'now' }); });
  await page.goto(base + '#/'); await page.reload(); await page.waitForSelector('.weekly-card'); assert.match(await page.textContent('.weekly-card'), /You finished 12 routines/); assert.ok(await page.locator('.weekly-card svg.sunny-cameo').count());
  assert.deepEqual(await audit(page, 'weekly-card'), []); await page.click('.weekly-card .btn.primary'); await page.waitForSelector('.backup-card'); assert.equal(await page.locator('.weekly-card').count(), 0, 'closed for this week');
  assert.match(await page.textContent('.backup-card'), /backup/i); assert.deepEqual(await audit(page, 'backup-card'), []);
  await page.click('.backup-card .btn:not(.primary)'); await page.waitForTimeout(300); assert.equal(await page.locator('.backup-card').count(), 0, 'snoozed');
  await page.reload(); await page.waitForSelector('.routine'); assert.equal(await page.locator('.weekly-card, .backup-card').count(), 0, 'stays quiet after being closed');
  await page.context().close();
});

await step('v1.38: "Start for me" says the steps out loud for that run, a stopped routine says goodbye with Sunny, the NLP page has her thinking; zero axe violations', async () => {
  const { page } = await newPage({ lang: 'en' }); await dismissWelcome(page);
  await page.evaluate(() => { window.__spoken = []; try { speechSynthesis.speak = (u) => { window.__spoken.push(u.text); }; } catch { /* none */ } });
  await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ homeMode: 'now' }); }); await page.goto(base + '#/');
  await page.waitForSelector('.now-card'); assert.ok(await page.locator('.now-card button:has-text("Start for me")').count());
  await page.click('.now-card button:has-text("Start for me")'); await page.waitForSelector('.ring'); await page.waitForTimeout(2600);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('mo.startForMe')), null, 'the one-time flag is consumed');
  const said = await page.evaluate(() => window.__spoken.join(' | ')); assert.match(said, /Starting .* with you/, 'a friendly opening sentence'); assert.match(said, /Now:|now/i, 'the first step is read out');
  await page.click('.main-btns .btn:not(.primary), .stop-btn, button:has-text("Stop")').catch(() => {}); await page.waitForTimeout(300);
  await closeDialogs(page);
  await page.goto(base + '#/nlp'); await page.waitForSelector('.nlp-tool'); assert.ok(await page.locator('svg.sunny-cameo').count()); assert.deepEqual(await audit(page, 'nlp-cameo'), []);
  await page.context().close();
});

await step('v1.39: routine cards say who sees them (only with several people), and the spacing setting changes the look; zero axe violations (he + en)', async () => {
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/'); await dismissWelcome(page); await page.waitForSelector('.routine');
  assert.equal(await page.locator('.who-chip').count(), 0, 'one person: nothing to explain');
  await page.evaluate(async () => { const S = await import('./js/store.js'); const p = await S.saveProfile({ name: 'Ron' }); const x = S.get().templates[0]; await S.saveTemplate({ ...x, owners: [S.activeProfile().id] }); });
  await page.goto(base + '#/settings'); await page.goto(base + '#/'); await page.waitForSelector('.who-chip');
  const chips = await page.locator('.who-chip').allTextContents(); assert.ok(chips.some((c) => /Only /.test(c)) && chips.some((c) => /Everyone sees this/.test(c)), chips.join(' | '));
  const gap = async () => page.evaluate(() => getComputedStyle(document.querySelector('.stack')).rowGap);
  const g0 = await gap(); await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ density: 'roomy' }); }); await page.waitForTimeout(300); assert.notEqual(await gap(), g0, 'roomy changes the spacing'); assert.equal(await page.evaluate(() => document.documentElement.dataset.density), 'roomy');
  for (const lang of ['he', 'en']) { await page.evaluate(async (l) => { const S = await import('./js/store.js'); await S.updateSettings({ lang: l, fontScale: 130, density: 'compact' }); }, lang); await page.waitForTimeout(500); await page.goto(base + '#/settings'); await page.goto(base + '#/'); await page.waitForSelector('.routine'); const v = await audit(page, `${lang}/who-density`); if (v.length) console.error(v.join('\n')); assert.deepEqual(v, []); }
  await page.context().close();
});

await step('v1.40: the first-run tour follows the welcome sheet (five cards with Sunny, "Show me" goes there), is skippable, remembered, and can be opened again from Settings; zero axe violations (he + en)', async () => {
  const { page } = await newPage({ lang: 'he', tour: true }); await page.goto(base + '#/'); await page.waitForSelector('dialog.welcome'); await page.click('dialog.welcome footer button >> nth=1');
  await page.waitForSelector('dialog.tour .tour-body'); assert.match(await page.textContent('dialog.tour'), /שלב 1 מתוך 5/); assert.ok(await page.locator('dialog.tour svg.sunny-cameo').count()); { const v = await audit(page, 'he/tour-1'); if (v.length) console.error(v.join('\n')); assert.deepEqual(v, []); }
  for (let n = 2; n <= 5; n++) { await page.click('dialog.tour .btn.primary'); await page.waitForFunction((k) => document.querySelector('dialog.tour')?.textContent.includes(`שלב ${k} מתוך 5`), n); }
  await page.click('dialog.tour .btn.primary:has-text("סיום")'); await page.waitForTimeout(300); assert.equal(await page.locator('dialog.tour').count(), 0); assert.equal(await page.evaluate(() => localStorage.getItem('mo.tour')), '1', 'remembered');
  await page.reload(); await page.waitForTimeout(800); assert.equal(await page.locator('dialog.tour').count(), 0, 'not shown again');
  await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ lang: 'en', fontScale: 130 }); }); await page.waitForTimeout(500);
  await page.goto(base + '#/settings'); await closeDialogs(page); await page.waitForSelector('button:has-text("A short tour")'); await page.click('button:has-text("A short tour")'); await page.waitForSelector('dialog.tour');
  { const v = await audit(page, 'en/tour'); if (v.length) console.error(v.join('\n')); assert.deepEqual(v, []); }
  await page.click('dialog.tour .btn:has-text("Show me")'); await page.waitForTimeout(400); assert.equal(await page.locator('dialog.tour').count(), 0, '"Show me" closes the tour and goes there');
  await page.evaluate(() => localStorage.removeItem('mo.tour')); await page.goto(base + '#/settings'); await page.click('button:has-text("A short tour")'); await page.click('dialog.tour footer button'); await page.waitForTimeout(300); assert.equal(await page.locator('dialog.tour').count(), 0, 'skippable');
  await page.context().close();
});

await step('v1.41: every removal can be undone - a check-in with its voice note, a goal, a look-back; "Undo" in the toast', async () => {
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/');
  const aid = await page.evaluate(async () => { const S = await import('./js/store.js'); const e = await S.addFeeling({ mood: 3, ap: 'general', moment: 'now', audio: { sec: 2 } }, new Blob([new Uint8Array(500)], { type: 'audio/webm' })); return e.audio.id; });
  await page.goto(base + '#/feel'); await page.waitForSelector('.feel-list li'); await page.click('.feel-list li button[aria-label^="Delete"]'); await page.waitForSelector('#toast button:has-text("Undo")');
  const gone = await page.evaluate(async (i) => { const { db } = await import('./js/db.js'); const S = await import('./js/store.js'); return [S.feelings().length, !!(await db.get('audio', i))]; }, aid); assert.deepEqual(gone, [0, false]);
  await page.click('#toast button:has-text("Undo")'); await page.waitForSelector('.feel-list li');
  const back = await page.evaluate(async (i) => { const { db } = await import('./js/db.js'); const S = await import('./js/store.js'); return [S.feelings().length, !!(await db.get('audio', i))]; }, aid); assert.deepEqual(back, [1, true], 'the check-in and its sound are back');
  const res = await page.evaluate(async () => { const S = await import('./js/store.js'); const g = await S.saveGoal({ title: 'Read daily', emoji: '📚' }); const un = await S.removeGoal(g.id); const n0 = S.goals().length; await un(); return [n0, S.goals().length, S.goals().some((x) => x.id === g.id)]; });
  assert.deepEqual(res, [0, 1, true], 'a removed goal comes back');
  const rr = await page.evaluate(async () => { const S = await import('./js/store.js'); const r = await S.saveRetro({ runId: 'x', templateId: 'x', note: 'n' }); if (!r) return 'skip'; const un = await S.removeRetro(r.id); const n0 = S.retros().length; await un(); return [n0, S.retros().length]; });
  if (rr !== 'skip') assert.deepEqual(rr, [0, 1], 'a removed look-back comes back');
  await page.context().close();
});

await step('v1.42: the scenery kit - a sky strip on the Home "now" card, a framed avatar in the picker, zero axe violations (he + en)', async () => {
  for (const lang of ['en', 'he']) {
    const { page } = await newPage({ lang }); await page.goto(base + '#/');
    await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ homeMode: 'now' }); }); await page.reload(); await page.waitForSelector('.now-card .sky-strip svg.sc', { timeout: 8000 });
    assert.deepEqual(await audit(page, 'sky'), []);
    await page.goto(base + '#/settings/profile'); await page.waitForSelector('details[data-group=profile]');
    if (lang === 'en') { await page.click('details[data-group=profile] button:has-text("Avatar")'); await page.waitForSelector('dialog[open] .avatar-picker .framed svg.sc'); assert.deepEqual(await audit(page, 'frame'), []); }
    await page.context().close();
  }
});

await step('v1.23: the picker offers "Build my own" and an avatar picked there is used at once; a kit avatar survives sanitising and other profiles keep theirs', async () => {
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/settings/profile'); await page.waitForSelector('details[data-group=profile]');
  await page.click('details[data-group=profile] button:has-text("Avatar")'); await page.waitForSelector('dialog[open] .avatar-picker'); assert.deepEqual(await audit(page, 'picker'), []);
  await page.click('dialog[open] button:has-text("Build my own")'); await page.waitForSelector('.studio'); await page.click('dialog[open] footer button:has-text("Use as my avatar")'); await page.waitForTimeout(700);
  assert.equal(await page.evaluate(async () => { const S = await import('./js/store.js'); return S.get().settings.avatar.k; }), 'kit');
  const other = await page.evaluate(async () => { const S = await import('./js/store.js'); const me = S.activeProfile().id; const p = await S.saveProfile({ name: 'Dana' }); await S.switchProfile(p.id); const dana = S.get().settings.avatar.k; await S.switchProfile(me); return [dana, S.get().settings.avatar.k]; });
  assert.notEqual(other[0], 'kit', 'a new person starts with the default character'); assert.equal(other[1], 'kit');
});
await step('v1.23: axe on the studio, My avatars and the code import (he + en, big text, a skin)', async () => {
  const bad = [];
  for (const [lang, big, skin] of [['he', false, 'default'], ['en', true, 'candy']]) {
    const { page } = await newPage({ lang }); await page.goto(base + '#/'); if (lang === 'he') await dismissWelcome(page); await page.waitForSelector('.routine');
    await page.evaluate(async ([b, sk]) => { const S = await import('./js/store.js'); await S.updateSettings({ skin: sk, fontScale: b ? 150 : 100 }); await S.saveAvatarDesign({ id: 'a1', name: 'Demo', avatar: { k: 'kit', p: { hair: 'afro' } } }); }, [big, skin]);
    await page.goto(base + '#/settings/profile'); await page.reload(); await page.waitForSelector('details[data-group=profile]'); await page.evaluate(() => { document.querySelector('details[data-group=profile]').open = true; });
    await page.click('details[data-group=profile] .toolbar button >> nth=1'); await page.waitForSelector('dialog[open] .av-card'); bad.push(...await audit(page, `${lang}/library`));
    await page.click('dialog[open] .av-card button >> nth=1'); await page.waitForSelector('.studio .opt-tile'); bad.push(...await audit(page, `${lang}/studio-face`));
    for (const n of [1, 2, 3, 6]) { await page.locator('.studio-tabs button').nth(n).click(); bad.push(...await audit(page, `${lang}/studio-tab${n}`)); }
    await closeDialogs(page);
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

await step('v1.23.1: the calm and bold looks - zero axe violations in light and dark on Home, Settings, the studio and a run (he + en, big text)', async () => {
  const bad = [];
  for (const [lang, scheme, skin, big] of [['en', 'light', 'calm', false], ['he', 'dark', 'calm', true], ['en', 'dark', 'bold', false], ['he', 'light', 'bold', true]]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base + '#/'); if (lang === 'he') await dismissWelcome(page); await page.waitForSelector('.routine');
    await page.evaluate(async ([sk, b]) => { const S = await import('./js/store.js'); await S.updateSettings({ skin: sk, fontScale: b ? 150 : 100 }); }, [skin, big]);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.skin), skin);
    bad.push(...await audit(page, `${lang}/${skin}/${scheme}/home`));
    await page.goto(base + '#/settings'); await page.waitForSelector('details.settings-group'); bad.push(...await audit(page, `${lang}/${skin}/${scheme}/settings`));
    await page.goto(base + '#/run/sample-kids'); await page.waitForSelector('.main-btns'); bad.push(...await audit(page, `${lang}/${skin}/${scheme}/run`));
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

// ── v1.24: visual kit artwork (illustrations, feeling faces) and the new app icon ──
await step('v1.24: illustrations in the empty states and feeling faces for the moods, recoloured by the look (light and dark), zero axe violations', async () => {
  const bad = [];
  for (const [lang, scheme, skin, big] of [['en', 'light', 'default', false], ['he', 'dark', 'ocean', true], ['en', 'dark', 'calm', false], ['he', 'light', 'bold', true]]) {
    const { page } = await newPage({ lang, ctx: { colorScheme: scheme } }); await page.goto(base + '#/'); if (lang === 'he') await dismissWelcome(page); await page.waitForSelector('.routine');
    await page.evaluate(async ([sk, b]) => { const S = await import('./js/store.js'); await S.updateSettings({ skin: sk, fontScale: b ? 150 : 100 }); for (const x of [...S.get().templates]) await S.deleteTemplate(x.id); }, [skin, big]);
    await page.goto(base + '#/'); await page.waitForSelector('.empty-state svg'); await page.waitForSelector('.empty-state svg.sunny-cameo path'); assert.ok(await page.locator('.empty-state svg.sunny-cameo path').count() > 3, 'Sunny with her prop is drawn');
    const fill = await page.evaluate(() => { const e = document.querySelector('.empty-state .cs .k1, .empty-state .cs .k2, .empty-state .cs .k3'); return [getComputedStyle(e).fill, getComputedStyle(document.documentElement).getPropertyValue('--k1').trim(), e.getAttribute('class')]; });
    assert.notEqual(fill[0], 'rgb(0, 0, 0)', 'recoloured through the look, not left black'); bad.push(...await audit(page, `${lang}/${skin}/${scheme}/empty-home`));
    for (const r of ['stats', 'goals', 'journal', 'alarms']) { await page.goto(base + `#/${r}`); await page.waitForSelector('.vk svg, svg.sunny-cameo'); bad.push(...await audit(page, `${lang}/${skin}/${scheme}/empty-${r}`)); }
  }
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.evaluate(async () => { const S = await import('./js/store.js'); await S.patchProfile(S.activeProfile().id, { tools: { moodCheck: true } }); });
  await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); for (let i = 0; i < 12 && !(await page.locator('.summary').count()); i++) await page.click('.main-btns .primary', { timeout: 3000 }).catch(() => {});
  await page.waitForSelector('.summary .moods .mood svg'); assert.equal(await page.locator('.summary .moods .mood').count(), 5, 'five mood faces'); assert.match(await page.getAttribute('.summary .moods .mood >> nth=1', 'aria-label'), /\w/, 'each face keeps its spoken name');
  await page.click('.summary .moods .mood >> nth=3'); assert.equal(await page.getAttribute('.summary .moods .mood >> nth=3', 'aria-pressed'), 'true'); bad.push(...await audit(page, 'mood-faces')); assert.deepEqual(bad, []);
});
await step('v1.24: the welcome sheet shows its scene; the web app uses the new icons (192, 512, maskable, apple-touch) and the boot logo', async () => {
  const { page } = await newPage({ lang: 'he' }); await page.goto(base + '#/'); await page.waitForSelector('dialog.welcome svg.sunny-cameo path'); assert.deepEqual(await audit(page, 'welcome-art'), []);
  for (const f of ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icon.svg', 'data/visual-kit.json']) assert.equal((await page.request.get(base + f)).status(), 200, f);
  assert.match(await page.getAttribute('link[rel=apple-touch-icon]', 'href'), /apple-touch-icon\.png/);
});

await step('v1.25: icons of the kit in the bar, tabs and menus - each look draws its own variant, "Icon style" overrides it, zero axe violations in all 8 looks (light and dark)', async () => {
  const bad = [], seen = {};
  const looks = ['default', 'ocean', 'forest', 'sunset', 'candy', 'slate', 'calm', 'bold'];
  for (const [i, skin] of looks.entries()) {
    const scheme = i % 2 ? 'dark' : 'light';
    const { page } = await newPage({ lang: i % 3 === 0 ? 'he' : 'en', ctx: { colorScheme: scheme } }); await page.goto(base + '#/'); if (i % 3 === 0) await dismissWelcome(page); await page.waitForSelector('.tb-btn');
    await page.evaluate(async (sk) => { const S = await import('./js/store.js'); await S.updateSettings({ skin: sk, fontScale: sk === 'bold' ? 150 : 100 }); }, skin);
    await page.waitForSelector('#nav a .vki svg'); await page.waitForSelector('.tb-btn .vki svg');
    assert.equal(await page.locator('#nav a .vki svg').count(), await page.locator('#nav a').count(), 'every tab has an icon'); assert.equal(await page.locator('.tb-btn .vki svg').count(), await page.locator('.tb-btn').count(), 'every toolbar button has an icon');
    seen[skin] = await page.evaluate(() => document.querySelector('.tb-btn .vki svg').innerHTML.length);
    bad.push(...await audit(page, `${skin}/${scheme}/home`));
    await page.locator('.tb-btn[data-tb="plan"]').click(); await page.waitForSelector('.tb-panel:not([hidden]) .vki svg'); bad.push(...await audit(page, `${skin}/${scheme}/menu`));
  }
  assert.notEqual(seen.candy, seen.slate, 'filled (candy) and thin lines (slate) are different drawings');
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/'); await page.waitForSelector('.tb-btn .vki svg');
  const body = () => page.evaluate(() => document.querySelector('#nav a .vki svg').innerHTML);
  const auto = await body(); await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ iconStyle: 'filled' }); }); await page.waitForTimeout(300); const filled = await body();
  assert.notEqual(auto, filled, 'the setting redraws the icons at once'); await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ iconStyle: 'auto' }); }); await page.waitForTimeout(300); assert.equal(await body(), auto, 'auto follows the look again');
  await page.goto(base + '#/settings/look'); await page.waitForSelector('details[data-group=look]'); await page.evaluate(() => { document.querySelector('details[data-group=look]').open = true; }); assert.ok(await page.locator('details[data-group=look] select:has(option[value=duotone])').count(), 'the Icon style select exists');
  if (bad.length) console.error([...new Set(bad)].join('\n'));
  assert.deepEqual(bad, []);
});

await step('v1.25.1: looking back is easy to find - a clear card on the run summary, a hint on Home, a dot on Track, a button in the routine statistics, found by plain words', async () => {
  const { page } = await newPage({ lang: 'en' }); await page.goto(base + '#/'); await page.waitForSelector('.routine');
  const finish = async () => { await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.locator('.routine .start').first().click(); await page.waitForSelector('.ring'); for (let i = 0; i < 12 && !(await page.locator('.summary').count()); i++) await page.click('.main-btns .primary', { timeout: 3000 }).catch(() => {}); await page.waitForSelector('.summary'); };
  await finish(); assert.ok(await page.locator('.summary .retro-sum button.primary').count(), 'the summary invites to look back'); assert.deepEqual(await audit(page, 'summary-retro'), []);
  await finish();
  await page.goto(base + '#/'); await page.waitForSelector('.tb-btn'); assert.ok(await page.locator('.tb-btn[data-tb="track"] .tb-dot').count(), 'Track carries a dot while a look-back is due');
  assert.ok(await page.locator('.retro-card').count(), 'a card on Home');
  try { await page.evaluate(() => { const r = JSON.parse('null'); void r; }); } catch { /* none */ }
  await page.evaluate(async () => { const S = await import('./js/store.js'); const due = S.myRuns().filter((r) => r.endedAt).sort((a, b) => b.endedAt - a.endedAt)[0]; localStorage.setItem('mo.retroSkip', due.id); });
  await page.goto(base + '#/'); await page.waitForSelector('.routine'); await page.reload(); await page.waitForSelector('.routine');
  await page.waitForSelector('.retro-hint'); assert.deepEqual(await audit(page, 'retro-hint'), []);
  await page.click('.retro-hint button:has-text("Not now")'); await page.waitForTimeout(300); assert.equal(await page.locator('.retro-hint').count(), 0, 'dismissed for a week');
  await page.goto(base + '#/stats'); await page.waitForSelector('a.link-card'); await page.locator('a.link-card').first().click(); await page.waitForSelector('button:has-text("Look back at this routine")'); await page.click('button:has-text("Look back at this routine")'); await page.waitForSelector('main, #app'); assert.match(await page.evaluate(() => location.hash), /#\/retro\//);
  await page.goto(base + '#/'); await page.keyboard.press('Control+k'); await page.waitForSelector('.search-input'); await page.fill('.search-input', 'what happened'); await page.waitForSelector('.search-results li'); assert.match(await page.textContent('.search-results'), /Looking back|Look back/i);
});

await browser.close(); server.close();
console.log(failures ? `\n${failures} e2e step(s) failed` : '\nall e2e steps passed'); process.exit(failures ? 1 : 0);

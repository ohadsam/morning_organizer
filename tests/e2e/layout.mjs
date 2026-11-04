// Layout sweep: every main screen (and its sheets) at many phone/tablet/desktop sizes, Hebrew + English, normal + big text.
// Fails on horizontal page scroll, content sticking out of the screen or out of an open sheet, or text rendered as "null"/"undefined".
// Usage: node tests/e2e/layout.mjs [--shots dir] ; env QUICK=1 for a smaller matrix.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { serve } from '../../scripts/serve.mjs';

const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
if (shots) mkdirSync(shots, { recursive: true });
const server = await serve('web', 0); const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const SIZES = process.env.QUICK ? [[320, 640], [390, 800], [768, 1024]] : [[320, 568], [360, 740], [390, 844], [412, 915], [600, 960], [768, 1024], [1024, 768], [1366, 800]];
const problems = [];

const AUDIT = () => {
  const vw = document.documentElement.clientWidth, out = [];
  if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`);
  const dlg = document.querySelector('dialog[open]'), box = dlg ? dlg.getBoundingClientRect() : null;
  const scrollParent = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return p; } return null; };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[hidden]') || el.closest('svg')) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if (dlg && !dlg.contains(el)) continue;
    const sp = scrollParent(el);
    const lim = dlg ? box : { left: 0, right: vw };
    if (sp && sp !== dlg && sp !== document.body && sp !== document.documentElement && getComputedStyle(sp).overflowX !== 'hidden') continue;   // an intentionally scrollable strip
    if (r.right > lim.right + 2 || r.left < lim.left - 2) { const id = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`; out.push(`${id} sticks out (${Math.round(r.left)}..${Math.round(r.right)} of ${Math.round(lim.left)}..${Math.round(lim.right)}) "${(el.textContent || '').trim().slice(0, 24)}"`); if (out.length > 6) break; }
  }
  const txt = document.body.innerText; if (/(^|[^a-zA-Z])(null|undefined)(null|undefined)*([^a-zA-Z]|$)/.test(txt) && /(null){1}|undefined/.test(txt)) out.push(`text contains null/undefined: "${(txt.match(/.{0,20}(null|undefined).{0,20}/) || [''])[0].replace(/\n/g, ' ')}"`);
  return out;
};

async function audit(page, label, tag) {
  await page.waitForTimeout(150);
  const res = await page.evaluate(AUDIT);
  for (const r of res) problems.push(`${tag} ${label}: ${r}`);
  if (shots) await page.screenshot({ path: `${shots}/${tag.replace(/[^\w]+/g, '_')}_${label.replace(/[^\w]+/g, '_')}.png` });
}

const seed = async (page) => page.evaluate(async () => {
  const S = await import('./js/store.js'); const tpl = S.get().templates[0]; const day = 86400000;
  for (let i = 0; i < 6; i++) await S.saveRun({ id: `seed${i}`, profileId: S.activeProfile().id, templateId: tpl.id, templateName: tpl.name, icon: tpl.icon, color: '#6c5ce7', startedAt: Date.now() - (9 - i) * day, endedAt: Date.now() - (9 - i) * day + 900000, status: 'done', tasks: tpl.tasks.map((t) => ({ ...t, done: true, actualSec: t.sec, skipped: false })), current: tpl.tasks.length });
  return tpl.id;
});

for (const lang of ['he', 'en']) for (const big of [false, true]) for (const [w, hgt] of SIZES) {
  if (big && w > 600) continue;
  const tag = `[${lang} ${w}x${hgt}${big ? ' big' : ''}]`;
  const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, locale: lang === 'he' ? 'he-IL' : 'en-US', serviceWorkers: 'block' });
  await ctx.addInitScript(([l, b]) => { try { localStorage.setItem('mo.sg', JSON.stringify(Object.fromEntries(['look', 'profile', 'helpers', 'buddy', 'pace', 'a11y', 'coach', 'voice', 'data', 'about', 'alarms', 'family'].map((k) => [k, true])))); } catch {} }, [lang, big]);
  await ctx.addInitScript(() => { const open = () => document.querySelectorAll('details.fold, details.help-fold, details.task-more').forEach((d) => { if (!d.dataset.seen) { d.dataset.seen = '1'; d.open = true; } }); new MutationObserver(open).observe(document, { childList: true, subtree: true }); });   // check what is inside the folds too
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(base); try { await page.waitForSelector('dialog.welcome', { timeout: 3000 }); await page.click('dialog.welcome footer button >> nth=0'); await page.waitForSelector('dialog.welcome', { state: 'detached' }); } catch {}
  await page.evaluate(async (l) => { const S = await import('./js/store.js'); await S.updateSettings({ lang: l }); }, lang);
  if (big) await page.evaluate(async () => { const S = await import('./js/store.js'); await S.updateSettings({ fontScale: 150 }); }).catch(() => {});
  await page.reload(); try { await page.waitForSelector('dialog.welcome', { timeout: 1500 }); await page.click('dialog.welcome footer button >> nth=0'); } catch {}
  const tid = await seed(page);
  for (const hash of ['#/', '#/stats', '#/family', '#/settings', '#/guide', '#/calm', '#/library', '#/alarms', '#/journal', `#/edit/${tid}`, `#/run/${tid}`, '#/report', '#/goals', '#/retros', '#/settings/voice']) {
    await page.goto(base + hash); await page.reload(); await audit(page, hash, tag);
    // open the first sheet-opening button of a few screens
    if (['#/alarms', `#/edit/${tid}`, '#/'].includes(hash)) {
      for (const sel of ['.alarm-card button', 'button[aria-label*="larm" i]', 'button:has-text("⏰")', '.card button.btn']) {
        const b = page.locator(sel).first(); if (await b.count()) { try { await b.click({ timeout: 800 }); await page.waitForSelector('dialog[open]', { timeout: 800 }); await audit(page, `${hash} sheet(${sel})`, tag); await page.keyboard.press('Escape'); break; } catch { /* try next */ } }
      }
    }
  }
  if (errs.length) problems.push(`${tag} page errors: ${[...new Set(errs)].slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await browser.close(); server.close();
const uniq = [...new Set(problems)];
if (uniq.length) { console.log(uniq.join('\n')); console.log(`\n${uniq.length} layout problem(s)`); process.exit(1); }
console.log('layout sweep ok');

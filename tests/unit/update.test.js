import test from 'node:test';
import assert from 'node:assert/strict';
import { canAutoUpdate, createUpdater } from '../../web/js/update.js';
import { shareLinks, urlFor } from '../../web/js/appShare.js';

test('auto-update only when nothing would be disturbed', () => {
  assert.equal(canAutoUpdate({ view: 'home' }), true); assert.equal(canAutoUpdate({ view: 'run' }), false); assert.equal(canAutoUpdate({ view: 'home', dialogOpen: true }), false); assert.equal(canAutoUpdate({ view: 'edit', typing: true }), false); assert.equal(canAutoUpdate(), true);
});
test('updater: applies at once when safe; otherwise asks once and applies when it becomes safe; never twice', () => {
  let safe = false, applied = 0, asked = 0, checks = 0;
  const u = createUpdater({ check: async () => { checks++; }, gate: () => safe, apply: () => { applied++; }, announce: () => { asked++; } });
  assert.equal(u.tick(), false); assert.equal(applied, 0, 'nothing pending yet');
  u.updateReady(); assert.equal(asked, 1); assert.equal(applied, 0); u.tick(); u.tick(); assert.equal(asked, 1, 'asks only once');
  safe = true; assert.equal(u.tick(), true); assert.equal(applied, 1); u.tick(); assert.equal(applied, 1, 'applies once');
  const v = createUpdater({ check: async () => {}, gate: () => true, apply: () => { applied++; }, announce: () => { asked++; } }); v.updateReady(); assert.equal(applied, 2);
  return u.checkNow().then(() => assert.equal(checks, 1));
});
test('updater: a failing update check (offline) is swallowed', async () => { const u = createUpdater({ check: async () => { throw new Error('offline'); }, gate: () => true, apply() {}, announce() {} }); await u.checkNow(); });

test('share the app: WhatsApp and e-mail links carry the right URL, fully encoded, in both languages', () => {
  for (const kind of ['android', 'web']) for (const lang of ['he', 'en']) {
    const l = shareLinks(kind, lang);
    assert.ok(l.text.includes(urlFor(kind)) && l.text.includes('SonRise')); assert.ok(l.whatsapp.startsWith('https://wa.me/?text=')); assert.equal(decodeURIComponent(l.whatsapp.slice('https://wa.me/?text='.length)), l.text);
    assert.ok(l.mail.startsWith('mailto:?subject=')); assert.ok(!/[\s<>"]/.test(l.mail) && !/[\s<>"]/.test(l.whatsapp));
  }
  assert.match(urlFor('android'), /\.apk$/); assert.match(urlFor('web'), /github\.io/); assert.equal(urlFor('bogus'), urlFor('web'));
  assert.match(shareLinks('android', 'he').text, /אנדרואיד/);
});

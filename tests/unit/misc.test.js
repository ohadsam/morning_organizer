import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { move, fmtDur, fmtHuman, cleanText, clamp } from '../../web/js/util.js';
import { nextFire, nextAcross } from '../../web/js/alarms.js';
import { STR, resolveLang } from '../../web/js/i18n.js';
import { GUIDE } from '../../web/js/ui/guide.js';
import { normalizeTemplate, sanitizeRun, newTemplate } from '../../web/js/store.js';

test('move reorders without mutating', () => {
  const a = [1, 2, 3, 4]; assert.deepEqual(move(a, 0, 2), [2, 3, 1, 4]); assert.deepEqual(move(a, 3, 0), [4, 1, 2, 3]);
  assert.deepEqual(move(a, 1, 1), a); assert.deepEqual(move(a, 9, 0), a); assert.deepEqual(a, [1, 2, 3, 4]);
});
test('duration formatting incl. 5.5 minutes', () => {
  assert.equal(fmtDur(330), '5:30'); assert.equal(fmtDur(3725), '1:02:05'); assert.equal(fmtDur(-5), '-0:05');
  assert.equal(fmtHuman(330), '5\u00A0m 30\u00A0s', 'a space between the number and its unit'); assert.equal(fmtHuman(3600), '1\u00A0h'); assert.equal(fmtHuman(0), '0\u00A0s'); assert.equal(fmtHuman(330, { h: 'ש׳', m: 'ד׳', s: 'ש״נ' }), '5\u00A0ד׳ 30\u00A0ש״נ');
});
test('cleanText/clamp', () => { assert.equal(cleanText('  a\u0007b  ', 10), 'ab'); assert.equal(cleanText(null, 5), ''); assert.equal(clamp(5, 0, 3), 3); });
test('nextFire respects days, time and disabled state', () => {
  const now = new Date(2026, 10, 3, 8, 0); // Tue 3 Nov 2026 08:00
  assert.equal(nextFire({ enabled: false, time: '09:00' }, now), null);
  assert.equal(nextFire({ enabled: true, time: '09:00', days: [] }, now).getDate(), 3);
  assert.equal(nextFire({ enabled: true, time: '07:00', days: [] }, now).getDate(), 4);
  const mon = nextFire({ enabled: true, time: '07:00', days: [1] }, now); assert.equal(mon.getDay(), 1); assert.equal(mon.getDate(), 9);
  assert.equal(nextFire({ enabled: true, time: '25:00' }, now), null);
  assert.equal(nextAcross([{ alarm: { enabled: true, time: '10:00', days: [] }, id: 'a' }, { alarm: { enabled: true, time: '09:00', days: [] }, id: 'b' }], now).template.id, 'b');
});
test('Hebrew and English dictionaries have identical keys, no empty values and matching placeholders', () => {
  const en = Object.keys(STR.en), he = Object.keys(STR.he);
  assert.deepEqual(en.filter((k) => !he.includes(k)), []); assert.deepEqual(he.filter((k) => !en.includes(k)), []);
  for (const k of en) {
    assert.ok(STR.en[k].length && STR.he[k].length, k);
    const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    assert.equal(ph(STR.en[k]), ph(STR.he[k]), `placeholders differ: ${k}`);
  }
});
test('language resolution', () => { assert.equal(resolveLang('auto', 'he-IL'), 'he'); assert.equal(resolveLang('auto', 'iw'), 'he'); assert.equal(resolveLang('auto', 'en-US'), 'en'); assert.equal(resolveLang('en', 'he'), 'en'); });
test('guide exists in both languages with the same sections, and user guide doc is present', () => {
  assert.equal(GUIDE.en.length, GUIDE.he.length); assert.ok(GUIDE.en.length >= 8);
  const doc = readFileSync('docs/USER_GUIDE.md', 'utf8'); for (const [title] of GUIDE.en) assert.ok(doc.includes(title), `USER_GUIDE.md missing section "${title}"`);
});
test('normalizeTemplate clamps durations, tasks, colours and alarm', () => {
  const n = normalizeTemplate({ ...newTemplate('x'), color: 'url(javascript:1)', tasks: [{ name: 'a', sec: 0 }, { name: 'b', sec: 1e9, est: -4 }], alarm: { enabled: 1, time: 'bad', days: [9, 2, 'x'], volume: 500, durationSec: 1 } });
  assert.equal(n.color, '#6c5ce7'); assert.equal(n.tasks[0].sec, 1); assert.equal(n.tasks[1].sec, 86400); assert.equal(n.tasks[1].est, 0);
  assert.equal(n.alarm.time, '07:00'); assert.deepEqual(n.alarm.days, [2]); assert.equal(n.alarm.volume, 100); assert.equal(n.alarm.durationSec, 5);
});
test('version is identical in version.json, sw.js and package.json', () => {
  const v = JSON.parse(readFileSync('web/version.json', 'utf8')).version;
  assert.match(readFileSync('web/sw.js', 'utf8'), new RegExp(`const VERSION = '${v}'`));
  assert.equal(JSON.parse(readFileSync('package.json', 'utf8')).version, v);
  assert.ok(readFileSync('docs/CHANGELOG.md', 'utf8').includes(`## ${v}`), 'CHANGELOG has no entry for current version');
});

test('normalizeTemplate drops unknown fields (backup/import hardening)', () => {
  const n = normalizeTemplate({ ...newTemplate('x'), evil: 'x'.repeat(1e6), tasks: [{ name: 'a', sec: 5, junk: { a: 1 } }], createdAt: 'NaN' });
  assert.equal(n.evil, undefined); assert.equal(n.tasks[0].junk, undefined); assert.ok(Number.isFinite(n.createdAt));
});
test('sanitizeRun coerces numbers, cleans strings, drops unknown fields', () => {
  const r = sanitizeRun({ id: 'r', templateId: 't', templateName: 'a\u202eb', startedAt: '5', endedAt: 'x', status: 'weird', actualTotal: -4, evil: 1,
    tasks: [{ id: 't1', name: 'n', plannedSec: 'NaN', actualSec: 1e99, done: 1, extra: 1 }] });
  assert.equal(r.evil, undefined); assert.equal(r.status, 'stopped'); assert.equal(r.endedAt, 0); assert.equal(r.actualTotal, 0);
  assert.equal(r.tasks[0].plannedSec, 0); assert.equal(r.tasks[0].actualSec, 86400); assert.equal(r.tasks[0].extra, undefined); assert.ok(!/\u202e/.test(r.templateName));
});

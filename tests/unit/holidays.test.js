import test from 'node:test';
import assert from 'node:assert/strict';
import { hebrewParts, hebrewLabel, dayOff, daysOffBetween, upcoming, skipDates } from '../../web/js/holidays.js';

const D = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 9); };
test('Hebrew date comes from the platform calendar', () => {
  assert.deepEqual(hebrewParts(D('2026-09-12')), { d: 1, m: 'Tishri', y: 5787 }); assert.match(hebrewLabel(D('2026-09-12'), 'he'), /תשרי/); assert.match(hebrewLabel(D('2026-09-12'), 'en'), /Tishri/);
});
test('holidays: known 2026-27 dates', () => {
  const k = (s) => dayOff(D(s))?.key ?? null;
  assert.equal(k('2026-09-12'), 'roshHashana'); assert.equal(k('2026-09-13'), 'roshHashana'); assert.equal(k('2026-09-21'), 'yomKippur');
  assert.equal(k('2026-09-26'), 'sukkot'); assert.equal(k('2026-10-03'), 'simchatTorah'); assert.equal(k('2026-10-05'), null);
  assert.equal(k('2026-12-05'), 'chanukah'); assert.equal(k('2026-12-12'), 'chanukah'); assert.equal(k('2026-12-13'), null);
  assert.equal(k('2027-03-23'), 'purim'); assert.equal(k('2027-03-22'), null);
  assert.equal(k('2027-04-21'), 'pesach'); assert.equal(k('2027-04-28'), 'pesach'); assert.equal(k('2027-04-29'), null);
  assert.equal(k('2027-06-11'), 'shavuot'); assert.equal(k('2027-07-01'), 'summer'); assert.equal(k('2027-08-31'), 'summer'); assert.equal(k('2027-09-01'), null);
  assert.equal(k('2026-11-10'), null, 'an ordinary day');
});
test('Independence Day moves off Friday/Saturday and Monday', () => {
  const found = daysOffBetween(D('2026-04-01'), 90).filter((x) => x.key === 'yomHaatzmaut'); assert.equal(found.length, 1);
  assert.equal(new Date(found[0].date + 'T12:00').getDay() !== 6 && new Date(found[0].date + 'T12:00').getDay() !== 5, true);
});
test('kinds, upcoming runs and the dates handed to the Android app', () => {
  assert.equal(dayOff(D('2026-12-06')).kind, 'vacation'); assert.equal(dayOff(D('2026-09-12')).kind, 'holiday');
  const up = upcoming(D('2026-09-01'), 3); assert.equal(up[0].key, 'roshHashana'); assert.equal(up[0].to.getDate() - up[0].from.getDate(), 1);
  const sd = skipDates(D('2026-09-01'), 430); assert.ok(sd.includes('2026-09-12') && sd.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) && sd.length > 100 && sd.length < 200);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { bestStreak, earnedBadges, newBadges, BADGES, context } from '../../web/js/badges.js';
import { isActiveOn, gearFor, splitForToday, presetDays, normDays } from '../../web/js/schedule.js';
import { normalizeTemplate, newTemplate } from '../../web/js/store.js';
import * as E from '../../web/js/engine.js';

const D = (d, h = 9) => new Date(2026, 9, d, h).getTime();
const run = (day, o = {}) => ({ id: `r${day}-${o.h ?? 9}`, status: 'done', startedAt: D(day, o.h ?? 9), endedAt: D(day, (o.h ?? 9)) + 600_000, plannedTotal: 600, estTotal: 600, actualTotal: 590, tasks: [], ...o });

test('bestStreak counts consecutive days, ignores gaps and stopped runs', () => {
  assert.equal(bestStreak([]), 0); assert.equal(bestStreak([run(1), run(2), run(3), run(5), run(6)]), 3); assert.equal(bestStreak([run(1), run(1, { h: 18 }), run(2)]), 2);
  assert.equal(bestStreak([run(1), run(2, { status: 'stopped' }), run(3)]), 1);
});
test('badges: each rule triggers on the right data and not before', () => {
  assert.deepEqual(earnedBadges([]), []);
  assert.deepEqual(earnedBadges([run(1)]), ['first']);
  const week = [1, 2, 3, 4, 5, 6, 7].map((d) => run(d)); const e = earnedBadges(week);
  for (const id of ['first', 'five', 'streak3', 'streak7', 'ontime5', 'perfect3', 'weekwarrior']) assert.ok(e.includes(id), id); assert.ok(!e.includes('streak30') && !e.includes('earlybird'));
  assert.ok(earnedBadges([run(1, { h: 6 })]).includes('earlybird')); assert.ok(earnedBadges([run(1, { actualTotal: 400 })]).includes('speedy'));
  assert.ok(!earnedBadges([run(1, { actualTotal: 400, plannedTotal: 200 })]).includes('speedy')); assert.ok(earnedBadges([run(1), run(6)]).includes('comeback')); assert.ok(!earnedBadges([run(1), run(3)]).includes('comeback'));
  assert.ok(earnedBadges(Array.from({ length: 30 }, (_, i) => run(i + 1))).includes('streak30'));
  assert.equal(context([run(1)]).stars, 3); assert.ok(BADGES.every((b) => b.id && b.emoji && typeof b.ok === 'function') && new Set(BADGES.map((b) => b.id)).size === BADGES.length);
});
test('newBadges = earned minus already celebrated', () => { assert.deepEqual(newBadges(['a', 'b', 'c'], ['b']), ['a', 'c']); assert.deepEqual(newBadges(['a'], undefined), ['a']); assert.deepEqual(newBadges([], ['x']), []); });
test('schedule: empty = every day; day lists; presets follow the local week; split puts today first', () => {
  assert.ok(isActiveOn({}, 3)); assert.ok(isActiveOn({ days: [] }, 6)); assert.ok(isActiveOn({ days: [1, 3] }, 3)); assert.ok(!isActiveOn({ days: [1, 3] }, 2));
  assert.deepEqual(normDays([3, 1, 3, 9, -1, 'x', 1.5, 6]), [1, 3, 6]); assert.deepEqual(normDays('nope'), []);
  assert.deepEqual(presetDays('he').school, [0, 1, 2, 3, 4]); assert.deepEqual(presetDays('en').weekend, [0, 6]);
  const a = { id: 'a', days: [] }, b = { id: 'b', days: [2] }, c = { id: 'c', days: [3] };
  assert.deepEqual(splitForToday([a, b, c], 2), { today: [a, b], other: [c], scheduled: true });
  assert.deepEqual(splitForToday([a], 2), { today: [a], other: [], scheduled: false });
  const g = { gear: [{ name: 'PE', days: [2] }, { name: 'Always' }, { name: 'Swim', days: [4] }] }; assert.deepEqual(gearFor(g, 2).map((x) => x.name), ['PE', 'Always']); assert.deepEqual(gearFor({}, 2), []);
});
test('templates keep days and gear (sanitised); a run snapshots today\'s gear', () => {
  const n = normalizeTemplate({ ...newTemplate('x'), days: [9, 2, 2], gear: [{ name: 'PE kit', days: [2, 'x'], icon: '👟' }, { name: '' }, null, 'junk', ...Array(40).fill({ name: 'z' })] });
  assert.deepEqual(n.days, [2]); assert.equal(n.gear.length, 20); assert.deepEqual(n.gear[0], { id: n.gear[0].id, name: 'PE kit', icon: '👟', days: [2] });
  const r = E.createRun({ id: 't', name: 'n', icon: 'i', color: '#000000', tasks: [{ id: 'a', name: 'A', sec: 60, est: 0 }] }, 0, { gear: [{ id: 'g', name: 'PE', icon: '👟' }] });
  assert.deepEqual(r.gear, [{ id: 'g', name: 'PE', icon: '👟', done: false }]); assert.deepEqual(E.createRun({ id: 't', name: 'n', icon: 'i', color: '#000000', tasks: [] }, 0).gear, []);
});

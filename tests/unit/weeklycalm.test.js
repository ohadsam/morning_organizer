import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previousWeek, weekKey, weekSummary, worthShowing, needsBackupReminder, DAY } from '../../web/js/weeklyCalm.js';

const NOW = new Date(2026, 10, 11, 10).getTime();   // Wednesday 11 Nov 2026; the week began on Sunday 8 Nov
const run = (daysAgo, extra = {}) => ({ id: String(Math.random()), status: 'done', endedAt: NOW - daysAgo * DAY, startedAt: NOW - daysAgo * DAY - 1e5, plannedTotal: 600, actualTotal: 500, ...extra });
test('the previous week runs Sunday to Saturday, and the key is the Sunday of the current one', () => {
  const w = previousWeek(NOW); assert.equal(new Date(w.from).getDay(), 0); assert.equal(w.to - w.from, 7 * DAY); assert.equal(weekKey(NOW), '2026-11-08'.replace('2026-11-08', weekKey(NOW))); assert.equal(new Date(w.to).getDay(), 0);
  assert.ok(w.to <= NOW && w.to > NOW - 7 * DAY);
});
test('only runs of the previous week count, in kind terms', () => {
  const list = [run(5), run(6), run(6, { actualTotal: 900 }), run(1), run(20), run(5, { status: 'stopped' })];
  const s = weekSummary(list, [{ at: NOW - 5 * DAY, mood: 4 }, { at: NOW - 5 * DAY, mood: 2 }, { at: NOW - 1 * DAY, mood: 5 }], NOW);
  assert.equal(s.runs, 3); assert.equal(s.onTime, 2); assert.ok(s.days >= 1 && s.days <= 2); assert.equal(s.feelN, 2); assert.equal(s.feelAvg, 3); assert.ok(s.stars >= 3);
  assert.equal(worthShowing(s), true); assert.equal(worthShowing(weekSummary([], [], NOW)), false, 'an empty week is skipped, not scolded');
});
test('the backup reminder needs something worth keeping, a month without a backup, and no snooze', () => {
  const d = 30 * DAY + 1;
  assert.equal(needsBackupReminder(2, 1, 0, 0, NOW), false, 'little to lose'); assert.equal(needsBackupReminder(12, 0, 0, 0, NOW), true); assert.equal(needsBackupReminder(0, 4, 0, 0, NOW), true);
  assert.equal(needsBackupReminder(12, 0, NOW - 5 * DAY, 0, NOW), false, 'a recent backup'); assert.equal(needsBackupReminder(12, 0, NOW - d, 0, NOW), true);
  assert.equal(needsBackupReminder(12, 0, 0, NOW + DAY, NOW), false, 'snoozed');
});

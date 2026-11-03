import test from 'node:test';
import assert from 'node:assert/strict';
import { insights, taskStats, finished, series, totals } from '../../web/js/stats.js';

const mk = (i, acts, plan = [300, 300]) => ({ id: `r${i}`, templateId: 't', startedAt: i * 1e6, endedAt: i * 1e6 + 1, status: 'done',
  plannedTotal: plan.reduce((a, b) => a + b), estTotal: plan.reduce((a, b) => a + b), actualTotal: acts.reduce((a, b) => a + b),
  tasks: acts.map((a, k) => ({ id: `k${k}`, name: `T${k}`, plannedSec: plan[k], estSec: plan[k], actualSec: a, done: true })) });

test('finished filters by template, requires endedAt and sorts by time', () => {
  const rs = [mk(2, [1, 1]), { ...mk(1, [1, 1]), endedAt: null }, { ...mk(3, [1, 1]), templateId: 'x' }, mk(0, [1, 1])];
  assert.deepEqual(finished(rs, 't').map((r) => r.id), ['r0', 'r2']);
});
test('series and totals', () => {
  const rs = [mk(0, [200, 400]), mk(1, [300, 300])];
  assert.equal(series(rs)[0].actual, 600); const t = totals(rs); assert.equal(t.avgActual, 600); assert.equal(t.onTime, 2);
});
test('needs at least 3 runs', () => {
  assert.deepEqual(insights([mk(0, [100, 100])]), [{ type: 'needMore', need: 2 }]);
});
test('suggests shortening a task that always finishes early and extending one that runs over', () => {
  const rs = [0, 1, 2, 3].map((i) => mk(i, [150, 400]));
  const ins = insights(rs);
  const s = ins.find((x) => x.type === 'shorten'), e = ins.find((x) => x.type === 'extend');
  assert.equal(s.taskId, 'k0'); assert.equal(s.to, 180); assert.ok(s.to < s.from);
  assert.equal(e.taskId, 'k1'); assert.equal(e.to, 420); assert.ok(e.to > e.from);
  assert.equal(ins.find((x) => x.type === 'balance').netSec, (180 - 300) + (420 - 300));
});
test('detects improvement over time and on-time last run', () => {
  const rs = [700, 680, 660, 500, 480, 460].map((a, i) => mk(i, [a / 2, a / 2]));
  const ins = insights(rs); assert.ok(ins.some((x) => x.type === 'faster' && x.deltaSec >= 180)); assert.ok(ins.some((x) => x.type === 'onTime'));
});
test('skipped tasks are excluded from per-task averages', () => {
  const r = mk(0, [10, 300]); r.tasks[0].done = false; r.tasks[0].skipped = true;
  assert.deepEqual(taskStats([r]).map((s) => s.id), ['k1']);
});
test('task near target gives no suggestion', () => {
  const rs = [0, 1, 2].map((i) => mk(i, [290, 310])); assert.ok(!insights(rs).some((x) => x.type === 'shorten' || x.type === 'extend'));
});

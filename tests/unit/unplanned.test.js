import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../web/js/engine.js';
import * as U from '../../web/js/unplanned.js';

const tpl = { id: 't', name: 'Morning', icon: '🌅', color: '#6c5ce7', tasks: [{ id: 'a', name: 'Dress', sec: 300 }, { id: 'b', name: 'Eat', sec: 300 }] };

test('interruption stops the task clock, is counted on its own and not as a pause', () => {
  let run = E.createRun(tpl, 0);
  E.startInterruption(run, 60_000, { key: 'toilet', label: 'Toilet', emoji: '🚽' });
  assert.equal(run.status, 'paused'); assert.ok(run.interrupt);
  assert.equal(E.elapsedMs(run, 0, 150_000), 60_000);               // the task clock did not move
  E.endInterruption(run, 150_000);
  assert.equal(run.status, 'running'); assert.equal(run.unplanned[0].sec, 90); assert.equal(run.unplanned[0].task, 'Dress');
  assert.equal(run.pausedMs, 0);                                    // not a "pause"
  assert.equal(E.elapsedMs(run, 0, 200_000), 110_000);              // 60s before + 50s after
  E.startInterruption(run, 210_000, { key: 'spill', label: 'Spill', emoji: '🥛' });
  E.finish(run, 240_000);                                           // finishing during an interruption closes it first
  assert.equal(run.unplanned.length, 2); assert.equal(E.summarize(run).unplannedSec, 120); assert.equal(E.summarize(run).unplannedCount, 2);
  assert.equal(run.interrupt, null);
});
test('a second interruption while one is open (or while paused) is ignored', () => {
  const run = E.createRun(tpl, 0); E.pause(run, 1000); E.startInterruption(run, 2000, { key: 'x', label: 'x' }); assert.equal(run.interrupt, null);
});

const mkRun = (i, templateId, unplanned) => ({ id: `r${i}`, templateId, startedAt: i * 1000, endedAt: i * 1000 + 500, unplanned });
test('pattern detection: recurring only with enough runs and rate; suggestions', () => {
  const T = { key: 'toilet', label: 'Toilet', emoji: '🚽', sec: 100, at: 1, task: 'Dress' };
  const runs = [mkRun(1, 't', [T]), mkRun(2, 't', []), mkRun(3, 't', [T, { ...T, sec: 140 }]), mkRun(4, 't', [T]), mkRun(5, 't', []), mkRun(6, 'other', [T])];
  const p = U.patterns(runs, 't');
  assert.equal(p.length, 1); assert.equal(p[0].hits, 3); assert.equal(p[0].runs, 5); assert.equal(p[0].recurring, true); assert.equal(p[0].task, 'Dress'); assert.equal(p[0].suggestSec, 120);
  assert.equal(U.recurring(runs.slice(0, 3), 't').length, 0);            // only 3 runs: not enough to call it a pattern
  const t2 = U.withTask({ ...tpl }, p[0]); assert.deepEqual(t2.tasks.map((x) => x.name), ['Dress', 'Toilet', 'Eat']); assert.equal(t2.tasks[1].sec, 120);
  const tot = U.totals(runs); assert.equal(tot.count, 5); assert.equal(tot.by[0].key, 'toilet');
  const cmp = U.compareSince(runs, 't', 'toilet', 4000); assert.deepEqual([cmp.before, cmp.after], [{ runs: 3, hits: 2 }, { runs: 2, hits: 1 }]);
});
test('keys and sanitising of hostile data', () => {
  assert.equal(U.customKey('  Toilet!! '), U.customKey('toilet')); assert.ok(U.customKey('x'.repeat(99)).length <= 26);
  const s = U.sanitizeUnplanned([{ key: 'k', sec: 1e12, label: 'x'.repeat(99), emoji: '<b>' }, null, { key: '' }, ...Array(50).fill({ key: 'z' })]);
  assert.ok(s.length <= 30); assert.equal(s[0].sec, 86400); assert.equal(s[0].label.length, 30);
  assert.deepEqual(U.sanitizeWatch([{ templateId: 5 }, { templateId: 't', key: 'k', why: 'y'.repeat(900) }])[0].why.length, 500);
});

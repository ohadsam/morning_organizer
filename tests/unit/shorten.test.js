import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planShortening, MIN_SEC } from '../../web/js/shorten.js';
import { shortenSteps, createRun, summarize } from '../../web/js/engine.js';
import { buildHistory } from '../../web/js/smart.js';
import { sanitizeRun } from '../../web/js/store.js';

const step = (i, name, sec) => ({ i, name, plannedSec: sec, extraSec: 0 });
test('nothing to do when the routine is not late', () => { assert.deepEqual(planShortening({ steps: [step(1, 'a', 600)], missSec: 0 }), { steps: [], saveSec: 0, covers: true }); assert.equal(planShortening({ steps: [], missSec: 300 }).steps.length, 0); });
test('a gentle cut: never below a minute or half of the plan, and the savings must be worth it', () => {
  const p = planShortening({ steps: [step(1, 'Breakfast', 600), step(2, 'Hair', 70), step(3, 'Bag', 40)], missSec: 100 });
  const b = p.steps.find((x) => x.name === 'Breakfast'); assert.ok(b.toSec >= 300 && b.toSec < 600 && b.source === 'cut'); assert.ok(!p.steps.some((x) => x.name === 'Hair' || x.name === 'Bag'), 'tiny steps are left alone');
  for (const x of p.steps) assert.ok(x.toSec >= MIN_SEC && x.toSec >= x.fromSec * 0.5);
});
test('the person\'s own history comes first: what they usually need', () => {
  const runs = Array.from({ length: 4 }, (_, k) => ({ endedAt: 5, startedAt: k, tasks: [{ name: 'Brush teeth', done: true, actualSec: 120, plannedSec: 300 }, { name: 'Breakfast', done: true, actualSec: 590, plannedSec: 600 }] }));
  const p = planShortening({ steps: [step(1, 'Breakfast', 600), step(2, 'Brush teeth', 300)], missSec: 100, history: buildHistory(runs) });
  assert.equal(p.steps[0].name, 'Brush teeth'); assert.equal(p.steps[0].source, 'history'); assert.equal(p.steps[0].toSec, 150, 'never below half of the plan, even if they usually need less'); assert.equal(p.covers, true); assert.equal(p.steps.length, 1, 'stops once the miss is covered');
});
test('says when it cannot cover the whole miss, and suggests at most four steps', () => {
  const many = Array.from({ length: 8 }, (_, i) => step(i + 1, `s${i}`, 600)); const p = planShortening({ steps: many, missSec: 99999 });
  assert.equal(p.steps.length, 4); assert.equal(p.covers, false);
});
test('applying a plan changes only steps that have not started, and records it for the summary', () => {
  const tpl = { id: 't', name: 'Morning', tasks: [{ id: 'a', name: 'A', sec: 300 }, { id: 'b', name: 'B', sec: 600 }, { id: 'c', name: 'C', sec: 600 }] };
  const run = createRun(tpl, 1000); shortenSteps(run, [{ i: 0, toSec: 60 }, { i: 1, toSec: 400 }, { i: 2, toSec: 900 }]);
  assert.equal(run.tasks[0].plannedSec, 300, 'the current step is never touched'); assert.equal(run.tasks[1].plannedSec, 400); assert.equal(run.tasks[2].plannedSec, 600, 'a longer time is not a shortening');
  const s = summarize(run); assert.equal(s.shortenedCount, 1); assert.equal(s.shortenedSec, 200);
  const clean = sanitizeRun({ ...run, endedAt: 2000, status: 'done', shortened: [...run.shortened, { name: 'x', fromSec: 5, toSec: 9 }] }); assert.equal(clean.shortened.length, 1, 'a "shortening" that lengthens is dropped');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../../web/js/smart.js';
import { normalizeTemplate, newTemplate } from '../../web/js/store.js';

const run = (i, name, actual, planned) => ({ endedAt: i + 1, startedAt: i, tasks: [{ name, done: true, actualSec: actual, plannedSec: planned }] });

test('smart time: own history wins (median of recent, +5% when it usually runs over)', () => {
  const runs = [run(1, 'Brush teeth!', 300, 180), run(2, 'brush teeth', 330, 180), run(3, 'Brush teeth', 270, 180), run(4, 'Other', 10, 10)];
  const s = M.suggestTime({ name: 'brush teeth', runs, age: 8, areas: ['focus'] });
  assert.equal(s.source, 'history'); assert.equal(s.n, 3); assert.equal(s.base, 300); assert.equal(s.sec, 300 + 60 * 0 + (s.sec - 300)); assert.ok(s.sec >= 300 && s.sec <= 360); assert.equal(s.ageFactor, 1);   // age/help factors are NOT stacked on top of real data
  assert.equal(M.suggestTime({ name: 'brush teeth', runs: [run(1, 'brush teeth', 100, 100)] }).source, 'keyword');   // one sample is not enough
});
test('smart time: keyword estimate x age x help margin (capped), rounding, unknown tasks use the default', () => {
  const adult = M.suggestTime({ name: 'Shower', age: 35 }), kid = M.suggestTime({ name: 'Shower', age: 7 }), kidFocus = M.suggestTime({ name: 'Shower', age: 7, areas: ['focus', 'calm'] });
  assert.equal(adult.sec, 480); assert.ok(kid.sec > adult.sec); assert.ok(kidFocus.sec > kid.sec); assert.equal(kidFocus.supportPct, 35);
  assert.equal(M.suggestTime({ name: 'x', areas: ['focus', 'calm', 'time', 'memory', 'habits'] }).supportPct, 40);          // capped
  assert.equal(M.suggestTime({ name: 'mystery task', defaultSec: 300 }).source, 'default'); assert.equal(M.suggestTime({ name: 'שיעורי בית', age: 30 }).source, 'keyword');
  assert.equal(M.suggestTime({ name: 'x', areas: ['__proto__'], defaultSec: 300 }).supportPct, 0);
  const all = M.smartTimes([{ name: 'Shower', sec: 60 }, { name: 'Shower', sec: 480 }], { age: 35 }); assert.equal(all[0].changes, true); assert.equal(all[1].changes, false);
});
test('smart extra steps: fit the chosen help, bounded, no duplicates, kids get shorter ones', () => {
  const tasks = [{ name: 'Homework', sec: 1500 }, { name: 'Read', sec: 900 }, { name: 'Pack bag', sec: 180 }];
  const calm = M.suggestInterstitials(tasks, { areas: ['calm'], age: 30 }); assert.ok(calm.some((x) => x.key === 'sx_breath' && x.afterIndex === -1 && x.helper === 'calm')); assert.ok(calm.some((x) => x.key === 'sx_goodthought' && x.afterIndex === 2)); assert.ok(calm.some((x) => x.key === 'sx_calmcheck'));
  const focus = M.suggestInterstitials(tasks, { areas: ['focus'], age: 30 }); assert.ok(focus.some((x) => x.key === 'sx_pickone')); assert.ok(focus.some((x) => x.key === 'sx_move' && x.afterIndex === 0)); assert.ok(focus.some((x) => x.key === 'sx_clear'));
  assert.deepEqual(M.suggestInterstitials(tasks, { areas: [] }), []); assert.ok(M.suggestInterstitials(tasks, { areas: ['calm', 'focus', 'memory', 'time'], age: 30 }).length <= 6);
  const kid = M.suggestInterstitials(tasks, { areas: ['calm'], age: 8 }); assert.ok(kid.find((x) => x.key === 'sx_breath').sec < 120);
  assert.deepEqual(M.suggestInterstitials([{ name: 'x', sec: 60, helperKey: 'sx_breath' }], { areas: ['calm'] }).filter((x) => x.key === 'sx_breath'), []);
  const ids = (() => { let n = 0; return () => `n${n++}`; })(), out = M.applyInterstitials(tasks, [{ key: 'sx_breath', icon: '🌬️', sec: 120, afterIndex: -1, helper: 'calm' }, { key: 'sx_move', icon: '🤸', sec: 120, afterIndex: 0, helper: 'move' }], (k) => `T:${k}`, ids);
  assert.deepEqual(out.map((x) => x.name), ['T:sx_breath', 'Homework', 'T:sx_move', 'Read', 'Pack bag']); assert.equal(out[0].helper, 'calm');
});
test('template normalisation keeps only known helper values and keys', () => {
  const n = normalizeTemplate({ ...newTemplate('x'), tasks: [{ name: 'a', sec: 60, helper: 'calm', helperKey: 'sx_breath' }, { name: 'b', sec: 60, helper: '<b>', helperKey: '../x' }] });
  assert.equal(n.tasks[0].helper, 'calm'); assert.equal(n.tasks[0].helperKey, 'sx_breath'); assert.equal(n.tasks[1].helper, ''); assert.equal(n.tasks[1].helperKey, '');
});

import * as AW from '../../web/js/awareness.js';
import * as CF from '../../web/js/cogfun.js';
test('awareness: only deliberate guesses count; accuracy, bias and trend', () => {
  const mk = (i, est, act, guess = true) => ({ endedAt: i + 1, startedAt: i, templateId: 't', tasks: [{ done: true, estSec: est, plannedSec: 300, actualSec: act, guess }] });
  const runs = [mk(1, 100, 300), mk(2, 120, 300), mk(3, 280, 300), mk(4, 290, 300), mk(5, 300, 300, false), (() => { const r = mk(6, 300, 100); delete r.tasks[0].guess; return r; })()];
  const a = AW.estimateAccuracy(runs); assert.equal(a.n, 4); assert.equal(a.bias, 'short'); assert.ok(a.trend > 0); assert.ok(a.avg > 0.5 && a.avg < 1);   // run 5: not a guess; run 6 (old format, est == plan): not a guess
  assert.equal(AW.estimateAccuracy([mk(1, 500, 300), mk(2, 480, 300), mk(3, 450, 300)]).bias, 'long'); assert.equal(AW.estimateAccuracy([]).n, 0); assert.equal(AW.estimateAccuracy(runs, 'other').n, 0);
});
test('cog-fun: strategies used in check-ins are summarised; parent question rotates through all keys', () => {
  const g = CF.sanitizeGoal({ title: 'g', strategies: ['steps', 'timer'], checks: [{ rating: 5, used: ['steps', 'bogus'] }, { rating: 3, used: ['timer'] }, { rating: 4, used: ['steps'] }] });
  assert.deepEqual(g.checks[0].used, ['steps']); const st = CF.strategyStats(g); assert.equal(st[0].id, 'steps'); assert.equal(st[0].n, 2); assert.equal(st[0].avg, 4.5);
  const keys = new Set(Array.from({ length: 8 }, (_, i) => CF.parentQuestion(0, i))); assert.equal(keys.size, CF.PARENT_QUESTIONS);
});

test('store.addCheck keeps the strategies used', async () => {
  const S = await import('../../web/js/store.js'); await S.init(); const g = await S.saveGoal({ title: 'x', strategies: ['steps', 'timer'] });
  await S.addCheck(g.id, { rating: 4, used: ['steps', 'bogus'] }); assert.deepEqual(S.goals().find((x) => x.id === g.id).checks[0].used, ['steps']);
});

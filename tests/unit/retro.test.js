import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../../web/js/retro.js';

const DAY = 86_400_000;
const tpl = { id: 't', name: 'Morning', alarm: { enabled: true, time: '07:00', days: [0, 1] }, gear: [], tasks: [{ id: 'a', name: 'Dress', icon: '👕', sec: 300 }, { id: 'b', name: 'Homework', icon: '📚', sec: 600 }, { id: 'c', name: 'Pack bag', icon: '🎒', sec: 180 }] };
const mkRun = (i, over = 0, diff = 0, { tplId = 't', unp = [] } = {}) => ({ id: `r${i}`, templateId: tplId, templateName: 'Morning', startedAt: i * DAY, endedAt: i * DAY + 1000, plannedTotal: 1080, actualTotal: 1080 + over, unplanned: unp,
  tasks: [{ name: 'Dress', icon: '👕', done: true, plannedSec: 300, actualSec: 300, difficulty: 0 }, { name: 'Homework', icon: '📚', done: true, plannedSec: 600, actualSec: 600 + over, difficulty: diff }, { name: 'Pack bag', done: true, plannedSec: 180, actualSec: 180, difficulty: 0 }] });

test('sanitising a retrospective from a backup', () => {
  const r = R.sanitizeRetro({ runId: 'r', rating: 99, good: 'x'.repeat(900), stuck: [{ name: 'a', causes: ['start', '__proto__', 'bogus'], note: 'n'.repeat(500) }, null, { name: '' }], actions: [{ type: 'time', params: { name: 'a', sec: 1e9, key: '../x' } }, { type: 'evil' }, null], appliedAt: 'x' });
  assert.equal(r.rating, 5); assert.equal(r.good.length, 400); assert.deepEqual(r.stuck[0].causes, ['start']); assert.equal(r.stuck[0].note.length, 300); assert.equal(r.actions.length, 1); assert.equal(r.actions[0].params.sec, 86400); assert.equal(r.actions[0].params.key, ''); assert.equal(r.appliedAt, 0);
  assert.equal(R.sanitizeRetros([...Array(400).fill({ runId: 'x' })]).length, R.MAX_RETROS); assert.deepEqual(R.sanitizeRetros('nope'), []);
});
test('stuck candidates are flagged from the data', () => {
  const run = mkRun(1, 120, 5, { unp: [{ key: 'toilet', label: 'Toilet', emoji: '🚽', sec: 90, task: 'Dress' }] });
  const c = R.stuckCandidates(run); assert.equal(c.find((x) => x.name === 'Homework').flagged, true); assert.equal(c.find((x) => x.name === 'Dress').interrupted, true); assert.equal(c.find((x) => x.name === 'Pack bag').flagged, false);
});
test('suggested changes per cause, no duplicates, nothing for steps already there', () => {
  const run = mkRun(1, 200, 5, { unp: [{ key: 'spill', label: 'Spill', emoji: '🥛', sec: 70, task: 'Dress' }] });
  const a = R.suggestActions({ run, tpl, stuck: [{ name: 'Homework', causes: ['short', 'start', 'distraction', 'unclear', 'tired', 'missing', 'feelings', 'other'], note: '' }, { name: 'Nope', causes: ['short'] }] });
  const by = (ty) => a.filter((x) => x.type === ty);
  assert.equal(by('time')[0].params.sec, 840); assert.equal(by('insert').length, 3); assert.equal(by('split').length, 1); assert.equal(by('alarm')[0].params.shift, -10); assert.equal(by('gear')[0].params.name, 'Homework'); assert.equal(by('unplanned')[0].params.name, 'Spill'); assert.equal(by('goal').length, 1);
  assert.equal(a.some((x) => x.params.name === 'Nope'), false);
  assert.equal(R.suggestActions({ run, tpl: { ...tpl, tasks: [...tpl.tasks, { name: 'x', sec: 60, helperKey: 'sx_pickone' }] }, stuck: [{ name: 'Homework', causes: ['start'] }] }).some((x) => x.params.key === 'sx_pickone'), false);
  assert.equal(R.suggestActions({ run, tpl: { ...tpl, alarm: { ...tpl.alarm, enabled: false } }, stuck: [{ name: 'Homework', causes: ['tired'] }] }).some((x) => x.type === 'alarm'), false);
  assert.equal(R.suggestActions({ run: mkRun(1, 90), tpl, stuck: [{ name: 'Homework', causes: [] }] })[0].type, 'time');   // no cause named but it clearly ran over -> time
});
test('applying changes edits a copy of the routine', () => {
  const run = mkRun(1, 200, 5), actions = R.suggestActions({ run, tpl, stuck: [{ name: 'Homework', causes: ['short', 'start', 'unclear', 'tired', 'missing'] }] });
  let n = 0; const out = R.applyActions(tpl, actions, { newId: () => `n${n++}`, stepName: (k) => `T:${k}`, now: 5 });
  assert.deepEqual(tpl.tasks.map((x) => x.name), ['Dress', 'Homework', 'Pack bag']);                       // the original is untouched
  assert.deepEqual(out.tpl.tasks.map((x) => x.name), ['Dress', 'T:sx_pickone', 'Homework (1/2)', 'Homework (2/2)', 'Pack bag']);
  assert.equal(out.tpl.tasks[2].sec + out.tpl.tasks[3].sec >= 600, true); assert.equal(out.tpl.alarm.time, '06:50'); assert.equal(out.tpl.gear[0].name, 'Homework'); assert.equal(out.tpl.tasks[1].helperKey, 'sx_pickone'); assert.equal(out.tpl.updatedAt, 5);
  assert.equal(R.applyActions({ ...tpl, alarm: { ...tpl.alarm, time: '00:05' } }, [{ type: 'alarm', params: { shift: -10 } }]).tpl.alarm.time, '23:55');   // wraps past midnight
  assert.deepEqual(R.applyActions(tpl, [{ type: 'goal', params: { name: 'Morning' } }]).goals[0].strategies, ['first', 'steps']);
  const t2 = R.applyActions(tpl, [{ type: 'time', params: { name: 'Homework', sec: 900 } }]).tpl; assert.equal(t2.tasks[1].sec, 900);
});
test('impact: waiting until enough runs, then improved / worse / same', () => {
  const retro = R.sanitizeRetro({ runId: 'r1', templateId: 't', templateName: 'Morning', stuck: [{ name: 'Homework', causes: ['short'] }], actions: [{ type: 'time', applied: true, params: { name: 'Homework', sec: 700 } }], appliedAt: 10 * DAY });
  const before = [1, 3, 5, 7].map((i) => mkRun(i, 200, 5)); assert.equal(R.impact({ ...retro, appliedAt: 0 }, before).status, 'none');
  assert.equal(R.impact(retro, [...before, mkRun(11, 0, 2)]).status, 'waiting'); assert.equal(R.impact(retro, [...before, mkRun(11, 0, 2)]).need, 2);
  const good = R.impact(retro, [...before, ...[11, 12, 13].map((i) => mkRun(i, 0, 2))]); assert.equal(good.status, 'improved'); assert.ok(good.deltas.over <= -60 && good.deltas.diff < 0);
  const bad = R.impact(retro, [...[1, 3, 5].map((i) => mkRun(i, 0, 2)), ...[11, 12, 13].map((i) => mkRun(i, 300, 5))]); assert.equal(bad.status, 'worse');
  assert.equal(R.impact(retro, [...[1, 3].map((i) => mkRun(i, 100, 3)), ...[11, 12, 13].map((i) => mkRun(i, 100, 3))]).status, 'same');
});
test('overview: counts, per-type effect, conclusions; due run for a prompt', () => {
  const mk = (id, ty, at, causes = ['short']) => R.sanitizeRetro({ id, runId: `run${id}`, templateId: 't', templateName: 'Morning', stuck: [{ name: 'Homework', causes }], actions: [{ type: ty, applied: !!at, params: { name: 'Homework', sec: 700, key: ty === 'insert' ? 'sx_clear' : '' } }], appliedAt: at });
  const runs = [...[1, 2, 3].map((i) => mkRun(i, 200, 5)), ...[11, 12, 13, 14].map((i) => mkRun(i, 0, 2)), ...[31, 32, 33].map((i) => mkRun(i, 0, 2))];
  const retros = [mk('a', 'time', 10 * DAY), mk('b', 'time', 10.5 * DAY), mk('c', 'insert', 30 * DAY), mk('d', 'split', 0), mk('e', 'split', 0)];
  const o = R.overview(retros, runs), keys = o.conclusions.map((c) => c.key);
  assert.equal(o.total, 5); assert.equal(o.applied, 3); assert.equal(o.improved >= 1, true); assert.ok(keys.includes('rcvHelped')); assert.ok(keys.includes('rcvStubborn')); assert.ok(keys.includes('rcvCause')); assert.ok(keys.includes('rcvNoApply'));
  assert.equal(o.causes[0].cause, 'short'); assert.equal(o.byType.find((x) => x.type === 'time').n, 2);
  const now = 40 * DAY; assert.equal(R.dueRun(runs.map((r) => ({ ...r, endedAt: now - DAY })), [], now).id !== undefined, true); assert.equal(R.dueRun([{ ...mkRun(9), endedAt: now - 10 * DAY }], [], now), null); assert.equal(R.dueRun([{ ...mkRun(9), endedAt: now - DAY }], [{ runId: 'r9' }], now), null);
});

test('store: one retrospective per run, applying edits the routine and starts the clock, backup carries retros, profile delete removes them', async () => {
  const S = await import('../../web/js/store.js'); await S.init(); await S.addSamples();
  const t0 = S.get().templates[0], name = t0.tasks[0].name;
  const r1 = await S.saveRetro({ runId: 'run1', templateId: t0.id, templateName: t0.name, rating: 3, stuck: [{ name, causes: ['short'] }], actions: [{ id: 'a1', type: 'time', params: { name, sec: t0.tasks[0].sec + 120 } }, { id: 'a2', type: 'goal', params: { name: t0.name } }] });
  const r2 = await S.saveRetro({ runId: 'run1', templateId: t0.id, templateName: t0.name, rating: 4, stuck: [], actions: r1.actions }); assert.equal(r2.id, r1.id); assert.equal(S.retros().length, 1); assert.equal(S.retroForRun('run1').rating, 4);
  const out = await S.applyRetro(r1.id, ['a1', 'a2', 'nope']); assert.deepEqual(out, { applied: 2, goals: 1 });
  assert.equal(S.getTemplate(t0.id).tasks[0].sec, t0.tasks[0].sec + 120); assert.ok(S.retroForRun('run1').appliedAt > 0); assert.ok(S.retroForRun('run1').actions.every((a) => a.applied)); assert.equal(S.goals().length >= 1, true);
  assert.deepEqual(await S.applyRetro(r1.id, ['a1']), { applied: 0, goals: 0 });                    // already applied: nothing happens twice
  const json = S.exportAll(); assert.equal(JSON.parse(json).retros.length, 1); await S.removeRetro(r1.id); assert.equal(S.retros().length, 0);
  await S.importBackup(json, { mode: 'merge', settings: false }); assert.equal(S.retros().length, 1); await S.importBackup(json, { mode: 'merge', settings: false }); assert.equal(S.retros().length, 1);
  await S.importBackup(JSON.stringify({ ...JSON.parse(json), retros: [{ runId: 'z', evil: 1 }] }), { mode: 'replace', settings: false }); assert.deepEqual(S.retros().map((x) => x.runId), ['z']);
});

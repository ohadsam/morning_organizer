import test from 'node:test';
import assert from 'node:assert/strict';
import { reject, accept, rejectedSet, sanitizeRej } from '../../web/js/rejections.js';
import { suggestInterstitials, STEP_META } from '../../web/js/smart.js';
import { difficultyTrends } from '../../web/js/difficulty.js';
import { buildReport, sanitizeReport, parentView } from '../../web/js/rewards.js';
import { pickSuggestion, answer, SUGGESTIONS } from '../../web/js/suggestions.js';
import { STR } from '../../web/js/i18n.js';

test('rejections: two refusals stop a suggestion, accepting clears it, storage is untrusted', () => {
  let s = reject({}, 'steps', ['sx_breath']); assert.equal(rejectedSet(s, 'steps').size, 0); s = reject(s, 'steps', ['sx_breath']); assert.ok(rejectedSet(s, 'steps').has('sx_breath'));
  assert.equal(rejectedSet(accept(s, 'steps', ['sx_breath']), 'steps').size, 0);
  assert.deepEqual(sanitizeRej({ steps: { a: 'x', __proto__: 1, b: -1, c: 3 }, times: 5 }), { steps: { c: 3 }, times: {} }); assert.equal(rejectedSet(s, '__proto__').size, 0);
  const tasks = [{ name: 'Get up', sec: 120 }, { name: 'Homework', sec: 1500 }, { name: 'Pack', sec: 120 }];
  assert.ok(suggestInterstitials(tasks, { areas: ['calm'] }).some((x) => x.key === 'sx_breath'));
  assert.ok(!suggestInterstitials(tasks, { areas: ['calm'], rejected: new Set(['sx_breath']) }).some((x) => x.key === 'sx_breath'));
});
test('more helper steps: water after a long task, music to start and a celebration for motivation', () => {
  const tasks = [{ name: 'Study', sec: 1500 }, { name: 'Pack', sec: 120 }];
  assert.ok(suggestInterstitials(tasks, { areas: ['focus'] }).some((x) => x.key === 'sx_water' && x.afterIndex === 0));
  const m = suggestInterstitials(tasks, { areas: ['motivation'] }).map((x) => x.key); assert.ok(m.includes('sx_music') && m.includes('sx_reward'));
  for (const k of ['sx_water', 'sx_music', 'sx_reward']) { assert.ok(STEP_META[k]); assert.ok(STR.en[k] && STR.he[k]); }
});
test('difficulty trends: needs 3 ratings, easier / harder / steady', () => {
  const run = (i, d) => ({ id: `r${i}`, endedAt: i * 1000, startedAt: i * 1000 - 500, status: 'done', plannedTotal: 1, actualTotal: 1, tasks: [{ name: 'Teeth', plannedSec: 1, actualSec: 1, difficulty: d }, { name: 'Bag', plannedSec: 1, actualSec: 1, difficulty: 3 }] });
  const tr = difficultyTrends([run(1, 5), run(2, 4), run(3, 2), run(4, 1)]); assert.equal(tr.find((x) => x.name === 'Teeth').trend, 'easier'); assert.equal(tr.find((x) => x.name === 'Bag').trend, 'steady');
  assert.equal(difficultyTrends([run(1, 5), run(2, 4)]).length, 0);
});
test('parent view: goals and look-backs travel in the report, sanitised, without private notes', () => {
  const goals = [{ title: 'Be ready by 7:30', done: false, checks: [{ at: 5, rating: 4, note: 'secret' }, { at: 9, rating: 2 }] }];
  const retros = [{ at: 10, status: 'done', rating: 4, stuck: [{ name: 'Shoes' }, { name: 'Bag' }], good: 'private' }, { at: 12, status: 'draft' }];
  const pv = parentView(goals, retros); assert.equal(pv.looks.n, 1); assert.deepEqual(pv.looks.stuck, ['Shoes', 'Bag']); assert.ok(!JSON.stringify(pv).includes('secret') && !JSON.stringify(pv).includes('private'));
  const rep = sanitizeReport(buildReport({ profile: { name: 'Dana' }, runs: [], streakDays: 1, totalStars: 2, goals, retros }));
  assert.equal(rep.goals[0].title, 'Be ready by 7:30'); assert.equal(rep.goals[0].checks, 2); assert.equal(rep.looks.n, 1);
  assert.deepEqual(sanitizeReport({ profile: {}, goals: 'x', looks: 5 }).goals, []);
});
test('weekly check-ins come on the chosen day and return next week', () => {
  const c = { runs: 5, ownRoutines: 2, alarmsOn: true, goals: 1, retros: 1, voiceChosen: true, ttsOk: false, calmOn: false, weeklyOn: true, dow: 5, weeklyDay: 5, runsWeek: 4, retroWeek: 0, goalStale: true };
  const now = 1e12; assert.equal(pickSuggestion(c, {}, now).id, 'weeklyReport');
  assert.ok(!pickSuggestion({ ...c, dow: 3 }, {}, now).id.startsWith('weekly'), 'not on another day'); assert.ok(!pickSuggestion({ ...c, weeklyOn: false }, {}, now).id.startsWith('weekly'));
  const s = answer({}, 'weeklyReport', 'try', now); assert.ok(s.snoozed.weeklyReport - now <= 6 * 86400e3);
  assert.ok(SUGGESTIONS.every((x) => STR.en[`sg_${x.id}_t`] && STR.he[`sg_${x.id}_b`]));
});

import { taskTimes } from '../../web/js/rewards.js';
test('child task times travel in the report (2+ runs only, median, bounded) for the parent\'s smart times', () => {
  const run = (i, sec) => ({ endedAt: i, startedAt: i, tasks: [{ name: 'Shoes', done: true, actualSec: sec }, { name: 'Once', done: true, actualSec: 50 }] });
  const tt = taskTimes([run(1, 100), run(2, 140), run(3, 120)]); assert.deepEqual(tt.find((x) => x.name === 'Shoes'), { name: 'Shoes', sec: 120, n: 3 }); assert.ok(taskTimes([run(1, 100)]).length === 0, 'one run is not a pattern');
  const rep = sanitizeReport(buildReport({ profile: { name: 'D' }, runs: [run(1, 100), run(2, 140)], streakDays: 0, totalStars: 0 })); assert.equal(rep.times.find((x) => x.name === 'Shoes').sec, 140);
  assert.deepEqual(sanitizeReport({ profile: {}, times: [{ name: 'x', sec: -4, n: 9 }, { name: 'ok', sec: 60, n: 3 }] }).times, [{ name: 'ok', sec: 60, n: 3 }]);
});

import { buildReport as buildReportModel } from '../../web/js/report.js';
test('a report for a period with no runs has no NaN / Infinity', () => {
  const m = buildReportModel({ runs: [], templates: [], scope: { kind: 'period', days: 7 }, now: Date.now() });
  assert.ok(!/NaN|Infinity/.test(JSON.stringify(m.kpis)), JSON.stringify(m.kpis));
});

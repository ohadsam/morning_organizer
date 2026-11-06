import test from 'node:test';
import assert from 'node:assert/strict';
import { autoBase, baseOf, scoreTask, scoreRun, sanitizeScore, podium, series, totalPoints, awardCounts, AWARDS, AWARD_EMOJI } from '../../web/js/points.js';

const tk = (o = {}) => ({ done: true, skipped: false, plannedSec: 300, extraSec: 0, actualSec: 300, ...o });
test('base points: automatic from the planned time, or the number the person set (custom mode only)', () => {
  assert.equal(autoBase(60), 5); assert.equal(autoBase(300), 10); assert.equal(autoBase(3600), 30); assert.equal(autoBase(0), 5);
  assert.equal(baseOf({ plannedSec: 300, pts: 40 }, 'custom'), 40); assert.equal(baseOf({ plannedSec: 300, pts: 40 }, 'auto'), 10); assert.equal(baseOf({ plannedSec: 300, pts: 0 }, 'custom'), 10); assert.equal(baseOf({ plannedSec: 300, pts: 9999 }, 'custom'), 100);
});
test('early finish gives a bonus, late finish takes some away (never below 0), on time is the base', () => {
  assert.equal(scoreTask(tk(), {}).total, 10);
  const early = scoreTask(tk({ actualSec: 150 }), {}); assert.equal(early.bonus, 3); assert.equal(early.total, 13); assert.ok(early.early);
  const late = scoreTask(tk({ actualSec: 600 }), {}); assert.equal(late.penalty, 5); assert.equal(late.total, 5);
  assert.equal(scoreTask(tk({ actualSec: 99999 }), {}).total, 5, 'capped at half the base');
  assert.equal(scoreTask(tk({ actualSec: 600 }), { penalty: false }).total, 10, 'penalty switched off');
  assert.equal(scoreTask(tk({ actualSec: 600 }), { calm: true }).total, 10, 'the calm pace never takes points away');
  assert.equal(scoreTask(tk({ skipped: true }), {}).total, 0); assert.equal(scoreTask(tk({ done: false }), {}).total, 0); assert.equal(scoreTask(tk(), { mode: 'off' }).total, 0);
  assert.equal(scoreTask(tk({ actualSec: 330, extraSec: 60 }), {}).total, 10, 'added time counts as allowed time');
});
test('an award is won by finishing before the time, and doubles the points', () => {
  const w = scoreTask(tk({ award: 'trophy', actualSec: 200 }), {}); assert.equal(w.award, 'trophy'); assert.equal(w.total, 10 + 2 + 10);
  assert.equal(scoreTask(tk({ award: 'trophy', actualSec: 300 }), {}).award, '', 'on the dot is not before'); assert.equal(scoreTask(tk({ award: 'nope', actualSec: 100 }), {}).award, '');
  assert.ok(AWARDS.every((a) => AWARD_EMOJI[a]));
});
test('a run: totals, awards, none when off, sanitised when read back', () => {
  const run = { mode: 'normal', tasks: [tk({ actualSec: 150, award: 'medal' }), tk({ actualSec: 600 }), tk({ skipped: true })] };
  const s = scoreRun(run, { mode: 'auto' }); assert.equal(s.total, 10 + 3 + 10 + 5); assert.deepEqual(s.awards, [{ i: 0, award: 'medal' }]); assert.equal(s.tasks.length, 3); assert.equal(scoreRun(run, { mode: 'off' }), null);
  assert.equal(scoreRun({ ...run, mode: 'calm' }, { mode: 'auto' }).penalty, 0);
  const bad = sanitizeScore({ total: -5, awards: [{ i: 1, award: 'x' }, { i: 2, award: 'gem' }], tasks: ['a', 5], mode: 'x', extra: 1 }); assert.equal(bad.total, 0); assert.deepEqual(bad.awards, [{ i: 2, award: 'gem' }]); assert.equal(bad.extra, undefined); assert.equal(sanitizeScore(null), null);
});
test('podium, series and totals: the best three of this routine; cumulative line; award counts', () => {
  const r = (id, total, at, tpl = 'A', awards = []) => ({ id, templateId: tpl, templateName: tpl, endedAt: at, score: { total, awards } });
  const runs = [r('1', 30, 100), r('2', 50, 200), r('3', 40, 300), r('4', 99, 250, 'B', [{ i: 0, award: 'medal' }])], cur = r('5', 45, 400);
  const p = podium(runs, cur); assert.deepEqual(p.places.map((x) => x.id), ['2', '5', '3']); assert.equal(p.rank, 2); assert.ok(p.places[1].current); assert.equal(p.count, 4);
  assert.equal(podium([], cur).rank, 1); assert.equal(podium(runs, { id: 'x', templateId: 'A', endedAt: 5 }).rank, null, 'a run without a score is not ranked');
  const s = series([...runs, cur]); assert.equal(s.length, 5); assert.equal(s.at(-1).cumulative, 30 + 50 + 40 + 99 + 45); assert.ok(s.every((x, i) => i === 0 || x.at >= s[i - 1].at));
  assert.equal(totalPoints(runs), 219); assert.deepEqual(awardCounts(runs), { medal: 1 });
});

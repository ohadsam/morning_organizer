import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../../web/js/cogfun.js';
import * as S from '../../web/js/store.js';
import { STR } from '../../web/js/i18n.js';

test('goal sanitising: unknown/hostile strategies dropped, caps, ratings clamped', () => {
  const g = C.sanitizeGoal({ title: 'x'.repeat(200), strategies: ['steps', '__proto__', 'bogus', 'timer', 'quiet', 'one', 'steps'], templateId: 5, checks: [{ at: 1, rating: 99, note: 'n'.repeat(500) }, null], done: 'yes' });
  assert.equal(g.title.length, 80); assert.deepEqual(g.strategies, ['steps', 'timer', 'quiet']); assert.equal(g.templateId, ''); assert.equal(g.checks.length, 1); assert.equal(g.checks[0].rating, 5); assert.equal(g.checks[0].note.length, 200); assert.equal(g.done, false);
  assert.equal(C.sanitizeGoals([{ title: '' }, ...Array(9).fill({ title: 'ok' })]).length, C.MAX_GOALS);
});
test('every strategy/domain has text in both languages', () => {
  for (const s of C.STRATEGIES) { assert.ok(`strat_${s.id}` in STR.en && `strat_${s.id}` in STR.he, s.id); assert.ok(C.DOMAINS.includes(s.domain)); }
  for (const d of C.DOMAINS) assert.ok(`dom_${d}` in STR.he);
});
test('progress counts only finished runs of the linked routine since the goal began; check-in prompt after a quiet week', () => {
  const g = C.sanitizeGoal({ title: 'g', templateId: 't', since: 1000, checks: [{ at: 2000, rating: 2 }, { at: 3000, rating: 2 }, { at: 4000, rating: 4 }, { at: 5000, rating: 5 }] });
  const runs = [{ templateId: 't', endedAt: 9, startedAt: 2000, plannedTotal: 100, actualTotal: 90 }, { templateId: 't', endedAt: 9, startedAt: 3000, plannedTotal: 100, actualTotal: 120 }, { templateId: 't', endedAt: 9, startedAt: 500, plannedTotal: 1, actualTotal: 1 }, { templateId: 'other', endedAt: 9, startedAt: 2000, plannedTotal: 1, actualTotal: 1 }];
  const p = C.progress(g, runs); assert.equal(p.runs, 2); assert.equal(p.onTime, 1); assert.equal(p.lastRating, 5); assert.ok(p.trend > 0);
  const day = 86_400_000, open = C.sanitizeGoal({ title: 'x', since: 1 });
  assert.equal(C.needsCheck(open, day / 2), false); assert.equal(C.needsCheck(open, 8 * day), true); assert.equal(C.needsCheck({ ...open, done: true }, 8 * day), false);
});
test('store: save goal, check-in, remove; profile keeps goals', async () => {
  await S.init(); const g = await S.saveGoal({ title: 'Be ready', strategies: ['steps'] }); assert.ok(g); assert.equal(S.goals().length, 1);
  await S.addCheck(g.id, { rating: 4, note: 'good' }); assert.equal(S.goals()[0].checks.length, 1); assert.equal(await S.saveGoal({ title: '' }), null);
  await S.removeGoal(g.id); assert.equal(S.goals().length, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../web/js/link.js';
import * as F from '../../web/js/family.js';
import * as S from '../../web/js/store.js';
import { rewardProgress, sanitizeGoal, weekStart } from '../../web/js/rewards.js';

const at = (d, h = 9) => new Date(2026, 10, d, h).getTime(); // Nov 2026: Sun 1 ... Wed 4
const run = (end, status = 'done', planned = 100, actual = 90) => ({ id: `r${end}`, status, endedAt: end, startedAt: end - 1000, plannedTotal: planned, actualTotal: actual });

test('weekly goal counts on-time completed routines of the current calendar week only', () => {
  const goal = sanitizeGoal({ title: 'Movie night', target: 3, mode: 'week' }), NOW = at(4, 12);
  assert.equal(goal.mode, 'week'); assert.equal(weekStart(NOW), at(1, 0));
  const runs = [run(at(1)), run(at(2), 'done', 100, 120), run(at(3)), run(at(3, 18), 'stopped'), run(at(4)), run(at(0, 9))]; // Oct 31 is last week
  assert.deepEqual(rewardProgress(goal, runs, NOW), { have: 3, target: 3, pct: 1, reached: true });
  assert.equal(rewardProgress(goal, runs, at(11, 9)).have, 0, 'next week starts from zero');
  assert.equal(sanitizeGoal({ title: 'x', target: 999, mode: 'week' }).target, 21); assert.equal(sanitizeGoal({ title: 'x', target: 5, mode: 'weird' }).mode, 'stars');
  assert.equal(rewardProgress({ ...goal, mode: 'stars', since: 0 }, runs, NOW).have, 13, 'stars mode counts the stars of every finished run since the goal started (3+1+3+0+3+3)');
});
test('late alerts: stored sanitised, hook fired unless switched off, child cannot make the parent execute anything', async () => {
  await S.init(); await F.initFamily();
  const { invite, code } = await F.createInvite('Mom'); const inv = await L.readInvite(code), child = { id: inv.linkId, key: inv.key, seqOut: 0, seen: [] };
  const joined = await F.receive(await L.makeEnvelope(child, 'join', { inviteId: inv.inviteId, profile: { name: 'Noa', age: 8 } })); const { link } = await F.approveJoin(joined.pending);
  const fired = []; F.setAlertHook((x) => fired.push(x));
  await F.receive(await L.makeEnvelope(child, 'alert', { kind: 'late', name: 'בוקר'.repeat(50), minutes: 9e9 }));
  assert.equal(fired.length, 1); const a = F.linkById(link.id).child.alerts[0]; assert.equal(a.kind, 'late'); assert.equal(a.minutes, 600); assert.ok(a.name.length <= 80);
  await F.receive(await L.makeEnvelope(child, 'alert', { kind: '<script>', name: 'x', minutes: -4 })); assert.equal(F.linkById(link.id).child.alerts[0].kind, 'late'); assert.equal(F.linkById(link.id).child.alerts[0].minutes, 0);
  await F.setAlertsOn(link.id, false); await F.receive(await L.makeEnvelope(child, 'alert', { kind: 'overtime', name: 'x', minutes: 5 })); assert.equal(fired.length, 2, 'switched off: stored but no notification');
  for (let i = 0; i < 15; i++) await F.receive(await L.makeEnvelope(child, 'alert', { kind: 'late', name: String(i), minutes: 1 })); assert.equal(F.linkById(link.id).child.alerts.length, 10, 'bounded history');
  const sent = await F.setGoal(link.id, { title: 'Pizza', emoji: '🍕', target: 4, mode: 'week' }); const m = await L.readEnvelope({ id: child.id, key: child.key, seqOut: 0, seen: child.seen }, sent.envelope); assert.equal(m.p.goal.mode, 'week');
  assert.deepEqual(F.childLinks(), []); // this device holds only the parent side
});

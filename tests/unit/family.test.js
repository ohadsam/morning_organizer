import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../web/js/link.js';
import { rewardProgress, sanitizeGoal, sanitizeReport, buildReport } from '../../web/js/rewards.js';
import * as F from '../../web/js/family.js';
import * as S from '../../web/js/store.js';

const fresh = () => ({ id: L.randomId(), key: L.newKey(), seqOut: 0, seen: [] });
const twin = (l) => ({ ...l, seqOut: 0, seen: [] });

test('envelope round trip, wrong key / tamper / wrong link / replay / garbage are all rejected', async () => {
  const a = fresh(), b = twin(a), env = await L.makeEnvelope(a, 'cheer', { text: 'שלום 🌟' });
  assert.match(env, /^ML1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/); assert.ok(L.looksLikeEnvelope(`msg: ${env} bye`));
  assert.deepEqual((await L.readEnvelope(b, env)).p, { text: 'שלום 🌟' });
  await assert.rejects(async () => L.readEnvelope(b, env), /replay/);
  const other = { ...twin(a), key: L.newKey() }; await assert.rejects(async () => L.readEnvelope(other, await L.makeEnvelope(a, 'x', {})));
  const tampered = env.slice(0, -4) + (env.endsWith('AAAA') ? 'BBBB' : 'AAAA'); await assert.rejects(async () => L.readEnvelope(twin(a), tampered));
  await assert.rejects(async () => L.readEnvelope({ ...twin(a), id: 'someOtherId' }, await L.makeEnvelope(a, 'x', {})), /wrong-link/);
  for (const bad of ['', 'ML1.x', 'ML1.abcdef.!!!', 'hello']) await assert.rejects(async () => L.readEnvelope(twin(a), bad));
});
test('out-of-order delivery works (store-and-forward), a replay inside the window does not', async () => {
  const a = fresh(), b = twin(a), e1 = await L.makeEnvelope(a, 'assign', {}), e2 = await L.makeEnvelope(a, 'cheer', {}), e3 = await L.makeEnvelope(a, 'goal', {});
  assert.equal((await L.readEnvelope(b, e3)).t, 'goal'); assert.equal((await L.readEnvelope(b, e1)).t, 'assign'); assert.equal((await L.readEnvelope(b, e2)).t, 'cheer');
  await assert.rejects(async () => L.readEnvelope(b, e1), /replay/);
});
test('invitation: round trip, sanitising, rejects bad shapes and oversize', async () => {
  const inv = { inviteId: L.randomId(), linkId: L.randomId(), key: L.newKey(), parentName: 'אמא‮'.repeat(30), offer: 'v=0\r\n' + 'a=x\r\n'.repeat(10) };
  const out = await L.readInvite(`please join ${await L.packInvite(inv)}`);
  assert.equal(out.key, inv.key); assert.ok(out.parentName.length <= 30 && !/‮/.test(out.parentName)); assert.ok(out.offer.startsWith('v=0'));
  assert.equal((await L.readInvite(await L.packInvite({ ...inv, offer: 'not sdp' }))).offer, '');
  await assert.rejects(async () => L.readInvite('MP1.AAAA')); await assert.rejects(async () => L.readInvite('nothing here'));
  const bad = await L.packInvite({ ...inv, key: 'short' }); await assert.rejects(async () => L.readInvite(bad), /bad-invite/);
  assert.ok(L.looksLikeInvite(await L.packInvite(inv))); assert.ok(!L.looksLikeInvite('M1.abcdefghijklmnopqrstuvwxyz0123456789'));
});
const run = (ended, status, planned, actual) => ({ id: 'r' + ended, templateName: 'n', icon: '🎒', startedAt: ended - 10, endedAt: ended, status, plannedTotal: planned, actualTotal: actual });
test('rewardProgress counts only stars earned after the goal started', () => {
  const goal = sanitizeGoal({ title: 'Ice cream', emoji: '🍦', target: 6, since: 1000 });
  const runs = [run(500, 'done', 100, 90), run(1500, 'done', 100, 90), run(2500, 'done', 100, 110), run(3500, 'stopped', 100, 50)];
  assert.deepEqual(rewardProgress(goal, runs), { have: 5, target: 6, pct: 5 / 6, reached: false });
  assert.equal(rewardProgress(goal, [...runs, run(4500, 'done', 100, 90)]).reached, true); assert.equal(rewardProgress(null, runs), null);
  assert.equal(sanitizeGoal({ target: 0 }), null); assert.equal(sanitizeGoal({ title: 'x', target: 99999 }).target, 999); assert.equal(sanitizeGoal('x'), null);
});
test('sanitizeReport clamps hostile values; buildReport -> sanitizeReport keeps the useful fields', () => {
  const r = sanitizeReport({ profile: { name: 'x'.repeat(99), age: 9e9, gender: 'zzz', mascot: '<b>' }, totalStars: -5, streakDays: 'NaN', recent: Array(99).fill({ name: 'n', stars: 99, status: 'weird', actual: 1e99 }), active: { pct: 7, name: 'run' }, evil: 1 });
  assert.equal(r.profile.name.length, 30); assert.equal(r.profile.age, 120); assert.equal(r.profile.gender, 'other'); assert.equal(r.totalStars, 0); assert.equal(r.recent.length, 20); assert.equal(r.recent[0].stars, 3); assert.equal(r.recent[0].status, 'stopped'); assert.equal(r.active.pct, 1); assert.equal(r.evil, undefined); assert.equal(sanitizeReport(null), null);
  const built = sanitizeReport(buildReport({ profile: { name: 'Noa', age: 8, gender: 'female', mascot: '🦊' }, runs: [run(10, 'done', 100, 90)], streakDays: 3, totalStars: 3, active: null, goal: null }));
  assert.equal(built.totalStars, 3); assert.equal(built.recent[0].stars, 3); assert.equal(built.profile.name, 'Noa');
});
test('parent side end to end (in-process): invite -> join reply -> approval -> report/goalDone -> hostile messages rejected', async () => {
  await S.init(); await F.initFamily();
  const { invite, code } = await F.createInvite('Dad', { live: false });
  const parsed = await L.readInvite(code); assert.equal(parsed.linkId, invite.linkId);
  const child = { id: parsed.linkId, key: parsed.key, seqOut: 0, seen: [] };               // what the child phone would hold
  const joinEnv = await L.makeEnvelope(child, 'join', { inviteId: parsed.inviteId, profile: { name: 'נועה', age: 8, gender: 'female', mascot: '🦊' } });
  const r = await F.receive(joinEnv); assert.equal(r.kind, 'join'); assert.equal(r.pending.profile.name, 'נועה');
  await assert.rejects(async () => F.receive(await L.makeEnvelope(child, 'join', { inviteId: 'WRONG', profile: {} })), /replay|bad-join/);
  const { link } = await F.approveJoin(r.pending); assert.equal(F.parentLinks().length, 1); assert.equal(link.child.profile.age, 8);
  await assert.rejects(async () => F.approveJoin(r.pending), /used/, 'an invitation works once');
  await assert.rejects(async () => F.receive(await L.makeEnvelope({ ...child, id: L.randomId() }, 'join', {})), /unknown-link/);
  const rep = await F.receive(await L.makeEnvelope(child, 'report', { profile: { name: 'נועה' }, totalStars: 7, streakDays: 2, recent: [], active: { name: 'בוקר', task: 'שיניים', pct: 0.5 }, goalHave: 3, at: 5 }));
  assert.equal(rep.kind, 'report'); assert.equal(F.linkById(link.id).child.report.totalStars, 7); assert.equal(F.linkById(link.id).child.report.active.task, 'שיניים');
  await F.receive(await L.makeEnvelope(child, 'goalDone', { title: 'גלידה' })); assert.equal(F.linkById(link.id).child.goalDone.title, 'גלידה');
  await F.receive(await L.makeEnvelope(child, 'assign', { templates: [] })); // a child cannot push routines onto a parent: ignored
  assert.equal(S.get().templates.every((x) => !x.from), true);
  const sent = await F.setGoal(link.id, { title: 'Ice cream', emoji: '🍦', target: 5 }); assert.equal(sent.delivered, false); assert.match(sent.envelope, /^ML1\./);
  const childSide = { id: child.id, key: child.key, seqOut: 0, seen: child.seen }; const m = await L.readEnvelope(childSide, sent.envelope);
  assert.equal(m.t, 'goal'); assert.equal(m.p.goal.target, 5);
  await F.unlink(link.id); assert.equal(F.parentLinks().length, 0);
});

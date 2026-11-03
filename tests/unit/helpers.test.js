import test from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, AREA_EMOJI, TOOLS, sanitizeAreas, toolsFor, tipWeights } from '../../web/js/focus.js';
import { PATTERNS, cycleSec, phaseAt, cyclesFor, GROUNDING, BODYSCAN, stepAt } from '../../web/js/calm.js';
import { sprintPlan, sprintState } from '../../web/js/sprints.js';
import { moodStats, sanitizeMood, moodEmoji, MOODS } from '../../web/js/mood.js';
import { sanitizeMenu, sanitizeRedeemed, balance, canAfford, spent } from '../../web/js/menu.js';

test('focus areas: sanitising, defaults per area, overrides always win, tip weights', () => {
  assert.deepEqual(sanitizeAreas(['focus', 'calm', 'focus', '__proto__', 'constructor', 5, null]), ['focus', 'calm']); assert.deepEqual(sanitizeAreas('x'), []);
  assert.ok(AREAS.every((a) => AREA_EMOJI[a]));
  const none = toolsFor([]); assert.ok(none.calmCorner && none.journal); assert.ok(!none.sprints && !none.rewardMenu && !none.moodCheck);
  const f = toolsFor(['focus']); assert.ok(f.sprints && f.bodyDouble && f.parkingLot && f.transition && !f.rewardMenu);
  assert.ok(toolsFor(['calm']).moodCheck && toolsFor(['motivation']).rewardMenu && toolsFor(['time']).timerPie);
  assert.equal(toolsFor(['focus'], { sprints: false }).sprints, false); assert.equal(toolsFor([], { rewardMenu: true }).rewardMenu, true); assert.equal(toolsFor([], { sprints: 'yes', __proto__: 1 }).sprints, false, 'only real booleans override');
  assert.deepEqual(Object.keys(toolsFor([])).sort(), [...TOOLS].sort());
  assert.deepEqual(tipWeights([]), {}); assert.equal(tipWeights(['calm']).breath, 3); assert.equal(tipWeights(['calm']).focus, undefined); assert.equal(tipWeights(['focus', 'motivation']).focus, 3);
});
test('calm: phase timeline of every pattern is continuous, cycles repeat, circle size stays within 0..1', () => {
  assert.deepEqual([cycleSec(PATTERNS.box), cycleSec(PATTERNS.slow), cycleSec(PATTERNS.relax478), cycleSec(PATTERNS.sigh)], [16, 10, 19, 9]);
  for (const p of Object.values(PATTERNS)) {
    let prev = null; for (let t = 0; t < cycleSec(p) * 2; t += 0.25) { const s = phaseAt(p, t); assert.ok(s.size >= 0 && s.size <= 1 && s.progress >= 0 && s.progress <= 1, `${p.id}@${t}`); if (prev !== null) assert.ok(Math.abs(s.size - prev) <= 0.3, `jump in ${p.id}@${t}: ${prev}->${s.size}`); prev = s.size; }
    const a = phaseAt(p, 3.3), b = phaseAt(p, 3.3 + cycleSec(p)); assert.equal(a.label, b.label); assert.equal(b.cycle, 1); assert.ok(Math.abs(a.size - b.size) < 1e-9);
  }
  const b = phaseAt(PATTERNS.box, 5); assert.deepEqual([b.label, b.index, Math.round(b.left)], ['hold', 1, 3]); assert.equal(phaseAt(PATTERNS.slow, 0).size, 0); assert.equal(phaseAt(PATTERNS.slow, 4).size, 1);
  assert.equal(cyclesFor(PATTERNS.box, 1), 4); assert.equal(cyclesFor(PATTERNS.relax478, 0.1), 1); assert.equal(GROUNDING.length, 5); assert.equal(GROUNDING.reduce((s, g) => s + g.n, 0), 15);
  assert.equal(BODYSCAN.length, 6); assert.deepEqual([stepAt(6, 60, 0), stepAt(6, 60, 29), stepAt(6, 60, 59.9), stepAt(6, 60, 500)], [0, 2, 5, 5]);
});
test('sprints: only for long tasks; timeline of sprints and breaks; the last sprint has no break', () => {
  assert.equal(sprintPlan(300).enabled, false); const p = sprintPlan(900); assert.deepEqual([p.enabled, p.total], [true, 3]);
  assert.deepEqual(sprintState(10, p), { index: 0, total: 3, inBreak: false, leftInSprint: 290, breakLeft: 0, done: false });
  const brk = sprintState(310, p); assert.deepEqual([brk.index, brk.inBreak, brk.breakLeft], [0, true, 20]); assert.deepEqual([sprintState(331, p).index, sprintState(331, p).inBreak], [1, false]);
  const last = sprintState(2 * 330 + 310, p); assert.deepEqual([last.index, last.inBreak], [2, false], 'no break after the final sprint'); assert.equal(sprintState(5000, p).done, true);
  assert.equal(sprintState(100, sprintPlan(60)).total, 1); assert.deepEqual(sprintPlan(600, { sprintSec: 120 }).total, 5);
});
test('mood: sanitising, stats per mood, insight only with enough data', () => {
  assert.deepEqual([sanitizeMood(3), sanitizeMood('5'), sanitizeMood(0), sanitizeMood(9), sanitizeMood('x'), sanitizeMood(null)], [3, 5, null, null, null, null]); assert.equal(moodEmoji(5), '😄'); assert.equal(moodEmoji(9), ''); assert.equal(MOODS.length, 5);
  const run = (i, mood, actual) => ({ id: `r${i}`, startedAt: i * 1e6, endedAt: i * 1e6 + 1, mood, plannedTotal: 100, actualTotal: actual });
  assert.equal(moodStats([run(1)]).n, 0);
  const rs = [run(1, 5, 80), run(2, 4, 85), run(3, 5, 90), run(4, 1, 130), run(5, 2, 125), run(6, 2, 140), run(7, 3, 100)], m = moodStats(rs);
  assert.equal(m.n, 7); assert.equal(m.insight.type, 'happyFaster'); assert.ok(m.insight.pct >= 30); assert.equal(m.byMood[2].n, 2); assert.ok(m.points[0].t < m.points[1].t);
  assert.equal(moodStats(rs.slice(0, 4)).insight, null, 'not enough low-mood runs');
});
test('reward menu: sanitising, balance never negative, affordability', () => {
  const m = sanitizeMenu([{ title: 'Ice cream', cost: 5, emoji: '🍦' }, { title: '', cost: 3 }, null, 'x', { title: 'x'.repeat(99), cost: 99999 }, ...Array(30).fill({ title: 'y', cost: 1 })]);
  assert.equal(m.length, 12); assert.equal(m[0].cost, 5); assert.equal(m[1].title.length, 40); assert.equal(m[1].cost, 999); assert.ok(m.every((x) => x.id && x.emoji));
  const r = sanitizeRedeemed([{ id: 'a', title: 'T', cost: 5, at: 1, given: 1 }, { title: 'no id' }, null]); assert.equal(r.length, 1); assert.equal(r[0].given, true);
  assert.equal(spent(r), 5); assert.equal(balance(12, r), 7); assert.equal(balance(3, r), 0); assert.ok(canAfford({ cost: 7 }, 12, r)); assert.ok(!canAfford({ cost: 8 }, 12, r));
});

test('profile helpers: hostile focus/tools/menu input is sanitised', async () => {
  const { normalizeProfile, sanitizeTools } = await import('../../web/js/profiles.js');
  const p = normalizeProfile({ focus: ['focus', '__proto__', 5, 'focus'], tools: { calmCorner: false, journal: 'yes', constructor: true, bogus: true }, menu: [{ title: 'x'.repeat(99), cost: -4 }, null], redeemed: [{ id: 5 }] });
  assert.deepEqual(p.focus, ['focus']); assert.deepEqual(p.tools, { calmCorner: false }); assert.equal(p.menu.length, 1); assert.equal(p.menu[0].cost, 1); assert.equal(p.redeemed.length, 0);
  assert.deepEqual(sanitizeTools(null), {});
});
test('coach tips are weighted toward the chosen areas', async () => {
  const { pickTip } = await import('../../web/js/coach.js'), { TIPS } = await import('../../web/js/coachTips.js');
  const cat = new Map(TIPS.map((x) => [x.id, x.cat])); let breath = 0, base = 0, i = 0;
  for (let n = 0; n < 400; n++) { const rnd = () => ((i = (i * 1103515245 + 12345) % 2147483648) / 2147483648); if (cat.get(pickTip({ areas: ['calm'], rnd, seen: new Set() }).id) === 'breath') breath++; if (cat.get(pickTip({ rnd, seen: new Set() }).id) === 'breath') base++; }
  assert.ok(breath > base, `${breath} should exceed ${base}`);
});

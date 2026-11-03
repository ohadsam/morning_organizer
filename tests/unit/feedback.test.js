import test from 'node:test';
import assert from 'node:assert/strict';
import { POOLS, EMOJI, choose, fill, taskEvent } from '../../web/js/feedback.js';
import { suggestIcon, DEFAULT_ICON } from '../../web/js/taskIcons.js';
import { stars, streak, totalStars } from '../../web/js/stats.js';
import * as E from '../../web/js/engine.js';
import { encode, decode } from '../../web/js/share.js';

test('every event has >=3 messages in both languages and an emoji pool; no unresolved placeholders after fill', () => {
  for (const ev of Object.keys(POOLS.en)) {
    assert.ok(EMOJI[ev]?.length, ev);
    for (const lang of ['en', 'he']) {
      assert.ok(POOLS[lang][ev]?.length >= 3, `${lang}/${ev}`);
      for (const m of POOLS[lang][ev]) for (const name of ['', 'Dana', 'דנה']) { const out = fill(m, name); assert.ok(!/[{}]/.test(out) && out.length > 3, `${lang}/${ev}: ${out}`); }
    }
  }
  assert.deepEqual(Object.keys(POOLS.en), Object.keys(POOLS.he));
});
test('fill keeps sentences natural with and without a name', () => {
  assert.equal(fill('Well done, {name}!', 'Dana'), 'Well done, Dana!'); assert.equal(fill('Well done, {name}!', ''), 'Well done!');
  assert.equal(fill('{name}, go!', ''), 'go!'); assert.equal(fill('A - {name} - B', 'x'), 'A - x - B');
  assert.equal(fill('Hi {name}', '  <b>x</b>  '), 'Hi <b>x</b>'); // text only: callers use text nodes, never HTML
});
test('choose never repeats the previous line and is deterministic for a given rnd', () => {
  const n = POOLS.en.taskDone.length;
  for (let last = 0; last < n; last++) assert.notEqual(choose('taskDone', { last, rnd: () => last / n }).index, last);
  assert.equal(choose('start', { rnd: () => 0 }).text, choose('start', { rnd: () => 0 }).text);
  assert.equal(choose('nope'), null); assert.equal(choose('start', { lang: 'xx', rnd: () => 0 }).index, 0);
});
test('taskEvent classification', () => { assert.equal(taskEvent(50, 100), 'taskEarly'); assert.equal(taskEvent(100, 100), 'taskDone'); assert.equal(taskEvent(119, 100), 'taskDone'); assert.equal(taskEvent(130, 100), 'taskLate'); });
test('icon suggestion (he + en) with fallback', () => {
  assert.equal(suggestIcon('Brush teeth'), '🪥'); assert.equal(suggestIcon('לצחצח שיניים'), '🪥'); assert.equal(suggestIcon('ארוחת בוקר'), '🥣'); assert.equal(suggestIcon('xyz'), DEFAULT_ICON); assert.equal(suggestIcon(null), DEFAULT_ICON);
});
const run = (status, actual, planned) => ({ status, actualTotal: actual, plannedTotal: planned, endedAt: 0 });
test('stars: 3 within plan, 2 within +15%, 1 late, 0 stopped', () => {
  assert.equal(stars(run('done', 100, 100)), 3); assert.equal(stars(run('done', 114, 100)), 2); assert.equal(stars(run('done', 130, 100)), 1); assert.equal(stars(run('stopped', 10, 100)), 0);
  assert.equal(totalStars([run('done', 1, 1), run('done', 130, 100)]), 4);
});
test('streak counts consecutive days, tolerates "not yet today", resets on a gap', () => {
  const day = (n) => new Date(2026, 10, 3 - n, 12).getTime(), r = (n) => ({ status: 'done', endedAt: day(n) });
  const now = new Date(2026, 10, 3, 9).getTime();
  assert.equal(streak([r(0), r(1), r(2)], now), 3); assert.equal(streak([r(1), r(2)], now), 2); assert.equal(streak([r(2), r(3)], now), 0);
  assert.equal(streak([r(0), r(2)], now), 1); assert.equal(streak([{ status: 'stopped', endedAt: day(0) }], now), 0); assert.equal(streak([], now), 0);
});
test('paused time is tracked, also when finishing while paused', () => {
  const tpl = { id: 't', name: 'n', icon: 'i', color: '#000000', tasks: [{ id: 'a', name: 'A', sec: 60, est: 0, icon: '🪥' }] };
  let r = E.createRun(tpl, 0); assert.equal(r.tasks[0].icon, '🪥');
  E.pause(r, 10_000); E.resume(r, 40_000); E.pause(r, 50_000); r = E.finish(r, 80_000);
  assert.equal(E.summarize(r).pausedSec, 60); assert.equal(r.tasks[0].actualSec, 20);
});
test('task icon survives share round trip and is sanitised', async () => {
  const out = await decode(await encode({ name: 'x', icon: '⏰', color: '#112233', tasks: [{ name: 'a', sec: 60, est: 0, icon: '🪥' }, { name: 'b', sec: 60, est: 0 }] }));
  assert.equal(out.tasks[0].icon, '🪥'); assert.equal(out.tasks[1].icon, '');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFeeling, sanitizeFeelings, approachOf, feelingStats, summaryText, TAGS, APPROACHES, MAX_FEELINGS, DAY } from '../../web/js/feelings.js';

const NOW = new Date(2026, 10, 8, 12, 0, 0).getTime();
const f = (daysAgo, mood, extra = {}) => sanitizeFeeling({ at: NOW - daysAgo * DAY, mood, pid: 'p1', ap: 'general', ...extra });
const L = { title: 'T', period: (n) => `P${n}`, count: (n, d) => `C${n}/${d}`, avg: (x) => `A${x}`, trend: { up: 'UP', down: 'DOWN', flat: 'FLAT' }, low: (n) => `LOW${n}`, mood: (v) => `m${v}`, tag: (ap, t) => `${ap}.${t}`, noteWord: 'Note', disclaimer: 'D' };

test('a check-in needs a face 1 to 5; everything else is clamped or dropped', () => {
  assert.equal(sanitizeFeeling({ mood: 0 }), null); assert.equal(sanitizeFeeling({ mood: 6 }), null); assert.equal(sanitizeFeeling(null), null);
  const x = sanitizeFeeling({ mood: 3.4, ap: 'evil', tag: 'worry', note: '<b>hi</b>'.repeat(100), id: 'a b', at: 'x' });
  assert.equal(x.mood, 3); assert.equal(x.ap, 'general'); assert.equal(x.tag, ''); assert.ok(x.note.length <= 400); assert.match(x.id, /^[\w-]+$/); assert.ok(x.at > 0);
  assert.equal(sanitizeFeeling({ mood: 2, ap: 'cbt', tag: 'worry' }).tag, 'worry'); assert.equal(sanitizeFeeling({ mood: 2, ap: 'cbt', tag: 'sharp' }).tag, '', 'a chip of another approach is dropped');
  assert.equal(sanitizeFeelings(Array.from({ length: MAX_FEELINGS + 50 }, () => ({ mood: 3 }))).length, MAX_FEELINGS); assert.deepEqual(sanitizeFeelings('x'), []);
});
test('every approach has a question with four answers', () => { for (const a of APPROACHES) assert.equal(TAGS[a].length, 4, a); });
test('approachOf follows the chosen method, then the first help area, else general', () => {
  assert.equal(approachOf({ model: 'nlp', problems: ['adhd'] }), 'nlp'); assert.equal(approachOf({ model: 'full', problems: ['anxiety', 'adhd'] }), 'anxiety');
  assert.equal(approachOf({ model: 'full', problems: [] }), 'general'); assert.equal(approachOf(null), 'general'); assert.equal(approachOf({ problems: ['junk'] }), 'general');
});
test('statistics: daily averages, the overall average and the trend against the week before', () => {
  const list = [f(0, 5), f(0, 3), f(1, 4), f(2, 4), f(3, 5), f(8, 2), f(9, 2), f(10, 1), f(11, 2)];
  const s = feelingStats(list, NOW, 14); assert.equal(s.series.length, 14); assert.equal(s.series.at(-1).avg, 4); assert.equal(s.n, 9); assert.equal(s.trend, 'up'); assert.ok(s.low >= 3);
  assert.equal(feelingStats([], NOW).trend, null); assert.equal(feelingStats([f(0, 3)], NOW).trend, null, 'too little data says nothing');
  assert.equal(feelingStats([f(0, 3), f(1, 3), f(2, 3), f(8, 3), f(9, 3), f(10, 3)], NOW).trend, 'flat');
  assert.equal(feelingStats([f(0, 1), f(1, 1), f(2, 1), f(8, 5), f(9, 5), f(10, 5)], NOW).trend, 'down');
});
test('the summary for a therapist: only what was chosen, notes only when asked', () => {
  const list = [f(1, 2, { note: 'secret thing', ap: 'cbt', tag: 'worry' }), f(2, 4)];
  const a = summaryText(list, { now: NOW, days: 14, name: 'Dana' }, L); assert.match(a, /T - Dana/); assert.match(a, /C2\/2/); assert.match(a, /cbt\.worry/); assert.ok(!a.includes('secret'), 'notes stay out by default'); assert.match(a, /D$/);
  const b = summaryText(list, { now: NOW, days: 14, includeNotes: true }, L); assert.match(b, /Note: secret thing/);
  assert.ok(!summaryText(list, { now: NOW, days: 1 }, L).includes('m4'), 'only the chosen period');
});

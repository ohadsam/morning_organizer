import test from 'node:test';
import assert from 'node:assert/strict';
import { ENTRIES, search, scoreEntry, normQuery } from '../../web/js/searchIndex.js';
import { buildTasks, areasOf, KIND_ROUTINE, NEEDS } from '../../web/js/guided.js';
import { pickSuggestion, answer, sanitizeState, SUGGESTIONS } from '../../web/js/suggestions.js';
import { STR } from '../../web/js/i18n.js';

const t = (k, p = {}) => (STR.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
const tHe = (k, p = {}) => (STR.he[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');

test('search: finds features by English and Hebrew words, ignores niqqud/quotes, needs every word', () => {
  const top = (q, tr = t) => search(q, { t: tr })[0]?.id;
  assert.equal(top('alarm'), 'alarms'); assert.equal(top('wake up'), 'alarms'); assert.equal(top('שעון מעורר', tHe), 'alarms');
  assert.equal(top('voice'), 'set_voice'); assert.equal(top('קול', tHe), 'set_voice');
  assert.ok(['calm', 'wizard'].includes(top('anxiety')));
  assert.equal(top('text size'), 'set_a11y'); assert.equal(top('zzzzqq'), undefined);
  assert.equal(normQuery('  שִׁעוּן, מעורר! '), 'שעון מעורר');
  assert.equal(scoreEntry('Alarms', 'clock', 'alarm clock') > 0, true); assert.equal(scoreEntry('Alarms', 'clock', 'alarm banana'), 0);
});
test('search: empty query shows popular items; routines are found by name; hidden features are skipped', () => {
  assert.ok(search('', { t }).length >= 4);
  const r = search('lunch', { t, routines: [{ id: 'x1', name: 'Lunch box', icon: '🍱' }] });
  assert.deepEqual(r.slice(0, 2).map((x) => x.go.route), ['#/run/x1', '#/edit/x1']);
  assert.ok(!search('calm', { t, has: (id) => id !== 'calm' }).some((x) => x.id === 'calm'));
});
test('search: every entry has titles in both languages and a safe destination', () => {
  for (const e of ENTRIES) { assert.ok(STR.en[e.key] && STR.he[e.key], e.key); assert.ok(e.go.route?.startsWith('#/') || /^[a-zA-Z]+$/.test(e.go.action), e.id); }
  assert.equal(new Set(ENTRIES.map((e) => e.id)).size, ENTRIES.length);
});

const entry = { tasks: [{ name: 'Get up', icon: '⏰', sec: 120 }, { name: 'Homework', icon: '📚', sec: 1500 }, { name: 'Pack bag', icon: '🎒', sec: 180 }] };
let n = 0; const mk = { entry, runs: [], defaultSec: 300, tr: (k) => k, newId: () => `id${n++}` };
test('wizard: help areas map from needs; unknown needs are ignored', () => {
  assert.deepEqual(areasOf(['adhd', 'anxiety', 'nope', '__proto__']), ['focus', 'calm']); assert.deepEqual(areasOf('x'), []);
  for (const k of Object.values(KIND_ROUTINE)) assert.ok(k.startsWith('sample-')); assert.ok(NEEDS.simple.length === 0);
});
test('wizard: simple routine keeps the ready-made steps; help adds time and calm/focus breaks; young age gives more time', () => {
  const plain = buildTasks({ ...mk, age: 30, needs: ['simple'] });
  assert.equal(plain.tasks.length, 3); assert.equal(plain.added, 0); assert.equal(plain.tasks[1].sec, 1500);
  const helped = buildTasks({ ...mk, age: 9, needs: ['adhd', 'anxiety'] });
  assert.ok(helped.tasks.length > 3 && helped.added > 0, 'extra breaks'); assert.ok(helped.totalSec > plain.totalSec);
  assert.ok(helped.tasks.every((k) => k.id && k.name && k.sec >= 15 && k.sec <= 7200));
  assert.equal(buildTasks({ ...mk, age: 9, needs: ['adhd'], withBreaks: false }).added, 0);
  assert.equal(new Set(helped.tasks.map((k) => k.id)).size, helped.tasks.length, 'unique ids');
});

test('suggestions: one at a time, respects answers, a day apart, off switch', () => {
  const c = { runs: 0, ownRoutines: 0, alarmsOn: false, goals: 0, retros: 0, voiceChosen: false, ttsOk: true, calmOn: true };
  const now = 1e12; let s = sanitizeState({});
  assert.equal(pickSuggestion(c, s, now).id, 'wizard');
  s = answer(s, 'wizard', 'later', now); assert.equal(pickSuggestion(c, s, now + 3600e3), null, 'a day apart');
  assert.equal(pickSuggestion({ ...c, ownRoutines: 1 }, s, now + 2 * 86400e3).id, 'guide');
  s = answer(s, 'guide', 'never', now + 2 * 86400e3);
  assert.ok(!['guide', 'wizard'].includes(pickSuggestion({ ...c, ownRoutines: 1, runs: 1 }, s, now + 4 * 86400e3)?.id));
  assert.equal(pickSuggestion({ ...c, runs: 9, ownRoutines: 2, alarmsOn: true }, { off: true }, now), null);
  assert.deepEqual(sanitizeState({ hidden: ['x', 'wizard', 5], snoozed: { wizard: 'a', alarms: 5, bogus: 1 }, last: 'q' }), { off: false, hidden: ['wizard'], snoozed: { alarms: 5 }, last: 0 });
  assert.ok(SUGGESTIONS.every((x) => STR.en[`sg_${x.id}_t`] && STR.he[`sg_${x.id}_b`]));
  assert.equal(answer(s, 'bogus', 'never', now).hidden.includes('bogus'), false);
});

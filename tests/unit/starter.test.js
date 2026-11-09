import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STARTERS, starterFor, starterEntry } from '../../web/js/starterPack.js';

test('every approach has routines with names and steps in both languages, of a sensible size', () => {
  for (const [k, list] of Object.entries(STARTERS)) { assert.ok(list.length >= 1, k); for (const r of list) { assert.ok(r.name.he && r.name.en && r.icon && /^#[0-9a-f]{6}$/i.test(r.color), r.id); assert.ok(r.steps.length >= 3 && r.steps.length <= 6, r.id);
    for (const s of r.steps) { assert.ok(s.he && s.en && s.min >= 1 && s.min <= 20, `${r.id}: ${s.en}`); } const total = r.steps.reduce((x, s) => x + s.min, 0); assert.ok(total <= 30, `${r.id} is ${total} minutes`); } }
  const ids = Object.values(STARTERS).flat().map((r) => r.id); assert.equal(new Set(ids).size, ids.length, 'unique ids');
});
test('the method comes first, then the help areas, at most three, none twice', () => {
  assert.deepEqual(starterFor({ model: 'cbt', problems: [] }).map((r) => r.id), ['st-cbt-check', 'st-cbt-step']);
  const mixed = starterFor({ model: 'nlp', problems: ['adhd', 'anxiety'] }); assert.equal(mixed.length, 3); assert.equal(mixed[0].id, 'st-nlp-goal'); assert.equal(new Set(mixed.map((r) => r.id)).size, 3);
  assert.deepEqual(starterFor({ model: 'full', problems: ['junk'] }), starterFor({ model: 'full', problems: [] })); assert.ok(Array.isArray(starterFor(null)));
});
test('a starter becomes a library-shaped entry in the chosen language, steps in seconds', () => {
  const e = starterEntry(STARTERS.adhd[0], 'he'); assert.equal(e.name, 'להתחיל'); assert.equal(e.tasks[0].sec, 180); assert.equal(e.leaveBy, ''); assert.equal(starterEntry(STARTERS.adhd[0], 'en').name, 'Get started');
});

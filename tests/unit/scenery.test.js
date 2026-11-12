import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseScenery, skyAt, frameFor, MEDAL_OF, screenArtFor, suggestSil, isSil, SILS, SKIES } from '../../web/js/scenery.js';

test('the shipped scenery kit parses with 14 frames, 6 skies and the dividers', () => {
  const s = parseScenery(JSON.parse(readFileSync(new URL('../../web/data/scenery.json', import.meta.url), 'utf8')));
  assert.equal(Object.keys(s.frames).length, 14); assert.equal(Object.keys(s.skies).length, 6); assert.ok(s.dividers.sunrise);
  for (const k of SKIES) assert.ok(s.skies[k], k);
});
test('unsafe or foreign data is refused', () => {
  assert.equal(parseScenery(null), null); assert.equal(parseScenery({ format: 'x', version: 1 }), null);
  assert.equal(parseScenery({ format: 'sonrise-scenery', version: 1, frames: { 1: '<svg viewBox="0 0 1 1"><script/></svg>' } }), null);
});
test('sky by hour and frame by level', () => {
  assert.equal(skyAt(6), 'dawn'); assert.equal(skyAt(9), 'morning'); assert.equal(skyAt(12), 'noon'); assert.equal(skyAt(16), 'afternoon'); assert.equal(skyAt(19), 'dusk'); assert.equal(skyAt(23), 'night'); assert.equal(skyAt(3), 'night');
  assert.equal(frameFor(0), 1); assert.equal(frameFor(5), 5); assert.equal(frameFor(99), 14); assert.equal(frameFor('x'), 1);
});
test('the 14 screen backgrounds ship, and each screen has its own picture (none behind the run screen)', () => {
  const s = parseScenery(JSON.parse(readFileSync(new URL('../../web/data/scenery.json', import.meta.url), 'utf8')));
  assert.equal(Object.keys(s.screens).length, 14);
  for (const v of ['home', 'calm', 'feel', 'nlp', 'stats', 'settings', 'journal']) assert.ok(s.screens[screenArtFor(v)], v);
  assert.equal(screenArtFor('run'), null); assert.equal(screenArtFor('constructor'), null); assert.equal(screenArtFor('home', true), 'play');
});
test('the 14 task silhouettes ship and are suggested from a task name (Hebrew and English)', () => {
  const s = parseScenery(JSON.parse(readFileSync(new URL('../../web/data/scenery.json', import.meta.url), 'utf8')));
  assert.deepEqual(Object.keys(s.tasks).sort(), Object.keys(SILS).sort());
  assert.equal(suggestSil('Brush your teeth'), 'brush-teeth'); assert.equal(suggestSil('לצחצח שיניים'), 'brush-teeth'); assert.equal(suggestSil('Pack the bag'), 'pack-bag'); assert.equal(suggestSil('לאכול ארוחת בוקר'), 'breakfast'); assert.equal(suggestSil('Meditate'), '');
  assert.ok(isSil('shower')); assert.equal(isSil('../x'), false); assert.equal(isSil(undefined), false);
});
test('the medals: 14 levels and the streaks, each with a locked form', () => {
  const s = parseScenery(JSON.parse(readFileSync(new URL('../../web/data/scenery.json', import.meta.url), 'utf8')));
  for (let i = 1; i <= 14; i++) { assert.ok(s.badges[`level-${i}`], `level-${i}`); assert.ok(s.badges[`level-${i}-locked`], `level-${i}-locked`); }
  for (const id of Object.values(MEDAL_OF)) { assert.ok(s.badges[id], id); assert.ok(s.badges[`${id}-locked`], `${id}-locked`); }
});

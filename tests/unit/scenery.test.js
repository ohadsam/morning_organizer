import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseScenery, skyAt, frameFor, SKIES } from '../../web/js/scenery.js';

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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOUR } from '../../web/js/tour.js';

test('the tour has five steps, each in both languages, with a route that exists and one of Sunny\'s cameos', () => {
  assert.equal(TOUR.length, 5); const cameos = new Set(['check', 'empty', 'error', 'offline', 'loading', 'reminder', 'calm', 'tired', 'proud', 'think', 'hello', 'goodbye']);
  for (const s of TOUR) { assert.ok(cameos.has(s.cameo), s.id); assert.match(s.route, /^#\/(|calm|feel|settings)$/); for (const l of ['he', 'en']) { assert.equal(s[l].length, 2); assert.ok(s[l][0].length >= 3 && s[l][1].length >= 20 && s[l][1].length <= 200, `${s.id} ${l}`); } }
  assert.equal(new Set(TOUR.map((s) => s.id)).size, 5);
});

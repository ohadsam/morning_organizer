import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCalmKit, frameMix, storyFrame, scanZone } from '../../web/js/calmKit.js';
import { PATTERNS } from '../../web/js/calm.js';
import { GUIDES, SCANS } from '../../web/js/calmGuides.js';

const raw = JSON.parse(readFileSync(new URL('../../web/data/calm-kit.json', import.meta.url), 'utf8'));
test('the shipped calm kit passes the strict allow-list, every scene', () => {
  const s = parseCalmKit(raw); assert.ok(s);
  assert.equal(Object.keys(s).length, Object.keys(raw.scenes).length, 'nothing dropped');
});
test('a scene with a script, an event handler or a remote link is dropped', () => {
  const bad = (svg) => parseCalmKit({ format: 'sonrise-calm-kit', version: 1, scenes: { ok: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle cx="8" cy="8" r="4" class="k1"/></svg>' }, bad: { svg } } });
  for (const svg of ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><script>alert(1)</script></svg>', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle onload="x()" r="4"/></svg>', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><image href="https://x.y/a.png"/></svg>']) assert.deepEqual(Object.keys(bad(svg)), ['ok']);
  assert.equal(parseCalmKit({ format: 'x' }), null);
});
test('every pattern, journey, grounding sense and scan zone the app uses has a scene', () => {
  const ids = new Set(Object.keys(raw.scenes));
  for (const p of Object.keys(PATTERNS)) for (let i = 0; i < 5; i++) assert.ok(ids.has(`breath-${p}-${i}`), `breath-${p}-${i}`);
  for (const g of GUIDES) for (let f = 1; f <= 4; f++) assert.ok(ids.has(`imagery-${g.id}-f${f}`), `imagery-${g.id}-f${f}`);
  for (let n = 1; n <= 5; n++) assert.ok(ids.has(`grounding-${n}`));
  for (let z = 0; z <= 8; z++) assert.ok(ids.has(`bodyscan-${z}`));
  assert.ok(Object.keys(SCANS).length >= 1);
});
test('no scene uses the coral-red class k6 for skin: skin is k8, glows and dots k3', () => {
  for (const id of Object.keys(raw.scenes).filter((x) => x.startsWith('bodyscan') || x.startsWith('grounding'))) assert.ok(!raw.scenes[id].svg.includes('class="k6"'), id);
});
test('frameMix picks two neighbouring frames and how far between them', () => {
  assert.deepEqual(frameMix(0), { a: 0, b: 1, t: 0 }); assert.deepEqual(frameMix(1), { a: 3, b: 4, t: 1 });
  assert.deepEqual(frameMix(0.5), { a: 2, b: 3, t: 0 }); assert.equal(frameMix(0.125).a, 0); assert.ok(Math.abs(frameMix(0.125).t - 0.5) < 1e-9);
  for (const p of [-3, NaN, 7, 0.3, 0.77]) { const x = frameMix(p); assert.ok(x.a >= 0 && x.b <= 4 && x.t >= 0 && x.t <= 1); }
});
test('storyFrame walks 1..4 across the steps and scanZone 0..8 across the parts', () => {
  assert.equal(storyFrame(0, 9), 1); assert.equal(storyFrame(8, 9), 4); assert.equal(storyFrame(0, 1), 1);
  const seen = new Set(Array.from({ length: 9 }, (_, i) => storyFrame(i, 9))); assert.deepEqual([...seen].sort(), [1, 2, 3, 4]);
  assert.equal(scanZone(0, 6), 0); assert.equal(scanZone(5, 6), 8); assert.equal(scanZone(3, 1), 0);
  for (const n of [2, 6, 9, 12]) for (let i = 0; i < n; i++) { const z = scanZone(i, n); assert.ok(z >= 0 && z <= 8); }
});

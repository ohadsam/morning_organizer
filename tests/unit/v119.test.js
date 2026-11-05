import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDES, SCANS, guideText, GUIDE_IDS } from '../../web/js/calmGuides.js';
import { analyze, sanitizeAprt, trapOf, EMOTION_IDS, RESPONSES, TRAP_IDS } from '../../web/js/aprt.js';
import { sanitizeEntry } from '../../web/js/journal.js';
import { STR } from '../../web/js/i18n.js';

test('guided imagery: 10+ guides, both languages complete, the four elements one included, sane step counts', () => {
  assert.ok(GUIDES.length >= 10); assert.equal(new Set(GUIDE_IDS).size, GUIDES.length); assert.ok(GUIDE_IDS.includes('elements'));
  for (const g of GUIDES) { assert.equal(g.steps.en.length, g.steps.he.length, g.id); assert.ok(g.steps.en.length >= 6 && g.steps.en.length <= 10, g.id); assert.ok([...g.steps.en, ...g.steps.he, g.title.en, g.title.he].every((x) => x.trim().length > 3), g.id); }
  const el = guideText('elements', 'en').steps.join(' '); for (const w of ['Earth', 'Air', 'Water', 'Fire']) assert.ok(el.includes(w), w);
  const he = guideText('elements', 'he'); assert.match(he.title, /אדמה/); assert.match(he.steps.join(' '), /אש/); assert.equal(guideText('nope', 'en').id, GUIDES[0].id);
});
test('body scans: four kinds, every part and sentence template exists in both languages', () => {
  assert.deepEqual(Object.keys(SCANS).sort(), ['full', 'muscle', 'quick', 'sleep']);
  for (const [id, s] of Object.entries(SCANS)) { assert.ok(s.parts.length >= 6, id); assert.ok(STR.en[s.step] && STR.he[s.step], s.step); for (const p of s.parts) assert.ok(STR.en[`part_${p}`] && STR.he[`part_${p}`], `part_${p}`); assert.ok(STR.en[`scan_${id}`] && STR.he[`scanHint_${id}`]); }
});
test('APRT: sanitiser clamps and whitelists; traps are hinted softly; analysis needs 3 records and summarises patterns', () => {
  const a = sanitizeAprt({ event: 'x'.repeat(2000), interp: 'I always fail', emotion: 'bogus', intensity: 99, responses: ['froze', 'nope', 'froze', 'cried'], after: -3, alt: 'y' });
  assert.equal(a.event.length <= 600, true); assert.equal(a.emotion, ''); assert.equal(a.intensity, 10); assert.deepEqual(a.responses, ['froze', 'cried']); assert.equal(a.after, 0); assert.equal(sanitizeAprt('x'), null);
  assert.equal(trapOf('I always ruin everything'), 'catastrophe'); assert.equal(trapOf('הם חושבים שאני טיפש'), 'mindread'); assert.equal(trapOf('it was fine'), '');
  const e = sanitizeEntry({ kind: 'aprt', aprt: { event: 'homework', interp: 'I will never finish', emotion: 'worry', intensity: 7 } }); assert.equal(e.kind, 'aprt'); assert.equal(e.aprt.emotion, 'worry');
  assert.equal(sanitizeEntry({ kind: 'note', aprt: { event: 'x' } }).aprt, null, 'only on aprt entries');
  const rec = (i, intensity, extra = {}) => ({ at: i, aprt: sanitizeAprt({ event: 'homework with mom', interp: 'I will never get it', emotion: 'worry', intensity, responses: ['avoided'], ...extra }) });
  assert.equal(analyze([rec(1, 8), rec(2, 7)]), null, 'needs 3');
  const r = analyze([rec(1, 8), rec(2, 7), rec(3, 5, { alt: 'one step', after: 3 }), rec(4, 4)]); assert.equal(r.n, 4); assert.equal(r.emotions[0].id, 'worry'); assert.equal(r.trend, 'easing'); assert.equal(r.traps[0].id, 'catastrophe'); assert.ok(r.events.some((x) => x.w === 'homework')); assert.equal(r.altShare, 25); assert.equal(r.responses[0].id, 'avoided');
});
test('APRT strings: every emotion, response and trap has both languages', () => {
  for (const id of EMOTION_IDS) assert.ok(STR.en[`em_${id}`] && STR.he[`em_${id}`], id); for (const id of RESPONSES) assert.ok(STR.en[`rs_${id}`] && STR.he[`rs_${id}`], id);
  for (const id of TRAP_IDS) assert.ok(STR.en[`trap_${id}`] && STR.he[`trapQ_${id}`], id);
});

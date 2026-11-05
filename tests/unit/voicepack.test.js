import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { phraseId, sanitizeManifest, clipFor } from '../../web/js/voicepack.js';

test('phrase ids are stable, language-aware and short', () => {
  assert.equal(phraseId('en', 'Breathe in'), phraseId('en', ' Breathe in ')); assert.notEqual(phraseId('en', 'Breathe in'), phraseId('he', 'Breathe in')); assert.match(phraseId('he', 'שאפו'), /^[a-z0-9]{1,8}$/);
});
test('manifest: untrusted input is reduced to safe file names and known fields', () => {
  const m = sanitizeManifest({ id: 'woman', lang: 'he', version: 3, clips: { abc12: 'abc12.opus', bad: '../../etc/passwd', 'x y': 'x.opus', ok2: 'ok2.mp3', evil: 'a.opus?x=1' } });
  assert.deepEqual(m.clips, { abc12: 'abc12.opus', ok2: 'ok2.mp3' }); assert.equal(m.id, 'woman'); assert.equal(sanitizeManifest({ id: '../x', lang: 'he', clips: {} }), null); assert.equal(sanitizeManifest({ id: 'a', lang: 'fr', clips: {} }), null); assert.equal(sanitizeManifest('x'), null);
});
test('clipFor: exact sentence only, right language only', () => {
  const man = sanitizeManifest({ id: 'woman', lang: 'en', clips: { [phraseId('en', 'Breathe in')]: 'a.opus' } });
  assert.equal(clipFor(man, 'en', 'Breathe in'), 'a.opus'); assert.equal(clipFor(man, 'en', 'Breathe out'), ''); assert.equal(clipFor(man, 'he', 'Breathe in'), ''); assert.equal(clipFor(null, 'en', 'x'), '');
});
test('the exported sentence list: unique ids, both languages, nothing with leftover placeholders', () => {
  const { phrases } = JSON.parse(readFileSync(new URL('../../voices/phrases.json', import.meta.url), 'utf8'));
  assert.ok(phrases.length > 1000); assert.equal(new Set(phrases.map((p) => `${p.lang}|${p.id}`)).size, phrases.length);
  assert.ok(phrases.every((p) => !/\{|\}/.test(p.text) && p.id === phraseId(p.lang, p.text))); assert.ok(phrases.some((p) => p.lang === 'he') && phrases.some((p) => p.lang === 'en'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseMascot, moodFor, MOOD_OF } from '../../web/js/mascot.js';
import { sanitizeAvatar, defaultAvatar, avatarEmoji, avatarFromMascot, shareableAvatar } from '../../web/js/avatar.js';

const raw = JSON.parse(readFileSync(new URL('../../web/data/mascot.json', import.meta.url), 'utf8'));
test('Sunny: the moods, the five faces and the cameos pass the strict allow-list and every animation / feeling maps to a mood', () => {
  const m = parseMascot(raw); assert.ok(m); assert.equal(Object.keys(m).length, 32); assert.ok(m['anim-loading']); for (const c of ['check', 'empty', 'error', 'offline', 'reminder']) assert.ok(m[`cameo-${c}`], c); for (let i = 1; i <= 5; i++) assert.ok(m[`feel-${i}`], `the face ${i} of how do I feel`);
  for (const [k, v] of Object.entries(MOOD_OF)) assert.ok(m[v], `${k} -> ${v}`);
  assert.equal(moodFor('__proto__'), 'idle'); assert.equal(moodFor('wave'), 'wave');
  assert.equal(parseMascot({ format: 'sonrise-mascot', version: 1, moods: { idle: '<svg>' } }), null);
});
test('the default avatar is Sunny; she is valid, shareable, has an emoji stand-in; the old default fox mascot becomes Sunny', () => {
  assert.deepEqual(defaultAvatar(), { k: 'sunny' }); assert.deepEqual(sanitizeAvatar({ k: 'sunny', junk: 1 }), { k: 'sunny' });
  assert.equal(avatarEmoji({ k: 'sunny' }), '🌞'); assert.deepEqual(shareableAvatar({ k: 'sunny' }), { k: 'sunny' });
  assert.deepEqual(avatarFromMascot('🦊'), { k: 'sunny' }); assert.equal(avatarFromMascot('🐼').k, 'char');
  assert.deepEqual(sanitizeAvatar({ k: 'char', id: 'fox', color: '#ef4444' }), { k: 'char', id: 'fox', color: '#ef4444' }, 'a chosen fox is left alone');
});

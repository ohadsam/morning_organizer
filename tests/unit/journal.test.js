import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../../web/js/journal.js';
import { db } from '../../web/js/db.js';

const Q = [{ q: 'pet', a: 'Zebraphant42' }, { q: 'street', a: 'Quixotic Lane 9' }];
const raw = async (pid) => (await db.all('journal')).filter((r) => r.profileId === pid);

test('plain journal: add, list, remove, isolation per profile', async () => {
  const id = await J.addEntry('p1', { kind: 'note', text: 'hello' });
  await J.addEntry('p2', { kind: 'note', text: 'other' });
  const l = await J.listEntries('p1');
  assert.equal(l.length, 1); assert.equal(l[0].text, 'hello'); assert.equal(l[0].locked, false);
  await J.removeEntry(id);
  assert.equal((await J.listEntries('p1')).length, 0);
  assert.equal((await J.listEntries('p2')).length, 1);
});

test('sanitizeEntry neutralizes hostile input', () => {
  const e = J.sanitizeEntry({ kind: '__proto__', text: 'x'.repeat(9999), mood: 99, items: ['a', 'b', 'c', 'd'], thought: { intensity: 1e9 }, audio: { id: 5, mime: 'text/html' } });
  assert.equal(e.kind, 'note'); assert.ok(e.text.length <= 4000); assert.equal(e.items.length, 3);
  assert.equal(e.thought.intensity, 10); assert.equal(e.audio, null);
  assert.equal(J.sanitizeEntry({ audio: { id: 'a', mime: 'text/html', sec: 9999 } }).audio.mime, 'audio/webm');
  assert.equal(J.sanitizeEntry({ audio: { id: 'a', sec: 9999 } }).audio.sec, 180);
});

test('lock: entries encrypted at rest, add while locked, unlock reads, throttle', async () => {
  const p = 'lk';
  await J.addEntry(p, { text: 'secret-before' });
  await J.enableLock(p, { password: 'hunter22', questions: Q });
  assert.ok((await raw(p)).every((r) => r.enc && !r.data));
  assert.ok(!JSON.stringify(await raw(p)).includes('secret-before'));
  J.lockNow(p);
  assert.equal(await J.isUnlocked(p), false);
  await J.addEntry(p, { text: 'added-while-locked' });
  assert.ok((await J.listEntries(p)).every((e) => e.locked && e.text === undefined));
  assert.equal((await J.unlock(p, 'nope')).ok, false);
  assert.equal((await J.unlock(p, 'hunter22')).ok, true);
  const texts = (await J.listEntries(p)).map((e) => e.text).sort();
  assert.deepEqual(texts, ['added-while-locked', 'secret-before']);
  J.lockNow(p);
  for (let i = 0; i < 4; i++) await J.unlock(p, 'bad');
  const r = await J.unlock(p, 'hunter22');
  assert.equal(r.ok, false); assert.ok(r.waitMs > 0);
});

test('lock: voice note round trip plain and locked, remove while locked cleans audio', async () => {
  const p = 'au', blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm;codecs=opus' });
  await J.addEntry(p, { kind: 'voice', audio: { sec: 3 } }, blob);
  let e = (await J.listEntries(p))[0];
  assert.equal(e.audio.mime, 'audio/webm'); assert.ok(await J.audioUrl(p, e.audio));
  await J.enableLock(p, { password: 'pass1234', questions: Q });
  assert.ok((await db.all('audio')).every((a) => a.enc && !a.blob));
  e = (await J.listEntries(p))[0]; assert.ok(await J.audioUrl(p, e.audio));
  J.lockNow(p);
  assert.equal(await J.audioUrl(p, e.audio), null);
  const id = (await raw(p))[0].id;
  await J.removeEntry(id);
  assert.equal((await db.all('audio')).filter((a) => a.profileId === p).length, 0);
  await assert.rejects(J.addEntry(p, {}, { size: 7e6, type: 'audio/webm' }), /audio-too-big/);
});

test('reset by answers, change password, disable lock, erase', async () => {
  const p = 'rs';
  await J.enableLock(p, { password: 'first-pass', questions: Q });
  await J.addEntry(p, { text: 'keep me' });
  J.lockNow(p);
  assert.deepEqual((await J.lockQuestions(p)).map((q) => q.q ?? q), ['pet', 'street']);
  assert.equal((await J.unlockWithAnswers(p, ['wrong', 'wrong'])).ok, false);
  assert.equal(await J.changePassword(p, { answers: ['zebraphant42', 'quixotic lane 9'] }, 'second-pass'), true);
  J.lockNow(p);
  assert.equal((await J.unlock(p, 'first-pass')).ok, false);
  await db.put('kv', { fails: 0, until: 0 }, `lockmeta:${p}`);
  assert.equal((await J.unlock(p, 'second-pass')).ok, true);
  assert.equal((await J.listEntries(p))[0].text, 'keep me');
  assert.equal(await J.disableLock(p, { password: 'second-pass' }), true);
  assert.ok((await raw(p)).every((r) => r.data)); assert.equal(await J.getLock(p), null);
  await J.enableLock(p, { password: 'third-pass', questions: Q });
  await J.eraseJournal(p);
  assert.equal((await raw(p)).length, 0); assert.equal(await J.getLock(p), null);
});

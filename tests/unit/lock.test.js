import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, hashPassword, verifyPassword, createLock, openWithPassword, openWithAnswers, changePassword, encryptJson, decryptJson, encryptFor, decryptWith, waitAfterFails, PBKDF2_ITERATIONS } from '../../web/js/lock.js';

const QS = [{ q: 'First pet?', a: ' Zebraphant42 ' }, { q: 'Street?', a: 'Ha-Nevi\'im 7' }];
let lock;

test('answers are normalised: case, spaces, punctuation and Hebrew niqqud are ignored', () => {
  assert.equal(normalizeAnswer(' Rex!! '), 'rex'); assert.equal(normalizeAnswer("Ha-Nevi'im 7"), 'hanevi7'.replace('7', 'im7').replace('hanevi', 'hanevi')); assert.equal(normalizeAnswer('תֵּל אָבִיב'), 'תלאביב'); assert.equal(normalizeAnswer('Éclair'), 'eclair'); assert.equal(normalizeAnswer(null), '');
});
test('password hashing is salted and verifies; the password itself is never in the record', async () => {
  const a = await hashPassword('correct horse'), b = await hashPassword('correct horse');
  assert.notEqual(a.salt, b.salt, 'random salt'); assert.notEqual(a.hash, b.hash, 'same password, different salt => different hash'); assert.equal(a.iters, PBKDF2_ITERATIONS); assert.ok(PBKDF2_ITERATIONS >= 200_000);
  assert.ok(await verifyPassword('correct horse', a)); assert.ok(!(await verifyPassword('correct horsf', a))); assert.ok(!(await verifyPassword('', a))); assert.ok(!(await verifyPassword('x', { salt: '!!', iters: 1, hash: '' })), 'garbage record is simply "no"');
  assert.ok(!JSON.stringify(a).includes('correct horse'));
});
test('createLock validates input and stores no secrets', async () => {
  await assert.rejects(() => createLock({ password: 'abc', questions: QS }), /weak-password/); await assert.rejects(() => createLock({ password: 'abcd', questions: [QS[0]] }), /need-questions/);
  await assert.rejects(() => createLock({ password: 'abcd', questions: [QS[0], { q: 'x', a: '!' }] }), /need-questions/, 'an answer that normalises to nothing does not count');
  lock = await createLock({ password: 'p@ss-word', questions: QS });
  const dump = JSON.stringify(lock); for (const secret of ['p@ss-word', 'Zebraphant42', 'zebraphant42', 'hanevi']) assert.ok(!dump.includes(secret), `leaks ${secret}`);
  assert.deepEqual(lock.questions, ['First pet?', 'Street?']); assert.ok(lock.pub && lock.privByPw.ct && lock.privByAnswers.ct && lock.pw.hash);
});
test('write without the password, read only with the password OR the answers', async () => {
  const entry = { text: 'שלום, זה סוד 🤫', mood: 4, at: 123 }, enc = await encryptJson(lock, entry);   // no key needed to WRITE
  assert.ok(!JSON.stringify(enc).includes('סוד')); assert.ok(enc.k && enc.iv && enc.ct);
  assert.equal(await openWithPassword(lock, 'wrong'), null); assert.equal(await openWithPassword(lock, 'p@ss-word '), null); assert.equal(await openWithAnswers(lock, ['zebraphant42', 'nope']), null);
  const viaPw = await openWithPassword(lock, 'p@ss-word'); assert.ok(viaPw); assert.deepEqual(await decryptJson(viaPw, enc), entry);
  const viaQa = await openWithAnswers(lock, ['ZEBRAPHANT42', "ha nevi'im 7"]); assert.ok(viaQa, 'forgiving answers'); assert.deepEqual(await decryptJson(viaQa, enc), entry);
  assert.equal(await openWithAnswers(lock, ['zebraphant42']), null, 'answers must be complete'); assert.equal(await openWithAnswers(lock, ['Street?', 'zebraphant42']), null, 'and in order');
});
test('tampered or foreign ciphertext cannot be read; every entry has its own key', async () => {
  const k = await openWithPassword(lock, 'p@ss-word'), a = await encryptJson(lock, { x: 1 }), b = await encryptJson(lock, { x: 1 });
  assert.notEqual(a.k, b.k); assert.notEqual(a.ct, b.ct); await assert.rejects(() => decryptJson(k, { ...a, ct: a.ct.slice(0, -4) + (a.ct.endsWith('AAAA') ? 'BBBB' : 'AAAA') })); await assert.rejects(() => decryptJson(k, { ...a, k: b.k }));
  const other = await createLock({ password: 'other-pass', questions: QS }); const ko = await openWithPassword(other, 'other-pass'); await assert.rejects(() => decryptJson(ko, a), 'a different lock cannot read it');
  const bytes = new Uint8Array(300_000).map((_, i) => i % 251), big = await encryptFor(lock, bytes); assert.deepEqual(await decryptWith(k, big), bytes, 'audio-sized payloads round-trip');
});
test('password change: with the old password, or by the questions after forgetting; old password stops working; old entries still readable', async () => {
  const enc = await encryptJson(lock, { text: 'keep me' });
  assert.equal(await changePassword(lock, { oldPassword: 'WRONG' }, 'brand-new'), null); assert.equal(await changePassword(lock, { answers: ['x', 'y'] }, 'brand-new'), null); await assert.rejects(() => changePassword(lock, { oldPassword: 'p@ss-word' }, '123'), /weak-password/);
  const l2 = await changePassword(lock, { oldPassword: 'p@ss-word' }, 'brand-new'); assert.equal(await openWithPassword(l2, 'p@ss-word'), null); const k2 = await openWithPassword(l2, 'brand-new'); assert.deepEqual(await decryptJson(k2, enc), { text: 'keep me' });
  const l3 = await changePassword(l2, { answers: ['zebraphant42', 'hanevi im 7'] }, 'after-reset'); assert.ok(l3, 'reset by answers works'); assert.ok(await openWithPassword(l3, 'after-reset')); assert.equal(await openWithPassword(l3, 'brand-new'), null);
  assert.notEqual(l3.pw.salt, l2.pw.salt, 'a new salt for every new password'); assert.deepEqual(await decryptJson(await openWithAnswers(l3, ['zebraphant42', 'hanevi im 7']), enc), { text: 'keep me' }, 'the question answers keep working');
});
test('throttle: three free tries, then growing waits capped at 15 minutes', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 20].map(waitAfterFails), [0, 0, 0, 30_000, 60_000, 120_000, 900_000]);
});

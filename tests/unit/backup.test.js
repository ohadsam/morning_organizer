import test from 'node:test';
import assert from 'node:assert/strict';
import { packBackup, readBackupText, looksLikeBackup } from '../../web/js/share.js';
import * as S from '../../web/js/store.js';

const backup = (over = {}) => JSON.stringify({ app: 'morning-organizer', v: 1, settings: { lang: 'en', personName: 'Dana', age: 9, gender: 'female', evil: 'x', mode: 'rm -rf' }, runs: [], templates: [], ...over });
const tpl = (id, name, updatedAt) => ({ id, name, icon: '🎒', color: '#0984e3', favorite: false, builtin: false, createdAt: 1, updatedAt, tasks: [{ id: id + 't', name: 'a', sec: 60, est: 0 }], alarm: {} });

test('sync code round trip (compressed) and plain JSON both read back; code embedded in text is found', async () => {
  const json = backup({ templates: [tpl('a', 'שגרה', 5)] });
  const code = await packBackup(json); assert.match(code, /^MB1\./); assert.ok(code.length < json.length);
  assert.equal(await readBackupText(code), json); assert.equal(await readBackupText(`here you go:\n${code}\nthanks`), json); assert.equal(await readBackupText(json), json);
  assert.ok(looksLikeBackup(`x ${code}`)); assert.ok(!looksLikeBackup('M1.abcdefghijklmnopqrstuvwxyz'));
});
test('backup reader rejects garbage and bombs', async () => {
  await assert.rejects(async () => S.importBackup(await readBackupText('MB1.AAAA')));
  const { deflateRawSync } = await import('node:zlib');
  await assert.rejects(() => readBackupText('MB1.' + deflateRawSync(Buffer.alloc(40 * 1024 * 1024, 32)).toString('base64url')), /too-big/);
});
test('sanitizeSettings whitelists keys, types and enums', () => {
  const s = S.sanitizeSettings({ lang: 'fr', theme: 'dark', mode: 'beep', volume: 1e9, personName: 'x'.repeat(999), age: '8', evil: 1, seeded: true, keepAwake: 'yes', autoAdvance: true });
  assert.equal(s.lang, undefined); assert.equal(s.theme, 'dark'); assert.equal(s.mode, 'beep'); assert.equal(s.volume, 86400); assert.equal(s.personName.length, 200);
  assert.equal(s.age, '8'); assert.equal(s.evil, undefined); assert.equal(s.seeded, undefined); assert.equal(s.keepAwake, undefined); assert.equal(s.autoAdvance, true);
  assert.deepEqual(S.sanitizeSettings(null), {});
});
test('importBackup merge keeps the newest, adds missing, ignores bad shapes; replace mirrors exactly', async () => {
  await S.init();
  await S.saveTemplate(tpl('keep', 'local newer', 100), { touch: false }); await S.saveTemplate(tpl('old', 'local older', 10), { touch: false }); await S.saveTemplate(tpl('only-local', 'mine', 50), { touch: false });
  const r = await S.importBackup(backup({ templates: [tpl('keep', 'remote older', 50), tpl('old', 'remote newer', 99), tpl('new', 'remote new', 1), null, 'x'] }));
  assert.deepEqual([r.added, r.updated, r.skipped], [1, 1, 1]);
  assert.equal(S.getTemplate('keep').name, 'local newer'); assert.equal(S.getTemplate('old').name, 'remote newer'); assert.equal(S.getTemplate('old').updatedAt, 99, 'stamp preserved');
  assert.ok(S.getTemplate('new')); assert.ok(S.getTemplate('only-local'), 'merge never deletes');
  const s = S.get().settings; assert.equal(s.personName, 'Dana'); assert.equal(s.age, 9); assert.equal(s.gender, 'female'); assert.equal(s.mode, 'both', 'invalid enum ignored'); assert.equal(s.evil, undefined);
  const r2 = await S.importBackup(backup({ templates: [tpl('x1', 'only', 1)] }), { mode: 'replace', settings: false });
  assert.equal(r2.added, 1); assert.deepEqual(S.get().templates.map((x) => x.id), ['x1']);
  await assert.rejects(() => S.importBackup('{"app":"other"}')); await assert.rejects(() => S.importBackup('nope'));
});

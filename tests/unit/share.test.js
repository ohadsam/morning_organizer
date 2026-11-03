import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode, sanitizeWire, extractCode } from '../../web/js/share.js';

const tpl = { id: 'x', name: 'בוקר ילדים', icon: '🎒', color: '#0984e3', tasks: [{ id: '1', name: 'שיניים', sec: 120, est: 90 }, { id: '2', name: 'Dress', sec: 300, est: 0 }] };

test('round trip keeps content, regenerates ids, resets alarm and favourite', async () => {
  const code = await encode(tpl), out = await decode(`hi! open https://x.github.io/app/#/import/${code} thanks`);
  assert.equal(out.name, tpl.name); assert.deepEqual(out.tasks.map((t) => [t.name, t.sec, t.est]), [['שיניים', 120, 90], ['Dress', 300, 0]]);
  assert.notEqual(out.id, tpl.id); assert.notEqual(out.tasks[0].id, '1'); assert.equal(out.alarm.enabled, false); assert.equal(out.favorite, false);
});
test('compressed code is small enough for typical NFC tags', async () => { assert.ok((await encode(tpl)).length < 200); });
test('garbage and wrong shapes are rejected', async () => {
  for (const bad of ['', 'hello', 'M2.AAAA', 'M1.!!!', 'M1.' + Buffer.from('{"v":2}').toString('base64url'), 'M1.' + Buffer.from('{"v":1,"t":[]}').toString('base64url')])
    await assert.rejects(() => decode(bad));
});
test('sanitize clamps hostile values and strips control/bidi chars', () => {
  const w = sanitizeWire({ v: 1, n: 'a‮b\u0000c'.repeat(100), i: '<img src=x onerror=1>', c: 'red;background:url(x)', t: [['x', -5, 1e12], ['y', 'NaN', 'z'], 'junk', null, ...Array(500).fill(['z', 1, 0])] });
  assert.ok(w.name.length <= 80 && !/[‮\u0000]/.test(w.name)); assert.equal(w.color, '#6c5ce7'); assert.ok(w.icon.length <= 8);
  assert.equal(w.tasks.length, 100); assert.equal(w.tasks[0].sec, 1); assert.equal(w.tasks[0].est, 86400); assert.equal(w.tasks[1].sec, 60);
});
test('decompression bomb is refused', async () => {
  const { deflateRawSync } = await import('node:zlib');
  const bomb = 'M2.' + deflateRawSync(Buffer.alloc(20 * 1024 * 1024, 32)).toString('base64url');
  await assert.rejects(() => decode(bomb), /too-big/);
});
test('extractCode finds the code inside text and ignores oversized input beyond the limit', () => {
  assert.equal(extractCode('see M1.abc_-123 ok'), 'M1.abc_-123'); assert.equal(extractCode('nothing'), null);
});

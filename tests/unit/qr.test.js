import test from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import { makeQr, qrFits } from '../../web/js/qr.js';

// Render the matrix like a camera would see it (scaled, with a quiet zone) and decode it with an INDEPENDENT decoder.
function decode(qr, scale = 4, quiet = 4) {
  const n = (qr.size + quiet * 2) * scale, px = new Uint8ClampedArray(n * n * 4).fill(255);
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.modules[y][x]) for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) { const i = (((y + quiet) * scale + dy) * n + (x + quiet) * scale + dx) * 4; px[i] = px[i + 1] = px[i + 2] = 0; }
  return jsQR(px, n, n)?.data;
}
const sample = (len) => { let s = ''; for (let i = 0; s.length < len; i++) s += String.fromCharCode(33 + ((i * 7 + (i >> 3)) % 90)); return s.slice(0, len); };

test('QR codes of many sizes decode back to the exact text (versions 1..~35, both ECC levels)', () => {
  const versions = new Set();
  for (const len of [1, 7, 20, 60, 120, 200, 332, 400, 700, 1000, 1500, 2000, 2400, 2800]) {
    const text = sample(len), qr = makeQr(text); versions.add(qr.version);
    assert.equal(qr.size, qr.version * 4 + 17); assert.equal(decode(qr), text, `length ${len} (version ${qr.version}, mask ${qr.mask})`);
  }
  assert.ok(versions.size >= 10 && Math.max(...versions) >= 30, `covered versions: ${[...versions].sort((a, b) => a - b)}`);
});
test('Hebrew / emoji / invitation-like and message-like strings round-trip', () => {
  for (const text of ['MP1.' + 'AbC-_9'.repeat(40), 'ML1.9SffX-5qJhTa.' + 'x'.repeat(300), 'שלום, מארגן בוקר 🎒☀️', '']) if (text) assert.equal(decode(makeQr(text)), text);
});
test('too long input throws and qrFits says so', () => { assert.equal(qrFits('x'.repeat(2900)), true); assert.equal(qrFits('x'.repeat(3000)), false); assert.throws(() => makeQr('x'.repeat(4000)), /qr-too-long/); });
test('finder patterns are where they should be (3 corners, 7x7)', () => {
  const q = makeQr('hello'), s = q.size, dark = (x, y) => q.modules[y][x];
  for (const [ox, oy] of [[0, 0], [s - 7, 0], [0, s - 7]]) { assert.ok(dark(ox, oy) && dark(ox + 6, oy + 6) && dark(ox + 3, oy + 3)); assert.ok(!dark(ox + 1, oy + 1) && !dark(ox + 5, oy + 5)); }
  assert.ok(dark(8, s - 8), 'the always-dark module');
});

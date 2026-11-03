// Parent <-> child link protocol (no server). Everything between two phones is an authenticated, encrypted envelope:
//   ML1.<linkId>.<base64url( zflag | iv | AES-GCM( deflate(json) ) )>        key = 128-bit secret shared once via the invitation
// Envelopes are plain text, so ANY channel can carry them: NFC tag, Bluetooth, Nearby Share, a messenger, copy/paste, or a live
// WebRTC / Bluetooth socket. Tampering fails the GCM tag; replays are rejected by a sliding window of seen sequence numbers.
import { b64u, unb64u, pipe, inflateBounded } from './share.js';
import { cleanText } from './util.js';

const te = new TextEncoder(), td = new TextDecoder('utf-8', { fatal: true });
const subtle = () => globalThis.crypto.subtle;
const MAX_SEALED = 256 * 1024, MAX_PLAIN = 1024 * 1024, WINDOW = 500;
export const B64 = /^[A-Za-z0-9_-]+$/;

export const randomId = (bytes = 9) => b64u(globalThis.crypto.getRandomValues(new Uint8Array(bytes)));
export const newKey = () => b64u(globalThis.crypto.getRandomValues(new Uint8Array(16)));
const aesKey = (k, usage) => subtle().importKey('raw', unb64u(k), 'AES-GCM', false, usage);

export async function seal(key, obj) {
  const raw = te.encode(JSON.stringify(obj));
  let z = 0, body = raw;
  if (typeof CompressionStream === 'function') { try { body = await pipe(raw, new CompressionStream('deflate-raw')); z = 1; } catch { body = raw; z = 0; } }
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: new Uint8Array([z]) }, await aesKey(key, ['encrypt']), body));
  const out = new Uint8Array(13 + ct.length); out[0] = z; out.set(iv, 1); out.set(ct, 13);
  return b64u(out);
}
export async function open(key, sealed) {
  if (!B64.test(sealed) || sealed.length > MAX_SEALED) throw new Error('bad-envelope');
  const bytes = unb64u(sealed); if (bytes.length < 30) throw new Error('bad-envelope');
  const z = bytes[0];
  let pt = new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: bytes.slice(1, 13), additionalData: new Uint8Array([z]) }, await aesKey(key, ['decrypt']), bytes.slice(13)));
  if (z === 1) pt = await inflateBounded(pt, MAX_PLAIN);
  return JSON.parse(td.decode(pt));
}

export function parseEnvelope(text) {
  const m = /ML1\.([A-Za-z0-9_-]{6,24})\.([A-Za-z0-9_-]+)/.exec(String(text ?? '').slice(0, MAX_SEALED + 64));
  return m ? { linkId: m[1], sealed: m[2] } : null;
}
export const looksLikeEnvelope = (text) => !!parseEnvelope(text);

/** link = { id, key, seqOut, seen: number[] } - mutated (seqOut / seen); the caller persists it. */
export async function makeEnvelope(link, type, payload) {
  link.seqOut = (link.seqOut || 0) + 1;
  return `ML1.${link.id}.${await seal(link.key, { t: type, n: link.seqOut, ts: Date.now(), p: payload })}`;
}
/** -> { t, n, ts, p } or throws. Rejects replays and unknown shapes. */
export async function readEnvelope(link, text) {
  const e = parseEnvelope(text); if (!e || e.linkId !== link.id) throw new Error('wrong-link');
  const msg = await open(link.key, e.sealed);
  if (!msg || typeof msg.t !== 'string' || msg.t.length > 24 || !Number.isInteger(msg.n) || msg.n < 1) throw new Error('bad-message');
  link.seen ||= [];
  const max = link.seen.length ? Math.max(...link.seen) : 0;
  if (link.seen.includes(msg.n) || msg.n <= max - WINDOW) throw new Error('replay');
  link.seen.push(msg.n); if (link.seen.length > WINDOW) link.seen = link.seen.slice(-WINDOW);
  return msg;
}

// ── invitation: MP1.<b64u(deflate(json))>  (carries the key: hand it over privately; single-use, parent approves the join) ──
export async function packInvite({ inviteId, linkId, key, parentName, offer }) {
  const json = te.encode(JSON.stringify({ v: 1, i: inviteId, l: linkId, k: key, pn: cleanText(parentName, 30), ...(offer ? { o: offer } : {}) }));
  let z = 'MP0.', body = json;
  if (typeof CompressionStream === 'function') { try { body = await pipe(json, new CompressionStream('deflate-raw')); z = 'MP1.'; } catch { /* plain */ } }
  return z + b64u(body);
}
export async function readInvite(text) {
  const m = /MP[01]\.([A-Za-z0-9_-]+)/.exec(String(text ?? '').slice(0, 64 * 1024)); if (!m) throw new Error('no-invite');
  let bytes = unb64u(m[1]); if (m[0].startsWith('MP1.')) bytes = await inflateBounded(bytes, 64 * 1024);
  const o = JSON.parse(td.decode(bytes));
  if (o?.v !== 1 || !B64.test(o.i || '') || !/^[A-Za-z0-9_-]{6,24}$/.test(o.l || '') || !/^[A-Za-z0-9_-]{22}$/.test(o.k || '')) throw new Error('bad-invite');
  const offer = typeof o.o === 'string' && o.o.length <= 8000 && o.o.startsWith('v=0') ? o.o : '';
  return { inviteId: o.i, linkId: o.l, key: o.k, parentName: cleanText(o.pn, 30), offer };
}
export const looksLikeInvite = (text) => /MP[01]\.[A-Za-z0-9_-]{30,}/.test(String(text ?? '').slice(0, 64 * 1024));

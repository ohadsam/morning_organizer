// Serialise / validate templates for sharing (file, link, text, NFC). No server involved.
// Everything arriving here is untrusted: it is re-built field by field, clamped and re-id'd - never merged as-is.
import { LIMITS, PAGES_URL } from './config.js';
import { cleanText, uid } from './util.js';

const PREFIX_RAW = 'M1.', PREFIX_DEFLATE = 'M2.';
const MIME = 'application/vnd.morningorganizer+json';
export const NFC_MIME = MIME;

const b64u = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (str) => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };

async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** The minimal, id-free wire format. */
export function toWire(tpl) {
  return { v: 1, n: tpl.name, i: tpl.icon, c: tpl.color, t: tpl.tasks.map((t) => [t.name, t.sec, t.est || 0]) };
}

export async function encode(tpl) {
  const json = new TextEncoder().encode(JSON.stringify(toWire(tpl)));
  if (typeof CompressionStream === 'function') {
    try { return PREFIX_DEFLATE + b64u(await pipe(json, new CompressionStream('deflate-raw'))); } catch { /* fall through */ }
  }
  return PREFIX_RAW + b64u(json);
}

/** Pull a code out of whatever the user pasted: bare code, a share link (#import=...) or a longer message. */
export function extractCode(text) {
  const m = String(text ?? '').slice(0, LIMITS.maxShareChars).match(/M[12]\.[A-Za-z0-9_-]+/);
  return m ? m[0] : null;
}

export async function decode(text) {
  const code = extractCode(text);
  if (!code) throw new Error('no-code');
  let bytes = unb64u(code.slice(3));
  if (code.startsWith(PREFIX_DEFLATE)) {
    if (typeof DecompressionStream !== 'function') throw new Error('unsupported');
    // Bound the inflated size: a tiny crafted payload must not be able to balloon in memory (zip bomb).
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = []; let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > LIMITS.maxShareChars * 4) { await reader.cancel(); throw new Error('too-big'); }
      chunks.push(value);
    }
    bytes = new Uint8Array(total); let o = 0; for (const c of chunks) { bytes.set(c, o); o += c.length; }
  }
  let w;
  try { w = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new Error('bad-data'); }
  return sanitizeWire(w);
}

export function sanitizeWire(w) {
  if (!w || w.v !== 1 || !Array.isArray(w.t)) throw new Error('bad-data');
  const tasks = w.t.slice(0, LIMITS.maxTasks).map((r) => {
    const a = Array.isArray(r) ? r : [];
    const sec = Math.round(Number(a[1]));
    const est = Math.round(Number(a[2]));
    return {
      id: uid(), name: cleanText(a[0], LIMITS.maxName) || '?',
      sec: Number.isFinite(sec) ? Math.min(Math.max(sec, 1), LIMITS.maxTaskSec) : 60,
      est: Number.isFinite(est) && est > 0 ? Math.min(est, LIMITS.maxTaskSec) : 0,
    };
  });
  if (!tasks.length) throw new Error('bad-data');
  return {
    id: uid(), name: cleanText(w.n, LIMITS.maxName) || '?', icon: cleanText(w.i, 8) || '⏰',
    color: /^#[0-9a-fA-F]{6}$/.test(w.c) ? w.c : '#6c5ce7', favorite: false, builtin: false,
    tasks, alarm: { enabled: false, time: '07:00', days: [0, 1, 2, 3, 4], volume: 80, vibrate: true, durationSec: 30 },
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

export const shareLink = (code) => `${PAGES_URL}#/import/${code}`;

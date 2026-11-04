// "Learn from what the person turned down" (pure): when a suggested extra step or time is left unticked, remember it; after two refusals it is not suggested again.
// Accepting one clears its count. Stored on this device only; whatever is read back is untrusted and sanitised.
const KINDS = ['steps', 'times'], MAX = 200;
export const emptyRej = () => ({ steps: {}, times: {} });
export function sanitizeRej(raw) {
  const out = emptyRej(); if (!raw || typeof raw !== 'object') return out;
  for (const k of KINDS) { const src = raw[k]; if (!src || typeof src !== 'object') continue; for (const [key, n] of Object.entries(src).slice(0, MAX)) if (typeof key === 'string' && key.length <= 80 && Number.isInteger(n) && n > 0 && n < 100) out[k][key] = n; }
  return out;
}
export function reject(state, kind, keys) {
  const s = sanitizeRej(state); if (!KINDS.includes(kind)) return s;
  for (const key of keys) if (typeof key === 'string' && key && key.length <= 80) s[kind][key] = Math.min(99, (s[kind][key] || 0) + 1);
  return s;
}
export function accept(state, kind, keys) { const s = sanitizeRej(state); if (!KINDS.includes(kind)) return s; for (const key of keys) delete s[kind][key]; return s; }
/** The keys turned down at least `limit` times. */
export const rejectedSet = (state, kind, limit = 2) => new Set(KINDS.includes(kind) ? Object.entries(sanitizeRej(state)[kind]).filter(([, n]) => n >= limit).map(([k]) => k) : []);

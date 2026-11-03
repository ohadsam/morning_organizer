// Small dependency-free helpers shared by every module.
export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Returns a copy of `arr` with the item at `from` moved to `to` (drag & drop reorder). */
export function move(arr, from, to) {
  if (from === to || from < 0 || from >= arr.length) return arr.slice();
  const out = arr.slice();
  const [item] = out.splice(from, 1);
  out.splice(clamp(to, 0, out.length), 0, item);
  return out;
}

/** 330 -> "5:30", 3725 -> "1:02:05". Negative values keep their sign. */
export function fmtDur(sec) {
  const neg = sec < 0; let s = Math.round(Math.abs(sec));
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const p = (n) => String(n).padStart(2, '0');
  return (neg ? '-' : '') + (h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`);
}

/** Compact human duration for summaries: 3725 -> "1h 2m", 330 -> "5m 30s". Units come from i18n. */
export function fmtHuman(sec, u = { h: 'h', m: 'm', s: 's' }) {
  const neg = sec < 0; let s = Math.round(Math.abs(sec));
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const parts = [];
  if (h) parts.push(`${h}${u.h}`);
  if (m) parts.push(`${m}${u.m}`);
  if (s || !parts.length) parts.push(`${s}${u.s}`);
  return (neg ? '-' : '') + parts.join(' ');
}

export function debounce(fn, ms) {
  let id; const d = (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(id); fn(...a); };
  return d;
}

/** Strip control chars and clamp length: every user-visible string goes through this on import. */
export function cleanText(v, max) {
  return String(v ?? '').replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g, '').trim().slice(0, max);
}

/** Tiny DOM builder. Text children are ALWAYS text nodes - never raw HTML - so user data can't inject markup. */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style') for (const [p, val] of Object.entries(v)) el.style.setProperty(p, val);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k in el && k !== 'list' && typeof v !== 'object') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

/** Like el.replaceChildren(...kids) but drops null/false (replaceChildren would render them as the text "null"). */
export function setChildren(el, ...kids) { el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false)); }

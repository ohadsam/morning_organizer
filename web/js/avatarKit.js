// The avatar kit (pure): a layered "paper-doll" avatar built from parts (face, hair, eyes, mouth, clothes, a little companion...) that the person
// mixes and colours, and that can be animated by swapping a few part variants. The parts come from data/avatar-pack.json (original art).
// Everything read from the pack, from storage, from a backup or from a shared code is untrusted: the SVG goes through a strict allow-list
// (checkSvg), a saved avatar is only ever a few ids and colours (sanitizeKit), a share code is a short text (encodeKit / decodeKit).
import { clamp, cleanText, uid } from './util.js';

/** Stack order, back to front. 'slot:variant' = which variant of the slot is drawn there (hair has a back and a front, accessory too). */
export const LAYERS = ['backdrop', 'hair:back', 'accessory:back', 'body', 'outfit', 'arms', 'head', 'cheeks', 'eyes', 'brows', 'nose', 'mouth', 'facial_hair', 'hair:front', 'glasses', 'headwear', 'accessory:front', 'companion', 'effects'];
/** The slots a person chooses (the others - body, arms, effects - are fixed). */
export const PICK_SLOTS = ['head', 'cheeks', 'nose', 'hair', 'facial_hair', 'eyes', 'brows', 'mouth', 'outfit', 'accessory', 'glasses', 'headwear', 'companion', 'backdrop'];
export const COLOR_KEYS = ['skin', 'hair', 'cloth', 'cloth2', 'accent', 'eye'];
/** Which palette of the pack each colour is picked from. */
export const PALETTE_OF = { skin: 'skin', hair: 'hair', cloth: 'cloth', cloth2: 'cloth', accent: 'accent', eye: 'eye' };
export const DEFAULT_COLORS = { skin: '#E8B48A', hair: '#4A2E1B', cloth: '#6C5CE7', cloth2: '#FDCB6E', accent: '#00B894', eye: '#6A4A2F' };
export const DEFAULT_PARTS = { head: 'round', cheeks: 'blush', nose: 'dot', hair: 'short-curly', facial_hair: 'none', eyes: 'dot', brows: 'soft', mouth: 'simple', outfit: 't-shirt', accessory: 'none', glasses: 'none', headwear: 'none', companion: 'none', backdrop: 'plain-circle' };
/** The tabs of the studio: a few slots each, so there are never many things on one screen. */
export const TABS = [['face', ['head', 'cheeks', 'nose']], ['hair', ['hair', 'facial_hair']], ['eyes', ['eyes', 'brows', 'mouth']], ['clothes', ['outfit', 'accessory']], ['extras', ['glasses', 'headwear']], ['buddy', ['companion', 'backdrop']]];

const HEX = /^#[0-9a-fA-F]{6}$/, ID = /^[a-z0-9-]{1,40}$/;
export const MAX_LIB = 40;

/** What the person has chosen -> { k: 'kit', p: { slot: id }, c: { colour: '#RRGGBB' } }, complete and clean. */
export function sanitizeKit(a) {
  const p = a && typeof a.p === 'object' && a.p ? a.p : {}, c = a && typeof a.c === 'object' && a.c ? a.c : {};
  const parts = {}, colors = {};
  for (const s of PICK_SLOTS) parts[s] = Object.hasOwn(p, s) && typeof p[s] === 'string' && ID.test(p[s]) ? p[s] : DEFAULT_PARTS[s];
  for (const k of COLOR_KEYS) colors[k] = Object.hasOwn(c, k) && typeof c[k] === 'string' && HEX.test(c[k]) ? c[k].toUpperCase() : DEFAULT_COLORS[k];
  return { k: 'kit', p: parts, c: colors };
}
export const defaultKit = () => sanitizeKit({});
export const isKit = (a) => !!a && a.k === 'kit';

// ── the pack ──
const EL = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'defs', 'clipPath', 'linearGradient', 'radialGradient', 'stop']);
const AT = new Set(['xmlns', 'viewBox', 'width', 'height', 'id', 'class', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'transform', 'clip-path', 'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform']);
export const MAX_PART = 8000;
/** Strict check of one part: only known elements and attributes, only local url(#id) references, well-formed nesting, not too big. */
export const checkSvg = (svg) => checkSvgWith(svg, AT);
/** The same strict check for the icon / illustration kit, which also uses pathLength, fill-rule and clip-rule. */
export const checkIconSvg = (svg) => checkSvgWith(svg, AT_ICON, 24000);
const AT_ICON = new Set([...AT, 'pathLength', 'fill-rule', 'clip-rule']);
function checkSvgWith(svg, AT, max = MAX_PART) {
  if (typeof svg !== 'string' || svg.length > max || !svg.startsWith('<svg') || /<!|<\?|&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/.test(svg)) return false;
  const stack = [], ids = new Set(), refs = new Set(); let i = 0;
  const tag = /<(\/?)([A-Za-z][A-Za-z0-9]*)((?:\s+[A-Za-z][A-Za-z0-9:-]*="[^"<]*")*)\s*(\/?)>/y;
  while (i < svg.length) {
    const lt = svg.indexOf('<', i); if (lt < 0) { if (svg.slice(i).trim()) return false; break; }
    if (svg.slice(i, lt).trim()) return false;                                   // no text between the tags
    tag.lastIndex = lt; const m = tag.exec(svg); if (!m) return false;
    const [all, close, name, attrs, self] = m; i = lt + all.length;
    if (!EL.has(name)) return false;
    if (close) { if (stack.pop() !== name) return false; continue; }
    for (const [, an, av] of attrs.matchAll(/([A-Za-z][A-Za-z0-9:-]*)="([^"]*)"/g)) {
      if (!AT.has(an)) return false;
      if (an === 'id') ids.add(av);
      for (const u of av.matchAll(/url\(([^)]*)\)/g)) { if (!/^#[A-Za-z0-9_-]+$/.test(u[1])) return false; refs.add(u[1].slice(1)); }
      if (/url\(/i.test(av) && an !== 'fill' && an !== 'clip-path' && an !== 'stroke') return false;
      if (/javascript:|data:|&#/i.test(av)) return false;
    }
    if (!self) stack.push(name);
  }
  if (stack.length || [...refs].some((r) => !ids.has(r))) return false;
  return true;
}
const REQUIRED = { backdrop: ['default'], hair: ['back', 'front'], body: ['default'], outfit: ['default'], arms: ['rest', 'wave_a', 'wave_b', 'cheer', 'dance_a', 'dance_b', 'alert', 'think'], head: ['default'], cheeks: ['default'], eyes: ['open', 'closed', 'happy', 'wide', 'look_left', 'look_right', 'sad', 'sleepy'], brows: ['neutral', 'raised', 'worried', 'sad', 'angry'], nose: ['default'], mouth: ['smile', 'big', 'neutral', 'sad', 'surprised', 'hmm', 'flat', 'cheer', 'worried', 'proud'], facial_hair: ['default'], glasses: ['default'], headwear: ['default'], accessory: ['front', 'back'], companion: ['a', 'b'], effects: ['a', 'b'] };
/** The pack file -> { slots: { slot: { options: [{ id, name:{en,he}, unlock, variants }] } }, palettes } with only valid options. `dropped` counts what was refused. */
export function parsePack(raw) {
  const out = { slots: {}, palettes: {}, dropped: 0 };
  if (!raw || raw.format !== 'sonrise-avatar-pack' || raw.version !== 1 || typeof raw.slots !== 'object' || !raw.slots) return null;
  for (const [slot, need] of Object.entries(REQUIRED)) {
    const src = Object.hasOwn(raw.slots, slot) && Array.isArray(raw.slots[slot]?.options) ? raw.slots[slot].options : [], options = [];
    for (const o of src.slice(0, 60)) {
      const ok = o && typeof o.id === 'string' && ID.test(o.id) && o.variants && typeof o.variants === 'object' && need.every((v) => Object.hasOwn(o.variants, v) && checkSvg(o.variants[v]));
      if (!ok) { out.dropped++; continue; }
      const variants = {}; for (const v of need) variants[v] = o.variants[v];
      options.push({ id: o.id, name: { en: cleanText(o.name?.en, 40) || o.id, he: cleanText(o.name?.he, 40) || o.id }, unlock: o.id === 'none' ? 1 : clamp(Math.round(Number(o.unlock)) || 1, 1, 14), variants });
    }
    out.slots[slot] = { options };
  }
  for (const [k, from] of Object.entries(PALETTE_OF)) { const list = raw.palettes && Array.isArray(raw.palettes[from]) ? raw.palettes[from] : []; out.palettes[k] = list.filter((c) => typeof c === 'string' && HEX.test(c)).map((c) => c.toUpperCase()).slice(0, 24); if (!out.palettes[k].length) out.palettes[k] = [DEFAULT_COLORS[k]]; }
  return Object.values(out.slots).every((s) => s.options.length) ? out : null;
}
export const optionOf = (pack, slot, id) => pack?.slots[slot]?.options.find((o) => o.id === id) || pack?.slots[slot]?.options[0] || null;
/** The unlocked options of a slot at this level. */
/** The avatar parts that open when a person goes from level `from` to level `to`: [{ slot, id }]. */
export function partsUnlockedBetween(pack, from, to) {
  const out = []; for (const [slot, s] of Object.entries(pack?.slots || {})) for (const o of s.options || []) if (o.unlock > from && o.unlock <= to) out.push({ slot, id: o.id });
  return out;
}
export const unlocked = (pack, slot, level) => (pack?.slots[slot]?.options || []).filter((o) => o.unlock <= level);

// ── what each animation / feeling looks like: which variant of the arms, eyes, brows, mouth, which effect. `flip` = two frames that alternate. ──
export const STATES = {
  idle: { arms: ['rest'], eyes: 'open', blink: true, brows: 'neutral', mouth: 'smile' },
  wave: { arms: ['wave_a', 'wave_b'], eyes: 'open', blink: true, brows: 'raised', mouth: 'big' },
  cheer: { arms: ['cheer'], eyes: 'happy', brows: 'raised', mouth: 'cheer', fx: 'sparkles' },
  dance: { arms: ['dance_a', 'dance_b'], eyes: 'happy', brows: 'neutral', mouth: 'big', fx: 'notes' },
  sleep: { arms: ['rest'], eyes: 'closed', brows: 'neutral', mouth: 'flat', fx: 'zzz' },
  alert: { arms: ['alert'], eyes: 'wide', brows: 'raised', mouth: 'surprised', fx: 'exclamation' },
  think: { arms: ['think'], eyes: 'look_left', brows: 'raised', mouth: 'hmm', fx: 'thought' },
  happy: { arms: ['rest'], eyes: 'happy', brows: 'neutral', mouth: 'big' },
  calm: { arms: ['rest'], eyes: 'closed', brows: 'neutral', mouth: 'smile' },
  sad: { arms: ['rest'], eyes: 'sad', brows: 'sad', mouth: 'sad' },
  worried: { arms: ['rest'], eyes: 'open', brows: 'worried', mouth: 'worried' },
  angry: { arms: ['rest'], eyes: 'open', brows: 'angry', mouth: 'neutral' },
  tired: { arms: ['rest'], eyes: 'sleepy', brows: 'neutral', mouth: 'flat' },
  excited: { arms: ['cheer'], eyes: 'wide', brows: 'raised', mouth: 'cheer', fx: 'stars' },
  proud: { arms: ['rest'], eyes: 'happy', brows: 'neutral', mouth: 'proud', fx: 'sparkles' },
};
export const ANIM_NAMES = ['idle', 'wave', 'cheer', 'dance', 'sleep', 'alert', 'think'];
export const FEELING_NAMES = ['happy', 'calm', 'sad', 'worried', 'angry', 'tired', 'excited', 'proud'];
export const stateOf = (name) => (typeof name === 'string' && Object.hasOwn(STATES, name) ? STATES[name] : STATES.idle);

/** A random avatar from the options and colours the person can use at this level. */
export function randomKit(pack, level = 14, rnd = Math.random) {
  const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];
  const p = {}, c = {};
  for (const s of PICK_SLOTS) { const o = unlocked(pack, s, level); p[s] = o.length ? pick(o).id : DEFAULT_PARTS[s]; }
  for (const k of COLOR_KEYS) c[k] = pick(pack?.palettes[k] || [DEFAULT_COLORS[k]]);
  return sanitizeKit({ p, c });
}

// ── share code: a short text a person can send (SRAV1.<base64url>) ──
const b64u = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
export const CODE_RE = /SRAV1\.[A-Za-z0-9_-]{20,1500}/;
/** Parts in the fixed slot order, then the colours: tiny and stable. A name may travel along. */
export function encodeKit(av, name = '') {
  const k = sanitizeKit(av);
  return `SRAV1.${b64u(JSON.stringify([PICK_SLOTS.map((s) => k.p[s]), COLOR_KEYS.map((c) => k.c[c].slice(1)), cleanText(name, 30)]))}`;
}
/** Whatever was pasted -> { avatar, name } or null. Never throws. */
export function decodeKit(text) {
  try {
    const m = CODE_RE.exec(String(text ?? '').slice(0, 4000)); if (!m) return null;
    const [parts, cols, name] = JSON.parse(unb64u(m[0].slice(6)));
    if (!Array.isArray(parts) || !Array.isArray(cols)) return null;
    const p = {}, c = {}; PICK_SLOTS.forEach((s, i) => { p[s] = parts[i]; }); COLOR_KEYS.forEach((k, i) => { c[k] = typeof cols[i] === 'string' ? `#${cols[i]}` : ''; });
    return { avatar: sanitizeKit({ p, c }), name: cleanText(name, 30) };
  } catch { return null; }
}

// ── "My avatars": the designs a person saved on this device ──
export function sanitizeLib(raw) {
  const seen = new Set();
  return (Array.isArray(raw) ? raw : []).filter((x) => x && typeof x === 'object').slice(0, MAX_LIB).map((x) => ({
    id: typeof x.id === 'string' && x.id && x.id.length <= 64 ? x.id : uid(), name: cleanText(x.name, 30), avatar: sanitizeKit(x.avatar), at: Number.isFinite(Number(x.at)) ? Number(x.at) : Date.now(),
  })).filter((x) => !seen.has(x.id) && seen.add(x.id));
}
/** Add or replace by id; returns the new list (the newest first), or null when full. */
export function libUpsert(lib, item) {
  const clean = sanitizeLib([item])[0], i = lib.findIndex((x) => x.id === clean.id);
  if (i < 0 && lib.length >= MAX_LIB) return null;
  return i < 0 ? [clean, ...lib] : lib.map((x, j) => (j === i ? clean : x));
}
export const libRemove = (lib, id) => lib.filter((x) => x.id !== id);
export const libDuplicate = (lib, id, copyWord = '') => { const x = lib.find((k) => k.id === id); return x ? libUpsert(lib, { ...x, id: uid(), name: cleanText(`${x.name} ${copyWord}`.trim(), 30), at: Date.now() }) : lib; };

// Avatars (pure): built-in ANIMATED characters (inline SVG drawn by ui/avatar.js - original art, no external GIFs, works offline),
// emoji, your own photo (tiny JPEG) or your own animated GIF. Validation lives here because avatars arrive from backups and links.
export const AVATAR_COLORS = ['#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#22c55e', '#64748b'];
/** `unlock` = level needed (see levels.js); `fixed` = colour can't be changed (panda, robot). */
export const CHARACTERS = {
  fox: { emoji: '🦊', unlock: 1, base: '#f59e0b', ears: 'pointy' }, cat: { emoji: '🐱', unlock: 1, base: '#94a3b8', ears: 'pointy', whiskers: true },
  panda: { emoji: '🐼', unlock: 1, base: '#f8fafc', ears: 'round', patches: '#1f2937', fixed: true }, bear: { emoji: '🐻', unlock: 2, base: '#b45309', ears: 'round' },
  frog: { emoji: '🐸', unlock: 3, base: '#22c55e', ears: 'frog', nose: false }, unicorn: { emoji: '🦄', unlock: 4, base: '#f5d0fe', ears: 'horn' },
  dino: { emoji: '🦖', unlock: 5, base: '#16a34a', ears: 'spikes' }, robot: { emoji: '🤖', unlock: 6, base: '#94a3b8', ears: 'antenna', square: true, fixed: true, nose: false },
};
export const ANIMATIONS = ['idle', 'wave', 'cheer', 'dance', 'sleep', 'alert', 'think'];
export const MAX_GIF_CHARS = 220_000; // ~160 KB of file as base64
export const isSafeGif = (v) => typeof v === 'string' && v.length <= MAX_GIF_CHARS && /^data:image\/gif;base64,R0lGOD[a-zA-Z]/.test(v) && /^data:image\/gif;base64,[A-Za-z0-9+/=]+$/.test(v);
const isPhoto = (v) => typeof v === 'string' && v.length <= 40_000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
const HEX = /^#[0-9a-fA-F]{6}$/;
const isChar = (id) => typeof id === 'string' && Object.hasOwn(CHARACTERS, id); // plain lookup would accept "__proto__", "constructor"...

export const defaultAvatar = () => ({ k: 'char', id: 'fox', color: CHARACTERS.fox.base });
/** -> a valid avatar object, or the default. Never trusts the shape it is given. */
export function sanitizeAvatar(a) {
  if (!a || typeof a !== 'object') return defaultAvatar();
  if (a.k === 'char' && isChar(a.id)) return { k: 'char', id: a.id, color: HEX.test(a.color) ? a.color : CHARACTERS[a.id].base };
  if (a.k === 'emoji' && typeof a.e === 'string') { const e = a.e.replace(/[\u0000-\u001f<>&"']/g, '').slice(0, 8); if (e) return { k: 'emoji', e }; }
  if (a.k === 'photo' && isPhoto(a.url)) return { k: 'photo', url: a.url };
  if (a.k === 'gif' && isSafeGif(a.url)) return { k: 'gif', url: a.url };
  return defaultAvatar();
}
/** Text stand-in for contexts that can't draw (messages, other phones): emoji of the character, or the emoji itself, or a smiley. */
export function avatarEmoji(a) {
  const v = sanitizeAvatar(a);
  return v.k === 'char' ? CHARACTERS[v.id].emoji : v.k === 'emoji' ? v.e : '🙂';
}
/** What another phone gets to see: photos/GIFs never leave the device (privacy + size), characters/emoji do. */
export const shareableAvatar = (a) => { const v = sanitizeAvatar(a); return v.k === 'photo' || v.k === 'gif' ? { k: 'emoji', e: '🙂' } : v; };
/** Legacy `mascot` emoji -> nearest character. */
export function avatarFromMascot(e) {
  const hit = Object.entries(CHARACTERS).find(([, c]) => c.emoji === e);
  return hit ? { k: 'char', id: hit[0], color: hit[1].base } : { k: 'emoji', e: typeof e === 'string' && e ? e : '🦊' };
}

/** Drawing instructions for a character - plain data so it is testable: [{ tag, a: attrs, cls? }] in a 100x100 box. */
export function characterShapes(id, color) {
  const c = isChar(id) ? CHARACTERS[id] : CHARACTERS.fox, base = c.fixed ? c.base : (HEX.test(color) ? color : c.base), dark = '#1f2937';
  const back = [];
  if (c.ears === 'pointy') back.push({ tag: 'polygon', a: { points: '18,40 28,6 48,28', fill: base } }, { tag: 'polygon', a: { points: '82,40 72,6 52,28', fill: base } }, { tag: 'polygon', a: { points: '26,34 30,16 40,28', fill: '#fda4af' } }, { tag: 'polygon', a: { points: '74,34 70,16 60,28', fill: '#fda4af' } });
  if (c.ears === 'round') back.push({ tag: 'circle', a: { cx: 24, cy: 26, r: 13, fill: c.patches || base } }, { tag: 'circle', a: { cx: 76, cy: 26, r: 13, fill: c.patches || base } });
  if (c.ears === 'frog') back.push({ tag: 'circle', a: { cx: 30, cy: 28, r: 15, fill: base } }, { tag: 'circle', a: { cx: 70, cy: 28, r: 15, fill: base } });
  if (c.ears === 'horn') back.push({ tag: 'polygon', a: { points: '50,0 43,26 57,26', fill: '#fde047' } }, { tag: 'polygon', a: { points: '20,36 26,12 42,28', fill: base } }, { tag: 'polygon', a: { points: '80,36 74,12 58,28', fill: base } });
  if (c.ears === 'spikes') back.push({ tag: 'polygon', a: { points: '28,26 35,6 42,24', fill: '#15803d' } }, { tag: 'polygon', a: { points: '43,20 50,0 57,20', fill: '#15803d' } }, { tag: 'polygon', a: { points: '58,24 65,6 72,26', fill: '#15803d' } });
  if (c.ears === 'antenna') back.push({ tag: 'line', a: { x1: 50, y1: 22, x2: 50, y2: 8, stroke: '#64748b', 'stroke-width': 4, 'stroke-linecap': 'round' } }, { tag: 'circle', a: { cx: 50, cy: 6, r: 5, fill: '#ef4444' } });
  const head = c.square ? { tag: 'rect', a: { x: 14, y: 20, width: 72, height: 68, rx: 18, fill: base, stroke: '#475569', 'stroke-width': 2 } } : { tag: 'circle', a: { cx: 50, cy: 56, r: 36, fill: base } };
  const face = [];
  if (c.patches) face.push({ tag: 'ellipse', a: { cx: 36, cy: 54, rx: 9, ry: 12, fill: c.patches, transform: 'rotate(18 36 54)' } }, { tag: 'ellipse', a: { cx: 64, cy: 54, rx: 9, ry: 12, fill: c.patches, transform: 'rotate(-18 64 54)' } });
  if (c.square) face.push({ tag: 'rect', a: { x: 24, y: 40, width: 52, height: 26, rx: 10, fill: '#0f172a' } });
  face.push({ tag: 'g', cls: 'av-eyes', kids: [{ tag: 'circle', a: { cx: 38, cy: 54, r: 5.5, fill: c.square ? '#67e8f9' : dark } }, { tag: 'circle', a: { cx: 62, cy: 54, r: 5.5, fill: c.square ? '#67e8f9' : dark } },
    ...(c.square ? [] : [{ tag: 'circle', a: { cx: 40, cy: 52, r: 1.8, fill: '#fff' } }, { tag: 'circle', a: { cx: 64, cy: 52, r: 1.8, fill: '#fff' } }])] });
  if (c.nose !== false) face.push({ tag: 'ellipse', a: { cx: 50, cy: 62, rx: 4, ry: 3, fill: dark } });
  face.push({ tag: 'path', cls: 'av-mouth', a: { d: 'M41 68 Q50 77 59 68', fill: 'none', stroke: c.square ? '#67e8f9' : dark, 'stroke-width': 3, 'stroke-linecap': 'round' } },
    { tag: 'circle', a: { cx: 29, cy: 65, r: 5, fill: '#fb7185', opacity: 0.35 } }, { tag: 'circle', a: { cx: 71, cy: 65, r: 5, fill: '#fb7185', opacity: 0.35 } });
  if (c.whiskers) face.push({ tag: 'path', a: { d: 'M20 60 L36 63 M20 68 L36 66 M80 60 L64 63 M80 68 L64 66', stroke: dark, 'stroke-width': 1.5, 'stroke-linecap': 'round', fill: 'none' } });
  return { body: [...back, head, ...face], hand: { tag: 'circle', cls: 'av-hand', a: { cx: 88, cy: 72, r: 8, fill: base, stroke: dark, 'stroke-width': 1.5 } } };
}

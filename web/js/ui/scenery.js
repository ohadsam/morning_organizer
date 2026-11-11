// Draws the scenery kit (see ../scenery.js): a frame around an avatar, a sky strip, a divider. The pictures are copied element by element, never as markup.
import { parseScenery, frameFor, skyAt } from '../scenery.js';
import { inner } from './avatarKit.js';
import { h, setChildren } from '../util.js';

const NS = 'http://www.w3.org/2000/svg';
let kit = null, loading = null;
export const sceneryKit = () => kit;
export function loadScenery() {
  loading ??= fetch(new URL('../../data/scenery.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).then((j) => { kit = parseScenery(j); return kit; }).catch(() => null);
  return loading;
}
function svgOf(text, viewBox, slice = false) {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', viewBox); s.setAttribute('class', 'sc'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); if (slice) s.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  for (const n of inner(text)) s.append(n); return s;
}
/** `avatar` (a node) inside the ring of the avatar frame for `level`; the ring fills `size` px and the avatar takes the clear 66% in the middle. */
export function framedAvatar(avatar, level, size = 104) {
  const box = h('span', { class: 'framed' }, avatar); box.style.setProperty('--fr', `${size}px`);
  const draw = () => { const t = kit?.frames?.[frameFor(level)]; if (t) box.append(svgOf(t, '0 0 256 256')); };
  if (kit) draw(); else loadScenery().then(draw);
  return box;
}
/** A strip of the sky for the time of day (or `hour`), cropped to fill its box. Empty until the kit is loaded. */
export function skyStrip(hour = new Date().getHours()) {
  const box = h('div', { class: 'sky-strip', 'aria-hidden': 'true' });
  const draw = () => { const t = kit?.skies?.[skyAt(hour)]; if (t) box.append(svgOf(t, /viewBox="([^"]+)"/.exec(t)?.[1] || '0 0 640 360', true)); };
  if (kit) draw(); else loadScenery().then(draw);
  return box;
}
export function divider(name) {
  const box = h('div', { class: 'sc-divider', 'aria-hidden': 'true' });
  const draw = () => { const t = kit?.dividers?.[name]; if (t) box.append(svgOf(t, /viewBox="([^"]+)"/.exec(t)?.[1] || '0 0 600 40')); };
  if (kit) draw(); else loadScenery().then(draw);
  return box;
}
/** A quiet picture behind the whole screen (fixed, under the cards): `name` is one of the 14 backgrounds, or null / `on` false for none. */
export function screenBg(name, on = true) {
  let el = document.getElementById('scene-bg');
  if (!name || !on) { el?.remove(); delete document.body.dataset.art; return; }
  if (!el) { el = h('div', { id: 'scene-bg', 'aria-hidden': 'true' }); document.body.prepend(el); }
  const draw = () => { const v = kit?.screens?.[name]; if (!v || document.getElementById('scene-bg') !== el) return; const wide = window.innerWidth > window.innerHeight * 1.1; setChildren(el, svgOf(wide ? v.w : v.p, /viewBox="([^"]+)"/.exec(wide ? v.w : v.p)?.[1] || '0 0 360 640', true)); document.body.dataset.art = name; };
  if (kit) draw(); else loadScenery().then(draw);
}
/** A task silhouette (one ink, follows the text colour); the emoji `fallback` shows until the kit is loaded. */
export function silNode(id, fallback = '') {
  const box = h('span', { class: 'sil', 'aria-hidden': 'true' }, fallback);
  const draw = () => { const t = kit?.tasks?.[id]; if (t) setChildren(box, svgOf(t, '0 0 96 96')); };
  if (kit) draw(); else loadScenery().then(draw);
  return box;
}

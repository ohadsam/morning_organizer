// Draws the visual kit's artwork: illustrations and feeling faces. The pack is fetched once (cached by the service worker); a node shows its picture
// as soon as it is there. Colours come from the CSS variables --k1..--k8 that the active look sets, so every look recolours the same drawings.
import { h, setChildren } from '../util.js';
import { parseVisualKit, iconVariantFor } from '../visualKit.js';
import * as S from '../store.js';
import { inner } from './avatarKit.js';

const NS = 'http://www.w3.org/2000/svg';
let kit = null, loading = null;
export const visualKit = () => kit;
export function loadVisualKit() {
  loading ??= fetch(new URL('../../data/visual-kit.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).then((j) => { kit = parseVisualKit(j); return kit; }).catch(() => null);
  return loading;
}
function fill(box, section, id) {
  const it = kit?.[section]?.[id]; if (!it) return;
  const doc = new DOMParser().parseFromString(it.svg, 'image/svg+xml'); if (doc.querySelector('parsererror')) return;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', doc.documentElement.getAttribute('viewBox') || '0 0 256 256'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  for (const n of inner(it.svg)) svg.append(n);
  setChildren(box, svg);
}
function node(section, id, { size = 64, label = '' } = {}) {
  const box = h('span', { class: `vk vk-${section}`, 'data-vk': id, ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }) });
  box.style.setProperty('--vk', `${size}px`);
  if (kit) fill(box, section, id); else loadVisualKit().then(() => fill(box, section, id));
  return box;
}
/** An illustration (256 grid): empty-routines, welcome-1, calm-scene-sea ... */
export const artNode = (id, opts) => node('art', id, opts);
/** A feeling face: feel-happy, feel-sad ... */
export const feelingNode = (id, opts) => node('feelings', id, opts);
/** A calm "nothing here yet" block: a picture and a sentence. */
export const emptyState = (artId, text) => h('div', { class: 'empty-state' }, artNode(artId, { size: 140 }), h('p', { class: 'empty' }, text));

/**
 * An icon of the kit (ui or feature icons): drawn in the current text colour, in the variant of the look (or the person's own "icon style").
 * `fallback` (an emoji) shows until the kit is loaded. refreshIcons() redraws them all when the look or the style changes.
 */
export function iconNode(id, { size = 22, fallback = '' } = {}) {
  const box = h('span', { class: 'vki', 'aria-hidden': 'true', 'data-icon': id }, fallback);
  box.style.setProperty('--vki', `${size}px`);
  if (kit) fillIcon(box); else loadVisualKit().then(() => fillIcon(box));
  return box;
}
function fillIcon(box) {
  const id = box.dataset.icon, it = kit?.ui[id] || kit?.features[id]; if (!it) return;
  const st = S.get().settings, svgText = it.variants[iconVariantFor(st.iconStyle, st.skin)];
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('focusable', 'false');
  for (const n of inner(svgText)) svg.append(n);
  setChildren(box, svg);
}
export function refreshIcons(root = document) { if (kit) for (const b of root.querySelectorAll('.vki[data-icon]')) fillIcon(b); }

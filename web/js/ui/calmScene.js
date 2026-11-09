// Draws the calm kit's scenes (see ../calmKit.js). Nothing is inserted as markup: each scene is parsed once and copied element by element.
import { parseCalmKit, frameMix } from '../calmKit.js';
import { inner } from './avatarKit.js';

const NS = 'http://www.w3.org/2000/svg';
let scenes = null, loading = null;
export const calmScenes = () => scenes;
/** Loads data/calm-kit.json once (kept by the service worker for offline). Resolves to the scenes or null. */
export function loadCalmKit() {
  loading ??= fetch(new URL('../../data/calm-kit.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).then((j) => { scenes = parseCalmKit(j); return scenes; }).catch(() => null);
  return loading;
}
function layer(el, id) {
  const sc = scenes?.[id];
  if (el.dataset.id === (sc ? id : '')) return !!sc;
  el.dataset.id = sc ? id : ''; el.replaceChildren();
  if (sc) for (const n of inner(sc.svg)) el.append(n);
  return !!sc;
}
/**
 * A stage that shows one scene, or two neighbouring ones cross-faded (breathing). Returns { node, show(idA, idB?, t?) }; show() is cheap enough for every
 * animation frame (it only redraws when an id changes). `label` is what a screen reader says.
 */
export function sceneStage(label = '') {
  const mk = () => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 256 256'); s.setAttribute('focusable', 'false'); s.setAttribute('aria-hidden', 'true'); return s; };
  const a = mk(), b = mk(), node = document.createElement('div');
  node.className = 'cs cs-stage'; node.setAttribute('role', 'img'); if (label) node.setAttribute('aria-label', label);
  node.append(a, b);
  return { node, a, b, show(idA, idB = null, t = 0) { layer(a, idA); const second = idB && idB !== idA && layer(b, idB); if (!second) layer(b, ''); b.style.opacity = second ? String(Math.min(1, Math.max(0, t))) : '0'; } };
}
/**
 * A stage for a breathing pattern that never rebuilds its pictures while it runs: the five frames are drawn once, stacked, and only their opacity changes
 * with the breath (frame a opaque underneath, the next one fading in above it). -> { node, breath(pattern, p) } with p 0 (empty) .. 1 (full).
 */
export function breathStage(label = '') {
  const node = document.createElement('div'); node.className = 'cs cs-stage'; node.setAttribute('role', 'img'); if (label) node.setAttribute('aria-label', label);
  let layers = null, pat = '';
  const build = (pattern) => { pat = pattern; layers = Array.from({ length: 5 }, (_, i) => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 256 256'); s.setAttribute('focusable', 'false'); s.setAttribute('aria-hidden', 'true');
    for (const n of inner(scenes?.[`breath-${pattern}-${i}`]?.svg || '<svg xmlns="http://www.w3.org/2000/svg"></svg>')) s.append(n); s.style.opacity = '0'; return s; }); node.replaceChildren(...layers); };
  return { node, breath(pattern, p) {
    if (!layers || pat !== pattern) build(pattern);
    const x = Math.min(1, Math.max(0, p)) * 4, a = Math.min(3, Math.floor(x)), t = x - a;
    layers.forEach((s, i) => { s.style.opacity = i === a ? '1' : i === a + 1 ? String(t) : '0'; }); } };
}
/** The two frames and the mix for breathing pattern `pattern` at breath fullness `p`. */
export const breathScene = (pattern, p) => { const m = frameMix(p); return [`breath-${pattern}-${m.a}`, `breath-${pattern}-${m.b}`, m.t]; };

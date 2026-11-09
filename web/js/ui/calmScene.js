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
/**
 * Sunny breathing, drawn as ONE picture with stable parts (data/calm-kit.json `sunny-breath-<pattern>`, ids s-body, s-rays, s-glow, s-cheeks, s-mouth-in / -out, s-air-in / -out):
 * nothing is swapped, each part is moved by the breath p (0 empty .. 1 full), the way HOOKS.md of the kit describes. -> { node, update(p, label) } or null without the picture.
 */
export function sunnyBreath(pattern, label = '') {
  const sc = scenes?.[`sunny-breath-${pattern}`]; if (!sc) return null;
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 256 256'); svg.setAttribute('class', 'cs sunny-breath2'); svg.setAttribute('role', 'img'); svg.setAttribute('focusable', 'false'); if (label) svg.setAttribute('aria-label', label);
  for (const n of inner(sc.svg)) svg.append(n);
  const part = (id) => svg.querySelector(`#${id}`), P = { body: part('s-body'), rays: part('s-rays'), glow: part('s-glow'), cheeks: part('s-cheeks'), mIn: part('s-mouth-in'), mOut: part('s-mouth-out'), aIn: part('s-air-in'), aOut: part('s-air-out') };
  const about = (cx, cy, sx, sy = sx, ty = 0) => `translate(${cx} ${cy}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-cx} ${-cy})${ty ? ` translate(0 ${ty.toFixed(2)})` : ''}`;
  return { node: svg, update(p, phase = 'in') {
    p = Math.min(1, Math.max(0, p)); const out = phase === 'out';
    P.body?.setAttribute('transform', about(128, 224, 0.9 + 0.13 * p, 0.88 + 0.18 * p, -5 * p)); P.rays?.setAttribute('transform', about(128, 122, 0.92 + 0.18 * p));
    P.glow?.setAttribute('transform', about(128, 121, 0.85 + 0.25 * p)); P.glow?.setAttribute('opacity', (0.25 + 0.45 * p).toFixed(3)); P.cheeks?.setAttribute('transform', about(128, 122, 1 + 0.055 * p, 1 + 0.04 * p));
    P.mIn?.setAttribute('opacity', out ? '0' : '1'); P.mOut?.setAttribute('opacity', out ? '1' : '0');
    P.aIn?.setAttribute('opacity', (out ? 0.12 : 0.22 + 0.62 * p).toFixed(3)); P.aOut?.setAttribute('opacity', (out ? 0.25 + 0.6 * p : 0.08).toFixed(3));
  } };
}
/** The two frames and the mix for breathing pattern `pattern` at breath fullness `p`. */
export const breathScene = (pattern, p) => { const m = frameMix(p); return [`breath-${pattern}-${m.a}`, `breath-${pattern}-${m.b}`, m.t]; };

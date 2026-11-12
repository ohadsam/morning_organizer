// Draws Sunny (see ../mascot.js). Same contract as a kit avatar: an <svg> with _kitSet(state); the sun emoji shows until the pictures are loaded.
import { parseMascot, moodFor } from '../mascot.js';
import { frameAt, LOOP_MS } from '../loadingSunny.js';
import { setChildren } from '../util.js';
import { inner } from './avatarKit.js';

const NS = 'http://www.w3.org/2000/svg';
let moods = null, loading = null;
export const mascotMoods = () => moods;
export function loadMascot() {
  loading ??= fetch(new URL('../../data/mascot.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).then((j) => { moods = parseMascot(j); return moods; }).catch(() => null);
  return loading;
}
const FACE_EMOJI = { 1: '😞', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄' };
/** One of the five "how do I feel" faces drawn as Sunny (1 very sad ... 5 great); the emoji shows until her pictures are loaded. */
export function moodFace(level, { size = 40 } = {}) {
  const v = Math.min(5, Math.max(1, Math.round(Number(level)) || 3)), svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'avatar avatar-sunny cs sunny-face'); svg.style.setProperty('--av', `${size}px`); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  const draw = () => { const s = moods?.[`feel-${v}`]; if (!s) { svg.setAttribute('viewBox', '0 0 256 256'); const t = document.createElementNS(NS, 'text'); t.setAttribute('x', '128'); t.setAttribute('y', '190'); t.setAttribute('font-size', '170'); t.setAttribute('text-anchor', 'middle'); t.textContent = FACE_EMOJI[v]; setChildren(svg, t); return; }
    svg.setAttribute('viewBox', /viewBox="([\d.\s-]+)"/.exec(s)?.[1] || '0 0 256 256'); setChildren(svg, ...inner(s)); };
  draw(); if (!moods) loadMascot().then(draw);
  return svg;
}
/** Sunny with a prop for a moment of the app (empty list, offline, error, success...): `name` is one of check, empty, error, offline, loading, reminder, calm, tired, proud, think, hello, goodbye. */
export function cameoNode(name, { size = 120, label = '' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 256 256'); svg.setAttribute('class', 'avatar avatar-sunny cs sunny-cameo'); svg.style.setProperty('--av', `${size}px`); svg.setAttribute('focusable', 'false');
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
  const draw = () => { const s = moods?.[`cameo-${name}`]; if (!s) { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', '128'); t.setAttribute('y', '190'); t.setAttribute('font-size', '170'); t.setAttribute('text-anchor', 'middle'); t.textContent = '🌞'; setChildren(svg, t); return; } setChildren(svg, ...inner(s)); };
  draw(); if (!moods) loadMascot().then(draw);
  return svg;
}
export function sunnyNode({ size = 56, anim = 'idle' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 256 256'); svg.setAttribute('class', 'avatar avatar-sunny cs'); svg.dataset.anim = anim; svg.style.setProperty('--av', `${size}px`);
  const draw = (state) => {
    const mood = moods?.[moodFor(state)] || moods?.idle;
    if (!mood) { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', '128'); t.setAttribute('y', '190'); t.setAttribute('font-size', '170'); t.setAttribute('text-anchor', 'middle'); t.textContent = '🌞'; setChildren(svg, t); return; }
    setChildren(svg, ...inner(mood));
  };
  svg._kitSet = (name) => { svg.dataset.anim = name; draw(name === 'none' ? 'idle' : name); };
  if (moods) draw(anim); else { draw(anim); loadMascot().then(() => { if (moods) draw(svg.dataset.anim); }); }
  return svg;
}

/** Sunny rising while something loads: the still picture, moved by the loop of ../loadingSunny.js; it stands still with "calm animations" or a reduced-motion phone. */
export function loadingSunny({ size = 32 } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 160 160'); svg.setAttribute('class', 'avatar avatar-sunny cs sunny-loading'); svg.style.setProperty('--av', `${size}px`); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  const draw = () => {
    const s = moods?.['anim-loading']; if (!s) { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', '80'); t.setAttribute('y', '120'); t.setAttribute('font-size', '100'); t.setAttribute('text-anchor', 'middle'); t.textContent = '🌞'; setChildren(svg, t); return; }
    setChildren(svg, ...inner(s));
    const [rays, sun] = [...svg.children]; if (!rays || !sun || document.documentElement.dataset.motion === 'calm' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now(); let seen = false;
    const tick = (now) => {
      if (svg.isConnected) seen = true; else if (seen) return;   // stop once it left the page
      const u = ((now - t0) % LOOP_MS) / LOOP_MS, f = frameAt(u); sun.style.setProperty('transform', `translateY(${f.dy.toFixed(2)}px)`);
      [...rays.children].forEach((r, i) => r.style.setProperty('opacity', frameAt(u, i).opacity.toFixed(3)));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  draw(); if (!moods) loadMascot().then(draw);
  return svg;
}

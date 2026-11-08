// Draws Sunny (see ../mascot.js). Same contract as a kit avatar: an <svg> with _kitSet(state); the sun emoji shows until the pictures are loaded.
import { parseMascot, moodFor } from '../mascot.js';
import { setChildren } from '../util.js';
import { inner } from './avatarKit.js';

const NS = 'http://www.w3.org/2000/svg';
let moods = null, loading = null;
export const mascotMoods = () => moods;
export function loadMascot() {
  loading ??= fetch(new URL('../../data/mascot.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).then((j) => { moods = parseMascot(j); return moods; }).catch(() => null);
  return loading;
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

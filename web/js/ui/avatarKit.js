// Draws a kit avatar (see ../avatarKit.js): the validated SVG parts of the pack, stacked in order, coloured through CSS variables, animated by
// swapping a few part variants (two frames that alternate, a blink) plus the figure's movement in CSS. Nothing is inserted as markup: parts are parsed once,
// then copied element by element with createElementNS.
import { setChildren } from '../util.js';
import { parsePack, sanitizeKit, optionOf, stateOf, COLOR_KEYS } from '../avatarKit.js';

const NS = 'http://www.w3.org/2000/svg';
let pack = null, loading = null;
const parsed = new Map();                       // svg text -> its child elements (parsed once)

export const kitPack = () => pack;
/** Loads data/avatar-pack.json once (the service worker keeps it for offline). Resolves to the pack or null. */
export function loadPack() {
  loading ??= fetch(new URL('../../data/avatar-pack.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).then((j) => { pack = parsePack(j); return pack; }).catch(() => null);
  return loading;
}

const copy = (src) => { const e = document.createElementNS(NS, src.localName); for (const a of src.attributes) e.setAttribute(a.name, a.value); for (const c of src.children) e.append(copy(c)); return e; };
function inner(svg) {
  let kids = parsed.get(svg);
  if (!kids) { const doc = new DOMParser().parseFromString(svg, 'image/svg+xml'); kids = doc.querySelector('parsererror') ? [] : [...doc.documentElement.children]; parsed.set(svg, kids); }
  return kids.map(copy);
}
const group = (cls, nodes, flip) => { const g = document.createElementNS(NS, 'g'); if (cls) g.setAttribute('class', cls); if (flip) g.dataset.flip = flip; for (const n of nodes) g.append(n); return g; };

/** Fills `svg` with the avatar `kit` in the look named `state` (an animation or a feeling). */
export function renderKit(svg, kit, state = 'idle') {
  if (!pack) return;
  const st = stateOf(state), part = (slot, variant) => { const o = optionOf(pack, slot, kit.p[slot]); return o ? inner(o.variants[variant]) : []; };
  const frames = (slot, a, b, flip) => (b && b !== a ? [group('fa', part(slot, a), flip), group('fb', part(slot, b), flip)] : [group('', part(slot, a))]);
  const arms = frames('arms', st.arms[0], st.arms[1], 'fast');
  const eyes = st.blink ? frames('eyes', st.eyes, 'closed', 'blink') : frames('eyes', st.eyes);
  const move = [group('', part('hair', 'back')), group('', part('accessory', 'back')), group('', part('body', 'default')), group('', part('outfit', 'default')), ...arms, group('', part('head', 'default')), group('', part('cheeks', 'default')),
    ...eyes, group('', part('brows', st.brows)), group('', part('nose', 'default')), group('', part('mouth', st.mouth)), group('', part('facial_hair', 'default')), group('', part('hair', 'front')), group('', part('glasses', 'default')),
    group('', part('headwear', 'default')), group('', part('accessory', 'front'))];
  const fxOpt = st.fx ? pack.slots.effects.options.find((x) => x.id === st.fx) : null;
  const fx = fxOpt ? [group('fa', inner(fxOpt.variants.a), 'fast'), group('fb', inner(fxOpt.variants.b), 'fast')] : [];
  setChildren(svg, group('k-bg', part('backdrop', 'default')), group('kit-move', move), group('k-comp', frames('companion', 'a', 'b', 'slow')), group('k-fx', fx));
  for (const k of COLOR_KEYS) svg.style.setProperty(`--c-${k}`, kit.c[k]);
}

/**
 * A kit avatar as an <svg>. Shows the parts as soon as the pack is loaded (the first call fetches it). Methods on the node:
 * _kitSet(state) = switch the animation / feeling, _kitUpdate(kit) = show another design.
 */
export function kitNode(av, { size = 56, anim = 'idle' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 256 256'); svg.setAttribute('class', 'avatar avatar-kit'); svg.dataset.anim = anim; svg.style.setProperty('--av', `${size}px`);
  svg._kit = sanitizeKit(av);
  svg._kitSet = (name) => { svg.dataset.anim = name; renderKit(svg, svg._kit, name === 'none' ? 'idle' : name); };
  svg._kitUpdate = (k) => { svg._kit = sanitizeKit(k); svg._kitSet(svg.dataset.anim); };
  if (pack) svg._kitSet(anim); else loadPack().then(() => svg._kitSet(svg.dataset.anim));
  return svg;
}

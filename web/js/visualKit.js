// The visual kit (pure): illustrations (empty states, welcome scenes) and feeling faces drawn as SVG, recoloured by the active look.
// data/visual-kit.json is validated with the same strict allow-list as the avatar pack; anything that fails is simply left out.
import { checkIconSvg } from './avatarKit.js';
import { cleanText } from './util.js';

/** Which colour set (pack) each look uses; the CSS variables --k1..--k8 are set per look in css/app.css. */
export const SKIN_PACK = { default: 'sunrise', ocean: 'ocean', forest: 'forest', sunset: 'sunset', candy: 'candy', slate: 'slate', calm: 'calm-mono', bold: 'bold-focus' };
const ID = /^[a-z0-9-]{1,40}$/, HEX = /^#[0-9a-fA-F]{6}$/;
/** The three drawings of every icon, and which one each look uses unless the person chose their own (Settings -> Appearance -> Icon style). */
export const ICON_VARIANTS = ['line', 'duotone', 'filled'];
export const SKIN_ICON = { default: 'duotone', ocean: 'duotone', forest: 'duotone', sunset: 'filled', candy: 'filled', slate: 'line', calm: 'line', bold: 'filled' };
export const iconVariantFor = (setting, skin) => (ICON_VARIANTS.includes(setting) ? setting : SKIN_ICON[Object.hasOwn(SKIN_ICON, skin) ? skin : 'default']);
/** The five moods (1 = worst) as feeling faces. */
export const MOOD_FACES = { 1: 'feel-very-sad', 2: 'feel-sad', 3: 'feel-okay', 4: 'feel-good', 5: 'feel-great' };

/** The file -> { art: { id: { name, svg } }, feelings: {...}, packs: [{ id, k }], dropped } or null. */
export function parseVisualKit(raw) {
  if (!raw || raw.format !== 'sonrise-visual-kit' || raw.version !== 1) return null;
  const out = { art: {}, feelings: {}, ui: {}, features: {}, packs: [], dropped: 0 };
  for (const sec of ['art', 'feelings']) {
    const src = raw[sec] && typeof raw[sec] === 'object' ? raw[sec] : {};
    for (const [id, v] of Object.entries(src).slice(0, 200)) {
      if (!ID.test(id) || !v || typeof v !== 'object' || !checkIconSvg(v.svg)) { out.dropped++; continue; }
      out[sec][id] = { name: { en: cleanText(v.name?.en, 60) || id, he: cleanText(v.name?.he, 60) || id }, svg: v.svg };
    }
  }
  for (const sec of ['ui', 'features']) {   // icons: three variants each, all must pass
    const src = raw[sec] && typeof raw[sec] === 'object' ? raw[sec] : {};
    for (const [id, v] of Object.entries(src).slice(0, 200)) {
      if (!ID.test(id) || !v || typeof v !== 'object' || !v.variants || !ICON_VARIANTS.every((x) => checkIconSvg(v.variants[x]))) { out.dropped++; continue; }
      out[sec][id] = { name: { en: cleanText(v.name?.en, 60) || id, he: cleanText(v.name?.he, 60) || id }, variants: Object.fromEntries(ICON_VARIANTS.map((x) => [x, v.variants[x]])) };
    }
  }
  for (const p of Array.isArray(raw.packs) ? raw.packs.slice(0, 16) : []) {
    const ok = p && ID.test(String(p.id)) && ['light', 'dark'].every((m) => Array.isArray(p.k?.[m]) && p.k[m].length === 8 && p.k[m].every((c) => typeof c === 'string' && HEX.test(c)));
    if (ok) out.packs.push({ id: p.id, k: { light: p.k.light.map((c) => c.toUpperCase()), dark: p.k.dark.map((c) => c.toUpperCase()) } }); else out.dropped++;
  }
  return Object.keys(out.art).length || Object.keys(out.feelings).length || Object.keys(out.ui).length ? out : null;
}

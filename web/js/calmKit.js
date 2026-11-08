// The calm kit (data/calm-kit.json): drawn scenes for the calm corner - one per breathing moment, one storyboard per guided journey, one per
// grounding step and per body-scan zone. Every SVG goes through the same strict allow-list as the icons; a scene that fails is dropped
// and the calm corner falls back to the plain breathing circle. Pure helpers here, drawing in ui/calmScene.js.
import { checkIconSvg } from './avatarKit.js';

const ID = /^[a-z0-9-]{1,48}$/;
const text = (s) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f<>]/g, '').slice(0, 120) : '');
export function parseCalmKit(raw) {
  if (!raw || raw.format !== 'sonrise-calm-kit' || raw.version !== 1 || !raw.scenes || typeof raw.scenes !== 'object') return null;
  const scenes = {};
  for (const [id, v] of Object.entries(raw.scenes).slice(0, 200)) {
    if (!ID.test(id) || !v || typeof v !== 'object' || !checkIconSvg(v.svg)) continue;
    scenes[id] = { svg: v.svg, alt: { en: text(v.alt?.en), he: text(v.alt?.he) } };
  }
  return Object.keys(scenes).length ? scenes : null;
}

/** Breathing frames 0..4 for a pattern: where is the breath (p = 0 empty .. 1 full)? -> two neighbouring frames and how much of the second shows. */
export function frameMix(p, frames = 5) {
  const x = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0)) * (frames - 1), a = Math.min(frames - 2, Math.floor(x));
  return { a, b: a + 1, t: x - a };
}
/** The storyboard frame (1..4) of a guided journey for step `i` of `steps`. */
export const storyFrame = (i, steps) => (steps <= 1 ? 1 : 1 + Math.min(3, Math.floor((Math.max(0, i) / (steps - 1)) * 3.999)));
/** The body-scan zone picture (0..8) for part `i` of `parts` (the quick and the long scans have different lengths). */
export const scanZone = (i, parts) => (parts <= 1 ? 0 : Math.min(8, Math.round((Math.max(0, i) / (parts - 1)) * 8)));

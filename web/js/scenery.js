// The scenery kit (data/scenery.json): avatar frames by level, the time-of-day skies and a few dividers. Every picture goes through the same strict allow-list as the icons.
import { checkIconSvg } from './avatarKit.js';

export const SKIES = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night'];
export function parseScenery(raw) {
  if (!raw || raw.format !== 'sonrise-scenery' || raw.version !== 1) return null;
  const out = { frames: {}, skies: {}, dividers: {} };
  for (const [sec, src] of [['frames', raw.frames], ['skies', raw.skies], ['dividers', raw.dividers]]) if (src && typeof src === 'object') for (const [k, s] of Object.entries(src).slice(0, 30)) if (/^[a-z0-9-]{1,24}$/.test(k) && checkIconSvg(s)) out[sec][k] = s;
  return Object.keys(out.frames).length || Object.keys(out.skies).length ? out : null;
}
/** The sky for a time of day (hour 0-23): dawn 5-8, morning 8-11, noon 11-15, afternoon 15-18, dusk 18-20, else night. */
export const skyAt = (hour) => (hour >= 5 && hour < 8 ? 'dawn' : hour >= 8 && hour < 11 ? 'morning' : hour >= 11 && hour < 15 ? 'noon' : hour >= 15 && hour < 18 ? 'afternoon' : hour >= 18 && hour < 20 ? 'dusk' : 'night');
/** The avatar frame for a level: 1 .. 14, the richer the higher. */
export const frameFor = (level) => Math.min(14, Math.max(1, Math.floor(Number(level)) || 1));

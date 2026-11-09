// Sunny (שמשי), the app's own mascot: a small sun rising over a hill. data/mascot.json holds her moods as drawn pictures (strict allow-list like every kit);
// an avatar of kind "sunny" shows the mood that fits the animation or feeling.
import { checkIconSvg } from './avatarKit.js';

const ID = /^[a-z0-9-]{1,24}$/;
/** Avatar animation / feeling -> the mood picture. */
export const MOOD_OF = { idle: 'idle', wave: 'wave', cheer: 'cheer', dance: 'dance', sleep: 'sleep', alert: 'alert', think: 'think',
  happy: 'cheer', calm: 'calm-breathe', sad: 'sad-comfort', worried: 'sad-comfort', angry: 'alert', tired: 'sleep', excited: 'celebrate', proud: 'proud', none: 'idle' };
export const moodFor = (state) => (typeof state === 'string' && Object.hasOwn(MOOD_OF, state) ? MOOD_OF[state] : 'idle');
export function parseMascot(raw) {
  if (!raw || raw.format !== 'sonrise-mascot' || raw.version !== 1 || !raw.moods || typeof raw.moods !== 'object') return null;
  const moods = {};
  for (const [id, v] of Object.entries(raw.moods).slice(0, 40)) if (ID.test(id) && v && checkIconSvg(v.svg)) moods[id] = v.svg;
  return moods.idle ? moods : null;
}

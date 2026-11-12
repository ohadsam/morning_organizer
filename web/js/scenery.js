// The scenery kit (data/scenery.json): avatar frames by level, the time-of-day skies and a few dividers. Every picture goes through the same strict allow-list as the icons.
import { checkIconSvg } from './avatarKit.js';

export const SKIES = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night'];
export function parseScenery(raw) {
  if (!raw || raw.format !== 'sonrise-scenery' || raw.version !== 1) return null;
  const out = { frames: {}, skies: {}, dividers: {} };
  for (const [sec, src] of [['frames', raw.frames], ['skies', raw.skies], ['dividers', raw.dividers]]) if (src && typeof src === 'object') for (const [k, s] of Object.entries(src).slice(0, 30)) if (/^[a-z0-9-]{1,24}$/.test(k) && checkIconSvg(s)) out[sec][k] = s;
  out.screens = {}; out.tasks = {}; out.badges = {};
  if (raw.badges && typeof raw.badges === 'object') for (const [k, s] of Object.entries(raw.badges).slice(0, 60)) if (/^[a-z0-9-]{1,24}$/.test(k) && checkIconSvg(s)) out.badges[k] = s;
  if (raw.tasks && typeof raw.tasks === 'object') for (const [k, s] of Object.entries(raw.tasks).slice(0, 30)) if (/^[a-z-]{1,16}$/.test(k) && checkIconSvg(s)) out.tasks[k] = s;
  if (raw.screens && typeof raw.screens === 'object') for (const [k, v] of Object.entries(raw.screens).slice(0, 30)) if (/^[a-z0-9-]{1,24}$/.test(k) && v && checkIconSvg(v.p) && checkIconSvg(v.w)) out.screens[k] = { p: v.p, w: v.w };
  return Object.keys(out.frames).length || Object.keys(out.skies).length ? out : null;
}
/** The sky for a time of day (hour 0-23): dawn 5-8, morning 8-11, noon 11-15, afternoon 15-18, dusk 18-20, else night. */
export const skyAt = (hour) => (hour >= 5 && hour < 8 ? 'dawn' : hour >= 8 && hour < 11 ? 'morning' : hour >= 11 && hour < 15 ? 'noon' : hour >= 15 && hour < 18 ? 'afternoon' : hour >= 18 && hour < 20 ? 'dusk' : 'night');
/** The picture behind each screen (a name of the 14 screen backgrounds), or null: none for the run screen (nothing should compete with the timer). */
const SCREEN_ART = { home: 'home-hero', calm: 'calm-corner', feel: 'calm', nlp: 'thinking', stats: 'stats', settings: 'settings', journal: 'journal', retro: 'journal', retros: 'journal' };
export const screenArtFor = (view, simple = false) => (view === 'home' && simple ? 'play' : Object.hasOwn(SCREEN_ART, view) ? SCREEN_ART[view] : null);
/** The avatar frame for a level: 1 .. 14, the richer the higher. */
export const frameFor = (level) => Math.min(14, Math.max(1, Math.floor(Number(level)) || 1));

/** The 14 task silhouettes (id -> words that suggest it, Hebrew and English). */
export const SILS = {
  'wake-up': /wake|get up|stretch|קמ|מתעור|מתמתח/i, 'wash-face': /face|wash|פנים|רחיצ|שטיפ/i, 'brush-teeth': /teeth|tooth|brush|שיני|מברשת/i, 'get-dressed': /dress|cloth|shirt|wear|מתלבש|בגדים|לבוש/i,
  breakfast: /breakfast|eat|cereal|lunch|ארוח|אוכל|אוכלים|ארוחת/i, 'pack-bag': /bag|backpack|pack|תיק|ארוז/i, 'shoes-coat': /shoe|coat|sock|jacket|נעל|מעיל|גרב/i, 'leave-house': /leave|go out|door|יוצאים|יציאה|לצאת|דלת/i,
  homework: /homework|study|desk|שיעורי|לימוד|שולחן/i, 'tidy-up': /tidy|toy|clean up|room|מסדר|צעצוע|ניקיון|סדר/i, shower: /shower|bath|מקלחת|אמבט/i, pyjamas: /pajama|pyjama|פיג/i, read: /read|book|story|קריאה|ספר|סיפור/i, 'go-to-sleep': /sleep|bed|night|lights|שינה|ישנ|מיטה|לילה/i,
};
/** The silhouette that fits a task name, or '' when none does. */
export const suggestSil = (name) => { const s = String(name || ''); for (const [id, re] of Object.entries(SILS)) if (re.test(s)) return id; return ''; };
export const isSil = (id) => typeof id === 'string' && Object.hasOwn(SILS, id);

/** The medals of the kit for some of the achievements (the others keep their emoji). */
export const MEDAL_OF = { first: 'first-routine', streak3: 'streak-3', streak7: 'streak-7', streak30: 'streak-30' };

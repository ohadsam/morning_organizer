// Template library (pure): reusable TASKS and ROUTINES a person saves, plus a built-in catalogue of ready-made ideas.
// Entries are plain data (no ids from outside are trusted); everything that arrives from a backup goes through sanitizeLibrary().
import { cleanText, clamp, uid } from './util.js';
import { isSafePhoto } from './photo.js';
import { suggestIcon } from './taskIcons.js';

export const MAX_ROUTINES = 100, MAX_TASKS = 300, MAX_STEPS = 40;
export const CATS = ['morning', 'evening', 'school', 'home'];
const sec = (v, d = 60) => clamp(Math.round(Number(v)) || d, 1, 86_400);
const day = (d) => (Array.isArray(d) ? [...new Set(d.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort() : []);

export function taskEntry(x, now = Date.now()) {
  return { id: typeof x?.id === 'string' && x.id ? x.id.slice(0, 64) : uid(), name: cleanText(x?.name, 80), icon: cleanText(x?.icon, 8), sec: sec(x?.sec), est: clamp(Math.round(Number(x?.est)) || 0, 0, 86_400),
    photo: isSafePhoto(x?.photo) ? x.photo : '', createdAt: Number.isFinite(Number(x?.createdAt)) ? Number(x.createdAt) : now };
}
export function routineEntry(x, now = Date.now()) {
  return { id: typeof x?.id === 'string' && x.id ? x.id.slice(0, 64) : uid(), name: cleanText(x?.name, 80), icon: cleanText(x?.icon, 8) || '⏰', color: /^#[0-9a-fA-F]{6}$/.test(x?.color) ? x.color : '#6c5ce7',
    tasks: (Array.isArray(x?.tasks) ? x.tasks : []).slice(0, MAX_STEPS).filter((k) => k && cleanText(k.name, 80)).map((k) => ({ name: cleanText(k.name, 80), icon: cleanText(k.icon, 8), sec: sec(k.sec), est: clamp(Math.round(Number(k.est)) || 0, 0, 86_400) })),
    gear: (Array.isArray(x?.gear) ? x.gear : []).slice(0, 20).filter((g) => g && cleanText(g.name, 40)).map((g) => ({ name: cleanText(g.name, 40), icon: cleanText(g.icon, 8), days: day(g.days) })),
    plans: (Array.isArray(x?.plans) ? x.plans : []).slice(0, 5).filter((p) => p && cleanText(p.when, 80) && cleanText(p.then, 80)).map((p) => ({ when: cleanText(p.when, 80), then: cleanText(p.then, 80) })),
    days: day(x?.days), leaveBy: /^\d{2}:\d{2}$/.test(x?.leaveBy || '') ? x.leaveBy : '', createdAt: Number.isFinite(Number(x?.createdAt)) ? Number(x.createdAt) : now };
}
export function sanitizeLibrary(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}, seen = new Set(), uniq = (list, f, max) => list.filter((x) => x && typeof x === 'object').map((x) => f(x)).filter((e) => e.name && !seen.has(e.id) && seen.add(e.id)).slice(0, max);
  return { routines: uniq(Array.isArray(r.routines) ? r.routines : [], routineEntry, MAX_ROUTINES), tasks: uniq(Array.isArray(r.tasks) ? r.tasks : [], taskEntry, MAX_TASKS) };
}
/** Union by id (a newer createdAt wins); used when a backup is merged in. */
export function mergeLibrary(a, b) {
  const pick = (x, y, max) => { const m = new Map(x.map((e) => [e.id, e])); for (const e of y) if (!m.has(e.id) || m.get(e.id).createdAt < e.createdAt) m.set(e.id, e); return [...m.values()].slice(0, max); };
  return { routines: pick(a.routines, b.routines, MAX_ROUTINES), tasks: pick(a.tasks, b.tasks, MAX_TASKS) };
}
/** Saving the same name again updates that entry instead of piling up copies. */
export function upsert(list, entry, max) {
  const i = list.findIndex((e) => e.name.trim().toLowerCase() === entry.name.trim().toLowerCase());
  if (i >= 0) { const copy = [...list]; copy[i] = { ...entry, id: list[i].id }; return copy; }
  return [...list, entry].slice(-max);
}
export const fromTemplate = (tpl) => routineEntry({ ...tpl, id: uid(), gear: tpl.gear, createdAt: Date.now() });
export const fromTask = (task) => taskEntry({ ...task, id: uid(), createdAt: Date.now() });
export const stepsSec = (e) => e.tasks.reduce((s, k) => s + k.sec, 0);

/** Ready-made ideas. `key` is an i18n key; durations in seconds. */
export const IDEA_TASKS = [
  ['s_wake', 'morning', 120], ['t_water', 'morning', 60], ['s_bath', 'morning', 240], ['s_shower', 'morning', 480], ['s_dress', 'morning', 300], ['t_bed', 'morning', 120], ['s_eat', 'morning', 900], ['t_vitamins', 'morning', 30], ['t_pet', 'morning', 120], ['t_packlunch', 'morning', 180], ['s_coffee', 'morning', 600], ['s_shoes', 'morning', 120], ['s_bag', 'morning', 180], ['s_plan', 'morning', 300],
  ['s_clothes', 'evening', 180], ['s_bagprep', 'evening', 180], ['s_tidy', 'evening', 300], ['s_pajamas', 'evening', 180], ['s_teeth', 'evening', 180], ['s_story', 'evening', 600], ['s_good3', 'evening', 180], ['s_breathe', 'evening', 120], ['s_lights', 'evening', 60],
  ['s_unpack', 'school', 180], ['s_hands', 'school', 120], ['s_snack', 'school', 600], ['s_lunch', 'school', 1200], ['s_homework', 'school', 1500], ['s_read', 'school', 900], ['t_practice', 'school', 900],
  ['t_room', 'home', 600], ['t_trash', 'home', 120], ['t_table', 'home', 180], ['t_dishes', 'home', 300], ['t_stretch', 'home', 180], ['t_walk', 'home', 900], ['s_play', 'home', 1800],
].map(([key, cat, s]) => ({ key, cat, sec: s }));
/** The sample routines double as built-in templates (fixed ids so a merge never duplicates them). */
export const IDEA_ROUTINES = [
  { id: 'sample-kids', nameKey: 'sample1', icon: '🎒', color: '#0984e3', basic: true, items: [['s_wake', 2], ['s_bath', 4], ['s_dress', 5], ['s_eat', 15], ['s_bag', 3], ['s_shoes', 2]] },
  { id: 'sample-adult', nameKey: 'sample2', icon: '🌅', color: '#e17055', basic: true, items: [['s_shower', 8], ['s_dress', 5], ['s_coffee', 10], ['s_plan', 5]] },
  { id: 'sample-bedtime', nameKey: 'sample3', icon: '🌙', color: '#6c5ce7', items: [['s_tidy', 5], ['s_pajamas', 3], ['s_teeth', 3], ['s_story', 10], ['s_lights', 1]] },
  { id: 'sample-homework', nameKey: 'sample4', icon: '📚', color: '#00b894', items: [['s_hands', 2], ['s_snack', 10], ['s_homework', 25], ['s_read', 15], ['s_bagprep', 3]] },
  { id: 'sample-evening', nameKey: 'sample6', icon: '🌃', color: '#341f97', items: [['s_clothes', 3], ['s_bagprep', 3], ['s_good3', 3], ['s_teeth', 3], ['s_breathe', 2]] },
  { id: 'sample-afterschool', nameKey: 'sample5', icon: '🏠', color: '#e84393', items: [['s_unpack', 3], ['s_hands', 2], ['s_lunch', 20], ['s_play', 30]] },
];
export const ideaIcon = (name) => suggestIcon(name);

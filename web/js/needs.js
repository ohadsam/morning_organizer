// "What do you need the app for?" (pure): a person (or a parent) picks a way of working (a model such as CBT or Cog-Fun) and/or the difficulty
// (attention, anxiety, organising, motivation), and the app then shows ONLY what fits - fewer buttons, less to take in. Everything else stays one tap
// away: "Show everything" in Settings brings the full app back at any time, and another choice replaces this one.
//
// Features that can be hidden (ids used by the toolbar, search, run screen and suggestions). Routines, running them, alarms, templates, the wizard,
// settings, the guide and search are core and never hidden.

export const MODELS = ['full', 'cbt', 'cogfun', 'nlp'];
export const PROBLEMS = ['adhd', 'anxiety', 'organize', 'motivation'];
export const FEATURES = ['goals', 'retros', 'calm', 'journal', 'aprt', 'rewards', 'stats', 'reports', 'smart', 'family', 'nlp', 'feel'];
export const CORE = ['alarms', 'library', 'wizard'];

const MODEL_SET = {
  cbt: ['feel', 'calm', 'journal', 'aprt', 'goals', 'retros', 'stats'],              // thoughts, feelings, behaviour: calm corner, situation log, thought records, goals
  nlp: ['feel', 'nlp', 'goals', 'calm', 'journal', 'retros', 'stats'],              // clear outcomes, reframing, an anchor, precise words, other points of view, mental rehearsal
  cogfun: ['feel', 'goals', 'retros', 'stats', 'reports', 'smart'],                  // goal - plan - do - check, looking back, smart times and steps
};
const PROBLEM_SET = {
  adhd: ['feel', 'goals', 'calm', 'rewards', 'smart', 'stats'],
  anxiety: ['feel', 'calm', 'journal', 'aprt', 'stats'],
  organize: ['feel', 'goals', 'smart', 'stats', 'retros', 'reports'],
  motivation: ['feel', 'rewards', 'goals', 'stats'],
};
/** The help areas (see focus.js) that each choice turns on, so the run screen's helpers follow as well. */
const AREAS = { adhd: ['focus', 'time'], anxiety: ['calm'], organize: ['time', 'memory'], motivation: ['motivation', 'habits'] };
const MODEL_AREAS = { cbt: ['calm'], cogfun: ['time', 'memory'], nlp: ['calm', 'motivation'] };

/** Whatever is stored or received: only known values. */
export function sanitizeView(v) {
  const o = v && typeof v === 'object' ? v : {};
  return { model: MODELS.includes(o.model) ? o.model : 'full', problems: [...new Set((Array.isArray(o.problems) ? o.problems : []).filter((x) => typeof x === 'string' && PROBLEMS.includes(x)))] };
}
export const isFull = (view) => { const s = sanitizeView(view); return s.model === 'full' && !s.problems.length; };
/** The set of feature ids that stay visible, or null = everything. */
export function visibleSet(view) {
  const s = sanitizeView(view); if (isFull(s)) return null;
  const out = new Set(CORE); if (s.model !== 'full') MODEL_SET[s.model].forEach((x) => out.add(x)); s.problems.forEach((p) => PROBLEM_SET[p].forEach((x) => out.add(x)));
  return out;
}
export const shows = (view, id) => { const set = visibleSet(view); return !set || set.has(id) || CORE.includes(id); };
/** Help areas to switch on for this choice ([] when everything is shown). */
export function areasFor(view) {
  const s = sanitizeView(view); if (isFull(s)) return [];
  return [...new Set([...(MODEL_AREAS[s.model] || []), ...s.problems.flatMap((p) => AREAS[p])])];
}
/** Which choices a person of this age is usually helped by (a gentle default, never forced). */
export const suggestedFor = (age) => (Number(age) > 0 && Number(age) <= 11 ? { model: 'full', problems: ['adhd'] } : { model: 'full', problems: [] });
/** A short, readable label key list for the summary line: ['need_cbt', 'need_adhd', ...]. */
export function labelKeys(view) { const s = sanitizeView(view); return isFull(s) ? ['need_full'] : [...(s.model !== 'full' ? [`need_${s.model}`] : []), ...s.problems.map((p) => `need_${p}`)]; }

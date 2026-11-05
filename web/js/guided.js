// Guided setup (pure): turns a few simple answers into a routine that fits the person - sensible times for the age and the help they need,
// plus short calm / focus breaks. No UI and no storage here, so it is easy to test.
import { smartTimes, suggestInterstitials, applyInterstitials } from './smart.js';

/** What the person says would help -> the app's help areas (see focus.js). */
export const NEEDS = { adhd: ['focus'], organize: ['time', 'memory'], anxiety: ['calm'], motivation: ['motivation', 'habits'], simple: [] };
export const NEED_IDS = Object.keys(NEEDS);
/** Which ready-made routine each kind starts from. */
export const KIND_ROUTINE = { morning: 'sample-kids', adult: 'sample-adult', bedtime: 'sample-bedtime', homework: 'sample-homework', afterschool: 'sample-afterschool', evening: 'sample-evening' };
export const KINDS = Object.keys(KIND_ROUTINE);
/** [representative age, label]. */
export const AGE_CHOICES = [[6, '5–7'], [9, '8–10'], [12, '11–13'], [15, '14–17'], [30, '18+']];
export const START_TIMES = { morning: '07:00', adult: '06:45', bedtime: '20:00', homework: '16:00', afterschool: '14:30', evening: '21:00' };

export const areasOf = (needs) => [...new Set((Array.isArray(needs) ? needs : []).flatMap((n) => (Object.hasOwn(NEEDS, n) ? NEEDS[n] : [])))];

/**
 * The tasks for the routine. entry: library-shaped { tasks: [{ name, icon, sec, est }] }.
 * Times keep the ready-made baseline and apply the age and help multipliers (or the person's own history when there is some).
 * -> { tasks: [{ id, name, icon, photo, sec, est, helper?, helperKey? }], areas, totalSec, added }
 */
export function buildTasks({ entry, age = null, needs = [], withBreaks = true, runs = [], defaultSec = 300, tr, newId }) {
  const areas = areasOf(needs), base = (entry?.tasks || []).map((k) => ({ name: k.name, icon: k.icon || '', sec: k.sec, est: k.est || 0 }));
  const sug = smartTimes(base, { runs, age, areas, defaultSec });
  const timed = base.map((k, i) => {
    const s = sug[i], sec = s.source === 'history' ? s.sec : Math.round((k.sec * s.ageFactor * (1 + s.supportPct / 100)) / 15) * 15;
    return { id: newId(), name: k.name, icon: k.icon, photo: '', sec: Math.max(15, Math.min(7200, sec || k.sec)), est: 0 };
  });
  let tasks = timed, added = 0;
  if (withBreaks && areas.length) {
    const chosen = suggestInterstitials(timed, { areas, age });
    tasks = applyInterstitials(timed, chosen, tr, newId); added = chosen.length;
  }
  return { tasks, areas, totalSec: tasks.reduce((s, k) => s + k.sec, 0), added };
}

/** Which strategies (see cogfun.js) a person's chosen help suggests when a goal is created from the wizard. */
export const NEED_STRATEGIES = { adhd: ['quiet', 'first'], organize: ['checklist', 'gear', 'timer'], anxiety: [], motivation: ['first', 'buddy'], simple: ['checklist'] };
export const strategiesFor = (needs) => [...new Set((Array.isArray(needs) ? needs : []).flatMap((n) => (Object.hasOwn(NEED_STRATEGIES, n) ? NEED_STRATEGIES[n] : [])))].slice(0, 3);
/** And the other way round: which help (needs) a goal's strategies belong to, from their domain (time/planning/memory/organize -> organizing, attention -> focus). */
export function needsFromStrategies(strategyIds, domainOf) {
  const out = new Set(); for (const id of Array.isArray(strategyIds) ? strategyIds : []) out.add(domainOf(id) === 'attention' ? 'adhd' : 'organize');
  return out.size ? [...out] : ['simple'];
}
/** A goal's strategy as a routine step: [i18n key, icon, seconds]. */
const STRATEGY_STEP = { timer: ['gs_timer', '⏱️', 30], buddy: ['gs_buddy', '🤝', 30], visual: ['gs_visual', '👀', 30], tidy: ['gs_tidy', '🧺', 60], place: ['gs_tidy', '🧺', 60], one: ['gs_tidy', '🧺', 60],
  first: ['sx_pickone', '🎯', 60], checklist: ['sx_gear', '✅', 60], gear: ['sx_gear', '✅', 60], say: ['sx_say', '🗣️', 60], quiet: ['sx_clear', '🧹', 60], phone: ['sx_clear', '🧹', 60], backplan: ['sx_clock', '🕒', 30], estimate: ['sx_clock', '🕒', 30] };
/** The steps a goal adds at the start of the routine (never the same step twice). -> [{ key, icon, sec, afterIndex: -1, helper: '' }] */
export function goalSteps(strategyIds) {
  const seen = new Set(), out = [];
  for (const id of Array.isArray(strategyIds) ? strategyIds : []) { const s = Object.hasOwn(STRATEGY_STEP, id) ? STRATEGY_STEP[id] : null; if (s && !seen.has(s[0])) { seen.add(s[0]); out.push({ key: s[0], icon: s[1], sec: s[2], afterIndex: -1, helper: '' }); } }
  return out;
}
/** The routine's tasks from the answers AND an optional goal: base steps, the goal's steps first, then calm / focus breaks. Same shape as buildTasks. */
export function buildGoalTasks({ entry, age = null, needs = [], withBreaks = true, runs = [], defaultSec = 300, tr, newId, strategies = [] }) {
  const base = buildTasks({ entry, age, needs, withBreaks: false, runs, defaultSec, tr, newId });
  let tasks = base.tasks, added = 0;
  const gs = goalSteps(strategies); if (gs.length) { tasks = applyInterstitials(tasks, gs, tr, newId); added += gs.length; }
  if (withBreaks && base.areas.length) { const chosen = suggestInterstitials(tasks, { areas: base.areas, age }); tasks = applyInterstitials(tasks, chosen, tr, newId); added += chosen.length; }
  return { tasks, areas: base.areas, totalSec: tasks.reduce((s, k) => s + k.sec, 0), added };
}

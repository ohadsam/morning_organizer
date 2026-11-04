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

// "Goal - Plan - Do - Check" (pure). Inspired by the metacognitive, goal-based approach of the Cog-Fun intervention (Hebrew University, occupational
// therapy): pick a personally meaningful goal, choose strategies that fit, try them in real life, then check what worked. This is a self-help
// tool, not a treatment, and it does not replace working with a professional.
import { cleanText, clamp, uid } from './util.js';

export const DOMAINS = ['time', 'planning', 'memory', 'attention', 'organize'];
export const STRATEGIES = [
  ['estimate', 'time'], ['timer', 'time'], ['backplan', 'time'], ['buffer', 'time'],
  ['steps', 'planning'], ['night', 'planning'], ['first', 'planning'], ['checklist', 'planning'],
  ['visual', 'memory'], ['say', 'memory'], ['gear', 'memory'], ['ifthen', 'memory'],
  ['quiet', 'attention'], ['sprint', 'attention'], ['phone', 'attention'], ['buddy', 'attention'],
  ['place', 'organize'], ['one', 'organize'], ['tidy', 'organize'],
].map(([id, domain]) => ({ id, domain }));
export const MAX_GOALS = 5, MAX_STRATS = 3, MAX_CHECKS = 30, CHECK_EVERY_MS = 7 * 86_400_000;
const ids = new Set(STRATEGIES.map((s) => s.id));

export function sanitizeGoal(g) {
  return { id: typeof g?.id === 'string' && g.id ? g.id.slice(0, 64) : uid(), title: cleanText(g?.title, 80), templateId: typeof g?.templateId === 'string' ? g.templateId.slice(0, 64) : '',
    strategies: [...new Set((Array.isArray(g?.strategies) ? g.strategies : []).filter((x) => typeof x === 'string' && ids.has(x)))].slice(0, MAX_STRATS), custom: cleanText(g?.custom, 120),
    from: cleanText(g?.from, 30), since: Math.max(0, Math.round(Number(g?.since)) || Date.now()), done: g?.done === true, doneAt: Math.max(0, Math.round(Number(g?.doneAt)) || 0),
    checks: (Array.isArray(g?.checks) ? g.checks : []).slice(-MAX_CHECKS).filter((c) => c && typeof c === 'object').map((c) => ({ at: Math.max(0, Math.round(Number(c.at)) || 0), rating: clamp(Math.round(Number(c.rating)) || 3, 1, 5), note: cleanText(c.note, 200), used: [...new Set((Array.isArray(c.used) ? c.used : []).filter((x) => typeof x === 'string' && ids.has(x)))].slice(0, MAX_STRATS) })) };
}
export const sanitizeGoals = (list) => (Array.isArray(list) ? list : []).filter((x) => x && typeof x === 'object').map(sanitizeGoal).filter((g) => g.title).slice(0, MAX_GOALS);

/** How is it going? Finished runs of the linked routine since the goal began + the person's own check-in ratings. */
export function progress(goal, runs) {
  const rs = goal.templateId ? runs.filter((r) => r.templateId === goal.templateId && r.endedAt && r.startedAt >= goal.since) : [];
  const onTime = rs.filter((r) => r.actualTotal <= r.plannedTotal).length, rate = goal.checks.map((c) => c.rating);
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  return { runs: rs.length, onTime, onTimeRate: rs.length ? onTime / rs.length : 0, checks: goal.checks.length, avgRating: avg(rate), lastRating: rate.at(-1) ?? 0,
    trend: rate.length >= 4 ? Math.round((avg(rate.slice(-2)) - avg(rate.slice(0, 2))) * 10) / 10 : 0 };
}
/** Which of the goal's strategies went with better check-ins? [{ id, n, avg }] best first (strategies ticked as "I used it" in check-ins). */
export function strategyStats(goal) {
  return goal.strategies.map((id) => { const rs = goal.checks.filter((c) => c.used?.includes(id)).map((c) => c.rating); return { id, n: rs.length, avg: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0 }; }).filter((x) => x.n).sort((a, b) => b.avg - a.avg || b.n - a.n);
}
export const PARENT_QUESTIONS = 8;
/** A guiding question for a parent to ask instead of telling (changes daily; `shift` gives the next one). Keys pq1..pq8. */
export const parentQuestion = (now = Date.now(), shift = 0) => `pq${((Math.floor(now / 86_400_000) + shift) % PARENT_QUESTIONS) + 1}`;
/** A gentle prompt: an open goal with no check-in for a week (and at least a day old). */
export const needsCheck = (goal, now = Date.now()) => !goal.done && now - goal.since > 86_400_000 && now - (goal.checks.at(-1)?.at ?? goal.since) > CHECK_EVERY_MS;
export const strategiesOf = (goal) => goal.strategies;

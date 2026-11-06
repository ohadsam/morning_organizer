// Points for a routine (pure). Off by default. Two ways to get a task's base points: automatic (from its planned time) or set by the person per task.
// Finishing EARLY adds a bonus, finishing LATE takes some away - never below 0 for that task, never in the calm pace, and the penalty can be switched off.
// A task can carry an award (medal, coin, trophy...) that is won by finishing it before its time, which also doubles its points.
import { clamp } from './util.js';

export const MODES = ['off', 'auto', 'custom'];
export const AWARDS = ['medal', 'coin', 'trophy', 'star', 'gem', 'crown'];
export const AWARD_EMOJI = { medal: '🏅', coin: '🪙', trophy: '🏆', star: '⭐', gem: '💎', crown: '👑' };
export const isAward = (a) => AWARDS.includes(a);
export const MAX_PTS = 100;

/** Automatic base points: about one point per 30 seconds, at least 5 and at most 30. */
export const autoBase = (plannedSec) => clamp(Math.round((Number(plannedSec) || 0) / 30), 5, 30);
export const baseOf = (task, mode) => (mode === 'custom' && Number(task?.pts) > 0 ? clamp(Math.round(Number(task.pts)), 1, MAX_PTS) : autoBase(task?.plannedSec ?? task?.sec));

/** One finished task. opts: { mode, penalty (default true), calm }. */
export function scoreTask(task, { mode = 'auto', penalty = true, calm = false } = {}) {
  const zero = { base: 0, bonus: 0, penalty: 0, total: 0, award: '', early: false, late: false };
  if (!task || !task.done || task.skipped || mode === 'off') return zero;
  const base = baseOf(task, mode), planned = Math.max(1, (task.plannedSec || 0) + (task.extraSec || 0)), actual = Math.max(0, task.actualSec || 0);
  const early = actual <= planned * 0.9, late = actual > planned * 1.1;
  let bonus = early ? Math.round(base * 0.5 * clamp((planned - actual) / planned, 0, 1)) : 0;
  const award = isAward(task.award) && actual < planned ? task.award : '';
  if (award) bonus += base;                                         // the special bonus
  const pen = late && penalty && !calm ? Math.round(base * 0.5 * clamp((actual - planned) / planned, 0, 1)) : 0;
  return { base, bonus, penalty: pen, total: Math.max(0, base + bonus - pen), award, early, late: late && penalty && !calm };
}
/** A whole run -> the record stored on it. */
export function scoreRun(run, { mode = 'auto', penalty = true } = {}) {
  if (mode === 'off' || !run) return null;
  const calm = run.mode === 'calm', tasks = (run.tasks || []).map((tk) => scoreTask(tk, { mode, penalty, calm }));
  const sum = (k) => tasks.reduce((s, x) => s + x[k], 0);
  return { mode, total: sum('total'), base: sum('base'), bonus: sum('bonus'), penalty: sum('penalty'), awards: tasks.map((x, i) => (x.award ? { i, award: x.award } : null)).filter(Boolean).slice(0, 40), tasks: tasks.map((x) => x.total).slice(0, 60) };
}
/** Whatever is read back from storage or a backup. */
export function sanitizeScore(s) {
  if (!s || typeof s !== 'object') return null;
  const n = (v, max = 1e6) => clamp(Math.round(Number(v)) || 0, 0, max);
  return { mode: s.mode === 'custom' ? 'custom' : 'auto', total: n(s.total), base: n(s.base), bonus: n(s.bonus), penalty: n(s.penalty),
    awards: (Array.isArray(s.awards) ? s.awards : []).filter((a) => a && isAward(a.award)).slice(0, 40).map((a) => ({ i: n(a.i, 99), award: a.award })), tasks: (Array.isArray(s.tasks) ? s.tasks : []).slice(0, 60).map((v) => n(v, 1e4)) };
}

const scored = (runs) => (runs || []).filter((r) => r && r.score && Number.isFinite(r.score.total) && r.endedAt);
/** The top three scores of this routine (the run just finished included), and where this run stands. */
export function podium(runs, current) {
  const list = scored([...(runs || []).filter((r) => r.id !== current?.id), current]).filter((r) => r.templateId === current?.templateId)
    .sort((a, b) => b.score.total - a.score.total || b.endedAt - a.endedAt);
  const rank = list.findIndex((r) => r.id === current?.id) + 1;
  return { places: list.slice(0, 3).map((r) => ({ id: r.id, total: r.score.total, at: r.endedAt, current: r.id === current?.id })), rank: rank || null, count: list.length };
}
/** Oldest first: [{ id, at, total, cumulative, name }]. */
export function series(runs) {
  let cum = 0; return scored(runs).sort((a, b) => a.endedAt - b.endedAt).map((r) => { cum += r.score.total; return { id: r.id, at: r.endedAt, total: r.score.total, cumulative: cum, name: r.templateName }; });
}
export const totalPoints = (runs) => scored(runs).reduce((s, r) => s + r.score.total, 0);
/** Awards collected over time: { medal: 3, trophy: 1 }. */
export function awardCounts(runs) { const o = {}; for (const r of scored(runs)) for (const a of r.score.awards || []) o[a.award] = (o[a.award] || 0) + 1; return o; }

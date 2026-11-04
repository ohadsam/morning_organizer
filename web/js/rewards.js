// Reward goals + child reports (pure). A goal = { title, emoji, target, since }: stars earned after `since` count toward it.
import { stars } from './stats.js';
import { cleanText, clamp } from './util.js';
import { sanitizeAvatar, shareableAvatar } from './avatar.js';

/** Goals: mode 'stars' = stars earned since `since`; mode 'week' = routines finished within the plan during the current calendar week. */
export function sanitizeGoal(g) {
  if (!g || typeof g !== 'object') return null;
  const target = Math.round(Number(g.target)); if (!Number.isFinite(target) || target < 1) return null;
  const mode = g.mode === 'week' ? 'week' : 'stars';
  return { title: cleanText(g.title, 40) || '⭐', emoji: cleanText(g.emoji, 8) || '🎁', target: clamp(target, 1, mode === 'week' ? 21 : 999), since: Math.max(0, Math.round(Number(g.since)) || 0), given: !!g.given, mode };
}
export const weekStart = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); };
export function rewardProgress(goal, runs, now = Date.now()) {
  if (!goal) return null;
  const have = goal.mode === 'week'
    ? runs.filter((r) => r.status === 'done' && r.actualTotal <= r.plannedTotal && r.endedAt >= weekStart(now)).length
    : runs.filter((r) => r.endedAt >= goal.since).reduce((s, r) => s + stars(r), 0);
  return { have, target: goal.target, pct: Math.min(1, have / goal.target), reached: have >= goal.target };
}
/** What a child phone tells the parent: totals, streak (computed by caller), the last runs and the run in progress. */
/** Plain-language weekly digest for the parent (last 7 days): the steps that run over most, and the interruptions that came up most. */
export function weeklyDigest(runs, now = Date.now()) {
  const rs = runs.filter((r) => r.endedAt && r.endedAt >= now - 7 * 86_400_000), over = new Map(), unp = new Map();
  for (const r of rs) {
    for (const k of r.tasks || []) if (k.done && k.name) { const e = over.get(k.name) ?? { name: k.name, sum: 0, n: 0 }; e.sum += k.actualSec - k.plannedSec; e.n++; over.set(k.name, e); }
    for (const u of r.unplanned || []) { const e = unp.get(u.key) ?? { key: u.key, label: u.label, emoji: u.emoji, n: 0 }; e.n++; unp.set(u.key, e); }
  }
  const hardM = new Map(); for (const r of rs) for (const k of r.tasks || []) if (k.difficulty >= 1 && k.name) { const e = hardM.get(k.name) ?? { name: k.name, sum: 0, n: 0 }; e.sum += k.difficulty; e.n++; hardM.set(k.name, e); }
  return { hard: [...hardM.values()].filter((e) => e.n >= 2 && e.sum / e.n >= 3.5).map((e) => ({ name: e.name, avg: Math.round((e.sum / e.n) * 10) / 10 })).sort((a, b) => b.avg - a.avg).slice(0, 2),
    slow: [...over.values()].filter((e) => e.n >= 2 && e.sum / e.n >= 30).map((e) => ({ name: e.name, overSec: Math.round(e.sum / e.n) })).sort((a, b) => b.overSec - a.overSec).slice(0, 2),
    unp: [...unp.values()].filter((e) => e.n >= 2).sort((a, b) => b.n - a.n).slice(0, 2).map((e) => ({ key: e.key, label: e.label, emoji: e.emoji, n: e.n })) };
}
export function buildReport({ profile, runs, streakDays, totalStars, active, goal }) {
  const recent = [...runs].sort((a, b) => b.endedAt - a.endedAt).slice(0, 20).map((r) => ({ id: r.id, name: r.templateName, icon: r.icon, startedAt: r.startedAt, endedAt: r.endedAt, status: r.status, planned: r.plannedTotal, actual: r.actualTotal, stars: stars(r) }));
  return { profile, totalStars, streakDays, recent, digest: weeklyDigest(runs), active: active || null, goalHave: goal ? rewardProgress(goal, runs).have : 0, at: Date.now() };
}
/** Receiver side: keep only known fields with sane types/ranges. */
export function sanitizeReport(r) {
  if (!r || typeof r !== 'object') return null;
  const n = (v, max = 1e7) => clamp(Math.round(Number(v)) || 0, 0, max), str = (v, m) => cleanText(v, m);
  const p = r.profile || {};
  return {
    profile: { name: str(p.name, 30), age: Number.isFinite(Number(p.age)) ? clamp(Math.round(Number(p.age)), 0, 120) : null, gender: ['female', 'male', 'other'].includes(p.gender) ? p.gender : 'other', mascot: str(p.mascot, 8), avatar: shareableAvatar(sanitizeAvatar(p.avatar)) },
    totalStars: n(r.totalStars, 1e6), streakDays: n(r.streakDays, 5000), goalHave: n(r.goalHave, 1e6), at: n(r.at, 1e14),
    recent: (Array.isArray(r.recent) ? r.recent : []).slice(0, 20).map((x) => ({ id: str(x?.id, 64), name: str(x?.name, 80), icon: str(x?.icon, 8), startedAt: n(x?.startedAt, 1e14), endedAt: n(x?.endedAt, 1e14), status: x?.status === 'done' ? 'done' : 'stopped', planned: n(x?.planned), actual: n(x?.actual), stars: n(x?.stars, 3) })),
    digest: { hard: (Array.isArray(r.digest?.hard) ? r.digest.hard : []).slice(0, 2).map((x) => ({ name: str(x?.name, 80), avg: clamp(Number(x?.avg) || 0, 0, 5) })), slow: (Array.isArray(r.digest?.slow) ? r.digest.slow : []).slice(0, 2).map((x) => ({ name: str(x?.name, 80), overSec: n(x?.overSec, 86_400) })), unp: (Array.isArray(r.digest?.unp) ? r.digest.unp : []).slice(0, 2).map((x) => ({ key: str(x?.key, 30), label: str(x?.label, 30), emoji: str(x?.emoji, 8), n: n(x?.n, 999) })) },
    active: r.active && typeof r.active === 'object' ? { name: str(r.active.name, 80), icon: str(r.active.icon, 8), task: str(r.active.task, 80), pct: clamp(Number(r.active.pct) || 0, 0, 1), paused: !!r.active.paused } : null,
  };
}

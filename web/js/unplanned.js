// Unplanned interruptions (pure): reasons, recurring-pattern detection and what to do about a pattern (add it to the routine, or look closer).
import { cleanText, clamp } from './util.js';

export const REASONS = [{ key: 'toilet', emoji: '🚽' }, { key: 'spill', emoji: '🥛' }, { key: 'forgot', emoji: '🎒' }, { key: 'call', emoji: '📞' }, { key: 'sibling', emoji: '👧' }, { key: 'unwell', emoji: '🤒' }, { key: 'lost', emoji: '🔎' }, { key: 'other', emoji: '⚡' }];
export const MAX_PER_RUN = 30;
export const reasonEmoji = (key) => REASONS.find((r) => r.key === key)?.emoji ?? '⚡';
/** Same wording -> same key (case/spaces/punctuation ignored), so "Toilet!" and "toilet" count as one reason. */
export const customKey = (label) => `c:${String(label ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 24)}`;

export function sanitizeUnplanned(list) {
  return (Array.isArray(list) ? list : []).filter((x) => x && typeof x === 'object' && cleanText(x.key, 30)).slice(0, MAX_PER_RUN).map((x) => ({
    key: cleanText(x.key, 30), label: cleanText(x.label, 30), emoji: cleanText(x.emoji, 8) || '⚡', sec: clamp(Math.round(Number(x.sec)) || 0, 0, 86_400),
    at: Math.max(0, Math.round(Number(x.at)) || 0), task: cleanText(x.task, 80) }));
}

export const MIN_RUNS = 4, WINDOW = 12, MIN_HITS = 3, MIN_RATE = 0.4;
const finished = (runs, templateId) => runs.filter((r) => r.templateId === templateId && r.endedAt).sort((a, b) => a.startedAt - b.startedAt);
const mode = (arr) => { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''; };

/** Per reason, over the last WINDOW finished runs of a routine. `recurring`: in >= 3 runs and >= 40% of them (needs >= 4 runs). */
export function patterns(runs, templateId) {
  const rs = finished(runs, templateId).slice(-WINDOW), out = new Map();
  rs.forEach((r) => {
    const seen = new Set();
    for (const u of r.unplanned || []) {
      const e = out.get(u.key) ?? { key: u.key, label: u.label, emoji: u.emoji, hits: 0, count: 0, totalSec: 0, tasks: [], lastAt: 0 };
      e.count++; e.totalSec += u.sec; e.tasks.push(u.task); e.lastAt = Math.max(e.lastAt, u.at); if (!seen.has(u.key)) { e.hits++; seen.add(u.key); }
      out.set(u.key, e);
    }
  });
  return [...out.values()].map((e) => ({ ...e, runs: rs.length, rate: rs.length ? e.hits / rs.length : 0, avgSec: Math.round(e.totalSec / e.count), task: mode(e.tasks.filter(Boolean)),
    recurring: rs.length >= MIN_RUNS && e.hits >= MIN_HITS && e.hits / rs.length >= MIN_RATE, suggestSec: Math.max(60, Math.ceil(e.totalSec / e.count / 60) * 60) })).sort((a, b) => b.hits - a.hits || b.totalSec - a.totalSec);
}
export const recurring = (runs, templateId) => patterns(runs, templateId).filter((p) => p.recurring);

/** Overall numbers for the Stats card: how many, how long, by reason. */
export function totals(runs) {
  const by = new Map(); let count = 0, sec = 0, withAny = 0;
  for (const r of runs.filter((x) => x.endedAt)) {
    const l = r.unplanned || []; if (l.length) withAny++;
    for (const u of l) { count++; sec += u.sec; const e = by.get(u.key) ?? { key: u.key, label: u.label, emoji: u.emoji, count: 0, sec: 0 }; e.count++; e.sec += u.sec; by.set(u.key, e); }
  }
  return { count, sec, runsWith: withAny, runs: runs.filter((x) => x.endedAt).length, by: [...by.values()].sort((a, b) => b.count - a.count || b.sec - a.sec) };
}
/** After "look closer": how often did it happen before vs after the person started watching? */
export function compareSince(runs, templateId, key, since) {
  const rs = finished(runs, templateId), part = (list) => ({ runs: list.length, hits: list.filter((r) => (r.unplanned || []).some((u) => u.key === key)).length });
  return { before: part(rs.filter((r) => r.startedAt < since).slice(-WINDOW)), after: part(rs.filter((r) => r.startedAt >= since)) };
}
/** A copy of the routine with the interruption added as a real task, right after the task where it usually happens. */
export function withTask(tpl, p) {
  const at = tpl.tasks.findIndex((t) => t.name === p.task), idx = at >= 0 ? at + 1 : tpl.tasks.length;
  const task = { id: `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: cleanText(p.label, 40), icon: p.emoji, photo: '', sec: clamp(p.suggestSec, 30, 3600), est: 0 };
  return { ...tpl, tasks: [...tpl.tasks.slice(0, idx), task, ...tpl.tasks.slice(idx)], updatedAt: Date.now() };
}
export function sanitizeWatch(list) {
  return (Array.isArray(list) ? list : []).filter((x) => x && typeof x === 'object' && typeof x.templateId === 'string' && cleanText(x.key, 30)).slice(0, 20).map((x) => ({
    id: cleanText(x.id, 64) || `w${Math.random().toString(36).slice(2, 10)}`, templateId: x.templateId.slice(0, 64), key: cleanText(x.key, 30), label: cleanText(x.label, 30), emoji: cleanText(x.emoji, 8) || '⚡',
    since: Math.max(0, Math.round(Number(x.since)) || 0), why: cleanText(x.why, 500), idea: cleanText(x.idea, 500), before: cleanText(x.before, 500) }));
}

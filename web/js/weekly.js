// Weekly report, activity heat-map and CSV export (pure).
import { stars } from './stats.js';

const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const addDays = (ms, n) => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };
const finishedRuns = (runs) => runs.filter((r) => r.endedAt && (r.status === 'done' || r.status === 'stopped'));

/** Grid of `weeks` calendar weeks (Sunday first, the current week last). cell: { key, ms, count, stars, future }. */
export function heatmap(runs, nowMs, weeks = 5) {
  const today = startOfDay(nowMs), dow = new Date(today).getDay();
  const first = addDays(today, -dow - (weeks - 1) * 7), by = new Map();
  for (const r of finishedRuns(runs)) { const k = dayKey(r.endedAt); const c = by.get(k) ?? { count: 0, stars: 0 }; c.count++; c.stars += stars(r); by.set(k, c); }
  return Array.from({ length: weeks * 7 }, (_, i) => { const ms = addDays(first, i), k = dayKey(ms), c = by.get(k); return { key: k, ms, count: c?.count ?? 0, stars: c?.stars ?? 0, future: ms > today }; });
}

/** The last 7 days (today included) vs the 7 before. */
export function weeklyReport(runs, nowMs) {
  const today = startOfDay(nowMs), from = addDays(today, -6), prevFrom = addDays(today, -13), end = addDays(today, 1);
  const all = finishedRuns(runs), inRange = (a, b) => all.filter((r) => r.endedAt >= a && r.endedAt < b);
  const sum = (rs) => ({ runs: rs.length, done: rs.filter((r) => r.status === 'done').length, stars: rs.reduce((s, r) => s + stars(r), 0), onTime: rs.filter((r) => r.status === 'done' && r.actualTotal <= r.plannedTotal).length,
    avgActualSec: rs.length ? Math.round(rs.reduce((s, r) => s + r.actualTotal, 0) / rs.length) : 0 });
  const cur = inRange(from, end), prev = inRange(prevFrom, from), days = [];
  for (let i = 0; i < 7; i++) { const a = addDays(from, i), rs = cur.filter((r) => r.endedAt >= a && r.endedAt < addDays(a, 1)); days.push({ key: dayKey(a), ms: a, count: rs.length, stars: rs.reduce((s, r) => s + stars(r), 0) }); }
  const c = sum(cur), p = sum(prev);
  return { days, ...c, prev: p, deltaAvgSec: c.runs && p.runs ? c.avgActualSec - p.avgActualSec : null, activeDays: days.filter((d) => d.count).length };
}

// A spreadsheet treats a cell starting with = + - @ as a formula: neutralise it (names are user-controlled).
const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(runs) {
  const head = ['date', 'start', 'end', 'routine', 'status', 'planned_sec', 'estimated_sec', 'actual_sec', 'paused_sec', 'stars', 'tasks_done', 'tasks_total'];
  const iso = (ms) => new Date(ms).toISOString();
  const rows = [...finishedRuns(runs)].sort((a, b) => a.startedAt - b.startedAt).map((r) => [dayKey(r.startedAt), iso(r.startedAt), iso(r.endedAt), r.templateName, r.status, r.plannedTotal, r.estTotal, r.actualTotal,
    Math.round((r.pausedMs || 0) / 1000), stars(r), r.tasks.filter((x) => x.done).length, r.tasks.length]);
  return `﻿${[head, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`; // BOM so Excel reads Hebrew correctly
}

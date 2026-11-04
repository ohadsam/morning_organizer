// The shareable report (pure): one model for "this run" or "a period" (all routines or one), used by the on-screen report, the PDF and the e-mail text.
// Numbers only - the UI turns insight keys into sentences in the person's language.
import * as ST from './stats.js';
import { heatmap } from './weekly.js';
import { moodStats } from './mood.js';
import * as U from './unplanned.js';
import * as D from './difficulty.js';
import { progress as goalProgress } from './cogfun.js';

const DAY = 86_400_000, avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const done = (runs) => runs.filter((r) => r.endedAt);

/** scope: { kind: 'period', days: 7|30|90|0 (all), templateId?: string } | { kind: 'run', runId }. */
export function buildReport({ runs, templates = [], goals = [], profile = {}, scope = { kind: 'period', days: 30 }, now = Date.now() }) {
  if (scope.kind === 'run') return runReport(runs, scope.runId, profile, now);
  const from = scope.days ? now - scope.days * DAY : 0;
  const rs = done(runs).filter((r) => r.endedAt >= from && (!scope.templateId || r.templateId === scope.templateId)).sort((a, b) => a.startedAt - b.startedAt);
  const tpl = scope.templateId ? templates.find((x) => x.id === scope.templateId) : null;
  const tot = ST.totals(rs), dif = D.summary(rs), unp = U.totals(rs), mood = moodStats(rs), hard = D.taskDifficulty(rs);
  const byRoutine = [...new Map(rs.map((r) => [r.templateId, r.templateName])).entries()].map(([id, name]) => {
    const list = rs.filter((r) => r.templateId === id), d = D.summary(list);
    return { id, name, icon: list.at(-1).icon, runs: list.length, onTimeRate: list.filter((r) => r.actualTotal <= r.plannedTotal).length / list.length, avgActualSec: Math.round(avg(list.map((r) => r.actualTotal))), avgPlannedSec: Math.round(avg(list.map((r) => r.plannedTotal))), avgDifficulty: d.avg, unplanned: list.reduce((s, r) => s + (r.unplanned || []).length, 0) };
  }).sort((a, b) => b.runs - a.runs);
  const taskRows = (() => { const m = new Map(); for (const r of rs) for (const k of r.tasks) { if (!k.done || !k.name) continue; const e = m.get(k.name) ?? { name: k.name, icon: k.icon, n: 0, actual: 0, planned: 0 }; e.n++; e.actual += k.actualSec; e.planned += k.plannedSec; m.set(k.name, e); }
    return [...m.values()].map((e) => { const h = hard.find((x) => x.name === e.name); return { name: e.name, icon: e.icon, n: e.n, avgActualSec: Math.round(e.actual / e.n), avgPlannedSec: Math.round(e.planned / e.n), avgDifficulty: h?.avg ?? 0, hardShare: h?.hardShare ?? 0, helps: h?.helps ?? 0 }; }).sort((a, b) => (b.avgActualSec - b.avgPlannedSec) - (a.avgActualSec - a.avgPlannedSec)); })();
  const half = Math.floor(rs.length / 2), first = rs.slice(0, half), last = rs.slice(half), rate = (l) => (l.length ? l.filter((r) => r.actualTotal <= r.plannedTotal).length / l.length : 0);
  const insights = [];
  if (rs.length >= 4 && Math.abs(rate(last) - rate(first)) >= 0.15) insights.push({ key: rate(last) > rate(first) ? 'rpOnTimeUp' : 'rpOnTimeDown', p: { a: Math.round(rate(first) * 100), b: Math.round(rate(last) * 100) } });
  const slow = taskRows.find((x) => x.avgActualSec - x.avgPlannedSec >= 30 && x.n >= 2); if (slow) insights.push({ key: 'rpSlowTask', p: { name: slow.name, sec: slow.avgActualSec - slow.avgPlannedSec } });
  const spots = D.hardSpots(hard); if (spots[0]) insights.push({ key: 'rpHardTask', p: { name: spots[0].name, avg: Math.round(spots[0].avg * 10) / 10 } });
  const hs = D.hardAndSlow(hard)[0]; if (hs) insights.push({ key: 'rpHardSlow', p: { name: hs.name } });
  if (dif.help.relax + dif.help.thought + dif.help.note > 0) insights.push({ key: 'rpHelpUsed', p: { n: dif.help.relax + dif.help.thought + dif.help.note } });
  if (unp.by[0]) insights.push({ key: 'rpUnplanned', p: { name: unp.by[0].label, n: unp.by[0].count } });
  if (mood.insight) insights.push({ key: mood.insight.type === 'happyFaster' ? 'rpMoodFaster' : 'rpMoodSlower', p: { pct: mood.insight.pct } });
  const patterns = scope.templateId ? U.recurring(rs, scope.templateId) : byRoutine.flatMap((r) => U.recurring(rs, r.id));
  if (patterns[0]) insights.push({ key: 'rpPattern', p: { name: patterns[0].label, hits: patterns[0].hits, runs: patterns[0].runs } });
  return {
    kind: 'period', title: tpl ? tpl.name : null, icon: tpl?.icon || '', days: scope.days, from: rs[0]?.startedAt ?? from, to: now, person: profile.name || '', age: profile.age ?? null, empty: !rs.length,
    kpis: { runs: tot.count, onTime: tot.onTime, onTimeRate: tot.count ? tot.onTime / tot.count : 0, avgActualSec: Math.round(tot.avgActual), bestSec: tot.best, stars: ST.totalStars(rs), unplannedCount: unp.count, unplannedSec: unp.sec, avgDifficulty: dif.avg, avgMood: mood.avg },
    series: ST.series(rs), byRoutine, tasks: taskRows.slice(0, 15), hardTasks: hard.slice(0, 8), difficulty: dif, unplanned: unp, mood, heat: heatmap(rs, now, 5), insights,
    goals: goals.map((g) => ({ title: g.title, done: g.done, ...goalProgress(g, rs) })),
  };
}

function runReport(runs, runId, profile, now) {
  const r = runs.find((x) => x.id === runId); if (!r) return { kind: 'run', empty: true, title: '', tasks: [], insights: [], now };
  const tasks = r.tasks.map((k) => ({ name: k.name, icon: k.icon, done: k.done, skipped: k.skipped, plannedSec: k.plannedSec, actualSec: k.actualSec, difficulty: k.difficulty || 0, help: k.help || { note: 0, thought: 0, relax: 0 } }));
  const dif = D.runDifficulty(r), unp = r.unplanned || [], over = r.actualTotal - r.plannedTotal, insights = [];
  insights.push({ key: over <= 0 ? 'rpRunOnTime' : 'rpRunOver', p: { sec: Math.abs(over) } });
  const worst = tasks.filter((k) => k.done).sort((a, b) => (b.actualSec - b.plannedSec) - (a.actualSec - a.plannedSec))[0]; if (worst && worst.actualSec - worst.plannedSec >= 30) insights.push({ key: 'rpRunSlowest', p: { name: worst.name, sec: worst.actualSec - worst.plannedSec } });
  if (dif.hardest && dif.hardest.difficulty >= 4) insights.push({ key: 'rpRunHardest', p: { name: dif.hardest.name } });
  if (unp.length) insights.push({ key: 'rpRunUnplanned', p: { n: unp.length, sec: unp.reduce((s, x) => s + x.sec, 0) } });
  const used = tasks.reduce((s, k) => s + k.help.note + k.help.thought + k.help.relax, 0); if (used) insights.push({ key: 'rpHelpUsed', p: { n: used } });
  return { kind: 'run', empty: false, title: r.templateName, icon: r.icon, person: profile.name || '', age: profile.age ?? null, startedAt: r.startedAt, endedAt: r.endedAt, status: r.status, mood: r.mood || 0,
    kpis: { plannedSec: r.plannedTotal, actualSec: r.actualTotal, deltaSec: over, wallSec: Math.round((r.endedAt - r.startedAt) / 1000), pausedSec: Math.round((r.pausedMs || 0) / 1000), stars: ST.stars(r), unplannedCount: unp.length, unplannedSec: unp.reduce((s, x) => s + x.sec, 0), avgDifficulty: dif.avg, done: r.tasks.filter((k) => k.done).length, total: r.tasks.length },
    tasks, unplanned: unp, insights, now };
}

/** Plain-text summary used for the e-mail body / share text. `t` is the i18n function, `fmt(sec)` formats durations. */
export function reportText(m, t, fmt) {
  const lines = [];
  if (m.kind === 'run') {
    lines.push(`${m.icon} ${m.title}`, `${t('planned')}: ${fmt(m.kpis.plannedSec)} · ${t('actual')}: ${fmt(m.kpis.actualSec)} · ${m.kpis.deltaSec > 0 ? '+' : ''}${fmt(Math.abs(m.kpis.deltaSec))}`, `${t('tasksDone')}: ${m.kpis.done}/${m.kpis.total} · ⭐ ${m.kpis.stars}`);
    if (m.kpis.unplannedCount) lines.push(`⚡ ${t('unpTotal')}: ${fmt(m.kpis.unplannedSec)} (${m.kpis.unplannedCount}×)`);
    for (const k of m.tasks) lines.push(`${k.icon || '•'} ${k.name}: ${fmt(k.actualSec)}/${fmt(k.plannedSec)}${k.difficulty ? ` · ${'●'.repeat(k.difficulty)}` : ''}`);
  } else {
    lines.push(`${m.icon} ${m.title || t('rpAllRoutines')}`, `${t('rpRuns')}: ${m.kpis.runs} · ${t('rpOnTime')}: ${m.kpis.onTime} (${Math.round(m.kpis.onTimeRate * 100)}%) · ⭐ ${m.kpis.stars}`);
    if (m.kpis.avgDifficulty) lines.push(`${t('rpAvgDifficulty')}: ${(Math.round(m.kpis.avgDifficulty * 10) / 10)}/5`);
  }
  for (const i of m.insights) lines.push(`💡 ${t(i.key, { ...i.p, sec: i.p.sec != null ? fmt(i.p.sec) : '' })}`);
  return lines.join('\n');
}

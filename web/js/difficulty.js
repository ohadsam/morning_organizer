// How hard did tasks feel? (pure) Icons for the rating and the statistics that show where the difficulties are and where help was used.
export const LEVELS = [{ v: 1, emoji: '🪶' }, { v: 2, emoji: '🙂' }, { v: 3, emoji: '😐' }, { v: 4, emoji: '😓' }, { v: 5, emoji: '🥵' }];
export const levelEmoji = (v) => LEVELS.find((l) => l.v === v)?.emoji ?? '';
const finishedRuns = (runs) => runs.filter((r) => r.endedAt);

/** Per task name (across routines or for one routine): how often rated, average difficulty, hard share, usual overrun, helpers used. Rated tasks only. */
export function taskDifficulty(runs, templateId = null) {
  const m = new Map();
  for (const r of finishedRuns(runs)) {
    if (templateId && r.templateId !== templateId) continue;
    for (const k of r.tasks || []) {
      if (!k.name) continue;
      const e = m.get(k.name) ?? { name: k.name, icon: k.icon, rated: 0, sum: 0, hard: 0, seen: 0, over: 0, notes: 0, thoughts: 0, relax: 0 };
      e.seen++; e.over += k.actualSec - k.plannedSec; e.notes += k.help?.note || 0; e.thoughts += k.help?.thought || 0; e.relax += k.help?.relax || 0;
      if (k.difficulty >= 1) { e.rated++; e.sum += k.difficulty; if (k.difficulty >= 4) e.hard++; }
      m.set(k.name, e);
    }
  }
  return [...m.values()].filter((e) => e.rated).map((e) => ({ ...e, avg: e.sum / e.rated, hardShare: e.hard / e.rated, avgOverSec: Math.round(e.over / e.seen), helps: e.notes + e.thoughts + e.relax }))
    .sort((a, b) => b.avg - a.avg || b.rated - a.rated);
}
/** Where to look first: tasks rated at least twice, average >= 3.5 (or hard in half the runs). */
export const hardSpots = (stats) => stats.filter((e) => e.rated >= 2 && (e.avg >= 3.5 || e.hardShare >= 0.5)).slice(0, 5);
/** Hard tasks that were also slow (they run over by 30 s+): the best candidates for splitting or giving more time. */
export const hardAndSlow = (stats) => hardSpots(stats).filter((e) => e.avgOverSec >= 30);

/** Overall: how many ratings, average, share of hard, helper usage totals, and per-routine averages (for the Stats card and the report). */
export function summary(runs) {
  const rs = finishedRuns(runs); let rated = 0, sum = 0, hard = 0; const help = { note: 0, thought: 0, relax: 0 }, by = new Map(), series = [];
  for (const r of rs) {
    let rr = 0, rs2 = 0;
    for (const k of r.tasks || []) {
      help.note += k.help?.note || 0; help.thought += k.help?.thought || 0; help.relax += k.help?.relax || 0;
      if (k.difficulty >= 1) { rated++; sum += k.difficulty; if (k.difficulty >= 4) hard++; rr++; rs2 += k.difficulty; }
    }
    if (rr) { series.push({ t: r.startedAt, avg: rs2 / rr, name: r.templateName }); const e = by.get(r.templateId) ?? { id: r.templateId, name: r.templateName, icon: r.icon, rated: 0, sum: 0 }; e.rated += rr; e.sum += rs2; by.set(r.templateId, e); }
  }
  return { rated, avg: rated ? sum / rated : 0, hard, hardShare: rated ? hard / rated : 0, help, series: series.sort((a, b) => a.t - b.t), byRoutine: [...by.values()].map((e) => ({ ...e, avg: e.sum / e.rated })).sort((a, b) => b.avg - a.avg) };
}
/** One run: rated tasks in order with their difficulty, and the hardest one. */
export function runDifficulty(run) {
  const rated = (run.tasks || []).filter((k) => k.difficulty >= 1);
  return { rated: rated.length, avg: rated.length ? rated.reduce((s, k) => s + k.difficulty, 0) / rated.length : 0, hardest: rated.slice().sort((a, b) => b.difficulty - a.difficulty)[0] ?? null };
}

/**
 * How each task's difficulty changed over time (oldest -> newest rating). Tasks rated in at least `min` runs only.
 * -> [{ name, icon, points: [1..5], first, last, delta, trend: 'easier' | 'harder' | 'steady' }], the biggest change first.
 */
export function difficultyTrends(runs, templateId = null, min = 3) {
  const m = new Map();
  for (const r of [...finishedRuns(runs)].sort((a, b) => (a.endedAt || 0) - (b.endedAt || 0))) {
    if (templateId && r.templateId !== templateId) continue;
    for (const k of r.tasks || []) { if (!k.name || !(k.difficulty >= 1)) continue; const e = m.get(k.name) ?? { name: k.name, icon: k.icon, points: [] }; e.points.push(k.difficulty); m.set(k.name, e); }
  }
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  return [...m.values()].filter((e) => e.points.length >= min).slice(0).map((e) => {
    const half = Math.max(1, Math.floor(e.points.length / 2)), first = avg(e.points.slice(0, half)), last = avg(e.points.slice(-half)), delta = Math.round((last - first) * 10) / 10;
    return { ...e, points: e.points.slice(-12), first, last, delta, trend: delta <= -0.7 ? 'easier' : delta >= 0.7 ? 'harder' : 'steady' };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

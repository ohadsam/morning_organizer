// Statistics + insights over finished runs. Pure functions; no DOM, no storage.
const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const roundTo = (sec, step) => Math.max(step, Math.round(sec / step) * step);

export const finished = (runs, templateId) =>
  runs.filter((r) => (!templateId || r.templateId === templateId) && r.endedAt && r.status !== 'running' && r.status !== 'paused')
    .sort((a, b) => a.startedAt - b.startedAt);

/** One point per run for the over-time chart. */
export function series(runs) {
  return runs.map((r) => ({ t: r.startedAt, id: r.id, actual: r.actualTotal, planned: r.plannedTotal, est: r.estTotal, status: r.status }));
}

/** Per-task aggregates keyed by task id, over the most recent `window` runs that actually did the task. */
export function taskStats(runs, window = 5) {
  const by = new Map();
  for (const r of runs) for (const t of r.tasks) {
    if (!t.done) continue; // skipped / never-done tasks would distort the average
    const e = by.get(t.id) ?? { id: t.id, name: t.name, samples: [], planned: [], est: [] };
    e.name = t.name; e.samples.push(t.actualSec); e.planned.push(t.plannedSec); e.est.push(t.estSec);
    by.set(t.id, e);
  }
  return [...by.values()].map((e) => {
    const recent = e.samples.slice(-window);
    return { id: e.id, name: e.name, runs: e.samples.length, avgActual: avg(recent), medActual: median(recent),
      plannedNow: e.planned.at(-1), estNow: e.est.at(-1), best: Math.min(...e.samples), worst: Math.max(...e.samples) };
  });
}

/**
 * Insights - structured (type + params) so the UI localises them. Needs >= minRuns finished runs.
 * Goal stated by the user: keep the TOTAL time frame while rebalancing the per-task frames, so every
 * suggestion carries its time delta and a final `balance` insight reports the net effect.
 */
export function insights(runs, { minRuns = 3, step = 30 } = {}) {
  const out = [];
  if (runs.length < minRuns) return [{ type: 'needMore', need: minRuns - runs.length }];
  const stats = taskStats(runs);
  let net = 0;
  for (const s of stats) {
    if (s.runs < minRuns || !s.plannedNow) continue;
    const ratio = s.medActual / s.plannedNow;
    if (ratio <= 0.75 && s.plannedNow > step) {
      const to = roundTo(s.medActual * 1.1, step);
      if (to < s.plannedNow) { out.push({ type: 'shorten', taskId: s.id, name: s.name, from: s.plannedNow, to, typical: Math.round(s.medActual) }); net += to - s.plannedNow; }
    } else if (ratio >= 1.15) {
      const to = roundTo(s.medActual * 1.05, step);
      if (to > s.plannedNow) { out.push({ type: 'extend', taskId: s.id, name: s.name, from: s.plannedNow, to, typical: Math.round(s.medActual) }); net += to - s.plannedNow; }
    }
  }
  if (out.length) out.push({ type: 'balance', netSec: net });
  const a = avg(runs.slice(0, 3).map((r) => r.actualTotal)), b = avg(runs.slice(-3).map((r) => r.actualTotal));
  if (runs.length >= 4 && Math.abs(b - a) >= 30) out.push({ type: b < a ? 'faster' : 'slower', deltaSec: Math.round(Math.abs(b - a)) });
  const last = runs.at(-1);
  if (last.plannedTotal && last.actualTotal <= last.plannedTotal) out.push({ type: 'onTime' });
  const slow = [...stats].filter((s) => s.runs >= minRuns).sort((x, y) => (y.medActual - y.plannedNow) - (x.medActual - x.plannedNow))[0];
  if (slow && slow.medActual - slow.plannedNow >= step) out.push({ type: 'biggestOverrun', taskId: slow.id, name: slow.name, overSec: Math.round(slow.medActual - slow.plannedNow) });
  return out;
}

/** Overall numbers for the stats header. */
export function totals(runs) {
  return { count: runs.length, avgActual: avg(runs.map((r) => r.actualTotal)), best: runs.length ? Math.min(...runs.map((r) => r.actualTotal)) : 0,
    onTime: runs.filter((r) => r.actualTotal <= r.plannedTotal).length };
}

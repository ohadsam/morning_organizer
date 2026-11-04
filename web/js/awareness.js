// Self-awareness (pure), a core idea of goal-based approaches such as Cog-Fun: "how close are my own guesses to what really happens?"
// A guess is a task estimate the person typed on purpose (run task `guess`), or - for older runs - an estimate that differs from the plan.
const isGuess = (k) => k.done && k.actualSec > 0 && (k.guess === true || (k.guess === undefined && k.estSec > 0 && k.estSec !== k.plannedSec));
const acc = (k) => 1 - Math.min(1, Math.abs(k.estSec - k.actualSec) / Math.max(1, k.actualSec));

/** -> { n, avg (0-1), bias: 'short'|'long'|'close', series: [{ t, acc }], trend (percentage points, last half vs first half; 0 until 4+ runs) } */
export function estimateAccuracy(runs, templateId = null) {
  const rs = runs.filter((r) => r.endedAt && (!templateId || r.templateId === templateId)).sort((a, b) => a.startedAt - b.startedAt), series = []; let n = 0, sum = 0, signed = 0;
  for (const r of rs) {
    const g = (r.tasks || []).filter(isGuess); if (!g.length) continue;
    const a = g.reduce((s, k) => s + acc(k), 0) / g.length; series.push({ t: r.startedAt, acc: a });
    n += g.length; sum += g.reduce((s, k) => s + acc(k), 0); signed += g.reduce((s, k) => s + (k.estSec - k.actualSec) / Math.max(1, k.actualSec), 0);
  }
  const half = Math.floor(series.length / 2), mean = (l) => (l.length ? l.reduce((s, x) => s + x.acc, 0) / l.length : 0), bias = n ? signed / n : 0;
  return { n, avg: n ? sum / n : 0, bias: bias < -0.12 ? 'short' : bias > 0.12 ? 'long' : 'close', series, trend: series.length >= 4 ? Math.round((mean(series.slice(half)) - mean(series.slice(0, half))) * 100) : 0 };
}

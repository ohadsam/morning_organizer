// Mood check-ins (pure): five faces after a routine, and what they say about time.
export const MOODS = [{ v: 1, emoji: '😞' }, { v: 2, emoji: '🙁' }, { v: 3, emoji: '😐' }, { v: 4, emoji: '🙂' }, { v: 5, emoji: '😄' }];
export const sanitizeMood = (m) => { const n = Math.round(Number(m)); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null; };
export const moodEmoji = (m) => MOODS.find((x) => x.v === m)?.emoji ?? '';
/** Finished runs that have a mood, oldest first. */
const rated = (runs) => runs.filter((r) => r.endedAt && sanitizeMood(r.mood) !== null).sort((a, b) => a.startedAt - b.startedAt);
export function moodStats(runs) {
  const rs = rated(runs); if (!rs.length) return { n: 0, avg: 0, points: [], byMood: {}, insight: null };
  const byMood = {}; for (const r of rs) { const e = (byMood[r.mood] ??= { n: 0, ratio: 0 }); e.n++; e.ratio += r.plannedTotal ? r.actualTotal / r.plannedTotal : 1; }
  for (const e of Object.values(byMood)) e.avgRatio = e.ratio / e.n;
  const high = rs.filter((r) => r.mood >= 4), low = rs.filter((r) => r.mood <= 2), avgR = (a) => a.reduce((s, r) => s + (r.plannedTotal ? r.actualTotal / r.plannedTotal : 1), 0) / a.length;
  let insight = null;
  if (high.length >= 3 && low.length >= 3) { const d = avgR(low) - avgR(high); if (Math.abs(d) >= 0.08) insight = { type: d > 0 ? 'happyFaster' : 'happySlower', pct: Math.round(Math.abs(d) * 100) }; }
  return { n: rs.length, avg: rs.reduce((s, r) => s + r.mood, 0) / rs.length, points: rs.map((r) => ({ t: r.startedAt, mood: r.mood })), byMood, insight };
}

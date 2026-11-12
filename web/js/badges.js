// Achievement badges (pure): computed from a person's finished runs, nothing to store except which ones were already celebrated.
import { stars, streak } from './stats.js';
import { dayKey } from './weekly.js';

const DAY = 86_400_000;
/** Longest run of consecutive days with at least one finished (completed) routine. */
export function bestStreak(runs) {
  const days = [...new Set(runs.filter((r) => r.status === 'done' && r.endedAt).map((r) => { const d = new Date(r.endedAt); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }))].sort((a, b) => a - b);
  let best = 0, cur = 0, prev = null;
  for (const d of days) { cur = prev !== null && d - prev === DAY ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
  return best;
}
function maxActiveDaysInAWeek(runs) {
  const days = [...new Set(runs.filter((r) => r.status === 'done' && r.endedAt).map((r) => { const d = new Date(r.endedAt); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }))].sort((a, b) => a - b);
  let best = 0; for (let i = 0; i < days.length; i++) { let n = 0; for (let j = i; j < days.length && days[j] < days[i] + 7 * DAY; j++) n++; best = Math.max(best, n); }
  return best;
}
export function context(runs, extra = {}) {
  const done = runs.filter((r) => r.status === 'done' && r.endedAt).sort((a, b) => a.endedAt - b.endedAt);
  let comeback = false; for (let i = 1; i < done.length; i++) if (done[i].endedAt - done[i - 1].endedAt >= 3 * DAY) comeback = true;
  return { done: done.length, stars: runs.reduce((s, r) => s + stars(r), 0), best: bestStreak(runs), week: maxActiveDaysInAWeek(runs), comeback,
    onTime: done.filter((r) => r.actualTotal <= r.plannedTotal).length, threeStar: done.filter((r) => stars(r) === 3).length,
    feel: extra.feel || 0, retro: extra.retro || 0, backup: !!extra.backup,
    early: done.some((r) => new Date(r.startedAt).getHours() < 7), speedy: done.some((r) => r.plannedTotal >= 300 && r.actualTotal <= r.plannedTotal * 0.8) };
}
export const BADGES = [
  { id: 'first', emoji: '🌱', ok: (c) => c.done >= 1 }, { id: 'five', emoji: '🖐️', ok: (c) => c.done >= 5 }, { id: 'twentyfive', emoji: '🏅', ok: (c) => c.done >= 25 },
  { id: 'streak3', emoji: '🔥', ok: (c) => c.best >= 3 }, { id: 'streak7', emoji: '🌟', ok: (c) => c.best >= 7 }, { id: 'streak30', emoji: '👑', ok: (c) => c.best >= 30 },
  { id: 'ontime5', emoji: '⏱️', ok: (c) => c.onTime >= 5 }, { id: 'perfect3', emoji: '⭐', ok: (c) => c.threeStar >= 3 }, { id: 'earlybird', emoji: '🐦', ok: (c) => c.early },
  { id: 'speedy', emoji: '⚡', ok: (c) => c.speedy }, { id: 'comeback', emoji: '💪', ok: (c) => c.comeback }, { id: 'weekwarrior', emoji: '🛡️', ok: (c) => c.week >= 5 },
  { id: 'streak14', emoji: '🔥', ok: (c) => c.best >= 14 }, { id: 'firstfeel', emoji: '🙂', ok: (c) => c.feel >= 1 }, { id: 'firstlook', emoji: '🔍', ok: (c) => c.retro >= 1 }, { id: 'firstbackup', emoji: '💾', ok: (c) => c.backup },
  { id: 'stars50', emoji: '✨', ok: (c) => c.stars >= 50 }, { id: 'stars200', emoji: '💎', ok: (c) => c.stars >= 200 },
];
export const earnedBadges = (runs, extra) => { const c = context(runs, extra); return BADGES.filter((b) => b.ok(c)).map((b) => b.id); };
export const newBadges = (earned, seen) => earned.filter((id) => !(seen || []).includes(id));
export { streak, dayKey };

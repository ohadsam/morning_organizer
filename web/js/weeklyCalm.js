// The calm weekly summary (pure): what the person did last week (Sunday to Saturday), said kindly - counts, days, on-time runs and the average face,
// never a comparison with others and never a "you failed". Shown once a week on Home, until closed.
import { stars as runStars } from './stats.js';

export const DAY = 86_400_000;
/** { from, to } epoch ms of the week before the one `now` is in (weeks start on Sunday, local time). */
export function previousWeek(now = Date.now()) {
  const d = new Date(now); d.setHours(0, 0, 0, 0); const start = d.getTime() - d.getDay() * DAY;
  return { from: start - 7 * DAY, to: start, key: new Date(start).toISOString().slice(0, 10) };
}
/** key of the week `now` is in (its Sunday), to remember "already shown". */
export const weekKey = (now = Date.now()) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return new Date(d.getTime() - d.getDay() * DAY).toISOString().slice(0, 10); };
export function weekSummary(runs, feelings, now = Date.now()) {
  const { from, to } = previousWeek(now), done = (runs || []).filter((r) => r.endedAt && r.endedAt >= from && r.endedAt < to && r.status === 'done');
  const days = new Set(done.map((r) => new Date(r.endedAt).toDateString())).size, fs = (feelings || []).filter((f) => f.at >= from && f.at < to);
  return { runs: done.length, days, stars: done.reduce((s, r) => s + runStars(r), 0), onTime: done.filter((r) => r.actualTotal <= r.plannedTotal).length,
    feelN: fs.length, feelAvg: fs.length ? fs.reduce((s, f) => s + f.mood, 0) / fs.length : null };
}
/** Is there something kind to say? (a week with nothing in it is simply skipped, no empty "you did nothing" card). */
export const worthShowing = (s) => s.runs > 0 || s.feelN > 0;

export const BACKUP_DAYS = 30;
/** Enough to lose (10 runs or 3 own routines), no backup for a month, and not snoozed. */
export function needsBackupReminder(runs, ownRoutines, lastBackupMs, snoozeUntilMs, now = Date.now()) {
  if (runs < 10 && ownRoutines < 3) return false; if (snoozeUntilMs && now < snoozeUntilMs) return false;
  return !lastBackupMs || now - lastBackupMs > BACKUP_DAYS * 86_400_000;
}

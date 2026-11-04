// "Pause all alarms" (pure): one switch that quiets every routine alarm for today, for a week, or until the person switches it back on.
// Stored as a number in settings: 0 = not paused, -1 = until switched back on, otherwise the time (ms) it ends.
export const PAUSE_CHOICES = ['today', 'week', 'forever'];
export const MAX_PAUSE = 4_102_444_800_000;   // year 2100: a sanity bound for stored values
export const cleanPause = (v) => { const n = Number(v); return n === -1 ? -1 : Number.isFinite(n) && n > 0 && n <= MAX_PAUSE ? Math.round(n) : 0; };
/** The pause that is still in force at `now` (an expired one counts as none). */
export const activePause = (v, now = Date.now()) => { const p = cleanPause(v); return p === -1 || p > now ? p : 0; };
export const isPaused = (v, now = Date.now()) => activePause(v, now) !== 0;
/** The value to store for a choice. 'today' = until the end of today (local time), 'week' = 7 days from now. */
export function pauseFor(choice, now = new Date()) {
  if (choice === 'forever') return -1;
  if (choice === 'week') return now.getTime() + 7 * 86_400_000;
  if (choice === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime();
  return 0;
}

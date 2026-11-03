// "Leave by" support (pure): will the routine finish before it's time to go, and when should it start?
const toMin = (hhmm) => { const m = /^(\d{2}):(\d{2})$/.exec(hhmm || ''); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; };
export const validLeaveBy = (v) => (toMin(v) === null ? '' : v);

/** Epoch ms of the leave time on the run's day (a time long before the start means "tomorrow"). */
export function leaveAtMs(leaveBy, startedAt) {
  const mins = toMin(leaveBy); if (mins === null) return null;
  const d = new Date(startedAt); d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  let t = d.getTime(); if (t < startedAt - 3600_000) t += 86_400_000;
  return t;
}
/** { leaveAt, marginSec } - positive margin = spare time, negative = late. `etaMs` = expected finish (engine.etaMs). */
export function leaveStatus(leaveBy, startedAt, etaMs) {
  const leaveAt = leaveAtMs(leaveBy, startedAt); if (leaveAt === null) return null;
  return { leaveAt, marginSec: Math.round((leaveAt - etaMs) / 1000) };
}
/** "HH:MM" to start so that a routine of totalSec ends at leaveBy (rounded down to stepMin, plus bufferMin of slack). */
export function suggestStart(leaveBy, totalSec, { stepMin = 5, bufferMin = 0 } = {}) {
  const mins = toMin(leaveBy); if (mins === null) return null;
  const start = Math.floor((mins - Math.ceil(totalSec / 60) - bufferMin) / stepMin) * stepMin;
  const wrapped = ((start % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}
/** One-shot announcements while running. `memo` ({soon:Set, now:false}) is mutated. -> 'leaveSoon' | 'leaveNow' | null */
export function leaveEvent(leaveAt, now, memo) {
  if (leaveAt === null) return null;
  const left = (leaveAt - now) / 1000;
  if (left <= 0 && !memo.now) { memo.now = true; return 'leaveNow'; }
  for (const mark of [300, 600]) if (left <= mark && left > 0 && !memo.soon.has(mark)) { memo.soon.add(mark); if (mark === 600 && left <= 300) continue; return 'leaveSoon'; }
  return null;
}
export const newLeaveMemo = () => ({ soon: new Set(), now: false });

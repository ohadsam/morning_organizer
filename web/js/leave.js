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

// The sound of "leave soon" and "leave now", in the style of the way the person works (pure data; audio.js plays it): [frequency Hz, offset s, duration s].
const CUES = {
  default: { leaveSoon: { beeps: [[784, 0, 0.15]], vib: [120] }, leaveNow: { beeps: [[784, 0, 0.15], [988, 0.25, 0.3]], vib: [150, 80, 250] } },
  anxiety: { leaveSoon: { beeps: [[523, 0, 0.5], [659, 0.55, 0.6]], vib: [80] }, leaveNow: { beeps: [[523, 0, 0.5], [659, 0.55, 0.5], [784, 1.1, 0.8]], vib: [100, 80, 100] } },   // soft, slow, never sharp
  adhd: { leaveSoon: { beeps: [[988, 0, 0.1], [988, 0.18, 0.1]], vib: [100, 60, 100] }, leaveNow: { beeps: [[988, 0, 0.12], [988, 0.2, 0.12], [1318, 0.4, 0.3]], vib: [200, 80, 200, 80, 300] } },   // short and clear: it cuts through
  cbt: { leaveSoon: { beeps: [[880, 0, 0.25]], vib: [100] }, leaveNow: { beeps: [[880, 0, 0.25], [1175, 0.35, 0.4]], vib: [150, 100, 200] } },   // a calm neutral chime
  cogfun: { leaveSoon: { beeps: [[659, 0, 0.12], [784, 0.14, 0.12]], vib: [100] }, leaveNow: { beeps: [[659, 0, 0.12], [784, 0.14, 0.12], [988, 0.28, 0.12], [1318, 0.42, 0.3]], vib: [120, 60, 120, 60, 240] } },   // a playful rising run
  nlp: { leaveSoon: { beeps: [[1046, 0, 0.9]], vib: [100] }, leaveNow: { beeps: [[1046, 0, 0.9], [1568, 0.02, 0.6], [1046, 1.2, 1]], vib: [150, 100, 250] } },   // a soft bell
};
/** The style of the cue for a person's "what the app is for" choice: a difficulty (anxiety, then attention) first, then the way of working. */
export function cueStyle(view) {
  const problems = Array.isArray(view?.problems) ? view.problems : [];
  if (problems.includes('anxiety')) return 'anxiety'; if (problems.includes('adhd')) return 'adhd';
  return ['cbt', 'cogfun', 'nlp'].includes(view?.model) ? view.model : 'default';
}
/** { beeps, vib } for 'leaveSoon' | 'leaveNow', or null. */
export const leaveCuePattern = (event, view) => CUES[cueStyle(view)]?.[event] ?? null;

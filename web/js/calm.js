// Guided calm exercises (pure): breathing patterns as timed phases, plus 5-4-3-2-1 grounding and a body scan.
// A phase is [label, seconds, from, to] where from/to are the circle size (0 small .. 1 big) at the start/end of the phase.
export const PATTERNS = {
  slow: { id: 'slow', phases: [['in', 4, 0, 1], ['out', 6, 1, 0]] },
  box: { id: 'box', phases: [['in', 4, 0, 1], ['hold', 4, 1, 1], ['out', 4, 1, 0], ['hold', 4, 0, 0]] },
  relax478: { id: 'relax478', phases: [['in', 4, 0, 1], ['hold', 7, 1, 1], ['out', 8, 1, 0]] },
  sigh: { id: 'sigh', phases: [['in', 2, 0, 0.75], ['in', 1, 0.75, 1], ['out', 6, 1, 0]] },
};
export const cycleSec = (p) => p.phases.reduce((s, ph) => s + ph[1], 0);
/** Where are we `tSec` seconds after the start? -> { label, index, left, progress, size, cycle }. Pure, so it is testable and drift-free. */
export function phaseAt(pattern, tSec) {
  const len = cycleSec(pattern), t = Math.max(0, tSec), cycle = Math.floor(t / len);
  let rem = t - cycle * len;
  for (let i = 0; i < pattern.phases.length; i++) {
    const [label, dur, from, to] = pattern.phases[i];
    if (rem < dur) { const progress = rem / dur; return { label, index: i, left: dur - rem, progress, size: from + (to - from) * progress, cycle }; }
    rem -= dur;
  }
  const last = pattern.phases.at(-1); return { label: last[0], index: pattern.phases.length - 1, left: 0, progress: 1, size: last[3], cycle };
}
/** How many full cycles fit the chosen length (never cut a breath in half). */
export const cyclesFor = (pattern, minutes) => Math.max(1, Math.round((minutes * 60) / cycleSec(pattern)));

export const GROUNDING = [{ n: 5, sense: 'see' }, { n: 4, sense: 'touch' }, { n: 3, sense: 'hear' }, { n: 2, sense: 'smell' }, { n: 1, sense: 'taste' }];
export const BODYSCAN = ['feet', 'legs', 'belly', 'hands', 'shoulders', 'face'];
/** Step index for a timed walk through `steps` items over `totalSec` seconds. */
export const stepAt = (count, totalSec, tSec) => Math.min(count - 1, Math.floor((Math.max(0, tSec) / totalSec) * count));

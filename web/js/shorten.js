// Smart shortening (pure): the routine will miss the leave-by time, so which of the steps still ahead could be shorter - using what the person
// usually needs for each step (their own history), else a gentle cut. Never touches the step in progress, never goes below a minute or half of the plan.
import { norm } from './smart.js';

export const MIN_SEC = 60, FLOOR_PCT = 0.5, MIN_SAVE_SEC = 30, MAX_STEPS = 4;
const median = (a) => { const b = [...a].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const up5 = (s) => Math.ceil(s / 5) * 5;
/**
 * steps: the tasks still ahead [{ i, name, plannedSec, extraSec }]; missSec: how late the routine will be (> 0); history: Map from smart.buildHistory (or null).
 * -> { steps: [{ i, name, fromSec, toSec, saveSec, source: 'history'|'cut' }], saveSec, covers } - the biggest, best-founded savings first, until the miss is covered.
 */
export function planShortening({ steps = [], missSec = 0, history = null } = {}) {
  if (!(missSec > 0)) return { steps: [], saveSec: 0, covers: true };
  const cands = [];
  for (const s of steps) {
    const from = Math.round(s.plannedSec) + Math.round(s.extraSec || 0), floor = Math.max(MIN_SEC, Math.ceil(from * FLOOR_PCT));
    if (from <= floor) continue;
    const h = history?.get(norm(s.name))?.slice(-8) ?? [], typical = h.length >= 2 ? up5(median(h.map((x) => x.a))) : null;
    let to, source;
    if (typical !== null && typical < from) { to = Math.max(floor, typical); source = 'history'; } else { to = Math.max(floor, up5(from * 0.75)); source = 'cut'; }
    if (to >= from || from - to < MIN_SAVE_SEC) continue;
    cands.push({ i: s.i, name: s.name, fromSec: from, toSec: to, saveSec: from - to, source });
  }
  cands.sort((a, b) => (a.source === b.source ? b.saveSec - a.saveSec : a.source === 'history' ? -1 : 1));
  const out = []; let got = 0;
  for (const c of cands) { if (got >= missSec || out.length >= MAX_STEPS) break; out.push(c); got += c.saveSec; }
  return { steps: out.sort((a, b) => a.i - b.i), saveSec: got, covers: got >= missSec };
}

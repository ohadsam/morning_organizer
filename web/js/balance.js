// The "balance" of a week (pure): what a person did (routines finished) against how they looked after themselves (check-ins and look-backs). Used by the balance widget.
const DAY = 86_400_000;
/** { doing, care } over the last 7 days up to `now`. */
export function weekBalance(runs, feelings, retros, now = Date.now()) {
  const from = now - 7 * DAY, inWeek = (t) => Number.isFinite(t) && t >= from && t <= now;
  return { doing: (runs || []).filter((r) => r.status === 'done' && inWeek(r.endedAt)).length, care: (feelings || []).filter((f) => inWeek(f.at)).length + (retros || []).filter((r) => inWeek(r.at)).length };
}
/** The picture of the seesaw: 0 (doing weighs much more) ... 2 (level) ... 4 (care weighs much more). Nothing yet counts as level. */
export function balanceStep(doing, care) {
  const d = Math.max(0, Number(doing) || 0), c = Math.max(0, Number(care) || 0);
  if (d + c === 0) return 2;
  return Math.min(4, Math.max(0, Math.round(2 + ((c - d) / (d + c)) * 2)));
}

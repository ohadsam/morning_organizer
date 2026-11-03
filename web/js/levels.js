// Levels from stars (pure). Characters unlock with levels - a reason to keep going without being a chore.
export const LEVEL_STARS = [0, 6, 15, 30, 50, 80, 120, 170, 230, 300, 400, 520, 660, 820, 1000];
export function levelInfo(totalStars) {
  const n = Math.max(0, Math.floor(Number(totalStars) || 0));
  let level = 1; while (level < LEVEL_STARS.length && n >= LEVEL_STARS[level]) level++;
  const base = LEVEL_STARS[level - 1], next = LEVEL_STARS[level] ?? null;
  return { level, stars: n, base, next, pct: next === null ? 1 : (n - base) / (next - base), toNext: next === null ? 0 : next - n };
}

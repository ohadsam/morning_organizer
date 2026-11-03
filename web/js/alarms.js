// Pure alarm maths. `days` is an array of weekdays, 0 = Sunday ... 6 = Saturday; empty = every day.
export function nextFire(alarm, now = new Date()) {
  if (!alarm?.enabled || !/^\d{2}:\d{2}$/.test(alarm.time || '')) return null;
  const [hh, mm] = alarm.time.split(':').map(Number);
  if (hh > 23 || mm > 59) return null;
  const days = Array.isArray(alarm.days) && alarm.days.length ? alarm.days : [0, 1, 2, 3, 4, 5, 6];
  for (let add = 0; add < 8; add++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add, hh, mm, 0, 0);
    if (d > now && days.includes(d.getDay())) return d;
  }
  return null;
}

export const defaultAlarm = () => ({
  enabled: false, time: '07:00', days: [0, 1, 2, 3, 4], volume: 80, vibrate: true, durationSec: 30,
});

/** Next alarm across all templates -> { template, at } or null. */
export function nextAcross(templates, now = new Date()) {
  let best = null;
  for (const t of templates) {
    const at = nextFire(t.alarm, now);
    if (at && (!best || at < best.at)) best = { template: t, at };
  }
  return best;
}

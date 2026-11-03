// What the Android routine widgets show (pure): every routine, today's and favourites first, each with its tasks and a one-line summary
// of its saved settings (length, days, leave-by, gear). Starting from the widget opens the app, which runs it with ALL those settings.
import { fmtHuman } from './util.js';
import { isActiveOn, normDays } from './schedule.js';

export const MAX_ROUTINES = 12, MAX_TASKS = 8;
/** labels: { units, leave(time), gear(n), day(dow) } - passed in so this stays free of i18n/DOM. */
export function widgetItems(templates, dow, labels) {
  const rank = (x) => (isActiveOn(x, dow) ? 0 : 2) + (x.favorite ? 0 : 1);
  return templates.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i).slice(0, MAX_ROUTINES).map(({ x }) => {
    const total = x.tasks.reduce((s, k) => s + k.sec, 0), days = normDays(x.days), meta = [fmtHuman(total, labels.units)];
    if (days.length && days.length < 7) meta.push(days.map(labels.day).join(' '));
    if (x.leaveBy) meta.push(labels.leave(x.leaveBy));
    if (x.gear?.length) meta.push(labels.gear(x.gear.length));
    return { id: x.id, name: x.name, icon: x.icon, taskCount: x.tasks.length, totalSec: total, meta: meta.join(' · '),
      tasks: x.tasks.slice(0, MAX_TASKS).map((k) => ({ name: k.name, icon: k.icon, sec: k.sec })), more: Math.max(0, x.tasks.length - MAX_TASKS) };
  });
}

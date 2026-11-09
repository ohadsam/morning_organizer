// "Now" mode on Home (pure): out of all the routines, the one single thing to offer right now.
import { isActiveOn } from './schedule.js';

const minutesOf = (hhmm) => { const m = /^(\d{2}):(\d{2})$/.exec(hhmm || ''); return m ? +m[1] * 60 + +m[2] : null; };
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
/**
 * -> { template, why: 'alarm' | 'today' | 'favorite' | 'any' } or null.
 * Order: a routine of today whose alarm time is the nearest one (from 90 minutes ago to the end of the day) and not finished today; else any routine of
 * today not finished today (favourites first); else a favourite; else the first routine. `runs`: the person's finished runs.
 */
export function pickNow(templates, runs, now = Date.now()) {
  const list = (templates || []).filter((x) => x && Array.isArray(x.tasks) && x.tasks.length);
  if (!list.length) return null;
  const d = new Date(now), dow = d.getDay(), nowMin = d.getHours() * 60 + d.getMinutes();
  const doneToday = new Set((runs || []).filter((r) => r.status === 'done' && r.endedAt && sameDay(r.endedAt, now)).map((r) => r.templateId));
  const todays = list.filter((x) => isActiveOn(x, dow) && !doneToday.has(x.id));
  const timed = todays.map((x) => ({ x, m: x.alarm?.enabled ? minutesOf(x.alarm.time) : null })).filter((y) => y.m !== null && y.m >= nowMin - 90).sort((a, b) => a.m - b.m);
  if (timed.length) return { template: timed[0].x, why: 'alarm' };
  if (todays.length) return { template: todays.find((x) => x.favorite) || todays[0], why: 'today' };
  const fav = list.find((x) => x.favorite); if (fav) return { template: fav, why: 'favorite' };
  return { template: list[0], why: 'any' };
}

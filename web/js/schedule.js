// Which routines are for today, and which gear to remember today (pure).
export const normDays = (d) => [...new Set((Array.isArray(d) ? d : []).filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort();
/** Empty list = every day. */
export const isActiveOn = (tpl, dow) => { const d = normDays(tpl?.days); return d.length === 0 || d.includes(dow); };
export const gearFor = (tpl, dow) => (Array.isArray(tpl?.gear) ? tpl.gear : []).filter((g) => { const d = normDays(g.days); return d.length === 0 || d.includes(dow); });
/** Presets follow the local week: Israel works Sun-Thu (weekend Fri-Sat), elsewhere Mon-Fri. */
export const presetDays = (lang) => (lang === 'he' ? { school: [0, 1, 2, 3, 4], weekend: [5, 6] } : { school: [1, 2, 3, 4, 5], weekend: [0, 6] });
/** { today: [...], other: [...] } keeping the original order; when nothing is scheduled everything is "today". */
export function splitForToday(templates, dow) {
  const scheduled = templates.some((x) => normDays(x.days).length);
  if (!scheduled) return { today: templates, other: [], scheduled };
  return { today: templates.filter((x) => isActiveOn(x, dow)), other: templates.filter((x) => !isActiveOn(x, dow)), scheduled };
}

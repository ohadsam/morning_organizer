// Hebrew calendar + Israeli holidays and school vacations (pure, offline). The Hebrew date comes from the platform's own calendar (Intl, `u-ca-hebrew`),
// the holidays are computed from it - so there is no table to go out of date. Used so that alarms (and the routines they start) stay quiet on days off.
//
// kind 'holiday'  = a holiday when school and work are closed (Rosh Hashana, Yom Kippur, Sukkot, Purim, Pesach, Yom Haatzmaut, Shavuot)
// kind 'vacation' = a school vacation (Hanukkah, the summer vacation 1 July - 31 August)

const MONTHS_FMT = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

/** { d: day of month, m: English month name (Tishri, Heshvan, Kislev, Tevet, Shevat, Adar I, Adar II, Adar, Nisan, Iyar, Sivan, Tamuz, Av, Elul), y: Hebrew year }. */
const PARTS_CACHE = new Map(), OFF_CACHE = new Map();   // dates repeat a lot (alarm maths, skip lists): remember them
const remember = (map, key, make) => { if (map.has(key)) return map.get(key); const v = make(); if (map.size > 3000) map.clear(); map.set(key, v); return v; };
export function hebrewParts(date) {
  return remember(PARTS_CACHE, `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`, () => computeParts(date));
}
function computeParts(date) {
  const o = {}; for (const p of MONTHS_FMT.formatToParts(noon(date))) if (p.type === 'day') o.d = Number(p.value); else if (p.type === 'month') o.m = p.value; else if (p.type === 'year') o.y = Number(p.value);
  return o;
}
/** A number as Hebrew letters (gematria), e.g. 28 -> כ״ח, 15 -> ט״ו, 787 -> תשפ״ז. */
export function gematria(n) {
  let x = Math.floor(Number(n)); if (!(x > 0)) return '';
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  let out = ''; while (x >= 400) { out += 'ת'; x -= 400; }
  out += hundreds[Math.floor(x / 100)]; x %= 100;
  if (x === 15) out += 'טו'; else if (x === 16) out += 'טז'; else { out += tens[Math.floor(x / 10)] + ones[x % 10]; }
  return out.length > 1 ? `${out.slice(0, -1)}״${out.slice(-1)}` : `${out}׳`;
}
/** The date as a person writes it: Hebrew in letters, "כ״ח בחשוון התשפ״ז"; English "28 Heshvan 5787". */
const LABEL_FMT = {};
export function hebrewLabel(date, lang = 'he') {
  const k = lang === 'he' ? 'he' : 'en';
  const f = (LABEL_FMT[k] ??= new Intl.DateTimeFormat(`${k}-u-ca-hebrew`, { day: 'numeric', month: 'long', year: 'numeric' }));
  if (k !== 'he') return f.format(noon(date));
  const parts = f.formatToParts(noon(date)), get = (t) => parts.find((x) => x.type === t)?.value || '';
  const day = parseInt(get('day'), 10), year = parseInt(get('year'), 10), month = get('month');
  if (!day || !year || !month) return f.format(noon(date));
  return `${gematria(day)} ב${month} ה${gematria(year % 1000)}`;
}

const SUMMER = (d) => d.getMonth() === 6 || d.getMonth() === 7;   // 1 July - 31 August: the "Great Vacation"
/** Days since the holiday started (0 = first day) if `date` falls within `len` days of (month, day), else -1. */
function sinceStart(date, months, day, len) {
  for (let k = 0; k < len; k++) { const p = hebrewParts(addDays(date, -k)); if (p.d === day && months.includes(p.m)) return k; }
  return -1;
}

/** null on an ordinary day, else { key, kind } (key = i18n suffix `hol_<key>`). */
export function dayOff(date) { return remember(OFF_CACHE, `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`, () => computeDayOff(date)); }
function computeDayOff(date) {
  const d = noon(date), p = hebrewParts(d);
  if (p.m === 'Tishri') {
    if (p.d <= 2) return { key: 'roshHashana', kind: 'holiday' };
    if (p.d === 10) return { key: 'yomKippur', kind: 'holiday' };
    if (p.d >= 15 && p.d <= 22) return { key: p.d === 22 ? 'simchatTorah' : 'sukkot', kind: 'holiday' };
  }
  if ((p.m === 'Kislev' && p.d >= 25) || (p.m === 'Tevet' && p.d <= 3)) { if (sinceStart(d, ['Kislev'], 25, 8) >= 0) return { key: 'chanukah', kind: 'vacation' }; }
  if ((p.m === 'Adar' || p.m === 'Adar II') && p.d === 14) return { key: 'purim', kind: 'holiday' };
  if (p.m === 'Nisan' && p.d >= 14 && p.d <= 21) return { key: 'pesach', kind: 'holiday' };
  if (p.m === 'Iyar' && p.d >= 3 && p.d <= 6) {          // Independence Day moves off Friday/Saturday (to Thursday) and Monday (to Tuesday)
    const fifth = addDays(d, 5 - p.d).getDay(), target = fifth === 6 ? 3 : fifth === 5 ? 4 : fifth === 1 ? 6 : 5;
    if (p.d === target) return { key: 'yomHaatzmaut', kind: 'holiday' };
  }
  if (p.m === 'Sivan' && p.d === 6) return { key: 'shavuot', kind: 'holiday' };
  if (SUMMER(d)) return { key: 'summer', kind: 'vacation' };
  return null;
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const isoDate = iso;
/** Days off in [from, from + days): [{ date: 'YYYY-MM-DD', key, kind }]. */
export function daysOffBetween(from, days = 400) {
  const out = []; for (let i = 0; i < days; i++) { const d = addDays(from, i), o = dayOff(d); if (o) out.push({ date: iso(d), ...o }); }
  return out;
}
/** The dates the Android app must skip (an alarm set to be quiet on days off): up to ~14 months ahead, so it stays right even if the app is not opened for a long time. */
export const skipDates = (from = new Date(), days = 430) => daysOffBetween(from, days).map((x) => x.date);

/** The next days off grouped into runs: [{ key, kind, from: Date, to: Date }] (a run of the same holiday / vacation). */
export function upcoming(from = new Date(), count = 6, horizon = 400) {
  const runs = []; let last = null;
  for (let i = 0; i < horizon && runs.length < count + (dayOff(from) ? 1 : 0); i++) {
    const d = addDays(from, i), o = dayOff(d);
    if (o && last && last.key === o.key && iso(addDays(last.to, 1)) === iso(d)) last.to = d;
    else if (o) { last = { key: o.key, kind: o.kind, from: d, to: d }; runs.push(last); } else last = null;
  }
  return runs.slice(0, count);
}

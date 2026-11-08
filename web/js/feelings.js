// "How do I feel" check-ins (pure): a face from 1 to 5, one short question that fits the person's approach, and an optional private note.
// Stored per person on this device; the statistics and the summary for a therapist are computed here from the plain entries.
import { uid, cleanText } from './util.js';
import { sanitizeMood } from './mood.js';

export const MAX_FEELINGS = 800, DAY = 86_400_000;
export const APPROACHES = ['general', 'cbt', 'cogfun', 'nlp', 'adhd', 'anxiety', 'organize', 'motivation'];
/** The one question each approach asks after the face (its answers are the chips). */
export const TAGS = {
  general: ['calm', 'tense', 'tired', 'energetic'],
  cbt: ['worry', 'selfblame', 'hope', 'nothing'],
  cogfun: ['clear', 'toomuch', 'forgot', 'ontrack'],
  nlp: ['calm', 'confidence', 'energy', 'clarity'],
  adhd: ['sharp', 'drifting', 'restless', 'stuck'],
  anxiety: ['none', 'little', 'medium', 'alot'],
  organize: ['clear', 'messy', 'overwhelmed', 'ok'],
  motivation: ['high', 'ok', 'low', 'none'],
};
/** The approach to ask about, from the needs view (see needs.js): the chosen method, else the first help area, else a general question. */
export function approachOf(view) {
  const m = view?.model, p = Array.isArray(view?.problems) ? view.problems[0] : null;
  if (['cbt', 'cogfun', 'nlp'].includes(m)) return m;
  return APPROACHES.includes(p) ? p : 'general';
}
export function sanitizeFeeling(x) {
  const mood = sanitizeMood(x?.mood); if (mood === null) return null;
  const ap = APPROACHES.includes(x?.ap) ? x.ap : 'general', at = Number(x?.at);
  return { id: typeof x?.id === 'string' && /^[\w-]{1,40}$/.test(x.id) ? x.id : uid(), pid: typeof x?.pid === 'string' ? x.pid.slice(0, 40) : '', at: Number.isFinite(at) && at > 0 ? Math.floor(at) : Date.now(),
    mood, ap, tag: TAGS[ap].includes(x?.tag) ? x.tag : '', note: cleanText(x?.note, 400) };
}
export const sanitizeFeelings = (arr) => (Array.isArray(arr) ? arr : []).slice(-MAX_FEELINGS * 2).map(sanitizeFeeling).filter(Boolean).slice(-MAX_FEELINGS);

const key = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
/** Last `days` days (oldest first): the average face per day (null when none), and the overall picture. */
export function feelingStats(list, now = Date.now(), days = 14) {
  const per = new Map(); for (const f of list) { const k = key(f.at); (per.get(k) ?? per.set(k, []).get(k)).push(f.mood); }
  const series = Array.from({ length: days }, (_, i) => { const k = key(now - (days - 1 - i) * DAY), v = per.get(k) || []; return { day: k, n: v.length, avg: v.length ? mean(v) : null }; });
  const inRange = list.filter((f) => f.at >= now - days * DAY && f.at <= now + DAY), half = Math.floor(days / 2);
  const recent = series.slice(-half).filter((d) => d.n).map((d) => d.avg), before = series.slice(0, days - half).filter((d) => d.n).map((d) => d.avg);
  let trend = null; if (recent.length >= 3 && before.length >= 3) { const d = mean(recent) - mean(before); trend = Math.abs(d) < 0.3 ? 'flat' : d > 0 ? 'up' : 'down'; }
  return { n: inRange.length, days: series.filter((d) => d.n).length, avg: mean(inRange.map((f) => f.mood)), series, trend, low: series.filter((d) => d.avg !== null && d.avg <= 2).length };
}
/**
 * A plain-text summary a person can show a therapist or a parent. `L` supplies the words (so this stays free of i18n):
 * { title, period(days), count(n, d), avg(x), trend: { up, down, flat }, low(n), mood(v), tag(ap, tag), noteWord, disclaimer }.
 * Notes are only included when `includeNotes` is true (the screen keeps that off unless the person switches it on).
 */
export function summaryText(list, { now = Date.now(), days = 14, includeNotes = false, name = '' } = {}, L) {
  const st = feelingStats(list, now, days), rows = list.filter((f) => f.at >= now - days * DAY).sort((a, b) => a.at - b.at);
  const out = [L.title + (name ? ` - ${name}` : ''), L.period(days), '', L.count(st.n, st.days)];
  if (st.n) out.push(L.avg(st.avg.toFixed(1))); if (st.trend) out.push(L.trend[st.trend]); if (st.low) out.push(L.low(st.low));
  if (rows.length) out.push('');
  for (const f of rows) { const d = new Date(f.at); out.push(`${key(f.at)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}  ${f.mood}/5 ${L.mood(f.mood)}${f.tag ? ` · ${L.tag(f.ap, f.tag)}` : ''}${includeNotes && f.note ? ` · ${L.noteWord}: ${f.note}` : ''}`); }
  out.push('', L.disclaimer); return out.join('\n');
}

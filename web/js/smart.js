// Smart suggestions when building a routine (pure): realistic times from the person's own history (or a sensible estimate for the kind of task, their age
// and the help they chose), and small "in-between" steps that fit that help (calming steps for anxiety, movement and focus steps for attention...).
// These are suggestions the person or parent accepts, never silent changes.
import { cleanText } from './util.js';

const KEYWORDS = [  // [regex (English + Hebrew), seconds] - typical time for an average school-age child / adult
  [/teeth|tooth|brush|שיני/i, 180], [/shower|bath|מקלחת|רחצ/i, 480], [/toilet|bathroom|שירותים/i, 180], [/dress|cloth|wear|מתלבש|בגדים/i, 300], [/breakfast|lunch|dinner|eat|meal|ארוח|אוכל/i, 900],
  [/coffee|tea|קפה|תה/i, 480], [/bag|backpack|pack|תיק|ארוז/i, 180], [/shoe|sock|נעל|גרב/i, 120], [/wake|stretch|קמ|מתמתח/i, 120], [/homework|study|שיעורי|לימוד/i, 1500], [/read|book|קריא|ספר/i, 900],
  [/tidy|clean|room|סדר|ניקי|חדר/i, 480], [/play|game|משחק/i, 1800], [/pajama|פיג/i, 180], [/story|סיפור/i, 600], [/vitamin|medic|pill|ויטמין|תרופ/i, 60], [/water|drink|מים|שתי/i, 60], [/pet|dog|cat|feed|כלב|חתול|האכל/i, 180],
  [/bed|מיטה/i, 120], [/hair|comb|שיער|מסרק/i, 180], [/plan|schedule|תכנ/i, 300], [/walk|exercise|sport|run|הליכ|ספורט|ריצה/i, 900], [/practice|instrument|נגינ|תרגול/i, 900], [/shop|errand|קניות/i, 1200],
];
export const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const ageFactor = (age) => { const n = Number(age); if (!Number.isFinite(n) || n <= 0) return 1; return n <= 6 ? 1.5 : n <= 8 ? 1.3 : n <= 11 ? 1.15 : 1; };
const SUPPORT = { focus: 0.2, calm: 0.15, time: 0.1, memory: 0.1, habits: 0.05, motivation: 0 };   // extra margin for the friction each kind of help usually involves
const step = (s) => (s < 120 ? 15 : s < 900 ? 60 : 300);
const roundTo = (s) => Math.max(15, Math.round(s / step(s)) * step(s));
const median = (a) => { const b = [...a].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };

/** Typical seconds for a kind of task, from keywords (null = unknown). */
export const keywordSec = (name) => KEYWORDS.find(([re]) => re.test(name))?.[1] ?? null;

/** name -> chronological [{ a: actual, p: planned }] over finished runs (build once, reuse for every task - lists can be long). */
export function buildHistory(runs) {
  const m = new Map();
  for (const r of runs.filter((x) => x.endedAt).sort((a, b) => a.startedAt - b.startedAt)) for (const k of r.tasks || []) if (k.done) { const key = norm(k.name); if (key) (m.get(key) ?? m.set(key, []).get(key)).push({ a: k.actualSec, p: k.plannedSec }); }
  return m;
}
/**
 * -> { sec, source: 'history'|'keyword'|'default', n, base, ageFactor, supportPct }.
 * history: the median of the last 8 finished runs of a task with the same name (needs 2+), +5% when it usually went over its plan.
 * otherwise: keyword estimate x age factor x (1 + help margin, capped at +40%).
 */
export function suggestTime({ name, runs = [], history = null, age = null, areas = [], defaultSec = 300 } = {}) {
  const key = norm(name), recent = (key ? (history ?? buildHistory(runs)).get(key) ?? [] : []).slice(-8);
  if (recent.length >= 2) { const m = median(recent.map((x) => x.a)), over = recent.filter((x) => x.a > x.p).length / recent.length; return { sec: roundTo(m * (over >= 0.5 ? 1.05 : 1)), source: 'history', n: recent.length, base: Math.round(m), ageFactor: 1, supportPct: 0 }; }
  const kw = keywordSec(name || ''), base = kw ?? defaultSec, af = ageFactor(age), sp = Math.min(0.4, (Array.isArray(areas) ? areas : []).reduce((s, a) => s + (Object.hasOwn(SUPPORT, a) ? SUPPORT[a] : 0), 0));
  return { sec: roundTo(base * af * (1 + sp)), source: kw ? 'keyword' : 'default', n: 0, base, ageFactor: af, supportPct: Math.round(sp * 100) };
}
/** Suggestions for every task of a routine: [{ index, current, ...suggestion, changes: bool }] (changes = differs by 15 s and 15 %). */
export function smartTimes(tasks, ctx) {
  const history = ctx.history ?? buildHistory(ctx.runs ?? []);
  return tasks.map((t, index) => { const s = suggestTime({ ...ctx, history, name: t.name }); return { index, current: t.sec, ...s, changes: Math.abs(s.sec - t.sec) >= 15 && Math.abs(s.sec - t.sec) / Math.max(1, t.sec) >= 0.15 }; });
}

const HARD_NAME = /homework|study|read|שיעורי|לימוד|קריא/i;
/**
 * In-between steps that fit the chosen help. tasks: [{name, sec}], ctx: { areas, age, hardNames?: Set<normalized names the person rated hard> }.
 * -> [{ key (i18n), icon, sec, afterIndex (-1 = before the first task), reason (i18n), helper }] - at most 6, never a duplicate of an existing step.
 */
export function suggestInterstitials(tasks, { areas = [], age = null, hardNames = new Set() } = {}) {
  const A = new Set(Array.isArray(areas) ? areas : []), kid = Number(age) > 0 && Number(age) <= 11, out = [], have = (k) => tasks.some((t) => t.helperKey === k);
  const add = (key, icon, sec, afterIndex, reason, helper = '') => { if (!have(key) && !out.some((o) => o.key === key && o.afterIndex === afterIndex)) out.push({ key, icon, sec: kid ? Math.max(30, Math.round(sec * 0.75)) : sec, afterIndex, reason, helper }); };
  if (A.has('calm')) {
    add('sx_breath', '🌬️', 120, -1, 'sxWhyCalmStart', 'calm');
    tasks.forEach((t, i) => { if (hardNames.has(norm(t.name)) || t.sec >= 1200) add('sx_calmcheck', '🧘', 60, i - 1, 'sxWhyBeforeHard', 'calm'); });
    if (tasks.length) add('sx_goodthought', '💭', 60, tasks.length - 1, 'sxWhyEnd', 'thought');
  }
  if (A.has('focus')) {
    add('sx_pickone', '🎯', 60, -1, 'sxWhyPick');
    let run = 0; tasks.forEach((t, i) => { run += t.sec; if (run >= 900 && i < tasks.length - 1) { add('sx_move', '🤸', 120, i, 'sxWhyMove', 'move'); run = 0; } });
    tasks.forEach((t, i) => { if (HARD_NAME.test(t.name)) add('sx_clear', '🧹', 60, i - 1, 'sxWhyClear'); });
  }
  if (A.has('memory')) { add('sx_say', '🗣️', 60, -1, 'sxWhySay'); if (tasks.length > 1) add('sx_gear', '✅', 60, tasks.length - 2, 'sxWhyGear'); }
  if (A.has('time')) add('sx_clock', '🕒', 30, -1, 'sxWhyClock');
  return out.slice(0, 6);
}
/** Inserts the chosen steps into a task list (new objects; positions refer to the ORIGINAL list). `name(key)` translates the key. */
export function applyInterstitials(tasks, chosen, name, newId) {
  const out = []; const before = (i) => chosen.filter((c) => c.afterIndex === i);
  before(-1).forEach((c) => out.push(mk(c)));
  tasks.forEach((t, i) => { out.push(t); before(i).forEach((c) => out.push(mk(c))); });
  function mk(c) { return { id: newId(), name: cleanText(name(c.key), 80), icon: c.icon, photo: '', sec: c.sec, est: 0, helper: c.helper || '', helperKey: c.key }; }
  return out;
}

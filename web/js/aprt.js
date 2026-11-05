// APRT / "Event - Interpretation - Emotion - Response" (pure): the CBT situation record. Four short questions about a hard moment: what happened (Event),
// what I told myself about it (Interpretation), what I felt and how strongly (Emotion), what I did (Response) - and, if wanted, another way to see it.
// Records go to the private journal (text or voice); this module only holds the lists and the gentle pattern analysis. Self-help, not therapy.
import { cleanText, clamp } from './util.js';

export const EMOTIONS = [['😟', 'worry'], ['😰', 'fear'], ['😠', 'anger'], ['😤', 'frustrated'], ['😢', 'sad'], ['😔', 'down'], ['😳', 'shame'], ['😊', 'good']];
export const EMOTION_IDS = EMOTIONS.map(([, id]) => id);
export const RESPONSES = ['froze', 'avoided', 'argued', 'cried', 'asked', 'kept', 'calmed'];
/** Thinking traps the interpretation text can hint at. Each has words in Hebrew and English; matching is only a hint, shown softly. */
export const TRAPS = {
  catastrophe: /\b(always|never|disaster|terrible|awful|worst|ruined|everything is)\b|תמיד|אף פעם|אסון|נורא|הכי גרוע|הכול הרוס|הרסתי/i,
  mindread: /\b(thinks? i|think i am|they think|hates? me|laughing at me|judging me)\b|חושבים ש|חושב ש|שונאים אותי|שונא אותי|צוחקים עליי|שופטים אותי/i,
  allnothing: /\b(completely|totally|nothing|no one|nobody|all or nothing|failed everything)\b|לגמרי|שום דבר|אף אחד|כישלון מוחלט/i,
  should: /\b(should|must|have to|supposed to|ought)\b|צריך|צריכה|חייב|חייבת|אמור|אמורה/i,
  personal: /\b(my fault|because of me|i caused|i ruined|blame myself)\b|באשמתי|אשמתי|בגללי|אני אשם|אני אשמה/i,
  label: /\b(i am|i'm) (so )?(stupid|bad|a failure|useless|weird|lazy|dumb)\b|אני (טיפש|טיפשה|גרוע|גרועה|כישלון|חסר תועלת|עצלן|עצלנית|מוזר|מוזרה)/i,
};
export const TRAP_IDS = Object.keys(TRAPS);
export const trapOf = (text) => TRAP_IDS.find((id) => TRAPS[id].test(String(text ?? ''))) || '';

/** Whitelist + clamp (the journal sanitiser calls this; entries can come from anywhere). */
export function sanitizeAprt(a) {
  if (!a || typeof a !== 'object') return null;
  const s = (v, m) => cleanText(v, m);
  return { event: s(a.event, 600), interp: s(a.interp, 600), emotion: EMOTION_IDS.includes(a.emotion) ? a.emotion : '', emotionText: s(a.emotionText, 60), intensity: clamp(Math.round(Number(a.intensity)) || 0, 0, 10),
    responses: [...new Set((Array.isArray(a.responses) ? a.responses : []).filter((x) => RESPONSES.includes(x)))].slice(0, 4), response: s(a.response, 400), alt: s(a.alt, 600), after: clamp(Math.round(Number(a.after)) || 0, 0, 10) };
}

const STOP = new Set('the a an and or but of to in on at for with my me i it is was were that this they he she we you not so very just have had has been about from as be are do did what when who how'.split(' ').concat('של את על עם זה זו היה היתה הייתי אני אנחנו הם הן הוא היא לא כל גם אבל או כי מה מי איך כמו אז'.split(' ')));
const tally = (items) => { const m = new Map(); for (const x of items) if (x) m.set(x, (m.get(x) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); };

/**
 * What the records show (needs entries with `.aprt`): counts, most common feeling / response / trap / event words, how strong the feelings were and
 * whether they eased over time, and how often the person wrote another way to see it.
 * -> null when there are fewer than `min` records.
 */
export function analyze(entries, min = 3) {
  const rs = (Array.isArray(entries) ? entries : []).filter((e) => e?.aprt && (e.aprt.event || e.aprt.interp || e.aprt.emotion)).sort((a, b) => (a.at || 0) - (b.at || 0));
  if (rs.length < min) return null;
  const A = rs.map((e) => e.aprt), rated = A.filter((a) => a.intensity > 0), avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const half = Math.max(1, Math.floor(rated.length / 2)), first = avg(rated.slice(0, half).map((a) => a.intensity)), last = avg(rated.slice(-half).map((a) => a.intensity));
  const eased = A.filter((a) => a.after > 0 && a.intensity > 0), drop = eased.length ? avg(eased.map((a) => a.intensity - a.after)) : 0;
  const words = tally(A.flatMap((a) => String(a.event).toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length >= 3 && !STOP.has(w))));
  return {
    n: rs.length, avgIntensity: Math.round(avg(rated.map((a) => a.intensity)) * 10) / 10,
    trend: rated.length >= 4 ? (last - first <= -1 ? 'easing' : last - first >= 1 ? 'growing' : 'steady') : '',
    emotions: tally(A.map((a) => a.emotion)).slice(0, 3).map(([id, n]) => ({ id, n })), responses: tally(A.flatMap((a) => a.responses)).slice(0, 3).map(([id, n]) => ({ id, n })),
    traps: tally(A.map((a) => trapOf(a.interp))).slice(0, 3).map(([id, n]) => ({ id, n })), events: words.slice(0, 4).map(([w, n]) => ({ w, n })),
    altShare: Math.round((A.filter((a) => a.alt).length / A.length) * 100), eased: Math.round(drop * 10) / 10,
  };
}

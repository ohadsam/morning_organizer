import { native } from './native.js';
// Read-aloud with the device's own text-to-speech (Web Speech API; browsers and the Android WebView). Nothing leaves the device and nothing is installed.
// How natural it sounds depends mostly on the VOICES installed on the device, so this module
//   1. picks the best installed voice for a character (quality ranking, male / female match, variety between characters),
//   2. speaks like a person: cleans the text for speech (no emoji, "4ד׳" -> "4 דקות"), cuts it into phrases with natural pauses, falling/rising
//      intonation and a calm human pace, instead of one flat run-on utterance,
//   3. adds real character: everyday people (woman, man, girl, boy, grandma, grandpa), speaking styles (coach, calm guide, storyteller...),
//      and fun characters (animals say their sound, a pirate says "Arrr") - plus an optional wording style (casual / warm / formal) for variety.
// Characters are NOT recordings of real people; accents of real communities cannot be produced without such recordings - pick an installed voice instead.

/** id -> { emoji, g: 'f'|'m'|'any' (voice gender wanted), pitch, rate (human-range baselines), pause (x pauses), variant, group, fx?, flavor? }. Legacy ids stay valid (old settings, alarms). */
export const PRESETS = {
  natural: { emoji: '🙂', g: 'any', pitch: 1, rate: 0.95, pause: 1, variant: 0, group: 'everyday' },
  woman: { emoji: '👩', g: 'f', pitch: 1.08, rate: 0.95, pause: 1, variant: 0, group: 'everyday' },
  man: { emoji: '👨', g: 'm', pitch: 0.85, rate: 0.95, pause: 1, variant: 0, group: 'everyday' },
  girl: { emoji: '👧', g: 'f', pitch: 1.45, rate: 1.08, pause: 0.9, variant: 1, group: 'everyday' },
  boy: { emoji: '👦', g: 'm', pitch: 1.35, rate: 1.08, pause: 0.9, variant: 1, group: 'everyday' },
  grandma: { emoji: '👵', g: 'f', pitch: 0.82, rate: 0.78, pause: 1.35, variant: 0, group: 'everyday' },
  grandpa: { emoji: '👴', g: 'm', pitch: 0.65, rate: 0.78, pause: 1.35, variant: 0, group: 'everyday' },
  coach: { emoji: '🏅', g: 'm', pitch: 0.95, rate: 1.14, pause: 0.7, variant: 1, group: 'style', flavor: 'coach' },
  calm: { emoji: '🧘', g: 'f', pitch: 0.9, rate: 0.76, pause: 1.9, variant: 1, group: 'style' },
  story: { emoji: '📖', g: 'm', pitch: 0.8, rate: 0.82, pause: 1.45, variant: 0, group: 'style', flavor: 'story' },
  announcer: { emoji: '🎙️', g: 'm', pitch: 1.02, rate: 1.14, pause: 0.85, variant: 1, group: 'style' },
  teacher: { emoji: '🧑‍🏫', g: 'f', pitch: 1.14, rate: 0.9, pause: 1.2, variant: 1, group: 'style' },
  cat: { emoji: '🐱', g: 'f', pitch: 1.28, rate: 1, pause: 0.9, variant: 1, group: 'fun', fx: { he: 'מיאו', en: 'meow', pitch: 1.75, rate: 0.85 } },
  dog: { emoji: '🐶', g: 'm', pitch: 1.05, rate: 1.04, pause: 0.85, variant: 0, group: 'fun', fx: { he: 'הב הב', en: 'woof woof', pitch: 0.7, rate: 1.1 } },
  lion: { emoji: '🦁', g: 'm', pitch: 0.82, rate: 0.88, pause: 1.2, variant: 0, group: 'fun', fx: { he: 'ראאאר', en: 'roar', pitch: 0.4, rate: 0.7 } },
  frog: { emoji: '🐸', g: 'f', pitch: 1.2, rate: 1.1, pause: 0.8, variant: 1, group: 'fun', fx: { he: 'ריב ריב', en: 'ribbit ribbit', pitch: 1.1, rate: 1.3 } },
  pirate: { emoji: '🏴‍☠️', g: 'm', pitch: 0.8, rate: 0.9, pause: 1.1, variant: 1, group: 'fun', fx: { he: 'ארררר', en: 'arrr', pitch: 0.6, rate: 0.75 } },
  dino: { emoji: '🦖', g: 'm', pitch: 0.72, rate: 0.85, pause: 1.2, variant: 0, group: 'fun', fx: { he: 'ררררוואר', en: 'rawr', pitch: 0.3, rate: 0.7 } },
  robot: { emoji: '🤖', g: 'any', pitch: 0.55, rate: 0.85, pause: 1.1, variant: 0, group: 'fun', fx: { he: 'ביפ בופ', en: 'beep boop', pitch: 1.8, rate: 1.3 } },
  fairy: { emoji: '🧚', g: 'f', pitch: 1.3, rate: 0.98, pause: 1, variant: 0, group: 'fun', fx: { he: 'פוף', en: 'poof', pitch: 1.9, rate: 1.1 } },
  // legacy ids (kept so old settings and alarm rings still work)
  deep: { emoji: '🧔', g: 'm', pitch: 0.82, rate: 0.9, pause: 1.1, variant: 0, group: 'legacy' }, high: { emoji: '👩', g: 'f', pitch: 1.2, rate: 1, pause: 1, variant: 0, group: 'legacy' },
  chipmunk: { emoji: '🐿️', g: 'f', pitch: 1.7, rate: 1.15, pause: 0.8, variant: 1, group: 'legacy' }, giant: { emoji: '🦕', g: 'm', pitch: 0.45, rate: 0.75, pause: 1.3, variant: 0, group: 'legacy' },
  sleepy: { emoji: '🥱', g: 'any', pitch: 0.85, rate: 0.7, pause: 1.6, variant: 0, group: 'legacy' }, hero: { emoji: '🦸', g: 'm', pitch: 0.75, rate: 0.92, pause: 1, variant: 1, group: 'legacy' },
};
export const GROUPS = ['everyday', 'style', 'fun'];
export const personaIds = (group) => Object.keys(PRESETS).filter((k) => PRESETS[k].group === group);
export const personaOf = (id) => (typeof id === 'string' && Object.hasOwn(PRESETS, id) ? PRESETS[id] : PRESETS.natural);

/** Optional wording style: short openers that make the same message sound like a different kind of speaker. */
export const FLAVORS = {
  neutral: { he: [], en: [] },
  casual: { he: ['יאללה,', 'סבבה,', 'וואלה,', 'אחלה,'], en: ['Hey,', 'Alright,', 'Cool,', 'Okay,'] },
  warm: { he: ['בעזרת השם,', 'ברוך השם,', 'יישר כוח,', 'בשעה טובה,'], en: ['Warmly,', 'With care,', 'Well done,', 'Gently,'] },
  formal: { he: ['שלום,', 'בבקשה,', 'לתשומת לבך,'], en: ['Please note,', 'Kindly,', 'Good day,'] },
  coach: { he: ['קדימה!', 'יאללה אלופים!', 'בואו נעשה את זה!'], en: ['Let’s go!', 'Come on, champion!', 'Here we go!'] },
  story: { he: ['היה היה...', 'ובכן,', 'ואז...'], en: ['Once upon a time...', 'Well then,', 'And so...'] },
};
export const FLAVOR_IDS = ['neutral', 'casual', 'warm', 'formal'];

const webTts = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
// In the Android app the phone's own engine is used (all installed voices, exact pitch and pace); in a browser the Web Speech API.
let nativeOk;
const useNative = () => (nativeOk ??= native.ttsAvailable());
export const ttsSupported = () => useNative() || webTts();
let nativeVoices = [];
const readNativeVoices = () => { if (!nativeVoices.length) nativeVoices = native.ttsVoices().map((v) => ({ name: v.name, lang: v.lang, voiceURI: v.name, localService: !v.network, quality: v.quality })); return nativeVoices; };
const allVoices = () => (useNative() ? readNativeVoices() : webTts() ? speechSynthesis.getVoices?.() || [] : []);
/** True when the app can open the phone's own "download more voices" screen. */
export const canInstallVoices = () => useNative();
export const installVoices = () => native.ttsInstallVoices();
const bcp = (lang) => (lang === 'he' ? 'he-IL' : 'en-US');
const langMatch = (v, lang) => v.lang?.toLowerCase().replace('_', '-').startsWith(lang === 'he' ? 'he' : 'en') || (lang === 'he' && /^iw/i.test(v.lang || ''));

// ── voice choice ──
const GOOD = /natural|neural|enhanced|premium|wavenet|studio|online|high.?quality|\bhd\b/i, BAD = /compact|espeak|festival|robot|novelty|whisper|bells|boing|bubbles|cellos|deranged|hysterical|jester|organ|trinoids|zarvox|bahh|albert|fred\b|superstar/i;
const MALE = /\b(asaf|david|daniel|alex|mark|george|james|guy|aaron|arthur|thomas|oliver|ryan|liam|tom|fred|diego|jorge|rishi|gordon|lee|nathan|evan|male|man|gal|ori|doron|noam|yoav)\b|גבר|זכר/i;
const FEMALE = /\b(hila|carmit|samantha|karen|zira|hazel|susan|jenny|aria|emma|moira|tessa|victoria|fiona|allison|ava|serena|kate|catherine|sara|sarah|jessica|female|woman|orly|shira|maya)\b|אישה|נקבה/i;
/** 'm' | 'f' | '' (unknown) from the voice name - voices rarely say it, so this is a best guess. */
export const guessGender = (v) => { const n = String(v?.name || ''); return FEMALE.test(n) ? 'f' : MALE.test(n) ? 'm' : ''; };
/** Higher = more natural. Names with "Natural / Neural / Enhanced / Premium / Online" are the modern neural voices. */
export function scoreVoice(v, lang) {
  const n = String(v?.name || ''); let s = 0;
  if (GOOD.test(n)) s += 6; if (/google/i.test(n)) s += 2; if (/microsoft/i.test(n)) s += 1; if (BAD.test(n)) s -= 8;
  if (/^he[-_]il$/i.test(v?.lang || '') || (lang === 'en' && /^en[-_]us$/i.test(v?.lang || ''))) s += 2;
  if (v?.quality >= 400) s += 4; else if (v?.quality >= 300) s += 1;   // Android: very high / high quality voice data
  if (v?.default) s += 1; return s;
}
/** The installed voice for a character. `voiceURI` = an explicit choice (wins). Otherwise: best-scored voices of the wanted gender, `variant` picks the 1st/2nd best so characters differ. */
export function pickVoice(voices, lang, persona, voiceURI = '') {
  const list = (voices || []).filter((v) => langMatch(v, lang));
  if (voiceURI) { const v = (voices || []).find((x) => x.voiceURI === voiceURI); if (v) return v; }
  if (!list.length) return null;
  const ranked = [...list].sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang) || String(a.name).localeCompare(String(b.name)));
  const want = persona?.g && persona.g !== 'any' ? ranked.filter((v) => guessGender(v) === persona.g) : [];
  const pool = want.length ? want : ranked.filter((v) => !persona || persona.g === 'any' || guessGender(v) !== (persona.g === 'f' ? 'm' : 'f'));
  const use = pool.length ? pool : ranked;
  return use[(persona?.variant || 0) % use.length];
}
export const voiceLabel = (v, lang) => `${GOOD.test(v.name) || v.quality >= 400 ? '★ ' : ''}${v.name}${guessGender(v) === 'f' ? ' ♀' : guessGender(v) === 'm' ? ' ♂' : ''}`;

/** Voices installed for the language, best first. Voices load asynchronously in most browsers, so wait briefly. */
export function voicesFor(lang) {
  if (!ttsSupported()) return Promise.resolve([]);
  const read = () => allVoices().filter((v) => langMatch(v, lang)).sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang));
  const now = read(); if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => { try { speechSynthesis.removeEventListener?.('voiceschanged', done); } catch { /* none */ } globalThis.removeEventListener?.('morning-native', onNative); resolve(read()); };
    const onNative = (e) => { if (e.detail?.type === 'tts' && e.detail.status === 'ready') done(); };
    try { speechSynthesis.addEventListener?.('voiceschanged', done); } catch { /* none */ }
    globalThis.addEventListener?.('morning-native', onNative); setTimeout(done, 2500);
  });
}

// ── speaking like a person ──
/** Text -> what a person would actually say: no emoji, units spelled out, arrows/bullets become pauses. */
export function cleanForSpeech(text, lang = 'en') {
  let s = String(text ?? '').replace(/\p{Extended_Pictographic}|[️‍]/gu, '').replace(/[“”„]/g, '"').replace(/[‘’]/g, "'");
  s = s.replace(/→|←|·|•|…/g, ', ').replace(/\s[-–—]\s/g, ', ').replace(/[()[\]{}]/g, ', ').replace(/%/g, lang === 'he' ? ' אחוז' : ' percent');
  if (lang === 'he') s = s.replace(/(\d+)\s*ד[׳']/g, '$1 דקות').replace(/(\d+)\s*ש[״"]נ/g, '$1 שניות').replace(/(\d+)\s*ש[׳'](?!\p{L})/gu, '$1 שעות').replace(/דק[׳']/g, 'דקות').replace(/שנ[׳']/g, 'שניות');
  else s = s.replace(/(\d+)\s?h\b/g, '$1 hours').replace(/(\d+)\s?m\b/g, '$1 minutes').replace(/(\d+)\s?s\b/g, '$1 seconds').replace(/\b1 (hours|minutes|seconds)/g, (m, u) => `1 ${u.slice(0, -1)}`);
  return s.replace(/\s*,(\s*,)+/g, ',').replace(/\s+([,.!?;:])/g, '$1').replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '');
}
const hash = (str) => { let x = 2166136261; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0) / 4294967295; };
/** Sentences, and long sentences split again at commas - the units a person breathes between. */
export function phrases(text) {
  const out = [];
  for (const sent of String(text).split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean)) {
    if (sent.length <= 110) { out.push(sent); continue; }
    let cur = ''; for (const part of sent.split(/(?<=[,;:])\s+/)) { if ((cur + ' ' + part).trim().length > 90 && cur) { out.push(cur.trim()); cur = part; } else cur = `${cur} ${part}`; }
    if (cur.trim()) out.push(cur.trim());
  }
  return out;
}
/**
 * The speaking plan: [{ text, pitch, rate, pauseMs }]. Calm human pace (baseline x the person's pace setting), a gentle start, rising ends for
 * questions, firmer ends for exclamations, falling ends for statements, tiny deterministic variations (so it never sounds copy-pasted), pauses
 * between phrases. `flavor` = wording style id; characters with a sound (animals...) say it first. kind 'short' = a cue like "Breathe in": no extras.
 */
export function planSpeech(text, { persona = PRESETS.natural, lang = 'en', rate = 1, flavor = 'neutral', kind = 'msg', rnd = Math.random } = {}) {
  const base = cleanForSpeech(text, lang); if (!base) return [];
  const chunks = [], pr = persona.pitch, rt = persona.rate * Math.min(1.4, Math.max(0.6, rate)), fx = persona.fx?.[lang === 'he' ? 'he' : 'en'];
  const wordCount = base.split(/\s+/).length, long = kind !== 'short' && wordCount > 3;
  const flav = FLAVORS[persona.flavor && flavor === 'neutral' ? persona.flavor : flavor] ?? FLAVORS.neutral, pool = flav[lang === 'he' ? 'he' : 'en'] || [];
  if (long && persona.fx && fx && rnd() < 0.7) chunks.push({ text: fx, pitch: Math.min(2, persona.fx.pitch), rate: persona.fx.rate, pauseMs: 260 });
  const body = (long && pool.length && rnd() < 0.4 ? `${pool[Math.floor(rnd() * pool.length)]} ${base}` : base);
  const ps = phrases(body);
  ps.forEach((p, i) => {
    const q = /\?$/.test(p), ex = /!$/.test(p), endsSentence = /[.!?]$/.test(p), jit = (k) => (hash(`${p}${i}${k}`) - 0.5) * 0.04;
    let pitch = pr + jit('p'), r = rt + jit('r') * 0.5;
    if (i === 0) r -= 0.03;                         // a gentle start
    if (q) pitch += 0.08; else if (ex) { pitch += 0.05; r += 0.03; } else if (endsSentence) pitch -= 0.03;   // rising / firm / falling ends
    chunks.push({ text: p, pitch: Math.min(2, Math.max(0.1, pitch)), rate: Math.min(2, Math.max(0.4, r)), pauseMs: i === ps.length - 1 ? 0 : Math.round((endsSentence ? 340 : 150) * persona.pause) });
  });
  return chunks;
}

let token = 0, timer = null;
const nativeWaiters = new Map();   // phrase id -> "it finished" callback
globalThis.addEventListener?.('morning-native', (e) => { const d = e.detail; if (d?.type === 'tts' && (d.status === 'done' || d.status === 'error')) nativeWaiters.get(d.id)?.(); });
export function stopSpeaking() { token++; clearTimeout(timer); nativeWaiters.clear(); try { if (useNative()) native.ttsStop(); if (webTts()) speechSynthesis.cancel(); } catch { /* no TTS */ } }

/** Speak `text`. opts: { lang, voiceURI, preset (character id), flavor, rate (pace multiplier, 1 = normal), kind }. Returns false when speech is unavailable. */
export function speakText(text, { lang = 'en', voiceURI = '', preset = 'natural', flavor = 'neutral', rate = 1, kind = 'msg' } = {}) {
  if (!ttsSupported() || !text) return false;
  try {
    stopSpeaking(); const my = token, persona = personaOf(preset), plan = planSpeech(text, { persona, lang, rate, flavor, kind });
    if (!plan.length) return false;
    const voice = pickVoice(allVoices(), lang, persona, voiceURI), viaPhone = useNative();
    const go = (i) => {
      if (my !== token || i >= plan.length) return;
      const c = plan[i]; let advanced = false; const id = `${my}-${i}`;
      const next = () => { if (advanced || my !== token) return; advanced = true; nativeWaiters.delete(id); clearTimeout(timer); timer = setTimeout(() => go(i + 1), c.pauseMs); };
      if (viaPhone) { nativeWaiters.set(id, next); native.ttsSpeak(id, c.text, voice?.name || '', bcp(lang), c.pitch, c.rate); }
      else { const u = new SpeechSynthesisUtterance(c.text); u.lang = bcp(lang); u.pitch = c.pitch; u.rate = c.rate; if (voice) u.voice = voice; u.onend = next; u.onerror = next; speechSynthesis.speak(u); }
      clearTimeout(timer); timer = setTimeout(next, Math.max(1500, (c.text.length * 95) / c.rate));   // some engines never fire "end": never get stuck
    };
    go(0); return true;
  } catch { return false; }
}

// Voice commands for a running routine (pure): a short spoken phrase -> one command. Hebrew and English, with several ways to say each one.
// Matching is deliberately strict so that ordinary talking does not press buttons: the utterance must be short and be (almost) just the phrase,
// and the longest matching phrase wins ("pause the timer" is not "stop"). Anything risky (stopping the whole routine) only OPENS the usual
// confirmation, and a spoken "yes" / "no" answers it.

/** id -> { he: [...], en: [...] } plus the i18n label key `vc_<id>`. First phrase of each language is the one shown as the example. */
export const COMMANDS = [
  ['done', ['סיימתי', 'סיימנו', 'סיים', 'בוצע', 'עשיתי', 'הבא', 'הלאה', 'המשימה הבאה'], ['done', 'finished', 'i am done', 'completed', 'next', 'next step']],
  ['addTime', ['תוספת זמן', 'עוד זמן', 'עוד דקה', 'הוסף דקה', 'הוסף זמן', 'דקה נוספת'], ['add time', 'more time', 'extra time', 'one more minute', 'add a minute']],
  ['pause', ['השהה', 'השהיה', 'תשהה', 'הפסקה', 'פאוז'], ['pause', 'hold on', 'wait']],
  ['resume', ['המשך', 'תמשיך', 'ממשיכים', 'חזור', 'להמשיך'], ['resume', 'continue', 'go on', 'keep going']],
  ['skip', ['דלג', 'דילוג', 'תדלג', 'לדלג'], ['skip', 'skip it', 'skip this']],
  ['stop', ['עצור', 'עצירה', 'הפסק', 'סיים שגרה', 'עצור שגרה'], ['stop', 'stop the routine', 'end the routine', 'quit']],
  ['journal', ['יומן', 'פתח יומן', 'הערה', 'רשום הערה'], ['journal', 'open journal', 'note', 'write a note']],
  ['calm', ['פינת הרוגע', 'פינת רוגע', 'רוגע', 'נשימה', 'להירגע'], ['calm corner', 'calm', 'breathe', 'breathing', 'relax']],
  ['remind', ['הזכר לי את השלב', 'הזכר לי', 'מה השלב', 'מה עכשיו', 'איזה שלב'], ['remind me the step', 'remind me', 'what is the step', 'what now', 'which step']],
  ['timeLeft', ['כמה זמן נשאר', 'כמה נשאר', 'כמה זמן'], ['how much time is left', 'time left', 'how much time', 'how long']],
  ['tip', ['טיפ', 'עצה', 'תן טיפ'], ['tip', 'give me a tip', 'advice']],
  ['yes', ['כן', 'אשר', 'בטח', 'אוקיי'], ['yes', 'confirm', 'okay', 'ok']],
  ['no', ['לא', 'ביטול', 'לא עכשיו'], ['no', 'cancel', 'not now']],
].map(([id, he, en]) => ({ id, phrases: { he, en } }));
export const COMMAND_IDS = COMMANDS.map((c) => c.id);

/** Lower case, no vowel points, no punctuation, single spaces. */
export const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[֑-ׇ]/g, '').replace(/[׳'’"״.,!?;:()\-]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => (s ? s.split(' ') : []);
const FILLER = new Set('אז נו בבקשה תודה הי היי שלום ok please hey so now um uh the'.split(' '));

/**
 * What did the person say? -> { id, phrase } or null. Short utterances only (at most the phrase + 2 words), the phrase must appear as whole words.
 */
export function parseCommand(text, lang = 'he') {
  const said = words(norm(text)).filter((w, i, a) => !(FILLER.has(w) && a.length > 1)); if (!said.length || said.length > 7) return null;
  let best = null;
  for (const c of COMMANDS) for (const phrase of c.phrases[lang === 'he' ? 'he' : 'en']) {
    const p = words(norm(phrase)); if (!p.length || p.length > said.length) continue;
    for (let i = 0; i + p.length <= said.length; i++) {
      if (p.every((w, k) => said[i + k] === w) && said.length <= p.length + 2 && (!best || p.length > best.len)) best = { id: c.id, phrase, len: p.length };
    }
  }
  return best ? { id: best.id, phrase: best.phrase } : null;
}
/** Phrases of every command for the help list: [{ id, examples: [..up to 3] }]. */
export const helpList = (lang) => COMMANDS.filter((c) => c.id !== 'yes' && c.id !== 'no').map((c) => ({ id: c.id, examples: c.phrases[lang === 'he' ? 'he' : 'en'].slice(0, 3) }));

/** Never act twice on the same command within `ms` (recognisers repeat a result, and people repeat themselves). */
export function dedupe(ms = 2500) { let lastId = '', at = 0; return (id, now = Date.now()) => { if (id === lastId && now - at < ms) return false; lastId = id; at = now; return true; }; }

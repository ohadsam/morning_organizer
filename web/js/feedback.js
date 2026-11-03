// Encouraging messages. Pure: choose(event, opts) is deterministic given `rnd`. Messages are gender-neutral (Hebrew especially)
// and always put {name} where removing it still leaves a natural sentence (", {name}" is dropped when no name is set).
import { cleanText } from './util.js';

export const POOLS = {
  en: {
    start: ['Let’s go, {name}!', 'You’ve got this, {name}!', 'A great day starts now, {name}!', 'Ready, set, go!'],
    warn: ['Almost there, {name}!', 'Just a few more seconds!', 'You can do it, {name}!', 'Finish strong!'],
    over: ['A little more, {name} - you can do it!', 'Take a breath, then finish up!', 'Almost done - don’t give up!', 'It’s okay, take the time you need.'],
    taskEarly: ['Wow, that was fast, {name}!', 'Superstar - ahead of time!', 'Amazing speed, {name}!', 'You’re flying today!'],
    taskDone: ['Well done, {name}!', 'Great job!', 'Nailed it, {name}!', 'One more done!'],
    taskLate: ['That’s okay, {name} - on to the next one!', 'No worries, every step counts!', 'Good effort, {name} - keep going!', 'It’s fine - you did it!'],
    paused: ['Take a breath, {name}. We’ll wait.', 'Paused - continue when you’re ready.', 'No rush at all, {name}.'],
    resumed: ['Welcome back, {name}!', 'Back to it - you’ve got this!', 'Here we go again!'],
    runDone: ['Amazing, {name} - everything is done!', 'Champion! The whole routine is complete!', 'What a morning, {name}!', 'Super job, {name}!'],
    runStopped: ['That’s okay, {name}. Tomorrow is a new chance!', 'Good try, {name} - every start counts!', 'Well, you started - that’s what matters!'],
  },
  he: {
    start: ['יאללה, {name}!', 'אתם מסוגלים, {name}!', 'יום מעולה מתחיל עכשיו, {name}!', 'מוכנים, לכו!'],
    warn: ['כמעט שם, {name}!', 'עוד כמה שניות!', 'אפשר, {name}!', 'מסיימים בכוח!'],
    over: ['עוד קצת, {name} - אפשר!', 'נשימה עמוקה, ואז מסיימים!', 'כמעט סיימנו - לא מוותרים!', 'זה בסדר, קחו את הזמן שצריך.'],
    taskEarly: ['וואו, זה היה מהר, {name}!', 'כוכב על - לפני הזמן!', 'מהירות מדהימה, {name}!', 'היום אתם עפים!'],
    taskDone: ['כל הכבוד, {name}!', 'עבודה מצוינת!', 'הצלחה, {name}!', 'עוד משימה בוצעה!'],
    taskLate: ['זה בסדר, {name} - עוברים למשימה הבאה!', 'בלי לחץ, כל צעד נחשב!', 'ניסיון מצוין, {name} - ממשיכים!', 'הכול טוב - עשיתם את זה!'],
    paused: ['נשימה עמוקה, {name}. אנחנו מחכים.', 'מושהה - ממשיכים כשמוכנים.', 'בלי לחץ, {name}.'],
    resumed: ['ברוכים השבים, {name}!', 'חוזרים לעניינים - אפשר!', 'יאללה, ממשיכים!'],
    runDone: ['מדהים, {name} - הכול הושלם!', 'אלופים! כל השגרה הושלמה!', 'איזה בוקר, {name}!', 'עבודה מעולה, {name}!'],
    runStopped: ['זה בסדר, {name}. מחר יום חדש!', 'ניסיון יפה, {name} - כל התחלה נחשבת!', 'התחלתם - וזה מה שחשוב!'],
  },
};
export const EMOJI = {
  start: ['🚀', '🌞', '💪'], warn: ['⏳', '🔥', '👀'], over: ['🌬️', '💫', '🤗'], taskEarly: ['⚡', '🌟', '🏅'], taskDone: ['✅', '👏', '🎯'],
  taskLate: ['🌈', '🤝', '🍀'], paused: ['🧘', '☁️', '🫶'], resumed: ['🔄', '💪', '🌤️'], runDone: ['🎉', '🏆', '🥳'], runStopped: ['🌈', '🌱', '🫶'],
};

/** Fill {name}; with no name, drop it together with its punctuation so the sentence stays natural. */
export function fill(msg, name) {
  const n = cleanText(name, 30);
  if (n) return msg.replaceAll('{name}', n);
  return msg.replace(/^\{name\},?\s*/, '').replace(/,?\s*\{name\}/g, '').replace(/\s+([!?.])/g, '$1').trim();
}

/** Classify a finished task relative to its plan. */
export function taskEvent(actualSec, plannedSec) {
  if (actualSec <= plannedSec * 0.9) return 'taskEarly';
  if (actualSec <= plannedSec * 1.2) return 'taskDone';
  return 'taskLate';
}

/** -> { text, emoji, index }. `last` (index of the previous pick for this event) is avoided so the same line never repeats back-to-back. */
export function choose(event, { name = '', lang = 'en', last = -1, rnd = Math.random } = {}) {
  const pool = POOLS[lang]?.[event] ?? POOLS.en[event];
  if (!pool) return null;
  let i = Math.floor(rnd() * pool.length);
  if (pool.length > 1 && i === last) i = (i + 1) % pool.length;
  const em = EMOJI[event];
  return { text: fill(pool[i], name), emoji: em[Math.floor(rnd() * em.length)], index: i };
}

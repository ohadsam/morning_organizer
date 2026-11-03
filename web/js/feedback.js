// Encouraging messages. Pure: choose(event, opts) is deterministic given `rnd`. Messages are gender-neutral (Hebrew especially)
// and always put {name} where removing it still leaves a natural sentence (", {name}" is dropped when no name is set).
import { cleanText } from './util.js';

export const POOLS = {
  en: {
    start: ['Let’s go, {name}!', 'You’ve got this, {name}!', 'A great day starts now, {name}!', 'Ready, set, go!', 'Today is going to be a good one, {name}!', 'First step: done thinking, now doing!', 'Here we go - one step at a time!'],
    warn: ['Almost there, {name}!', 'Just a few more seconds!', 'You can do it, {name}!', 'Finish strong!', 'Ten seconds - you’re doing great, {name}!', 'Nearly there - hold on!', 'Last stretch, {name}!'],
    over: ['A little more, {name} - you can do it!', 'Take a breath, then finish up!', 'Almost done - don’t give up!', 'It’s okay, take the time you need.', 'No stress, {name} - finish this bit and we’ll move on.', 'You’re allowed to take a breath. Then wrap up.', 'Slow is fine. Just keep going.'],
    taskEarly: ['Wow, that was fast, {name}!', 'Superstar - ahead of time!', 'Amazing speed, {name}!', 'You’re flying today!', 'Boom! Done early, {name}!', 'Look at you go!', 'Ahead of the clock - nice, {name}!'],
    taskDone: ['Well done, {name}!', 'Great job!', 'Nailed it, {name}!', 'One more done!', 'Another one ticked off, {name}!', 'Smooth work!', 'That’s how it’s done, {name}!'],
    taskLate: ['That’s okay, {name} - on to the next one!', 'No worries, every step counts!', 'Good effort, {name} - keep going!', 'It’s fine - you did it!', 'It took a bit longer - that’s okay, {name}.', 'Done is done - well done!', 'You finished it, and that’s what counts!'],
    paused: ['Take a breath, {name}. We’ll wait.', 'Paused - continue when you’re ready.', 'No rush at all, {name}.', 'Pause button pressed - breathe, {name}.', 'Take the time you need.', 'We’re right here when you’re ready, {name}.'],
    resumed: ['Welcome back, {name}!', 'Back to it - you’ve got this!', 'Here we go again!', 'Back in action, {name}!', 'Ready again - let’s roll!', 'Nice to have you back!'],
    runDone: ['Amazing, {name} - everything is done!', 'Champion! The whole routine is complete!', 'What a morning, {name}!', 'Super job, {name}!', 'The whole routine - done! Proud of you, {name}!', 'Mission complete, {name}!', 'You did every single step, {name}!'],
    leaveSoon: ['Almost time to leave, {name}!', 'Keep an eye on the clock - departure is coming up.', 'Shoes and bag soon, {name}!', 'Coat, bag, keys - almost time, {name}!', 'Clock check: leaving soon!', 'Nearly time to go, {name}!'],
    leaveNow: ['Time to head out, {name}!', 'It’s leaving time - you’ve got this!', 'Out the door we go, {name}!', 'Door time, {name} - let’s go!', 'It’s time - off we go!', 'Out the door, {name}, you’re ready!'],
    runStopped: ['That’s okay, {name}. Tomorrow is a new chance!', 'Good try, {name} - every start counts!', 'Well, you started - that’s what matters!', 'You gave it a go, {name} - that counts!', 'Some mornings are like that. Tomorrow is a fresh start!', 'Thanks for trying, {name}.'],
  },
  // Hebrew is gendered: {male|female} tokens are resolved by personalize() from the profile.
  he: {
    start: ['יאללה, {name}!', '{אתה מסוגל|את מסוגלת}, {name}!', 'יום מעולה מתחיל עכשיו, {name}!', '{מוכן|מוכנה}? {לך|לכי}!', 'היום הולך להיות יום טוב, {name}!', 'הצעד הראשון: מסיימים לחשוב, מתחילים לעשות!', 'יוצאים לדרך - צעד אחרי צעד!'],
    warn: ['כמעט שם, {name}!', 'עוד כמה שניות!', 'אפשר, {name}!', '{סיים|סיימי} בכוח!', 'עשר שניות - {אתה מצוין|את מצוינת}, {name}!', 'כמעט שם - מחזיקים!', 'הקטע האחרון, {name}!'],
    over: ['עוד קצת, {name} - אפשר!', 'נשימה עמוקה, ואז מסיימים!', 'כמעט סיימנו - לא מוותרים!', 'זה בסדר, {קח|קחי} את הזמן שצריך.', 'בלי לחץ, {name} - מסיימים את החלק הזה וממשיכים.', 'מותר לקחת נשימה. ואז מסכמים.', 'לאט זה בסדר. העיקר להמשיך.'],
    taskEarly: ['וואו, זה היה מהר, {name}!', '{כוכב|כוכבת} על - לפני הזמן!', 'מהירות מדהימה, {name}!', 'היום {אתה עף|את עפה}!', 'בום! סיימת מוקדם, {name}!', 'תראו אותך זורם!', 'לפני השעון - יפה, {name}!'],
    taskDone: ['כל הכבוד, {name}!', 'עבודה מצוינת!', 'הצלחת, {name}!', 'עוד משימה בוצעה!', 'עוד אחת סומנה, {name}!', 'עבודה חלקה!', 'ככה עושים את זה, {name}!'],
    taskLate: ['זה בסדר, {name} - עוברים למשימה הבאה!', 'בלי לחץ, כל צעד נחשב!', 'ניסיון מצוין, {name} - ממשיכים!', 'הכול טוב - עשית את זה!', 'זה לקח קצת יותר - וזה בסדר, {name}.', 'גמרנו זה גמרנו - כל הכבוד!', 'סיימת, וזה מה שחשוב!'],
    paused: ['נשימה עמוקה, {name}. אנחנו מחכים.', 'מושהה - ממשיכים כשמוכנים.', 'בלי לחץ, {name}.', 'כפתור ההשהיה נלחץ - נשימה, {name}.', 'קחו את הזמן שצריך.', 'אנחנו כאן, מחכים לך, {name}.'],
    resumed: ['{ברוך|ברוכה} שובך, {name}!', 'חוזרים לעניינים - אפשר!', 'יאללה, ממשיכים!', 'חזרנו לפעולה, {name}!', 'מוכנים שוב - מתחילים לגלגל!', 'כיף שחזרת!'],
    runDone: ['מדהים, {name} - הכול הושלם!', '{אלוף|אלופה}! כל השגרה הושלמה!', 'איזה בוקר, {name}!', 'עבודה מעולה, {name}!', 'כל השגרה - הושלמה! גאים בך, {name}!', 'משימה הושלמה, {name}!', 'עשית כל צעד וצעד, {name}!'],
    leaveSoon: ['כמעט הזמן לצאת, {name}!', 'שימו עין על השעון - היציאה מתקרבת.', 'עוד מעט נעליים ותיק, {name}!', 'מעיל, תיק, מפתחות - כמעט הזמן, {name}!', 'בדיקת שעון: יוצאים עוד מעט!', 'כמעט הזמן לצאת, {name}!'],
    leaveNow: ['הגיע הזמן לצאת, {name}!', 'זמן יציאה - אפשר!', 'יוצאים לדרך, {name}!', 'זמן דלת, {name} - יוצאים!', 'הגיע הזמן - יוצאים לדרך!', 'החוצה, {name}, {אתה מוכן|את מוכנה}!'],
    runStopped: ['זה בסדר, {name}. מחר יום חדש!', 'ניסיון יפה, {name} - כל התחלה נחשבת!', 'התחלת - וזה מה שחשוב!', 'ניסית, {name} - וזה נחשב!', 'יש בקרים כאלה. מחר התחלה חדשה!', 'תודה שניסית, {name}.'],
  },
};
/** Extra, more playful lines mixed in for young children (age <= 11). */
export const KID_EXTRA = {
  en: { start: ['Superhero mode: ON! 🦸'], taskEarly: ['Zoom! Faster than a rocket! 🚀'], taskDone: ['High five! ✋', 'Nailed it like a ninja! 🥷'], warn: ['Almost! Tiny rocket countdown! 🚀'], taskLate: ['Even turtles get there - slow and steady! 🐢'], runDone: ['Legend of the morning! 👑', 'You earned the golden sticker! 🌟'] },
  he: { start: ['מצב {גיבור|גיבורת} על: פעיל! 🦸'], taskEarly: ['וווש! מהר יותר מרקטה! 🚀'], taskDone: ['כיף חמש! ✋', 'עשית את זה כמו נינג׳ה! 🥷'], warn: ['כמעט! ספירה לאחור של רקטה קטנה! 🚀'], taskLate: ['גם צבים מגיעים - לאט ובטוח! 🐢'], runDone: ['אגדת הבוקר! 👑', 'הרווחת את המדבקה הזהובה! 🌟'] },
};
export const EMOJI = {
  start: ['🚀', '🌞', '💪'], warn: ['⏳', '🔥', '👀'], over: ['🌬️', '💫', '🤗'], taskEarly: ['⚡', '🌟', '🏅'], taskDone: ['✅', '👏', '🎯'],
  taskLate: ['🌈', '🤝', '🍀'], paused: ['🧘', '☁️', '🫶'], resumed: ['🔄', '💪', '🌤️'], runDone: ['🎉', '🏆', '🥳'], leaveSoon: ['⏰', '🚪', '👟'], leaveNow: ['🚪', '🚀', '👋'], runStopped: ['🌈', '🌱', '🫶'],
};

/** Resolve {male|female} / {male|female|neutral} tokens. Unspecified gender -> "male/female" so nobody is mis-addressed. */
export function gendered(msg, gender = 'other') {
  return msg.replace(/\{([^{}|]*)\|([^{}|]*)(?:\|([^{}|]*))?\}/g, (_, m, f, n) =>
    gender === 'male' ? m : gender === 'female' ? f : (n ?? (m === f ? m : `${m}/${f}`)));
}
/** Fill {name}; with no name, drop it together with its punctuation so the sentence stays natural. */
export function fill(msg, name) {
  const n = cleanText(name, 30);
  if (n) return msg.replaceAll('{name}', n);
  return msg.replace(/^\{name\},?\s*/, '').replace(/,?\s*\{name\}/g, '').replace(/\s+([!?.])/g, '$1').trim();
}
export const personalize = (msg, { name = '', gender = 'other' } = {}) => fill(gendered(msg, gender), name);

/** Audience tier from age: kid <= 11, teen 12-17, adult 18+ (unknown age -> adult: friendly but not childish). */
export function audience(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n <= 0) return 'adult';
  return n <= 11 ? 'kid' : n <= 17 ? 'teen' : 'adult';
}

/** Classify a finished task relative to its plan. */
export function taskEvent(actualSec, plannedSec) {
  if (actualSec <= plannedSec * 0.9) return 'taskEarly';
  if (actualSec <= plannedSec * 1.2) return 'taskDone';
  return 'taskLate';
}

/** -> { text, emoji, index }. `last` (index of the previous pick for this event) is avoided so the same line never repeats back-to-back. */
export function choose(event, { name = '', lang = 'en', gender = 'other', age = null, last = -1, rnd = Math.random } = {}) {
  const base = POOLS[lang]?.[event] ?? POOLS.en[event];
  if (!base) return null;
  const pool = audience(age) === 'kid' ? [...base, ...(KID_EXTRA[lang]?.[event] ?? [])] : base;
  let i = Math.floor(rnd() * pool.length);
  if (pool.length > 1 && i === last) i = (i + 1) % pool.length;
  const em = EMOJI[event];
  return { text: personalize(pool[i], { name, gender }), emoji: em[Math.floor(rnd() * em.length)], index: i };
}

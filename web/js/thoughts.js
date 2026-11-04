// "A kind thought" and "Relax" suggestions for the moment a task feels hard (pure data + picking). Different every time, worded for the person's age:
// kids get short playful lines, teens and adults get calm, practical ones. Not therapy - small, kind nudges (CBT-style reframes, self-compassion,
// body-based relaxation). Hebrew uses neutral forms or {male|female} tokens resolved by personalize().
import { audience, personalize } from './feedback.js';

// [kind, kid-en, kid-he, adult-en, adult-he]   kinds: effort · kind · reframe · start · proud
const TH = [
  ['effort', 'Hard things make my brain stronger, like a muscle! 💪', 'דברים קשים מחזקים את המוח, כמו שריר! 💪', 'Effort is what builds the skill. Hard means I am growing.', 'המאמץ הוא מה שבונה את היכולת. קשה אומר שאני מתפתח.'],
  ['effort', 'Every superhero practised before they were good.', 'כל גיבור על התאמן לפני שהיה טוב.', 'Nobody is good at something before practising it. This is practice.', 'אף אחד לא טוב במשהו לפני שמתרגלים אותו. זה תרגול.'],
  ['kind', 'It is okay to find this tricky. You are doing your best! 🌈', 'זה בסדר שזה מסובך. עושים את המיטב! 🌈', 'It is okay that this is hard. I can be kind to myself while I do it.', 'זה בסדר שקשה. אפשר להיות נחמד לעצמי תוך כדי.'],
  ['kind', 'What would you say to a friend who finds this hard? Say it to yourself too. 🫶', 'מה היית אומרים לחבר שקשה לו? תגידו את זה גם לעצמכם. 🫶', 'What would I say to a friend in this spot? I can say the same to myself.', 'מה הייתי אומר לחבר במצב כזה? אפשר לומר לעצמי את אותו הדבר.'],
  ['kind', 'Mistakes are how we learn. Oops is allowed! 🙈', 'טעויות הן הדרך ללמוד. מותר להגיד אופס! 🙈', 'A slip is information, not a verdict on me.', 'טעות היא מידע, לא פסק דין עליי.'],
  ['reframe', 'Hard right now does not mean hard forever. ⏳', 'קשה עכשיו לא אומר קשה לתמיד. ⏳', 'Hard right now is not hard forever. Feelings pass.', 'קשה עכשיו זה לא קשה לתמיד. תחושות עוברות.'],
  ['reframe', 'My brain says “I can’t”. I can say “I can’t YET”. 🌱', 'המוח אומר “אני לא יכול”. אפשר להגיד “אני עוד לא יכול”. 🌱', 'Swap “I can’t” for “I can’t yet” - and see what changes.', 'להחליף “אני לא יכול” ב“אני עוד לא יכול” - ולראות מה משתנה.'],
  ['reframe', 'Is the worry a fact, or just a thought passing by like a cloud? ☁️', 'האם הדאגה היא עובדה, או רק מחשבה שעוברת כמו ענן? ☁️', 'Is this thought a fact, or a prediction? What is the evidence for and against it?', 'האם המחשבה הזו עובדה או ניבוי? מה הראיות בעד ונגד?'],
  ['reframe', 'It does not have to be perfect. Good enough is great! ⭐', 'לא חייב להיות מושלם. מספיק טוב זה מצוין! ⭐', 'Done and good enough beats perfect and never started.', 'גמור ומספיק טוב עדיף על מושלם שלא התחיל.'],
  ['reframe', 'Big things are made of small steps. Just do the next little one. 🪜', 'דברים גדולים עשויים מצעדים קטנים. רק הצעד הקטן הבא. 🪜', 'I do not have to do it all - only the next small step.', 'לא חייבים הכול - רק את הצעד הקטן הבא.'],
  ['start', 'Try just two minutes. Then you can stop if you want! ⏱️', 'נסו רק שתי דקות. אחר כך אפשר להפסיק אם רוצים! ⏱️', 'Two minutes only. Starting is the hardest part; it usually gets easier.', 'רק שתי דקות. ההתחלה היא החלק הקשה; בדרך כלל זה נהיה קל יותר.'],
  ['start', 'What is the tiniest first step? Do only that! 🐜', 'מה הצעד הראשון הכי קטן? עושים רק אותו! 🐜', 'Name the tiniest first step - small enough that it feels silly - and do it.', 'לקרוא בשם לצעד הראשון הקטן ביותר - כל כך קטן שמרגיש מצחיק - ולעשות אותו.'],
  ['start', 'Put on a favourite song and start with the first bit! 🎵', 'שמים שיר אהוב ומתחילים בחלק הראשון! 🎵', 'Pair it with something pleasant: a song, a drink, a good spot.', 'לחבר את זה למשהו נעים: שיר, משקה, מקום נוח.'],
  ['proud', 'Look how far you got already! Pat yourself on the back. 👏', 'תראו כמה כבר עשיתם! טפחו לעצמכם על השכם. 👏', 'Notice what I have already done today. That counts.', 'לשים לב למה שכבר עשיתי היום. זה נחשב.'],
  ['proud', 'You have done hard things before. Remember one! 🏅', 'כבר עשיתם דברים קשים בעבר. זכרו אחד! 🏅', 'I have handled hard things before. Which one? What helped then?', 'כבר התמודדתי עם דברים קשים. עם איזה? מה עזר אז?'],
  ['proud', 'Asking for help is brave, not weak. 🤝', 'לבקש עזרה זה אמיץ, לא חלש. 🤝', 'Asking for help is a skill, not a failure.', 'לבקש עזרה זו מיומנות, לא כישלון.'],
  ['kind', 'Feeling frustrated is normal. Take a breath, then try again. 🌬️', 'להרגיש תסכול זה נורמלי. נושמים, ואז מנסים שוב. 🌬️', 'Frustration is a signal, not a stop sign. Breathe, then choose the next step.', 'תסכול הוא אות, לא תמרור עצור. לנשום ואז לבחור את הצעד הבא.'],
  ['effort', 'Slow is fine. Slow still moves forward! 🐢', 'לאט זה בסדר. לאט עדיין מתקדם! 🐢', 'Slow progress is still progress.', 'התקדמות איטית היא עדיין התקדמות.'],
  ['reframe', 'What is one thing that could make this a tiny bit easier? 🔧', 'מה דבר אחד שיכול להקל על זה קצת? 🔧', 'What is one change - place, tool, order, time - that would make this a bit easier?', 'איזה שינוי אחד - מקום, כלי, סדר, זמן - יקל על זה קצת?'],
  ['kind', 'You are not behind. You are on your own path. 🧭', 'אתם לא מאחרים. אתם בדרך שלכם. 🧭', 'I am not behind - I am on my own path, at my own pace.', 'אני לא מאחר - אני בדרך שלי, בקצב שלי.'],
  ['proud', 'Small win: you are still trying. That is the win! 🏆', 'ניצחון קטן: אתם עדיין מנסים. זה הניצחון! 🏆', 'Showing up and trying counts as a win today.', 'להגיע ולנסות נחשב ניצחון היום.'],
  ['effort', 'Take a tiny break, then come back stronger. 🔋', 'הפסקה קטנה, ואז חוזרים חזקים יותר. 🔋', 'A short break is part of the work. Recharge, then return.', 'הפסקה קצרה היא חלק מהעבודה. לטעון כוח ולחזור.'],
].map(([kind, ke, kh, ae, ah], i) => ({ id: `th${i}`, kind, text: { kid: { en: ke, he: kh }, adult: { en: ae, he: ah } } }));

// Exercises: [id, emoji, breath?, {kid:[title, steps], adult:[title, steps]} per language]
const EX = [
  ['belly', '🌬️', true, { en: { kid: ['Balloon belly', ['Put a hand on your tummy.', 'Breathe in slowly and blow your belly up like a balloon.', 'Breathe out slowly and let it go flat.', 'Do it 4 times.']], adult: ['Belly breathing', ['Rest a hand on your belly.', 'Breathe in through the nose for 4, belly rising.', 'Breathe out slowly for 6.', 'Repeat 5 times.']] },
    he: { kid: ['בטן בלון', ['שמים יד על הבטן.', 'נושמים לאט ומנפחים את הבטן כמו בלון.', 'נושפים לאט ומוציאים את האוויר.', 'עושים את זה 4 פעמים.']], adult: ['נשימת בטן', ['מניחים יד על הבטן.', 'שואפים דרך האף למשך 4, והבטן עולה.', 'נושפים לאט למשך 6.', 'חוזרים 5 פעמים.']] } }],
  ['flower', '🌸', true, { en: { kid: ['Smell the flower, blow the candle', ['Pretend to hold a flower. Sniff it slowly.', 'Now pretend to blow out a candle, slowly.', 'Again, 4 times!']], adult: ['In through the nose, out like a candle', ['Breathe in through the nose for 4.', 'Breathe out through pursed lips as if blowing a candle, for 6.', 'Repeat 5 times.']] },
    he: { kid: ['מריחים פרח, מכבים נר', ['מדמיינים פרח ביד. מריחים לאט.', 'עכשיו מדמיינים שמכבים נר, לאט.', 'שוב, 4 פעמים!']], adult: ['שאיפה באף, נשיפה כמו כיבוי נר', ['שואפים דרך האף למשך 4.', 'נושפים בשפתיים מכווצות כאילו מכבים נר, למשך 6.', 'חוזרים 5 פעמים.']] } }],
  ['squeeze', '✊', false, { en: { kid: ['Squeeze like a lemon', ['Squeeze your fists tight like squeezing lemons - count to 5.', 'Let go and shake your hands out.', 'Now squeeze your shoulders up to your ears, then drop them!']], adult: ['Tense and release', ['Clench your fists for 5 seconds.', 'Release and notice the difference.', 'Raise your shoulders to your ears for 5, then let them drop.', 'Repeat once.']] },
    he: { kid: ['סוחטים כמו לימון', ['סוחטים אגרופים חזק כמו לימונים - סופרים עד 5.', 'משחררים ומנערים את הידיים.', 'עכשיו מרימים כתפיים עד האוזניים, ואז מפילים!']], adult: ['מתח ושחרור', ['מכווצים אגרופים ל-5 שניות.', 'משחררים ומרגישים את ההבדל.', 'מרימים כתפיים לאוזניים ל-5, ואז משחררים.', 'חוזרים פעם נוספת.']] } }],
  ['shake', '🪩', false, { en: { kid: ['Shake it out!', ['Stand up and shake your hands.', 'Shake your arms, your legs, your whole body - like a wet puppy!', 'Stop, take a big breath. Better?']], adult: ['Shake it out', ['Stand and shake hands, arms and legs for 20 seconds.', 'Stop. Take one slow breath.', 'Notice the body: lighter?']] },
    he: { kid: ['מנערים הכול!', ['עומדים ומנערים את הידיים.', 'מנערים זרועות, רגליים, כל הגוף - כמו גור רטוב!', 'עוצרים, נשימה גדולה. יותר טוב?']], adult: ['ניעור הגוף', ['עומדים ומנערים ידיים, זרועות ורגליים 20 שניות.', 'עוצרים. נשימה איטית אחת.', 'שמים לב לגוף: קל יותר?']] } }],
  ['senses', '🖐️', false, { en: { kid: ['Spy with five senses', ['Find 5 things you can SEE.', 'Find 4 things you can TOUCH.', 'Listen: what are 3 sounds?', 'You did it!']], adult: ['5-4-3-2-1 grounding', ['Name 5 things you see, 4 you can touch, 3 you hear.', 'Then 2 you smell and 1 you taste.', 'Go slowly - no rush.']] },
    he: { kid: ['מרגלים עם חמשת החושים', ['מוצאים 5 דברים שאפשר לראות.', 'מוצאים 4 דברים שאפשר לגעת בהם.', 'מקשיבים: מהם 3 קולות?', 'הצלחתם!']], adult: ['קרקוע 5-4-3-2-1', ['קוראים בשם ל-5 דברים שרואים, 4 שאפשר לגעת, 3 ששומעים.', 'אחר כך 2 שמריחים ו-1 שטועמים.', 'לאט - אין לחץ.']] } }],
  ['butterfly', '🦋', false, { en: { kid: ['Butterfly hug', ['Cross your arms and hold your shoulders.', 'Tap left, right, left, right - slowly, like butterfly wings.', 'Breathe slowly while you tap. 10 taps.']], adult: ['Butterfly hug', ['Cross your arms over your chest.', 'Tap alternately left and right, slowly.', 'Breathe slowly for about 10 taps.']] },
    he: { kid: ['חיבוק פרפר', ['משלבים ידיים ואוחזים בכתפיים.', 'מקישים שמאל, ימין, שמאל, ימין - לאט, כמו כנפי פרפר.', 'נושמים לאט תוך כדי. 10 הקשות.']], adult: ['חיבוק פרפר', ['משלבים ידיים על החזה.', 'מקישים לסירוגין שמאל וימין, לאט.', 'נושמים לאט במשך כ-10 הקשות.']] } }],
  ['wall', '🧱', false, { en: { kid: ['Push the wall', ['Stand facing a wall. Push it with both hands as hard as you can - 10 seconds.', 'Relax. Shake your arms.', 'Strong! Do it once more.']], adult: ['Wall push', ['Push against a wall with both hands for 10 seconds.', 'Release and feel the muscles soften.', 'Repeat once.']] },
    he: { kid: ['דוחפים את הקיר', ['עומדים מול קיר. דוחפים אותו בשתי הידיים הכי חזק - 10 שניות.', 'משחררים. מנערים זרועות.', 'חזקים! עוד פעם אחת.']], adult: ['דחיפת קיר', ['דוחפים קיר בשתי הידיים 10 שניות.', 'משחררים ומרגישים את השרירים מתרככים.', 'חוזרים פעם אחת.']] } }],
  ['water', '💧', false, { en: { kid: ['Cool water', ['Splash a little cool water on your hands or face.', 'Take a slow sip of water.', 'Breathe in, breathe out. Ready!']], adult: ['Cool water reset', ['Run cool water over your hands or face.', 'Drink a few slow sips.', 'Take one deep breath before going on.']] },
    he: { kid: ['מים קרירים', ['מתיזים קצת מים קרירים על הידיים או הפנים.', 'לוגם לגימה איטית של מים.', 'שואפים, נושפים. מוכנים!']], adult: ['איפוס עם מים קרירים', ['מזרימים מים קרירים על הידיים או הפנים.', 'שותים כמה לגימות איטיות.', 'נשימה עמוקה אחת לפני שממשיכים.']] } }],
  ['count', '🔢', false, { en: { kid: ['Count backwards', ['Count backwards from 10 to 1, slowly.', 'On each number breathe out gently.', 'Wow, you are calm!']], adult: ['Count down', ['Count slowly from 10 to 1, one number per out-breath.', 'If you lose count, just start again - no problem.']] },
    he: { kid: ['סופרים לאחור', ['סופרים לאחור מ-10 עד 1, לאט.', 'בכל מספר נושפים בעדינות.', 'וואו, איזה רוגע!']], adult: ['ספירה לאחור', ['סופרים לאט מ-10 עד 1, מספר אחד לכל נשיפה.', 'אם איבדתם ספירה, מתחילים שוב - אין בעיה.']] } }],
  ['hum', '🐝', true, { en: { kid: ['Buzzing bee', ['Breathe in. Breathe out while humming “mmm” like a bee.', 'Feel the buzz in your nose.', '3 buzzes!']], adult: ['Humming breath', ['Breathe in through the nose.', 'Hum “mmm” on the out-breath and feel the vibration.', 'Repeat 4 times.']] },
    he: { kid: ['דבורה זמזמנית', ['שואפים. נושפים ומזמזמים “ממממ” כמו דבורה.', 'מרגישים את הזמזום באף.', '3 זמזומים!']], adult: ['נשימה עם זמזום', ['שואפים דרך האף.', 'מזמזמים “ממממ” בנשיפה ומרגישים את הרטט.', 'חוזרים 4 פעמים.']] } }],
  ['stretch', '🤸', false, { en: { kid: ['Tall like a tree', ['Stand tall and reach your arms up high.', 'Wiggle your fingers like leaves.', 'Slowly bend down and touch your toes. Up again!']], adult: ['Reach and fold', ['Reach both arms overhead and stretch tall.', 'Slowly fold forward and let the head hang.', 'Roll up slowly. Repeat twice.']] },
    he: { kid: ['גבוהים כמו עץ', ['עומדים זקוף ומושיטים ידיים גבוה.', 'מנענעים אצבעות כמו עלים.', 'מתכופפים לאט ונוגעים בבהונות. וחוזרים למעלה!']], adult: ['מתיחה למעלה וקיפול', ['מושיטים שתי ידיים מעל הראש ונמתחים.', 'מתקפלים קדימה לאט וצוואר רפוי.', 'מתרוממים לאט. חוזרים פעמיים.']] } }],
  ['hand', '🖐️', true, { en: { kid: ['Trace your hand', ['Slide one finger up each finger of your other hand while breathing in.', 'Slide down the other side while breathing out.', 'Do all five fingers.']], adult: ['Five-finger breathing', ['Trace your hand with a finger of the other hand.', 'Breathe in going up each finger, out going down.', 'Finish all five fingers.']] },
    he: { kid: ['מציירים את היד', ['מחליקים אצבע על כל אצבע של היד השנייה תוך כדי שאיפה.', 'יורדים בצד השני תוך כדי נשיפה.', 'עושים את כל חמש האצבעות.']], adult: ['נשימת חמש אצבעות', ['עוברים עם אצבע על קווי היד השנייה.', 'שואפים בעלייה על כל אצבע, נושפים בירידה.', 'משלימים את חמש האצבעות.']] } }],
  ['smile', '😊', false, { en: { kid: ['Silly face', ['Make the silliest face you can!', 'Now a big smile, and relax your face.', 'Smiling tells your brain: it’s okay.']], adult: ['Soften the face', ['Unclench your jaw, drop your shoulders.', 'Let a small smile form, even if it feels fake.', 'Notice any change.']] },
    he: { kid: ['פרצוף מצחיק', ['עושים את הפרצוף הכי מצחיק שאפשר!', 'עכשיו חיוך גדול, ומשחררים את הפנים.', 'חיוך אומר למוח: הכול בסדר.']], adult: ['הרפיית הפנים', ['משחררים את הלסת, מורידים כתפיים.', 'נותנים לחיוך קטן להופיע, גם אם הוא מרגיש מזויף.', 'שמים לב אם משהו משתנה.']] } }],
].map(([id, emoji, breath, text]) => ({ id, emoji, breath, text }));

export const THOUGHTS = TH, EXERCISES = EX;
const tierOf = (age) => (audience(age) === 'kid' ? 'kid' : 'adult');   // teens read the calm, practical wording
const pickFrom = (pool, seen, rnd, weight = () => 1) => {
  let fresh = pool.filter((x) => !seen.has(x.id)); if (!fresh.length) { seen.clear(); fresh = pool; }
  const sum = fresh.reduce((a, x) => a + weight(x), 0); let r = rnd() * sum, pick = fresh.at(-1);
  for (const x of fresh) { r -= weight(x); if (r < 0) { pick = x; break; } }
  seen.add(pick.id); return pick;
};
const KIND_WEIGHT = { hard: { kind: 3, reframe: 3, start: 2, effort: 1, proud: 1 }, easy: { proud: 3, effort: 2, kind: 1, reframe: 1, start: 1 } };
/** A kind thought for the moment. difficulty 1-5 (0 = unknown) tilts the choice. -> { id, kind, text } ; `seen` (Set of ids) is mutated so nothing repeats until all were shown. */
export function pickThought({ lang = 'en', age = null, gender = 'other', name = '', difficulty = 0, seen = new Set(), rnd = Math.random } = {}) {
  const w = difficulty >= 4 ? KIND_WEIGHT.hard : difficulty && difficulty <= 2 ? KIND_WEIGHT.easy : null, l = lang === 'he' ? 'he' : 'en';
  const x = pickFrom(THOUGHTS, seen, rnd, w ? (t) => w[t.kind] ?? 1 : undefined);
  return { id: x.id, kind: x.kind, text: personalize(x.text[tierOf(age)][l], { name, gender }) };
}
/** A relaxation exercise. -> { id, emoji, breath, title, steps[] } */
export function pickExercise({ lang = 'en', age = null, gender = 'other', name = '', seen = new Set(), rnd = Math.random, only = null } = {}) {
  const x = pickFrom(only ? EXERCISES.filter((e) => only.includes(e.id)) : EXERCISES, seen, rnd), [title, steps] = x.text[lang === 'he' ? 'he' : 'en'][tierOf(age)];
  return { id: x.id, emoji: x.emoji, breath: x.breath, title, steps: steps.map((s) => personalize(s, { name, gender })) };
}

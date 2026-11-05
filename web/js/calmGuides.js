// Guided imagery and body-scan scripts for the calm corner (pure data + one helper). Each guide is a short, gentle journey told one step at a time
// (read on screen and, if wanted, aloud). Techniques come from common CBT / mindfulness / ACT practice: grounding with the four elements, "safe place"
// imagery, leaves on a stream (defusion), a container for worries, balloon release, warm-light relaxation, mountain meditation, a kind helper.
// Self-help relaxation only - not therapy. Hebrew uses neutral plural forms.

/** Body scans: which body parts, in which order, and which sentence template (i18n key) is used for each. */
export const SCANS = {
  quick: { parts: ['feet', 'legs', 'belly', 'hands', 'shoulders', 'face'], step: 'scanStep' },
  full: { parts: ['toes', 'feet', 'ankles', 'calves', 'knees', 'thighs', 'belly', 'chest', 'back', 'hands', 'arms', 'shoulders', 'neck', 'jaw', 'eyes', 'forehead'], step: 'scanStep' },
  muscle: { parts: ['hands', 'arms', 'shoulders', 'face', 'belly', 'legs', 'feet'], step: 'tenseStep' },
  sleep: { parts: ['toes', 'feet', 'calves', 'thighs', 'belly', 'chest', 'hands', 'arms', 'shoulders', 'neck', 'jaw', 'eyes', 'forehead'], step: 'sleepStep' },
};
export const SCAN_IDS = Object.keys(SCANS);

export const GUIDES = [
  { id: 'elements', emoji: '🌍', title: { en: 'Four elements: earth, air, water, fire', he: 'ארבעת היסודות: אדמה, אוויר, מים, אש' },
    steps: {
      en: ['Earth. Feel your feet or your seat. Imagine roots growing from you into the ground, holding you steady.', 'Press down a little. Notice how solid the ground is. You are held.', 'Air. Breathe in slowly, as if the air is fresh and light, and let it fill you.', 'Breathe out slowly, like a gentle wind carrying away what you do not need.', 'Water. Imagine cool, clear water flowing over you, or a calm lake. Let your shoulders soften.', 'Let the water wash tension away, drop by drop.', 'Fire. Imagine a small warm flame in your chest: your courage and your energy.', 'Feel the warmth spreading. You are steady, fresh, calm and strong.', 'Hold all four together: steady like earth, light like air, calm like water, warm like fire. One more slow breath.'],
      he: ['אדמה. מרגישים את כפות הרגליים או את המושב. מדמיינים שורשים שצומחים מאיתנו אל האדמה ומחזיקים אותנו יציבים.', 'לוחצים קצת למטה. שמים לב כמה האדמה יציבה. אנחנו מוחזקים.', 'אוויר. נושמים פנימה לאט, כאילו האוויר רענן וקליל, ונותנים לו למלא אותנו.', 'נושפים לאט, כמו רוח עדינה שנושאת איתה מה שלא צריך.', 'מים. מדמיינים מים צלולים וקרירים שזורמים עלינו, או אגם רגוע. הכתפיים נרפות.', 'נותנים למים לשטוף את המתח, טיפה אחר טיפה.', 'אש. מדמיינים להבה קטנה וחמימה בחזה: האומץ והאנרגיה שלנו.', 'מרגישים את החום מתפשט. אנחנו יציבים, רעננים, רגועים וחזקים.', 'מחברים את ארבעתם: יציבים כמו אדמה, קלילים כמו אוויר, רגועים כמו מים, חמים כמו אש. עוד נשימה איטית אחת.'] } },
  { id: 'safeplace', emoji: '🏝️', title: { en: 'My safe place', he: 'המקום הבטוח שלי' },
    steps: {
      en: ['Think of a place where you feel safe and calm. Real or imagined: a room, a beach, a forest, a cozy corner.', 'Look around it. What colors do you see? What is close, and what is far away?', 'Listen. What sounds are there? Maybe water, wind, music, or a lovely quiet.', 'Notice the feeling of the air: warm, cool, soft. Feel what you are sitting or lying on.', 'Is there a smell here? Something fresh, sweet or familiar?', 'You are safe here. Choose one word for this place, and say it quietly to yourself.', 'Stay a moment. You can come back whenever you like, just by saying your word.'],
      he: ['חושבים על מקום שבו מרגישים בטוחים ורגועים. אמיתי או מדומיין: חדר, חוף, יער, פינה נעימה.', 'מסתכלים סביב. אילו צבעים רואים? מה קרוב ומה רחוק?', 'מקשיבים. אילו קולות יש? אולי מים, רוח, מוזיקה, או שקט נעים.', 'שמים לב לתחושת האוויר: חם, קריר, רך. מרגישים על מה יושבים או שוכבים.', 'יש כאן ריח? משהו רענן, מתוק או מוכר?', 'אנחנו בטוחים כאן. בוחרים מילה אחת למקום הזה, ואומרים אותה בשקט לעצמנו.', 'נשארים עוד רגע. אפשר לחזור לכאן בכל זמן, רק על ידי אמירת המילה.'] } },
  { id: 'beach', emoji: '🌊', title: { en: 'Waves on the beach', he: 'גלים על החוף' },
    steps: {
      en: ['Imagine you are on a quiet beach. The sand is warm under your feet.', 'Watch a wave roll in slowly. Breathe in as it comes.', 'The wave slides back to the sea. Breathe out as it goes.', 'Again: the wave comes in... and goes out. Let your breath follow the sea.', 'Feel the sun, warm and gentle on your face and shoulders.', 'Every wave takes a little worry out to sea. Watch them drift away.', 'Take one more breath with the waves, then slowly come back.'],
      he: ['מדמיינים חוף שקט. החול חם מתחת לכפות הרגליים.', 'צופים בגל שמתגלגל לאט פנימה. נושמים פנימה כשהוא מגיע.', 'הגל חוזר אל הים. נושפים כשהוא הולך.', 'שוב: הגל בא... והגל הולך. נותנים לנשימה ללכת אחרי הים.', 'מרגישים את השמש, חמימה ועדינה על הפנים והכתפיים.', 'כל גל לוקח איתו דאגה קטנה אל הים. צופים בהן מתרחקות.', 'עוד נשימה אחת עם הגלים, ואז חוזרים לאט.'] } },
  { id: 'forest', emoji: '🌲', title: { en: 'A walk in the forest', he: 'הליכה ביער' },
    steps: {
      en: ['Imagine a soft path that leads into a quiet forest. Take the first slow steps.', 'Smell the fresh trees and the earth. Breathe it in.', 'Hear the leaves moving and a bird somewhere far away.', 'Feel the cool, shady air on your skin.', 'You find a comfortable spot to rest, maybe a mossy rock or a fallen log. Sit down.', 'Rest here for a moment. The forest is calm, and so are you.', 'When you are ready, walk back along the path, feeling lighter.'],
      he: ['מדמיינים שביל רך שמוביל ליער שקט. עושים את הצעדים הראשונים לאט.', 'מריחים את העצים הרעננים ואת האדמה. נושמים אותם פנימה.', 'שומעים עלים זזים וציפור אי שם מרחוק.', 'מרגישים את האוויר הקריר והמוצל על העור.', 'מוצאים מקום נוח לנוח בו, אולי סלע מכוסה טחב או גזע שנפל. יושבים.', 'נחים כאן רגע. היער רגוע, וגם אנחנו.', 'כשמוכנים, חוזרים בשביל, ומרגישים קלים יותר.'] } },
  { id: 'mountain', emoji: '⛰️', title: { en: 'Strong like a mountain', he: 'חזקים כמו הר' },
    steps: {
      en: ['Imagine a big, steady mountain. Sit or stand tall, like the mountain.', 'Feel your base wide and heavy, and your top reaching up.', 'Weather passes over the mountain: sun, clouds, wind, rain. The mountain stays.', 'Thoughts and feelings are like weather. They come, and they go.', 'You do not have to chase them or push them away. Just stay steady.', 'Take a slow breath. You are the mountain, calm and strong.'],
      he: ['מדמיינים הר גדול ויציב. יושבים או עומדים זקופים, כמו ההר.', 'מרגישים בסיס רחב וכבד, וקודקוד שמגיע למעלה.', 'מזג אוויר עובר מעל ההר: שמש, עננים, רוח, גשם. ההר נשאר.', 'מחשבות ורגשות הם כמו מזג אוויר. הם באים והם הולכים.', 'לא צריך לרדוף אחריהם או לדחוף אותם. פשוט נשארים יציבים.', 'נשימה איטית אחת. אנחנו ההר, רגועים וחזקים.'] } },
  { id: 'leaves', emoji: '🍂', title: { en: 'Leaves on a stream', he: 'עלים על נחל' },
    steps: {
      en: ['Imagine sitting by a gentle stream. Leaves float slowly by on the water.', 'Notice a thought that is here. Just notice it, without arguing with it.', 'Place that thought on a leaf, and watch it float away.', 'Another thought comes. Place it on the next leaf.', 'Some thoughts come back. That is fine. Place them on a leaf again.', 'Keep watching the stream. You are the one sitting by the water, watching.', 'Take a slow breath and come back, with a little more space inside.'],
      he: ['מדמיינים שיושבים ליד נחל עדין. עלים צפים לאט על המים.', 'שמים לב למחשבה שנמצאת כאן. רק שמים לב, בלי להתווכח איתה.', 'מניחים את המחשבה על עלה, וצופים בו צף הלאה.', 'מחשבה נוספת באה. מניחים אותה על העלה הבא.', 'חלק מהמחשבות חוזרות. זה בסדר. מניחים אותן שוב על עלה.', 'ממשיכים להסתכל על הנחל. אנחנו אלה שיושבים ליד המים וצופים.', 'נשימה איטית אחת וחוזרים, עם קצת יותר מקום בפנים.'] } },
  { id: 'balloon', emoji: '🎈', title: { en: 'Worry balloon', he: 'בלון הדאגות' },
    steps: {
      en: ['Imagine holding a big balloon in your favorite color.', 'Think of something that worries you. Make it small and put it inside the balloon.', 'Breathe in. As you breathe out, tie the balloon closed.', 'Let go of the string. Watch the balloon rise slowly into the sky.', 'It gets smaller and smaller, higher and higher, until it is a tiny dot.', 'Your hands are free and light. Take a slow breath.'],
      he: ['מדמיינים שמחזיקים בלון גדול בצבע האהוב עלינו.', 'חושבים על משהו שדואג אותנו. הופכים אותו לקטן ומכניסים אותו לבלון.', 'נושמים פנימה. כשנושפים, קושרים את הבלון.', 'עוזבים את החוט. צופים בבלון עולה לאט אל השמיים.', 'הוא נעשה קטן וקטן, גבוה וגבוה, עד שהוא נקודה זעירה.', 'הידיים שלנו חופשיות וקלות. נשימה איטית אחת.'] } },
  { id: 'container', emoji: '📦', title: { en: 'The worry box', he: 'קופסת הדאגות' },
    steps: {
      en: ['Imagine a strong box with a lid, any size and color you like.', 'Think of what is bothering you. You do not have to solve it now.', 'Put it in the box, picture by picture or word by word.', 'Close the lid. Lock it, or tie it, so it stays safe.', 'Put the box on a shelf. You can open it later, when you are ready and have help or time.', 'Right now, it is enough to rest. Take a slow breath.'],
      he: ['מדמיינים קופסה חזקה עם מכסה, בכל גודל וצבע שנרצה.', 'חושבים על מה שמטריד אותנו. לא חייבים לפתור את זה עכשיו.', 'מכניסים את זה לקופסה, תמונה אחרי תמונה או מילה אחרי מילה.', 'סוגרים את המכסה. נועלים או קושרים, כדי שיישאר שמור.', 'מניחים את הקופסה על מדף. אפשר לפתוח אותה אחר כך, כשמוכנים ויש עזרה או זמן.', 'עכשיו מספיק לנוח. נשימה איטית אחת.'] } },
  { id: 'light', emoji: '✨', title: { en: 'Warm light', he: 'אור חם' },
    steps: {
      en: ['Imagine a soft, warm light above your head, in a color that feels kind.', 'It slowly flows into the top of your head and into your face, melting tension.', 'It moves into your neck and shoulders, and they get warm and loose.', 'It flows down your arms into your hands, and into your chest and belly.', 'It flows down your legs to your feet. Your whole body glows gently.', 'Rest in the light for a breath or two. You can carry it with you.'],
      he: ['מדמיינים אור רך וחם מעל הראש, בצבע שמרגיש טוב.', 'הוא זורם לאט לקודקוד ולפנים, ומפשיר מתח.', 'הוא עובר לצוואר ולכתפיים, והן נעשות חמות ורפויות.', 'הוא זורם במורד הזרועות אל הידיים, ואל החזה והבטן.', 'הוא זורם במורד הרגליים אל כפות הרגליים. כל הגוף זוהר בעדינות.', 'נחים באור נשימה או שתיים. אפשר לקחת אותו איתנו.'] } },
  { id: 'cloud', emoji: '☁️', title: { en: 'Floating on a cloud', he: 'מרחפים על ענן' },
    steps: {
      en: ['Imagine a big, soft, fluffy cloud next to you. Climb onto it.', 'It is warm and cozy, and it holds you completely.', 'The cloud floats slowly. Watch the world get quiet and small below.', 'With every breath out, you sink a little deeper into the softness.', 'Rest here. Nothing you need to do. Just float.', 'When you are ready, the cloud gently lowers you back. Take a slow breath.'],
      he: ['מדמיינים ענן גדול, רך ואוורירי לידנו. מטפסים עליו.', 'חם ונעים בו, והוא מחזיק אותנו לגמרי.', 'הענן מרחף לאט. צופים בעולם נעשה שקט וקטן למטה.', 'בכל נשיפה שוקעים עוד קצת אל תוך הרכות.', 'נחים כאן. אין שום דבר שצריך לעשות. רק לרחף.', 'כשמוכנים, הענן מוריד אותנו בעדינות בחזרה. נשימה איטית אחת.'] } },
  { id: 'helper', emoji: '🐾', title: { en: 'A kind helper', he: 'עוזר טוב' },
    steps: {
      en: ['Imagine a kind helper walking toward you: a wise friend, a gentle animal, or someone who cares about you.', 'They sit next to you. You feel they are on your side.', 'Tell them, in your mind, what is hard right now.', 'Listen. What do they say to you? Maybe something kind, or a small idea.', 'Thank them. They will always be there when you imagine them.', 'Take a slow breath, and bring their kind words back with you.'],
      he: ['מדמיינים עוזר טוב שהולך לקראתנו: חבר חכם, חיה עדינה, או מישהו שאכפת לו מאיתנו.', 'הוא מתיישב לידנו. מרגישים שהוא לצדנו.', 'מספרים לו, בלב, מה קשה עכשיו.', 'מקשיבים. מה הוא אומר לנו? אולי משהו טוב, או רעיון קטן.', 'מודים לו. הוא תמיד יהיה שם כשנדמיין אותו.', 'נשימה איטית אחת, ולוקחים איתנו את המילים הטובות שלו.'] } },
];
export const GUIDE_IDS = GUIDES.map((g) => g.id);
export const guideOf = (id) => GUIDES.find((g) => g.id === id) || GUIDES[0];
/** The script of a guide in a language: { id, emoji, title, steps }. */
export const guideText = (id, lang) => { const g = guideOf(id), l = lang === 'he' ? 'he' : 'en'; return { id: g.id, emoji: g.emoji, title: g.title[l], steps: g.steps[l] }; };

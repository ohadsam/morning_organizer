// A starter set after choosing what the app is for (pure): a few small ready-made routines that fit the chosen approach, in English and Hebrew.
// They are offered once, can be unticked, are added for that person only and never switch an alarm on.
import { approachOf } from './feelings.js';

const R = (id, icon, color, he, en, steps) => ({ id, icon, color, name: { he, en }, steps });
const S = (min, he, en) => ({ min, he, en });
export const STARTERS = {
  cbt: [R('st-cbt-check', '🧠', '#6c5ce7', 'בדיקת מחשבה', 'Thought check', [S(1, 'שמים לב מה מרגישים', 'Notice what I feel'), S(2, 'כותבים את המחשבה', 'Write the thought'), S(3, 'מה מוכיח אותה ומה מוכיח את ההפך', 'What speaks for it, what speaks against it'), S(2, 'מחשבה אחרת, נחמדה יותר', 'A kinder thought'), S(2, 'צעד קטן אחד', 'One small step')]),
    R('st-cbt-step', '🌿', '#00b894', 'צעד שמרגיש טוב', 'A feel-better step', [S(2, 'נושמים לאט', 'Breathe slowly'), S(1, 'שלושה דברים שרואים', 'Three things I can see'), S(5, 'עושים דבר קטן ושימושי', 'Do one tiny useful thing'), S(1, 'אומרים לעצמי משהו טוב', 'Say something kind to myself')])],
  cogfun: [R('st-cf-plan', '📋', '#0984e3', 'מתכננים את היום', 'Plan my day', [S(2, 'מסתכלים על היום', 'Look at today'), S(3, 'בוחרים שלושה דברים עיקריים', 'Choose the three main things'), S(3, 'קובעים זמן לכל אחד', 'Set a time for each'), S(3, 'מכינים את מה שצריך', 'Prepare what I need')]),
    R('st-cf-wrap', '🌆', '#e17055', 'סוגרים את היום', 'Wrap up the day', [S(2, 'מה הצליח', 'What worked'), S(2, 'מה עובר למחר', 'What moves to tomorrow'), S(4, 'מכינים את התיק למחר', 'Prepare tomorrow’s bag')])],
  nlp: [R('st-nlp-goal', '🎯', '#e84393', 'מטרה ברורה', 'A clear goal', [S(2, 'מה אני רוצה', 'What do I want'), S(2, 'איך אדע שהשגתי', 'How will I know I have it'), S(2, 'הצעד הראשון', 'The first step')]),
    R('st-nlp-rehearse', '🎬', '#341f97', 'חזרה מנטלית', 'Mental rehearsal', [S(3, 'מדמיינים שזה מצליח', 'Picture it going well'), S(2, 'מוסיפים קולות והרגשה', 'Add sounds and feelings'), S(1, 'עוגן להרגשה הטובה', 'Anchor the good feeling'), S(2, 'עושים את הצעד הראשון', 'Do the first step')])],
  adhd: [R('st-adhd-start', '🚀', '#e17055', 'להתחיל', 'Get started', [S(3, 'מפנים את השולחן', 'Clear the table'), S(1, 'בוחרים משימה אחת בלבד', 'Choose one task only'), S(10, 'טיימר של 10 דקות', 'A 10-minute timer'), S(3, 'הפסקת תנועה קצרה', 'A short movement break')]),
    R('st-adhd-sprint', '⏱️', '#0984e3', 'ספרינט ריכוז', 'Focus sprint', [S(1, 'הטלפון בצד', 'Phone away'), S(15, 'עובדים ברצף', 'Work without a break'), S(3, 'מתמתחים', 'Stretch'), S(5, 'פרס קטן', 'A small reward')])],
  anxiety: [R('st-anx-calm', '🌬️', '#00b894', 'דקת רוגע', 'A calm minute', [S(2, 'שאיפה לארבע, נשיפה לשש', 'In for four, out for six'), S(2, 'חמישה דברים שרואים', 'Five things I can see'), S(1, 'כפות הרגליים על הרצפה', 'Feet on the floor'), S(1, 'משפט טוב לעצמי', 'A kind sentence for myself')]),
    R('st-anx-box', '📦', '#6c5ce7', 'קופסת הדאגות', 'The worry box', [S(2, 'כותבים את הדאגה', 'Write the worry'), S(2, 'עכשיו או אחר כך', 'For now or for later'), S(1, 'שמים בקופסה', 'Put it in the box'), S(3, 'דבר אחד שאפשר לעשות', 'One thing I can do')])],
  organize: [R('st-org-ready', '🎒', '#0984e3', 'מוכנים למחר', 'Ready for tomorrow', [S(3, 'מוציאים בגדים', 'Lay out clothes'), S(4, 'מארזים את התיק', 'Pack the bag'), S(2, 'מפתחות וטלפון ליד הדלת', 'Keys and phone by the door')]),
    R('st-org-tidy', '🧺', '#e84393', 'סדר של עשר דקות', 'Ten-minute tidy', [S(1, 'בוחרים פינה אחת', 'Pick one corner'), S(7, 'מחזירים כל דבר למקומו', 'Put things where they live'), S(2, 'בודקים ונהנים', 'Check it and enjoy')])],
  motivation: [R('st-mot-tiny', '🌱', '#00b894', 'התחלה קטנה', 'A tiny start', [S(2, 'שתי דקות מהדבר עצמו', 'Two minutes of the thing'), S(1, 'שמים לב איך זה מרגיש', 'Notice how it feels'), S(2, 'עוד שתיים', 'Two more')]),
    R('st-mot-proud', '⭐', '#fdcb6e', 'רשימת גאווה', 'Proud list', [S(3, 'שלושה דברים שעשיתי היום', 'Three things I did today'), S(1, 'אומרים כל הכבוד', 'Say well done'), S(2, 'בוחרים דבר אחד למחר', 'Choose one thing for tomorrow')])],
};
/** The routines to offer for a needs view { model, problems }: the method first, then the help areas, at most three, none twice. */
export function starterFor(view) {
  const keys = []; if (['cbt', 'cogfun', 'nlp'].includes(view?.model)) keys.push(view.model);
  for (const p of Array.isArray(view?.problems) ? view.problems : []) if (STARTERS[p] && !keys.includes(p)) keys.push(p);
  if (!keys.length) { const a = approachOf(view); if (STARTERS[a]) keys.push(a); }
  const out = []; for (const k of keys) for (const r of STARTERS[k] || []) if (!out.some((x) => x.id === r.id)) out.push(r);
  return out.slice(0, 3);
}
/** A library-shaped entry (see store.templateFromEntry) in `lang` ('he' | 'en'). */
export const starterEntry = (r, lang) => ({ id: r.id, name: r.name[lang === 'he' ? 'he' : 'en'], icon: r.icon, color: r.color, days: [], gear: [], plans: [], leaveBy: '',
  tasks: r.steps.map((s) => ({ name: s[lang === 'he' ? 'he' : 'en'], icon: '', sec: s.min * 60, est: 0 })) });

import { h } from '../util.js';
import { t, getLang } from '../i18n.js';

// Keep in sync with docs/USER_GUIDE.md (a unit test checks both exist in both languages and mention the current version).
export const GUIDE = {
  en: [
    ['Quick start', ['Open Routines and tap Start on a sample routine, or create your own with “New routine”.', 'Each routine is a list of tasks. Every task has a duration (minutes + seconds) and an optional time estimate.']],
    ['Building a routine', ['Tap a routine to edit it. Drag the ⋮⋮ handle (or use the arrows / Alt+arrow keys) to reorder tasks.', 'Time estimate = your own guess of the real time; leave it empty to use the duration. Defaults live in Settings.', 'The star adds a routine to Favorites - those also appear in the Android home-screen widget.']],
    ['Running a routine', ['Start begins the first task. The ring counts down; at 10 seconds left you get a short beep and when time is up a longer one (change this in Settings: beep, vibrate, both, silent).', '“Done ✓” (or ticking the checkbox) moves on. Pause, +1 min, Skip and Finish are always one tap away. Time keeps counting as “over” until you tap Done.', 'The summary shows start time, planned vs. estimated vs. actual time and each task. A run in progress survives closing the app.']],
    ['Statistics and insights', ['Stats shows every routine you finished: a chart of total time per run (actual, planned, estimate), averages and a per-task table.', 'After 3 runs you get insights: tasks that always finish early (shorten) or late (extend), and the net effect on the total frame. Tap Apply to update the duration.']],
    ['Start alarm', ['In the editor switch on “Remind me to start”, choose time, days, volume, vibration and ring length.', 'Android app: real alarms that ring even when the app is closed. Browser: only while the page is open.']],
    ['Sharing', ['Share creates a code and a link. Send it with the system share sheet (Bluetooth, Nearby Share, WhatsApp), copy it, or write it to an NFC tag. Import accepts a code, link, text file or an NFC tag.', 'There is no server: everything is transferred directly and checked on arrival.']],
    ['Android app and widget', ['Settings → Download Android app always gives the latest APK. Allow “install unknown apps” for your browser once.', 'Long-press the home screen → Widgets → Morning Organizer to start a favourite routine in one tap.']],
    ['Privacy', ['All data stays on your device. Use Settings → Back up all data to save or move it.']],
  ],
  he: [
    ['התחלה מהירה', ['פתחו שגרות ולחצו התחל על שגרה לדוגמה, או צרו שגרה משלכם עם “שגרה חדשה”.', 'כל שגרה היא רשימת משימות. לכל משימה יש משך (דקות + שניות) והערכת זמן אופציונלית.']],
    ['בניית שגרה', ['לחצו על שגרה כדי לערוך. גררו את הידית ⋮⋮ (או השתמשו בחיצים / Alt+חץ) כדי לשנות סדר.', 'הערכת זמן = ההערכה שלכם לזמן האמיתי; השאירו ריק כדי להשתמש במשך. ברירות מחדל בהגדרות.', 'הכוכב מוסיף למועדפים - אלה מופיעים גם בווידג׳ט של אנדרואיד.']],
    ['הרצת שגרה', ['“התחל” מפעיל את המשימה הראשונה. הטבעת סופרת לאחור; 10 שניות לפני הסוף יש צפצוף קצר, ובסיום צפצוף ארוך (בהגדרות: צפצוף, רטט, שניהם, שקט).', '“סיימתי ✓” (או סימון התיבה) מעביר הלאה. השהיה, +דקה, דלג וסיום תמיד במרחק לחיצה. הזמן ממשיך להיספר כחריגה עד שלוחצים סיימתי.', 'הסיכום מציג שעת התחלה, מתוכנן מול הערכה מול בפועל וכל משימה. הרצה שבאמצע שורדת סגירת האפליקציה.']],
    ['סטטיסטיקות ותובנות', ['בסטטיסטיקות מופיעות השגרות שסיימתם: גרף של זמן כולל בכל הרצה (בפועל, מתוכנן, הערכה), ממוצעים וטבלה לפי משימה.', 'אחרי 3 הרצות מופיעות תובנות: משימות שמסתיימות תמיד מוקדם (לקצר) או מאוחר (להאריך), וההשפעה נטו על המסגרת הכוללת. “החל” מעדכן את המשך.']],
    ['התראת התחלה', ['בעורך הפעילו “הזכירו לי להתחיל” ובחרו שעה, ימים, עוצמה, רטט ואורך צלצול.', 'באפליקציית אנדרואיד: התראות אמיתיות שמצלצלות גם כשהאפליקציה סגורה. בדפדפן: רק כשהדף פתוח.']],
    ['שיתוף', ['שיתוף יוצר קוד וקישור. שלחו דרך תפריט השיתוף (בלוטות׳, Nearby Share, וואטסאפ), העתיקו, או כתבו לתג NFC. ייבוא מקבל קוד, קישור, קובץ טקסט או תג NFC.', 'אין שרת: הכול עובר ישירות ונבדק בהגעה.']],
    ['אפליקציית אנדרואיד וווידג׳ט', ['הגדרות ← הורדת אפליקציית אנדרואיד נותנת תמיד את ה-APK העדכני. יש לאשר פעם אחת “התקנה ממקורות לא ידועים” לדפדפן.', 'לחיצה ארוכה על מסך הבית ← ווידג׳טים ← מארגן בוקר להפעלת שגרה מועדפת בלחיצה.']],
    ['פרטיות', ['כל הנתונים נשארים במכשיר. הגדרות ← גיבוי כל הנתונים לשמירה או להעברה.']],
  ],
};

export function renderGuide(root) {
  root.replaceChildren(h('h1', {}, t('guideTitle')), ...GUIDE[getLang()].map(([title, paras]) =>
    h('section', { class: 'card guide' }, h('h2', {}, title), paras.map((p) => h('p', {}, p)))));
  return () => {};
}

// Global search (pure): every feature of the app as a small entry with words people might type (Hebrew and English), scored against a query.
// An entry's `go` is either { route } (a hash) or { action } (a named action the UI knows how to run).

export const normQuery = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[֑-ׇ]/g, '').replace(/[׳'’"״]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** id, icon, title key, route/action, English words, Hebrew words. */
export const ENTRIES = [
  ['home', '🏠', 'sr_home', { route: '#/' }, 'home routines list start run today', 'בית שגרות שגרה רשימה התחלה הרצה היום'],
  ['new', '➕', 'sr_new', { action: 'newRoutine' }, 'new create add routine make', 'חדשה יצירה הוספה שגרה ליצור'],
  ['wizard', '🪄', 'sr_wizard', { action: 'wizard' }, 'wizard guide help setup build routine adhd attention anxiety organize child kid parent', 'אשף הדרכה עזרה הקמה לבנות שגרה קשב וריכוז חרדה התארגנות ילד הורה'],
  ['library', '📚', 'sr_library', { route: '#/library' }, 'library templates ready made ideas saved reuse', 'ספרייה תבניות מוכנות רעיונות שמורות שימוש חוזר'],
  ['import', '📥', 'sr_import', { action: 'import' }, 'import code qr share receive scan nfc bluetooth', 'ייבוא קוד שיתוף קבלה סריקה'],
  ['alarms', '⏰', 'sr_alarms', { route: '#/alarms' }, 'alarm alarms wake up clock ring remind reminder snooze', 'שעון מעורר שעונים התעוררות צלצול תזכורת דחייה'],
  ['goals', '🎯', 'sr_goals', { route: '#/goals' }, 'goal goals plan target practice cog fun check', 'מטרה מטרות תכנון יעד תרגול קוגפאן בדיקה'],
  ['retros', '🔄', 'sr_retros', { route: '#/retros' }, 'look back retrospective review reflect improve what worked', 'מסתכלים אחורה רטרוספקטיבה סיכום חשיבה שיפור מה עבד'],
  ['calm', '🌬️', 'sr_calm', { route: '#/calm' }, 'calm breathe breathing anxiety relax worry panic ground', 'רוגע נשימה חרדה הרגעה לחץ דאגה הארקה'],
  ['journal', '📓', 'sr_journal', { route: '#/journal' }, 'journal diary write notes password private', 'יומן כתיבה פתקים סיסמה פרטי'],
  ['aprt', '🧭', 'sr_aprt', { action: 'aprt' }, 'situation log aprt abc cbt event interpretation emotion response thought feeling hard moment record', 'תיעוד מצב אפרת אפר״ת cbt אירוע פרשנות רגש תגובה מחשבה תחושה רגע קשה'],
  ['note', '🎙️', 'sr_note', { action: 'capture' }, 'note quick voice record dictate memo', 'הערה מהירה הקלטה הכתבה פתק'],
  ['rewards', '🎁', 'sr_rewards', { action: 'rewards' }, 'reward rewards prize menu stars', 'תגמול תגמולים פרס פרסים כוכבים'],
  ['stats', '📊', 'sr_stats', { route: '#/stats' }, 'statistics stats progress chart streak history difficulty', 'סטטיסטיקות התקדמות גרף רצף היסטוריה קושי'],
  ['report', '📄', 'sr_report', { route: '#/report' }, 'report pdf export email print share interactive html', 'דוח ייצוא מייל הדפסה שיתוף'],
  ['family', '👨‍👩‍👧', 'sr_family', { route: '#/family' }, 'family parent child link connect weekly digest', 'משפחה הורה ילד חיבור קישור סיכום שבועי'],
  ['guide', '📖', 'sr_guide', { route: '#/guide' }, 'guide help manual how to tutorial', 'מדריך עזרה הוראות איך'],
  ['whatsnew', '🆕', 'sr_whatsnew', { action: 'whatsnew' }, 'what is new changes version update changelog', 'מה חדש שינויים גרסה עדכון'],
  ['shareapp', '📣', 'sr_shareapp', { action: 'shareApp' }, 'share app whatsapp email mail send friend invite install link apk', 'שיתוף אפליקציה וואטסאפ מייל שליחה חבר הזמנה התקנה קישור'],
  ['settings', '⚙️', 'sr_settings', { route: '#/settings' }, 'settings options preferences', 'הגדרות אפשרויות העדפות'],
  ['nlp', '🗣️', 'sr_nlp', { route: '#/nlp' }, 'nlp neuro linguistic reframe reframing anchor anchoring outcome goal rehearse rehearsal perspectives precise words visualization coaching', 'אן אל פי תכנות נוירו לשוני מסגור מחדש עוגן מטרה חזרה מנטלית נקודות מבט מילים מדויקות דמיון אימון'],
  ['routineio', '🔁', 'sr_routineio', { action: 'routineio' }, 'share routines export import copy move send file profile person device whatsapp backup', 'שיתוף שגרות ייצוא ייבוא העתקה העברה שליחה קובץ פרופיל אדם מכשיר ווטסאפ'],
  ['set_needs', '🎯', 'sr_set_needs', { route: '#/settings/needs' }, 'needs what for model cbt cogfun cog-fun adhd attention anxiety organize organise age show only everything הצרכים למה האפליקציה מודל קשב חרדה התארגנות גיל להציג הכול'],
  ['set_people', '👥', 'sr_set_people', { route: '#/settings/people' }, 'people profiles profile switch person user manage add אנשים פרופילים פרופיל החלפה משתמש ניהול הוספה'],
  ['set_voicecmd', '🎤', 'sr_set_voicecmd', { route: '#/settings/voicecmd' }, 'commands listen say microphone hands free spoken פקודות האזנה דיבור מיקרופון'],
  ['set_look', '🎨', 'sr_set_look', { route: '#/settings/look' }, 'theme dark light colour color language hebrew english appearance accent', 'מראה ערכת נושא כהה בהיר צבע שפה עברית אנגלית'],
  ['set_profile', '🙂', 'sr_set_profile', { route: '#/settings/profile' }, 'profile name age avatar gender kids mode simple', 'פרופיל שם גיל דמות מצב ילדים'],
  ['set_buddy', '🐱', 'sr_set_buddy', { route: '#/settings/buddy' }, 'buddy mascot cat friend avatar playful wording', 'חבר דמות חתול ניסוח'],
  ['set_helpers', '🧩', 'sr_set_helpers', { route: '#/settings/helpers' }, 'help areas focus calm time memory motivation habits adhd', 'תחומי עזרה ריכוז רוגע זמן זיכרון מוטיבציה הרגלים קשב'],
  ['set_pace', '🐢', 'sr_set_pace', { route: '#/settings/pace' }, 'pace speed quick calm slow', 'קצב מהירות רגוע איטי'],
  ['set_a11y', '♿', 'sr_set_a11y', { route: '#/settings/a11y' }, 'accessibility text size big font contrast reduce motion colour blind screen reader', 'נגישות גודל טקסט גופן ניגודיות תנועה עיוור צבעים קורא מסך'],
  ['set_coach', '🧘', 'sr_set_coach', { route: '#/settings/coach' }, 'encouragement tips coach messages read aloud', 'עידוד טיפים הודעות הקראה'],
  ['set_voice', '🔊', 'sr_set_voice', { route: '#/settings/voice' }, 'voice speak speech read aloud character male female child animal pitch pace', 'קול דיבור הקראה דמות גבר אישה ילד חיה גובה קצב'],
  ['set_alerts', '🔔', 'sr_set_alerts', { route: '#/settings/alerts' }, 'sound vibration notifications beep volume silent', 'צליל רטט התראות צפצוף עוצמה שקט'],
  ['set_defaults', '🛠️', 'sr_set_defaults', { route: '#/settings/defaults' }, 'defaults task duration time default', 'ברירות מחדל משך משימה זמן'],
  ['set_sync', '💾', 'sr_set_sync', { route: '#/settings/sync' }, 'backup restore sync export import data transfer phone', 'גיבוי שחזור סנכרון ייצוא נתונים העברה טלפון'],
  ['set_app', 'ℹ️', 'sr_set_app', { route: '#/settings/app' }, 'about install version apk app update erase delete data', 'אודות התקנה גרסה אפליקציה עדכון מחיקת נתונים'],
].map(([id, icon, key, go, en, he]) => ({ id, icon, key, go, words: `${en} ${he}` }));

/** How well an entry matches. 0 = no match. Whole words and word starts beat parts of words; the title counts double. */
export function scoreEntry(title, words, query) {
  const q = normQuery(query); if (!q) return 0;
  const tt = normQuery(title), ww = ` ${normQuery(words)} `, tokens = q.split(' ');
  let total = 0;
  for (const tok of tokens) {
    let s = 0;
    if (tt === tok) s = 12; else if (tt.startsWith(tok)) s = 9; else if (` ${tt}`.includes(` ${tok}`)) s = 8; else if (tt.includes(tok)) s = 5;
    if (ww.includes(` ${tok} `)) s = Math.max(s, 7); else if (ww.includes(` ${tok}`)) s = Math.max(s, 5); else if (tok.length >= 3 && ww.includes(tok)) s = Math.max(s, 3);
    if (!s) return 0;           // every word typed must match something
    total += s;
  }
  return total;
}

/**
 * Results for a query: [{ id, icon, title, go, score }], best first, at most `limit`.
 * `t` translates keys; `routines` = the person's routines ([{id, name, icon}]) so "start/edit <name>" can be found too; `has(id)` hides features turned off.
 */
export function search(query, { t, routines = [], has = () => true, limit = 8, popular = ['wizard', 'alarms', 'calm', 'set_voice', 'set_a11y', 'stats'] } = {}) {
  const q = normQuery(query);
  const base = ENTRIES.filter((e) => has(e.id)).map((e) => ({ id: e.id, icon: e.icon, title: t(e.key), go: e.go, words: e.words }));
  if (!q) return popular.map((id) => base.find((e) => e.id === id)).filter(Boolean).slice(0, limit).map((e) => ({ ...e, score: 1 }));
  const out = base.map((e) => ({ ...e, score: scoreEntry(e.title, e.words, q) }));
  for (const r of routines) {
    const s = scoreEntry(r.name, '', q); if (!s) continue;
    out.push({ id: `run-${r.id}`, icon: r.icon || '▶️', title: t('searchRoutineStart', { name: r.name }), go: { route: `#/run/${r.id}` }, score: s + 2 });
    out.push({ id: `edit-${r.id}`, icon: '✏️', title: t('searchRoutineEdit', { name: r.name }), go: { route: `#/edit/${r.id}` }, score: s });
  }
  return out.filter((e) => e.score > 0).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit).map(({ words, ...e }) => e);
}

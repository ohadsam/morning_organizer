// Hebrew + English. `t(key, params)` looks up the active language, falls back to English, then to the key.
// Layout uses CSS logical properties, so flipping <html dir> is all RTL needs.
export const STR = {
  en: {
    appName: 'Morning Organizer', home: 'Routines', stats: 'Stats', settings: 'Settings', guide: 'Guide',
    hello: 'Ready to start the day?', newRoutine: 'New routine', import: 'Import', favorites: 'Favorites', allRoutines: 'All routines',
    noRoutines: 'No routines yet. Create your first one!', tasksCount: '{n} tasks', start: 'Start', edit: 'Edit', delete: 'Delete',
    duplicate: 'Duplicate', share: 'Share', favorite: 'Favorite', unfavorite: 'Remove from favorites', back: 'Back', save: 'Save', cancel: 'Cancel',
    confirmDelete: 'Delete “{name}”? This cannot be undone.', confirmDeleteTask: 'Remove this task?', ok: 'OK',
    routineName: 'Routine name', routineIcon: 'Icon', routineColor: 'Color', tasks: 'Tasks', addTask: 'Add task', taskName: 'Task name',
    minutes: 'min', seconds: 'sec', duration: 'Duration', estimate: 'Time estimate', estimateHint: 'Your own guess of how long it really takes. Empty = same as duration.',
    dragHint: 'Drag the handle to reorder, or use the arrows.', moveUp: 'Move up', moveDown: 'Move down', dragHandle: 'Drag to reorder', removeTask: 'Remove task',
    total: 'Total', untitled: 'New routine', newTask: 'New task',
    alarm: 'Start alarm', alarmEnable: 'Remind me to start', alarmTime: 'Time', alarmDays: 'Days', alarmVolume: 'Volume', alarmVibrate: 'Vibrate',
    alarmDuration: 'Ring for', alarmWebNote: 'In the browser, alarms only ring while the app is open. Install the Android app for reliable alarms.',
    alarmNext: 'Next: {name} at {time}', alarmPermission: 'Allow notifications to get reminders.',
    run: 'Routine', startedAt: 'Started', plannedEnd: 'Planned end', elapsed: 'Elapsed', left: 'left', over: 'over', current: 'Now', next: 'Next',
    doneNext: 'Done ✓', pause: 'Pause', resume: 'Resume', skip: 'Skip', addMinute: '+1 min', stop: 'Finish', stopConfirm: 'Finish this routine now?',
    paused: 'Paused', ahead: 'ahead of plan', behind: 'behind plan', onPlan: 'on plan',
    summary: 'Summary', allDone: 'Great job! 🎉', stopped: 'Routine ended', planned: 'Planned', estimated: 'Estimated', actual: 'Actual', difference: 'Difference',
    wall: 'Total clock time', tasksDone: 'Done', tasksSkipped: 'Skipped', again: 'Back to routines', viewStats: 'View statistics',
    perTask: 'Per task', colTask: 'Task', colPlanned: 'Planned', colActual: 'Actual', skippedTag: 'skipped',
    statsTitle: 'Statistics', noStats: 'Finish a routine once to see statistics.', runsCount: '{n} runs', avgTime: 'Average', bestTime: 'Best', onTimeRuns: 'On time',
    chartTitle: 'Total time per run', legendActual: 'Actual', legendPlanned: 'Planned', legendEstimate: 'Estimate', chartEmpty: 'Need at least 2 runs for a chart.',
    taskTrend: 'Tasks (recent average)', insights: 'Insights', apply: 'Apply', applied: 'Applied', history: 'History', clearHistory: 'Clear history', clearHistoryConfirm: 'Delete all run history?',
    in_needMore: 'Complete {n} more run(s) to unlock insights.',
    in_shorten: '“{name}” usually takes {typical}, planned {from}. Shorten to {to}.',
    in_extend: '“{name}” usually takes {typical}, planned {from}. Extend to {to}.',
    in_balance: 'If you apply all suggestions the total frame changes by {delta}.',
    in_faster: 'You are getting faster: {delta} quicker than your first runs.', in_slower: 'Runs are taking {delta} longer than your first runs.',
    in_onTime: 'Your last run finished within the planned time. 👏', in_biggestOverrun: '“{name}” is the biggest time sink: {over} over plan on average.',
    soundMode: 'Alert type', mBeep: 'Beep', mVibrate: 'Vibrate', mBoth: 'Beep + vibrate', mSilent: 'Silent', volume: 'Beep volume',
    warnBefore: 'Warn before end', warnOff: 'Off', warnSec: '{n} sec', defTask: 'Default task duration', defEst: 'Default time estimate', defEstSame: 'Same as duration',
    autoAdvance: 'Auto-advance to next task', autoAdvanceHint: 'Moves on by itself when time is up.', keepAwake: 'Keep screen on while running',
    language: 'Language', langAuto: 'Automatic', theme: 'Theme', themeAuto: 'Automatic', themeLight: 'Light', themeDark: 'Dark', test: 'Test',
    data: 'Data', exportAll: 'Back up all data', importAll: 'Restore from backup', restoreSamples: 'Add sample routines', backupDone: 'Backup saved', restoreDone: 'Restored {n} routines',
    app: 'Android app', downloadApk: 'Download Android app (APK)', apkNote: 'Always the latest version, with home-screen widgets and reliable alarms.', installPwa: 'Install on this device',
    version: 'Version {v}', nativeActive: 'Running in the Android app', widgets: 'Add the widget from your home screen: long-press → Widgets → Morning Organizer.',
    shareTitle: 'Share routine', shareCopy: 'Copy code', shareLink: 'Copy link', shareSend: 'Send…', shareNfc: 'Write to NFC tag', shareNfcRead: 'Read from NFC tag', shareBt: 'Bluetooth and Nearby Share are available from “Send…”.',
    shareCopied: 'Copied', shareNfcTap: 'Hold the back of the phone against an NFC tag…', shareNfcOk: 'Done', shareNfcFail: 'NFC failed or is not available', shareTooBig: 'Too big for a small NFC tag',
    importTitle: 'Import routine', importHint: 'Paste a code or link someone shared with you.', importBtn: 'Import', importOk: 'Imported “{name}”', importBad: 'This code is not valid.',
    pasteHere: 'Paste code or link', fileImport: 'From file',
    saved: 'Saved', deleted: 'Deleted', undo: 'Undo', offline: 'Works offline', updateReady: 'Update ready - reload', reload: 'Reload',
    sample1: 'Kids morning', sample2: 'Quick start (adult)', s_wake: 'Wake up & stretch', s_bath: 'Bathroom & teeth', s_dress: 'Get dressed', s_eat: 'Breakfast',
    s_bag: 'Pack school bag', s_shoes: 'Shoes & out the door', s_shower: 'Shower', s_coffee: 'Coffee', s_plan: 'Plan the day',
    guideTitle: 'User guide', u_h: 'h', u_m: 'm', u_s: 's', today: 'Today', day0: 'Sun', day1: 'Mon', day2: 'Tue', day3: 'Wed', day4: 'Thu', day5: 'Fri', day6: 'Sat',
    greetName: 'Good morning, {name}! 🌞', streakDays: '{n}-day streak', starsTotal: '{n} stars', personName: 'Name', personNameHint: 'Used in encouraging messages. Leave empty to skip the name.',
    mascot: 'My buddy', feedbackOn: 'Encouraging messages', feedbackOnHint: 'Cheerful messages while you go.', speakOn: 'Read messages aloud', keepAwakeApp: 'Keep screen on while the app is open',
    keepAwakeAppHint: 'Uses more battery.', screenOn: 'Screen stays on', screenOff: 'Screen may turn off', progress: 'Progress', eta: 'Expected finish {time}', pausedTotal: 'Paused',
    tasksProgress: '{done}/{total} tasks', continueRun: 'Continue “{name}”', activeRun: 'In progress', pausedBig: 'Paused - no rush', taskIcon: 'Task icon', pickIcon: 'Choose an icon', starsEarned: 'Stars',
    close: 'Close', loading: 'Loading…', error: 'Something went wrong', storageFail: 'Storage unavailable - changes will not be kept.',
  },
  he: {
    appName: 'מארגן בוקר', home: 'שגרות', stats: 'סטטיסטיקות', settings: 'הגדרות', guide: 'מדריך',
    hello: 'מוכנים להתחיל את היום?', newRoutine: 'שגרה חדשה', import: 'ייבוא', favorites: 'מועדפים', allRoutines: 'כל השגרות',
    noRoutines: 'אין עדיין שגרות. צרו את הראשונה!', tasksCount: '{n} משימות', start: 'התחל', edit: 'עריכה', delete: 'מחיקה',
    duplicate: 'שכפול', share: 'שיתוף', favorite: 'מועדף', unfavorite: 'הסר ממועדפים', back: 'חזרה', save: 'שמירה', cancel: 'ביטול',
    confirmDelete: 'למחוק את “{name}”? אי אפשר לבטל.', confirmDeleteTask: 'להסיר את המשימה?', ok: 'אישור',
    routineName: 'שם השגרה', routineIcon: 'אייקון', routineColor: 'צבע', tasks: 'משימות', addTask: 'הוספת משימה', taskName: 'שם המשימה',
    minutes: 'דק׳', seconds: 'שנ׳', duration: 'משך', estimate: 'הערכת זמן', estimateHint: 'ההערכה שלכם כמה זה באמת לוקח. ריק = כמו המשך.',
    dragHint: 'גררו את הידית לשינוי הסדר, או השתמשו בחיצים.', moveUp: 'הזז למעלה', moveDown: 'הזז למטה', dragHandle: 'גרירה לשינוי סדר', removeTask: 'הסר משימה',
    total: 'סה״כ', untitled: 'שגרה חדשה', newTask: 'משימה חדשה',
    alarm: 'התראת התחלה', alarmEnable: 'הזכירו לי להתחיל', alarmTime: 'שעה', alarmDays: 'ימים', alarmVolume: 'עוצמה', alarmVibrate: 'רטט',
    alarmDuration: 'משך צלצול', alarmWebNote: 'בדפדפן ההתראה מצלצלת רק כשהאפליקציה פתוחה. התקינו את אפליקציית האנדרואיד להתראות אמינות.',
    alarmNext: 'הבאה: {name} בשעה {time}', alarmPermission: 'אשרו התראות כדי לקבל תזכורות.',
    run: 'שגרה', startedAt: 'התחלה', plannedEnd: 'סיום מתוכנן', elapsed: 'עבר', left: 'נשארו', over: 'חריגה', current: 'עכשיו', next: 'הבא',
    doneNext: 'סיימתי ✓', pause: 'השהיה', resume: 'המשך', skip: 'דלג', addMinute: '+דקה', stop: 'סיום', stopConfirm: 'לסיים את השגרה עכשיו?',
    paused: 'מושהה', ahead: 'לפני התכנון', behind: 'אחרי התכנון', onPlan: 'לפי התכנון',
    summary: 'סיכום', allDone: 'כל הכבוד! 🎉', stopped: 'השגרה הסתיימה', planned: 'מתוכנן', estimated: 'הערכה', actual: 'בפועל', difference: 'הפרש',
    wall: 'זמן כולל בשעון', tasksDone: 'בוצעו', tasksSkipped: 'דולגו', again: 'חזרה לשגרות', viewStats: 'צפייה בסטטיסטיקות',
    perTask: 'לפי משימה', colTask: 'משימה', colPlanned: 'מתוכנן', colActual: 'בפועל', skippedTag: 'דולג',
    statsTitle: 'סטטיסטיקות', noStats: 'סיימו שגרה פעם אחת כדי לראות סטטיסטיקות.', runsCount: '{n} הרצות', avgTime: 'ממוצע', bestTime: 'הכי טוב', onTimeRuns: 'בזמן',
    chartTitle: 'זמן כולל בכל הרצה', legendActual: 'בפועל', legendPlanned: 'מתוכנן', legendEstimate: 'הערכה', chartEmpty: 'צריך לפחות 2 הרצות לגרף.',
    taskTrend: 'משימות (ממוצע אחרון)', insights: 'תובנות', apply: 'החל', applied: 'הוחל', history: 'היסטוריה', clearHistory: 'ניקוי היסטוריה', clearHistoryConfirm: 'למחוק את כל היסטוריית ההרצות?',
    in_needMore: 'השלימו עוד {n} הרצות כדי לפתוח תובנות.',
    in_shorten: '“{name}” לוקחת בדרך כלל {typical}, מתוכנן {from}. כדאי לקצר ל-{to}.',
    in_extend: '“{name}” לוקחת בדרך כלל {typical}, מתוכנן {from}. כדאי להאריך ל-{to}.',
    in_balance: 'אם תחילו את כל ההצעות, מסגרת הזמן הכוללת תשתנה ב-{delta}.',
    in_faster: 'אתם משתפרים: {delta} מהר יותר מההרצות הראשונות.', in_slower: 'ההרצות לוקחות {delta} יותר מההרצות הראשונות.',
    in_onTime: 'ההרצה האחרונה הסתיימה בתוך הזמן המתוכנן. 👏', in_biggestOverrun: '“{name}” חורגת הכי הרבה: {over} מעל התכנון בממוצע.',
    soundMode: 'סוג התראה', mBeep: 'צפצוף', mVibrate: 'רטט', mBoth: 'צפצוף + רטט', mSilent: 'שקט', volume: 'עוצמת צפצוף',
    warnBefore: 'אזהרה לפני הסיום', warnOff: 'כבוי', warnSec: '{n} שניות', defTask: 'משך משימה ברירת מחדל', defEst: 'הערכת זמן ברירת מחדל', defEstSame: 'כמו המשך',
    autoAdvance: 'מעבר אוטומטי למשימה הבאה', autoAdvanceHint: 'ממשיך לבד כשהזמן נגמר.', keepAwake: 'השאר מסך דלוק בזמן ריצה',
    language: 'שפה', langAuto: 'אוטומטי', theme: 'ערכת נושא', themeAuto: 'אוטומטי', themeLight: 'בהיר', themeDark: 'כהה', test: 'בדיקה',
    data: 'נתונים', exportAll: 'גיבוי כל הנתונים', importAll: 'שחזור מגיבוי', restoreSamples: 'הוספת שגרות לדוגמה', backupDone: 'הגיבוי נשמר', restoreDone: 'שוחזרו {n} שגרות',
    app: 'אפליקציית אנדרואיד', downloadApk: 'הורדת אפליקציית אנדרואיד (APK)', apkNote: 'תמיד הגרסה האחרונה, עם ווידג׳טים והתראות אמינות.', installPwa: 'התקנה במכשיר',
    version: 'גרסה {v}', nativeActive: 'רץ בתוך אפליקציית האנדרואיד', widgets: 'להוספת הווידג׳ט: לחיצה ארוכה על מסך הבית ← ווידג׳טים ← מארגן בוקר.',
    shareTitle: 'שיתוף שגרה', shareCopy: 'העתקת קוד', shareLink: 'העתקת קישור', shareSend: 'שליחה…', shareNfc: 'כתיבה לתג NFC', shareNfcRead: 'קריאה מתג NFC', shareBt: 'בלוטות׳ ו-Nearby Share זמינים דרך “שליחה…”.',
    shareCopied: 'הועתק', shareNfcTap: 'קרבו את גב הטלפון לתג NFC…', shareNfcOk: 'בוצע', shareNfcFail: 'NFC נכשל או אינו זמין', shareTooBig: 'גדול מדי לתג NFC קטן',
    importTitle: 'ייבוא שגרה', importHint: 'הדביקו קוד או קישור ששיתפו איתכם.', importBtn: 'ייבוא', importOk: 'יובאה “{name}”', importBad: 'הקוד אינו תקין.',
    pasteHere: 'הדביקו קוד או קישור', fileImport: 'מקובץ',
    saved: 'נשמר', deleted: 'נמחק', undo: 'ביטול', offline: 'עובד גם בלי אינטרנט', updateReady: 'עדכון מוכן - טענו מחדש', reload: 'טעינה מחדש',
    sample1: 'בוקר לילדים', sample2: 'התחלה מהירה (מבוגרים)', s_wake: 'קמים ומתמתחים', s_bath: 'שירותים ושיניים', s_dress: 'מתלבשים', s_eat: 'ארוחת בוקר',
    s_bag: 'מסדרים תיק', s_shoes: 'נעליים ויוצאים', s_shower: 'מקלחת', s_coffee: 'קפה', s_plan: 'תכנון היום',
    guideTitle: 'מדריך למשתמש', u_h: 'ש׳', u_m: 'ד׳', u_s: 'ש״נ', today: 'היום', day0: 'א׳', day1: 'ב׳', day2: 'ג׳', day3: 'ד׳', day4: 'ה׳', day5: 'ו׳', day6: 'ש׳',
    greetName: 'בוקר טוב, {name}! 🌞', streakDays: 'רצף של {n} ימים', starsTotal: '{n} כוכבים', personName: 'שם', personNameHint: 'משמש בהודעות עידוד. אפשר להשאיר ריק.',
    mascot: 'החבר שלי', feedbackOn: 'הודעות עידוד', feedbackOnHint: 'הודעות שמחות תוך כדי.', speakOn: 'הקראת הודעות', keepAwakeApp: 'השאר מסך דלוק כל עוד האפליקציה פתוחה',
    keepAwakeAppHint: 'צורך יותר סוללה.', screenOn: 'המסך נשאר דלוק', screenOff: 'המסך עלול להיכבות', progress: 'התקדמות', eta: 'סיום צפוי {time}', pausedTotal: 'הושהה',
    tasksProgress: '{done}/{total} משימות', continueRun: 'המשך “{name}”', activeRun: 'בתהליך', pausedBig: 'מושהה - בלי לחץ', taskIcon: 'אייקון משימה', pickIcon: 'בחירת אייקון', starsEarned: 'כוכבים',
    close: 'סגירה', loading: 'טוען…', error: 'משהו השתבש', storageFail: 'האחסון לא זמין - שינויים לא יישמרו.',
  },
};

let lang = 'en';
export const getLang = () => lang;
export const isRtl = () => lang === 'he';

export function resolveLang(pref, navLang = globalThis.navigator?.language || 'en') {
  if (pref === 'he' || pref === 'en') return pref;
  return /^(he|iw)\b/i.test(navLang) ? 'he' : 'en';
}
export function setLang(pref) {
  lang = resolveLang(pref);
  if (typeof document !== 'undefined') { document.documentElement.lang = lang; document.documentElement.dir = isRtl() ? 'rtl' : 'ltr'; }
  return lang;
}
export function t(key, params) {
  const s = STR[lang][key] ?? STR.en[key] ?? key;
  return params ? s.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '') : s;
}
export const units = () => ({ h: t('u_h'), m: t('u_m'), s: t('u_s') });

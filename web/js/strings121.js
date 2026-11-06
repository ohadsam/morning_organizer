// Strings for 1.21: special tasks, sharing routines between people, points and the podium, export / import of routines.
export const EN = {
  // points
  ptsTitle: 'Points and awards', ptsIntro: 'A playful way to see effort: points for each step, a bonus for finishing early, a little less for finishing late, and a podium with fireworks at the end. Off unless you turn it on.',
  ptsMode: 'Points', ptsOff: 'Off', ptsAuto: 'Automatic', ptsCustom: 'I set the points',
  ptsModeHint_off: 'No points anywhere.', ptsModeHint_auto: 'Each step is worth points by its planned time.', ptsModeHint_custom: 'You choose the points of each step in the routine editor (empty = automatic).',
  ptsPenalty: 'Take points off for finishing late', ptsPenaltyHint: 'A step never goes below 0, and the calm pace never takes points away.', ptsCumulative: 'Keep a running total', ptsCumulativeHint: 'Show the total of all your points, not only this routine.',
  ptsRules: 'Early finish: up to +50% of the step’s points. Late finish: up to −50%. A step with an award, finished before its time, wins the award and double points.',
  ptsUnit: 'points', ptsBonus: 'bonus', ptsLate: 'late', ptsTaskPoints: 'Points for this step', ptsAutoN: 'Automatic: {n}', ptsTaskHint: 'Empty or 0 = automatic.',
  ptsAward: 'Award for finishing early', ptsNoAward: 'No award', ptsAwardHint: 'Finish before the time to win it, and double the points.',
  award_medal: 'Medal', award_coin: 'Coin', award_trophy: 'Trophy', award_star: 'Star', award_gem: 'Gem', award_crown: 'Crown',
  podTitle: 'Your podium', podYou: 'You', podFirstRun: 'Your first score for this routine', podRank1: 'First place - your best yet!', podRank2: 'Second place', podRank3: 'Third place', podRank: 'Place {rank} of {count} runs of this routine', podAwards: 'Awards won', podTotal: 'Total points so far: {n}', podBreakdown: 'Points per step',
  ptsStatsTitle: 'Points over time', ptsTotal: 'All points', ptsBest: 'Best run', ptsAvg: 'Average run', ptsLegendRun: 'Points per run', ptsLegendCum: 'Running total', ptsTable: 'Show as a table', ptsChartLabel: 'Points of the last {n} runs; {total} points in all',
  // who sees a routine, move routines
  whoTitle: 'Who sees this routine', whoHint: 'On a shared device, choose who can see and start this routine. Alarms still ring on the device.', whoEveryone: 'Everyone', whoEveryoneSub: 'Every person on this device', whoSome: 'Only some people', whoSomeSub: 'Choose who', whoNeedOne: 'Keep at least one person, or choose Everyone.',
  rioTitle: 'Share and move routines', rioIntro: 'Copy routines to another person on this device, save them to a file to send to another phone, or bring routines in from a file.', rioPick: 'Which routines', rioAll: 'All routines', rioTasks: '{n} steps', rioPickSome: 'Choose at least one routine.',
  rioCopyTitle: 'Copy to another person', rioCopySub: 'On this device', rioCopyHint: 'Makes a copy that only the chosen person sees. The copy’s alarm is off.', rioCopyTo: 'Copy to', rioCopyBtn: 'Copy', rioCopied: 'Copied {n} to {name}', rioNoOthers: 'Add another person first (Settings → People).',
  rioExportTitle: 'Save or send as a file', rioExportSub: 'For another phone or a backup', rioExportHint: 'A small file with the chosen routines, their steps and special tasks. Open it in SonRise on any phone or in the web app.', rioSave: 'Save a file', rioSend: 'Save or send the file', rioSaved: 'File ready',
  rioImportTitle: 'Bring routines in', rioImportSub: 'From a file', rioImportHint: 'Choose a routines file (or a full backup file). You will see what is inside before anything is added.', rioChooseFile: 'Choose a file', rioFound: 'Found {n} routines. Choose which to add.', rioWho: 'Who sees them', rioOnlyMe: 'Only {name}', rioAlarmsOff: 'Imported routines come in with their alarm switched off.', rioImportBtn: 'Add the chosen routines', rioImported: 'Added {n} routines', rioBad: 'This file is not a routines file.',
  sr_routineio: 'Share, export and import routines',

  // special tasks
  sptBtn: 'Add a special task', sptTitle: 'Special tasks', sptHint: 'Steps the app runs for you: tap one to add it. On the run screen it shows one big button that opens the tool.', sptSearch: 'Search special tasks', sptGroup: 'Topic',
  sptOpens: 'Opens: {tool}',
  sptg_calm: 'Calm', sptg_write: 'Write and note', sptg_mind: 'Thoughts', sptg_body: 'Body', sptg_boost: 'Boost',
  spt_breath: 'Breathe slowly', spt_scan: 'Body scan', spt_imagery: 'Guided imagery', spt_relax: 'Relaxation exercise', spt_journal: 'Write in the journal', spt_voice: 'Record a voice note', spt_gratitude: 'Three good things', spt_aprt: 'Log a hard moment', spt_park: 'Park a thought',
  spt_thought: 'A kind thought', spt_pickone: 'Pick the one thing to start with', spt_say: 'Say the steps out loud', spt_move: 'Movement break', spt_water: 'Drink some water', spt_music: 'Put on a song that gets me going', spt_reward: 'A small celebration',
  helper_scan: 'Start the body scan', helper_imagery: 'Start the guided imagery', helper_relax: 'Get a relaxation exercise', helper_journal: 'Write in the journal', helper_voice: 'Record a voice note', helper_gratitude: 'Write three good things', helper_park: 'Park a thought', helper_aprt: 'Log the moment',
};
export const HE = {
  ptsTitle: 'ניקוד ופרסים', ptsIntro: 'דרך שובבה לראות מאמץ: נקודות על כל שלב, בונוס על סיום מוקדם, קצת פחות על איחור, ופודיום עם זיקוקים בסוף. כבוי עד שמדליקים.',
  ptsMode: 'ניקוד', ptsOff: 'כבוי', ptsAuto: 'אוטומטי', ptsCustom: 'אני קובע את הניקוד',
  ptsModeHint_off: 'בלי ניקוד בשום מקום.', ptsModeHint_auto: 'כל שלב שווה נקודות לפי הזמן המתוכנן שלו.', ptsModeHint_custom: 'בוחרים את הניקוד של כל שלב בעורך השגרה (ריק = אוטומטי).',
  ptsPenalty: 'להוריד נקודות על סיום באיחור', ptsPenaltyHint: 'שלב אף פעם לא יורד מתחת ל-0, ובקצב הרגוע לא יורדות נקודות.', ptsCumulative: 'לשמור סכום מצטבר', ptsCumulativeHint: 'להציג את סך כל הנקודות, לא רק של השגרה הזאת.',
  ptsRules: 'סיום מוקדם: עד 50% מנקודות השלב בבונוס. סיום מאוחר: עד 50% פחות. שלב עם פרס שמסתיים לפני הזמן זוכה בפרס ובכפל נקודות.',
  ptsUnit: 'נקודות', ptsBonus: 'בונוס', ptsLate: 'איחור', ptsTaskPoints: 'נקודות לשלב הזה', ptsAutoN: 'אוטומטי: {n}', ptsTaskHint: 'ריק או 0 = אוטומטי.',
  ptsAward: 'פרס על סיום מוקדם', ptsNoAward: 'בלי פרס', ptsAwardHint: 'מסיימים לפני הזמן כדי לזכות בו ובכפל נקודות.',
  award_medal: 'מדליה', award_coin: 'מטבע', award_trophy: 'גביע', award_star: 'כוכב', award_gem: 'יהלום', award_crown: 'כתר',
  podTitle: 'הפודיום שלכם', podYou: 'אתם', podFirstRun: 'הניקוד הראשון שלכם בשגרה הזאת', podRank1: 'מקום ראשון - השיא שלכם עד עכשיו!', podRank2: 'מקום שני', podRank3: 'מקום שלישי', podRank: 'מקום {rank} מתוך {count} הרצות של השגרה', podAwards: 'פרסים שנוצחו', podTotal: 'סך הנקודות עד עכשיו: {n}', podBreakdown: 'נקודות לכל שלב',
  ptsStatsTitle: 'נקודות לאורך זמן', ptsTotal: 'כל הנקודות', ptsBest: 'הרצה הכי טובה', ptsAvg: 'הרצה ממוצעת', ptsLegendRun: 'נקודות בכל הרצה', ptsLegendCum: 'סכום מצטבר', ptsTable: 'להציג כטבלה', ptsChartLabel: 'הנקודות של {n} ההרצות האחרונות; {total} נקודות בסך הכול',
  whoTitle: 'מי רואה את השגרה', whoHint: 'במכשיר משותף בוחרים מי יכול לראות ולהתחיל את השגרה. שעונים מעוררים ממשיכים לצלצל במכשיר.', whoEveryone: 'כולם', whoEveryoneSub: 'כל אדם במכשיר הזה', whoSome: 'רק חלק מהאנשים', whoSomeSub: 'בוחרים מי', whoNeedOne: 'משאירים לפחות אדם אחד, או בוחרים “כולם”.',
  rioTitle: 'שיתוף והעברת שגרות', rioIntro: 'אפשר להעתיק שגרות לאדם אחר במכשיר הזה, לשמור אותן בקובץ ולשלוח לטלפון אחר, או להכניס שגרות מקובץ.', rioPick: 'אילו שגרות', rioAll: 'כל השגרות', rioTasks: '{n} שלבים', rioPickSome: 'בוחרים לפחות שגרה אחת.',
  rioCopyTitle: 'העתקה לאדם אחר', rioCopySub: 'במכשיר הזה', rioCopyHint: 'יוצרים עותק שרק האדם שנבחר רואה. השעון המעורר בעותק כבוי.', rioCopyTo: 'להעתיק אל', rioCopyBtn: 'העתקה', rioCopied: 'הועתקו {n} אל {name}', rioNoOthers: 'קודם מוסיפים אדם נוסף (הגדרות ← אנשים).',
  rioExportTitle: 'שמירה או שליחה כקובץ', rioExportSub: 'לטלפון אחר או לגיבוי', rioExportHint: 'קובץ קטן עם השגרות שנבחרו, השלבים והמשימות המיוחדות שלהן. פותחים אותו ב-SonRise בכל טלפון או באפליקציית הרשת.', rioSave: 'שמירת קובץ', rioSend: 'שמירה או שליחת הקובץ', rioSaved: 'הקובץ מוכן',
  rioImportTitle: 'הכנסת שגרות', rioImportSub: 'מקובץ', rioImportHint: 'בוחרים קובץ שגרות (או קובץ גיבוי מלא). לפני שמוסיפים רואים מה בפנים.', rioChooseFile: 'בחירת קובץ', rioFound: 'נמצאו {n} שגרות. בוחרים אילו להוסיף.', rioWho: 'מי רואה אותן', rioOnlyMe: 'רק {name}', rioAlarmsOff: 'שגרות שמוכנסות מגיעות עם שעון מעורר כבוי.', rioImportBtn: 'הוספת השגרות שנבחרו', rioImported: 'נוספו {n} שגרות', rioBad: 'הקובץ הזה אינו קובץ שגרות.',
  sr_routineio: 'שיתוף, ייצוא וייבוא שגרות',

  sptBtn: 'הוספת משימה מיוחדת', sptTitle: 'משימות מיוחדות', sptHint: 'צעדים שהאפליקציה מריצה בשבילכם: לוחצים כדי להוסיף. במסך השגרה מופיע כפתור גדול אחד שפותח את הכלי.', sptSearch: 'חיפוש משימות מיוחדות', sptGroup: 'נושא',
  sptOpens: 'פותח: {tool}',
  sptg_calm: 'רוגע', sptg_write: 'כתיבה ותיעוד', sptg_mind: 'מחשבות', sptg_body: 'גוף', sptg_boost: 'חיזוק',
  spt_breath: 'נושמים לאט', spt_scan: 'סריקת גוף', spt_imagery: 'דמיון מודרך', spt_relax: 'תרגיל הרפיה', spt_journal: 'כותבים ביומן', spt_voice: 'מקליטים הערה קולית', spt_gratitude: 'שלושה דברים טובים', spt_aprt: 'מתעדים רגע קשה', spt_park: 'מאחסנים מחשבה',
  spt_thought: 'מחשבה טובה', spt_pickone: 'בוחרים דבר אחד להתחיל ממנו', spt_say: 'אומרים את השלבים בקול', spt_move: 'הפסקת תנועה', spt_water: 'שותים מעט מים', spt_music: 'שמים שיר שנותן כוח', spt_reward: 'חגיגה קטנה',
  helper_scan: 'מתחילים סריקת גוף', helper_imagery: 'מתחילים דמיון מודרך', helper_relax: 'מקבלים תרגיל הרפיה', helper_journal: 'כותבים ביומן', helper_voice: 'מקליטים הערה קולית', helper_gratitude: 'כותבים שלושה דברים טובים', helper_park: 'מאחסנים מחשבה', helper_aprt: 'מתעדים את הרגע',
};

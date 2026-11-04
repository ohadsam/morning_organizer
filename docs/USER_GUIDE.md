# User guide / מדריך למשתמש

> The in-app guide (Guide tab) is the same text. Keep both in sync - `tests/unit/misc.test.js` checks the section titles. Current version: see `web/version.json`.

## Quick start
Open Routines and tap Start on a sample routine, or create your own with “New routine”. Each routine is a list of tasks. Every task has a duration (minutes + seconds) and an optional time estimate.

## Building a routine
Tap a routine to edit it. Drag the ⋮⋮ handle (or use the arrows / Alt+arrow keys) to reorder tasks. Time estimate = your own guess of the real time; leave it empty to use the duration. Defaults live in Settings. The star adds a routine to Favorites - those also appear in the Android home-screen widget.

## Running a routine
Start begins the first task. The ring counts down; at 10 seconds left you get a short beep and when time is up a longer one (Settings: beep, vibrate, both, silent). “Done ✓” (or ticking the checkbox) moves on. Pause, +1 min, Skip and Finish are always one tap away. Time keeps counting as “over” until you tap Done. The summary shows start time, planned vs. estimated vs. actual time and each task. A run in progress survives closing the app.

## Statistics and insights
Stats shows every routine you finished: a chart of total time per run (actual, planned, estimate), averages and a per-task table. After 3 runs you get insights: tasks that always finish early (shorten) or late (extend), and the net effect on the total frame. Tap Apply to update the duration.

## Start alarm
Wake-up alarms: in the editor switch on “Remind me to start”, choose time and days. The first alarm has its own sound, volume, vibration, length and message; “Add another alarm” (or “Add N more alarms every M minutes”) adds more, each after a gap you choose and each with its own sound, volume, message and optional spoken voice - for example 7:00, 7:15 and 7:20. After the last alarm choose “Offer to start” (a Start button) or “Start the routine automatically”. Android: real alarms that ring even when the app is closed; on a locked phone the app opens by itself, otherwise tap the notification (its Start button always starts). Browser: only while the page is open.

## Unplanned interruptions
Unplanned interruptions: during a routine tap ⚡ Unplanned and pick what happened (toilet, spilled drink, forgot something... or your own words). The routine clock stops and that time is counted on its own - not as task time and not as a pause - then tap “Back to the routine”. The summary and Stats show how often and how long. When the same interruption keeps coming back in a routine (in at least 3 of the last runs) a card offers to add it to the routine as a real task, or to look closer: a few guiding questions (why, what happens before, one thing to try) are saved in your journal and the app keeps counting to show whether it changes.

## Sharing
Share creates a code and a link. Send it with the system share sheet (Bluetooth, Nearby Share, WhatsApp), copy it, or write it to an NFC tag. Import accepts a code, link, text file or an NFC tag. There is no server: everything is transferred directly and checked on arrival.

## Encouragement, stars and screen
Settings → Name and My buddy: the app cheers you on by name with cheerful messages, emojis and little animations (turn off or have them read aloud in Settings). Finish a routine to earn up to 3 stars (all done within the plan = 3). Finishing at least one routine a day builds a 🔥 streak shown on the home screen. Pause is the big button next to Done: the clock stops and the paused time is shown in the summary. The ☀️ chip on the home screen (or Settings) keeps the screen on while the app is open so you can tap progress any time.

## Mindful coach and voice
Settings → About you: add your name, age and gender - messages and tips then speak to you (Hebrew uses the right masculine/feminine forms) in a tone that fits your age. Tap 💡 Tip (next to Pause) or the 💡 on any task to get a short CBT / mindfulness idea: breathing, grounding, checking worried thoughts, letting thoughts pass, kindness to yourself, focus, time pressure. Tap "Another tip" for a new one. Switch on "Automatic tips" and the coach offers a tip when a task runs over, you are 3+ minutes behind, or you stayed paused for 2 minutes. Under Settings → Voice choose whether encouragement and tips are text only or also spoken automatically (same tone, name and gender forms), then pick a voice and a style (deep, high, robot, chipmunk, giant, sleepy, superhero, fairy). Styles change pitch and speed of your phone's voice; install a Hebrew voice in the phone's Text-to-speech settings if none is found. The coach gives general wellbeing ideas, not treatment. If worry feels overwhelming, talk to a trusted adult or a professional.

## Moving data between the app and the website
The website (PWA) and the Android app keep their data separately. To move routines, history and settings between them: Settings → Move data → Save backup file / Copy sync code / Send…, then on the other one → Import backup (file, or paste the code). Merge keeps the newest version of every routine and adds missing history; it never deletes. Replace makes this device an exact copy of the backup. Tick "Also import settings" to bring your name, voice and preferences too.

## Leave time, pace and accessibility
In the editor set "Leave by": the run shows whether you will make it (spare time or late) and warns 10 and 5 minutes before. "Suggest start time" sets the start alarm so you finish exactly in time. Settings → Pace: Quick shortens every task by 30%; Calm hides warnings and red "over" states so there is no time pressure. "Say the next task out loud" reads "Now: …" at each task. Settings → Accessibility: text size, color-blind friendly colors, high contrast and screen-reader announcements (TalkBack). Tasks can have a sticker or your own photo (tap the task icon).

## Family: parent and child phones
Open the Family tab. On the parent's phone tap "Add a child" and give the invitation to the child's phone: tap the two phones together (NFC, Android app), write it to an NFC tag, send it by Bluetooth / Nearby Share / a messenger, or copy it. On the child's phone tap "Join a parent", paste the invitation and send the reply back; the parent approves. An invitation works once and expires after 24 hours. It can also be shown as a QR code for the other phone to scan. Once linked, the parent sees the child's stars, streak, recent routines and what they are doing right now; sends routines, cheers and a reward goal (20 stars = ice cream, or "5 on-time routines this week") and gets an alert when the child is running late (over a live link). When the goal is reached the child celebrates and the parent is told. There is no server: messages are encrypted and travel directly. With "Connect live (Wi-Fi)" (both phones on the same network) or the Android app's Bluetooth link (pair the phones first) updates are instant; otherwise each message is a code you pass on by NFC tag, share sheet or copy-paste.

## Progress widget (Android)
Add the "Routine progress" widget from the home screen: it shows the routine in progress, the current task, a live countdown and a progress bar, and opens the app when tapped.

## Simple mode, accent color and settings
Settings → Appearance → "Simple mode for kids" shows only the routines with big Start buttons. Everything else (editing, settings, statistics, family) is locked behind a quick grown-up question for 10 minutes at a time. Pick an accent color for the whole app, plus light/dark theme, text size, color-blind friendly colors and high contrast. Settings are grouped into sections you can collapse; the app remembers which are open.

## Weekly summary, history and examples
Stats shows "This week": routines finished, stars, on-time count, active days and whether you got faster than last week, plus a 5-week calendar heat-map. "Share summary" sends a short text; "Export history (CSV)" saves every run for a spreadsheet. Deleting a routine offers "Undo" for a few seconds. Settings → "Add more example routines" adds bedtime, homework and after-school routines.

## People, avatars and levels
Several people can share one phone: tap the avatar on the home screen (or Settings → About you) to switch person or add one. Each person has their own name, age, avatar, routines history, stars, streak, badges and parent link. Pick an avatar: animated characters (they blink, wave, cheer, dance and sleep as you go - fox, cat and panda from the start, more unlock as you level up), an emoji, your own photo, or your own animated GIF (up to 160 KB). Photos and GIFs stay on your phone. Stars raise your level (shown on the home screen); higher levels unlock new characters.

## Days, gear and achievements
In the editor, "Schedule" sets which days a routine is for (school days, weekend or any days); the home screen lists today's routines first. "Gear to remember" adds things for certain days (PE kit, swimming bag): they appear as a checklist when you start and are counted in the summary. Badges (first routine, streaks, on time, early bird, speedy, comeback…) are earned automatically; new ones are celebrated on the summary screen and all of them are in Stats → Achievements.

## Android app and widget
Routine card widget: add “Routine card” from the widgets list. It shows one saved routine with its tasks, durations, days, leave-by time and gear count; tap it (or ▶ Start) to run it in the app with all its saved settings. Use ‹ › on the widget to show a different routine (each widget remembers its own). While that routine runs the card becomes a live countdown with progress.

Settings → Download Android app always gives the latest APK. Allow “install unknown apps” for your browser once. Long-press the home screen → Widgets → Morning Organizer to start a favourite routine in one tap.

## Helpers: calm, focus, journal and rewards
Choose what you want help with: Home → “What would you like help with?” (or Settings → Helpers). Pick areas such as focus, calm, time sense, remembering, motivation or habits - the app switches on matching tools. A parent can choose this for a child from the Family tab (🎯). Every tool can still be switched on or off on its own.

Calm corner (🌬️): breathing patterns, 5-4-3-2-1 grounding and a body scan, 1-3 minutes, with a gentle vibration cue. During a routine it pauses the clock while you breathe. Focus sprints split long tasks into short sprints with a 30-second movement break; the parking lot (🅿️) saves a stray thought so you can get back to the task; the next-task heads-up shows what comes next; the pie timer shows time as a filling circle; the mood faces after a routine feed a mood insight in Stats.

Journal (📓): notes, voice notes (🎙️ - recorded during a task too), thought checks, “3 good things” and parked thoughts. It is stored only on this device and is not part of backups or sharing. Password (optional): Journal → Password. It is stored as a salted hash and the entries are encrypted; adding a note never needs the password. Forgot it? Answer your two security questions to set a new one. If you forget both, entries cannot be opened - you can only erase them.

Speech to text (optional): in a note tap “Dictate” (or record - in a browser a suggested transcript appears while you speak). It is only a suggestion: check and edit it. In the Android app it uses the phone’s own recognizer; in a browser the browser’s speech service may send audio to its maker, so the app asks first. Reward menu (🎁): spend stars on rewards from a menu you or a parent set up; a parent is told and can mark it as given.

## Easier editing, wording and extras
Editing tasks: tap the time on a task to open the time sheet (quick times, ±1m/±15s buttons, exact minutes and seconds), or use the − / + buttons next to it. The ☰ menu on each task lets you add a task below, duplicate, move up/down/to the top/to the bottom, change the picture or remove it; dragging by the handle still works. If-then plans (editor → “If-then plans”) show as a card when the routine starts: “If I want to scroll my phone, then it goes in the drawer”. Settings → Appearance → “Timer look” switches the ring to a pie, a bar or a sand clock. Young children: with an age under 12 the whole app uses lighter, more fun wording (Settings → Appearance → Wording to force it on or off). Android: the alarm notification has a 5-minute Snooze, and a “Calm corner” widget opens breathing in one tap. Parents see a weekly digest (slowest steps, repeated interruptions) on each child’s card.

## Templates
Templates: save tasks and routines you use again and again. In a routine’s editor tap “Save as template” (💾) for the whole routine, or “Save task as template” in a task’s ☰ menu. “Add from templates” opens big tiles of your saved tasks and ready-made ideas (morning, evening, school, home) - search, filter, and tap as many as you like. On the home screen “From a template” starts a new routine from one of your templates or a ready-made idea. Home → Templates manages them: use, rename, edit time, share, delete (with Undo). Templates are included in “Back up all data” and sync codes.

## Goals
Goals (Goal - Plan - Do - Check): Home → Goals. Write one goal that matters to you (“be ready on time without reminders”), optionally tie it to a routine, and choose up to three strategies that fit you - for time, planning, remembering, attention or organising - or write your own. Do: the plan appears as a card when you start that routine. Check: after the routine tell the app how it worked (a face and a few words); the app shows how many routines were on time since you began and whether your check-ins are getting better, and prompts a weekly check-in. A parent can suggest a goal from the Family tab (“Suggest a goal”), and “Sit with me” shows the child that the parent is with them during a routine. Inspired by goal-based, strategy-focused approaches such as Cog-Fun (Hebrew University occupational therapy). It is a self-help tool and does not replace an occupational therapist or other professional.

## Alarms screen
Alarms screen: Home → Alarms lists every routine with its wake-up alarm - switch it on or off, see the schedule (e.g. 07:00 → 07:15 → 07:20) and edit the whole chain. Each routine card also shows its alarm. After an update a one-time “New in…” sheet points to new features.

## Privacy
All data stays on your device. Use Settings → Back up all data to save or move it.

---

## עברית
המדריך בעברית נמצא באפליקציה (לשונית מדריך) ומתעדכן יחד עם המדריך באנגלית; ראו `web/js/ui/guide.js`.

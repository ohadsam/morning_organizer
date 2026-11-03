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
In the editor switch on “Remind me to start”, choose time, days, volume, vibration and ring length. Android app: real alarms that ring even when the app is closed. Browser: only while the page is open.

## Sharing
Share creates a code and a link. Send it with the system share sheet (Bluetooth, Nearby Share, WhatsApp), copy it, or write it to an NFC tag. Import accepts a code, link, text file or an NFC tag. There is no server: everything is transferred directly and checked on arrival.

## Encouragement, stars and screen
Settings → Name and My buddy: the app cheers you on by name with cheerful messages, emojis and little animations (turn off or have them read aloud in Settings). Finish a routine to earn up to 3 stars (all done within the plan = 3). Finishing at least one routine a day builds a 🔥 streak shown on the home screen. Pause is the big button next to Done: the clock stops and the paused time is shown in the summary. The ☀️ chip on the home screen (or Settings) keeps the screen on while the app is open so you can tap progress any time.

## Mindful coach and voice
Settings → About you: add your name, age and gender - messages and tips then speak to you (Hebrew uses the right masculine/feminine forms) in a tone that fits your age. Tap 💡 Tip (next to Pause) or the 💡 on any task to get a short CBT / mindfulness idea: breathing, grounding, checking worried thoughts, letting thoughts pass, kindness to yourself, focus, time pressure. Tap "Another tip" for a new one. Switch on "Automatic tips" and the coach offers a tip when a task runs over, you are 3+ minutes behind, or you stayed paused for 2 minutes. Under Settings → Voice choose whether encouragement and tips are text only or also spoken automatically (same tone, name and gender forms), then pick a voice and a style (deep, high, robot, chipmunk, giant, sleepy, superhero, fairy). Styles change pitch and speed of your phone's voice; install a Hebrew voice in the phone's Text-to-speech settings if none is found. The coach gives general wellbeing ideas, not treatment. If worry feels overwhelming, talk to a trusted adult or a professional.

## Moving data between the app and the website
The website (PWA) and the Android app keep their data separately. To move routines, history and settings between them: Settings → Move data → Save backup file / Copy sync code / Send…, then on the other one → Import backup (file, or paste the code). Merge keeps the newest version of every routine and adds missing history; it never deletes. Replace makes this device an exact copy of the backup. Tick "Also import settings" to bring your name, voice and preferences too.

## Android app and widget
Settings → Download Android app always gives the latest APK. Allow “install unknown apps” for your browser once. Long-press the home screen → Widgets → Morning Organizer to start a favourite routine in one tap.

## Privacy
All data stays on your device. Use Settings → Back up all data to save or move it.

---

## עברית
המדריך בעברית נמצא באפליקציה (לשונית מדריך) ומתעדכן יחד עם המדריך באנגלית; ראו `web/js/ui/guide.js`.

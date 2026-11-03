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

## Android app and widget
Settings → Download Android app always gives the latest APK. Allow “install unknown apps” for your browser once. Long-press the home screen → Widgets → Morning Organizer to start a favourite routine in one tap.

## Privacy
All data stays on your device. Use Settings → Back up all data to save or move it.

---

## עברית
המדריך בעברית נמצא באפליקציה (לשונית מדריך) ומתעדכן יחד עם המדריך באנגלית; ראו `web/js/ui/guide.js`.

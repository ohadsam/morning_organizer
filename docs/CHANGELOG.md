# Changelog

## 1.8.0
- **Avatars**: eight original animated characters (blink, wave, cheer, dance, sleep, alert, think - drawn in SVG, no external GIFs, offline), colours, emoji, your own photo or animated GIF (≤160 KB). The avatar reacts to what happens in a run. Photos/GIFs never leave the device.
- **Several people per phone**: profiles with their own name/age/gender/avatar, history, stars, streak, badges and parent links; "Who is playing?" switcher.
- **Levels and badges**: stars raise a level; levels unlock characters; 14 achievement badges with inline celebration and a gallery in Stats.
- **Routines by day** (Today / Other days, school-day and weekend presets) and **gear checklists** per day, counted in the summary.
- **Parent features**: weekly goals ("5 on-time routines this week"), "child is running late" alerts over a live link (toast + system notification), per-child switch.
- **QR codes** for invitations/messages (own generator, verified against an independent decoder) and QR scanning (Google code scanner in the app, BarcodeDetector in browsers).
- Fixes found by tests/review: prototype-key lookups (`__proto__`, `constructor`) for avatar ids, voice presets and the address-bar router (`#/constructor` broke navigation); a settings redraw that finished after you left the page could overwrite the page you were on.

## 1.7.1
- **Hosting fix**: when GitHub Pages publishes the repository root ("deploy from a branch") visitors saw the README instead of the app. The root now has an `index.html` that opens `web/` (plus `.nojekyll`), so the app opens either way; an end-to-end step covers it. The app itself never needs a server - the `npm run serve` line in the README is only for developers.

## 1.7.0
- **Real phone-to-phone NFC** (Android app): hold two phones back to back to hand over an invitation or an encrypted message (card emulation + reader mode, offer expires after 60 s, locked phones offer nothing). Framing is unit-tested on the JVM.
- **Weekly summary** (routines, stars, on-time, active days, trend vs last week) with share; **5-week heat-map**; **CSV export** of the whole history (formula-injection safe, Excel-friendly Hebrew).
- **Undo** after deleting a routine; five example routines (bedtime, homework, after school added).
- **APK signing**: committed shared signing key so every build updates the previous one in place (one-time uninstall needed when moving from the earlier debug-signed builds).

## 1.6.0
- **UX pass, verified by an automated accessibility audit** (axe-core on every screen and dialog, Hebrew/light and English/dark, 150% text, accent colors - zero violations; the audit runs in CI).
- **Settings reorganised** into collapsible groups (the app remembers which are open); **accent color** picker (all choices pass contrast).
- **Simple mode for kids**: only routines with big Start buttons; editing, settings, statistics and family sit behind a quick grown-up question.
- Run screen: Done / Pause are always on screen (sticky) and the ring is sized so they fit on a phone; wide screens show two columns of routines.
- Reward goal progress appears on the child's home screen. Status chips fixed for readable contrast.

## 1.5.0
- **Family (parent / child) - no server.** Link phones with a single-use invitation (NFC tag, share sheet incl. Bluetooth/Nearby, or copy-paste); the parent approves who joins. Everything between them is AES-GCM encrypted with a key that only the two phones hold, with replay protection.
- **Parent dashboard**: child's stars, streak, recent routines and live "doing now"; send routines, cheers and a **reward goal** (stars → prize) - the child celebrates and the parent is notified when it is reached. Several children per parent and several parents per child.
- **Live links**: WebRTC data channel over the same Wi-Fi (offer/answer travel as encrypted codes - no STUN/TURN/signalling server) and, in the Android app, a Bluetooth (RFCOMM) socket to a paired phone. Without a live link every message is a code to pass on.
- **Android progress widget**: routine in progress, current task, live countdown, progress bar.

## 1.4.0
- **Leave by**: set a departure time per routine; the run shows spare/late time, warns 10 and 5 minutes before leaving, and "Suggest start time" sets the start alarm so you finish exactly in time.
- **Pace modes**: Quick (-30%, 5 s steps) and Calm (no warnings, no red "over" state, no automatic tips).
- **Say the next task out loud** ("Now: brushing teeth") with the chosen voice.
- **Accessibility**: text size up to 150%, color-blind-friendly palette with ▲/▼ markers, high contrast, screen-reader (TalkBack) announcements.
- **Kid visuals**: ~60 stickers and your own photo per task (cropped, tiny JPEG, validated; kept out of history and shared codes).

## 1.3.0
- **Manual sync between the website and the Android app**: export a backup file or a compact sync code (copy / system share sheet) and import it on the other side by file, paste or share. Merge keeps the newest version of each routine (original timestamps preserved) and adds missing history; Replace makes an exact copy; optional import of settings (whitelisted and validated).
- Android: the backup export/import now actually works inside the app (system "save as" picker and file chooser; the WebView cannot download blobs or open file inputs by itself). Shared sync codes arriving via the share sheet open the import dialog.
- Voice: encouragement can be spoken automatically (independent from on-screen text) with the chosen voice and style - one Voice card in Settings.

## 1.2.0
- **Hebrew + RTL is now the default** (English one tap away in Settings).
- **Profile**: first-run welcome (name, age, gender), editable in Settings. All messages and tips adapt: Hebrew masculine/feminine forms, and three tones (kid ≤ 11, teen 12-17, adult 18+).
- **Mindful coach**: 35 short CBT / mindfulness / ACT-style tips (breathing with an animated guide, grounding, thought checking, letting thoughts pass, self-compassion, focus, time pressure, body) in two languages × three tones, with humour for the young. 💡 button on every task and next to Pause; optional automatic tips when a task runs over, 3+ min behind plan, or paused 2+ min.
- **Read aloud** (encouragement and/or tips, independent from the on-screen text; same personalised text, voice and style) with the device's text-to-speech: choose a voice and a style (deep, high, robot, chipmunk, giant, sleepy, superhero, fairy).

## 1.1.0
- Personal touch: your name + a buddy (🦊🐼🦄…) and cheerful, gender-neutral encouragement in Hebrew/English (start, 10-second warning, time's up, task done early/on time/late, pause/resume, routine done/ended), with emojis, pop animations and optional read-aloud.
- Stars (0-3 per run), 🔥 day streak, confetti on completion.
- In-app progress widget: segmented bar (width = planned time), live fill, walking buddy, % / tasks / expected finish; "in progress" card on the home screen to jump back in.
- Pause is a big button next to Done, with a paused state on the ring; paused time is tracked and shown in the summary.
- Keep the screen on while the app is open (home chip + Settings), in addition to keeping it on during a run.
- Hardening: backups/imports are whitelisted field-by-field (templates and runs) before being stored.
- Task icons (auto-suggested from the name, changeable) shown in the run, checklist, summary and shared routines.

## 1.0.0
- First release: routines with tasks (minutes + seconds, time estimate), drag & drop / arrow reordering, favorites, duplicate, delete.
- Runner with countdown ring, 10-second warning beep, end beep (beep / vibrate / both / silent), pause, +1 min, skip, finish, checklist, overtime, crash-safe resume.
- Summary + statistics: planned vs. estimated vs. actual, chart over time, per-task table, insights with one-tap apply.
- Start alarms (Android: AlarmManager with volume, vibration, duration; browser: while open), Android home-screen widget.
- Serverless sharing: code / link / system share sheet (Bluetooth, Nearby Share) / NFC tag.
- Hebrew + English (RTL), light/dark theme, offline PWA, GitHub Pages deploy, always-latest APK from GitHub Releases.

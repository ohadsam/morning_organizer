# ☀️ Morning Organizer · מארגן בוקר

Build morning routines (for kids or anyone), time every task, and watch yourself get faster. Works as an **installable PWA** and as a **native Android app** (same UI, plus alarms and a home-screen widget). No server, no account, no tracking - data stays on your device. Hebrew (RTL, default) and English.

**Use it:** open `https://ohadsam.github.io/morning_organizer/` in your browser (nothing to install or run - it is a plain static site; add it to the home screen to install the PWA) · **Android APK (always the latest):** [releases/latest](https://github.com/ohadsam/morning_organizer/releases/latest/download/morning-organizer.apk) (also offered inside the PWA under Settings).

## Features
- **Routines & tasks** - duration in minutes + seconds (5.5 min = 5:30), your own *time estimate*, drag & drop (or arrows) to reorder, favourites, duplicate, delete, sample routines.
- **Run mode** - countdown ring, short beep 10 s before the end, beep at the end (beep / vibrate / both / silent, volume), pause, +1 min, skip, finish, checklist, overtime counting, resumes after the app is closed. Start time, planned end, live pace vs. plan.
- **Summary & statistics** - planned vs. estimated vs. actual, per task; chart of every run over time; averages; **insights** (shorten / extend tasks, net effect on the total frame, "you are getting faster") with one-tap *Apply*.
- **Wake-up alarms** - a chain of alarms (e.g. 7:00, 7:15, 7:20) each with its own sound, volume, message and spoken voice; then offer to start or start the routine automatically (real alarms in the Android app).
- **Unplanned interruptions** - a ⚡ button counts surprises (toilet, spills...) separately, spots patterns, and offers to plan for them or look closer.
- **Helpers** - help areas, calm corner, focus tools, journal with optional password and voice notes, reward menu, routine-card widget.
- **Share without a server** - code/link, system share sheet (Bluetooth, Nearby Share, WhatsApp…), NFC tags; import from code, link, file or tag.
- **Personal & encouraging** - name, age, gender (Hebrew masculine/feminine forms), a buddy, cheerful messages, stars, 🔥 streaks, confetti, optional read-aloud with voice styles.
- **Mindful coach** - 💡 on every task: 60+ short CBT / mindfulness / attention-support tips (breathing, grounding, thought checking, letting thoughts pass, getting started, remembering, switching tasks, time sense…), automatic when you run late or get stuck.
- **Move data between the website and the app** - backup file or sync code, merge or replace.
- **Family** - link a parent's and a child's phone (NFC tap / NFC tag / Bluetooth / Wi-Fi live link / share sheet, encrypted, no server): progress dashboard, routines, cheers and reward goals.
- **Leave-by time, Quick/Calm pace, accessibility** (text size, color-blind palette, screen-reader announcements), task photos and stickers.
- **Avatars & people** - animated characters (or your own photo/GIF), several people per phone, levels, badges, routines by day with gear checklists, QR/NFC/Bluetooth/Wi-Fi linking, parent alerts and weekly goals.
- **Weekly summary, heat-map, CSV export, undo, more example routines.**
- **Android widget** - favourite routines, one tap to start.
- Light/dark, offline, backup/restore, keyboard accessible.

## Develop
```bash
npm install
npm run serve        # http://localhost:8080
npm run check && npm test && npm run e2e
```
Android: `gradle -p android assembleDebug` (needs the Android SDK; CI builds it otherwise). Docs: [User guide](docs/USER_GUIDE.md) · [Architecture](docs/ARCHITECTURE.md) · [Releasing & setup](docs/RELEASING.md) · [Changelog](docs/CHANGELOG.md) · [Release checklist](.claude/skills/release-checklist/SKILL.md).

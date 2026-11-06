# Changelog

## 1.23.0
- **Avatar studio**: build your own avatar from an original layered kit (283 parts): face shape, cheeks, nose, hair (19 styles, curls, braids, afro puffs, twists), beard, eyes, brows, mouth, 14 outfits, accessories (including hearing aid and cochlear implant), glasses, hats and head coverings (headscarf, kippah, turban), a little friend, 10 backgrounds - and recolour skin, hair, clothes, accessories and eyes from palettes. Options unlock with the person's level ("none" is always available). A live preview moves: rest, wave, cheer, dance, sleep, surprised, think and eight feelings (happy, calm, sad, worried, annoyed, tired, excited, proud). A "Surprise me" button picks a random avatar.
- **My avatars**: save, rename, duplicate, delete (with undo), use as your avatar, and **share**: a short code (SRAV1...) through the share sheet (WhatsApp, e-mail) or the clipboard, and **Add from a code** with a preview. The library is on the device (any person here can pick from it) and is part of the backup file. The picker and Settings → About you link to it.
- Kit avatars move in the app (the buddy bubbles, the summary) with the same animations as the built-in characters; the pack is cached for offline use. Safety: every part is checked against a strict SVG allow-list, a saved avatar is only ids and colours, codes are bounded.
- Fix: toasts hid behind open sheets - the studio and My avatars show their messages (and Undo) inside the sheet.

## 1.22.0
- **NLP as a method**, next to CBT and Cog-Fun: choose it in Settings → What the app is for and the app shows its tools. Six short guided exercises (**a clear outcome, another way to see it, a calming anchor, precise words, points of view, mental rehearsal**) on a new NLP tools page (Home → Calm), each with an optional note to the journal. They are also **special tasks** (new NLP group in the picker) that open their exercise on the run screen. NLP is shown honestly: research evidence for it is limited and mixed, so it is offered as gentle self-reflection, not therapy, with no claims about results.
- **Calm animations**: a switch in Settings → Accessibility that turns off movement (fireworks, confetti, bouncing, transitions) for people who find it distracting or unsettling; kept per person and applied before first paint.
- A light vibration tick when a step is done (vibrate / both sound modes, Android).

## 1.21.1
- **Kids view / Full view button** in the top bar, next to the "who is using the app" chip: one tap switches to the kids' view (only routines and the big Start); in the kids' view the bar shows only the way back, which asks the grown-up question first. The choice is per person.

## 1.21.0
- **Who sees a routine**: on a shared device a routine can be visible to everyone (default) or only to chosen people - a parent or therapist can set routines up for the children. Alarms still ring on the device. Deleting a person never loses a routine.
- **Special tasks**: pick the app's own tools as steps (journal, thought parking, gratitude, situation log, voice note, body scan, guided imagery, relaxation, movement...) by topic with search; on the run screen the task has one big button that opens the tool (the task's clock keeps running).
- **Points and awards** (off by default): automatic or custom points per step, bonus for finishing early, a little less for finishing late (never below 0, never in the calm pace, can be switched off), awards (medal, coin, trophy, star, gem, crown) won by finishing early with double points, a podium with fireworks, a points chart and a running total in Statistics.
- **Move routines**: Home → Plan → Share and move routines: copy to another person on the device, save/send a routines file, bring routines in from a file for a chosen person (alarms come in off; hostile files are refused).
- Fix: Done/Pause stay on the first screen of the run (the voice row moved below); two overlapping route changes could leave a stale Home alive.

## 1.20.0
- **What the app is for**: in Settings choose a way of working (CBT, Cog-Fun) and/or what is hard (attention, anxiety, organising, motivation) plus an age; the app shows only what fits (toolbar, search, navigation, run-screen helpers). "Show everything" and a different choice are always one tap away; nothing is deleted.
- **People**: several profiles, each with its own settings (look, text, sound, voice, pace...) and its own view; a small switcher at the top of every screen; "Who is using the app?" at the start (can be turned off); manage everyone in Settings → People.
- **Settings**: a sticky search box and a jump bar; the welcome/setup screens can be reopened; **skins** (Classic, Ocean, Forest, Sunset, Candy, Slate), **easy-read text** and a custom accent colour.
- **Voice commands in a routine**: a Listen button (and a ? that lists the commands) keeps listening through all steps - done, add time, pause, resume, skip, journal, calm corner, remind me the step, time left, tip, stop (asks first), yes / no. Listed in Settings → Voice commands; optional auto-start. Uses the same opt-in and recogniser as voice notes; the app ignores its own voice.

## 1.19.2
- **Start over / Cancel / Delete a run**: a routine in progress is no longer a dead end. **Start over** (from the beginning, nothing saved) and **Cancel this run** (nothing saved, back to Home) are in the run screen's "More → Change the plan" and on the Home "continue" card; **Delete this run** removes a finished run from the history, with Undo. Parents' live view and the Android progress widget are cleared too (`ui/runAdmin.js`, `store.removeRunWithUndo`).

## 1.19.1
- **Example routines no longer ring**: the ready-made routines keep their alarm time and days but ship with the alarm **switched off** (a person's own new routines still start with it on). Examples that an earlier version had switched on are switched off once (`samplesAlarmsOff`); switch one on with the toggle on its card.
- **Start-up screen**: the SonRise logo floats up like a sunrise with a loading bar (respects reduced motion) instead of the ☀️ emoji.
- Fix: the journal's password section no longer closes by itself when the page redraws (this was also the cause of an occasionally flaky e2e step).
- Fix: long chips (e.g. "No alarm is on yet…") wrap instead of making the Alarms screen scroll sideways.

## 1.19.0
- **Wizard: edit the steps before creating**: the review step lists every suggested step with its name and time (− / +), remove (✕) and "Add a step"; edits survive Back/Next and the calm-breaks switch only adds or removes the break steps.
- **Wizard + goals**: a new "goal" step (an existing goal, a new one with ideas by the chosen help, or none). The goal's strategies become the routine's first steps (timer, pick the first small step, clear the desk, check the list...), a new goal is created and linked, and any goal can start the wizard with **"Build a routine for this goal"**.
- **Goals inside routines**: a 🎯 chip on the routine card, a **Goal** section in the editor (link / unlink / create), the existing plan card in the run.
- **Calm corner**: four kinds of **body scan** (quick, full head-to-toe, tense-and-release, for sleep) and **guided imagery** with 11 scripts, including the **four elements - earth, air, water, fire** (אדמה, אוויר, מים, אש), safe place, waves, forest, mountain, leaves on a stream, worry balloon, worry box, warm light, floating cloud and a kind helper. Hebrew and English, read on screen and optionally aloud.
- **Situation log (APRT / EIER)**: Event - Interpretation - Emotion (with intensity) - Response, plus an optional "another way to see it" step, one question at a time, **written, dictated or recorded**, saved to the private journal. From the journal ("Reflect" menu), the task-help card, the end of a calm exercise, search and a suggestion. After three logs the journal shows **what the records show**: common feelings, intensity trend, typical responses, recurring themes and thinking traps with a gentle question each (self-help overview, not a diagnosis).
- The journal toolbar is now one row (Note, Record, Reflect ▾).

## 1.18.1
- **Automatic updates for the web app**: the service worker already downloaded new versions; now the app also looks for one when it comes back to the foreground and every hour, and **reloads into the new version by itself when that is safe** (not during a run, with a sheet open, or while typing - then the "Update ready" prompt appears once and the switch happens as soon as it is safe). A short "Updated to version X" note follows (`update.js`, unit-tested).
- **Share the app itself** (PWA and Android app): Settings -> App -> Share, or search "share". Two blocks - the Android app (APK link) and the web app (PWA link) - each by **WhatsApp**, **e-mail**, the system share sheet or a copied link, in Hebrew or English (`appShare.js`, unit-tested). The Android app now also opens `mailto:` links.

## 1.18.0
- **Renamed to SonRise** (display name in the app, PWA manifest, Android launcher, reports, notifications, docs) with a new **logo**: a sun rising over the horizon with the name "SonRise" inside it (`scripts/make-logo.py` + `scripts/make-icons.mjs` regenerate the SVG and every PNG / launcher icon). Package ids and URLs are unchanged so updates keep working.
- **ONE unified toolbar** on Home: a single row (New · Wizard · Plan ▾ · Calm ▾ · Track ▾ · Alarms) where the dropdowns open one panel in the page flow; the Alarms button pauses/resumes everything.
- **Pause all alarms**: until tomorrow, for a week, or until switched back on; a banner on Home with a one-tap way back; mirrored to the Android app (`setAlarmRules`).
- **Hebrew calendar + quiet days**: the Hebrew date on Home, holidays and school vacations computed offline (`holidays.js`: Rosh Hashana, Yom Kippur, Sukkot/Simchat Torah, Hanukkah, Purim, Pesach, Independence Day, Shavuot, the summer vacation). Every alarm has "Quiet on holidays and vacations" - **on by default** - shown with the next days off; the Android app receives ~14 months of dates and skips them.
- **Alarm sticker** on the routine card of every routine that has an alarm; the card's switch arms/disarms it.
- **Choose the type of ring**: nine types as tiles with a preview (alarm, gentle, phone, rising, bell, birds, digital, melody, and - in the Android app - any sound from the phone).
- **Spacing**: durations read `5 ד׳` / `5 m` (a non-breaking space between number and unit).
- **Parent view**: a linked child's goals with check-ins and look-backs (counts, last one, what got stuck) appear on the parent's Family screen (titles only, never private notes).
- **Weekly check-ins**: on a chosen day Home suggests the weekly report, a goal check-in and a look-back (Settings -> coach).
- **Difficulty trends**: each task's difficulty over time ("getting easier / harder / steady") in Statistics.
- **Learning from "no"**: extra steps or times you leave unticked twice are not suggested again; three new helper steps (water, music, a small celebration).
- **Voice engine choice** (Android app): pick any installed text-to-speech engine - Google, Samsung, or a free offline neural one such as SherpaTTS / Hayai TTS - and then any of its voices; the app re-reads the voice list.
- Release checklist: the owner's standing rules and the requests ledger (`docs/REQUESTS.md`).

## 1.17.0
- **Global search**: one box (🔍 on the bottom bar and on Home, or Ctrl/Cmd+K) finds any feature, settings group or your own routines ("Start / Edit …"), in Hebrew and English, and opens the exact place (settings groups open via `#/settings/<group>`).
- **Routine wizard** (Home, search, suggestions): who / how old / what helps (focus, organizing, calm, motivation) / which routine / when -> a routine with age- and help-adjusted times (or your own history), optional calm/focus breaks, an alarm, and the chosen help areas saved; then Start / Edit / Done.
- **Gentle suggestions**: one idea at a time on Home with Try it / Not now / Don't show again, at most one a day; can be switched off in Settings.
- **Calmer screens**: Home keeps search, New routine and the wizard, with the other tools grouped by topic in a toolbar of dropdowns (Plan / Calm / Progress); the edit page folds Schedule / Gear / If-then / Leave-by / Alarm and per-task expected time; the run screen shows Done + Pause, with the other buttons under "More" and difficulty behind one tap; settings groups start closed.
- **Alarm switch on every routine card**: a toggle (armed / off, with the schedule) separate from Start, so the person controls whether the alarm will ring by itself.
- **Fixes**: Statistics showed "nullnull…" when there were no runs (every `replaceChildren(...)` now goes through `setChildren`, enforced by the static check); sheets and pages no longer grow wider than the screen (grid/flex min-width, wrapping text), verified by a new layout sweep (`tests/e2e/layout.mjs`) across 8 sizes x Hebrew/English x big text.
- **Voices**: stronger character differences (pitch/pace); in the Android app the phone's own text-to-speech is used (all installed voices, exact pitch and pace) with a "Get more voices" button.

## 1.16.0
- **A much more human voice**: read-aloud now speaks in **phrases with natural pauses**, rising/falling intonation and a calm human pace (instead of one flat, fast run-on), cleans the text first (no emoji, "4ד׳ 40ש״נ" -> "4 דקות 40 שניות"), and adds tiny variations so it never sounds copy-pasted.
- **Real characters, not just pitch/speed**: 17 new characters - everyday (woman, man, girl, boy, grandma, grandpa), speaking styles (coach, calm guide, storyteller, radio host, teacher) and fun (cat, dog, lion, frog, pirate, dinosaur; animals say their sound) - each **picks a matching installed voice** (male/female, most natural first, variety between characters).
- **Choice**: device voice (★ = natural/neural), speaking pace slider, **wording style** (casual / warm and traditional / polite and formal), a sample on every change, and steps for installing better voices on Android, iPhone and Windows. Old voice settings and alarm rings keep working.

## 1.15.0
- **Looking back, your way**: choose **guided** (step by step, can be paused and continued later as a draft) or **free** (everything on one page); for **this run or the routine's last 5 runs**; the **whole thing or only some parts** (feel / tasks / went well / changes); **several look-backs per run**; a remembered default style (Settings → Helpers).
- **What worked and what did not**: each task is marked went well / stuck / not now; Looking back now shows **what to focus on** (tasks that keep getting stuck or were set aside, with a one-tap look at just that task), **what worked** (changes that helped, tasks that keep going well) and **what did not**.
- **Undo** any applied change; a Home card tells you when a change has been judged (helped / no clear change / worse); the Home prompt picks the run with the most going on; focus and worked/not-worked appear in the reports.

## 1.14.0
- **Retrospective (looking back)**: after any run - or later - a short guided look-back: how it went, which tasks got stuck (the data pre-ticks tasks that ran over, were rated hard or were interrupted), why (8 causes), what went well, and **concrete suggested changes to the routine** (more time, a helper step, split a task, an earlier alarm, a gear item, planning for an interruption, a goal with a plan) that can be **applied in one tap**.
- **Did it help?** The app compares the routine's runs before and after the applied changes (on time, over/under plan, difficulty, stuck tasks, interruptions) and says improved / no clear change / worse, waiting for enough runs first.
- **Automatic conclusions and reports**: Looking back overview with what gets in the way, which kinds of change helped, tasks that keep coming back, unapplied suggestions; included in the PDF / HTML reports; a gentle prompt on Home after a run; retrospectives travel in backups.

## 1.13.0
- **Alarms on by default**: new routines (and the ready-made ones, once) start with a wake-up alarm switched on so it is easy to find; Home → Alarms shows them all. The notification permission is requested up front in the Android app.
- **Version number and a real "What's new"** (Home footer, Settings, and a sheet after each update) with the history of recent versions, in both languages.
- **Interactive HTML report** (animated, tabs for 7/30/90 days and all time, count-up numbers, growing bars, drawing charts) next to PDF.
- **Smart times**: suggested durations from the person's own history, age and the chosen help areas (focus, calm, time...), for one task or the whole routine; a parent can suggest for a linked child.
- **Smart extra steps**: breathing, movement, focus and check steps proposed between tasks according to the chosen help (anxiety / attention / memory ...), with a reason for each.
- **More Cog-Fun-inspired tools**: estimate accuracy ("how close are my guesses"), which strategies helped (per goal), guiding questions for parents.

## 1.12.0
- **Task feelings and help in every task**: rate how hard it is (5 icons), **write why it is hard** (note or voice, attached to the task), get **a different kind thought** (22, CBT-style reframes / self-compassion / starting small) or **a relaxation exercise** (13, breathing and body-based) every time, worded for the person's age. All of it is saved with the run.
- **Difficulty statistics**: "Where is it hard?" ranks tasks by average difficulty, flags hard-and-slow tasks and shows how often help was used; the parent's weekly digest also names the hardest steps.
- **Reports**: a designed report for one run or a period (7/30/90 days / all, all routines or one) with KPIs, plain-language insights, charts, activity calendar, task tables, difficulty, interruptions, mood and goals - on screen, **print**, **real PDF file** (made on the device, Hebrew/RTL correct) and **e-mail** (Android: share sheet with the PDF attached; browsers: share files where supported, else download + mail with summary).

## 1.11.0
- **Alarms are easy to find**: a new ⏰ Alarms screen (home → Alarms) lists every routine with its alarm, switch on/off and edit (wake-up chain, sounds, messages, offer or auto start); each routine card shows its alarm; a one-time "What's new" sheet points to it.

## 1.10.0
- **Template library**: save tasks and whole routines as reusable templates, add them with big easy tiles (search + categories, 37 ready-made task ideas and 6 ready-made routines), a Templates page to use / rename / edit / share / delete (with Undo), included in backups and sync codes. Large, simple tiles also for children.
- **Easier task editing**: a time sheet (quick times, steppers, exact minutes/seconds) with − / + buttons on every task, and a **☰ task menu** (add below, duplicate, move up/down/top/bottom, picture, remove).
- **Playful wording for young children**: under age 12 (or "Playful" in Settings) the whole app - tabs, buttons, settings, summaries - uses lighter, more fun texts in both languages.
- **If-then plans** per routine (shown as a card when it starts), **timer look** (ring / pie / bar), **evening wind-down** sample routine, **weekly digest** for parents (slowest steps, repeated interruptions), **alarm snooze** (5 min) and a **Calm corner widget** (Android).
- **Choose what you want help with**: six areas (focus, calm, time sense, remembering, motivation, habits) switch on matching helpers; every helper stays individually switchable; a **parent can set the child's areas and helpers** over the family link; the coach picks tips that match the chosen areas.
- **Calm corner** (breathing patterns, 5-4-3-2-1 grounding, body scan) from home or mid-routine (the clock pauses while you breathe).
- **Focus tools in the run screen**: sprints with movement breaks, parking lot for stray thoughts, next-task heads-up with a soft chime, pie timer, quiet work buddy.
- **Journal** (📓): notes, **voice notes recorded during tasks**, thought checks (CBT, kid-friendly wording), "3 good things", parked thoughts, mood faces after a routine with a mood-vs-time insight in Stats.
- **Optional journal password**: PBKDF2-SHA256 (210,000 iterations) with a random salt; entries and voice notes are encrypted (a per-entry AES-GCM key wrapped with RSA-OAEP), so a note can be added while locked; **password reset through security questions** (answers never stored, they protect a second copy of the key); brute-force throttling; a way to erase the journal if both are lost.
- **Speech-to-text suggestions** (opt-in): the Android app uses the phone's recognizer (offline preferred); browsers use the Web Speech API after an explicit privacy notice. The transcript is only a suggestion the person edits.
- **Reward menu**: spend stars on rewards, a parent can set the menu and gets "would like" requests.
- Launcher shortcuts for the calm corner and the journal (Android); microphone permission only when recording or dictating.
- **Routine card widget** (Android): shows a saved routine with its tasks and settings summary, starts it with all saved settings, ‹ › switch to another routine per widget, live countdown while it runs.
- **Wake-up alarm chains**: several alarms per routine (e.g. 7:00, 7:15, 7:20), each with its own gap, sound (alarm, gentle, ringtone, rising), volume, vibration, length, message and optional spoken voice; after the last one the routine is **offered with a Start button or started automatically**. Android rings real alarms with text-to-speech; the browser rings while the page is open.
- **Unplanned interruptions**: a ⚡ button in the run (toilet, spill, forgot something, your own reason) stops the routine clock and counts that time separately - shown in the summary, Stats and the CSV. **Pattern detection**: when the same interruption recurs in a routine the app offers to add it as a real task or to look closer (guiding questions saved to the journal, with before/after counts).
- Fixed: a stray "null" appeared under "Remind me to start" when the alarm was off.
- Fixed: the "send to child" dialog title was missing its text.

## 1.9.0
- **26 new coach tips (61 total)**, each in two languages and three tones: attention and executive-function support (getting started / task initiation, working memory, switching between tasks, body doubling, 3-minute sprints, fidget and movement, making time visible, estimate-then-compare), more CBT (mini thought record, all-or-nothing words, testing predictions), more mindfulness (4-7-8 breathing, body scan, wall push, naming feelings, "worry radio").
- **Three new tip categories** (🚦 getting started, 🧩 remembering, 🔀 switching tasks); the coach picks by situation (late / stuck / any).
- **Encouragement doubled** (6-7 variants per event instead of 3-4) plus more playful lines for young children.
- `docs/ROADMAP.md`: ideas for what to build next, with status.

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

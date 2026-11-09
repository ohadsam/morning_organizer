# Requests ledger

Every request or approved suggestion from the owner, and where it lives. Walk this list before every release (see `.claude/skills/release-checklist`).
Status: ✅ shipped (version) · 🟡 partly (what is missing) · ⛔ not possible / declined, with the reason.

## Standing rules
| Rule | How it is enforced |
|---|---|
| Built for attention / focus / anxiety / organisation difficulties, children and adults: few things per screen, grouped, collapsed | Home toolbar + folds, edit page sections, run "More", settings closed; reviewed in every release |
| UI simple, accessible, minimal, beautiful, self-explanatory | axe = 0 violations (he/en/big text), layout sweep, screenshots reviewed |
| All buttons grouped in ONE toolbar of topic dropdowns, one row | `toolbar()` in `ui/common.js`, e2e checks a single row |
| Same features in the PWA and the Android app | One `web/` folder; background features mirrored natively (alarms, pause, holiday dates) with JVM tests |
| Hebrew first, English equal; a space between number and unit | i18n parity test; `fmtHuman` test |
| Alarms on by default for a person's OWN new routines (the ready-made examples ship with the alarm OFF), quiet on holidays/vacations by default, one control to pause all | `wake.js`, `holidays.js`, `alarmPause.js` + tests |

## Requests
| # | Request | Status |
|---|---|---|
| 1 | Journal, calm corner, focus tools, help areas, reward menu, voice notes, dictation | ✅ 1.10 |
| 2 | Routine-card widget, choose/switch the displayed routine | ✅ 1.10-1.11 |
| 3 | Fix "null" under "Remind me to start"; alarm chains (rings, gaps, sounds, voice, offer/auto start); unplanned interruptions + patterns | ✅ 1.10 |
| 4 | Playful wording for young ages; easier time picker; ☰ task menu | ✅ 1.10 |
| 5 | Template library for tasks and routines | ✅ 1.10 |
| 6 | Cog-Fun-inspired goals (Goal-Plan-Do-Check), alarms screen, What's new, sand clock, Sit with me, progress widget | ✅ 1.11 |
| 7 | Per-task difficulty icons, "why hard", kind thoughts, relaxation, statistics, PDF/HTML/e-mail/print reports | ✅ 1.12-1.13 |
| 8 | Alarms on by default, version number, What's new, interactive HTML report, smart times and extra steps, estimate accuracy, parent questions | ✅ 1.13 |
| 9 | Retrospective (guided/free/partial/several, drafts, undo, impact tracking, conclusions) | ✅ 1.14-1.15 |
| 10 | More human voices; male/female/child/animals; many characters | ✅ 1.16 (characters), 1.17-1.18 (phone voices in the app) |
| 11 | Voice: bundled free 3rd-party engine | ⛔ researched ([Piper Hebrew "noa"](https://huggingface.co/thewh1teagle/piper-he-noa) is CC BY-NC-SA, one female voice; sherpa-onnx is Apache-2.0 but ships no permissive Hebrew model); the Android app uses the phone's own voices + a download button instead |
| 11b | More, richer voice packages (second research round) | 🟡 researched again (see ROADMAP): nothing commercially licensed for Hebrew; shipped instead a **voice-engine picker** so offline neural engines (SherpaTTS, Hayai TTS) and Samsung/Google voices all work |
| 12 | Fix "null" on Statistics and the alarm sheet wider than the screen; wide layout testing | ✅ 1.17 (layout sweep in CI) |
| 13 | Calmer UI: group buttons, dropdowns, fewer things per screen | ✅ 1.17-1.18 |
| 14 | Global search | ✅ 1.17 |
| 15 | Wizard to build a routine (ADHD / organisation / anxiety...) reachable from search, menus, suggestions | ✅ 1.17 |
| 16 | Occasional suggestions with "ignore / don't show again" | ✅ 1.17 |
| 17 | Alarm on/off switch on every routine card (separate from Start) | ✅ 1.17 |
| 18 | PWA/native parity | ✅ same web code; native bridges for alarms, pause, holidays, voices |
| 19 | Rename to **SonRise** everywhere + logo with the name inside | ✅ 1.18 |
| 20 | Space between number and unit (`5 ד׳`) | ✅ 1.18 |
| 21 | Choose the type of ring | ✅ 1.18 (9 types, tiles, phone picker in the app) |
| 22 | Hebrew calendar; alarms quiet on holidays and vacations (default on) incl. the summer vacation | ✅ 1.18 |
| 23 | Routines with an alarm show an alarm sticker | ✅ 1.18 |
| 24 | Pause / cancel all alarms from the main toolbar | ✅ 1.18 |
| 25 | One unified single-row toolbar | ✅ 1.18 |
| 26 | Release-checklist updated with these rules | ✅ 1.18 |
| 27a | Parent view of a child's goals / check-ins and look-backs | ✅ 1.18 |
| 27b | Weekly goal / report / look-back reminders | ✅ 1.18 (Home suggestions on a chosen day; in-app, not background notifications) |
| 27c | Per-task difficulty trends | ✅ 1.18 |
| 27d | Learn from rejected suggestions | ✅ 1.18 |
| 27e | Per-child smart-time history for parents | ✅ 1.18 (typical task times travel in the child's report) |
| 27f | More helper-step types | ✅ 1.18 (water, music, celebration) |
| 27g | Selectable text in the PDF | ⛔ needs an embedded Hebrew font (size/licence); the interactive HTML report and Print give selectable text |
| 27h | Cloud sync | ⛔ deliberately not built: needs an account/server; manual sync code/file exists |
| 28 | Alarm ring "type" in the Android app = phone sounds | ✅ picker (verified by CI compile only) |
| 29 | Automatic update of the PWA on refresh / entry | ✅ 1.18.1 (checks on focus + hourly; reloads itself only when safe) |
| 30 | Share the app (Android + PWA) by WhatsApp and e-mail | ✅ 1.18.1 |
| 31 | Wizard: edit the suggested tasks before creating | ✅ 1.19 |
| 32 | Calm corner: more body-scan abilities; the four-elements (earth, air, water, fire) imagery; more guided imagery (researched) | ✅ 1.19 (4 scans, 11 guided journeys) |
| 33 | APRT / EIER (Event, Interpretation, Emotion, Response) from CBT, written and by voice, with later analysis, inside the journal and where relevant | ✅ 1.19 |
| 34 | Goals shown inside routines; an automatic routine built from the goals and the problem world (ADHD, anxiety...) | ✅ 1.19 (goal chip, editor section, wizard goal step, "build a routine for this goal") |
| 35 | Ready-made example routines must not ring: alarm OFF by default | ✅ 1.19.1 (and switched off once for existing installs) |
| 37 | A routine in progress needs start over / cancel / delete (it was a dead end) | ✅ 1.19.2 |
| 36 | Start-up screen shows the new SonRise logo with a loading animation instead of the sun | ✅ 1.19.1 |
| 38 | Define what the app is for (model: CBT / Cog-Fun; problem: attention, anxiety, organising...; age) and show only what fits; simple way back to everything and to another choice | ✅ 1.20 (Settings → What the app is for; hides toolbar items, search, navigation, run helpers) |
| 39 | Several profiles, choose at entry, each with its own settings and tailored screens; manage all in Settings; small dropdown at the top | ✅ 1.20 (per-profile prefs, top switcher, start-up picker, Settings → People) |
| 40 | First-run welcome/setup reachable from Settings | ✅ 1.20 |
| 41 | Floating settings toolbar to jump to every group, with search inside settings | ✅ 1.20 (sticky search + jump bar) |
| 42 | More convenience: skins to choose from, custom options | ✅ 1.20 (6 skins, easy-read text, custom accent colour) |
| 43 | Voice commands during a routine (done, add time, journal, calm, stop, pause, remind me the step...), keeps listening; commands listed in Settings and a ? next to the toggle | ✅ 1.20 (run-screen Listen button + ?, Settings → Voice commands; real-device recognition unverified) |
| 44 | Share routines between profiles; a routine available to all or only some (a parent/therapist sets up for children on one device) | ✅ 1.21 ("Who sees this routine", `owners`) |
| 45 | Points per task (automatic or user-set), bonus early / penalty late, podium with fireworks, points statistics and cumulative total, special awards (medals, coins, trophies) | ✅ 1.21 (off by default; calm pace never loses points) |
| 46 | Choose built-in special tasks (journal, thought parking, relaxation, guided imagery...) from a grouped, searchable picker, not only as suggestions | ✅ 1.21 |
| 49 | NLP as a method like CBT / Cog-Fun: choose tasks, guidance and adaptation by it | ✅ 1.22 (needs model, six guided tools, special-task group; honest evidence note) |
| 50 | Suggest and add more UI/UX improvements | ✅ 1.22 (calm animations switch, method notes in the chooser, light vibration tick) |
| 73 | UX batch part 1: Home shows just what to do now; the run screen shows one step at a time (O5) | ✅ 1.32.0 (`nowPick.js`, `homeMode`, `runView`, unit + e2e + axe he/en); rest of O5 open |
| 72 | Smart suggestion to shorten steps when the leave-by time will be missed, recorded in the statistics (O3) | ✅ 1.31.0 (`shorten.js`, runner card, `shortened` on the run, summary row, stats note, unit + e2e + axe) |
| 71 | Mood widget on the home screen (O4 part) | ✅ 1.30.0 (five faces open `#/feel/<n>`); kind thought / points / balance widgets and per-look backgrounds still open |
| 70 | Voice note + dictation in the feeling check-in; ask how I feel inside a routine (start / end / after a task); make it easy to reach | ✅ 1.29.1 (voiceNote widget, quickFeel, feelAt / feelAfter in the editor, moment statistics, launcher shortcut) |
| 69 | The feeling check-in screen tuned to each approach, with statistics and a therapist summary (O2) | ✅ 1.29.0 (`#/feel`, per-approach question, bars over time, summary with notes off by default, backup, erase with the person, unit + e2e + axe). Mood widget on top of `#/feel/<1-5>` still to build |
| 68 | Calm widget: a ball and Sunny breathing; a widget that shows a good sentence for a chosen treatment approach, changing every few hours | ✅ 1.28.0 (CalmWidget ball flipper, CalmSunnyWidget, SentenceWidget + config screen, 56 sentences he/en, unit tests) |
| 67 | Widgets with the kit visuals + a Journal widget (integration step 2) | ✅ 1.27.0 (backgrounds light/dark for all five widgets, drawn calm icon, Journal widget); mood / thought / points / balance widgets and per-look backgrounds still open |
| 66 | Why are some avatar pieces locked, how to open them, and tell the person when they open | ✅ 1.26.2 (intentional level unlocks; hint with stars left in the studio; level-up card lists the new pieces with a button) |
| 65 | Landing screen still shows the cat; the Hebrew date shows numbers instead of letters | ✅ 1.26.1 (Sunny is the default avatar, one-time migration for the untouched fox; date in letters) |
| 64 | Integration batch of the received kits (order: 1 breathing / calm scenes + avatar breath, 2 widgets, 3 scenery after its round 3, 4 mood faces / task icons / logo) | ⏳ step 1 (calm scenes, avatar breath, skin colour fix) ✅ 1.26.0; next: widgets; known fix to apply while integrating: the calm targeted-fix SVGs (bodyscan, grounding-4/1) colour skin with `k6` which is coral red in the Sunrise look - switch the skin elements to `k8` (peach) |
| 63 | Review the calm animation kit (breathing person, 4 pattern scenes, 11 imagery scenes, grounding, body scan, NLP) | ✅ reviewed: usable as stills with host CSS hooks (`--p`); weak: tiny figures, bluish faces, heavy box scene, same background template; the avatar breath is better done by the app itself (transform on the existing layers) - fix list sent to the owner |
| 62 | Animations that fit each calm exercise: a person / the user's avatar breathing, per-pattern scenes, the ten guided imageries, grounding, body scan, NLP exercises | ✅ prompt written (`docs/CALM_ANIMATION_PROMPT.md`; it was NOT in the earlier prompts, only one generic breathing-sun); the app side (driving `--p` from `phaseAt`, avatar breath state) is built after the kit arrives |
| 61 | Review the scenery repair (stages 2-5) and the widget kit | ✅ reviewed: task icons, Hebrew logo, accents, ornaments, skeletons good; frames, dividers, progress track, two patterns and backgrounds need round 3 (`docs/SCENERY_KIT_PROMPT_3.md`); widget kit received in full (181 svg, nothing missing): fixes in `docs/WIDGET_KIT_PROMPT_2.md` (faces, week strip, bell pulse, pickers, tint opacity, vector surfaces) |
| 60 | Avatar studio: broken button text, a clear way to pick boy / girl, a step-by-step creation wizard; icons colourful by default with a black & white option in Settings | ✅ 1.25.2 |
| 59 | Android widget assets: icons, backgrounds, frames and animation frames for every widget | ✅ prompt written (`docs/WIDGET_KIT_PROMPT.md`); waiting for the generated kit |
| 58 | Review the scenery kit and write a corrected prompt | ✅ reviewed: mascot, splash and store art are good and will be adopted; backgrounds, patterns, accents, frames, dividers need a redo; contrast numbers were measured on flat colour - corrected prompt in `docs/SCENERY_KIT_PROMPT_2.md` |
| 57 | Switchable style packs for icons (per look and by choice) | ✅ 1.25 (toolbar, menus and tabs; per-look variant + the Icon style setting); task icons / awards / animations still to come |
| 56 | Round-4 visual kit: fix adaptive icon layers, outline logo, stars, tired / playful / hyper-focus faces, filled feature icons | ✅ checked; adopted the adaptive icon (1.24.1), notification icon and maskable icon; faces/filled icons wait for the style-pack switch |
| 55 | Use the corrected visual kit in the app | ✅ 1.24 (strict loader, per-look artwork colours, empty-state and welcome illustrations, mood faces, new app icon); tasks / features / awards / animations / style-pack switch wait for the final kit (round 4) |
| 54 | Review the repackaged (round 2) visual kit | ✅ reviewed: improved (no duplicates, recognisable tasks, distinct awards/features) but not production-ready (wrong emotions in feelings, sparse illustrations, logo/app-icon artefacts, blobby filled icons); round-3 prompt in `docs/VISUAL_KIT_FIX_PROMPT_2.md`; nothing from it shipped yet except the two looks from the tokens |
| 53 | Review the generated visual kit and report problems | ✅ reviewed (usable: tokens, UI icons, level badges; not usable yet: tasks, feelings, awards, features, illustrations, per-pack logos) - follow-up prompt in `docs/VISUAL_KIT_FIX_PROMPT.md`; the calm and bold looks were taken from it (1.23.1) |
| 51 | Build-your-own avatars with animations: a prompt for ChatGPT to make the kit, then create / save / edit / manage / share avatars in the app | ✅ 1.23 (283-part kit, studio, My avatars, share by code, backup) |
| 52 | A second ChatGPT prompt for all icons, animations, logo and switchable style packs (also by method and difficulty) | ✅ prompt written (`docs/ICON_PACK_PROMPT.md`); the kit itself is waiting for the generated file |
| 48 | A button next to the profile chooser to switch from the kids' view to the full view | ✅ 1.21.1 (top-bar Kids view / Full view; the way back asks the grown-up question) |
| 47 | Export / import routines between profiles and between devices | ✅ 1.21 (Share and move routines; file + copy to a person) |

## Open items (agreed, not built yet)
| # | Item | Notes |
|---|---|---|
| O1 ✅ 1.25.1 | **Make the retrospective (looking back) easier to find and reach, and make people aware it exists** (owner request, 2026-11-07) - DONE: summary card, Home hint (dismissable for a week), dot on Track, button in the routine statistics, plain-word search; still open: an optional weekly reminder | Today it lives in Home → Track → Looking back and after a run on the summary. Ideas: a clear "Look back" card on Home after a few runs, a button right on the run summary and in each routine's statistics, a gentle reminder (e.g. weekly), a search entry with plain words, a mention in the welcome / needs choice, and a What's New pointer. Keep it calm (one card, dismissable). |
| O2 ✅ 1.29.0 | "How do I feel today" screen, tuned to each method (CBT, Cog-Fun, NLP, ADHD, anxiety), with the new feeling faces; statistics over time; a summary to share with a therapist (notes off by default) | Faces are in the visual kit already (`feelings`). |
| O3 ✅ 1.31.0 (smart shortening; method sounds still open) | Leave-by time: special indication in the timers, an automatic smart suggestion where to shorten steps when the leave time will be missed (using the person's own history), record the shortening in the statistics, sounds / indications by method | `leave.js` has the status and events; needs `shorten.js` (pure), runner UI, stats. |
| O4 | Widgets: Journal (explicit request), Mood, Next routine, Breathing, Points / streak, a kind thought | Kotlin only, compiled by CI; one-tap widgets open an allow-listed route (`Shortcuts.ROUTES`). |
| O5 (1.32.0: Now home + one-step run done) | UX batch: a "Now" Home mode, one-step run view, "start for me", a starter pack after choosing a method, a weekly calm summary, density and clear-font settings, backup reminder, a "who sees this" badge on routine cards, an interactive first-run tour, uniform undo | Proposed 2026-11-06; the owner approved all. |
| O6 | Visual kit: task icons (needs an icon field that can point at a kit icon, with an emoji fallback for widgets / notifications / reports), award / level / achievement badges and animations in the UI, per-look logo in the About / boot screen | Waiting for the final kit round (task silhouettes, achievement badges). |
| O7 | Checks on a real device: speech recognition, share sheet, adaptive and themed launcher icon, notification icon, avatar animations on a low-end phone, the icon looks | Cannot be done in CI. |

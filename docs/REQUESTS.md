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
| Alarms on by default, quiet on holidays/vacations by default, one control to pause all | `wake.js`, `holidays.js`, `alarmPause.js` + tests |

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

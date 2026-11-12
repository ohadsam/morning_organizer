---
name: release-checklist
description: Run this after implementing any feature or fix in SonRise (ohadsam/morning_organizer), before considering the work done. Covers the 5 specialist reviews (architecture, QA, UI/UX + RTL, security, performance), version bump, What's New, user guide, docs, skills, tests, CI as the Android verification gate, and shipping to main. Invoke by name ("run the release checklist") or whenever the user asks to finish/ship/wrap up a change here.
---

# Release checklist

SonRise = one **vanilla-JS web app** (`web/`, no build step, no runtime dependencies) used two ways:
a **PWA** on GitHub Pages and a thin **Android WebView shell** (`android/`) that packages the same `web/` folder as assets.
Do not skip or reorder steps; later steps assume earlier ones are done. If a step finds nothing, say so explicitly and move on.

**First:** confirm the previous batch's checklist really finished (check the task list) - a green `main` and a half-finished checklist look identical.

## 0. The owner's standing rules - every change must satisfy these (check them in the review passes and say how)
1. **Audience first.** People with attention, focus, anxiety or organisation difficulties, and children as well as adults. Too many things on one screen makes the app unusable for them: show few things, group the rest, collapse long pages into sections, keep wording short and kind.
2. **UI/UX: simple, accessible, minimal - and beautiful, comfortable and self-explanatory.** Every screen should explain itself (clear titles, one-line hints, visible state). Controls are **grouped by topic in ONE unified toolbar on ONE row** with dropdowns (never a pile of separate buttons, never wrapping over several rows); settings and long pages start collapsed with a one-line summary per section; one primary action per screen.
3. **Parity PWA = Android app.** The Android app packages the same `web/` folder, so every feature must exist in both. Anything that also has to work in the background (alarms, pause, holiday quiet days, widgets) must be mirrored through `native.js` -> `NativeBridge.kt` -> Kotlin logic **with a JVM unit test**, and degrade gracefully in the browser. Native-only extras (phone voices, ringtone picker) are hidden in the browser, never broken.
4. **Hebrew first, English equal.** Every string in both languages (neutral plural forms in Hebrew), RTL-safe layout, a space between a number and its unit (`5 ד׳`, `5 m`).
5. **Defaults protect people.** Alarms are on by default for new routines; they are quiet on Jewish holidays and school vacations by default; a single control pauses all alarms.
6. **Tests are the proof.** Unit tests for logic, an e2e step for every flow, axe at ZERO violations (he/en, big text), and the **layout sweep** (`node tests/e2e/layout.mjs`, CI runs `QUICK=1`) must stay clean at 320-1366 px. Look at screenshots of every changed screen.
7. **Requirements ledger.** `docs/REQUESTS.md` lists every request/suggestion the owner approved and its status. Before finishing: add the new requests, tick what shipped, and walk the whole list - nothing may be silently dropped (if something cannot be done, say why in the report).
8. **Honesty.** Say what was verified only by CI / tests and what needs a real device. Never claim a third-party component fits without checking its licence and size.

## 1. Five reviews - separate passes, in this order
Re-read every changed file fresh for each pass; each pass has caught bugs the others missed.

1. **System architecture.** Dependency direction is `ui/* → store/engine/stats/share → util/config`; `engine`, `stats`, `share`, `alarms`, `util` stay **pure** (no DOM, no storage, time passed in as `now`). Web code reaches Android only through `js/native.js`; Android code is reached only through `NativeBridge.kt`. New JS file → add it to `sw.js` SHELL (static check enforces). Any new persisted field → handled by `normalizeTemplate` and old data still loads. Update `docs/ARCHITECTURE.md` if a boundary moved.
2. **QA / functional.** Walk the user journeys: create → edit (type, drag, arrows) → favourite → run (warn at N s, end, overtime, pause, +1 min, skip, tick ahead, finish) → summary → stats/insights/apply → share/import → alarm → settings → backup/restore. Edge cases: 0 tasks, 100 tasks, 24 h task, run interrupted by reload/kill, clock/timezone change, storage blocked (memory fallback), first launch offline, upgrade from previous version's data. Hebrew **and** English each time.
3. **UI / UX + RTL.** Touch targets ≥ 44 px, one clear primary action per screen, labels on every icon button, focus visible, contrast in light **and** dark, no horizontal scroll at 320 px, keyboard path for drag & drop (arrows), `prefers-reduced-motion`. RTL: only CSS **logical** properties (`margin-inline-*`, `inset-inline-*`, `text-align: start`); directional icons flip; numbers/time stay LTR where needed (`.code`, chart). Run the automated audit (`npm run e2e` includes an axe-core step over every screen/dialog in he+light and en+dark, big text and an accent color - it must stay at ZERO violations; add any new screen/dialog to it). Screenshot every changed screen in `he` and `en` (`npm run e2e -- --shots <dir>`) and actually look at them.
4. **Security.** All user/imported text goes through `h()` (text nodes) - never raw-HTML sinks (`scripts/static-checks.mjs` bans them). Everything arriving via import/NFC/share/restore is untrusted: `share.js#sanitizeWire` / `store.js#normalizeTemplate` clamp lengths, numbers, colours, strip control+bidi chars, regenerate ids; decompression is size-bounded. CSP in `index.html` stays `'self'` only (no CDN, no inline script/style). Service worker never touches cross-origin. Android: `NativeBridge` validates every argument and caps sizes; WebView only loads the asset origin (others → external browser); no file/content access; no cleartext; `INTERNET` is declared only for the Settings "Check for a new version" button (`UpdateCheck.kt`: one fixed GitHub address, on a tap, bounded answer, only our own APK address is ever opened) - any new network use needs its own written reason and a line in `ARCHITECTURE.md`; receivers/services `exported=false` unless the system must bind them; no private secrets in the repo (the committed APK signing key is a deliberate, documented exception). Run the `security-review` skill on the diff. For the journal/lock also confirm: no plaintext or password/answer material is ever stored or logged, new journal fields go through `sanitizeEntry`, the journal stays out of `exportAll`/backups/link messages, and microphone access is granted only to our own origin and only for audio. For family code also confirm: envelopes only accepted with a known key + unseen sequence number, invitations single-use + approval, every received payload sanitised (`sanitizeReport`, `sanitizeGoal`, `normalizeTemplate` via `importBackup`).
5. **Performance.** Rendering is rebuild-per-view - keep lists bounded (`LIMITS`), never re-render a whole view per timer tick (runner only touches `paintLive`), timers derive from timestamps (no drift when throttled), IndexedDB writes are batched/debounced (editor 350 ms), `runs` capped at `LIMITS.maxRuns`. No new dependency without a written reason (the shipped app has zero). Check `sw.js` precache stays small and APK size doesn't jump.

Fix findings **before** moving on; re-run the affected pass if a fix was non-trivial. Write what each pass found (even "nothing") in the final report.

## 2. Version + What's New
`npm run bump -- patch|minor|major` updates `web/version.json` (single source; Gradle reads it), `web/sw.js`, `package.json`. Then add `## x.y.z` to `docs/CHANGELOG.md` (the unit test fails without it; the release notes are cut from it).

## 3. User guide - always current
Every user-visible change updates **both** `web/js/ui/guide.js` (en + he) and `docs/USER_GUIDE.md`. A test checks all section titles exist in both. New setting/screen/feature ⇒ guide text, even one sentence.

## 4. Docs
`README.md` (feature list, screenshots if UI changed), `docs/ARCHITECTURE.md`, `docs/RELEASING.md` if pipeline/setup changed. New strings go in **both** languages of `js/i18n.js` (parity test enforces keys + `{placeholders}`); Android strings in `values/` **and** `values-he/`.

## 5. Skills
If this run revealed a missing step or a wrong claim here, fix this file now (self-review of the checklist).

## 6. Tests - must be green locally
```
npm run check      # syntax, banned APIs, CSP/SW consistency
npm test           # node:test unit tests (engine, stats, share, alarms, i18n parity, version sync, guide)
npm run e2e        # (ONLY="axe-core" npm run e2e runs one step) Playwright: boot, RTL, editor, drag, run with fake clock, stats, share, settings, 320 px overflow
```
New logic ⇒ new unit test; new user flow ⇒ new e2e step; every fixed bug ⇒ a regression test. If e2e fails right at boot, suspect a bad import / stray `*/` in a new module: `node -e "import('./web/js/x.js')"`.
Gotcha (real): untrusted keys must be checked with `Object.hasOwn(map, key)` - `key in map` / `map[key]` accept `__proto__`/`constructor` (found in avatar ids and voice presets). Continuously animated elements are never "stable" for Playwright clicks: use `reducedMotion: 'reduce'` for steps that click avatars.
Gotcha (real): `page.addInitScript` only applies on the next document load - `reload()` first (a hash `goto` does not reload). e2e starts in Hebrew/RTL (the default): `newPage()` switches to English via Settings unless `{ lang: 'he' }`.
Gotcha (real): glyphs like ‹ › in Android layouts do not mirror in RTL - put them in `values/` and `values-he/` strings. Native-only features (alarm chains, TTS, widgets, dictation) cannot be exercised here: say so in the report and rely on CI compile/lint.
Gotcha (real): grid/flex children default to `min-width:auto` - a time input or long word makes sheets wider than the screen (fixed globally in `app.css`; the layout sweep guards it). Hebrew-calendar dates come from `Intl` (`u-ca-hebrew`) in `holidays.js`; holiday rules are unit-tested - extend the tests, not a table.
Gotcha (real): `el.replaceChildren(null)` renders the text "null" and arrays render `[object HTMLDivElement]` - use `setChildren()` from `util.js` or `h()` which flatten and skip null.

## 7. Android verification = CI
No Android SDK in the sandbox (`dl.google.com` blocked), so Kotlin is only compiled by GitHub Actions (`ci.yml` → *android*: unit tests, lint, release APK). Treat "push, wait, read the log" as mandatory (`get_job_logs` for failures). Pure logic that can be unit-tested on the JVM goes in `AlarmMath.kt`-style objects (no Android types) with tests in `android/app/src/test`.

## 8. Ship
Commit on the working branch, push, wait for **web** + **android** green. On `main` the *release* job publishes `morning-organizer.apk` as the latest release and `pages.yml` deploys the PWA - verify both (release exists with the APK asset; Pages URL serves the new `version.json`). Don't claim "done" before that.

## Known limitations (don't re-report as new)
- A routine is visible to everyone unless its `owners` list names people (the UI lists only the active person's routines; alarms still ring on the device for all); history, stars, badges, streak, level and parent links are per profile. Child alerts reach the parent only over a live link (WebRTC / Bluetooth) while the parent app is open - there is no server to hold them.
- Built-in animated characters replace third-party GIFs on purpose (licensing, offline, size); users can add their own GIF (≤160 KB, never shared).
- Family links: WebRTC needs both phones on the same network (no STUN/TURN by design); the Bluetooth socket needs the Android app and phones paired in system settings; NFC = tag write/read, plus phone-to-phone hand-over via card emulation in the APK only (needs HCE hardware; never verified on a real device here). Without a live link messages are codes passed on manually. A reinstall loses the link keys (re-pair).
- The committed APK signing key is public by design (see RELEASING.md).
- Website ↔ app sync is manual (sync code / file): a merge never deletes routines, Replace gives an exact copy. Automatic sync would need a cloud store (Gist/Drive) - not built.
- Sample routines have fixed ids (`sample-kids`, `sample-adult`) so merges don't duplicate them; keep it that way.
- Voice "characters" are pitch/speed presets of the device voice (in the Android app: any voice the phone's engine offers); Hebrew needs an installed Hebrew TTS voice. No bundled neural voice: the only Hebrew models found are non-commercial (CC BY-NC) and large.
- Web alarms only ring while the page is open (browsers can't schedule background alarms); the Android app is the reliable path.
- Bluetooth/Nearby sharing goes through the system share sheet (no raw RFCOMM); NFC = tag write/read (Web NFC in Chrome Android, native in the APK) and, in the APK, phone-to-phone hand-over via card emulation (Android removed Beam; the web/PWA cannot do phone-to-phone NFC).
- Starting a routine while a different one is in progress replaces the in-progress run (the home screen shows a Resume card so it is hard to do by accident).
- The APK is signed with a committed shared key (stable updates, but not secret) unless private `KEYSTORE_*` secrets are set.

## Done means
All five reviews run and their fixes applied · version bumped · CHANGELOG + both guides updated · `check`/`test`/`e2e` green · CI green on the branch · (on main) release + Pages verified.

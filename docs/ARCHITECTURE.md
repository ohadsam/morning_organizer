# Architecture

```
            ┌──────────────────────────── web/ (single source of UI, no build, no runtime deps) ───────────────────────────┐
 GitHub     │  index.html + CSP('self')   sw.js (offline)   manifest                                                        │
 Pages ───► │  js/app.js  router ─► ui/{home,editor,runner,stats,settings,share,guide}.js   (DOM via h(), text nodes only)  │
            │         │                      │                                                                              │
            │         ▼                      ▼                                                                              │
            │  store.js (state, normalize, backup)  ◄── engine.js (run state machine, pure, `now` injected)                 │
            │     │   │                                  stats.js (series, insights, pure)    share.js (encode/decode/sanitize)│
            │     ▼   ▼                                  alarms.js (next fire, pure)           i18n.js (he/en, RTL)           │
            │  db.js (IndexedDB + memory fallback)       audio.js (beep/vibrate)  reminders.js (web-only alarms)             │
            │                         native.js ── no-op in browsers ──────────────────────────┐                               │
            └─────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────┘
                                                                                              ▼  window.MorningNative
 APK (GitHub Releases, always latest)   android/  MainActivity (WebView on https://appassets.androidplatform.net, assets = ../web)
                                         NativeBridge ─► AlarmStore/AlarmMath ─► AlarmManager.setAlarmClock ─► AlarmReceiver ─► AlarmService (sound+vibration)
                                                      ─► RoutineWidget (RemoteViews, favourites)    BootReceiver (re-arm)    NFC read/write + share sheet
```

* **Coach & voice.** `feedback.js` (encouragement + gender/age personalisation, pure) and `coach.js`/`coachTips.js` (35 tips × 3 audience tiers × 2 languages, trigger rules, pure) feed `ui/runner.js`/`ui/coach.js`; `speech.js` wraps the device TTS (styles = pitch/rate presets).
* **Manual sync (website ↔ app).** The two keep separate IndexedDB stores; `share.js` packs a whole backup into a sync code (`MB1.`), `store.importBackup` merges (newest `updatedAt` wins, history unioned by id, settings whitelisted) or replaces. In the APK, `NativeBridge.saveFile` + `MainActivity` (CreateDocument / OpenDocument file chooser) do what the WebView cannot.
* **Family linking.** `link.js` (pure + WebCrypto: AES-GCM envelopes `ML1.<linkId>.<sealed>`, single-use invitations `MP1.`, replay window), `rewards.js` (goals, reports), `rtc.js` (serverless WebRTC: `iceServers: []`), `family.js` (state, message handling, live-channel registry), `transports.js` (Bluetooth channel from `BtLink.kt`), `ui/family.js` + `ui/incoming.js` (one router for anything that arrives: invitation / envelope / backup / template code). Envelopes are plain text, so NFC tags, the share sheet, Bluetooth, WebRTC and copy-paste are interchangeable carriers.
* **NFC tap.** `NfcApdu.kt` (pure framing, JVM-tested), `NfcOffer.kt` (the one text on offer, 60 s TTL), `NfcOfferService.kt` (HostApduService), `NfcReaderLink.kt` (reader mode, auto-off).
* **Android extras.** `BtLink.kt` (RFCOMM listen/connect, newline-framed), `RunWidget.kt` (RemoteViews + Chronometer, snapshot pushed by the runner), `RoutineWidget.kt` (favourites).
* **People & avatars.** `profiles.js` + `avatar.js` + `levels.js` + `badges.js` are pure; `store.js` keeps `profiles`, mirrors the ACTIVE profile into `settings.personName/age/gender/avatar/mascot` (so most code is unchanged) and exposes `myRuns()` / `runsForProfile()` - always use those, not `state.runs`, for anything personal. Legacy runs without `profileId` belong to the first profile. `ui/avatar.js` draws characters (SVG built from `characterShapes`), the picker and the switcher.
* **Schedule & gear** (`schedule.js`), **QR** (`qr.js` generator, `ui/qr.js` display/scan; native scan = Google code scanner).
* **No server.** Data: IndexedDB (`templates`, `runs`, `kv`). Sharing: self-contained code `M2.<base64url(deflate(json))>` via share sheet / link / NFC.
* **One codebase for UI.** The APK has no UI code of its own; Gradle packages `web/` as assets. Native adds only what browsers cannot: reliable alarms, widget, NFC from the app, vibration.
* **Time.** Run timing is derived from timestamps (`engine.js`), never from tick counts, so throttled/background timers cannot drift; the active run is persisted so it survives reloads.
* **Versioning.** `web/version.json` → PWA, service-worker cache name, APK `versionName/Code`.
* **Trust boundaries.** (1) Imported/shared/restored data → `sanitizeWire`/`normalizeTemplate`. (2) Web → Android → `NativeBridge` argument validation. (3) CSP + escaped DOM building.


## Helpers, journal and its lock (1.10)
- **Pure logic** (unit-tested): `focus.js` (areas → default helpers, per-person overrides win), `calm.js` (breathing phases), `sprints.js`, `mood.js`, `menu.js`, `lock.js`, `journal.js` (storage on top of `db.js`).
- **Per-person settings** live on the profile (`focus`, `tools`, `menu`, `redeemed`); `S.features()` is the single place that answers "is this helper on?". A parent sets them with the `focus` / `menu` link messages; everything received is sanitised (`sanitizeAreas`, `sanitizeTools`, `sanitizeMenu`, `Object.hasOwn`).
- **Journal lock design** (`lock.js`): password → PBKDF2-SHA256 (210k iterations, random salt) → AES-GCM key that wraps an RSA-OAEP private key; the public key stays in the clear so **adding** an entry never needs the password. Each entry/voice note is encrypted with a fresh AES-GCM key wrapped by the public key. The private key is stored a second time, wrapped by a key derived (PBKDF2 + separate salt) from the normalised **security-question answers** - that is the "forgot password" path. Answers are never stored. Failed attempts are throttled (3 free, then 30 s doubling, max 15 min; persisted). The unlocked key lives in memory only and is dropped when the app was hidden for a minute. Forgetting both means the data is gone by design; "Erase journal" is the escape. Limits: a local attacker with the unlocked device can brute-force offline at PBKDF2 speed - short passwords are weak; the journal is never part of backups/sync/links.
- **Voice**: `recorder.js` (MediaRecorder, 180 s cap, tracks always released) and `dictation.js` (Android `SpeechRecognizer` via `DictationLink`, or Web Speech API in browsers). Dictation is opt-in with a privacy notice; a recording is never uploaded by the app. On Android the recognizer and the recorder compete for the microphone, so in the app dictation and recording are separate actions; browsers can do both and show a suggested transcript.
- **Android**: `RECORD_AUDIO` is requested only on first use; `WebChromeClient.onPermissionRequest` grants audio capture to our own origin only (never video); shortcuts open allow-listed routes (`#/calm`, `#/journal`).

## Alarm chains and unplanned interruptions (1.10)
- **Alarms**: `wake.js` (pure) normalises a routine's alarm (first ring + up to 8 more with a gap each; sound/volume/text/voice per ring; `startMode` offer|auto) and flattens it for Android with `nativeRings` - every ring is an independent `setAlarmClock` entry (`<templateId>#<n>`, days shifted when a ring crosses midnight); only the last ring carries the start mode. `AlarmService` plays the chosen system sound (rising = volume ramp) and speaks the text with `TextToSpeech`; the notification/full-screen intent opens the app with `mode`+`text` extras and `ui/offer.js` shows the Start button or starts at once. Browsers use `reminders.js` + `audio.playRing` while the page is open.
- **Unplanned interruptions**: `engine.startInterruption/endInterruption` stop the task clock without counting a pause and push `{key,label,emoji,sec,at,task}` onto `run.unplanned` (sanitised in `sanitizeRun`). `unplanned.js` (pure) detects patterns per routine (>= 4 runs, >= 3 hits and >= 40% of the last 12) and builds the "add as task" change; "look closer" keeps a watch in `kv:watch` and writes an `insight` journal entry. Watches are device-local and not part of backups.

## Template library (1.10)
`library.js` (pure) defines entries (reusable task / routine; sanitised on load and on every backup import, photos only via `isSafePhoto`, caps 100 routines / 300 tasks), the built-in idea catalogue and merge/upsert rules. `store.js` keeps `state.library` in `kv:library`, exposes `saveToLibrary/updateLibraryItem/removeLibraryItem(undo)/createFromEntry`, and includes it in `exportAll`/`importBackup` (merge by id, replace mirrors). `ui/library.js` holds the pickers (big tiles) and the management page. The sample routines are the built-in routine templates (fixed ids).

## Goals, alarms screen, sand clock (1.11)
`cogfun.js` (pure) holds the strategy catalogue and goal logic (sanitise, progress from the linked routine's finished runs since the goal began, weekly check prompt); goals live on the profile (`goals`), a parent's suggestion arrives as the `cogGoal` link message (sanitised) and `sitwith` marks a parent as sitting with the child for 20 minutes. `ui/alarms.js` is the all-routines alarm screen (it reuses `alarmEditor` in a sheet on a copy of the template). The sand clock is an inline SVG updated in `paintLive`. `StatsWidget.kt` shows a bounded snapshot pushed through `native.setStats`.

## Task feelings, thoughts, reports and PDF (1.12)
`difficulty.js` (pure) aggregates the per-task `difficulty` (1-5) and `help` counters stored on each run task (clamped in `sanitizeRun`); `thoughts.js` holds the kind-thought and exercise libraries with age tiers and a no-repeat picker; `ui/taskHelp.js` is the card in the run. `report.js` (pure) builds one model for a run or a period; `ui/report.js` renders it (styles in `css/report.css` - the CSP forbids inline `<style>`), and `pdf.js` makes a real PDF without a library: the element is serialised into an SVG `foreignObject` image (the stylesheet text is embedded in that image), cut at section boundaries into A4 pages, JPEG-encoded and wrapped in a minimal PDF (valid xref, unit/e2e checked). Android: `NativeBridge.sharePdf` -> `MainActivity.sharePdf` writes the PDF (header-checked, size-capped) to the private cache and shares it through a read-only `FileProvider` content URI.

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
* **No server.** Data: IndexedDB (`templates`, `runs`, `kv`). Sharing: self-contained code `M2.<base64url(deflate(json))>` via share sheet / link / NFC.
* **One codebase for UI.** The APK has no UI code of its own; Gradle packages `web/` as assets. Native adds only what browsers cannot: reliable alarms, widget, NFC from the app, vibration.
* **Time.** Run timing is derived from timestamps (`engine.js`), never from tick counts, so throttled/background timers cannot drift; the active run is persisted so it survives reloads.
* **Versioning.** `web/version.json` → PWA, service-worker cache name, APK `versionName/Code`.
* **Trust boundaries.** (1) Imported/shared/restored data → `sanitizeWire`/`normalizeTemplate`. (2) Web → Android → `NativeBridge` argument validation. (3) CSP + escaped DOM building.

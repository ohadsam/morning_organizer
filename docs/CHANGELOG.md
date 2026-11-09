# Changelog

## 1.37.0
- **Calm weekly summary** (open item O5): `weeklyCalm.js` (pure) summarises the previous week (Sunday to Saturday): finished routines and days, stars, on-time runs, check-ins and the average face. Home shows it once per week (`mo.weekly.<profile>` = the week's Sunday) with Sunny proud; only kind words, a week with nothing is skipped; closed with "Thank you".
- **Backup reminder**: after 10 finished runs or 3 own routines, with no backup for 30 days (`mo.lastBackup`, set by every file / code backup) and not snoozed (14 days): Sunny with a bell and "Save a backup" / "Remind me later".
- Home shows one quiet card at a time (look-back cards first, then the weekly summary, then the backup reminder); Sunny looks tired on the paused-alarms banner.

## 1.36.0
- **Starter pack after choosing a method** (open item O5): `starterPack.js` (pure; 14 small routines, 3 to 5 steps each, English + Hebrew, none over 30 minutes) and `starterFor(view)` (the method first, then the help areas, at most three). When the needs sheet is saved the person is offered the set once per choice (`localStorage mo.starter.<profile>.<ids>`): ticked by default, added for that person only (`owners`), alarms off, no alarm sound. Unit tests on sizes, languages, order and entries; e2e with axe; the older needs steps now close the offer.
- **More Sunny placements**: the welcome sheet waves (`cameo-hello`), saving a feeling shows the thumbs-up (`check`), the end of a calm exercise shows `calm`, and the level-up card shows `proud`.

## 1.35.0
- **Sunny's cameos replace generic illustrations** (owner: she should be the guiding line): `mascot.json` has the twelve open-eyed cameos (`cameo-*`, from the refinement kit); `cameoNode` draws them, and `artNode` maps the empty-state ids (`empty-routines`, `empty-history`, `empty-goals`, `empty-journal` -> clipboard, `empty-alarms` -> bell, `offline`, `error`) to them, so every empty list / offline / error screen shows Sunny. Built by `CAMEO_SVG=<dir> node scripts/build-mascot.mjs <scenery kit>`. Zero axe violations in light / dark / big text.
- Fixed: the statistics screen said "finish a routine once to see statistics" twice when there were none.

## 1.34.2
- **Box breathing** from the Sunny refinement kit: a thin rounded frame (3.2 units, no fill) and a star (`#cue-box-star`) that `sunnyBreath` moves along the four sides by the phase (`index + progress` of the pattern, clockwise from the top-left corner). New rule `.cs [fill="none"] { fill: none !important }` so that a stroke-only shape with a colour class does not get filled by the class rule (this was the "heavy gold square" of the previous round: partly the kit, mostly the class rule).
- Reviewed, not used yet: the open-eyed cameos (real expressions and props now: usable for empty, error and success states later), the mood faces (clearer, but without Sunny's rays; the composed ones stay), the 16 bell frames.

## 1.34.1
- Took the corrected **4-7-8** scene of the Sunny visual-corrections kit (k7 stars, k1 air lines, larger strokes; the build script now strips an XML prolog). Reviewed and not adopted: the new **box** scene (a heavy gold square that hides Sunny), the bell frames (coloured now, but 16 almost identical frames), the imagery (smaller figures, teal skin: worse than the current scenes). The mood faces are clearer in the kit (raised brows, tears) but lose Sunny's rays and cheeks, so the faces composed from her own layers stay. The cameos are real props now (thumbs up, clipboard, plug, bell, medal) but Sunny's eyes stay closed in all of them: kept for a later round.

## 1.34.0
- **Layered breathing Sunny** (from the ChatGPT "Sunny animations v2" kit, stage 1): `calm-kit.json` has `sunny-breath-<pattern>` (slow, box, relax478, sigh): one picture with stable parts (`s-body`, `s-rays`, `s-glow`, `s-cheeks`, `s-mouth-in/out`, `s-air-in/out`, cues). `calmScene.sunnyBreath` moves the parts with the sine-eased breath, exactly by the kit's `HOOKS.md` table (body 0.90-1.03 x 0.88-1.06 and up 5 units, rays 0.92-1.10, glow 0.85-1.10 and opacity 0.25-0.7, cheeks, the two mouths and the air lines by phase); nothing is swapped or rebuilt. The simpler whole-figure version stays as the fallback.
- **Widget**: "Sunny breathes" uses the kit's 24 frames (Sunrise look, light and dark, four densities) at 250 ms, replacing the ten interim frames.
- Reviewed and NOT adopted from that kit: the mood faces (thinner and less readable than the ones composed from Sunny's own layers, which stay), the cameos (the same sleeping Sunny with a small icon in the corner, not real poses), the bell frames and imagery strips (their previews rendered black). The breath cues (box star, 4-7-8 stars, air lines) are drawn but faint.

## 1.33.0
- **Sunny breathes** (owner feedback: the calm corner's movement was not pleasant): new default "Sunny" in the breathing menu (`calmVisual: sunny`; one-time migration moves a stored "scene" to it): `data/mascot.json`'s calm-breathe mood scales with the exercise's `--p` (a little taller than wide, from her hill, a soft halo), driven by a sine-eased fullness every animation frame. The old scenes no longer swap pictures: `breathStage` builds the five frames once and only changes their opacity (no rebuilding, so no flicker).
- **"How do I feel" faces are Sunny** (owner request): five close-ups composed from her own layers (very sad with tears ... great with sparkles) in `mascot.json` (`feel-1..5`), used by the feel screen, the quick check-in and the journal mood row (`moodFace`). The mood widget uses the same faces (PNG, Sunrise look, light and dark).
- **Widget**: "Sunny breathes" has ten eased frames (squash and stretch) played ping-pong at 330 ms; a ViewFlipper cannot be smoother without many more frames - see the new prompt.
- **"Just what to do now" shows the neighbours**: a small "Before: X" (the last routine finished today) and "Next: Y" (the next one in order, `pickNow(...).after`).
- New prompt `docs/SUNNY_ANIMATION_PROMPT.md` for ChatGPT: layered parametric Sunny breathing with exact mappings and easings (4 patterns), 24 widget frames, Sunny mood faces, Sunny cameos to replace generic icons, and a fix list for the other animations.

## 1.32.1
- **One-step run view shows its neighbours** (owner request): a small line under the step name with "Before: X" (the last finished or skipped step, with a tick or a skip mark) and "Next: Y" (the next one still ahead); nothing shown when there is none. Only in the one-step view.

## 1.32.0
- **UX batch, first slice** (open item O5): **Home "just what to do now"** (`homeMode: now`, per person): the hero, the running routine, and ONE card from `pickNow` (nearest alarm from 90 minutes ago, else a routine of today not finished yet, favourites first, else any) with a big Start; "See everything" shows the usual Home until the next visit; no search, toolbar, suggestions or lists. **Run "one step at a time"** (`runView: single`, per person): CSS hides the checklist, the details line, pace, sprints and the gear card; the step, timer, buttons, leave line and the shorten card stay. Both are selects in Settings → Appearance.
- Still open from O5: "start for me" (a spoken start), a starter pack after choosing a method, weekly calm summary, density / clear-font settings, backup reminder, "who sees this" badge, interactive first-run tour, uniform undo.

## 1.31.0
- **Smart shortening when the leave-by time will be missed** (open item O3): `shorten.js` (pure) looks at the steps still ahead (never the one in progress), cuts each at most to half of its plan and never below a minute, prefers what the person usually needs for that step (median of their last runs, `buildHistory`), else a gentle 25 % cut, ignores savings under 30 s, offers at most four steps and says when it cannot cover the whole miss. The runner shows a card under the leave line ("You may be late by X. Shorten some steps?" with the list; "Shorten them" / "Not now" - asking again only when it is 3 minutes worse). Applying (`engine.shortenSteps`) records `run.shortened` (kept in the backup, sanitised); the summary shows "Shortened steps: N, X saved" and the routine's statistics note how often the person shortened. The late line is darker for contrast.
- Not yet: method-specific sounds for the leave time, and the card for other lateness (only the leave-by time triggers it).

## 1.30.0
- **Mood widget** (`MoodWidget`, 4x1): the kit's five faces (very sad ... great, with the repaired sad faces) on the Sunrise sky background, light and dark; each face opens the app on `#/feel/<1-5>` (allowed in `Shortcuts.ROUTES`), where that face is already chosen and the approach's question, note and voice tools wait. English + Hebrew labels and spoken descriptions. Verified by CI only.

## 1.29.1
- **Voice in "How do I feel"** (owner request): dictation (speech to text, same consent step as the journal) fills the private note; a recorded voice note (up to 90 s / 3 MB) is kept beside the entry on this device only (`audio` store, `feelings[].audio`), with a play button in the recent list, deleted with the entry or the person, never inside the therapist summary unless notes are switched on (then only a "(voice note attached)" marker). `ui/voiceNote.js` is the shared widget.
- **Asked inside a routine** (owner request): each routine has "Ask me how I feel: never / at the start / at the end / both" (`feelAt`) and each task "Ask how I feel after this task" (`feelAfter`). A calm, skippable card with five faces (`quickFeel`): at the start (under the title), after the chosen task, and on the summary (it replaces the older mood card when set). After a tap: "Tell more" (chip question + note + voice) or close; a low face offers the calm corner. Entries carry `moment`, `routine`, `task`; the screen says whether the face after routines is higher than before them (`momentStats`, needs three of each).
- **Easier to reach**: launcher shortcut "How do I feel" (and `#/feel/1..5` routes allowed for a future widget), in the Calm menu and the search.

## 1.29.0
- **"How do I feel?"** (open item O2): route `#/feel` (and `#/feel/1..5` with the face pre-chosen, for a widget). One tap on one of the five kit faces, then ONE question that follows the person's approach (`approachOf(view)`: the chosen method, else the first help area, else general; each has four chips: body / kind of thought / plan / outcome / focus / worry / organised / drive) and an optional private note (400 characters). A low face (1-2) offers a minute in the calm corner. Entries are kept per person on this device (`kv feelings`, max 800, in the backup, erased with the person).
- **Over time**: a 14-day bar strip (daily average), overall average, trend against the week before (needs three days in each half), the last seven entries with delete.
- **Summary for a therapist or a parent** (`summaryText`, pure): 2 or 4 weeks, plain text, with the chips and faces; private notes are OFF unless the person switches them on. Copy or share (native share sheet, Web Share, or clipboard).
- New feature id `feel` in the needs sets (every method and help area shows it); it sits first in the Calm toolbar menu and in global search.

## 1.28.0
- **Two calm widgets** (owner request): "Calm ball" (the five circle frames in a `ViewFlipper`, in and out, 1 s per frame) and the new "Sunny breathes" (`CalmSunnyWidget`, five frames of Sunny's calm-breathe mood rendered from `mascot.json` at 0.90 to 1.10 scale, light and dark, four densities). RemoteViews cannot animate by itself; a `ViewFlipper` with `autoStart` is allowed and only runs while the widget is on screen. A tap opens the calm corner.
- **"A good sentence" widget** (`SentenceWidget`, 4x1): when it is placed, `SentenceConfigActivity` asks for the approach (a mix, CBT, time / memory / planning, NLP, ADHD, anxiety, organising, motivation) and how often the sentence changes (1, 3, 6 or 24 hours). 56 sentences x English + Hebrew live in `values/sentences.xml` and `values-he/sentences.xml` (neutral Hebrew, no gender forms); `SentenceMath.index` picks the sentence from the clock and the widget id, so it needs no background service (the system refreshes every 30 minutes). Unit tests in `SentenceMathTest`. The widget follows the phone's language, not the app's.
- Verified by CI only (no device here).

## 1.27.0
- **Widgets in the new look** (from the ChatGPT widget kit, Sunrise look): every existing widget (routines, card, run, stats, calm) now has a drawn background (`wbg_*`, xhdpi + xxhdpi, `drawable-night-*` for dark), an `ImageView` behind the original layout; text colours unchanged (the kit measured >= 4.5 over the real pixels, worst 4.6). The calm widget shows the breathing circle (`wi_breath`) instead of the emoji.
- **New Journal widget** (`JournalWidget`, 2x1, opens `#/journal`; English + Hebrew strings). Kotlin / resources are verified by CI only (no device here).
- Not yet: widgets for mood check-in (needs the feeling check-in screen, O2), kind thought, points and the bell pulse; the per-look backgrounds (the widget cannot know the web look yet).

## 1.26.2
- **Locked avatar pieces explained** (owner question): the locks are intentional (pieces open with levels, levels come from stars, stars from finished routines). The studio shows a note on any tab that still has locked pieces ("Locked pieces open as you level up... You are level N. K more stars to level N+1"), and the celebration card after a level-up now says how many new avatar pieces opened (`partsUnlockedBetween`) with a button to the avatar picker, next to the characters that already unlocked. No pop-up during the day: the news arrives on the calm summary screen.

## 1.26.1
- **Sunny is the default avatar** (owner request: the fox / cat on the first screen): `data/mascot.json` (14 moods from the scenery kit, 50 KB, offline) drawn by `ui/mascot.js`; the animation or feeling picks the mood (`js/mascot.js`). Avatar kind `{k:'sunny'}`; she is in the picker as the first tile. One-time migration (`kv sunnyMig`): an untouched default fox (orange, never customised) becomes Sunny; any avatar the person chose stays. The old default mascot emoji 🦊 also maps to Sunny for new profiles.
- **The Hebrew date in letters**: "כ״ח בחשוון התשפ״ז" (gematria with the thousands left out, `gematria()` in `js/holidays.js`) instead of the platform's numbers; English unchanged.

## 1.26.0
- **Calm kit scenes** (from the ChatGPT calm-animation kit, repaired in three rounds): `data/calm-kit.json` (86 scenes, 150 KB, kept offline by the service worker) is read through the same strict SVG allow-list as the icons (`js/calmKit.js`, `js/ui/calmScene.js`); a scene that fails is dropped and the circle stays. Breathing: five frames per pattern cross-faded by the breath fullness (`phaseAt().size`); guided journeys: four storyboard frames over the steps; grounding: one scene per sense (5 to 1); body scan: nine zones over the parts of the quick or the full scan.
- **My avatar breathes**: a kit avatar (calm face, eyes closed) grows a little with `--p` from the exercise timer; people with an older character avatar get the scene. "What to look at" (Scene / My avatar / Circle) is a per-person setting, shown in the breathing menu.
- Skin in the grounding and body-scan scenes is `k8` (peach) and glows / progress dots `k3` (gold) - the supplied `k6` is coral red in the Sunrise look (build step in `scripts/build-calm-kit.mjs`).
- Calm hooks (`a-float`, `a-pulse`, `a-twinkle`, `a-drift`, `a-flow`, `a-rise`, `a-fade`, `a-wiggle`, `d1..d6`) are plain CSS, off with "calm animations" / reduced motion.

## 1.25.2
- **Colourful icons by default** (owner request): every kit icon keeps one hue from an accessible palette (3:1 on light and dark surfaces); Settings → Appearance → "Black & white icons" draws them in the text colour only. Kept per person; icons on primary / danger buttons and the active tab stay in the button's own colour.
- **Avatar studio wizard**: a new avatar starts step by step (Boy / Girl / Neutral starting point, then face, hair, eyes and mouth, clothes, extras, buddy, colours, name and save) with Back / Next and a progress bar; "Edit freely" switches to the old tabs and back. Existing avatars still open in free editing.
- **Button text no longer splits across lines**: dialog footers wrap whole buttons (the main action on its own row), the studio's action buttons are equal-width and the tab chips wrap instead of scrolling out of sight; the animation / feeling chips sit in a fold (wrapped, nothing cut at the edge). The text-fit sweep now walks every wizard step too.

## 1.25.1
- **Looking back is easier to find and to remember** (owner request): the run summary now shows a clear "Look back at this run" card (two quiet minutes) instead of one small button; Home shows a calm, dismissable "Looking back makes mornings easier" card once you have finished two routines (not together with the other look-back cards; "Not now" hides it for a week); the **Track** button on the bar carries a dot while a look-back is due; each routine's statistics has a "Look back at this routine" button; and search finds it by plain words ("what happened", "stuck", "lessons", "debrief"...).

## 1.25.0
- **Icon styles**: the bar on Home, its menus and the bottom tabs now use drawn icons (40 interface + 55 feature icons from the visual kit) instead of emoji. Each look draws them its own way - thin lines (Slate, Calm), soft two-tone (Classic, Ocean, Forest) or solid shapes (Sunset, Candy, Bold) - always in the text colour, so they follow light, dark and every look.
- **Icon style setting** (Settings → Appearance): follow the look (default), thin lines, soft two-tone or solid shapes - changes at once, kept per person.
- Safer loader: the strict SVG check now also reads attributes with digits (x1, y1...) that the icons use; the avatar parts keep their narrower list. The art set was refreshed with the corrected "playful" and "hyper-focus" faces.

## 1.24.1
- **Android adaptive icon**: the launcher icon is now an adaptive icon (sky gradient behind, the sun and rays in front inside the safe zone) with a one-colour version for themed icons (Android 13+); notifications (alarms, family messages) use a SonRise sunrise silhouette instead of a generic system icon. The web app's maskable icon is now a true full-bleed one.
- Tests: the schedule/gear step is pinned to a weekday (it failed on weekends), and the app icon keeps its accessible name.

## 1.24.0
- **New app icon**: the sunrise icon is redrawn (smoother sky, nine fine rays, a soft highlight on the sun, layered hills, a two-tone "SonRise" wordmark) for the web app (192 / 512 / maskable / Apple touch), the boot screen and the Android launcher.
- **Illustrations** from the corrected visual kit in the places that used to say "nothing here yet": no routines, no statistics, no goals, an empty journal, no alarms, and a scene in the welcome sheet. They are recoloured by the chosen look (all 8 looks, light and dark), so the artwork always matches the app.
- **Feeling faces** for the mood question after a routine (and wherever the mood row is used): five clearly different faces instead of emoji, still with their spoken names.
- Safety: the kit goes through the same strict SVG allow-list as the avatar parts (the narrower avatar list is unchanged), and anything that fails is left out; the data is cached for offline use.

## 1.23.1
- **Two new looks** from the visual kit's tokens: *Calm* (one muted hue family, low stimulation, for people overwhelmed by colour) and *Bold* (strong contrast, thicker focus ring and borders, for attention difficulties and low vision), in light and dark, axe-checked in Hebrew and English with big text.

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

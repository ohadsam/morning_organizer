# Roadmap - ideas not built yet

Status: 💡 idea · 🔬 needs a decision / research · ✅ built (see CHANGELOG)

## Attention and focus (ADHD-friendly, evidence-informed - not a medical treatment)
- ✅ (1.10, sprint dots + movement break) **Focus sprints inside a long task**: split a 25-minute task into 5 + 5 + 5 with tiny breaks, shown as segments on the ring.
- ✅ (1.10-1.11, quiet companion line + parent "Sit with me") **Body-double mode**: the avatar "works next to you" (quiet animation, optional soft tick) during a task; a parent can join over a live link.
- ✅ (1.10-1.11, ring / pie / bar / sand clock) **Visual timers**: shrinking pie / sand clock / filling bar as alternatives to the ring for children who are "time-blind".
- ✅ (1.10) **If-then plans** (implementation intentions): "If it is 7:00, then I put on my shoes", shown as a card before the routine.
- ✅ (1.10) **Transition warnings**: a 1-2 minute heads-up before a task ends, with a picture of what comes next.
- ✅ (1.10) **Distraction parking lot**: one tap during a run to park a thought ("remind me later") and see the list at the end.
- ✅ (1.10) **Choose-your-reward menu** and instant tiny rewards (extends stars / goals).
- ✅ Estimate-vs-actual feedback, calm mode, quick mode, task photos, spoken next task, checklists with gear.

## Mindfulness and CBT
- ✅ (1.10) **Calm corner**: a standalone 1-3 minute guided breathing / grounding screen (box, 4-7-8, physiological sigh) with an animated circle and optional voice, reachable from the home screen without starting a routine.
- ✅ (1.10) **Mood check-in** after a routine (one emoji) and a simple mood-vs-time chart ("mornings are smoother after a good night").
- ✅ (1.10, with optional password, voice notes and dictation) **Thought diary** for teens and adults (situation, thought, evidence, kinder thought) kept on the device.
- ✅ (1.10, sample routine) **Evening routine templates**: "3 good things", gratitude, tomorrow's gear.
- ✅ 61 coach tips, automatic tips when late / stuck, spoken tips, voices.

- ✅ (1.10) **Alarm chains** with per-ring sound/text/voice and offer-or-auto start; **unplanned interruptions** with pattern detection.
- ✅ (1.10) Interruption patterns in the parent report; snooze button on the alarm notification.

- ✅ (1.11) **Goal - Plan - Do - Check** (Cog-Fun-inspired self-help), **Alarms screen**, **What's new** sheet.
- 🔬 Parent view of a child's goal progress/check-ins; a parent-set weekly goal reminder.

- ✅ (1.12) Task difficulty + kind thoughts + relaxation, difficulty statistics, report/PDF/e-mail export.
- 💡 Selectable text in the PDF (needs an embedded font); scheduled weekly report reminder; per-task difficulty trends over time.

- ✅ (1.13) Smart times and smart extra steps by chosen help, estimate-accuracy (self-awareness), strategies-used per goal, parent guiding questions, interactive HTML report, alarms on by default, in-app What's new.
- 💡 Learn from rejected suggestions; per-child smart-time history for parents; more helper-step types.

- ✅ (1.14) **Retrospective** with applicable changes, before/after impact tracking, conclusions and reports.
- ✅ (1.15) Undo applied changes; guided / free / partial / several look-backs per run; focus and worked-vs-not views; follow-up card.
- 💡 Parent view of a child's look-backs; retrospective reminders by schedule.

- ✅ (1.16) Human-sounding voices: characters that pick matching installed voices, phrasing and pauses, wording styles.
- 🔬 Truly different accents / sector voices and offline neural voices would need bundled voice models (tens of MB per voice) or recordings - not built; a future optional download could add them.

- ✅ (1.18) SonRise rename + logo; unified toolbar; pause all alarms; Hebrew calendar + quiet holidays/vacations; ring types; alarm sticker; parent view of goals/look-backs; weekly check-ins; difficulty trends; learn from rejected suggestions; more helper steps.
- 🔬 Selectable text inside the PDF (needs an embedded Hebrew font; the interactive HTML report and Print already give selectable text).
- ✅ (1.18) Android: choose the **text-to-speech engine** (richer offline neural voices come from engines such as SherpaTTS / Hayai TTS, free and open source, which the app uses through the phone's standard TTS).
- 🔬 Voice research (Nov 2026): Hebrew neural voices exist (Piper "noa" - CC BY-NC-SA / CC BY depending on the source, Phonikud and notmax123 voices - CC BY-NC, Kokoro Hebrew - NC, MMS - NC) but need a G2P step (Phonikud/renikud), the Piper engine is GPL-3.0, and each model is ~20-60 MB. Kokoro-82M (Apache-2.0, ~80-160 MB, 54 voices) has no permissive Hebrew. Bundling is possible only for English; revisit when a commercially licensed Hebrew model appears.
- 🔬 A bundled neural voice: the only Hebrew models found (Piper "noa", MMS) are non-commercial and tens of MB; English-only permissive options (Piper, Kokoro, sherpa-onnx WASM) would not serve the Hebrew-first audience.

## Family
- ✅ (1.10) **Weekly parent digest** with plain-language insights ("shoes are the slowest step; try preparing them the night before").
- ✅ (1.10) **Shared reward menu** and "reward given" confirmation flow.
- 🔬 **Cloud sync** (private Gist or Drive) - deliberately postponed.

## Platform
- ✅ (1.10-1.11, calm corner + progress widget) **Calm corner and stats widgets** for Android.
- 🔬 Verification on real devices: Hebrew TTS, NFC tap, Bluetooth link, QR scanner, widgets, notifications.

## Open question
The request mentioned "קוגפאן" (cognitive training for attention). If a specific program or method was meant, tell us which one and we will map its ideas to the list above instead of guessing.

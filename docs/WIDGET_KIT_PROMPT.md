# Prompt for ChatGPT: Android widget kit (icons, backgrounds, frames, animations)

Send this in the SAME ChatGPT conversation as the scenery kit (so the look, k1..k8 colours, mascot Sunny and the allow-list are known), AFTER round 2 of the scenery kit is accepted.

````text
Now I need the visual assets for the Android home-screen widgets of SonRise. Same rules as before (the same SVG allow-list, classes k1..k8, i-ink, i-tint, i-bg, a-* hooks, one SVG per id, JSON + preview sheets + validator + honest report), plus the Android limits below.

## Android limits (important)
- Widgets are RemoteViews: NO animation, NO filters, NO CSS. So every widget asset is delivered twice: (a) the SVG with the usual hooks for the in-app preview, and (b) a STATIC export ready for Android: PNG at mdpi/hdpi/xhdpi/xxhdpi (or a VectorDrawable XML limited to path/group/gradient, android:pathData only, no clip-path tricks), in light and dark, for each look (sunrise, ocean, forest, sunset, candy, slate, calm-mono, bold-focus).
- "Animation" for widgets means FRAMES: give 4-6 frame PNGs per animated asset (e.g. breathing circle small -> large) that the app swaps with a handler, plus a one-line timing table (ms per frame). Keep each frame under 12 KB.
- Backgrounds must be 9-patch friendly: provide a rounded-rectangle background (22 dp corner) as a VectorDrawable shape with a subtle gradient, plus an optional decoration layer (sun, hills, stars) that sits behind text at <= 25% opacity. Text-safe zone: 70% centre.
- Sizes: the smallest widget cell is 110x110 dp; also deliver 2x1, 2x2, 4x1, 4x2 background variants where the aspect ratio needs a different composition (not stretched).
- Contrast of the widget text (i-ink) over the real background pixels must be >= 4.5 in light and dark; show the measured worst value per look.
- Icons: 48x48 dp artboard, drawn on a 24 grid, 2 px line weight equivalent, readable at 24 dp; provide `line` and `filled` (details knocked out with i-bg).

## Widgets and what each needs
1. Next routine (existing "RoutineCard"): a routine card background with a small sunrise horizon strip along the bottom; icons: play, pause, check; a mini progress ring (5 states); the mascot Sunny peeking from the corner (static, 3 moods: ready, busy, done).
2. Run (existing): big round "start" button graphic (sun disc with rays), pressed state; a running state with a ring progress.
3. Routines list (existing): list-row background, row divider, small status dots (todo, done, skipped) and a checkmark icon.
4. Stats (existing): a streak flame/sun badge, a week strip of 7 dots (done, missed, today, future states), a tiny rising-hills chart motif, level frame small version.
5. Calm (existing, now an emoji): replace the emoji with a drawn breathing circle in 5 frames (inhale to exhale), background of soft water ripples, a moon variant for night.
6. NEW Mood check-in: five faces in a row (very-sad, sad, ok, good, great) at 40 dp, each tappable, same style as the feeling faces of the visual kit, plus a "selected" ring and a "thanks" state with Sunny.
7. NEW Journal quick note: a notebook icon with a pencil, a "write" button graphic, a background of paper with a ribbon, a small leaf accent.
8. NEW Kind thought of the day: a speech-bubble card background with a heart, 6 small illustrations (sun, flower, hand, star, cloud, tree) that rotate by day, Sunny holding a note.
9. NEW Points / level: the level frame (reuse the avatar frame, small), a coin stack, a star burst, a progress bar with a small sun.
10. NEW Balance check / reminder for a task that is about to start: bell icon with a soft pulse in 4 frames and a "go" arrow.
11. Widget picker preview images (the image Android shows in the widget chooser) for each widget, 1:1 and 2:1, in light and dark, showing a realistic filled-in widget.

## Also needed for the widgets
- A one-page grid: all icons in a 6-column sheet at 24 dp and 48 dp, light and dark, labelled by id, with the 8 looks recoloured on a second sheet.
- Naming: ids `w-<widget>-<element>` (for example `w-mood-face-sad`, `w-calm-frame-3`), files `w_<widget>_<element>.svg` and Android resource names in lowercase snake_case without dashes.
- `widgets-manifest.json`: for each id: widget, element, state, sizes, whether animated (frame count and ms), which looks, light/dark, bytes, and the contrast number where text sits on it.

## Report honestly
Work in this order and show one labelled sheet after each step, then wait for "continue": (1) icons (line + filled) and the 8-look recolour sheet, (2) backgrounds and frames for all widget sizes with the text-safe zone and contrast table, (3) mood faces, week strip, ring states, (4) animation frames strips with the timing table, (5) picker previews and the manifest. Do not claim anything works unless the rendered sheet shows it.
````

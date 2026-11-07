# Prompt for ChatGPT: the SonRise mascot, backgrounds, frames and scenery (plus the last task-icon fixes)

Send this in the SAME ChatGPT conversation that produced the visual kit (so it keeps the style, the colour classes and the validators). Send me back the ZIP it produces.

````text
Thank you, the visual kit is now in use in the app (icons, illustrations, feeling faces, the app icon). Now I need the last big batch, in the same style and with the same rules as before (same SVG allow-list, the colour classes `k1`..`k8`, `i-ink`, `i-tint`, `i-bg`, the animation hooks `a-*` with stagger `d1`..`d6` and two-frame groups `f1`/`f2`, unique ids, CC0, gentle motion). Work in stages and wait for "continue" between stages: Stage 1 = the mascot, Stage 2 = backgrounds and patterns, Stage 3 = frames, dividers and ornaments, Stage 4 = splash and store graphics, Stage 5 = the final task-icon fixes and validation. Show me labelled preview sheets after every stage.

Additional allowed attribute for this batch ONLY: `preserveAspectRatio` (on the root svg). Everything else stays as before. `<pattern>`, `<use>` and `<image>` stay forbidden, so repeating patterns must be drawn as explicit repeated shapes inside one tile.

## STAGE 1 - A new mascot (the character on the home screen, in onboarding and in messages)
Today the home screen shows a generic cartoon fox/cat as the default buddy. Replace it with an ORIGINAL character that belongs to SonRise only: a small, friendly, round SUN who is just waking up and rising (the app's name is SonRise, "Son" sounds like "sun", and the logo is a sunrise). Working name "Sunny" (Hebrew "שמשי"); propose two other name ideas in he and en with one line of reasoning each, but draw it as Sunny.
Character brief: a soft round sun body in warm gold (k3 with a lighter k4 highlight), a face with big gentle eyes and a small happy mouth, rosy cheeks, short rounded rays that act like a little hair/halo (nine rays, slim, k2 warm orange), tiny rounded arms and hands (k3), no legs - it floats or sits on a small hill of k1/k5. Calm, kind, a little playful; never scary, never loud. Gender-neutral. Must stay readable at 48 px (avatar bubble) and look lovely at 256 px.
Draw it as layers on a 256x256 grid so I can animate it: `glow` (soft halo), `rays` (own group, a-spin slow or a-twinkle), `body`, `cheeks`, `eyes` (variants), `brows` (variants), `mouth` (variants), `arms` (variants), `hill` (ground), `accessory` (variants), `effects` (variants). Provide, as JSON like the avatar pack (`variants` map of SVG strings, ids lowercase-with-dashes, names in en + he, a `hooks` list per layer):
- eyes: open, closed (blink and sleep), happy (arcs), wide, sleepy, look_left, look_right, sparkle, sad.
- mouth: smile, big, neutral, sad, surprised, hmm, flat (sleep), cheer, worried, proud, yawn, kiss.
- brows: neutral, raised, worried, sad, soft-angry.
- arms (one drawing per pose, hands in k3): rest, wave_a, wave_b, cheer (both up), dance_a, dance_b, think (hand at chin), alert (hands up), hug, thumbs-up, hold-heart, point-up.
- accessory: none, sleep-cap (with a small pom-pom), sunglasses, party-hat, scarf, headphones, graduation-cap, flower-crown, rain-umbrella, tiny-crown.
- effects (two frames each): sparkles, hearts, music-notes, zzz, exclamation, question, thought-bubble, stars, sweat-drop, confetti, tears-of-joy, breath-circles.
- Moods (named combinations of the above, with a one-line description in he and en): idle, wake-up (yawn + stretch), wave, cheer, dance, sleep, alert, think, encourage (thumbs-up), proud, calm-breathe (closed eyes, breath circles that a-pulse), sad-comfort (hug), celebrate (confetti + cheer), reminder (point-up + exclamation).
- ANIMATIONS (stills + hooks; I drive them with CSS): `mascot-rise` (a 5-frame intro: the sun slowly rises over the hill, then its face appears and it waves - it is the start-up/loading animation, groups with a-rise, d1..d5), `mascot-idle` (gentle float a-float, slow blink f1/f2, rays a-twinkle), `mascot-wave` (arms wave_a/wave_b f1/f2), `mascot-cheer` (a-bounce + confetti), `mascot-sleep` (a-float slow + zzz), `mascot-breathe` (body a-pulse slow, matching the 4-4-6 breathing guide).
- A 48 px "bubble" version (simplified: fewer rays, bigger eyes) and a monochrome silhouette for notifications.
- Colour the whole mascot only with k1..k8 so every look recolours it (calm-mono and bold-focus must still read as a sun).

## STAGE 2 - Backgrounds and patterns (full-bleed SVGs, calm, low contrast so text on top stays readable)
All are drawn with k1..k8 and fixed soft white/black overlays (fill-opacity 0.04-0.2), must keep a text-safe zone (the middle 60% of the height is calm and flat enough for body text), and each has a `portrait` version (`viewBox="0 0 390 844"`, `preserveAspectRatio="xMidYMid slice"`) and a `wide` version (`viewBox="0 0 844 390"`). Each must look good in light AND dark token sets. Ids and what I need:
1. Time-of-day scenes for the Home header and the run screen: `bg-dawn`, `bg-morning`, `bg-noon`, `bg-afternoon`, `bg-dusk`, `bg-night` (soft hills, sky, sun/moon, a few stars/clouds; the sun in `bg-dawn` is just rising).
2. `bg-home-hero` (a wide soft banner, 390x180, for the home greeting card: a sunrise over rolling hills with a little room on the right for the mascot).
3. Method moods for the run screen: `bg-calm` (CBT/anxiety: slow waves and clouds), `bg-focus` (ADHD: very simple, one soft horizon, nothing busy), `bg-play` (kids / Cog-Fun: gentle confetti dots and rounded hills), `bg-thinking` (NLP: soft layered paths and a small star), `bg-sensory-calm` (single hue, almost flat, for sensitive users).
4. Screens: `bg-welcome`, `bg-settings` (very quiet), `bg-stats` (soft chart-like hills), `bg-journal` (paper-like, quiet), `bg-calm-corner` (deep, soothing), `bg-celebration` (podium stage: soft light rays from above and a floor), `bg-offline`, `bg-error`.
5. Seamless-looking patterns (one 256x256 tile drawn as explicit shapes, designed so that placing tiles side by side looks continuous): `pat-dots`, `pat-waves`, `pat-rays`, `pat-clouds`, `pat-stars`, `pat-leaves`, `pat-paper`, `pat-grid-soft` (all at 6-10% contrast).
6. Seasonal and holiday accents as small optional overlays (390x200, transparent background, decorative, respectful and generic - no religious symbols of any one faith; use nature and light): `acc-spring-blossoms`, `acc-summer-sun`, `acc-autumn-leaves`, `acc-winter-snow`, `acc-rain`, `acc-festive-lights` (small warm lights and sparkles).

## STAGE 3 - Frames, dividers and ornaments (transparent backgrounds, drawn with k1..k8 / i-ink, nine-slice friendly)
1. Avatar frames (circle, 256 grid, the avatar sits in the middle 80%): `frame-avatar-1` ... `frame-avatar-14` that grow with the person's level (a thin ring at level 1, with small rays growing around it, a full golden sunburst crown at level 14), each clearly different at 48 px; plus `frame-avatar-photo`, `frame-avatar-gif`.
2. Card and sheet frames: `frame-card-soft`, `frame-card-sun` (small sun in a corner), `frame-card-leaf`, `frame-card-dots`, `frame-card-clouds` (thin decorative borders: draw only the corners and edges so the middle stays transparent; provide corner pieces `corner-tl`, `corner-tr` that I can mirror).
3. Photo / badge frames: `frame-photo-polaroid`, `frame-photo-round`, `frame-badge-ring-bronze`, `-silver`, `-gold` (tint-friendly).
4. Dividers (a horizontal line decoration, 390x24, centred): `div-wave`, `div-rays`, `div-dots`, `div-sunrise` (a tiny sun in the middle), `div-leaves`, `div-stars`.
5. Ornaments for headers and empty corners (128 grid): `orn-sun-corner`, `orn-cloud-pair`, `orn-star-trio`, `orn-leaf-branch`, `orn-heart-small`, `orn-sparkle-line`, `orn-ribbon` (a ribbon banner for titles, with room for text; no text drawn).
6. Progress decorations: `prog-sun-track` (a track along which a small sun slides from left to right, 340x40, five stages), `prog-ring-sun` (a ring with rays that fill as progress grows, five stages), `prog-steps-hills` (five little hills lighting up).
7. Loading skeleton shapes (calm, no flashing): `skel-card`, `skel-line`, `skel-avatar`.

## STAGE 4 - Splash and store graphics
1. `splash-portrait` (390x844) and `splash-wide` (844x390): the mascot rising over the hill with the wordmark underneath (English `SonRise`; also a Hebrew version `סאנרייז`, with the correct non-final nun), light and dark token sets; with the animation hooks (mascot-rise sequence).
2. PNG files rendered by you (cairosvg or similar) for the Android and web launch/store use: `play-feature-graphic-1024x500.png`, `play-icon-512.png` (the existing app icon is fine), `social-1200x630.png` with the mascot, 5 phone-frame mockup backgrounds `store-bg-1`...`store-bg-5` (1080x1920, soft sunrise gradients with space for a screenshot and a headline) in the sunrise pack.
3. Android adaptive icon alternative using the mascot: `ic_launcher_foreground_mascot.png` (432x432, the mascot only, central 66% safe zone) so I can offer it as an alternative.

## STAGE 5 - Final fixes to the existing kit (change ONLY these, keep all other ids byte-identical)
1. TASK ICONS: your validator still lists near-identical silhouette pairs. Redraw ONE icon of each of the top 30 pairs so that its OUTER SHAPE is clearly different, and list the ids. Update `drawing_plan.md`.
2. `tasks/body-scan` uses the attribute `stroke-dasharray`, which is not allowed: redraw it without it.
3. Hebrew wordmark spelling: use `סאנרייז` (regular nun, not final nun in the middle) in `brand.lockup_he` and `brand.wordmark_he`; keep the two-tone treatment.
4. ACHIEVEMENT BADGES: `streak-3`, `streak-7`, `streak-30` (flames) must differ clearly in size and number of flames and show the numeral as drawn shapes inside; `early-bird`, `calm-master`, `steady-week`, `comeback` must be readable at 32 px (bigger emblem, simpler shapes).
5. Add the 8 pack colour sets (`k` for light and dark) and a one-line `mood` for the new mascot and the backgrounds if any pack needs a different tint (e.g. `calm-mono` and `bold-focus` backgrounds must be flatter / higher contrast than the others).

## Format of the new file
`sonrise-scenery-kit.json` (UTF-8), alongside the updated `sonrise-visual-kit.json`:
{ "format": "sonrise-scenery-kit", "version": 1,
  "mascot": { "name": {"en": "...", "he": "..."}, "alt_names": [...], "layers": { "<layer>": { "<variant>": "<svg>" } }, "moods": { "<id>": { "name": {...}, "layers": { "eyes": "open", ... }, "hooks": [...] } }, "animations": { "<id>": { "frames": ["<svg>", ...] or "svg": "<svg>", "loop": true, "ms": 2400, "hooks": [...] } }, "bubble": "<svg>", "silhouette": "<svg>" },
  "backgrounds": { "<id>": { "name": {...}, "portrait": "<svg>", "wide": "<svg>", "textSafe": true } },
  "patterns": { "<id>": { "name": {...}, "tile": 256, "svg": "<svg>" } },
  "accents": { "<id>": { "name": {...}, "svg": "<svg>" } },
  "frames": { "<id>": { "name": {...}, "kind": "avatar|card|photo|badge", "svg": "<svg>" } },
  "dividers": { ... }, "ornaments": { ... }, "progress": { "<id>": { "name": {...}, "stages": ["<svg>", ...] } }, "skeletons": { ... },
  "splash": { "portrait": "<svg>", "wide": "<svg>", "portrait_he": "<svg>", "wide_he": "<svg>" } }
Names in en + he (short, gender-neutral Hebrew). Also deliver `app-icons/` and `store/` PNGs, the generator script, the validator output (zero errors, zero exact duplicates), the preview sheets, `drawing_plan.md` / `README.md`, and `FINAL-AUDIT.json` with honest numbers.

## Checks to run and show me
1. The same strict validator as before (allow-list + `preserveAspectRatio`), size limits (mascot layers <= 4 KB each, backgrounds <= 14 KB, frames <= 8 KB, splash <= 20 KB, whole kit <= 3 MB), unique ids, en + he names, every id above present.
2. A contrast check: text colour of each pack's tokens over the middle of each background (sampled from a render) must keep at least 4.5:1 in light and dark; print the numbers.
3. Render sheets: the mascot in every mood at 256 px and the bubble at 48 px; all moods in 3 packs light and dark; every background portrait and wide with a mock text block over it; patterns tiled 3x3 to prove seamlessness; frames around a sample avatar at 48 px; dividers and ornaments on light and dark; progress stages; splash.
4. Report honestly what does not meet the brief.

Start Stage 1 now.
````

## Notes for the developer
- The mascot replaces the fox as the default buddy (new avatar kind), appears in the home hero, the welcome sheet, coach messages and the start-up animation; backgrounds are inline SVG layers behind screens; frames wrap avatars by level; patterns and dividers decorate headers; the Android and store PNGs go to `android/` and the store listing.
- Backgrounds and patterns will be recoloured through the `--k1..--k8` CSS variables of the chosen look and stop animating under "Calm animations".

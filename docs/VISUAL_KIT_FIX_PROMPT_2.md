# Follow-up prompt for ChatGPT: visual kit, round 3 (final defects)

Send this in the SAME ChatGPT conversation as the previous rounds. Round 2 (`sonrise-visual-kit-repackaged-2026-11-07.zip`) fixed the duplicates and improved a lot: tasks are now recognisable, the awards are six different drawings, the feature icons have three real variants, per-pack backgrounds differ. These are the defects that remain after I rendered every SVG myself.

````text
Thank you, round 2 is a real improvement (no exact duplicates, recognisable task objects, distinct awards and feature icons). I rendered every SVG myself in a browser, applying each pack's k1..k8 and ink colours the way the app will. These defects remain. Fix ONLY these, keep everything else byte-identical (same ids, same JSON structure), and re-run all validators.

## 1. App icon and logo defects (blocking)
1. A purple horizontal line runs straight through the wordmark "SonRise" in `app-icons/pwa/icon-512.png`, `maskable-512.png`, `icon-192.png`, every `app-icon-<pack>.svg`, the Android mipmaps and `brand.mark`/lockups (about 85% down the icon, through the letters). Remove it. The wordmark must be clean.
2. `ic_launcher_foreground.png` (adaptive) is the WHOLE rounded app icon shrunk inside a white square. It must be only the mark (sun, rays, horizon, and the wordmark if it fits) on a transparent background inside the central 66% safe zone of the 432x432 canvas. `ic_launcher_background.png` is a plain sky gradient only. `ic_launcher_monochrome.png` is a single-colour silhouette of the same mark.
3. `brand.outline` renders as a solid dark rounded square with no visible outline; `brand.mono` is only a half disc on a black square. Redraw: outline = the mark as line art; mono = the full mark (sun, rays, horizon) in one colour with `i-ink`.
4. All eight `brand.per_pack` logos use hard-coded hex colours, so they look identical in every pack (only bold-focus has slightly different rays). Draw them with the k1..k8 classes so each pack recolours its own logo, and apply the treatments from my previous message (ocean sea line, forest tree line, candy thick outline, slate flat, calm-mono one hue, bold-focus thick rays).
5. Keep the visual identity of the CURRENT production icon as the master of the `sunrise` pack, because it is better than the new mark: a deep-indigo to purple vertical sky that warms to a thin orange-pink glow just above the horizon; a golden sun half-risen with a soft radial highlight; NINE slim cream-gold rays fanned evenly above the sun (not 5 fat rays); a dark navy ground with a thin golden horizon line; the wordmark "SonRise" in a rounded bold sans-serif, "Son" in cream and "Rise" in warm gold, centred on the ground. Re-derive the other packs from this layout.

## 2. Feelings: several faces show the wrong emotion (important: children will use these to say how they feel)
- `feel-very-sad` and `feel-sad` look ANGRY (brows slant down toward the nose, flat grim mouth). Sad = inner ends of the brows raised, eyes slightly downcast, mouth corners turned down; very-sad adds big tears.
- `feel-lonely` and `nlp-overwhelmed`: a cloud covers the face. Keep the face visible; add the cloud or an empty chair beside or above it.
- `feel-frustrated`, `nlp-stuck`: a stitched or zipped mouth looks scary. Replace with a clenched, wavy mouth and a small steam puff.
- `feel-calm`: a leaf covers half the face; `nlp-steady` same. Keep the face fully visible, add the leaf as a small corner cue.
- `adhd-hyper-focus`: a solid dark disc with no features. Draw a face or figure with a tunnel or tight-focus cue.
- `nlp-playful` and `adhd-drifting`: the face is hidden behind a shape. Keep faces visible.
Rule: every face must be readable at 32 px with eyes and mouth visible and the emotion unambiguous. After redrawing, render all feelings in one row at 32 px and read them back to me in a table: id, what you see (eyes / brows / mouth), is it the right emotion.

## 3. Illustrations: still abstract, two are nearly empty
`offline` is two small dashes, `error` is a single arc; `empty-routines`, `empty-history`, `empty-goals`, `empty-journal`, `empty-alarms`, `welcome-1` ... `welcome-5`, `celebrate-*` and the six `calm-scene-*` are a single abstract shape on a circle. They are not understandable as scenes. Draw each as the scene described in my previous message (a main subject filling at least 40% of the canvas, a ground, 2-3 small details, at least 8 distinct shapes, at least 1.5 KB of SVG): for example offline = a friendly cloud with an unplugged cable and a small plug beside it; error = a smiling confused robot with a question mark; empty-routines = a sleepy sun peeking over hills beside a blank checklist; calm-scene-sea = layered waves with a moon and soft reflections.

## 4. Feature icons: the `filled` variant is unreadable
In the `filled` variant most feature icons collapse into a solid dark blob (routines, new-routine, wizard, calm-corner, track, alarms, goals, journal, quick-note, thought-parking, situation-log...). A filled icon must keep its inner details as knocked-out shapes. Add one new class `i-bg` (the app sets it to the pack's surface colour) and use it for the details cut out of filled shapes; also allow the attributes `fill-rule` and `clip-rule` (I will add them to my allow-list). The `line` and `duotone` variants are fine, do not change them.

## 5. Badges
`podium-second` and `podium-third` are two tiny orange blocks with a dot; make them real podium steps (a step with a 2 or 3 drawn as shapes, a small figure or medal on top) like `podium-first`. `star-empty` renders as a dark filled star: it must be an outline star (and star-half half filled, star-full filled gold).

## 6. Task icons
Your own validator reports 67 near-identical silhouette pairs among the 140 task icons. Take the 40 pairs with the highest overlap and redraw ONE icon of each pair so that its OUTER SHAPE differs (not just the inner detail); update `drawing_plan.md` and list the ids you changed. A few currently weak drawings to improve at the same time: `deodorant`, `nails`, `hair`, `vitamins`, `reframe`, `rehearsal`, `draw`, `instrument`, `ask-for-help`, `open-window`, `wash-hands-again`.

## 7. Animated assets: hooks
Across the 26 assets the hooks `a-spin`, `a-orbit` and `a-bounce` are unused or used once. Give every animated asset at least two hooks and use `a-spin` (loading-sun rays, level-up), `a-orbit` (sparkles, guided-imagery-stars), `a-bounce` (balloons-rise, thumbs-up, confetti-burst) where they fit; `breathing-sun` needs the inner ring as a separate `a-pulse` group delayed with `d2`.

## 8. Report honestly
Re-run the uniqueness, silhouette-similarity and validator checks, re-render the labelled sheets (tasks, feelings at 32 px, badges, features line/duotone/filled, art, animations' first frames, the 8 logos recoloured per pack, the adaptive icon cut into a circle and a squircle), and update `FINAL-AUDIT.json` and README with the real numbers. Do not claim a requirement is met unless the rendered sheet shows it. Work in this order and show me the sheet after each step: 1 logo and icons, 2 feelings, 3 badges and features, 4 illustrations, 5 task silhouettes and animation hooks. Wait for "continue".
````

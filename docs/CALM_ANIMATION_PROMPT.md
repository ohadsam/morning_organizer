# Prompt for ChatGPT: animated breathing, guided imagery and calm-exercise scenes

Send this in the SAME conversation as the previous kits (same SVG allow-list, k1..k8 colour classes, i-ink / i-tint / i-bg, animation hooks, one SVG per id, JSON + preview sheets + validator + honest report).

Answer to "was this already requested?": only partly. The earlier prompts asked for ONE generic `breathing-sun` animation, six `calm-scene-*` stills and the mascot mood `calm-breathe`. Nothing was made per exercise, nothing for the user's own avatar breathing, and nothing for the ten guided imageries, the grounding exercise, the body scan or the NLP exercises. That is what this prompt asks for.

````text
I need animated scenes that make every calm exercise of SonRise feel personal and easy to follow. The audience is children and adults with ADHD and anxiety: everything must be soft, slow, low-contrast-motion, never flashing, never scary, and understandable without text. Colours only through k1..k8 / i-ink / i-tint / i-bg so every one of the eight looks recolours it. Every scene must look complete as a STILL (people with "calm animations" on, or reduced motion, see the still of a chosen frame).

## How the app drives an animation (important)
I do not use SMIL, JS inside the SVG, filters or inline styles. Two kinds of motion, both done by my CSS on class hooks:
A. PHASE-DRIVEN (breathing): I set one CSS variable `--p` from 0 (empty lungs, smallest) to 1 (full lungs, biggest) on the <svg> every frame from the exercise timer, and a `data-phase` attribute with `in`, `hold-full`, `out`, `hold-empty`. Provide these hooks and tell me exactly what each does, using only transform / opacity (no new attributes):
 `b-scale` (grows with --p, from 0.82 to 1.12), `b-lift` (rises with --p, up to 6 units), `b-open` (opacity from 0.35 to 1), `b-glow` (a soft halo that grows), `b-fill` (a bar or level that fills), `b-orbit` (a dot that travels along the box outline; I give you the 4 corner positions per phase through data-phase).
B. TIME-DRIVEN (imagery): the existing `a-float`, `a-pulse`, `a-twinkle`, `a-wiggle`, `a-spin` (very slow), `a-drift` (new: slow horizontal drift left-right), `a-flow` (new: slow repeated movement along a path, for water and leaves), `a-rise` (new: slow upward drift with fade), and delays `d1..d6`. Each scene uses at least three different hooks and nothing faster than a 4 s cycle.

## 1. The person breathes (the main request)
Make the breathing exercise show a PERSON, so the child can copy it:
1. `breath-avatar-*` for MY AVATAR KIT (the layered paper-doll avatar I already use: slots body, outfit, arms, head, eyes, brows, mouth, cheeks, hair, accessory, effects, backdrop). Do NOT redraw the avatar. Give me NEW OPTION VARIANTS that the existing avatar parts can be switched to, and a new `breath` state definition, in the same JSON format as `avatar-pack.json`:
 - arms: `breath-low` (hands resting on the lap or belly) and `breath-high` (arms slightly lifted and open),
 - body/outfit: a `breath-in` variant where the chest and shoulders are about 4% bigger and 1.5 units higher, and a `breath-out` variant relaxed (so I can cross-fade between the two with `--p`),
 - eyes: `soft-closed` (gentle curved lines) in addition to the existing `closed`,
 - mouth: `breath-in` (tiny closed smile) and `breath-out` (tiny round "o" like blowing a candle),
 - cheeks: `blush` stays; brows: `soft` stays,
 - effects: `air-in` (three thin curved lines moving toward the nose), `air-out` (three thin lines moving away from the mouth), `belly-hand` (a small glowing ring on the belly).
 Every variant must work for every body shape, skin colour, outfit and hair of the existing 283 parts (they are drawn on the same 256 grid and only use the --c-* variables). Describe which existing slot each one replaces.
2. `breath-mascot-*`: the same for Sunny (the mascot): body rises and falls, rays grow and shrink with `b-scale`, a soft halo `b-glow`, eyes closed, mouth `o` on out.
3. `breath-person-neutral`: a simple seated person (a child, side view and front view, cross-legged, hand on the belly) in k-colours for people who have no avatar yet: layers `b-lift` (chest and shoulders), `b-scale` (belly), `b-open` (air lines).
Show each of these on one sheet at 3 sizes (48, 96, 192 px) in the "in" and "out" states side by side, in the eight looks.

## 2. One scene per breathing pattern (the app has four)
All are PHASE-DRIVEN and each shows the rhythm with an object, not only a circle:
- `slow` (4 in / 6 out): a sun that rises over a hill on the in-breath and sinks gently on the out-breath, the sky warms and cools (`b-lift`, `b-glow`, `b-open`).
- `box` (4-4-4-4): a calm square window with a small boat or star that travels along its four sides, one side per phase (`b-orbit`), the centre shows the person icon breathing.
- `relax478` (4 in, 7 hold, 8 out): a moon with stars; stars appear one by one while you hold (use `b-open` with `d1..d6`), and a long wave goes out on the out-breath.
- `sigh` (two short in, one long out): a balloon that inflates in two steps and then slowly releases, with small air lines.
Each: 256 grid, at least 8 shapes, 2 KB or more, with the `--p` mapping documented in a table (hook -> property -> range). Provide 5 key still frames (p = 0, 0.25, 0.5, 0.75, 1) as separate ids `breath-<pattern>-0 ... -4` so I can verify the mapping on a sheet.

## 3. Guided imagery (ten exercises)
One animated scene per exercise, ids `imagery-<id>`: elements (four small panels: earth, air, water, fire, only calm images, no flames: use a candle), safeplace (a small cozy house or a hammock by the water), beach (waves, sand, a shell, a gull far away), forest (path, tall trees, light rays, a small fox), mountain (a big steady mountain, clouds drifting, a small figure sitting tall), leaves (a stream with leaves floating along it), balloon (a person letting a balloon go up: the worry balloon with a small cloud face), container (an open box with a lid and small worry clouds drifting in, lid closing in the last frame), light (a warm soft light above a seated person, glowing downward through the body in 3 frames), cloud (a person on a fluffy cloud floating over hills), helper (a kind animal or a friendly figure walking toward you along a path). TIME-DRIVEN, using the hooks above, at least 12 shapes each, 3 KB or more, each recognisable at 128 px WITHOUT reading the title. The person in each is the neutral seated person (or my avatar: leave a clear empty "avatar spot" group with id `avatar-slot` that I can fill with the user's avatar, 64 units wide).
Also give each a 4-frame storyboard strip (`imagery-<id>-f1..f4`) that follows the text of the exercise: start, middle, end, and a "calm final" frame.

## 4. Grounding 5-4-3-2-1
`grounding-5` ... `grounding-1`: five scenes, each one sense: 5 = five eyes or five coloured dots to see, 4 = four hands touching (soft textures), 3 = three ears with sound waves, 2 = two noses with a flower and bread, 1 = a tongue with a small berry or a sweet. As the count goes down the previous items stay faint in a row at the top, so the child sees the progress. Plus `grounding-done` (a calm smile and a tick). Time-driven with `a-twinkle`, `a-float`.

## 5. Body scan
`bodyscan-0` ... `bodyscan-8`: a seated child figure (neutral, or the `avatar-slot`) in front view with ONE zone softly glowing per step: feet, legs, belly, chest, hands and arms, shoulders, neck and face, head, whole body. Each zone is a separate group with class `zone` and `data-zone` so I can highlight by changing the step; the glow uses `b-glow` / `a-pulse`. Also `bodyscan-whole` with all zones faintly visible.

## 6. NLP exercises (six, still images with a little motion)
`nlp-outcome` (a path to a flag with a sun), `nlp-reframe` (a picture frame swapping a grey cloud for a sunny view: two states a/b, `a-fade` between), `nlp-anchor` (an anchor with a soft circle and the hand pressing the thumb and finger together), `nlp-clarify` (a magnifier over speech bubbles), `nlp-perspectives` (three chairs: me, the other, a watcher, each with a different colour), `nlp-rehearse` (a small stage with a curtain and a figure in the middle, a clapperboard). Same rules: complete as a still, calm, k-colours.

## 7. Visual guidelines (the same as the app)
- Friendly, rounded, flat shapes; maximum 8 colours via k1..k8; stroke weights 2 on the 24 grid or 3 on the 256 grid; the main subject fills at least 45% of the canvas; one clear focal point; soft low-contrast backgrounds that keep text readable.
- No faces that look scared, sad or angry; no red; no sharp spikes; no dark scenes except the moon one (dark but cozy).
- Hebrew and English never appear inside the SVG (no text).
- Motion: only ease-in-out, nothing faster than a 4 s cycle, never a flash, and the still must carry the meaning.
- Each id must also have a 1-line alt text in Hebrew and English (what a screen reader says).

## 8. Report honestly
Same ZIP structure plus `calm-animations.json` (id, kind phase-driven/time-driven, hooks used, bytes, frames, alt he/en) and a `HOOKS.md` table that maps every hook to the exact CSS transform and range. Show me one labelled sheet per step and wait for "continue": (1) person breathing in/out at 3 sizes in the eight looks, (2) the four pattern scenes at the five p-frames, (3) the ten imagery scenes with storyboards, (4) grounding + body scan, (5) NLP scenes. Do not claim anything works unless the rendered sheet shows it, and list every id with its byte size.
````

# Prompt for ChatGPT: Sunny as the guide - a smooth breathing animation, mood faces, and the other animations to fix

Send this in the SAME conversation as the previous kits (same SVG allow-list, k1..k8 classes, i-ink / i-tint / i-bg, `a-*` hooks, one SVG per id, JSON + preview sheets + validator + honest report).

````text
SonRise has one character that walks with the person through the app: SUNNY (שמשי), the little sun rising over a hill. From now on she is the guiding line of the whole visual language: wherever the app shows a person's feeling, a calm moment, a success, an empty state, a reminder, it should be Sunny doing it, not a random icon. I tested the first version of the calm animations on a phone and the owner said: the movement is NOT pleasant for the eye, it is not smooth, and it does not look like a good animation at all. Please redo it properly. The most important thing is how it LOOKS: soft, rounded, slow, calming, in line with the app (children and adults with ADHD and anxiety: nothing sharp, nothing fast, nothing that flashes, no scary faces).

## 1. What was wrong (measured on the phone)
- The breathing scenes were five still pictures cross-faded: the eye sees "layers fading", not a body moving. Shapes do not travel, they dissolve.
- The widget "breathing" was five frames swapped once a second: it jumps.
- The motion was linear (in and out at constant speed), which looks mechanical.
- Sunny herself did not breathe: only a circle did.

## 2. Sunny breathes (the main request)
Make Sunny DO the breathing exercise, so a child can copy her:
- On the in-breath she takes in air: her whole body swells softly (a little taller than wide, like a balloon that fills from the bottom), the rays reach out a little longer, the cheeks puff slightly, the glow around her grows, and she rises a few units off the hill. Eyes closed (soft curved lines), a tiny closed smile, a very small "sniff" cue (two thin air curves moving toward her).
- On the hold (box and 4-7-8 patterns) she stays full, with a tiny calm tremble of the glow only (never the body).
- On the out-breath she lets the air out slowly: the mouth becomes a small round "o" (blowing out a candle), the air lines move away from the mouth, the body slowly sinks back with ROUND, soft motion: a gentle ease-out, a tiny overshoot below the starting size and a slow settle back to the starting size (like a balloon letting go), the rays shorten, the glow shrinks. It must look like one continuous, organic movement, never like steps.
Deliver Sunny as LAYERED parametric parts so my code can animate them smoothly (I will NOT swap pictures; I move parts with CSS transforms and opacity, driven by one number):
- Separate groups with fixed ids and classes: `s-glow`, `s-rays` (nine rays as one group, each ray a separate child so I can stagger them), `s-body`, `s-cheeks`, `s-eyes-closed`, `s-mouth-in` (closed smile), `s-mouth-out` (small round o), `s-air-in`, `s-air-out`, `s-hill`, `s-arms` (hands resting on the belly).
- Declare for each group its transform-origin (in the 256 grid) and the exact mapping from `p` (0 = empty lungs, 1 = full lungs) to scale / translate / opacity, in a table in `HOOKS.md`. Use only transform and opacity. Example of what I need: body scaleX 0.90 -> 1.03, scaleY 0.88 -> 1.06, origin (128,224); rays scale 0.92 -> 1.10 from the centre of the sun; glow opacity 0.25 -> 0.8 and scale 0.85 -> 1.1; mouth-in opacity 1 -> 0 at p=0.15..0.4 and mouth-out the opposite on the out-breath (I will give you `data-phase` = in | hold-full | out | hold-empty).
- Give me the recommended easing in numbers (for example cubic-bezier for the in-breath and for the out-breath, including the small overshoot) so that I can reproduce it exactly.
- Also give one FLOWING reference: a single self-contained SVG with SMIL OR CSS keyframes (for your preview only, not for the app) that loops one slow breath (4 s in, 6 s out) so I can see the intended motion on your sheet. Render 12 frames of it at equal time steps and show them in a strip, so I can verify the movement is continuous.
Variants: `sunny-breath-*` for the four patterns the app has: slow (4 in, 6 out), box (4-4-4-4), relax478 (4-7-8), sigh (two short in, one long out). The body language is the same; what changes is the cue: slow = the sun rises and falls on the hill; box = a small star travelling along four sides of a rounded square around her, one side per phase; 4-7-8 = stars appear while she holds, and one long wave of air goes out; sigh = two small sniffs and one long soft sigh.

## 3. The same for the home-screen widget (Android, RemoteViews)
RemoteViews cannot animate by itself. I use a ViewFlipper that swaps PNG frames, so smoothness comes from MANY small frames with the easing baked in:
- `w-calm-sunny-1 ... w-calm-sunny-24`: 24 frames of one slow breath (about 6 s per cycle at 250 ms per frame), the easing baked in (including the small overshoot), 64 dp artboard, transparent background, readable at 48 dp. Each PNG under 6 KB at xxhdpi.
- All eight looks, light and dark, four densities (mdpi, hdpi, xhdpi, xxhdpi), named `w_calm_sunny_<n>.png`.
- A frame-strip sheet with the 24 frames in order, to check that no frame jumps (difference between neighbouring frames is small and always the same direction).
- `ANIMATION-TIMING.md`: ms per frame, the order (ping-pong or full loop), and the frame budget.
- A second widget variant "calm ball" (a soft ball with a face-less glow) with the same 24-frame smoothness.

## 4. Mood faces drawn by Sunny (for "How do I feel?")
The five faces of the "How do I feel" screen, the quick check-in inside a routine and the mood widget are currently emoji-like faces. Replace them by SUNNY showing the feeling, so the character the child knows is the one who feels with them:
- `sunny-feel-1` very sad (droopy rays, a big tear on each cheek, brows raised in the middle, a small trembling mouth, the glow dim), `sunny-feel-2` sad (rays slightly drooping, brows raised in the middle, a small downturned mouth, no tears), `sunny-feel-3` okay (rays level, calm flat mouth), `sunny-feel-4` good (rays up, a soft smile, rosy cheeks), `sunny-feel-5` great (rays wide and bright, a big open smile, sparkle eyes or happy-closed eyes, a few sparkles).
- IMPORTANT: sad must NOT look angry (the brows' inner ends are RAISED, never slanted down toward the nose). Every face must be unmistakable at 32 px and at 48 dp, with eyes and mouth visible, and recognisable without colour.
- Deliver them as: (a) layered SVG (close-up of the sun, no hill) in the 256 grid with the same group ids as above so I can animate a small bounce on selection, (b) static PNGs for the widget: `w_sunny_feel_<1-5>.png` for eight looks, light and dark, four densities, (c) a "selected" variant of each (a soft ring), (d) a sheet with the five faces at 32 px and 48 dp in the eight looks, and read each back to me in a table: id, eyes / brows / mouth / rays, the emotion, does it read correctly.
- Also `sunny-feel-thanks` (a small heart and a wave) for after the answer is saved.

## 5. Sunny as the guide everywhere (replace random icons)
Make a small set of Sunny "cameos", each a layered SVG with Sunny's own parts, so I can use her instead of generic icons: `sunny-check` (thumbs up, for success), `sunny-empty` (looks at an empty checklist), `sunny-error` (a worried but kind face, a plug and a cloud), `sunny-offline`, `sunny-loading` (the mascot-rise animation as a smooth looping sunrise, 5 s), `sunny-reminder` (rings a tiny bell, the bell swings softly), `sunny-calm` (sits and breathes), `sunny-tired` (yawns), `sunny-proud` (a small medal), `sunny-think` (a thought bubble), `sunny-hello` (waves, for the first screen), `sunny-goodbye` (waves, soft). Same rules: rounded, calm, 8 colours max via k-classes, complete as a still, a clear focal point, no text.

## 6. Other animations in the app that must be fixed the same way
I tested each of these and they are not smooth or not pleasant. For each, say what you changed and show a 12-frame strip:
1. The guided-imagery scenes (11): the `a-float` and `a-pulse` hooks move whole groups with a visible stop at each end of the cycle. Make the cycles longer (10 to 14 s), use sine-like easing and make the motion small and layered (clouds drift, water flows, leaves sway), never a group that bobs as a block.
2. The five-frame breathing stills `breath-<pattern>-0..4` : replace them by the layered parametric versions from section 2 (keep the old ids working).
3. The bell pulse of the "balance" widget (4 frames): make it 16 smooth frames (a soft swing that decays), not a tilt and a jump.
4. The mascot moods (14) switch instantly when the animation changes: give me the "in-between" rule: a 300 ms cross-fade of eyes / mouth only, with the body continuing to move, and say which parts must NOT fade (the body).
5. The celebration effects (confetti, sparkles, hearts, stars) and the success check: make the particles drift on soft arcs with gentle easing, never linear straight lines, and a maximum of 12 particles, no flashing (nothing may change brightness more than twice per second).
6. The progress ring and the points rise: easing for filling (ease-out), and a tiny settle at the end.
7. The "welcome" and "empty" illustrations: add one slow, quiet life-sign each (a blink, a drifting cloud, a swaying leaf), 8 s cycle or longer.

## 7. Rules for ALL motion
- Slow and soft: nothing faster than 3 s per cycle except one-shot reactions under 600 ms; every movement has ease-in and ease-out; nothing linear.
- Nothing flashes; no strong contrast changes; low-contrast backgrounds; no sudden appearance (everything fades or grows).
- Respect "calm animations" / reduced motion: every animated asset must look complete as a still (I show the frame you name as `still-frame`).
- Colours only via k1..k8 / i-ink / i-tint / i-bg so every one of the eight looks recolours it. No text inside any SVG.
- Each asset gets a one-line alt text in Hebrew and English.

## 8. Report honestly
Same ZIP structure plus `calm-animations-v2.json` (id, kind, groups, hooks, frames, ms, bytes, alt he/en), `HOOKS.md` with the exact mapping tables and easings, and the rendered sheets. Show me one sheet per step and WAIT for "continue": (1) Sunny breathing: a 12-frame strip of one full breath for each of the four patterns, (2) the 24 widget frames with the neighbour-difference check, (3) the five Sunny mood faces at 32 px and 48 dp in the eight looks with the read-back table, (4) the cameos, (5) the other animations, before and after. Do not claim anything is fixed unless the strip shows continuous motion.
````

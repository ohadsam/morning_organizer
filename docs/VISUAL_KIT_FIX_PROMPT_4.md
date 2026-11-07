# Follow-up prompt for ChatGPT: visual kit, round 5 (last polish)

Send this in the SAME ChatGPT conversation as the previous rounds. Round 4 fixed the adaptive icon, the outline logo, the stars, the tired face and 11 filled icons. These are the last defects found when I rendered every SVG myself.

````text
Thank you, round 4 is much better: the adaptive icon layers, the maskable icon, brand.outline, the stars and feel-tired are fixed and I am already using them. This is the last polish round. Change ONLY the items below, keep every other id byte-identical, re-run all validators and re-render the sheets.

## 1. Task icons: near-identical outer shapes
Your own validator lists pairs whose silhouettes overlap more than 92%. Redraw ONE icon of each of the top 30 pairs so that its OUTER SHAPE (the silhouette, not just the inner detail) is clearly different. Known pairs: journal / check-schedule (0.948), coffee / drink-water (0.939), check-schedule / turn-off-screen (0.934), heart / practice-skill (0.932), email / wallet (0.929), tea / coffee (0.928), tea / drink-water (0.925). Suggested silhouettes: drink-water = a tall glass or a bottle with a cap; coffee = a mug with a handle and a steam curl; tea = a teapot or a cup with a tag; email = an envelope with the flap open; wallet = a folded wallet with a clasp and a coin; check-schedule = a clipboard with a clock; journal = a closed notebook with a ribbon; turn-off-screen = a monitor with a power symbol; practice-skill = a person with a star above. Update `drawing_plan.md` for every id you redraw and list the ids.

## 2. Filled feature icons that still collapse into blobs
Render all 55 feature icons in the `filled` variant at 24 px and fix every one where the inner detail is lost or the icon is just a rounded square or a disc. Please check at least: routines, new-routine, track, looking-back, journal, situation-log, send-to-child, share-routines, gratitude, parent-view, kids-view, skins, language, privacy, vacation, listen, smart-steps, family. Keep the silhouette of the `line` version and cut the details out with `i-bg`. Do not change the `line` and `duotone` variants.

## 3. Achievement badges are still hard to tell apart at 32 px
Make the emblem inside each of the 24 achievement badges larger (fill at least 55% of the disc) and unmistakable, with a clearly different silhouette: explorer = a compass rose with a needle, reframer = a picture frame with a small sun in it, anchor-keeper = a bold anchor, point-collector = a stack of three coins, avatar-artist = a palette with a small face, calm-master = a lotus flower, helper = two hands handing over a heart, voice-user = a microphone with sound arcs, planner = a calendar with a tick, reflector = a mirror with a sparkle, steady-week = seven dots in a row with the last one filled, comeback = a circular arrow with a sunrise, family-team = three figures of different heights, all-methods = a flower with four different petals, on-time-hero = a clock with a cape, kind-thinker = a heart inside a speech bubble. Re-render the 24 at 32 px in one row and read each back to me.

## 4. Two feelings
`nlp-playful`: a clearly playful face (a wink and a tongue out, a small spiral or confetti). `adhd-hyper-focus`: wide fixed eyes looking forward inside two or three tunnel rings (concentric arcs), calm, not scary. Keep the other faces.

## 5. Hebrew logo
`brand.lockup_he` and `brand.wordmark_he` are still in the old simple style and the Hebrew letters have jagged artefacts (the letter samekh and the final tsadi have cut edges). Redraw the Hebrew lockup with the same treatment as the English one (deep sky gradient, nine slim rays, soft highlight on the sun, layered hills, the wordmark in two tones with the first syllable in cream and the second in warm gold: סאן + רייז), using a clean rounded bold Hebrew letterform outlined to smooth paths. Keep the English files unchanged.

## 6. App icons per pack
`app-icons/pwa/app-icon-<pack>.svg` for the eight packs: show me a single sheet with all eight side by side on a light and on a dark background, plus each one at 48 px, so I can verify they are distinguishable and legible. If two packs look the same at 48 px, change the horizon or ray treatment of one of them.

## 7. Report honestly
Return the same ZIP structure with the updated JSON, validator output (zero exact duplicates, the silhouette count), README and `FINAL-AUDIT.json` with the real numbers, the list of every changed id, and the rendered sheets. Do not claim anything is fixed unless the rendered sheet shows it. Work in this order and show me the sheet after each step: 1+4, then 2+3, then 5+6. Wait for "continue".
````

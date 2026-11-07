# Follow-up prompt for ChatGPT: visual kit, round 4 (what is left)

Send in the SAME conversation. Round 3 (`sonrise-stage5-corrected.zip`) fixed most of the earlier problems and the app now uses the illustrations, the feeling faces, the colour sets and the new app icon. These are the defects left; fix only these and keep everything else byte-identical.

````text
Thank you, round 3 is close: the app icon, the 21 illustrations, the feeling faces, the 140 task icons and the three-variant feature icons are good, and I am already using several of them. I rendered every SVG again; these defects remain.

1. ADAPTIVE ICON LAYERS (blocking for Android): `ic_launcher_foreground.png` shows scattered ray fragments and a dark horizon bar drawn THROUGH the sun; `ic_launcher_monochrome.png` has the same artefacts. Redraw both from the clean master (sun with a soft highlight, nine slim rays, horizon line) so they are exactly the app icon's mark without its rounded square and without the wordmark text: foreground = mark only, transparent background, everything inside the central 66% (264 px of 432); monochrome = one colour silhouette of the same mark. Keep `ic_launcher_background.png`. Also provide a true full-bleed `maskable-512.png` (the square sky and ground gradient edge to edge, mark and wordmark inside the central 80% circle) instead of a copy of icon-512.
2. `brand.outline` is a solid dark rounded square with nothing visible: draw it as the mark in line art (sun arc, rays, horizon) using `i-ink`.
3. FILLED feature icons: in the `filled` variant of wizard, calm-corner, points, goals, alarm-pause, whats-new, voice-commands, avatar-studio, backup, notifications, quiet-days the inner details are lost (a plain disc or blob). Keep the shape recognisable with knocked-out details in `i-bg`.
4. BADGES: star-empty must be an OUTLINE star (transparent inside), star-half half filled, star-full filled; at the moment all three render as dark filled stars. Check that `achievement` badges are visually distinct at 32 px (explorer, reframer, anchor-keeper, point-collector, avatar-artist are still very abstract).
5. FEELINGS: `feel-tired` has spiral eyes (reads as dizzy), `nlp-playful` and `adhd-hyper-focus` are hard to read. Re-draw those three; keep every other face.
6. TASK ICONS: your validator still reports the near-identical silhouette list; take the 30 pairs with the highest overlap and change the OUTER SHAPE of one icon of each pair; list the ids.
7. Add `a-spin` to the rays of `loading-sun`, an inner `a-pulse` ring (class d2) to `breathing-sun`, and make every animated asset carry at least two different hooks.
8. Send the same ZIP structure, updated validator output and README, and tell me honestly what still does not meet the brief.
````

# What is waiting for ChatGPT

1. Part A: the scenery kit, round 3 (frames, dividers, progress, patterns, backgrounds) - this is the only blocking item: the app waits for it to place backgrounds, avatar frames and decorations.
2. Part B: two small optional Sunny additions (a smooth loading sunrise, and the mood faces with her rays).

Send part A in the same conversation as the scenery kit; part B afterwards.

---

# Follow-up prompt for ChatGPT: scenery kit, round 3 (last items)

Send this in the SAME conversation as `sonrise-scenery-repair-stages2-5.zip`.

````text
Thank you: the seven task icons, the two-tone Hebrew logo, the seasonal accents, the ornaments and the skeletons are good and I will use them. I rendered every other scenery SVG myself. Change ONLY these items, keep every other id byte-identical, re-render the sheets and report real numbers.

## 1. Avatar frames are almost invisible
`frame-avatar-1` ... `frame-avatar-14` and `frame-avatar-photo/gif` render as a plain circle with a few tiny dots at the edge. A frame is a ring BORDER around the avatar with a transparent centre (inner 70% empty): level 1 a simple solid ring 6 units wide, then each level adds something visible at 48 px: double ring, notched ring, dots, rays, leaves, stars, laurel, wings, crown at the top, sparkles. Level 14 must look clearly richer than level 7. Use at least 8 shapes from level 5 up, ring width at least 5% of the diameter, k-colours only. Same for `frame-badge-ring-bronze/silver/gold` (a clear metal-like ring, not a filled disc) and `frame-card-*` (a visible thin border with corner decorations that differ per id: soft, sun, leaf, dots, clouds; today all five look the same).

## 2. Dividers are too small
`div-rays`, `div-sun` render as a single dot; `div-wave`, `div-hills`, `div-leaves`, `div-dots` are short and thin. Make each 600x40 and filled across the whole width: a repeating motif along the line with a bigger centre ornament (rays = a sun with fan rays in the middle and thin lines to both sides; sun = a half sun on a line; wave = three layers of waves; hills = layered hills across the width). Show them 300 px wide on the sheet.

## 3. Progress
`prog-sun-track-0..4` show only the sun dot; the track itself is missing. Draw a rounded track (full width, 10 units high) with the filled part in k-colour and the sun on its end. `prog-ring-sun-*` are good. `prog-steps-hills-*` are good.

## 4. Patterns
`pat-rays` and `pat-leaves` are almost blank: make the motifs 2x larger and at 25% opacity. The others are fine.

## 5. Backgrounds
Better, but still very pale: most look like one lavender wash with a band at the top and the bottom. Keep the quiet text-safe centre, but make the top and bottom scenery 30% more saturated and larger (the dawn sun, morning birds, noon clouds, dusk silhouettes, night stars and moon should be unmistakable at 150 px wide). bg-dawn, bg-dusk and bg-night currently look the same as bg-noon: each needs its own sky gradient (dawn: deep blue to pink at the horizon; dusk: orange to purple; night: dark blue with 20 stars). Keep contrast >= 4.5 on the real pixels and report the table again.

## 6. Report
Show one sheet per step (frames over a sample avatar at 48 px and 96 px, dividers at 300 px, progress, patterns, backgrounds portrait+wide) and wait for "continue". Do not claim anything is fixed unless the sheet shows it.
````


---

# Part B (optional, send after part A is accepted): small Sunny additions

````text
Two small things for Sunny, in the same style as the rest (same allow-list, k1..k8, no text, complete as a still):

1. `sunny-loading`: a smooth looping sunrise for loading states, 5 seconds: the sun rises over the hill, rays reach out one by one, a soft glow, then it settles and repeats without a jump (the first and last frame must match). Layered parts with stable ids like the breathing Sunny (`s-body`, `s-rays`, `s-glow`, `s-hill`), a table of how each part moves over time `u` (0..1) with easing in numbers, and 24 PNG frames of the Sunrise look, light and dark, four densities (mdpi..xxhdpi) under 6 KB each at xxhdpi, named `w_sunny_loading_<n>.png`.
2. `sunny-feel-1 ... sunny-feel-5` (the mood faces): keep your latest design (large eyes and mouth, tears for very sad, raised inner brows for sad) but ADD Sunny's own nine rays around each face and her rosy cheeks (k2), with the rays drooping for 1 and 2, level for 3, up for 4 and wide and bright for 5, and a soft glow. Same ids, same sizes, readable at 32 px and 48 dp. Show the five at 32 px and 48 dp in the eight looks and read each one back to me: eyes / brows / mouth / rays, the emotion, does it read correctly.
````

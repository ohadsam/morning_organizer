# Follow-up prompt for ChatGPT: scenery kit, round 2 (corrections)

Send this in the SAME ChatGPT conversation as the scenery kit (`sonrise-scenery-stage5-final-audit.zip`). I rendered every SVG myself.

````text
Thank you. The mascot (Sunny / שמשי), its moods and animations and the splash/store graphics are good and I will use them as they are (keep them byte-identical). I rendered every other SVG in a browser with each look's k1..k8 colours. These parts are not usable yet. Change ONLY the items below, keep every other id byte-identical, re-run all validators, re-render labelled sheets, and report real numbers.

## 0. A measurement problem first
`contrast-results.json` gives exactly the same number (11.47) for all 20 backgrounds of a look. That means you measured the text colour against a flat colour, not against the artwork. Re-measure properly: render each background at 360x640 and 640x360, sample the central "text-safe" zone (the middle 70% x 60%) and report the WORST contrast of `i-ink` text over the real pixels, per look, light and dark. Every value must be >= 4.5. Fix backgrounds that fail.

## 1. Backgrounds: all 20 look the same
Each `bg-*` is about 850 bytes: a flat lavender with a tiny sun and a cloud. They must be real, different scenes. Requirements for EVERY background: at least 2.5 KB, at least 10 shapes, at least 3 depth layers (far / middle / near), a gradient sky using only k-classes, and the centre 70% x 60% kept quiet (low detail, low contrast) so text stays readable. Specific scenes:
- bg-dawn: deep sky warming to the horizon, last stars, thin sun glow, distant hills.  bg-morning: bright sky, low sun, long soft rays, layered hills, a few birds.  bg-noon: high sun, small clouds, wide meadow.  bg-afternoon: warm light, long shadows, trees.  bg-dusk: orange to purple sky, sun touching the horizon, silhouetted hills.  bg-night: dark sky, moon, 20 stars, soft hills.
- bg-home-hero: the home header: sun rising between two hills with the left 40% quiet for the greeting.
- Method moods: bg-calm (water ripples, moon reflection), bg-focus (soft tunnel of concentric arcs, very quiet), bg-play (confetti, balloons, bright), bg-thinking (clouds with a small thought bubble), bg-sensory-calm (slow big gradient blobs, no detail).
- Screens: bg-welcome, bg-settings (soft gears and sparkles, very quiet), bg-stats (rising hills like a chart), bg-journal (paper texture, a pencil, a leaf), bg-calm-corner (a cozy corner with a cushion, lamp, plant), bg-celebration (confetti and stars), bg-offline (cloud with an unplugged cable, calm), bg-error (a friendly lost robot, soft).
Give each in portrait (360x640) and wide (640x360), different compositions, not just a crop.

## 2. Patterns and seasonal accents are almost blank
Most `pattern-*` and `accent-*` render nearly empty. A pattern is a seamless tile (state the tile size) with at least 6 visible motifs at 15-30% opacity of one k-colour: stars, dots, waves, leaves, clouds, tiny suns, hearts, geometric. Provide at least 8 patterns that look clearly different. Each seasonal accent (spring, summer, autumn, winter, Passover, Rosh Hashana, Hanukkah, Purim, Sukkot, Shavuot, birthday) is a corner decoration (300x300) that fills at least 40% of its box with at least 8 shapes, recognisable at a glance (blossoms, sun and ice-cream, falling leaves, snowflakes, matza and wine cup, apple and honey, menorah, mask and noise-maker, sukkah, wheat and flowers, balloons and cake). Use NO real-world religious figures; objects only.

## 3. Frames are solid fills
The 14 level avatar frames and the card/photo/badge frames render as solid shapes that cover the avatar. A frame must be a RING or BORDER with a fully transparent centre (use fill-rule evenodd or only strokes; the inner 70% of an avatar frame must be empty), so the avatar stays visible. Show each frame over a sample avatar on the sheet. Levels must be visibly more special (level 1 simple ring, level 14 laurel + stars + sparkle) and each at least 1.5 KB. Card, photo and badge frames: thin, elegant, 9-slice friendly: tell me the 9-slice insets.

## 4. Dividers, ornaments, progress, skeletons
- Dividers are too small to see. Make them 600x40, each with a clear central motif (sun, wave, vine, stars, dots, hills) and thin tails, at least 8 different ones.
- Progress decorations: a ring progress with 0/25/50/75/100% states as separate ids, a linear track with a small sun that moves along it (position via a documented group), and a sun that rises over a hill in 5 steps.
- Skeleton loaders: 6 shapes (card, list row, avatar+text, chart, paragraph, grid) as light shimmering blocks using `a-*` hooks.
- Ornaments (corner flourish, sparkle cluster, leaf sprig, cloud, star): bigger, filled, readable at 64 px.

## 5. Attribute allow-list
You used `stroke-opacity`, which my allow-list does not have. Use `opacity` on the element or a lighter k-colour instead. No other new attributes.

## 6. The task-icon silhouettes (from round 5)
Only 6 of the top 30 pairs were redrawn. The rest, still over 92% overlapping, are listed in my last audit: redraw ONE icon of each remaining pair (17) so the OUTER shape differs, update `drawing_plan.md` and list the ids. Also: verify the Hebrew wordmark spells סאנרייז (not סאן רייז with a space and not a different vowel letter) in `brand.lockup_he` and `brand.wordmark_he`, and show the glyph outlines large to prove there are no jagged cuts.

## 7. Report honestly
Same ZIP structure. Show me, in this order, one sheet after each step and wait for "continue": (1) backgrounds (portrait and wide, with the text-safe zone outlined, and the real contrast table), (2) patterns and accents, (3) frames over a sample avatar, (4) dividers/progress/skeletons/ornaments, (5) task silhouettes + Hebrew logo. Do not claim anything is fixed unless the rendered sheet shows it. Update FINAL-AUDIT.json and the README with the real numbers and the list of changed ids.
````

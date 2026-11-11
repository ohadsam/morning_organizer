# Prompt for ChatGPT: fixes after the unified package (stages 1-4)

Send this in the SAME conversation as `SonRise_Unified_Stages1-4_20261111.zip`.

````text
Thank you. I rendered the whole package myself (Sunrise look, light and dark) and ran my own allow-list check. What is good: the bell widget pictures (`wi-bell-0..2`, `wi-bell-off`), the logo marks, the unlocked streak/first-* medals mostly, and the widget cards `wbg-*` (I will use them later). Five things must change. Change ONLY these ids; keep every other id byte-identical.

## 1. The 14 backgrounds: the contrast was "fixed" with a solid block
In every `bg-*` file the LAST element is an opaque rectangle, for example `<rect x="42.8" y="111.2" width="274.4" height="417.6" class="k4" opacity="1.000"/>`. It covers about 75% of the width and 65% of the height with a flat lavender panel with sharp corners, so the scene is cut into a frame (the sun in `bg-home-hero`, the lake in `bg-calm`, the gears in `bg-settings` are sliced). That is not what I asked for. Remove that block from every background and keep the scene itself in the whole picture:
- The text-safe centre must stay readable by design: soft, low-contrast shapes only (big gentle hills, a plain wash, a few faint dots), NO opaque panel, no flat rectangle, no hard edge. A radial fade (a few concentric, slightly transparent ellipses in the wash colour, each larger and fainter) is fine to calm the centre.
- Keep the bolder scenery outside the centre (top band and bottom third), and the "hero" shape of each scene.
- Contrast: measure `i-ink` text over the real centre pixels in the eight looks, light and dark, both sizes, AFTER removing the block, and show the table. Every value 4.5 or more; if a scene fails, calm that scene's centre, do not add a panel. Do not copy the contrast table of the previous package: it was measured with the block in place.
- Also: your files use `stroke="var(--k5)"` on lines. My allow-list rejects `var(...)` in attributes (28 of 28 backgrounds failed it). Use `stroke` ONLY with a class: draw those lines as thin filled shapes (a `<path>`/`<rect>` with a k-class), not as strokes.
- Show the 14 portrait and 14 wide in Sunrise light, dark and Calm Mono. Wait for "continue".

## 2. `wi-balance-0..4` does not look like a balance
It is a loose orange triangle, a dot and a leaf: nothing reads as a scale. Draw a clear seesaw / balance scale: a small triangle pivot in the middle, a long beam that tilts (far left down at 0, level at 2, far right down at 4), a round pan or small cup at each end. A tiny sun on the left pan and a leaf on the right pan. 96x96, transparent background, the same rounded Sunny style as the bell. The five frames must differ only by the tilt, the pivot fixed.

## 3. Badges: some have no symbol
`first-lookback` (unlocked) is a plain yellow disc with nothing on it; the locked `level-2-locked`, `level-8-locked`, `first-lookback-locked` and `streak-14-locked` have an empty or faint symbol while the others have a clear one. Every badge, locked or not, needs its symbol: locked = the same symbol in `i-tint`, clearly visible (at least as strong as the star on `level-1-locked`). `first-lookback`: an open book with a small sun. Show all 28 at 72 px and 32 px, light and dark.

## 4. Task silhouettes: all look like the same man with a tiny prop
Keep the single-ink style, but give each task a clear, readable pose and a bigger prop, so that a child tells them apart at 32 px: wake-up (sitting up in bed with arms stretched), wash-face (leaning over a basin with water drops), brush-teeth (a big toothbrush at the mouth), get-dressed (pulling a shirt over the head), breakfast (at a table with a bowl and spoon), pack-bag (a big backpack open beside the figure), shoes-coat (one foot up with a shoe, a coat on a hook), leave-house (a door ajar and the figure stepping out), homework (at a desk with a book and pencil), tidy-up (a box and a toy), shower (water lines from above), pyjamas (a long shirt and a small moon), read (sitting with an open book), go-to-sleep (lying in bed under a blanket with a small moon). Show them at 32 px and 64 px, light and dark.

## 5. Report
`CHANGED-IDS.txt`, `AUDIT.json` with the real numbers (and the allow-list result you get for `stroke="var(...)"`, which must now be zero), and the sheets. Say clearly what you could not do. Do not claim anything is fixed unless the sheet shows it.
````

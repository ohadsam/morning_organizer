# Follow-up prompt for ChatGPT: Android widget kit, round 2 (fixes)

Send this in the SAME conversation as the four widget zips.

````text
Thank you: I received all four parts and merged them (181 SVG ids, no existing file changed, 800 contrast tests with a clear method). The icons, the breathing frames, the progress rings, the mood-thanks Sunny, the points coins, the stats hills chart and the streak badge are good and I will use them as they are. I rendered everything myself. Change ONLY these items, keep every other id byte-identical, regenerate the PNG exports for the changed ids only, and list the changed ids.

## 1. Mood faces
`w-mood-face-very-sad` and `w-mood-face-sad` are almost the same face. Sad: inner brow ends raised, small downturned mouth. Very sad: the same plus two big tears running down the cheeks and a wobbly mouth. `w-mood-face-good` looks like a smirk or a wink (asymmetric eyes): make it a clearly happy face with two round eyes and a wide smile. Keep ok and great. Show the five faces in one row at 40 dp and read back each: eyes / brows / mouth / emotion.

## 2. Week strip
`w-stats-week-strip-0..4` are seven tiny dots with a lot of empty space. Draw seven day circles at least 10 units each, filling the full width of the 4x1 widget, done = filled gold circle with a tick, today = ring in the look colour with a dot in the look colour (not black), missed = soft x, future = faint circle. Also make `w-stats-week-today` use the look's colour instead of a black dot.

## 3. Bell pulse
`w-balance-bell-frame-1..4` are almost identical, and the clapper is black (invisible in dark mode). Make a real pulse: the bell tilts a little left, centre, right, centre, with small sound arcs growing in frames 2 and 3, and the clapper in the ink class. Keep the 450 ms timing.

## 4. Picker previews and backgrounds
The `*_picker_*` SVGs contain one small dot only (layout-only). Give each a real layout: the widget background, a title line and a subtitle line as grey bars, and the widget's main graphic in the right position, so the app can show it without PNG. In the picker PNGs and the widget backgrounds the decorations are almost invisible; make the sun, the hills and the leaves 30% stronger (but keep the text-safe 70% x 60% area quiet) and re-measure the contrast on the real pixels, including the picker text: report the worst value per look and mode.

## 5. SVG tint semantics
In the line variants the `i-tint` path has opacity="1", which only looks right if the host sets `.i-tint{fill-opacity:.15}`. Please set `opacity` to 0.15 in the SVG itself so it renders correctly everywhere, in the changed ids and in a list of all other ids that need it (do not change the others now, only list them).

## 6. Android resources
You gave only `w_widget_surface.xml`. For each widget background (1x1, 2x1, 2x2, 4x1, 4x2) provide a VectorDrawable-compatible rounded surface XML per look and mode (gradient only, 22 dp corner), and a `widget-resources.md` table: resource name -> file -> density -> look/mode. State clearly which files are PNG only.

## 7. Report
Show one sheet per step (1 faces, 2 week strip, 3 bell frames, 4 pickers with contrast table, 5 list) and wait for "continue". Do not claim anything is fixed unless the sheet shows it.
````

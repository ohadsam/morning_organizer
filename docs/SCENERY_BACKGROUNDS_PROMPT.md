# Prompt for ChatGPT: the 14 screen backgrounds (a different scene for each), and the mood faces of Sunny

Send this in the SAME conversation as the scenery kit (`SonRise_Scenery_Sunny_Combined_Fix_20261110.zip`).

````text
Thank you. The six time-of-day backgrounds, the dividers, the sun track and the avatar frames are good and I will use them. I rendered everything myself. Two things are still wrong. Change ONLY these ids, keep every other id byte-identical.

## 1. The 14 screen backgrounds all look the same
`bg-home-hero, bg-calm, bg-focus, bg-play, bg-thinking, bg-sensory-calm, bg-welcome, bg-settings, bg-stats, bg-journal, bg-calm-corner, bg-celebration, bg-offline, bg-error` now share one template: a peach sky band with a sun, scattered dots and pink hills. The only differences are two or three small lines. A child must recognise each screen by its picture alone. Draw a DIFFERENT SCENE for each (portrait 360x640 and wide 640x360, each its own composition, not a crop), at least 12 shapes, 3 depth layers (far / middle / near), a gradient-like sky made of palette bands, and a quiet centre (the middle 70% x 60% stays calm and low-contrast so text is readable). The scenes:
- bg-home-hero: Sunny's own hill with the sun half-risen, nine rays, a winding path to a small house, a few birds. The left 40% quiet for the greeting.
- bg-calm: a still lake at dusk with a big soft moon, its reflection in layered ripples, two far hills, a few reeds.
- bg-focus: a tunnel of concentric soft arcs (rings) opening to a small bright sun in the distance, nothing else.
- bg-play: a meadow with balloons, a kite, a rainbow arc, bright but not busy, confetti dots.
- bg-thinking: a calm sky with three soft clouds, one with a small thought bubble and a tiny question mark, a quiet hill.
- bg-sensory-calm: big slow overlapping translucent circles in two palette colours on a plain wash, no small details at all.
- bg-welcome: a sunrise over rolling hills with a signpost and a waving small figure far away, wide open sky.
- bg-settings: large soft gears and sliders (very quiet), a toolbox shape in a corner, a window with a plant.
- bg-stats: rising hills like bars of a chart, a small flag on the highest one, a path climbing.
- bg-journal: a sheet of paper texture with a pencil, a ribbon bookmark, a leaf and a small lamp glow in a corner.
- bg-calm-corner: a cosy corner with a cushion, a floor lamp, a plant and a rug, soft light.
- bg-celebration: confetti, streamers, a few stars and fireworks as soft dots, a small podium step at the bottom corner.
- bg-offline: a small cloud with a plug and a cable unplugged, a quiet sky, a sleeping moon.
- bg-error: a friendly lost robot (rounded) with a question mark, a signpost with no text, a soft sky.
Technical rules: only the allowed attributes of my allow-list (no `style` attribute, no `<style>`, no filters, no clip-path). A shape that is a stroke only uses `fill="none"` and an explicit `stroke` and NO fill class; a filled shape uses a k-class and NO `fill="none"`. `preserveAspectRatio` and `width`/`height` on the root are fine. Gradients are only allowed as `linearGradient` / `radialGradient` with `stop-color` taken from a k-class variable... if you cannot do that, use palette bands. Colours only k1..k8 / i-ink / i-tint / i-bg so all eight looks recolour it. No text.
Contrast: measure the worst contrast of `i-ink` text over the real centre pixels of EACH background in each of the eight looks, light and dark (all 14 ids x 2 sizes), and list every value below 4.5: fix those backgrounds until none are below 4.5. Show them in a table.
Show me a sheet of the 14 portrait ones and a sheet of the 14 wide ones, with the text-safe zone outlined, in the Sunrise look, light and dark, and one more sheet of the same 14 in the Calm Mono look (it is the one that went muddy).

## 2. Sunny's mood faces (`sunny-feel-1` ... `sunny-feel-5`)
Your latest version has Sunny's rays and cheeks, but the eyes and the mouth became tiny dots and thin lines: at 32 px and 48 dp "sad" and "very sad" look like "okay", and the tears of "very sad" nearly vanish. Keep the rays and the cheeks and make the features BIG and bold: eyes at least 16 units wide, brows 6 units thick, the mouth 20 units wide with a 6-unit stroke; tears 12 units tall in the clear teal of the look; very sad = big tears + brows raised in the middle + a trembling mouth; sad = raised brows + a downturned mouth, no tears; okay = flat mouth, level brows; good = a wide smile; great = a big open smile with happy closed eyes and a few sparkles. Make the faces look good in all eight looks, especially Calm Mono (the face must stay a warm yellow-gold: use the k3 gold for the face in every look, only the rays follow the look) and Bold Focus (the face must NOT turn green: the same warm gold). Read each face back to me in a table: id, eyes / brows / mouth / rays, the emotion, does it read correctly at 32 px. Show the five at 32 px and 48 dp in the eight looks.

## 3. Report honestly
Same package structure, only the changed ids, `CHANGED-IDS.txt`, `AUDIT.json` with the real numbers, the contrast table. Do not claim anything is fixed unless the sheet shows it. Wait for "continue" after the backgrounds sheet and again after the faces.
````

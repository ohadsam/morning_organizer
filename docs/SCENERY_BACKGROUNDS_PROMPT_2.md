# Prompt for ChatGPT, round 2: bolder screen backgrounds, bolder Sunny faces, a loading animation

Send this in the SAME conversation as the last zip (`SonRise_Distinct_Backgrounds_And_Sunny_Moods_20261110.zip`).

````text
Thank you. Your last package is much better: the 14 screen backgrounds are now really different scenes and the contrast of the text over them is safe (worst value 6.2, none under 4.5). I rendered them myself. What is left is small. Change ONLY the ids listed below, and keep every other id byte-identical.

## 1. The 14 backgrounds are too faint to be recognised
`bg-home-hero, bg-calm, bg-focus, bg-play, bg-thinking, bg-sensory-calm, bg-welcome, bg-settings, bg-stats, bg-journal, bg-calm-corner, bg-celebration, bg-offline, bg-error` (portrait and wide).
On a phone, behind a card, the scenes nearly disappear: the shapes are only a little darker or lighter than the wash. A child should still recognise the screen at a glance. Keep each scene and its composition exactly as it is, and make it more present:
- Give the main shapes of each scene (the hill, the moon, the rings, the balloons, the gears, the lamp...) a clearly stronger colour step from the wash: aim for a visible difference, but keep the text-safe zone calm (soft, low detail, nothing sharp under it).
- Put the strongest colours and the smallest details OUTSIDE the text-safe zone (the edges and the bottom), and keep the zone itself a gentle wash.
- Add one small, clear "hero" shape per scene that is the thing you remember (the half sun, the moon, the sun at the end of the tunnel, the kite, the question mark, the lamp...).
- Use the palette classes only (`k1..k8`, `i-ink`, `i-tint`, `i-bg`), the same allow-list as before: no `style`, no `<style>`, no filters, no clip-path, no `data-*`; a stroke-only shape uses `fill="none"` with an explicit `stroke` and NO fill class; a filled shape uses a k-class and NO `fill="none"`.
- Re-measure the worst contrast of `i-ink` text over the real centre pixels of EACH background in the eight looks, light and dark, both sizes, and show the table. Every value must be 4.5 or more; tell me the lowest one. If making a scene bolder lowers a value below 4.5, calm the text-safe zone, not the scene.
- Show a sheet of the 14 portrait and a sheet of the 14 wide ones, text-safe zone outlined, Sunrise look light and dark, and one more sheet in the Calm Mono look. Then wait for "continue".

## 2. Sunny's mood faces (`sunny-feel-1` ... `sunny-feel-5`)
Keep the rays and cheeks. Make the features big and bold so that at 32 px and at 48 dp the five faces are told apart at a glance and the sad ones do not look like "okay": eyes at least 16 units wide, brows 6 units thick, a mouth 20 units wide with a 6-unit stroke, tears at least 12 units tall. Each mood must differ in the mouth AND the brows AND the eyes, not only in one of them. Render the five in a row at 32 px, 48 px and 96 px (light and dark) and show me. Then wait for "continue".

## 3. New (one id): the loading picture `anim-loading-sunrise`
A short calm loop for the moments the app is loading something (about 2.4 s, seamless). Sunny's sun rises slowly from behind a small hill, the rays open one by one, then it sinks back a little and rises again. Only transform and opacity on parts with the hooks `a-*` that my player already knows (`a-sun`, `a-rays`, `a-ray-1..9`, `a-hill`); no filters, no `style`. It must also work with NO motion: the still frame (sun half-risen) should look good on its own, because I show it when the person chose "calm animations: off". Size 160x160 viewBox, same palette classes.

## 4. Report honestly
Same package structure, only the changed ids, `CHANGED-IDS.txt`, `AUDIT.json` with the real numbers, and the contrast table. Do not claim anything is fixed unless the sheet shows it. If something cannot be done within the rules, say so instead of working around them.
````

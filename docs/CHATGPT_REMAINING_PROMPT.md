# Everything that is still waiting for ChatGPT (one prompt, 4 stages)

Send this in the SAME conversation as the last package (`SonRise_Sunny_Moods_Loading_Stages2_3_20261110.zip`). It replaces `PENDING_CHATGPT_PROMPTS.md` and `SCENERY_BACKGROUNDS_PROMPT_2.md` (stages 2 and 3 of that one were already delivered and adopted: the bold mood faces are in the app).

What is open, in the order of importance:

1. The 14 screen backgrounds are still too faint (the only item that blocks anything: the app will not place them until they read clearly).
2. Widget pictures for the other looks, and for the two widgets that have no art yet (a bell / reminder widget and a balance widget).
3. Badges and task silhouettes: an inventory first, then only what is missing.
4. Clean export rules for every file (so I do not have to repair them).

````text
Thank you. The faces are good: I adopted all five (big eyes, brows, mouth and tears read well at 32 px). I rendered everything myself. Four stages remain. Do them ONE at a time, show the sheet, and wait for "continue" before the next. Change only the ids named, keep every other id byte-identical, and report real numbers.

## Rules for every file (please follow them from now on)
- Plain SVG: the default namespace only (`<svg xmlns="http://www.w3.org/2000/svg" ...>`), NO `ns0:` / `ns1:` prefixes (your last loading file had them and my allow-list rejects it), no XML prolog, no `<style>`, no `style` attribute, no filters, no clip-path, no masks, no `data-*`, no `<text>`.
- Colours only through the palette classes `k1..k8`, `i-ink`, `i-tint`, `i-bg` (so the eight looks, light and dark, recolour them). A stroke-only shape uses `fill="none"` plus an explicit `stroke` and NO fill class; a filled shape uses a k-class and NO `fill="none"`.
- Under 24,000 bytes per picture.
- Tell me honestly what you could not do. Do not claim anything is fixed unless your own sheet shows it.

## Stage 1: the 14 screen backgrounds are too faint
Ids (portrait and wide): `bg-home-hero, bg-calm, bg-focus, bg-play, bg-thinking, bg-sensory-calm, bg-welcome, bg-settings, bg-stats, bg-journal, bg-calm-corner, bg-celebration, bg-offline, bg-error`.
The scenes are now different from one another (good) and the text over them is safe (worst contrast 6.2, none under 4.5). But on a phone, behind a card, the shapes are only a little darker or lighter than the wash and nearly vanish. Keep every scene and composition, and make it clearly present:
- The main shapes (the hill, the moon, the rings, the balloons, the gears, the lamp...) get a clearly stronger colour step from the wash, about 30% more saturation, and are larger.
- Put the strongest colours and the smallest details OUTSIDE the text-safe zone (the edges and the bottom third); keep the text-safe zone itself a calm, soft wash with no sharp detail.
- One clear "hero" shape per scene that a child remembers (the half sun, the moon, the sun at the end of the tunnel, the kite, the question mark, the lamp, the plug...).
- Measure again the worst contrast of `i-ink` text over the real centre pixels of EACH background in the eight looks, light and dark, both sizes. Every value must be 4.5 or more; give me a table and the lowest value. If making a scene bolder lowers a value, calm the text-safe zone, not the scene.
- Sheets: 14 portrait and 14 wide, text-safe zone outlined, Sunrise look light and dark, plus one sheet in the Calm Mono look. Wait for "continue".

## Stage 2: widget pictures
My Android widgets draw PNG backgrounds and icons that I render from your SVG. Today they exist only for the Sunrise look (light and dark). I need, as SVG with the rules above:
a) For each of the 8 looks (light and dark): `wbg-<size>` for the three widget sizes 4x2 (320x160), 2x2 (160x160) and 4x1 (320x80): a rounded-corner card (corner radius 24) with a soft sunrise motif at the edges and a calm, empty centre (text-safe, contrast 4.5 or more for `i-ink`). One shared motif per look, three crops of it.
b) A bell / reminder widget: `wi-bell-0..2` (a bell at rest, a small swing, a swing the other way; Sunny-style rounded, transparent background, 96x96) and `wi-bell-off` (the bell with a soft slash, for "alarms paused").
c) A balance widget (a calm "how balanced was the week" picture): `wi-balance-0..4`, a simple scale / seesaw from far-left tilt (0) through level (2) to far-right tilt (4), with a tiny sun on one side and a leaf on the other, 96x96, transparent background.
Show the sheets at their real pixel size on a phone-width card (light and dark), and the 8 looks of one size in a grid. Wait for "continue".

## Stage 3: badges and task silhouettes (inventory first)
I do not remember exactly which of these you already delivered. Before drawing anything, send me a TABLE with the ids you already gave me in each group and which are still missing, then draw only the missing ones:
- Achievement badges: the 14 level badges, the "streak" badges (3, 7, 14, 30 days), and one badge for each of: first routine, first calm exercise, first feeling check-in, first look-back, first backup. 96x96, a round medal with a ribbon, a simple symbol in the middle, a locked version (`<id>-locked`: the same shape in `i-tint`/`i-bg` only, no colour).
- Task silhouettes: one picture of a person doing a typical task, in a single `i-ink` ink, 64x64, for: wake up, wash face, brush teeth, get dressed, breakfast, pack the bag, shoes and coat, leave the house, homework, tidy up, shower, pyjamas, read, go to sleep.
- A small logo mark per look (the sun mark only, no text), 64x64, for the About screen and the boot screen.
Show them in a sheet at 32 px and 64 px, light and dark, and wait for "continue".

## Stage 4: report
`CHANGED-IDS.txt`, `AUDIT.json` with the real numbers (allow-list result for every picture, byte sizes, the contrast table), the sheets, and a short list of anything you could not do and why.
````

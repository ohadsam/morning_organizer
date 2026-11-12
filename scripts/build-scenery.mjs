// Builds web/data/scenery.json from the ChatGPT scenery kit: node scripts/build-scenery.mjs <sonrise-scenery-kit.json>
// Keeps what the app uses: the 14 avatar frames, the six time-of-day backgrounds (wide) and the six dividers. Root width / height / preserveAspectRatio are
// dropped (the app sets them), a style="fill:none" becomes the attribute, ids are removed.
import { readFileSync, writeFileSync } from 'node:fs';
const kit = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const clean = (s) => s.replace(/^<\?xml[^>]*\?>\s*/, '').trim().replace(/(<svg[^>]*?)\s+width="[^"]*"/, '$1').replace(/(<svg[^>]*?)\s+height="[^"]*"/, '$1').replace(/\s+preserveAspectRatio="[^"]*"/g, '').replace(/ style="fill:\s*none;?"/g, ' fill="none"').replace(/ id="[^"]*"/g, '');
const out = { format: 'sonrise-scenery', version: 1, frames: {}, skies: {}, dividers: {}, screens: {}, tasks: {}, badges: {} };
for (let i = 1; i <= 14; i++) out.frames[i] = clean(kit.frames[`frame-avatar-${i}`].svg);
for (const k of ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night']) out.skies[k] = clean(kit.backgrounds[`bg-${k}`].wide);
for (const k of ['wave', 'rays', 'dots', 'sunrise', 'leaves', 'stars', 'hills', 'sun']) if (kit.dividers[`div-${k}`]) out.dividers[k] = clean(kit.dividers[`div-${k}`].svg);
// the 14 screen backgrounds: BG_SVG=<dir with bg-<name>-portrait.svg and -wide.svg>
if (process.env.BG_SVG) for (const n of ['home-hero', 'calm', 'focus', 'play', 'thinking', 'sensory-calm', 'welcome', 'settings', 'stats', 'journal', 'calm-corner', 'celebration', 'offline', 'error']) out.screens[n] = { p: clean(readFileSync(`${process.env.BG_SVG}/bg-${n}-portrait.svg`, 'utf8')), w: clean(readFileSync(`${process.env.BG_SVG}/bg-${n}-wide.svg`, 'utf8')) };
// the 14 task silhouettes: SIL_SVG=<dir with task-sil-<name>.svg>
if (process.env.SIL_SVG) for (const n of ['wake-up', 'wash-face', 'brush-teeth', 'get-dressed', 'breakfast', 'pack-bag', 'shoes-coat', 'leave-house', 'homework', 'tidy-up', 'shower', 'pyjamas', 'read', 'go-to-sleep']) out.tasks[n] = clean(readFileSync(`${process.env.SIL_SVG}/task-sil-${n}.svg`, 'utf8'));
// medals: the unlocked ones come from the original visual kit (BADGE_KIT=<json>), the locked ones from BADGE_SVG=<dir with <id>-locked.svg>
if (process.env.BADGE_KIT && process.env.BADGE_SVG) {
  const orig = JSON.parse(readFileSync(process.env.BADGE_KIT, 'utf8')).badges, ids = [...Array.from({ length: 14 }, (_, i) => `level-${i + 1}`), 'streak-3', 'streak-7', 'streak-30', 'first-routine'];
  for (const id of ids) { out.badges[id] = clean(orig[id].svg); out.badges[`${id}-locked`] = clean(readFileSync(`${process.env.BADGE_SVG}/${id}-locked.svg`, 'utf8')); }
}
writeFileSync('web/data/scenery.json', JSON.stringify(out)); console.log(Object.keys(out.frames).length, 'frames,', Object.keys(out.skies).length, 'skies,', Object.keys(out.dividers).length, 'dividers,', JSON.stringify(out).length, 'bytes');

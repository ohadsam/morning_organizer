// Builds web/data/scenery.json from the ChatGPT scenery kit: node scripts/build-scenery.mjs <sonrise-scenery-kit.json>
// Keeps what the app uses: the 14 avatar frames, the six time-of-day backgrounds (wide) and the six dividers. Root width / height / preserveAspectRatio are
// dropped (the app sets them), a style="fill:none" becomes the attribute, ids are removed.
import { readFileSync, writeFileSync } from 'node:fs';
const kit = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const clean = (s) => s.replace(/^<\?xml[^>]*\?>\s*/, '').trim().replace(/(<svg[^>]*?)\s+width="[^"]*"/, '$1').replace(/(<svg[^>]*?)\s+height="[^"]*"/, '$1').replace(/\s+preserveAspectRatio="[^"]*"/g, '').replace(/ style="fill:\s*none;?"/g, ' fill="none"').replace(/ id="[^"]*"/g, '');
const out = { format: 'sonrise-scenery', version: 1, frames: {}, skies: {}, dividers: {} };
for (let i = 1; i <= 14; i++) out.frames[i] = clean(kit.frames[`frame-avatar-${i}`].svg);
for (const k of ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night']) out.skies[k] = clean(kit.backgrounds[`bg-${k}`].wide);
for (const k of ['wave', 'rays', 'dots', 'sunrise', 'leaves', 'stars', 'hills', 'sun']) if (kit.dividers[`div-${k}`]) out.dividers[k] = clean(kit.dividers[`div-${k}`].svg);
writeFileSync('web/data/scenery.json', JSON.stringify(out)); console.log(Object.keys(out.frames).length, 'frames,', Object.keys(out.skies).length, 'skies,', Object.keys(out.dividers).length, 'dividers,', JSON.stringify(out).length, 'bytes');

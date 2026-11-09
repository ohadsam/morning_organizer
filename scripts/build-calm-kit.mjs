// Builds web/data/calm-kit.json from the ChatGPT calm-animation zips (extracted dirs given as arguments, later ones win):
//   node scripts/build-calm-kit.mjs <base-svg-dir> [<patch-svg-dir> ...]
// Skin and glow colours are fixed here: k6 is coral red in the Sunrise look, so skin becomes k8 (peach) and glows / progress dots k3 (gold).
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
const dirs = process.argv.slice(2); if (!dirs.length) { console.error('usage: build-calm-kit.mjs <svg dir> [...]'); process.exit(1); }
const files = new Map();
for (const d of dirs) for (const f of readdirSync(d)) if (f.endsWith('.svg')) files.set(f.slice(0, -4), `${d}/${f}`);
const patterns = ['slow', 'box', 'relax478', 'sigh'], imagery = ['elements', 'safeplace', 'beach', 'forest', 'mountain', 'leaves', 'balloon', 'container', 'light', 'cloud', 'helper'];
const ids = [...patterns.flatMap((p) => [0, 1, 2, 3, 4].map((i) => `breath-${p}-${i}`)), ...imagery.flatMap((g) => [1, 2, 3, 4].map((i) => `imagery-${g}-f${i}`)),
  ...[5, 4, 3, 2, 1].map((n) => `grounding-${n}`), 'grounding-done', ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `bodyscan-${i}`), 'bodyscan-whole',
  'nlp-outcome', 'nlp-reframe', 'nlp-anchor', 'nlp-clarify', 'nlp-perspectives', 'nlp-rehearse'];
function fix(id, svg) {
  if (id.startsWith('bodyscan')) { const i = svg.indexOf('<g class="zone'); const head = i < 0 ? svg : svg.slice(0, i), tail = i < 0 ? '' : svg.slice(i); return head.replaceAll('class="k6"', 'class="k8"') + tail.replaceAll('class="k6"', 'class="k3"'); }
  if (id.startsWith('grounding')) return svg.replace(/(<circle[^>]*cy="32"[^>]*?)class="k6"/g, '$1class="k3"').replace(/class="k6"([^>]*cy="32")/g, 'class="k3"$1').replaceAll('class="k6"', 'class="k8"');
  return svg;
}
const alt = {};
for (const d of dirs) { const j = `${d}/../calm-animations.json`; if (existsSync(j)) for (const a of JSON.parse(readFileSync(j, 'utf8'))) if (a.alt) alt[a.id] = a.alt; }
// Sunny's layered breathing scenes (ChatGPT "sunny animations v2", stage 1): one still per pattern with stable group ids; the app moves the groups itself
const sunnyDir = process.env.SUNNY_SVG, scenes = {}; let bytes = 0;
if (sunnyDir) for (const pat of patterns) { const svg = readFileSync(`${sunnyDir}/sunny-breath-${pat}.svg`, 'utf8').trim().replace(/ data-[a-z-]+="[^"]*"/g, '').replace(/<g  id=/g, '<g id='); scenes[`sunny-breath-${pat}`] = { svg }; bytes += svg.length; }
for (const id of ids) { const p = files.get(id === 'imagery-elements-f1' ? 'imagery-elements' : id);   // f1 of the four elements has the figure cut off at the corner: the full scene replaces it
   if (!p) { console.error('missing', id); process.exit(1); } const svg = fix(id, readFileSync(p, 'utf8').trim()).replace(/ data-zone="[^"]*"/g, ''); bytes += svg.length; scenes[id] = { svg, alt: alt[id] || undefined }; }
writeFileSync('web/data/calm-kit.json', JSON.stringify({ format: 'sonrise-calm-kit', version: 1, scenes }));
console.log(Object.keys(scenes).length, 'scenes,', bytes, 'bytes');

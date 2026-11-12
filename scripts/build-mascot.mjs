// Builds web/data/mascot.json (Sunny's moods) from the ChatGPT scenery kit: node scripts/build-mascot.mjs <sonrise-scenery-kit.json>
import { readFileSync, writeFileSync } from 'node:fs';
const kit = JSON.parse(readFileSync(process.argv[2], 'utf8')), m = kit.mascot;
const moods = {}; for (const [id, v] of Object.entries(m.moods)) moods[id] = { svg: v.svg.replace(/ id="[^"]*"/g, ''), name: v.name, description: v.description };
// the five "how do I feel" faces: Sunny's own layers composed into a close-up of the sun (no hill, no arms), very sad ... great
const inner = (x) => x.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/ id="[^"]*"/g, '');
const DEF = { glow: 'soft', rays: 'nine', body: 'sun', cheeks: 'rosy' }, ORDER = ['glow', 'rays', 'body', 'cheeks', 'eyes', 'brows', 'mouth', 'accessory', 'effects'];
const FEEL = { 1: { eyes: 'sad', brows: 'worried', mouth: 'worried', effects: 'tears-of-joy' }, 2: { eyes: 'sad', brows: 'sad', mouth: 'sad' }, 3: { eyes: 'open', brows: 'neutral', mouth: 'flat' }, 4: { eyes: 'open', brows: 'neutral', mouth: 'smile' }, 5: { eyes: 'happy', brows: 'raised', mouth: 'big', effects: 'sparkles' } };
const L = m.layers;
for (const [lv, o0] of Object.entries(FEEL)) { const o = { ...DEF, ...o0 };
  moods[`feel-${lv}`] = { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 6 216 216">${ORDER.map((n) => { const v = o[n] && L[n][o[n]]; return v ? inner(v.svg ?? v.frames?.[0] ?? '') : ''; }).join('')}</svg>`, name: { en: `Feeling ${lv}`, he: `מרגיש ${lv}` }, description: { en: 'Sunny shows how it feels', he: 'שמשי מראה איך מרגישים' } }; }
// bolder faces from the "mood faces" round: FEEL_SVG=<dir with sunny-feel-1..5.svg> replaces the composed ones (no ids, no empty hidden groups)
if (process.env.FEEL_SVG) for (let lv = 1; lv <= 5; lv++) {
  const svg = readFileSync(`${process.env.FEEL_SVG}/sunny-feel-${lv}.svg`, 'utf8').replace(/^<\?xml[^>]*\?>\s*/, '').trim().replace(/ id="[^"]*"/g, '').replace(/<g opacity="0"\/>/g, '').replace(/ (width|height)="256"/g, '').replace('viewBox="0 0 256 256"', 'viewBox="8 8 240 240"');
  moods[`feel-${lv}`] = { ...moods[`feel-${lv}`], svg }; }
// the loading sunrise (ids kept: the player moves a-sun / a-rays / a-ray-N): LOADING_SVG=<anim-loading-sunrise.svg> (its ns0: prefixes are removed)
if (process.env.LOADING_SVG) moods['anim-loading'] = { svg: readFileSync(process.env.LOADING_SVG, 'utf8').trim().replace(/ xmlns:ns0="[^"]*"/, '').replace(/ns0:/g, '').replace(/ (width|height)="160"/g, '').replace(/ preserveAspectRatio="[^"]*"/, ''), name: { en: 'Loading', he: 'טוען' }, description: { en: 'Sunny rises while something loads', he: 'שמשי זורחת בזמן טעינה' } };
// the cameos (open-eyed Sunny with a prop: thumbs up, clipboard, plug...) from the "Sunny refinement" kit: CAMEO_SVG=<dir with sunny-<name>.svg>
if (process.env.CAMEO_SVG) for (const n of ['check', 'empty', 'error', 'offline', 'loading', 'reminder', 'calm', 'tired', 'proud', 'think', 'hello', 'goodbye']) {
  const svg = readFileSync(`${process.env.CAMEO_SVG}/sunny-${n}.svg`, 'utf8').replace(/^<\?xml[^>]*\?>\s*/, '').trim().replace(/ id="[^"]*"/g, '').replace(/ data-[a-z-]+="[^"]*"/g, '');
  moods[`cameo-${n}`] = { svg, name: { en: n, he: n }, description: { en: 'Sunny with a prop', he: 'שמשי עם אביזר' } }; }
writeFileSync('web/data/mascot.json', JSON.stringify({ format: 'sonrise-mascot', version: 1, name: m.name, moods }));
console.log(Object.keys(moods).length, 'moods');

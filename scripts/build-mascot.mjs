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
writeFileSync('web/data/mascot.json', JSON.stringify({ format: 'sonrise-mascot', version: 1, name: m.name, moods }));
console.log(Object.keys(moods).length, 'moods');

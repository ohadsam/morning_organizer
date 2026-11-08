// Builds web/data/mascot.json (Sunny's moods) from the ChatGPT scenery kit: node scripts/build-mascot.mjs <sonrise-scenery-kit.json>
import { readFileSync, writeFileSync } from 'node:fs';
const kit = JSON.parse(readFileSync(process.argv[2], 'utf8')), m = kit.mascot;
const moods = {}; for (const [id, v] of Object.entries(m.moods)) moods[id] = { svg: v.svg.replace(/ id="[^"]*"/g, ''), name: v.name, description: v.description };
writeFileSync('web/data/mascot.json', JSON.stringify({ format: 'sonrise-mascot', version: 1, name: m.name, moods }));
console.log(Object.keys(moods).length, 'moods');

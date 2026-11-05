#!/usr/bin/env node
// Turns the audio in voicepacks/<profile>/<lang>/*.opus into manifest.json files the app understands (only sentences that exist in phrases.json,
// only safe file names) and prints the size of each pack. Usage: node scripts/voices/build-pack.mjs [--out voicepacks]
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { sanitizeManifest } from '../../web/js/voicepack.js';

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'voicepacks';
const known = new Set(JSON.parse(readFileSync('voices/phrases.json', 'utf8')).phrases.map((p) => `${p.lang}|${p.id}`));
if (!existsSync(out)) { console.error(`No ${out}/ folder yet - run generate-openai.mjs first.`); process.exit(1); }
let total = 0;
for (const id of readdirSync(out).filter((x) => statSync(join(out, x)).isDirectory())) {
  for (const lang of ['he', 'en']) {
    const dir = join(out, id, lang); if (!existsSync(dir)) continue;
    const clips = {}; let bytes = 0;
    for (const f of readdirSync(dir)) { const m = /^([a-z0-9]+)\.opus$/.exec(f); if (m && known.has(`${lang}|${m[1]}`)) { clips[m[1]] = f; bytes += statSync(join(dir, f)).size; } }
    const manifest = sanitizeManifest({ id, lang, version: Math.floor(Date.now() / 1000), bytes, clips });
    if (!manifest) { console.error(`skipped ${id}/${lang}`); continue; }
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest)); total += bytes;
    console.log(`${id}/${lang}: ${Object.keys(clips).length} clips, ${(bytes / 1e6).toFixed(1)} MB`);
  }
}
console.log(`Total ${(total / 1e6).toFixed(1)} MB`);

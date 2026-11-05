#!/usr/bin/env node
// Makes the recorded voice packs with Google Cloud Text-to-Speech (WaveNet voices). To my knowledge WaveNet has a free monthly allowance of 1,000,000
// characters - the whole project (8 voices, both languages) is about 580,000 - but check Google's current pricing page and set a budget alert first.
// You need a Google Cloud project with the "Cloud Text-to-Speech API" enabled and an API key (console.cloud.google.com -> APIs & Services -> Credentials).
// Resumable: existing files are skipped. Same output layout as generate-openai.mjs, so build-pack.mjs works for both.
//
//   export GOOGLE_TTS_KEY=AIza...
//   node scripts/voices/generate-google.mjs --dry-run
//   node scripts/voices/generate-google.mjs --profiles woman --lang he --groups guide,scan,breath,ground     # a small listening test first
//   node scripts/voices/generate-google.mjs --profiles woman,man,calm
// Options: --lang he|en|both  --groups a,b  --profiles ids  --limit N  --concurrency N  --out dir (default voicepacks)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2), args = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { const next = argv[i + 1]; args[argv[i].slice(2)] = next && !next.startsWith('--') ? next : true; }
const { phrases } = JSON.parse(readFileSync('voices/phrases.json', 'utf8')), cfg = JSON.parse(readFileSync('voices/profiles.json', 'utf8'));
const langs = !args.lang || args.lang === 'both' ? ['he', 'en'] : [args.lang], groups = args.groups ? String(args.groups).split(',') : null;
const want = args.profiles ? String(args.profiles).split(',') : cfg.profiles.map((p) => p.id), profiles = cfg.profiles.filter((p) => want.includes(p.id) && p.google);
const out = String(args.out || 'voicepacks'), conc = Math.max(1, Number(args.concurrency) || 3), limit = Number(args.limit) || Infinity;
const todo = phrases.filter((p) => langs.includes(p.lang) && (!groups || groups.includes(p.group)));
const chars = todo.reduce((s, p) => s + p.text.length, 0) * profiles.length;
console.log(`${todo.length} sentences x ${profiles.length} voices = ${todo.length * profiles.length} clips, ${chars} characters.`);
console.log(`Google's free allowance (WaveNet, to my knowledge): 1,000,000 characters per month -> this run uses ${(chars / 10000).toFixed(0)}% of it. Verify on Google's pricing page.`);
if (args['dry-run']) process.exit(0);
const key = process.env.GOOGLE_TTS_KEY;
if (!key) { console.error('Set GOOGLE_TTS_KEY first.'); process.exit(1); }

const jobs = [];
for (const pr of profiles) for (const p of todo) { const file = join(out, pr.id, p.lang, `${p.id}.opus`); if (!existsSync(file)) jobs.push({ pr, p, file }); }
const queue = jobs.slice(0, limit); let done = 0, failed = 0;
console.log(`${jobs.length} clips still to make${limit < jobs.length ? ` (doing ${limit} now)` : ''}.`);
async function one({ pr, p, file }) {
  const g = pr.google[p.lang]; if (!g) return;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { text: p.text }, voice: { languageCode: g.voice.split('-').slice(0, 2).join('-'), name: g.voice }, audioConfig: { audioEncoding: 'OGG_OPUS', pitch: g.pitch ?? 0, speakingRate: g.rate ?? 1, sampleRateHertz: 24000 } }) });
      if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500 * attempt)); continue; }
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
      const { audioContent } = await res.json(); mkdirSync(join(out, pr.id, p.lang), { recursive: true }); writeFileSync(file, Buffer.from(audioContent, 'base64')); done++;
      if (done % 25 === 0) console.log(`${done} made`); return;
    } catch (e) { if (attempt === 5) { failed++; console.error(`failed ${pr.id}/${p.lang}/${p.id}: ${e.message}`); } else await new Promise((r) => setTimeout(r, 1000 * attempt)); }
  }
}
await Promise.all(Array.from({ length: conc }, async () => { while (queue.length) await one(queue.shift()); }));
console.log(`Done: ${done} made, ${failed} failed. Next: node scripts/voices/build-pack.mjs`);

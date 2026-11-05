#!/usr/bin/env node
// Makes the recorded voice packs with OpenAI's text-to-speech API (needs YOUR API key; a ChatGPT Plus subscription does not include API credit).
// Resumable: files that already exist are skipped, so it can be stopped and restarted. Only the sentences in voices/phrases.json are sent.
//
//   export OPENAI_API_KEY=sk-...
//   node scripts/voices/generate-openai.mjs --dry-run                                                  # counts sentences/characters, estimates the cost, no calls
//   node scripts/voices/generate-openai.mjs --profiles woman --lang he --groups guide,scan,breath,ground  # a small first test
//   node scripts/voices/generate-openai.mjs --profiles woman,man,girl,boy,calm,coach                    # everything for those voices
// Options: --lang he|en|both (default both)  --groups a,b,c (default all)  --profiles ids (default all)  --limit N  --concurrency N (default 3)  --out dir (default voicepacks)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2), args = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { const next = argv[i + 1]; args[argv[i].slice(2)] = next && !next.startsWith('--') ? next : true; }
const { phrases } = JSON.parse(readFileSync('voices/phrases.json', 'utf8')), cfg = JSON.parse(readFileSync('voices/profiles.json', 'utf8'));
const langs = !args.lang || args.lang === 'both' ? ['he', 'en'] : [args.lang], groups = args.groups ? String(args.groups).split(',') : null;
const want = args.profiles ? String(args.profiles).split(',') : cfg.profiles.map((p) => p.id), profiles = cfg.profiles.filter((p) => want.includes(p.id));
const out = String(args.out || 'voicepacks'), conc = Math.max(1, Number(args.concurrency) || 3), limit = Number(args.limit) || Infinity;
const todo = phrases.filter((p) => langs.includes(p.lang) && (!groups || groups.includes(p.group)));
const chars = todo.reduce((s, p) => s + p.text.length, 0) * profiles.length, minutes = chars / 14 / 60;
console.log(`${todo.length} sentences x ${profiles.length} voices = ${todo.length * profiles.length} clips, ${chars} characters, about ${Math.round(minutes)} minutes of audio.`);
console.log(`Rough cost with ${cfg.model}: about $${(minutes * 0.015).toFixed(2)} (check OpenAI's current price list - this estimate may be out of date).`);
if (args['dry-run']) process.exit(0);
const key = process.env.OPENAI_API_KEY;
if (!key) { console.error('Set OPENAI_API_KEY first.'); process.exit(1); }

const jobs = [];
for (const pr of profiles) for (const p of todo) { const file = join(out, pr.id, p.lang, `${p.id}.opus`); if (!existsSync(file)) jobs.push({ pr, p, file }); }
const queue = jobs.slice(0, limit); let done = 0, failed = 0;
console.log(`${jobs.length} clips still to make${limit < jobs.length ? ` (doing ${limit} now)` : ''}.`);
async function one({ pr, p, file }) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: cfg.model, voice: pr.openaiVoice, input: p.text, instructions: pr.instructions[p.lang], response_format: 'opus' }) });
      if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500 * attempt)); continue; }
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
      mkdirSync(join(out, pr.id, p.lang), { recursive: true }); writeFileSync(file, Buffer.from(await res.arrayBuffer())); done++;
      if (done % 25 === 0) console.log(`${done}/${queue.length + done - 0}`); return;
    } catch (e) { if (attempt === 5) { failed++; console.error(`failed ${pr.id}/${p.lang}/${p.id}: ${e.message}`); } else await new Promise((r) => setTimeout(r, 1000 * attempt)); }
  }
}
await Promise.all(Array.from({ length: conc }, async () => { while (queue.length) await one(queue.shift()); }));
console.log(`Done: ${done} made, ${failed} failed. Next: node scripts/voices/build-pack.mjs`);

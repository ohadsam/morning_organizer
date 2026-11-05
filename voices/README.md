# Recorded voice packs

Natural voices for the app's **fixed sentences** (calm-corner journeys and scans, breathing words, encouragement, tips, kind thoughts, exercises).
Anything with a name, a time or other changing words is still spoken by the phone's own voice, so the two never mix inside one sentence.

## Can ChatGPT make these?
Not in the chat window: ChatGPT cannot produce hundreds of downloadable audio files, and its code sandbox has no speech engine or internet.
What works is OpenAI's **text-to-speech API** (`gpt-4o-mini-tts`: Hebrew and English, a voice choice plus written style instructions such as "calm meditation guide").
It is billed separately from a ChatGPT subscription: create an API key at platform.openai.com and add a few dollars of credit.

## Without paying anything extra: Google Cloud Text-to-Speech
To my knowledge Google's WaveNet voices have a free monthly allowance of 1,000,000 characters, and the whole project is about 580,000 (check Google's pricing page and set a budget alert).
You need a Google Cloud project (a card is required to open it, but nothing is charged inside the allowance), the "Cloud Text-to-Speech API" enabled and an API key.
Then use `generate-google.mjs` instead of `generate-openai.mjs` in the steps below (`export GOOGLE_TTS_KEY=...`); everything else is the same. Girl / boy / grandma / grandpa are made by changing pitch and speed of the Hebrew WaveNet voices A-D (set in `voices/profiles.json`).

## Steps (about 15 minutes of your time)
1. `node scripts/voices/export-phrases.mjs` - (re)writes `voices/phrases.json`, the list of fixed sentences (1,264 today, about 73,000 characters per voice).
2. `export OPENAI_API_KEY=sk-...` (Windows PowerShell: `$env:OPENAI_API_KEY="sk-..."`).
3. Check the cost without spending anything: `node scripts/voices/generate-openai.mjs --dry-run` (all 8 voices is roughly 10 USD by the script's estimate; check OpenAI's price list).
4. **Listen first** with a tiny test (about 0.10 USD): `node scripts/voices/generate-openai.mjs --profiles woman --lang he --groups guide,scan,breath,ground`
   then open a few files in `voicepacks/woman/he/`. If the Hebrew sounds good, continue; if not, edit the `instructions` in `voices/profiles.json` (or the OpenAI voice) and delete that folder to remake it.
5. Make the rest: `node scripts/voices/generate-openai.mjs --profiles woman,man,calm` (the script skips files that exist, so you can stop and restart it).
6. `node scripts/voices/build-pack.mjs` - writes each pack's `manifest.json` and prints its size (expect roughly 5-9 MB per voice and language).
7. Send the `voicepacks/` folder (or tell me where it is) and the app side plays them: the app looks a sentence up by id, and plays the clip if it exists.

## Notes
- OpenAI's terms require telling people the voice is AI-generated; the app will say so next to the pack.
- Voices for the cat, dog, lion... are not part of this (they stay the phone's voice with sound effects).
- Pack files are NOT inside the app (the Android app packages the whole `web/` folder): they are published next to the site and downloaded on request.

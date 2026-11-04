import test from 'node:test';
import assert from 'node:assert/strict';
import * as SP from '../../web/js/speech.js';

const V = (name, lang = 'he-IL', extra = {}) => ({ name, lang, voiceURI: name, ...extra });

test('voice quality ranking and gender guess', () => {
  assert.equal(SP.guessGender(V('Microsoft Hila Online (Natural) - Hebrew')), 'f'); assert.equal(SP.guessGender(V('Microsoft Asaf - Hebrew')), 'm'); assert.equal(SP.guessGender(V('Google עברית')), ''); assert.equal(SP.guessGender(V('Samantha', 'en-US')), 'f'); assert.equal(SP.guessGender(V('Daniel', 'en-GB')), 'm');
  assert.ok(SP.scoreVoice(V('Microsoft Hila Online (Natural)'), 'he') > SP.scoreVoice(V('Google עברית'), 'he')); assert.ok(SP.scoreVoice(V('Google עברית'), 'he') > SP.scoreVoice(V('eSpeak Hebrew compact'), 'he')); assert.ok(SP.scoreVoice(V('Zarvox', 'en-US'), 'en') < 0);
});
test('picking the installed voice for a character: gender, variety, explicit choice, fallbacks', () => {
  const voices = [V('eSpeak Hebrew'), V('Microsoft Hila Online (Natural)'), V('Microsoft Asaf'), V('Carmit'), V('Samantha', 'en-US')];
  assert.equal(SP.pickVoice(voices, 'he', SP.PRESETS.woman).name, 'Microsoft Hila Online (Natural)'); assert.equal(SP.pickVoice(voices, 'he', SP.PRESETS.man).name, 'Microsoft Asaf');
  assert.equal(SP.pickVoice(voices, 'he', SP.PRESETS.girl).name, 'Carmit');                     // variant 1 of the female voices: characters differ when the device allows it
  assert.equal(SP.pickVoice(voices, 'he', SP.PRESETS.natural).name, 'Microsoft Hila Online (Natural)');
  assert.equal(SP.pickVoice(voices, 'he', SP.PRESETS.woman, 'Carmit').name, 'Carmit');          // an explicit choice always wins
  assert.equal(SP.pickVoice(voices, 'en', SP.PRESETS.man).name, 'Samantha');                    // only a female voice exists: better than none
  assert.equal(SP.pickVoice([], 'he', SP.PRESETS.woman), null); assert.equal(SP.pickVoice([V('Hebrew', 'iw-IL')], 'he', SP.PRESETS.man).name, 'Hebrew');
});
test('text is cleaned for speech: no emoji, units spelled out, arrows become pauses', () => {
  assert.equal(SP.cleanForSpeech('נשארו 4ד׳ 40ש״נ → יאללה 😀 (עוד קצת)', 'he'), 'נשארו 4 דקות 40 שניות, יאללה, עוד קצת');
  assert.equal(SP.cleanForSpeech('Planned 5m 30s · done! 1m ⭐', 'en'), 'Planned 5 minutes 30 seconds, done! 1 minute'); assert.equal(SP.cleanForSpeech('50%', 'en'), '50 percent'); assert.equal(SP.cleanForSpeech('😀😀', 'en'), ''); assert.equal(SP.cleanForSpeech(null), '');
  const long = Array(30).fill('word').join(' ') + ', ' + Array(30).fill('more').join(' ') + '.'; assert.ok(SP.phrases(long).length >= 2); assert.deepEqual(SP.phrases('One. Two! Three?'), ['One.', 'Two!', 'Three?']);
});
test('the speaking plan: human pace, pauses, intonation, characters', () => {
  const rnd = () => 0.5, plan = (text, id, o = {}) => SP.planSpeech(text, { persona: SP.PRESETS[id], lang: 'en', rnd, ...o });
  const a = plan('You can do it. Is it hard? Great job!', 'woman'); assert.equal(a.length, 3); assert.ok(a[1].pitch > a[0].pitch, 'a question rises'); assert.ok(a[2].rate > a[0].rate - 0.05); assert.equal(a.at(-1).pauseMs, 0); assert.ok(a[0].pauseMs > 200);
  assert.ok(plan('One. Two. Three.', 'calm')[0].pauseMs > plan('One. Two. Three.', 'coach')[0].pauseMs * 2);      // a calm guide pauses much longer than a coach
  assert.deepEqual(plan('Same words again.', 'woman'), plan('Same words again.', 'woman'));                  // deterministic variations
  assert.ok(plan('Slow down please', 'woman', { rate: 0.7 })[0].rate < plan('Slow down please', 'woman', { rate: 1.3 })[0].rate);
  const cat = plan('Time to get dressed now', 'cat', { rnd: () => 0 }); assert.equal(cat[0].text, 'meow'); assert.ok(cat[0].pitch > 1.5); assert.equal(cat.length, 2);
  assert.equal(plan('Breathe in', 'cat', { rnd: () => 0, kind: 'short' }).length, 1);                        // cues are never decorated
  const hebrew = SP.planSpeech('הגיע הזמן להתלבש עכשיו', { persona: SP.PRESETS.dog, lang: 'he', rnd: () => 0 }); assert.equal(hebrew[0].text, 'הב הב');
  assert.match(plan('Well done today my friend', 'woman', { flavor: 'casual', rnd: () => 0 })[0].text, /^(Hey|Alright|Cool|Okay),/); assert.equal(plan('Well done today my friend', 'woman', { flavor: 'neutral', rnd: () => 0 })[0].text, 'Well done today my friend');
  assert.match(plan('Keep going now friend', 'coach', { rnd: () => 0 })[0].text, /^(Let|Come|Here)/);       // a coach talks like one without a setting
  assert.deepEqual(SP.planSpeech('😀', { lang: 'en' }), []);
});
test('characters are well-formed; everyday and style voices stay in a human range', () => {
  for (const [id, p] of Object.entries(SP.PRESETS)) { assert.ok(p.emoji && ['f', 'm', 'any'].includes(p.g) && p.pause > 0 && p.rate > 0.3 && p.pitch >= 0.1 && p.pitch <= 2, id); }
  for (const g of ['everyday', 'style']) for (const id of SP.personaIds(g)) { const p = SP.PRESETS[id]; assert.ok(p.pitch >= 0.6 && p.pitch <= 1.5 && p.rate >= 0.74 && p.rate <= 1.15, `${id} sounds human`); }
  assert.ok(SP.personaIds('fun').length >= 6 && SP.personaIds('fun').every((id) => SP.PRESETS[id].fx || id === 'robot' || id === 'fairy')); assert.equal(SP.personaOf('__proto__'), SP.PRESETS.natural); assert.equal(SP.personaOf('constructor'), SP.PRESETS.natural); assert.equal(SP.personaOf('girl'), SP.PRESETS.girl);
  for (const k of Object.keys(SP.FLAVORS)) assert.ok(Array.isArray(SP.FLAVORS[k].he) && Array.isArray(SP.FLAVORS[k].en));
});
test('speakText: phrases are spoken one after another with pauses, the chosen voice, and can be stopped', async () => {
  const said = [], voices = [V('Hila Natural', 'en-US'), V('Daniel', 'en-GB')];
  globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  globalThis.speechSynthesis = { getVoices: () => voices, speak(u) { said.push({ text: u.text, voice: u.voice?.name, pitch: u.pitch, rate: u.rate, lang: u.lang }); setTimeout(() => u.onend?.(), 5); }, cancel() {}, addEventListener() {}, removeEventListener() {} };
  assert.equal(SP.speakText('First thing. Second thing!', { lang: 'en', preset: 'man', kind: 'short' }), true);
  await new Promise((r) => setTimeout(r, 900)); assert.deepEqual(said.map((x) => x.text), ['First thing.', 'Second thing!']); assert.equal(said[0].voice, 'Daniel'); assert.equal(said[0].lang, 'en-US');
  said.length = 0; SP.speakText('One. Two. Three.', { lang: 'en', kind: 'short' }); SP.stopSpeaking(); await new Promise((r) => setTimeout(r, 900)); assert.equal(said.length <= 1, true, 'stopped before the rest');
  said.length = 0; assert.equal(SP.speakText('', {}), false); assert.equal(SP.speakText('😀', {}), false);
  delete globalThis.speechSynthesis; delete globalThis.SpeechSynthesisUtterance; assert.equal(SP.speakText('x'), false);
});

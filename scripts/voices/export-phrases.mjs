// Lists every FIXED sentence the app speaks (no names / times inside), in Hebrew and English, with a stable id per spoken text.
// Hebrew {male|female} forms are resolved to both genders. Writes voices/phrases.json - the input of generate-openai.mjs.
// Usage: node scripts/voices/export-phrases.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TIPS } from '../../web/js/coachTips.js';
import { POOLS, KID_EXTRA, personalize } from '../../web/js/feedback.js';
import { THOUGHTS, EXERCISES } from '../../web/js/thoughts.js';
import { GUIDES, SCANS } from '../../web/js/calmGuides.js';
import { cleanForSpeech } from '../../web/js/speech.js';
import { STR } from '../../web/js/i18n.js';
import { phraseId } from '../../web/js/voicepack.js';

const out = new Map();   // `${lang}|${id}` -> record
const add = (group, lang, raw, gender = '') => {
  const text = cleanForSpeech(raw, lang); if (!text || /\{[^}]*\}/.test(text) || text.length < 3 || text.length > 500) return;
  const id = phraseId(lang, text), k = `${lang}|${id}`; if (!out.has(k)) out.set(k, { id, lang, text, group, gender: lang === 'he' ? gender : '' });
};
const withGenders = (group, lang, msg) => { if (lang === 'he' && /\{[^{}|]*\|[^{}|]*\}/.test(msg)) { for (const g of ['male', 'female']) add(group, lang, personalize(msg, { name: '', gender: g }), g); } else add(group, lang, personalize(msg, { name: '', gender: 'other' })); };

for (const lang of ['he', 'en']) {
  const L = STR[lang], l2 = lang;
  for (const g of GUIDES) { for (const s of g.steps[l2]) add('guide', lang, s); add('guide', lang, g.title[l2]); }
  for (const sc of Object.values(SCANS)) for (const p of sc.parts) add('scan', lang, L[sc.step].replace('{part}', L[`part_${p}`]));
  for (const k of ['ph_in', 'ph_out', 'ph_hold']) add('breath', lang, L[k]);
  for (const [n, sense] of [[5, 'see'], [4, 'touch'], [3, 'hear'], [2, 'smell'], [1, 'taste']]) add('ground', lang, L.groundStep.replace('{n}', n).replace('{sense}', L[`sense_${sense}`]));
  for (const pool of Object.values(POOLS[lang] || {})) for (const msg of pool) withGenders('feedback', lang, msg);
  for (const pool of Object.values(KID_EXTRA[lang] || {})) for (const msg of pool) withGenders('feedback', lang, msg);
  for (const tip of TIPS) for (const tier of ['kid', 'teen', 'adult']) { const v = tip.text[tier]; if (v) withGenders('tip', lang, v[lang === 'he' ? 1 : 0]); }
  for (const th of THOUGHTS) for (const tier of ['kid', 'adult']) withGenders('thought', lang, th.text[tier][lang]);
  for (const ex of EXERCISES) for (const tier of ['kid', 'adult']) { const [title, steps] = ex.text[lang][tier]; add('exercise', lang, title); for (const s of steps) withGenders('exercise', lang, s); }
}
const list = [...out.values()].sort((a, b) => a.lang.localeCompare(b.lang) || a.group.localeCompare(b.group) || a.text.localeCompare(b.text));
mkdirSync('voices', { recursive: true }); writeFileSync('voices/phrases.json', JSON.stringify({ version: 1, count: list.length, phrases: list }, null, 1));
const by = {}; for (const p of list) { by[`${p.lang}/${p.group}`] = (by[`${p.lang}/${p.group}`] || 0) + 1; }
const chars = list.reduce((s, p) => s + p.text.length, 0);
console.log(`${list.length} phrases, ${chars} characters`); console.log(by);
console.log('sha', createHash('sha1').update(JSON.stringify(list.map((p) => p.id))).digest('hex').slice(0, 8));

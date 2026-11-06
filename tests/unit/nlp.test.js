import test from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS, TOOL_IDS, isTool, keys, flagWords, composeNote } from '../../web/js/nlpTools.js';
import { STR } from '../../web/js/i18n.js';
import { SPECIAL, HELPER_IDS } from '../../web/js/specialTasks.js';
import { MODELS, visibleSet, shows, isFull } from '../../web/js/needs.js';

test('NLP tools: every tool and every step has its text in both languages; texts never claim results', () => {
  for (const l of ['en', 'he']) for (const id of TOOL_IDS) {
    assert.ok(STR[l][`nlp_${id}`] && STR[l][`nlpd_${id}`], `${l} ${id}`);
    for (const s of TOOLS[id].steps) { const k = keys(id, s.id); assert.ok(STR[l][k.q], `${l} ${k.q}`); if (s.type === 'text' || s.type === 'pause') assert.ok(STR[l][k.h], `${l} ${k.h}`); if (s.type === 'pause') assert.ok(s.sec >= 5 && s.sec <= 120); }
    assert.ok(STR[l].nlpEvidence && STR[l].nlpNotTherapy);
  }
  assert.ok(isTool('anchor') && !isTool('__proto__') && !isTool('constructor') && !isTool(5));
});
test('precise words: absolute / must / can\'t words are flagged in English and Hebrew, once each, in order', () => {
  const en = flagWords("I always fail and I can't do it, everyone knows I should stop. Always!", 'en'); assert.deepEqual(en.map((x) => x.word), ['always', "can't", 'everyone', 'should']); assert.equal(en[0].kind, 'all'); assert.equal(en[1].kind, 'cant'); assert.equal(en[3].kind, 'must');
  const he = flagWords('אני תמיד נכשל, אני לא יכול, כולם יודעים שאני חייב להפסיק', 'he'); assert.deepEqual(he.map((x) => x.word), ['תמיד', 'לא יכול', 'כולם', 'חייב']);
  assert.deepEqual(flagWords('I want a cup of tea', 'en'), []); assert.deepEqual(flagWords('', 'he'), []); assert.deepEqual(flagWords(null, 'en'), []);
  assert.deepEqual(flagWords('alwaysly nevertheless', 'en'), [], 'whole words only');
});
test('the note for the journal: only answered steps, with the tool name, capped', () => {
  const t = (k) => STR.en[k];
  assert.equal(composeNote('nope', {}, t), ''); assert.equal(composeNote('reframe', {}, t), '');
  const n = composeNote('reframe', { what: 'A bad day', new: '  It was hard, and I got through it ' }, t); assert.ok(n.startsWith(t('nlp_reframe'))); assert.ok(n.includes('A bad day') && n.includes('I got through it')); assert.equal(n.split('\n').length, 3);
  assert.ok(composeNote('outcome', { want: 'x'.repeat(9000) }, t).length <= 3900);
});
test('NLP as a method: a choice in "what the app is for" that shows its tools, plus a special-task group', () => {
  assert.ok(MODELS.includes('nlp')); const set = visibleSet({ model: 'nlp', problems: [] }); assert.ok(set.has('nlp') && set.has('calm') && set.has('goals') && set.has('journal'));
  assert.ok(!shows({ model: 'cbt', problems: [] }, 'nlp'), 'not shown to people who chose another method'); assert.ok(isFull({ model: 'full', problems: [] }) && shows({ model: 'full', problems: [] }, 'nlp'));
  for (const id of TOOL_IDS) { assert.ok(SPECIAL.some((x) => x.helper === id && x.group === 'nlp' && x.feat === 'nlp'), `special task for ${id}`); assert.ok(HELPER_IDS.includes(id)); }
});

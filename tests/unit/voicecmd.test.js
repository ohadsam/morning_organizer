import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS, COMMAND_IDS, parseCommand, norm, helpList, dedupe } from '../../web/js/voiceCommands.js';
import { STR } from '../../web/js/i18n.js';

const he = (s) => parseCommand(s, 'he')?.id ?? null, en = (s) => parseCommand(s, 'en')?.id ?? null;
test('Hebrew commands: the listed ways to say each one', () => {
  assert.equal(he('סיימתי'), 'done'); assert.equal(he('סיימתי!'), 'done'); assert.equal(he('בבקשה תוספת זמן'), 'addTime'); assert.equal(he('עוד דקה'), 'addTime'); assert.equal(he('השהה'), 'pause'); assert.equal(he('המשך'), 'resume');
  assert.equal(he('דלג'), 'skip'); assert.equal(he('עצור'), 'stop'); assert.equal(he('יומן'), 'journal'); assert.equal(he('פינת הרוגע'), 'calm'); assert.equal(he('הזכר לי את השלב'), 'remind'); assert.equal(he('כמה זמן נשאר'), 'timeLeft'); assert.equal(he('כן'), 'yes'); assert.equal(he('לא'), 'no');
  assert.equal(he([...'סיימתי'].join('\u05B4')), 'done', 'vowel points are ignored');
});
test('English commands', () => {
  assert.equal(en('done'), 'done'); assert.equal(en('I am done'), 'done'); assert.equal(en('add time'), 'addTime'); assert.equal(en('one more minute'), 'addTime'); assert.equal(en('pause'), 'pause'); assert.equal(en('resume'), 'resume'); assert.equal(en('skip it'), 'skip');
  assert.equal(en('stop the routine'), 'stop'); assert.equal(en('stop'), 'stop'); assert.equal(en('journal'), 'journal'); assert.equal(en('calm corner'), 'calm'); assert.equal(en('remind me the step'), 'remind'); assert.equal(en('how much time is left'), 'timeLeft'); assert.equal(en('yes'), 'yes');
});
test('strict: ordinary talking does not press buttons; the longest phrase wins; wrong language does not match', () => {
  assert.equal(he('אני חושב שסיימתי לשים את הנעליים כבר הבוקר'), null, 'long sentences are ignored'); assert.equal(en('I think the next bus is late today'), null); assert.equal(he('מה שלומך'), null); assert.equal(he(''), null); assert.equal(he('   '), null);
  assert.equal(he('עצור שגרה'), 'stop'); assert.equal(en('stop the routine'), 'stop'); assert.equal(he('done'), null, 'English words are not Hebrew commands'); assert.equal(en('סיימתי'), null);
  assert.equal(he('הפסקה'), 'pause'); assert.equal(norm(' Hello,   World! '), 'hello world');
});
test('the command table: every command has phrases in both languages and a label in both languages; help list; dedupe', () => {
  for (const c of COMMANDS) { assert.ok(c.phrases.he.length >= 2 && c.phrases.en.length >= 2, c.id); assert.ok(STR.en[`vc_${c.id}`] && STR.he[`vc_${c.id}`], `label vc_${c.id}`); }
  assert.equal(new Set(COMMAND_IDS).size, COMMAND_IDS.length); assert.ok(helpList('he').every((x) => x.examples.length >= 2) && !helpList('en').some((x) => x.id === 'yes'));
  const d = dedupe(1000); assert.equal(d('done', 0), true); assert.equal(d('done', 500), false); assert.equal(d('pause', 600), true); assert.equal(d('done', 2000), true);
});

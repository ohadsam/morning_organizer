import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cueStyle, leaveCuePattern } from '../../web/js/leave.js';
test('the leave cue follows the way the person works: a difficulty first, then the model, soft for anxiety and short for attention', () => {
  assert.equal(cueStyle(null), 'default'); assert.equal(cueStyle({ model: 'full', problems: [] }), 'default'); assert.equal(cueStyle({ model: 'cbt', problems: [] }), 'cbt'); assert.equal(cueStyle({ model: 'nlp', problems: ['organize'] }), 'nlp');
  assert.equal(cueStyle({ model: 'cbt', problems: ['adhd', 'anxiety'] }), 'anxiety', 'a calm cue wins when anxiety is chosen'); assert.equal(cueStyle({ model: 'cogfun', problems: ['adhd'] }), 'adhd');
  for (const v of [null, { model: 'cbt' }, { problems: ['anxiety'] }, { problems: ['adhd'] }, { model: 'cogfun' }, { model: 'nlp' }]) for (const e of ['leaveSoon', 'leaveNow']) { const p = leaveCuePattern(e, v); assert.ok(p.beeps.length && p.vib.length, `${e} ${JSON.stringify(v)}`); for (const [f, off, d] of p.beeps) assert.ok(f >= 400 && f <= 2000 && off >= 0 && d > 0 && d <= 1.2); }
  assert.ok(leaveCuePattern('leaveNow', { problems: ['anxiety'] }).beeps[0][0] < leaveCuePattern('leaveNow', { problems: ['adhd'] }).beeps[0][0], 'the calm cue is lower than the attention cue');
  assert.equal(leaveCuePattern('other', null), null);
});

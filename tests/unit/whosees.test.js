import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whoSees } from '../../web/js/whoSees.js';

const P = [{ id: 'a', name: 'Dana' }, { id: 'b', name: 'Ron' }, { id: 'c', name: '' }];
test('nothing to explain with one person; no owners means everyone; owners name the people', () => {
  assert.equal(whoSees({ owners: [] }, [P[0]]), null); assert.equal(whoSees({}, null), null);
  assert.deepEqual(whoSees({ owners: [] }, P), { kind: 'all' }); assert.deepEqual(whoSees({}, P), { kind: 'all' });
  assert.deepEqual(whoSees({ owners: ['a', 'b'] }, P), { kind: 'some', names: ['Dana', 'Ron'] }); assert.deepEqual(whoSees({ owners: ['c'] }, P), { kind: 'some', names: ['—'] });
  assert.deepEqual(whoSees({ owners: ['gone'] }, P), { kind: 'all' }, 'an owner that no longer exists does not hide the routine');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretUpdate } from '../../web/js/appUpdate.js';

test('the answer of the native update check is read strictly', () => {
  assert.deepEqual(interpretUpdate({ type: 'update', ok: true, latest: '1.50.0', newer: true, current: '1.49.1' }), { state: 'new', latest: '1.50.0', current: '1.49.1' });
  assert.deepEqual(interpretUpdate({ ok: true, latest: '1.49.1', newer: false, current: '1.49.1' }), { state: 'latest', latest: '1.49.1', current: '1.49.1' });
  for (const bad of [null, undefined, {}, { ok: false }, { ok: true }, { ok: true, latest: 'x', newer: true }, { ok: 'true', latest: '1.0.0', newer: true }, { ok: true, latest: '<img>', newer: true }]) assert.equal(interpretUpdate(bad).state, 'fail', JSON.stringify(bad));
  assert.equal(interpretUpdate({ ok: true, latest: '1.50.0', newer: 'yes', current: '1.49.1' }).state, 'latest', 'only a real true means newer');
  assert.equal(interpretUpdate({ ok: true, latest: '1.50.0', newer: true, current: '<b>' }).current, '', 'an odd current version is dropped');
});

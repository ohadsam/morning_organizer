import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekBalance, balanceStep } from '../../web/js/balance.js';

const NOW = new Date(2026, 10, 12, 12).getTime(), DAY = 86_400_000;
test('only the last 7 days count: finished runs against check-ins and look-backs', () => {
  const runs = [{ status: 'done', endedAt: NOW - DAY }, { status: 'done', endedAt: NOW - 3 * DAY }, { status: 'stopped', endedAt: NOW - DAY }, { status: 'done', endedAt: NOW - 9 * DAY }];
  const b = weekBalance(runs, [{ at: NOW - 2 * DAY }, { at: NOW - 20 * DAY }], [{ at: NOW - DAY }], NOW);
  assert.deepEqual(b, { doing: 2, care: 2 });
  assert.deepEqual(weekBalance(null, undefined, [], NOW), { doing: 0, care: 0 });
});
test('the seesaw: level when equal or empty, tilted towards what weighs more', () => {
  assert.equal(balanceStep(0, 0), 2); assert.equal(balanceStep(3, 3), 2); assert.equal(balanceStep(5, 0), 0); assert.equal(balanceStep(0, 5), 4);
  assert.equal(balanceStep(3, 1), 1); assert.equal(balanceStep(1, 3), 3); assert.equal(balanceStep(-4, 'x'), 2);
});

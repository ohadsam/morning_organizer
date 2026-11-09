import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickNow } from '../../web/js/nowPick.js';

const at = (h, m = 0) => new Date(2026, 10, 9, h, m).getTime();   // Monday 9 Nov 2026
const tpl = (id, extra = {}) => ({ id, name: id, tasks: [{ id: 't', name: 't', sec: 60 }], days: [], alarm: { enabled: false, time: '07:00' }, ...extra });
test('nothing to offer without a routine that has steps', () => { assert.equal(pickNow([], [], at(8)), null); assert.equal(pickNow([{ id: 'x', tasks: [] }], [], at(8)), null); assert.equal(pickNow(null, null, at(8)), null); });
test('the routine whose alarm is next wins, one that started up to 90 minutes ago still counts', () => {
  const list = [tpl('evening', { alarm: { enabled: true, time: '20:00' } }), tpl('morning', { alarm: { enabled: true, time: '07:30' } }), tpl('plain')];
  assert.deepEqual([pickNow(list, [], at(7)).template.id, pickNow(list, [], at(7)).why], ['morning', 'alarm']);
  assert.equal(pickNow(list, [], at(8, 30)).template.id, 'morning', 'started an hour ago: still the one');
  assert.equal(pickNow(list, [], at(10)).template.id, 'evening');
});
test('a routine finished today is not offered again; days of the week are respected; favourites come first among the rest', () => {
  const list = [tpl('a', { days: [1] }), tpl('b', { days: [1], favorite: true }), tpl('sat', { days: [6] })];
  assert.deepEqual([pickNow(list, [], at(9)).template.id, pickNow(list, [], at(9)).why], ['b', 'today']);
  const doneB = [{ templateId: 'b', status: 'done', endedAt: at(8) }]; assert.equal(pickNow(list, doneB, at(9)).template.id, 'a');
  const doneAll = [...doneB, { templateId: 'a', status: 'done', endedAt: at(8) }]; const p = pickNow(list, doneAll, at(9)); assert.ok(['favorite', 'any'].includes(p.why)); assert.ok(p.template);
});

test('the one after it is offered too, in the same order (for a small "next" line)', () => {
  const list = [tpl('evening', { alarm: { enabled: true, time: '20:00' } }), tpl('morning', { alarm: { enabled: true, time: '07:30' } }), tpl('plain')];
  const p = pickNow(list, [], at(7)); assert.equal(p.template.id, 'morning'); assert.equal(p.after.id, 'evening');
  assert.equal(pickNow([tpl('only')], [], at(7)).after, null);
});

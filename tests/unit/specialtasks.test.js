import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIAL, GROUPS, HELPER_IDS, pickable, toTask, nameKey, groupKey, isHelper } from '../../web/js/specialTasks.js';
import { STR } from '../../web/js/i18n.js';
import { normalizeTemplate, newTemplate } from '../../web/js/store.js';

test('special tasks: unique ids, every one has a name and group label in both languages and a tool label when it opens one', () => {
  assert.equal(new Set(SPECIAL.map((x) => x.id)).size, SPECIAL.length);
  for (const l of ['en', 'he']) {
    for (const x of SPECIAL) { assert.ok(STR[l][nameKey(x.id)], `${l} ${x.id}`); if (x.helper) assert.ok(STR[l][`helper_${x.helper}`], `${l} helper_${x.helper}`); assert.ok(GROUPS.includes(x.group)); }
    for (const g of GROUPS) assert.ok(STR[l][groupKey(g)], `${l} group ${g}`);
  }
});
test('special tasks: search by name or topic, hidden features are left out, a task keeps its tool through the store', () => {
  const t = (k) => STR.en[k];
  assert.ok(pickable({ t, q: 'journal' }).some((x) => x.id === 'journal'));
  assert.ok(pickable({ t, q: 'calm' }).every((x) => x.group === 'calm' || t(nameKey(x.id)).toLowerCase().includes('calm')));
  assert.ok(!pickable({ t, has: (f) => f !== 'journal' }).some((x) => x.feat === 'journal'));
  assert.equal(pickable({ t, group: 'body' }).every((x) => x.group === 'body'), true);
  const task = toTask('park', t); assert.equal(task.helper, 'park'); assert.equal(toTask('nope', t), null);
  const tpl = newTemplate('x'); tpl.tasks = [{ id: 'a', name: 'A', sec: 60, helper: 'scan' }, { id: 'b', name: 'B', sec: 60, helper: 'rm -rf' }];
  const out = normalizeTemplate(tpl); assert.equal(out.tasks[0].helper, 'scan'); assert.equal(out.tasks[1].helper, '', 'unknown tools are dropped');
  assert.ok(HELPER_IDS.every(isHelper) && !isHelper('__proto__'));
});

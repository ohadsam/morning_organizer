import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExport, parseFile, prepare, toJson, FORMAT, MAX_ROUTINES } from '../../web/js/routineIO.js';
import { normalizeTemplate, newTemplate, canSee } from '../../web/js/store.js';

const mk = (name, extra = {}) => { const t = newTemplate(name); t.tasks = [{ id: 'a', name: 'Wash', sec: 60, helper: 'scan' }, { id: 'b', name: 'Eat', sec: 120 }]; t.alarm.enabled = true; return { ...t, ...extra }; };

test('export: no ids, owners or favourite flag; the tool of a special task and the gear travel; round trip through the strict reader', () => {
  const t = mk('Morning', { owners: ['p1'], favorite: true, gear: [{ id: 'g', name: 'Bag', icon: '🎒', days: [] }] });
  const data = buildExport([t], 5); assert.equal(data.app, FORMAT); assert.equal(data.routines[0].id, undefined); assert.equal(data.routines[0].owners, undefined); assert.equal(data.routines[0].favorite, undefined);
  const back = parseFile(toJson(data)); assert.equal(back.routines.length, 1);
  const copy = prepare(back.routines[0], normalizeTemplate); assert.equal(copy.name, 'Morning'); assert.equal(copy.tasks[0].helper, 'scan'); assert.equal(copy.gear[0].name, 'Bag');
  assert.notEqual(copy.id, t.id); assert.notEqual(copy.tasks[0].id, 'a'); assert.equal(copy.alarm.enabled, false, 'an imported routine never rings by itself'); assert.equal(copy.builtin, false);
});
test('import: bad or hostile files are refused; unknown fields are dropped; oversized lists are cut; a full backup also works', () => {
  for (const bad of ['', 'nope', '[]', '{}', '{"app":"sonrise-routines","routines":[]}', '{"app":"sonrise-routines","routines":[{"tasks":[]}]}', '{"app":"x","routines":[{"tasks":[{}]}]}']) assert.throws(() => parseFile(bad), /bad-file/, bad);
  assert.throws(() => parseFile('x'.repeat(5_000_001)), /bad-file/);
  const evil = { app: FORMAT, routines: [{ name: '<img onerror=x>', tasks: [{ name: 'A', sec: 9, helper: 'rm', evil: 1 }], __proto__: { polluted: 1 }, owners: ['x'] }] };
  const c = prepare(parseFile(JSON.stringify(evil)).routines[0], normalizeTemplate, { owners: ['p2'] });
  assert.equal(c.evil, undefined); assert.equal(c.tasks[0].helper, ''); assert.deepEqual(c.owners, ['p2']); assert.equal({}.polluted, undefined);
  const many = { app: FORMAT, routines: Array.from({ length: MAX_ROUTINES + 20 }, (_, i) => ({ name: `r${i}`, tasks: [{ name: 'a', sec: 1 }] })) };
  assert.equal(parseFile(JSON.stringify(many)).routines.length, MAX_ROUTINES);
  const backup = { app: 'morning-organizer', v: 1, templates: [mk('B')] }; assert.equal(parseFile(JSON.stringify(backup)).routines.length, 1);
});
test('who sees a routine: empty = everyone; a list = only those people; owners are cleaned', () => {
  const all = normalizeTemplate(mk('A')); assert.deepEqual(all.owners, []); assert.ok(canSee(all, 'p1') && canSee(all, 'p2'));
  const some = normalizeTemplate(mk('B', { owners: ['p1', 'p1', 5, '', null, 'p3'] })); assert.deepEqual(some.owners, ['p1', 'p3']); assert.ok(canSee(some, 'p1')); assert.ok(!canSee(some, 'p2'));
  assert.deepEqual(normalizeTemplate(mk('C', { owners: 'p1' })).owners, []);
});

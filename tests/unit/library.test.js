import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../web/js/library.js';
import * as S from '../../web/js/store.js';

test('library sanitising: hostile entries, caps, duplicate ids, merge and upsert', () => {
  const lib = L.sanitizeLibrary({ routines: [{ id: 'a', name: 'R', tasks: [{ name: 'x'.repeat(200), sec: -5 }, null, { name: '' }], color: 'url(x)', plans: [{ when: 'a' }] }, { id: 'a', name: 'dup' }, 5, { name: '' }], tasks: [{ id: 't', name: 'T', sec: 1e12, photo: 'javascript:alert(1)' }, ...Array(400).fill(0).map((_, i) => ({ id: `t${i}`, name: 'n' }))] });
  assert.equal(lib.routines.length, 1); assert.equal(lib.routines[0].tasks.length, 1); assert.equal(lib.routines[0].tasks[0].name.length, 80); assert.equal(lib.routines[0].tasks[0].sec, 1); assert.equal(lib.routines[0].color, '#6c5ce7'); assert.equal(lib.routines[0].plans.length, 0);
  assert.equal(lib.tasks.length, L.MAX_TASKS); assert.equal(lib.tasks[0].sec, 86400); assert.equal(lib.tasks[0].photo, '');
  assert.deepEqual(L.sanitizeLibrary(null), { routines: [], tasks: [] });
  const m = L.mergeLibrary({ routines: [], tasks: [{ id: 'k', name: 'old', createdAt: 1, sec: 60, est: 0, icon: '', photo: '' }] }, { routines: [], tasks: [{ id: 'k', name: 'new', createdAt: 2, sec: 60, est: 0, icon: '', photo: '' }, { id: 'j', name: 'j', createdAt: 1, sec: 60, est: 0, icon: '', photo: '' }] });
  assert.deepEqual(m.tasks.map((x) => x.name).sort(), ['j', 'new']);
  const up = L.upsert(m.tasks, L.taskEntry({ name: 'NEW', sec: 99 }), 10); assert.equal(up.length, 2); assert.equal(up.find((x) => x.name === 'NEW').sec, 99);
});
test('ideas are well-formed and every idea key exists in both languages', async () => {
  const { STR } = await import('../../web/js/i18n.js');
  for (const i of L.IDEA_TASKS) { assert.ok(i.key in STR.en && i.key in STR.he, i.key); assert.ok(L.CATS.includes(i.cat) && i.sec > 0); }
  for (const r of L.IDEA_ROUTINES) { assert.ok(r.nameKey in STR.en); for (const [k, min] of r.items) assert.ok(k in STR.he && min > 0); }
});
test('store: save task/routine templates, create from them, undo delete, backup + restore carry the library', async () => {
  await S.init(); await S.addSamples(true);
  const tpl = S.get().templates.find((x) => x.id === 'sample-kids');
  assert.ok(await S.saveToLibrary('routine', tpl)); assert.ok(await S.saveToLibrary('task', { name: 'Feed fish', icon: '🐟', sec: 90 })); assert.equal(await S.saveToLibrary('task', { name: '' }), null);
  assert.ok(await S.saveToLibrary('task', { name: 'feed FISH', sec: 120 })); assert.equal(S.library().tasks.length, 1); assert.equal(S.library().tasks[0].sec, 120);
  const made = await S.createFromEntry(S.library().routines[0], 'Copy'); assert.notEqual(made.id, tpl.id); assert.equal(made.tasks.length, tpl.tasks.length); assert.notEqual(made.tasks[0].id, tpl.tasks[0].id); assert.equal(made.alarm.enabled, true);
  const json = S.exportAll(), parsed = JSON.parse(json); assert.equal(parsed.library.tasks.length, 1);
  const undo = await S.removeLibraryItem('task', S.library().tasks[0].id); assert.equal(S.library().tasks.length, 0); await undo(); assert.equal(S.library().tasks.length, 1);
  await S.removeLibraryItem('task', S.library().tasks[0].id); const r = await S.importBackup(json, { mode: 'merge', settings: false }); assert.equal(S.library().tasks.length, 1); assert.ok(r.library >= 1);
  await S.importBackup(JSON.stringify({ ...parsed, library: { routines: [], tasks: [{ id: 'z', name: 'Only' }] } }), { mode: 'replace', settings: false }); assert.deepEqual(S.library().tasks.map((x) => x.name), ['Only']); assert.equal(S.library().routines.length, 0);
});

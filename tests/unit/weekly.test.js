import test from 'node:test';
import assert from 'node:assert/strict';
import { heatmap, weeklyReport, toCsv, dayKey } from '../../web/js/weekly.js';
import * as S from '../../web/js/store.js';

const at = (y, m, d, h = 9) => new Date(y, m, d, h).getTime();
const run = (end, status = 'done', planned = 100, actual = 90, name = 'Morning') => ({ id: `r${end}`, templateId: 't', templateName: name, startedAt: end - 120_000, endedAt: end, status, plannedTotal: planned, estTotal: planned, actualTotal: actual, pausedMs: 30_000,
  tasks: [{ done: status === 'done' }, { done: true }] });
const NOW = at(2026, 10, 4, 12); // Wed 4 Nov 2026

test('heatmap: 5 calendar weeks, Sunday first, today inside the last row, future days flagged, counts per day', () => {
  const cells = heatmap([run(at(2026, 10, 4)), run(at(2026, 10, 4, 10)), run(at(2026, 10, 2)), run(at(2026, 9, 1)), run(at(2026, 5, 1))], NOW, 5);
  assert.equal(cells.length, 35); assert.equal(new Date(cells[0].ms).getDay(), 0);
  const today = cells.find((c) => c.key === dayKey(NOW)); assert.equal(today.count, 2); assert.equal(today.future, false);
  assert.equal(cells.find((c) => c.key === '2026-11-02').count, 1); assert.equal(cells.find((c) => c.key === '2026-11-05').future, true);
  assert.equal(cells.reduce((s, c) => s + c.count, 0), 3, 'runs before the 5-week window (Oct 1, Jun 1) are not counted'); assert.ok(cells.at(-1).future);
});
test('weeklyReport: this week vs last week, active days, on-time, trend', () => {
  const runs = [run(at(2026, 10, 4), 'done', 100, 80), run(at(2026, 10, 3), 'done', 100, 120), run(at(2026, 10, 3, 18), 'stopped', 100, 50), run(at(2026, 9, 30), 'done', 100, 200), run(at(2026, 9, 20), 'done', 100, 100)];
  const w = weeklyReport(runs, NOW);
  assert.equal(w.runs, 4); assert.equal(w.done, 3); assert.equal(w.onTime, 1); assert.equal(w.activeDays, 3); assert.equal(w.days.length, 7);
  assert.equal(w.days.at(-1).count, 1); assert.equal(w.prev.runs, 0); assert.equal(w.deltaAvgSec, null);
  const w2 = weeklyReport([...runs, run(at(2026, 9, 25), 'done', 100, 300)], NOW); assert.equal(w2.prev.runs, 1); assert.equal(w2.deltaAvgSec, 113 - 300, 'this week averages 112.5 s (rounded 113), last week 300 s');
  assert.deepEqual(weeklyReport([], NOW).days.map((d) => d.count), [0, 0, 0, 0, 0, 0, 0]);
});
test('CSV: header, BOM, Hebrew, quoting, formula-injection neutralised, only finished runs', () => {
  const csv = toCsv([run(at(2026, 10, 4), 'done', 100, 90, 'בוקר, "טוב"'), run(at(2026, 10, 3), 'stopped', 100, 40, '=HYPERLINK("http://evil")'), { ...run(at(2026, 10, 2)), endedAt: null }, run(at(2026, 10, 1), 'done', 100, 90, '+cmd|x')]);
  const lines = csv.replace(/^﻿/, '').trim().split('\r\n');
  assert.ok(csv.startsWith('﻿')); assert.equal(lines.length, 4); assert.match(lines[0], /^date,start,end,routine,status,planned_sec/);
  assert.ok(lines[3].includes('"בוקר, ""טוב"""')); assert.ok(csv.includes(`"'=HYPERLINK(""http://evil"")"`)); assert.ok(lines.some((l) => l.includes("'+cmd|x")));
  assert.ok(!lines.some((l) => /,=HYPERLINK|,\+cmd/.test(l)), 'no cell starts with a formula character');
  assert.match(lines[1], /,done,100,100,90,30,3,2,2,0,0$/);
});
test('sample routines: all six have fixed ids, valid tasks and never duplicate; undo restores a deleted routine exactly', async () => {
  await S.init(); await S.addSamples(true); await S.addSamples(true);
  const ids = S.get().templates.map((x) => x.id).filter((i) => i.startsWith('sample-')).sort();
  assert.deepEqual(ids, ['sample-adult', 'sample-afterschool', 'sample-bedtime', 'sample-evening', 'sample-homework', 'sample-kids']);
  for (const x of S.get().templates) { assert.ok(x.tasks.length >= 4); assert.ok(x.tasks.every((k) => k.name && k.sec >= 60 && k.icon)); }
  const before = structuredClone(S.getTemplate('sample-bedtime')), undo = await S.deleteWithUndo('sample-bedtime');
  assert.equal(S.getTemplate('sample-bedtime'), undefined); await undo(); assert.deepEqual(S.getTemplate('sample-bedtime'), before);
  const noop = await S.deleteWithUndo('does-not-exist'); await noop();
});

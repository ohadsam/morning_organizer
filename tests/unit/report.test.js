import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../../web/js/report.js';
import * as D from '../../web/js/difficulty.js';
import * as E from '../../web/js/engine.js';

const DAY = 86_400_000, now = 100 * DAY;
const mk = (i, over = 0, diff = 0, unp = [], tpl = 't') => ({ id: `r${i}`, templateId: tpl, templateName: tpl === 't' ? 'Morning' : 'Evening', icon: '🌅', startedAt: now - (30 - i) * DAY, endedAt: now - (30 - i) * DAY + 600_000, status: 'done', plannedTotal: 600, estTotal: 600, actualTotal: 600 + over, pausedMs: 0, unplanned: unp,
  tasks: [{ id: 'a', name: 'Dress', icon: '👕', plannedSec: 300, actualSec: 300 + over, done: true, difficulty: diff, help: { note: diff ? 1 : 0, thought: 0, relax: 0 } }, { id: 'b', name: 'Eat', icon: '🥣', plannedSec: 300, actualSec: 300, done: true, difficulty: 2, help: { note: 0, thought: 0, relax: 0 } }] });

test('engine: difficulty toggles and help counters are bounded', () => {
  const run = E.createRun({ id: 't', name: 'x', icon: '', color: '#6c5ce7', tasks: [{ id: 'a', name: 'A', sec: 60 }] }, 0);
  E.setDifficulty(run, 0, 4); assert.equal(run.tasks[0].difficulty, 4); E.setDifficulty(run, 0, 4); assert.equal(run.tasks[0].difficulty, 0); E.setDifficulty(run, 0, 99); assert.equal(run.tasks[0].difficulty, 0);
  for (let i = 0; i < 150; i++) E.noteHelp(run, 0, 'relax'); E.noteHelp(run, 0, '__proto__'); assert.equal(run.tasks[0].help.relax, 99);
});
test('difficulty statistics: hard spots, hard-and-slow, summary, per run', () => {
  const runs = [mk(1, 90, 5), mk(2, 80, 4), mk(3, 0, 2), mk(4, 100, 5)];
  const s = D.taskDifficulty(runs); assert.equal(s[0].name, 'Dress'); assert.equal(s[0].rated, 4); assert.ok(s[0].avg > 3.5); assert.equal(s[0].hard, 3);
  assert.equal(D.hardSpots(s)[0].name, 'Dress'); assert.equal(D.hardAndSlow(s)[0].name, 'Dress'); assert.equal(D.hardSpots(s).some((x) => x.name === 'Eat'), false);
  const sum = D.summary(runs); assert.equal(sum.rated, 8); assert.equal(sum.help.note, 4); assert.equal(sum.byRoutine.length, 1);
  assert.equal(D.runDifficulty(runs[0]).hardest.name, 'Dress'); assert.equal(D.runDifficulty({ tasks: [] }).rated, 0);
});
test('period report: kpis, insights, routine filter, empty period', () => {
  const runs = [1, 2, 3, 4, 5, 6].map((i) => mk(i, i <= 3 ? 90 : 0, i <= 4 ? 5 : 2, i === 2 || i === 3 || i === 5 ? [{ key: 'toilet', label: 'Toilet', emoji: '🚽', sec: 90, at: 1, task: 'Dress' }] : [])).concat([mk(7, 0, 3, [], 'e')]);
  const m = R.buildReport({ runs, templates: [], scope: { kind: 'period', days: 0 }, now });
  assert.equal(m.kpis.runs, 7); assert.ok(m.byRoutine.length === 2); assert.equal(m.kpis.unplannedCount, 3);
  const keys = m.insights.map((i) => i.key); assert.ok(keys.includes('rpOnTimeUp')); assert.ok(keys.includes('rpHardTask')); assert.ok(keys.includes('rpUnplanned')); assert.ok(keys.includes('rpHelpUsed'));
  assert.equal(R.buildReport({ runs, scope: { kind: 'period', days: 0, templateId: 'e' }, now }).kpis.runs, 1);
  assert.equal(R.buildReport({ runs, scope: { kind: 'period', days: 7 }, now: now + 400 * DAY }).empty, true);
  const text = R.reportText(m, (k, p) => `${k}:${JSON.stringify(p || {})}`, (s) => `${s}s`); assert.match(text, /rpRuns/); assert.match(text, /rpHardTask/);
});
test('run report: per-task rows, insights, unknown run', () => {
  const r = mk(1, 90, 5, [{ key: 'spill', label: 'Spill', emoji: '🥛', sec: 60, at: 1, task: 'Dress' }]);
  const m = R.buildReport({ runs: [r], scope: { kind: 'run', runId: 'r1' }, now });
  assert.equal(m.kpis.deltaSec, 90); assert.equal(m.tasks.length, 2); assert.equal(m.tasks[0].difficulty, 5); const keys = m.insights.map((i) => i.key);
  assert.ok(keys.includes('rpRunOver') && keys.includes('rpRunSlowest') && keys.includes('rpRunHardest') && keys.includes('rpRunUnplanned'));
  assert.equal(R.buildReport({ runs: [r], scope: { kind: 'run', runId: 'nope' }, now }).empty, true);
});

import * as TH from '../../web/js/thoughts.js';
test('kind thoughts and relaxation: age-tiered, varied, no repeat until all shown, difficulty-aware, both languages', () => {
  let i = 7; const rnd = () => ((i = (i * 1103515245 + 12345) % 2147483648) / 2147483648);
  const seen = new Set(), got = []; for (let n = 0; n < TH.THOUGHTS.length; n++) got.push(TH.pickThought({ lang: 'en', age: 8, seen, rnd }).id);
  assert.equal(new Set(got).size, TH.THOUGHTS.length);                        // every thought once before any repeat
  assert.notEqual(TH.pickThought({ lang: 'en', age: 8, seen, rnd }).id, undefined);   // and it starts over afterwards
  assert.notEqual(TH.pickThought({ lang: 'en', age: 8, rnd: () => 0 }).text, TH.pickThought({ lang: 'en', age: 40, rnd: () => 0 }).text);  // kid vs adult wording
  assert.ok(/[א-ת]/.test(TH.pickThought({ lang: 'he', age: 30, rnd }).text));
  let hardKinds = 0, easyKinds = 0; for (let n = 0; n < 300; n++) { if (['kind', 'reframe'].includes(TH.pickThought({ difficulty: 5, rnd }).kind)) hardKinds++; if (['kind', 'reframe'].includes(TH.pickThought({ difficulty: 1, rnd }).kind)) easyKinds++; }
  assert.ok(hardKinds > easyKinds, `${hardKinds} > ${easyKinds}`);
  const seenE = new Set(), ids = new Set(); for (let n = 0; n < TH.EXERCISES.length; n++) ids.add(TH.pickExercise({ lang: 'he', age: 9, seen: seenE, rnd }).id); assert.equal(ids.size, TH.EXERCISES.length);
  const x = TH.pickExercise({ lang: 'en', age: 30, rnd }); assert.ok(x.title && x.steps.length >= 2 && !x.steps.some((s) => /\{/.test(s)));
});

import { buildHtmlDocument, serializeNode, SCRIPT } from '../../web/js/reportHtml.js';
test('interactive html: serialiser escapes text/attributes and drops scripts/handlers; document is self-contained', () => {
  const fake = (name, attrs, kids) => ({ nodeType: 1, localName: name, attributes: Object.entries(attrs).map(([name2, value]) => ({ name: name2, value })), childNodes: kids });
  const txt = (v) => ({ nodeType: 3, nodeValue: v });
  const html = serializeNode(fake('div', { class: 'a"b', onclick: 'evil()', title: '<x>' }, [txt('<img src=x onerror=1> & "q"'), fake('script', {}, [txt('alert(1)')]), fake('i', { style: 'width:5%' }, []), fake('br', {}, [])]));
  assert.ok(!/onclick|<script|alert\(1\)/.test(html)); assert.ok(html.includes('&lt;img src=x onerror=1&gt; &amp; "q"')); assert.ok(html.includes('class="a&quot;b"')); assert.ok(html.includes('<i style="width:5%"></i>')); assert.ok(html.includes('<br>') && !html.includes('</br>'));
  const doc = buildHtmlDocument([{ label: '7', html: '<p>one</p>' }, { label: '30 <b>', html: '<p>two</p>' }], { title: 'T <x>', lang: 'he', dir: 'rtl', css: '.rpt{}', printLabel: 'Print' });
  assert.ok(doc.startsWith('<!doctype html>')); assert.ok(doc.includes('dir="rtl"')); assert.ok(doc.includes('<title>T &lt;x&gt;</title>')); assert.ok(doc.includes('30 &lt;b&gt;')); assert.equal((doc.match(/class="panel/g) || []).length, 2);
  assert.ok(!/https?:\/\//.test(doc), 'no external resources'); assert.ok(doc.includes(SCRIPT.slice(0, 40)));
  assert.doesNotThrow(() => new Function(SCRIPT));        // the embedded script is syntactically valid
});

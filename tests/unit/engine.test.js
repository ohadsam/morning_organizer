import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../web/js/engine.js';

const tpl = { id: 't', name: 'Morning', icon: '🌅', color: '#6c5ce7', tasks: [
  { id: 'a', name: 'A', sec: 60, est: 0 }, { id: 'b', name: 'B', sec: 120, est: 90 }, { id: 'c', name: 'C', sec: 30, est: 0 }] };
const T0 = 1_000_000;

test('createRun copies tasks, totals and starts first task', () => {
  const r = E.createRun(tpl, T0);
  assert.equal(r.plannedTotal, 210); assert.equal(r.estTotal, 60 + 90 + 30);
  assert.equal(r.tasks[0].startedAt, T0); assert.equal(r.status, 'running');
});
test('remaining counts down from timestamps and goes negative (overtime)', () => {
  const r = E.createRun(tpl, T0);
  assert.equal(E.remainingSec(r, T0 + 10_000), 50);
  assert.equal(E.remainingSec(r, T0 + 70_000), -10);
});
test('tick emits warn once at 10s left and end once at zero', () => {
  const r = E.createRun(tpl, T0);
  assert.deepEqual(E.tick(r, T0 + 49_000, 10), []);
  assert.deepEqual(E.tick(r, T0 + 50_500, 10), ['warn']);
  assert.deepEqual(E.tick(r, T0 + 52_000, 10), []);
  assert.deepEqual(E.tick(r, T0 + 60_000, 10), ['end']);
  assert.deepEqual(E.tick(r, T0 + 61_000, 10), []);
});
test('no warn when the task is not longer than the warn window', () => {
  const r = E.createRun({ ...tpl, tasks: [{ id: 'x', name: 'x', sec: 8, est: 0 }] }, T0);
  assert.deepEqual(E.tick(r, T0 + 1000, 10), []);
  assert.deepEqual(E.tick(r, T0 + 8000, 10), ['end']);
});
test('pause excludes paused time from the task', () => {
  const r = E.createRun(tpl, T0);
  E.pause(r, T0 + 20_000); E.resume(r, T0 + 120_000);
  assert.equal(Math.round(E.elapsedMs(r, 0, T0 + 130_000) / 1000), 30);
  assert.deepEqual(E.tick(E.pause(r, T0 + 130_000), T0 + 999_999), []); // paused: silent
});
test('addTime extends the remaining time and re-arms the end signal', () => {
  const r = E.createRun(tpl, T0);
  E.tick(r, T0 + 61_000); E.addTime(r, 60, T0 + 61_000);
  assert.ok(E.remainingSec(r, T0 + 61_000) > 0); assert.equal(r.tasks[0].plannedSec, 60); // planned figure untouched
  assert.deepEqual(E.tick(r, T0 + 125_000), ['end']);
});
test('complete advances, records actual seconds, and finishes the run', () => {
  let r = E.createRun(tpl, T0);
  r = E.completeCurrent(r, T0 + 50_000); assert.equal(r.current, 1); assert.equal(r.tasks[0].actualSec, 50);
  r = E.completeCurrent(r, T0 + 50_000 + 100_000); r = E.completeCurrent(r, T0 + 200_000);
  assert.equal(r.status, 'done'); assert.equal(r.actualTotal, 50 + 100 + 50);
  const s = E.summarize(r); assert.equal(s.deltaSec, 200 - 210); assert.equal(s.done, 3);
});
test('skip marks skipped and does not count as done', () => {
  let r = E.createRun(tpl, T0);
  r = E.skipCurrent(r, T0 + 5000); r = E.completeCurrent(r, T0 + 10_000); r = E.completeCurrent(r, T0 + 20_000);
  assert.equal(r.status, 'done'); assert.equal(E.summarize(r).skipped, 1);
});
test('ticking a future task checks it off; the run skips it afterwards', () => {
  let r = E.createRun(tpl, T0);
  r = E.toggleTask(r, 2, T0 + 1000); assert.equal(r.tasks[2].done, true);
  r = E.completeCurrent(r, T0 + 2000); r = E.completeCurrent(r, T0 + 3000);
  assert.equal(r.status, 'done'); assert.equal(r.tasks[2].actualSec, 0);
});
test('untick restores a task', () => {
  let r = E.createRun(tpl, T0); r = E.toggleTask(r, 1, T0); r = E.toggleTask(r, 1, T0);
  assert.equal(r.tasks[1].done, false);
});
test('finishing early marks status stopped and closes the current task', () => {
  const r = E.finish(E.createRun(tpl, T0), T0 + 30_000);
  assert.equal(r.status, 'stopped'); assert.equal(r.actualTotal, 30);
});
test('empty template finishes immediately', () => { assert.equal(E.createRun({ ...tpl, tasks: [] }, T0).status, 'done'); });

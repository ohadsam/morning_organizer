import test from 'node:test';
import assert from 'node:assert/strict';
import { leaveAtMs, leaveStatus, suggestStart, leaveEvent, newLeaveMemo, validLeaveBy } from '../../web/js/leave.js';
import { isSafePhoto } from '../../web/js/photo.js';
import { normalizeTemplate, newTemplate, sanitizeSettings } from '../../web/js/store.js';
import * as E from '../../web/js/engine.js';

test('validLeaveBy accepts only HH:MM', () => { assert.equal(validLeaveBy('07:45'), '07:45'); for (const bad of ['', '7:45', '25:00', '07:60', 'x', null]) assert.equal(validLeaveBy(bad), ''); });
test('leaveAtMs: same day, or tomorrow when the time is far in the past', () => {
  const start = new Date(2026, 10, 3, 7, 0).getTime();
  assert.equal(new Date(leaveAtMs('07:45', start)).getDate(), 3); assert.equal(new Date(leaveAtMs('07:45', start)).getHours(), 7);
  const late = new Date(2026, 10, 3, 22, 0).getTime(); assert.equal(new Date(leaveAtMs('07:45', late)).getDate(), 4); assert.equal(leaveAtMs('nope', start), null);
});
test('leaveStatus margin sign; suggestStart rounds down to 5 min and wraps midnight', () => {
  const start = new Date(2026, 10, 3, 7, 0).getTime(), leave = leaveAtMs('07:45', start);
  assert.equal(leaveStatus('07:45', start, leave - 240_000).marginSec, 240); assert.equal(leaveStatus('07:45', start, leave + 60_000).marginSec, -60); assert.equal(leaveStatus('', start, 0), null);
  assert.equal(suggestStart('07:45', 31 * 60), '07:10'); assert.equal(suggestStart('07:45', 31 * 60, { bufferMin: 5 }), '07:05'); assert.equal(suggestStart('00:10', 30 * 60), '23:40'); assert.equal(suggestStart('x', 60), null);
});
test('leaveEvent fires 10 min / 5 min / now, each once; skips the 10-min mark when already inside 5', () => {
  const at = 1_000_000_000, memo = newLeaveMemo(), ev = (s) => leaveEvent(at, at - s * 1000, memo);
  assert.equal(ev(700), null); assert.equal(ev(590), 'leaveSoon'); assert.equal(ev(500), null); assert.equal(ev(290), 'leaveSoon'); assert.equal(ev(100), null); assert.equal(ev(0), 'leaveNow'); assert.equal(ev(-5), null);
  const m2 = newLeaveMemo(); assert.equal(leaveEvent(at, at - 200_000, m2), 'leaveSoon'); assert.equal(leaveEvent(at, at - 100_000, m2), null); assert.equal(leaveEvent(null, 0, m2), null);
});
test('photo data-URL validation rejects scripts, other schemes and oversize', () => {
  assert.ok(isSafePhoto('data:image/jpeg;base64,/9j/4AAQ')); for (const bad of ['javascript:alert(1)', 'data:text/html;base64,AAAA', 'data:image/svg+xml;base64,AAAA', 'http://x/y.png', 'data:image/png;base64,' + 'A'.repeat(50_000), 5, null]) assert.ok(!isSafePhoto(bad), String(bad).slice(0, 30));
  const n = normalizeTemplate({ ...newTemplate('x'), leaveBy: '9:9', tasks: [{ name: 'a', sec: 5, photo: 'javascript:1' }, { name: 'b', sec: 5, photo: 'data:image/png;base64,AAAA' }] });
  assert.equal(n.leaveBy, ''); assert.equal(n.tasks[0].photo, ''); assert.equal(n.tasks[1].photo, 'data:image/png;base64,AAAA');
});
test('quick scale shortens in 5 s steps (min 5), keeps ids, records mode and leaveBy', () => {
  const tpl = { id: 't', name: 'n', icon: 'i', color: '#000000', leaveBy: '07:45', tasks: [{ id: 'a', name: 'A', sec: 300, est: 0 }, { id: 'b', name: 'B', sec: 7, est: 0 }, { id: 'c', name: 'C', sec: 125, est: 0 }] };
  const r = E.createRun(tpl, 0, { scale: 0.7, mode: 'quick' });
  assert.deepEqual(r.tasks.map((x) => x.plannedSec), [210, 5, 90]); assert.equal(r.plannedTotal, 305); assert.equal(r.mode, 'quick'); assert.equal(r.leaveBy, '07:45');
  assert.deepEqual(E.createRun(tpl, 0, { scale: 5 }).tasks.map((x) => x.plannedSec), [300, 7, 125], 'invalid scale ignored'); assert.equal(E.createRun(tpl, 0).mode, 'normal');
});
test('etaMs = now + remaining of current + planned of the rest', () => {
  const tpl = { id: 't', name: 'n', icon: 'i', color: '#000000', tasks: [{ id: 'a', name: 'A', sec: 60, est: 0 }, { id: 'b', name: 'B', sec: 120, est: 0 }] };
  const r = E.createRun(tpl, 0); assert.equal(E.etaMs(r, 20_000), 20_000 + 40_000 + 120_000); assert.equal(E.etaMs(r, 100_000), 100_000 + 120_000, 'overtime counts as zero remaining');
});
test('new settings are validated on import', () => {
  const s = sanitizeSettings({ paceMode: 'warp', contrast: 'high', fontScale: 130, colorSafe: true, srAnnounce: 'x', announceTasks: true });
  assert.equal(s.paceMode, undefined); assert.equal(s.contrast, 'high'); assert.equal(s.fontScale, 130); assert.equal(s.colorSafe, true); assert.equal(s.srAnnounce, undefined); assert.equal(s.announceTasks, true);
  assert.equal(sanitizeSettings({ fontScale: 999 }).fontScale, undefined);
});

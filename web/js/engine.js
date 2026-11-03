// Routine runner state machine. Pure: every function takes `now` (ms) so it is deterministic and testable.
// Timing is derived from timestamps, never from counting ticks, so throttled background timers can't drift it.
import { uid } from './util.js';

/** opts.scale < 1 gives a "quick" run (every task shortened, kept in 5 s steps); opts.mode is stored on the run ('normal' | 'quick' | 'calm'). */
export function createRun(tpl, now, opts = {}) {
  const k = opts.scale && opts.scale > 0 && opts.scale < 1 ? opts.scale : 1;
  const sc = (v) => (k === 1 ? v : Math.max(5, Math.round((v * k) / 5) * 5));
  const tasks = tpl.tasks.map((t) => ({
    id: t.id, name: t.name, icon: t.icon || '', photo: t.photo || '', plannedSec: sc(t.sec), estSec: sc(t.est || t.sec), extraSec: 0,
    accumMs: 0, actualSec: 0, startedAt: null, endedAt: null,
    done: false, skipped: false, warned: false, ended: false,
  }));
  const run = {
    id: uid(), gear: (opts.gear || []).map((g) => ({ id: g.id, name: g.name, icon: g.icon || '', done: false })), mode: opts.mode || 'normal', leaveBy: tpl.leaveBy || '', templateId: tpl.id, templateName: tpl.name, icon: tpl.icon, color: tpl.color,
    startedAt: now, endedAt: null, status: 'running', current: 0, segStart: now, pausedAt: null, pausedMs: 0,
    unplanned: [], interrupt: null,
    tasks, plannedTotal: sum(tasks, 'plannedSec'), estTotal: sum(tasks, 'estSec'), actualTotal: 0,
  };
  if (!tasks.length) return finish(run, now);
  tasks[0].startedAt = now;
  return run;
}

const sum = (a, k) => a.reduce((s, x) => s + x[k], 0);
export const isActive = (run) => run.status === 'running' || run.status === 'paused';
const cur = (run) => run.tasks[run.current];

export function elapsedMs(run, i = run.current, now = Date.now()) {
  const t = run.tasks[i];
  if (!t) return 0;
  if (i !== run.current || !isActive(run)) return t.accumMs;
  return t.accumMs + (run.pausedAt ? run.pausedAt - run.segStart : now - run.segStart);
}
/** Seconds left on the current task (negative once over time). */
export function remainingSec(run, now) {
  const t = cur(run);
  return t ? t.plannedSec + t.extraSec - elapsedMs(run, run.current, now) / 1000 : 0;
}

/** Returns [] or events to signal: 'warn' (once, N seconds before end) and 'end' (once, at zero). */
export function tick(run, now, warnAtSec = 10) {
  if (run.status !== 'running') return [];
  const t = cur(run), left = remainingSec(run, now), ev = [];
  if (!t.warned && warnAtSec > 0 && left <= warnAtSec && left > 0 && t.plannedSec + t.extraSec > warnAtSec) { t.warned = true; ev.push('warn'); }
  if (!t.ended && left <= 0) { t.ended = true; t.warned = true; ev.push('end'); }
  return ev;
}

export function pause(run, now) { if (run.status === 'running') { run.status = 'paused'; run.pausedAt = now; } return run; }
export function resume(run, now) {
  if (run.status === 'paused') { run.pausedMs = (run.pausedMs || 0) + (now - run.pausedAt); run.segStart += now - run.pausedAt; run.pausedAt = null; run.status = 'running'; }
  return run;
}
/**
 * An unplanned interruption (toilet, spilled drink...): the task clock stops and the time is counted on its own - not as "paused", not as task time.
 * reason: { key, label, emoji }. Only while running.
 */
export function startInterruption(run, now, reason) {
  if (run.status !== 'running' || run.interrupt) return run;
  pause(run, now);
  run.interrupt = { key: String(reason.key).slice(0, 30), label: String(reason.label).slice(0, 30), emoji: String(reason.emoji || '⚡').slice(0, 8), startedAt: now, taskIndex: run.current };
  return run;
}
export function endInterruption(run, now) {
  const i = run.interrupt; if (!i) return run;
  (run.unplanned ??= []).push({ key: i.key, label: i.label, emoji: i.emoji, sec: Math.max(0, Math.round((now - i.startedAt) / 1000)), at: i.startedAt, task: run.tasks[i.taskIndex]?.name || '' });
  const kept = run.pausedMs || 0; resume(run, now); run.pausedMs = kept;   // resume() would count it as a pause; it is unplanned time instead
  run.interrupt = null;
  return run;
}
export const unplannedSec = (run) => (run.unplanned || []).reduce((s, x) => s + x.sec, 0);

/** Add (or remove) time on the current task without changing the planned figure used in statistics. */
export function addTime(run, sec, now = Date.now()) {
  const t = cur(run); if (!t) return run;
  t.extraSec += sec; t.warned = false; t.ended = remainingSec(run, now) <= 0;
  return run;
}

function closeCurrent(run, now, state) {
  const t = cur(run);
  if (run.pausedAt) run.pausedMs = (run.pausedMs || 0) + (now - run.pausedAt); // finishing/advancing while paused still counts the pause
  t.actualSec = Math.round(elapsedMs(run, run.current, now) / 1000);
  t.accumMs = t.actualSec * 1000;
  t.endedAt = now; t.done = state === 'done'; t.skipped = state === 'skipped';
}
function advance(run, now) {
  const n = run.tasks.length;
  for (let k = 1; k <= n; k++) {
    const i = (run.current + k) % n;
    const t = run.tasks[i];
    if (!t.done && !t.skipped) {
      run.current = i; run.segStart = now; run.pausedAt = null; run.status = 'running';
      t.startedAt ??= now; return run;
    }
  }
  return finish(run, now);
}
export const completeCurrent = (run, now) => { if (!isActive(run)) return run; closeCurrent(run, now, 'done'); return advance(run, now); };
export const skipCurrent = (run, now) => { if (!isActive(run)) return run; closeCurrent(run, now, 'skipped'); return advance(run, now); };

/** Checklist tap. Current task -> complete it. Another task -> tick/untick it manually (counts as 0s of work). */
export function toggleTask(run, i, now) {
  if (!isActive(run)) return run;
  if (i === run.current) return completeCurrent(run, now);
  const t = run.tasks[i];
  if (t.done || t.skipped) { t.done = t.skipped = false; t.endedAt = null; }
  else { t.done = true; t.endedAt = now; t.startedAt ??= now; }
  return run;
}

export function finish(run, now) {
  if (run.interrupt) endInterruption(run, now);
  if (isActive(run) && cur(run) && !cur(run).endedAt) closeCurrent(run, now, cur(run).done ? 'done' : 'stopped');
  run.endedAt = now;
  run.status = run.tasks.every((t) => t.done || t.skipped) ? 'done' : 'stopped';
  run.actualTotal = sum(run.tasks, 'actualSec');
  return run;
}

/** Plain numbers for the summary screen and for statistics. */
export function summarize(run) {
  const wallSec = Math.round(((run.endedAt ?? Date.now()) - run.startedAt) / 1000);
  return {
    plannedSec: run.plannedTotal, estSec: run.estTotal, actualSec: run.actualTotal, wallSec,
    deltaSec: run.actualTotal - run.plannedTotal, pausedSec: Math.round((run.pausedMs || 0) / 1000), done: run.tasks.filter((t) => t.done).length,
    skipped: run.tasks.filter((t) => t.skipped).length, total: run.tasks.length, unplannedSec: unplannedSec(run), unplannedCount: (run.unplanned || []).length,
  };
}

/** Seconds the person is behind (+) or ahead (-) of the plan right now: time actually spent minus planned time up to this point. */
export function paceDiffSec(run, now) {
  const cur = run.tasks[run.current]; if (!cur) return 0;
  const left = remainingSec(run, now), total = cur.plannedSec + cur.extraSec;
  const planUpTo = run.tasks.slice(0, run.current).reduce((s, x) => s + x.plannedSec, 0) + (total - left);
  const spent = run.tasks.reduce((s, x, i) => s + (i === run.current ? elapsedMs(run, i, now) / 1000 : x.actualSec), 0);
  return Math.round(spent - planUpTo);
}

/** Wall-clock ms at which the routine ends if everything from here goes exactly to plan. */
export function etaMs(run, now) {
  let rest = 0;
  run.tasks.forEach((x, i) => {
    if (x.done || x.skipped) return;
    rest += i === run.current ? Math.max(0, remainingSec(run, now)) : x.plannedSec + x.extraSec;
  });
  return now + rest * 1000;
}

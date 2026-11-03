// Focus sprints inside a long task (pure): the task is shown as a few short sprints with a tiny movement break between them.
// Time keeps running through the breaks (they are part of the task), so nothing about the plan or the statistics changes.
export const SPRINT_DEFAULTS = Object.freeze({ sprintSec: 300, breakSec: 30, minTaskSec: 480 });
export function sprintPlan(plannedSec, cfg = SPRINT_DEFAULTS) {
  const { sprintSec, breakSec, minTaskSec } = { ...SPRINT_DEFAULTS, ...cfg };
  if (!(plannedSec >= minTaskSec)) return { enabled: false, total: 1, sprintSec, breakSec };
  return { enabled: true, total: Math.ceil(plannedSec / sprintSec), sprintSec, breakSec, plannedSec };
}
/** -> { index (0-based sprint), total, inBreak, leftInSprint, breakLeft, done } for `elapsedSec` into the task. */
export function sprintState(elapsedSec, plan) {
  if (!plan.enabled) return { index: 0, total: 1, inBreak: false, leftInSprint: Infinity, breakLeft: 0, done: false };
  const cycle = plan.sprintSec + plan.breakSec, e = Math.max(0, elapsedSec), n = Math.floor(e / cycle), r = e - n * cycle;
  if (n >= plan.total) return { index: plan.total - 1, total: plan.total, inBreak: false, leftInSprint: 0, breakLeft: 0, done: true };
  const last = n === plan.total - 1;
  if (r < plan.sprintSec || last) return { index: n, total: plan.total, inBreak: false, leftInSprint: Math.max(0, plan.sprintSec - r), breakLeft: 0, done: false };
  return { index: n, total: plan.total, inBreak: true, leftInSprint: 0, breakLeft: cycle - r, done: false };
}

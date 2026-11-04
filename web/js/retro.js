// Retrospective (pure): look back at a run - where did it get stuck, why, what would we change - turn the answers into concrete changes to the routine,
// and later check whether those changes helped (before/after the change, per change type) with plain-language conclusions.
import { cleanText, clamp, uid } from './util.js';
import { STEP_META, norm } from './smart.js';

export const CAUSES = [['start', '🚦'], ['distraction', '📱'], ['unclear', '🧩'], ['tired', '😴'], ['missing', '🔎'], ['feelings', '💭'], ['short', '⏱️'], ['other', '✍️']].map(([id, emoji]) => ({ id, emoji }));
const causeIds = new Set(CAUSES.map((c) => c.id));
export const MAX_RETROS = 300, MIN_AFTER = 3, MIN_BEFORE = 2;
export const ACTION_TYPES = ['time', 'insert', 'split', 'alarm', 'gear', 'unplanned', 'goal'];
const roundSec = (s) => { const st = s < 120 ? 15 : s < 900 ? 60 : 300; return Math.max(15, Math.ceil(s / st) * st); };   // round UP: the new time must cover what really happened

// ── sanitising (a retro can come from a backup) ──
export function sanitizeAction(a) {
  const type = ACTION_TYPES.includes(a?.type) ? a.type : null; if (!type) return null;
  const p = a?.params && typeof a.params === 'object' ? a.params : {};
  return { id: cleanText(a?.id, 40) || uid(), type, applied: a?.applied === true,
    params: { name: cleanText(p.name, 80), sec: clamp(Math.round(Number(p.sec)) || 0, 0, 86_400), from: clamp(Math.round(Number(p.from)) || 0, 0, 86_400), key: /^sx_[a-z]+$/.test(p.key || '') && Object.hasOwn(STEP_META, p.key) ? p.key : '', shift: clamp(Math.round(Number(p.shift)) || 0, -120, 120), emoji: cleanText(p.emoji, 8), label: cleanText(p.label, 60) } };
}
export function sanitizeRetro(r) {
  const base = r?.baseline && typeof r.baseline === 'object' ? r.baseline : {};
  return { id: cleanText(r?.id, 64) || uid(), profileId: cleanText(r?.profileId, 64), runId: cleanText(r?.runId, 64), templateId: cleanText(r?.templateId, 64), templateName: cleanText(r?.templateName, 80),
    at: Math.max(0, Math.round(Number(r?.at)) || Date.now()), rating: clamp(Math.round(Number(r?.rating)) || 0, 0, 5), good: cleanText(r?.good, 400), idea: cleanText(r?.idea, 400),
    stuck: (Array.isArray(r?.stuck) ? r.stuck : []).slice(0, 20).filter((x) => x && cleanText(x.name, 80)).map((x) => ({ name: cleanText(x.name, 80), causes: [...new Set((Array.isArray(x.causes) ? x.causes : []).filter((c) => typeof c === 'string' && causeIds.has(c)))], note: cleanText(x.note, 300) })),
    actions: (Array.isArray(r?.actions) ? r.actions : []).slice(0, 20).map(sanitizeAction).filter(Boolean), appliedAt: Math.max(0, Math.round(Number(r?.appliedAt)) || 0),
    baseline: { runs: clamp(Math.round(Number(base.runs)) || 0, 0, 1000) } };
}
export const sanitizeRetros = (list) => (Array.isArray(list) ? list : []).filter((x) => x && typeof x === 'object').slice(-MAX_RETROS).map(sanitizeRetro);

// ── suggestions: stuck tasks + causes -> concrete changes ──
/** What the data already says about each task of a run (to pre-select "stuck" ones): over its time, rated hard, or where an interruption happened. */
export function stuckCandidates(run) {
  const unp = run.unplanned || [];
  return (run.tasks || []).map((k, index) => ({ index, name: k.name, icon: k.icon, over: k.done ? k.actualSec - k.plannedSec : 0, difficulty: k.difficulty || 0, interrupted: unp.some((u) => norm(u.task) === norm(k.name)) }))
    .map((c) => ({ ...c, flagged: c.over >= 30 || c.difficulty >= 4 || c.interrupted }));
}
/**
 * stuck: [{ name, causes[], note }]. -> [{ id, type, params, labelKey, labelParams }]  (deduplicated; none for things already in the routine)
 * ctx: { run, tpl, age, areas }
 */
export function suggestActions({ run, tpl, stuck = [] }) {
  const out = [], seen = new Set(), tasks = tpl?.tasks || [], run0 = run?.tasks || [];
  const push = (type, params, labelKey, labelParams) => { const k = `${type}|${params.name || ''}|${params.key || ''}`; if (!seen.has(k)) { seen.add(k); out.push({ id: uid(), type, applied: false, params, labelKey, labelParams }); } };
  const has = (name) => tasks.some((t) => norm(t.name) === norm(name)), hasStep = (key) => tasks.some((t) => t.helperKey === key), find = (name) => tasks.find((t) => norm(t.name) === norm(name));
  for (const s of stuck) {
    const task = find(s.name), rt = run0.find((k) => norm(k.name) === norm(s.name)), causes = s.causes.length ? s.causes : (rt && rt.actualSec - rt.plannedSec >= 30 ? ['short'] : []);
    if (!task) continue;
    for (const c of causes) {
      if (c === 'short') { const target = roundSec(Math.max(rt?.actualSec ?? 0, task.sec * 1.15)); if (target > task.sec) push('time', { name: task.name, sec: target, from: task.sec }, 'rcAct_time', { name: task.name, from: task.sec, to: target }); }
      if (c === 'start' && !hasStep('sx_pickone')) push('insert', { name: task.name, key: 'sx_pickone' }, 'rcAct_insert', { step: 'sx_pickone', name: task.name });
      if (c === 'distraction' && !hasStep('sx_clear')) push('insert', { name: task.name, key: 'sx_clear' }, 'rcAct_insert', { step: 'sx_clear', name: task.name });
      if (c === 'feelings' && !hasStep('sx_calmcheck')) push('insert', { name: task.name, key: 'sx_calmcheck' }, 'rcAct_insert', { step: 'sx_calmcheck', name: task.name });
      if (c === 'unclear' && task.sec >= 120) push('split', { name: task.name }, 'rcAct_split', { name: task.name });
      if (c === 'missing') push('gear', { name: task.name, emoji: task.icon || '' }, 'rcAct_gear', { name: task.name });
      if (c === 'tired' && tpl?.alarm?.enabled) push('alarm', { shift: -10, name: '' }, 'rcAct_alarm', { min: 10 });
    }
  }
  for (const u of (run?.unplanned || []).slice(0, 4)) if (u.label && !has(u.label)) push('unplanned', { name: u.label, emoji: u.emoji, sec: roundSec(Math.max(60, u.sec)), after: u.task }, 'rcAct_unplanned', { name: u.label, sec: roundSec(Math.max(60, u.sec)) });
  const dif = run0.filter((k) => k.difficulty >= 1);
  if (dif.length && dif.reduce((a, k) => a + k.difficulty, 0) / dif.length >= 3.8) push('goal', { name: tpl?.name || '' }, 'rcAct_goal', { name: tpl?.name || '' });
  return out;
}

/** Applies the chosen actions to a routine (new object). -> { tpl, goals: [{ title, templateId, strategies }], labels: [] } */
export function applyActions(tpl, actions, { newId = uid, stepName = (k) => k, now = Date.now() } = {}) {
  let tasks = tpl.tasks.map((t) => ({ ...t })), alarm = { ...tpl.alarm }, gear = [...(tpl.gear || [])]; const goals = [];
  const idx = (name) => tasks.findIndex((t) => norm(t.name) === norm(name));
  for (const a of actions) {
    const p = a.params, i = idx(p.name);
    if (a.type === 'time' && i >= 0 && p.sec > 0) tasks[i] = { ...tasks[i], sec: p.sec };
    else if (a.type === 'insert' && i >= 0 && STEP_META[p.key]) { const m = STEP_META[p.key]; tasks.splice(i, 0, { id: newId(), name: stepName(p.key), icon: m.icon, photo: '', sec: m.sec, est: 0, helper: m.helper, helperKey: p.key }); }
    else if (a.type === 'split' && i >= 0 && tasks[i].sec >= 120) { const t = tasks[i], half = Math.max(30, Math.round(t.sec / 2 / 15) * 15); tasks.splice(i, 1, { ...t, name: `${t.name} (1/2)`, sec: half, est: 0 }, { ...t, id: newId(), name: `${t.name} (2/2)`, sec: Math.max(30, t.sec - half), est: 0 }); }
    else if (a.type === 'alarm' && /^\d\d:\d\d$/.test(alarm.time || '')) { const [h, m] = alarm.time.split(':').map(Number), tot = (((h * 60 + m + p.shift) % 1440) + 1440) % 1440; alarm.time = `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`; }
    else if (a.type === 'gear' && p.name && gear.length < 20 && !gear.some((g) => norm(g.name) === norm(p.name))) gear.push({ id: newId(), name: p.name, icon: p.emoji || '', days: [] });
    else if (a.type === 'unplanned' && p.name && !tasks.some((t) => norm(t.name) === norm(p.name)) && tasks.length < 100) { const at = tasks.findIndex((t) => norm(t.name) === norm(a.params.after || '')), pos = at >= 0 ? at + 1 : tasks.length; tasks.splice(pos, 0, { id: newId(), name: p.name, icon: p.emoji || '⚡', photo: '', sec: p.sec || 120, est: 0 }); }
    else if (a.type === 'goal') goals.push({ title: `${p.name}`.slice(0, 60), templateId: tpl.id, strategies: ['first', 'steps'] });
  }
  return { tpl: { ...tpl, tasks, alarm, gear, updatedAt: now }, goals };
}

// ── did it help? ──
const finishedOf = (runs, templateId) => runs.filter((r) => r.endedAt && r.templateId === templateId).sort((a, b) => a.startedAt - b.startedAt);
function metrics(rs, names) {
  if (!rs.length) return { n: 0, onTime: 0, avgOver: 0, avgDiff: 0, rated: 0, unp: 0, stuckOver: 0, stuckDiff: 0 };
  const diffs = rs.flatMap((r) => r.tasks.filter((k) => k.difficulty >= 1).map((k) => k.difficulty)), sk = rs.flatMap((r) => r.tasks.filter((k) => k.done && names.has(norm(k.name))));
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0), sd = sk.filter((k) => k.difficulty >= 1).map((k) => k.difficulty);
  return { n: rs.length, onTime: rs.filter((r) => r.actualTotal <= r.plannedTotal).length / rs.length, avgOver: Math.round(avg(rs.map((r) => r.actualTotal - r.plannedTotal))), avgDiff: avg(diffs), rated: diffs.length, unp: avg(rs.map((r) => (r.unplanned || []).length)), stuckOver: Math.round(avg(sk.map((k) => k.actualSec - k.plannedSec))), stuckDiff: avg(sd) };
}
/** Did the applied changes help? Needs MIN_BEFORE runs before and MIN_AFTER after. -> { status: 'none'|'waiting'|'improved'|'same'|'worse', need, before, after, score, deltas } */
export function impact(retro, runs) {
  if (!retro.appliedAt) return { status: 'none', need: 0 };
  const rs = finishedOf(runs, retro.templateId), names = new Set(retro.stuck.map((s) => norm(s.name)));
  const before = metrics(rs.filter((r) => r.startedAt < retro.appliedAt).slice(-6), names), after = metrics(rs.filter((r) => r.startedAt >= retro.appliedAt).slice(0, 10), names);
  if (after.n < MIN_AFTER || before.n < MIN_BEFORE) return { status: 'waiting', need: Math.max(0, MIN_AFTER - after.n), before, after };
  const d = { onTime: Math.round((after.onTime - before.onTime) * 100), over: after.avgOver - before.avgOver, diff: before.rated && after.rated ? Math.round((after.avgDiff - before.avgDiff) * 10) / 10 : 0, unp: Math.round((after.unp - before.unp) * 10) / 10, stuckOver: after.stuckOver - before.stuckOver };
  const score = (d.onTime >= 15 ? 1 : d.onTime <= -15 ? -1 : 0) + (d.over <= -60 ? 1 : d.over >= 60 ? -1 : 0) + (d.diff <= -0.5 ? 1 : d.diff >= 0.5 ? -1 : 0) + (d.stuckOver <= -45 ? 1 : d.stuckOver >= 45 ? -1 : 0);
  return { status: score > 0 ? 'improved' : score < 0 ? 'worse' : 'same', need: 0, before, after, score, deltas: d };
}
const typesOf = (r) => [...new Set(r.actions.filter((a) => a.applied).map((a) => a.type))];
/** The big picture + automatic conclusions: [{ key, p }] for the UI to word in the person's language. */
export function overview(retros, runs) {
  const res = retros.map((r) => ({ r, im: impact(r, runs) })), done = res.filter((x) => x.im.status !== 'none'), judged = done.filter((x) => ['improved', 'same', 'worse'].includes(x.im.status));
  const count = (s) => done.filter((x) => x.im.status === s).length, byType = new Map(), causes = new Map(), stuck = new Map();
  for (const { r, im } of done) for (const ty of typesOf(r)) { const e = byType.get(ty) ?? { type: ty, n: 0, improved: 0, worse: 0, same: 0 }; e.n++; if (e[im.status] != null) e[im.status]++; byType.set(ty, e); }
  for (const { r } of res) for (const s of r.stuck) { stuck.set(s.name, (stuck.get(s.name) || 0) + 1); for (const c of s.causes) causes.set(c, (causes.get(c) || 0) + 1); }
  const types = [...byType.values()].sort((a, b) => b.improved - a.improved || b.n - a.n), causeList = [...causes].map(([cause, n]) => ({ cause, n })).sort((a, b) => b.n - a.n), stubborn = [...stuck].filter(([, n]) => n >= 2).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
  const conc = [];
  if (judged.length) conc.push({ key: 'rcvHelped', p: { n: count('improved'), of: judged.length } });
  const rated = types.filter((x) => x.improved + x.worse + x.same >= 2).map((x) => ({ ...x, rate: x.improved / (x.improved + x.worse + x.same) })).sort((a, b) => b.rate - a.rate);
  if (rated[0] && rated[0].rate >= 0.5) conc.push({ key: 'rcvBestType', p: { type: rated[0].type, n: rated[0].improved, of: rated[0].improved + rated[0].worse + rated[0].same } });
  const bad = rated.filter((x) => x.worse > x.improved).at(-1); if (bad) conc.push({ key: 'rcvWorstType', p: { type: bad.type } });
  const w = done.find((x) => x.im.status === 'worse'); if (w) conc.push({ key: 'rcvWorse', p: { name: w.r.templateName } });
  if (stubborn[0]) conc.push({ key: 'rcvStubborn', p: { name: stubborn[0].name, n: stubborn[0].n } });
  if (causeList[0] && causeList[0].n >= 2) conc.push({ key: 'rcvCause', p: { cause: causeList[0].cause, n: causeList[0].n } });
  const unapplied = res.filter((x) => x.im.status === 'none' && x.r.actions.length).length; if (unapplied >= 2) conc.push({ key: 'rcvNoApply', p: { n: unapplied } });
  const waiting = count('waiting'); if (waiting) conc.push({ key: 'rcvWaiting', p: { n: waiting, need: MIN_AFTER } });
  return { total: retros.length, applied: done.length, improved: count('improved'), worse: count('worse'), same: count('same'), waiting, byType: types, causes: causeList, stubborn, conclusions: conc, items: res };
}
/** The latest finished run (<= 3 days old) that has no retrospective yet - for a gentle prompt on Home. */
export function dueRun(runs, retros, now = Date.now()) {
  const done = new Set(retros.map((r) => r.runId));
  return runs.filter((r) => r.endedAt && now - r.endedAt <= 3 * 86_400_000 && !done.has(r.id)).sort((a, b) => b.endedAt - a.endedAt)[0] ?? null;
}

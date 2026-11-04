// Retrospective (pure): look back at a run - where did it get stuck, why, what would we change - turn the answers into concrete changes to the routine,
// and later check whether those changes helped (before/after the change, per change type) with plain-language conclusions.
import { cleanText, clamp, uid } from './util.js';
import { STEP_META, norm } from './smart.js';

export const CAUSES = [['start', '🚦'], ['distraction', '📱'], ['unclear', '🧩'], ['tired', '😴'], ['missing', '🔎'], ['feelings', '💭'], ['short', '⏱️'], ['other', '✍️']].map(([id, emoji]) => ({ id, emoji }));
const causeIds = new Set(CAUSES.map((c) => c.id));
export const MAX_RETROS = 300, MIN_AFTER = 3, MIN_BEFORE = 2, SCOPE_RUNS = 5;
export const PARTS = ['feel', 'tasks', 'good', 'change'], MODES = ['guided', 'free'];
export const ACTION_TYPES = ['time', 'insert', 'split', 'alarm', 'gear', 'unplanned', 'goal'];
const roundSec = (s) => { const st = s < 120 ? 15 : s < 900 ? 60 : 300; return Math.max(15, Math.ceil(s / st) * st); };   // round UP: the new time must cover what really happened

// ── sanitising (a retro can come from a backup) ──
export function sanitizeAction(a) {
  const type = ACTION_TYPES.includes(a?.type) ? a.type : null; if (!type) return null;
  const p = a?.params && typeof a.params === 'object' ? a.params : {};
  return { id: cleanText(a?.id, 40) || uid(), type, applied: a?.applied === true,
    params: { name: cleanText(p.name, 80), sec: clamp(Math.round(Number(p.sec)) || 0, 0, 86_400), from: clamp(Math.round(Number(p.from)) || 0, 0, 86_400), key: /^sx_[a-z]+$/.test(p.key || '') && Object.hasOwn(STEP_META, p.key) ? p.key : '', shift: clamp(Math.round(Number(p.shift)) || 0, -120, 120), emoji: cleanText(p.emoji, 8), label: cleanText(p.label, 60), after: cleanText(p.after, 80) },
    undo: sanitizeUndo(a?.undo) };
}
/** What is needed to take an applied change back (small, whitelisted). */
function sanitizeUndo(u) {
  if (!u || typeof u !== 'object') return null;
  const t = u.task && typeof u.task === 'object' ? { id: cleanText(u.task.id, 64), name: cleanText(u.task.name, 80), icon: cleanText(u.task.icon, 8), sec: clamp(Math.round(Number(u.task.sec)) || 1, 1, 86_400), est: clamp(Math.round(Number(u.task.est)) || 0, 0, 86_400), helper: ['calm', 'move', 'thought'].includes(u.task.helper) ? u.task.helper : '', helperKey: /^sx_[a-z]+$/.test(u.task.helperKey || '') ? u.task.helperKey : '' } : null;
  return { sec: clamp(Math.round(Number(u.sec)) || 0, 0, 86_400), time: /^([01]\d|2[0-3]):[0-5]\d$/.test(u.time || '') ? u.time : '', ids: (Array.isArray(u.ids) ? u.ids : []).slice(0, 3).map((x) => cleanText(x, 64)).filter(Boolean), task: t, goalId: cleanText(u.goalId, 64), name: cleanText(u.name, 80) };
}
export function sanitizeRetro(r) {
  const base = r?.baseline && typeof r.baseline === 'object' ? r.baseline : {};
  return { id: cleanText(r?.id, 64) || uid(), profileId: cleanText(r?.profileId, 64), runId: cleanText(r?.runId, 64), templateId: cleanText(r?.templateId, 64), templateName: cleanText(r?.templateName, 80),
    at: Math.max(0, Math.round(Number(r?.at)) || Date.now()), rating: clamp(Math.round(Number(r?.rating)) || 0, 0, 5), good: cleanText(r?.good, 400), idea: cleanText(r?.idea, 400),
    stuck: (Array.isArray(r?.stuck) ? r.stuck : []).slice(0, 20).filter((x) => x && cleanText(x.name, 80)).map((x) => ({ name: cleanText(x.name, 80), causes: [...new Set((Array.isArray(x.causes) ? x.causes : []).filter((c) => typeof c === 'string' && causeIds.has(c)))], note: cleanText(x.note, 300) })),
    mode: MODES.includes(r?.mode) ? r.mode : 'free', scope: r?.scope === 'routine' ? 'routine' : 'run', runsN: clamp(Math.round(Number(r?.runsN)) || 1, 1, 10), parts: PARTS.filter((x) => (Array.isArray(r?.parts) ? r.parts : PARTS).includes(x)),
    status: r?.status === 'draft' ? 'draft' : 'done', step: clamp(Math.round(Number(r?.step)) || 0, 0, 10), wentWell: [...new Set((Array.isArray(r?.wentWell) ? r.wentWell : []).map((x) => cleanText(x, 80)).filter(Boolean))].slice(0, 20), later: [...new Set((Array.isArray(r?.later) ? r.later : []).map((x) => cleanText(x, 80)).filter(Boolean))].slice(0, 20),
    actions: (Array.isArray(r?.actions) ? r.actions : []).slice(0, 20).map(sanitizeAction).filter(Boolean), appliedAt: Math.max(0, Math.round(Number(r?.appliedAt)) || 0),
    baseline: { runs: clamp(Math.round(Number(base.runs)) || 0, 0, 1000) } };
}
export const sanitizeRetros = (list) => (Array.isArray(list) ? list : []).filter((x) => x && typeof x === 'object').slice(-MAX_RETROS).map(sanitizeRetro);

// ── suggestions: stuck tasks + causes -> concrete changes ──
/** What the data already says about each task of a run (to pre-select "stuck" ones): over its time, rated hard, or where an interruption happened. */
export function stuckCandidates(run) {
  const unp = run.unplanned || [];
  return (run.tasks || []).map((k, index) => ({ index, name: k.name, icon: k.icon, over: k.done ? k.actualSec - k.plannedSec : 0, difficulty: k.difficulty || 0, interrupted: unp.some((u) => norm(u.task) === norm(k.name)) }))
    .map((c) => ({ ...c, flagged: c.over >= 30 || c.difficulty >= 4 || c.interrupted })).map((c) => ({ ...c, smooth: !c.flagged && (run.tasks[c.index]?.done ?? false) && c.difficulty <= 2 }));
}
/** One "typical" run built from several runs of the same routine (the latest plan, average actual time, average difficulty, all interruptions). */
export function aggregateRuns(runs) {
  const rs = runs.filter((r) => r.endedAt), last = rs.at(-1); if (!last) return null;
  const tasks = last.tasks.map((k) => { const same = rs.flatMap((r) => r.tasks.filter((x) => norm(x.name) === norm(k.name) && x.done)), dif = same.filter((x) => x.difficulty >= 1);
    return { ...k, actualSec: same.length ? Math.round(same.reduce((a, x) => a + x.actualSec, 0) / same.length) : k.actualSec, difficulty: dif.length ? Math.round(dif.reduce((a, x) => a + x.difficulty, 0) / dif.length) : 0, done: same.length > 0 }; });
  const unp = new Map(); for (const r of rs) for (const u of r.unplanned || []) { const e = unp.get(u.key) ?? { ...u, n: 0 }; e.n++; unp.set(u.key, e); }
  return { ...last, tasks, unplanned: [...unp.values()].filter((u) => u.n >= Math.min(2, rs.length)).map(({ n, ...u }) => u), _runs: rs.length };
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
  let tasks = tpl.tasks.map((t) => ({ ...t })), alarm = { ...tpl.alarm }, gear = [...(tpl.gear || [])]; const goals = [], undos = {};   // undos: action id -> what is needed to take it back
  const idx = (name) => tasks.findIndex((t) => norm(t.name) === norm(name));
  for (const a of actions) {
    const p = a.params, i = idx(p.name);
    if (a.type === 'time' && i >= 0 && p.sec > 0) { undos[a.id] = { sec: tasks[i].sec, name: tasks[i].name }; tasks[i] = { ...tasks[i], sec: p.sec }; }
    else if (a.type === 'insert' && i >= 0 && STEP_META[p.key]) { const m = STEP_META[p.key], id = newId(); undos[a.id] = { ids: [id] }; tasks.splice(i, 0, { id, name: stepName(p.key), icon: m.icon, photo: '', sec: m.sec, est: 0, helper: m.helper, helperKey: p.key }); }
    else if (a.type === 'split' && i >= 0 && tasks[i].sec >= 120) { const t = tasks[i], half = Math.max(30, Math.round(t.sec / 2 / 15) * 15), id2 = newId(); undos[a.id] = { task: { id: t.id, name: t.name, icon: t.icon, sec: t.sec, est: t.est, helper: t.helper, helperKey: t.helperKey }, ids: [t.id, id2] }; tasks.splice(i, 1, { ...t, name: `${t.name} (1/2)`, sec: half, est: 0 }, { ...t, id: id2, name: `${t.name} (2/2)`, sec: Math.max(30, t.sec - half), est: 0 }); }
    else if (a.type === 'alarm' && /^\d\d:\d\d$/.test(alarm.time || '')) { undos[a.id] = { time: alarm.time }; const [h, m] = alarm.time.split(':').map(Number), tot = (((h * 60 + m + p.shift) % 1440) + 1440) % 1440; alarm.time = `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`; }
    else if (a.type === 'gear' && p.name && gear.length < 20 && !gear.some((g) => norm(g.name) === norm(p.name))) { const id = newId(); undos[a.id] = { ids: [id] }; gear.push({ id, name: p.name, icon: p.emoji || '', days: [] }); }
    else if (a.type === 'unplanned' && p.name && !tasks.some((t) => norm(t.name) === norm(p.name)) && tasks.length < 100) { const at = tasks.findIndex((t) => norm(t.name) === norm(a.params.after || '')), pos = at >= 0 ? at + 1 : tasks.length, id = newId(); undos[a.id] = { ids: [id] }; tasks.splice(pos, 0, { id, name: p.name, icon: p.emoji || '⚡', photo: '', sec: p.sec || 120, est: 0 }); }
    else if (a.type === 'goal') goals.push({ title: `${p.name}`.slice(0, 60), templateId: tpl.id, strategies: ['first', 'steps'] });
  }
  return { tpl: { ...tpl, tasks, alarm, gear, updatedAt: now }, goals, undos };
}

/** Takes applied changes back (new routine object). `actions` carry `undo` records. Changes that were edited since are left alone. -> { tpl, goalIds } */
export function undoActions(tpl, actions) {
  let tasks = tpl.tasks.map((t) => ({ ...t })), alarm = { ...tpl.alarm }, gear = [...(tpl.gear || [])]; const goalIds = [];
  for (const a of [...actions].reverse()) {   // last applied, first undone (a later split must be undone before an earlier time change finds its task again)
    const u = a.undo; if (!u) continue;
    if (a.type === 'time') { const i = tasks.findIndex((t) => norm(t.name) === norm(u.name)); if (i >= 0 && u.sec) tasks[i] = { ...tasks[i], sec: u.sec }; }
    else if (a.type === 'insert' || a.type === 'unplanned') tasks = tasks.filter((t) => !u.ids.includes(t.id));
    else if (a.type === 'split' && u.task && u.ids.length === 2) { const i = tasks.findIndex((t) => t.id === u.ids[0]); if (i >= 0) { tasks = tasks.filter((t) => t.id !== u.ids[1]); tasks[tasks.findIndex((t) => t.id === u.ids[0])] = { ...tasks[tasks.findIndex((t) => t.id === u.ids[0])], name: u.task.name, sec: u.task.sec, est: u.task.est }; } }
    else if (a.type === 'alarm' && u.time) alarm.time = u.time;
    else if (a.type === 'gear') gear = gear.filter((g) => !u.ids.includes(g.id));
    else if (a.type === 'goal' && u.goalId) goalIds.push(u.goalId);
  }
  return { tpl: { ...tpl, tasks, alarm, gear, updatedAt: Date.now() }, goalIds };
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
export function overview(all, runs) {
  const retros = all.filter((r) => r.status !== 'draft'), drafts = all.filter((r) => r.status === 'draft').length;
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
  return { total: retros.length, drafts, applied: done.length, improved: count('improved'), worse: count('worse'), same: count('same'), waiting, byType: types, causes: causeList, stubborn, conclusions: conc, items: res };
}
/** What to focus on: tasks that keep getting stuck (or were set aside "for later"), most pressing first. [{ name, templateId, stuck, later, avgOver, avgDiff, score }] */
export function focusItems(retros, runs) {
  const m = new Map();
  for (const r of retros.filter((x) => x.status !== 'draft')) {
    for (const s of r.stuck) { const e = m.get(norm(s.name)) ?? { name: s.name, templateId: r.templateId, stuck: 0, later: 0, causes: new Map(), last: 0 }; e.stuck++; e.last = Math.max(e.last, r.at); for (const c of s.causes) e.causes.set(c, (e.causes.get(c) || 0) + 1); m.set(norm(s.name), e); }
    for (const name of r.later) { const e = m.get(norm(name)) ?? { name, templateId: r.templateId, stuck: 0, later: 0, causes: new Map(), last: 0 }; e.later++; m.set(norm(name), e); }
  }
  return [...m.values()].map((e) => {
    const rs = runs.filter((r) => r.endedAt && r.templateId === e.templateId).slice(-6), ks = rs.flatMap((r) => r.tasks.filter((k) => k.done && norm(k.name) === norm(e.name))), d = ks.filter((k) => k.difficulty >= 1);
    const avgOver = ks.length ? Math.round(ks.reduce((a, k) => a + k.actualSec - k.plannedSec, 0) / ks.length) : 0, avgDiff = d.length ? d.reduce((a, k) => a + k.difficulty, 0) / d.length : 0;
    return { name: e.name, templateId: e.templateId, stuck: e.stuck, later: e.later, topCause: [...e.causes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '', avgOver, avgDiff, score: e.stuck * 2 + e.later + Math.max(0, avgOver) / 60 + Math.max(0, avgDiff - 2) };
  }).filter((e) => e.score > 0).sort((a, b) => b.score - a.score);
}
/** What worked: changes that helped, and tasks the person marked as going well again and again. */
export function workedItems(retros, runs) {
  const ov = overview(retros, runs), well = new Map();
  for (const r of retros.filter((x) => x.status !== 'draft')) for (const n of r.wentWell) { const e = well.get(norm(n)) ?? { name: n, n: 0 }; e.n++; well.set(norm(n), e); }
  return { helped: ov.items.filter((x) => x.im.status === 'improved'), notHelped: ov.items.filter((x) => x.im.status === 'worse' || x.im.status === 'same'), steady: [...well.values()].filter((x) => x.n >= 2).sort((a, b) => b.n - a.n) };
}
/** The latest finished run (<= 3 days old) that has no retrospective yet - for a gentle prompt on Home. */
export function dueRun(runs, retros, now = Date.now()) {
  const done = new Set(retros.map((r) => r.runId)), trouble = (r) => (r.unplanned || []).length + r.tasks.filter((k) => k.done && k.actualSec - k.plannedSec >= 30).length + r.tasks.filter((k) => k.difficulty >= 4).length;
  return runs.filter((r) => r.endedAt && now - r.endedAt <= 3 * 86_400_000 && !done.has(r.id)).sort((a, b) => trouble(b) - trouble(a) || b.endedAt - a.endedAt)[0] ?? null;   // the run that had the most going on first
}

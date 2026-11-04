// Retrospective screens: look back at one run (where did we get stuck, why, what to change - and apply it to the routine), and the overview of all
// look-backs with the "did it help?" follow-up and automatic conclusions.
import { h, setChildren, fmtHuman } from '../util.js';
import { t, units, getLang } from '../i18n.js';
import * as S from '../store.js';
import { CAUSES, PARTS, SCOPE_RUNS, stuckCandidates, aggregateRuns, suggestActions, impact, overview, dueRun, focusItems, workedItems } from '../retro.js';
import { norm } from '../smart.js';
import { MOODS } from '../mood.js';
import { toast, confirmBox } from './common.js';
import { moodRow } from './capture.js';

const dur = (s) => fmtHuman(Math.abs(Math.round(s)), units());
const sig = (a) => `${a.type}|${a.params.name || ''}|${a.params.key || ''}`;
const dateStr = (ms) => new Date(ms).toLocaleDateString(getLang(), { day: 'numeric', month: 'short' });
/** Plain-language label of a change (from its type and parameters). */
export function actionLabel(a) {
  const p = a.params;
  switch (a.type) {
    case 'time': return t('rcAct_time', { name: p.name, from: dur(p.from), to: dur(p.sec) });
    case 'insert': return t('rcAct_insert', { step: t(p.key), name: p.name });
    case 'split': return t('rcAct_split', { name: p.name });
    case 'alarm': return t('rcAct_alarm', { min: Math.abs(p.shift) });
    case 'gear': return t('rcAct_gear', { name: p.name });
    case 'unplanned': return t('rcAct_unplanned', { name: p.name, sec: dur(p.sec) });
    default: return t('rcAct_goal', { name: p.name });
  }
}
const VERDICT = { improved: '📈', worse: '📉', same: '➖', waiting: '⏳', none: '' };
export const verdictChip = (im) => (im.status === 'none' ? null : h('span', { class: `chip solid verdict ${im.status}` }, `${VERDICT[im.status]} ${t(`rcvStatus_${im.status}`, { n: im.need ?? 0 })}`));
export function conclusionText(c) { return t(c.key, { ...c.p, type: c.p.type ? t(`rcType_${c.p.type}`) : '', cause: c.p.cause ? t(`rc_${c.p.cause}`) : '' }); }

function impactBox(im) {
  if (im.status === 'none') return null;
  if (im.status === 'waiting') return h('div', { class: 'card' }, h('strong', {}, `⏳ ${t('rcWaitingTitle')}`), h('p', { class: 'note' }, t('rcWaitingBody', { n: im.need })));
  const d = im.deltas, sign = (x) => (x > 0 ? '+' : x < 0 ? '−' : ''), row = (k, v) => h('div', { class: 'kv' }, h('span', {}, k), h('strong', {}, v));
  return h('div', { class: 'card kvs' }, h('strong', {}, `${VERDICT[im.status]} ${t(`rcvVerdict_${im.status}`)}`), h('p', { class: 'note' }, t('rcCompare', { b: im.before.n, a: im.after.n })),
    row(t('rpOnTime'), `${Math.round(im.before.onTime * 100)}% → ${Math.round(im.after.onTime * 100)}% (${sign(d.onTime)}${Math.abs(d.onTime)})`), row(t('rcAvgOver'), `${sign(d.over)}${dur(d.over)}`),
    im.before.rated && im.after.rated ? row(t('rpAvgDifficulty'), `${(Math.round(im.before.avgDiff * 10) / 10)} → ${(Math.round(im.after.avgDiff * 10) / 10)}`) : null, row(t('rcStuckOver'), `${sign(d.stuckOver)}${dur(d.stuckOver)}`), row(t('rcUnplannedPerRun'), `${sign(d.unp)}${Math.abs(d.unp)}`));
}

const PART_ICON = { feel: '🙂', tasks: '🧗', good: '🌟', change: '🔧' };
const kidMode = () => (S.activeProfile().age ?? 99) <= 11;
const STATES = [['well', '😀'], ['stuck', '😓'], ['later', '⏭️']];
const hubHash = (runId) => `#/retro/${encodeURIComponent(runId)}`;

/** The look-back screens for one run: a hub (existing look-backs + start another), the start screen (how do you want to do it?) and the form itself. */
export function renderRetro(root, nav, runId, arg2, arg3) {
  const run = S.myRuns().find((r) => r.id === runId);
  if (!run) { nav('#/retros'); return () => {}; }
  const existing = S.retrosForRun(runId);
  if (arg2 === 'new') return startScreen(root, nav, run, arg3 ? decodeURIComponent(arg3) : '');
  if (arg2 && S.retroById(arg2)) return retroForm(root, nav, run, S.retroById(arg2), {});
  if (!existing.length) {
    const style = S.get().settings.retroStyle;
    return style === 'ask' ? startScreen(root, nav, run, '') : retroForm(root, nav, run, null, { mode: style });
  }
  return hub(root, nav, run, existing);
}

function hub(root, nav, run, list) {
  const draw = () => {
    const rs = S.retrosForRun(run.id), runs = S.myRuns();
    if (!rs.length) { nav(`${hubHash(run.id)}/new`); return; }
    setChildren(root, h('div', { class: 'row between' }, h('h1', {}, `🔄 ${t('rcTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav('#/retros') }, t('back'))),
      h('p', { class: 'note' }, `${run.icon} ${run.templateName} · ${new Date(run.startedAt).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short' })}`),
      h('div', { class: 'stack' }, rs.map((r) => { const im = impact(r, runs);
        return h('article', { class: 'card retro-item' }, h('div', { class: 'row between' }, h('strong', {}, `${r.status === 'draft' ? '📝' : '✅'} ${t(`rcMode_${r.mode}`)} · ${r.scope === 'routine' ? t('rcScopeRoutineShort', { n: r.runsN }) : t('rcScopeRunShort')}`), r.rating ? h('span', {}, MOODS[r.rating - 1].emoji) : null),
          h('small', { class: 'muted' }, `${dateStr(r.at)} · ${r.parts.map((x) => t(`rcPart_${x}`)).join(', ')}`), r.status === 'draft' ? h('span', { class: 'chip solid' }, `📝 ${t('rcDraft')}`) : verdictChip(im),
          r.stuck.length ? h('small', {}, `${t('rcStuckList')}: ${r.stuck.map((x) => x.name).join(', ')}`) : null,
          h('div', { class: 'row-btns' }, h('a', { class: 'btn small primary', href: `${hubHash(run.id)}/${r.id}` }, t(r.status === 'draft' ? 'rcContinue' : 'rcOpen')), h('button', { class: 'btn small danger', type: 'button', onclick: async () => { if (await confirmBox(t('rcDeleteAsk'), t('delete'), true)) { await S.removeRetro(r.id); draw(); } } }, t('delete')))); })),
      h('div', { class: 'toolbar' }, h('a', { class: 'btn primary', href: `${hubHash(run.id)}/new` }, `+ ${t('rcStartAnother')}`)));
  };
  draw(); return () => {};
}

function startScreen(root, nav, run, onlyTask) {
  const st = S.get().settings, tplRuns = S.myRuns().filter((r) => r.templateId === run.templateId && r.endedAt), canRoutine = tplRuns.length >= 2;
  const f = { scope: onlyTask && canRoutine ? 'routine' : 'run', mode: st.retroStyle === 'free' ? 'free' : 'guided', part: !!onlyTask, parts: new Set(onlyTask ? ['tasks', 'change'] : PARTS), remember: false };
  const box = h('div', { class: 'stack' });
  const radio = (name, value, label, hint, cur, set) => h('label', { class: 'strat-pick' }, h('input', { type: 'radio', name, checked: cur === value, onchange: () => { set(value); draw(); } }), h('span', {}, h('strong', {}, label), h('small', { class: 'hint' }, hint)));
  function draw() {
    setChildren(box,
      onlyTask ? h('p', { class: 'chip solid' }, `🎯 ${t('rcFocusOn', { name: onlyTask })}`) : null,
      canRoutine ? h('fieldset', { class: 'card stack' }, h('legend', {}, t('rcScope')), radio('scope', 'run', t('rcScopeRun'), t('rcScopeRunHint'), f.scope, (v) => { f.scope = v; }), radio('scope', 'routine', t('rcScopeRoutine', { n: Math.min(SCOPE_RUNS, tplRuns.length) }), t('rcScopeRoutineHint'), f.scope, (v) => { f.scope = v; })) : null,
      h('fieldset', { class: 'card stack' }, h('legend', {}, t('rcStyle')), radio('mode', 'guided', `🧭 ${t('rcStyleGuided')}`, t('rcStyleGuidedHint'), f.mode, (v) => { f.mode = v; }), radio('mode', 'free', `🆓 ${t('rcStyleFree')}`, t('rcStyleFreeHint'), f.mode, (v) => { f.mode = v; })),
      h('fieldset', { class: 'card stack' }, h('legend', {}, t('rcOnlyPart')), h('label', { class: 'switch row' }, h('span', {}, t('rcOnlyPartOn'), h('small', { class: 'hint' }, t('rcOnlyPartHint'))), h('input', { type: 'checkbox', checked: f.part, onchange: (e) => { f.part = e.target.checked; draw(); } })),
        f.part ? PARTS.map((p) => h('label', { class: 'strat-pick' }, h('input', { type: 'checkbox', checked: f.parts.has(p), onchange: (e) => { if (e.target.checked) f.parts.add(p); else f.parts.delete(p); } }), h('span', {}, `${PART_ICON[p]} ${t(`rcPart_${p}`)}`))) : null),
      h('label', { class: 'switch row' }, h('span', {}, t('rcRemember')), h('input', { type: 'checkbox', checked: f.remember, onchange: (e) => { f.remember = e.target.checked; } })),
      h('div', { class: 'toolbar wrap' }, h('button', { class: 'btn primary xl', type: 'button', onclick: async () => {
        const parts = f.part ? PARTS.filter((p) => f.parts.has(p)) : [...PARTS]; if (!parts.length) { toast(t('rcPickPart')); return; }
        if (f.remember) await S.updateSettings({ retroStyle: f.mode });
        retroForm(root, nav, run, null, { mode: f.mode, scope: f.scope, parts, onlyTask });
      } }, `▶ ${t('rcStart')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav(S.retrosForRun(run.id).length ? hubHash(run.id) : '#/retros') }, t('cancel'))));
  }
  draw();
  setChildren(root, h('div', { class: 'row between' }, h('h1', {}, `🔄 ${t('rcStartTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav('#/retros') }, t('back'))), h('p', { class: 'note' }, `${run.icon} ${run.templateName} · ${dateStr(run.startedAt)}`), box);
  return () => {};
}

function retroForm(root, nav, run, existing, init) {
  const tpl = S.getTemplate(run.templateId), kid = kidMode(), runs = S.myRuns();
  const scope = existing?.scope ?? init.scope ?? 'run', tplRuns = runs.filter((r) => r.templateId === run.templateId && r.endedAt), runsN = scope === 'routine' ? Math.min(SCOPE_RUNS, tplRuns.length) : 1;
  const source = scope === 'routine' ? aggregateRuns(tplRuns.slice(-SCOPE_RUNS)) ?? run : run, cands = stuckCandidates(source);
  const st = { id: existing?.id, mode: existing?.mode ?? init.mode ?? 'free', scope, parts: existing?.parts ?? init.parts ?? [...PARTS], step: existing?.step ?? 0, rating: existing?.rating || 0, good: existing?.good || '', idea: existing?.idea || '', tasks: new Map() };
  const was = (name) => (existing ? (existing.stuck.find((x) => x.name === name) ? 'stuck' : existing.wentWell.includes(name) ? 'well' : existing.later.includes(name) ? 'later' : null) : null);
  for (const c of cands) {
    if (init.onlyTask) { st.tasks.set(c.name, { state: norm(c.name) === norm(init.onlyTask) ? 'stuck' : 'later', causes: new Set(), note: '' }); continue; }
    const prev = existing?.stuck.find((x) => x.name === c.name), state = was(c.name) ?? (c.flagged ? 'stuck' : c.smooth ? 'well' : 'later');
    st.tasks.set(c.name, { state, causes: new Set(prev?.causes || []), note: prev?.note || '' });
  }
  const chosen = new Set(), seenSig = new Set(), prevSigs = new Set((existing?.actions || []).map(sig));
  const stuckList = () => [...st.tasks].filter(([, v]) => v.state === 'stuck').map(([name, v]) => ({ name, causes: [...v.causes], note: v.note }));
  const fresh = () => (tpl ? suggestActions({ run: source, tpl, stuck: stuckList() }).filter((a) => !prevSigs.has(sig(a))) : []);
  const picked = () => fresh().filter((a) => chosen.has(sig(a)));
  const record = (status, extra = {}) => {
    const list = status === 'done' ? picked() : [], prev = existing?.actions || [], actions = [...prev, ...list].map((a) => ({ id: a.id, type: a.type, applied: !!a.applied, params: a.params, undo: a.undo ?? null }));
    return { id: st.id, runId: run.id, templateId: run.templateId, templateName: run.templateName, mode: st.mode, scope: st.scope, runsN, parts: st.parts, status, step: st.step, rating: st.rating, good: st.good, idea: st.idea,
      stuck: stuckList(), wentWell: [...st.tasks].filter(([, v]) => v.state === 'well').map(([n]) => n), later: [...st.tasks].filter(([n, v]) => v.state === 'later' && cands.find((c) => c.name === n)?.flagged).map(([n]) => n), actions, appliedAt: existing?.appliedAt || 0, ...extra };
  };
  const persist = async (status) => { const saved = await S.saveRetro(record(status)); if (saved) st.id = saved.id; return saved; };
  async function finish(applyNow) {
    const list = picked(), saved = await persist('done'); if (!saved) return;
    if (applyNow && list.length) { const ids = saved.actions.filter((a) => !a.applied && list.some((p) => sig(p) === sig(a))).map((a) => a.id), r = await S.applyRetro(saved.id, ids); toast(t('rcApplied', { n: r.applied })); } else toast(t('rcSaved'));
    nav(`${hubHash(run.id)}/${saved.id}`);
  }

  // ── sections ──
  const sugBox = h('div', { class: 'stack' }), bar = h('div', { class: 'toolbar wrap' }), main = h('div', { class: 'stack' });
  const s = (k) => (kid ? t(`${k}Kid`) : t(k));
  const feel = () => h('section', { class: 'card stack' }, h('h2', {}, `${PART_ICON.feel} ${s('rcQ1')}`), h('p', { class: 'note' }, `${t('planned')} ${dur(source.plannedTotal)} → ${t('actual')} ${dur(source.actualTotal ?? source.tasks.reduce((a, k) => a + (k.actualSec || 0), 0))}${scope === 'routine' ? ` · ${t('rcScopeRoutineShort', { n: runsN })}` : ''}`), moodRow((v) => { st.rating = v; }, st.rating || null));
  const causeChips = (v) => h('div', { class: 'chips', role: 'group', 'aria-label': t('rcWhy') }, CAUSES.map((c) => h('button', { class: `chip btn-chip cause ${v.causes.has(c.id) ? 'on' : ''}`, type: 'button', 'aria-pressed': String(v.causes.has(c.id)), onclick: (e) => { if (v.causes.has(c.id)) v.causes.delete(c.id); else v.causes.add(c.id); e.currentTarget.classList.toggle('on', v.causes.has(c.id)); e.currentTarget.setAttribute('aria-pressed', String(v.causes.has(c.id))); drawSug(); } }, `${c.emoji} ${t(`rc_${c.id}`)}`)));
  const tasksSec = () => h('section', { class: 'stack' }, h('h2', {}, `${PART_ICON.tasks} ${s('rcQ2')}`), h('p', { class: 'note' }, t('rcQ2Hint2')), cands.map((c) => {
    const v = st.tasks.get(c.name), detail = h('div', { class: 'stack' }), seg = h('div', { class: 'seg-group', role: 'group', 'aria-label': `${c.name}` });
    const fill = () => { setChildren(detail, v.state === 'stuck' ? [causeChips(v), h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('rcNote')), h('input', { type: 'text', maxLength: 300, value: v.note, placeholder: t(kid ? 'rcNotePhKid' : 'rcNotePh'), oninput: (e) => { v.note = e.target.value; } }))] : null); detail.hidden = v.state !== 'stuck'; };
    const paintSeg = () => setChildren(seg, STATES.map(([id, emoji]) => h('button', { class: `btn small ${v.state === id ? 'primary' : ''}`, type: 'button', 'aria-pressed': String(v.state === id), onclick: () => { v.state = id; paintSeg(); fill(); drawSug(); } }, `${emoji} ${t(`rcState_${id}`)}`)));
    paintSeg(); fill();
    return h('article', { class: 'card retro-task' }, h('div', { class: 'row between' }, h('span', {}, `${c.icon || '•'} ${c.name}`, h('small', { class: 'hint' }, [c.over >= 30 ? `⏱ +${dur(c.over)}` : '', c.difficulty >= 4 ? `😓 ${c.difficulty}/5` : '', c.interrupted ? '⚡' : '', c.smooth ? '✔' : ''].filter(Boolean).join(' · '))), seg), detail);
  }));
  const goodSec = () => h('section', { class: 'card stack' }, h('h2', {}, `${PART_ICON.good} ${s('rcQ3')}`), (() => { const w = [...st.tasks].filter(([, v]) => v.state === 'well').map(([n]) => n); return w.length ? h('p', { class: 'chip solid' }, `😀 ${t('rcWentWellList')}: ${w.join(', ')}`) : null; })(), h('textarea', { rows: 2, maxLength: 400, 'aria-label': s('rcQ3'), placeholder: t('rcGoodPh'), oninput: (e) => { st.good = e.target.value; } }, st.good));
  const changeSec = () => h('section', { class: 'card stack' }, h('h2', {}, `${PART_ICON.change} ${s('rcQ4')}`), h('p', { class: 'note' }, t(tpl ? 'rcQ4Hint' : 'rcNoRoutine')), sugBox, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('rcIdea')), h('input', { type: 'text', maxLength: 400, value: st.idea, placeholder: t('rcIdeaPh'), oninput: (e) => { st.idea = e.target.value; } })));
  const builders = { feel, tasks: tasksSec, good: goodSec, change: changeSec };
  function drawSug() {
    const list = fresh(); for (const a of list) if (!seenSig.has(sig(a))) { seenSig.add(sig(a)); chosen.add(sig(a)); }
    const applied = (existing?.actions || []).filter((a) => S.retroById(st.id || '')?.actions.find((x) => x.id === a.id)?.applied ?? a.applied);
    setChildren(sugBox,
      (existing?.actions || []).length ? h('ul', { class: 'unp-list' }, (S.retroById(existing.id)?.actions ?? existing.actions).map((a) => h('li', {}, `${a.applied ? '✅' : '▫️'} ${actionLabel(a)} `, a.applied && a.undo ? h('button', { class: 'btn small', type: 'button', onclick: async () => { const r = await S.undoRetro(existing.id, [a.id]); toast(t('rcUndone', { n: r.undone })); nav(`${hubHash(run.id)}/${existing.id}`); } }, `↩ ${t('rcUndo')}`) : null))) : null,
      list.length ? list.map((a) => h('label', { class: 'strat-pick' }, h('input', { type: 'checkbox', checked: chosen.has(sig(a)), onchange: (e) => { if (e.target.checked) chosen.add(sig(a)); else chosen.delete(sig(a)); drawBar(); } }), h('span', {}, actionLabel(a)))) : h('p', { class: 'note' }, t(stuckList().length ? 'rcNoSuggestions' : 'rcPickStuckFirst')));
    void applied; drawBar();
  }
  // ── layout: guided = one part at a time, free = everything ──
  const parts = st.parts, last = () => st.step >= parts.length - 1;
  function drawMain() {
    setChildren(main, st.mode === 'guided' ? [h('div', { class: 'stepper', role: 'status' }, h('strong', {}, t('rcStepOf', { a: st.step + 1, b: parts.length })), h('div', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: { width: `${((st.step + 1) / parts.length) * 100}%` } }))), builders[parts[st.step]]()] : parts.map((p) => builders[p]()));
    drawSug();
  }
  function drawBar() {
    const n = parts.includes('change') ? picked().length : 0, delBtn = existing ? h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (await confirmBox(t('rcDeleteAsk'), t('delete'), true)) { await S.removeRetro(existing.id); nav(hubHash(run.id)); } } }, t('delete')) : null;
    const go = (d) => async () => { st.step = Math.max(0, Math.min(parts.length - 1, st.step + d)); await persist('draft'); drawMain(); window.scrollTo?.(0, 0); };
    setChildren(bar, st.mode === 'guided' && !last() ? [h('button', { class: 'btn', type: 'button', disabled: st.step === 0, onclick: go(-1) }, t('rcBack')), h('button', { class: 'btn primary', type: 'button', onclick: go(1) }, `${t('rcNext')} ›`)]
      : [st.mode === 'guided' ? h('button', { class: 'btn', type: 'button', disabled: st.step === 0, onclick: go(-1) }, t('rcBack')) : null, h('button', { class: 'btn', type: 'button', onclick: () => finish(false) }, `💾 ${t(st.mode === 'guided' ? 'rcFinish' : 'rcSave')}`), tpl && n ? h('button', { class: 'btn primary', type: 'button', onclick: () => finish(true) }, `✅ ${t('rcSaveApply', { n })}`) : null],
    h('button', { class: 'btn', type: 'button', onclick: async () => { await persist('draft'); toast(t('rcDraftSaved')); nav(hubHash(run.id)); } }, `⏸ ${t('rcSaveLater')}`), delBtn);
  }
  const im = existing?.appliedAt ? impact(existing, runs) : null;
  setChildren(root, h('div', { class: 'row between' }, h('h1', {}, `🔄 ${t('rcTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav(hubHash(run.id)) }, t('back'))),
    h('p', { class: 'note' }, `${run.icon} ${run.templateName} · ${new Date(run.startedAt).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short' })} · ${t(`rcMode_${st.mode}`)}${scope === 'routine' ? ` · ${t('rcScopeRoutineShort', { n: runsN })}` : ''}`),
    im ? [verdictChip(im), impactBox(im), im.status === 'worse' && existing.actions.some((a) => a.applied && a.undo) ? h('button', { class: 'btn danger', type: 'button', onclick: async () => { const r = await S.undoRetro(existing.id, existing.actions.filter((a) => a.applied && a.undo).map((a) => a.id)); toast(t('rcUndone', { n: r.undone })); nav(`${hubHash(run.id)}/${existing.id}`); } }, `↩ ${t('rcUndoAll')}`) : null] : null,
    main, bar, h('p', { class: 'note' }, t('rcFollowUp')));
  drawMain();
  return () => {};
}

export function renderRetros(root, nav) {
  const draw = () => {
    const rs = S.retros(), runs = S.myRuns(), o = overview(rs, runs), w = workedItems(rs, runs), focus = focusItems(rs, runs).slice(0, 3), drafts = rs.filter((r) => r.status === 'draft');
    const covered = new Set(rs.map((r) => r.runId)), todo = runs.filter((r) => r.endedAt && !covered.has(r.id)).sort((a, b) => b.endedAt - a.endedAt).slice(0, 5);
    const latest = (templateId) => runs.filter((r) => r.templateId === templateId && r.endedAt).at(-1);
    const labels = (r) => r.actions.filter((a) => a.applied).map(actionLabel).join('; ');
    const col = (title, emoji, items, empty) => h('section', { class: 'card stack' }, h('h2', {}, `${emoji} ${title}`), items.length ? h('ul', { class: 'unp-list' }, items) : h('p', { class: 'note' }, empty));
    setChildren(root, h('div', { class: 'row between' }, h('h1', {}, `🔄 ${t('rcvTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav('#/') }, t('back'))), h('p', { class: 'note' }, t('rcvIntro')),
      o.total ? h('section', { class: 'card stack' }, h('div', { class: 'tiles' }, [[t('rcvLooks'), o.total], [t('rcvApplied'), o.applied], [`📈 ${t('rcvStatus_improved', { n: 0 })}`, o.improved], [`📉 ${t('rcvStatus_worse', { n: 0 })}`, o.worse]].map(([l, v]) => h('div', { class: 'tile' }, h('small', {}, l), h('strong', {}, String(v))))),
        o.conclusions.length ? h('ul', { class: 'unp-list' }, o.conclusions.map((c) => h('li', {}, conclusionText(c)))) : null) : h('p', { class: 'empty' }, t('rcvEmpty')),
      focus.length ? h('section', { class: 'card stack' }, h('h2', {}, `🎯 ${t('rcFocusTitle')}`), h('p', { class: 'note' }, t('rcFocusHint')),
        focus.map((f) => { const run = latest(f.templateId); return h('div', { class: 'row between focus-item' }, h('span', {}, h('strong', {}, f.name), h('small', { class: 'hint' }, [f.stuck ? t('rcFocusStuck', { n: f.stuck }) : '', f.later ? t('rcFocusLater', { n: f.later }) : '', f.avgOver >= 30 ? `⏱ +${dur(f.avgOver)}` : '', f.topCause ? t(`rc_${f.topCause}`) : ''].filter(Boolean).join(' · '))),
          run ? h('a', { class: 'btn small primary', href: `${hubHash(run.id)}/new/${encodeURIComponent(f.name)}` }, t('rcLookAtThis')) : null); })) : null,
      o.total ? h('div', { class: 'rcv-cols' },
        col(t('rcWorkedTitle'), '✅', [...w.helped.map(({ r }) => h('li', {}, h('a', { href: `${hubHash(r.runId)}/${r.id}` }, `${r.templateName}: ${labels(r)}`))), ...w.steady.map((x) => h('li', {}, t('rcSteady', { name: x.name, n: x.n })))], t('rcWorkedNone')),
        col(t('rcNotWorkedTitle'), '⚠️', [...w.notHelped.map(({ r, im }) => h('li', {}, h('a', { href: `${hubHash(r.runId)}/${r.id}` }, `${r.templateName}: ${labels(r)} (${t(`rcvStatus_${im.status}`, { n: 0 })})`))), ...o.stubborn.map((x) => h('li', {}, t('rcStubbornItem', { name: x.name, n: x.n })))], t('rcNotWorkedNone'))) : null,
      o.total && o.causes.length ? h('section', { class: 'card stack' }, h('h2', {}, t('rcvCauses')), o.causes.slice(0, 5).map((c) => h('div', { class: 'diff-bar' }, h('span', {}, `${CAUSES.find((x) => x.id === c.cause)?.emoji || ''} ${t(`rc_${c.cause}`)}`), h('div', { class: 'bar' }, h('i', { style: { width: `${(c.n / o.causes[0].n) * 100}%`, background: '#6c5ce7' } })), h('small', {}, `${c.n}×`))), o.byType.length ? [h('h2', {}, t('rcvByType')), h('ul', { class: 'unp-list' }, o.byType.map((x) => h('li', {}, `${t(`rcType_${x.type}`)}: ${x.improved}📈 ${x.same}➖ ${x.worse}📉 (${x.n}×)`)))] : null) : null,
      drafts.length ? h('section', {}, h('h2', {}, `📝 ${t('rcDraftsTitle')}`), h('div', { class: 'stack' }, drafts.map((r) => h('a', { class: 'card retro-link', style: { '--accent': '#6c5ce7' }, href: `${hubHash(r.runId)}/${r.id}` }, h('span', { class: 'routine-text' }, h('strong', {}, `${r.templateName} · ${dateStr(r.at)}`), h('small', {}, `${t(`rcMode_${r.mode}`)} · ${t('rcStepOf', { a: r.step + 1, b: r.parts.length })}`)))))) : null,
      todo.length ? h('section', {}, h('h2', {}, t('rcvTodo')), h('div', { class: 'stack' }, todo.map((r) => h('a', { class: 'card retro-link', style: { '--accent': '#6c5ce7' }, href: hubHash(r.id) }, h('span', { class: 'emoji' }, r.icon), h('span', { class: 'routine-text' }, h('strong', {}, r.templateName), h('small', {}, `${dateStr(r.endedAt)} · ${dur(r.actualTotal)}`)))))) : null,
      rs.filter((r) => r.status !== 'draft').length ? h('section', {}, h('h2', {}, t('rcvHistory')), h('div', { class: 'stack' }, [...o.items].reverse().map(({ r, im }) => h('a', { class: 'card retro-item', href: `${hubHash(r.runId)}/${r.id}` }, h('div', { class: 'row between' }, h('strong', {}, `${r.templateName} · ${dateStr(r.at)}`), r.rating ? h('span', {}, MOODS[r.rating - 1].emoji) : null),
        h('small', { class: 'muted' }, `${t(`rcMode_${r.mode}`)} · ${r.parts.map((x) => t(`rcPart_${x}`)).join(', ')}`), r.stuck.length ? h('small', {}, `${t('rcStuckList')}: ${r.stuck.map((x) => x.name).join(', ')}`) : null, verdictChip(im))))) : null);
  };
  draw(); const off = S.subscribe(draw); return () => off();
}

/** Home: a gentle prompt to look back at a recent run (can be dismissed; never shown in simple mode). */
export function dueCard(nav, redraw) {
  const run = dueRun(S.myRuns(), S.retros()); let skipped = ''; try { skipped = localStorage.getItem('mo.retroSkip') || ''; } catch { /* blocked */ }
  if (!run || skipped === run.id) return null;
  return h('section', { class: 'card retro-card' }, h('strong', {}, `🔄 ${t('rcDueTitle', { name: run.templateName })}`), h('p', {}, t('rcDueBody')),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: () => nav(hubHash(run.id)) }, t('rcDoIt')), h('button', { class: 'btn', type: 'button', onclick: () => { try { localStorage.setItem('mo.retroSkip', run.id); } catch { /* blocked */ } redraw(); } }, t('focusLater'))));
}

/** Home: "your change has been judged" - shown once per look-back, after enough runs followed an applied change. */
export function followUpCard(nav, redraw) {
  let seen = []; try { seen = JSON.parse(localStorage.getItem('mo.retroSeen') || '[]'); } catch { /* blocked */ }
  const item = overview(S.retros(), S.myRuns()).items.find(({ r, im }) => ['improved', 'worse', 'same'].includes(im.status) && !seen.includes(`${r.id}:${im.status}`)); if (!item) return null;
  const { r, im } = item, mark = () => { try { localStorage.setItem('mo.retroSeen', JSON.stringify([...seen, `${r.id}:${im.status}`].slice(-100))); } catch { /* blocked */ } };
  return h('section', { class: 'card retro-card' }, h('strong', {}, `${VERDICT[im.status]} ${t('rcFollowTitle', { name: r.templateName })}`), h('p', {}, t(`rcvVerdict_${im.status}`)),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { mark(); nav(`${hubHash(r.runId)}/${r.id}`); } }, t('rcSee')), h('button', { class: 'btn', type: 'button', onclick: () => { mark(); redraw(); } }, t('close'))));
}

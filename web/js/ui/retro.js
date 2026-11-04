// Retrospective screens: look back at one run (where did we get stuck, why, what to change - and apply it to the routine), and the overview of all
// look-backs with the "did it help?" follow-up and automatic conclusions.
import { h, setChildren, fmtHuman } from '../util.js';
import { t, units, getLang } from '../i18n.js';
import * as S from '../store.js';
import { CAUSES, stuckCandidates, suggestActions, impact, overview, dueRun } from '../retro.js';
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

export function renderRetro(root, nav, runId) {
  const run = S.myRuns().find((r) => r.id === runId);
  if (!run) { nav('#/retros'); return () => {}; }
  const tpl = S.getTemplate(run.templateId), existing = S.retroForRun(runId), kid = (S.activeProfile().age ?? 99) <= 11;
  const st = { rating: existing?.rating || 0, good: existing?.good || '', idea: existing?.idea || '', stuck: new Map((existing?.stuck || []).map((s) => [s.name, { causes: new Set(s.causes), note: s.note }])) };
  if (!existing) for (const c of stuckCandidates(run)) if (c.flagged) st.stuck.set(c.name, { causes: new Set(), note: '' });
  const chosen = new Set(), seenSig = new Set(), sugBox = h('div', { class: 'stack' }), saveBar = h('div', { class: 'toolbar wrap' });
  const stuckList = () => [...st.stuck].map(([name, v]) => ({ name, causes: [...v.causes], note: v.note }));
  const prevSigs = new Set((existing?.actions || []).map(sig));
  const fresh = () => (tpl ? suggestActions({ run, tpl, stuck: stuckList() }).filter((a) => !prevSigs.has(sig(a))) : []);
  function drawSug() {
    const list = fresh(); for (const a of list) if (!seenSig.has(sig(a))) { seenSig.add(sig(a)); chosen.add(sig(a)); }   // new suggestions start ticked
    setChildren(sugBox,
      (existing?.actions || []).length ? h('ul', { class: 'unp-list' }, existing.actions.map((a) => h('li', {}, `${a.applied ? '✅' : '▫️'} ${actionLabel(a)}`))) : null,
      list.length ? list.map((a) => h('label', { class: 'strat-pick' }, h('input', { type: 'checkbox', checked: chosen.has(sig(a)), onchange: (e) => { if (e.target.checked) chosen.add(sig(a)); else chosen.delete(sig(a)); drawBar(); } }), h('span', {}, actionLabel(a)))) : h('p', { class: 'note' }, t(st.stuck.size ? 'rcNoSuggestions' : 'rcPickStuckFirst')));
    drawBar();
  }
  const picked = () => fresh().filter((a) => chosen.has(sig(a)));
  async function save(applyNow) {
    const list = picked(), prev = existing?.actions || [], actions = [...prev, ...list].map((a) => ({ id: a.id, type: a.type, applied: !!a.applied, params: a.params }));
    const saved = await S.saveRetro({ id: existing?.id, runId, templateId: run.templateId, templateName: run.templateName, rating: st.rating, good: st.good, idea: st.idea, stuck: stuckList(), actions, appliedAt: existing?.appliedAt || 0 });
    if (!saved) return;
    if (applyNow && list.length) { const ids = saved.actions.filter((a) => !a.applied && list.some((p) => sig(p) === sig(a))).map((a) => a.id), r = await S.applyRetro(saved.id, ids); toast(t('rcApplied', { n: r.applied })); } else toast(t('rcSaved'));
    nav(`#/retro/${runId}`);
  }
  function drawBar() {
    const n = picked().length;
    setChildren(saveBar, h('button', { class: 'btn', type: 'button', onclick: () => save(false) }, `💾 ${t('rcSave')}`), tpl && n ? h('button', { class: 'btn primary', type: 'button', onclick: () => save(true) }, `✅ ${t('rcSaveApply', { n })}`) : null,
      existing ? h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (await confirmBox(t('rcDeleteAsk'), t('delete'), true)) { await S.removeRetro(existing.id); nav('#/retros'); } } }, t('delete')) : null);
  }
  const causeChips = (v, onChange) => h('div', { class: 'chips', role: 'group', 'aria-label': t('rcWhy') }, CAUSES.map((c) => h('button', { class: `chip btn-chip cause ${v.causes.has(c.id) ? 'on' : ''}`, type: 'button', 'aria-pressed': String(v.causes.has(c.id)), onclick: (e) => { if (v.causes.has(c.id)) v.causes.delete(c.id); else v.causes.add(c.id); e.currentTarget.classList.toggle('on', v.causes.has(c.id)); e.currentTarget.setAttribute('aria-pressed', String(v.causes.has(c.id))); onChange(); } }, `${c.emoji} ${t(`rc_${c.id}`)}`)));
  const taskCards = stuckCandidates(run).map((c) => {
    const v = st.stuck.get(c.name), detail = h('div', { class: 'stack', hidden: !v });
    const fill = () => { const cur = st.stuck.get(c.name); setChildren(detail, cur ? [causeChips(cur, drawSug), h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('rcNote')), h('input', { type: 'text', maxLength: 300, value: cur.note, placeholder: t(kid ? 'rcNotePhKid' : 'rcNotePh'), oninput: (e) => { cur.note = e.target.value; } }))] : null); detail.hidden = !cur; };
    fill();
    return h('article', { class: 'card retro-task' }, h('label', { class: 'switch row' }, h('span', {}, `${c.icon || '•'} ${c.name}`, h('small', { class: 'hint' }, [c.over >= 30 ? `⏱ +${dur(c.over)}` : '', c.difficulty >= 4 ? `😓 ${c.difficulty}/5` : '', c.interrupted ? '⚡' : ''].filter(Boolean).join(' · '))),
      h('input', { type: 'checkbox', checked: !!v, 'aria-label': `${t('rcStuckHere')}: ${c.name}`, onchange: (e) => { if (e.target.checked) st.stuck.set(c.name, { causes: new Set(), note: '' }); else st.stuck.delete(c.name); fill(); drawSug(); } })), detail);
  });
  const s = (k) => (kid ? t(`${k}Kid`) : t(k));
  setChildren(root, h('div', { class: 'row between' }, h('h1', {}, `🔄 ${t('rcTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav('#/retros') }, t('back'))),
    h('p', { class: 'note' }, `${run.icon} ${run.templateName} · ${new Date(run.startedAt).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short' })} · ${t('planned')} ${dur(run.plannedTotal)} → ${t('actual')} ${dur(run.actualTotal)}`),
    existing?.appliedAt ? [verdictChip(impact(existing, S.myRuns())), impactBox(impact(existing, S.myRuns()))] : null,
    h('section', { class: 'card stack' }, h('h2', {}, `1. ${s('rcQ1')}`), moodRow((v) => { st.rating = v; }, st.rating || null)),
    h('section', { class: 'stack' }, h('h2', {}, `2. ${s('rcQ2')}`), h('p', { class: 'note' }, t('rcQ2Hint')), taskCards),
    h('section', { class: 'card stack' }, h('h2', {}, `3. ${s('rcQ3')}`), h('textarea', { rows: 2, maxLength: 400, 'aria-label': s('rcQ3'), placeholder: t('rcGoodPh'), oninput: (e) => { st.good = e.target.value; } }, st.good)),
    h('section', { class: 'card stack' }, h('h2', {}, `4. ${s('rcQ4')}`), h('p', { class: 'note' }, t(tpl ? 'rcQ4Hint' : 'rcNoRoutine')), sugBox, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('rcIdea')), h('input', { type: 'text', maxLength: 400, value: st.idea, placeholder: t('rcIdeaPh'), oninput: (e) => { st.idea = e.target.value; } }))),
    saveBar, h('p', { class: 'note' }, t('rcFollowUp')));
  drawSug();
  return () => {};
}

export function renderRetros(root, nav) {
  const draw = () => {
    const rs = S.retros(), runs = S.myRuns(), o = overview(rs, runs), done = new Set(rs.map((r) => r.runId)), todo = runs.filter((r) => r.endedAt && !done.has(r.id)).sort((a, b) => b.endedAt - a.endedAt).slice(0, 5);
    setChildren(root, h('div', { class: 'row between' }, h('h1', {}, `🔄 ${t('rcvTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav('#/') }, t('back'))), h('p', { class: 'note' }, t('rcvIntro')),
      o.total ? h('section', { class: 'card stack' }, h('div', { class: 'tiles' }, [[t('rcvLooks'), o.total], [t('rcvApplied'), o.applied], [`📈 ${t('rcvStatus_improved', { n: 0 })}`, o.improved], [`📉 ${t('rcvStatus_worse', { n: 0 })}`, o.worse]].map(([l, v]) => h('div', { class: 'tile' }, h('small', {}, l), h('strong', {}, String(v))))),
        o.conclusions.length ? h('ul', { class: 'unp-list' }, o.conclusions.map((c) => h('li', {}, conclusionText(c)))) : null,
        o.causes.length ? h('div', {}, h('h2', {}, t('rcvCauses')), o.causes.slice(0, 5).map((c) => h('div', { class: 'diff-bar' }, h('span', {}, `${CAUSES.find((x) => x.id === c.cause)?.emoji || ''} ${t(`rc_${c.cause}`)}`), h('div', { class: 'bar' }, h('i', { style: { width: `${(c.n / o.causes[0].n) * 100}%`, background: '#6c5ce7' } })), h('small', {}, `${c.n}×`)))) : null,
        o.byType.length ? h('div', {}, h('h2', {}, t('rcvByType')), h('ul', { class: 'unp-list' }, o.byType.map((x) => h('li', {}, `${t(`rcType_${x.type}`)}: ${x.improved}📈 ${x.same}➖ ${x.worse}📉 (${x.n}×)`)))) : null) : h('p', { class: 'empty' }, t('rcvEmpty')),
      todo.length ? h('section', {}, h('h2', {}, t('rcvTodo')), h('div', { class: 'stack' }, todo.map((r) => h('a', { class: 'card link-card', href: `#/retro/${r.id}` }, h('span', { class: 'emoji' }, r.icon), h('span', { class: 'routine-text' }, h('strong', {}, r.templateName), h('small', {}, `${dateStr(r.endedAt)} · ${dur(r.actualTotal)}`)))))) : null,
      rs.length ? h('section', {}, h('h2', {}, t('rcvHistory')), h('div', { class: 'stack' }, [...o.items].reverse().map(({ r, im }) => h('a', { class: 'card retro-item', href: `#/retro/${r.runId}` }, h('div', { class: 'row between' }, h('strong', {}, `${r.templateName} · ${dateStr(r.at)}`), r.rating ? h('span', {}, MOODS[r.rating - 1].emoji) : null),
        r.stuck.length ? h('small', {}, `${t('rcStuckList')}: ${r.stuck.map((x) => x.name).join(', ')}`) : null, verdictChip(im))))) : null);
  };
  draw(); const off = S.subscribe(draw); return () => off();
}

/** Home: a gentle prompt to look back at a recent run (can be dismissed; never shown in simple mode). */
export function dueCard(nav, redraw) {
  const run = dueRun(S.myRuns(), S.retros()); let skipped = ''; try { skipped = localStorage.getItem('mo.retroSkip') || ''; } catch { /* blocked */ }
  if (!run || skipped === run.id) return null;
  return h('section', { class: 'card focus-card' }, h('strong', {}, `🔄 ${t('rcDueTitle', { name: run.templateName })}`), h('p', {}, t('rcDueBody')),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: () => nav(`#/retro/${run.id}`) }, t('rcDoIt')), h('button', { class: 'btn', type: 'button', onclick: () => { try { localStorage.setItem('mo.retroSkip', run.id); } catch { /* blocked */ } redraw(); } }, t('focusLater'))));
}

// Goals: Goal - Plan - Do - Check. Pick a meaningful goal, choose up to three strategies, try them in the routine, check what worked.
import { h, setChildren } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { STRATEGIES, DOMAINS, MAX_STRATS, MAX_GOALS, progress, strategyStats } from '../cogfun.js';
import { MOODS } from '../mood.js';
import { modal, toast, confirmBox } from './common.js';
import { moodRow } from './capture.js';
import { openWizard } from './wizard.js';

const stratText = (id) => t(`strat_${id}`);
/** Short readable plan: strategies + the person's own. */
export const planText = (g) => [...g.strategies.map(stratText), g.custom].filter(Boolean).join(' · ');

/** Create / edit. opts.parent: a parent is writing it for a child (no routine link). onSave(goal). */
export function openGoalWizard(goal, { parent = false, onSave } = {}) {
  const g = goal ? { ...goal, strategies: [...goal.strategies] } : { title: '', templateId: '', strategies: [], custom: '' };
  const title = h('input', { type: 'text', maxLength: 80, value: g.title, placeholder: t('goalPh'), 'aria-label': t('goalWhat') }), custom = h('input', { type: 'text', maxLength: 120, value: g.custom, placeholder: t('goalCustomPh'), 'aria-label': t('goalCustom') });
  const sel = h('select', { 'aria-label': t('goalRoutine') }, [h('option', { value: '' }, t('goalNoRoutine')), ...S.get().templates.map((x) => h('option', { value: x.id, selected: x.id === g.templateId }, `${x.icon} ${x.name}`))]);
  const examples = h('div', { class: 'chips' }, ['goalEx1', 'goalEx2', 'goalEx3', 'goalEx4'].map((k) => h('button', { class: 'chip btn-chip', type: 'button', onclick: () => { title.value = t(k); } }, t(k))));
  const msg = h('p', { class: 'note', role: 'status' }, ''), boxes = new Map();
  const count = () => g.strategies.length;
  const picks = DOMAINS.map((d) => h('fieldset', { class: 'stack' }, h('legend', {}, t(`dom_${d}`)), STRATEGIES.filter((s) => s.domain === d).map((s) => {
    const cb = h('input', { type: 'checkbox', checked: g.strategies.includes(s.id), onchange: (e) => {
      if (e.target.checked && count() >= MAX_STRATS) { e.target.checked = false; msg.textContent = t('goalMax', { n: MAX_STRATS }); return; }
      g.strategies = e.target.checked ? [...g.strategies, s.id] : g.strategies.filter((x) => x !== s.id); msg.textContent = ''; } });
    boxes.set(s.id, cb); return h('label', { class: 'strat-pick' }, cb, h('span', {}, stratText(s.id)));
  })));
  return modal(`🎯 ${t(goal ? 'goalEdit' : 'goalNew')}`, h('div', { class: 'stack' },
    h('div', { class: 'gpdc', 'aria-hidden': 'true' }, ['gpdc1', 'gpdc2', 'gpdc3', 'gpdc4'].map((k) => h('span', { class: 'chip' }, t(k)))),
    h('p', { class: 'note' }, t('goalIntro')), h('label', { class: 'field' }, h('span', { class: 'lbl' }, `1. ${t('goalWhat')}`), title), examples,
    parent ? null : h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('goalRoutine')), sel),
    h('h3', {}, `2. ${t('goalPlan', { n: MAX_STRATS })}`), picks, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('goalCustom')), custom), msg, h('p', { class: 'note' }, t('goalDoCheck'))),
  [{ label: t('cancel') }, { label: t('save'), primary: true, fn: async () => {
    if (!title.value.trim()) { msg.textContent = t('goalNeedTitle'); return false; }
    await onSave({ ...g, title: title.value, custom: custom.value, templateId: parent ? '' : sel.value, since: goal?.since || Date.now() }); } }]);
}

/** "Check": did the plan work? Faces + one line. */
export function openCheckin(goal, after) {
  let rating = 0; const used = new Set(), note = h('textarea', { rows: 3, maxLength: 200, placeholder: t('checkPh'), 'aria-label': t('checkNote') });
  const usedBox = goal.strategies.length ? h('fieldset', { class: 'stack' }, h('legend', {}, t('checkUsed')), goal.strategies.map((id) => h('label', { class: 'strat-pick' }, h('input', { type: 'checkbox', onchange: (e) => { if (e.target.checked) used.add(id); else used.delete(id); } }), h('span', {}, stratText(id))))) : null;
  return modal(`✔ ${t('checkTitle')}`, h('div', { class: 'stack' }, h('strong', {}, goal.title), h('p', { class: 'note' }, planText(goal)), h('p', {}, t('checkAsk')), moodRow((v) => { rating = v; }), usedBox, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('checkNote')), note)),
    [{ label: t('cancel') }, { label: t('save'), primary: true, fn: async () => { if (!rating) { toast(t('checkPick')); return false; } await S.addCheck(goal.id, { rating, note: note.value, used: [...used] }); toast(t('checkSaved')); after?.(); } }]);
}

export function goalCard(g, runs, redraw, nav = null) {
  const p = progress(g, runs), tpl = g.templateId ? S.getTemplate(g.templateId) : null;
  return h('article', { class: `card goal-card ${g.done ? 'achieved' : ''}` }, h('strong', {}, `${g.done ? '🏆' : '🎯'} ${g.title}`), g.from ? h('small', { class: 'muted' }, t('goalFrom', { name: g.from })) : null,
    tpl ? h('small', {}, `${tpl.icon} ${tpl.name}`) : null, h('p', { class: 'note' }, `${t('goalMyPlan')}: ${planText(g) || '—'}`),
    h('div', { class: 'chips' }, p.runs ? h('span', { class: 'chip solid' }, t('goalOnTime', { a: p.onTime, b: p.runs })) : null, p.checks ? h('span', { class: 'chip solid' }, `${MOODS[Math.round(p.avgRating) - 1]?.emoji ?? ''} ${t('goalChecks', { n: p.checks })}`) : null,
      p.trend > 0 ? h('span', { class: 'chip solid' }, `📈 ${t('goalBetter')}`) : null),
    strategyStats(g)[0] ? h('p', { class: 'note' }, `⭐ ${t('goalBestStrat', { s: stratText(strategyStats(g)[0].id), avg: Math.round(strategyStats(g)[0].avg * 10) / 10 })}`) : null,
    g.done ? null : h('div', { class: 'row-btns' }, h('button', { class: 'btn small primary', type: 'button', onclick: () => openCheckin(g, redraw) }, `✔ ${t('checkTitle')}`),
      h('button', { class: 'btn small', type: 'button', onclick: () => openGoalWizard(g, { onSave: async (x) => { await S.saveGoal(x); redraw(); } }) }, t('edit')),
      nav ? h('button', { class: 'btn small', type: 'button', onclick: () => openWizard(nav, { goalId: g.id }) }, `🪄 ${t('goalBuild')}`) : null,
      h('button', { class: 'btn small', type: 'button', onclick: async () => { await S.saveGoal({ ...g, done: true, doneAt: Date.now() }); toast(t('goalCongrats')); redraw(); } }, `🎉 ${t('goalAchieved')}`)),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn small danger', type: 'button', onclick: async () => { if (await confirmBox(t('confirmDelete', { name: g.title }), t('delete'), true)) { await S.removeGoal(g.id); redraw(); } } }, t('delete'))));
}

export function renderGoals(root, nav) {
  const draw = () => {
    const all = S.goals(), open = all.filter((g) => !g.done), done = all.filter((g) => g.done), runs = S.myRuns();
    setChildren(root, h('div', { class: 'row between' }, h('h1', {}, `🎯 ${t('goalsTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav('#/') }, t('back'))),
      h('div', { class: 'gpdc', 'aria-hidden': 'true' }, ['gpdc1', 'gpdc2', 'gpdc3', 'gpdc4'].map((k) => h('span', { class: 'chip' }, t(k)))), h('p', { class: 'note' }, t('goalsIntro')),
      h('button', { class: 'btn primary', type: 'button', disabled: all.length >= MAX_GOALS, onclick: () => openGoalWizard(null, { onSave: async (x) => { await S.saveGoal(x); draw(); } }) }, `+ ${t('goalNew')}`),
      open.length ? h('div', { class: 'stack' }, open.map((g) => goalCard(g, runs, draw, nav))) : h('p', { class: 'empty' }, t('goalsEmpty')),
      done.length ? h('details', {}, h('summary', {}, t('goalsDone', { n: done.length })), h('div', { class: 'stack' }, done.map((g) => goalCard(g, runs, draw)))) : null,
      h('p', { class: 'note' }, t('goalsDisclaimer')));
  };
  draw(); const off = S.subscribe(draw);
  return () => off();
}

// Smart suggestions in the routine editor: realistic times (history / estimate) and in-between steps that fit the chosen help.
import { h, setChildren, fmtHuman, uid } from '../util.js';
import { t, units } from '../i18n.js';
import * as S from '../store.js';
import * as F from '../family.js';
import { smartTimes, suggestTime, suggestInterstitials, applyInterstitials, norm, buildHistory } from '../smart.js';
import { taskDifficulty, hardSpots } from '../difficulty.js';
import { modal, toast } from './common.js';

const dur = (s) => fmtHuman(s, units());
/** Who are the suggestions for? me, or a linked child (age and help areas known from the link; no run history of theirs here). */
export function audiences() {
  const p = S.activeProfile(), me = { id: 'me', label: p.name || t('smMe'), age: p.age, areas: p.focus, runs: S.myRuns() };
  const kids = F.allChildLinks().map((l) => ({ id: l.id, label: l.child?.profile?.name || l.peer?.name || '?', age: l.child?.profile?.age ?? null, areas: l.child?.focus?.areas || [], runs: [] }));
  return [me, ...kids];
}
const ctxOf = (who) => ({ runs: who.runs, age: who.age, areas: who.areas, defaultSec: S.get().settings.defTaskSec });

/** One line that says why a time is suggested. */
export function reasonText(s) {
  if (s.source === 'history') return t('smReasonHistory', { n: s.n, t: dur(s.base) });
  const bits = [s.ageFactor > 1 ? t('smAge', { pct: Math.round((s.ageFactor - 1) * 100) }) : '', s.supportPct ? t('smHelp', { pct: s.supportPct }) : ''].filter(Boolean).join(', ');
  return t(s.source === 'keyword' ? 'smReasonKeyword' : 'smReasonDefault', { t: dur(s.base), adj: bits ? ` (${bits})` : '' });
}
/** Small hint under a task name: "✨ about 8m - because… [Use]". null when there is nothing worth suggesting. */
let histKey = '', hist = null;   // the history index is rebuilt only when the list of runs changed
const myHistory = () => { const runs = S.myRuns(), key = `${S.activeProfile().id}:${runs.length}:${runs.at(-1)?.id ?? ''}`; if (key !== histKey) { histKey = key; hist = buildHistory(runs); } return hist; };
export function timeHint(task, apply) {
  const me = audiences()[0], s = suggestTime({ ...ctxOf(me), history: myHistory(), name: task.name });
  if (!task.name || Math.abs(s.sec - task.sec) < 15 || Math.abs(s.sec - task.sec) / Math.max(1, task.sec) < 0.25) return null;
  return h('p', { class: 'smart-hint' }, h('span', {}, `✨ ${t('smHint', { t: dur(s.sec) })} · ${reasonText(s)}`), h('button', { class: 'btn small', type: 'button', onclick: (e) => { apply(s.sec); e.currentTarget.parentNode.remove(); } }, t('smUse')));
}

export function openSmartTimes(tpl, apply) {
  const who = audiences(); let cur = who[0];
  const list = h('div', { class: 'stack' }), picks = new Map();
  const draw = () => {
    picks.clear();
    const rows = smartTimes(tpl.tasks, ctxOf(cur));
    setChildren(list, rows.map((r) => { const cb = h('input', { type: 'checkbox', checked: r.changes, 'aria-label': `${t('smUse')}: ${tpl.tasks[r.index].name}` }); picks.set(r.index, { cb, sec: r.sec });
      return h('label', { class: 'smart-row' }, cb, h('span', { class: 'sr-body' }, h('strong', {}, `${tpl.tasks[r.index].icon || ''} ${tpl.tasks[r.index].name || '—'}`), h('span', {}, `${dur(r.current)} → `, h('b', {}, dur(r.sec)), r.changes ? '' : ` (${t('smSame')})`), h('small', { class: 'muted' }, reasonText(r)))); }));
  };
  draw();
  return modal(`✨ ${t('smTimesTitle')}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('smTimesHint')),
    who.length > 1 ? h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('smFor')), h('select', { onchange: (e) => { cur = who.find((x) => x.id === e.target.value) || who[0]; draw(); } }, who.map((x) => h('option', { value: x.id }, x.label)))) : null, list),
  [{ label: t('cancel') }, { label: t('smApply'), primary: true, fn: () => { const m = new Map(); for (const [i, p] of picks) if (p.cb.checked) m.set(i, p.sec); apply(m); toast(t('smApplied', { n: m.size })); } }]);
}

export function openSmartSteps(tpl, apply) {
  const who = audiences(); let cur = who[0];
  const list = h('div', { class: 'stack' }), picks = [];
  const hardNames = () => new Set(hardSpots(taskDifficulty(S.myRuns())).map((x) => norm(x.name)));
  const draw = () => {
    picks.length = 0;
    const tips = suggestInterstitials(tpl.tasks, { areas: cur.areas, age: cur.age, hardNames: hardNames() });
    if (!tips.length) { setChildren(list, h('p', { class: 'empty' }, t(cur.areas?.length ? 'smStepsNone' : 'smStepsNoAreas'))); return; }
    setChildren(list, tips.map((x) => { const cb = h('input', { type: 'checkbox', checked: true, 'aria-label': t(x.key) }); picks.push({ cb, x });
      const after = x.afterIndex < 0 ? t('smBeforeFirst') : t('smAfterTask', { task: tpl.tasks[x.afterIndex]?.name || '' });
      return h('label', { class: 'smart-row' }, cb, h('span', { class: 'sr-body' }, h('strong', {}, `${x.icon} ${t(x.key)} · ${dur(x.sec)}`), h('small', { class: 'muted' }, `${after} - ${t(x.reason)}`))); }));
  };
  draw();
  return modal(`🧩 ${t('smStepsTitle')}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('smStepsHint')),
    who.length > 1 ? h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('smFor')), h('select', { onchange: (e) => { cur = who.find((x) => x.id === e.target.value) || who[0]; draw(); } }, who.map((x) => h('option', { value: x.id }, x.label)))) : null, list),
  [{ label: t('cancel') }, { label: t('smApply'), primary: true, fn: () => { const chosen = picks.filter((p) => p.cb.checked).map((p) => p.x); if (!chosen.length) return false; apply(applyInterstitials(tpl.tasks, chosen, (k) => t(k), uid)); toast(t('smApplied', { n: chosen.length })); } }]);
}

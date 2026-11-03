// Unplanned interruptions UI: the "what happened?" sheet during a run, pattern cards ("this keeps happening"), the magnifier and the Stats card.
import { h, setChildren, fmtHuman } from '../util.js';
import { t, units } from '../i18n.js';
import * as S from '../store.js';
import * as J from '../journal.js';
import { REASONS, customKey, reasonEmoji, recurring, totals, compareSince, withTask } from '../unplanned.js';
import { modal, toast } from './common.js';

/** Display name of a reason: presets are translated, custom ones keep the person's own words. */
export const reasonName = (u) => (REASONS.some((r) => r.key === u.key) ? t(`unp_${u.key}`) : u.label || u.key);

/** Sheet to pick why. onPick({ key, label, emoji }). */
export function openUnplannedSheet(onPick) {
  const custom = h('input', { type: 'text', maxLength: 30, placeholder: t('unpCustomPh'), 'aria-label': t('unpCustom') });
  let m;
  const pick = (r) => { m.close(); onPick(r); };
  m = modal(`⚡ ${t('unpTitle')}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('unpHint')),
    h('div', { class: 'reasons' }, REASONS.filter((r) => r.key !== 'other').map((r) => h('button', { class: 'btn reason', type: 'button', onclick: () => pick({ key: r.key, label: t(`unp_${r.key}`), emoji: r.emoji }) }, `${r.emoji} ${t(`unp_${r.key}`)}`))),
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('unpCustom')), custom)),
  [{ label: t('cancel') }, { label: t('unpStart'), primary: true, fn: () => { const label = custom.value.trim() || t('unp_other'); pick(custom.value.trim() ? { key: customKey(label), label, emoji: '⚡' } : { key: 'other', label, emoji: '⚡' }); return false; } }]);
  return m;
}

const clockMin = (sec) => fmtHuman(Math.max(30, sec), units());

/** Magnifier: the facts about a recurring interruption + a few guiding questions. Saves a "watch" and an insight in the journal. */
export function openInvestigate(tpl, p, onDone) {
  const runs = S.myRuns(), existing = S.watchList().find((w) => w.templateId === tpl.id && w.key === p.key);
  const q = (key, label) => h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), h('textarea', { rows: 2, maxLength: 500, value: existing?.[key] || '' }));
  const why = q('why', t('invWhy')), before = q('before', t('invBefore')), idea = q('idea', t('invIdea'));
  const cmp = existing ? compareSince(runs, tpl.id, p.key, existing.since) : null;
  const facts = [t('invFactRate', { hits: p.hits, runs: p.runs }), t('invFactAvg', { t: clockMin(p.avgSec) }), p.task ? t('invFactTask', { task: p.task }) : null].filter(Boolean);
  return modal(`🔍 ${p.emoji} ${reasonName(p)}`, h('div', { class: 'stack' }, h('ul', {}, facts.map((f) => h('li', {}, f))),
    cmp ? h('p', { class: 'chip solid' }, t('invSince', { b: `${cmp.before.hits}/${cmp.before.runs}`, a: `${cmp.after.hits}/${cmp.after.runs}` })) : null,
    h('p', { class: 'note' }, t('invHint')), [why, before, idea],
    h('p', { class: 'note' }, t('invExamples'))),
  [{ label: t('cancel') }, existing ? { label: t('invStop'), danger: true, fn: async () => { await S.removeWatch(existing.id); onDone?.(); } } : null,
    { label: t('invSave'), primary: true, fn: async () => {
      const f = (n) => n.querySelector('textarea').value;
      await S.addWatch({ id: existing?.id, templateId: tpl.id, key: p.key, label: p.label, emoji: p.emoji, since: existing?.since || Date.now(), why: f(why), before: f(before), idea: f(idea) });
      const text = [`🔍 ${p.emoji} ${reasonName(p)} - ${tpl.name}`, f(why) && `${t('invWhy')} ${f(why)}`, f(before) && `${t('invBefore')} ${f(before)}`, f(idea) && `${t('invIdea')} ${f(idea)}`].filter(Boolean).join('\n');
      if (f(why) || f(before) || f(idea)) await J.addEntry(S.activeProfile().id, { kind: 'insight', text, routine: tpl.name });
      toast(t('invSaved')); onDone?.(); } }].filter(Boolean));
}

/** Cards for the interruptions that keep coming back in one routine: add it permanently, or look closer. */
export function patternCards(tpl, nav, onChange = () => {}) {
  const list = recurring(S.myRuns(), tpl.id); if (!list.length) return null;
  return h('section', { class: 'stack pattern-cards' }, list.map((p) => {
    const w = S.watchList().find((x) => x.templateId === tpl.id && x.key === p.key), has = tpl.tasks.some((x) => x.name === p.label);
    return h('article', { class: 'card pattern' }, h('strong', {}, `${p.emoji} ${t('patTitle', { name: reasonName(p), hits: p.hits, runs: p.runs })}`), h('p', { class: 'note' }, t('patBody', { t: clockMin(p.avgSec), task: p.task || '—' })),
      w ? h('p', { class: 'chip solid' }, `🔍 ${t('invWatching')}`) : null,
      h('div', { class: 'row-btns' },
        has ? null : h('button', { class: 'btn small primary', type: 'button', onclick: async () => { await S.saveTemplate(withTask(S.getTemplate(tpl.id) || tpl, p)); toast(t('patAdded', { name: reasonName(p) })); onChange(); } }, `➕ ${t('patAdd', { t: clockMin(p.suggestSec) })}`),
        h('button', { class: 'btn small', type: 'button', onclick: () => openInvestigate(tpl, p, onChange) }, `🔍 ${t('patLook')}`)));
  }));
}

/** Stats: how often and how long, and what for. Shown once there is something to show. */
export function unplannedCard(runs) {
  const tt = totals(runs); if (!tt.count) return null;
  return h('section', { class: 'card' }, h('h2', {}, `⚡ ${t('unpStatsTitle')}`),
    h('div', { class: 'tiles' }, h('div', { class: 'tile' }, h('small', {}, t('unpCount')), h('strong', {}, String(tt.count))), h('div', { class: 'tile' }, h('small', {}, t('unpTime')), h('strong', {}, clockMin(tt.sec))), h('div', { class: 'tile' }, h('small', {}, t('unpRuns')), h('strong', {}, `${tt.runsWith}/${tt.runs}`))),
    h('ul', { class: 'unp-list' }, tt.by.slice(0, 6).map((e) => h('li', {}, `${e.emoji ?? reasonEmoji(e.key)} ${reasonName(e)} · ${e.count}× · ${clockMin(e.sec)}`))));
}

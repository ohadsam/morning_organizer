// The routine wizard: a few big, calm questions -> a routine made for this person (age, what helps, which routine, when).
// One question per screen, always a Back button, nothing is saved until the last step, and it can be opened from home, search and suggestions.
import { h, setChildren, uid, fmtHuman } from '../util.js';
import { t, units, getLang } from '../i18n.js';
import * as S from '../store.js';
import { modal } from './common.js';
import { NEED_IDS, KINDS, KIND_ROUTINE, AGE_CHOICES, START_TIMES, areasOf, buildTasks } from '../guided.js';
import { presetDays } from '../schedule.js';
import { defaultAlarm } from '../wake.js';
import { sanitizeAreas } from '../focus.js';

const STEPS = ['who', 'needs', 'what', 'when', 'review'];

export function openWizard(nav) {
  const st = { step: 0, who: 'me', age: null, needs: [], kind: 'morning', time: START_TIMES.morning, days: 'school', alarm: true, breaks: true, created: null };
  let m; const body = h('div', { class: 'wizard stack' });
  const opt = (label, on, onclick, { multi = false, emoji = '' } = {}) => h('button', { type: 'button', class: `wz-opt ${on ? 'on' : ''}`, role: multi ? 'checkbox' : 'radio', 'aria-checked': String(!!on), onclick },
    emoji ? h('span', { class: 'wz-e', 'aria-hidden': 'true' }, emoji) : null, h('span', {}, label));
  const kindList = () => (st.who === 'me' && (st.age ?? 30) >= 18 ? ['adult', ...KINDS.filter((k) => k !== 'morning' && k !== 'adult')] : KINDS.filter((k) => k !== 'adult'));
  const dayList = () => { const pre = presetDays(getLang()); return st.days === 'every' ? [] : st.days === 'weekend' ? pre.weekend : pre.school; };
  const plan = () => {
    const entry = S.ideaRoutines().find((r) => r.id === KIND_ROUTINE[st.kind]);
    return { entry, ...buildTasks({ entry, age: st.age, needs: st.needs, withBreaks: st.breaks, runs: S.myRuns(), defaultSec: S.get().settings.defTaskSec, tr: t, newId: uid }) };
  };

  const screens = {
    who: () => [h('h3', {}, t('wzWho')),
      h('div', { class: 'wz-grid', role: 'radiogroup', 'aria-label': t('wzWho') }, opt(t('wzMe'), st.who === 'me', () => { st.who = 'me'; if (!kindList().includes(st.kind)) st.kind = kindList()[0]; st.time = START_TIMES[st.kind]; draw(); }, { emoji: '🙂' }), opt(t('wzChild'), st.who === 'child', () => { st.who = 'child'; if (!kindList().includes(st.kind)) st.kind = kindList()[0]; st.time = START_TIMES[st.kind]; draw(); }, { emoji: '🧒' })),
      h('h3', {}, t('wzAge')), h('small', { class: 'hint' }, t('wzAgeHint')),
      h('div', { class: 'wz-grid', role: 'radiogroup', 'aria-label': t('wzAge') }, AGE_CHOICES.map(([a, label]) => opt(`\u2066${label}\u2069`, st.age === a, () => { st.age = st.age === a ? null : a; draw(); })))],
    needs: () => [h('h3', {}, t('wzNeeds')), h('small', { class: 'hint' }, t('wzNeedsHint')),
      h('div', { class: 'wz-list', role: 'group', 'aria-label': t('wzNeeds') }, NEED_IDS.map((n) => opt(t(`wzN_${n}`), st.needs.includes(n), () => {
        st.needs = n === 'simple' ? (st.needs.includes('simple') ? [] : ['simple']) : (st.needs.includes(n) ? st.needs.filter((x) => x !== n) : [...st.needs.filter((x) => x !== 'simple'), n]); draw();
      }, { multi: true, emoji: { adhd: '🎯', organize: '🕒', anxiety: '🌬️', motivation: '🚀', simple: '✨' }[n] })))],
    what: () => [h('h3', {}, t('wzWhat')),
      h('div', { class: 'wz-list', role: 'radiogroup', 'aria-label': t('wzWhat') }, kindList().map((k) => opt(t(`wzK_${k}`), st.kind === k, () => { st.kind = k; st.time = START_TIMES[k]; draw(); }, { emoji: { morning: '🌅', adult: '☕', bedtime: '🌙', homework: '📚', afterschool: '🏠', evening: '🎒' }[k] })))],
    when: () => [h('h3', {}, t('wzWhen')),
      h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('alarmTime')), h('input', { type: 'time', value: st.time, 'aria-label': t('wzWhen'), onchange: (e) => { if (/^\d{2}:\d{2}$/.test(e.target.value)) st.time = e.target.value; } })),
      h('h3', {}, t('wzDays')),
      h('div', { class: 'wz-grid', role: 'radiogroup', 'aria-label': t('wzDays') }, [['school', 'wzSchool'], ['every', 'wzEvery'], ['weekend', 'wzWeekend']].map(([k, key]) => opt(t(key), st.days === k, () => { st.days = k; draw(); }))),
      h('label', { class: 'switch row' }, h('span', {}, t('wzAlarm')), h('input', { type: 'checkbox', checked: st.alarm, onchange: (e) => { st.alarm = e.target.checked; } }))],
    review: () => {
      const p = plan(), areas = areasOf(st.needs);
      return [h('h3', {}, t('wzReview')), h('p', { class: 'note' }, `${p.entry.icon} ${t(`wzK_${st.kind}`)} · ${t('wzSummary', { n: p.tasks.length, time: fmtHuman(p.totalSec, units()) })}`),
        h('ol', { class: 'wz-tasks', tabindex: 0, 'aria-label': t('wzReview') }, p.tasks.map((k) => h('li', {}, h('span', { 'aria-hidden': 'true' }, k.icon || '•'), ' ', k.name, h('small', { class: 'hint' }, ` ${fmtHuman(k.sec, units())}`)))),
        areas.length ? h('label', { class: 'switch row' }, h('span', {}, t('wzBreaks'), h('small', { class: 'hint' }, t('wzBreaksHint'))), h('input', { type: 'checkbox', checked: st.breaks, onchange: (e) => { st.breaks = e.target.checked; draw(); } })) : null,
        h('small', { class: 'hint' }, t('wzEditAfter'))];
    },
  };

  async function create() {
    const p = plan(), days = dayList();
    const tpl = S.newTemplate(p.entry.name);
    Object.assign(tpl, { name: p.entry.name, icon: p.entry.icon, color: p.entry.color, days, tasks: p.tasks, alarm: defaultAlarm(days.length ? days : [0, 1, 2, 3, 4, 5, 6], st.time, st.alarm) });
    await S.saveTemplate(tpl);
    if (st.who === 'me' && p.areas.length) { const me = S.activeProfile(); await S.patchProfile(me.id, { focus: sanitizeAreas([...(me.focus || []), ...p.areas]) }); }
    st.created = tpl; draw();
  }

  function draw() {
    if (st.created) {
      return setChildren(body, h('h3', {}, `🎉 ${t('wzDoneTitle')}`), h('p', { class: 'note' }, `${st.created.icon} ${st.created.name}`),
        h('div', { class: 'stack' }, h('button', { class: 'btn primary xl', type: 'button', onclick: () => { m.close(); nav(`#/run/${st.created.id}`); } }, `▶ ${t('wzStartNow')}`),
          h('button', { class: 'btn', type: 'button', onclick: () => { m.close(); nav(`#/edit/${st.created.id}`); } }, `✏️ ${t('wzEditIt')}`),
          h('button', { class: 'btn', type: 'button', onclick: () => { m.close(); nav('#/'); } }, t('wzDone'))));
    }
    const id = STEPS[st.step], last = st.step === STEPS.length - 1;
    setChildren(body, h('p', { class: 'wz-step', 'aria-live': 'polite' }, t('wzStep', { n: st.step + 1, total: STEPS.length })),
      h('div', { class: 'wz-bar', role: 'presentation' }, h('div', { class: 'wz-fill', style: { width: `${((st.step + 1) / STEPS.length) * 100}%` } })),
      screens[id](),
      h('div', { class: 'wz-nav' }, st.step ? h('button', { class: 'btn', type: 'button', onclick: () => { st.step--; draw(); } }, t('wzBack')) : h('span', {}),
        h('button', { class: 'btn primary', type: 'button', onclick: () => { if (last) create(); else { st.step++; draw(); } } }, last ? t('wzCreate') : t('wzNext'))));
    body.querySelector('h3')?.setAttribute('tabindex', '-1'); body.querySelector('h3')?.focus({ preventScroll: true });
  }
  m = modal(`🪄 ${t('wzTitle')}`, body, []); m.el.classList.add('wizard-modal'); draw();
  return m;
}

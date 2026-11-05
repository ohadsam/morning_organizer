// The routine wizard: a few big, calm questions -> a routine made for this person (age, what helps, a goal, which routine, when), which can be edited
// right in the review step before anything is created. One question per screen, always a Back button, nothing is saved until the last step.
// It can be opened from Home, search, suggestions and a goal ("build a routine for this goal").
import { h, setChildren, uid, fmtHuman, clamp } from '../util.js';
import { t, units, getLang } from '../i18n.js';
import * as S from '../store.js';
import { modal, toast } from './common.js';
import { NEED_IDS, KINDS, KIND_ROUTINE, AGE_CHOICES, START_TIMES, areasOf, buildGoalTasks, strategiesFor, needsFromStrategies, goalSteps } from '../guided.js';
import { presetDays } from '../schedule.js';
import { defaultAlarm } from '../wake.js';
import { sanitizeAreas } from '../focus.js';
import { sanitizeGoal, MAX_GOALS, STRATEGIES } from '../cogfun.js';
import { applyInterstitials, suggestInterstitials } from '../smart.js';

const STEPS = ['who', 'needs', 'goal', 'what', 'when', 'review'];
const domainOf = (id) => STRATEGIES.find((s) => s.id === id)?.domain;

/** opts.goalId: build the routine for an existing goal (starts at "which routine"). */
export function openWizard(nav, opts = {}) {
  const preset = opts.goalId ? S.goals().find((g) => g.id === opts.goalId) : null;
  const st = { step: 0, who: 'me', age: null, needs: preset ? needsFromStrategies(preset.strategies, domainOf) : [], goalId: preset?.id || '', goalTitle: '', kind: 'morning', time: START_TIMES.morning, days: 'school', alarm: true, breaks: true, created: null, tasks: null, key: '' };
  if (preset) st.step = STEPS.indexOf('what');
  let m; const body = h('div', { class: 'wizard stack' });
  const opt = (label, on, onclick, { multi = false, emoji = '' } = {}) => h('button', { type: 'button', class: `wz-opt ${on ? 'on' : ''}`, role: multi ? 'checkbox' : 'radio', 'aria-checked': String(!!on), onclick },
    emoji ? h('span', { class: 'wz-e', 'aria-hidden': 'true' }, emoji) : null, h('span', {}, label));
  const kindList = () => (st.who === 'me' && (st.age ?? 30) >= 18 ? ['adult', ...KINDS.filter((k) => k !== 'morning' && k !== 'adult')] : KINDS.filter((k) => k !== 'adult'));
  const dayList = () => { const pre = presetDays(getLang()); return st.days === 'every' ? [] : st.days === 'weekend' ? pre.weekend : pre.school; };
  const goals = () => S.goals().filter((g) => !g.done), canAddGoal = () => S.goals().length < MAX_GOALS;
  const chosenGoal = () => (st.goalId && st.goalId !== 'new' ? S.goals().find((g) => g.id === st.goalId) : null);
  const strategies = () => (st.goalId === 'new' && st.goalTitle.trim() ? strategiesFor(st.needs) : chosenGoal()?.strategies || []);
  const entry = () => S.ideaRoutines().find((r) => r.id === KIND_ROUTINE[st.kind]);
  const sig = () => JSON.stringify([st.who, st.age, st.needs, st.goalId, st.goalId === 'new' ? !!st.goalTitle.trim() : '', st.kind]);
  /** The tasks start from the answers; once the person edits them they stay as edited until an earlier answer changes. */
  function ensureTasks() { if (st.tasks && st.key === sig()) return; st.key = sig(); st.tasks = buildGoalTasks({ entry: entry(), age: st.age, needs: st.needs, withBreaks: st.breaks, runs: S.myRuns(), defaultSec: S.get().settings.defTaskSec, tr: t, newId: uid, strategies: strategies() }).tasks; }
  const total = () => st.tasks.reduce((s, k) => s + k.sec, 0);
  const stepSec = (sec) => (sec < 180 ? 30 : 60);

  const taskRow = (k, i, sumEl) => {
    const lab = h('span', { class: 'wz-time', 'aria-live': 'polite' }, fmtHuman(k.sec, units()));
    const bump = (d) => { k.sec = clamp(k.sec + d * stepSec(d < 0 ? k.sec - 1 : k.sec), 15, 7200); lab.textContent = fmtHuman(k.sec, units()); sumEl.textContent = t('wzSummary', { n: st.tasks.length, time: fmtHuman(total(), units()) }); };
    return h('li', { class: 'wz-task' }, h('span', { class: 'wz-ti', 'aria-hidden': 'true' }, k.icon || '•'),
      h('input', { type: 'text', class: 'wz-name', maxLength: 80, value: k.name, placeholder: t('wzNewStep'), 'aria-label': `${t('wzStepName')} ${i + 1}`, oninput: (e) => { k.name = e.target.value; } }),
      h('span', { class: 'wz-steps' }, h('button', { class: 'btn icon-btn small', type: 'button', 'aria-label': t('wzLess'), onclick: () => bump(-1) }, '−'), lab, h('button', { class: 'btn icon-btn small', type: 'button', 'aria-label': t('wzMoreTime'), onclick: () => bump(1) }, '+'),
        h('button', { class: 'btn icon-btn small', type: 'button', 'aria-label': `${t('wzRemove')}: ${k.name}`, title: t('wzRemove'), onclick: () => { st.tasks.splice(i, 1); draw(); } }, '✕')));
  };

  const screens = {
    who: () => [h('h3', {}, t('wzWho')),
      h('div', { class: 'wz-grid', role: 'radiogroup', 'aria-label': t('wzWho') }, opt(t('wzMe'), st.who === 'me', () => { st.who = 'me'; if (!kindList().includes(st.kind)) st.kind = kindList()[0]; st.time = START_TIMES[st.kind]; draw(); }, { emoji: '🙂' }), opt(t('wzChild'), st.who === 'child', () => { st.who = 'child'; if (!kindList().includes(st.kind)) st.kind = kindList()[0]; st.time = START_TIMES[st.kind]; draw(); }, { emoji: '🧒' })),
      h('h3', {}, t('wzAge')), h('small', { class: 'hint' }, t('wzAgeHint')),
      h('div', { class: 'wz-grid', role: 'radiogroup', 'aria-label': t('wzAge') }, AGE_CHOICES.map(([a, label]) => opt(`⁦${label}⁩`, st.age === a, () => { st.age = st.age === a ? null : a; draw(); })))],
    needs: () => [h('h3', {}, t('wzNeeds')), h('small', { class: 'hint' }, t('wzNeedsHint')),
      h('div', { class: 'wz-list', role: 'group', 'aria-label': t('wzNeeds') }, NEED_IDS.map((n) => opt(t(`wzN_${n}`), st.needs.includes(n), () => {
        st.needs = n === 'simple' ? (st.needs.includes('simple') ? [] : ['simple']) : (st.needs.includes(n) ? st.needs.filter((x) => x !== n) : [...st.needs.filter((x) => x !== 'simple'), n]); draw();
      }, { multi: true, emoji: { adhd: '🎯', organize: '🕒', anxiety: '🌬️', motivation: '🚀', simple: '✨' }[n] })))],
    goal: () => {
      const ideas = [...new Set((st.needs.length ? st.needs : ['simple']).flatMap((n) => [1, 2].map((i) => `goalSug_${n}_${i}`)).filter((k) => !k.endsWith('simple_2')))];
      const title = h('input', { type: 'text', maxLength: 80, class: 'wz-name', placeholder: t('wzGoalPh'), 'aria-label': t('wzGoalPh'), value: st.goalTitle, oninput: (e) => { st.goalTitle = e.target.value; } });
      return [h('h3', {}, t('wzGoal')), h('small', { class: 'hint' }, t('wzGoalHint')),
        h('div', { class: 'wz-list', role: 'radiogroup', 'aria-label': t('wzGoal') },
          goals().map((g) => opt(g.title, st.goalId === g.id, () => { st.goalId = g.id; draw(); }, { emoji: '🎯' })),
          canAddGoal() ? opt(t('wzGoalNew'), st.goalId === 'new', () => { st.goalId = 'new'; draw(); }, { emoji: '➕' }) : null,
          opt(t('wzGoalNone'), !st.goalId, () => { st.goalId = ''; draw(); }, { emoji: '➖' })),
        st.goalId === 'new' ? [title, h('small', { class: 'hint' }, t('wzGoalIdeas')), h('div', { class: 'chips' }, ideas.map((k) => h('button', { type: 'button', class: 'chip btn-chip', onclick: () => { st.goalTitle = t(k); draw(); } }, t(k))))] : null];
    },
    what: () => [h('h3', {}, t('wzWhat')),
      h('div', { class: 'wz-list', role: 'radiogroup', 'aria-label': t('wzWhat') }, kindList().map((k) => opt(t(`wzK_${k}`), st.kind === k, () => { st.kind = k; st.time = START_TIMES[k]; draw(); }, { emoji: { morning: '🌅', adult: '☕', bedtime: '🌙', homework: '📚', afterschool: '🏠', evening: '🎒' }[k] })))],
    when: () => [h('h3', {}, t('wzWhen')),
      h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('alarmTime')), h('input', { type: 'time', value: st.time, 'aria-label': t('wzWhen'), onchange: (e) => { if (/^\d{2}:\d{2}$/.test(e.target.value)) st.time = e.target.value; } })),
      h('h3', {}, t('wzDays')),
      h('div', { class: 'wz-grid', role: 'radiogroup', 'aria-label': t('wzDays') }, [['school', 'wzSchool'], ['every', 'wzEvery'], ['weekend', 'wzWeekend']].map(([k, key]) => opt(t(key), st.days === k, () => { st.days = k; draw(); }))),
      h('label', { class: 'switch row' }, h('span', {}, t('wzAlarm')), h('input', { type: 'checkbox', checked: st.alarm, onchange: (e) => { st.alarm = e.target.checked; } }))],
    review: () => {
      ensureTasks(); const e = entry(), areas = areasOf(st.needs), gTitle = st.goalId === 'new' ? st.goalTitle.trim() : chosenGoal()?.title;
      const sumEl = h('p', { class: 'note', 'aria-live': 'polite' }, t('wzSummary', { n: st.tasks.length, time: fmtHuman(total(), units()) }));
      return [h('h3', {}, t('wzReview')), h('p', { class: 'note' }, `${e.icon} ${t(`wzK_${st.kind}`)}${gTitle ? ` · 🎯 ${t('wzGoalLinked', { title: gTitle })}` : ''}`), sumEl, h('small', { class: 'hint' }, t('wzEditHint')),
        h('ol', { class: 'wz-tasks', 'aria-label': t('wzReview') }, st.tasks.map((k, i) => taskRow(k, i, sumEl))),
        h('button', { class: 'btn add', type: 'button', onclick: () => { st.tasks.push({ id: uid(), name: '', icon: '', photo: '', sec: 60, est: 0 }); draw(); body.querySelector('.wz-task:last-child .wz-name')?.focus(); } }, `+ ${t('wzAddStep')}`),
        areas.length ? h('label', { class: 'switch row' }, h('span', {}, t('wzBreaks'), h('small', { class: 'hint' }, t('wzBreaksHint'))), h('input', { type: 'checkbox', checked: st.breaks, onchange: (ev) => { toggleBreaks(ev.target.checked); } })) : null,
        h('small', { class: 'hint' }, t('wzEditAfter'))];
    },
  };
  /** Breaks can be switched on/off without losing the person's edits: only the helper steps are removed / added. */
  function toggleBreaks(on) {
    st.breaks = on; const goalKeys = new Set(goalSteps(strategies()).map((x) => x.key));
    if (!on) st.tasks = st.tasks.filter((k) => !k.helperKey || goalKeys.has(k.helperKey));
    else st.tasks = applyInterstitials(st.tasks, suggestInterstitials(st.tasks, { areas: areasOf(st.needs), age: st.age }), t, uid);
    draw();
  }

  async function create() {
    const tasks = st.tasks.map((k) => ({ ...k, name: String(k.name || '').trim() })).filter((k) => k.name);
    if (!tasks.length) { toast(t('jNothing')); return; }
    const e = entry(), days = dayList(), tpl = S.newTemplate(e.name);
    Object.assign(tpl, { name: e.name, icon: e.icon, color: e.color, days, tasks, alarm: defaultAlarm(days.length ? days : [0, 1, 2, 3, 4, 5, 6], st.time, st.alarm) });
    await S.saveTemplate(tpl);
    const areas = areasOf(st.needs);
    if (st.who === 'me' && areas.length) { const me = S.activeProfile(); await S.patchProfile(me.id, { focus: sanitizeAreas([...(me.focus || []), ...areas]) }); }
    if (st.goalId === 'new' && st.goalTitle.trim()) { if (canAddGoal()) await S.saveGoal(sanitizeGoal({ title: st.goalTitle.trim(), templateId: tpl.id, strategies: strategiesFor(st.needs) })); else toast(t('wzGoalFull')); }
    else if (chosenGoal()) await S.saveGoal({ ...chosenGoal(), templateId: tpl.id });
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
    if (id !== 'review') { body.querySelector('h3')?.setAttribute('tabindex', '-1'); body.querySelector('h3')?.focus({ preventScroll: true }); }
  }
  m = modal(`🪄 ${t('wzTitle')}`, body, []); m.el.classList.add('wizard-modal'); draw();
  return m;
}

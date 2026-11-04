// Under the task being done: how hard is it (icons), write why, a kind thought, a relaxation exercise. Everything is optional and quick.
import { h, setChildren } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import { LEVELS } from '../difficulty.js';
import { pickThought, pickExercise } from '../thoughts.js';
import { openCapture } from './capture.js';
import { speakWithSettings } from './coach.js';

/**
 * api: { current(): {task, index}, rate(i, v), helped(i, kind), openCalm() }. -> { el, update() }.
 * The exercise and thought lists never repeat until all were shown (the `seen` sets live as long as the run screen).
 */
export function taskHelpCard(api, routineName) {
  const seenT = new Set(), seenE = new Set(), out = h('div', { class: 'help-out', role: 'status', 'aria-live': 'polite' });
  const rated = h('div', { class: 'diff-row', role: 'group', 'aria-label': t('diffAsk') });
  const profile = () => { const s = S.get().settings; return { lang: getLang(), age: s.age, gender: s.gender, name: s.personName }; };
  function showThought() {
    const { task, index } = api.current(); if (!task) return;
    const x = pickThought({ ...profile(), difficulty: task.difficulty, seen: seenT }); api.helped(index, 'thought');
    setChildren(out, h('article', { class: 'help-card' }, h('strong', {}, `💭 ${t('thoughtTitle')}`), h('p', { class: 'help-text', lang: getLang() }, x.text),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn small', type: 'button', onclick: showThought }, t('anotherOne')), h('button', { class: 'btn small', type: 'button', onclick: () => speakWithSettings(x.text) }, `🔊 ${t('readAloud')}`), h('button', { class: 'btn small', type: 'button', onclick: () => setChildren(out) }, t('close')))));
    if (S.get().settings.coachSpeak) speakWithSettings(x.text);
  }
  function showRelax(only = null) {
    const { task, index } = api.current(); if (!task) return;
    const x = pickExercise({ ...profile(), seen: seenE, only: Array.isArray(only) ? only : null }); api.helped(index, 'relax');
    setChildren(out, h('article', { class: 'help-card' }, h('strong', {}, `${x.emoji} ${x.title}`), h('ol', { class: 'help-steps', lang: getLang() }, x.steps.map((s) => h('li', {}, s))),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn small', type: 'button', onclick: () => showRelax(only) }, t('anotherOne')), x.breath ? h('button', { class: 'btn small', type: 'button', onclick: api.openCalm }, `🌬️ ${t('calmTitle')}`) : null, h('button', { class: 'btn small', type: 'button', onclick: () => setChildren(out) }, t('close')))));
  }
  const btns = h('div', { class: 'row-btns help-btns' }), helperSlot = h('div', { class: 'stack' }), sum = h('summary', {});
  function update() {
    const { task, index } = api.current(); if (!task) { el.hidden = true; return; } el.hidden = false;
    setChildren(rated, h('span', { class: 'lbl' }, t('diffAsk')), LEVELS.map((l) => h('button', { class: `diff ${task.difficulty === l.v ? 'on' : ''}`, type: 'button', 'aria-pressed': String(task.difficulty === l.v), 'aria-label': t(`diff${l.v}`), title: t(`diff${l.v}`), onclick: () => { api.rate(index, l.v); update(); } }, l.emoji)));
    const hard = task.difficulty >= 4;
    const HELPER = { calm: () => api.openCalm(), move: () => showRelax(['shake', 'stretch', 'wall', 'squeeze']), thought: showThought };
    setChildren(helperSlot, task.helper && Object.hasOwn(HELPER, task.helper) ? h('button', { class: 'btn primary', type: 'button', onclick: HELPER[task.helper] }, `▶ ${t(`helper_${task.helper}`)}`) : null);
    setChildren(sum, h('span', { class: 'fold-t' }, `${LEVELS.find((l) => l.v === task.difficulty)?.emoji || '🙂'} ${t('runHow')}`));
    setChildren(btns,
      h('button', { class: `btn small ${hard ? 'primary' : ''}`, type: 'button', onclick: () => openCapture({ routine: routineName, task: task.name, difficulty: task.difficulty, hard: true, onSaved: () => api.helped(index, 'note') }) }, `✍️ ${t('whyHard')}`),
      h('button', { class: `btn small ${hard ? 'primary' : ''}`, type: 'button', onclick: showThought }, `💭 ${t('thoughtBtn')}`),
      h('button', { class: `btn small ${hard ? 'primary' : ''}`, type: 'button', onclick: showRelax }, `🧘 ${t('relaxBtn')}`));
    if (hard && !out.firstChild) setChildren(out, h('p', { class: 'note' }, t('diffHardHint')));
  }
  const fold = h('details', { class: 'help-fold' }, sum, rated, btns);
  const el = h('section', { class: 'card task-help' }, helperSlot, fold, out);
  update();
  return { el, update, clear: () => setChildren(out) };
}

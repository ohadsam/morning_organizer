// NLP tools: six short guided exercises (see nlpTools.js - self-help, no claims). A small wizard in a sheet, one question per step, a quiet
// moment where the exercise asks for one, and an optional note to the journal at the end. Also a page that lists the six tools.
import { h, setChildren } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import * as J from '../journal.js';
import { iconBtn, modal, toast } from './common.js';
import { TOOLS, TOOL_IDS, isTool, keys, flagWords, composeNote } from '../nlpTools.js';
import { cameoNode } from './mascot.js';

/** The exercise `id` in a sheet. ctx: { routine, task, onSaved } when it was opened from a task. */
export function openNlpTool(id, ctx = {}) {
  if (!isTool(id)) return null;
  const tool = TOOLS[id], steps = tool.steps, answers = {}; let i = 0, timer = null;
  const body = h('div', { class: 'stack nlp-body' });
  const stop = () => { clearInterval(timer); timer = null; };
  const canSave = () => S.shows('journal') && S.features().journal !== false;
  function draw() {
    stop();
    if (i >= steps.length) return review();
    const s = steps[i], k = keys(id, s.id);
    const nav = (last) => h('div', { class: 'row-btns nlp-nav' }, i > 0 ? h('button', { class: 'btn', type: 'button', onclick: () => { i--; draw(); } }, t('nlpBack')) : null,
      h('button', { class: 'btn primary', type: 'button', onclick: () => { i++; draw(); } }, last ? t('nlpFinish') : t('nlpNext')));
    const head = h('small', { class: 'hint' }, t('nlpStep', { n: i + 1, total: steps.length }));
    if (s.type === 'text') {
      const input = h('textarea', { rows: 3, maxLength: 400, placeholder: t('nlpPh'), 'aria-label': t(k.q), oninput: (e) => { answers[s.id] = e.target.value; } }, answers[s.id] || '');
      setChildren(body, head, h('label', { class: 'field' }, h('strong', { class: 'nlp-q' }, t(k.q)), h('small', { class: 'hint' }, t(k.h)), input), nav(i === steps.length - 1));
      setTimeout(() => input.focus(), 50);
    } else if (s.type === 'pause') {
      const clock = h('div', { class: 'nlp-clock', role: 'timer', 'aria-live': 'off' }, t('nlpSecs', { n: s.sec })), msg = h('p', { class: 'note', role: 'status', 'aria-live': 'polite' }, '');
      const go = h('button', { class: 'btn primary xl', type: 'button', onclick: () => {
        go.disabled = true; msg.textContent = t('nlpPauseOn'); let left = s.sec;
        timer = setInterval(() => { left--; clock.textContent = t('nlpSecs', { n: Math.max(0, left) }); if (left <= 0) { stop(); msg.textContent = t('nlpPauseDone'); go.disabled = false; } }, 1000);
      } }, t('nlpPauseGo'));
      setChildren(body, head, h('strong', { class: 'nlp-q' }, t(k.q)), h('small', { class: 'hint' }, t(k.h)), clock, go, msg, nav(i === steps.length - 1));
    } else {   // 'words': the big words of the sentence from the earlier step, each with one gentle question
      const found = flagWords(answers.said, getLang());
      setChildren(body, head, h('strong', { class: 'nlp-q' }, t('nlpWordsTitle')), found.length ? h('ul', { class: 'nlp-words' }, found.map((f) => h('li', {}, h('mark', {}, f.word), h('p', {}, t(`nlpQ_${f.kind}`, { word: f.word })))))
        : h('p', { class: 'note' }, t('nlpNoWords')), nav(false));
    }
  }
  function review() {
    const text = composeNote(id, answers, t);
    setChildren(body, h('strong', { class: 'nlp-q' }, `✅ ${t('nlpReview')}`),
      text ? h('div', { class: 'card nlp-review' }, text.split('\n').slice(1).map((l) => h('p', {}, l))) : h('p', { class: 'note' }, t('nlpNothing')),
      h('p', { class: 'hint' }, t('nlpNotTherapy')),
      h('div', { class: 'row-btns nlp-nav' }, h('button', { class: 'btn', type: 'button', onclick: () => { i = steps.length - 1; draw(); } }, t('nlpBack')),
        text && canSave() ? h('button', { class: 'btn', type: 'button', onclick: async (e) => { e.currentTarget.disabled = true; await J.addEntry(S.activeProfile().id, { kind: 'note', text, routine: ctx.routine || '', task: ctx.task || '' }); toast(t('nlpSaved')); ctx.onSaved?.(); } }, `📓 ${t('nlpSaveNote')}`) : null,
        h('button', { class: 'btn primary', type: 'button', onclick: () => m.close() }, t('nlpFinish'))));
  }
  const m = modal(`${tool.icon} ${t(`nlp_${id}`)}`, body, []);
  m.el.addEventListener('close', stop); draw();
  return m;
}

/** The page with the six tools. */
export function renderNlp(root, nav) {
  setChildren(root,
    h('div', { class: 'page-head' }, iconBtn('back', t('back'), () => nav('#/')), h('h1', {}, `🗣️ ${t('nlpTitle')}`)),
    h('div', { class: 'vk-center' }, cameoNode('think', { size: 96 })), h('p', { class: 'note' }, t('nlpIntro')), h('p', { class: 'chip solid nlp-note' }, t('nlpEvidence')),
    h('div', { class: 'stack' }, TOOL_IDS.map((id) => h('button', { type: 'button', class: 'card nlp-tool', onclick: () => openNlpTool(id) },
      h('span', { class: 'nlp-i', 'aria-hidden': 'true' }, TOOLS[id].icon), h('span', { class: 'nlp-t' }, h('strong', {}, t(`nlp_${id}`)), h('small', { class: 'hint' }, t(`nlpd_${id}`))), h('span', { class: 'chip' }, t('nlpStart'))))),
    h('p', { class: 'hint' }, t('nlpNotTherapy')));
}

// The suggestion card on the home screen: one gentle idea with [Try it] [Not now] [Don't show this again].
import { h } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { ttsSupported } from '../speech.js';
import { pickSuggestion, answer, sanitizeState } from '../suggestions.js';
import { go } from './actions.js';

const KEY = 'mo.sug';
export const loadState = () => { try { return sanitizeState(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return sanitizeState({}); } };
export const saveState = (s) => { try { localStorage.setItem(KEY, JSON.stringify(sanitizeState(s))); } catch { /* storage blocked: suggestions just come back */ } };
/** The "show suggestions" switch in settings. */
export const suggestionsOn = () => !loadState().off;
export const setSuggestionsOn = (on) => saveState({ ...loadState(), off: !on });

function context() {
  const { templates, settings } = S.get(), me = S.activeProfile(), runs = S.myRuns().filter((r) => r.status === 'done' || r.endedAt).length;
  return { runs, ownRoutines: templates.filter((x) => !x.builtin).length, alarmsOn: templates.some((x) => x.alarm?.enabled), goals: S.goals(me).length, retros: S.retros(me.id).length,
    voiceChosen: !!settings.voiceURI || (settings.voicePreset && settings.voicePreset !== 'natural'), ttsOk: ttsSupported(), calmOn: S.features().calmCorner !== false };
}

/** null when there is nothing to suggest right now. `nav` opens places; `redraw` re-renders home after an answer. */
export function suggestionCard(nav, redraw) {
  const pick = pickSuggestion(context(), loadState()); if (!pick) return null;
  const reply = (how) => { saveState(answer(loadState(), pick.id, how)); if (how === 'try') go(pick.go, nav); redraw(); };
  return h('section', { class: 'card suggest', 'aria-label': t('sugTitle') },
    h('small', { class: 'sug-tag' }, `💡 ${t('sugTitle')}`),
    h('strong', {}, `${pick.icon} ${t(`sg_${pick.id}_t`)}`), h('p', { class: 'note' }, t(`sg_${pick.id}_b`)),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: () => reply('try') }, t('sugTry')), h('button', { class: 'btn', type: 'button', onclick: () => reply('later') }, t('sugLater'))),
    h('button', { class: 'btn link', type: 'button', onclick: () => reply('never') }, t('sugNever')));
}

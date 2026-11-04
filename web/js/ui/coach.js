// The tip card: category + personalised tip, breathing animation for breathing tips, "another tip" and read-aloud.
import { h } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import { pickTip, CATEGORIES } from '../coach.js';
import { speakText, stopSpeaking, ttsSupported } from '../speech.js';
import { icon, iconBtn } from './common.js';

/** Speaks with the person's chosen character, device voice, pace and wording style. kind 'short' = a cue ("Breathe in"): no flavour openers. */
export function speakWithSettings(text, { kind = 'msg' } = {}) {
  const s = S.get().settings;
  return speakText(text, { lang: getLang(), voiceURI: s.voiceURI, preset: s.voicePreset, flavor: s.voiceFlavor, rate: (s.voiceRate || 100) / 100, kind });
}

/** host: element the card is rendered into. Returns { show(situation, taskName?), hide }. */
export function createCoach(host) {
  const seen = new Set();
  let hideTimer;
  const hide = () => { clearTimeout(hideTimer); stopSpeaking(); host.replaceChildren(); host.hidden = true; };
  function show(situation = 'any', taskName = '') {
    const s = S.get().settings;
    const tip = pickTip({ situation, lang: getLang(), age: s.age, gender: s.gender, name: s.personName, seen, areas: S.activeProfile().focus });
    if (!tip) return;
    const cat = CATEGORIES[tip.cat];
    host.replaceChildren(h('article', { class: `coach-card ${cat.breath ? 'has-breath' : ''}`, 'aria-label': t('coach') },
      h('div', { class: 'coach-head' }, h('span', { class: 'coach-cat' }, `${cat.emoji} ${t(`cat_${tip.cat}`)}`),
        taskName ? h('small', {}, t('tipFor', { name: taskName })) : null, iconBtn('close', t('close'), hide)),
      cat.breath ? h('div', { class: 'breath', 'aria-hidden': 'true' }, h('i', {})) : null,
      h('p', { class: 'coach-text', lang: getLang() }, tip.text),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn small', type: 'button', onclick: () => show(situation, taskName) }, icon('skip', 16), t('anotherTip')),
        ttsSupported() ? h('button', { class: 'btn small', type: 'button', onclick: () => speakWithSettings(tip.text) }, '🔊', t('readAloud')) : null),
      h('small', { class: 'disclaimer' }, t('coachDisclaimer'))));
    host.hidden = false;
    if (s.coachSpeak) speakWithSettings(tip.text);
    clearTimeout(hideTimer); hideTimer = setTimeout(hide, 45_000);
  }
  return { show, hide };
}

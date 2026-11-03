// First-run profile: name, age and gender personalise every message and tip. Skippable; editable later in Settings.
import { h } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { modal } from './common.js';

export function openWelcome() {
  const st = S.get().settings;
  const name = h('input', { type: 'text', maxLength: 30, value: st.personName, autocomplete: 'off', 'aria-label': t('personName') });
  const age = h('input', { type: 'number', min: 3, max: 120, inputMode: 'numeric', value: st.age ?? '', 'aria-label': t('age') });
  const gender = h('select', { 'aria-label': t('gender') }, [['female', t('gFemale')], ['male', t('gMale')], ['other', t('gOther')]].map(([v, l]) => h('option', { value: v, selected: st.gender === v }, l)));
  const m = modal(`${st.mascot} ${t('welcomeTitle')}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('welcomeHint')),
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('personName')), name),
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('age')), age),
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('gender')), gender)),
  [{ label: t('skipForNow'), fn: () => { S.updateSettings({ profileDone: true }); } },
    { label: t('letsGo'), primary: true, fn: async () => { await S.updateSettings({ personName: name.value, age: age.value, gender: gender.value, profileDone: true }); } }]);
  m.el.classList.add('welcome');
  return m;
}

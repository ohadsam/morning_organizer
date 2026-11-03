import { h } from '../util.js';
import { t, setLang } from '../i18n.js';
import * as S from '../store.js';
import { signal, unlockAudio } from '../audio.js';
import { native } from '../native.js';
import { setAwake } from '../awake.js';
import { PRESETS, voicesFor, ttsSupported } from '../speech.js';
import { speakWithSettings } from './coach.js';
import { applyA11y, FONT_SCALES } from '../a11y.js';
import { saveBackupFile, copySyncCode, sendSyncCode, openBackupImport } from './backup.js';
import { getLang } from '../i18n.js';
import { APK_URL } from '../config.js';
import { toast, icon } from './common.js';

let deferredInstall = null;
globalThis.addEventListener?.('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });

export function applyTheme(theme) {
  const r = document.documentElement;
  if (theme === 'light' || theme === 'dark') r.dataset.theme = theme; else delete r.dataset.theme;
}
const select = (label, value, options, onChange) =>
  h('label', { class: 'field' }, h('span', { class: 'lbl' }, label),
    h('select', { onchange: (e) => onChange(e.target.value) }, options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(value) }, l))));
const toggle = (label, hint, value, onChange) =>
  h('label', { class: 'switch row' }, h('span', {}, label, hint ? h('small', { class: 'hint' }, hint) : null), h('input', { type: 'checkbox', checked: value, onchange: (e) => onChange(e.target.checked) }));
const minSec = (label, sec, onChange, allowZero) => {
  const m = h('input', { type: 'number', min: 0, max: 1440, inputMode: 'numeric', value: Math.floor(sec / 60), 'aria-label': `${label} ${t('minutes')}` });
  const s = h('input', { type: 'number', min: 0, max: 59, inputMode: 'numeric', value: sec % 60, 'aria-label': `${label} ${t('seconds')}` });
  const fire = () => onChange(Math.max(allowZero ? 0 : 1, Math.floor(+m.value || 0) * 60 + Math.min(59, Math.floor(+s.value || 0))));
  m.addEventListener('change', fire); s.addEventListener('change', fire);
  return h('div', { class: 'field' }, h('span', { class: 'lbl' }, label), h('span', { class: 'dur-in' }, m, h('i', {}, t('minutes')), s, h('i', {}, t('seconds'))),
    allowZero && sec === 0 ? h('small', { class: 'hint' }, t('defEstSame')) : null);
};

/** Voice picker (device voices for the current language) + character style + sample button. Voices load asynchronously. */
function voiceControls(st, set) {
  const voiceSel = h('select', { 'aria-label': t('voice'), onchange: (e) => set({ voiceURI: e.target.value }) }, h('option', { value: '' }, t('voiceAuto')));
  const note = h('small', { class: 'hint' }, t('voiceNote'));
  voicesFor(getLang()).then((vs) => {
    if (!vs.length) note.textContent = `${t('voiceNone')} ${t('voiceNote')}`;
    for (const v of vs) voiceSel.append(h('option', { value: v.voiceURI, selected: v.voiceURI === st.voiceURI }, v.name));
  });
  return h('div', { class: 'stack' },
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('voice')), voiceSel),
    select(t('voiceChar'), st.voicePreset, Object.entries(PRESETS).map(([k, p]) => [k, `${p.emoji} ${t(`p_${k}`)}`]), (v) => set({ voicePreset: v })),
    h('div', { class: 'toolbar' }, h('button', { class: 'btn', type: 'button', onclick: () => setTimeout(() => speakWithSettings(t('voiceSample')), 50) }, '🔊', t('voiceTest'))), note);
}

export function renderSettings(root, version) {
  const draw = () => {
    const st = S.get().settings;
    const set = async (p, redraw = false) => { await S.updateSettings(p); if (redraw) draw(); };
    root.replaceChildren(
      h('h1', {}, t('settings')),
      h('section', { class: 'card stack' },
        select(t('language'), st.lang, [['auto', t('langAuto')], ['he', 'עברית'], ['en', 'English']], async (v) => { await S.updateSettings({ lang: v }); try { localStorage.setItem('mo.lang', v); } catch { /* blocked */ } setLang(v); location.reload(); }),
        select(t('theme'), st.theme, [['auto', t('themeAuto')], ['light', t('themeLight')], ['dark', t('themeDark')]], (v) => { applyTheme(v); try { localStorage.setItem('mo.theme', v); } catch { /* blocked */ } set({ theme: v }); })),
      h('section', { class: 'card stack' }, h('h2', {}, t('profile')),
        h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('personName')), h('input', { type: 'text', maxLength: 30, value: st.personName, autocomplete: 'off', 'aria-describedby': 'pn-hint', onchange: (e) => set({ personName: e.target.value }) }), h('small', { class: 'hint', id: 'pn-hint' }, t('personNameHint'))),
        h('div', { class: 'two' },
          h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('age')), h('input', { type: 'number', min: 3, max: 120, inputMode: 'numeric', value: st.age ?? '', onchange: (e) => set({ age: e.target.value }, true) })),
          select(t('gender'), st.gender, [['female', t('gFemale')], ['male', t('gMale')], ['other', t('gOther')]], (v) => set({ gender: v }))),
        h('small', { class: 'hint' }, t('ageHint'))),
      h('section', { class: 'card stack' },
        h('div', { class: 'field' }, h('span', { class: 'lbl' }, t('mascot')), h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('mascot') }, S.MASCOTS.map((m) => h('button', { type: 'button', class: `emoji-pick ${st.mascot === m ? 'on' : ''}`, role: 'radio', 'aria-checked': String(st.mascot === m), 'aria-label': m, onclick: () => set({ mascot: m }, true) }, m)))),
        toggle(t('feedbackOn'), t('feedbackOnHint'), st.feedback, (v) => set({ feedback: v }))),
      h('section', { class: 'card stack' }, h('h2', {}, t('paceMode')),
        select(t('paceMode'), st.paceMode, [['normal', t('paceNormal')], ['quick', t('paceQuick')], ['calm', t('paceCalm')]], (v) => set({ paceMode: v })), h('small', { class: 'hint' }, t('paceHint')),
        toggle(t('announceTasks'), t('announceHint'), st.announceTasks, (v) => set({ announceTasks: v }))),
      h('section', { class: 'card stack' }, h('h2', {}, `♿ ${t('a11y')}`),
        select(t('fontSize'), st.fontScale, FONT_SCALES.map((n) => [n, `${n}%`]), async (v) => { await set({ fontScale: +v }); applyA11y(S.get().settings); }),
        toggle(t('colorSafe'), '', st.colorSafe, async (v) => { await set({ colorSafe: v }); applyA11y(S.get().settings); }),
        toggle(t('contrastHigh'), '', st.contrast === 'high', async (v) => { await set({ contrast: v ? 'high' : 'normal' }); applyA11y(S.get().settings); }),
        toggle(t('srAnnounce'), t('srHint'), st.srAnnounce, (v) => set({ srAnnounce: v }))),
      h('section', { class: 'card stack' }, h('h2', {}, `🧘 ${t('coach')}`),
        toggle(t('coachButton'), '', st.coachButton, (v) => set({ coachButton: v })),
        toggle(t('coachAuto'), t('coachAutoHint'), st.coachAuto, (v) => set({ coachAuto: v })),
        h('small', { class: 'hint' }, t('coachDisclaimer'))),
      ttsSupported() ? h('section', { class: 'card stack' }, h('h2', {}, `🔊 ${t('voiceSection')}`), h('small', { class: 'hint' }, t('voiceHint')),
        toggle(t('speakOn'), '', st.speak, (v) => set({ speak: v })), toggle(t('coachSpeak'), '', st.coachSpeak, (v) => set({ coachSpeak: v })), voiceControls(st, set)) : null,
      h('section', { class: 'card stack' },
        select(t('soundMode'), st.mode, [['both', t('mBoth')], ['beep', t('mBeep')], ['vibrate', t('mVibrate')], ['silent', t('mSilent')]], (v) => set({ mode: v })),
        h('label', { class: 'field' }, h('span', { class: 'lbl' }, `${t('volume')}: ${st.volume}%`), h('input', { type: 'range', min: 0, max: 100, value: st.volume, oninput: (e) => { e.target.previousSibling.textContent = `${t('volume')}: ${e.target.value}%`; S.updateSettings({ volume: +e.target.value }); } })),
        select(t('warnBefore'), st.warnSec, [[0, t('warnOff')], [5, t('warnSec', { n: 5 })], [10, t('warnSec', { n: 10 })], [15, t('warnSec', { n: 15 })], [30, t('warnSec', { n: 30 })]], (v) => set({ warnSec: +v })),
        h('div', { class: 'toolbar' }, h('button', { class: 'btn', type: 'button', onclick: () => { unlockAudio(); signal('warn', st.mode, st.volume); setTimeout(() => signal('end', st.mode, st.volume), 700); } }, icon('bell', 18), t('test')))),
      h('section', { class: 'card stack' },
        minSec(t('defTask'), st.defTaskSec, (v) => set({ defTaskSec: v })),
        minSec(t('defEst'), st.defEstSec, (v) => set({ defEstSec: v }), true),
        toggle(t('autoAdvance'), t('autoAdvanceHint'), st.autoAdvance, (v) => set({ autoAdvance: v })),
        toggle(t('keepAwake'), '', st.keepAwake, (v) => set({ keepAwake: v })),
        toggle(t('keepAwakeApp'), t('keepAwakeAppHint'), st.keepAwakeApp, (v) => { setAwake('app', v); set({ keepAwakeApp: v }); })),
      h('section', { class: 'card stack' }, h('h2', {}, t('syncTitle')), h('p', { class: 'note' }, t('syncHint')),
        h('div', { class: 'toolbar wrap' },
          h('button', { class: 'btn', type: 'button', onclick: saveBackupFile }, icon('download', 18), t('exportFile')),
          h('button', { class: 'btn', type: 'button', onclick: copySyncCode }, icon('copy', 18), t('exportCode')),
          h('button', { class: 'btn', type: 'button', onclick: sendSyncCode }, icon('share', 18), t('exportSend'))),
        h('div', { class: 'toolbar wrap' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => openBackupImport() }, t('importBackupBtn')),
          h('button', { class: 'btn', type: 'button', onclick: async () => { await S.addSamples(); toast(t('saved')); } }, t('restoreSamples')))),
      h('section', { class: 'card stack' }, h('h2', {}, t('app')),
        native.available ? [h('p', {}, t('nativeActive')), h('p', { class: 'note' }, t('widgets'))] : [
          h('p', { class: 'note' }, t('apkNote')),
          h('div', { class: 'toolbar wrap' },
            h('a', { class: 'btn primary', href: APK_URL, rel: 'noopener', download: 'morning-organizer.apk' }, icon('download', 18), t('downloadApk')),
            deferredInstall ? h('button', { class: 'btn', type: 'button', onclick: async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; draw(); } }, t('installPwa')) : null)],
        h('p', { class: 'note' }, `${t('version', { v: version })} · ${t('offline')}`)));
  };
  draw();
  return () => {};
}

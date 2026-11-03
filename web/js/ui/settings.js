import { h } from '../util.js';
import { t, setLang } from '../i18n.js';
import * as S from '../store.js';
import { signal, unlockAudio } from '../audio.js';
import { native } from '../native.js';
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

export function renderSettings(root, version) {
  const draw = () => {
    const st = S.get().settings;
    const set = async (p, redraw = false) => { await S.updateSettings(p); if (redraw) draw(); };
    root.replaceChildren(
      h('h1', {}, t('settings')),
      h('section', { class: 'card stack' },
        select(t('language'), st.lang, [['auto', t('langAuto')], ['he', 'עברית'], ['en', 'English']], async (v) => { await S.updateSettings({ lang: v }); try { localStorage.setItem('mo.lang', v); } catch { /* blocked */ } setLang(v); location.reload(); }),
        select(t('theme'), st.theme, [['auto', t('themeAuto')], ['light', t('themeLight')], ['dark', t('themeDark')]], (v) => { applyTheme(v); try { localStorage.setItem('mo.theme', v); } catch { /* blocked */ } set({ theme: v }); })),
      h('section', { class: 'card stack' },
        select(t('soundMode'), st.mode, [['both', t('mBoth')], ['beep', t('mBeep')], ['vibrate', t('mVibrate')], ['silent', t('mSilent')]], (v) => set({ mode: v })),
        h('label', { class: 'field' }, h('span', { class: 'lbl' }, `${t('volume')}: ${st.volume}%`), h('input', { type: 'range', min: 0, max: 100, value: st.volume, oninput: (e) => { e.target.previousSibling.textContent = `${t('volume')}: ${e.target.value}%`; S.updateSettings({ volume: +e.target.value }); } })),
        select(t('warnBefore'), st.warnSec, [[0, t('warnOff')], [5, t('warnSec', { n: 5 })], [10, t('warnSec', { n: 10 })], [15, t('warnSec', { n: 15 })], [30, t('warnSec', { n: 30 })]], (v) => set({ warnSec: +v })),
        h('div', { class: 'toolbar' }, h('button', { class: 'btn', type: 'button', onclick: () => { unlockAudio(); signal('warn', st.mode, st.volume); setTimeout(() => signal('end', st.mode, st.volume), 700); } }, icon('bell', 18), t('test')))),
      h('section', { class: 'card stack' },
        minSec(t('defTask'), st.defTaskSec, (v) => set({ defTaskSec: v })),
        minSec(t('defEst'), st.defEstSec, (v) => set({ defEstSec: v }), true),
        toggle(t('autoAdvance'), t('autoAdvanceHint'), st.autoAdvance, (v) => set({ autoAdvance: v })),
        toggle(t('keepAwake'), '', st.keepAwake, (v) => set({ keepAwake: v }))),
      h('section', { class: 'card stack' }, h('h2', {}, t('data')),
        h('div', { class: 'toolbar wrap' },
          h('button', { class: 'btn', type: 'button', onclick: () => {
            const url = URL.createObjectURL(new Blob([S.exportAll()], { type: 'application/json' }));
            const a = h('a', { href: url, download: `morning-organizer-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); toast(t('backupDone'));
          } }, t('exportAll')),
          h('label', { class: 'btn' }, t('importAll'), h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
            const f = e.target.files[0]; if (!f || f.size > 20 * 1024 * 1024) return;
            try { toast(t('restoreDone', { n: await S.importAll(await f.text()) })); } catch { toast(t('importBad')); }
          } })),
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

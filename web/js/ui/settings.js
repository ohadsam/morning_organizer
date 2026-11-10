import { h, setChildren } from '../util.js';
import { t, setLang } from '../i18n.js';
import * as S from '../store.js';
import { signal, unlockAudio } from '../audio.js';
import { native } from '../native.js';
import { setAwake } from '../awake.js';
import { PRESETS, GROUPS, personaIds, voicesFor, ttsSupported, voiceLabel, canInstallVoices, installVoices, listEngines, setEngine } from '../speech.js';
import { speakWithSettings } from './coach.js';
import { openNeeds, peopleManager, needsLine } from './people.js';
import { openWelcome } from './welcome.js';
import { openTour } from './tour.js';
import { commandList, helpButton } from './voiceControl.js';
import { dictationSupported } from '../dictation.js';
import { isFull } from '../needs.js';
import { SKINS, SKIN_SWATCH } from '../skins.js';
import { normQuery } from '../searchIndex.js';
import { openShareApp } from './shareApp.js';
import { suggestionsOn, setSuggestionsOn } from './suggest.js';
import { applyA11y, FONT_SCALES } from '../a11y.js';
import { requestGate } from './gate.js';
import { avatarNode, openAvatarPicker, openProfiles, openProfileEditor, avatarLevel } from './avatar.js';
import { openMyAvatars } from './avatarLibrary.js';
import { saveBackupFile, copySyncCode, sendSyncCode, openBackupImport } from './backup.js';
import { getLang } from '../i18n.js';
import { APK_URL } from '../config.js';
import { toast, icon } from './common.js';
import { openMyFocus } from './focus.js';
import { openWhatsNew, getVersion } from './whatsnew.js';
import { AREA_EMOJI } from '../focus.js';

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

/**
 * Voice: pick a CHARACTER (everyday people, speaking styles, fun characters), optionally a specific installed voice, the pace and a wording style.
 * Choosing something plays a short sample so you hear the difference straight away.
 */
function voiceControls(st, set) {
  const sample = () => setTimeout(() => speakWithSettings(t('voiceSample')), 60);
  const voiceSel = h('select', { 'aria-label': t('voice'), onchange: async (e) => { await set({ voiceURI: e.target.value }); sample(); } }, h('option', { value: '' }, t('voiceAutoBest')));
  const note = h('small', { class: 'hint' }, t('voiceNote'));
  const fillVoices = () => voicesFor(getLang()).then((vs) => {
    note.textContent = vs.length ? t('voiceNote') : `${t('voiceNone')} ${t('voiceNote')}`;
    setChildren(voiceSel, h('option', { value: '' }, t('voiceAutoBest')), vs.map((v) => h('option', { value: v.voiceURI, selected: v.voiceURI === st.voiceURI }, voiceLabel(v, getLang()))));
  });
  fillVoices();
  // Android app: pick which installed text-to-speech engine to use (Google, Samsung, or an offline neural one such as SherpaTTS / Hayai TTS)
  const engineSel = h('select', { 'aria-label': t('voiceEngine'), onchange: async (e) => { await set({ voiceEngine: e.target.value }); setEngine(e.target.value); setTimeout(() => { fillVoices(); sample(); }, 1500); } }, h('option', { value: '' }, t('voiceEngineDefault')));
  if (canInstallVoices()) setTimeout(() => { for (const en of listEngines()) engineSel.append(h('option', { value: en.name, selected: st.voiceEngine ? en.name === st.voiceEngine : false }, en.label)); }, 900);
  const rateLbl = h('span', { class: 'lbl' }, `${t('voicePace')}: ${st.voiceRate}%`);
  return h('div', { class: 'stack' },
    GROUPS.map((g) => h('fieldset', { class: 'voice-group' }, h('legend', {}, t(`vg_${g}`)), h('div', { class: 'persona-grid', role: 'radiogroup', 'aria-label': t(`vg_${g}`) }, personaIds(g).map((k) => h('button', { type: 'button', class: `persona ${st.voicePreset === k ? 'on' : ''}`, role: 'radio', 'aria-checked': String(st.voicePreset === k), onclick: async () => { await set({ voicePreset: k }, true); sample(); } }, h('span', { class: 'pe', 'aria-hidden': 'true' }, PRESETS[k].emoji), h('span', {}, t(`p_${k}`))))))),
    canInstallVoices() ? h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('voiceEngine')), engineSel, h('small', { class: 'hint' }, t('voiceEngineHint'))) : null,
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('voice')), voiceSel),
    h('label', { class: 'field' }, rateLbl, h('input', { type: 'range', min: 70, max: 130, step: 5, value: st.voiceRate, 'aria-label': t('voicePace'), oninput: (e) => { rateLbl.textContent = `${t('voicePace')}: ${e.target.value}%`; }, onchange: async (e) => { await set({ voiceRate: +e.target.value }); sample(); } }), h('small', { class: 'hint' }, t('voicePaceHint'))),
    select(t('voiceFlavorLabel'), st.voiceFlavor, ['neutral', 'casual', 'warm', 'formal'].map((k) => [k, t(`flv_${k}`)]), async (v) => { await set({ voiceFlavor: v }); sample(); }), h('small', { class: 'hint' }, t('voiceFlavorHint')),
    h('div', { class: 'toolbar' }, h('button', { class: 'btn', type: 'button', onclick: sample }, '🔊', t('voiceTest')), canInstallVoices() ? h('button', { class: 'btn', type: 'button', onclick: () => installVoices() }, '⬇️', t('voiceGetMore')) : null), note,
    h('details', { class: 'card' }, h('summary', {}, t('voiceTipTitle')), h('p', { class: 'note' }, t('voiceTipBody'))));
}

/** A collapsible settings group; its open/closed state is remembered per group. */
let focusGroup = '', query = '';
const GROUP_META = [['needs', '🎯', 'needsTitle'], ['people', '👥', 'peopleTitle'], ['look', '🎨', 'appearance'], ['profile', '🙂', 'profile'], ['buddy', '🦊', 'buddySection'], ['helpers', '🧩', 'helpersTitle'], ['pace', '🐢', 'paceMode'], ['a11y', '♿', 'a11y'], ['coach', '🧘', 'coach'],
  ['voice', '🔊', 'voiceSection'], ['points', '⭐', 'ptsTitle'], ['voicecmd', '🎤', 'vcTitle'], ['alerts', '🔔', 'alertsSection'], ['defaults', '🛠️', 'defaultsSection'], ['sync', '💾', 'syncTitle'], ['app', 'ℹ️', 'app']];
/** Show only the settings that match what was typed (group titles and the text of each row); matching groups open. Empty = everything as it was. */
function applyFilter(root, q) {
  const needle = normQuery(q), groups = [...root.querySelectorAll('details.settings-group')]; let any = false;
  for (const g of groups) {
    const title = normQuery(g.querySelector('summary')?.textContent), rows = [...g.querySelectorAll(':scope > .stack > *')];
    if (!needle) { g.hidden = false; rows.forEach((r) => { r.hidden = false; }); continue; }
    const titleHit = title.includes(needle); let hit = titleHit;
    for (const r of rows) { const m = titleHit || normQuery(r.textContent).includes(needle); r.hidden = !m; hit ||= m; }
    g.hidden = !hit; if (hit) { g.open = true; any = true; }
  }
  const none = root.querySelector('#set-none'); if (none) none.hidden = !needle || any;
}
function settingsBar() {
  const search = h('input', { type: 'search', class: 'settings-search', placeholder: t('setSearchPh'), 'aria-label': t('setSearchPh'), value: query, maxLength: 40, oninput: (e) => { query = e.target.value; applyFilter(document.getElementById('app'), query); } });
  const jump = (k) => { query = ''; search.value = ''; const root = document.getElementById('app'); applyFilter(root, ''); const d = root.querySelector(`details[data-group="${k}"]`); if (d) { d.open = true; d.scrollIntoView({ block: 'start', behavior: 'smooth' }); } };
  return h('div', { class: 'settings-bar' }, h('div', { role: 'search', class: 'sb-search' }, h('span', { 'aria-hidden': 'true' }, '🔍'), search),
    h('div', { class: 'sb-jump', role: 'group', 'aria-label': t('setJump') }, GROUP_META.map(([k, ic, key]) => h('button', { type: 'button', class: 'chip btn-chip', onclick: () => jump(k) }, `${ic} ${t(key)}`))),
    h('p', { class: 'empty', id: 'set-none', hidden: true }, t('setNone')));
}
function group(key, title, open, ...kids) {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('mo.sg') || '{}'); } catch { /* blocked */ }
  const d = h('details', { class: 'card settings-group', dataset: { group: key }, open: key === focusGroup ? true : key in saved ? saved[key] : open }, h('summary', {}, h('h2', {}, title)), h('div', { class: 'stack' }, kids));
  d.addEventListener('toggle', () => { try { localStorage.setItem('mo.sg', JSON.stringify({ ...JSON.parse(localStorage.getItem('mo.sg') || '{}'), [key]: d.open })); } catch { /* blocked */ } });
  return d;
}
export const ACCENTS = ['', '#5b4bd5', '#0b6fc4', '#0a7a5f', '#c2410c', '#be185d', '#334155'];

export function renderSettings(root, version, focusKey = '') {
  focusGroup = /^[a-z]{2,12}$/.test(focusKey) ? focusKey : ''; query = '';
  if (focusGroup) queueMicrotask(() => setTimeout(() => document.querySelector(`details[data-group="${focusGroup}"]`)?.scrollIntoView({ block: 'start' }), 60));
  let alive = true; // a redraw that finishes after the person already left this page must NOT overwrite the page they are on
  const draw = () => {
    if (!alive) return;
    const st = S.get().settings;
    const set = async (p, redraw = false) => { await S.updateSettings(p); if (redraw) draw(); };
    const me = S.activeProfile();
    setChildren(root, 
      h('h1', {}, t('settings')),
      settingsBar(),
      group('needs', `🎯 ${t('needsTitle')}`, false,
        h('p', { class: 'chip solid' }, `${me.name ? `${me.name}: ` : ''}${needsLine(me.view)}`), h('small', { class: 'hint' }, t('needsIntro')),
        h('div', { class: 'toolbar wrap' }, h('button', { class: 'btn primary', type: 'button', onclick: () => openNeeds(me, draw) }, t('needChange')),
          isFull(me.view) ? null : h('button', { class: 'btn', type: 'button', onclick: async () => { await S.setNeeds(me.id, { model: 'full', problems: [] }); toast(t('needAllToast')); draw(); } }, `🌐 ${t('needShowAll')}`),
          h('button', { class: 'btn', type: 'button', onclick: () => openWelcome() }, `👋 ${t('setWelcome')}`), h('button', { class: 'btn', type: 'button', onclick: () => openTour((hash) => { location.hash = hash; }) }, `🧭 ${t('tourTitle')}`)),
        isFull(me.view) ? null : h('small', { class: 'hint' }, t('needHiddenNote')), h('small', { class: 'hint' }, t('setWelcomeHint'))),
      group('people', `👥 ${t('peopleTitle')}`, false, peopleManager(draw),
        toggle(t('askProfile'), t('askProfileHint'), st.askProfile !== false, (v) => set({ askProfile: v }))),
      group('look', t('appearance'), false,
        select(t('language'), st.lang, [['auto', t('langAuto')], ['he', 'עברית'], ['en', 'English']], async (v) => { await S.updateSettings({ lang: v }); try { localStorage.setItem('mo.lang', v); } catch { /* blocked */ } setLang(v); location.reload(); }),
        select(t('theme'), st.theme, [['auto', t('themeAuto')], ['light', t('themeLight')], ['dark', t('themeDark')]], (v) => { applyTheme(v); try { localStorage.setItem('mo.theme', v); } catch { /* blocked */ } set({ theme: v }); }),
        select(t('textStyle'), st.textStyle, [['auto', t('textAuto')], ['playful', t('textPlayful')], ['plain', t('textPlain')]], (v) => set({ textStyle: v }, true)), h('small', { class: 'hint' }, t('textStyleHint')),
        h('div', { class: 'field' }, h('span', { class: 'lbl' }, t('accent')), h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('accent') }, ACCENTS.map((c) => h('button', { type: 'button', class: `swatch ${st.accent === c ? 'on' : ''}`, style: { '--c': c || '#6c5ce7' }, role: 'radio', 'aria-checked': String(st.accent === c), 'aria-label': c || t('themeAuto'), onclick: async () => { await set({ accent: c }); applyA11y(S.get().settings); draw(); } })))),
        h('div', { class: 'field' }, h('span', { class: 'lbl' }, t('skinTitle')), h('div', { class: 'skin-grid', role: 'radiogroup', 'aria-label': t('skinTitle') }, SKINS.map((k) => h('button', { type: 'button', class: `skin-tile ${(st.skin || 'default') === k ? 'on' : ''}`, role: 'radio', 'aria-checked': String((st.skin || 'default') === k), onclick: () => set({ skin: k }, true) },
          h('span', { class: 'skin-sw', style: { background: `linear-gradient(135deg, ${SKIN_SWATCH[k][0]} 50%, ${SKIN_SWATCH[k][1]} 50%)` }, 'aria-hidden': 'true' }), h('span', {}, t(`skin_${k}`)))))),
        select(t('iconStyle'), st.iconStyle, [['auto', t('iconAuto')], ['line', t('iconLine')], ['duotone', t('iconDuotone')], ['filled', t('iconFilled')]], (v) => set({ iconStyle: v })), h('small', { class: 'hint' }, t('iconStyleHint')),
        select(t('density'), st.density || 'normal', [['normal', t('densityNormal')], ['compact', t('densityCompact')], ['roomy', t('densityRoomy')]], (v) => set({ density: v })), h('small', { class: 'hint' }, t('densityHint')),
        select(t('homeMode'), st.homeMode || 'full', [['full', t('homeModeFull')], ['now', t('homeModeNow')]], (v) => set({ homeMode: v })), h('small', { class: 'hint' }, t('homeModeHint')),
        select(t('runView'), st.runView || 'full', [['full', t('runViewFull')], ['single', t('runViewSingle')]], (v) => set({ runView: v })), h('small', { class: 'hint' }, t('runViewHint')),
        toggle(t('iconMono'), t('iconMonoHint'), st.iconMono, (v) => set({ iconMono: v })),
        toggle(t('easyRead'), t('easyReadHint'), st.easyRead, (v) => set({ easyRead: v })),
        toggle(t('reduceMotion'), t('reduceMotionHint'), st.reduceMotion, (v) => set({ reduceMotion: v })),
        h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('customColor')), h('input', { type: 'color', class: 'color-in', value: /^#[0-9a-f]{6}$/i.test(st.accent || '') ? st.accent : '#6c5ce7', 'aria-label': t('customColor'), onchange: (e) => set({ accent: e.target.value }, true) })),
        toggle(t('simpleMode'), t('simpleHint'), st.simpleMode, async (v) => { if (v && !(await requestGate())) { draw(); return; } await set({ simpleMode: v }); location.hash = '#/'; location.reload(); })),
      group('profile', t('profile'), false,
        h('div', { class: 'field' }, h('span', { class: 'lbl' }, t('profilesTitle')),
          h('div', { class: 'profile-grid' }, S.profiles().map((p) => h('button', { type: 'button', class: `profile-card ${p.id === S.activeProfile().id ? 'on' : ''}`, 'aria-pressed': String(p.id === S.activeProfile().id), onclick: async () => { await S.switchProfile(p.id); draw(); } },
            avatarNode(p.avatar, { size: 52 }), h('strong', {}, p.name || t('untitledProfile')))),
            S.profiles().length < 12 ? h('button', { type: 'button', class: 'profile-card add', onclick: () => openProfileEditor(null, { onDone: async (np) => { if (np) await S.switchProfile(np.id); draw(); } }) }, h('span', { class: 'plus' }, '+'), h('strong', {}, t('addProfile'))) : null)),
        h('div', { class: 'toolbar wrap' }, h('button', { class: 'btn', type: 'button', onclick: () => openAvatarPicker(S.get().settings.avatar, async (a) => { await set({ avatar: a }, true); }) }, avatarNode(st.avatar, { size: 28 }), t('avatar')),
          h('button', { class: 'btn', type: 'button', onclick: () => openMyAvatars({ lvl: avatarLevel(), onUse: async (a) => { await set({ avatar: a }, true); } }) }, `🧑‍🎨 ${t('avkLibrary')}`),
          h('button', { class: 'btn', type: 'button', onclick: () => openProfileEditor(S.activeProfile(), { onDone: () => draw() }) }, t('editProfile'))),
        h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('personName')), h('input', { type: 'text', maxLength: 30, value: st.personName, autocomplete: 'off', 'aria-describedby': 'pn-hint', onchange: (e) => set({ personName: e.target.value }) }), h('small', { class: 'hint', id: 'pn-hint' }, t('personNameHint'))),
        h('div', { class: 'two' },
          h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('age')), h('input', { type: 'number', min: 3, max: 120, inputMode: 'numeric', value: st.age ?? '', onchange: (e) => set({ age: e.target.value }, true) })),
          select(t('gender'), st.gender, [['female', t('gFemale')], ['male', t('gMale')], ['other', t('gOther')]], (v) => set({ gender: v }))),
        h('small', { class: 'hint' }, t('ageHint'))),
      group('buddy', t('buddySection'), false,
        h('div', { class: 'field' }, h('span', { class: 'lbl' }, t('mascot')), h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('mascot') }, S.MASCOTS.map((m) => h('button', { type: 'button', class: `emoji-pick ${st.mascot === m ? 'on' : ''}`, role: 'radio', 'aria-checked': String(st.mascot === m), 'aria-label': m, onclick: () => set({ mascot: m }, true) }, m)))),
        toggle(t('feedbackOn'), t('feedbackOnHint'), st.feedback, (v) => set({ feedback: v }))),
      group('helpers', `🎯 ${t('helpersTitle')}`, false, h('p', { class: 'note' }, t('helpersHint')),
        h('div', { class: 'chips' }, S.activeProfile().focus.length ? S.activeProfile().focus.map((a) => h('span', { class: 'chip solid' }, `${AREA_EMOJI[a]} ${t(`area_${a}`)}`)) : h('span', { class: 'muted' }, t('focusNone'))),
        h('div', { class: 'toolbar wrap' }, h('button', { class: 'btn primary', type: 'button', onclick: () => openMyFocus(draw) }, `🎯 ${t('focusChoose')}`),
          h('a', { class: 'btn', href: '#/calm' }, `🌬️ ${t('calmTitle')}`), h('a', { class: 'btn', href: '#/journal' }, `📓 ${t('journal')}`)),
        select(t('rcSettingStyle'), st.retroStyle, [['ask', t('rcStyleAsk')], ['guided', t('rcStyleGuided')], ['free', t('rcStyleFree')]], (v) => set({ retroStyle: v })),
        toggle(t('transcribeOn'), t('transcribeHint'), st.transcribe, (v) => set({ transcribe: v }))),
      group('pace', t('paceMode'), false,
        select(t('timerStyle'), st.timerStyle, [['auto', t('timerAuto')], ['ring', t('timerRing')], ['pie', t('timerPie')], ['bar', t('timerBar')], ['sand', t('timerSand')]], (v) => set({ timerStyle: v })),
        select(t('paceMode'), st.paceMode, [['normal', t('paceNormal')], ['quick', t('paceQuick')], ['calm', t('paceCalm')]], (v) => set({ paceMode: v })), h('small', { class: 'hint' }, t('paceHint')),
        toggle(t('announceTasks'), t('announceHint'), st.announceTasks, (v) => set({ announceTasks: v }))),
      group('a11y', `♿ ${t('a11y')}`, false,
        select(t('fontSize'), st.fontScale, FONT_SCALES.map((n) => [n, `${n}%`]), async (v) => { await set({ fontScale: +v }); applyA11y(S.get().settings); }),
        toggle(t('colorSafe'), '', st.colorSafe, async (v) => { await set({ colorSafe: v }); applyA11y(S.get().settings); }),
        toggle(t('contrastHigh'), '', st.contrast === 'high', async (v) => { await set({ contrast: v ? 'high' : 'normal' }); applyA11y(S.get().settings); }),
        toggle(t('srAnnounce'), t('srHint'), st.srAnnounce, (v) => set({ srAnnounce: v }))),
      group('coach', `🧘 ${t('coach')}`, false,
        toggle(t('coachButton'), '', st.coachButton, (v) => set({ coachButton: v })),
        toggle(t('coachAuto'), t('coachAutoHint'), st.coachAuto, (v) => set({ coachAuto: v })),
        toggle(t('sugSetting'), t('sugSettingHint'), suggestionsOn(), (v) => setSuggestionsOn(v)),
        select(t('weeklySetting'), st.weeklyOn === false ? 'off' : String(st.weeklyDay), [['off', t('weeklyOff')], ...[0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), t(`day${d}`)])], (v) => set(v === 'off' ? { weeklyOn: false } : { weeklyOn: true, weeklyDay: Number(v) })),
        h('small', { class: 'hint' }, t('weeklyHint')),
        h('small', { class: 'hint' }, t('coachDisclaimer'))),
      ttsSupported() ? group('voice', `🔊 ${t('voiceSection')}`, false, h('small', { class: 'hint' }, t('voiceHint')),
        toggle(t('speakOn'), '', st.speak, (v) => set({ speak: v })), toggle(t('coachSpeak'), '', st.coachSpeak, (v) => set({ coachSpeak: v })), voiceControls(st, set)) : null,
      group('points', `⭐ ${t('ptsTitle')}`, false, h('p', { class: 'note' }, t('ptsIntro')),
        select(t('ptsMode'), st.scoring, [['off', t('ptsOff')], ['auto', t('ptsAuto')], ['custom', t('ptsCustom')]], (v) => set({ scoring: v }, true)),
        h('small', { class: 'hint' }, t(`ptsModeHint_${st.scoring}`)),
        st.scoring === 'off' ? null : toggle(t('ptsPenalty'), t('ptsPenaltyHint'), st.scorePenalty, (v) => set({ scorePenalty: v })),
        st.scoring === 'off' ? null : toggle(t('ptsCumulative'), t('ptsCumulativeHint'), st.scoreCumulative, (v) => set({ scoreCumulative: v })),
        st.scoring === 'off' ? null : h('small', { class: 'hint' }, t('ptsRules'))),
      group('voicecmd', `🎤 ${t('vcTitle')}`, false, h('p', { class: 'note' }, t('vcSettingsIntro')),
        dictationSupported() ? h('div', { class: 'vc-toggle-row' }, toggle(t('vcAuto'), t('vcAutoHint'), !!st.voiceCmdAuto, (v) => set({ voiceCmdAuto: v })), helpButton()) : h('p', { class: 'note' }, t('vcUnavailable')),
        commandList()),
      group('alerts', t('alertsSection'), false,
        select(t('soundMode'), st.mode, [['both', t('mBoth')], ['beep', t('mBeep')], ['vibrate', t('mVibrate')], ['silent', t('mSilent')]], (v) => set({ mode: v })),
        h('label', { class: 'field' }, h('span', { class: 'lbl' }, `${t('volume')}: ${st.volume}%`), h('input', { type: 'range', min: 0, max: 100, value: st.volume, oninput: (e) => { e.target.previousSibling.textContent = `${t('volume')}: ${e.target.value}%`; S.updateSettings({ volume: +e.target.value }); } })),
        select(t('warnBefore'), st.warnSec, [[0, t('warnOff')], [5, t('warnSec', { n: 5 })], [10, t('warnSec', { n: 10 })], [15, t('warnSec', { n: 15 })], [30, t('warnSec', { n: 30 })]], (v) => set({ warnSec: +v })),
        h('div', { class: 'toolbar' }, h('button', { class: 'btn', type: 'button', onclick: () => { unlockAudio(); signal('warn', st.mode, st.volume); setTimeout(() => signal('end', st.mode, st.volume), 700); } }, icon('bell', 18), t('test')))),
      group('defaults', t('defaultsSection'), false,
        minSec(t('defTask'), st.defTaskSec, (v) => set({ defTaskSec: v })),
        minSec(t('defEst'), st.defEstSec, (v) => set({ defEstSec: v }), true),
        toggle(t('autoAdvance'), t('autoAdvanceHint'), st.autoAdvance, (v) => set({ autoAdvance: v })),
        toggle(t('keepAwake'), '', st.keepAwake, (v) => set({ keepAwake: v })),
        toggle(t('keepAwakeApp'), t('keepAwakeAppHint'), st.keepAwakeApp, (v) => { setAwake('app', v); set({ keepAwakeApp: v }); })),
      group('sync', t('syncTitle'), false, h('p', { class: 'note' }, t('syncHint')),
        h('div', { class: 'toolbar wrap' },
          h('button', { class: 'btn', type: 'button', onclick: saveBackupFile }, icon('download', 18), t('exportFile')),
          h('button', { class: 'btn', type: 'button', onclick: copySyncCode }, icon('copy', 18), t('exportCode')),
          h('button', { class: 'btn', type: 'button', onclick: sendSyncCode }, icon('share', 18), t('exportSend'))),
        h('div', { class: 'toolbar wrap' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => openBackupImport() }, t('importBackupBtn')),
          h('button', { class: 'btn', type: 'button', onclick: async () => { await S.addSamples(true); toast(t('saved')); } }, t('moreSamples')))),
      group('app', t('app'), false,
        native.available ? [h('p', {}, t('nativeActive')), h('p', { class: 'note' }, t('widgets'))] : [
          h('p', { class: 'note' }, t('apkNote')),
          h('div', { class: 'toolbar wrap' },
            h('a', { class: 'btn primary', href: APK_URL, rel: 'noopener', download: 'morning-organizer.apk' }, icon('download', 18), t('downloadApk')),
            deferredInstall ? h('button', { class: 'btn', type: 'button', onclick: async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; draw(); } }, t('installPwa')) : null)],
        h('p', { class: 'note' }, `${t('version', { v: version && version !== '0' ? version : getVersion() || '?' })} · ${t('offline')}`),
        h('div', { class: 'toolbar wrap' }, h('button', { class: 'btn primary', type: 'button', onclick: () => openShareApp() }, `📣 ${t('shareApp')}`), h('button', { class: 'btn', type: 'button', onclick: () => openWhatsNew((hash) => { location.hash = hash; }) }, `🎉 ${t('wnLink')}`))));
    if (query) applyFilter(root, query);
  };
  draw();
  return () => { alive = false; };
}

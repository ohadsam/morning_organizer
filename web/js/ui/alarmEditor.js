// Alarm editor for a routine: a chain of wake-up rings (each with its own sound, volume, text and voice) and what happens at the last one:
// the routine is offered with a Start button, or started automatically.
import { h, setChildren } from '../util.js';
import { t, getLang } from '../i18n.js';
import { native } from '../native.js';
import { icon } from './common.js';
import { PRESETS, speakText, ttsSupported } from '../speech.js';
import { playRing } from '../audio.js';
import { SOUNDS, MAX_EXTRA, schedule, normalizeAlarm } from '../wake.js';
import { requestWebNotifications } from '../reminders.js';
import * as S from '../store.js';
import { upcoming } from '../holidays.js';

/** Returns { el, draw }. `save()` persists the template. */
export function alarmEditor(tpl, save) {
  const el = h('section', { class: 'card alarm' });
  const slider = (label, value, min, max, step, fmt, set) => {
    const lbl = h('span', { class: 'lbl' }, fmt(value));
    return h('label', {}, lbl, h('input', { type: 'range', min, max, step, value, 'aria-label': label, oninput: (e) => { set(+e.target.value); lbl.textContent = fmt(+e.target.value); save(); } }));
  };
  /** Type of ring: big tiles, tap one to choose it and hear it. "From my phone" (Android app only) opens the phone's own sound picker. */
  const EMOJI = { alarm: '⏰', gentle: '🌿', ringtone: '📞', rising: '🌄', bell: '🔔', birds: '🐦', digital: '📟', melody: '🎵', device: '📱' };
  const soundPicker = (r, name) => h('fieldset', { class: 'sound-picker' }, h('legend', {}, t('alarmRingType')),
    h('div', { class: 'sound-grid', role: 'radiogroup', 'aria-label': `${name}: ${t('alarmRingType')}` }, SOUNDS.filter((x) => x !== 'device' || native.available).map((x) => h('button', { type: 'button', class: `sound-tile ${r.sound === x ? 'on' : ''}`, role: 'radio', 'aria-checked': String(r.sound === x),
      onclick: () => { if (x === 'device') return pickDeviceSound(r); r.sound = x; save(); playRing(x, r.volume, false); draw(); } }, h('span', { class: 'st-e', 'aria-hidden': 'true' }, EMOJI[x]), h('span', {}, t(`snd_${x}`))))),
    r.sound === 'device' ? h('small', { class: 'hint' }, r.toneTitle ? t('alarmToneChosen', { title: r.toneTitle }) : t('alarmPickDevice')) : null,
    native.available ? null : h('small', { class: 'hint' }, t('alarmTonePreview')));
  function pickDeviceSound(r) {
    const on = (e) => { const d = e.detail; if (d?.type !== 'ringtone') return; globalThis.removeEventListener('morning-native', on); if (d.uri) { r.sound = 'device'; r.tone = d.uri; r.toneTitle = String(d.title || '').slice(0, 40); Object.assign(tpl.alarm, normalizeAlarm(tpl.alarm)); save(); } draw(); };
    globalThis.addEventListener('morning-native', on); native.pickRingtone('ring');
  }
  const ringFields = (r, name) => h('div', { class: 'ring-fields' },
    soundPicker(r, name),
    slider(`${name}: ${t('alarmVolume')}`, r.volume, 0, 100, 1, (v) => `${t('alarmVolume')}: ${v}%`, (v) => { r.volume = v; }),
    h('label', { class: 'switch row' }, h('span', {}, t('alarmVibrate')), h('input', { type: 'checkbox', checked: r.vibrate, 'aria-label': `${name}: ${t('alarmVibrate')}`, onchange: (e) => { r.vibrate = e.target.checked; save(); } })),
    slider(`${name}: ${t('alarmDuration')}`, r.durationSec, 5, 300, 5, (v) => `${t('alarmDuration')}: ${v} ${t('seconds')}`, (v) => { r.durationSec = v; }),
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('alarmText')), h('input', { type: 'text', maxLength: 80, value: r.text, placeholder: t('alarmTextPh'), 'aria-label': `${name}: ${t('alarmText')}`, oninput: (e) => { r.text = e.target.value; save(); } })),
    ttsSupported() ? [h('label', { class: 'switch row' }, h('span', {}, t('alarmSpeak')), h('input', { type: 'checkbox', checked: r.speak, 'aria-label': `${name}: ${t('alarmSpeak')}`, onchange: (e) => { r.speak = e.target.checked; save(); draw(); } })),
      r.speak ? h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('voiceChar')), h('select', { 'aria-label': `${name}: ${t('voiceChar')}`, onchange: (e) => { r.voice = e.target.value; save(); } }, Object.entries(PRESETS).map(([k, p]) => h('option', { value: k, selected: r.voice === k }, `${p.emoji} ${t(`p_${k}`)}`)))) : null] : null,
    h('button', { class: 'btn small', type: 'button', onclick: () => { playRing(r.sound, r.volume, false); if (r.speak) setTimeout(() => speakText(r.text || t('alarmDefaultText', { name: tpl.name || '' }), { lang: getLang(), voiceURI: S.get().settings.voiceURI, preset: r.voice }), 1500); } }, `🔊 ${t('alarmTest')}`));

  function draw() {
    Object.assign(tpl.alarm, normalizeAlarm(tpl.alarm)); const a = tpl.alarm, times = schedule(a);
    const toggle = h('label', { class: 'switch row' }, h('span', {}, icon('bell', 18), ' ', t('alarmEnable')),
      h('input', { type: 'checkbox', checked: a.enabled, onchange: (e) => { a.enabled = e.target.checked; if (a.enabled) { requestWebNotifications(); native.requestNotifications(); } save(); draw(); } }));
    if (!a.enabled) { setChildren(el, toggle); return; }
    const gapRow = (m, i) => h('div', { class: 'card ring-card' }, h('div', { class: 'row between' }, h('strong', {}, t('alarmRingN', { n: i + 2, time: times[i + 1] })),
      h('button', { class: 'btn small danger', type: 'button', 'aria-label': t('delete'), onclick: () => { a.more.splice(i, 1); save(); draw(); } }, '✕')),
      h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('alarmGap')), h('span', { class: 'dur-in' }, h('input', { type: 'number', min: 1, max: 120, inputMode: 'numeric', value: m.afterMin, 'aria-label': `${t('alarmGap')} ${i + 2}`, onchange: (e) => { m.afterMin = Math.max(1, Math.min(120, Math.round(+e.target.value) || 5)); save(); draw(); } }), h('i', {}, t('minutes')))),
      ringFields(m, t('alarmRingShort', { n: i + 2 })));
    const rep = { n: 3, gap: 5 };
    const offRuns = upcoming(new Date(), 3), fmt = (d) => new Intl.DateTimeFormat(getLang(), { day: 'numeric', month: 'short' }).format(d);
    setChildren(el, toggle,
      h('label', { class: 'switch row' }, h('span', {}, t('alarmOffDays'), h('small', { class: 'hint' }, t('alarmOffDaysHint'))), h('input', { type: 'checkbox', checked: a.offDays, 'aria-label': t('alarmOffDays'), onchange: (e) => { a.offDays = e.target.checked; save(); draw(); } })),
      a.offDays && offRuns.length ? h('small', { class: 'hint' }, t('alarmOffDaysNext', { list: offRuns.map((o) => `${t(`hol_${o.key}`)} ${o.from.getTime() === o.to.getTime() ? fmt(o.from) : t('calRange', { from: fmt(o.from), to: fmt(o.to) })}`).join(' · ') })) : null,
      h('div', { class: 'alarm-grid' },
        h('label', {}, h('span', { class: 'lbl' }, t('alarmTime')), h('input', { type: 'time', value: a.time, oninput: (e) => { a.time = e.target.value || '07:00'; save(); }, onchange: draw })),
        h('fieldset', { class: 'days' }, h('legend', {}, t('alarmDays')), [0, 1, 2, 3, 4, 5, 6].map((d) => h('label', { class: 'day' }, h('input', { type: 'checkbox', checked: a.days.includes(d), onchange: (e) => { a.days = e.target.checked ? [...a.days, d].sort() : a.days.filter((x) => x !== d); save(); } }), h('span', {}, t(`day${d}`))))),
        h('div', { class: 'card ring-card' }, h('strong', {}, t('alarmRingN', { n: 1, time: times[0] })), ringFields(a, t('alarmRingShort', { n: 1 }))),
        a.more.map(gapRow),
        a.more.length < MAX_EXTRA ? h('div', { class: 'card stack' }, h('button', { class: 'btn', type: 'button', onclick: () => { const last = a.more.at(-1) || a; a.more.push({ afterMin: 5, sound: last.sound, volume: last.volume, vibrate: last.vibrate, durationSec: last.durationSec, text: '', speak: false, voice: 'natural' }); save(); draw(); } }, `+ ${t('alarmAddRing')}`),
          h('div', { class: 'row-btns' }, h('label', { class: 'dur-in' }, h('input', { type: 'number', min: 1, max: MAX_EXTRA, value: rep.n, 'aria-label': t('alarmRepCount'), onchange: (e) => { rep.n = Math.max(1, Math.min(MAX_EXTRA - a.more.length, Math.round(+e.target.value) || 1)); } }), h('i', {}, t('alarmRepTimes'))),
            h('label', { class: 'dur-in' }, h('input', { type: 'number', min: 1, max: 120, value: rep.gap, 'aria-label': t('alarmRepGap'), onchange: (e) => { rep.gap = Math.max(1, Math.min(120, Math.round(+e.target.value) || 5)); } }), h('i', {}, t('alarmRepEvery'))),
            h('button', { class: 'btn small', type: 'button', onclick: () => { const last = a.more.at(-1) || a; for (let i = 0; i < rep.n && a.more.length < MAX_EXTRA; i++) a.more.push({ afterMin: rep.gap, sound: last.sound, volume: last.volume, vibrate: last.vibrate, durationSec: last.durationSec, text: '', speak: false, voice: 'natural' }); save(); draw(); } }, t('alarmRepAdd')))) : null,
        h('fieldset', { class: 'card stack' }, h('legend', {}, t('alarmStartMode')),
          ['offer', 'auto'].map((m) => h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'startMode', checked: a.startMode === m, onchange: () => { a.startMode = m; save(); draw(); } }), h('span', {}, t(`startMode_${m}`), h('small', { class: 'hint' }, t(`startModeHint_${m}`)))))),
        h('p', { class: 'chip solid' }, t(a.startMode === 'auto' ? 'alarmSummaryAuto' : 'alarmSummaryOffer', { times: times.join(' → '), last: times.at(-1) })),
        native.available ? h('p', { class: 'note' }, t('alarmAutoNote')) : h('p', { class: 'note' }, t('alarmWebNote'))));
  }
  draw();
  return { el, draw };
}

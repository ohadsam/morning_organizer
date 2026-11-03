// Easier time entry for a task: [-] 5m 30s [+] with a smart step, and a tap on the time opens a sheet with presets, steppers and exact minutes/seconds.
import { h, fmtHuman, clamp } from '../util.js';
import { t, units } from '../i18n.js';
import { modal } from './common.js';

export const MAX_SEC = 24 * 3600;
/** Step that feels right at that size: fine below a minute, a minute up to ten, five minutes beyond. */
export const stepFor = (sec) => (sec < 60 ? 15 : sec < 600 ? 60 : 300);
export const PRESETS = [60, 120, 180, 300, 600, 900, 1200, 1800, 2700, 3600];
const nudge = (sec, dir, min) => clamp(dir > 0 ? sec + stepFor(sec) : sec - stepFor(sec - 1), min, MAX_SEC);

function openSheet(label, start, onSet, { min, emptyLabel }) {
  let v = start;
  const big = h('div', { class: 'tp-big', role: 'status', 'aria-live': 'polite' }), mi = h('input', { type: 'number', inputMode: 'numeric', min: 0, max: 1440, 'aria-label': `${label} ${t('minutes')}` }), si = h('input', { type: 'number', inputMode: 'numeric', min: 0, max: 59, 'aria-label': `${label} ${t('seconds')}` });
  const paint = (fromInputs) => { big.textContent = v ? fmtHuman(v, units()) : (emptyLabel || '0'); if (!fromInputs) { mi.value = v ? Math.floor(v / 60) : ''; si.value = v ? v % 60 : ''; } };
  const set = (n) => { v = clamp(Math.round(n), min, MAX_SEC); paint(false); };
  const fromInputs = () => { v = clamp(Math.floor(+mi.value || 0) * 60 + Math.min(59, Math.floor(+si.value || 0)), min, MAX_SEC); paint(true); };
  mi.addEventListener('input', fromInputs); si.addEventListener('input', fromInputs);
  const add = (s, txt) => h('button', { class: 'btn small', type: 'button', onclick: () => set(v + s) }, txt);
  paint(false);
  return modal(`⏱ ${label}`, h('div', { class: 'stack center' }, big,
    h('div', { class: 'row-btns' }, add(-60, '−1m'), add(-15, '−15s'), add(15, '+15s'), add(60, '+1m'), add(300, '+5m')),
    h('div', { class: 'tp-presets', role: 'group', 'aria-label': t('tpQuick') }, PRESETS.map((p) => h('button', { class: 'btn small', type: 'button', onclick: () => set(p) }, fmtHuman(p, units())))),
    h('div', { class: 'dur-in' }, mi, h('i', {}, t('minutes')), si, h('i', {}, t('seconds'))),
    min === 0 ? h('button', { class: 'btn small', type: 'button', onclick: () => set(0) }, emptyLabel) : null),
  [{ label: t('cancel') }, { label: t('ok'), primary: true, fn: () => { onSet(v); } }]);
}

/** -> node. onChange(sec) fires on every change. allowEmpty: 0 means "same as duration" (shown as emptyLabel). */
export function timeField(label, sec, onChange, { allowEmpty = false, emptyLabel = '=' } = {}) {
  const min = allowEmpty ? 0 : 1; let v = sec;
  const val = h('button', { class: 'tp-val', type: 'button', 'aria-label': `${label}: ${t('tpEdit')}`, onclick: () => openSheet(label, v, (n) => apply(n), { min, emptyLabel: allowEmpty ? emptyLabel : '' }) });
  const text = () => (v ? fmtHuman(v, units()) : emptyLabel);
  const apply = (n) => { v = n; val.textContent = text(); onChange(v); };
  val.textContent = text();
  return h('div', { class: 'dur tp' }, h('span', { class: 'lbl' }, label), h('div', { class: 'tp-row' },
    h('button', { class: 'btn icon-btn tp-step', type: 'button', 'aria-label': `${label}: ${t('tpLess')}`, onclick: () => apply(nudge(v, -1, min)) }, '−'),
    val,
    h('button', { class: 'btn icon-btn tp-step', type: 'button', 'aria-label': `${label}: ${t('tpMore')}`, onclick: () => apply(nudge(v || 0, 1, min)) }, '+')));
}

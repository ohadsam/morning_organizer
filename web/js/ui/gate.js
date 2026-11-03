// "Grown-ups only" gate for simple (kids) mode: a quick arithmetic question. Unlocked for 10 minutes. Not security - just a speed bump for small children.
import { h } from '../util.js';
import { t } from '../i18n.js';
import { modal } from './common.js';

let until = 0;
export const isUnlocked = () => Date.now() < until;

export function requestGate() {
  if (isUnlocked()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const a = 6 + Math.floor(Math.random() * 4), b = 4 + Math.floor(Math.random() * 6);
    const input = h('input', { type: 'number', inputMode: 'numeric', 'aria-label': t('gateQ', { a, b }), autocomplete: 'off' });
    const msg = h('p', { class: 'note', role: 'status' }, '');
    let done = false;
    const m = modal(`🔒 ${t('gateTitle')}`, h('div', { class: 'stack' }, h('p', { class: 'gate-q' }, t('gateQ', { a, b })), input, msg), [
      { label: t('cancel'), fn: () => { done = true; resolve(false); } },
      { label: t('ok'), primary: true, fn: () => { if (Number(input.value) === a * b) { until = Date.now() + 10 * 60_000; done = true; resolve(true); return true; } msg.textContent = t('gateWrong'); msg.classList.add('err'); input.value = ''; return false; } }]);
    m.el.addEventListener('close', () => { if (!done) resolve(false); });
    setTimeout(() => input.focus(), 50);
  });
}

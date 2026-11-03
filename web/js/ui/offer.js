// "Time to start" prompt: the routine is offered with a Start button (or started right away when the alarm is set to auto-start).
import { h } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { modal } from './common.js';

let open = null;
/** text: the ring's own message (optional). nav(hash) opens the run. */
export function openStartOffer(tplId, nav, text = '') {
  const tpl = S.getTemplate(tplId); if (!tpl) return;
  open?.close(); const startNow = () => nav(`#/run/${tpl.id}`);
  open = modal(`${tpl.icon} ${t('offerTitle', { name: tpl.name })}`, h('div', { class: 'stack center' }, h('div', { class: 'big-emoji', 'aria-hidden': 'true' }, '⏰'), text ? h('p', {}, text) : null, h('button', { class: 'btn primary xl', type: 'button', onclick: () => { open?.close(); startNow(); } }, `▶ ${t('start')}`)),
    [{ label: t('offerLater') }]);
  return open;
}
/** What to do when a wake-up ring (browser or native) reaches the person. */
export function handleRing(tplId, { final, mode, text }, nav) {
  if (final && mode === 'auto') nav(`#/run/${tplId}`); else openStartOffer(tplId, nav, text);
}

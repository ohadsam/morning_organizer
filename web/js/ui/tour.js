// The first-run tour: five short cards (see ../tour.js), each with Sunny and a "Show me" that goes straight there. Skippable; again from Settings.
import { h, setChildren } from '../util.js';
import { t, getLang } from '../i18n.js';
import { TOUR } from '../tour.js';
import { modal } from './common.js';
import { cameoNode } from './mascot.js';

export const TOUR_KEY = 'mo.tour';
export const tourSeen = () => { try { return !!localStorage.getItem(TOUR_KEY); } catch { return true; } };
const mark = () => { try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* blocked */ } };
export function openTour(nav) {
  let i = 0; const lang = getLang() === 'he' ? 'he' : 'en', body = h('div', { class: 'stack center tour-body' });
  let m;
  const paint = () => {
    const s = TOUR[i], [title, text] = s[lang];
    setChildren(body, h('p', { class: 'muted', 'aria-live': 'polite' }, t('tourStep', { n: i + 1, m: TOUR.length })), cameoNode(s.cameo, { size: 120 }), h('h2', {}, title), h('p', {}, text),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn', type: 'button', onclick: () => { mark(); m.close(); nav(s.route); } }, `👉 ${t('tourShow')}`)),
      h('div', { class: 'btn-pair' }, h('button', { class: 'btn', type: 'button', disabled: i === 0, onclick: () => { i -= 1; paint(); } }, t('avkBack')),
        i < TOUR.length - 1 ? h('button', { class: 'btn primary', type: 'button', onclick: () => { i += 1; paint(); } }, t('avkNext')) : h('button', { class: 'btn primary', type: 'button', onclick: () => { mark(); m.close(); } }, t('tourDone'))));
  };
  paint(); m = modal(`🧭 ${t('tourTitle')}`, body, [{ label: t('tourSkip'), fn: () => { mark(); } }]); m.el.classList.add('tour');
  return m;
}

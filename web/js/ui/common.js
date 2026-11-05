// Shared UI pieces: icons, toast, modal dialogs, confirm.
import { h, setChildren } from '../util.js';
import { t } from '../i18n.js';

const NS = 'http://www.w3.org/2000/svg';
const PATHS = {
  plus: 'M12 5v14M5 12h14', back: 'M15 5l-7 7 7 7', play: 'M8 5v14l11-7z', pause: 'M7 5v14M17 5v14', check: 'M5 12l5 5 9-10',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', edit: 'M4 20l4-1 11-11-3-3L5 16z',
  copy: 'M9 9h10v11H9zM5 5h10v2M5 5v11h2', share: 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6', drag: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01', skip: 'M5 5v14l9-7zM17 5v14',
  home: 'M4 11l8-7 8 7v9H5z', chart: 'M5 20V10M12 20V4M19 20v-7', gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .5-1.5-1.5L17 5l-3-1-1 2h-2L10 4 7 5l.5 2L6 8.5 4 8 3 11l2 1v2l-2 1 1 3 2-.5L7.5 19 7 21l3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z',
  book: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11', download: 'M12 4v11M7 11l5 5 5-5M5 20h14', bell: 'M6 17V11a6 6 0 1112 0v6l2 2H4zM10 21h4',
  users: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 11a2.5 2.5 0 100-5M21 19c0-2-1.5-3.5-4-4',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  nfc: 'M5 7c4 2 4 8 0 10M9 5c6 3 6 11 0 14M13 3c8 4 8 14 0 18', close: 'M6 6l12 12M18 6L6 18', menu: 'M4 6h16M4 12h16M4 18h16', plus1: 'M12 5v14M5 12h14', stop: 'M6 6h12v12H6z',
};
export function icon(name, size = 22) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
  s.setAttribute('fill', name === 'play' || name === 'stop' ? 'currentColor' : 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true'); s.classList.add('icon');
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', PATHS[name] || ''); s.append(p);
  return s;
}
/** Icon-only button with an accessible name. */
export const iconBtn = (name, label, onclick, cls = '') =>
  h('button', { class: `btn icon-btn ${cls}`, type: 'button', 'aria-label': label, title: label, onclick }, icon(name));

let toastTimer;
export function toast(msg, action) {
  const root = document.getElementById('toast');
  setChildren(root, h('span', {}, msg), action ? h('button', { class: 'btn link', type: 'button', onclick: () => { action.fn(); root.hidden = true; } }, action.label) : null);
  root.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { root.hidden = true; }, action ? 6000 : 2200);
}

/** Native <dialog> gives focus trapping, Esc handling and a backdrop for free. */
export function modal(title, body, actions = []) {
  const dlg = h('dialog', { class: 'modal', 'aria-label': title });
  const close = () => { dlg.close(); dlg.remove(); };
  setChildren(dlg, h('header', {}, h('h2', {}, title), iconBtn('close', t('close'), close)), h('div', { class: 'modal-body' }, body),
    actions.length ? h('footer', {}, actions.map((a) => h('button', { class: `btn ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''}`, type: 'button',
      onclick: async () => { if ((await a.fn?.()) !== false) close(); } }, a.label))) : null);
  dlg.addEventListener('cancel', () => setTimeout(() => dlg.remove(), 0));
  document.body.append(dlg); dlg.showModal();
  return { close, el: dlg };
}
export const confirmBox = (message, okLabel = t('ok'), danger = false) =>
  new Promise((resolve) => {
    let answered = false;
    const m = modal(message, h('p', {}, ''), [
      { label: t('cancel'), fn: () => { answered = true; resolve(false); } },
      { label: okLabel, primary: !danger, danger, fn: () => { answered = true; resolve(true); } }]);
    m.el.addEventListener('close', () => { if (!answered) resolve(false); });
  });

/** A collapsible section (closed by default): a big readable title plus a short summary of what is inside, so a long page stays calm. Returns { el }. */
export function fold(title, summary, ...children) {
  const el = h('details', { class: 'fold' }, h('summary', {}, h('span', { class: 'fold-t' }, title), summary ? h('small', { class: 'fold-s' }, summary) : null), h('div', { class: 'fold-body' }, ...children));
  return { el };
}

/**
 * One unified toolbar: a single row of equal icon-over-label buttons. An item is either an action ({ icon, label, run }) or a dropdown ({ icon, label, items: [nodes] });
 * the open dropdown's buttons appear in one panel right under the bar (in the page flow, so nothing overlaps). One dropdown is open at a time; Escape closes it.
 * An item may set `badge` (a small marker such as a dot) and `pressed` (a state shown on the button).
 */
export function toolbar(items, label = '') {
  const panel = h('div', { class: 'tb-panel quick', hidden: true }); let openIt = null, openBtn = null;
  const close = () => { if (openBtn) { openBtn.setAttribute('aria-expanded', 'false'); openBtn.classList.remove('open'); } openIt = openBtn = null; panel.hidden = true; panel.replaceChildren(); };
  const btns = items.filter((it) => !it.items || it.items.length).map((it) => {
    const b = h('button', { type: 'button', class: `tb-btn ${it.pressed ? 'pressed' : ''}`, 'aria-haspopup': it.items ? 'true' : null, 'aria-expanded': it.items ? 'false' : null, 'aria-pressed': it.pressed === undefined ? null : String(!!it.pressed), 'data-tb': it.id || '',
      onclick: () => { if (!it.items) { close(); it.run?.(); return; } const was = openIt === it; close(); if (was) return; openIt = it; openBtn = b; b.setAttribute('aria-expanded', 'true'); b.classList.add('open'); setChildren(panel, it.items.filter(Boolean)); panel.hidden = false; } },
      h('span', { class: 'tb-i', 'aria-hidden': 'true' }, it.icon, it.badge ? h('i', { class: 'tb-dot' }) : null), h('span', { class: 'tb-l' }, it.label));
    return b;
  });
  const bar = h('div', { class: 'toolbar-main', role: 'group', 'aria-label': label }, btns);
  const root = h('div', { class: 'tb-wrap' }, bar, panel);
  panel.addEventListener('click', (e) => { if (e.target.closest('button, a')) setTimeout(close, 0); });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openBtn) { const b = openBtn; close(); b.focus(); } });
  return root;
}

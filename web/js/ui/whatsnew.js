// One-time "What's new" sheet after an update (not on the very first run): points at the new things so they are not missed.
import { h } from '../util.js';
import { t } from '../i18n.js';
import { modal } from './common.js';

const KEY = 'mo.seen';
const read = () => { try { return localStorage.getItem(KEY); } catch { return 'x'; } };
const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* blocked */ } };

export function maybeShowWhatsNew(version, nav, { firstRun = false } = {}) {
  if (!version || version === '0') return;
  const seen = read();
  if (seen === version) return;
  write(version);
  if (seen === null || firstRun) return;   // a brand-new install has nothing "new"
  let m;
  const go = (hash) => () => { m.close(); nav(hash); };
  m = modal(`🎉 ${t('wnTitle', { v: version })}`, h('div', { class: 'stack' }, h('ul', {}, ['wn1', 'wn2', 'wn3', 'wn4', 'wn5'].map((k) => h('li', {}, t(k)))),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: go('#/alarms') }, `⏰ ${t('alarmsTitle')}`), h('button', { class: 'btn', type: 'button', onclick: go('#/goals') }, `🎯 ${t('goalsTitle')}`), h('button', { class: 'btn', type: 'button', onclick: go('#/library') }, `📚 ${t('libTitle')}`))),
  [{ label: t('close'), primary: true }]);
}

// "What's new": a sheet after an update (never on the very first run) and a page you can open any time from Home or Settings. Shows the version number.
import { h } from '../util.js';
import { t, getLang } from '../i18n.js';
import { CHANGES, changesFor } from '../changelog.js';
import { native } from '../native.js';
import { modal } from './common.js';

const KEY = 'mo.seen';
let current = '';
export const setVersion = (v) => { current = v && v !== '0' ? v : ''; };
/** The running version: from version.json, else (Android app) from the APK. */
export const getVersion = () => current || native.version?.() || '';
const read = () => { try { return localStorage.getItem(KEY); } catch { return 'x'; } };
const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* blocked */ } };

const list = (c) => h('ul', {}, c[getLang() === 'he' ? 'he' : 'en'].map((x) => h('li', {}, x)));
/** The sheet. `onNav(hash)` opens a screen from a button. */
export function openWhatsNew(nav) {
  const v = getVersion(), now = changesFor(v) ?? CHANGES[0]; let m;
  const go = (hash) => () => { m.close(); nav(hash); };
  m = modal(`🎉 ${t('wnTitle', { v: now.v })}`, h('div', { class: 'stack' }, list(now),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: go('#/alarms') }, `⏰ ${t('alarmsTitle')}`), h('button', { class: 'btn', type: 'button', onclick: go('#/goals') }, `🎯 ${t('goalsTitle')}`), h('button', { class: 'btn', type: 'button', onclick: go('#/library') }, `📚 ${t('libTitle')}`)),
    CHANGES.length > 1 ? h('details', {}, h('summary', {}, t('wnEarlier')), CHANGES.filter((c) => c !== now).map((c) => h('section', {}, h('h3', {}, `v${c.v}`), list(c)))) : null,
    h('p', { class: 'note' }, t('version', { v: v || '?' }))), [{ label: t('close'), primary: true }]);
  return m;
}
export function maybeShowWhatsNew(version, nav, { firstRun = false } = {}) {
  if (!version || version === '0') return;
  const seen = read();
  if (seen === version) return;
  write(version);
  if (seen === null || firstRun) return;   // a brand-new install has nothing "new"
  openWhatsNew(nav);
}

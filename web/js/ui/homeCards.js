// Two quiet cards for Home, one at a time: the calm weekly summary, and a gentle reminder to keep a backup. Each remembers when it was closed.
import { h } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { cameoNode } from './mascot.js';
import { divider } from './scenery.js';
import { weekSummary, worthShowing, weekKey, needsBackupReminder } from '../weeklyCalm.js';
import { saveBackupFile } from './backup.js';

const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } }, put = (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } };
const SNOOZE_DAYS = 14;

export function weeklyCard(draw) {
  const p = S.activeProfile(), key = `mo.weekly.${p.id}`, now = Date.now(); if (get(key) === weekKey(now)) return null;
  const s = weekSummary(S.myRuns(), S.feelings(), now); if (!worthShowing(s)) return null;
  const lines = [s.runs ? t('wkRuns', { n: s.runs, d: s.days }) : null, s.stars ? t('wkStars', { n: s.stars }) : null, s.onTime ? t('wkOnTime', { n: s.onTime }) : null, s.feelN ? t('wkFeel', { x: s.feelAvg.toFixed(1), n: s.feelN }) : null].filter(Boolean);
  return h('section', { class: 'card weekly-card center', role: 'group', 'aria-label': t('wkTitle') }, cameoNode('proud', { size: 84 }), h('strong', {}, t('wkTitle')), divider('sunrise'), h('ul', { class: 'wk-list' }, lines.map((x) => h('li', {}, x))), h('p', { class: 'muted' }, t('wkKind')),
    h('button', { class: 'btn primary', type: 'button', onclick: () => { put(key, weekKey(now)); draw(); } }, t('wkThanks')));
}

export const markBackedUp = () => put('mo.lastBackup', String(Date.now()));
export function backupCard(draw) {
  const p = S.activeProfile(); if (!needsBackupReminder(S.myRuns().length, S.myTemplates().filter((x) => !x.builtin).length, Number(get('mo.lastBackup')) || 0, Number(get(`mo.backupSnooze.${p.id}`)) || 0)) return null;
  return h('section', { class: 'card backup-card center', role: 'group', 'aria-label': t('bkTitle') }, cameoNode('reminder', { size: 84 }), h('strong', {}, t('bkTitle')), h('p', {}, t('bkText')),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { saveBackupFile(); markBackedUp(); draw(); } }, t('bkNow')),
      h('button', { class: 'btn', type: 'button', onclick: () => { put(`mo.backupSnooze.${p.id}`, String(Date.now() + SNOOZE_DAYS * 86_400_000)); draw(); } }, t('bkLater'))));
}

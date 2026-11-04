// "Pause all alarms": a sheet with three choices (until tomorrow / a week / until switched back on), and the banner that shows on Home while paused.
import { h } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import { modal, toast } from './common.js';
import { PAUSE_CHOICES, pauseFor, activePause } from '../alarmPause.js';
import { requestWebNotifications } from '../reminders.js';
import { native } from '../native.js';

const whenText = (p) => (p === -1 ? t('pausedForever') : t('pausedUntil', { when: new Intl.DateTimeFormat(getLang(), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(p)) }));

export function openPauseSheet(onDone = () => {}) {
  const cur = activePause(S.get().settings.alarmsPause); let m;
  const set = async (v, msg) => { await S.updateSettings({ alarmsPause: v }); if (v === 0) { requestWebNotifications(); native.requestNotifications(); } toast(msg); m.close(); onDone(); };
  m = modal(`🔕 ${t('pauseTitle')}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, cur ? whenText(cur) : t('pauseHint')),
    cur ? h('button', { class: 'btn primary xl', type: 'button', onclick: () => set(0, t('resumedToast')) }, `🔔 ${t('pauseOff')}`) : null,
    h('div', { class: 'stack', role: 'group', 'aria-label': t('pauseTitle') }, PAUSE_CHOICES.map((c) => h('button', { class: 'btn', type: 'button', onclick: () => set(pauseFor(c), t('pausedToast')) }, `⏸ ${t(`pause${c[0].toUpperCase()}${c.slice(1)}`)}`)))), [{ label: t('close') }]);
  return m;
}
/** A line on Home while alarms are paused, with a one-tap way back. null when not paused. */
export function pausedBanner(redraw) {
  const p = activePause(S.get().settings.alarmsPause); if (!p) return null;
  return h('section', { class: 'card paused-banner', role: 'status' }, h('span', {}, `🔕 ${whenText(p)}`), h('button', { class: 'btn small primary', type: 'button', onclick: async () => { await S.updateSettings({ alarmsPause: 0 }); toast(t('resumedToast')); redraw(); } }, t('pauseOff')));
}

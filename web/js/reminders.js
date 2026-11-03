// Browser-only start reminders (the Android app uses real AlarmManager alarms instead).
// Honest limitation: these only fire while the page is open, which the editor tells the user.
import { nextFire } from './alarms.js';
import { signal } from './audio.js';
import { native } from './native.js';
import * as S from './store.js';
import { t } from './i18n.js';

export async function requestWebNotifications() {
  try { if ('Notification' in globalThis && Notification.permission === 'default') await Notification.requestPermission(); } catch { /* ignore */ }
}

let timer = null;
export function scheduleWebReminders(onOpen) {
  clearTimeout(timer);
  if (native.available) return; // native alarms own this
  const { templates, settings } = S.get();
  let best = null;
  for (const tpl of templates) { const at = nextFire(tpl.alarm); if (at && (!best || at < best.at)) best = { tpl, at }; }
  if (!best) return;
  const ms = Math.min(best.at - Date.now(), 2 ** 31 - 1);
  timer = setTimeout(() => {
    signal('end', settings.mode === 'silent' ? 'silent' : 'both', best.tpl.alarm.volume);
    try { if (Notification.permission === 'granted') new Notification(best.tpl.name, { body: t('start'), icon: 'icons/icon-192.png' }).onclick = () => onOpen(best.tpl.id); } catch { /* ignore */ }
    scheduleWebReminders(onOpen);
  }, Math.max(ms, 1000));
}

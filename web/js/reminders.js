// Browser-only start reminders (the Android app uses real AlarmManager alarms instead).
// Honest limitation: these only fire while the page is open, which the editor tells the user.
import { nextRing } from './wake.js';
import { playRing } from './audio.js';
import { speakText } from './speech.js';
import { native } from './native.js';
import * as S from './store.js';
import { t, getLang } from './i18n.js';

export async function requestWebNotifications() {
  try { if ('Notification' in globalThis && Notification.permission === 'default') await Notification.requestPermission(); } catch { /* ignore */ }
}

let timer = null, lastFiredAt = 0;   // a timer can fire a few ms early: never ring the same moment twice
/** The next wake-up ring (any routine). onRing(tpl, { ring, final, mode }) is called when it is due - the page decides what to show. */
export function scheduleWebReminders(onRing) {
  clearTimeout(timer);
  if (native.available) return; // native alarms own this
  let best = null;
  for (const tpl of S.get().templates) { const n = nextRing(tpl.alarm, new Date(Math.max(Date.now(), lastFiredAt + 1000))); if (n && (!best || n.at < best.at)) best = { tpl, ...n }; }
  if (!best) return;
  const ms = Math.min(best.at - Date.now(), 2 ** 31 - 1);
  timer = setTimeout(() => {
    const { ring, tpl, final } = best, s = S.get().settings; lastFiredAt = best.at.getTime();
    if (s.mode !== 'silent') playRing(ring.sound, ring.volume, ring.vibrate);
    const text = ring.text || t('alarmDefaultText', { name: tpl.name });
    if (ring.speak) setTimeout(() => speakText(text, { lang: getLang(), voiceURI: s.voiceURI, preset: ring.voice }), 1800);
    try { if (Notification.permission === 'granted') new Notification(tpl.name, { body: text, icon: 'icons/icon-192.png' }).onclick = () => onRing(tpl, { ring, final, mode: final ? tpl.alarm.startMode : 'offer', open: true }); } catch { /* ignore */ }
    onRing(tpl, { ring, final, mode: final ? tpl.alarm.startMode : 'offer', open: false, text });
    scheduleWebReminders(onRing);
  }, Math.max(ms, 1000));
}

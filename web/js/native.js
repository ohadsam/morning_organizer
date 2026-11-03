// Thin wrapper over the Android WebView bridge (`MorningNative`, see android/.../NativeBridge.kt).
// In a plain browser every method is a harmless no-op, so the rest of the app never branches on platform.
const B = globalThis.MorningNative;
const call = (name, ...args) => { try { return B?.[name]?.(...args); } catch (e) { console.warn('native', name, e); } };
const json = (v) => JSON.stringify(v);

export const native = {
  available: !!B,
  vibrate: (pattern) => call('vibrate', json(pattern)),
  /** alarms: [{id, templateId, name, hour, minute, days:[0..6], volume, vibrate, durationSec}] - replaces all. */
  setAlarms: (alarms) => call('setAlarms', json(alarms)),
  /** items: [{id, name, icon, taskCount, totalSec}] - favourites shown by the home-screen widget. */
  setWidget: (items) => call('setWidget', json(items)),
  keepAwake: (on) => call('keepAwake', !!on),
  /** Opens the system share sheet (Bluetooth, Nearby Share, WhatsApp...). */
  share: (title, text) => call('share', title, text),
  /** Opens the system "save as" picker and writes `text` to the chosen file. Result arrives as a {type:'saved'} event. */
  saveFile: (name, text) => call('saveFile', name, text),
  nfcWrite: (text) => call('nfcWrite', text),
  nfcCancel: () => call('nfcCancel'),
  canExactAlarms: () => call('canScheduleExactAlarms') !== false,
  openAlarmSettings: () => call('openExactAlarmSettings'),
  requestNotifications: () => call('requestNotifications'),
  takePending: () => { try { const s = call('takePendingIntent'); return s ? JSON.parse(s) : null; } catch { return null; } },
  version: () => call('appVersion'),
};

/** Native -> JS events: {type:'start', templateId} | {type:'import', text} | {type:'nfc', status} */
export function onNativeEvent(fn) {
  globalThis.addEventListener('morning-native', (e) => fn(e.detail));
}

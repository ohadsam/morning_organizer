// Keeps the screen on while at least one reason is active ('app' = user's global setting, 'run' = a routine is running).
// Browser: Screen Wake Lock API (re-acquired when the tab becomes visible again, as browsers drop it). Android app: FLAG_KEEP_SCREEN_ON.
import { native } from './native.js';

const reasons = new Set();
let lock = null;

async function apply() {
  const want = reasons.size > 0;
  native.keepAwake(want);
  try {
    if (want && 'wakeLock' in navigator && !lock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!want && lock) { await lock.release(); lock = null; }
  } catch { lock = null; /* denied / unsupported: harmless */ }
}
export function setAwake(reason, on) { if (on) reasons.add(reason); else reasons.delete(reason); return apply(); }
export const isAwakeWanted = () => reasons.size > 0;
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && reasons.size) apply(); });

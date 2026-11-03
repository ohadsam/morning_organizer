// Beeps (Web Audio) + vibration. Native bridge, when present, vibrates reliably (iOS web can't vibrate at all).
import { native } from './native.js';

let ctx = null;
/** Must be called from a user gesture once (Start button) so mobile browsers allow sound later. */
export function unlockAudio() {
  try {
    ctx ??= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* no audio available */ }
}

function beepAt(freq, startAt, dur, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), startAt + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
  o.connect(g).connect(ctx.destination); o.start(startAt); o.stop(startAt + dur + 0.02);
}

const PATTERN = { warn: { beeps: [[880, 0, 0.12]], vib: [120] }, end: { beeps: [[988, 0, 0.18], [988, 0.28, 0.18], [1318, 0.56, 0.35]], vib: [200, 100, 200, 100, 400] } };

/** kind: 'warn' | 'end'. mode: 'beep' | 'vibrate' | 'both' | 'silent'. volume 0-100. */
export function signal(kind, mode, volume = 80) {
  const p = PATTERN[kind]; if (!p || mode === 'silent') return;
  if ((mode === 'beep' || mode === 'both')) {
    unlockAudio();
    if (ctx) { const now = ctx.currentTime; for (const [f, off, d] of p.beeps) beepAt(f, now + off, d, (volume / 100) ** 2 * 0.8); }
  }
  if (mode === 'vibrate' || mode === 'both') {
    if (native.available) native.vibrate(p.vib);
    else try { navigator.vibrate?.(p.vib); } catch { /* unsupported */ }
  }
}

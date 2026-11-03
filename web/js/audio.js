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

const RINGS = {
  alarm: [[988, 0, 0.18], [988, 0.28, 0.18], [1318, 0.56, 0.35], [988, 1.2, 0.18], [988, 1.48, 0.18], [1318, 1.76, 0.35]],
  gentle: [[523, 0, 0.5], [659, 0.55, 0.5], [784, 1.1, 0.8]],
  ringtone: [[880, 0, 0.15], [1100, 0.2, 0.15], [880, 0.4, 0.15], [1100, 0.6, 0.15], [880, 1.4, 0.15], [1100, 1.6, 0.15], [880, 1.8, 0.15], [1100, 2, 0.15]],
  rising: [[440, 0, 0.3], [523, 0.5, 0.3], [659, 1, 0.3], [784, 1.5, 0.3], [988, 2, 0.5]],
};
/** A wake-up ring in the browser (the Android app plays real system sounds instead). volume 0-100. */
export function playRing(sound, volume = 80, vibrate = true) {
  const p = Object.hasOwn(RINGS, sound) ? RINGS[sound] : RINGS.alarm;
  if (volume > 0) { unlockAudio(); if (ctx) { const now = ctx.currentTime; p.forEach(([f, off, d], i) => beepAt(f, now + off, d, (volume / 100) ** 2 * 0.8 * (sound === 'rising' ? 0.4 + 0.15 * i : 1))); } }
  if (vibrate) { if (native.available) native.vibrate([300, 150, 300, 150, 600]); else try { navigator.vibrate?.([300, 150, 300, 150, 600]); } catch { /* unsupported */ } }
}

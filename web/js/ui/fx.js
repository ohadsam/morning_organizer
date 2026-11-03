// Celebratory effects, pure CSS animations (no canvas, no libs). Skipped entirely for users who prefer reduced motion.
import { h } from '../util.js';

const BITS = ['🎉', '⭐', '✨', '🎈', '🌟', '💛', '🟣', '🟡', '🟢', '🔵'];
export const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function confetti(parent, count = 34) {
  if (reducedMotion()) return;
  const layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < count; i++) {
    layer.append(h('span', { style: { '--x': `${Math.random() * 100}%`, '--d': `${(Math.random() * 1.2).toFixed(2)}s`, '--t': `${(2.4 + Math.random() * 1.8).toFixed(2)}s`,
      '--r': `${Math.round(Math.random() * 720 - 360)}deg`, '--s': `${(0.9 + Math.random() * 1.1).toFixed(2)}rem`, '--w': `${Math.round(Math.random() * 60 - 30)}px` } }, BITS[i % BITS.length]));
  }
  parent.append(layer);
  setTimeout(() => layer.remove(), 5000);
}

/** Speaks a message (opt-in). Uses the device's own voice; nothing leaves the device. */
export function speak(text, lang) {
  try {
    const s = globalThis.speechSynthesis; if (!s) return;
    s.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang === 'he' ? 'he-IL' : 'en-US'; u.rate = 0.95; s.speak(u);
  } catch { /* no voices: fine */ }
}

// Celebratory effects, pure CSS animations (no canvas, no libs). Skipped entirely for users who prefer reduced motion.
import { h } from '../util.js';

const BITS = ['🎉', '⭐', '✨', '🎈', '🌟', '💛', '🟣', '🟡', '🟢', '🔵'];
export const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || globalThis.document?.documentElement?.dataset.motion === 'calm';

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

const SPARK = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#c77dff', '#ff9f1c'];
/** Fireworks over the podium: a few bursts of sparks (pure CSS). Skipped for people who prefer reduced motion. */
export function fireworks(parent, bursts = 5) {
  if (reducedMotion()) return;
  const layer = h('div', { class: 'fireworks', 'aria-hidden': 'true' });
  for (let b = 0; b < bursts; b++) {
    const burst = h('div', { class: 'fw-burst', style: { '--x': `${10 + Math.random() * 80}%`, '--y': `${8 + Math.random() * 50}%`, '--d': `${(b * 0.45 + Math.random() * 0.2).toFixed(2)}s` } });
    for (let i = 0; i < 16; i++) burst.append(h('i', { style: { '--a': `${i * 22.5}deg`, '--c': SPARK[(b + i) % SPARK.length], '--r': `${48 + Math.round(Math.random() * 26)}px` } }));
    layer.append(burst);
  }
  parent.append(layer);
  setTimeout(() => layer.remove(), 4500);
}

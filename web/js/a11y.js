// Accessibility: text size, colour-blind-safe palette, high contrast, and a screen-reader announcement channel.
export const FONT_SCALES = [100, 115, 130, 150];
export function applyA11y(s) {
  const r = document.documentElement;
  r.style.setProperty('--fs', String((FONT_SCALES.includes(s.fontScale) ? s.fontScale : 100) / 100));
  r.dataset.colors = s.colorSafe ? 'safe' : 'normal'; r.dataset.contrast = s.contrast === 'high' ? 'high' : 'normal';
  try { localStorage.setItem('mo.a11y', JSON.stringify([s.fontScale, !!s.colorSafe, s.contrast])); } catch { /* blocked */ }
}
let flip = false;
/** Politely announce `text` to screen readers (TalkBack/VoiceOver) through the hidden live region. */
export function announce(text) {
  const el = document.getElementById('sr'); if (!el || !text) return;
  flip = !flip; el.textContent = flip ? text : `${text} `; // changing the text is what triggers the announcement
}

// Accessibility: text size, colour-blind-safe palette, high contrast, and a screen-reader announcement channel.
export const FONT_SCALES = [100, 115, 130, 150];
export function applyA11y(s) {
  const r = document.documentElement;
  r.style.setProperty('--fs', String((FONT_SCALES.includes(s.fontScale) ? s.fontScale : 100) / 100));
  r.dataset.colors = s.colorSafe ? 'safe' : 'normal'; r.dataset.contrast = s.contrast === 'high' ? 'high' : 'normal';
  if (/^#[0-9a-f]{6}$/i.test(s.accent || '')) { r.dataset.accent = '1'; r.style.setProperty('--user-accent', s.accent); } else { delete r.dataset.accent; r.style.removeProperty('--user-accent'); }
  try { localStorage.setItem('mo.a11y', JSON.stringify([s.fontScale, !!s.colorSafe, s.contrast, s.accent || ''])); } catch { /* blocked */ }
}
let flip = false;
/** Politely announce `text` to screen readers (TalkBack/VoiceOver) through the hidden live region. */
export function announce(text) {
  const el = document.getElementById('sr'); if (!el || !text) return;
  flip = !flip; el.textContent = flip ? text : `${text} `; // changing the text is what triggers the announcement
}

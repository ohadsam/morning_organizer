// Applies the saved theme/direction before first paint to avoid a flash. Reads a tiny localStorage mirror (IndexedDB is async).
// Hebrew + RTL is the default; "auto" follows the browser language.
try {
  const th = localStorage.getItem('mo.theme'); if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th;
  let lg = localStorage.getItem('mo.lang') || 'he';
  if (lg === 'auto') lg = /^(he|iw)\b/i.test(navigator.language || '') ? 'he' : 'en';
  document.documentElement.lang = lg; document.documentElement.dir = lg === 'he' ? 'rtl' : 'ltr';
  const a = JSON.parse(localStorage.getItem('mo.a11y') || 'null');
  if (a) { document.documentElement.style.setProperty('--fs', String((a[0] || 100) / 100)); document.documentElement.dataset.colors = a[1] ? 'safe' : 'normal'; document.documentElement.dataset.contrast = a[2] === 'high' ? 'high' : 'normal'; if (/^#[0-9a-f]{6}$/i.test(a[3] || '')) { document.documentElement.dataset.accent = '1'; document.documentElement.style.setProperty('--user-accent', a[3]); } }
} catch { /* storage blocked: the static markup is already Hebrew/RTL */ }

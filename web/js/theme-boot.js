// Applies the saved theme/direction before first paint to avoid a flash. Reads a tiny localStorage mirror (IndexedDB is async).
// Hebrew + RTL is the default; "auto" follows the browser language.
try {
  const th = localStorage.getItem('mo.theme'); if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th;
  let lg = localStorage.getItem('mo.lang') || 'he';
  if (lg === 'auto') lg = /^(he|iw)\b/i.test(navigator.language || '') ? 'he' : 'en';
  document.documentElement.lang = lg; document.documentElement.dir = lg === 'he' ? 'rtl' : 'ltr';
} catch { /* storage blocked: the static markup is already Hebrew/RTL */ }

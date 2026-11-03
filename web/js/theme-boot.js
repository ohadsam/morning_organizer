// Applies the saved theme/direction before first paint to avoid a flash. Reads a tiny localStorage mirror (IndexedDB is async).
try {
  const th = localStorage.getItem('mo.theme'); if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th;
  const lg = localStorage.getItem('mo.lang'); if (lg === 'he') { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'he'; }
} catch { /* storage blocked */ }

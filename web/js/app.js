// Entry point: boot, hash router, bottom navigation, service worker.
import * as S from './store.js';
import { setLang, t } from './i18n.js';
import { h } from './util.js';
import { native, onNativeEvent } from './native.js';
import { scheduleWebReminders } from './reminders.js';
import { renderHome } from './ui/home.js';
import { renderEditor } from './ui/editor.js';
import { renderRunner } from './ui/runner.js';
import { renderStats } from './ui/stats.js';
import { renderSettings, applyTheme } from './ui/settings.js';
import { renderGuide } from './ui/guide.js';
import { icon, toast } from './ui/common.js';
import { openImport, importCode } from './ui/share.js';
import { setAwake } from './awake.js';

const root = document.getElementById('app');
let cleanup = () => {}, version = '0';
const nav = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

async function route() {
  cleanup(); cleanup = () => {};
  const [, page, arg] = (location.hash.replace(/^#/, '') || '/').split('/');
  const view = page || 'home';
  document.body.dataset.view = view;
  root.scrollTo?.(0, 0); window.scrollTo(0, 0);
  if (view === 'import') { const code = decodeURIComponent(arg || ''); history.replaceState(null, '', '#/'); nav('#/'); openImport(code); return; }
  try {
    cleanup = (await ({
      home: () => renderHome(root, nav), edit: () => renderEditor(root, arg, nav), run: () => renderRunner(root, arg, nav),
      stats: () => renderStats(root, arg, nav), settings: () => renderSettings(root, version), guide: () => renderGuide(root),
    }[view] ?? (() => renderHome(root, nav)))()) || (() => {});
  } catch (e) { console.error(e); root.replaceChildren(h('p', { class: 'empty' }, t('error'))); }
  drawNav(view);
}

function drawNav(view) {
  const tabs = [['home', 'home', '#/'], ['stats', 'chart', '#/stats'], ['guide', 'book', '#/guide'], ['settings', 'gear', '#/settings']];
  const active = { edit: 'home', run: 'home' }[view] ?? view;
  document.getElementById('nav').replaceChildren(...tabs.map(([key, ic, href]) => h('a', { href, class: key === active ? 'on' : '', 'aria-current': key === active ? 'page' : null }, icon(ic, 24), h('span', {}, t(key === 'home' ? 'home' : key)))));
}

async function boot() {
  try {
    await S.init();
  } catch (e) { console.error(e); }
  const st = S.get().settings;
  setLang(st.lang); applyTheme(st.theme);
  document.title = t('appName');
  setAwake('app', st.keepAwakeApp);
  try { version = (await (await fetch('version.json', { cache: 'no-cache' })).json()).version; } catch { /* offline first load */ }
  await S.seedIfNeeded();
  S.syncNative();
  S.subscribe(() => scheduleWebReminders((id) => nav(`#/run/${id}`)));
  scheduleWebReminders((id) => nav(`#/run/${id}`));

  // Native shell events: widget/alarm taps and shared text arrive here.
  const handle = async (ev) => {
    if (!ev) return;
    if (ev.type === 'start' && S.getTemplate(ev.templateId)) nav(`#/run/${ev.templateId}`);
    if (ev.type === 'import') { try { await importCode(ev.text); nav('#/'); } catch { toast(t('importBad')); } }
  };
  onNativeEvent(handle);
  await handle(native.takePending());

  window.addEventListener('hashchange', route);
  await route();
  document.getElementById('boot')?.remove();

  if ('serviceWorker' in navigator && !native.available && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', function () {
        if (this.state === 'installed' && navigator.serviceWorker.controller) toast(t('updateReady'), { label: t('reload'), fn: () => location.reload() });
      }));
    }).catch(() => {});
  }
}
boot();

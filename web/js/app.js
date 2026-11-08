// Entry point: boot, hash router, bottom navigation, service worker.
import * as S from './store.js';
import { setLang, t, setPlayful, isPlayful, shouldBePlayful } from './i18n.js';
import { h, debounce, setChildren } from './util.js';
import { native, onNativeEvent } from './native.js';
import { scheduleWebReminders } from './reminders.js';
import { renderHome } from './ui/home.js';
import { renderEditor } from './ui/editor.js';
import { renderRunner } from './ui/runner.js';
import { renderStats } from './ui/stats.js';
import { renderSettings, applyTheme } from './ui/settings.js';
import { renderGuide } from './ui/guide.js';
import { icon, toast } from './ui/common.js';
import { openImport } from './ui/share.js';
import { setAwake } from './awake.js';
import { applyA11y } from './a11y.js';
import { openWelcome } from './ui/welcome.js';
import { renderFamily } from './ui/family.js';
import { routeIncoming } from './ui/incoming.js';
import { initFamily, unlinkProfile, setAlertHook } from './family.js';
import { setProfileDeleteHook } from './ui/avatar.js';
import { isUnlocked, requestGate } from './ui/gate.js';
import { initTransports } from './transports.js';
import { handleRing } from './ui/offer.js';
import { renderRetro, renderRetros } from './ui/retro.js';
import { renderReport } from './ui/report.js';
import { renderAlarms } from './ui/alarms.js';
import { renderGoals } from './ui/goals.js';
import { maybeShowWhatsNew, setVersion, getVersion } from './ui/whatsnew.js';
import { renderLibrary } from './ui/library.js';
import { renderCalm } from './ui/calm.js';
import { renderFeel } from './ui/feel.js';
import { renderNlp } from './ui/nlp.js';
import { loadPack as loadAvatarPack } from './ui/avatarKit.js';
import { iconNode, refreshIcons } from './ui/visualKit.js';
import { openSearch } from './ui/search.js';
import { drawTopbar, maybeAskWho } from './ui/people.js';
import { createUpdater, canAutoUpdate } from './update.js';
import { renderJournal } from './ui/journal.js';
import { lockAll } from './journal.js';

const root = document.getElementById('app');
let cleanup = () => {}, version = '0', routeSeq = 0;
const nav = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };
// Ctrl/Cmd+K opens the search from anywhere (not while a sheet is already open, nor in the kids' mode).
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !document.querySelector('dialog[open]') && !S.get().settings.simpleMode) { e.preventDefault(); openSearch(nav); } });

async function route() {
  cleanup(); cleanup = () => {}; const mine = ++routeSeq;
  const [, page, arg, arg2, arg3] = (location.hash.replace(/^#/, '') || '/').split('/');
  const view = page || 'home';
  // Simple (kids) mode: only routines and running them are open; everything else needs the grown-up gate.
  if (S.get().settings.simpleMode && !['home', 'run'].includes(view) && !isUnlocked() && !(await requestGate())) { if (location.hash !== '#/') location.hash = '#/'; else drawNav('home'); return; }
  document.body.dataset.view = view;
  root.scrollTo?.(0, 0); window.scrollTo(0, 0);
  if (view === 'import') { const code = decodeURIComponent(arg || ''); history.replaceState(null, '', '#/'); nav('#/'); openImport(code); return; }
  try {
    const views = {
      home: () => renderHome(root, nav), edit: () => renderEditor(root, arg, nav), run: () => renderRunner(root, arg, nav),
      stats: () => renderStats(root, arg, nav), family: () => renderFamily(root), settings: () => renderSettings(root, version, arg || ''), guide: () => renderGuide(root),
      calm: () => renderCalm(root, nav), feel: () => renderFeel(root, nav, arg), nlp: () => renderNlp(root, nav), library: () => renderLibrary(root, nav), alarms: () => renderAlarms(root, nav), report: () => renderReport(root, nav, arg, decodeURIComponent(arg2 || '')), retro: () => renderRetro(root, nav, decodeURIComponent(arg || ''), arg2, arg3), retros: () => renderRetros(root, nav), goals: () => renderGoals(root, nav), journal: () => renderJournal(root, nav),
    };
    // The route comes from the address bar: look it up as OWN data only ("#/constructor" or "#/__proto__" must fall back to home).
    const out = await (Object.hasOwn(views, view) ? views[view] : views.home)();
    // two routes can overlap (a hash change plus a profile switch): only the newest keeps its clean-up, the older one is torn down at once
    if (mine !== routeSeq) { if (typeof out === 'function') out(); return; }
    cleanup = typeof out === 'function' ? out : () => {};
  } catch (e) { console.error(e); setChildren(root, h('p', { class: 'empty' }, t('error'))); }
  drawNav(view);
}

function drawNav(view) {
  const simple = S.get().settings.simpleMode;
  const FB = { home: '🏠', stats: '📈', family: '👪', guide: '📖', settings: '⚙️' };   // emoji shown until the icon kit is loaded
  const tabs = simple ? [['home', 'routines', '#/'], ['settings', 'settings', '#/settings']] : [['home', 'routines', '#/'], S.shows('stats') ? ['stats', 'track', '#/stats'] : null, S.shows('family') ? ['family', 'family', '#/family'] : null, ['guide', 'guide', '#/guide'], ['settings', 'settings', '#/settings']].filter(Boolean);
  const parentTab = { edit: 'home', run: 'home', library: 'home', alarms: 'home', goals: 'home', report: 'stats', retro: 'stats', retros: 'stats' }, active = Object.hasOwn(parentTab, view) ? parentTab[view] : view;
  setChildren(document.getElementById('nav'), ...tabs.map(([key, ic, href]) => h('a', { href, class: key === active ? 'on' : '', 'aria-current': key === active ? 'page' : null }, iconNode(ic, { size: 24, fallback: FB[key] }), h('span', {}, t(key === 'family' ? 'tabFamily' : key)))),
    simple || view === 'run' ? null : h('button', { class: 'nav-search', type: 'button', 'aria-haspopup': 'dialog', 'aria-label': t('searchOpen'), title: t('searchOpen'), onclick: () => openSearch(nav) }, iconNode('search', { size: 24, fallback: '🔍' }), h('span', {}, t('searchOpen'))));
}

async function boot() {
  try {
    await S.init(); await initFamily(); setProfileDeleteHook(unlinkProfile);
    setAlertHook(({ link, alert }) => {
      const who = link.child?.profile?.name || link.peer?.name || '?', text = alert.kind === 'redeem' ? t('redeemAlert', { name: who, title: alert.name }) : t(alert.kind === 'overtime' ? 'alertBehind' : 'alertLate', { name: who, routine: alert.name, min: alert.minutes });
      toast(`🔔 ${text}`);
      if (native.available) native.notify(t('family'), text);
      else try { if (Notification.permission === 'granted') new Notification(t('family'), { body: text, icon: 'icons/icon-192.png' }); } catch { /* not allowed */ }
    });
  } catch (e) { console.error(e); }
  const st = S.get().settings;
  setLang(st.lang); applyTheme(st.theme); setPlayful(shouldBePlayful(st.textStyle, st.age));
  document.title = t('appName');
  setAwake('app', st.keepAwakeApp); applyA11y(st);
  try { version = (await (await fetch('version.json', { cache: 'no-cache' })).json()).version; } catch { /* offline first load */ }
  setVersion(version);
  await S.seedIfNeeded(); await S.migrateAlarms();
  S.syncNative();
  if (S.get().templates.some((x) => x.alarm?.enabled)) native.requestNotifications();   // alarms are on by default: ask for the notification permission up front (Android 13+)
  const onRing = (tpl, r) => handleRing(tpl.id, r, nav);
  // young children (or "playful" in Settings) get lighter wording everywhere; re-draw only when that actually flips
  S.subscribe(() => { const { textStyle, age } = S.get().settings, on = shouldBePlayful(textStyle, age); if (on !== isPlayful()) { setPlayful(on); route(); } });
  // each profile has its own look / language / sizes: when the person (or the settings) change, re-apply them and redraw
  let lookKey = '';
  const look = () => { const x = S.get().settings; return [x.activeProfile, x.lang, x.theme, x.skin, x.easyRead, x.fontScale, x.colorSafe, x.contrast, x.accent, x.simpleMode, x.reduceMotion, x.iconStyle, x.iconMono].join('|'); };
  lookKey = look();
  S.subscribe(() => { const k = look(); if (k === lookKey) return; const was = lookKey.split('|'), x = S.get().settings; lookKey = k;
    setLang(x.lang); applyTheme(x.theme); applyA11y(x); refreshIcons(); document.title = t('appName'); try { localStorage.setItem('mo.theme', x.theme); localStorage.setItem('mo.lang', x.lang); } catch { /* blocked */ }
    if (was[0] !== x.activeProfile || was[1] !== x.lang || was[9] !== String(x.simpleMode)) { drawNav(document.body.dataset.view); route(); } });
  // progress widget (Android): a tiny snapshot whenever something changes
  const { finished: finishedRuns, streak: streakOf, totalStars: starsOf } = await import('./stats.js'), { weeklyReport } = await import('./weekly.js');
  const pushStats = debounce(() => { if (!native.available) return; const done = finishedRuns(S.myRuns()); native.setStats({ name: S.get().settings.personName, stars: starsOf(done), streak: streakOf(done), week: weeklyReport(done, Date.now()).onTime ?? 0 }); }, 800);
  S.subscribe(pushStats); pushStats();
  if (native.available && S.get().settings.voiceEngine) native.ttsSetEngine(S.get().settings.voiceEngine);
  S.subscribe(() => scheduleWebReminders(onRing));
  scheduleWebReminders(onRing);

  // Native shell events: widget/alarm taps and shared text arrive here.
  const handle = async (ev) => {
    if (!ev) return;
    if (ev.type === 'start' && S.getTemplate(ev.templateId)) handleRing(ev.templateId, { final: true, mode: ev.mode === 'offer' ? 'offer' : 'auto', text: String(ev.text || '').slice(0, 120) }, nav);
    if (ev.type === 'nfcrx') { if (ev.status === 'listening') toast(t('tapHold')); else if (ev.status === 'timeout') toast(t('tapTimeout')); else if (ev.status === 'unavailable') toast(t('tapUnavailable')); }
    if (ev.type === 'qrfail') toast(t('scanUnsupported'));
    if (ev.type === 'saved') toast(t(ev.status === 'ok' ? 'savedFile' : 'saveFailed'));
    if (ev.type === 'import') await routeIncoming(ev.text);
    if (ev.type === 'route' && ['#/calm', '#/journal', '#/feel'].includes(ev.hash) || /^#\/feel\/[1-5]$/.test(ev.hash)) nav(ev.hash);
  };
  initTransports();
  onNativeEvent(handle);
  await handle(native.takePending());

  // The journal re-locks when the app goes to the background for a while.
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = Date.now(); else if (hiddenAt && Date.now() - hiddenAt > 60_000) { lockAll(); if (location.hash === '#/journal') route(); } });
  window.addEventListener('hashchange', route);
  // the top bar (who is using the app) follows the people and what they need
  const peopleKey = () => JSON.stringify([S.get().settings.simpleMode, S.get().settings.activeProfile, S.profiles().map((p) => [p.id, p.name, p.avatar, p.view])]);
  let pk = peopleKey(); drawTopbar(nav); S.subscribe(() => { const k = peopleKey(); if (k !== pk) { pk = k; drawTopbar(nav); drawNav(document.body.dataset.view); } });
  if (S.profiles().some((p) => p.avatar?.k === 'kit')) loadAvatarPack();   // the avatar parts, so the first screen already shows the avatar
  await route();
  maybeAskWho(nav);
  document.getElementById('boot')?.remove();
  if (!S.get().settings.profileDone) openWelcome(); else maybeShowWhatsNew(version, nav);

  if ('serviceWorker' in navigator && !native.available && location.protocol.startsWith('http')) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const apply = () => { try { sessionStorage.setItem('mo.updated', '1'); } catch { /* blocked */ } location.reload(); };
      const gate = () => canAutoUpdate({ view: document.body.dataset.view || '', dialogOpen: !!document.querySelector('dialog[open]'), typing: /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') && document.activeElement?.type !== 'checkbox' && document.activeElement?.type !== 'radio' && document.activeElement?.type !== 'range' });
      const up = createUpdater({ check: () => reg.update(), gate, apply, announce: () => toast(t('updateReady'), { label: t('reload'), fn: apply }) });
      // a new version was downloaded and took over (skipWaiting): switch to it when it is safe
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) up.updateReady(); });
      reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', function () { if (this.state === 'installed' && navigator.serviceWorker.controller) up.updateReady(); }));
      // look for a new version when the app comes back, and every hour while it stays open; retry the switch while an update waits
      document.addEventListener('visibilitychange', () => { if (!document.hidden) { up.checkNow(); up.tick(); } });
      setInterval(() => up.checkNow(), 60 * 60 * 1000); setInterval(() => up.tick(), 15 * 1000);
      up.checkNow();
    }).catch(() => {});
    try { if (sessionStorage.getItem('mo.updated')) { sessionStorage.removeItem('mo.updated'); setTimeout(() => toast(t('updatedNow', { v: getVersion() || '' })), 1200); } } catch { /* blocked */ }
  }
}
boot();

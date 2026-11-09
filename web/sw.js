// Offline-first service worker. VERSION is kept equal to version.json by scripts/bump-version.mjs (a unit test enforces it).
const VERSION = '1.34.0';
const CACHE = `morning-organizer-${VERSION}`;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'version.json', 'icon.svg', 'css/app.css', 'css/report.css',
  'js/app.js', 'js/theme-boot.js', 'js/config.js', 'js/util.js', 'js/i18n.js', 'js/db.js', 'js/store.js', 'js/engine.js', 'js/stats.js', 'js/share.js',
  'js/alarms.js', 'js/leave.js', 'js/journal.js', 'js/recorder.js', 'js/dictation.js', 'js/wellbeing.js', 'js/strings117.js', 'js/needs.js', 'js/skins.js', 'js/calmKit.js', 'js/nowPick.js', 'js/shorten.js', 'js/feelings.js', 'js/ui/feel.js', 'js/ui/voiceNote.js', 'js/mascot.js', 'js/ui/mascot.js', 'js/ui/calmScene.js', 'js/voicepack.js', 'js/strings119.js', 'js/strings120.js', 'js/strings121.js', 'js/strings122.js', 'js/strings123.js', 'js/visualKit.js', 'js/ui/visualKit.js', 'data/visual-kit.json', 'data/calm-kit.json', 'data/mascot.json', 'js/avatarKit.js', 'js/ui/avatarKit.js', 'js/ui/avatarStudio.js', 'js/ui/avatarLibrary.js', 'js/ui/avatarShare.js', 'data/avatar-pack.json', 'js/nlpTools.js', 'js/ui/nlp.js', 'js/specialTasks.js', 'js/routineIO.js', 'js/points.js', 'js/ui/podium.js', 'js/ui/routineIO.js', 'js/voiceCommands.js', 'js/ui/voiceControl.js', 'js/aprt.js', 'js/calmGuides.js', 'js/ui/aprt.js', 'js/holidays.js', 'js/rejections.js', 'js/alarmPause.js', 'js/searchIndex.js', 'js/guided.js', 'js/suggestions.js', 'js/ui/search.js', 'js/ui/people.js', 'js/ui/runAdmin.js', 'js/update.js', 'js/appShare.js', 'js/ui/shareApp.js', 'js/ui/pause.js', 'js/ui/actions.js', 'js/ui/wizard.js', 'js/ui/suggest.js', 'js/wake.js', 'js/library.js', 'js/difficulty.js', 'js/thoughts.js', 'js/report.js', 'js/retro.js', 'js/ui/retro.js', 'js/awareness.js', 'js/smart.js', 'js/ui/smart.js', 'js/reportHtml.js', 'js/pdf.js', 'js/ui/report.js', 'js/ui/taskHelp.js', 'js/ui/alarms.js', 'js/changelog.js', 'js/ui/whatsnew.js', 'js/cogfun.js', 'js/ui/goals.js', 'js/ui/library.js', 'js/unplanned.js', 'js/ui/offer.js', 'js/ui/unplanned.js', 'js/ui/alarmEditor.js', 'js/ui/timePicker.js', 'js/playful.js', 'js/widgetData.js', 'js/ui/calm.js', 'js/ui/journal.js', 'js/ui/capture.js', 'js/ui/focus.js', 'js/ui/menu.js', 'js/focus.js', 'js/calm.js', 'js/sprints.js', 'js/mood.js', 'js/menu.js', 'js/lock.js', 'js/qr.js', 'js/badges.js', 'js/schedule.js', 'js/avatar.js', 'js/levels.js', 'js/profiles.js', 'js/weekly.js', 'js/link.js', 'js/rewards.js', 'js/rtc.js', 'js/family.js', 'js/transports.js', 'js/a11y.js', 'js/photo.js', 'js/feedback.js', 'js/coach.js', 'js/coachTips.js', 'js/speech.js', 'js/taskIcons.js', 'js/awake.js', 'js/audio.js', 'js/native.js', 'js/reminders.js', 'js/ui/common.js', 'js/ui/home.js', 'js/ui/editor.js', 'js/ui/runner.js',
  'js/ui/stats.js', 'js/ui/settings.js', 'js/ui/share.js', 'js/ui/guide.js', 'js/ui/fx.js', 'js/ui/qr.js', 'js/ui/avatar.js', 'js/ui/progressUi.js', 'js/ui/gate.js', 'js/ui/family.js', 'js/ui/incoming.js', 'js/ui/backup.js', 'js/ui/coach.js', 'js/ui/welcome.js', 'js/ui/progress.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // never touch cross-origin (e.g. the APK download)
  // version.json: network first so the app can notice updates; everything else: cache first, refresh in background.
  if (url.pathname.endsWith('/version.json')) {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); return r; }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); }
    return r;
  })).catch(() => caches.match('index.html')));
});

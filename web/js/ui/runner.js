import { h, fmtDur, fmtHuman, clamp } from '../util.js';
import { t, units, getLang } from '../i18n.js';
import * as S from '../store.js';
import * as E from '../engine.js';
import { stars } from '../stats.js';
import { choose, taskEvent } from '../feedback.js';
import { suggestIcon } from '../taskIcons.js';
import { setAwake } from '../awake.js';
import { signal, unlockAudio } from '../audio.js';
import { icon, confirmBox } from './common.js';
import { progressWidget } from './progress.js';
import { confetti, speak } from './fx.js';

const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const taskIcon = (tk) => tk.icon || suggestIcon(tk.name);

export async function renderRunner(root, id, nav) {
  let run = await S.loadActive();
  let fresh = false;
  if (!run || run.templateId !== id || !E.isActive(run)) {
    const tpl = S.getTemplate(id);
    if (!tpl || !tpl.tasks.length) { nav('#/'); return () => {}; }
    run = E.createRun(tpl, Date.now()); fresh = true;
  }
  const st = () => S.get().settings;
  unlockAudio();
  const persist = () => S.saveActive(E.isActive(run) ? run : null);
  persist();
  setAwake('run', st().keepAwake);
  const onVis = () => { if (document.visibilityState === 'visible') loop(); else persist(); };
  document.addEventListener('visibilitychange', onVis);

  // ── encouragement bubble ──
  const lastPick = {};
  const bubble = h('div', { class: 'bubble', role: 'status', 'aria-live': 'polite', hidden: true });
  let bubbleTimer;
  function say(event) {
    if (!st().feedback) return;
    const c = choose(event, { name: st().personName, lang: getLang(), last: lastPick[event] ?? -1 });
    if (!c) return; lastPick[event] = c.index;
    bubble.replaceChildren(h('span', { class: 'bm' }, st().mascot), h('span', { class: 'bt' }, `${c.text} ${c.emoji}`));
    bubble.hidden = false; bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 4200);
    if (st().speak) speak(c.text, getLang());
  }

  const pw = progressWidget(run, { mascot: st().mascot });
  const ring = h('div', { class: 'ring', role: 'timer' });
  const ti = h('div', { class: 'ti', 'aria-hidden': 'true' });
  const time = h('div', { class: 'big-time' }), sub = h('div', { class: 'sub' });
  const pausedBadge = h('div', { class: 'paused-badge', hidden: true }, `⏸ ${t('pausedBig')}`);
  const taskName = h('h2', { class: 'now' }), head = h('div', { class: 'run-meta' });
  const list = h('ul', { class: 'checklist' }), controls = h('div', { class: 'run-controls' }), pace = h('p', { class: 'pace' });
  ring.append(ti, time, sub);

  const act = (fn) => { run = fn(run, Date.now()); afterChange(); };
  const doComplete = () => {
    const cur = run.tasks[run.current], now = Date.now();
    const ev = taskEvent(E.elapsedMs(run, run.current, now) / 1000, cur.plannedSec + cur.extraSec);
    run = E.completeCurrent(run, now);
    if (E.isActive(run)) say(ev);
    afterChange();
  };
  const togglePause = () => {
    const was = run.status;
    run = was === 'paused' ? E.resume(run, Date.now()) : E.pause(run, Date.now());
    say(was === 'paused' ? 'resumed' : 'paused'); persist(); paintStatic(); paintLive();
  };

  function paintStatic() {
    const cur = run.tasks[run.current], paused = run.status === 'paused';
    taskName.textContent = cur?.name || ''; ti.textContent = cur ? taskIcon(cur) : '';
    ring.classList.toggle('paused', paused); pausedBadge.hidden = !paused;
    list.replaceChildren(...run.tasks.map((tk, i) => h('li', { class: `${i === run.current && E.isActive(run) ? 'cur' : ''} ${tk.done ? 'done' : ''} ${tk.skipped ? 'skip' : ''}` },
      h('label', {}, h('input', { type: 'checkbox', checked: tk.done, onchange: () => { if (i === run.current) doComplete(); else { run = E.toggleTask(run, i, Date.now()); afterChange(); } } }),
        h('span', { class: 'cb' }, icon('check', 16)), h('span', { class: 'ti-s', 'aria-hidden': 'true' }, taskIcon(tk)), h('span', { class: 'nm' }, tk.name || '—'),
        h('span', { class: 'du' }, tk.done || tk.skipped ? fmtDur(tk.actualSec || 0) : fmtDur(tk.plannedSec))))));
    controls.replaceChildren(
      h('div', { class: 'main-btns' },
        h('button', { class: 'btn primary xl', type: 'button', onclick: doComplete }, icon('check', 22), t('doneNext')),
        h('button', { class: `btn xl pause-btn ${paused ? 'resume' : ''}`, type: 'button', 'aria-pressed': String(paused), onclick: togglePause }, icon(paused ? 'play' : 'pause', 22), paused ? t('resume') : t('pause'))),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn', type: 'button', onclick: () => { E.addTime(run, 60); persist(); paintLive(); } }, icon('plus', 18), t('addMinute')),
        h('button', { class: 'btn', type: 'button', onclick: () => act(E.skipCurrent) }, icon('skip', 18), t('skip')),
        h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (await confirmBox(t('stopConfirm'), t('stop'), true)) act(E.finish); } }, icon('stop', 18), t('stop'))));
  }

  function paintLive() {
    if (!E.isActive(run)) return;
    const now = Date.now(), cur = run.tasks[run.current], left = E.remainingSec(run, now), total = cur.plannedSec + cur.extraSec, over = left < 0;
    time.textContent = fmtDur(Math.ceil(over ? -left : left));
    sub.textContent = run.status === 'paused' ? t('paused') : over ? t('over') : t('left');
    ring.style.setProperty('--p', String(clamp(1 - left / total, 0, 1)));
    const w = st().warnSec;
    ring.classList.toggle('over', over); ring.classList.toggle('warn', !over && w > 0 && left <= w && run.status === 'running');
    const planUpTo = run.tasks.slice(0, run.current).reduce((s, x) => s + x.plannedSec, 0) + (total - left);
    const doneSoFar = run.tasks.reduce((s, x, i) => s + (i === run.current ? E.elapsedMs(run, i, now) / 1000 : x.actualSec), 0);
    const diff = Math.round(doneSoFar - planUpTo);
    pace.textContent = Math.abs(diff) < 10 ? t('onPlan') : `${fmtHuman(Math.abs(diff), units())} ${diff > 0 ? t('behind') : t('ahead')}`;
    const planned = run.tasks.reduce((s, x) => s + x.plannedSec + x.extraSec, 0);
    head.replaceChildren(h('span', {}, `${t('startedAt')} ${clock(run.startedAt)}`), h('span', {}, `${t('plannedEnd')} ${clock(run.startedAt + planned * 1000)}`), h('span', {}, `${t('elapsed')} ${fmtDur((now - run.startedAt) / 1000)}`));
    pw.update(run, now);
  }

  let timer = null;
  function loop() {
    if (!E.isActive(run)) return;
    const s = st();
    for (const ev of E.tick(run, Date.now(), s.warnSec)) {
      signal(ev, s.mode, s.volume); say(ev === 'warn' ? 'warn' : 'over');
      if (ev === 'end' && s.autoAdvance) { doComplete(); return; }
      persist();
    }
    paintLive();
  }

  async function afterChange() {
    if (E.isActive(run)) { persist(); paintStatic(); paintLive(); return; }
    await S.saveActive(null); await S.saveRun(run); setAwake('run', false);
    renderSummary();
  }

  function renderSummary() {
    clearInterval(timer);
    const s = E.summarize(run), u = units(), n = stars(run);
    const dRow = (k, v, cls = '') => h('div', { class: `kv ${cls}` }, h('span', {}, k), h('strong', {}, v));
    const done = run.status === 'done';
    const starRow = h('div', { class: 'stars', role: 'img', 'aria-label': `${t('starsEarned')}: ${n}/3` }, [0, 1, 2].map((i) => h('span', { class: `star ${i < n ? 'on' : ''}`, style: { '--i': String(i) } }, '⭐')));
    root.replaceChildren(h('div', { class: 'summary' },
      h('div', { class: 'big-emoji bounce' }, done ? '🎉' : st().mascot), h('h1', {}, done ? t('allDone') : t('stopped')), starRow,
      h('p', { class: 'muted' }, run.templateName), bubble,
      h('div', { class: 'card kvs' },
        dRow(t('startedAt'), clock(run.startedAt)), dRow(t('wall'), fmtHuman(s.wallSec, u)),
        dRow(t('planned'), fmtHuman(s.plannedSec, u)), dRow(t('estimated'), fmtHuman(s.estSec, u)), dRow(t('actual'), fmtHuman(s.actualSec, u)),
        dRow(t('difference'), `${s.deltaSec > 0 ? '+' : ''}${fmtHuman(s.deltaSec, u)}`, s.deltaSec > 0 ? 'bad' : 'good'),
        s.pausedSec ? dRow(t('pausedTotal'), fmtHuman(s.pausedSec, u)) : null, dRow(t('tasksDone'), `${s.done}/${s.total}`), s.skipped ? dRow(t('tasksSkipped'), String(s.skipped)) : null),
      h('h2', {}, t('perTask')),
      h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, t('colTask')), h('th', {}, t('colPlanned')), h('th', {}, t('colActual')))),
        h('tbody', {}, run.tasks.map((x) => h('tr', { class: x.actualSec > x.plannedSec ? 'over' : '' }, h('td', {}, `${taskIcon(x)} ${x.name || '—'}${x.skipped ? ` (${t('skippedTag')})` : ''}`), h('td', {}, fmtDur(x.plannedSec)), h('td', {}, fmtDur(x.actualSec)))))),
      h('div', { class: 'toolbar' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => nav('#/') }, t('again')),
        h('button', { class: 'btn', type: 'button', onclick: () => nav(`#/stats/${run.templateId}`) }, icon('chart', 18), t('viewStats')))));
    if (done) confetti(root, 44);
    say(done ? 'runDone' : 'runStopped');
  }

  root.replaceChildren(h('div', { class: 'run' },
    h('div', { class: 'run-top', style: { '--accent': run.color || '#6c5ce7' } }, h('span', { class: 'emoji' }, run.icon), h('strong', {}, run.templateName)),
    bubble, pw.el, head, h('div', { class: 'ring-wrap' }, ring, pausedBadge), taskName, pace, controls, list));
  paintStatic(); paintLive();
  if (fresh) say('start');
  timer = setInterval(loop, 250);
  return () => { clearInterval(timer); clearTimeout(bubbleTimer); document.removeEventListener('visibilitychange', onVis); setAwake('run', false); if (E.isActive(run)) persist(); };
}

import { h, fmtDur, fmtHuman, clamp } from '../util.js';
import { t, units } from '../i18n.js';
import * as S from '../store.js';
import * as E from '../engine.js';
import { signal, unlockAudio } from '../audio.js';
import { native } from '../native.js';
import { icon, confirmBox, toast } from './common.js';

const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export async function renderRunner(root, id, nav) {
  let run = await S.loadActive();
  if (!run || run.templateId !== id || !E.isActive(run)) {
    const tpl = S.getTemplate(id);
    if (!tpl || !tpl.tasks.length) { nav('#/'); return () => {}; }
    run = E.createRun(tpl, Date.now());
  }
  unlockAudio();
  const persist = () => S.saveActive(E.isActive(run) ? run : null);
  persist();
  let wake = null;
  const setAwake = async (on) => {
    native.keepAwake(on);
    try { if (on && 'wakeLock' in navigator && !wake) wake = await navigator.wakeLock.request('screen'); else if (!on) { await wake?.release(); wake = null; } } catch { wake = null; }
  };
  if (S.get().settings.keepAwake) setAwake(true);
  const onVis = () => { if (document.visibilityState === 'visible') { if (S.get().settings.keepAwake && E.isActive(run)) setAwake(true); loop(); } else persist(); };
  document.addEventListener('visibilitychange', onVis);

  const ring = h('div', { class: 'ring', role: 'timer' });
  const time = h('div', { class: 'big-time', 'aria-live': 'off' });
  const sub = h('div', { class: 'sub' });
  const taskName = h('h2', { class: 'now' });
  const head = h('div', { class: 'run-meta' });
  const list = h('ul', { class: 'checklist' });
  const controls = h('div', { class: 'run-controls' });
  const pace = h('p', { class: 'pace', 'aria-live': 'polite' });
  ring.append(time, sub);

  function paintStatic() {
    const cur = run.tasks[run.current];
    taskName.textContent = cur?.name || '';
    list.replaceChildren(...run.tasks.map((tk, i) => h('li', { class: `${i === run.current && E.isActive(run) ? 'cur' : ''} ${tk.done ? 'done' : ''} ${tk.skipped ? 'skip' : ''}` },
      h('label', {}, h('input', { type: 'checkbox', checked: tk.done, onchange: () => { run = E.toggleTask(run, i, Date.now()); afterChange(); } }),
        h('span', { class: 'cb' }, icon('check', 16)), h('span', { class: 'nm' }, tk.name || '—'),
        h('span', { class: 'du' }, tk.done || tk.skipped ? fmtDur(tk.actualSec || 0) : fmtDur(tk.plannedSec))))));
    controls.replaceChildren(
      h('button', { class: 'btn primary xl', type: 'button', onclick: () => { run = E.completeCurrent(run, Date.now()); afterChange(); } }, icon('check', 22), t('doneNext')),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn', type: 'button', onclick: () => { run = run.status === 'paused' ? E.resume(run, Date.now()) : E.pause(run, Date.now()); persist(); paintStatic(); paintLive(); } },
          icon(run.status === 'paused' ? 'play' : 'pause', 18), run.status === 'paused' ? t('resume') : t('pause')),
        h('button', { class: 'btn', type: 'button', onclick: () => { E.addTime(run, 60); persist(); paintLive(); } }, icon('plus', 18), t('addMinute')),
        h('button', { class: 'btn', type: 'button', onclick: () => { run = E.skipCurrent(run, Date.now()); afterChange(); } }, icon('skip', 18), t('skip')),
        h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (await confirmBox(t('stopConfirm'), t('stop'), true)) { run = E.finish(run, Date.now()); afterChange(); } } }, icon('stop', 18), t('stop'))));
  }

  function paintLive() {
    if (!E.isActive(run)) return;
    const now = Date.now(), cur = run.tasks[run.current], left = E.remainingSec(run, now), total = cur.plannedSec + cur.extraSec;
    const over = left < 0;
    time.textContent = fmtDur(Math.ceil(over ? -left : left));
    sub.textContent = run.status === 'paused' ? t('paused') : over ? t('over') : t('left');
    ring.style.setProperty('--p', String(clamp(1 - left / total, 0, 1)));
    ring.classList.toggle('over', over); ring.classList.toggle('warn', !over && left <= S.get().settings.warnSec && S.get().settings.warnSec > 0);
    // overall pace: wall-clock work so far vs the plan up to this point
    const planUpTo = run.tasks.slice(0, run.current).reduce((s, x) => s + x.plannedSec, 0) + (total - left);
    const doneSoFar = run.tasks.reduce((s, x, i) => s + (i === run.current ? E.elapsedMs(run, i, now) / 1000 : x.actualSec), 0);
    const diff = Math.round(doneSoFar - planUpTo);
    pace.textContent = Math.abs(diff) < 10 ? t('onPlan') : `${fmtHuman(Math.abs(diff), units())} ${diff > 0 ? t('behind') : t('ahead')}`;
    const planned = run.tasks.reduce((s, x) => s + x.plannedSec + x.extraSec, 0);
    head.replaceChildren(
      h('span', {}, `${t('startedAt')} ${clock(run.startedAt)}`),
      h('span', {}, `${t('plannedEnd')} ${clock(run.startedAt + planned * 1000)}`),
      h('span', {}, `${t('elapsed')} ${fmtDur((now - run.startedAt) / 1000)}`));
  }

  let timer = null;
  function loop() {
    if (!E.isActive(run)) return;
    const { settings } = S.get();
    for (const ev of E.tick(run, Date.now(), settings.warnSec)) {
      signal(ev, settings.mode, settings.volume);
      if (ev === 'end' && settings.autoAdvance) { run = E.completeCurrent(run, Date.now()); afterChange(); return; }
      persist();
    }
    paintLive();
  }

  async function afterChange() {
    if (E.isActive(run)) { persist(); paintStatic(); paintLive(); return; }
    await S.saveActive(null); await S.saveRun(run); setAwake(false);
    renderSummary();
  }

  function renderSummary() {
    clearInterval(timer);
    const s = E.summarize(run), u = units();
    const dRow = (k, v, cls = '') => h('div', { class: `kv ${cls}` }, h('span', {}, k), h('strong', {}, v));
    root.replaceChildren(
      h('div', { class: 'summary' }, h('div', { class: 'big-emoji' }, run.status === 'done' ? '🎉' : '🏁'), h('h1', {}, run.status === 'done' ? t('allDone') : t('stopped')),
        h('p', { class: 'muted' }, run.templateName),
        h('div', { class: 'card kvs' },
          dRow(t('startedAt'), clock(run.startedAt)), dRow(t('wall'), fmtHuman(s.wallSec, u)),
          dRow(t('planned'), fmtHuman(s.plannedSec, u)), dRow(t('estimated'), fmtHuman(s.estSec, u)), dRow(t('actual'), fmtHuman(s.actualSec, u)),
          dRow(t('difference'), `${s.deltaSec > 0 ? '+' : ''}${fmtHuman(s.deltaSec, u)}`, s.deltaSec > 0 ? 'bad' : 'good'),
          dRow(t('tasksDone'), `${s.done}/${s.total}`), s.skipped ? dRow(t('tasksSkipped'), String(s.skipped)) : null),
        h('h2', {}, t('perTask')),
        h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, t('colTask')), h('th', {}, t('colPlanned')), h('th', {}, t('colActual')))),
          h('tbody', {}, run.tasks.map((x) => h('tr', { class: x.actualSec > x.plannedSec ? 'over' : '' }, h('td', {}, (x.name || '—') + (x.skipped ? ` (${t('skippedTag')})` : '')), h('td', {}, fmtDur(x.plannedSec)), h('td', {}, fmtDur(x.actualSec)))))),
        h('div', { class: 'toolbar' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => nav('#/') }, t('again')),
          h('button', { class: 'btn', type: 'button', onclick: () => nav(`#/stats/${run.templateId}`) }, icon('chart', 18), t('viewStats')))));
  }

  root.replaceChildren(
    h('div', { class: 'run' },
      h('div', { class: 'run-top', style: { '--accent': run.color || '#6c5ce7' } }, h('span', { class: 'emoji' }, run.icon), h('strong', {}, run.templateName)),
      head, ring, taskName, pace, controls, list));
  paintStatic(); paintLive();
  timer = setInterval(loop, 250);
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVis); setAwake(false); if (E.isActive(run)) persist(); };
}

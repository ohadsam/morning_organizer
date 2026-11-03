// The in-app progress widget: one segment per task (width ∝ planned time), the current one filling live, a buddy walking along the bar.
import { h, clamp, fmtDur } from '../util.js';
import { t } from '../i18n.js';
import { elapsedMs, remainingSec, isActive } from '../engine.js';

/** Overall completion 0..1, weighted by planned time. */
export function overallProgress(run, now) {
  const total = run.tasks.reduce((s, x) => s + x.plannedSec + x.extraSec, 0) || 1;
  const got = run.tasks.reduce((s, x, i) => {
    const plan = x.plannedSec + x.extraSec;
    if (x.done || x.skipped) return s + plan;
    if (i === run.current && isActive(run)) return s + Math.min(plan, elapsedMs(run, i, now) / 1000);
    return s;
  }, 0);
  return clamp(got / total, 0, 1);
}

/** Wall-clock time the routine should end if the rest goes exactly to plan. */
export function etaMs(run, now) {
  let rest = 0;
  run.tasks.forEach((x, i) => {
    if (x.done || x.skipped) return;
    rest += i === run.current ? Math.max(0, remainingSec(run, now)) : x.plannedSec;
  });
  return now + rest * 1000;
}

export function progressWidget(run, { mascot = '🦊', compact = false } = {}) {
  const segs = run.tasks.map((x) => h('span', { class: 'seg', style: { 'flex-grow': String(Math.max(1, x.plannedSec)) }, title: x.name }, h('i', { class: 'fill' })));
  const buddy = h('span', { class: 'buddy', 'aria-hidden': 'true' }, mascot);
  const pct = h('strong', { class: 'pw-pct' }), count = h('span', {}), eta = h('span', {}), paused = h('span', { class: 'pw-paused' });
  const track = h('div', { class: 'pw-track', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': t('progress') }, h('div', { class: 'segs' }, segs), buddy);
  const el = h('section', { class: `pw ${compact ? 'compact' : ''}` },
    h('div', { class: 'pw-head' }, h('span', {}, t('progress')), pct), track, compact ? null : h('div', { class: 'pw-foot' }, count, eta, paused));
  function update(r, now = Date.now()) {
    const p = overallProgress(r, now);
    r.tasks.forEach((x, i) => {
      const seg = segs[i], plan = x.plannedSec + x.extraSec;
      const state = x.done ? 'done' : x.skipped ? 'skip' : (i === r.current && isActive(r)) ? 'cur' : 'todo';
      const over = state === 'cur' && remainingSec(r, now) < 0;
      seg.className = `seg ${state}${over ? ' over' : ''}`;
      seg.firstChild.style.setProperty('width', `${state === 'done' || state === 'skip' ? 100 : state === 'cur' ? clamp((elapsedMs(r, i, now) / 1000 / plan) * 100, 0, 100) : 0}%`);
    });
    const percent = Math.round(p * 100);
    pct.textContent = `${percent}%`;
    track.setAttribute('aria-valuenow', String(percent));
    buddy.style.setProperty('--p', String(p));
    buddy.classList.toggle('still', r.status === 'paused');
    if (!compact) {
      count.textContent = t('tasksProgress', { done: r.tasks.filter((x) => x.done || x.skipped).length, total: r.tasks.length });
      eta.textContent = isActive(r) ? t('eta', { time: new Date(etaMs(r, now)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }) : '';
      paused.textContent = r.pausedMs || r.status === 'paused' ? `⏸ ${fmtDur(((r.pausedMs || 0) + (r.pausedAt ? now - r.pausedAt : 0)) / 1000)}` : '';
    }
  }
  update(run);
  return { el, update };
}

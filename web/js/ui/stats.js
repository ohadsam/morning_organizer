import { h, fmtDur, fmtHuman } from '../util.js';
import { t, units, getLang } from '../i18n.js';
import * as S from '../store.js';
import * as ST from '../stats.js';
import { iconBtn, confirmBox, toast } from './common.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); e.append(...kids); return e; };

/** Hand-rolled SVG line chart: actual (solid), planned (dashed), estimate (dotted). Minutes on Y. Text alternative = the table below. */
export function lineChart(points) {
  const W = 640, H = 260, m = { l: 44, r: 14, t: 16, b: 34 };
  const peak = Math.max(...points.flatMap((p) => [p.actual, p.planned, p.est]));
  const div = peak < 300 ? 1 : 60, unit = div === 1 ? t('u_s') : t('u_m'); // short routines read better in seconds
  const max = Math.max(1, Math.ceil((peak / div) * 1.1)), min = 0;
  const x = (i) => m.l + (points.length === 1 ? (W - m.l - m.r) / 2 : (i * (W - m.l - m.r)) / (points.length - 1));
  const y = (v) => H - m.b - ((v / div - min) / (max - min)) * (H - m.t - m.b);
  const line = (key, cls) => svg('polyline', { class: `ln ${cls}`, points: points.map((p, i) => `${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' '), fill: 'none' });
  const g = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': t('chartTitle'), preserveAspectRatio: 'xMidYMid meet' });
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (max * i) / ticks, yy = y(v * div);
    g.append(svg('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: yy, y2: yy }), svg('text', { class: 'tick', x: m.l - 6, y: yy + 4, 'text-anchor': 'end' }, `${Math.round(v)}${i === ticks ? ' ' + unit : ''}`));
  }
  const fmt = new Intl.DateTimeFormat(getLang(), { day: 'numeric', month: 'short' });
  const step = Math.ceil(points.length / 6);
  points.forEach((p, i) => { if (i % step === 0 || i === points.length - 1) g.append(svg('text', { class: 'tick', x: x(i), y: H - 10, 'text-anchor': 'middle' }, fmt.format(p.t))); });
  g.append(line('planned', 'planned'), line('est', 'est'), line('actual', 'actual'));
  points.forEach((p, i) => g.append(svg('circle', { class: 'dot', cx: x(i), cy: y(p.actual), r: 4 }, svg('title', {}, `${fmt.format(p.t)}: ${fmtDur(p.actual)}`))));
  return g;
}

function insightText(i) {
  const u = units(), f = (s) => fmtHuman(s, u);
  switch (i.type) {
    case 'needMore': return t('in_needMore', { n: i.need });
    case 'shorten': case 'extend': return t(`in_${i.type}`, { name: i.name, typical: f(i.typical), from: f(i.from), to: f(i.to) });
    case 'balance': return t('in_balance', { delta: `${i.netSec > 0 ? '+' : ''}${f(i.netSec)}` });
    case 'faster': case 'slower': return t(`in_${i.type}`, { delta: f(i.deltaSec) });
    case 'biggestOverrun': return t('in_biggestOverrun', { name: i.name, over: f(i.overSec) });
    default: return t(`in_${i.type}`);
  }
}

export function renderStats(root, templateId, nav) {
  const draw = () => {
    const { templates, runs } = S.get();
    if (!templateId) {
      const items = templates.map((x) => ({ x, n: ST.finished(runs, x.id).length }));
      root.replaceChildren(h('h1', {}, t('statsTitle')),
        items.some((i) => i.n) ? h('div', { class: 'stack' }, items.filter((i) => i.n).map(({ x, n }) =>
          h('a', { class: 'card link-card', href: `#/stats/${x.id}`, style: { '--accent': x.color } }, h('span', { class: 'emoji' }, x.icon), h('span', { class: 'routine-text' }, h('strong', {}, x.name), h('small', {}, t('runsCount', { n })))))) : h('p', { class: 'empty' }, t('noStats')));
      return;
    }
    const tpl = S.getTemplate(templateId);
    const rs = ST.finished(runs, templateId);
    if (!tpl) { nav('#/stats'); return; }
    const u = units(), tot = ST.totals(rs);
    const ins = ST.insights(rs);
    root.replaceChildren(
      h('div', { class: 'page-head' }, iconBtn('back', t('back'), () => nav('#/stats')), h('h1', {}, `${tpl.icon} ${tpl.name}`)),
      !rs.length ? h('p', { class: 'empty' }, t('noStats')) : h('div', {}, [
        h('div', { class: 'tiles' },
          tile(t('runsCount', { n: tot.count }), `${tot.onTime}/${tot.count}`, t('onTimeRuns')), tile(t('avgTime'), fmtHuman(tot.avgActual, u)), tile(t('bestTime'), fmtHuman(tot.best, u))),
        h('h2', {}, t('chartTitle')),
        rs.length >= 2 ? h('div', { class: 'card' }, lineChart(ST.series(rs)),
          h('div', { class: 'legend' }, h('span', { class: 'k actual' }, t('legendActual')), h('span', { class: 'k planned' }, t('legendPlanned')), h('span', { class: 'k est' }, t('legendEstimate')))) : h('p', { class: 'note' }, t('chartEmpty')),
        h('h2', {}, t('insights')),
        h('ul', { class: 'insights' }, ins.map((i) => h('li', {}, h('span', {}, insightText(i)),
          (i.type === 'shorten' || i.type === 'extend') ? h('button', { class: 'btn small', type: 'button', onclick: async (e) => {
            const cur = S.getTemplate(templateId); await S.saveTemplate({ ...cur, tasks: cur.tasks.map((k) => (k.id === i.taskId ? { ...k, sec: i.to } : k)) });
            e.currentTarget.textContent = t('applied'); e.currentTarget.disabled = true;
          } }, t('apply')) : null))),
        h('h2', {}, t('taskTrend')),
        h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, t('colTask')), h('th', {}, t('colPlanned')), h('th', {}, t('colActual')))),
          h('tbody', {}, ST.taskStats(rs).map((s) => h('tr', { class: s.medActual > s.plannedNow ? 'over' : '' }, h('td', {}, s.name || '—'), h('td', {}, fmtDur(s.plannedNow)), h('td', {}, fmtDur(s.avgActual)))))),
        h('h2', {}, t('history')),
        h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, t('colPlanned')), h('th', {}, t('colActual')))),
          h('tbody', {}, [...rs].reverse().slice(0, 30).map((r) => h('tr', { class: r.actualTotal > r.plannedTotal ? 'over' : '' },
            h('td', {}, new Date(r.startedAt).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short' })), h('td', {}, fmtDur(r.plannedTotal)), h('td', {}, fmtDur(r.actualTotal)))))),
        h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (await confirmBox(t('clearHistoryConfirm'), t('clearHistory'), true)) { await S.clearRuns(templateId); toast(t('deleted')); } } }, t('clearHistory'))]));
  };
  draw();
  return S.subscribe(draw);
}
const tile = (label, value, sub) => h('div', { class: 'tile' }, h('small', {}, label), h('strong', {}, value), sub ? h('small', {}, sub) : null);

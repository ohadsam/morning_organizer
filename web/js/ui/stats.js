import { h, fmtDur, fmtHuman, setChildren } from '../util.js';
import { t, units, getLang } from '../i18n.js';
import * as S from '../store.js';
import * as ST from '../stats.js';
import { iconBtn, confirmBox, toast } from './common.js';
import { weeklyReport, heatmap, toCsv } from '../weekly.js';
import { native } from '../native.js';
import { achievementsCard } from './progressUi.js';
import { moodStats, MOODS } from '../mood.js';
import { unplannedCard, patternCards } from './unplanned.js';
import { taskDifficulty, difficultyTrends, hardSpots, hardAndSlow, summary as diffSummary, levelEmoji } from '../difficulty.js';
import { exportCard } from './report.js';
import { emptyState } from './visualKit.js';
import { series as scoreSeries, totalPoints, awardCounts, AWARD_EMOJI } from '../points.js';
import { estimateAccuracy } from '../awareness.js';
import { overview as retroOverview } from '../retro.js';
import { verdictChip } from './retro.js';

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

/** How the person felt after routines, and what that says about time. Only shown once a few faces were picked. */
function moodCard(runs) {
  const m = moodStats(runs); if (m.n < 2) return null;
  return h('section', { class: 'card mood-card' }, h('h2', {}, `🙂 ${t('moodStatsTitle')}`),
    h('div', { class: 'tiles' }, MOODS.map((x) => h('div', { class: 'tile' }, h('small', {}, x.emoji), h('strong', {}, String(m.byMood[x.v]?.n || 0))))),
    m.insight ? h('p', { class: 'chip solid' }, t(m.insight.type === 'happyFaster' ? 'moodHappyFaster' : 'moodHappySlower', { pct: m.insight.pct })) : h('p', { class: 'note' }, t('moodNeedMore')));
}

/** Where is it hard? Average difficulty per task, the hard-and-slow ones, and what helped (notes, kind thoughts, relaxation). */
/** Small lines showing whether a task is getting easier or harder over the runs. */
function trendsBlock(runs, templateId) {
  const tr = difficultyTrends(runs, templateId).slice(0, 5); if (!tr.length) return null;
  const spark = (pts) => { const w = 84, ht = 26, step = pts.length > 1 ? w / (pts.length - 1) : 0, y = (v) => ht - 3 - ((v - 1) / 4) * (ht - 6), d = pts.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${ht}`); s.setAttribute('width', w); s.setAttribute('height', ht); s.setAttribute('aria-hidden', 'true'); s.classList.add('spark');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); s.append(p); return s; };
  return h('div', { class: 'stack' }, h('h3', {}, `📉 ${t('trendTitle')}`), h('ul', { class: 'trend-list' }, tr.map((x) => h('li', {}, h('span', { class: 'tr-n' }, `${x.icon || ''} ${x.name}`), spark(x.points), h('span', { class: `chip solid tr-${x.trend}` }, t(`trend_${x.trend}`))))));
}

function difficultyCard(runs, templateId = null) {
  const stats = taskDifficulty(runs, templateId), sum = diffSummary(templateId ? runs.filter((r) => r.templateId === templateId) : runs); if (!stats.length) return null;
  const spots = hardSpots(stats), slow = new Set(hardAndSlow(stats).map((x) => x.name)), colors = ['#55efc4', '#a3e635', '#fdcb6e', '#fab1a0', '#e17055'];
  return h('section', { class: 'card stack' }, h('h2', {}, `🧗 ${t('rpWhereHard')}`), h('p', { class: 'note' }, t('rpDifficultyIntro', { n: sum.rated, avg: Math.round(sum.avg * 10) / 10, hard: `${Math.round(sum.hardShare * 100)}%` })),
    h('div', { class: 'diff-bars' }, stats.slice(0, 8).map((x) => h('div', { class: 'diff-bar' }, h('span', {}, `${x.icon || ''} ${x.name}`), h('div', { class: 'bar', role: 'img', 'aria-label': `${x.name}: ${Math.round(x.avg * 10) / 10}/5` }, h('i', { style: { width: `${(x.avg / 5) * 100}%`, background: colors[Math.max(0, Math.min(4, Math.round(x.avg) - 1))] } })), h('small', {}, `${levelEmoji(Math.round(x.avg))} ${Math.round(x.avg * 10) / 10} · ${x.rated}×`)))),
    trendsBlock(runs, templateId),
    spots.length ? h('ul', { class: 'unp-list' }, spots.map((x) => h('li', {}, t(slow.has(x.name) ? 'rpHardSlowTip' : 'rpHardTip', { name: x.name, avg: Math.round(x.avg * 10) / 10 })))) : h('p', { class: 'note' }, t('rpNoHard')),
    h('p', { class: 'chips' }, h('span', { class: 'chip solid' }, `✍️ ${t('rpHelpNotes', { n: sum.help.note })}`), h('span', { class: 'chip solid' }, `💭 ${t('rpHelpThoughts', { n: sum.help.thought })}`), h('span', { class: 'chip solid' }, `🧘 ${t('rpHelpRelax', { n: sum.help.relax })}`)));
}

/** "How close are my guesses?" - self-awareness: the typed time estimates against what really happened. */
function awarenessCard(runs, templateId = null) {
  const a = estimateAccuracy(runs, templateId); if (a.n < 3) return null;
  return h('section', { class: 'card stack' }, h('h2', {}, `🎯 ${t('awTitle')}`), h('div', { class: 'tiles' }, h('div', { class: 'tile' }, h('small', {}, t('awGuesses')), h('strong', {}, String(a.n))), h('div', { class: 'tile' }, h('small', {}, t('awAccuracy')), h('strong', {}, `${Math.round(a.avg * 100)}%`))),
    h('p', { class: 'note' }, t(`awBias_${a.bias}`)), a.trend ? h('p', { class: 'chip solid' }, t(a.trend > 0 ? 'awBetter' : 'awWorse', { n: Math.abs(a.trend) })) : null, h('p', { class: 'note' }, t('awTip')));
}

/** Looking back: how many, did the changes help (Stats front page). */
function retroCard(runs) {
  const rs = S.retros(), o = retroOverview(rs, runs);
  return h('a', { class: 'card retro-link', style: { '--accent': '#6c5ce7' }, href: '#/retros' }, h('span', { class: 'emoji' }, '🔄'), h('span', { class: 'routine-text' }, h('strong', {}, t('rcvTitle')),
    h('small', {}, o.total ? t('rcvCardLine', { n: o.total, helped: o.improved, applied: o.applied }) : t('rcvCardEmpty'))));
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
    const templates = S.myTemplates(), runs = S.myRuns();
    if (!templateId) {
      const items = templates.map((x) => ({ x, n: ST.finished(runs, x.id).length }));
      const hasRuns = items.some((i) => i.n);
      setChildren(root, h('h1', {}, t('statsTitle')), hasRuns ? null : emptyState('empty-history', t('noStats')), hasRuns ? overview(runs) : null, hasRuns ? pointsCard(runs) : null, hasRuns ? achievementsCard(runs) : null, hasRuns ? moodCard(runs) : null, hasRuns ? unplannedCard(runs) : null, hasRuns ? retroCard(runs) : null, hasRuns ? awarenessCard(runs) : null, hasRuns ? difficultyCard(runs) : null, hasRuns ? exportCard(nav) : null,
        hasRuns ? h('div', { class: 'stack' }, items.filter((i) => i.n).map(({ x, n }) =>
          h('a', { class: 'card link-card', href: `#/stats/${x.id}`, style: { '--accent': x.color } }, h('span', { class: 'emoji' }, x.icon), h('span', { class: 'routine-text' }, h('strong', {}, x.name), h('small', {}, t('runsCount', { n })))))) : h('p', { class: 'empty' }, t('noStats')));
      return;
    }
    const tpl = S.getTemplate(templateId);
    const rs = ST.finished(runs, templateId);
    if (!tpl) { nav('#/stats'); return; }
    const u = units(), tot = ST.totals(rs);
    const ins = ST.insights(rs);
    setChildren(root, 
      h('div', { class: 'page-head' }, iconBtn('back', t('back'), () => nav('#/stats')), h('h1', {}, `${tpl.icon} ${tpl.name}`)),
      !rs.length ? emptyState('empty-history', t('noStats')) : h('div', {}, [
        h('div', { class: 'tiles' },
          tile(t('runsCount', { n: tot.count }), `${tot.onTime}/${tot.count}`, t('onTimeRuns')), tile(t('avgTime'), fmtHuman(tot.avgActual, u)), tile(t('bestTime'), fmtHuman(tot.best, u))),
        h('h2', {}, t('chartTitle')),
        rs.length >= 2 ? h('div', { class: 'card' }, lineChart(ST.series(rs)),
          h('div', { class: 'legend' }, h('span', { class: 'k actual' }, t('legendActual')), h('span', { class: 'k planned' }, t('legendPlanned')), h('span', { class: 'k est' }, t('legendEstimate')))) : h('p', { class: 'note' }, t('chartEmpty')),
        patternCards(tpl, nav, draw), unplannedCard(rs), awarenessCard(runs, templateId), difficultyCard(runs, templateId),
        h('div', { class: 'toolbar wrap' }, S.shows('retros') && rs.length ? h('button', { class: 'btn primary', type: 'button', onclick: () => nav(`#/retro/${encodeURIComponent(rs.at(-1).id)}`) }, `🔄 ${t('rcStatsGo')}`) : null, h('button', { class: 'btn', type: 'button', onclick: () => nav(`#/report/period/30-${templateId}`) }, `📄 ${t('rpRoutineReport')}`)),
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
        h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, t('colDate')), h('th', {}, t('colPlanned')), h('th', {}, t('colActual')), h('th', {}, h('span', { class: 'sr-only' }, t('rpTitle'))))),
          h('tbody', {}, [...rs].reverse().slice(0, 30).map((r) => h('tr', { class: r.actualTotal > r.plannedTotal ? 'over' : '' },
            h('td', {}, new Date(r.startedAt).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short' })), h('td', {}, fmtDur(r.plannedTotal)), h('td', {}, fmtDur(r.actualTotal)), h('td', {}, h('a', { href: `#/report/run/${r.id}`, 'aria-label': `${t('rpRunReport')} ${new Date(r.startedAt).toLocaleDateString(getLang())}` }, '📄'), ' ', h('a', { href: `#/retro/${r.id}`, 'aria-label': `${t('rcLookBack')} ${new Date(r.startedAt).toLocaleDateString(getLang())}` }, S.retrosForRun(r.id).length ? '✅' : '🔄')))))),
        h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (await confirmBox(t('clearHistoryConfirm'), t('clearHistory'), true)) { await S.clearRuns(templateId); toast(t('deleted')); } } }, t('clearHistory'))]));
  };
  draw();
  return S.subscribe(draw);
}
/** Points over time: a bar per routine run (last 30), the running total as a line, and the awards collected. Only shown once some runs have points. */
export function pointsCard(runs) {
  const all = scoreSeries(runs); if (!all.length) return null;
  const pts = all.slice(-30), cumulative = S.get().settings.scoreCumulative, W = 640, H = 240, m = { l: 44, r: 14, t: 16, b: 30 };
  const maxBar = Math.max(10, ...pts.map((p) => p.total)), maxLine = Math.max(1, pts.at(-1).cumulative - (all.length > pts.length ? all[all.length - pts.length - 1].cumulative : 0));
  const slot = (W - m.l - m.r) / pts.length, bw = Math.min(26, slot * 0.7), y = (v, mx) => H - m.b - (v / mx) * (H - m.t - m.b), x = (i) => m.l + slot * i + slot / 2;
  const fmt = new Intl.DateTimeFormat(getLang(), { day: 'numeric', month: 'short' });
  const base = pts.length ? (all.length > pts.length ? all[all.length - pts.length - 1].cumulative : 0) : 0;
  const g = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart pts-chart', role: 'img', 'aria-label': t('ptsChartLabel', { n: pts.length, total: totalPoints(runs) }), preserveAspectRatio: 'xMidYMid meet' });
  for (let i = 0; i <= 4; i++) { const v = (maxBar * i) / 4, yy = y(v, maxBar); g.append(svg('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: yy, y2: yy }), svg('text', { class: 'tick', x: m.l - 6, y: yy + 4, 'text-anchor': 'end' }, String(Math.round(v)))); }
  pts.forEach((p, i) => g.append(svg('rect', { class: 'bar-pts', x: x(i) - bw / 2, y: y(p.total, maxBar), width: bw, height: Math.max(1, H - m.b - y(p.total, maxBar)), rx: 3 }, svg('title', {}, `${fmt.format(p.at)}: ${p.total}`))));
  if (cumulative && pts.length > 1) g.append(svg('polyline', { class: 'ln cum', fill: 'none', points: pts.map((p, i) => `${x(i).toFixed(1)},${y(p.cumulative - base, maxLine).toFixed(1)}`).join(' ') }));
  const step = Math.ceil(pts.length / 6); pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) g.append(svg('text', { class: 'tick', x: x(i), y: H - 8, 'text-anchor': 'middle' }, fmt.format(p.at))); });
  const aw = awardCounts(runs), awEntries = Object.entries(aw);
  return h('section', { class: 'card', 'aria-label': t('ptsStatsTitle') },
    h('h2', {}, `⭐ ${t('ptsStatsTitle')}`),
    h('div', { class: 'tiles' }, tile(t('ptsTotal'), String(totalPoints(runs))), tile(t('ptsBest'), String(Math.max(...all.map((p) => p.total)))), tile(t('ptsAvg'), String(Math.round(all.reduce((s, p) => s + p.total, 0) / all.length)))),
    g, h('div', { class: 'legend' }, h('span', { class: 'k actual' }, t('ptsLegendRun')), cumulative ? h('span', { class: 'k planned' }, t('ptsLegendCum')) : null),
    awEntries.length ? h('p', { class: 'awards', 'aria-label': t('podAwards') }, awEntries.map(([a, n]) => h('span', { class: 'award', title: t(`award_${a}`) }, `${AWARD_EMOJI[a]} × ${n}  `))) : null,
    h('details', { class: 'fold' }, h('summary', {}, h('span', { class: 'fold-t' }, t('ptsTable'))),
      h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, t('colDate')), h('th', {}, t('colTask')), h('th', {}, t('ptsUnit')))),
        h('tbody', {}, [...pts].reverse().map((p) => h('tr', {}, h('td', {}, fmt.format(p.at)), h('td', {}, p.name || '—'), h('td', {}, String(p.total))))))));
}

/** This week + 5-week heat-map + CSV export. */
function overview(runs) {
  const now = Date.now(), w = weeklyReport(runs, now), u = units(), cells = heatmap(runs, now, 5), st = S.get().settings;
  const dayName = new Intl.DateTimeFormat(getLang(), { weekday: 'narrow' });
  const trend = w.deltaAvgSec === null || Math.abs(w.deltaAvgSec) < 15 ? null : (w.deltaAvgSec < 0 ? t('weekFaster', { t: fmtHuman(-w.deltaAvgSec, u) }) : t('weekSlower', { t: fmtHuman(w.deltaAvgSec, u) }));
  const shareText = () => t('weekShareText', { app: t('appName'), runs: w.runs, stars: w.stars, onTime: w.onTime, days: w.activeDays, streak: '' }) + (st.personName ? ` (${st.personName})` : '');
  const level = (c) => (c.future ? 'future' : c.count === 0 ? 'l0' : c.count === 1 ? 'l1' : c.count === 2 ? 'l2' : 'l3');
  const dateFmt = new Intl.DateTimeFormat(getLang(), { day: 'numeric', month: 'short' });
  return h('section', { class: 'card week' },
    h('h2', {}, t('weekTitle')),
    h('div', { class: 'tiles' }, tile(t('weekRuns', { n: w.runs }), `${w.runs}`), tile(t('stars'), `⭐ ${w.stars}`), tile(t('weekOnTime', { n: w.onTime }), `${w.onTime}/${w.done}`)),
    h('p', { class: 'note' }, `${t('weekDays', { n: w.activeDays })}${trend ? ` · ${trend}` : ''}`),
    h('div', { class: 'heat-days', 'aria-hidden': 'true' }, [0, 1, 2, 3, 4, 5, 6].map((d) => h('span', {}, dayName.format(new Date(2026, 10, 1 + d))))),
    h('div', { class: 'heat', role: 'img', 'aria-label': t('heatTitle') }, cells.map((c) => h('i', { class: level(c), title: t('heatCell', { date: dateFmt.format(c.ms), n: c.count }) }))),
    h('small', { class: 'hint' }, t('heatTitle')),
    h('div', { class: 'toolbar wrap' },
      h('button', { class: 'btn', type: 'button', onclick: async () => { const text = shareText(); if (native.available) native.share(t('appName'), text); else if (navigator.share) { try { await navigator.share({ title: t('appName'), text }); } catch { /* cancelled */ } } else { try { await navigator.clipboard.writeText(text); toast(t('shareCopied')); } catch { toast(text); } } } }, t('weekShare')),
      h('button', { class: 'btn', type: 'button', onclick: () => {
        const csv = toCsv(runs), name = `morning-organizer-history-${new Date().toISOString().slice(0, 10)}.csv`;
        if (native.available) { native.saveFile(name, csv); return; }
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); toast(t('csvSaved'));
      } }, t('exportCsv'))));
}
const tile = (label, value, sub) => h('div', { class: 'tile' }, h('small', {}, label), h('strong', {}, value), sub ? h('small', {}, sub) : null);

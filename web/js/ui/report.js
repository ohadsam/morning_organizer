// The report screen + export: a designed report for one run or a period, as a page you can read, print, save as a real PDF, share or e-mail.
import { h, setChildren, fmtHuman, fmtDur } from '../util.js';
import { t, units, getLang, isRtl } from '../i18n.js';
import * as S from '../store.js';
import { buildReport, reportText } from '../report.js';
import { levelEmoji } from '../difficulty.js';
import { MOODS } from '../mood.js';
import { native } from '../native.js';
import { elementToPdf } from '../pdf.js';
import { toast } from './common.js';
import { reasonName } from './unplanned.js';
import { APP_NAME_EN } from '../config.js';

const BRAND = '#6c5ce7', GOOD = '#00b894', WARN = '#e17055', MUTED = '#636e72';
const fmt = (s) => fmtHuman(Math.max(0, Math.round(s)), units());
const pct = (x) => `${Math.round(x * 100)}%`;
const dateStr = (ms) => new Date(ms).toLocaleDateString(getLang(), { day: 'numeric', month: 'short', year: 'numeric' });
const DIFF_COLORS = ['#55efc4', '#a3e635', '#fdcb6e', '#fab1a0', '#e17055'];

// Styling lives in css/report.css (the page's CSP forbids inline <style>); the PDF export fetches the same file and embeds it into the rendered image.
let cssText = '';
export async function reportCss() { if (!cssText) { try { cssText = await (await fetch('css/report.css')).text(); } catch { cssText = ''; } } return cssText; }

const sec = (title, ...kids) => h('section', { class: 'rpt-sec' }, title ? h('h2', {}, title) : null, ...kids);
const kpi = (v, label) => h('div', { class: 'rpt-kpi' }, h('b', {}, v), h('span', {}, label));
const bar = (label, frac, text, color = BRAND) => h('div', { class: 'rpt-bar' }, h('span', {}, label), h('div', { class: 'tr' }, h('div', { class: 'fl', style: { width: `${Math.max(2, Math.min(100, frac * 100))}%`, background: color } })), h('span', { class: 'tx' }, text));

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, a = {}, ...kids) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); e.append(...kids); return e; };
/** Actual vs planned minutes per run, over time (inline SVG, no CSS needed). */
function timeline(series) {
  const W = 640, Hh = 190, m = { l: 40, r: 12, t: 12, b: 26 }, peak = Math.max(60, ...series.flatMap((p) => [p.actual, p.planned])), max = Math.ceil(peak / 60);
  const x = (i) => m.l + (series.length === 1 ? (W - m.l - m.r) / 2 : (i * (W - m.l - m.r)) / (series.length - 1)), y = (v) => Hh - m.b - (v / 60 / max) * (Hh - m.t - m.b);
  const g = sv('svg', { viewBox: `0 0 ${W} ${Hh}`, width: '100%', role: 'img', 'aria-label': t('rpTimeChart') });
  for (let i = 0; i <= 4; i++) { const v = (max * i) / 4, yy = y(v * 60); g.append(sv('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, stroke: '#eceff1' }), sv('text', { x: m.l - 6, y: yy + 4, 'text-anchor': 'end', 'font-size': 10, fill: MUTED }, String(Math.round(v)))); }
  g.append(sv('text', { x: m.l, y: 10, 'font-size': 10, fill: MUTED }, t('u_m')));
  const line = (key, color, dash) => sv('polyline', { points: series.map((p, i) => `${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2.5, ...(dash ? { 'stroke-dasharray': '6 4' } : {}) });
  g.append(line('planned', '#b2bec3', true), line('actual', BRAND)); series.forEach((p, i) => g.append(sv('circle', { cx: x(i), cy: y(p.actual), r: 3.5, fill: p.actual <= p.planned ? GOOD : WARN })));
  const step = Math.ceil(series.length / 6); series.forEach((p, i) => { if (i % step === 0 || i === series.length - 1) g.append(sv('text', { x: x(i), y: Hh - 8, 'text-anchor': 'middle', 'font-size': 10, fill: MUTED }, new Date(p.t).toLocaleDateString(getLang(), { day: 'numeric', month: 'short' }))); });
  return g;
}
const heat = (cells) => h('div', { class: 'rpt-heat' }, cells.map((c) => h('i', { title: c.key, style: { background: c.future ? '#fafbfc' : c.count ? ['#c8f7e8', '#7fe3c3', '#2fcf9f', '#00b894'][Math.min(3, c.count - 1)] : '#eceff1' } })));

/** The whole report as one element (own <style> inside). */
export function reportElement(m, { lang = getLang() } = {}) {
  const root = h('div', { class: 'rpt', dir: isRtl() ? 'rtl' : 'ltr', lang });
  const who = [m.person, m.age ? t('rpAge', { n: m.age }) : ''].filter(Boolean).join(' · ');
  if (m.kind === 'run') {
    root.append(h('header', { class: 'rpt-head' }, h('h1', {}, `${m.icon} ${m.title}`), h('p', {}, `${t('rpRunReport')} · ${new Date(m.startedAt).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short' })}${who ? ` · ${who}` : ''}`)));
    if (m.empty) { root.append(sec('', h('p', {}, t('rpNoData')))); return root; }
    const k = m.kpis;
    root.append(sec(t('rpSummary'), h('div', { class: 'rpt-kpis' }, kpi(fmt(k.plannedSec), t('planned')), kpi(fmt(k.actualSec), t('actual')), kpi(`${k.deltaSec > 0 ? '+' : '−'}${fmt(Math.abs(k.deltaSec))}`, t('difference')), kpi(`${k.done}/${k.total}`, t('tasksDone')), kpi(`⭐ ${k.stars}`, t('stars')), kpi(m.mood ? MOODS[m.mood - 1].emoji : '—', t('rpMood')))));
    const peak = Math.max(1, ...m.tasks.flatMap((x) => [x.plannedSec, x.actualSec]));
    root.append(sec(t('rpPerTask'), h('table', { class: 'rpt-tbl' }, h('thead', {}, h('tr', {}, [t('colTask'), t('colPlanned'), t('colActual'), t('rpDifficulty'), t('rpHelp')].map((x) => h('th', {}, x)))),
      h('tbody', {}, m.tasks.map((x) => h('tr', {}, h('td', {}, `${x.icon || '•'} ${x.name}${x.skipped ? ` (${t('skippedTag')})` : ''}`), h('td', {}, fmtDur(x.plannedSec)), h('td', { class: x.actualSec > x.plannedSec ? 'over' : '' }, fmtDur(x.actualSec)), h('td', {}, x.difficulty ? `${levelEmoji(x.difficulty)} ${x.difficulty}/5` : '—'), h('td', {}, [x.help.note ? `✍️${x.help.note}` : '', x.help.thought ? `💭${x.help.thought}` : '', x.help.relax ? `🧘${x.help.relax}` : ''].filter(Boolean).join(' ') || '—'))))),
    h('div', { style: { height: '10px' } }), ...m.tasks.map((x) => h('div', { class: 'rpt-bar' }, h('span', {}, x.name), h('div', { class: 'rpt-gantt' }, h('div', { class: 'p', style: { width: `${(x.plannedSec / peak) * 100}%` } }), h('div', { class: 'a', style: { width: `${(x.actualSec / peak) * 100}%`, background: x.actualSec > x.plannedSec ? WARN : GOOD } })), h('span', { class: 'tx' }, `${fmtDur(x.actualSec)} / ${fmtDur(x.plannedSec)}`)))));
    if (m.unplanned.length) root.append(sec(`⚡ ${t('unpTitle')}`, h('ul', { class: 'rpt-ul' }, m.unplanned.map((u) => h('li', {}, `${u.emoji} ${reasonName(u)} · ${fmt(u.sec)}${u.task ? ` · ${u.task}` : ''}`)))));
  } else {
    root.append(h('header', { class: 'rpt-head' }, h('h1', {}, `${m.icon || '📊'} ${m.title || t('rpAllRoutines')}`), h('p', {}, `${t('rpPeriodReport')} · ${dateStr(m.from)} – ${dateStr(m.to)}${who ? ` · ${who}` : ''}`)));
    if (m.empty) { root.append(sec('', h('p', {}, t('rpNoData')))); return root; }
    const k = m.kpis;
    root.append(sec(t('rpSummary'), h('div', { class: 'rpt-kpis' }, kpi(String(k.runs), t('rpRuns')), kpi(`${k.onTime} (${pct(k.onTimeRate)})`, t('rpOnTime')), kpi(fmt(k.avgActualSec), t('avgTime')), kpi(`⭐ ${k.stars}`, t('stars')), kpi(k.avgDifficulty ? `${(Math.round(k.avgDifficulty * 10) / 10)}/5` : '—', t('rpAvgDifficulty')), kpi(k.unplannedCount ? `${k.unplannedCount}× · ${fmt(k.unplannedSec)}` : '0', t('rpUnplannedKpi')))));
    if (m.insights.length) root.append(sec(`💡 ${t('rpInsights')}`, h('ul', { class: 'rpt-ul' }, m.insights.map((i) => h('li', {}, t(i.key, { ...i.p, sec: i.p.sec != null ? fmt(i.p.sec) : '' }))))));
    if (m.series.length >= 2) root.append(sec(t('rpOverTime'), timeline(m.series), h('p', { class: 'rpt-note' }, `${t('legendActual')} ━ · ${t('legendPlanned')} ┅ · 🟢 ${t('rpOnTime')} · 🟠 ${t('over')}`)));
    root.append(sec(t('rpActivity'), heat(m.heat), h('p', { class: 'rpt-note' }, t('rpActivityNote'))));
    if (m.byRoutine.length) root.append(sec(t('rpByRoutine'), ...m.byRoutine.map((r) => bar(`${r.icon} ${r.name}`, r.onTimeRate, `${pct(r.onTimeRate)} · ${r.runs}×`, r.onTimeRate >= 0.7 ? GOOD : r.onTimeRate >= 0.4 ? '#fdcb6e' : WARN))));
    if (m.difficulty.rated) {
      root.append(sec(`🧗 ${t('rpWhereHard')}`, h('p', { class: 'rpt-note' }, t('rpDifficultyIntro', { n: m.difficulty.rated, avg: (Math.round(m.difficulty.avg * 10) / 10), hard: pct(m.difficulty.hardShare) })),
        ...m.hardTasks.map((x) => bar(`${x.icon || ''} ${x.name}`, x.avg / 5, `${levelEmoji(Math.round(x.avg))} ${(Math.round(x.avg * 10) / 10)} · ${x.rated}×`, DIFF_COLORS[Math.max(0, Math.min(4, Math.round(x.avg) - 1))])),
        h('p', { class: 'rpt-chips' }, h('span', {}, `✍️ ${t('rpHelpNotes', { n: m.difficulty.help.note })}`), h('span', {}, `💭 ${t('rpHelpThoughts', { n: m.difficulty.help.thought })}`), h('span', {}, `🧘 ${t('rpHelpRelax', { n: m.difficulty.help.relax })}`))));
    }
    if (m.tasks.length) root.append(sec(t('rpTaskTable'), h('table', { class: 'rpt-tbl' }, h('thead', {}, h('tr', {}, [t('colTask'), t('colPlanned'), t('colActual'), t('rpDifficulty')].map((x) => h('th', {}, x)))),
      h('tbody', {}, m.tasks.map((x) => h('tr', {}, h('td', {}, `${x.icon || '•'} ${x.name}`), h('td', {}, fmtDur(x.avgPlannedSec)), h('td', { class: x.avgActualSec > x.avgPlannedSec + 29 ? 'over' : '' }, fmtDur(x.avgActualSec)), h('td', {}, x.avgDifficulty ? `${levelEmoji(Math.round(x.avgDifficulty))} ${(Math.round(x.avgDifficulty * 10) / 10)}` : '—')))))));
    if (m.unplanned.count) root.append(sec(`⚡ ${t('unpStatsTitle')}`, ...m.unplanned.by.slice(0, 5).map((e) => bar(`${e.emoji} ${reasonName(e)}`, e.count / m.unplanned.by[0].count, `${e.count}× · ${fmt(e.sec)}`, WARN))));
    if (m.mood.n >= 2) root.append(sec(`🙂 ${t('moodStatsTitle')}`, h('p', { class: 'rpt-chips' }, MOODS.map((x) => h('span', {}, `${x.emoji} ${m.mood.byMood[x.v]?.n || 0}`)))));
    if (m.goals.length) root.append(sec(`🎯 ${t('goalsTitle')}`, h('ul', { class: 'rpt-ul' }, m.goals.map((g) => h('li', {}, `${g.done ? '🏆 ' : ''}${g.title}${g.runs ? ` · ${t('goalOnTime', { a: g.onTime, b: g.runs })}` : ''}${g.checks ? ` · ${t('goalChecks', { n: g.checks })}` : ''}`)))));
  }
  if (m.kind === 'run' && m.insights.length) root.append(sec(`💡 ${t('rpInsights')}`, h('ul', { class: 'rpt-ul' }, m.insights.map((i) => h('li', {}, t(i.key, { ...i.p, sec: i.p.sec != null ? fmt(i.p.sec) : '' }))))));
  root.append(h('section', { class: 'rpt-foot' }, `${APP_NAME_EN} · ${t('rpGenerated', { d: new Date(m.now ?? m.to).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short' }) })} · ${t('rpPrivacy')}`));
  return root;
}

const slug = (m) => `${(m.title || 'report').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 30)}-${new Date().toISOString().slice(0, 10)}`;
const b64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };

/** PDF actions. Native app: the system share sheet with the PDF attached (pick your e-mail app). Browser: download / Web Share with the file. */
async function makePdf(m) { return elementToPdf(reportElement(m), `${m.title || ''} ${t('rpTitle')}`, { css: await reportCss() }); }
async function download(blob, name) { const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
export async function savePdf(m) { toast(t('rpMaking')); const blob = await makePdf(m); await download(blob, `${slug(m)}.pdf`); toast(t('rpSaved')); return blob; }
export async function emailReport(m) {
  const text = reportText(m, t, fmt), subject = `${t('rpTitle')}: ${m.title || t('rpAllRoutines')}`;
  toast(t('rpMaking')); const blob = await makePdf(m), name = `${slug(m)}.pdf`;
  if (native.available) { native.sharePdf(name, b64(new Uint8Array(await blob.arrayBuffer())), subject, text); return; }
  const file = new File([blob], name, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: subject, text }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
  await download(blob, name);                                    // browsers cannot attach files to mailto: - the PDF is downloaded, the mail opens with the text
  location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${text}\n\n${t('rpAttachHint')}`.slice(0, 1800))}`;
}

export function renderReport(root, nav, kind, arg) {
  const profile = () => { const p = S.activeProfile(); return { name: p.name, age: p.age }; };
  let scope = kind === 'run' ? { kind: 'run', runId: arg } : (() => { const a = String(arg || '30-all'), i = a.indexOf('-'), d = i < 0 ? a : a.slice(0, i), id = i < 0 ? '' : a.slice(i + 1); return { kind: 'period', days: Math.max(0, Math.min(3650, Number(d) || 0)), templateId: id && id !== 'all' ? id : null }; })();
  const draw = () => {
    const m = buildReport({ runs: S.myRuns(), templates: S.get().templates, goals: S.goals(), profile: profile(), scope }), page = reportElement(m);
    const btn = (label, fn, cls = '') => h('button', { class: `btn ${cls}`, type: 'button', onclick: async (e) => { const b = e.currentTarget; b.disabled = true; try { await fn(); } catch (err) { console.error(err); toast(t('rpFailed')); } b.disabled = false; } }, label);
    setChildren(root, h('div', { class: 'row between rpt-toolbar' }, h('h1', {}, `📄 ${t('rpTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => history.length > 1 ? history.back() : nav('#/stats') }, t('back'))),
      scope.kind === 'period' ? h('div', { class: 'toolbar rpt-toolbar' }, [7, 30, 90, 0].map((d) => h('button', { class: `chip btn-chip ${scope.days === d ? 'on' : ''}`, type: 'button', 'aria-pressed': String(scope.days === d), onclick: () => { scope = { ...scope, days: d }; draw(); } }, d ? t('rpDays', { n: d }) : t('rpAll')))) : null,
      scope.kind === 'period' ? h('label', { class: 'field rpt-toolbar' }, h('span', { class: 'lbl' }, t('rpWhichRoutine')), h('select', { onchange: (e) => { scope = { ...scope, templateId: e.target.value || null }; draw(); } }, [h('option', { value: '' }, t('rpAllRoutines')), ...S.get().templates.map((x) => h('option', { value: x.id, selected: x.id === scope.templateId }, `${x.icon} ${x.name}`))])) : null,
      h('div', { class: 'toolbar wrap rpt-toolbar' }, btn(`📥 ${t('rpSavePdf')}`, () => savePdf(m), 'primary'), btn(`✉️ ${t('rpEmail')}`, () => emailReport(m)), btn(`🖨️ ${t('rpPrint')}`, async () => window.print()),
        btn(`📋 ${t('rpCopy')}`, async () => { try { await navigator.clipboard.writeText(reportText(m, t, fmt)); toast(t('shareCopied')); } catch { toast(t('error')); } })),
      h('p', { class: 'note rpt-toolbar' }, t('rpEmailNote')), h('div', { class: 'rpt-page' }, page));
  };
  draw(); const off = S.subscribe(() => {}); return () => off();
}

/** Stats screen entry: pick the period / routine and open the report. */
export function exportCard(nav) {
  return h('section', { class: 'card stack' }, h('h2', {}, `📤 ${t('rpExportTitle')}`), h('p', { class: 'note' }, t('rpExportHint')),
    h('div', { class: 'row-btns' }, [[7, 'rpDays'], [30, 'rpDays'], [90, 'rpDays'], [0, 'rpAll']].map(([d]) => h('button', { class: 'btn small', type: 'button', onclick: () => nav(`#/report/period/${d}-all`) }, d ? t('rpDays', { n: d }) : t('rpAll')))));
}

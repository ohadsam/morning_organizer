import { h, fmtDur, fmtHuman, clamp, setChildren } from '../util.js';
import { t, units, getLang } from '../i18n.js';
import * as S from '../store.js';
import * as E from '../engine.js';
import { stars } from '../stats.js';
import { choose, taskEvent } from '../feedback.js';
import { suggestIcon } from '../taskIcons.js';
import { setAwake } from '../awake.js';
import { signal, unlockAudio } from '../audio.js';
import { icon, confirmBox, toast } from './common.js';
import { progressWidget, overallProgress } from './progress.js';
import { native } from '../native.js';
import { avatarNode, animate } from './avatar.js';
import { confetti } from './fx.js';
import { createCoach, speakWithSettings } from './coach.js';
import { iconNode } from './editor.js';
import * as F from '../family.js';
import { afterRun, pushActive, alertParents } from '../family.js';
import { celebrateGoals } from './family.js';
import { announce } from '../a11y.js';
import { leaveStatus, leaveEvent, newLeaveMemo } from '../leave.js';
import { planShortening } from '../shorten.js';
import { buildHistory } from '../smart.js';
import { gearFor } from '../schedule.js';
import { celebrationFor } from './progressUi.js';
import { coachTrigger, newMemo } from '../coach.js';
import { sprintPlan, sprintState } from '../sprints.js';
import { openCapture, openPark, moodRow } from './capture.js';
import { quickFeel } from './feel.js';
import { calmPanel } from './calm.js';
import { modal } from './common.js';
import { planText } from './goals.js';
import { taskHelpCard } from './taskHelp.js';
import { discardActiveRun } from './runAdmin.js';
import { createVoiceControl } from './voiceControl.js';
import { podiumCard } from './podium.js';
import { lookBackSummaryCard } from './retro.js';
import { scoreRun, scoreTask } from '../points.js';
import { dictationSupported } from '../dictation.js';
import { openUnplannedSheet, patternCards, reasonName } from './unplanned.js';

const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const taskIcon = (tk) => iconNode(tk);
const calm = (r) => r.mode === 'calm';
/** Which avatar animation goes with which encouragement event. */
const BUBBLE_ANIM = { start: 'wave', warn: 'alert', over: 'think', taskEarly: 'dance', taskDone: 'cheer', taskLate: 'think', paused: 'sleep', resumed: 'wave', runDone: 'dance', runStopped: 'think', leaveSoon: 'alert', leaveNow: 'alert' };

export async function renderRunner(root, id, nav) {
  let run = await S.loadActive();
  let fresh = false;
  if (!run || run.templateId !== id || !E.isActive(run)) {
    const tpl = S.getTemplate(id);
    if (!tpl || !tpl.tasks.length) { nav('#/'); return () => {}; }
    const pm = S.get().settings.paceMode;
    run = E.createRun(tpl, Date.now(), { scale: pm === 'quick' ? 0.7 : 1, mode: pm, gear: gearFor(tpl, new Date().getDay()) }); fresh = true; run.profileId = S.activeProfile().id;
  }
  const st = () => S.get().settings;
  unlockAudio();
  let discarded = false;   // cancel / start over: this run must never be written back
  const persist = () => (discarded ? undefined : S.saveActive(E.isActive(run) ? run : null));
  persist();
  setAwake('run', st().keepAwake);
  const onVis = () => { if (document.visibilityState === 'visible') loop(); else persist(); };
  document.addEventListener('visibilitychange', onVis);

  // ── encouragement bubble ──
  const lastPick = {};
  const bubble = h('div', { class: 'bubble', role: 'status', 'aria-live': 'polite', hidden: true });
  let bubbleTimer;
  // Text and voice are independent settings: bubble shown if `feedback`, spoken (same personalised text, same voice/style) if `speak`.
  function say(event) {
    const { feedback, speak, srAnnounce } = st();
    if (!feedback && !speak && !srAnnounce) return;
    const c = choose(event, { name: st().personName, lang: getLang(), gender: st().gender, age: st().age, last: lastPick[event] ?? -1 });
    if (!c) return; lastPick[event] = c.index;
    if (st().srAnnounce) announce(c.text);
    if (feedback) {
      setChildren(bubble, h('span', { class: 'bm' }, avatarNode(st().avatar, { size: 44, anim: BUBBLE_ANIM[event] || 'idle' })), h('span', { class: 'bt' }, `${c.text} ${c.emoji}`));
      animate(buddyNode, BUBBLE_ANIM[event] || 'idle', 2200);
      bubble.hidden = false; bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
      clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 4200);
    }
    // "time's up" is announced after the end beep so the two don't talk over each other
    if (speak) { if (event === 'over') setTimeout(() => speakWithSettings(c.text), 1000); else speakWithSettings(c.text); }
  }

  const coachHost = h('div', { class: 'coach-host', hidden: true });
  const coach = createCoach(coachHost), memo = newMemo();
  const buddyNode = avatarNode(st().avatar, { size: 30 });
  const pw = progressWidget(run, { mascot: st().mascot, buddyNode });
  const ring = h('div', { class: 'ring', role: 'timer' });
  const ti = h('div', { class: 'ti', 'aria-hidden': 'true' });
  const time = h('div', { class: 'big-time' }), sub = h('div', { class: 'sub' });
  const pausedBadge = h('div', { class: 'paused-badge', hidden: true }, `⏸ ${t('pausedBig')}`);
  const ptsEl = h('div', { class: 'pts-chip', role: 'status', 'aria-live': 'polite', hidden: true });
  let pendingGain = 0;
  /** Points so far (only when points are on); the points a task just earned pop up for a moment. */
  function paintPts() {
    const s = st(); if (s.scoring === 'off') { ptsEl.hidden = true; return; }
    const sc = scoreRun(run, { mode: s.scoring, penalty: s.scorePenalty }), gain = pendingGain; pendingGain = 0;
    ptsEl.hidden = false; setChildren(ptsEl, `⭐ ${sc.total} ${t('ptsUnit')}`, gain > 0 ? h('span', { class: 'pts-pop' }, ` +${gain}`) : null);
  }
  const taskName = h('h2', { class: 'now' }), head = h('div', { class: 'run-meta' });
  const list = h('ul', { class: 'checklist' }), controls = h('div', { class: 'run-controls' }), pace = h('p', { class: 'pace' });
  // sand clock: an hourglass whose top empties while the bottom fills (only shown with the "sand" timer look)
  const SVGNS = 'http://www.w3.org/2000/svg', sv = (tag, a) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
  const sandTop = sv('rect', { x: 10, y: 4, width: 40, height: 46, class: 'sand' }), sandBot = sv('rect', { x: 10, y: 96, width: 40, height: 0, class: 'sand' }), sandFlow = sv('rect', { x: 29, y: 50, width: 2, height: 46, class: 'sand' });
  const sandSvg = sv('svg', { viewBox: '0 0 60 100', class: 'sand-svg', 'aria-hidden': 'true' });
  sandSvg.append(sv('defs', {}), sv('clipPath', { id: 'hg' }), sandTop, sandBot, sandFlow, sv('path', { d: 'M10 4H50L34 50L50 96H10L26 50Z', class: 'glass', fill: 'none' }));
  { const cp = sandSvg.querySelector('clipPath'); cp.append(sv('path', { d: 'M10 4H50L34 50L50 96H10L26 50Z' })); for (const r of [sandTop, sandBot]) r.setAttribute('clip-path', 'url(#hg)'); }
  ring.append(ti, sandSvg, time, sub);

  let lastHelpIdx = -1; let alerted = false; let lastCur = -1; const srMarks = new Set(), leaveMemo = newLeaveMemo();
  const leaveEl = h('p', { class: 'leave-line', hidden: true }), shortenEl = h('div', { class: 'shorten-slot' });
  // the routine will miss the leave-by time: offer shorter steps (the person's own history first), one tap to accept, never automatic
  let shortenKey = '', shortenDismissedMiss = null, hist = null;
  function paintShorten(ls) {
    const clear = () => { if (shortenKey) { shortenEl.replaceChildren(); shortenKey = ''; } };
    if (!ls || ls.marginSec >= 0 || run.status !== 'running') { clear(); return; }
    const miss = -ls.marginSec; if (shortenDismissedMiss !== null && miss < shortenDismissedMiss + 180) { clear(); return; }
    const steps = run.tasks.map((x, i) => ({ i, name: x.name, plannedSec: x.plannedSec, extraSec: x.extraSec, done: x.done, skipped: x.skipped })).filter((x) => x.i > run.current && !x.done && !x.skipped);
    const plan = planShortening({ steps, missSec: miss, history: (hist ??= buildHistory(S.myRuns())) });
    if (!plan.steps.length) { clear(); return; }
    const key = `${plan.steps.map((x) => `${x.i}:${x.toSec}`).join(',')}${plan.covers ? 'c' : 'p'}`; if (key === shortenKey) return; shortenKey = key;
    const u = units();
    setChildren(shortenEl, h('section', { class: 'card shorten-card', role: 'group', 'aria-label': t('shortenTitle', { t: fmtHuman(miss, u) }) }, h('strong', {}, t('shortenTitle', { t: fmtHuman(miss, u) })),
      h('ul', { class: 'shorten-list' }, plan.steps.map((x) => h('li', {}, h('span', {}, `${x.name || '—'}: ${fmtHuman(x.fromSec, u)} → ${fmtHuman(x.toSec, u)}`), x.source === 'history' ? h('small', {}, ` ${t('shortenUsually')}`) : null))),
      plan.covers ? null : h('p', { class: 'note' }, t('shortenNotEnough')),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { run = E.shortenSteps(run, plan.steps); shortenKey = ''; persist(); paintStatic(); paintLive(); toast(t('shortenDone', { t: fmtHuman(plan.saveSec, u) })); } }, t('shortenApply')),
        h('button', { class: 'btn', type: 'button', onclick: () => { shortenDismissedMiss = miss; shortenKey = ''; shortenEl.replaceChildren(); } }, t('shortenLater')))));
  }
  const feat = S.features();                                       // which helpers this person has switched on (focus areas)
  const intrEl = h('div', { class: 'intr-banner', role: 'status', hidden: true });
  const sitEl = h('p', { class: 'chip solid sit-chip', role: 'status', hidden: true });
  const sprintEl = h('div', { class: 'sprint-line', role: 'status', 'aria-live': 'polite', hidden: true });
  const transEl = h('div', { class: 'transition-banner', role: 'status', 'aria-live': 'polite', hidden: true });
  let transTimer, sprintKey = '', bodyAt = Date.now(), bodyN = 0; const warnedNext = new Set();
  function showTransition(text, ms = 7000) {
    if (!feat.transition) return;
    const nx = run.tasks[run.current]; if (!nx) return;
    setChildren(transEl, h('span', { class: 'tb-ic', 'aria-hidden': 'true' }, taskIcon(nx)), h('span', {}, text)); transEl.hidden = false;
    signal('warn', st().mode, Math.min(st().volume, 50)); if (st().srAnnounce) announce(text);
    clearTimeout(transTimer); transTimer = setTimeout(() => { transEl.hidden = true; }, ms);
  }
  function paintSprints(cur, now) {
    const plan = feat.sprints ? sprintPlan(cur.plannedSec + cur.extraSec) : { enabled: false };
    sprintEl.hidden = !plan.enabled || run.status !== 'running'; if (sprintEl.hidden) return;
    const ss = sprintState(E.elapsedMs(run, run.current, now) / 1000, plan), key = `${run.current}:${ss.index}:${ss.inBreak}`;
    sprintEl.className = `sprint-line ${ss.inBreak ? 'break' : ''}`;
    setChildren(sprintEl, h('span', { 'aria-hidden': 'true' }, Array.from({ length: plan.total }, (_, i) => (i < ss.index || (i === ss.index && ss.done) ? '●' : i === ss.index ? '◐' : '○')).join(' ')),
      h('strong', {}, ss.inBreak ? ` ${t('sprintBreak', { s: Math.ceil(ss.breakLeft) })}` : ` ${t('sprintN', { n: ss.index + 1, total: plan.total })}`));
    if (key !== sprintKey) { const first = sprintKey === ''; sprintKey = key; if (!first && !calm(run)) { signal('warn', st().mode, Math.min(st().volume, 40)); if (ss.inBreak) native.vibrate([0, 100]); announce(ss.inBreak ? t('sprintBreakSay') : t('sprintN', { n: ss.index + 1, total: plan.total })); } }
  }
  function bodyDouble(now) {   // a quiet companion: a short friendly line every few minutes, never a pressure message
    if (!feat.bodyDouble || run.status !== 'running' || calm(run) || now - bodyAt < 240_000) return;
    bodyAt = now; bodyN++; setChildren(bubble, h('span', { class: 'bm' }, avatarNode(st().avatar, { size: 44, anim: 'idle' })), h('span', { class: 'bt' }, `${t(`buddy${(bodyN % 4) + 1}`)} 🤝`)); bubble.hidden = false;
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 5000);
  }
  const gearBox = h('details', { class: 'card gear-card', hidden: true });
  function paintGear() {
    const items = run.gear || []; gearBox.hidden = !items.length; if (!items.length) return;
    const done = items.filter((g) => g.done).length;
    setChildren(gearBox, h('summary', {}, `🎒 ${t('gearToday')} · ${t('gearCount', { done, total: items.length })}`), h('ul', { class: 'gear-list' }, items.map((g) => h('li', {}, h('label', { class: 'switch row' }, h('span', {}, `${g.icon || suggestIcon(g.name)} ${g.name}`), h('input', { type: 'checkbox', checked: g.done, onchange: (e) => { g.done = e.target.checked; persist(); paintGear(); } }))))));
    if (done < items.length) gearBox.open ||= fresh; // start open so it is seen once, stays as the person left it
  }
  const planBox = h('details', { class: 'card plan-card', hidden: !(run.plans || S.getTemplate(run.templateId)?.plans || []).length });
  const plans = (S.getTemplate(run.templateId)?.plans || []).slice(0, 5);
  if (plans.length) { setChildren(planBox, h('summary', {}, `🧠 ${t('plansTitle')}`), h('ul', { class: 'plan-list' }, plans.map((p) => h('li', {}, h('strong', {}, t('planIf')), ` ${p.when}, `, h('strong', {}, t('planThenWord')), ` ${p.then}`)))); planBox.open = fresh; }
  const myGoals = S.goals().filter((g) => !g.done && g.templateId === run.templateId).slice(0, 2);
  const helpCard = feat.taskHelp ? taskHelpCard({
    current: () => ({ task: E.isActive(run) ? run.tasks[run.current] : null, index: run.current }),
    rate: (i, v) => { run = E.setDifficulty(run, i, v); persist(); },
    helped: (i, kind) => { run = E.noteHelp(run, i, kind); persist(); },
    openCalm: (initial, keep) => openCalm(initial, keep),
  }, run.templateName) : null;
  const goalBox = h('details', { class: 'card plan-card', hidden: !myGoals.length });
  if (myGoals.length) { setChildren(goalBox, h('summary', {}, `🎯 ${t('goalMyPlanToday')}`), h('ul', { class: 'plan-list' }, myGoals.map((g) => h('li', {}, h('strong', {}, g.title), planText(g) ? ` — ${planText(g)}` : '')))); goalBox.open = fresh; }
  function announceTask(cur) {
    const msg = t('nowTask', { task: cur.name || '' });
    if (st().announceTasks) setTimeout(() => speakWithSettings(msg, { kind: 'short' }), fresh ? 1800 : 300); // after the "start" encouragement
    if (st().srAnnounce) announce(`${msg}, ${fmtHuman(cur.plannedSec + cur.extraSec, units())}`);
  }
  /** The calm corner over the run: the clock pauses while you breathe (nothing is "lost"), and resumes when you come back. */
  function openCalm(initial = {}, keepRunning = false) {
    const wasRunning = !keepRunning && run.status === 'running'; if (wasRunning) { run = E.pause(run, Date.now()); persist(); paintStatic(); paintLive(); }
    const host = h('div', {}); let stop = () => {}; let m;
    m = modal(`🌬️ ${t('calmTitle')}`, host, []);
    stop = calmPanel(host, { compact: true, initial, onClose: () => m.close() });
    m.el.addEventListener('close', () => { stop(); if (wasRunning && run.status === 'paused') { run = E.resume(run, Date.now()); persist(); paintStatic(); paintLive(); } });
  }
  function startUnplanned() {
    openUnplannedSheet((reason) => { run = E.startInterruption(run, Date.now(), reason); persist(); paintStatic(); paintLive(); });
  }
  function endUnplanned() {
    const label = run.interrupt?.label; run = E.endInterruption(run, Date.now()); persist(); paintStatic(); paintLive(); announce(t('unpBackSay', { name: label || '' }));
  }
  const act = (fn) => { run = fn(run, Date.now()); afterChange(); };
  const tplNow = () => S.getTemplate(run.templateId), feelAtNow = () => tplNow()?.feelAt || 'none', feelSlot = h('div', { class: 'feel-slot' });
  function showFeel(moment, task = '') { setChildren(feelSlot, quickFeel({ moment, routine: run.templateName, task, onClose: (why) => { feelSlot.replaceChildren(); if (why === 'calm') openCalm({}, true); } })); }
  const doComplete = () => {
    const cur = run.tasks[run.current], now = Date.now();
    const ev = taskEvent(E.elapsedMs(run, run.current, now) / 1000, cur.plannedSec + cur.extraSec);
    if (st().mode === 'both' || st().mode === 'vibrate') native.vibrate([0, 25]);   // a light tick: that counted
    const doneIdx = run.current; run = E.completeCurrent(run, now);
    { const s = st(); if (s.scoring !== 'off') pendingGain = scoreTask(run.tasks[doneIdx], { mode: s.scoring, penalty: s.scorePenalty, calm: calm(run) }).total; }
    { const tk = tplNow()?.tasks?.[doneIdx]; if (tk?.feelAfter) showFeel('task', run.tasks[doneIdx]?.name || tk.name || ''); }
    if (E.isActive(run)) { say(ev); showTransition(t('nextUp', { task: run.tasks[run.current]?.name || '' })); }
    afterChange();
  };
  const stopRun = async () => { if (await confirmBox(t('stopConfirm'), t('stop'), true)) act(E.finish); };

  // ── voice commands (opt-in, see ui/voiceControl.js): one spoken phrase = one of the buttons; risky ones only open the usual question ──
  const askDialog = () => document.querySelector('dialog.modal[open]');
  function onVoice(id) {
    const dlg = askDialog();
    if (id === 'yes' || id === 'no') { const bs = dlg?.querySelectorAll('footer button'); if (bs?.length) (id === 'yes' ? bs[bs.length - 1] : bs[0]).click(); return; }
    if (dlg || discarded || !E.isActive(run)) return;            // a question is open (or the run is over): only yes / no count
    const cur = run.tasks[run.current], paused = run.status === 'paused';
    switch (id) {
      case 'done': if (!paused && !run.interrupt) doComplete(); break;
      case 'addTime': if (!run.interrupt) { E.addTime(run, 60); persist(); paintLive(); pushWidget(); } break;
      case 'pause': if (!paused && !run.interrupt) togglePause(); break;
      case 'resume': if (paused) togglePause(); break;
      case 'skip': if (!run.interrupt) act(E.skipCurrent); break;
      case 'stop': stopRun(); break;
      case 'journal': if (feat.journal) openCapture({ routine: run.templateName, task: cur?.name || '' }); break;
      case 'calm': if (feat.calmCorner) openCalm(); break;
      case 'remind': { const msg = t('nowTask', { task: cur?.name || '' }); toast(msg); speakWithSettings(msg, { kind: 'short' }); break; }
      case 'timeLeft': { const msg = t('vcTimeLeft', { time: fmtHuman(Math.max(0, Math.ceil(E.remainingSec(run, Date.now()))), units()) }); toast(msg); speakWithSettings(msg, { kind: 'short' }); break; }
      case 'tip': coach.show('any', cur?.name); break;
      default: break;
    }
  }
  const vc = dictationSupported() ? createVoiceControl({ onCommand: onVoice }) : null;
  const togglePause = () => {
    const was = run.status;
    run = was === 'paused' ? E.resume(run, Date.now()) : E.pause(run, Date.now());
    say(was === 'paused' ? 'resumed' : 'paused'); persist(); paintStatic(); paintLive();
  };

  /** Snapshot for the Android home-screen widget (task change / pause / finish only - the widget counts down by itself). */
  function pushWidget() {
    if (!native.available) return;
    const now = Date.now();
    if (!E.isActive(run)) { native.setProgress({ active: false }); return; }
    native.setProgress({ active: true, templateId: run.templateId, name: run.templateName, icon: run.icon, task: run.tasks[run.current]?.name || '', pct: overallProgress(run, now), paused: run.status === 'paused', remaining: Math.round(E.remainingSec(run, now)) });
  }
  function paintStatic() {
    const cur = run.tasks[run.current], paused = run.status === 'paused';
    taskName.textContent = cur?.name || ''; setChildren(ti, cur ? taskIcon(cur) : '');
    if (cur && run.current !== lastCur) { lastCur = run.current; announceTask(cur); }
    ring.classList.toggle('calm', calm(run)); { const ts = st().timerStyle, style = ts && ts !== 'auto' ? ts : feat.timerPie ? 'pie' : 'ring'; ring.classList.toggle('pie', style === 'pie'); ring.classList.toggle('bar', style === 'bar'); ring.classList.toggle('sandy', style === 'sand'); }
    ring.classList.toggle('paused', paused); pausedBadge.hidden = !paused || !!run.interrupt;
    list.replaceChildren(...run.tasks.map((tk, i) => h('li', { class: `${i === run.current && E.isActive(run) ? 'cur' : ''} ${tk.done ? 'done' : ''} ${tk.skipped ? 'skip' : ''}` },
      h('label', {}, h('input', { type: 'checkbox', checked: tk.done, onchange: () => { if (i === run.current) doComplete(); else { run = E.toggleTask(run, i, Date.now()); afterChange(); } } }),
        h('span', { class: 'cb' }, icon('check', 16)), h('span', { class: 'ti-s', 'aria-hidden': 'true' }, taskIcon(tk)), h('span', { class: 'nm' }, tk.name || '—'),
        h('span', { class: 'du' }, tk.done || tk.skipped ? fmtDur(tk.actualSec || 0) : fmtDur(tk.plannedSec))),
      st().coachButton && !tk.done && !tk.skipped ? h('button', { class: 'tip-btn', type: 'button', 'aria-label': t('tipFor', { name: tk.name || '' }), title: t('tipBtn'), onclick: () => coach.show('any', tk.name) }, '💡') : null)));
    paintPts(); pushWidget(); helpCard?.update(); if (cur && run.current !== lastHelpIdx) { lastHelpIdx = run.current; helpCard?.clear(); }
    list.toggleAttribute('inert', !!run.interrupt);
    if (run.interrupt) {
      setChildren(controls, h('div', { class: 'main-btns' }, h('button', { class: 'btn primary xl', type: 'button', onclick: endUnplanned }, icon('play', 22), t('unpBack'))));
      return;
    }
    setChildren(controls, 
      h('div', { class: 'main-btns' },
        h('button', { class: 'btn primary xl', type: 'button', onclick: doComplete }, icon('check', 22), t('doneNext')),
        h('button', { class: `btn xl pause-btn ${paused ? 'resume' : ''}`, type: 'button', 'aria-pressed': String(paused), onclick: togglePause }, icon(paused ? 'play' : 'pause', 22), paused ? t('resume') : t('pause'))),
      h('details', { class: 'fold run-more' }, h('summary', {}, h('span', { class: 'fold-t' }, `⋯ ${t('runMore')}`), h('small', { class: 'fold-s' }, t('runMoreSub'))),
        h('div', { class: 'run-group' }, h('h3', {}, `🤝 ${t('runGrpHelp')}`), h('div', { class: 'row-btns' },
          st().coachButton ? h('button', { class: 'btn tip-main', type: 'button', onclick: () => coach.show('any', cur?.name) }, '💡', t('tipBtn')) : null,
          feat.calmCorner ? h('button', { class: 'btn', type: 'button', onclick: openCalm }, '🌬️', t('calmTitle')) : null,
          feat.journal ? h('button', { class: 'btn', type: 'button', 'aria-label': t('jNoteFor', { task: cur?.name || '' }), onclick: () => openCapture({ routine: run.templateName, task: cur?.name || '' }) }, '🎙️', t('jQuick')) : null,
          feat.parkingLot ? h('button', { class: 'btn', type: 'button', onclick: () => openPark({ routine: run.templateName, task: cur?.name || '' }) }, '🅿️', t('parkTitle')) : null)),
        h('div', { class: 'run-group' }, h('h3', {}, `🔧 ${t('runGrpChange')}`), h('div', { class: 'row-btns' },
          h('button', { class: 'btn', type: 'button', onclick: () => { E.addTime(run, 60); persist(); paintLive(); pushWidget(); } }, icon('plus', 18), t('addMinute')),
          h('button', { class: 'btn', type: 'button', disabled: paused, onclick: startUnplanned }, '⚡', t('unpBtn')),
          h('button', { class: 'btn', type: 'button', onclick: () => act(E.skipCurrent) }, icon('skip', 18), t('skip')),
          h('button', { class: 'btn', type: 'button', onclick: async () => { if (await confirmBox(t('restartConfirm'), t('restartRun'))) { discarded = true; clearInterval(timer); await discardActiveRun(); nav(`#/run/${run.templateId}`); } } }, '↺', t('restartRun')),
          h('button', { class: 'btn', type: 'button', onclick: async () => { if (await confirmBox(t('cancelConfirm'), t('cancelRun'), true)) { discarded = true; clearInterval(timer); await discardActiveRun(); toast(t('cancelledToast')); nav('#/'); } } }, '✖', t('cancelRun')),
          h('button', { class: 'btn danger', type: 'button', onclick: stopRun }, icon('stop', 18), t('stop'))))));
  }

  function paintLive() {
    if (!E.isActive(run)) return;
    const now = Date.now(), cur = run.tasks[run.current], left = E.remainingSec(run, now), total = cur.plannedSec + cur.extraSec, over = left < 0;
    { const par = F.sittingParent(); sitEl.hidden = !par; if (par) sitEl.textContent = `👪 ${t('sitHere', { name: par.name || t('family') })}`; }
    intrEl.hidden = !run.interrupt;
    if (run.interrupt) setChildren(intrEl, h('span', { 'aria-hidden': 'true' }, run.interrupt.emoji), h('strong', {}, ` ${reasonName(run.interrupt)} `), h('span', { class: 'intr-time' }, fmtDur((now - run.interrupt.startedAt) / 1000)), h('small', {}, ` · ${t('unpClockStopped')}`));
    time.textContent = fmtDur(Math.ceil(over ? -left : left));
    sub.textContent = run.status === 'paused' ? t('paused') : over ? (calm(run) ? t('calmLeft') : t('over')) : t('left');
    const prog = clamp(1 - left / total, 0, 1); ring.style.setProperty('--p', String(prog));
    if (ring.classList.contains('sandy')) { sandTop.setAttribute('y', String(4 + 46 * prog)); sandTop.setAttribute('height', String(46 * (1 - prog))); sandBot.setAttribute('y', String(96 - 46 * prog)); sandBot.setAttribute('height', String(46 * prog)); sandFlow.setAttribute('height', prog < 1 ? '46' : '0'); }
    const w = st().warnSec;
    ring.classList.toggle('over', over); ring.classList.toggle('warn', !over && w > 0 && left <= w && run.status === 'running');
    const diff = E.paceDiffSec(run, now);
    pace.textContent = Math.abs(diff) < 10 ? t('onPlan') : `${fmtHuman(Math.abs(diff), units())} ${diff > 0 ? t('behind') : t('ahead')}`;
    const planned = run.tasks.reduce((s, x) => s + x.plannedSec + x.extraSec, 0);
    const ls = leaveStatus(run.leaveBy, run.startedAt, E.etaMs(run, now));
    leaveEl.hidden = !ls; paintShorten(ls);
    if (ls) {
      const late = ls.marginSec < 0, tm = (sec) => fmtHuman(Math.abs(sec), units());
      leaveEl.className = `leave-line ${late ? 'late' : 'ok'}`;
      leaveEl.textContent = `${t('leaveLine', { leave: clock(ls.leaveAt), eta: clock(E.etaMs(run, now)) })} · ${late ? t('lateBy', { t: tm(ls.marginSec) }) : t('spare', { t: tm(ls.marginSec) })}`;
    }
    setChildren(head, h('span', {}, `${t('startedAt')} ${clock(run.startedAt)}`), h('span', {}, `${t('plannedEnd')} ${clock(run.startedAt + planned * 1000)}`), h('span', {}, `${t('elapsed')} ${fmtDur((now - run.startedAt) / 1000)}`));
    paintSprints(cur, now); bodyDouble(now);
    const nx = run.tasks[run.current + 1];
    if (nx && left <= 30 && left > 0 && run.status === 'running' && !warnedNext.has(cur.id) && total >= 90) {
      warnedNext.add(cur.id);
      if (feat.transition) { setChildren(transEl, h('span', { class: 'tb-ic', 'aria-hidden': 'true' }, taskIcon(nx)), h('span', {}, t('nextSoon', { task: nx.name || '' }))); transEl.hidden = false; signal('warn', st().mode, Math.min(st().volume, 50)); clearTimeout(transTimer); transTimer = setTimeout(() => { transEl.hidden = true; }, 7000); }
    }
    pw.update(run, now);
  }

  const leaveAtOf = () => (run.leaveBy ? leaveStatus(run.leaveBy, run.startedAt, 0)?.leaveAt ?? null : null);
  let timer = null;
  function loop() {
    if (!E.isActive(run)) return;
    const s = st();
    for (const ev of E.tick(run, Date.now(), calm(run) ? 0 : s.warnSec)) {
      if (s.srAnnounce && ev === 'end') announce(t('over'));
      if (calm(run)) { if (ev === 'end') signal('warn', s.mode, s.volume); persist(); continue; } // calm: one soft beep, no pressure messages
      signal(ev, s.mode, s.volume); say(ev === 'warn' ? 'warn' : 'over');
      if (ev === 'end' && s.autoAdvance) { doComplete(); return; }
      persist();
    }
    const le = leaveEvent(leaveAtOf(), Date.now(), leaveMemo); if (le && !calm(run)) say(le);
    if (le === 'leaveNow') { const lateMin = Math.round((E.etaMs(run, Date.now()) - leaveAtOf()) / 60000); if (lateMin > 0) alertParents({ kind: 'late', name: run.templateName, minutes: lateMin }, run.profileId); }
    if (!alerted && E.paceDiffSec(run, Date.now()) >= 300) { alerted = true; alertParents({ kind: 'overtime', name: run.templateName, minutes: Math.round(E.paceDiffSec(run, Date.now()) / 60) }, run.profileId); }
    if (s.srAnnounce) { const cur = run.tasks[run.current], left = E.remainingSec(run, Date.now()); if (left <= 60 && left > 0 && !srMarks.has(cur.id)) { srMarks.add(cur.id); announce(`${cur.name}: ${fmtHuman(Math.ceil(left), units())} ${t('left')}`); } }
    if (s.coachAuto && !calm(run) && !run.interrupt) { const sit = coachTrigger(run, Date.now(), memo); if (sit) coach.show(sit, run.tasks[run.current]?.name); }
    paintLive();
  }

  async function afterChange() {
    if (E.isActive(run)) { persist(); paintStatic(); paintLive(); pushActive(); return; }
    vc?.stop(); { const s = st(); if (s.scoring !== 'off') run.score = scoreRun(run, { mode: s.scoring, penalty: s.scorePenalty }); }
    await S.saveActive(null); await S.saveRun(run); setAwake('run', false); pushWidget();
    renderSummary();
    { const tpl = S.getTemplate(run.templateId), slot = root.querySelector('.pattern-slot'); if (tpl && slot) { const c = patternCards(tpl, nav, () => {}); if (c) setChildren(slot, c); } }
    { const slot = root.querySelector('.podium-slot'), card = slot && run.score ? podiumCard(run, S.myRuns(), { cumulative: st().scoreCumulative }) : null; if (card) setChildren(slot, card); }
    celebrationFor(run).then((card) => { const slot = root.querySelector('.celebrate-slot'); if (card && slot) setChildren(slot, card); }).catch(() => {});
    afterRun(run.profileId).then(celebrateGoals).catch(() => {});
  }

  function renderSummary() {
    clearInterval(timer); coach.hide();
    const s = E.summarize(run), u = units(), n = stars(run);
    const dRow = (k, v, cls = '') => h('div', { class: `kv ${cls}` }, h('span', {}, k), h('strong', {}, v));
    const done = run.status === 'done';
    const starRow = h('div', { class: 'stars', role: 'img', 'aria-label': `${t('starsEarned')}: ${n}/3` }, [0, 1, 2].map((i) => h('span', { class: `star ${i < n ? 'on' : ''}`, style: { '--i': String(i) } }, '⭐')));
    setChildren(root, h('div', { class: 'summary' },
      h('div', { class: 'big-emoji' }, avatarNode(st().avatar, { size: 110, anim: done ? 'dance' : 'think' })), h('h1', {}, done ? t('allDone') : t('stopped')), starRow,
      h('p', { class: 'muted' }, run.templateName), h('div', { class: 'celebrate-slot' }), h('div', { class: 'podium-slot' }), bubble, lookBackSummaryCard(nav, run.id),
      done && ['end', 'both'].includes(feelAtNow()) ? quickFeel({ moment: 'end', routine: run.templateName, onClose: (why) => { if (why === 'calm') nav('#/calm'); } }) : null,
      feat.moodCheck && !(done && ['end', 'both'].includes(feelAtNow())) ? h('div', { class: 'card center' }, h('strong', {}, t('moodAsk')), moodRow(async (v) => { run.mood = v; await S.setRunMood(run.id, v); }, run.mood || null)) : null,
      myGoals.length && done ? h('div', { class: 'card center' }, h('strong', {}, `🎯 ${myGoals[0].title}`), h('p', {}, t('checkAsk')), moodRow(async (v) => { await S.addCheck(myGoals[0].id, { rating: v }); toast(t('checkSaved')); })) : null,
      feat.journal ? h('button', { class: 'btn', type: 'button', onclick: () => openCapture({ routine: run.templateName }) }, `📝 ${t('jAfter')}`) : null,
      h('div', { class: 'card kvs' },
        dRow(t('startedAt'), clock(run.startedAt)), dRow(t('wall'), fmtHuman(s.wallSec, u)),
        dRow(t('planned'), fmtHuman(s.plannedSec, u)), dRow(t('estimated'), fmtHuman(s.estSec, u)), dRow(t('actual'), fmtHuman(s.actualSec, u)),
        dRow(t('difference'), `${s.deltaSec > 0 ? '+' : ''}${fmtHuman(s.deltaSec, u)}`, s.deltaSec > 0 ? 'bad' : 'good'),
        s.pausedSec ? dRow(t('pausedTotal'), fmtHuman(s.pausedSec, u)) : null, s.shortenedCount ? dRow(`✂️ ${t('shortenedRow')}`, t('shortenedVal', { n: s.shortenedCount, t: fmtHuman(s.shortenedSec, u) })) : null, s.unplannedCount ? dRow(`⚡ ${t('unpTotal')}`, `${fmtHuman(s.unplannedSec, u)} (${s.unplannedCount}×)`) : null, (run.gear || []).length ? dRow(`🎒 ${t('gear')}`, `${run.gear.filter((g) => g.done).length}/${run.gear.length}`) : null, dRow(t('tasksDone'), `${s.done}/${s.total}`), s.skipped ? dRow(t('tasksSkipped'), String(s.skipped)) : null),
      (run.unplanned || []).length ? h('ul', { class: 'unp-list' }, run.unplanned.map((x) => h('li', {}, `${x.emoji} ${reasonName(x)} · ${fmtHuman(x.sec, u)}${x.task ? ` · ${x.task}` : ''}`))) : null, h('div', { class: 'pattern-slot' }),
      h('h2', {}, t('perTask')),
      h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, t('colTask')), h('th', {}, t('colPlanned')), h('th', {}, t('colActual')))),
        h('tbody', {}, run.tasks.map((x) => h('tr', { class: x.actualSec > x.plannedSec ? 'over' : '' }, h('td', {}, `${taskIcon(x)} ${x.name || '—'}${x.skipped ? ` (${t('skippedTag')})` : ''}`), h('td', {}, fmtDur(x.plannedSec)), h('td', {}, fmtDur(x.actualSec)))))),
      h('div', { class: 'toolbar' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => nav('#/') }, t('again')),
        h('button', { class: 'btn', type: 'button', onclick: () => nav(`#/stats/${run.templateId}`) }, icon('chart', 18), t('viewStats')),
        h('button', { class: 'btn', type: 'button', onclick: () => nav(`#/report/run/${run.id}`) }, `📄 ${t('rpRunReport')}`),
        h('button', { class: 'btn danger', type: 'button', onclick: async () => { if (await confirmBox(t('runDeleteConfirm'), t('runDelete'), true)) { const undo = await S.removeRunWithUndo(run.id); toast(t('runDeleted'), { label: t('undo'), fn: undo }); nav('#/'); } } }, `🗑 ${t('runDelete')}`))));
    if (done) confetti(root, 44);
    say(done ? 'runDone' : 'runStopped');
  }

  setChildren(root, h('div', { class: 'run' },
    h('div', { class: 'run-top', style: { '--accent': run.color || '#6c5ce7' } }, h('span', { class: 'emoji' }, run.icon), h('h1', { class: 'run-title' }, run.templateName)),
    bubble, coachHost, transEl, feelSlot, sitEl, intrEl, goalBox, planBox, gearBox, pw.el, head, leaveEl, shortenEl, h('div', { class: 'ring-wrap' }, ring, pausedBadge), sprintEl, taskName, ptsEl, pace, controls, vc?.el, helpCard?.el, list));
  paintStatic(); paintLive(); paintGear();
  if (vc && st().voiceCmdAuto && st().transcribe) vc.start();
  if (fresh) { say('start'); pushActive(true); if (['start', 'both'].includes(feelAtNow())) showFeel('start'); }   // the parent sees "doing now" from the very first task
  timer = setInterval(loop, 250);
  return () => { vc?.destroy(); clearInterval(timer); clearTimeout(bubbleTimer); clearTimeout(transTimer); coach.hide(); document.removeEventListener('visibilitychange', onVis); setAwake('run', false); if (E.isActive(run) && !discarded) persist(); };
}

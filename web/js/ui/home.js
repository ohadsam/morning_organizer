import { h, fmtHuman, setChildren } from '../util.js';
import { t, units, getLang } from '../i18n.js';
import * as S from '../store.js';
import { nextAcross } from '../alarms.js';
import { streak, totalStars, finished } from '../stats.js';
import { setAwake, isAwakeWanted } from '../awake.js';
import { progressWidget } from './progress.js';
import { isActive } from '../engine.js';
import * as F from '../family.js';
import { rewardProgress } from '../rewards.js';
import { avatarNode, openProfiles } from './avatar.js';
import { levelInfo } from '../levels.js';
import { openRoutineIO } from './routineIO.js';
import { emptyState, iconNode } from './visualKit.js';
import { splitForToday } from '../schedule.js';
import { icon, iconBtn, toast, confirmBox, toolbar } from './common.js';
import { openPauseSheet, pausedBanner } from './pause.js';
import { discardActiveRun } from './runAdmin.js';
import { isPaused } from '../alarmPause.js';
import { dayOff, hebrewLabel } from '../holidays.js';
import { pickNow } from '../nowPick.js';
import { openSearch } from './search.js';
import { runAction } from './actions.js';
import { suggestionCard } from './suggest.js';
import { openShare, openImport } from './share.js';
import { focusCard } from './focus.js';
import { openMenu } from './menu.js';
import { openWhatsNew, getVersion } from './whatsnew.js';
import { dueCard, followUpCard, lookBackHint } from './retro.js';
import { dueRun } from '../retro.js';
import { openCapture } from './capture.js';
import { openRoutinePicker } from './library.js';
import { alarmSummary } from './alarms.js';
import { needsCheck } from '../cogfun.js';
import { openCheckin } from './goals.js';

/** The routine's alarm as an on/off switch: Start runs the routine now, the alarm is what happens by itself - so the person controls it right on the card. */
function alarmSwitch(tpl) {
  const on = !!tpl.alarm?.enabled, time = tpl.alarm?.time || '';
  return h('button', { class: `alarm-switch ${on ? 'on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': `${t('alarmToggle')} ${time}: ${on ? t('alarmArmed') : t('alarmDisarmed')}`,
    onclick: async () => { try { await S.saveTemplate({ ...tpl, alarm: { ...tpl.alarm, enabled: !on } }); toast(!on ? t('alarmArmedToast', { time }) : t('alarmDisarmedToast')); } catch { toast(t('error')); } } },
    h('span', { class: 'as-track', 'aria-hidden': 'true' }, h('span', { class: 'as-knob' })),
    h('span', { class: 'as-text' }, h('strong', {}, t('alarmToggle')), h('small', { class: on ? 'alarm-line' : '' }, on ? `⏰ ${alarmSummary(tpl)}` : t('alarmDisarmed'))));
}

function card(tpl, nav) {
  const total = S.totalSec(tpl), simple = S.get().settings.simpleMode;
  return h('article', { class: `card routine ${tpl.alarm?.enabled ? 'armed' : ''}`, style: { '--accent': tpl.color } },
    h('button', { class: 'routine-main', type: 'button', onclick: () => nav(simple ? `#/run/${tpl.id}` : `#/edit/${tpl.id}`), 'aria-label': `${simple ? t('start') : t('edit')}: ${tpl.name}` },
      h('span', { class: 'emoji', 'aria-hidden': tpl.alarm?.enabled ? null : 'true', role: tpl.alarm?.enabled ? 'img' : null, 'aria-label': tpl.alarm?.enabled ? t('alarmBadge') : null }, tpl.icon, tpl.alarm?.enabled ? h('i', { class: 'alarm-sticker', 'aria-hidden': 'true' }, '⏰') : null),
      h('span', { class: 'routine-text' }, h('strong', {}, tpl.name || t('untitled')),
        h('small', {}, `${t('tasksCount', { n: tpl.tasks.length })} · ${fmtHuman(total, units())}${tpl.from ? ` · ${t('fromParentTag', { name: tpl.from })}` : ''}`),
        S.goals().filter((g) => g.templateId === tpl.id && !g.done).slice(0, 2).map((g) => h('small', { class: 'goal-chip' }, `🎯 ${t('goalChip', { title: g.title })}`)))),
    simple ? null : alarmSwitch(tpl),
    h('div', { class: `routine-actions ${simple ? 'simple' : ''}` },
      iconBtn('star', tpl.favorite ? t('unfavorite') : t('favorite'), () => S.toggleFavorite(tpl.id), tpl.favorite ? 'fav on' : 'fav'),
      simple ? null : iconBtn('share', t('share'), () => openShare(tpl)),
      simple ? null : iconBtn('copy', t('duplicate'), async () => { try { await S.duplicateTemplate(tpl.id); toast(t('saved')); } catch { toast(t('error')); } }),
      simple ? null : iconBtn('trash', t('delete'), async () => { if (await confirmBox(t('confirmDelete', { name: tpl.name }), t('delete'), true)) { const undo = await S.deleteWithUndo(tpl.id); toast(t('deletedUndo', { name: tpl.name }), { label: t('undo'), fn: undo }); } }),
      h('button', { class: 'btn primary start', type: 'button', disabled: !tpl.tasks.length, onclick: () => nav(`#/run/${tpl.id}`) }, icon('play', 18), t('start'))));
}

export function renderHome(root, nav) {
  let active = null, pw = null, tick = null;
  const activeCard = () => {
    if (!active) return null;
    const { settings } = S.get();
    pw = progressWidget(active, { mascot: settings.mascot, compact: true, buddyNode: avatarNode(settings.avatar, { size: 26 }) });
    return h('section', { class: 'card active-run', style: { '--accent': active.color || '#6c5ce7' } },
      h('div', { class: 'row between' }, h('strong', {}, `${active.icon} ${t('continueRun', { name: active.templateName })}`), h('span', { class: 'chip solid' }, t('activeRun'))),
      pw.el, h('button', { class: 'btn primary', type: 'button', onclick: () => nav(`#/run/${active.templateId}`) }, icon('play', 18), t('resume')),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn', type: 'button', onclick: async () => { if (await confirmBox(t('restartConfirm'), t('restartRun'))) { const id = active.templateId; await discardActiveRun(); active = null; nav(`#/run/${id}`); } } }, '↺', t('restartRun')),
        h('button', { class: 'btn', type: 'button', onclick: async () => { if (await confirmBox(t('cancelConfirm'), t('cancelRun'), true)) { await discardActiveRun(); active = null; clearInterval(tick); toast(t('cancelledToast')); draw(); } } }, '✖', t('cancelRun'))));
  };
  let showAll = false;   // "Now" mode: the person asked to see everything this time
  const nowCard = () => { const pick = pickNow(S.myTemplates(), finished(S.myRuns())); if (!pick) return null; const x = pick.template, total = x.tasks.reduce((s, k) => s + k.sec, 0);
    return h('section', { class: 'card now-card', 'aria-label': t('nowTitle') }, h('p', { class: 'muted' }, t(`nowWhy_${pick.why}`)), h('h2', { class: 'now-name' }, `${x.icon || ''} ${x.name}`), h('p', {}, `${t('tasksCount', { n: x.tasks.length })} · ${fmtHuman(total, units())}`),
      h('button', { class: 'btn primary xl', type: 'button', onclick: () => nav(`#/run/${x.id}`) }, icon('play', 20), t('nowStart')),
      h('button', { class: 'btn link', type: 'button', onclick: () => { showAll = true; draw(); } }, t('nowSeeAll'))); };
  let alive = true;   // a draw that arrives after the person already left Home must not overwrite the page they are on
  const draw = () => {
    if (!alive) return;
    const { settings } = S.get(), templates = S.myTemplates();
    const done = finished(S.myRuns()), days = streak(done), starsN = totalStars(done);
    const awake = isAwakeWanted(), lv = levelInfo(starsN), nowMode = settings.homeMode === 'now' && !settings.simpleMode && !showAll, simple = settings.simpleMode || nowMode;
    const goals = F.childLinks().filter((l) => l.parent.goal).map((l) => ({ g: l.parent.goal, p: rewardProgress(l.parent.goal, done) }));
    const favs = templates.filter((x) => x.favorite);
    const next = nextAcross(templates), focusEl = simple ? null : focusCard(), suggestionBelow = simple || focusEl ? null : suggestionCard(nav, draw);
    setChildren(root,
      h('div', { class: 'hero' }, h('button', { class: 'hero-buddy', type: 'button', 'aria-label': `${t('switchProfile')}: ${settings.personName || ''}`, onclick: () => openProfiles(nav) }, avatarNode(settings.avatar, { size: 76 })), h('h1', {}, t('appName')), h('p', {}, settings.personName ? t('greetName', { name: settings.personName }) : t('hello')),
        h('div', { class: 'chips' }, h('span', { class: 'chip', title: t('hebDate') }, `📅 ${hebrewLabel(new Date(), getLang())}`), dayOff(new Date()) ? h('span', { class: 'chip' }, `🕎 ${t(`hol_${dayOff(new Date()).key}`)}`) : null, days ? h('span', { class: 'chip' }, `🔥 ${t('streakDays', { n: days })}`) : null, starsN ? h('span', { class: 'chip' }, `⭐ ${t('starsTotal', { n: starsN })}`) : null,
          h('span', { class: 'chip', title: lv.next ? t('levelNext', { n: lv.toNext, l: lv.level + 1 }) : '' }, `🏅 ${t('levelLabel', { n: lv.level })}`),
          goals.map(({ g, p }) => h('span', { class: 'chip', title: g.title }, t('goalChip', { emoji: g.emoji, have: p.have, target: p.target }))),
          h('button', { class: `chip btn-chip ${awake ? 'on' : ''}`, type: 'button', 'aria-pressed': String(awake), onclick: async () => { await S.updateSettings({ keepAwakeApp: !awake }); setAwake('app', !awake); draw(); } }, awake ? `☀️ ${t('screenOn')}` : `🌙 ${t('screenOff')}`)),
        next ? h('a', { class: 'chip', href: '#/alarms' }, icon('bell', 16), t('alarmNext', { name: next.template.name, time: next.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })) : null),
      activeCard(),
      nowMode && !active ? nowCard() : null,
      focusEl,
      simple ? null : followUpCard(nav, draw) ?? dueCard(nav, draw) ?? lookBackHint(nav, draw),
      simple ? null : (() => { const g = S.goals().find((x) => needsCheck(x)); return g ? h('section', { class: 'card focus-card' }, h('strong', {}, `🎯 ${t('checkDue')}`), h('p', {}, g.title), h('button', { class: 'btn primary', type: 'button', onclick: () => openCheckin(g, draw) }, `✔ ${t('checkTitle')}`)) : null; })(),
      simple ? null : h('button', { class: 'home-search', type: 'button', 'aria-haspopup': 'dialog', onclick: () => openSearch(nav) }, h('span', { 'aria-hidden': 'true' }, '🔍'), h('span', {}, t('homeSearch'))),
      simple ? null : (() => { const f = S.features(), b = (emoji, label, fn, id = '') => h('button', { class: 'btn', type: 'button', onclick: fn }, id ? iconNode(id, { size: 20, fallback: emoji }) : h('span', { 'aria-hidden': 'true' }, emoji), label), paused = isPaused(settings.alarmsPause); return toolbar([
        { id: 'new', icon: '➕', iconId: 'new-routine', label: t('tbNew'), run: () => runAction('newRoutine', nav) },
        { id: 'wizard', icon: '🪄', iconId: 'wizard', label: t('tbWizard'), run: () => runAction('wizard', nav) },
        { id: 'plan', icon: '🗓️', iconId: 'plan', label: t('tbPlan'), items: [b('⏰', t('alarmsTitle'), () => nav('#/alarms'), 'alarms'), S.shows('goals') ? b('🎯', t('goalsTitle'), () => nav('#/goals'), 'goals') : null, b('📚', t('libFromTemplate'), () => openRoutinePicker(nav), 'library'), b('⚙️', t('libManage'), () => nav('#/library')), b('📥', t('import'), () => openImport(), 'import'), b('🔁', t('rioTitle'), () => openRoutineIO(), 'share-routines')].filter(Boolean) },
        { id: 'calm', icon: '🌬️', iconId: 'calm-corner', label: t('tbCalm'), items: [S.shows('feel') ? b('🙂', t('tbFeel'), () => nav('#/feel')) : null, f.calmCorner ? b('🌬️', t('calmTitle'), () => nav('#/calm'), 'calm-corner') : null, f.journal ? b('📓', t('journal'), () => nav('#/journal'), 'journal') : null, f.journal ? b('🎙️', t('jQuick'), () => openCapture({}), 'quick-note') : null, S.shows('nlp') ? b('🗣️', t('tbNlp'), () => nav('#/nlp')) : null].filter(Boolean) },
        { id: 'track', icon: '📈', iconId: 'track', badge: !!dueRun(S.myRuns(), S.retros()), label: t('tbTrack'), items: [S.shows('stats') ? b('📊', t('stats'), () => nav('#/stats'), 'track') : null, S.shows('retros') ? b('🔄', t('rcvTitle'), () => nav('#/retros'), 'looking-back') : null, f.rewardMenu && S.shows('rewards') ? b('🎁', t('menuTitle'), () => openMenu(), 'rewards-menu') : null].filter(Boolean) },
        { id: 'alarms', icon: paused ? '🔕' : '🔔', iconId: paused ? 'alarm-pause' : 'alarms', label: paused ? t('pauseResume') : t('tbAlarms'), pressed: paused, run: () => openPauseSheet(draw) }], t('quickTitle')); })(),
      simple ? null : pausedBanner(draw),
      simple ? null : suggestionBelow,
      nowMode ? (settings.simpleMode ? null : h('p', { class: 'muted center' }, t('nowHint'))) : null,
      nowMode ? null : favs.length ? h('section', {}, h('h2', {}, t('favorites')), h('div', { class: 'stack' }, favs.map((x) => card(x, nav)))) : null,
      nowMode ? null : (() => { const sp = splitForToday(templates, new Date().getDay()); return [
        h('section', {}, h('h2', {}, sp.scheduled ? t('today') : t('allRoutines')), sp.today.length ? h('div', { class: 'stack' }, sp.today.map((x) => card(x, nav))) : templates.length ? h('p', { class: 'empty' }, t('noRoutinesToday')) : emptyState('empty-routines', t('noRoutines'))),
        sp.other.length ? h('section', {}, h('h2', {}, t('otherDays')), h('div', { class: 'stack dim' }, sp.other.map((x) => card(x, nav)))) : null]; })(),
      h('p', { class: 'version-line' }, `${t('appName')} v${getVersion() || '?'} · `, h('button', { class: 'btn link', type: 'button', onclick: () => openWhatsNew(nav) }, t('wnLink'))));
  };
  draw();
  S.loadActive().then((r) => { if (r && isActive(r) && S.getTemplate(r.templateId)) { active = r; draw(); tick = setInterval(() => pw?.update(active), 1000); } });
  const off = S.subscribe(draw);
  return () => { alive = false; off(); clearInterval(tick); };
}

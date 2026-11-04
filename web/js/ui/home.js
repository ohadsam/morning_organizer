import { h, fmtHuman, setChildren } from '../util.js';
import { t, units } from '../i18n.js';
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
import { splitForToday } from '../schedule.js';
import { icon, iconBtn, toast, confirmBox, fold } from './common.js';
import { openSearch } from './search.js';
import { runAction } from './actions.js';
import { suggestionCard } from './suggest.js';
import { openShare, openImport } from './share.js';
import { focusCard } from './focus.js';
import { openMenu } from './menu.js';
import { openWhatsNew, getVersion } from './whatsnew.js';
import { dueCard, followUpCard } from './retro.js';
import { openCapture } from './capture.js';
import { openRoutinePicker } from './library.js';
import { alarmSummary } from './alarms.js';
import { needsCheck } from '../cogfun.js';
import { openCheckin } from './goals.js';

function card(tpl, nav) {
  const total = S.totalSec(tpl), simple = S.get().settings.simpleMode;
  return h('article', { class: 'card routine', style: { '--accent': tpl.color } },
    h('button', { class: 'routine-main', type: 'button', onclick: () => nav(simple ? `#/run/${tpl.id}` : `#/edit/${tpl.id}`), 'aria-label': `${simple ? t('start') : t('edit')}: ${tpl.name}` },
      h('span', { class: 'emoji', 'aria-hidden': 'true' }, tpl.icon),
      h('span', { class: 'routine-text' }, h('strong', {}, tpl.name || t('untitled')),
        h('small', {}, `${t('tasksCount', { n: tpl.tasks.length })} · ${fmtHuman(total, units())}${tpl.from ? ` · ${t('fromParentTag', { name: tpl.from })}` : ''}`), tpl.alarm?.enabled ? h('small', { class: 'alarm-line' }, `⏰ ${alarmSummary(tpl)}`) : null)),
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
      pw.el, h('button', { class: 'btn primary', type: 'button', onclick: () => nav(`#/run/${active.templateId}`) }, icon('play', 18), t('resume')));
  };
  const draw = () => {
    const { templates, settings } = S.get();
    const done = finished(S.myRuns()), days = streak(done), starsN = totalStars(done);
    const awake = isAwakeWanted(), simple = settings.simpleMode, lv = levelInfo(starsN);
    const goals = F.childLinks().filter((l) => l.parent.goal).map((l) => ({ g: l.parent.goal, p: rewardProgress(l.parent.goal, done) }));
    const favs = templates.filter((x) => x.favorite);
    const next = nextAcross(templates), focusEl = simple ? null : focusCard();
    setChildren(root,
      h('div', { class: 'hero' }, h('button', { class: 'hero-buddy', type: 'button', 'aria-label': `${t('switchProfile')}: ${settings.personName || ''}`, onclick: () => openProfiles(nav) }, avatarNode(settings.avatar, { size: 76 })), h('h1', {}, t('appName')), h('p', {}, settings.personName ? t('greetName', { name: settings.personName }) : t('hello')),
        h('div', { class: 'chips' }, days ? h('span', { class: 'chip' }, `🔥 ${t('streakDays', { n: days })}`) : null, starsN ? h('span', { class: 'chip' }, `⭐ ${t('starsTotal', { n: starsN })}`) : null,
          h('span', { class: 'chip', title: lv.next ? t('levelNext', { n: lv.toNext, l: lv.level + 1 }) : '' }, `🏅 ${t('levelLabel', { n: lv.level })}`),
          goals.map(({ g, p }) => h('span', { class: 'chip', title: g.title }, t('goalChip', { emoji: g.emoji, have: p.have, target: p.target }))),
          h('button', { class: `chip btn-chip ${awake ? 'on' : ''}`, type: 'button', 'aria-pressed': String(awake), onclick: async () => { await S.updateSettings({ keepAwakeApp: !awake }); setAwake('app', !awake); draw(); } }, awake ? `☀️ ${t('screenOn')}` : `🌙 ${t('screenOff')}`)),
        next ? h('a', { class: 'chip', href: '#/alarms' }, icon('bell', 16), t('alarmNext', { name: next.template.name, time: next.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })) : null),
      activeCard(),
      focusEl,
      simple ? null : followUpCard(nav, draw) ?? dueCard(nav, draw),
      simple ? null : (() => { const g = S.goals().find((x) => needsCheck(x)); return g ? h('section', { class: 'card focus-card' }, h('strong', {}, `🎯 ${t('checkDue')}`), h('p', {}, g.title), h('button', { class: 'btn primary', type: 'button', onclick: () => openCheckin(g, draw) }, `✔ ${t('checkTitle')}`)) : null; })(),
      simple ? null : h('button', { class: 'home-search', type: 'button', 'aria-haspopup': 'dialog', onclick: () => openSearch(nav) }, h('span', { 'aria-hidden': 'true' }, '🔍'), h('span', {}, t('homeSearch'))),
      simple ? null : h('div', { class: 'toolbar' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => runAction('newRoutine', nav) }, icon('plus', 18), t('newRoutine')),
        h('button', { class: 'btn', type: 'button', onclick: () => runAction('wizard', nav) }, `🪄 ${t('homeWizard')}`)),
      simple || focusEl ? null : suggestionCard(nav, draw),
      simple ? null : (() => { const f = S.features(); return fold(t('homeMore'), t('homeMoreSub'), h('div', { class: 'quick', role: 'group', 'aria-label': t('quickTitle') },
        h('button', { class: 'btn', type: 'button', onclick: () => nav('#/alarms') }, `⏰ ${t('alarmsTitle')}`),
        h('button', { class: 'btn', type: 'button', onclick: () => nav('#/goals') }, `🎯 ${t('goalsTitle')}`),
        h('button', { class: 'btn', type: 'button', onclick: () => nav('#/retros') }, `🔄 ${t('rcvTitle')}`),
        f.calmCorner ? h('button', { class: 'btn', type: 'button', onclick: () => nav('#/calm') }, `🌬️ ${t('calmTitle')}`) : null,
        f.journal ? h('button', { class: 'btn', type: 'button', onclick: () => nav('#/journal') }, `📓 ${t('journal')}`) : null,
        f.journal ? h('button', { class: 'btn', type: 'button', onclick: () => openCapture({}) }, `🎙️ ${t('jQuick')}`) : null,
        f.rewardMenu ? h('button', { class: 'btn', type: 'button', onclick: () => openMenu() }, `🎁 ${t('menuTitle')}`) : null,
        h('button', { class: 'btn', type: 'button', onclick: () => openRoutinePicker(nav) }, `📚 ${t('libFromTemplate')}`),
        h('button', { class: 'btn', type: 'button', onclick: () => nav('#/library') }, `⚙️ ${t('libManage')}`),
        h('button', { class: 'btn', type: 'button', onclick: () => openImport() }, icon('download', 18), t('import')))).el; })(),
      favs.length ? h('section', {}, h('h2', {}, t('favorites')), h('div', { class: 'stack' }, favs.map((x) => card(x, nav)))) : null,
      (() => { const sp = splitForToday(templates, new Date().getDay()); return [
        h('section', {}, h('h2', {}, sp.scheduled ? t('today') : t('allRoutines')), sp.today.length ? h('div', { class: 'stack' }, sp.today.map((x) => card(x, nav))) : h('p', { class: 'empty' }, templates.length ? t('noRoutinesToday') : t('noRoutines'))),
        sp.other.length ? h('section', {}, h('h2', {}, t('otherDays')), h('div', { class: 'stack dim' }, sp.other.map((x) => card(x, nav)))) : null]; })(),
      h('p', { class: 'version-line' }, `${t('appName')} v${getVersion() || '?'} · `, h('button', { class: 'btn link', type: 'button', onclick: () => openWhatsNew(nav) }, t('wnLink'))));
  };
  draw();
  S.loadActive().then((r) => { if (r && isActive(r) && S.getTemplate(r.templateId)) { active = r; draw(); tick = setInterval(() => pw?.update(active), 1000); } });
  const off = S.subscribe(draw);
  return () => { off(); clearInterval(tick); };
}

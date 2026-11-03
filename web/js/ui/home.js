import { h, fmtHuman, setChildren } from '../util.js';
import { t, units } from '../i18n.js';
import * as S from '../store.js';
import { nextAcross } from '../alarms.js';
import { streak, totalStars, finished } from '../stats.js';
import { setAwake, isAwakeWanted } from '../awake.js';
import { progressWidget } from './progress.js';
import { isActive } from '../engine.js';
import { icon, iconBtn, toast, confirmBox } from './common.js';
import { openShare, openImport } from './share.js';

function card(tpl, nav) {
  const total = S.totalSec(tpl);
  return h('article', { class: 'card routine', style: { '--accent': tpl.color } },
    h('button', { class: 'routine-main', type: 'button', onclick: () => nav(`#/edit/${tpl.id}`), 'aria-label': `${t('edit')}: ${tpl.name}` },
      h('span', { class: 'emoji', 'aria-hidden': 'true' }, tpl.icon),
      h('span', { class: 'routine-text' }, h('strong', {}, tpl.name || t('untitled')),
        h('small', {}, `${t('tasksCount', { n: tpl.tasks.length })} · ${fmtHuman(total, units())}`))),
    h('div', { class: 'routine-actions' },
      iconBtn('star', tpl.favorite ? t('unfavorite') : t('favorite'), () => S.toggleFavorite(tpl.id), tpl.favorite ? 'fav on' : 'fav'),
      iconBtn('share', t('share'), () => openShare(tpl)),
      iconBtn('copy', t('duplicate'), async () => { try { await S.duplicateTemplate(tpl.id); toast(t('saved')); } catch { toast(t('error')); } }),
      iconBtn('trash', t('delete'), async () => { if (await confirmBox(t('confirmDelete', { name: tpl.name }), t('delete'), true)) { await S.deleteTemplate(tpl.id); toast(t('deleted')); } }),
      h('button', { class: 'btn primary start', type: 'button', disabled: !tpl.tasks.length, onclick: () => nav(`#/run/${tpl.id}`) }, icon('play', 18), t('start'))));
}

export function renderHome(root, nav) {
  let active = null, pw = null, tick = null;
  const activeCard = () => {
    if (!active) return null;
    const { settings } = S.get();
    pw = progressWidget(active, { mascot: settings.mascot, compact: true });
    return h('section', { class: 'card active-run', style: { '--accent': active.color || '#6c5ce7' } },
      h('div', { class: 'row between' }, h('strong', {}, `${active.icon} ${t('continueRun', { name: active.templateName })}`), h('span', { class: 'chip solid' }, t('activeRun'))),
      pw.el, h('button', { class: 'btn primary', type: 'button', onclick: () => nav(`#/run/${active.templateId}`) }, icon('play', 18), t('resume')));
  };
  const draw = () => {
    const { templates, runs, settings } = S.get();
    const done = finished(runs), days = streak(done), starsN = totalStars(done);
    const awake = isAwakeWanted();
    const favs = templates.filter((x) => x.favorite);
    const next = nextAcross(templates);
    setChildren(root,
      h('div', { class: 'hero' }, h('span', { class: 'hero-buddy', 'aria-hidden': 'true' }, settings.mascot), h('h1', {}, t('appName')), h('p', {}, settings.personName ? t('greetName', { name: settings.personName }) : t('hello')),
        h('div', { class: 'chips' }, days ? h('span', { class: 'chip' }, `🔥 ${t('streakDays', { n: days })}`) : null, starsN ? h('span', { class: 'chip' }, `⭐ ${t('starsTotal', { n: starsN })}`) : null,
          h('button', { class: `chip btn-chip ${awake ? 'on' : ''}`, type: 'button', 'aria-pressed': String(awake), onclick: async () => { await S.updateSettings({ keepAwakeApp: !awake }); setAwake('app', !awake); draw(); } }, awake ? `☀️ ${t('screenOn')}` : `🌙 ${t('screenOff')}`)),
        next ? h('p', { class: 'chip' }, icon('bell', 16), t('alarmNext', { name: next.template.name, time: next.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })) : null),
      activeCard(),
      h('div', { class: 'toolbar' },
        h('button', { class: 'btn primary', type: 'button', onclick: async () => { try { const x = S.newTemplate(t('untitled')); await S.saveTemplate(x); nav(`#/edit/${x.id}`); } catch { toast(t('error')); } } }, icon('plus', 18), t('newRoutine')),
        h('button', { class: 'btn', type: 'button', onclick: () => openImport() }, icon('download', 18), t('import'))),
      favs.length ? h('section', {}, h('h2', {}, t('favorites')), h('div', { class: 'stack' }, favs.map((x) => card(x, nav)))) : null,
      h('section', {}, h('h2', {}, t('allRoutines')),
        templates.length ? h('div', { class: 'stack' }, templates.map((x) => card(x, nav))) : h('p', { class: 'empty' }, t('noRoutines'))));
  };
  draw();
  S.loadActive().then((r) => { if (r && isActive(r) && S.getTemplate(r.templateId)) { active = r; draw(); tick = setInterval(() => pw?.update(active), 1000); } });
  const off = S.subscribe(draw);
  return () => { off(); clearInterval(tick); };
}

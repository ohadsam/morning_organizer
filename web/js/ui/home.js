import { h, fmtHuman, setChildren } from '../util.js';
import { t, units } from '../i18n.js';
import * as S from '../store.js';
import { nextAcross } from '../alarms.js';
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
  const draw = () => {
    const { templates } = S.get();
    const favs = templates.filter((x) => x.favorite);
    const next = nextAcross(templates);
    setChildren(root,
      h('div', { class: 'hero' }, h('h1', {}, t('appName')), h('p', {}, t('hello')),
        next ? h('p', { class: 'chip' }, icon('bell', 16), t('alarmNext', { name: next.template.name, time: next.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })) : null),
      h('div', { class: 'toolbar' },
        h('button', { class: 'btn primary', type: 'button', onclick: async () => { try { const x = S.newTemplate(t('untitled')); await S.saveTemplate(x); nav(`#/edit/${x.id}`); } catch { toast(t('error')); } } }, icon('plus', 18), t('newRoutine')),
        h('button', { class: 'btn', type: 'button', onclick: () => openImport() }, icon('download', 18), t('import'))),
      favs.length ? h('section', {}, h('h2', {}, t('favorites')), h('div', { class: 'stack' }, favs.map((x) => card(x, nav)))) : null,
      h('section', {}, h('h2', {}, t('allRoutines')),
        templates.length ? h('div', { class: 'stack' }, templates.map((x) => card(x, nav))) : h('p', { class: 'empty' }, t('noRoutines'))));
  };
  draw();
  return S.subscribe(draw);
}

// The Alarms screen: every routine with its wake-up alarm in one place - switch on/off, see the schedule, edit the whole chain.
import { h, setChildren, debounce } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { schedule, normalizeAlarm } from '../wake.js';
import { alarmEditor } from './alarmEditor.js';
import { modal } from './common.js';

/** One-line summary: "07:00 → 07:15 → 07:20 · offers to start" (or off). */
export function alarmSummary(tpl) {
  const a = normalizeAlarm(tpl.alarm); if (!a.enabled) return t('alarmOff');
  return `${schedule(a).join(' → ')} · ${t(a.startMode === 'auto' ? 'alarmAutoShort' : 'alarmOfferShort')}`;
}

/** The editor in a sheet. Works on a copy; saved as you go. */
export function openAlarmSheet(tplId, onClose) {
  const tpl = structuredClone(S.getTemplate(tplId)); if (!tpl) return;
  const save = debounce(() => S.saveTemplate(tpl), 300), ed = alarmEditor(tpl, save);
  const m = modal(`⏰ ${tpl.icon} ${tpl.name}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('alarmsIntro')), ed.el), [{ label: t('libDone'), primary: true }]);
  m.el.addEventListener('close', () => { save.flush(); onClose?.(); });
  return m;
}

export function renderAlarms(root, nav) {
  const draw = () => {
    const templates = S.myTemplates(), any = templates.some((x) => x.alarm?.enabled);
    setChildren(root, h('div', { class: 'row between' }, h('h1', {}, `⏰ ${t('alarmsTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav('#/') }, t('back'))),
      h('p', { class: 'note' }, t('alarmsIntro')), any ? null : h('p', { class: 'chip solid' }, t('alarmsNone')),
      h('div', { class: 'stack' }, templates.map((x) => h('article', { class: 'card alarm-card', style: { '--accent': x.color } },
        h('div', { class: 'row between' }, h('span', { class: 'row' }, h('span', { class: 'emoji', 'aria-hidden': 'true' }, x.icon), h('span', { class: 'routine-text' }, h('strong', {}, x.name), h('small', {}, alarmSummary(x)))),
          h('label', { class: 'switch row' }, h("span", { class: "sr-only" }, `${t('alarmEnable')}: ${x.name}`), h('input', { type: 'checkbox', checked: !!x.alarm?.enabled, 'aria-label': `${t('alarmEnable')}: ${x.name}`, onchange: async (e) => { await S.saveTemplate({ ...x, alarm: { ...normalizeAlarm(x.alarm), enabled: e.target.checked } }); } }))),
        h('button', { class: 'btn small', type: 'button', onclick: () => openAlarmSheet(x.id) }, `⚙️ ${t(x.alarm?.enabled ? 'alarmEditBtn' : 'alarmSetBtn')}`)))));
  };
  draw(); const off = S.subscribe(draw);
  return () => off();
}

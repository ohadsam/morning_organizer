// "What would you like help with?": pick areas, each switches on helpers (focus.js). Used by the person themself and by a parent for a child.
import { h, setChildren } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { AREAS, AREA_EMOJI, TOOLS, toolsFor } from '../focus.js';
import { modal, toast } from './common.js';

/** onSave({ areas, tools }) ; tools = only the helpers the person switched away from the default. */
export function openFocusPicker({ areas = [], tools = {}, title = t('focusTitle'), intro = t('focusIntro'), onSave }) {
  const sel = new Set(areas), ov = { ...tools };
  const toolBox = h('div', { class: 'stack' });
  const drawTools = () => {
    const eff = toolsFor([...sel], ov), base = toolsFor([...sel], {});
    setChildren(toolBox, TOOLS.map((k) => h('label', { class: 'switch row' }, h('span', {}, `${t(`tool_${k}`)}`, h('small', { class: 'hint' }, t(`toolD_${k}`))),
      h('input', { type: 'checkbox', checked: eff[k], onchange: (e) => { if (e.target.checked === base[k]) delete ov[k]; else ov[k] = e.target.checked; } }))));
  };
  const boxes = AREAS.map((a) => h('label', { class: 'area-pick' }, h('input', { type: 'checkbox', checked: sel.has(a), onchange: (e) => { if (e.target.checked) sel.add(a); else sel.delete(a); drawTools(); } }),
    h('span', { class: 'area-body' }, h('strong', {}, `${AREA_EMOJI[a]} ${t(`area_${a}`)}`), h('small', {}, t(`areaD_${a}`)))));
  drawTools();
  return modal(`🎯 ${title}`, h('div', { class: 'stack' }, h('p', {}, intro), h('div', { class: 'area-grid' }, boxes), h('details', { class: 'card' }, h('summary', {}, t('focusFine')), toolBox)),
    [{ label: t('cancel') }, { label: t('save'), primary: true, fn: async () => { await onSave({ areas: [...sel], tools: { ...ov } }); } }]);
}

/** For the active person. */
export function openMyFocus(after) {
  const p = S.activeProfile();
  return openFocusPicker({ areas: p.focus, tools: p.tools, onSave: async ({ areas, tools }) => { await S.patchProfile(p.id, { focus: areas, focusSet: true, tools }); toast(t('focusSaved')); after?.(); } });
}

/** A gentle card on the home screen until the person (or their parent) has chosen. */
export function focusCard() {
  const p = S.activeProfile(); if (p.focusSet) return null;
  return h('section', { class: 'card focus-card' }, h('strong', {}, `🎯 ${t('focusTitle')}`), h('p', {}, t('focusCardHint')),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: () => openMyFocus() }, t('focusChoose')),
      h('button', { class: 'btn', type: 'button', onclick: () => S.patchProfile(p.id, { focusSet: true }) }, t('focusLater'))));
}

// The avatar studio: build your own avatar from parts and colours, watch it move, save it to "My avatars", use it, share it.
// A few things at a time: a live preview, two small rows of animations and feelings, one tab of options at a time, then the colours.
import { h, setChildren, uid } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import { sanitizeKit, defaultKit, randomKit, isKit, TABS, ANIM_NAMES, FEELING_NAMES, COLOR_KEYS } from '../avatarKit.js';
import { modal, toast } from './common.js';
import { kitNode, loadPack } from './avatarKit.js';
import { shareAvatar } from './avatarShare.js';

const ANIM_EMOJI = { idle: '🙂', wave: '👋', cheer: '🎉', dance: '💃', sleep: '😴', alert: '😮', think: '🤔', happy: '😊', calm: '😌', sad: '😢', worried: '😟', angry: '😠', tired: '🥱', excited: '🤩', proud: '🏅' };
const TAB_EMOJI = { face: '🙂', hair: '💇', eyes: '👀', clothes: '👕', extras: '🕶️', buddy: '🐾', colors: '🎨' };

/**
 * opts: { avatar (the design to start from), id (a saved design being edited), name, lvl (the person's level: what is unlocked),
 * onUse(kit) (called by "Use as my avatar"), onSaved(item) }. Resolves to the sheet, or null when the parts could not be loaded.
 */
export async function openAvatarStudio({ avatar, id = null, name = '', lvl = 1, onUse, onSaved } = {}) {
  const pack = await loadPack(); if (!pack) { toast(t('avkNoPack')); return null; }
  let kit = isKit(avatar) ? sanitizeKit(avatar) : defaultKit(), tab = 'face', anim = 'idle', savedId = id, nm = name;
  const lang = () => (getLang() === 'he' ? 'he' : 'en');
  const preview = h('div', { class: 'studio-preview' }), animRow = h('div', { class: 'chips filter anim-strip', role: 'group', 'aria-label': t('avatarAnim') }), feelRow = h('div', { class: 'chips filter anim-strip', role: 'group', 'aria-label': t('avkFeelings') });
  const tabsEl = h('div', { class: 'studio-tabs', role: 'tablist', 'aria-label': t('avkTitle') }), panel = h('div', { class: 'studio-panel', role: 'tabpanel' });
  let big = null;
  const status = h('p', { class: 'note', role: 'status', 'aria-live': 'polite' }), say = (m) => { status.textContent = m; };   // a toast would sit behind the sheet
  const paintPreview = () => { if (big) big._kitUpdate(kit); else { big = kitNode(kit, { size: 130, anim }); big.setAttribute('role', 'img'); big.setAttribute('aria-label', t('avatar')); setChildren(preview, big); } };
  const chip = (n) => h('button', { type: 'button', class: `chip btn-chip ${anim === n ? 'on' : ''}`, 'aria-pressed': String(anim === n), 'aria-label': t(`avkAnim_${n}`), title: t(`avkAnim_${n}`), onclick: () => { anim = n; big._kitSet(n); paintChips(); } }, ANIM_EMOJI[n]);
  const paintChips = () => { setChildren(animRow, ANIM_NAMES.map(chip)); setChildren(feelRow, FEELING_NAMES.map(chip)); };
  const set = (slot, optId) => { kit = sanitizeKit({ ...kit, p: { ...kit.p, [slot]: optId } }); paintPreview(); paintPanel(); };
  const tile = (slot, o) => {
    const locked = o.unlock > lvl, on = kit.p[slot] === o.id, label = o.name[lang()];
    return h('button', { type: 'button', class: `opt-tile ${on ? 'on' : ''} ${locked ? 'locked' : ''}`, 'aria-pressed': String(on), disabled: locked, 'aria-label': `${label}${locked ? `, ${t('avkLocked', { n: o.unlock })}` : ''}`, onclick: () => set(slot, o.id) },
      kitNode({ ...kit, p: { ...kit.p, [slot]: o.id } }, { size: 60, anim: 'none' }), h('small', {}, label), locked ? h('span', { class: 'opt-lock', 'aria-hidden': 'true' }, `🔒 ${o.unlock}`) : null);
  };
  function paintPanel() {
    if (tab === 'colors') {
      setChildren(panel, COLOR_KEYS.map((k) => h('div', { class: 'stack', role: 'group', 'aria-label': t(`avkColor_${k}`) }, h('span', { class: 'lbl' }, t(`avkColor_${k}`)),
        h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t(`avkColor_${k}`) }, pack.palettes[k].map((c) => h('button', { type: 'button', class: `swatch ${kit.c[k] === c ? 'on' : ''}`, role: 'radio', 'aria-checked': String(kit.c[k] === c), 'aria-label': c, style: { '--c': c },
          onclick: () => { kit = sanitizeKit({ ...kit, c: { ...kit.c, [k]: c } }); paintPreview(); paintPanel(); } }))))));
      return;
    }
    const slots = TABS.find(([id]) => id === tab)[1];
    setChildren(panel, slots.map((slot) => h('section', { class: 'stack' }, h('h3', {}, t(`avkSlot_${slot}`)), h('div', { class: 'opt-grid' }, pack.slots[slot].options.map((o) => tile(slot, o))))));
  }
  const paintTabs = () => setChildren(tabsEl, [...TABS.map(([id]) => id), 'colors'].map((id) => h('button', { type: 'button', role: 'tab', class: `chip btn-chip ${tab === id ? 'on' : ''}`, 'aria-selected': String(tab === id), onclick: () => { tab = id; paintTabs(); paintPanel(); } }, `${TAB_EMOJI[id]} ${t(`avkTab_${id}`)}`)));
  const nameIn = h('input', { type: 'text', maxLength: 30, value: nm, placeholder: t('avkNamePh'), 'aria-label': t('avkName'), oninput: (e) => { nm = e.target.value; } });
  const save = async () => {
    const item = { id: savedId || uid(), name: nm.trim() || t('avkUntitled'), avatar: kit, at: Date.now() };
    if (!(await S.saveAvatarDesign(item))) { say(t('avkFull')); return null; }
    savedId = item.id; onSaved?.(item); return item;
  };
  paintPreview(); paintChips(); paintTabs(); paintPanel();
  return modal(`🎨 ${t('avkTitle')}`, h('div', { class: 'stack studio' },
    h('div', { class: 'studio-head' }, preview, h('div', { class: 'studio-ctl' }, animRow, feelRow,
      h('div', { class: 'row-btns' }, h('button', { class: 'btn small', type: 'button', onclick: () => { kit = randomKit(pack, lvl); paintPreview(); paintPanel(); } }, `🎲 ${t('avkRandom')}`),
        h('button', { class: 'btn small', type: 'button', onclick: () => shareAvatar(kit, nm.trim(), say) }, `📤 ${t('avkShare')}`)))),
    tabsEl, panel, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('avkName')), nameIn), status), [
    { label: t('close') },
    { label: t('avkSave'), fn: async () => { if (await save()) say(t('avkSaved')); return false; } },
    { label: t('avkUse'), primary: true, fn: async () => { if (!(await save())) return false; onUse?.(kit); } }]);
}

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
const PRESETS = {
  boy: { head: 'round', hair: 'short-straight', eyes: 'round', brows: 'straight', cheeks: 'none', outfit: 't-shirt' },
  girl: { head: 'oval', hair: 'long-wavy', eyes: 'big-shiny', brows: 'soft', cheeks: 'blush', outfit: 'dress' },
  neutral: { head: 'round', hair: 'short-curly', eyes: 'dot', brows: 'soft', cheeks: 'blush', outfit: 'hoodie' },
};
const presetKit = (k) => { const d = defaultKit(); return sanitizeKit({ ...d, p: { ...d.p, ...PRESETS[k] } }); };
const TAB_EMOJI = { face: '🙂', hair: '💇', eyes: '👀', clothes: '👕', extras: '🕶️', buddy: '🐾', colors: '🎨' };

/**
 * opts: { avatar (the design to start from), id (a saved design being edited), name, lvl (the person's level: what is unlocked),
 * onUse(kit) (called by "Use as my avatar"), onSaved(item) }. Resolves to the sheet, or null when the parts could not be loaded.
 */
export async function openAvatarStudio({ avatar, id = null, name = '', lvl = 1, onUse, onSaved, wizard } = {}) {
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
  const STEPS = ['start', ...TABS.map(([id]) => id), 'colors', 'finish'];
  let wiz = wizard ?? (!isKit(avatar) && !id), step = 0;
  const body = h('div', { class: 'stack' });
  const goto = (n) => { step = Math.max(0, Math.min(STEPS.length - 1, n)); paintBody(); };
  const modeBtn = () => h('button', { class: 'btn small link', type: 'button', onclick: () => { wiz = !wiz; if (wiz) step = 1; else tab = tab === 'start' || tab === 'finish' ? 'face' : tab; paintBody(); } }, wiz ? `✏️ ${t('avkModeFree')}` : `🧭 ${t('avkModeWiz')}`);
  const nameField = () => h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('avkName')), nameIn);
  function paintBody() {
    big = null;
    if (!wiz) {
      if (tab === 'start' || tab === 'finish') tab = 'face';
      paintChips(); paintTabs(); paintPanel();
      setChildren(body, h('div', { class: 'studio-head' }, preview, h('div', { class: 'studio-ctl' }, animRow, feelRow,
        h('div', { class: 'btn-pair' }, h('button', { class: 'btn small', type: 'button', onclick: () => { kit = randomKit(pack, lvl); paintPreview(); paintPanel(); } }, `🎲 ${t('avkRandom')}`),
          h('button', { class: 'btn small', type: 'button', onclick: () => shareAvatar(kit, nm.trim(), say) }, `📤 ${t('avkShare')}`)), modeBtn())),
        tabsEl, panel, nameField(), status);
      paintPreview(); return;
    }
    const id2 = STEPS[step]; tab = id2;
    const title = id2 === 'start' ? t('avkWizStart') : id2 === 'finish' ? t('avkWizFinish') : id2 === 'colors' ? t('avkTab_colors') : t(`avkTab_${id2}`);
    const nav = h('div', { class: 'btn-pair' }, h('button', { class: 'btn', type: 'button', disabled: step === 0, onclick: () => goto(step - 1) }, `${getLang() === 'he' ? '→' : '←'} ${t('avkBack')}`),
      step < STEPS.length - 1 ? h('button', { class: 'btn primary', type: 'button', onclick: () => goto(step + 1) }, `${t('avkNext')} ${getLang() === 'he' ? '←' : '→'}`) : h('span'));
    let content;
    if (id2 === 'start') {
      content = h('div', { class: 'opt-grid wiz-start', role: 'group', 'aria-label': t('avkWizStart') }, ['girl', 'boy', 'neutral'].map((k) => h('button', { type: 'button', class: 'opt-tile big', onclick: () => { kit = presetKit(k); goto(1); } },
        kitNode(presetKit(k), { size: 84, anim: 'none' }), h('small', {}, t(`avkWiz_${k}`)))));
    } else if (id2 === 'finish') {
      paintChips(); content = h('div', { class: 'stack' }, h('p', { class: 'note' }, t('avkWizDone')), animRow, feelRow, nameField(),
        h('div', { class: 'btn-pair' }, h('button', { class: 'btn small', type: 'button', onclick: () => { kit = randomKit(pack, lvl); paintPreview(); } }, `🎲 ${t('avkRandom')}`), h('button', { class: 'btn small', type: 'button', onclick: () => shareAvatar(kit, nm.trim(), say) }, `📤 ${t('avkShare')}`)));
    } else { paintPanel(); content = panel; }
    setChildren(body, h('div', { class: 'wiz-top' }, preview, h('div', { class: 'stack wiz-info' }, h('p', { class: 'note', id: 'wizStep' }, t('avkStepOf', { n: step + 1, m: STEPS.length }) + (id2 === 'start' || id2 === 'finish' ? '' : ' · ' + title)), h('progress', { max: STEPS.length, value: step + 1, 'aria-label': t('avkStepOf', { n: step + 1, m: STEPS.length }) }), modeBtn())),
      (id2 === 'start' || id2 === 'finish') ? h('h3', { class: 'wiz-title' }, title) : null, content, nav, status);
    paintPreview();
  }
  paintBody();
  return modal(`🎨 ${t('avkTitle')}`, h('div', { class: 'stack studio' }, body), [
    { label: t('close') },
    { label: t('avkSave'), fn: async () => { if (await save()) say(t('avkSaved')); return false; } },
    { label: t('avkUse'), primary: true, fn: async () => { if (!(await save())) return false; onUse?.(kit); } }]);
}

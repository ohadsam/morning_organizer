// Reward menu: things stars can buy. The child sees the menu and asks; a parent can set the menu and mark rewards as given.
import { h, setChildren, uid } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import * as F from '../family.js';
import { totalStars, finished } from '../stats.js';
import { balance, canAfford, sanitizeMenu, MAX_MENU } from '../menu.js';
import { modal, toast, confirmBox } from './common.js';

const EMOJIS = ['🎁', '🍦', '🎮', '📺', '🧸', '🍕', '🎬', '🏊', '📚', '🚲', '🎨', '🛝'];

/** Menu editor shared by the child (own menu) and the parent (child's menu). onSave(menu). */
export function openMenuEditor(menu, onSave, title = t('menuEdit')) {
  let rows = sanitizeMenu(menu).map((x) => ({ ...x }));
  const box = h('div', { class: 'stack' });
  const draw = () => {
    setChildren(box, rows.map((r, i) => h('div', { class: 'menu-row' },
      h('select', { 'aria-label': t('menuEmoji'), onchange: (e) => { r.emoji = e.target.value; } }, EMOJIS.map((e) => h('option', { value: e, selected: e === r.emoji }, e))),
      h('input', { type: 'text', maxLength: 40, value: r.title, 'aria-label': t('menuItem'), onchange: (e) => { r.title = e.target.value; } }),
      h('input', { type: 'number', min: 1, max: 999, value: r.cost, inputMode: 'numeric', 'aria-label': t('menuCost'), onchange: (e) => { r.cost = Number(e.target.value) || 1; } }),
      h('button', { class: 'btn small danger', type: 'button', 'aria-label': t('delete'), onclick: () => { rows.splice(i, 1); draw(); } }, '✕'))),
    rows.length < MAX_MENU ? h('button', { class: 'btn', type: 'button', onclick: () => { rows.push({ id: uid(), title: '', emoji: '🎁', cost: 5 }); draw(); } }, `+ ${t('menuAdd')}`) : null);
  };
  draw();
  return modal(`🎁 ${title}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('menuHint')), box), [{ label: t('cancel') }, { label: t('save'), primary: true, fn: async () => { await onSave(sanitizeMenu(rows)); } }]);
}

export function openMenu() {
  const body = h('div', { class: 'stack' });
  const draw = () => {
    const p = S.activeProfile(), earned = totalStars(finished(S.myRuns())), bal = balance(earned, p.redeemed);
    setChildren(body, h('p', { class: 'chip solid' }, `⭐ ${t('menuBalance', { n: bal })}`),
      p.menu.length ? p.menu.map((it) => h('div', { class: 'card menu-item' }, h('span', {}, `${it.emoji} ${it.title}`), h('span', { class: 'chip' }, `⭐ ${it.cost}`),
        h('button', { class: 'btn small primary', type: 'button', disabled: !canAfford(it, earned, p.redeemed), onclick: async () => {
          if (!(await confirmBox(t('menuConfirm', { title: it.title, n: it.cost }), t('menuGet')))) return;
          const entry = { id: uid(), title: it.title, emoji: it.emoji, cost: it.cost, at: Date.now(), given: false };
          await S.patchProfile(p.id, { redeemed: [...S.activeProfile().redeemed, entry] });
          const sent = await F.sendRedeem(entry); toast(sent.some((r) => r.delivered) ? t('menuAsked') : t('menuShow')); draw(); } }, t('menuGet')))) : h('p', { class: 'empty' }, t('menuEmpty')),
      p.redeemed.length ? h('details', {}, h('summary', {}, t('menuHistory')), h('ul', {}, [...p.redeemed].reverse().slice(0, 15).map((r) => h('li', {}, `${r.emoji} ${r.title} (${r.cost}⭐)${r.given ? ` ✓ ${t('menuGiven')}` : ''}`)))) : null,
      h('button', { class: 'btn', type: 'button', onclick: () => openMenuEditor(p.menu, async (m) => { await S.patchProfile(p.id, { menu: m }); draw(); }) }, `✏️ ${t('menuEdit')}`));
  };
  draw();
  return modal(`🎁 ${t('menuTitle')}`, body, [{ label: t('close'), primary: true }]);
}

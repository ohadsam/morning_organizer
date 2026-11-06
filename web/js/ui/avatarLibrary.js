// "My avatars": the designs saved on this device - use one as your avatar, edit, duplicate, share, delete (with undo), add one from a code.
import { h, setChildren } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { modal, confirmBox } from './common.js';
import { kitNode, loadPack } from './avatarKit.js';
import { openAvatarStudio } from './avatarStudio.js';
import { shareAvatar, openImportAvatar } from './avatarShare.js';
import { defaultKit } from '../avatarKit.js';

/** opts: { lvl, onUse(kit) } - onUse is what "Use" does (the person's avatar, or the avatar being picked). */
export function openMyAvatars({ lvl = 1, onUse } = {}) {
  const list = h('div', { class: 'stack avk-list' }), status = h('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
  const say = (m, undo) => setChildren(status, m, undo ? [' ', h('button', { class: 'btn link', type: 'button', onclick: async () => { await undo(); setChildren(status); draw(); } }, t('undo'))] : null);   // a toast would sit behind the sheet
  const draw = () => {
    const lib = S.avatarLib();
    setChildren(list, lib.length ? lib.map((x) => h('article', { class: 'card av-card' },
      h('div', { class: 'av-card-pic' }, kitNode(x.avatar, { size: 64, anim: 'idle' })), h('div', { class: 'av-card-t' }, h('strong', {}, x.name || t('avkUntitled'))),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn small primary', type: 'button', onclick: () => { onUse?.(x.avatar); m.close(); } }, t('avkUseShort')),
        h('button', { class: 'btn small', type: 'button', onclick: () => openAvatarStudio({ avatar: x.avatar, id: x.id, name: x.name, lvl, onSaved: draw, onUse: (k) => { onUse?.(k); m.close(); } }) }, t('avkEdit'))),
      h('details', { class: 'av-more' }, h('summary', {}, t('avkMore')), h('div', { class: 'row-btns' },
        h('button', { class: 'btn small', type: 'button', onclick: async () => { if (!(await S.duplicateAvatarDesign(x.id, t('avkCopyWord')))) say(t('avkFull')); draw(); } }, `⧉ ${t('avkDuplicate')}`),
        h('button', { class: 'btn small', type: 'button', onclick: () => shareAvatar(x.avatar, x.name, say) }, `📤 ${t('avkShare')}`),
        h('button', { class: 'btn small danger', type: 'button', onclick: async () => { if (await confirmBox(t('avkDeleteConfirm', { name: x.name || t('avkUntitled') }), t('avkDelete'), true)) { const undo = await S.deleteAvatarDesign(x.id); say(t('avkDeleted'), undo); draw(); } } }, `🗑 ${t('avkDelete')}`))))) : h('p', { class: 'empty' }, t('avkEmpty')));
  };
  loadPack(); draw();
  const off = S.subscribe(draw);
  const m = modal(`🧑‍🎨 ${t('avkLibrary')}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('avkLibraryHint')),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: () => openAvatarStudio({ avatar: defaultKit(), lvl, onSaved: draw, onUse: (k) => { onUse?.(k); m.close(); } }) }, `➕ ${t('avkNew')}`),
      h('button', { class: 'btn', type: 'button', onclick: () => openImportAvatar(draw, say) }, `📥 ${t('avkImport')}`)), status, list), [{ label: t('close'), primary: true }]);
  m.el.addEventListener('close', off);
  return m;
}

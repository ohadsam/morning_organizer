// Sharing avatars: a short code (SRAV1...) through the system share sheet (WhatsApp, e-mail...) or the clipboard, and adding one from a pasted code.
import { h, setChildren } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { native } from '../native.js';
import { uid } from '../util.js';
import { encodeKit, decodeKit, sanitizeKit } from '../avatarKit.js';
import { modal, toast } from './common.js';
import { kitNode } from './avatarKit.js';

/** Sends the design as text: the share sheet when there is one, otherwise it is copied. */
export async function shareAvatar(av, name = '', say = toast) {
  const text = `${t('avkShareText', { name: name || t('avkUntitled') })}\n${encodeKit(av, name)}`;
  try {
    if (native.available) { native.share(t('appName'), text); return; }
    if (navigator.share) { await navigator.share({ title: t('appName'), text }); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); say(t('avkCopied')); } catch { say(t('error')); }
}

/** "Add from a code": paste, see the avatar, add it to My avatars. onAdded(item) afterwards. */
export function openImportAvatar(onAdded = () => {}, say = toast) {
  let found = null;
  const input = h('textarea', { rows: 3, class: 'code', placeholder: t('avkPasteHere'), 'aria-label': t('avkPasteHere'), maxLength: 4000, oninput: () => check() });
  const slot = h('div', { class: 'avk-import-preview', role: 'status', 'aria-live': 'polite' }), nameIn = h('input', { type: 'text', maxLength: 30, 'aria-label': t('avkName'), placeholder: t('avkNamePh') });
  function check() {
    found = decodeKit(input.value);
    if (!input.value.trim()) { setChildren(slot); return; }
    setChildren(slot, found ? [kitNode(found.avatar, { size: 96, anim: 'idle' }), h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('avkName')), nameIn)] : h('p', { class: 'note err' }, t('avkBadCode')));
    if (found) nameIn.value = found.name || '';
  }
  return modal(`📥 ${t('avkImport')}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('avkImportHint')), input, slot), [
    { label: t('cancel') },
    { label: t('avkAdd'), primary: true, fn: async () => {
      if (!found) { setChildren(slot, h('p', { class: 'note err' }, t('avkBadCode'))); return false; }
      const item = { id: uid(), name: nameIn.value.trim() || found.name, avatar: sanitizeKit(found.avatar), at: Date.now() };
      if (!(await S.saveAvatarDesign(item))) { setChildren(slot, h('p', { class: 'note err' }, t('avkFull'))); return false; }
      say(t('avkAdded')); onAdded(item);
    } }]);
}

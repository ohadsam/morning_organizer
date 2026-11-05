// "Share SonRise": the Android app or the web app, by WhatsApp, e-mail, the system share sheet, or a copied link.
import { h } from '../util.js';
import { t, getLang } from '../i18n.js';
import { native } from '../native.js';
import { modal, toast } from './common.js';
import { shareLinks, KINDS } from '../appShare.js';

export function openShareApp() {
  const lang = getLang();
  const block = (kind) => {
    const l = shareLinks(kind, lang), link = (href, label) => h('a', { class: 'btn', href, target: '_blank', rel: 'noopener' }, label);
    const more = async () => { try { if (native.available) native.share(l.subject, l.text); else if (navigator.share) await navigator.share({ title: l.subject, text: l.text }); else { await navigator.clipboard.writeText(l.text); toast(t('linkCopied')); } } catch { /* cancelled */ } };
    const copy = async () => { try { await navigator.clipboard.writeText(l.text); toast(t('linkCopied')); } catch { toast(t('error')); } };
    return h('section', { class: 'card stack', 'aria-label': t(`shareApp_${kind}`) }, h('strong', {}, `${kind === 'android' ? '📱' : '🌐'} ${t(`shareApp_${kind}`)}`), h('small', { class: 'hint' }, t(`shareApp_${kind}_hint`)),
      h('div', { class: 'row-btns' }, link(l.whatsapp, `💬 ${t('shareAppWa')}`), link(l.mail, `✉️ ${t('shareAppMail')}`), h('button', { class: 'btn', type: 'button', onclick: more }, `↗ ${t('shareAppMore')}`), h('button', { class: 'btn', type: 'button', onclick: copy }, `🔗 ${t('shareAppCopy')}`)));
  };
  return modal(`📣 ${t('shareApp')}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('shareAppHint')), KINDS.map(block)), [{ label: t('close') }]);
}

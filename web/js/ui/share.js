// Sharing without a server: a copy-pasteable code/link, the system share sheet (Bluetooth, Nearby Share, WhatsApp...) and NFC tags.
import { h } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { encode, decode, shareLink, NFC_MIME, extractCode } from '../share.js';
import { LIMITS } from '../config.js';
import { native } from '../native.js';
import { modal, toast } from './common.js';

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast(t('shareCopied')); }
  catch { toast(text.slice(0, 40) + '…'); }
}

export async function importCode(text) {
  const tpl = await decode(text);
  const saved = await S.saveTemplate(tpl);
  toast(t('importOk', { name: saved.name }));
  return saved;
}

export async function openShare(tpl) {
  const code = await encode(tpl), link = shareLink(code);
  const box = h('textarea', { readOnly: true, rows: 4, class: 'code', 'aria-label': t('shareTitle') }, code);
  const nfcSupported = native.available || 'NDEFReader' in globalThis;
  const status = h('p', { class: 'note', 'aria-live': 'polite' });
  let abort = null;
  const m = modal(`${t('shareTitle')}: ${tpl.name}`, h('div', { class: 'stack' }, box,
    h('div', { class: 'toolbar wrap' },
      h('button', { class: 'btn', type: 'button', onclick: () => copy(code) }, t('shareCopy')),
      h('button', { class: 'btn', type: 'button', onclick: () => copy(link) }, t('shareLink')),
      h('button', { class: 'btn primary', type: 'button', onclick: async () => {
        if (native.available) native.share(tpl.name, `${tpl.name}\n${link}`);
        else if (navigator.share) { try { await navigator.share({ title: tpl.name, text: `${tpl.name}\n${link}` }); } catch { /* cancelled */ } } else copy(link);
      } }, t('shareSend')),
      nfcSupported ? h('button', { class: 'btn', type: 'button', onclick: async () => {
        if (code.length > 800) { status.textContent = t('shareTooBig'); return; }
        status.textContent = t('shareNfcTap');
        try {
          if (native.available) native.nfcWrite(code);
          else { abort = new AbortController(); await new globalThis.NDEFReader().write({ records: [{ recordType: 'mime', mediaType: NFC_MIME, data: new TextEncoder().encode(code) }] }, { signal: abort.signal }); status.textContent = t('shareNfcOk'); }
        } catch { status.textContent = t('shareNfcFail'); }
      } }, t('shareNfc')) : null),
    h('p', { class: 'note' }, t('shareBt')), status));
  m.el.addEventListener('close', () => { abort?.abort(); native.nfcCancel(); });
  const off = (e) => { if (e.detail?.type === 'nfc') status.textContent = e.detail.status === 'ok' ? t('shareNfcOk') : t('shareNfcFail'); };
  globalThis.addEventListener('morning-native', off);
  m.el.addEventListener('close', () => globalThis.removeEventListener('morning-native', off));
}

export function openImport(prefill = '') {
  const input = h('textarea', { rows: 4, class: 'code', placeholder: t('pasteHere'), 'aria-label': t('pasteHere'), maxLength: LIMITS.maxShareChars }, prefill);
  const msg = h('p', { class: 'note', role: 'status' }, t('importHint'));
  const doImport = async () => {
    try { await importCode(input.value); m.close(); } catch (e) { msg.textContent = e.message === 'limit' ? t('error') : t('importBad'); msg.classList.add('err'); }
  };
  const file = h('input', { type: 'file', accept: '.txt,.json,text/plain', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f || f.size > LIMITS.maxShareChars) return;
    input.value = await f.text();
  } });
  const nfcRead = 'NDEFReader' in globalThis ? h('button', { class: 'btn', type: 'button', onclick: async () => {
    try {
      const r = new globalThis.NDEFReader(); msg.textContent = t('shareNfcTap'); await r.scan();
      r.onreading = ({ message }) => { const rec = message.records.find((x) => x.mediaType === NFC_MIME || x.recordType === 'text'); if (rec) { input.value = new TextDecoder().decode(rec.data); doImport(); } };
    } catch { msg.textContent = t('shareNfcFail'); }
  } }, t('shareNfcRead')) : null;
  const m = modal(t('importTitle'), h('div', { class: 'stack' }, input, h('div', { class: 'toolbar wrap' }, h('button', { class: 'btn', type: 'button', onclick: () => file.click() }, t('fileImport')), nfcRead), file, msg),
    [{ label: t('importBtn'), primary: true, fn: async () => { if (!extractCode(input.value)) { msg.textContent = t('importBad'); msg.classList.add('err'); return false; } await doImport(); return false; } }]);
  return m;
}

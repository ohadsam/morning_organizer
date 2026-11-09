// Manual sync between the website (PWA) and the Android app: export a file / sync code, import by file, paste or share.
import { h } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { packBackup, readBackupText } from '../share.js';
import { native } from '../native.js';
import { LIMITS } from '../config.js';
import { modal, toast, confirmBox } from './common.js';

const stamp = () => new Date().toISOString().slice(0, 10);

export function saveBackupFile() {
  try { localStorage.setItem('mo.lastBackup', String(Date.now())); } catch { /* blocked */ }
  const json = S.exportAll(), name = `morning-organizer-${stamp()}.json`;
  if (native.available) { native.saveFile(name, json); return; } // WebView can't download blobs: use the system "save as" picker
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); toast(t('savedFile'));
}
export async function copySyncCode() {
  try { localStorage.setItem('mo.lastBackup', String(Date.now())); } catch { /* blocked */ }
  const code = await packBackup(S.exportAll());
  try { await navigator.clipboard.writeText(code); toast(t('shareCopied')); } catch { toast(t('error')); }
}
export async function sendSyncCode() {
  const code = await packBackup(S.exportAll());
  if (code.length > 200_000) { toast(t('syncTooBig')); return; }
  if (native.available) native.share(t('appName'), code);
  else if (navigator.share) { try { await navigator.share({ title: t('appName'), text: code }); } catch { /* cancelled */ } } else await copySyncCode();
}

export function openBackupImport(prefill = '') {
  const input = h('textarea', { rows: 4, class: 'code', placeholder: t('pasteHere'), 'aria-label': t('pasteHere') }, prefill);
  const msg = h('p', { class: 'note', role: 'status' }, t('importBackupHint'));
  const radio = (v, label, on) => h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'bk-mode', value: v, checked: on }), h('span', {}, label));
  const withSettings = h('input', { type: 'checkbox', checked: true });
  const file = h('input', { type: 'file', accept: '.json,.txt,application/json,text/plain', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f || f.size > 32 * 1024 * 1024) return; input.value = await f.text(); e.target.value = '';
  } });
  const m = modal(t('importBackupTitle'), h('div', { class: 'stack' }, input,
    h('div', { class: 'toolbar' }, h('button', { class: 'btn', type: 'button', onclick: () => file.click() }, t('fileImport'))), file,
    h('div', { class: 'stack' }, radio('merge', t('modeMerge'), true), radio('replace', t('modeReplace'), false), h('label', { class: 'switch row' }, h('span', {}, t('withSettings')), withSettings)), msg),
  [{ label: t('importBtn'), primary: true, fn: async () => {
    const mode = m.el.querySelector('input[name=bk-mode]:checked').value;
    try {
      const json = await readBackupText(input.value);
      if (mode === 'replace' && !(await confirmBox(t('replaceConfirm'), t('modeReplace'), true))) return false;
      const r = await S.importBackup(json, { mode, settings: withSettings.checked });
      toast(t('importSummary', { a: r.added, u: r.updated, s: r.skipped, r: r.runs }));
      if (r.reload) setTimeout(() => location.reload(), 900);
    } catch (e) { msg.textContent = t('importBad'); msg.classList.add('err'); return false; }
  } }]);
  return m;
}

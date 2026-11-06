// "Share and move routines": copy routines to another person on this device, save them to a file (or send it), and bring routines in from a file.
// Three calm sections in one sheet; the list of routines you pick from is shared by the first two.
import { h, setChildren } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { native } from '../native.js';
import { modal, toast, fold } from './common.js';
import { buildExport, toJson, fileName, parseFile, prepare, MAX_FILE_CHARS } from '../routineIO.js';

async function saveFile(name, text) {
  if (native.available) { native.saveFile(name, text); return true; }   // the WebView cannot download blobs: the system "save as" picker
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; }   // WhatsApp, e-mail...
  } catch (e) { if (e?.name === 'AbortError') return false; }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); return true;
}
const personName = (p) => p.name || t('untitledProfile');

/** Checkbox list of routines. -> { el, chosen() } */
function routinePicker(list, { checked = false } = {}) {
  const boxes = list.map((x) => ({ x, cb: h('input', { type: 'checkbox', checked }) }));
  const all = h('input', { type: 'checkbox', checked, onchange: (e) => boxes.forEach((b) => { b.cb.checked = e.target.checked; }) });
  const el = h('div', { class: 'stack rio-list' }, list.length > 1 ? h('label', { class: 'rio-all' }, all, h('strong', {}, t('rioAll'))) : null,
    boxes.map(({ x, cb }) => h('label', { class: 'rio-row' }, cb, h('span', { 'aria-hidden': 'true' }, x.icon), h('span', {}, x.name || t('newRoutine')), h('small', { class: 'hint' }, t('rioTasks', { n: x.tasks.length })))));
  return { el, chosen: () => boxes.filter((b) => b.cb.checked).map((b) => b.x) };
}

export function openRoutineIO() {
  const mine = S.myTemplates(), me = S.activeProfile(), others = S.profiles().filter((p) => p.id !== me.id);
  const msg = h('p', { class: 'note', role: 'status', 'aria-live': 'polite' }, '');
  const say = (key, p) => { msg.textContent = t(key, p); };
  const pick = routinePicker(mine);
  const need = () => { const c = pick.chosen(); if (!c.length) { say('rioPickSome'); return null; } return c; };

  // 1. copy to another person on this device
  const target = h('select', { 'aria-label': t('rioCopyTo') }, others.map((p) => h('option', { value: p.id }, personName(p))));
  const copyBox = others.length ? h('div', { class: 'stack' }, h('p', { class: 'note' }, t('rioCopyHint')),
    h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('rioCopyTo')), target),
      h('button', { class: 'btn primary', type: 'button', onclick: async () => {
        const c = need(); if (!c) return; let n = 0;
        try { for (const x of c) { await S.saveTemplate(prepare(x, S.normalizeTemplate, { owners: [target.value] })); n++; } } catch { say('error'); return; }
        const p = S.profiles().find((q) => q.id === target.value); toast(t('rioCopied', { n, name: personName(p) })); say('rioCopied', { n, name: personName(p) });
      } }, `👥 ${t('rioCopyBtn')}`))) : h('p', { class: 'note' }, t('rioNoOthers'));

  // 2. export to a file / send it
  const exportBox = h('div', { class: 'stack' }, h('p', { class: 'note' }, t('rioExportHint')),
    h('button', { class: 'btn primary', type: 'button', onclick: async () => {
      const c = need(); if (!c) return; const ok = await saveFile(fileName(c.length), toJson(buildExport(c))); if (ok) { toast(t('rioSaved')); say('rioSaved'); }
    } }, `📤 ${t(native.available || navigator.canShare ? 'rioSend' : 'rioSave')}`));

  // 3. import from a file
  const importBox = h('div', { class: 'stack' }), who = h('select', { 'aria-label': t('rioWho') }, h('option', { value: 'all' }, t('whoEveryone')), h('option', { value: me.id }, t('rioOnlyMe', { name: personName(me) })), others.map((p) => h('option', { value: p.id }, t('rioOnlyMe', { name: personName(p) }))));
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', 'aria-label': t('rioChooseFile'), onchange: async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    if (f.size > MAX_FILE_CHARS) { say('rioBad'); return; }
    let parsed; try { parsed = parseFile(await f.text()); } catch { say('rioBad'); return; }
    const found = parsed.routines.map((x) => S.normalizeTemplate({ ...x, id: undefined })), ip = routinePicker(found, { checked: true });
    setChildren(importBox, h('p', { class: 'note' }, t('rioFound', { n: found.length })), ip.el, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('rioWho')), who), h('small', { class: 'hint' }, t('rioAlarmsOff')),
      h('button', { class: 'btn primary', type: 'button', onclick: async () => {
        const chosen = ip.chosen(); if (!chosen.length) { say('rioPickSome'); return; } let n = 0;
        try { for (const x of chosen) { await S.saveTemplate(prepare(x, S.normalizeTemplate, { owners: who.value === 'all' ? [] : [who.value] })); n++; } } catch { say('error'); return; }
        toast(t('rioImported', { n })); say('rioImported', { n }); setChildren(importBox, h('p', { class: 'chip solid' }, t('rioImported', { n })));
      } }, `📥 ${t('rioImportBtn')}`));
  } });
  setChildren(importBox, h('p', { class: 'note' }, t('rioImportHint')), fileIn);

  const body = h('div', { class: 'stack' }, h('p', { class: 'note' }, t('rioIntro')),
    h('h3', {}, t('rioPick')), pick.el,
    fold(`👥 ${t('rioCopyTitle')}`, others.length ? t('rioCopySub') : t('rioNoOthers'), copyBox).el,
    fold(`📤 ${t('rioExportTitle')}`, t('rioExportSub'), exportBox).el,
    fold(`📥 ${t('rioImportTitle')}`, t('rioImportSub'), importBox).el, msg);
  return modal(`🔁 ${t('rioTitle')}`, body, [{ label: t('close'), primary: true }]);
}

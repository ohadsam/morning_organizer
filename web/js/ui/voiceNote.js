// The two voice tools for a short note: dictation (speech to text, appended to the note) and a recorded voice note (kept with the entry, this device only).
// Same consent step and phone-or-browser behaviour as the journal's quick note (see capture.js).
import { h, setChildren, fmtDur } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import { recorderSupported, startRecording } from '../recorder.js';
import { dictationSupported, startDictation } from '../dictation.js';
import { askTranscribeConsent } from './capture.js';

/** -> { node, audio() -> { blob, sec } | null, stopAll() -> Promise, cleanup() }. onText(text) is called when a dictation ends with what was heard. */
export function voiceNote({ onText = () => {} } = {}) {
  let rec = null, dict = null, blob = null, sec = 0, tick = null, t0 = 0, heard = '';
  const status = h('p', { class: 'note', role: 'status' }, ''), timer = h('strong', { class: 'rec-time', 'aria-hidden': 'true' }, '');
  const dictBtn = h('button', { class: 'btn', type: 'button' }), recBtn = h('button', { class: 'btn', type: 'button' });
  const paint = () => {
    setChildren(recBtn, rec ? `⏹ ${t('jStopRec')}` : blob ? `🎙️ ${t('jRerecord')}` : `🎙️ ${t('jRecord')}`); recBtn.classList.toggle('danger', !!rec);
    setChildren(dictBtn, dict ? `⏹ ${t('jStopDict')}` : `🗣️ ${t('jDictate')}`); dictBtn.hidden = !dictationSupported() || !!rec; recBtn.hidden = !recorderSupported() || !!dict;
  };
  async function toggleDictation() {
    if (dict) { dict.stop(); return; }
    if (!S.get().settings.transcribe && !(await askTranscribeConsent())) return;
    heard = ''; status.textContent = t('jListening');
    dict = startDictation(getLang(), { onText: (fin, interim) => { heard = `${fin}${interim ? ` ${interim}` : ''}`.trim(); },
      onEnd: (why) => { dict = null; status.textContent = why === 'denied' ? t('jMicDenied') : why === 'stopped' || why === undefined ? '' : t('jDictFail'); if (heard) onText(heard); heard = ''; paint(); } });
    paint();
  }
  async function toggleRecord() {
    if (rec) { const r = await rec.stop(); rec = null; clearInterval(tick); timer.textContent = ''; blob = r.blob; sec = r.sec; status.textContent = t('jRecorded', { t: fmtDur(sec) }); paint(); return; }
    try { rec = await startRecording({ maxSec: 90, onAuto: () => toggleRecord() }); } catch { status.textContent = t('jMicDenied'); return; }
    blob = null; t0 = Date.now(); tick = setInterval(() => { timer.textContent = fmtDur((Date.now() - t0) / 1000); }, 500); status.textContent = t('jRecording'); paint();
  }
  dictBtn.addEventListener('click', toggleDictation); recBtn.addEventListener('click', toggleRecord); paint();
  return {
    node: h('div', { class: 'stack voice-note' }, h('div', { class: 'row-btns' }, recBtn, dictBtn, timer), status),
    audio: () => (blob ? { blob, sec } : null),
    stopAll: async () => { if (rec) { const r = await rec.stop(); rec = null; clearInterval(tick); blob = r.blob; sec = r.sec; } dict?.stop(); },
    cleanup: () => { clearInterval(tick); rec?.cancel(); rec = null; dict?.stop(); dict = null; },
  };
}

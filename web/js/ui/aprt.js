// Situation log (APRT / EIER): Event - Interpretation - Emotion - Response, one calm question at a time, written or spoken, saved to the private journal.
// Stop at any step with "Save now"; the last, optional step looks for another way to see it. Self-help (CBT-style), not therapy.
import { h, setChildren, fmtDur } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import * as J from '../journal.js';
import { EMOTIONS, RESPONSES, trapOf } from '../aprt.js';
import { audience } from '../feedback.js';
import { recorderSupported, startRecording } from '../recorder.js';
import { dictationSupported, startDictation } from '../dictation.js';
import { modal, toast } from './common.js';
import { askTranscribeConsent } from './capture.js';

const STEPS = ['event', 'interp', 'emotion', 'response', 'alt'];
const LETTER = { he: ['א', 'פ', 'ר', 'ת', '↻'], en: ['E', 'I', 'E', 'R', '↻'] };

export function openAprt(ctx = {}) {
  const kid = audience(S.activeProfile().age) === 'kid', pid = S.activeProfile().id;
  const st = { step: 0, event: '', interp: '', emotion: '', emotionText: '', intensity: 5, after: 0, responses: [], response: '', alt: '' };
  let rec = null, dict = null, blob = null, sec = 0, tick = null, t0 = 0, m;
  const body = h('div', { class: 'stack aprt' }), status = h('p', { class: 'note', role: 'status' }, ''), timer = h('strong', { class: 'rec-time', 'aria-hidden': 'true' }, '');
  const cleanup = () => { clearInterval(tick); rec?.cancel(); rec = null; dict?.stop(); dict = null; };
  const area = (key, ph, rows = 4) => { const ta = h('textarea', { rows, maxLength: 600, placeholder: ph, 'aria-label': ph, oninput: (e) => { st[key] = e.target.value; } }); ta.value = st[key]; return ta; };

  async function toggleRecord() {
    if (rec) { const r = await rec.stop(); rec = null; clearInterval(tick); timer.textContent = ''; blob = r.blob; sec = r.sec; status.textContent = t('jRecorded', { t: fmtDur(sec) }); return draw(); }
    try { rec = await startRecording({ onAuto: () => toggleRecord() }); } catch { status.textContent = t('jMicDenied'); return undefined; }
    blob = null; t0 = Date.now(); tick = setInterval(() => { timer.textContent = fmtDur((Date.now() - t0) / 1000); }, 500); status.textContent = t('jRecording'); return draw();
  }
  async function dictateInto(ta, key) {
    if (dict) { dict.stop(); return; }
    if (!S.get().settings.transcribe && !(await askTranscribeConsent())) return;
    const base = ta.value; status.textContent = t('jListening');
    dict = startDictation(getLang(), { onText: (fin, interim) => { const v = `${base}${base ? ' ' : ''}${fin}${interim ? ` ${interim}` : ''}`.slice(0, 600); st[key] = v; const cur = body.querySelector('textarea'); if (cur) cur.value = v; }, onEnd: (why) => { dict = null; status.textContent = why === 'denied' ? t('jMicDenied') : ''; draw(); } });
    draw();
  }
  const micRow = (ta, key) => h('div', { class: 'row-btns' },
    recorderSupported() && !dict ? h('button', { class: `btn small ${rec ? 'danger' : ''}`, type: 'button', onclick: toggleRecord }, rec ? `⏹ ${t('jStopRec')}` : blob ? `🎙️ ${t('jRerecord')}` : `🎙️ ${t('aprtSpeak')}`) : null,
    dictationSupported() && !rec ? h('button', { class: 'btn small', type: 'button', onclick: () => dictateInto(ta, key) }, dict ? `⏹ ${t('jStopDict')}` : `🗣️ ${t('jDictate')}`) : null, timer);

  const screens = {
    event: () => { const ta = area('event', t(kid ? 'aprtEventPhKid' : 'aprtEventPh')); return [h('h3', {}, t('aprtEvent')), h('p', { class: 'note' }, t(kid ? 'aprtEventHintKid' : 'aprtEventHint')), ta, micRow(ta, 'event')]; },
    interp: () => { const ta = area('interp', t(kid ? 'aprtInterpPhKid' : 'aprtInterpPh')); return [h('h3', {}, t('aprtInterp')), h('p', { class: 'note' }, t(kid ? 'aprtInterpHintKid' : 'aprtInterpHint')), ta, micRow(ta, 'interp')]; },
    emotion: () => { const out = h('output', { class: 'big-num' }, String(st.intensity)), word = h('input', { type: 'text', maxLength: 60, placeholder: t('aprtEmotionPh'), 'aria-label': t('aprtEmotionPh'), value: st.emotionText, oninput: (e) => { st.emotionText = e.target.value; } });
      return [h('h3', {}, t('aprtEmotion')), h('p', { class: 'note' }, t('aprtEmotionHint')),
        h('div', { class: 'wz-grid', role: 'radiogroup', 'aria-label': t('aprtEmotion') }, EMOTIONS.map(([e, id]) => h('button', { type: 'button', class: `wz-opt ${st.emotion === id ? 'on' : ''}`, role: 'radio', 'aria-checked': String(st.emotion === id), onclick: () => { st.emotion = st.emotion === id ? '' : id; draw(); } }, h('span', { class: 'wz-e', 'aria-hidden': 'true' }, e), h('span', {}, t(`em_${id}`))))),
        word, h('label', { class: 'field' }, h('span', { class: 'lbl' }, `${t('aprtIntensity')}: `, out), h('input', { type: 'range', min: 0, max: 10, value: st.intensity, 'aria-label': t('aprtIntensity'), oninput: (e) => { st.intensity = +e.target.value; out.textContent = e.target.value; } }), h('small', { class: 'hint' }, t('aprtIntensityHint')))]; },
    response: () => { const ta = area('response', t('aprtResponsePh'), 3); return [h('h3', {}, t('aprtResponse')), h('p', { class: 'note' }, t('aprtResponseHint')),
      h('div', { class: 'wz-grid', role: 'group', 'aria-label': t('aprtResponse') }, RESPONSES.map((id) => h('button', { type: 'button', class: `wz-opt ${st.responses.includes(id) ? 'on' : ''}`, role: 'checkbox', 'aria-checked': String(st.responses.includes(id)), onclick: () => { st.responses = st.responses.includes(id) ? st.responses.filter((x) => x !== id) : [...st.responses, id].slice(-4); draw(); } }, h('span', {}, t(`rs_${id}`))))), ta]; },
    alt: () => { const trap = trapOf(st.interp), ta = area('alt', t('aprtAltPh'), 3), out = h('output', { class: 'big-num' }, String(st.after));
      return [h('h3', {}, t('aprtAlt')), h('p', { class: 'note' }, t(kid ? 'aprtAltHintKid' : 'aprtAltHint')), trap ? h('p', { class: 'chip solid' }, `💡 ${t(`trapQ_${trap}`)}`) : null, ta, micRow(ta, 'alt'),
        h('label', { class: 'field' }, h('span', { class: 'lbl' }, `${t('aprtAfter')}: `, out), h('input', { type: 'range', min: 0, max: 10, value: st.after, 'aria-label': t('aprtAfter'), oninput: (e) => { st.after = +e.target.value; out.textContent = e.target.value; } }))]; },
  };

  async function save() {
    if (rec) { const r = await rec.stop(); rec = null; blob = r.blob; sec = r.sec; }
    dict?.stop(); clearInterval(tick);
    const a = { event: st.event, interp: st.interp, emotion: st.emotion, emotionText: st.emotionText, intensity: st.emotion || st.emotionText ? st.intensity : 0, responses: st.responses, response: st.response, alt: st.alt, after: st.alt ? st.after : 0 };
    if (!a.event.trim() && !a.interp.trim() && !a.emotion && !a.emotionText.trim() && !blob) { toast(t('jNothing')); return false; }
    await J.addEntry(pid, { kind: 'aprt', aprt: a, routine: ctx.routine || '', task: ctx.task || '', audio: blob ? { sec } : null }, blob);
    ctx.onSaved?.(); toast((await J.getLock(pid)) && !(await J.isUnlocked(pid)) ? t('jSavedLocked') : t('jSaved')); return true;
  }
  function draw() {
    const last = st.step === STEPS.length - 1, L = LETTER[getLang() === 'he' ? 'he' : 'en'];
    setChildren(body,
      h('ol', { class: 'aprt-steps', 'aria-label': t('wzStep', { n: st.step + 1, total: STEPS.length }) }, STEPS.map((id, i) => h('li', { class: `${i === st.step ? 'on' : i < st.step ? 'done' : ''}`, 'aria-current': i === st.step ? 'step' : null }, L[i]))),
      screens[STEPS[st.step]](), status,
      h('div', { class: 'wz-nav' }, st.step ? h('button', { class: 'btn', type: 'button', onclick: () => { st.step--; draw(); } }, t('wzBack')) : h('span', {}),
        h('div', { class: 'row-btns' }, h('button', { class: 'btn', type: 'button', onclick: async () => { if (await save()) m.close(); } }, t('aprtSaveNow')), last ? null : h('button', { class: 'btn primary', type: 'button', onclick: () => { st.step++; draw(); } }, t('wzNext')))));
    body.querySelector('h3')?.setAttribute('tabindex', '-1');
  }
  m = modal(`🧭 ${t('aprtTitle')}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('aprtIntro')), body, h('p', { class: 'note' }, t('jPrivacy'))), []);
  m.el.classList.add('wizard-modal'); m.el.addEventListener('close', cleanup); draw();
  return m;
}

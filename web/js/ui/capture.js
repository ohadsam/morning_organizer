// Quick capture: a note, a voice note (with an optional suggested transcript), a thought record, "3 good things", a parked thought, mood faces.
// Everything goes into the journal (journal.js); adding never needs the journal password.
import { h, setChildren, fmtDur } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import * as J from '../journal.js';
import { MOODS } from '../mood.js';
import { audience } from '../feedback.js';
import { recorderSupported, startRecording } from '../recorder.js';
import { dictationSupported, dictationIsLocal, startDictation } from '../dictation.js';
import { modal, toast } from './common.js';
import { feelingNode } from './visualKit.js';
import { MOOD_FACES } from '../visualKit.js';

const pid = () => S.activeProfile().id;
const saved = async () => toast((await J.getLock(pid())) && !(await J.isUnlocked(pid())) ? t('jSavedLocked') : t('jSaved'));
const field = (label, input, hint) => h('label', { class: 'field' }, label, hint ? h('span', { class: 'hint' }, hint) : null, input);

/** One-time, plain-language consent before any speech-to-text. */
export function askTranscribeConsent() {
  return new Promise((resolve) => {
    let answer = false;
    const m = modal(`🗣️ ${t('dictTitle')}`, h('div', { class: 'stack' }, h('p', {}, t(dictationIsLocal() ? 'dictConsentApp' : 'dictConsentWeb')), h('p', { class: 'note' }, t('dictConsentEdit'))), [
      { label: t('cancel'), fn: () => {} }, { label: t('dictAllow'), primary: true, fn: async () => { await S.updateSettings({ transcribe: true }); answer = true; } }]);
    m.el.addEventListener('close', () => resolve(answer));
  });
}

/** Mood faces. onPick(value|null). */
export function moodRow(onPick, current = null) {
  const wrap = h('div', { class: 'moods', role: 'group', 'aria-label': t('moodAsk') });
  const mark = (v) => [...wrap.children].forEach((b, i) => { const on = MOODS[i].v === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  for (const m of MOODS) wrap.append(h('button', { class: 'mood', type: 'button', 'aria-label': t(`mood${m.v}`), 'aria-pressed': 'false', onclick: () => { mark(m.v); onPick(m.v); } }, feelingNode(MOOD_FACES[m.v], { size: 40 })));   // the face of the visual kit, drawn in the look's colours
  mark(current);
  return wrap;
}

/** Note + voice + dictation sheet. ctx: { routine, task, voice: start recording right away }. */
export function openCapture(ctx = {}) {
  const text = h('textarea', { rows: 4, maxLength: 4000, placeholder: ctx.hard ? t('jHardPh') : t('jNotePh') }), transcript = h('textarea', { rows: 3, maxLength: 6000 });
  const tBox = h('div', { class: 'stack', hidden: true }, field(t('jTranscript'), transcript, t('jTranscriptHint')),
    h('button', { class: 'btn small', type: 'button', onclick: () => { text.value = `${text.value}${text.value ? '\n' : ''}${transcript.value}`.slice(0, 4000); transcript.value = ''; tBox.hidden = true; } }, t('jUseTranscript')));
  const status = h('p', { class: 'note', role: 'status' }, ''), timer = h('strong', { class: 'rec-time', 'aria-hidden': 'true' }, '');
  let rec = null, dict = null, blob = null, sec = 0, tick = null, t0 = 0;
  const dictBtn = h('button', { class: 'btn', type: 'button' }), recBtn = h('button', { class: 'btn', type: 'button' });
  const cleanup = () => { clearInterval(tick); rec?.cancel(); rec = null; dict?.stop(); dict = null; };
  const showTranscript = (finalText, interim) => { transcript.value = `${finalText}${interim ? ` ${interim}` : ''}`.trim(); tBox.hidden = !transcript.value; status.textContent = ''; };
  function paint() {
    setChildren(recBtn, rec ? `⏹ ${t('jStopRec')}` : blob ? `🎙️ ${t('jRerecord')}` : `🎙️ ${t('jRecord')}`); recBtn.classList.toggle('danger', !!rec);
    setChildren(dictBtn, dict ? `⏹ ${t('jStopDict')}` : `🗣️ ${t('jDictate')}`); dictBtn.hidden = !dictationSupported() || !!rec;
    recBtn.hidden = !recorderSupported() || !!dict;
  }
  async function toggleDictation() {
    if (dict) { dict.stop(); return; }
    if (!S.get().settings.transcribe && !(await askTranscribeConsent())) return;
    status.textContent = t('jListening');
    dict = startDictation(getLang(), { onText: showTranscript, onEnd: (why) => { dict = null; status.textContent = why === 'denied' ? t('jMicDenied') : why === 'stopped' ? '' : t('jDictFail'); paint(); } }); paint();
  }
  async function toggleRecord() {
    if (rec) { const r = await rec.stop(); rec = null; clearInterval(tick); timer.textContent = ''; dict?.stop(); blob = r.blob; sec = r.sec; status.textContent = t('jRecorded', { t: fmtDur(sec) }); paint(); return; }
    try { rec = await startRecording({ onAuto: () => toggleRecord() }); } catch { status.textContent = t('jMicDenied'); return; }
    blob = null; t0 = Date.now(); tick = setInterval(() => { timer.textContent = fmtDur((Date.now() - t0) / 1000); }, 500); status.textContent = t('jRecording');
    // Browsers can listen while recording, so a suggested transcript can appear; on a phone the recognizer and the recorder would fight over the mic.
    if (S.get().settings.transcribe && !dictationIsLocal() && dictationSupported()) dict = startDictation(getLang(), { onText: showTranscript, onEnd: () => { dict = null; paint(); } });
    paint();
  }
  dictBtn.addEventListener('click', toggleDictation); recBtn.addEventListener('click', toggleRecord); paint();
  const m = modal(`📝 ${ctx.task ? t('jNoteFor', { task: ctx.task }) : t('jNewNote')}`, h('div', { class: 'stack' }, ctx.hard ? h('p', { class: 'note' }, t('jHardHint')) : null, field(t('jNote'), text), h('div', { class: 'row-btns' }, recBtn, dictBtn, timer), status, tBox,
    h('p', { class: 'note' }, t('jPrivacy'))), [
    { label: t('cancel'), fn: () => { cleanup(); } },
    { label: t('save'), primary: true, fn: async () => {
      if (rec) { const r = await rec.stop(); rec = null; blob = r.blob; sec = r.sec; }
      dict?.stop(); clearInterval(tick);
      if (!text.value.trim() && !blob && !transcript.value.trim()) { toast(t('jNothing')); return false; }
      await J.addEntry(pid(), { kind: blob ? 'voice' : 'note', text: text.value, transcript: transcript.value, routine: ctx.routine || '', task: ctx.task || '', audio: blob ? { sec } : null, difficulty: ctx.difficulty || 0 }, blob);
      ctx.onSaved?.(); await saved(); } }]);
  m.el.addEventListener('close', cleanup);
  if (ctx.voice && recorderSupported()) setTimeout(toggleRecord, 150);
  return m;
}

/** "What's on my mind?" - a parked thought, one line, back to the task. */
export function openPark(ctx = {}) {
  const input = h('input', { type: 'text', maxLength: 300, placeholder: t('parkPh') });
  const m = modal(`🅿️ ${t('parkTitle')}`, h('div', { class: 'stack' }, h('p', {}, t('parkHint')), field(t('parkLabel'), input)), [
    { label: t('cancel') }, { label: t('parkSave'), primary: true, fn: async () => {
      if (!input.value.trim()) return false;
      await J.addEntry(pid(), { kind: 'park', text: input.value, routine: ctx.routine || '', task: ctx.task || '' }); toast(t('parkSaved')); } }]);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); m.el.querySelector('footer .primary')?.click(); } });
  setTimeout(() => input.focus(), 50);
  return m;
}

/** Three good things. */
export function openGratitude(ctx = {}) {
  const ins = [0, 1, 2].map((i) => h('input', { type: 'text', maxLength: 200, 'aria-label': `${t('gratTitle')} ${i + 1}` }));
  return modal(`🌟 ${t('gratTitle')}`, h('div', { class: 'stack' }, h('p', {}, t('gratHint')), ins.map((x, i) => h('label', { class: 'field' }, `${i + 1}.`, x))), [
    { label: t('cancel') }, { label: t('save'), primary: true, fn: async () => {
      const items = ins.map((x) => x.value.trim()).filter(Boolean); if (!items.length) { toast(t('jNothing')); return false; }
      await J.addEntry(pid(), { kind: 'gratitude', items, routine: ctx.routine || '' }); await saved(); } }]);
}

const FEELINGS = ['😟', '😠', '😢', '😰', '😳', '😔'];
/** Thought record (CBT), kid-friendly tier = fewer steps and simpler words. */
export function openThought() {
  const kid = audience(S.activeProfile().age) === 'kid', f = {};
  const area = (key, label, hint) => { f[key] = h('textarea', { rows: 2, maxLength: 600 }); return field(label, f[key], hint); };
  let feeling = '';
  const feelRow = h('div', { class: 'moods', role: 'group', 'aria-label': t('trFeeling') }, FEELINGS.map((e) => h('button', { class: 'mood', type: 'button', 'aria-pressed': 'false', onclick: (ev) => { feeling = e; [...ev.currentTarget.parentNode.children].forEach((b) => { b.classList.toggle('on', b === ev.currentTarget); b.setAttribute('aria-pressed', String(b === ev.currentTarget)); }); } }, e)));
  const before = h('input', { type: 'range', min: 0, max: 10, value: 5 }), after = h('input', { type: 'range', min: 0, max: 10, value: 5 });
  const body = [h('p', {}, t(kid ? 'trIntroKid' : 'trIntro')), area('situation', t(kid ? 'trSituationKid' : 'trSituation')), area('thought', t(kid ? 'trThoughtKid' : 'trThought')), h('div', {}, h('strong', {}, t('trFeeling')), feelRow), field(t('trIntensity'), before),
    kid ? null : area('evidenceFor', t('trFor')), kid ? null : area('evidenceAgainst', t('trAgainst')), area('balanced', t(kid ? 'trBalancedKid' : 'trBalanced'), t('trBalancedHint')), field(t('trAfter'), after)];
  return modal(`🧠 ${t('trTitle')}`, h('div', { class: 'stack' }, body), [
    { label: t('cancel') }, { label: t('save'), primary: true, fn: async () => {
      if (!f.thought.value.trim() && !f.balanced.value.trim()) { toast(t('jNothing')); return false; }
      await J.addEntry(pid(), { kind: 'thought', thought: { situation: f.situation.value, thought: f.thought.value, feeling, intensity: Number(before.value), evidenceFor: f.evidenceFor?.value || '', evidenceAgainst: f.evidenceAgainst?.value || '', balanced: f.balanced.value, after: Number(after.value) } }); await saved(); } }]);
}


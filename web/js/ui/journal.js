// The journal screen: optional password lock (set up here), "forgot password" through security questions, entries by day, voice playback.
import { h, setChildren, fmtDur } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import * as J from '../journal.js';
import { moodEmoji } from '../mood.js';
import { modal, toast, confirmBox } from './common.js';
import { openCapture, openThought, openGratitude, openPark } from './capture.js';

const KIND_EMOJI = { note: '📝', voice: '🎙️', thought: '🧠', gratitude: '🌟', mood: '🙂', park: '🅿️', calm: '🌿' };
const PRESET_Q = ['lqPet', 'lqStreet', 'lqFood', 'lqFriend', 'lqBook', 'lqPlace'];
const field = (label, input, hint) => h('label', { class: 'field' }, label, hint ? h('span', { class: 'hint' }, hint) : null, input);
const waitText = (ms) => t('jWait', { s: Math.ceil(ms / 1000) });

/** Set-up dialog for the optional password. */
export function openEnableLock(onDone) {
  const pid = S.activeProfile().id;
  const pw = h('input', { type: 'password', autocomplete: 'new-password', minLength: 4 }), pw2 = h('input', { type: 'password', autocomplete: 'new-password' }), msg = h('p', { class: 'note err', role: 'alert' }, '');
  const rows = [0, 1].map(() => {
    const sel = h('select', {}, PRESET_Q.map((k) => h('option', { value: t(k) }, t(k)))), custom = h('input', { type: 'text', maxLength: 100, placeholder: t('lqCustom') }), ans = h('input', { type: 'text', maxLength: 100, autocomplete: 'off' });
    return { sel, custom, ans, node: h('div', { class: 'qa' }, field(t('lqQuestion'), sel), custom, field(t('lqAnswer'), ans)) };
  });
  rows[1].sel.selectedIndex = 1;
  return modal(`🔒 ${t('lockSetup')}`, h('div', { class: 'stack' }, h('p', {}, t('lockExplain')), field(t('lockPassword'), pw, t('lockPwHint')), field(t('lockPasswordAgain'), pw2),
    h('h3', {}, t('lqTitle')), h('p', { class: 'note' }, t('lqHint')), rows.map((r) => r.node), h('p', { class: 'note warn' }, t('lockWarn')), msg), [
    { label: t('cancel') }, { label: t('lockEnable'), primary: true, fn: async () => {
      msg.textContent = '';
      if (pw.value.length < 4) { msg.textContent = t('lockShort'); return false; }
      if (pw.value !== pw2.value) { msg.textContent = t('lockMismatch'); return false; }
      const questions = rows.map((r) => ({ q: r.custom.value.trim() || r.sel.value, a: r.ans.value }));
      try { await J.enableLock(pid, { password: pw.value, questions }); } catch { msg.textContent = t('lockNeedQs'); return false; }
      toast(t('lockOn')); onDone?.(); } }]);
}

function openChangePassword(onDone) {
  const pid = S.activeProfile().id, old = h('input', { type: 'password', autocomplete: 'current-password' }), n1 = h('input', { type: 'password', autocomplete: 'new-password' }), n2 = h('input', { type: 'password', autocomplete: 'new-password' }), msg = h('p', { class: 'note err', role: 'alert' }, '');
  return modal(`🔑 ${t('lockChange')}`, h('div', { class: 'stack' }, field(t('lockOld'), old), field(t('lockNew'), n1), field(t('lockPasswordAgain'), n2), msg), [
    { label: t('cancel') }, { label: t('save'), primary: true, fn: async () => {
      if (n1.value.length < 4) { msg.textContent = t('lockShort'); return false; } if (n1.value !== n2.value) { msg.textContent = t('lockMismatch'); return false; }
      if (!(await J.changePassword(pid, { password: old.value }, n1.value))) { msg.textContent = t('lockWrong'); return false; }
      toast(t('lockChanged')); onDone?.(); } }]);
}

function openDisable(onDone) {
  const pid = S.activeProfile().id, pw = h('input', { type: 'password', autocomplete: 'current-password' }), msg = h('p', { class: 'note err', role: 'alert' }, '');
  return modal(`🔓 ${t('lockOff')}`, h('div', { class: 'stack' }, h('p', {}, t('lockOffHint')), field(t('lockPassword'), pw), msg), [
    { label: t('cancel') }, { label: t('lockOff'), primary: true, fn: async () => { if (!(await J.disableLock(pid, { password: pw.value }))) { msg.textContent = t('lockWrong'); return false; } toast(t('lockIsOff')); onDone?.(); } }]);
}

/** Forgot password: answer the questions, then choose a new password. */
async function openForgot(onDone) {
  const pid = S.activeProfile().id, qs = await J.lockQuestions(pid), msg = h('p', { class: 'note err', role: 'alert' }, '');
  const ans = qs.map(() => h('input', { type: 'text', autocomplete: 'off', maxLength: 100 })), n1 = h('input', { type: 'password', autocomplete: 'new-password' });
  return modal(`❓ ${t('lockForgot')}`, h('div', { class: 'stack' }, h('p', {}, t('lockForgotHint')), qs.map((q, i) => field(String(q.q ?? q), ans[i])), field(t('lockNew'), n1), msg), [
    { label: t('cancel') }, { label: t('lockReset'), primary: true, fn: async () => {
      if (n1.value.length < 4) { msg.textContent = t('lockShort'); return false; }
      const w = await J.waitLeft(pid); if (w > 0) { msg.textContent = waitText(w); return false; }
      const r = await J.unlockWithAnswers(pid, ans.map((x) => x.value));
      if (!r.ok) { msg.textContent = r.waitMs ? waitText(r.waitMs) : t('lockWrongAnswers'); return false; }
      await J.changePassword(pid, { answers: ans.map((x) => x.value) }, n1.value);
      toast(t('lockChanged')); onDone?.(); } }]);
}

function entryCard(e, redraw, pid) {
  const when = new Date(e.at), head = h('div', { class: 'row between' }, h('strong', {}, `${KIND_EMOJI[e.kind] || '📝'} ${t(`kind_${e.kind}`)}`), h('small', { class: 'muted' }, `${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${e.routine ? ` · ${e.routine}` : ''}${e.task ? ` › ${e.task}` : ''}`));
  if (e.locked) return h('article', { class: 'card entry locked' }, head, h('p', { class: 'muted' }, `🔒 ${t('jHidden')}`));
  const body = [];
  if (e.mood) body.push(h('p', {}, moodEmoji(e.mood)));
  if (e.text) body.push(h('p', { class: 'entry-text' }, e.text));
  if (e.items?.length) body.push(h('ol', {}, e.items.map((x) => h('li', {}, x))));
  if (e.thought) { const th = e.thought, row = (k, v) => (v ? h('div', { class: 'kv' }, h('span', {}, t(k)), h('strong', {}, v)) : null); body.push(h('div', { class: 'card kvs' }, row('trSituation', th.situation), row('trThought', th.thought), row('trFeeling', `${th.feeling} ${th.intensity}/10`), row('trFor', th.evidenceFor), row('trAgainst', th.evidenceAgainst), row('trBalanced', th.balanced), th.after !== undefined ? row('trAfter', `${th.after}/10`) : null)); }
  if (e.audio) {
    const slot = h('div', { class: 'row-btns' });
    const btn = h('button', { class: 'btn small', type: 'button', onclick: async () => {
      const url = await J.audioUrl(pid, e.audio); if (!url) { toast(t('jAudioMissing')); return; }
      const a = h('audio', { controls: true, src: url, 'aria-label': t('kind_voice') }); a.addEventListener('ended', () => URL.revokeObjectURL(url)); setChildren(slot, a); a.play?.().catch(() => {}); } }, `▶ ${t('jPlay')} (${fmtDur(e.audio.sec)})`);
    setChildren(slot, btn); body.push(slot);
  }
  if (e.transcript) body.push(h('details', { class: 'entry-transcript' }, h('summary', {}, t('jTranscriptShort')), h('p', {}, e.transcript)));
  const actions = [];
  if (e.kind === 'park') actions.push(h('label', { class: 'switch row' }, h('span', {}, t('parkDone')), h('input', { type: 'checkbox', checked: e.resolved, onchange: async (ev) => { await J.setResolved(e.id, ev.target.checked); redraw(); } })));
  actions.push(h('button', { class: 'btn small danger', type: 'button', onclick: async () => { if (await confirmBox(t('jDeleteAsk'), t('delete'), true)) { await J.removeEntry(e.id); redraw(); } } }, t('delete')));
  return h('article', { class: `card entry ${e.resolved ? 'resolved' : ''}` }, head, body, h('div', { class: 'row-btns' }, actions));
}

export async function renderJournal(root, nav) {
  const pid = S.activeProfile().id; let filter = 'all', alive = true;
  const host = h('div', { class: 'stack' });
  const tools = h('div', { class: 'toolbar wrap' },
    h('button', { class: 'btn primary', type: 'button', onclick: () => { openCapture({}); } }, `📝 ${t('jNewNote')}`),
    h('button', { class: 'btn', type: 'button', onclick: () => openCapture({ voice: true }) }, `🎙️ ${t('jRecord')}`),
    h('button', { class: 'btn', type: 'button', onclick: () => openThought() }, `🧠 ${t('trTitle')}`),
    h('button', { class: 'btn', type: 'button', onclick: () => openGratitude() }, `🌟 ${t('gratTitle')}`),
    h('button', { class: 'btn', type: 'button', onclick: () => openPark({}) }, `🅿️ ${t('parkTitle')}`));
  setChildren(root, h('section', { class: 'journal-page' }, h('div', { class: 'row between' }, h('h1', {}, `📓 ${t('journal')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav('#/') }, t('back'))), tools, host));
  const refresh = () => { if (alive) draw(); };
  const offStore = S.subscribe(() => {}); // keeps the profile name current while open
  async function draw() {
    const lock = await J.getLock(pid), open = await J.isUnlocked(pid), entries = await J.listEntries(pid);
    if (!alive) return;
    const settings = h('details', { class: 'card lock-card' }, h('summary', {}, `🔒 ${t('lockTitle')}`),
      h('div', { class: 'stack' }, h('p', { class: 'note' }, t(lock ? 'lockStatusOn' : 'lockStatusOff')),
        lock ? [h('div', { class: 'row-btns' }, open ? h('button', { class: 'btn', type: 'button', onclick: () => { J.lockNow(pid); refresh(); } }, `🔒 ${t('lockNow')}`) : null,
          h('button', { class: 'btn', type: 'button', onclick: () => openChangePassword(refresh) }, t('lockChange')), h('button', { class: 'btn', type: 'button', onclick: () => openDisable(refresh) }, t('lockOff')))]
          : h('button', { class: 'btn primary', type: 'button', onclick: () => openEnableLock(refresh) }, t('lockSetup')),
        h('p', { class: 'note' }, t('jBackupNote'))));
    if (lock && !open) {
      const pw = h('input', { type: 'password', autocomplete: 'current-password', 'aria-label': t('lockPassword') }), msg = h('p', { class: 'note err', role: 'alert' }, '');
      const go = async () => { const r = await J.unlock(pid, pw.value); if (r.ok) { refresh(); return; } pw.value = ''; msg.textContent = r.waitMs ? waitText(r.waitMs) : t('lockWrong'); pw.focus(); };
      pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      const locked = entries.length;
      setChildren(host, h('div', { class: 'card stack lock-screen' }, h('div', { class: 'big-emoji', 'aria-hidden': 'true' }, '🔒'), h('h2', {}, t('lockedTitle')), h('p', {}, t('lockedHint', { n: locked })), field(t('lockPassword'), pw), msg,
        h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', type: 'button', onclick: go }, t('lockUnlock')), h('button', { class: 'btn', type: 'button', onclick: () => openForgot(refresh) }, t('lockForgot'))),
        h('button', { class: 'btn link danger', type: 'button', onclick: async () => { if (await confirmBox(t('lockEraseAsk'), t('lockErase'), true)) { await J.eraseJournal(pid); refresh(); } } }, t('lockErase'))), settings);
      return;
    }
    const kinds = ['all', ...new Set(entries.map((e) => e.kind))], list = entries.filter((e) => filter === 'all' || e.kind === filter);
    const days = new Map(); for (const e of list) { const k = new Date(e.at).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }); (days.get(k) ?? days.set(k, []).get(k)).push(e); }
    setChildren(host,
      entries.length ? h('div', { class: 'chips filter', role: 'group', 'aria-label': t('jFilter') }, kinds.map((k) => h('button', { class: `chip btn-chip ${filter === k ? 'on' : ''}`, type: 'button', 'aria-pressed': String(filter === k), onclick: () => { filter = k; refresh(); } }, k === 'all' ? t('jAll') : `${KIND_EMOJI[k]} ${t(`kind_${k}`)}`))) : null,
      list.length ? [...days].map(([day, es]) => h('section', {}, h('h2', {}, day), h('div', { class: 'stack' }, es.map((e) => entryCard(e, refresh, pid))))) : h('p', { class: 'empty' }, t('jEmpty')), settings);
  }
  addEventListener('journal-changed', refresh);
  await draw();
  return () => { alive = false; offStore(); removeEventListener('journal-changed', refresh); };
}

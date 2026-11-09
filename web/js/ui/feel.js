// "How do I feel": one tap on a face, one short question that fits the approach the person chose, an optional private note; then the picture over time
// and a plain-text summary they can show a therapist or a parent. Everything stays on this device (feelings.js).
import { h, setChildren } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import { MOODS } from '../mood.js';
import { moodFace } from './mascot.js';
import { TAGS, approachOf, feelingStats, momentStats, summaryText } from '../feelings.js';
import { voiceNote } from './voiceNote.js';
import { modal } from './common.js';
import { toast } from './common.js';
import { native } from '../native.js';

const dayLabel = (ms) => new Intl.DateTimeFormat(getLang() === 'he' ? 'he' : 'en', { weekday: 'short', day: 'numeric', month: 'numeric' }).format(ms);
const labels = () => ({ title: t('fsTitle'), period: (n) => t('fsPeriod', { n }), count: (n, d) => t('fsCount', { n, d }), avg: (x) => t('fsAvg', { x }), trend: { up: t('fsUp'), down: t('fsDown'), flat: t('fsFlat') },
  low: (n) => t('fsLow', { n }), mood: (v) => t(`mood${v}`), tag: (ap, tag) => t(`fo_${ap}_${tag}`), moment: (m, routine, task) => t(`fm_${m}`, { routine, task }), voice: t('fsVoice'), noteWord: t('fsNote'), disclaimer: t('fsDisclaimer') });

/** A small play button for a recorded voice note: the sound is read from this device only when it is pressed. */
function playBtn(f) {
  const b = h('button', { class: 'btn small', type: 'button', 'aria-label': `${t('feelPlay')} ${dayLabel(f.at)}` }, '▶');
  b.addEventListener('click', async () => { const url = await S.feelingAudioUrl(f); if (!url) return; const a = new Audio(url); a.addEventListener('ended', () => URL.revokeObjectURL(url)); a.play().catch(() => {}); });
  return b;
}
/** A calm, skippable question inside a routine: five faces, one tap. `moment`: 'start' | 'end' | 'task'. onClose() when it is answered or skipped. */
export function quickFeel({ moment = 'end', routine = '', task = '', onClose = () => {} } = {}) {
  const ap = approachOf(S.activeProfile().view);
  const title = moment === 'start' ? t('fqStart') : moment === 'task' ? t('fqTask', { task }) : t('fqEnd');
  const box = h('section', { class: 'card center feel-quick', role: 'group', 'aria-label': title });
  const ask = () => setChildren(box, h('strong', {}, title), h('div', { class: 'moods feel-faces', role: 'group', 'aria-label': title }, MOODS.map((m) => h('button', { class: 'mood', type: 'button', 'aria-label': t(`mood${m.v}`),
    onclick: async () => { const e = await S.addFeeling({ mood: m.v, ap, moment, routine, task }); saved(e, m.v); } }, moodFace(m.v, { size: 44 })))),
    h('button', { class: 'btn small link', type: 'button', onclick: () => { box.remove(); onClose('skip'); } }, t('fqSkip')));
  const saved = (entry, mood) => setChildren(box, h('p', { role: 'status' }, `✓ ${t('fqSaved')}`), h('div', { class: 'row-btns' },
    h('button', { class: 'btn small', type: 'button', onclick: () => openMore(entry, ap) }, `🗣️ ${t('fqMore')}`), h('button', { class: 'btn small', type: 'button', onclick: () => { box.remove(); onClose('done'); } }, t('close')),
    mood <= 2 ? h('button', { class: 'btn small', type: 'button', onclick: () => { onClose('calm'); } }, `🌬️ ${t('feelCalmGo')}`) : null));
  ask(); return box;
}
/** A sheet to add a word, a chosen chip and a voice note to a check-in that was already saved. */
function openMore(entry, ap) {
  let tag = entry.tag, note = entry.note; const vn = voiceNote({ onText: (txt) => { note = `${note}${note ? '\n' : ''}${txt}`.slice(0, 400); area.value = note; } });
  const area = h('textarea', { rows: 3, maxLength: 400, placeholder: t('feelNotePh'), oninput: (e) => { note = e.target.value; } }, note);
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': t(`fq_${ap}`) }); const paint = () => setChildren(chips, TAGS[ap].map((x) => h('button', { class: `chip btn-chip ${tag === x ? 'on' : ''}`, type: 'button', 'aria-pressed': String(tag === x), onclick: () => { tag = tag === x ? '' : x; paint(); } }, t(`fo_${ap}_${x}`)))); paint();
  const m = modal(t('fqMore'), h('div', { class: 'stack' }, h('div', { class: 'lbl' }, t(`fq_${ap}`)), chips, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('feelNote')), area), vn.node), [{ label: t('cancel'), fn: () => vn.cleanup() },
    { label: t('feelSave'), primary: true, fn: async () => { await vn.stopAll(); const a = vn.audio(); await S.updateFeeling(entry.id, { tag, note, sec: a?.sec }, a?.blob || null); vn.cleanup(); toast(t('feelSaved')); } }]);
  m.el.addEventListener('close', () => vn.cleanup());
}
export function renderFeel(root, nav, arg = '') {
  const ap = approachOf(S.activeProfile().view);
  let mood = Number(arg) >= 1 && Number(arg) <= 5 ? Number(arg) : null, tag = '', note = '', days = 14, withNotes = false;
  let vn = voiceNote({ onText: (txt) => { note = `${note}${note ? '\n' : ''}${txt}`.slice(0, 400); paintForm(); } });
  const form = h('section', { class: 'card feel-form' }), over = h('section', { class: 'card' }), sum = h('section', { class: 'card' });
  const faces = () => h('div', { class: 'moods feel-faces', role: 'group', 'aria-label': t('feelTitle') }, MOODS.map((m) => h('button', { class: `mood ${mood === m.v ? 'on' : ''}`, type: 'button', 'aria-label': t(`mood${m.v}`), 'aria-pressed': String(mood === m.v),
    onclick: () => { mood = m.v; paintForm(); } }, moodFace(m.v, { size: 52 }), h('small', {}, t(`mood${m.v}`)))));
  function paintForm(done = false, low = false) {
    if (done) { setChildren(form, h('div', { class: 'stack center', role: 'status' }, h('p', { class: 'big-emoji', 'aria-hidden': 'true' }, '🌿'), h('p', {}, t('feelSaved')),
      low ? h('div', { class: 'stack center' }, h('p', { class: 'muted' }, t('feelCalmOffer')), h('button', { class: 'btn primary', type: 'button', onclick: () => nav('#/calm') }, `🌬️ ${t('feelCalmGo')}`)) : null)); return; }
    setChildren(form, h('h2', {}, t('feelTitle')), h('p', { class: 'muted' }, t('feelIntro')), faces(),
      mood !== null ? h('div', { class: 'stack' }, h('div', { class: 'lbl' }, t(`fq_${ap}`)),
        h('div', { class: 'chips', role: 'group', 'aria-label': t(`fq_${ap}`) }, TAGS[ap].map((x) => h('button', { class: `chip btn-chip ${tag === x ? 'on' : ''}`, type: 'button', 'aria-pressed': String(tag === x), onclick: () => { tag = tag === x ? '' : x; paintForm(); } }, t(`fo_${ap}_${x}`)))),
        h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('feelNote')), h('textarea', { rows: 2, maxLength: 400, placeholder: t('feelNotePh'), oninput: (e) => { note = e.target.value; } }, note)), vn.node,
        h('button', { class: 'btn primary xl', type: 'button', onclick: async () => { await vn.stopAll(); const a = vn.audio(); await S.addFeeling({ mood, ap, tag, note, moment: 'now', audio: a ? { sec: a.sec } : null }, a?.blob || null); vn.cleanup(); vn = voiceNote({ onText: (txt) => { note = `${note}${note ? '\n' : ''}${txt}`.slice(0, 400); paintForm(); } }); const low = mood <= 2; mood = null; tag = ''; note = ''; paintForm(true, low); paintOver(); paintSum(); } }, t('feelSave'))) : null);
  }
  function paintOver() {
    const list = S.feelings(), st = feelingStats(list), ms = momentStats(list), recent = [...list].sort((a, b) => b.at - a.at).slice(0, 7);
    setChildren(over, h('h2', {}, t('feelOverTime')), !list.length ? h('p', { class: 'muted' }, t('feelNone')) : h('div', { class: 'stack' },
      h('div', { class: 'feel-bars', role: 'img', 'aria-label': t('feelChart') }, st.series.map((d) => h('span', { class: `fbar ${d.avg === null ? 'none' : ''}`, 'data-level': d.avg === null ? '0' : String(Math.round(d.avg)), title: `${dayLabel(Date.parse(d.day))}${d.avg === null ? '' : ` · ${d.avg.toFixed(1)}`}` }))),
      h('p', { class: 'note' }, t('feelAvg', { x: st.avg.toFixed(1), n: st.n })), st.trend ? h('p', { class: 'note' }, t(`feelTrend_${st.trend}`)) : null, ms.verdict ? h('p', { class: 'note' }, t(`feelMoment_${ms.verdict}`, { x: Math.abs(ms.diff).toFixed(1) })) : null,
      h('h3', {}, t('feelRecent')), h('ul', { class: 'feel-list' }, recent.map((f) => h('li', {}, moodFace(f.mood, { size: 28 }), h('span', {}, `${dayLabel(f.at)}${f.tag ? ` · ${t(`fo_${f.ap}_${f.tag}`)}` : ''}${f.moment !== 'now' ? ` · ${t(`fm_${f.moment}`, { routine: f.routine, task: f.task })}` : ''}`), f.audio ? playBtn(f) : null,
        h('button', { class: 'btn small', type: 'button', 'aria-label': `${t('feelDelete')} ${dayLabel(f.at)}`, onclick: async () => { await S.removeFeeling(f.id); paintOver(); paintSum(); } }, '🗑️'))))));
  }
  function paintSum() {
    const text = summaryText(S.feelings(), { days, includeNotes: withNotes, name: S.activeProfile().name }, labels());
    const seg = (v, label) => h('button', { class: `btn small ${days === v ? 'primary' : ''}`, type: 'button', 'aria-pressed': String(days === v), onclick: () => { days = v; paintSum(); } }, label);
    setChildren(sum, h('h2', {}, t('feelSum')), h('p', { class: 'muted' }, t('feelSumHint')), h('div', { class: 'row-btns', role: 'group' }, seg(14, t('feelSumWeeks2')), seg(28, t('feelSumWeeks4'))),
      h('label', { class: 'switch-row' }, h('input', { type: 'checkbox', checked: withNotes, onchange: (e) => { withNotes = e.target.checked; paintSum(); } }), h('span', {}, t('feelSumNotes'))),
      h('pre', { class: 'feel-summary', tabindex: '0', 'aria-label': t('feelSum') }, text),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(text); toast(t('feelCopied')); } catch { toast(text); } } }, t('feelCopy')),
        h('button', { class: 'btn', type: 'button', onclick: async () => { if (native.available) native.share(t('fsTitle'), text); else if (navigator.share) { try { await navigator.share({ title: t('fsTitle'), text }); } catch { /* cancelled */ } } else { try { await navigator.clipboard.writeText(text); toast(t('feelCopied')); } catch { toast(text); } } } }, t('feelShare'))));
  }
  setChildren(root, h('section', { class: 'feel-page stack' }, h('div', { class: 'row between' }, h('h1', {}, `🙂 ${t('feelTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav('#/') }, t('back'))), form, over, sum));
  paintForm(); paintOver(); paintSum();
}

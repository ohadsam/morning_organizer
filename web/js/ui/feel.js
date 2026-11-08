// "How do I feel": one tap on a face, one short question that fits the approach the person chose, an optional private note; then the picture over time
// and a plain-text summary they can show a therapist or a parent. Everything stays on this device (feelings.js).
import { h, setChildren } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import { MOODS } from '../mood.js';
import { MOOD_FACES } from '../visualKit.js';
import { feelingNode } from './visualKit.js';
import { TAGS, approachOf, feelingStats, summaryText } from '../feelings.js';
import { toast } from './common.js';
import { native } from '../native.js';

const dayLabel = (ms) => new Intl.DateTimeFormat(getLang() === 'he' ? 'he' : 'en', { weekday: 'short', day: 'numeric', month: 'numeric' }).format(ms);
const labels = () => ({ title: t('fsTitle'), period: (n) => t('fsPeriod', { n }), count: (n, d) => t('fsCount', { n, d }), avg: (x) => t('fsAvg', { x }), trend: { up: t('fsUp'), down: t('fsDown'), flat: t('fsFlat') },
  low: (n) => t('fsLow', { n }), mood: (v) => t(`mood${v}`), tag: (ap, tag) => t(`fo_${ap}_${tag}`), noteWord: t('fsNote'), disclaimer: t('fsDisclaimer') });

export function renderFeel(root, nav, arg = '') {
  const ap = approachOf(S.activeProfile().view);
  let mood = Number(arg) >= 1 && Number(arg) <= 5 ? Number(arg) : null, tag = '', note = '', days = 14, withNotes = false;
  const form = h('section', { class: 'card feel-form' }), over = h('section', { class: 'card' }), sum = h('section', { class: 'card' });
  const faces = () => h('div', { class: 'moods feel-faces', role: 'group', 'aria-label': t('feelTitle') }, MOODS.map((m) => h('button', { class: `mood ${mood === m.v ? 'on' : ''}`, type: 'button', 'aria-label': t(`mood${m.v}`), 'aria-pressed': String(mood === m.v),
    onclick: () => { mood = m.v; paintForm(); } }, feelingNode(MOOD_FACES[m.v], { size: 52 }), h('small', {}, t(`mood${m.v}`)))));
  function paintForm(done = false, low = false) {
    if (done) { setChildren(form, h('div', { class: 'stack center', role: 'status' }, h('p', { class: 'big-emoji', 'aria-hidden': 'true' }, '🌿'), h('p', {}, t('feelSaved')),
      low ? h('div', { class: 'stack center' }, h('p', { class: 'muted' }, t('feelCalmOffer')), h('button', { class: 'btn primary', type: 'button', onclick: () => nav('#/calm') }, `🌬️ ${t('feelCalmGo')}`)) : null)); return; }
    setChildren(form, h('h2', {}, t('feelTitle')), h('p', { class: 'muted' }, t('feelIntro')), faces(),
      mood !== null ? h('div', { class: 'stack' }, h('div', { class: 'lbl' }, t(`fq_${ap}`)),
        h('div', { class: 'chips', role: 'group', 'aria-label': t(`fq_${ap}`) }, TAGS[ap].map((x) => h('button', { class: `chip btn-chip ${tag === x ? 'on' : ''}`, type: 'button', 'aria-pressed': String(tag === x), onclick: () => { tag = tag === x ? '' : x; paintForm(); } }, t(`fo_${ap}_${x}`)))),
        h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('feelNote')), h('textarea', { rows: 2, maxLength: 400, placeholder: t('feelNotePh'), oninput: (e) => { note = e.target.value; } }, note)),
        h('button', { class: 'btn primary xl', type: 'button', onclick: async () => { await S.addFeeling({ mood, ap, tag, note }); const low = mood <= 2; mood = null; tag = ''; note = ''; paintForm(true, low); paintOver(); paintSum(); } }, t('feelSave'))) : null);
  }
  function paintOver() {
    const list = S.feelings(), st = feelingStats(list), recent = [...list].sort((a, b) => b.at - a.at).slice(0, 7);
    setChildren(over, h('h2', {}, t('feelOverTime')), !list.length ? h('p', { class: 'muted' }, t('feelNone')) : h('div', { class: 'stack' },
      h('div', { class: 'feel-bars', role: 'img', 'aria-label': t('feelChart') }, st.series.map((d) => h('span', { class: `fbar ${d.avg === null ? 'none' : ''}`, 'data-level': d.avg === null ? '0' : String(Math.round(d.avg)), title: `${dayLabel(Date.parse(d.day))}${d.avg === null ? '' : ` · ${d.avg.toFixed(1)}`}` }))),
      h('p', { class: 'note' }, t('feelAvg', { x: st.avg.toFixed(1), n: st.n })), st.trend ? h('p', { class: 'note' }, t(`feelTrend_${st.trend}`)) : null,
      h('h3', {}, t('feelRecent')), h('ul', { class: 'feel-list' }, recent.map((f) => h('li', {}, feelingNode(MOOD_FACES[f.mood], { size: 28 }), h('span', {}, `${dayLabel(f.at)}${f.tag ? ` · ${t(`fo_${f.ap}_${f.tag}`)}` : ''}`),
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

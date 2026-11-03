// Calm corner: guided breathing, 5-4-3-2-1 grounding and a body scan. One tap from home and from the run screen.
import { h, setChildren } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import * as J from '../journal.js';
import { PATTERNS, phaseAt, cyclesFor, cycleSec, GROUNDING, BODYSCAN, stepAt } from '../calm.js';
import { native } from '../native.js';
import { speakWithSettings } from './coach.js';
import { moodRow } from './capture.js';
import { toast } from './common.js';

const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const MIN_OPTIONS = [1, 2, 3];

/** Renders the calm corner into `host`. opts.onDone() when the exercise ends. Returns a cleanup function. */
export function calmPanel(host, { onClose, compact = false } = {}) {
  let kind = 'breath', pattern = 'slow', minutes = 1, raf = null, started = 0, last = '', over = false;
  const s = S.get().settings;
  const cue = (label) => { if (label === last) return; last = label; if (s.mode !== 'silent' && s.mode !== 'beep') native.vibrate([0, label === 'in' ? 120 : 60]) ; };
  function stop() { cancelAnimationFrame(raf); raf = null; }
  function menu() {
    stop();
    const seg = (items, cur, set, label) => h('div', { class: 'seg-group', role: 'group', 'aria-label': label }, items.map(([v, txt]) => h('button', { class: `btn small ${cur === v ? 'primary' : ''}`, type: 'button', 'aria-pressed': String(cur === v), onclick: () => { set(v); menu(); } }, txt)));
    setChildren(host, h('div', { class: 'stack calm-menu' },
      seg([['breath', `🌬️ ${t('calmBreath')}`], ['ground', `🖐️ ${t('calmGround')}`], ['scan', `🧍 ${t('calmScan')}`]], kind, (v) => { kind = v; }, t('calmKind')),
      kind === 'breath' ? seg(Object.keys(PATTERNS).map((id) => [id, t(`pat_${id}`)]), pattern, (v) => { pattern = v; }, t('calmPattern')) : null,
      seg(MIN_OPTIONS.map((m) => [m, t('calmMin', { n: m })]), minutes, (v) => { minutes = v; }, t('calmLength')),
      h('button', { class: 'btn primary xl', type: 'button', onclick: begin }, `▶ ${t('calmStart')}`),
      compact ? null : h('p', { class: 'note' }, t('calmNote'))));
  }
  function finish() {
    stop(); over = true;
    setChildren(host, h('div', { class: 'stack center calm-done' }, h('div', { class: 'big-emoji', 'aria-hidden': 'true' }, '🌿'), h('h2', {}, t('calmWell')), h('p', {}, t('moodAsk')),
      moodRow(async (v) => { await J.addEntry(S.activeProfile().id, { kind: 'calm', mood: v }); toast(t('jSaved')); }),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn', type: 'button', onclick: () => { over = false; menu(); } }, t('calmAgain')), onClose ? h('button', { class: 'btn primary', type: 'button', onclick: onClose }, t('calmBack')) : null)));
    native.vibrate([0, 80, 60, 80]);
  }
  function begin() {
    over = false; started = performance.now(); last = '';
    const total = kind === 'breath' ? cyclesFor(PATTERNS[pattern], minutes) * cycleSec(PATTERNS[pattern]) : minutes * 60;
    const circle = h('div', { class: 'breath-circle', 'aria-hidden': 'true' }), label = h('div', { class: 'calm-label', role: 'status', 'aria-live': 'polite' }), sub = h('div', { class: 'calm-sub' });
    const stopBtn = h('button', { class: 'btn', type: 'button', onclick: () => { stop(); menu(); } }, `⏹ ${t('calmStop')}`);
    setChildren(host, h('div', { class: 'stack center calm-run' }, h('div', { class: 'breath-stage' }, circle), label, sub, stopBtn));
    let lastSpoken = '';
    const frame = (now) => {
      const sec = (now - started) / 1000;
      if (sec >= total) { finish(); return; }
      if (kind === 'breath') {
        const ph = phaseAt(PATTERNS[pattern], sec), text = t(`ph_${ph.label}`);
        circle.style.setProperty('--sz', reduced() ? (ph.label === 'out' ? 0.4 : 1) : String(0.4 + 0.6 * ph.size));
        circle.dataset.phase = ph.label; setChildren(label, text); sub.textContent = `${Math.ceil(ph.left)}`;
        if (text !== lastSpoken) { lastSpoken = text; cue(ph.label); if (s.speak || s.coachSpeak) speakWithSettings(text); }
      } else {
        const list = kind === 'ground' ? GROUNDING : BODYSCAN, i = stepAt(list.length, total, sec), item = list[i];
        circle.style.setProperty('--sz', '0.8');
        const txt = kind === 'ground' ? t('groundStep', { n: item.n, sense: t(`sense_${item.sense}`) }) : t('scanStep', { part: t(`part_${item}`) });
        setChildren(label, txt); sub.textContent = `${i + 1}/${list.length}`;
        if (txt !== lastSpoken) { lastSpoken = txt; cue('in'); if (s.speak || s.coachSpeak) speakWithSettings(txt); }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
  menu();
  return () => { stop(); if (!over) host.replaceChildren(); };
}

export function renderCalm(root, nav) {
  const host = h('div', { class: 'card' });
  setChildren(root, h('section', { class: 'calm-page' }, h('div', { class: 'row between' }, h('h1', {}, `🌬️ ${t('calmTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav('#/') }, t('back'))), h('p', { class: 'muted' }, t('calmIntro')), host));
  return calmPanel(host, { onClose: () => nav('#/') });
}

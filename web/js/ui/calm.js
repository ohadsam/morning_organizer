// Calm corner: guided breathing, 5-4-3-2-1 grounding and a body scan. One tap from home and from the run screen.
import { h, setChildren } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import * as J from '../journal.js';
import { loadCalmKit, calmScenes, sceneStage, breathScene } from './calmScene.js';
import { storyFrame, scanZone } from '../calmKit.js';
import { kitNode } from './avatarKit.js';
import { isKit } from '../avatarKit.js';
import { PATTERNS, phaseAt, cyclesFor, cycleSec, GROUNDING, stepAt } from '../calm.js';
import { SCANS, SCAN_IDS, GUIDES, guideText } from '../calmGuides.js';
import { getLang } from '../i18n.js';
import { native } from '../native.js';
import { speakWithSettings } from './coach.js';
import { moodRow } from './capture.js';
import { toast } from './common.js';
import { openAprt } from './aprt.js';

const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || globalThis.document?.documentElement?.dataset.motion === 'calm';
const MIN_OPTIONS = [1, 2, 3], LONG_OPTIONS = [2, 3, 5];   // a guided journey or a full scan needs a few minutes

/** Renders the calm corner into `host`. opts.onDone() when the exercise ends. Returns a cleanup function. */
export function calmPanel(host, { onClose, compact = false, initial = {} } = {}) {
  let kind = ['breath', 'ground', 'scan', 'guide'].includes(initial.kind) ? initial.kind : 'breath', pattern = 'slow', minutes = 1, scanKind = 'quick', guideId = 'elements', raf = null, started = 0, last = '', over = false;
  const s = S.get().settings;
  const cue = (label) => { if (label === last) return; last = label; if (s.mode !== 'silent' && s.mode !== 'beep') native.vibrate([0, label === 'in' ? 120 : 60]) ; };
  function stop() { cancelAnimationFrame(raf); raf = null; }
  void loadCalmKit();
  function menu() {
    stop();
    const seg = (items, cur, set, label) => h('div', { class: 'seg-group', role: 'group', 'aria-label': label }, items.map(([v, txt]) => h('button', { class: `btn small ${cur === v ? 'primary' : ''}`, type: 'button', 'aria-pressed': String(cur === v), onclick: () => { set(v); menu(); } }, txt)));
    setChildren(host, h('div', { class: 'stack calm-menu' },
      seg([['breath', `🌬️ ${t('calmBreath')}`], ['ground', `🖐️ ${t('calmGround')}`], ['scan', `🧍 ${t('calmScan')}`], ['guide', `🧚 ${t('calmGuide')}`]], kind, (v) => { kind = v; if (!(kind === 'breath' || kind === 'ground' ? MIN_OPTIONS : LONG_OPTIONS).includes(minutes)) minutes = kind === 'breath' || kind === 'ground' ? 1 : 3; }, t('calmKind')),
      kind === 'scan' ? seg(SCAN_IDS.map((id) => [id, t(`scan_${id}`)]), scanKind, (v) => { scanKind = v; }, t('calmScanKind')) : null,
      kind === 'scan' ? h('small', { class: 'hint' }, t(`scanHint_${scanKind}`)) : null,
      kind === 'guide' ? h('div', { class: 'guide-grid', role: 'radiogroup', 'aria-label': t('calmGuide') }, GUIDES.map((g) => h('button', { type: 'button', class: `sound-tile ${guideId === g.id ? 'on' : ''}`, role: 'radio', 'aria-checked': String(guideId === g.id), onclick: () => { guideId = g.id; menu(); } }, h('span', { class: 'st-e', 'aria-hidden': 'true' }, g.emoji), h('span', {}, g.title[getLang() === 'he' ? 'he' : 'en'])))) : null,
      kind === 'breath' ? seg(Object.keys(PATTERNS).map((id) => [id, t(`pat_${id}`)]), pattern, (v) => { pattern = v; }, t('calmPattern')) : null,
      seg((kind === 'breath' || kind === 'ground' ? MIN_OPTIONS : LONG_OPTIONS).map((m) => [m, t('calmMin', { n: m })]), minutes, (v) => { minutes = v; }, t('calmLength')),
      kind === 'breath' ? seg([['scene', `🎨 ${t('calmVisScene')}`], ['avatar', `🧒 ${t('calmVisAvatar')}`], ['circle', `⚪ ${t('calmVisCircle')}`]], s.calmVisual || 'scene', (v) => { S.updateSettings({ calmVisual: v }); }, t('calmVisual')) : null,
      h('button', { class: 'btn primary xl', type: 'button', onclick: begin }, `▶ ${t('calmStart')}`),
      compact ? null : h('p', { class: 'note' }, t('calmNote'))));
  }
  function finish() {
    stop(); over = true;
    setChildren(host, h('div', { class: 'stack center calm-done' }, h('div', { class: 'big-emoji', 'aria-hidden': 'true' }, '🌿'), h('h2', {}, t('calmWell')), h('p', {}, t('moodAsk')),
      moodRow(async (v) => { await J.addEntry(S.activeProfile().id, { kind: 'calm', mood: v }); toast(t('jSaved')); }),
      S.features().journal !== false ? h('button', { class: 'btn', type: 'button', onclick: () => openAprt({}) }, `🧭 ${t('calmWrite')}`) : null,
      h('div', { class: 'row-btns' }, h('button', { class: 'btn', type: 'button', onclick: () => { over = false; menu(); } }, t('calmAgain')), onClose ? h('button', { class: 'btn primary', type: 'button', onclick: onClose }, t('calmBack')) : null)));
    native.vibrate([0, 80, 60, 80]);
  }
  function begin() {
    over = false; started = performance.now(); last = '';
    const total = kind === 'breath' ? cyclesFor(PATTERNS[pattern], minutes) * cycleSec(PATTERNS[pattern]) : minutes * 60;
    const vis = S.get().settings.calmVisual || 'scene', av = S.activeProfile?.()?.avatar, useAvatar = kind === 'breath' && vis === 'avatar' && isKit(av);
    const stage = !useAvatar && vis !== 'circle' && calmScenes() ? sceneStage(t('calmSceneAlt')) : null;
    const avNode = useAvatar ? kitNode(av, { size: 240, anim: 'calm' }) : null; if (avNode) avNode.classList.add('avatar-breathe');
    const circle = stage || avNode ? h('div', { class: 'breath-circle hidden-circle', 'aria-hidden': 'true' }) : h('div', { class: 'breath-circle', 'aria-hidden': 'true' }), label = h('div', { class: 'calm-label', role: 'status', 'aria-live': 'polite' }), sub = h('div', { class: 'calm-sub' });
    const stopBtn = h('button', { class: 'btn', type: 'button', onclick: () => { stop(); menu(); } }, `⏹ ${t('calmStop')}`);
    setChildren(host, h('div', { class: 'stack center calm-run' }, h('div', { class: `breath-stage ${stage || avNode ? 'has-scene' : ''}` }, stage ? stage.node : avNode ? avNode : circle), label, sub, stopBtn));
    let lastSpoken = '';
    const frame = (now) => {
      const sec = (now - started) / 1000;
      if (sec >= total) { finish(); return; }
      if (kind === 'breath') {
        const ph = phaseAt(PATTERNS[pattern], sec), text = t(`ph_${ph.label}`);
        circle.style.setProperty('--sz', reduced() ? (ph.label === 'out' ? 0.4 : 1) : String(0.4 + 0.6 * ph.size));
        const pp = reduced() ? (ph.label === 'out' ? 0 : 1) : ph.size; if (stage) stage.show(...breathScene(pattern, pp)); if (avNode) avNode.style.setProperty('--p', String(pp));
        circle.dataset.phase = ph.label; setChildren(label, text); sub.textContent = `${Math.ceil(ph.left)}`;
        if (text !== lastSpoken) { lastSpoken = text; cue(ph.label); if (s.speak || s.coachSpeak) speakWithSettings(text, { kind: 'short' }); }
      } else {
        const guide = kind === 'guide' ? guideText(guideId, getLang()) : null, scan = SCANS[scanKind] || SCANS.quick;
        const list = guide ? guide.steps : kind === 'ground' ? GROUNDING : scan.parts, i = stepAt(list.length, total, sec), item = list[i];
        circle.style.setProperty('--sz', '0.8'); if (guide) circle.dataset.emoji = guide.emoji;
        if (stage) stage.show(guide ? `imagery-${guideId}-f${storyFrame(i, list.length)}` : kind === 'ground' ? `grounding-${item.n}` : `bodyscan-${scanZone(i, list.length)}`);
        const txt = guide ? item : kind === 'ground' ? t('groundStep', { n: item.n, sense: t(`sense_${item.sense}`) }) : t(scan.step, { part: t(`part_${item}`) });
        setChildren(label, txt); sub.textContent = `${i + 1}/${list.length}`;
        if (txt !== lastSpoken) { lastSpoken = txt; cue('in'); if (s.speak || s.coachSpeak) speakWithSettings(txt, { kind: 'short' }); }
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

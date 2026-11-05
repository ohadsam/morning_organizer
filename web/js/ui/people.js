// People and needs: the small profile menu at the top of every screen, the "who is using the app?" choice, managing all profiles, and the
// "what do you need the app for?" picker (a way of working and/or what is hard) that makes the app show only what fits.
import { h, setChildren } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { modal, toast } from './common.js';
import { avatarNode, openProfileEditor, openProfiles } from './avatar.js';
import { MODELS, PROBLEMS, FEATURES, isFull, sanitizeView, visibleSet, labelKeys } from '../needs.js';

const MODEL_EMOJI = { full: '🌐', cbt: '🧠', cogfun: '🎯' }, PROBLEM_EMOJI = { adhd: '🎯', anxiety: '🌬️', organize: '🕒', motivation: '🚀' };
/** "Showing: Goals, Calm corner ..." for a view. */
export const shownList = (view) => { const set = visibleSet(view); return set ? FEATURES.filter((f) => set.has(f)).map((f) => t(`feat_${f}`)).join(', ') : ''; };
/** One readable line: "CBT · Anxiety and worry" or "Everything". */
export const needsLine = (view) => labelKeys(view).map((k) => t(k)).join(' · ');

/** The picker, in a sheet, for one profile. onDone() after saving. */
export function openNeeds(profile, onDone = () => {}) {
  const st = { ...sanitizeView(profile.view) }; st.problems = [...st.problems]; let age = profile.age;
  const body = h('div', { class: 'stack needs' });
  const tile = (label, desc, emoji, on, onclick, role) => h('button', { type: 'button', class: `wz-opt needs-opt ${on ? 'on' : ''}`, role, 'aria-checked': String(!!on), onclick },
    h('span', { class: 'wz-e', 'aria-hidden': 'true' }, emoji), h('span', {}, h('strong', {}, label), desc ? h('small', { class: 'hint' }, desc) : null));
  const draw = () => setChildren(body,
    h('p', { class: 'note' }, t('needsIntro')),
    h('h3', {}, t('needsModel')), h('div', { class: 'wz-list', role: 'radiogroup', 'aria-label': t('needsModel') }, MODELS.map((m) => tile(t(`need_${m}`), t(`needDesc_${m}`), MODEL_EMOJI[m], st.model === m, () => { st.model = m; draw(); }, 'radio'))),
    h('h3', {}, t('needsProblem')), h('div', { class: 'wz-list', role: 'group', 'aria-label': t('needsProblem') }, PROBLEMS.map((p) => tile(t(`need_${p}`), '', PROBLEM_EMOJI[p], st.problems.includes(p), () => { st.problems = st.problems.includes(p) ? st.problems.filter((x) => x !== p) : [...st.problems, p]; draw(); }, 'checkbox'))),
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('needsAge')), h('input', { type: 'number', min: 3, max: 120, inputMode: 'numeric', value: age ?? '', 'aria-label': t('needsAge'), oninput: (e) => { age = e.target.value; } }), h('small', { class: 'hint' }, t('needsAgeHint'))),
    h('p', { class: 'chip solid' }, isFull(st) ? `🌐 ${t('needEverything')}` : `👁 ${t('needShowing', { list: shownList(st) })}`), h('small', { class: 'hint' }, t('needHiddenNote')));
  draw();
  const m = modal(`🎯 ${t('needsTitle')}${profile.name ? ` · ${profile.name}` : ''}`, body, [
    { label: t('cancel') },
    isFull(profile.view) ? null : { label: t('needShowAll'), fn: async () => { await S.setNeeds(profile.id, { model: 'full', problems: [] }); toast(t('needAllToast')); onDone(); } },
    { label: t('needSave'), primary: true, fn: async () => { const a = Math.round(Number(age)); await S.patchProfile(profile.id, { age: Number.isFinite(a) && a >= 3 && a <= 120 ? a : null }); await S.setNeeds(profile.id, st); toast(t('needSaved')); onDone(); } }].filter(Boolean));
  return m;
}

/** The "People" settings group: every profile with Use / Needs / Edit, and Add. */
export function peopleManager(redraw) {
  const active = S.activeProfile().id;
  return h('div', { class: 'stack' }, h('p', { class: 'note' }, t('peopleHint')),
    S.profiles().map((p) => h('div', { class: `person-row ${p.id === active ? 'on' : ''}` },
      h('span', { class: 'pr-av' }, avatarNode(p.avatar, { size: 44 })),
      h('span', { class: 'pr-text' }, h('strong', {}, p.name || t('untitledProfile')), h('small', { class: 'hint' }, `${p.age ? `${p.age} · ` : ''}${needsLine(p.view)}`), p.id === active ? h('small', { class: 'chip solid' }, t('peopleActive')) : null),
      h('span', { class: 'pr-btns' },
        p.id === active ? null : h('button', { class: 'btn small primary', type: 'button', onclick: async () => { await S.switchProfile(p.id); redraw(); } }, t('peopleUse')),
        h('button', { class: 'btn small', type: 'button', onclick: () => openNeeds(p, redraw) }, `🎯 ${t('peopleNeeds')}`),
        h('button', { class: 'btn small', type: 'button', onclick: () => openProfileEditor(p, { onDone: redraw }) }, t('peopleEdit'))))),
    S.profiles().length < 12 ? h('button', { class: 'btn add', type: 'button', onclick: () => openProfileEditor(null, { onDone: async (np) => { if (np) { await S.switchProfile(np.id); openNeeds(S.activeProfile(), redraw); } redraw(); } }) }, `+ ${t('peopleAdd')}`) : null);
}

let docHandler = null;
/** The small "who" chip at the top: tap to switch person, add one, or manage everyone. */
export function profileMenu(nav) {
  const p = S.activeProfile(), panel = h('div', { class: 'pm-panel', hidden: true, role: 'menu', 'aria-label': t('tbProfile') });
  const btn = h('button', { type: 'button', class: 'pm-btn', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': `${t('tbProfile')}: ${p.name || t('untitledProfile')}` }, avatarNode(p.avatar, { size: 28 }), h('span', { class: 'pm-name' }, p.name || t('untitledProfile')), h('span', { class: 'pm-caret', 'aria-hidden': 'true' }, '▾'));
  const wrap = h('div', { class: 'pm' }, btn, panel);
  const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  const item = (node, fn) => { node.setAttribute('role', 'menuitem'); node.addEventListener('click', () => { close(); fn(); }); return node; };
  setChildren(panel,
    S.profiles().map((x) => item(h('button', { type: 'button', class: `pm-item ${x.id === p.id ? 'on' : ''}`, 'aria-current': x.id === p.id ? 'true' : null }, avatarNode(x.avatar, { size: 28 }), h('span', {}, x.name || t('untitledProfile')), x.id === p.id ? h('span', { 'aria-hidden': 'true' }, '✓') : null), async () => { if (x.id !== p.id) { await S.switchProfile(x.id); nav?.('#/'); } })),
    item(h('button', { type: 'button', class: 'pm-item' }, h('span', { 'aria-hidden': 'true' }, '＋'), h('span', {}, t('peopleAdd'))), () => openProfileEditor(null, { onDone: async (np) => { if (np) { await S.switchProfile(np.id); openNeeds(S.activeProfile()); } } })),
    item(h('button', { type: 'button', class: 'pm-item' }, h('span', { 'aria-hidden': 'true' }, '👥'), h('span', {}, t('tbManage'))), () => nav?.('#/settings/people')));
  btn.addEventListener('click', (e) => { e.stopPropagation(); const open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) panel.querySelector('button')?.focus(); });
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
  if (docHandler) document.removeEventListener('click', docHandler);   // one outside-click listener at a time (the bar is redrawn when people change)
  docHandler = (e) => { if (!wrap.contains(e.target)) close(); }; document.addEventListener('click', docHandler);
  return wrap;
}

/** Draws the top bar (hidden in the kids' mode and during a run). */
export function drawTopbar(nav) {
  const el = document.getElementById('topbar'); if (!el) return;
  if (S.get().settings.simpleMode) { el.replaceChildren(); el.hidden = true; return; }
  el.hidden = false; setChildren(el, h('div', { class: 'topbar-in' }, profileMenu(nav)));
}

/** At app start, with several people: "Who is using the app?" (once per visit; the choice is remembered). */
export function maybeAskWho(nav) {
  const s = S.get().settings; if (s.simpleMode || S.profiles().length < 2 || s.askProfile === false) return;
  try { if (sessionStorage.getItem('mo.picked')) return; sessionStorage.setItem('mo.picked', '1'); } catch { /* storage blocked: ask each time */ }
  openProfiles(nav);
}

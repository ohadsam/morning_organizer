// Avatar drawing, animation, picker, profile switcher and profile editor.
import { h, setChildren } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { CHARACTERS, AVATAR_COLORS, ANIMATIONS, sanitizeAvatar, characterShapes, avatarEmoji, isSafeGif, MAX_GIF_CHARS } from '../avatar.js';
import { levelInfo } from '../levels.js';
import { totalStars, finished } from '../stats.js';
import { resizeToDataUrl } from '../photo.js';
import { modal, toast, confirmBox, icon } from './common.js';
import { kitNode } from './avatarKit.js';
import { sunnyNode } from './mascot.js';
import { framedAvatar } from './scenery.js';
import { openAvatarStudio } from './avatarStudio.js';
import { openMyAvatars } from './avatarLibrary.js';

const NS = 'http://www.w3.org/2000/svg';
function svgNode(spec) {
  const e = document.createElementNS(NS, spec.tag);
  for (const [k, v] of Object.entries(spec.a || {})) e.setAttribute(k, String(v));
  if (spec.cls) e.setAttribute('class', spec.cls);
  for (const kid of spec.kids || []) e.append(svgNode(kid));
  return e;
}

/** A drawn avatar. `anim`: idle | wave | cheer | dance | sleep | alert | think (see css). Photos/GIFs use the same animation hooks. */
export function avatarNode(avatar, { size = 56, anim = 'idle', label = '' } = {}) {
  const a = sanitizeAvatar(avatar);
  let el;
  if (a.k === 'char') {
    const sh = characterShapes(a.id, a.color);
    el = document.createElementNS(NS, 'svg'); el.setAttribute('viewBox', '0 0 100 100'); el.setAttribute('class', 'avatar avatar-char');
    const body = document.createElementNS(NS, 'g'); body.setAttribute('class', 'av-body'); sh.body.forEach((s) => body.append(svgNode(s)));
    const z = document.createElementNS(NS, 'text'); z.setAttribute('class', 'av-z'); z.setAttribute('x', '72'); z.setAttribute('y', '20'); z.setAttribute('font-size', '22'); z.textContent = 'z';
    el.append(body, svgNode(sh.hand), z);
  } else if (a.k === 'sunny') { el = sunnyNode({ size, anim }); } else if (a.k === 'kit') { el = kitNode(a, { size, anim }); } else if (a.k === 'emoji') { el = h('span', { class: 'avatar avatar-emoji' }, a.e); el.style.fontSize = `${Math.round(size * 0.82)}px`; }
  else el = h('img', { class: 'avatar avatar-img', src: a.url, alt: '' });
  el.dataset.anim = anim; el.style.setProperty('--av', `${size}px`);
  if (label) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', label); } else el.setAttribute('aria-hidden', 'true');
  return el;
}
/** Plays an animation for `ms`, then settles back to idle. */
export function animate(node, anim, ms = 1800) {
  if (!node?.isConnected && !node) return;
  const put = (a) => { node.dataset.anim = a; node._kitSet?.(a); };   // a kit avatar also swaps its parts (arms, eyes, mouth)
  put(anim); clearTimeout(node._animTimer);
  if (anim !== 'idle') node._animTimer = setTimeout(() => put('idle'), ms);
}
export const currentAvatar = () => S.get().settings.avatar;

// ── picker ──
const level = () => levelInfo(totalStars(finished(S.myRuns()))).level;
export const avatarLevel = level;

/** onPick(avatar) is called when the person presses Done. `startLevel` lets the profile editor show the right unlocks. */
export function openAvatarPicker(initial, onPick, { lvl = level() } = {}) {
  let cur = sanitizeAvatar(initial);
  const preview = h('div', { class: 'av-preview' }), anims = h('div', { class: 'row-btns' }), grid = h('div', { class: 'char-grid' }), colors = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('accent') });
  const msg = h('p', { class: 'note', role: 'status' });
  let big;
  const ANIM_LABEL = { wave: '👋', cheer: '🎉', dance: '💃', sleep: '😴', alert: '😮', think: '🤔' };
  const EMOJIS = S.MASCOTS.concat(['🧒', '👧', '🦸', '🧙', '🐙', '🦁', '🐵', '🚀']);
  const draw = () => {
    setChildren(emojis, EMOJIS.map((e) => h('button', { type: 'button', class: `emoji-pick ${cur.k === 'emoji' && cur.e === e ? 'on' : ''}`, 'aria-label': e, 'aria-pressed': String(cur.k === 'emoji' && cur.e === e), onclick: () => { cur = { k: 'emoji', e }; draw(); } }, e)));
    big = avatarNode(cur, { size: 120, label: t('avatar') }); setChildren(preview, framedAvatar(big, lvl, 150));
    setChildren(anims, ANIMATIONS.filter((a) => a !== 'idle').map((a) => h('button', { class: 'btn small', type: 'button', 'aria-label': `${t('avatarAnim')}: ${a}`, onclick: () => animate(big, a, 2200) }, ANIM_LABEL[a])));
    const sunnyOn = cur.k === 'sunny';
    setChildren(grid, [h('button', { type: 'button', class: `char ${sunnyOn ? 'on' : ''}`, role: 'radio', 'aria-checked': String(sunnyOn), 'aria-label': t('avSunny'), title: t('avSunny'), onclick: () => { cur = { k: 'sunny' }; draw(); } }, avatarNode({ k: 'sunny' }, { size: 52 })), ...Object.entries(CHARACTERS).map(([id, c]) => {
      const locked = c.unlock > lvl, on = cur.k === 'char' && cur.id === id;
      return h('button', { type: 'button', class: `char ${on ? 'on' : ''}`, disabled: locked, role: 'radio', 'aria-checked': String(on), 'aria-label': locked ? `${c.emoji} ${t('avatarLocked', { n: c.unlock })}` : c.emoji,
        onclick: () => { cur = { k: 'char', id, color: cur.k === 'char' && !c.fixed ? cur.color : c.base }; draw(); } }, avatarNode({ k: 'char', id, color: c.base }, { size: 52 }), locked ? h('small', {}, `🔒 ${t('levelShort', { n: c.unlock })}`) : null);
    })]);
    const ch = cur.k === 'char' ? CHARACTERS[cur.id] : null;
    setChildren(colors, ch && !ch.fixed ? AVATAR_COLORS.map((c) => h('button', { type: 'button', class: `swatch ${cur.color === c ? 'on' : ''}`, style: { '--c': c }, role: 'radio', 'aria-checked': String(cur.color === c), 'aria-label': c, onclick: () => { cur = { ...cur, color: c }; draw(); } })) : []);
  };
  const photoIn = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; try { cur = { k: 'photo', url: await resizeToDataUrl(f, 160) }; msg.textContent = ''; draw(); } catch { msg.textContent = t('photoBad'); } } });
  const camIn = h('input', { type: 'file', accept: 'image/*', capture: 'user', hidden: true, onchange: (e) => photoIn.onchange(e) });
  const gifIn = h('input', { type: 'file', accept: 'image/gif', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (f.size * 1.4 > MAX_GIF_CHARS) { msg.textContent = t('gifTooBig'); return; }
    const url = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => res(''); r.readAsDataURL(f); });
    if (!isSafeGif(url)) { msg.textContent = t('gifBad'); return; } cur = { k: 'gif', url }; msg.textContent = ''; draw();
  } });
  const emojis = h('div', { class: 'swatches', role: 'group', 'aria-label': t('avatarEmoji') });
  draw();
  const m = modal(t('avatar'), h('div', { class: 'stack avatar-picker' }, preview, anims,
    h('h3', {}, t('avkOwn')), h('div', { class: 'toolbar wrap' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => openAvatarStudio({ avatar: cur, lvl, onUse: (k) => { onPick(k); m.close(); } }) }, `🎨 ${t('avkBuild')}`),
      h('button', { class: 'btn', type: 'button', onclick: () => openMyAvatars({ lvl, onUse: (k) => { onPick(k); m.close(); } }) }, `🧑‍🎨 ${t('avkLibrary')}`)),
    h('h3', {}, t('avatarCharacters')), grid, colors, h('h3', {}, t('avatarOwn')),
    h('div', { class: 'toolbar wrap' }, h('button', { class: 'btn', type: 'button', onclick: () => camIn.click() }, '📷 ', t('avatarCamera')), h('button', { class: 'btn', type: 'button', onclick: () => photoIn.click() }, '🖼️ ', t('avatarPhoto')),
      h('button', { class: 'btn', type: 'button', onclick: () => gifIn.click() }, '🎞️ ', t('avatarGif'))), photoIn, camIn, gifIn, msg, h('h3', {}, t('avatarEmoji')), emojis),
  [{ label: t('cancel') }, { label: t('ok'), primary: true, fn: () => { onPick(cur); } }]);
  return m;
}

// ── profile editor + switcher ──
export function openProfileEditor(profile, { onDone } = {}) {
  const isNew = !profile; let p = profile ? { ...profile } : { id: undefined, name: '', age: null, gender: 'other', avatar: sanitizeAvatar(null) };
  const lvl = profile ? levelInfo(totalStars(finished(S.runsForProfile(profile.id)))).level : 1;
  const name = h('input', { type: 'text', maxLength: 30, value: p.name, autocomplete: 'off', 'aria-label': t('personName') });
  const age = h('input', { type: 'number', min: 3, max: 120, inputMode: 'numeric', value: p.age ?? '', 'aria-label': t('age') });
  const gender = h('select', { 'aria-label': t('gender') }, [['female', t('gFemale')], ['male', t('gMale')], ['other', t('gOther')]].map(([v, l]) => h('option', { value: v, selected: p.gender === v }, l)));
  const avBtn = h('button', { class: 'avatar-btn', type: 'button', 'aria-label': t('avatar'), onclick: () => openAvatarPicker(p.avatar, (a) => { p.avatar = a; setChildren(avBtn, avatarNode(a, { size: 72 })); }, { lvl }) }, avatarNode(p.avatar, { size: 72 }));
  const m = modal(isNew ? t('addProfile') : t('editProfile'), h('div', { class: 'stack' }, h('div', { class: 'row', style: { 'justify-content': 'center' } }, avBtn), h('p', { class: 'note', style: { 'text-align': 'center' } }, t('avatarTap')),
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('personName')), name), h('div', { class: 'two' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('age')), age), h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('gender')), gender))),
  [{ label: t('cancel') }, !isNew && S.profiles().length > 1 ? { label: t('delete'), danger: true, fn: async () => {
    if (!(await confirmBox(t('deleteProfileConfirm', { name: p.name || '?' }), t('delete'), true))) return false; await onDeleteProfile?.(p.id); await S.deleteProfile(p.id); onDone?.(); } } : null,
  { label: t('save'), primary: true, fn: async () => { try { const saved = await S.saveProfile({ ...p, name: name.value, age: age.value, gender: gender.value }); onDone?.(saved); } catch { toast(t('error')); return false; } } }].filter(Boolean));
  return m;
}
let onDeleteProfile = null; export const setProfileDeleteHook = (fn) => { onDeleteProfile = fn; };

export function openProfiles(nav) {
  const body = h('div', { class: 'stack' });
  const draw = () => setChildren(body, h('div', { class: 'profile-grid' }, S.profiles().map((p) => h('button', { type: 'button', class: `profile-card ${p.id === S.activeProfile().id ? 'on' : ''}`, 'aria-pressed': String(p.id === S.activeProfile().id),
    onclick: async () => { await S.switchProfile(p.id); m.close(); nav?.('#/'); } }, avatarNode(p.avatar, { size: 64 }), h('strong', {}, p.name || t('untitledProfile')))),
    S.profiles().length < 12 ? h('button', { type: 'button', class: 'profile-card add', onclick: () => { m.close(); openProfileEditor(null, { onDone: async (np) => { if (np) await S.switchProfile(np.id); nav?.('#/'); } }); } }, h('span', { class: 'plus' }, '+'), h('strong', {}, t('addProfile'))) : null));
  draw();
  const m = modal(t('whoIsPlaying'), body, [{ label: t('close') }]); return m;
}

// Family tab: parent dashboard (children, rewards, routines, cheers) and child view (parent, goal, cheers). No server - see link.js.
import { h, fmtDur, setChildren, clamp } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import * as F from '../family.js';
import { rewardProgress } from '../rewards.js';
import { finished } from '../stats.js';
import { native } from '../native.js';
import { NFC_MIME } from '../share.js';
import { btAvailable, btState, subscribeBt } from '../transports.js';
import { modal, toast, confirmBox, icon } from './common.js';
import { routeIncoming } from './incoming.js';
import { confetti } from './fx.js';
import { openQr, openScanner } from './qr.js';
import { qrFits } from '../qr.js';
import { avatarNode } from './avatar.js';
import { openFocusPicker } from './focus.js';
import { openMenuEditor } from './menu.js';
import { openGoalWizard } from './goals.js';

const ago = (ms) => (ms ? new Date(ms).toLocaleString(getLang(), { dateStyle: 'short', timeStyle: 'short' }) : '—');
const mini = (pct) => h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pct * 100)) }, h('i', { style: { width: `${Math.round(clamp(pct, 0, 1) * 100)}%` } }));

async function copy(text) { try { await navigator.clipboard.writeText(text); toast(t('shareCopied')); } catch { toast(t('error')); } }

/** Code + the ways to carry it to the other phone: copy, share sheet (Bluetooth/Nearby/messenger), NFC tag. */
/** Button that makes this phone read an offer from the phone held against it (native app, NFC card emulation on the other side). */
export const tapReceiveButton = () => [(native.available && native.nfcPhoneSupported()
  ? h('button', { class: 'btn', type: 'button', onclick: () => native.nfcReceive(60) }, icon('nfc', 18), t('tapReceive')) : null),
  h('button', { class: 'btn', type: 'button', onclick: () => openScanner((text) => routeIncoming(text)) }, '▦ ', t('qrScan'))];

function codeTools(code, title) {
  const nfcOk = (native.available || 'NDEFReader' in globalThis) && code.length <= 800;
  const tapOk = native.available && native.nfcPhoneSupported() && code.length <= 4000; // phone-to-phone: card emulation (the other phone reads)
  const status = h('p', { class: 'note', 'aria-live': 'polite' });
  return h('div', { class: 'stack' }, h('textarea', { readOnly: true, rows: 4, class: 'code', 'aria-label': title }, code),
    h('div', { class: 'toolbar wrap' },
      h('button', { class: 'btn', type: 'button', onclick: () => copy(code) }, icon('copy', 18), t('shareCopy')),
      h('button', { class: 'btn primary', type: 'button', onclick: async () => { if (native.available) native.share(title, code); else if (navigator.share) { try { await navigator.share({ title, text: code }); } catch { /* cancelled */ } } else copy(code); } }, icon('share', 18), t('shareSend')),
      qrFits(code) ? h('button', { class: 'btn', type: 'button', onclick: () => openQr(code, title) }, '▦ ', t('qrShow')) : null,
      tapOk ? h('button', { class: 'btn', type: 'button', onclick: () => { if (native.nfcOffer(code)) { status.textContent = t('tapHold'); } else status.textContent = t('tapUnavailable'); } }, icon('nfc', 18), t('tapOffer')) : null,
      nfcOk ? h('button', { class: 'btn', type: 'button', onclick: async () => {
        status.textContent = t('shareNfcTap');
        try { if (native.available) native.nfcWrite(code); else await new globalThis.NDEFReader().write({ records: [{ recordType: 'mime', mediaType: NFC_MIME, data: new TextEncoder().encode(code) }] }); status.textContent = t('shareNfcOk'); } catch { status.textContent = t('shareNfcFail'); }
      } }, icon('nfc', 18), t('shareNfc')) : (code.length > 800 ? h('small', { class: 'hint' }, t('nfcTooBig')) : null)), status);
}
export function openOutbox(title, envelope) { return modal(title, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('outboxHint')), codeTools(envelope, title)), [{ label: t('close') }]); }

// ── child: join ──
export function openJoin(prefill = '') {
  const input = h('textarea', { rows: 4, class: 'code', placeholder: t('pasteHere'), 'aria-label': t('joinTitle'), maxLength: 70000 }, prefill);
  const msg = h('p', { class: 'note', role: 'status' }, t('joinHint'));
  const nfc = 'NDEFReader' in globalThis ? h('button', { class: 'btn', type: 'button', onclick: async () => {
    try { const r = new globalThis.NDEFReader(); msg.textContent = t('shareNfcTap'); await r.scan(); r.onreading = ({ message }) => { const rec = message.records.find((x) => x.mediaType === NFC_MIME); if (rec) input.value = new TextDecoder().decode(rec.data); }; } catch { msg.textContent = t('shareNfcFail'); }
  } }, icon('nfc', 18), t('shareNfcRead')) : null;
  const m = modal(t('joinTitle'), h('div', { class: 'stack' }, input, nfc, tapReceiveButton(), msg), [{ label: t('joinBtn'), primary: true, fn: async () => {
    try { const { link, reply } = await F.acceptInvite(input.value); m.close(); toast(t('childLinked', { name: link.peer.name || '?' })); openOutbox(t('joinReply'), reply); }
    catch (e) { msg.textContent = e.message === 'already-linked' ? t('joinAlready') : t('joinBad'); msg.classList.add('err'); return false; }
  } }]);
  return m;
}

// ── parent: invite ──
function openInvite() {
  const live = h('input', { type: 'checkbox' });
  const out = h('div', { class: 'stack' }), reply = h('textarea', { rows: 3, class: 'code', placeholder: t('inviteReply'), 'aria-label': t('inviteReply') });
  const make = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
    make.disabled = true;
    const { code } = await F.createInvite(S.get().settings.personName || '', { live: live.checked });
    out.replaceChildren(codeTools(code, t('inviteTitle')), h('small', { class: 'hint' }, t('inviteFresh')), reply,
      h('div', { class: 'toolbar wrap' }, h('button', { class: 'btn', type: 'button', onclick: async () => { if (reply.value.trim()) { await routeIncoming(reply.value); reply.value = ''; } } }, t('inviteProcess')), tapReceiveButton()));
  } }, t('inviteGenerate'));
  return modal(t('inviteTitle'), h('div', { class: 'stack' }, h('p', { class: 'note' }, t('inviteHint')),
    h('label', { class: 'switch row' }, h('span', {}, t('inviteLive')), live), make, out), [{ label: t('close') }]);
}

// ── Bluetooth dialog (native app only) ──
function openBluetooth(role) {
  const body = h('div', { class: 'stack' });
  const draw = () => {
    if (!native.available || !btAvailable()) { body.replaceChildren(h('p', { class: 'note' }, t('btOnlyApp'))); return; }
    const st = native.btStatus(), bs = btState();
    const note = st === 'no-permission' ? t('btNoPerm') : st === 'off' ? t('btOff') : bs.state === 'listening' ? t('btListening') : bs.open ? `${t('btConnected')} ${bs.peer}` : bs.state.startsWith('error') ? t('btError') : '';
    const kids = [h('p', { class: 'note' }, t('btPairFirst')), note ? h('p', { role: 'status', class: 'chip solid' }, note) : null];
    if (st === 'no-permission') kids.push(h('button', { class: 'btn primary', type: 'button', onclick: () => native.requestBluetooth() }, t('accept')));
    else if (st === 'ok' && role === 'parent') kids.push(h('button', { class: 'btn primary', type: 'button', onclick: () => native.btListen() }, t('btWait')));
    else if (st === 'ok') { const list = native.btPaired(); kids.push(h('h3', {}, t('btPick')), list.length ? list.map((d) => h('button', { class: 'btn', type: 'button', onclick: () => native.btConnect(d.address) }, `📱 ${d.name}`)) : h('p', { class: 'note' }, t('btNone'))); }
    body.replaceChildren(...kids.flat().filter(Boolean));
  };
  draw(); const off = subscribeBt(draw);
  const m = modal(t('btTitle'), body, [{ label: t('close') }]); m.el.addEventListener('close', off); return m;
}

// ── parent actions ──
const deliver = (res, name) => { if (!res.delivered) openOutbox(t('sendToChild', { name }), res.envelope); else toast(t('rcvOk')); };
function openAssign(link) {
  const { templates } = S.get(), boxes = templates.map((x) => ({ x, cb: h('input', { type: 'checkbox' }) }));
  modal(t('assignRoutine'), h('div', { class: 'stack' }, h('p', { class: 'note' }, t('assignHint', { name: link.peer.name })), boxes.map(({ x, cb }) => h('label', { class: 'switch row' }, h('span', {}, `${x.icon} ${x.name}`), cb))),
    [{ label: t('cancel') }, { label: t('sendNow'), primary: true, fn: async () => { const ids = boxes.filter((b) => b.cb.checked).map((b) => b.x.id); if (!ids.length) return false; deliver(await F.assignRoutines(link.id, ids), link.peer.name); } }]);
}
function openCheer(link) {
  const custom = h('input', { type: 'text', maxLength: 120, placeholder: t('cheerCustom'), 'aria-label': t('cheerCustom') });
  const m = modal(t('cheerTitle'), h('div', { class: 'stack' }, ['ch1', 'ch2', 'ch3', 'ch4'].map((k) => h('button', { class: 'btn', type: 'button', onclick: async () => { m.close(); deliver(await F.cheer(link.id, t(k)), link.peer.name); } }, t(k))), custom),
    [{ label: t('cancel') }, { label: t('sendNow'), primary: true, fn: async () => { if (!custom.value.trim()) return false; deliver(await F.cheer(link.id, custom.value), link.peer.name); } }]);
}
function openGoal(link) {
  const name = h('input', { type: 'text', maxLength: 40, placeholder: t('goalName'), 'aria-label': t('goalName'), value: link.child.goal?.title || '' });
  const target = h('input', { type: 'number', min: 1, max: 999, inputMode: 'numeric', value: link.child.goal?.target || 10, 'aria-label': t('goalStars') });
  const mode = h('select', { 'aria-label': t('goalType') }, [['stars', t('goalTypeStars')], ['week', t('goalTypeWeek')]].map(([v, l]) => h('option', { value: v, selected: (link.child.goal?.mode || 'stars') === v }, l)));
  const emoji = h('select', { 'aria-label': t('goalTitle') }, ['🎁', '🍦', '🎮', '🧸', '🍕', '🎬', '🏊', '📚'].map((e) => h('option', { value: e, selected: link.child.goal?.emoji === e }, e)));
  modal(t('goalTitle'), h('div', { class: 'stack' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('goalName')), name), h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('goalType')), mode), h('small', { class: 'hint' }, t('goalTypeHint')), h('div', { class: 'two' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('goalStars')), target), h('label', { class: 'field' }, h('span', { class: 'lbl' }, '🎁'), emoji))),
    [{ label: t('cancel') }, link.child.goal ? { label: t('goalClear'), danger: true, fn: async () => { deliver(await F.clearGoal(link.id), link.peer.name); } } : null,
      { label: t('goalSet'), primary: true, fn: async () => { if (!name.value.trim()) return false; deliver(await F.setGoal(link.id, { title: name.value, emoji: emoji.value, target: target.value, mode: mode.value }), link.peer.name); } }].filter(Boolean));
}

const chip = (on, label) => h('span', { class: `chip solid ${on ? '' : 'off'}`, style: { '--accent': on ? 'var(--good)' : 'var(--muted)' } }, label);
function transportRow(link, role) {
  const live = F.isLive(link.id);
  return h('div', { class: 'transports' }, chip(live, live ? `● ${t('liveOn')}` : `○ ${t('liveOff')}`),
    h('div', { class: 'row-btns' },
      role === 'parent' ? h('button', { class: 'btn small', type: 'button', onclick: async () => { const r = await F.createLiveOffer(link.id); openOutbox(t('liveWifi'), r.envelope); } }, '📶 ', t('liveWifi')) : null,
      h('button', { class: 'btn small', type: 'button', onclick: () => openBluetooth(role) }, '🔵 ', t('liveBt'))),
    h('small', { class: 'hint' }, t('liveHint')));
}

function childCard(link) {
  const c = link.child, r = c.report, prog = c.goal ? rewardProgress(c.goal, []) : null, have = r?.goalHave ?? 0;
  return h('article', { class: 'card family-card' },
    h('div', { class: 'row between' }, h('span', { class: 'row' }, avatarNode(c.profile.avatar || { k: 'emoji', e: c.profile.mascot || '🙂' }, { size: 44 }), h('strong', {}, `${c.profile.name || link.peer.name || '?'}${c.profile.age ? ` (${c.profile.age})` : ''}`)),
      h('button', { class: 'btn small danger', type: 'button', onclick: async () => { if (await confirmBox(t('unlinkConfirm'), t('unlink'), true)) await F.unlink(link.id); } }, t('unlink'))),
    r ? [h('div', { class: 'tiles' }, h('div', { class: 'tile' }, h('small', {}, t('stars')), h('strong', {}, `⭐ ${r.totalStars}`)), h('div', { class: 'tile' }, h('small', {}, t('streak')), h('strong', {}, `🔥 ${r.streakDays}`)), h('div', { class: 'tile' }, h('small', {}, t('lastReport', { when: '' })), h('strong', {}, ago(r.at)))),
      r.active ? h('div', { class: 'active-run' }, h('strong', {}, t('doingNow', { name: `${r.active.icon} ${r.active.name}`, task: r.active.task })), r.active.paused ? h('span', {}, ` ⏸ ${t('paused2')}`) : null, mini(r.active.pct)) : null,
      (r.digest?.slow?.length || r.digest?.unp?.length || r.digest?.hard?.length) ? h('div', { class: 'card' }, h('h3', {}, `💡 ${t('digestTitle')}`), h('ul', { class: 'unp-list' }, [...(r.digest.hard || []).map((x) => h('li', {}, t('digestHard', { name: x.name, avg: x.avg }))), ...r.digest.slow.map((x) => h('li', {}, t('digestSlow', { name: x.name, t: fmtDur(x.overSec) }))), ...r.digest.unp.map((x) => h('li', {}, t('digestUnp', { emoji: x.emoji, name: x.label, n: x.n })))])) : null,
      r.recent.length ? h('div', {}, h('h3', {}, t('recentRuns')), h('table', { class: 'tbl' }, h('tbody', {}, r.recent.slice(0, 3).map((x) => h('tr', { class: x.actual > x.planned ? 'over' : '' }, h('td', {}, `${x.icon} ${x.name}`), h('td', {}, ago(x.endedAt)), h('td', {}, '⭐'.repeat(x.stars) || '—'), h('td', {}, fmtDur(x.actual))))))) : null] : h('p', { class: 'note' }, t('noReportYet')),
    h('label', { class: 'switch row' }, h('span', {}, `🔔 ${t('alertsOn')}`), h('input', { type: 'checkbox', checked: c.alertsOn !== false, onchange: (e) => F.setAlertsOn(link.id, e.target.checked) })),
    c.alerts?.length ? h('p', { class: 'chip solid', style: { '--accent': 'var(--warn)' } }, `🔔 ${t(c.alerts[0].kind === 'overtime' ? 'alertBehind' : 'alertLate', { name: c.profile.name || link.peer.name || '?', routine: c.alerts[0].name, min: c.alerts[0].minutes })}`) : null,
    (c.requests || []).length ? h('div', { class: 'card' }, h('h3', {}, `🎁 ${t('menuRequests')}`), c.requests.map((q) => h('div', { class: 'row between' }, h('span', {}, `${q.emoji} ${q.title} (${q.cost}⭐)`),
      h('button', { class: 'btn small primary', type: 'button', onclick: async () => deliver(await F.markGiven(link.id, q.id), link.peer.name) }, t('menuMarkGiven'))))) : null,
    c.goal ? h('div', { class: 'goal' }, h('strong', {}, `${c.goal.emoji} ${c.goal.title}`), mini(Math.min(1, have / c.goal.target)), h('small', {}, t(c.goal.mode === 'week' ? 'goalProgressWeek' : 'goalProgress', { have, target: c.goal.target })),
      c.goalDone ? h('p', { class: 'chip solid' }, `🎉 ${t('goalReached', { title: c.goalDone.title })}`) : null) : h('p', { class: 'note' }, t('goalNone')),
    h('div', { class: 'row-btns' },
      h('button', { class: 'btn', type: 'button', onclick: () => openAssign(link) }, '📋 ', t('assignRoutine')), h('button', { class: 'btn', type: 'button', onclick: () => openCheer(link) }, '👏 ', t('cheerTitle')), h('button', { class: 'btn', type: 'button', onclick: () => openGoal(link) }, '🎁 ', t('goalTitle')),
      h('button', { class: 'btn', type: 'button', onclick: () => openFocusPicker({ areas: c.focus?.areas || [], tools: c.focus?.tools || {}, title: t('focusFor', { name: link.peer.name }), intro: t('focusParentIntro', { name: link.peer.name }), onSave: async (v) => deliver(await F.setFocus(link.id, v), link.peer.name) }) }, '🎯 ', t('focusTitle')),
      r?.active ? h('button', { class: 'btn', type: 'button', onclick: async () => deliver(await F.sitWith(link.id), link.peer.name) }, '👀 ', t('sitWith')) : null,
      h('button', { class: 'btn', type: 'button', onclick: () => openGoalWizard(null, { parent: true, onSave: async (g) => deliver(await F.sendGoalPlan(link.id, g), link.peer.name) }) }, '🎯 ', t('goalSuggest')),
      h('button', { class: 'btn', type: 'button', onclick: () => openMenuEditor(c.menu || [], async (m) => deliver(await F.sendMenu(link.id, m), link.peer.name)) }, '🍦 ', t('menuTitle'))),
    transportRow(link, 'parent'));
}

function parentCard(link) {
  const p = link.parent, prog = rewardProgress(p.goal, finished(S.myRuns()));
  return h('article', { class: 'card family-card' },
    h('div', { class: 'row between' }, h('strong', {}, `👪 ${p.name || link.peer.name || '?'}`), h('button', { class: 'btn small danger', type: 'button', onclick: async () => { if (await confirmBox(t('unlinkConfirm'), t('unlink'), true)) await F.unlink(link.id); } }, t('unlink'))),
    p.goal ? h('div', { class: 'goal' }, h('strong', {}, `${p.goal.emoji} ${p.goal.title}`), mini(prog.pct), h('small', {}, t(p.goal.mode === 'week' ? 'goalProgressWeek' : 'goalProgress', { have: prog.have, target: prog.target })), prog.reached ? h('p', { class: 'chip solid' }, `🎉 ${t('goalReached', { title: p.goal.title })}`) : null) : h('p', { class: 'note' }, t('goalNone')),
    p.cheers?.length ? h('div', {}, h('h3', {}, t('cheers')), h('ul', { class: 'cheers' }, p.cheers.slice(0, 4).map((c) => h('li', {}, `${c.emoji} ${c.text}`)))) : null,
    h('div', { class: 'row-btns' }, h('button', { class: `btn ${link.pendingReport ? 'primary' : ''}`, type: 'button', onclick: async () => { const r = await F.sendReport(link.id); link.pendingReport = false; if (!r.delivered) openOutbox(t('sendReport'), r.envelope); else toast(t('rcvOk')); } }, '📤 ', t('sendReport'), link.pendingReport ? ' ●' : '')),
    transportRow(link, 'child'));
}

export function renderFamily(root) {
  const draw = () => {
    const parents = F.parentLinks(), kids = F.childLinks();
    setChildren(root, h('h1', {}, `👨‍👩‍👧 ${t('family')}`), h('p', { class: 'note' }, t('famIntro')),
      h('div', { class: 'toolbar wrap' }, tapReceiveButton(), h('button', { class: 'btn primary', type: 'button', onclick: openInvite }, icon('plus', 18), t('addChild')), h('button', { class: 'btn', type: 'button', onclick: () => openJoin() }, t('joinParent')),
        h('button', { class: 'btn', type: 'button', onclick: () => { const ta = h('textarea', { rows: 4, class: 'code', placeholder: t('pasteHere'), 'aria-label': t('pasteAny') }); modal(t('pasteAny'), ta, [{ label: t('cancel') }, { label: t('importBtn'), primary: true, fn: async () => { await routeIncoming(ta.value); } }]); } }, t('pasteAny'))),
      parents.length ? h('section', {}, h('h2', {}, t('linkedChildren')), h('div', { class: 'stack' }, parents.map(childCard))) : null,
      kids.length ? h('section', {}, h('h2', {}, t('linkedParents')), h('div', { class: 'stack' }, kids.map(parentCard))) : null);
  };
  draw();
  const a = F.subscribeFamily(draw), b = subscribeBt(draw);
  return () => { a(); b(); };
}

/** After a run: celebrate reached reward goals. */
export function celebrateGoals(reached) {
  for (const { goal } of reached) { confetti(document.body, 60); modal(`${goal.emoji} ${t('goalReached', { title: goal.title })}`, h('div', { class: 'big-emoji bounce' }, '🎉'), [{ label: t('close'), primary: true }]); }
}

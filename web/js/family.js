// Parent/child family linking: state, message handling and transports. No server - see link.js for the protocol.
import { db } from './db.js';
import * as S from './store.js';
import { native } from './native.js';
import { newKey, randomId, makeEnvelope, readEnvelope, parseEnvelope, packInvite, readInvite } from './link.js';
import { sanitizeGoal, rewardProgress, buildReport, sanitizeReport, weekStart } from './rewards.js';
import { createOffer, createAnswer, rtcSupported } from './rtc.js';
import { streak, totalStars, finished } from './stats.js';
import { cleanText, clamp } from './util.js';
import { sanitizeAvatar, shareableAvatar, avatarEmoji } from './avatar.js';
import { publicProfile, sanitizeTools } from './profiles.js';
import { sanitizeAreas } from './focus.js';
import { sanitizeMenu } from './menu.js';
import { sanitizeGoal as sanitizeCogGoal } from './cogfun.js';

export const INVITE_TTL_MS = 24 * 3600 * 1000;
const state = { links: [], invites: [], live: new Map(), offers: new Map(), ready: false };
const subs = new Set();
let alertHook = null; export const setAlertHook = (fn) => { alertHook = fn; };
export const subscribeFamily = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((f) => f(state));
export const getFamily = () => state;
export const linkById = (id) => state.links.find((l) => l.id === id);
export const parentLinks = () => state.links.filter((l) => l.role === 'parent');
const linkProfileId = (l) => l.profileId || S.profiles()[0]?.id;
/** Child links of the ACTIVE profile (a shared phone: each person has their own parents/links). */
export const childLinks = () => state.links.filter((l) => l.role === 'child' && linkProfileId(l) === S.activeProfile()?.id);
export const allChildLinks = () => state.links.filter((l) => l.role === 'child');
export const isLive = (id) => !!state.live.get(id)?.open;
const persist = async () => { await db.put('kv', state.links, 'links'); await db.put('kv', state.invites, 'invites'); emit(); };

export async function initFamily() {
  state.links = (await db.get('kv', 'links')) || [];
  const now = Date.now();
  state.invites = ((await db.get('kv', 'invites')) || []).filter((i) => !i.used && now - i.createdAt < INVITE_TTL_MS);
  state.ready = true; emit();
}

export const profileOf = (p = S.activeProfile()) => ({ ...publicProfile(p), mascot: avatarEmoji(p.avatar) });
const cleanProfile = (p = {}) => ({ name: cleanText(p.name, 30), age: Number.isFinite(Number(p.age)) ? clamp(Math.round(Number(p.age)), 0, 120) : null,
  gender: ['female', 'male', 'other'].includes(p.gender) ? p.gender : 'other', mascot: cleanText(p.mascot, 8), avatar: shareableAvatar(p.avatar) });

// ── live transports (WebRTC data channel, Bluetooth socket): anything with { send(text) -> bool, open } ──
export function setLive(linkId, channel) {
  state.live.set(linkId, channel); emit();
  const link = linkById(linkId); if (link?.role === 'child') sendReport(linkId).catch(() => {});
}
export function dropLive(linkId) { state.live.delete(linkId); emit(); }
const rtcHooks = (linkId) => ({ onmessage: (text) => receive(text, state.live.get(linkId)).catch(() => {}), onclose: () => dropLive(linkId) });

// ── parent: invite / approve ──
export async function createInvite(parentName, { live = false } = {}) {
  const invite = { inviteId: randomId(), linkId: randomId(), key: newKey(), createdAt: Date.now(), used: false };
  let offer = '';
  if (live && rtcSupported()) { const off = await createOffer(rtcHooks(invite.linkId)); state.offers.set(invite.linkId, off); offer = off.sdp; }
  state.invites.push(invite); await persist();
  return { invite, code: await packInvite({ inviteId: invite.inviteId, linkId: invite.linkId, key: invite.key, parentName, offer }) };
}

export async function approveJoin(pending) {
  const { invite, profile, answer, temp } = pending;
  if (invite.used) throw new Error('used');
  invite.used = true;
  const link = { id: invite.linkId, role: 'parent', peer: { name: profile.name }, key: invite.key, seqOut: temp.seqOut, seen: temp.seen, createdAt: Date.now(),
    child: { profile, report: null, goal: null, lastSeen: Date.now() } };
  state.links.push(link); state.invites = state.invites.filter((i) => i !== invite);
  const off = state.offers.get(link.id);
  if (off && answer) { try { await off.accept(answer); off.channel.opened.then(() => setLive(link.id, off.channel)); } catch { /* live link is optional */ } }
  await persist();
  return { link, welcome: await send(link.id, 'welcome', { parentName: S.get().settings.personName || '', goal: null }) };
}
export async function rejectJoin(pending) { pending.invite.used = true; state.invites = state.invites.filter((i) => i !== pending.invite); await persist(); }

// ── child: join ──
export async function acceptInvite(text, profile = profileOf(), profileId = S.activeProfile().id) {
  const inv = await readInvite(text);
  if (state.links.some((l) => l.id === inv.linkId)) throw new Error('already-linked');
  const link = { id: inv.linkId, role: 'child', profileId, peer: { name: inv.parentName }, key: inv.key, seqOut: 0, seen: [], createdAt: Date.now(), parent: { name: inv.parentName, goal: null, cheers: [] } };
  let answer = '';
  if (inv.offer && rtcSupported()) {
    try { const a = await createAnswer(inv.offer, rtcHooks(link.id)); answer = a.sdp; a.channel.then((ch) => ch.opened.then(() => setLive(link.id, ch))); } catch { /* same-Wi-Fi link is optional */ }
  }
  state.links.push(link);
  const reply = await makeEnvelope(link, 'join', { inviteId: inv.inviteId, profile: cleanProfile(profile), ...(answer ? { a: answer } : {}) });
  await persist();
  return { link, reply };
}

// ── receive anything: -> { kind, link?, pending?, reply? } ──
export async function receive(text, via = null) {
  const e = parseEnvelope(text); if (!e) throw new Error('no-envelope');
  let link = linkById(e.linkId);
  if (!link) {
    const invite = state.invites.find((i) => i.linkId === e.linkId && !i.used);
    if (!invite) throw new Error('unknown-link');
    const temp = { id: invite.linkId, key: invite.key, seen: [], seqOut: 0 };
    const msg = await readEnvelope(temp, text);
    if (msg.t !== 'join' || msg.p?.inviteId !== invite.inviteId) throw new Error('bad-join');
    const a = typeof msg.p.a === 'string' && msg.p.a.length <= 8000 ? msg.p.a : '';
    return { kind: 'join', pending: { invite, temp, profile: cleanProfile(msg.p.profile), answer: a } };
  }
  const msg = await readEnvelope(link, text);
  if (via) { state.live.set(link.id, via); }
  const out = await dispatch(link, msg);
  await persist();
  return { kind: msg.t, link, ...out };
}

async function dispatch(link, msg) {
  const p = msg.p || {};
  if (link.role === 'parent') {
    if (msg.t === 'report') { const r = sanitizeReport(p); if (r) { link.child.report = r; link.child.profile = r.profile; link.child.lastSeen = Date.now(); } }
    else if (msg.t === 'alert') {
      const a = { kind: p.kind === 'overtime' ? 'overtime' : 'late', name: cleanText(p.name, 80), minutes: clamp(Math.round(Number(p.minutes)) || 0, 0, 600), at: Date.now() };
      link.child.alerts = [a, ...(link.child.alerts || [])].slice(0, 10);
      if (link.child.alertsOn !== false) { alertHook?.({ link, alert: a }); }
    }
    else if (msg.t === 'redeem') {
      const r = { title: cleanText(p.title, 40), emoji: cleanText(p.emoji, 8) || '🎁', cost: clamp(Math.round(Number(p.cost)) || 0, 0, 999), id: cleanText(p.id, 64), at: Date.now() };
      if (r.title && r.id) { link.child.requests = [r, ...(link.child.requests || []).filter((x) => x.id !== r.id)].slice(0, 10); alertHook?.({ link, alert: { kind: 'redeem', name: r.title, minutes: 0, at: r.at } }); }
    }
    else if (msg.t === 'goalDone') { link.child.goalDone = { title: cleanText(p.title, 40), at: Date.now() }; }
    else if (msg.t === 'rtc-answer') { const off = state.offers.get(link.id); if (off && typeof p.sdp === 'string') { await off.accept(p.sdp); off.channel.opened.then(() => setLive(link.id, off.channel)); } }
  } else {
    if (msg.t === 'welcome') { link.parent.name = cleanText(p.parentName, 30) || link.parent.name; link.parent.goal = sanitizeGoal(p.goal); }
    else if (msg.t === 'cheer') { link.parent.cheers = [{ text: cleanText(p.text, 120), emoji: cleanText(p.emoji, 8), at: Date.now() }, ...(link.parent.cheers || [])].slice(0, 20); }
    else if (msg.t === 'goal') { link.parent.goal = sanitizeGoal(p.goal); }
    else if (msg.t === 'sitwith') { link.parent.sitting = Date.now(); }   // the parent sits with the child (a quiet "body double")
    else if (msg.t === 'focus') { // the parent chooses which helpers this child gets; the child can still fine-tune them later
      const pid = linkProfileId(link); await S.patchProfile(pid, { focus: sanitizeAreas(p.areas), focusSet: true, tools: sanitizeTools(p.tools) });
    } else if (msg.t === 'cogGoal') { // a parent suggests a goal + plan; the child can edit, link a routine, or delete it
      const g = sanitizeCogGoal({ id: p.id, title: p.title, strategies: p.strategies, custom: p.custom, from: link.parent.name, since: Date.now() });
      const mine = S.goals(S.profiles().find((x) => x.id === linkProfileId(link)));
      if (g.title && mine.length < 5 && !mine.some((x) => x.id === g.id)) await S.saveGoal(g, linkProfileId(link));   // a full list is never silently trimmed by a suggestion
    } else if (msg.t === 'menu') { await S.patchProfile(linkProfileId(link), { menu: sanitizeMenu(p.menu) }); }
    else if (msg.t === 'given') {
      const prof = S.profiles().find((x) => x.id === linkProfileId(link)), id = cleanText(p.id, 64);
      if (prof && id) await S.patchProfile(prof.id, { redeemed: prof.redeemed.map((r) => (r.id === id ? { ...r, given: true } : r)) });
    }
    else if (msg.t === 'assign') {
      const list = (Array.isArray(p.templates) ? p.templates : []).slice(0, 10).filter((x) => x && typeof x === 'object').map((x) => ({ ...x, from: link.parent.name, favorite: false }));
      const r = await S.importBackup(JSON.stringify({ app: 'morning-organizer', v: 1, templates: list, runs: [] }), { mode: 'merge', settings: false });
      return { assigned: r.added + r.updated };
    } else if (msg.t === 'rtc-offer' && rtcSupported() && typeof p.sdp === 'string') {
      const a = await createAnswer(p.sdp, rtcHooks(link.id)); a.channel.then((ch) => ch.opened.then(() => setLive(link.id, ch)));
      return { reply: await makeEnvelope(link, 'rtc-answer', { sdp: a.sdp }) };
    }
  }
  return {};
}

// ── send ──
export async function send(linkId, type, payload) {
  const link = linkById(linkId); if (!link) throw new Error('unknown-link');
  const envelope = await makeEnvelope(link, type, payload);
  await persist();
  const ch = state.live.get(linkId);
  return { envelope, delivered: !!(ch?.open && ch.send(envelope)) };
}
export async function createLiveOffer(linkId) {
  const off = await createOffer(rtcHooks(linkId)); state.offers.set(linkId, off);
  return send(linkId, 'rtc-offer', { sdp: off.sdp });
}

// ── child reporting + rewards ──
export async function reportFor(link) {
  const pid = linkProfileId(link), prof = S.profiles().find((p) => p.id === pid) ?? S.activeProfile();
  const done = finished(S.runsForProfile(pid)), act = await S.loadActive(); const mine = act && (act.profileId || S.profiles()[0].id) === pid ? act : null;
  const active = mine && (mine.status === 'running' || mine.status === 'paused') ? { name: mine.templateName, icon: mine.icon, task: mine.tasks[mine.current]?.name || '',
    pct: mine.tasks.filter((x) => x.done || x.skipped).length / Math.max(1, mine.tasks.length), paused: mine.status === 'paused' } : null;
  return buildReport({ profile: profileOf(prof), runs: done, streakDays: streak(done), totalStars: totalStars(done), active, goal: link.parent?.goal, goals: S.goals(prof), retros: S.retros(pid) });
}
export async function sendReport(linkId) { const link = linkById(linkId); return send(linkId, 'report', await reportFor(link)); }
let lastPush = 0;
/** Called by the runner on every task change: live links get fresh progress (throttled). */
export function pushActive(force = false) {
  if (!force && Date.now() - lastPush < 15_000) return; lastPush = Date.now();
  for (const l of childLinks()) if (isLive(l.id)) sendReport(l.id).catch(() => {});
}
/** Called after a run is saved: report to live parents, flag the rest, and detect reached reward goals. -> goals reached [{link, goal}] */
export async function afterRun(profileId = S.activeProfile().id) {
  const reached = [];
  for (const l of allChildLinks().filter((x) => linkProfileId(x) === profileId)) {
    const done = finished(S.runsForProfile(profileId)), prog = rewardProgress(l.parent.goal, done);
    const wk = String(weekStart(Date.now())), already = l.parent.goal?.mode === 'week' ? l.parent.goal.announcedWeek === wk : l.parent.goal?.announced;
    if (prog?.reached && !l.parent.goal.given && !already) { if (l.parent.goal.mode === 'week') l.parent.goal.announcedWeek = wk; else l.parent.goal.announced = true; reached.push({ link: l, goal: l.parent.goal }); await send(l.id, 'goalDone', { title: l.parent.goal.title }).catch(() => {}); }
    if (isLive(l.id)) await sendReport(l.id).catch(() => {}); else l.pendingReport = true;
  }
  await persist(); return reached;
}

// ── parent actions ──
export async function setGoal(linkId, { title, emoji, target, mode }) {
  const link = linkById(linkId); const goal = sanitizeGoal({ title, emoji, target, mode, since: Date.now() });
  link.child.goal = goal; link.child.goalDone = null; return send(linkId, 'goal', { goal });
}
export async function clearGoal(linkId) { const link = linkById(linkId); link.child.goal = null; link.child.goalDone = null; return send(linkId, 'goal', { goal: null }); }
export async function assignRoutines(linkId, templateIds) {
  const templates = S.get().templates.filter((x) => templateIds.includes(x.id)).slice(0, 10).map((x) => ({ ...x, tasks: x.tasks.map((k) => ({ ...k, photo: '' })) }));
  return send(linkId, 'assign', { templates });
}
/** The parent picks the child's help areas and helpers (focus.js). */
export async function setFocus(linkId, { areas, tools }) {
  const link = linkById(linkId); link.child.focus = { areas: sanitizeAreas(areas), tools: sanitizeTools(tools) };
  return send(linkId, 'focus', { areas: link.child.focus.areas, tools: link.child.focus.tools });
}
export async function sendGoalPlan(linkId, g) { const c = sanitizeCogGoal({ ...g, id: g.id || undefined }); return send(linkId, 'cogGoal', { id: c.id, title: c.title, strategies: c.strategies, custom: c.custom }); }
/** Parent: "I am with you" while the child does a routine. */
export const sitWith = (linkId) => send(linkId, 'sitwith', {});
export const sittingParent = (maxMs = 20 * 60_000) => childLinks().find((l) => l.parent.sitting && Date.now() - l.parent.sitting < maxMs)?.parent ?? null;
export async function sendMenu(linkId, menu) { const link = linkById(linkId); link.child.menu = sanitizeMenu(menu); return send(linkId, 'menu', { menu: link.child.menu }); }
export async function markGiven(linkId, id) { const link = linkById(linkId); link.child.requests = (link.child.requests || []).filter((r) => r.id !== id); return send(linkId, 'given', { id }); }
/** Child side: ask the parent for a reward (the stars were already spent locally). */
export async function sendRedeem(item, profileId = S.activeProfile().id) {
  const out = [];
  for (const l of allChildLinks().filter((x) => linkProfileId(x) === profileId)) { try { out.push(await send(l.id, 'redeem', { id: item.id, title: item.title, emoji: item.emoji, cost: item.cost })); } catch { /* the child still has the reward noted */ } }
  return out;
}
export const cheer = (linkId, text, emoji = '⭐') => send(linkId, 'cheer', { text: cleanText(text, 120), emoji });
/** When a profile is deleted its links go with it. */
export async function unlinkProfile(profileId) { for (const l of allChildLinks().filter((x) => linkProfileId(x) === profileId)) await unlink(l.id); }
export async function unlink(linkId) { state.links = state.links.filter((l) => l.id !== linkId); state.live.delete(linkId); state.offers.get(linkId)?.close?.(); state.offers.delete(linkId); await persist(); }
export { native };

/** Child side: tell the parents (only over a live link - never queue "I'm late" as a code to paste) that a routine is running late. */
export async function alertParents({ kind, name, minutes }, profileId = S.activeProfile().id) {
  for (const l of allChildLinks().filter((x) => linkProfileId(x) === profileId)) if (isLive(l.id)) await send(l.id, 'alert', { kind, name, minutes }).catch(() => {});
}
export async function setAlertsOn(linkId, on) { const l = linkById(linkId); if (l?.child) { l.child.alertsOn = !!on; await persist(); } }

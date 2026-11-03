// Parent/child family linking: state, message handling and transports. No server - see link.js for the protocol.
import { db } from './db.js';
import * as S from './store.js';
import { native } from './native.js';
import { newKey, randomId, makeEnvelope, readEnvelope, parseEnvelope, packInvite, readInvite } from './link.js';
import { sanitizeGoal, rewardProgress, buildReport, sanitizeReport } from './rewards.js';
import { createOffer, createAnswer, rtcSupported } from './rtc.js';
import { streak, totalStars, finished } from './stats.js';
import { cleanText, clamp } from './util.js';

export const INVITE_TTL_MS = 24 * 3600 * 1000;
const state = { links: [], invites: [], live: new Map(), offers: new Map(), ready: false };
const subs = new Set();
export const subscribeFamily = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((f) => f(state));
export const getFamily = () => state;
export const linkById = (id) => state.links.find((l) => l.id === id);
export const parentLinks = () => state.links.filter((l) => l.role === 'parent');
export const childLinks = () => state.links.filter((l) => l.role === 'child');
export const isLive = (id) => !!state.live.get(id)?.open;
const persist = async () => { await db.put('kv', state.links, 'links'); await db.put('kv', state.invites, 'invites'); emit(); };

export async function initFamily() {
  state.links = (await db.get('kv', 'links')) || [];
  const now = Date.now();
  state.invites = ((await db.get('kv', 'invites')) || []).filter((i) => !i.used && now - i.createdAt < INVITE_TTL_MS);
  state.ready = true; emit();
}

export const profileOf = (st = S.get().settings) => ({ name: st.personName, age: st.age, gender: st.gender, mascot: st.mascot });
const cleanProfile = (p = {}) => ({ name: cleanText(p.name, 30), age: Number.isFinite(Number(p.age)) ? clamp(Math.round(Number(p.age)), 0, 120) : null,
  gender: ['female', 'male', 'other'].includes(p.gender) ? p.gender : 'other', mascot: cleanText(p.mascot, 8) });

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
export async function acceptInvite(text, profile = profileOf()) {
  const inv = await readInvite(text);
  if (state.links.some((l) => l.id === inv.linkId)) throw new Error('already-linked');
  const link = { id: inv.linkId, role: 'child', peer: { name: inv.parentName }, key: inv.key, seqOut: 0, seen: [], createdAt: Date.now(), parent: { name: inv.parentName, goal: null, cheers: [] } };
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
    else if (msg.t === 'goalDone') { link.child.goalDone = { title: cleanText(p.title, 40), at: Date.now() }; }
    else if (msg.t === 'rtc-answer') { const off = state.offers.get(link.id); if (off && typeof p.sdp === 'string') { await off.accept(p.sdp); off.channel.opened.then(() => setLive(link.id, off.channel)); } }
  } else {
    if (msg.t === 'welcome') { link.parent.name = cleanText(p.parentName, 30) || link.parent.name; link.parent.goal = sanitizeGoal(p.goal); }
    else if (msg.t === 'cheer') { link.parent.cheers = [{ text: cleanText(p.text, 120), emoji: cleanText(p.emoji, 8), at: Date.now() }, ...(link.parent.cheers || [])].slice(0, 20); }
    else if (msg.t === 'goal') { link.parent.goal = sanitizeGoal(p.goal); }
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
  const { runs } = S.get(), done = finished(runs), act = await S.loadActive();
  const active = act && (act.status === 'running' || act.status === 'paused') ? { name: act.templateName, icon: act.icon, task: act.tasks[act.current]?.name || '',
    pct: act.tasks.filter((x) => x.done || x.skipped).length / Math.max(1, act.tasks.length), paused: act.status === 'paused' } : null;
  return buildReport({ profile: profileOf(), runs: done, streakDays: streak(done), totalStars: totalStars(done), active, goal: link.parent?.goal });
}
export async function sendReport(linkId) { const link = linkById(linkId); return send(linkId, 'report', await reportFor(link)); }
let lastPush = 0;
/** Called by the runner on every task change: live links get fresh progress (throttled). */
export function pushActive() {
  if (Date.now() - lastPush < 15_000) return; lastPush = Date.now();
  for (const l of childLinks()) if (isLive(l.id)) sendReport(l.id).catch(() => {});
}
/** Called after a run is saved: report to live parents, flag the rest, and detect reached reward goals. -> goals reached [{link, goal}] */
export async function afterRun() {
  const reached = [], done = finished(S.get().runs);
  for (const l of childLinks()) {
    const prog = rewardProgress(l.parent.goal, done);
    if (prog?.reached && !l.parent.goal.given && !l.parent.goal.announced) { l.parent.goal.announced = true; reached.push({ link: l, goal: l.parent.goal }); await send(l.id, 'goalDone', { title: l.parent.goal.title }).catch(() => {}); }
    if (isLive(l.id)) await sendReport(l.id).catch(() => {}); else l.pendingReport = true;
  }
  await persist(); return reached;
}

// ── parent actions ──
export async function setGoal(linkId, { title, emoji, target }) {
  const link = linkById(linkId); const goal = sanitizeGoal({ title, emoji, target, since: Date.now() });
  link.child.goal = goal; link.child.goalDone = null; return send(linkId, 'goal', { goal });
}
export async function clearGoal(linkId) { const link = linkById(linkId); link.child.goal = null; link.child.goalDone = null; return send(linkId, 'goal', { goal: null }); }
export async function assignRoutines(linkId, templateIds) {
  const templates = S.get().templates.filter((x) => templateIds.includes(x.id)).slice(0, 10).map((x) => ({ ...x, tasks: x.tasks.map((k) => ({ ...k, photo: '' })) }));
  return send(linkId, 'assign', { templates });
}
export const cheer = (linkId, text, emoji = '⭐') => send(linkId, 'cheer', { text: cleanText(text, 120), emoji });
export async function unlink(linkId) { state.links = state.links.filter((l) => l.id !== linkId); state.live.delete(linkId); state.offers.get(linkId)?.close?.(); state.offers.delete(linkId); await persist(); }
export { native };

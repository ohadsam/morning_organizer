// The journal: notes, voice notes, thought records, gratitude, mood and "parked" thoughts. Per person, on this device only.
// Optional lock (see lock.js): when on, every entry (and voice note) is encrypted; adding needs no password, reading does.
import { db } from './db.js';
import * as Lock from './lock.js';
import { uid, cleanText, clamp } from './util.js';
import { sanitizeMood } from './mood.js';

export const KINDS = ['note', 'voice', 'thought', 'gratitude', 'mood', 'park', 'calm'];
export const MAX_ENTRIES = 2000, MAX_AUDIO_BYTES = 6 * 1024 * 1024, MAX_AUDIO_SEC = 180;
const sessions = new Map();           // profileId -> private key, in MEMORY only
const str = (v, m) => cleanText(v, m);
/** Tells open screens (the journal list) that entries changed. */
const changed = () => { try { globalThis.dispatchEvent?.(new Event('journal-changed')); } catch { /* no events here */ } };

/** Whitelist + clamp every field (an entry could come from anywhere in the future: restore, link...). */
export function sanitizeEntry(e) {
  const t = e?.thought && typeof e.thought === 'object' ? e.thought : null, a = e?.audio && typeof e.audio === 'object' ? e.audio : null;
  return {
    kind: KINDS.includes(e?.kind) ? e.kind : 'note', routine: str(e?.routine, 80), task: str(e?.task, 80), text: str(e?.text, 4000), transcript: str(e?.transcript, 6000), mood: sanitizeMood(e?.mood),
    items: (Array.isArray(e?.items) ? e.items : []).slice(0, 3).map((x) => str(x, 200)).filter(Boolean),
    thought: t ? { situation: str(t.situation, 600), thought: str(t.thought, 600), feeling: str(t.feeling, 60), intensity: clamp(Math.round(Number(t.intensity)) || 0, 0, 10), evidenceFor: str(t.evidenceFor, 600), evidenceAgainst: str(t.evidenceAgainst, 600), balanced: str(t.balanced, 600), after: clamp(Math.round(Number(t.after)) || 0, 0, 10) } : null,
    audio: a && typeof a.id === 'string' ? { id: a.id.slice(0, 64), mime: /^audio\/[a-z0-9.+-]+$/i.test(a.mime || '') ? a.mime.slice(0, 40) : 'audio/webm', sec: clamp(Math.round(Number(a.sec)) || 0, 0, MAX_AUDIO_SEC) } : null,
  };
}

// ── lock records + session ──
export const getLock = async (pid) => (await db.get('kv', `lock:${pid}`)) || null;
const setLock = (pid, rec) => (rec ? db.put('kv', rec, `lock:${pid}`) : db.del('kv', `lock:${pid}`));
export const isUnlocked = async (pid) => !(await getLock(pid)) || sessions.has(pid);
export const lockNow = (pid) => { sessions.delete(pid); };
export const lockAll = () => sessions.clear();

const meta = async (pid) => (await db.get('kv', `lockmeta:${pid}`)) || { fails: 0, until: 0 };
/** Milliseconds until another unlock attempt is allowed (0 = now). */
export const waitLeft = async (pid) => Math.max(0, (await meta(pid)).until - Date.now());
async function guarded(pid, tryOpen) {
  const m = await meta(pid), now = Date.now();
  if (m.until > now) return { ok: false, waitMs: m.until - now };
  const key = await tryOpen();
  if (key) { sessions.set(pid, key); await db.put('kv', { fails: 0, until: 0 }, `lockmeta:${pid}`); return { ok: true }; }
  const fails = m.fails + 1, wait = Lock.waitAfterFails(fails);
  await db.put('kv', { fails, until: wait ? now + wait : 0 }, `lockmeta:${pid}`);
  return { ok: false, waitMs: wait, fails };
}
export const unlock = async (pid, password) => guarded(pid, async () => { const l = await getLock(pid); return l ? Lock.openWithPassword(l, String(password ?? '')) : null; });
export const unlockWithAnswers = async (pid, answers) => guarded(pid, async () => { const l = await getLock(pid); return l ? Lock.openWithAnswers(l, answers.map(String)) : null; });

// ── entries ──
const stored = async (pid) => (await db.all('journal')).filter((r) => r.profileId === pid);
async function seal(pid, plain) {
  const lock = await getLock(pid);
  return lock ? { enc: await Lock.encryptJson(lock, plain), lock: true } : { data: plain, lock: false };
}
/** Adds an entry (and an optional voice note Blob). Works while locked - nothing is decrypted. -> id */
export async function addEntry(pid, fields, audioBlob = null) {
  const plain = sanitizeEntry(fields), id = uid(), at = Date.now();
  if (audioBlob) {
    if (audioBlob.size > MAX_AUDIO_BYTES) throw new Error('audio-too-big');
    const aid = uid(), lock = await getLock(pid), mime = audioBlob.type || 'audio/webm';
    plain.audio = { id: aid, mime: /^audio\/[a-z0-9.+-]+$/i.test(mime) ? mime.split(';')[0] : 'audio/webm', sec: clamp(Math.round(Number(fields?.audio?.sec)) || 0, 0, MAX_AUDIO_SEC) };
    if (lock) await db.put('audio', { id: aid, profileId: pid, enc: await Lock.encryptFor(lock, new Uint8Array(await audioBlob.arrayBuffer())) });
    else await db.put('audio', { id: aid, profileId: pid, blob: audioBlob });
  }
  const sealed = await seal(pid, plain);
  await db.put('journal', { id, profileId: pid, at, kind: plain.kind, resolved: false, aid: plain.audio?.id || '', ...(sealed.lock ? { enc: sealed.enc } : { data: plain }) });
  const all = (await stored(pid)).sort((a, b) => a.at - b.at);
  for (const old of all.slice(0, Math.max(0, all.length - MAX_ENTRIES))) await removeEntry(old.id);
  changed();
  return id;
}
/** Newest first. Locked entries come back as { id, at, kind, locked: true } until the session is unlocked. */
export async function listEntries(pid) {
  const key = sessions.get(pid), out = [];
  for (const r of (await stored(pid)).sort((a, b) => b.at - a.at)) {
    if (r.data) { out.push({ id: r.id, at: r.at, kind: r.kind, resolved: !!r.resolved, locked: false, ...sanitizeEntry(r.data) }); continue; }
    if (!key) { out.push({ id: r.id, at: r.at, kind: r.kind, resolved: !!r.resolved, locked: true }); continue; }
    try { out.push({ id: r.id, at: r.at, kind: r.kind, resolved: !!r.resolved, locked: false, ...sanitizeEntry(await Lock.decryptJson(key, r.enc)) }); } catch { out.push({ id: r.id, at: r.at, kind: r.kind, resolved: !!r.resolved, locked: true, broken: true }); }
  }
  return out;
}
export async function removeEntry(id) {
  const r = (await db.all('journal')).find((x) => x.id === id); if (!r) return;
  if (r.aid) await db.del('audio', r.aid);   // the outer record keeps the (non-secret) audio id, so this works while locked too
  await db.del('journal', id);
}
export async function setResolved(id, resolved = true) { const r = (await db.all('journal')).find((x) => x.id === id); if (r) await db.put('journal', { ...r, resolved }); }
/** A playable URL for a voice note (decrypts when needed). The caller revokes it. */
export async function audioUrl(pid, audio) {
  const a = await db.get('audio', audio.id); if (!a) return null;
  if (a.blob) return URL.createObjectURL(a.blob);
  const key = sessions.get(pid); if (!key || !a.enc) return null;
  return URL.createObjectURL(new Blob([await Lock.decryptWith(key, a.enc)], { type: audio.mime }));
}

// ── lock management ──
async function reseal(pid, lock, key) {  // encrypt every plaintext entry/voice note of this profile with the new lock
  for (const r of await stored(pid)) {
    if (r.data) { const { data, ...rest } = r; await db.put('journal', { ...rest, enc: await Lock.encryptJson(lock, data) }); }
  }
  for (const a of (await db.all('audio')).filter((x) => x.profileId === pid && x.blob)) await db.put('audio', { id: a.id, profileId: pid, enc: await Lock.encryptFor(lock, new Uint8Array(await a.blob.arrayBuffer())) });
}
export async function enableLock(pid, { password, questions }) {
  if (await getLock(pid)) throw new Error('already-locked');
  const lock = await Lock.createLock({ password, questions });
  await reseal(pid, lock); await setLock(pid, lock);
  const key = await Lock.openWithPassword(lock, password); sessions.set(pid, key); await db.put('kv', { fails: 0, until: 0 }, `lockmeta:${pid}`);
  return lock.questions;
}
async function accessKey(pid, { password, answers }) {
  const lock = await getLock(pid); if (!lock) return null;
  return password !== undefined ? Lock.openWithPassword(lock, String(password)) : Lock.openWithAnswers(lock, (answers || []).map(String));
}
export async function changePassword(pid, auth, newPassword) {
  const lock = await getLock(pid); if (!lock) return false;
  const next = await Lock.changePassword(lock, auth.password !== undefined ? { oldPassword: String(auth.password) } : { answers: (auth.answers || []).map(String) }, newPassword);
  if (!next) return false; await setLock(pid, next);
  sessions.set(pid, await Lock.openWithPassword(next, newPassword)); await db.put('kv', { fails: 0, until: 0 }, `lockmeta:${pid}`); return true;
}
/** Removes the lock, decrypting everything first (needs the password or the answers). */
export async function disableLock(pid, auth) {
  const key = await accessKey(pid, auth); if (!key) return false;
  for (const r of await stored(pid)) if (r.enc) { const { enc, ...rest } = r; try { await db.put('journal', { ...rest, data: await Lock.decryptJson(key, enc) }); } catch { await db.del('journal', r.id); } }
  for (const a of (await db.all('audio')).filter((x) => x.profileId === pid && x.enc)) { try { await db.put('audio', { id: a.id, profileId: pid, blob: new Blob([await Lock.decryptWith(key, a.enc)]) }); } catch { await db.del('audio', a.id); } }
  await setLock(pid, null); sessions.delete(pid); return true;
}
/** For people who lost both password and answers: delete the journal and the lock. */
export async function eraseJournal(pid) {
  for (const r of await stored(pid)) await db.del('journal', r.id);
  for (const a of (await db.all('audio')).filter((x) => x.profileId === pid)) await db.del('audio', a.id);
  await setLock(pid, null); await db.del('kv', `lockmeta:${pid}`); sessions.delete(pid);
}
export const lockQuestions = async (pid) => (await getLock(pid))?.questions ?? [];
export const counts = async (pid) => { const rs = await stored(pid); return { total: rs.length, parked: rs.filter((r) => r.kind === 'park' && !r.resolved).length }; };

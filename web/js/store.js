// Application state: templates, runs, settings. Persists via db.js, notifies subscribers, mirrors to the native shell.
import { db, isPersistent } from './db.js';
import { LIMITS } from './config.js';
import { cleanText, clamp, uid, move } from './util.js';
import { defaultAlarm } from './alarms.js';
import { setAlarmRules } from './wake.js';
import { cleanPause, activePause } from './alarmPause.js';
import { skipDates } from './holidays.js';
import { normalizeAlarm, nativeRings } from './wake.js';
import { native } from './native.js';
import { t, units, getLang } from './i18n.js';
import { suggestIcon } from './taskIcons.js';
import { PRESETS } from './speech.js';
import { validLeaveBy } from './leave.js';
import { normDays, presetDays } from './schedule.js';
import { isSafePhoto } from './photo.js';
import { sanitizeAvatar, avatarEmoji, avatarFromMascot, defaultAvatar } from './avatar.js';
import { toolsFor } from './focus.js';
import { widgetItems } from './widgetData.js';
import { sanitizeMood } from './mood.js';
import { sanitizeFeelings, sanitizeFeeling, sanitizeFeelAt, MAX_FEELINGS, MAX_AUDIO_BYTES as MAX_FEEL_AUDIO } from './feelings.js';
import { sanitizeUnplanned, sanitizeWatch } from './unplanned.js';
import { sanitizeGoal, MAX_GOALS } from './cogfun.js';
import { sanitizeRetro, sanitizeRetros, applyActions, undoActions, MAX_RETROS } from './retro.js';
import { sanitizeLibrary, mergeLibrary, upsert, fromTemplate, fromTask, MAX_ROUTINES as LIB_R, MAX_TASKS as LIB_T, IDEA_ROUTINES } from './library.js';
import { eraseJournal } from './journal.js';
import { newProfile, normalizeProfile, runsOf, MAX_PROFILES, PREF_KEYS, sanitizePrefs } from './profiles.js';
import { SKINS } from './skins.js';
import { isHelper } from './specialTasks.js';
import { sanitizeLib, libUpsert, libRemove, libDuplicate } from './avatarKit.js';
import { MODES as SCORE_MODES, isAward, MAX_PTS, sanitizeScore } from './points.js';
import { visibleSet, shows as needShows, sanitizeView, areasFor, isFull } from './needs.js';

export const DEFAULT_SETTINGS = Object.freeze({
  lang: 'he', theme: 'auto', mode: 'both', volume: 80, warnSec: 10, defTaskSec: 300, defEstSec: 0,
  autoAdvance: false, keepAwake: true, keepAwakeApp: false, personName: '', mascot: '🦊', feedback: true, speak: false, age: null, gender: 'other', profileDone: false,
  textStyle: 'auto', timerStyle: 'auto', retroStyle: 'ask', alarmsMig: false, samplesAlarmsOff: false, paceMode: 'normal', accent: '', simpleMode: false, announceTasks: false, fontScale: 100, colorSafe: false, contrast: 'normal', srAnnounce: false,
  coachButton: true, coachAuto: false, coachSpeak: false, voiceURI: '', voicePreset: 'natural', voiceFlavor: 'neutral', skin: 'default', easyRead: false, reduceMotion: false, iconStyle: 'auto', iconMono: false, screenArt: true, calmVisual: 'sunny', homeMode: 'full', runView: 'full', density: 'normal', askProfile: true, voiceCmdAuto: false, scoring: 'off', scorePenalty: true, scoreCumulative: true, voiceEngine: '', alarmsPause: 0, weeklyOn: true, weeklyDay: 5, voiceRate: 100, seeded: false,
  avatar: defaultAvatar(), activeProfile: '', transcribe: false,
});
/** The settings keys that mirror the ACTIVE profile (so the rest of the app can keep reading settings.personName etc.). */
const isDefaultAvatar = (a) => !a || a.k === 'sunny' || (a.k === 'char' && a.id === 'fox');
const PROFILE_KEYS = ['personName', 'age', 'gender', 'mascot', 'avatar'];
export const COLORS = ['#6c5ce7', '#0984e3', '#00b894', '#e17055', '#e84393', '#fdcb6e', '#2d3436'];
export const MASCOTS = ['🦊', '🐼', '🦄', '🐯', '🐸', '🤖', '🐶', '🐱'];
export const ICONS = ['🌅', '☀️', '🎒', '🪥', '👕', '🥣', '🏃', '📚', '🧘', '🐶', '🚌', '⏰'];

const state = { avatarLib: [], templates: [], runs: [], watch: [], retros: [], feelings: [], library: { routines: [], tasks: [] }, profiles: [], settings: { ...DEFAULT_SETTINGS }, ready: false };
const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((f) => f(state));
export const get = () => state;
export const getTemplate = (id) => state.templates.find((x) => x.id === id);

export function newTask(settings = state.settings, name = '') {
  return { id: uid(), name, icon: '', photo: '', sec: settings.defTaskSec, est: settings.defEstSec || 0 };
}
export function newTemplate(name = '') {
  const now = Date.now();
  return { id: uid(), name, icon: ICONS[0], color: COLORS[0], favorite: false, builtin: false,
    leaveBy: '', from: '', days: [], gear: [], plans: [], tasks: [newTask()], alarm: defaultAlarm(presetDays(getLang()).school), createdAt: now, updatedAt: now };
}
export const totalSec = (tpl) => tpl.tasks.reduce((s, x) => s + x.sec, 0);

/** Who may see a routine: a list of profile ids; [] = everyone (the default, so older routines stay visible to all). */
const cleanOwners = (o) => [...new Set((Array.isArray(o) ? o : []).filter((x) => typeof x === 'string' && x && x.length <= 64))].slice(0, MAX_PROFILES);
/** `known` = ids of the people that exist: a routine whose owners are all unknown (e.g. restored from another device's backup) stays visible, never lost. */
export const canSee = (tpl, profileId, known = null) => !tpl.owners?.length || tpl.owners.includes(profileId) || (!!known && !tpl.owners.some((o) => known.has(o)));
/** The routines this person sees (their own plus the ones shared with everyone). Alarms still ring for all routines on the device. */
export const myTemplates = (profileId = activeProfile().id) => { const known = new Set(state.profiles.map((p) => p.id)); return state.templates.filter((x) => canSee(x, profileId, known)); };
/** Share a routine: [] = everyone, or the people who may see it. */
export const setOwners = async (id, owners) => { const x = getTemplate(id); return x && saveTemplate({ ...x, owners }, { touch: false }); };

/** Clamp + clean a template before it is stored. Defence in depth: the editor, import and restore all pass through. */
export function normalizeTemplate(tpl) {
  const a = tpl.alarm ?? defaultAlarm();
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  // Whitelist: unknown/oversized fields from a backup or import are dropped, never stored.
  return {
    id: typeof tpl.id === 'string' && tpl.id ? tpl.id.slice(0, 64) : uid(),
    name: cleanText(tpl.name, LIMITS.maxName), icon: cleanText(tpl.icon, 8) || '⏰',
    color: /^#[0-9a-fA-F]{6}$/.test(tpl.color) ? tpl.color : COLORS[0], favorite: !!tpl.favorite, builtin: !!tpl.builtin, owners: cleanOwners(tpl.owners),
    createdAt: num(tpl.createdAt, Date.now()), updatedAt: num(tpl.updatedAt, Date.now()), leaveBy: validLeaveBy(tpl.leaveBy), feelAt: sanitizeFeelAt(tpl.feelAt), from: cleanText(tpl.from, 30), days: normDays(tpl.days),
    plans: (Array.isArray(tpl.plans) ? tpl.plans : []).filter((x) => x && typeof x === 'object' && cleanText(x.when, 80) && cleanText(x.then, 80)).slice(0, 5).map((x) => ({ id: typeof x.id === 'string' && x.id ? x.id.slice(0, 64) : uid(), when: cleanText(x.when, 80), then: cleanText(x.then, 80) })),
    gear: (Array.isArray(tpl.gear) ? tpl.gear : []).filter((g) => g && typeof g === 'object' && cleanText(g.name, 40)).slice(0, 20).map((g) => ({ id: typeof g.id === 'string' && g.id ? g.id.slice(0, 64) : uid(), name: cleanText(g.name, 40), icon: cleanText(g.icon, 8), days: normDays(g.days) })),
    tasks: (Array.isArray(tpl.tasks) ? tpl.tasks : []).slice(0, LIMITS.maxTasks).map((x) => ({
      id: typeof x?.id === 'string' && x.id ? x.id.slice(0, 64) : uid(), name: cleanText(x?.name, LIMITS.maxName), icon: cleanText(x?.icon, 8), photo: isSafePhoto(x?.photo) ? x.photo : '',
      sec: clamp(Math.round(Number(x?.sec)) || 1, 1, LIMITS.maxTaskSec), est: clamp(Math.round(Number(x?.est)) || 0, 0, LIMITS.maxTaskSec),
      feelAfter: !!x?.feelAfter, helper: isHelper(x?.helper) ? x.helper : '', pts: clamp(Math.round(Number(x?.pts)) || 0, 0, MAX_PTS), award: isAward(x?.award) ? x.award : '', helperKey: typeof x?.helperKey === 'string' && /^sx_[a-z]+$/.test(x.helperKey) ? x.helperKey : '' })),
    alarm: normalizeAlarm(a),
  };
}

/** Same idea for a run read from a backup: only known fields, numbers coerced and clamped, strings cleaned. */
export function sanitizeRun(r) {
  const n = (v, max = 1e12) => clamp(Math.round(Number(v)) || 0, 0, max);
  return {
    id: String(r.id).slice(0, 64), profileId: typeof r.profileId === 'string' ? r.profileId.slice(0, 64) : '', templateId: String(r.templateId ?? '').slice(0, 64), templateName: cleanText(r.templateName, LIMITS.maxName),
    icon: cleanText(r.icon, 8), color: /^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color : COLORS[0],
    startedAt: n(r.startedAt), endedAt: n(r.endedAt), status: r.status === 'done' ? 'done' : 'stopped', mood: sanitizeMood(r.mood), unplanned: sanitizeUnplanned(r.unplanned), current: 0, pausedMs: n(r.pausedMs),
    shortened: (Array.isArray(r.shortened) ? r.shortened : []).slice(0, 12).map((x) => ({ i: n(x?.i, 99), name: cleanText(x?.name, LIMITS.maxName), fromSec: n(x?.fromSec, LIMITS.maxTaskSec), toSec: n(x?.toSec, LIMITS.maxTaskSec) })).filter((x) => x.toSec < x.fromSec),
    score: sanitizeScore(r.score), plannedTotal: n(r.plannedTotal, 1e7), estTotal: n(r.estTotal, 1e7), actualTotal: n(r.actualTotal, 1e7),
    tasks: r.tasks.slice(0, LIMITS.maxTasks).map((x) => ({ id: String(x?.id ?? '').slice(0, 64), name: cleanText(x?.name, LIMITS.maxName), icon: cleanText(x?.icon, 8),
      plannedSec: n(x?.plannedSec, LIMITS.maxTaskSec), estSec: n(x?.estSec, LIMITS.maxTaskSec), extraSec: n(x?.extraSec, LIMITS.maxTaskSec), actualSec: n(x?.actualSec, LIMITS.maxTaskSec),
      done: !!x?.done, skipped: !!x?.skipped, guess: x?.guess === true, difficulty: clamp(Math.round(Number(x?.difficulty)) || 0, 0, 5),
      help: { note: n(x?.help?.note, 99), thought: n(x?.help?.thought, 99), relax: n(x?.help?.relax, 99) } })),
  };
}

/** Pushes the global alarm rules (pause) into the alarm maths. */
export function applyAlarmRules() { setAlarmRules({ pausedUntil: activePause(state.settings.alarmsPause) }); }

export async function init() {
  const [templates, runs, kv] = await Promise.all([db.all('templates'), db.all('runs'), db.get('kv', 'settings')]);
  state.templates = templates.sort((a, b) => a.createdAt - b.createdAt);
  state.runs = runs;
  state.settings = { ...DEFAULT_SETTINGS, ...(kv || {}) }; state.settings.alarmsPause = cleanPause(state.settings.alarmsPause); applyAlarmRules();
  // Profiles: first start (or an upgrade from before profiles) creates one from the existing name/age/gender/mascot.
  const stored = await db.get('kv', 'profiles');
  state.profiles = (Array.isArray(stored) ? stored : []).slice(0, MAX_PROFILES).map(normalizeProfile);
  if (!state.profiles.length) {
    state.profiles = [newProfile({ name: state.settings.personName, age: state.settings.age, gender: state.settings.gender, avatar: isDefaultAvatar(state.settings.avatar) ? avatarFromMascot(state.settings.mascot) : state.settings.avatar })];
    await db.put('kv', state.profiles, 'profiles');
  }
  if (!(await db.get('kv', 'calmVisMig'))) { if (state.settings.calmVisual === 'scene') state.settings.calmVisual = 'sunny'; state.profiles = state.profiles.map((p) => (p.prefs?.calmVisual === 'scene' ? { ...p, prefs: { ...p.prefs, calmVisual: 'sunny' } } : p)); await db.put('kv', true, 'calmVisMig'); await persistProfiles?.(); }
  if (!(await db.get('kv', 'sunnyMig'))) {   // 1.26.1: the untouched default fox (never customised) becomes Sunny, once; every other avatar is left alone
    const isDefaultFox = (a) => a?.k === 'char' && a.id === 'fox' && String(a.color).toLowerCase() === '#f59e0b';
    if (state.profiles.some((p) => isDefaultFox(p.avatar))) { state.profiles = state.profiles.map((p) => (isDefaultFox(p.avatar) ? { ...p, avatar: { k: 'sunny' } } : p)); await db.put('kv', state.profiles, 'profiles'); }
    if (isDefaultFox(state.settings.avatar)) state.settings.avatar = { k: 'sunny' };
    await db.put('kv', true, 'sunnyMig');
  }
  if (!state.profiles.some((p) => p.id === state.settings.activeProfile)) state.settings.activeProfile = state.profiles[0].id;
  { // an install from before per-person settings: every existing person starts with the settings that were on the device
    let changed = false; state.profiles = state.profiles.map((p) => { if (p.prefs) return p; changed = true; return { ...p, prefs: pickPrefs(state.settings) }; }); if (changed) await persistProfiles(); }
  mirrorActiveProfile();
  state.watch = sanitizeWatch(await db.get('kv', 'watch'));
  state.retros = sanitizeRetros(await db.get('kv', 'retros'));
  state.feelings = sanitizeFeelings(await db.get('kv', 'feelings'));
  state.avatarLib = sanitizeLib(await db.get('kv', 'avatarLib'));
  state.library = sanitizeLibrary(await db.get('kv', 'library'));
  state.ready = true;
  emit();
}

// ── "how do I feel" check-ins (see feelings.js): per person, on this device ──
export const feelings = (profileId = activeProfile().id) => state.feelings.filter((f) => f.pid === profileId);
const persistFeelings = async () => { await db.put('kv', state.feelings, 'feelings'); emit(); };
/** Saves a check-in. `audioBlob` (a recorded voice note, up to 3 MB) is kept beside it, on this device only. Returns the entry, or null for a bad one. */
export async function addFeeling(f, audioBlob = null) {
  const pid = f.pid || activeProfile().id, aid = audioBlob && audioBlob.size <= MAX_FEEL_AUDIO ? uid() : '';
  const clean = sanitizeFeeling({ ...f, id: undefined, pid, at: Date.now(), audio: aid ? { id: aid, mime: audioBlob.type, sec: f.audio?.sec } : null }); if (!clean) return null;
  if (clean.audio) await db.put('audio', { id: clean.audio.id, profileId: pid, blob: audioBlob });
  state.feelings = [...state.feelings, clean].slice(-MAX_FEELINGS); await persistFeelings(); return clean;
}
/** Adds a typed or dictated note to a check-in that was already saved (the quick question inside a routine). */
export async function updateFeeling(id, patch, audioBlob = null) {
  const old = state.feelings.find((f) => f.id === id); if (!old) return null;
  let audio = old.audio; if (audioBlob && audioBlob.size <= MAX_FEEL_AUDIO) { if (audio) await db.del('audio', audio.id); audio = { id: uid(), mime: audioBlob.type, sec: patch.sec }; await db.put('audio', { id: audio.id, profileId: old.pid, blob: audioBlob }); }
  const clean = sanitizeFeeling({ ...old, tag: patch.tag ?? old.tag, note: patch.note ?? old.note, audio }); state.feelings = state.feelings.map((f) => (f.id === id ? clean : f)); await persistFeelings(); return clean;
}
/** Removes a check-in (and its voice note); the returned function puts both back, as long as the page stays open. */
export async function removeFeeling(id) {
  const old = state.feelings.find((f) => f.id === id); if (!old) return async () => {};
  const blob = old.audio ? (await db.get('audio', old.audio.id))?.blob || null : null; if (old.audio) await db.del('audio', old.audio.id);
  state.feelings = state.feelings.filter((f) => f.id !== id); await persistFeelings();
  return async () => { if (state.feelings.some((f) => f.id === old.id)) return; if (old.audio && blob) await db.put('audio', { id: old.audio.id, profileId: old.pid, blob }); state.feelings = [...state.feelings, old].sort((x, y) => x.at - y.at).slice(-MAX_FEELINGS); await persistFeelings(); };
}
export async function feelingAudioUrl(f) { const a = f?.audio && await db.get('audio', f.audio.id); return a?.blob ? URL.createObjectURL(a.blob) : null; }
// ── retrospectives: look back at a run, change the routine, check later whether it helped ──
export const retros = (profileId = activeProfile().id) => state.retros.filter((r) => r.profileId === profileId);
export const retrosForRun = (runId) => state.retros.filter((r) => r.runId === runId).sort((a, b) => a.at - b.at);
export const retroById = (id) => state.retros.find((r) => r.id === id) ?? null;
// "My avatars": the avatar designs saved on this device (any person here can use them)
export const avatarLib = () => state.avatarLib;
const persistAvatars = async () => { await db.put('kv', state.avatarLib, 'avatarLib'); emit(); };
/** Save or replace a design (by id). false when the list is full. */
export async function saveAvatarDesign(item) { const next = libUpsert(state.avatarLib, item); if (!next) return false; state.avatarLib = next; await persistAvatars(); return true; }
export async function duplicateAvatarDesign(id, copyWord = '') { const next = libDuplicate(state.avatarLib, id, copyWord); if (!next) return false; state.avatarLib = next; await persistAvatars(); return true; }
/** Delete with an undo handle. */
export async function deleteAvatarDesign(id) { const snap = state.avatarLib.find((x) => x.id === id); if (!snap) return () => {}; state.avatarLib = libRemove(state.avatarLib, id); await persistAvatars(); return () => saveAvatarDesign(snap); }
const persistRetros = async () => { await db.put('kv', state.retros, 'retros'); emit(); };
/** Create (no id) or update (id) a retrospective. A run can have several - e.g. a quick one now and another part later. */
export async function saveRetro(r) {
  const prev = r.id ? state.retros.find((x) => x.id === r.id) : null, clean = sanitizeRetro({ ...prev, ...r, id: prev?.id ?? undefined, profileId: r.profileId || prev?.profileId || activeProfile().id, at: prev?.at ?? Date.now() });
  if (!clean.runId) return null;
  state.retros = [...state.retros.filter((x) => x.id !== clean.id), clean].slice(-MAX_RETROS); await persistRetros(); return clean;
}
/** Applies the chosen suggested changes to the routine (and creates goals), remembers how to undo each, and starts the "did it help?" clock. -> { applied, goals } */
export async function applyRetro(retroId, actionIds) {
  const r = state.retros.find((x) => x.id === retroId), tpl = r && getTemplate(r.templateId); if (!r || !tpl) return { applied: 0, goals: 0 };
  const chosen = r.actions.filter((a) => actionIds.includes(a.id) && !a.applied); if (!chosen.length) return { applied: 0, goals: 0 };
  const out = applyActions(tpl, chosen, { stepName: (k) => t(k) }); await saveTemplate(out.tpl);
  const goalIds = []; for (const g of out.goals) { const made = await saveGoal({ ...g, since: Date.now() }, r.profileId); goalIds.push(made?.id || ''); }
  let gi = 0; const undoOf = (a) => (a.type === 'goal' ? { goalId: goalIds[gi++] || '' } : out.undos[a.id] || null);
  state.retros = state.retros.map((x) => (x.id === retroId ? { ...x, appliedAt: Date.now(), actions: x.actions.map((a) => (chosen.some((c) => c.id === a.id) ? { ...a, applied: true, undo: undoOf(a) } : a)) } : x)); await persistRetros();
  return { applied: chosen.length, goals: out.goals.length };
}
/** Takes applied changes back (the ones still recognisable in the routine). -> { undone } */
export async function undoRetro(retroId, actionIds) {
  const r = state.retros.find((x) => x.id === retroId), tpl = r && getTemplate(r.templateId); if (!r) return { undone: 0 };
  const chosen = r.actions.filter((a) => actionIds.includes(a.id) && a.applied); if (!chosen.length) return { undone: 0 };
  if (tpl) { const out = undoActions(tpl, chosen); await saveTemplate(out.tpl); for (const id of out.goalIds) await removeGoal(id); }
  const rest = r.actions.map((a) => (chosen.some((c) => c.id === a.id) ? { ...a, applied: false, undo: null } : a));
  state.retros = state.retros.map((x) => (x.id === retroId ? { ...x, actions: rest, appliedAt: rest.some((a) => a.applied) ? x.appliedAt : 0 } : x)); await persistRetros();
  return { undone: chosen.length };
}
/** Removes a look-back; the returned function puts it back (for an "Undo" button). */
export async function removeRetro(id) { const snap = state.retros.find((x) => x.id === id); state.retros = state.retros.filter((x) => x.id !== id); await persistRetros(); return async () => { if (snap && !state.retros.some((x) => x.id === snap.id)) { state.retros = [...state.retros, snap].slice(-MAX_RETROS); await persistRetros(); } }; }

// ── goals (Goal - Plan - Do - Check) live on the profile ──
export const goals = (p = activeProfile()) => p?.goals ?? [];
export async function saveGoal(g, profileId = activeProfile().id) {
  const p = state.profiles.find((x) => x.id === profileId); if (!p) return null;
  const clean = sanitizeGoal(g); if (!clean.title) return null;
  const i = p.goals.findIndex((x) => x.id === clean.id), next = i >= 0 ? p.goals.map((x, k) => (k === i ? clean : x)) : [...p.goals, clean].slice(-MAX_GOALS);
  await patchProfile(profileId, { goals: next }); return clean;
}
/** Removes a goal; the returned function puts it back. */
export async function removeGoal(id) { const p = activeProfile(), snap = p.goals.find((x) => x.id === id); await patchProfile(p.id, { goals: p.goals.filter((x) => x.id !== id) }); return async () => { if (snap) await saveGoal(snap, p.id); }; }
export async function addCheck(goalId, { rating, note = '', used = [] }) { const g = goals().find((x) => x.id === goalId); if (g) await saveGoal({ ...g, checks: [...g.checks, { at: Date.now(), rating, note, used }] }); }
// ── template library: reusable tasks and routines ──
export const library = () => state.library;
const persistLib = async () => { await db.put('kv', state.library, 'library'); emit(); };
export async function saveToLibrary(kind, data) {
  if (kind === 'task') { const e = fromTask(data); if (!e.name) return null; state.library = { ...state.library, tasks: upsert(state.library.tasks, e, LIB_T) }; }
  else { const e = fromTemplate(data); if (!e.name || !e.tasks.length) return null; state.library = { ...state.library, routines: upsert(state.library.routines, e, LIB_R) }; }
  await persistLib(); return true;
}
export async function updateLibraryItem(kind, id, patch) {
  const key = kind === 'task' ? 'tasks' : 'routines', cur = state.library[key].find((e) => e.id === id); if (!cur) return;
  state.library = sanitizeLibrary({ ...state.library, [key]: state.library[key].map((e) => (e.id === id ? { ...e, ...patch, id } : e)) }); await persistLib();
}
export async function removeLibraryItem(kind, id) {
  const key = kind === 'task' ? 'tasks' : 'routines', before = state.library, item = before[key].find((e) => e.id === id); if (!item) return () => {};
  state.library = { ...before, [key]: before[key].filter((e) => e.id !== id) }; await persistLib();
  return async () => { state.library = { ...state.library, [key]: [...state.library[key], item] }; await persistLib(); };
}
/** A (not yet saved) routine built from a library entry: fresh ids, no alarm. */
export function templateFromEntry(e, name = e.name) {
  const base = newTemplate(name);
  return { ...base, name, icon: e.icon || base.icon, color: e.color || base.color, days: e.days || [], leaveBy: e.leaveBy || '',
    tasks: e.tasks.map((k) => ({ id: uid(), name: k.name, icon: k.icon, photo: '', sec: k.sec, est: k.est })),
    gear: (e.gear || []).map((g) => ({ id: uid(), name: g.name, icon: g.icon || '', days: g.days || [] })), plans: (e.plans || []).map((p) => ({ id: uid(), when: p.when, then: p.then })) };
}
export async function createFromEntry(e, name) { const tpl = normalizeTemplate(templateFromEntry(e, name)); await saveTemplate(tpl); return tpl; }
/** Built-in idea routines as library-shaped entries (names localised now). */
export const ideaRoutines = () => IDEA_ROUTINES.map((r) => ({ id: r.id, name: t(r.nameKey), icon: r.icon, color: r.color, days: [], gear: [], plans: [], leaveBy: '', builtin: true,
  tasks: r.items.map(([k, min]) => ({ name: t(k), icon: suggestIcon(t(k)), sec: Math.round(min * 60), est: 0 })) }));

// ── "look closer" at a recurring unplanned interruption (kept on this device) ──
export const watchList = () => state.watch;
export async function addWatch(w) {
  const clean = sanitizeWatch([{ ...w, id: w.id || undefined }])[0]; if (!clean) return null;
  state.watch = [...state.watch.filter((x) => !(x.templateId === clean.templateId && x.key === clean.key)), clean].slice(-20);
  await db.put('kv', state.watch, 'watch'); emit(); return clean;
}
export async function removeWatch(id) { state.watch = state.watch.filter((x) => x.id !== id); await db.put('kv', state.watch, 'watch'); emit(); }

// ── profiles ──
export const profiles = () => state.profiles;
export const activeProfile = () => state.profiles.find((p) => p.id === state.settings.activeProfile) ?? state.profiles[0];
const firstId = () => state.profiles[0]?.id;
/** Runs of the active profile (use this - not state.runs - for anything personal: stars, streaks, stats, reports). */
export const myRuns = () => runsOf(state.runs, activeProfile().id, firstId());
export const runsForProfile = (id) => runsOf(state.runs, id, firstId());
function mirrorActiveProfile() {
  const p = activeProfile(); if (!p) return;
  // each person has their OWN look / text / sound / voice settings (prefs); a profile that has none yet (null) keeps what is on the device
  const over = {}; if (p.prefs) for (const k of PREF_KEYS) over[k] = Object.hasOwn(p.prefs, k) ? p.prefs[k] : DEFAULT_SETTINGS[k];
  state.settings = { ...state.settings, ...over, activeProfile: p.id, personName: p.name, age: p.age, gender: p.gender, avatar: p.avatar, mascot: avatarEmoji(p.avatar) };
}
const pickPrefs = (settings) => sanitizePrefs(Object.fromEntries(PREF_KEYS.filter((k) => k in settings).map((k) => [k, settings[k]])));
const persistProfiles = () => db.put('kv', state.profiles, 'profiles');
export async function saveProfile(p) {
  const clean = normalizeProfile(p), i = state.profiles.findIndex((x) => x.id === clean.id);
  if (i < 0) { if (state.profiles.length >= MAX_PROFILES) throw new Error('limit'); if (!clean.prefs) clean.prefs = sanitizePrefs({ lang: state.settings.lang }); state.profiles.push(clean); } else state.profiles[i] = { ...state.profiles[i], ...clean };
  await persistProfiles();
  if (clean.id === state.settings.activeProfile) { mirrorActiveProfile(); await db.put('kv', state.settings, 'settings'); }
  emit(); return clean;
}
/** Which helpers (calm corner, sprints, journal...) are on for a person: from their chosen focus areas + their own switches. */
export const features = (p = activeProfile()) => {
  const f = toolsFor(p?.focus, p?.tools);
  if (p?.menu?.length && !Object.hasOwn(p.tools || {}, 'rewardMenu')) f.rewardMenu = true;   // a menu someone set up is obviously meant to be used
  const set = visibleSet(p?.view);   // "what do you need the app for": hide what does not fit (null = everything)
  if (set) { f.calmCorner = f.calmCorner && set.has('calm'); f.journal = f.journal && set.has('journal'); f.rewardMenu = f.rewardMenu && set.has('rewards'); }
  return f;
};
/** Is this part of the app shown for this person? ('goals', 'retros', 'calm', 'journal', 'aprt', 'rewards', 'stats', 'reports', 'smart', 'family'; core ids always are) */
export const shows = (id, p = activeProfile()) => needShows(p?.view, id);
/** Sets what a profile needs the app for; the help areas follow (full = nothing is hidden and the person's own help areas stay as they were). */
export async function setNeeds(id, view) {
  const v = sanitizeView(view), p = state.profiles.find((x) => x.id === id); if (!p) return null;
  return saveProfile({ ...p, view: v, ...(isFull(v) ? {} : { focus: areasFor(v), focusSet: true }) });
}
export const patchProfile = async (id, patch) => { const p = state.profiles.find((x) => x.id === id); return p ? saveProfile({ ...p, ...patch }) : null; };
export async function switchProfile(id) {
  if (!state.profiles.some((p) => p.id === id)) return;
  state.settings = { ...state.settings, activeProfile: id }; mirrorActiveProfile(); await db.put('kv', state.settings, 'settings'); emit();
}
/** Removes a profile and its history. The last profile cannot be deleted. */
export async function deleteProfile(id) {
  if (state.profiles.length <= 1) return false;
  const mine = runsOf(state.runs, id, firstId()), wasActive = id === state.settings.activeProfile;
  state.runs = state.runs.filter((r) => !mine.includes(r)); for (const r of mine) await db.del('runs', r.id);
  state.profiles = state.profiles.filter((p) => p.id !== id); await persistProfiles(); await eraseJournal(id);
  if (state.feelings.some((x) => x.pid === id)) { for (const x of state.feelings.filter((y) => y.pid === id && y.audio)) await db.del('audio', x.audio.id); state.feelings = state.feelings.filter((x) => x.pid !== id); await persistFeelings(); }
  if (state.retros.some((x) => x.profileId === id)) { state.retros = state.retros.filter((x) => x.profileId !== id); await persistRetros(); }
  if (wasActive) { state.settings = { ...state.settings, activeProfile: state.profiles[0].id }; }
  for (const x of state.templates.filter((k) => k.owners?.includes(id))) await saveTemplate({ ...x, owners: x.owners.filter((o) => o !== id) }, { touch: false });   // a routine only that person saw becomes shared with everyone, never lost
  mirrorActiveProfile(); await db.put('kv', state.settings, 'settings'); emit(); return true;
}

/** Seeds the sample routines once (localised at that moment). Needs i18n to be set up first. */
export async function seedIfNeeded() {
  if (state.settings.seeded || state.templates.length) return;
  await addSamples();
  await updateSettings({ seeded: true });
}
/**
 * The ready-made example routines come with their alarm time set but SWITCHED OFF: nobody should be woken by an alarm they never asked for.
 * One-time: examples that an earlier version had switched on are switched off (a person's own routines are never touched).
 */
export async function migrateAlarms() {
  if (!state.settings.alarmsMig) await updateSettings({ alarmsMig: true });   // (the old migration that switched example alarms ON is gone)
  if (state.settings.samplesAlarmsOff) return;
  for (const x of state.templates) {
    if (IDEA_ROUTINES.some((r) => r.id === x.id) && x.builtin && x.alarm?.enabled) await saveTemplate({ ...x, alarm: { ...x.alarm, enabled: false } }, { touch: false });
  }
  await updateSettings({ samplesAlarmsOff: true });
}
export async function addSamples(all = false) {
  // Fixed ids: the same sample on the website and in the app is the SAME routine, so a manual-sync merge never duplicates it.
  const mk = (id, name, icon, color, items) => ({ ...newTemplate(name), id, icon, color, builtin: true,
    tasks: items.map(([k, min], i) => ({ id: `${id}-${i}`, name: t(k), icon: suggestIcon(t(k)), sec: Math.round(min * 60), est: 0 })) });
  const alarmFor = (id) => { const d = IDEA_ROUTINES.find((x) => x.id === id), evening = /bedtime|evening/.test(id); return defaultAlarm(evening ? [0, 1, 2, 3, 4, 5, 6] : presetDays(getLang()).school, d?.alarmTime || '07:00', false); };   // time ready, switched OFF
  const samples = ideaRoutines().filter((r) => all || IDEA_ROUTINES.find((d) => d.id === r.id)?.basic).map((r) => ({ ...mk(r.id, r.name, r.icon, r.color, IDEA_ROUTINES.find((d) => d.id === r.id).items), alarm: alarmFor(r.id) }));
  const base = Date.now(); // distinct timestamps keep the list order (kids first) after reloads (IndexedDB returns rows by id)
  for (const [i, x] of samples.entries()) if (!getTemplate(x.id)) await saveTemplate({ ...x, createdAt: base + i });
}

/** Delete with an undo handle: call the returned function to put the routine back exactly as it was. */
export async function deleteWithUndo(id) {
  const snap = structuredClone(getTemplate(id)); if (!snap) return () => {};
  await deleteTemplate(id);
  return () => saveTemplate(snap, { touch: false });
}

export async function saveTemplate(tpl, { touch = true } = {}) {
  const clean = normalizeTemplate({ ...tpl, updatedAt: touch ? Date.now() : tpl.updatedAt });
  const i = state.templates.findIndex((x) => x.id === clean.id);
  if (i < 0 && state.templates.length >= LIMITS.maxTemplates) throw new Error('limit');
  if (i < 0) state.templates.push(clean); else state.templates[i] = clean;
  await db.put('templates', clean);
  emit(); syncNative();
  return clean;
}
export async function deleteTemplate(id) {
  state.templates = state.templates.filter((x) => x.id !== id);
  if (state.watch.some((x) => x.templateId === id)) { state.watch = state.watch.filter((x) => x.templateId !== id); await db.put('kv', state.watch, 'watch'); }
  await db.del('templates', id);
  emit(); syncNative();
}
export const toggleFavorite = (id) => { const x = getTemplate(id); return x && saveTemplate({ ...x, favorite: !x.favorite }); };
export const duplicateTemplate = (id) => {
  const x = getTemplate(id);
  return x && saveTemplate({ ...x, id: uid(), name: `${x.name} (2)`, favorite: false, builtin: false, createdAt: Date.now(), tasks: x.tasks.map((k) => ({ ...k, id: uid() })) });
};
export const reorderTasks = (tpl, from, to) => ({ ...tpl, tasks: move(tpl.tasks, from, to) });

export async function updateSettings(patch) {
  if ('personName' in patch) patch = { ...patch, personName: cleanText(patch.personName, 30) };
  if ('mascot' in patch && !MASCOTS.includes(patch.mascot)) delete patch.mascot;
  if ('age' in patch) { const n = Math.round(Number(patch.age)); patch = { ...patch, age: Number.isFinite(n) && n >= 3 && n <= 120 ? n : null }; }
  if ('fontScale' in patch && ![100, 115, 130, 150].includes(patch.fontScale)) delete patch.fontScale;
  if ('textStyle' in patch && !['auto', 'playful', 'plain'].includes(patch.textStyle)) delete patch.textStyle;
  if ('retroStyle' in patch && !['ask', 'guided', 'free'].includes(patch.retroStyle)) delete patch.retroStyle;
  if ('voiceFlavor' in patch && !['neutral', 'casual', 'warm', 'formal'].includes(patch.voiceFlavor)) delete patch.voiceFlavor;
  if ('voiceRate' in patch) { const n = Math.round(Number(patch.voiceRate)); patch = { ...patch, voiceRate: Number.isFinite(n) ? Math.min(130, Math.max(70, n)) : 100 }; }
  if ('timerStyle' in patch && !['auto', 'ring', 'pie', 'bar', 'sand'].includes(patch.timerStyle)) delete patch.timerStyle;
  if ('paceMode' in patch && !['normal', 'quick', 'calm'].includes(patch.paceMode)) delete patch.paceMode;
  if ('contrast' in patch && !['normal', 'high'].includes(patch.contrast)) delete patch.contrast;
  if ('accent' in patch && !(patch.accent === '' || /^#[0-9a-f]{6}$/i.test(patch.accent))) delete patch.accent;
  if ('gender' in patch && !['female', 'male', 'other'].includes(patch.gender)) delete patch.gender;
  if ('voicePreset' in patch && !Object.hasOwn(PRESETS, patch.voicePreset)) delete patch.voicePreset;
  if ('voiceURI' in patch) patch = { ...patch, voiceURI: String(patch.voiceURI || '').slice(0, 200) };
  if ('avatar' in patch) patch = { ...patch, avatar: sanitizeAvatar(patch.avatar) };
  delete patch.activeProfile; // switching goes through switchProfile()
  if ('voiceEngine' in patch) patch = { ...patch, voiceEngine: /^[\w.]{1,100}$/.test(String(patch.voiceEngine || '')) ? String(patch.voiceEngine) : '' };
  if ('skin' in patch && !SKINS.includes(patch.skin)) delete patch.skin;
  if ('weeklyDay' in patch) { const n = Math.round(Number(patch.weeklyDay)); patch = { ...patch, weeklyDay: n >= 0 && n <= 6 ? n : 5 }; }
  if ('alarmsPause' in patch) patch = { ...patch, alarmsPause: cleanPause(patch.alarmsPause) };
  state.settings = { ...state.settings, ...patch };
  applyAlarmRules();
  const prefKeys = PREF_KEYS.filter((k) => k in patch);
  if (prefKeys.length && state.profiles.length) { const p = activeProfile(), i = state.profiles.indexOf(p); state.profiles[i] = { ...p, prefs: sanitizePrefs({ ...(p.prefs || pickPrefs(state.settings)), ...pickPrefs(state.settings) }) }; await persistProfiles(); }
  const touched = PROFILE_KEYS.filter((k) => k in patch);
  if (touched.length && state.profiles.length) { // editing name/age/gender/avatar edits the ACTIVE profile
    const p = activeProfile(), upd = { ...p };
    if ('personName' in patch) upd.name = patch.personName; if ('age' in patch) upd.age = patch.age; if ('gender' in patch) upd.gender = patch.gender;
    if ('avatar' in patch) upd.avatar = patch.avatar; else if ('mascot' in patch) upd.avatar = avatarFromMascot(patch.mascot);
    state.profiles[state.profiles.indexOf(p)] = normalizeProfile(upd); await persistProfiles(); mirrorActiveProfile();
  }
  await db.put('kv', state.settings, 'settings');
  emit();
}

export async function saveRun(run) {
  const copy = structuredClone(run);
  copy.tasks.forEach((x) => { delete x.photo; }); // history stays small
  state.runs.push(copy);
  if (state.runs.length > LIMITS.maxRuns) { // drop the oldest so storage stays bounded
    state.runs.sort((a, b) => a.startedAt - b.startedAt);
    for (const old of state.runs.splice(0, state.runs.length - LIMITS.maxRuns)) await db.del('runs', old.id);
  }
  await db.put('runs', copy);
  emit();
}
/** Records how the person felt after a finished run (mood faces). */
export async function setRunMood(id, mood) {
  const r = state.runs.find((x) => x.id === id); if (!r) return;
  r.mood = sanitizeMood(mood); await db.put('runs', r); emit();
}
/** Removes ONE finished run from the history; the returned function puts it back (undo). */
export async function removeRunWithUndo(id) {
  const r = state.runs.find((x) => x.id === id); if (!r) return async () => {};
  state.runs = state.runs.filter((x) => x.id !== id); await db.del('runs', id); emit();
  return async () => { if (!state.runs.some((x) => x.id === r.id)) { state.runs.push(r); await db.put('runs', r); emit(); } };
}
export async function clearRuns(templateId) {
  const gone = state.runs.filter((r) => !templateId || r.templateId === templateId);
  state.runs = state.runs.filter((r) => !gone.includes(r));
  for (const r of gone) await db.del('runs', r.id);
  emit();
}

// The run in progress survives reloads / the OS killing the tab.
export const saveActive = (run) => db.put('kv', run ? structuredClone(run) : null, 'activeRun');
export const loadActive = () => db.get('kv', 'activeRun');

export function exportAll() {
  return JSON.stringify({ app: 'morning-organizer', v: 1, templates: state.templates, runs: state.runs, profiles: state.profiles, library: state.library, retros: state.retros, feelings: state.feelings, avatarLib: state.avatarLib, settings: state.settings });
}
/** Keep only known settings with the right type and sane ranges (a backup is untrusted input). */
export function sanitizeSettings(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  const ENUM = { density: ['normal', 'compact', 'roomy'], homeMode: ['full', 'now'], runView: ['full', 'single'], calmVisual: ['sunny', 'scene', 'avatar', 'circle'], iconStyle: ['auto', 'line', 'duotone', 'filled'], skin: SKINS, scoring: SCORE_MODES, lang: ['auto', 'he', 'en'], theme: ['auto', 'light', 'dark'], mode: ['both', 'beep', 'vibrate', 'silent'], paceMode: ['normal', 'quick', 'calm'], contrast: ['normal', 'high'], textStyle: ['auto', 'playful', 'plain'], timerStyle: ['auto', 'ring', 'pie', 'bar', 'sand'], voiceFlavor: ['neutral', 'casual', 'warm', 'formal'], retroStyle: ['ask', 'guided', 'free'], fontScale: [100, 115, 130, 150] };
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (k === 'seeded' || !(k in raw)) continue;
    const v = raw[k];
    if (ENUM[k]) { if (ENUM[k].includes(v)) out[k] = v; }
    else if (k === 'avatar') out.avatar = sanitizeAvatar(v);
    else if (k === 'alarmsPause') out.alarmsPause = cleanPause(v);
    else if (k === 'weeklyDay') { if (Number.isInteger(v) && v >= 0 && v <= 6) out.weeklyDay = v; }
    else if (k === 'activeProfile') continue;
    else if (k === 'accent') { if (v === '' || /^#[0-9a-f]{6}$/i.test(v)) out[k] = v; }
    else if (typeof def === 'boolean') { if (typeof v === 'boolean') out[k] = v; }
    else if (k === 'age') { if (v === null || Number.isFinite(Number(v))) out[k] = v; }
    else if (typeof def === 'number') { if (Number.isFinite(v)) out[k] = clamp(v, 0, 86400); }
    else if (typeof def === 'string') { if (typeof v === 'string') out[k] = v.slice(0, 200); }
  }
  return out;
}

/**
 * Import a backup JSON string. mode 'merge' (default): the newer copy of each routine wins, history is added by id.
 * mode 'replace': this device becomes an exact copy. Deletions are not propagated by a merge.
 * -> { added, updated, skipped, runs, reload }
 */
export async function importBackup(text, { mode = 'merge', settings = true } = {}) {
  let d; try { d = JSON.parse(text); } catch { throw new Error('bad-data'); }
  if (d?.app !== 'morning-organizer' || !Array.isArray(d.templates)) throw new Error('bad-data');
  const res = { added: 0, updated: 0, skipped: 0, runs: 0, reload: false };
  if (mode === 'replace') { for (const x of [...state.templates]) await deleteTemplate(x.id); await clearRuns(); }
  for (const raw of d.templates.slice(0, LIMITS.maxTemplates)) {
    if (!raw || typeof raw !== 'object') continue;
    const id = typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 64) : uid(), have = getTemplate(id), stamp = Number(raw.updatedAt) || 0;
    if (have && have.updatedAt >= stamp) { res.skipped++; continue; }
    await saveTemplate({ ...newTemplate(), ...raw, id, updatedAt: stamp || Date.now() }, { touch: false });
    if (have) res.updated++; else res.added++;
  }
  for (const r of (Array.isArray(d.runs) ? d.runs : []).slice(0, LIMITS.maxRuns)) {
    if (r && typeof r.id === 'string' && Array.isArray(r.tasks) && Number.isFinite(r.startedAt) && Number.isFinite(r.endedAt) && !state.runs.some((x) => x.id === r.id)) { await saveRun(sanitizeRun(r)); res.runs++; }
  }
  if (Array.isArray(d.profiles)) { // merge by id; "replace" makes the imported list the whole list
    const incoming = d.profiles.slice(0, MAX_PROFILES).filter((x) => x && typeof x === 'object').map(normalizeProfile);
    if (mode === 'replace' && incoming.length) state.profiles = [];
    for (const p of incoming) { const i = state.profiles.findIndex((x) => x.id === p.id); if (i < 0 && state.profiles.length < MAX_PROFILES) state.profiles.push(p); else if (i >= 0) state.profiles[i] = { ...p, seenBadges: [...new Set([...state.profiles[i].seenBadges, ...p.seenBadges])] }; }
    if (!state.profiles.length) state.profiles = [newProfile({})];
    if (!state.profiles.some((x) => x.id === state.settings.activeProfile)) state.settings.activeProfile = state.profiles[0].id;
    await persistProfiles(); mirrorActiveProfile();
  }
  if (Array.isArray(d.feelings)) { // feeling check-ins: union by id; "replace" mirrors the backup
    const incoming = sanitizeFeelings(d.feelings).map((x) => ({ ...x, pid: x.pid || activeProfile().id })), known = new Set(mode === 'replace' ? [] : state.feelings.map((x) => x.id));
    state.feelings = (mode === 'replace' ? [] : state.feelings).concat(incoming.filter((x) => !known.has(x.id))).slice(-MAX_FEELINGS); await persistFeelings();
  }
  if (Array.isArray(d.retros)) { // retrospectives: union by id; "replace" mirrors the backup
    const incoming = sanitizeRetros(d.retros).map((x) => ({ ...x, profileId: x.profileId || activeProfile().id })), known = new Set(mode === 'replace' ? [] : state.retros.map((x) => x.id));
    state.retros = (mode === 'replace' ? [] : state.retros).concat(incoming.filter((x) => !known.has(x.id))).slice(-MAX_RETROS); await persistRetros();
  }
  if (Array.isArray(d.avatarLib)) { // saved avatar designs: union by id; "replace" mirrors the backup
    let lib = mode === 'replace' ? [] : state.avatarLib; for (const x of sanitizeLib(d.avatarLib)) if (!lib.some((k) => k.id === x.id)) lib = libUpsert(lib, x) || lib;
    state.avatarLib = lib; await persistAvatars();
  }
  if (d.library && typeof d.library === 'object') { // the template library: merge by id; "replace" makes the backup's library the whole library
    const incoming = sanitizeLibrary(d.library), before = state.library.routines.length + state.library.tasks.length;
    state.library = mode === 'replace' ? incoming : mergeLibrary(state.library, incoming); await persistLib();
    res.library = state.library.routines.length + state.library.tasks.length - (mode === 'replace' ? 0 : before);
  }
  if (settings && d.settings) {
    const patch = sanitizeSettings(d.settings);
    res.reload = ('lang' in patch && patch.lang !== state.settings.lang) || ('theme' in patch && patch.theme !== state.settings.theme);
    await updateSettings(patch);
  }
  return res;
}

// ── mirror to native shell (alarms + widget); no-ops in the browser ──
export function syncNative() {
  if (!native.available) return;
  native.setAlarms(state.templates.flatMap((x) => nativeRings(x, getLang())).slice(0, 190));
  native.setAlarmRules({ pausedUntil: activePause(state.settings.alarmsPause), skipDates: skipDates(new Date(), 430) });
  const dayName = (d) => new Date(2024, 0, 7 + d).toLocaleDateString(getLang(), { weekday: 'short' });   // 2024-01-07 was a Sunday
  native.setWidget(widgetItems(state.templates, new Date().getDay(), { units: units(), day: dayName, leave: (tm) => t('leaveLine2', { time: tm }), gear: (n) => t('gearCount2', { n }) }));
}
export { isPersistent };

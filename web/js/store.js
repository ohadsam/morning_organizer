// Application state: templates, runs, settings. Persists via db.js, notifies subscribers, mirrors to the native shell.
import { db, isPersistent } from './db.js';
import { LIMITS } from './config.js';
import { cleanText, clamp, uid, move } from './util.js';
import { defaultAlarm } from './alarms.js';
import { normalizeAlarm, nativeRings } from './wake.js';
import { native } from './native.js';
import { t, units, getLang } from './i18n.js';
import { suggestIcon } from './taskIcons.js';
import { PRESETS } from './speech.js';
import { validLeaveBy } from './leave.js';
import { normDays } from './schedule.js';
import { isSafePhoto } from './photo.js';
import { sanitizeAvatar, avatarEmoji, avatarFromMascot, defaultAvatar } from './avatar.js';
import { toolsFor } from './focus.js';
import { widgetItems } from './widgetData.js';
import { sanitizeMood } from './mood.js';
import { sanitizeUnplanned, sanitizeWatch } from './unplanned.js';
import { sanitizeGoal, MAX_GOALS } from './cogfun.js';
import { sanitizeLibrary, mergeLibrary, upsert, fromTemplate, fromTask, MAX_ROUTINES as LIB_R, MAX_TASKS as LIB_T, IDEA_ROUTINES } from './library.js';
import { eraseJournal } from './journal.js';
import { newProfile, normalizeProfile, runsOf, MAX_PROFILES } from './profiles.js';

export const DEFAULT_SETTINGS = Object.freeze({
  lang: 'he', theme: 'auto', mode: 'both', volume: 80, warnSec: 10, defTaskSec: 300, defEstSec: 0,
  autoAdvance: false, keepAwake: true, keepAwakeApp: false, personName: '', mascot: '🦊', feedback: true, speak: false, age: null, gender: 'other', profileDone: false,
  textStyle: 'auto', timerStyle: 'auto', paceMode: 'normal', accent: '', simpleMode: false, announceTasks: false, fontScale: 100, colorSafe: false, contrast: 'normal', srAnnounce: false,
  coachButton: true, coachAuto: false, coachSpeak: false, voiceURI: '', voicePreset: 'natural', seeded: false,
  avatar: defaultAvatar(), activeProfile: '', transcribe: false,
});
/** The settings keys that mirror the ACTIVE profile (so the rest of the app can keep reading settings.personName etc.). */
const isDefaultAvatar = (a) => !a || (a.k === 'char' && a.id === 'fox');
const PROFILE_KEYS = ['personName', 'age', 'gender', 'mascot', 'avatar'];
export const COLORS = ['#6c5ce7', '#0984e3', '#00b894', '#e17055', '#e84393', '#fdcb6e', '#2d3436'];
export const MASCOTS = ['🦊', '🐼', '🦄', '🐯', '🐸', '🤖', '🐶', '🐱'];
export const ICONS = ['🌅', '☀️', '🎒', '🪥', '👕', '🥣', '🏃', '📚', '🧘', '🐶', '🚌', '⏰'];

const state = { templates: [], runs: [], watch: [], library: { routines: [], tasks: [] }, profiles: [], settings: { ...DEFAULT_SETTINGS }, ready: false };
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
    leaveBy: '', from: '', days: [], gear: [], plans: [], tasks: [newTask()], alarm: defaultAlarm(), createdAt: now, updatedAt: now };
}
export const totalSec = (tpl) => tpl.tasks.reduce((s, x) => s + x.sec, 0);

/** Clamp + clean a template before it is stored. Defence in depth: the editor, import and restore all pass through. */
export function normalizeTemplate(tpl) {
  const a = tpl.alarm ?? defaultAlarm();
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  // Whitelist: unknown/oversized fields from a backup or import are dropped, never stored.
  return {
    id: typeof tpl.id === 'string' && tpl.id ? tpl.id.slice(0, 64) : uid(),
    name: cleanText(tpl.name, LIMITS.maxName), icon: cleanText(tpl.icon, 8) || '⏰',
    color: /^#[0-9a-fA-F]{6}$/.test(tpl.color) ? tpl.color : COLORS[0], favorite: !!tpl.favorite, builtin: !!tpl.builtin,
    createdAt: num(tpl.createdAt, Date.now()), updatedAt: num(tpl.updatedAt, Date.now()), leaveBy: validLeaveBy(tpl.leaveBy), from: cleanText(tpl.from, 30), days: normDays(tpl.days),
    plans: (Array.isArray(tpl.plans) ? tpl.plans : []).filter((x) => x && typeof x === 'object' && cleanText(x.when, 80) && cleanText(x.then, 80)).slice(0, 5).map((x) => ({ id: typeof x.id === 'string' && x.id ? x.id.slice(0, 64) : uid(), when: cleanText(x.when, 80), then: cleanText(x.then, 80) })),
    gear: (Array.isArray(tpl.gear) ? tpl.gear : []).filter((g) => g && typeof g === 'object' && cleanText(g.name, 40)).slice(0, 20).map((g) => ({ id: typeof g.id === 'string' && g.id ? g.id.slice(0, 64) : uid(), name: cleanText(g.name, 40), icon: cleanText(g.icon, 8), days: normDays(g.days) })),
    tasks: (Array.isArray(tpl.tasks) ? tpl.tasks : []).slice(0, LIMITS.maxTasks).map((x) => ({
      id: typeof x?.id === 'string' && x.id ? x.id.slice(0, 64) : uid(), name: cleanText(x?.name, LIMITS.maxName), icon: cleanText(x?.icon, 8), photo: isSafePhoto(x?.photo) ? x.photo : '',
      sec: clamp(Math.round(Number(x?.sec)) || 1, 1, LIMITS.maxTaskSec), est: clamp(Math.round(Number(x?.est)) || 0, 0, LIMITS.maxTaskSec) })),
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
    plannedTotal: n(r.plannedTotal, 1e7), estTotal: n(r.estTotal, 1e7), actualTotal: n(r.actualTotal, 1e7),
    tasks: r.tasks.slice(0, LIMITS.maxTasks).map((x) => ({ id: String(x?.id ?? '').slice(0, 64), name: cleanText(x?.name, LIMITS.maxName), icon: cleanText(x?.icon, 8),
      plannedSec: n(x?.plannedSec, LIMITS.maxTaskSec), estSec: n(x?.estSec, LIMITS.maxTaskSec), extraSec: n(x?.extraSec, LIMITS.maxTaskSec), actualSec: n(x?.actualSec, LIMITS.maxTaskSec),
      done: !!x?.done, skipped: !!x?.skipped })),
  };
}

export async function init() {
  const [templates, runs, kv] = await Promise.all([db.all('templates'), db.all('runs'), db.get('kv', 'settings')]);
  state.templates = templates.sort((a, b) => a.createdAt - b.createdAt);
  state.runs = runs;
  state.settings = { ...DEFAULT_SETTINGS, ...(kv || {}) };
  // Profiles: first start (or an upgrade from before profiles) creates one from the existing name/age/gender/mascot.
  const stored = await db.get('kv', 'profiles');
  state.profiles = (Array.isArray(stored) ? stored : []).slice(0, MAX_PROFILES).map(normalizeProfile);
  if (!state.profiles.length) {
    state.profiles = [newProfile({ name: state.settings.personName, age: state.settings.age, gender: state.settings.gender, avatar: isDefaultAvatar(state.settings.avatar) ? avatarFromMascot(state.settings.mascot) : state.settings.avatar })];
    await db.put('kv', state.profiles, 'profiles');
  }
  if (!state.profiles.some((p) => p.id === state.settings.activeProfile)) state.settings.activeProfile = state.profiles[0].id;
  mirrorActiveProfile();
  state.watch = sanitizeWatch(await db.get('kv', 'watch'));
  state.library = sanitizeLibrary(await db.get('kv', 'library'));
  state.ready = true;
  emit();
}

// ── goals (Goal - Plan - Do - Check) live on the profile ──
export const goals = (p = activeProfile()) => p?.goals ?? [];
export async function saveGoal(g, profileId = activeProfile().id) {
  const p = state.profiles.find((x) => x.id === profileId); if (!p) return null;
  const clean = sanitizeGoal(g); if (!clean.title) return null;
  const i = p.goals.findIndex((x) => x.id === clean.id), next = i >= 0 ? p.goals.map((x, k) => (k === i ? clean : x)) : [...p.goals, clean].slice(-MAX_GOALS);
  await patchProfile(profileId, { goals: next }); return clean;
}
export async function removeGoal(id) { const p = activeProfile(); await patchProfile(p.id, { goals: p.goals.filter((x) => x.id !== id) }); }
export async function addCheck(goalId, { rating, note = '' }) { const g = goals().find((x) => x.id === goalId); if (g) await saveGoal({ ...g, checks: [...g.checks, { at: Date.now(), rating, note }] }); }
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
  state.settings = { ...state.settings, activeProfile: p.id, personName: p.name, age: p.age, gender: p.gender, avatar: p.avatar, mascot: avatarEmoji(p.avatar) };
}
const persistProfiles = () => db.put('kv', state.profiles, 'profiles');
export async function saveProfile(p) {
  const clean = normalizeProfile(p), i = state.profiles.findIndex((x) => x.id === clean.id);
  if (i < 0) { if (state.profiles.length >= MAX_PROFILES) throw new Error('limit'); state.profiles.push(clean); } else state.profiles[i] = { ...state.profiles[i], ...clean };
  await persistProfiles();
  if (clean.id === state.settings.activeProfile) { mirrorActiveProfile(); await db.put('kv', state.settings, 'settings'); }
  emit(); return clean;
}
/** Which helpers (calm corner, sprints, journal...) are on for a person: from their chosen focus areas + their own switches. */
export const features = (p = activeProfile()) => {
  const f = toolsFor(p?.focus, p?.tools);
  if (p?.menu?.length && !Object.hasOwn(p.tools || {}, 'rewardMenu')) f.rewardMenu = true;   // a menu someone set up is obviously meant to be used
  return f;
};
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
  if (wasActive) { state.settings = { ...state.settings, activeProfile: state.profiles[0].id }; }
  mirrorActiveProfile(); await db.put('kv', state.settings, 'settings'); emit(); return true;
}

/** Seeds the sample routines once (localised at that moment). Needs i18n to be set up first. */
export async function seedIfNeeded() {
  if (state.settings.seeded || state.templates.length) return;
  await addSamples();
  await updateSettings({ seeded: true });
}
export async function addSamples(all = false) {
  // Fixed ids: the same sample on the website and in the app is the SAME routine, so a manual-sync merge never duplicates it.
  const mk = (id, name, icon, color, items) => ({ ...newTemplate(name), id, icon, color, builtin: true,
    tasks: items.map(([k, min], i) => ({ id: `${id}-${i}`, name: t(k), icon: suggestIcon(t(k)), sec: Math.round(min * 60), est: 0 })) });
  const samples = ideaRoutines().filter((r) => all || IDEA_ROUTINES.find((d) => d.id === r.id)?.basic).map((r) => mk(r.id, r.name, r.icon, r.color, IDEA_ROUTINES.find((d) => d.id === r.id).items));
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
  if ('timerStyle' in patch && !['auto', 'ring', 'pie', 'bar', 'sand'].includes(patch.timerStyle)) delete patch.timerStyle;
  if ('paceMode' in patch && !['normal', 'quick', 'calm'].includes(patch.paceMode)) delete patch.paceMode;
  if ('contrast' in patch && !['normal', 'high'].includes(patch.contrast)) delete patch.contrast;
  if ('accent' in patch && !(patch.accent === '' || /^#[0-9a-f]{6}$/i.test(patch.accent))) delete patch.accent;
  if ('gender' in patch && !['female', 'male', 'other'].includes(patch.gender)) delete patch.gender;
  if ('voicePreset' in patch && !Object.hasOwn(PRESETS, patch.voicePreset)) delete patch.voicePreset;
  if ('voiceURI' in patch) patch = { ...patch, voiceURI: String(patch.voiceURI || '').slice(0, 200) };
  if ('avatar' in patch) patch = { ...patch, avatar: sanitizeAvatar(patch.avatar) };
  delete patch.activeProfile; // switching goes through switchProfile()
  state.settings = { ...state.settings, ...patch };
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
  return JSON.stringify({ app: 'morning-organizer', v: 1, templates: state.templates, runs: state.runs, profiles: state.profiles, library: state.library, settings: state.settings });
}
/** Keep only known settings with the right type and sane ranges (a backup is untrusted input). */
export function sanitizeSettings(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  const ENUM = { lang: ['auto', 'he', 'en'], theme: ['auto', 'light', 'dark'], mode: ['both', 'beep', 'vibrate', 'silent'], paceMode: ['normal', 'quick', 'calm'], contrast: ['normal', 'high'], textStyle: ['auto', 'playful', 'plain'], timerStyle: ['auto', 'ring', 'pie', 'bar', 'sand'], fontScale: [100, 115, 130, 150] };
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (k === 'seeded' || !(k in raw)) continue;
    const v = raw[k];
    if (ENUM[k]) { if (ENUM[k].includes(v)) out[k] = v; }
    else if (k === 'avatar') out.avatar = sanitizeAvatar(v);
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
  const dayName = (d) => new Date(2024, 0, 7 + d).toLocaleDateString(getLang(), { weekday: 'short' });   // 2024-01-07 was a Sunday
  native.setWidget(widgetItems(state.templates, new Date().getDay(), { units: units(), day: dayName, leave: (tm) => t('leaveLine2', { time: tm }), gear: (n) => t('gearCount2', { n }) }));
}
export { isPersistent };

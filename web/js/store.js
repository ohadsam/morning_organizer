// Application state: templates, runs, settings. Persists via db.js, notifies subscribers, mirrors to the native shell.
import { db, isPersistent } from './db.js';
import { LIMITS } from './config.js';
import { cleanText, clamp, uid, move } from './util.js';
import { defaultAlarm, nextFire } from './alarms.js';
import { native } from './native.js';
import { t } from './i18n.js';
import { suggestIcon } from './taskIcons.js';
import { PRESETS } from './speech.js';
import { validLeaveBy } from './leave.js';
import { isSafePhoto } from './photo.js';

export const DEFAULT_SETTINGS = Object.freeze({
  lang: 'he', theme: 'auto', mode: 'both', volume: 80, warnSec: 10, defTaskSec: 300, defEstSec: 0,
  autoAdvance: false, keepAwake: true, keepAwakeApp: false, personName: '', mascot: '🦊', feedback: true, speak: false, age: null, gender: 'other', profileDone: false,
  paceMode: 'normal', announceTasks: false, fontScale: 100, colorSafe: false, contrast: 'normal', srAnnounce: false,
  coachButton: true, coachAuto: false, coachSpeak: false, voiceURI: '', voicePreset: 'natural', seeded: false,
});
export const COLORS = ['#6c5ce7', '#0984e3', '#00b894', '#e17055', '#e84393', '#fdcb6e', '#2d3436'];
export const MASCOTS = ['🦊', '🐼', '🦄', '🐯', '🐸', '🤖', '🐶', '🐱'];
export const ICONS = ['🌅', '☀️', '🎒', '🪥', '👕', '🥣', '🏃', '📚', '🧘', '🐶', '🚌', '⏰'];

const state = { templates: [], runs: [], settings: { ...DEFAULT_SETTINGS }, ready: false };
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
    leaveBy: '', from: '', tasks: [newTask()], alarm: defaultAlarm(), createdAt: now, updatedAt: now };
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
    createdAt: num(tpl.createdAt, Date.now()), updatedAt: num(tpl.updatedAt, Date.now()), leaveBy: validLeaveBy(tpl.leaveBy), from: cleanText(tpl.from, 30),
    tasks: (Array.isArray(tpl.tasks) ? tpl.tasks : []).slice(0, LIMITS.maxTasks).map((x) => ({
      id: typeof x?.id === 'string' && x.id ? x.id.slice(0, 64) : uid(), name: cleanText(x?.name, LIMITS.maxName), icon: cleanText(x?.icon, 8), photo: isSafePhoto(x?.photo) ? x.photo : '',
      sec: clamp(Math.round(Number(x?.sec)) || 1, 1, LIMITS.maxTaskSec), est: clamp(Math.round(Number(x?.est)) || 0, 0, LIMITS.maxTaskSec) })),
    alarm: { enabled: !!a.enabled, time: /^\d{2}:\d{2}$/.test(a.time) ? a.time : '07:00',
      days: (Array.isArray(a.days) ? a.days : []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
      volume: clamp(Math.round(a.volume) || 0, 0, 100), vibrate: !!a.vibrate, durationSec: clamp(Math.round(a.durationSec) || 30, 5, 600) },
  };
}

/** Same idea for a run read from a backup: only known fields, numbers coerced and clamped, strings cleaned. */
export function sanitizeRun(r) {
  const n = (v, max = 1e12) => clamp(Math.round(Number(v)) || 0, 0, max);
  return {
    id: String(r.id).slice(0, 64), templateId: String(r.templateId ?? '').slice(0, 64), templateName: cleanText(r.templateName, LIMITS.maxName),
    icon: cleanText(r.icon, 8), color: /^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color : COLORS[0],
    startedAt: n(r.startedAt), endedAt: n(r.endedAt), status: r.status === 'done' ? 'done' : 'stopped', current: 0, pausedMs: n(r.pausedMs),
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
  state.ready = true;
  emit();
}

/** Seeds the sample routines once (localised at that moment). Needs i18n to be set up first. */
export async function seedIfNeeded() {
  if (state.settings.seeded || state.templates.length) return;
  await addSamples();
  await updateSettings({ seeded: true });
}
export async function addSamples() {
  // Fixed ids: the same sample on the website and in the app is the SAME routine, so a manual-sync merge never duplicates it.
  const mk = (id, name, icon, color, items) => ({ ...newTemplate(name), id, icon, color, builtin: true,
    tasks: items.map(([k, min], i) => ({ id: `${id}-${i}`, name: t(k), icon: suggestIcon(t(k)), sec: min * 60, est: 0 })) });
  const samples = [mk('sample-kids', t('sample1'), '🎒', '#0984e3', [['s_wake', 2], ['s_bath', 4], ['s_dress', 5], ['s_eat', 15], ['s_bag', 3], ['s_shoes', 2]]),
    mk('sample-adult', t('sample2'), '🌅', '#e17055', [['s_shower', 8], ['s_dress', 5], ['s_coffee', 10], ['s_plan', 5]])];
  const base = Date.now(); // distinct timestamps keep the list order (kids first) after reloads (IndexedDB returns rows by id)
  for (const [i, x] of samples.entries()) if (!getTemplate(x.id)) await saveTemplate({ ...x, createdAt: base + i });
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
  if ('paceMode' in patch && !['normal', 'quick', 'calm'].includes(patch.paceMode)) delete patch.paceMode;
  if ('contrast' in patch && !['normal', 'high'].includes(patch.contrast)) delete patch.contrast;
  if ('gender' in patch && !['female', 'male', 'other'].includes(patch.gender)) delete patch.gender;
  if ('voicePreset' in patch && !(patch.voicePreset in PRESETS)) delete patch.voicePreset;
  if ('voiceURI' in patch) patch = { ...patch, voiceURI: String(patch.voiceURI || '').slice(0, 200) };
  state.settings = { ...state.settings, ...patch };
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
  return JSON.stringify({ app: 'morning-organizer', v: 1, templates: state.templates, runs: state.runs, settings: state.settings });
}
/** Keep only known settings with the right type and sane ranges (a backup is untrusted input). */
export function sanitizeSettings(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  const ENUM = { lang: ['auto', 'he', 'en'], theme: ['auto', 'light', 'dark'], mode: ['both', 'beep', 'vibrate', 'silent'], paceMode: ['normal', 'quick', 'calm'], contrast: ['normal', 'high'], fontScale: [100, 115, 130, 150] };
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (k === 'seeded' || !(k in raw)) continue;
    const v = raw[k];
    if (ENUM[k]) { if (ENUM[k].includes(v)) out[k] = v; }
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
  native.setAlarms(state.templates.filter((x) => x.alarm?.enabled && nextFire(x.alarm)).map((x) => {
    const [hour, minute] = x.alarm.time.split(':').map(Number);
    return { id: x.id, templateId: x.id, name: x.name, hour, minute, days: x.alarm.days, volume: x.alarm.volume, vibrate: x.alarm.vibrate, durationSec: x.alarm.durationSec };
  }));
  const favs = state.templates.filter((x) => x.favorite);
  native.setWidget((favs.length ? favs : state.templates).slice(0, 4).map((x) => ({ id: x.id, name: x.name, icon: x.icon, taskCount: x.tasks.length, totalSec: totalSec(x) })));
}
export { isPersistent };

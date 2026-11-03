// Application state: templates, runs, settings. Persists via db.js, notifies subscribers, mirrors to the native shell.
import { db, isPersistent } from './db.js';
import { LIMITS } from './config.js';
import { cleanText, clamp, uid, move } from './util.js';
import { defaultAlarm, nextFire } from './alarms.js';
import { native } from './native.js';
import { t } from './i18n.js';

export const DEFAULT_SETTINGS = Object.freeze({
  lang: 'auto', theme: 'auto', mode: 'both', volume: 80, warnSec: 10, defTaskSec: 300, defEstSec: 0,
  autoAdvance: false, keepAwake: true, seeded: false,
});
export const COLORS = ['#6c5ce7', '#0984e3', '#00b894', '#e17055', '#e84393', '#fdcb6e', '#2d3436'];
export const ICONS = ['🌅', '☀️', '🎒', '🪥', '👕', '🥣', '🏃', '📚', '🧘', '🐶', '🚌', '⏰'];

const state = { templates: [], runs: [], settings: { ...DEFAULT_SETTINGS }, ready: false };
const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((f) => f(state));
export const get = () => state;
export const getTemplate = (id) => state.templates.find((x) => x.id === id);

export function newTask(settings = state.settings, name = '') {
  return { id: uid(), name, sec: settings.defTaskSec, est: settings.defEstSec || 0 };
}
export function newTemplate(name = '') {
  const now = Date.now();
  return { id: uid(), name, icon: ICONS[0], color: COLORS[0], favorite: false, builtin: false,
    tasks: [newTask()], alarm: defaultAlarm(), createdAt: now, updatedAt: now };
}
export const totalSec = (tpl) => tpl.tasks.reduce((s, x) => s + x.sec, 0);

/** Clamp + clean a template before it is stored. Defence in depth: the editor, import and restore all pass through. */
export function normalizeTemplate(tpl) {
  const a = tpl.alarm ?? defaultAlarm();
  return {
    ...tpl, name: cleanText(tpl.name, LIMITS.maxName), icon: cleanText(tpl.icon, 8) || '⏰',
    color: /^#[0-9a-fA-F]{6}$/.test(tpl.color) ? tpl.color : COLORS[0],
    tasks: (tpl.tasks || []).slice(0, LIMITS.maxTasks).map((x) => ({
      id: x.id || uid(), name: cleanText(x.name, LIMITS.maxName),
      sec: clamp(Math.round(Number(x.sec)) || 1, 1, LIMITS.maxTaskSec), est: clamp(Math.round(Number(x.est)) || 0, 0, LIMITS.maxTaskSec) })),
    alarm: { enabled: !!a.enabled, time: /^\d{2}:\d{2}$/.test(a.time) ? a.time : '07:00',
      days: (a.days || []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
      volume: clamp(Math.round(a.volume) || 0, 0, 100), vibrate: !!a.vibrate, durationSec: clamp(Math.round(a.durationSec) || 30, 5, 600) },
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
  const mk = (name, icon, color, items) => ({ ...newTemplate(name), icon, color, builtin: true,
    tasks: items.map(([k, min]) => ({ id: uid(), name: t(k), sec: min * 60, est: 0 })) });
  await saveTemplate(mk(t('sample1'), '🎒', '#0984e3', [['s_wake', 2], ['s_bath', 4], ['s_dress', 5], ['s_eat', 15], ['s_bag', 3], ['s_shoes', 2]]));
  await saveTemplate(mk(t('sample2'), '🌅', '#e17055', [['s_shower', 8], ['s_dress', 5], ['s_coffee', 10], ['s_plan', 5]]));
}

export async function saveTemplate(tpl) {
  const clean = normalizeTemplate({ ...tpl, updatedAt: Date.now() });
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
  state.settings = { ...state.settings, ...patch };
  await db.put('kv', state.settings, 'settings');
  emit();
}

export async function saveRun(run) {
  const copy = structuredClone(run);
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
export async function importAll(text) {
  let d; try { d = JSON.parse(text); } catch { throw new Error('bad-data'); }
  if (d?.app !== 'morning-organizer' || !Array.isArray(d.templates)) throw new Error('bad-data');
  let n = 0;
  for (const raw of d.templates.slice(0, LIMITS.maxTemplates)) {
    if (!raw || typeof raw !== 'object') continue;
    await saveTemplate({ ...newTemplate(), ...raw, id: typeof raw.id === 'string' ? raw.id.slice(0, 64) : uid() }); n++;
  }
  for (const r of (Array.isArray(d.runs) ? d.runs : []).slice(0, LIMITS.maxRuns)) {
    if (r && typeof r.id === 'string' && Array.isArray(r.tasks) && Number.isFinite(r.startedAt) && Number.isFinite(r.endedAt) && !state.runs.some((x) => x.id === r.id)) await saveRun(r);
  }
  return n;
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

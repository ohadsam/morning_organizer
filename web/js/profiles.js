// Profiles: several people (e.g. siblings) can share one phone, each with their own name, avatar, runs, stars and badges (pure).
import { sanitizeAvatar, avatarFromMascot, shareableAvatar } from './avatar.js';
import { cleanText, clamp, uid } from './util.js';
import { sanitizeAreas, TOOLS } from './focus.js';
import { sanitizeMenu, sanitizeRedeemed } from './menu.js';
import { sanitizeGoals } from './cogfun.js';
import { sanitizeView } from './needs.js';
import { SKINS } from './skins.js';
import { PRESETS } from './speech.js';

export const MAX_PROFILES = 12;
/**
 * The settings that belong to each PERSON (look, text, sound, voice, pace...). Switching profile switches these; device-wide things (keep awake, alarm
 * pause, voice engine, consent) are not here. Each key has its own validator, so a stored or restored profile can never carry a bad value.
 */
const B = (v) => typeof v === 'boolean', N = (lo, hi) => (v) => Number.isFinite(v) && v >= lo && v <= hi, E = (...xs) => (v) => xs.includes(v);
export const PREF_RULES = {
  lang: E('auto', 'he', 'en'), theme: E('auto', 'light', 'dark'), skin: E(...SKINS), easyRead: B, reduceMotion: B, iconStyle: E('auto', 'line', 'duotone', 'filled'), iconMono: B, scoring: E('off', 'auto', 'custom'), scorePenalty: B, scoreCumulative: B, mode: E('both', 'beep', 'vibrate', 'silent'), volume: N(0, 100), warnSec: N(0, 600), defTaskSec: N(5, 86_400), defEstSec: N(0, 86_400),
  autoAdvance: B, feedback: B, speak: B, textStyle: E('auto', 'playful', 'plain'), timerStyle: E('auto', 'ring', 'pie', 'bar', 'sand'), paceMode: E('normal', 'quick', 'calm'), accent: (v) => v === '' || /^#[0-9a-f]{6}$/i.test(v),
  simpleMode: B, announceTasks: B, fontScale: E(100, 115, 130, 150), colorSafe: B, contrast: E('normal', 'high'), srAnnounce: B, coachButton: B, coachAuto: B, coachSpeak: B,
  voiceURI: (v) => typeof v === 'string' && v.length <= 200, voicePreset: (v) => typeof v === 'string' && Object.hasOwn(PRESETS, v), voiceFlavor: E('neutral', 'casual', 'warm', 'formal'), voiceRate: N(70, 130),
};
export const PREF_KEYS = Object.keys(PREF_RULES);
/** Keeps only known keys with valid values (a value that is out of range is dropped, not clamped: the default applies instead). null stays null = "not set yet". */
export function sanitizePrefs(p) {
  if (!p || typeof p !== 'object') return null;
  const out = {}; for (const k of PREF_KEYS) if (Object.hasOwn(p, k) && PREF_RULES[k](p[k])) out[k] = p[k];
  return out;
}
export const newProfile = (over = {}) => normalizeProfile({ id: uid(), createdAt: Date.now(), ...over });
/** Per-helper on/off overrides ({ tool: boolean }) - only known tools, only real booleans. */
export const sanitizeTools = (o) => Object.fromEntries(TOOLS.filter((k) => o && typeof o === 'object' && Object.hasOwn(o, k) && typeof o[k] === 'boolean').map((k) => [k, o[k]]));
export function normalizeProfile(p) {
  const age = Math.round(Number(p?.age));
  return {
    id: typeof p?.id === 'string' && p.id ? p.id.slice(0, 64) : uid(), name: cleanText(p?.name, 30),
    age: Number.isFinite(age) && age >= 3 && age <= 120 ? age : null, gender: ['female', 'male', 'other'].includes(p?.gender) ? p.gender : 'other',
    avatar: p?.avatar ? sanitizeAvatar(p.avatar) : avatarFromMascot(p?.mascot), createdAt: Number.isFinite(Number(p?.createdAt)) ? Number(p.createdAt) : Date.now(),
    focus: sanitizeAreas(p?.focus), focusSet: p?.focusSet === true, tools: sanitizeTools(p?.tools), menu: sanitizeMenu(p?.menu), redeemed: sanitizeRedeemed(p?.redeemed), goals: sanitizeGoals(p?.goals),
    view: sanitizeView(p?.view), prefs: sanitizePrefs(p?.prefs),
    seenBadges: (Array.isArray(p?.seenBadges) ? p.seenBadges : []).filter((x) => typeof x === 'string').map((x) => x.slice(0, 40)).slice(0, 80),
  };
}
/** Runs of one profile; runs saved before profiles existed (no profileId) belong to the first profile. */
export const runsOf = (runs, profileId, firstId) => runs.filter((r) => (r.profileId || firstId) === profileId);
/** What another phone may see of a profile. */
export const publicProfile = (p) => ({ name: p.name, age: p.age, gender: p.gender, avatar: shareableAvatar(p.avatar) });
export { clamp };

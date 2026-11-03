// Profiles: several people (e.g. siblings) can share one phone, each with their own name, avatar, runs, stars and badges (pure).
import { sanitizeAvatar, avatarFromMascot, shareableAvatar } from './avatar.js';
import { cleanText, clamp, uid } from './util.js';
import { sanitizeAreas, TOOLS } from './focus.js';
import { sanitizeMenu, sanitizeRedeemed } from './menu.js';

export const MAX_PROFILES = 12;
export const newProfile = (over = {}) => normalizeProfile({ id: uid(), createdAt: Date.now(), ...over });
/** Per-helper on/off overrides ({ tool: boolean }) - only known tools, only real booleans. */
export const sanitizeTools = (o) => Object.fromEntries(TOOLS.filter((k) => o && typeof o === 'object' && Object.hasOwn(o, k) && typeof o[k] === 'boolean').map((k) => [k, o[k]]));
export function normalizeProfile(p) {
  const age = Math.round(Number(p?.age));
  return {
    id: typeof p?.id === 'string' && p.id ? p.id.slice(0, 64) : uid(), name: cleanText(p?.name, 30),
    age: Number.isFinite(age) && age >= 3 && age <= 120 ? age : null, gender: ['female', 'male', 'other'].includes(p?.gender) ? p.gender : 'other',
    avatar: p?.avatar ? sanitizeAvatar(p.avatar) : avatarFromMascot(p?.mascot), createdAt: Number.isFinite(Number(p?.createdAt)) ? Number(p.createdAt) : Date.now(),
    focus: sanitizeAreas(p?.focus), focusSet: p?.focusSet === true, tools: sanitizeTools(p?.tools), menu: sanitizeMenu(p?.menu), redeemed: sanitizeRedeemed(p?.redeemed),
    seenBadges: (Array.isArray(p?.seenBadges) ? p.seenBadges : []).filter((x) => typeof x === 'string').map((x) => x.slice(0, 40)).slice(0, 80),
  };
}
/** Runs of one profile; runs saved before profiles existed (no profileId) belong to the first profile. */
export const runsOf = (runs, profileId, firstId) => runs.filter((r) => (r.profileId || firstId) === profileId);
/** What another phone may see of a profile. */
export const publicProfile = (p) => ({ name: p.name, age: p.age, gender: p.gender, avatar: shareableAvatar(p.avatar) });
export { clamp };

// Profiles: several people (e.g. siblings) can share one phone, each with their own name, avatar, runs, stars and badges (pure).
import { sanitizeAvatar, avatarFromMascot, shareableAvatar } from './avatar.js';
import { cleanText, clamp, uid } from './util.js';

export const MAX_PROFILES = 12;
export const newProfile = (over = {}) => normalizeProfile({ id: uid(), createdAt: Date.now(), ...over });
export function normalizeProfile(p) {
  const age = Math.round(Number(p?.age));
  return {
    id: typeof p?.id === 'string' && p.id ? p.id.slice(0, 64) : uid(), name: cleanText(p?.name, 30),
    age: Number.isFinite(age) && age >= 3 && age <= 120 ? age : null, gender: ['female', 'male', 'other'].includes(p?.gender) ? p.gender : 'other',
    avatar: p?.avatar ? sanitizeAvatar(p.avatar) : avatarFromMascot(p?.mascot), createdAt: Number.isFinite(Number(p?.createdAt)) ? Number(p.createdAt) : Date.now(),
    seenBadges: (Array.isArray(p?.seenBadges) ? p.seenBadges : []).filter((x) => typeof x === 'string').map((x) => x.slice(0, 40)).slice(0, 80),
  };
}
/** Runs of one profile; runs saved before profiles existed (no profileId) belong to the first profile. */
export const runsOf = (runs, profileId, firstId) => runs.filter((r) => (r.profileId || firstId) === profileId);
/** What another phone may see of a profile. */
export const publicProfile = (p) => ({ name: p.name, age: p.age, gender: p.gender, avatar: shareableAvatar(p.avatar) });
export { clamp };

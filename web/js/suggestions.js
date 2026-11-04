// Occasional, gentle suggestions (pure): "maybe you would like to use this" - at most one at a time, at most one a day after the person answers,
// never again once they said so. The state is tiny and lives on this device only.

const DAY = 86_400_000;
/** id, icon, where "Try it" goes, and when it makes sense. Order = priority. `c` = { runs, ownRoutines, alarmsOn, goals, retros, voiceChosen, ttsOk, calmOn }. */
export const SUGGESTIONS = [
  { id: 'wizard', icon: '🪄', go: { action: 'wizard' }, when: (c) => c.ownRoutines === 0 && c.runs < 3 },
  { id: 'guide', icon: '📖', go: { route: '#/guide' }, when: (c) => c.runs === 0 && c.ownRoutines > 0 },
  { id: 'alarms', icon: '⏰', go: { route: '#/alarms' }, when: (c) => !c.alarmsOn && c.runs >= 1 },
  { id: 'calm', icon: '🌬️', go: { route: '#/calm' }, when: (c) => c.calmOn && c.runs >= 2 },
  { id: 'voice', icon: '🔊', go: { route: '#/settings/voice' }, when: (c) => c.ttsOk && !c.voiceChosen && c.runs >= 2 },
  { id: 'goals', icon: '🎯', go: { route: '#/goals' }, when: (c) => c.runs >= 3 && c.goals === 0 },
  { id: 'retro', icon: '🔄', go: { route: '#/retros' }, when: (c) => c.runs >= 3 && c.retros === 0 },
  { id: 'report', icon: '📄', go: { route: '#/report' }, when: (c) => c.runs >= 5 },
];
const IDS = new Set(SUGGESTIONS.map((s) => s.id));

/** Whatever is read from storage is untrusted: keep only known ids and finite times. */
export function sanitizeState(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}, snoozed = {};
  if (r.snoozed && typeof r.snoozed === 'object') for (const [k, v] of Object.entries(r.snoozed)) if (IDS.has(k) && Number.isFinite(v)) snoozed[k] = v;
  return { off: r.off === true, hidden: (Array.isArray(r.hidden) ? r.hidden : []).filter((x) => IDS.has(x)), snoozed, last: Number.isFinite(r.last) ? r.last : 0 };
}

/** The suggestion to show now, or null. */
export function pickSuggestion(ctx, state, now = Date.now()) {
  const s = sanitizeState(state);
  if (s.off || now - s.last < DAY) return null;
  return SUGGESTIONS.find((x) => !s.hidden.includes(x.id) && !(s.snoozed[x.id] > now) && x.when(ctx)) ?? null;
}
/** The state after the person answered: 'try' and 'later' pause for a week (they may want it again), 'never' is forever. */
export function answer(state, id, how, now = Date.now()) {
  const s = sanitizeState(state); if (!IDS.has(id)) return s;
  if (how === 'never') s.hidden = [...new Set([...s.hidden, id])]; else s.snoozed[id] = now + (how === 'try' ? 30 : 7) * DAY;
  s.last = now; return s;
}

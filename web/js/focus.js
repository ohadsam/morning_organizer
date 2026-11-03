// "What would you like help with?" (pure). A person - or their parent - picks areas; each area switches on the helpers that fit it.
// Every helper stays individually switchable (Settings → Helpers): areas only decide the DEFAULTS, `overrides` always win.
export const AREAS = ['focus', 'calm', 'time', 'memory', 'motivation', 'habits'];
export const AREA_EMOJI = { focus: '🎯', calm: '🌬️', time: '⏱️', memory: '🧩', motivation: '🏆', habits: '🌱' };
export const TOOLS = ['calmCorner', 'sprints', 'bodyDouble', 'parkingLot', 'transition', 'timerPie', 'moodCheck', 'rewardMenu', 'journal'];

export const sanitizeAreas = (a) => [...new Set((Array.isArray(a) ? a : []).filter((x) => typeof x === 'string' && Object.hasOwn(AREA_EMOJI, x)))];
const has = (areas, a) => areas.includes(a);

/** Effective helpers for a person: defaults from the chosen areas, then explicit overrides ({ tool: true|false }). */
export function toolsFor(areas, overrides = {}) {
  const a = sanitizeAreas(areas);
  const auto = {
    calmCorner: true, journal: true,                                   // small, never in the way: always available
    sprints: has(a, 'focus'), bodyDouble: has(a, 'focus'), parkingLot: has(a, 'focus'),
    transition: has(a, 'time') || has(a, 'focus') || has(a, 'memory'), timerPie: has(a, 'time'),
    moodCheck: has(a, 'calm') || has(a, 'habits'), rewardMenu: has(a, 'motivation'),
  };
  const out = {};
  for (const k of TOOLS) out[k] = Object.hasOwn(overrides || {}, k) && typeof overrides[k] === 'boolean' ? overrides[k] : auto[k];
  return out;
}

const TIP_AREAS = { focus: ['focus', 'start', 'switch', 'body'], calm: ['breath', 'ground', 'defuse', 'think', 'kind'], time: ['time', 'start'], memory: ['memory', 'switch'], motivation: ['kind', 'focus'], habits: ['start', 'time'] };
/** Coach tip weights: categories that match the chosen areas are 3x as likely. No areas = all equal. */
export function tipWeights(areas) {
  const a = sanitizeAreas(areas), w = {};
  for (const x of a) for (const c of TIP_AREAS[x]) w[c] = 3;
  return w;
}

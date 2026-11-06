// The built-in "special tasks" (pure): steps the app itself can run for you - write in the journal, park a thought, a body scan, guided imagery...
// A routine can have them as ordinary tasks; on the run screen a special task shows one big button that opens exactly that tool.
// Grouped by topic so the picker stays short and calm. `feat` ties an entry to a feature a person may have hidden ("what the app is for").

/** id -> { group, icon, sec (default seconds), helper (the tool the run screen opens, '' = none), feat }. */
export const SPECIAL = [
  ['breath', 'calm', '🌬️', 120, 'calm', 'calm'], ['scan', 'calm', '🧍', 300, 'scan', 'calm'], ['imagery', 'calm', '🧚', 300, 'imagery', 'calm'], ['relax', 'calm', '🧘', 120, 'relax', 'calm'],
  ['journal', 'write', '📓', 180, 'journal', 'journal'], ['voice', 'write', '🎙️', 60, 'voice', 'journal'], ['gratitude', 'write', '🙏', 90, 'gratitude', 'journal'], ['aprt', 'write', '🧭', 180, 'aprt', 'aprt'], ['park', 'write', '🅿️', 60, 'park', 'journal'],
  ['thought', 'mind', '💭', 60, 'thought', ''], ['pickone', 'mind', '🎯', 60, '', ''], ['say', 'mind', '🗣️', 60, '', ''],
  ['move', 'body', '🤸', 120, 'move', ''], ['water', 'body', '💧', 60, '', ''],
  ['outcome', 'nlp', '🎯', 300, 'outcome', 'nlp'], ['reframe', 'nlp', '🖼️', 240, 'reframe', 'nlp'], ['anchor', 'nlp', '⚓', 180, 'anchor', 'nlp'], ['clarify', 'nlp', '🔎', 180, 'clarify', 'nlp'], ['perspectives', 'nlp', '👀', 300, 'perspectives', 'nlp'], ['rehearse', 'nlp', '🎬', 240, 'rehearse', 'nlp'],
  ['music', 'boost', '🎧', 120, '', ''], ['reward', 'boost', '🎉', 60, '', ''],
].map(([id, group, icon, sec, helper, feat]) => ({ id, group, icon, sec, helper, feat }));
export const GROUPS = ['calm', 'write', 'mind', 'nlp', 'body', 'boost'];
/** Every tool a task may open (what normalizeTemplate accepts). */
export const HELPER_IDS = [...new Set(SPECIAL.map((x) => x.helper).filter(Boolean))];
/** The i18n key of a special task's name and of its group. */
export const nameKey = (id) => `spt_${id}`;
export const groupKey = (g) => `sptg_${g}`;
export const isHelper = (h) => HELPER_IDS.includes(h);

/** The entries a person can pick: `has(feat)` hides what is switched off; `q` is a search text matched on the translated name (norm'd by the caller). */
export function pickable({ has = () => true, q = '', group = 'all', t = (k) => k, norm = (s) => String(s).toLowerCase() } = {}) {
  const needle = norm(q);
  return SPECIAL.filter((x) => (!x.feat || has(x.feat)) && (group === 'all' || x.group === group) && (!needle || norm(t(nameKey(x.id))).includes(needle) || norm(t(groupKey(x.group))).includes(needle)));
}
/** A ready task (without id) for the editor. */
export const toTask = (id, t) => { const x = SPECIAL.find((s) => s.id === id); return x ? { name: t(nameKey(id)), icon: x.icon, photo: '', sec: x.sec, est: 0, helper: x.helper } : null; };

// Moving routines between people and devices (pure): a small, versioned file with the chosen routines, and a strict reader.
// Everything read is untrusted: it is rebuilt field by field through the same normaliser the store uses, given new ids, and an imported
// routine never rings by itself (its alarm comes in switched OFF) - a routine arriving from somewhere else must not wake anyone.
import { uid } from './util.js';

export const FORMAT = 'sonrise-routines';
export const MAX_FILE_CHARS = 5_000_000, MAX_ROUTINES = 100;

/** The file for these routines: no ids, no owners, no favourite flag - just the routine itself. */
export function buildExport(templates, now = Date.now()) {
  const routines = (Array.isArray(templates) ? templates : []).slice(0, MAX_ROUTINES).map((x) => {
    const { id, owners, favorite, builtin, createdAt, updatedAt, ...rest } = x; void id; void owners; void favorite; void builtin; void createdAt; void updatedAt;
    return structuredClone(rest);
  });
  return { app: FORMAT, v: 1, exportedAt: now, routines };
}
export const toJson = (data) => JSON.stringify(data);
export const fileName = (n, now = new Date()) => `sonrise-routines-${n}-${now.toISOString().slice(0, 10)}.json`;

/** A fresh copy ready to store: new ids everywhere, not a built-in, alarm off, visible to `owners` ([] = everyone). */
export function prepare(tpl, normalize, { owners = [], keepAlarm = false } = {}) {
  const re = (a) => (Array.isArray(a) ? a.map((x) => (x && typeof x === 'object' ? { ...x, id: uid() } : x)) : a);
  const base = { ...tpl, id: uid(), favorite: false, builtin: false, owners, createdAt: Date.now(), updatedAt: Date.now(), tasks: re(tpl.tasks), gear: re(tpl.gear), plans: re(tpl.plans) };
  const out = normalize(base);
  if (!keepAlarm && out.alarm) out.alarm = { ...out.alarm, enabled: false };
  return out;
}

/** Read a file's text: our own routine file or a full backup. -> { routines: [raw templates], total } or throws 'bad-file'. */
export function parseFile(text) {
  if (typeof text !== 'string' || !text || text.length > MAX_FILE_CHARS) throw new Error('bad-file');
  let d; try { d = JSON.parse(text); } catch { throw new Error('bad-file'); }
  const list = d && d.app === FORMAT && Array.isArray(d.routines) ? d.routines : d && d.app === 'morning-organizer' && Array.isArray(d.templates) ? d.templates : null;
  if (!list) throw new Error('bad-file');
  const ok = list.filter((x) => x && typeof x === 'object' && !Array.isArray(x) && Array.isArray(x.tasks) && x.tasks.length).slice(0, MAX_ROUTINES);
  if (!ok.length) throw new Error('bad-file');
  return { routines: ok, total: list.length };
}

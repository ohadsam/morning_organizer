// Automatic updates for the web app (PWA). The service worker downloads a new version by itself; this decides WHEN to switch to it:
// at once when nothing would be disturbed, otherwise after a gentle "Update ready" prompt - never in the middle of a run, a sheet or typing.
// Pure and injectable so it can be unit-tested.

/** Safe to reload right now? Not while a routine runs, a sheet is open, or the person is typing. */
export const canAutoUpdate = ({ view = '', dialogOpen = false, typing = false } = {}) => view !== 'run' && !dialogOpen && !typing;

/**
 * deps: { check(): checks the server for a new version, gate(): boolean (is it safe), apply(): switch now, announce(): show the prompt (once) }.
 * -> { updateReady(), tick(), checkNow() }. `updateReady` = a new version has been downloaded; `tick` is called every few seconds and on focus.
 */
export function createUpdater({ check, gate, apply, announce }) {
  let pending = false, announced = false, applying = false;
  return {
    updateReady() { pending = true; this.tick(); },
    tick() {
      if (!pending || applying) return false;
      if (gate()) { applying = true; apply(); return true; }
      if (!announced) { announced = true; announce(); }
      return false;
    },
    async checkNow() { try { await check(); } catch { /* offline: try again later */ } },
    get pending() { return pending; },
  };
}

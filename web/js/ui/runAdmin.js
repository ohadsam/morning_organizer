// Ending a run that is in progress WITHOUT keeping it (cancel) or starting it again from the beginning. Nothing is added to the history.
import * as S from '../store.js';
import { native } from '../native.js';
import { setAwake } from '../awake.js';
import { pushActive } from '../family.js';

/** Forgets the run in progress: no history entry, no widget, parents see "not running". */
export async function discardActiveRun() {
  await S.saveActive(null); setAwake('run', false);
  if (native.available) native.setProgress({ active: false });
  pushActive(true);
}

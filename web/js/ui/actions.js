// Named things the app can do from several places (home buttons, search, suggestions, the wizard's entry points).
import * as S from '../store.js';
import { t } from '../i18n.js';
import { toast } from './common.js';
import { openImport } from './share.js';
import { openCapture } from './capture.js';
import { openMenu } from './menu.js';
import { openWhatsNew } from './whatsnew.js';
import { openWizard } from './wizard.js';
import { openShareApp } from './shareApp.js';
import { openAprt } from './aprt.js';
import { openRoutineIO } from './routineIO.js';
import { openMyAvatars } from './avatarLibrary.js';
import { avatarLevel } from './avatar.js';

const ACTIONS = {
  newRoutine: async (nav) => { try { const x = S.newTemplate(t('untitled')); await S.saveTemplate(x); nav(`#/edit/${x.id}`); } catch { toast(t('error')); } },
  wizard: (nav) => openWizard(nav),
  import: () => openImport(),
  capture: () => openCapture({}),
  rewards: () => openMenu(),
  whatsnew: (nav) => openWhatsNew(nav),
  shareApp: () => openShareApp(),
  aprt: () => openAprt({}),
  routineio: () => openRoutineIO(),
  avatars: () => openMyAvatars({ lvl: avatarLevel(), onUse: (a) => S.patchProfile(S.activeProfile().id, { avatar: a }) }),
};
/** Runs a named action; unknown names do nothing (the name may come from stored data). */
export function runAction(name, nav) { return Object.hasOwn(ACTIONS, name) ? ACTIONS[name](nav) : undefined; }
/** Goes to a place: a hash route or an action. */
export function go(target, nav) { if (target?.route) nav(target.route); else if (target?.action) runAction(target.action, nav); }

// One entry point for "something arrived" (paste, share sheet, NFC tag, Bluetooth, WebRTC): decide what it is and act.
import { t } from '../i18n.js';
import * as F from '../family.js';
import { looksLikeInvite, looksLikeEnvelope } from '../link.js';
import { looksLikeBackup, extractCode } from '../share.js';
import { importCode } from './share.js';
import { openBackupImport } from './backup.js';
import { toast, confirmBox } from './common.js';
import { openJoin, openOutbox } from './family.js';

export async function routeIncoming(text, via = null) {
  if (looksLikeInvite(text)) { openJoin(text); return 'invite'; }
  if (looksLikeEnvelope(text)) return handleEnvelope(text, via);
  if (looksLikeBackup(text)) { openBackupImport(text); return 'backup'; }
  if (extractCode(text)) { try { await importCode(text); return 'template'; } catch { toast(t('importBad')); return 'bad'; } }
  toast(t('importBad')); return null;
}

/** Process one family envelope and tell the person what happened. */
export async function handleEnvelope(text, via = null) {
  let r;
  try { r = await F.receive(text, via); } catch (e) {
    toast(e.message === 'replay' ? t('rcvReplay') : e.message === 'unknown-link' ? t('rcvUnknown') : t('rcvBad')); return 'error';
  }
  if (r.kind === 'join') {
    const { pending } = r;
    if (await confirmBox(t('approveJoin', { name: pending.profile.name || '?' }), t('accept'))) {
      const { link, welcome } = await F.approveJoin(pending);
      toast(t('childLinked', { name: link.peer.name || '?' }));
      if (!welcome.delivered) openOutbox(t('welcomeReply', { name: link.peer.name || '?' }), welcome.envelope);
    } else await F.rejectJoin(pending);
    return 'join';
  }
  if (r.reply) openOutbox(t('outboxTitle'), r.reply);
  const name = r.link?.peer?.name || '';
  if (r.kind === 'report') toast(t('rcvReport', { name }));
  else if (r.kind === 'assign') toast(t('rcvAssign', { n: r.assigned ?? 0, name }));
  else if (r.kind === 'cheer') toast(t('rcvCheer', { name }));
  else if (r.kind === 'goal' || r.kind === 'welcome') toast(t('rcvGoal'));
  else if (!r.reply) toast(t('rcvOk'));
  return r.kind;
}

// What a person earns: the achievements gallery, and the inline celebration after a run (level up, unlocked characters, new badges).
import { h } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { BADGES, earnedBadges, newBadges } from '../badges.js';
import { MEDAL_OF } from '../scenery.js';
import { levelInfo } from '../levels.js';
import { finished, totalStars } from '../stats.js';
import { CHARACTERS } from '../avatar.js';
import { avatarNode, openAvatarPicker } from './avatar.js';
import { cameoNode } from './mascot.js';
import { framedAvatar, medalNode } from './scenery.js';
import { loadPack } from './avatarKit.js';
import { partsUnlockedBetween } from '../avatarKit.js';
import { confetti } from './fx.js';

/** The gallery: earned badges in colour, the rest greyed with their hint. */
/** What the badges need besides the runs: how many check-ins and look-backs the person has, and whether a backup was ever made on this device. */
const badgeExtra = () => { let backup = false; try { backup = !!localStorage.getItem('mo.lastBackup'); } catch { /* blocked */ } return { calm: S.activeProfile().calmDone || 0, feel: S.feelings().length, retro: S.retros().length, backup }; };
export function achievementsCard(runs) {
  const earned = earnedBadges(runs, badgeExtra()), lvNow = levelInfo(totalStars(finished(runs))).level;
  return h('section', { class: 'card' }, h('h2', {}, `🏆 ${t('achievements')}`), h('p', { class: 'note' }, t('badgesEarned', { n: earned.length, total: BADGES.length })),
    h('ul', { class: 'badges' }, BADGES.map((b) => { const on = earned.includes(b.id);
      return h('li', { class: `badge ${on ? 'on' : ''}`, 'aria-label': `${t(`badge_${b.id}`)}: ${t(`badgeDesc_${b.id}`)}${on ? '' : ` (${t('badgeLocked')})`}` }, h('span', { class: 'bi', 'aria-hidden': 'true' }, MEDAL_OF[b.id] ? medalNode(MEDAL_OF[b.id], { locked: !on, fallback: b.emoji }) : b.emoji), h('strong', {}, t(`badge_${b.id}`)), h('small', {}, t(`badgeDesc_${b.id}`))); })),
    h('h3', {}, t('levelsTitle')), h('ul', { class: 'medals' }, Array.from({ length: 14 }, (_, i) => { const n = i + 1, on = n <= lvNow; return h('li', { class: on ? 'on' : '', 'aria-label': `${t('levelMedal', { n })}${on ? '' : ` (${t('badgeLocked')})`}` }, medalNode(`level-${n}`, { locked: !on }), h('small', {}, String(n))); })));
}

/** After a run was saved: -> a card to show on the summary screen, or null when there is nothing new. Marks the badges as seen. */
export async function celebrationFor(run) {
  const mine = S.myRuns(), before = mine.filter((r) => r.id !== run.id);
  const lvBefore = levelInfo(totalStars(finished(before))).level, lvAfter = levelInfo(totalStars(finished(mine))).level;
  const p = S.activeProfile(), fresh = newBadges(earnedBadges(mine, badgeExtra()), p.seenBadges);
  const parts = lvAfter > lvBefore ? partsUnlockedBetween(await loadPack(), lvBefore, lvAfter) : [];
  const unlocked = Object.entries(CHARACTERS).filter(([, c]) => c.unlock > lvBefore && c.unlock <= lvAfter);
  if (!fresh.length && lvAfter === lvBefore) return null;
  await S.saveProfile({ ...p, seenBadges: [...new Set([...(p.seenBadges || []), ...fresh])] });
  const card = h('section', { class: 'card celebrate', role: 'status' },
    lvAfter > lvBefore ? h('div', { class: 'stack' }, h('div', { class: 'row-btns' }, cameoNode('proud', { size: 84 }), framedAvatar(avatarNode(S.activeProfile().avatar, { size: 64, anim: 'cheer' }), lvAfter, 100)), h('strong', { class: 'lvl' }, `🏅 ${t('levelUp', { n: lvAfter })}`),
      unlocked.length ? h('div', {}, h('small', {}, t('unlockedChar')), h('div', { class: 'row' }, unlocked.map(([id, c]) => avatarNode({ k: 'char', id, color: c.base }, { size: 48, anim: 'dance' })))) : null,
      parts.length ? h('div', { class: 'stack' }, h('small', {}, t('unlockedParts', { n: parts.length })), h('button', { class: 'btn small', type: 'button', onclick: () => openAvatarPicker(S.activeProfile().avatar, (av) => { S.saveProfile({ ...S.activeProfile(), avatar: av }); }, { lvl: lvAfter }) }, `🎨 ${t('unlockedPartsBtn')}`)) : null) : null,
    fresh.length ? h('div', { class: 'stack' }, h('strong', {}, `✨ ${t('newBadgeTitle')}`), h('ul', { class: 'badges small' }, fresh.map((id) => { const b = BADGES.find((x) => x.id === id);
      return h('li', { class: 'badge on' }, h('span', { class: 'bi', 'aria-hidden': 'true' }, MEDAL_OF[id] ? medalNode(MEDAL_OF[id], { fallback: b.emoji }) : b.emoji), h('strong', {}, t(`badge_${id}`)), h('small', {}, t(`badgeDesc_${id}`))); }))) : null);
  setTimeout(() => confetti(document.body, 28), 200);
  return card;
}

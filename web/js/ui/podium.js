// The podium at the end of a routine (when points are on): the three best scores of this routine, where this run stands, the awards won and a
// per-task breakdown. Fireworks play over it for people who have not asked for reduced motion.
import { h } from '../util.js';
import { t } from '../i18n.js';
import { podium, totalPoints, AWARD_EMOJI } from '../points.js';
import { fireworks } from './fx.js';

const MEDAL = ['🥇', '🥈', '🥉'];
const day = (ms) => new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short' });

/** run has run.score; runs = this person's history. opts: { cumulative }. */
export function podiumCard(run, runs, { cumulative = true } = {}) {
  const sc = run.score; if (!sc) return null;
  const p = podium(runs, run), order = p.places.length >= 3 ? [1, 0, 2] : p.places.length === 2 ? [1, 0] : [0];   // 2nd - 1st - 3rd, like a real podium
  const step = (i) => { const x = p.places[i];
    return h('li', { class: `pod-step pod-${i + 1} ${x.current ? 'me' : ''}`, 'aria-label': `${MEDAL[i]} ${x.total} ${t('ptsUnit')}${x.current ? `, ${t('podYou')}` : ''}` },
      h('span', { class: 'pod-medal', 'aria-hidden': 'true' }, MEDAL[i]), h('strong', { class: 'pod-score' }, String(x.total)), h('small', {}, x.current ? t('podYou') : day(x.at))); };
  const awards = sc.awards || [];
  const card = h('section', { class: 'card podium-card', 'aria-label': t('podTitle') },
    h('h2', {}, `🏆 ${t('podTitle')}`),
    h('p', { class: 'pod-total', role: 'status' }, h('strong', {}, String(sc.total)), ` ${t('ptsUnit')}`,
      sc.bonus ? h('small', { class: 'good' }, ` +${sc.bonus} ${t('ptsBonus')}`) : null, sc.penalty ? h('small', { class: 'muted' }, ` −${sc.penalty} ${t('ptsLate')}`) : null),
    h('ol', { class: `podium n${p.places.length}`, 'aria-label': t('podTitle') }, order.map(step)),
    p.rank && p.rank <= 3 ? h('p', { class: 'chip solid' }, p.count === 1 ? t('podFirstRun') : t(`podRank${p.rank}`)) : p.rank ? h('p', { class: 'note' }, t('podRank', { rank: p.rank, count: p.count })) : null,
    awards.length ? h('p', { class: 'awards', 'aria-label': t('podAwards') }, awards.map((a) => h('span', { class: 'award', title: t(`award_${a.award}`) }, `${AWARD_EMOJI[a.award]} `, h('small', {}, run.tasks[a.i]?.name || '')))) : null,
    cumulative ? h('p', { class: 'note' }, t('podTotal', { n: totalPoints([...runs.filter((r) => r.id !== run.id), run]) })) : null,
    h('details', { class: 'fold' }, h('summary', {}, h('span', { class: 'fold-t' }, t('podBreakdown'))),
      h('ul', { class: 'pod-list' }, run.tasks.map((x, i) => h('li', {}, h('span', {}, `${x.name || '—'}${x.skipped ? ` (${t('skippedTag')})` : ''}`), h('strong', {}, String(sc.tasks[i] ?? 0)))))));
  setTimeout(() => fireworks(card), 150);
  return card;
}

// Mindful coach logic (pure): tip selection personalised by language, age tier, gender and name, plus the "should we offer a tip now?" rule.
import { TIPS, CATEGORIES } from './coachTips.js';
import { audience, personalize } from './feedback.js';
import { paceDiffSec } from './engine.js';

export { audience, CATEGORIES };
export const TIP_COOLDOWN_MS = 90_000;

/**
 * Pick a tip. Prefers tips written for the exact situation (70%), never repeats until the pool is exhausted
 * (`seen` is a Set of ids, mutated). -> { id, cat, text } | null
 */
export function pickTip({ situation = 'any', lang = 'en', age = null, gender = 'other', name = '', seen = new Set(), rnd = Math.random } = {}) {
  const tier = audience(age), l = lang === 'he' ? 1 : 0;
  const exact = TIPS.filter((x) => x.sit === situation), any = TIPS.filter((x) => x.sit === 'any'), all = situation === 'any' ? TIPS : [...exact, ...any];
  let fresh = (list) => list.filter((x) => !seen.has(x.id));
  if (!fresh(all).length) seen.clear();
  const useExact = situation !== 'any' && fresh(exact).length && rnd() < 0.7;
  const pool = fresh(useExact ? exact : all);
  const tip = pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
  seen.add(tip.id);
  return { id: tip.id, cat: tip.cat, text: personalize(tip.text[tier][l], { name, gender }) };
}

/**
 * Decides whether to proactively offer a tip. `memo` ({lastAt, tasks:Set, paused, behindAt}) is mutated.
 * -> 'late' | 'stuck' | null.   Rules: at most one tip per 90 s; 15 s into overtime (once per task);
 * paused 2+ minutes (once per pause); 3+ minutes behind the plan (at most every 5 minutes).
 */
export function coachTrigger(run, now, memo) {
  if (run.status !== 'running' && run.status !== 'paused') return null;
  if (run.status === 'running') memo.paused = false;
  if (now - memo.lastAt < TIP_COOLDOWN_MS) return null;
  const fire = (s) => { memo.lastAt = now; return s; };
  if (run.status === 'paused') {
    if (!memo.paused && run.pausedAt && now - run.pausedAt >= 120_000) { memo.paused = true; return fire('stuck'); }
    return null;
  }
  const cur = run.tasks[run.current];
  const left = cur.plannedSec + cur.extraSec - ((cur.accumMs + (now - run.segStart)) / 1000);
  if (left <= -15 && !memo.tasks.has(cur.id)) { memo.tasks.add(cur.id); return fire('late'); }
  if (paceDiffSec(run, now) >= 180 && now - memo.behindAt >= 300_000) { memo.behindAt = now; return fire('late'); }
  return null;
}
export const newMemo = () => ({ lastAt: -Infinity, tasks: new Set(), paused: false, behindAt: -Infinity });

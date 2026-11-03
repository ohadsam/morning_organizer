// Reward menu (pure): things a person can "buy" with stars. Stars come from finished routines (stats.stars); spending never changes history.
import { cleanText, clamp } from './util.js';
export const MAX_MENU = 12, MAX_REDEEMED = 100;
export function sanitizeMenu(m) {
  return (Array.isArray(m) ? m : []).filter((x) => x && typeof x === 'object' && cleanText(x.title, 40)).slice(0, MAX_MENU)
    .map((x) => ({ id: typeof x.id === 'string' && x.id ? x.id.slice(0, 64) : `m${Math.random().toString(36).slice(2, 10)}`, title: cleanText(x.title, 40), emoji: cleanText(x.emoji, 8) || '🎁', cost: clamp(Math.round(Number(x.cost)) || 1, 1, 999) }));
}
export function sanitizeRedeemed(r) {
  return (Array.isArray(r) ? r : []).filter((x) => x && typeof x === 'object' && typeof x.id === 'string').slice(-MAX_REDEEMED)
    .map((x) => ({ id: x.id.slice(0, 64), title: cleanText(x.title, 40), emoji: cleanText(x.emoji, 8) || '🎁', cost: clamp(Math.round(Number(x.cost)) || 0, 0, 999), at: Math.max(0, Math.round(Number(x.at)) || 0), given: !!x.given }));
}
export const spent = (redeemed) => redeemed.reduce((s, r) => s + r.cost, 0);
/** Stars available = stars earned - stars spent (never below 0). */
export const balance = (earned, redeemed) => Math.max(0, earned - spent(redeemed));
export const canAfford = (item, earned, redeemed) => balance(earned, redeemed) >= item.cost;

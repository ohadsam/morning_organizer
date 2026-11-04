// Wake-up alarm chains (pure): a routine's alarm can ring several times (7:00, 7:15, 7:20 ...), each ring with its own sound, volume, text and
// voice; the routine is offered (or started automatically) at the LAST ring. Native Android gets every ring as its own independent alarm.
import { clamp, cleanText } from './util.js';
import { PRESETS } from './speech.js';

export const SOUNDS = ['alarm', 'gentle', 'ringtone', 'rising'];
export const START_MODES = ['offer', 'auto'];
export const MAX_EXTRA = 8, MAX_GAP_MIN = 120;
const ring = (r, d) => ({
  sound: SOUNDS.includes(r?.sound) ? r.sound : d.sound, volume: clamp(Math.round(Number(r?.volume ?? d.volume)) || 0, 0, 100), vibrate: typeof r?.vibrate === 'boolean' ? r.vibrate : d.vibrate,
  durationSec: clamp(Math.round(Number(r?.durationSec)) || d.durationSec, 5, 600), text: cleanText(r?.text, 80), speak: r?.speak === true,
  voice: typeof r?.voice === 'string' && Object.hasOwn(PRESETS, r.voice) ? r.voice : 'natural',
});
const FIRST = { sound: 'alarm', volume: 80, vibrate: true, durationSec: 30 };

/** Whole-alarm sanitiser (also used for imports/backups). */
export function normalizeAlarm(a) {
  a = a && typeof a === 'object' ? a : {};
  const more = (Array.isArray(a.more) ? a.more : []).filter((x) => x && typeof x === 'object').slice(0, MAX_EXTRA)
    .map((x) => ({ afterMin: clamp(Math.round(Number(x.afterMin)) || 5, 1, MAX_GAP_MIN), ...ring(x, { ...FIRST, sound: 'alarm', volume: Number(a.volume) || 80 }) }));
  return {
    enabled: !!a.enabled, time: /^\d{2}:\d{2}$/.test(a.time) && Number(a.time.slice(0, 2)) < 24 && Number(a.time.slice(3)) < 60 ? a.time : '07:00',
    days: [...new Set((Array.isArray(a.days) ? a.days : []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(),
    ...ring(a, FIRST), startMode: START_MODES.includes(a.startMode) ? a.startMode : 'offer', more,
  };
}
/** New routines come with the alarm ON (07:00 on school days) so it is easy to find; switch it off in the editor or on the Alarms screen. */
export const defaultAlarm = (days = [0, 1, 2, 3, 4], time = '07:00', enabled = true) => normalizeAlarm({ enabled, time, days });

/** Every ring with its offset (minutes after the first one). Index 0 is the main alarm. */
export function ringsOf(alarm) {
  const a = normalizeAlarm(alarm); let off = 0;
  const out = [{ index: 0, offsetMin: 0, ...ring(a, FIRST) }];
  for (const m of a.more) { off += m.afterMin; out.push({ index: out.length, offsetMin: off, sound: m.sound, volume: m.volume, vibrate: m.vibrate, durationSec: m.durationSec, text: m.text, speak: m.speak, voice: m.voice }); }
  return out;
}
const hm = (time) => time.split(':').map(Number);
/** Clock time (HH:MM) of each ring, and of the routine start = the last ring. */
export function schedule(alarm) {
  const a = normalizeAlarm(alarm), [h, m] = hm(a.time);
  return ringsOf(a).map((r) => { const t = (h * 60 + m + r.offsetMin) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; });
}
/** The next ring after `now` across today/tomorrow...: { index, at, final, ring } | null. */
export function nextRing(alarm, now = new Date()) {
  const a = normalizeAlarm(alarm); if (!a.enabled) return null;
  const [h, m] = hm(a.time), rs = ringsOf(a), days = a.days.length ? a.days : [0, 1, 2, 3, 4, 5, 6];
  let best = null;
  for (let add = -1; add < 8; add++) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add, h, m, 0, 0);
    if (!days.includes(base.getDay())) continue;
    for (const r of rs) { const at = new Date(base.getTime() + r.offsetMin * 60_000); if (at > now && (!best || at < best.at)) best = { index: r.index, at, final: r.index === rs.length - 1, ring: r }; }
  }
  return best;
}
/** What the Android app needs: one independent entry per ring. `lang` is 'he' | 'en'. */
export function nativeRings(tpl, lang = 'en') {
  const a = normalizeAlarm(tpl.alarm); if (!a.enabled) return [];
  const [h, m] = hm(a.time), rs = ringsOf(a), final = rs.length - 1;
  return rs.map((r) => {
    const t = h * 60 + m + r.offsetMin, shift = Math.floor(t / 1440), mins = t % 1440, p = Object.hasOwn(PRESETS, r.voice) ? PRESETS[r.voice] : PRESETS.natural;
    return { id: `${tpl.id}#${r.index}`, templateId: tpl.id, name: tpl.name, hour: Math.floor(mins / 60), minute: mins % 60, days: a.days.map((d) => (d + shift) % 7),
      volume: r.volume, vibrate: r.vibrate, durationSec: r.durationSec, sound: r.sound, text: r.text, speak: r.speak, pitch: p.pitch, rate: p.rate, lang: lang === 'he' ? 'he-IL' : 'en-US',
      start: r.index === final ? a.startMode : 'offer', n: r.index + 1, of: rs.length };
  });
}

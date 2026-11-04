import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAlarm, nextRing, nativeRings, setAlarmRules, quietDay, SOUNDS, ringsOf } from '../../web/js/wake.js';
import { nextFire } from '../../web/js/alarms.js';
import { pauseFor, activePause, isPaused, cleanPause } from '../../web/js/alarmPause.js';
import { sanitizeSettings } from '../../web/js/store.js';

const al = (extra = {}) => ({ enabled: true, time: '07:00', days: [], ...extra });
const at = (s) => new Date(s + 'T06:00:00');
test('alarms are quiet on holidays and vacations by default, and the choice can be turned off', () => {
  assert.equal(normalizeAlarm({}).offDays, true); assert.equal(normalizeAlarm({ offDays: false }).offDays, false);
  assert.equal(nextRing(al(), at('2026-09-11')).at.getDate(), 11);                  // Friday 11 Sep: an ordinary day
  assert.equal(nextRing(al(), at('2026-09-12')) && nextRing(al(), at('2026-09-12')).at.getDate(), 14, 'Rosh Hashana 12-13 Sep skipped');
  assert.equal(nextRing(al({ offDays: false }), at('2026-09-12')).at.getDate(), 12);
  const summer = nextRing(al(), at('2026-07-05')); assert.equal(summer.at.getMonth(), 8); assert.equal(summer.at.getDate(), 1, 'the summer vacation is skipped');
  assert.equal(nextFire(al(), at('2026-07-05')).getMonth(), 8); assert.equal(nextFire(al({ offDays: false }), at('2026-07-05')).getDate(), 5);
  assert.equal(quietDay(al(), new Date('2026-09-12T09:00')), true); assert.equal(quietDay(al({ offDays: false }), new Date('2026-09-12T09:00')), false);
});
test('pause holds every alarm back, then lets them ring again', () => {
  const now = new Date('2026-11-10T06:00:00');
  setAlarmRules({ pausedUntil: new Date('2026-11-12T00:00:00').getTime() });
  assert.equal(nextRing(al(), now).at.getDate(), 12); assert.equal(nextFire(al(), now).getDate(), 12);
  setAlarmRules({ pausedUntil: -1 }); assert.equal(nextRing(al(), now), null); assert.equal(nextFire(al(), now), null);
  setAlarmRules({ pausedUntil: 0 }); assert.equal(nextRing(al(), now).at.getDate(), 10);
});
test('pause values: choices, expiry, sanity, and untrusted settings', () => {
  const now = new Date('2026-11-10T15:30:00');
  assert.equal(pauseFor('forever', now), -1); assert.equal(new Date(pauseFor('today', now)).getDate(), 11); assert.equal(pauseFor('week', now) - now.getTime(), 7 * 86400000); assert.equal(pauseFor('nope', now), 0);
  assert.equal(activePause(pauseFor('today', now), now.getTime()), pauseFor('today', now)); assert.equal(isPaused(pauseFor('today', now), now.getTime() + 9 * 3600e3), false, 'expires');
  assert.equal(cleanPause('x'), 0); assert.equal(cleanPause(-5), 0); assert.equal(cleanPause(1e20), 0); assert.equal(cleanPause(-1), -1);
  assert.equal(sanitizeSettings({ alarmsPause: -1 }).alarmsPause, -1); assert.equal(sanitizeSettings({ alarmsPause: 'bad' }).alarmsPause, 0);
});
test('ring types: nine known types, a phone sound only as a safe content:// uri, sent to the app with the quiet-days flag', () => {
  assert.ok(['bell', 'birds', 'digital', 'melody', 'device'].every((x) => SOUNDS.includes(x)));
  const ok = normalizeAlarm({ enabled: true, sound: 'device', tone: 'content://media/internal/audio/media/42', toneTitle: 'Nice' }); assert.equal(ok.tone, 'content://media/internal/audio/media/42');
  assert.equal(normalizeAlarm({ sound: 'device', tone: 'javascript:alert(1)' }).tone, ''); assert.equal(normalizeAlarm({ sound: 'bell', tone: 'content://x/1' }).tone, '', 'only for the device type');
  assert.equal(normalizeAlarm({ sound: 'nope' }).sound, 'alarm');
  const r = nativeRings({ id: 't1', name: 'x', alarm: { ...ok, more: [{ afterMin: 5, sound: 'device', tone: 'content://a/b' }] } }, 'he');
  assert.equal(r[0].tone, ok.tone); assert.equal(r[0].offDays, true); assert.equal(r[1].tone, 'content://a/b'); assert.equal(ringsOf(ok).length, 1);
});

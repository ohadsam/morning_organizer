// Voice commands during a routine: a small "Listen" button and a "?" that shows what can be said. While it is on, the phone keeps listening through
// every step (it restarts the recogniser whenever it stops by itself), turns a short spoken phrase into one command (see voiceCommands.js) and hands
// it to the run screen. Same opt-in and the same recogniser as voice notes (Settings -> Voice notes); nothing is sent by this app itself.
import { h, setChildren } from '../util.js';
import { t, getLang } from '../i18n.js';
import * as S from '../store.js';
import { startDictation, dictationSupported, dictationIsLocal } from '../dictation.js';
import { speakingNow } from '../speech.js';
import { announce } from '../a11y.js';
import { parseCommand, helpList, dedupe } from '../voiceCommands.js';
import { modal, toast } from './common.js';

/** The list of commands: each with what it does and the ways to say it. Used by the "?" sheet and by Settings. */
export function commandList(lang = getLang()) {
  return h('ul', { class: 'vc-list' }, helpList(lang).map((c) => h('li', {}, h('strong', {}, t(`vc_${c.id}`)),
    h('span', { class: 'vc-say' }, c.examples.map((x) => h('q', {}, x))))));
}
export function openVoiceHelp() {
  const body = h('div', { class: 'stack' }, h('p', { class: 'note' }, t('vcHelpIntro')), commandList(),
    h('p', { class: 'note' }, t('vcYesNo')), h('small', { class: 'hint' }, t(dictationIsLocal() ? 'vcPrivacyApp' : 'vcPrivacyWeb')));
  return modal(`🎤 ${t('vcHelpTitle')}`, body, [{ label: t('close'), primary: true }]);
}
/** The small "?" button that opens the list of commands. */
export const helpButton = () => h('button', { type: 'button', class: 'btn small vc-help', 'aria-label': t('vcHelp'), title: t('vcHelp'), onclick: openVoiceHelp }, '?');

/**
 * onCommand(id, phrase) is called for each recognised command. Returns { el, start(), stop(), isOn(), destroy() }.
 * ask() is injected for tests: () => Promise<boolean> (consent).
 */
export function createVoiceControl({ onCommand, ask } = {}) {
  let on = false, session = null, restart = null, quick = 0, startedAt = 0, handled = 0;
  const once = dedupe(2500);
  const heard = h('small', { class: 'vc-heard', role: 'status', 'aria-live': 'polite' });
  const btn = h('button', { type: 'button', class: 'btn vc-btn', 'aria-pressed': 'false', onclick: () => (on ? stop() : start()) });
  const paint = () => {
    btn.setAttribute('aria-pressed', String(on)); btn.classList.toggle('on', on);
    setChildren(btn, h('span', { 'aria-hidden': 'true' }, on ? '🎙️' : '🎤'), ' ', on ? t('vcListening') : t('vcListen'));
    if (!on) heard.textContent = '';
  };
  const lang = () => (getLang() === 'he' ? 'he' : 'en');
  function onText(final, interim) {
    if (speakingNow()) { handled = final.length; return; }   // the app is talking: that is not the person
    void interim;
    const fresh = final.slice(handled).trim(); if (!fresh) return;
    handled = final.length; quick = 0;
    const res = parseCommand(fresh, lang()); if (!res || !once(res.id)) return;
    heard.textContent = t('vcHeard', { say: res.phrase }); announce(t('vcHeard', { say: res.phrase }));
    try { onCommand?.(res.id, res.phrase); } catch { /* a bad handler must not stop the listening */ }
  }
  function begin() {
    if (!on) return;
    handled = 0; startedAt = Date.now();
    session = startDictation(lang(), { onText, onEnd: (why) => {
      session = null; if (!on) return;
      if (why === 'denied' || why === 'unavailable') { stop(); toast(t(why === 'denied' ? 'vcDenied' : 'vcUnavailable')); return; }
      quick = Date.now() - startedAt < 1500 ? quick + 1 : 0;
      if (quick >= 6) { stop(); toast(t('vcUnavailable')); return; }   // keeps failing straight away: give up quietly instead of looping
      restart = setTimeout(begin, quick ? 700 : 250);
    } });
  }
  async function start() {
    if (on) return;
    if (!dictationSupported()) { toast(t('vcUnavailable')); return; }
    if (!S.get().settings.transcribe) {
      const ok = await (ask ? ask() : (await import('./capture.js')).askTranscribeConsent()); if (!ok) return;
    }
    on = true; quick = 0; paint(); begin();
  }
  function stop() { on = false; clearTimeout(restart); try { session?.stop(); } catch { /* already over */ } session = null; paint(); }
  paint();
  const el = h('div', { class: 'vc-row' }, h('div', { class: 'vc-btns' }, btn, helpButton()), heard);
  return { el, start, stop, isOn: () => on, destroy: stop };
}

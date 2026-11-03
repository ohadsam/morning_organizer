// Dictation: turns speech into text as a SUGGESTION the person can edit. Only after the person opted in (Settings → Voice notes).
// Android app: the phone's own recognizer (prefers offline). Browsers: the Web Speech API, which in Chrome sends audio to the browser vendor's
// servers - that is why it is opt-in and explained. Nothing is ever sent by this app itself.
import { native } from './native.js';

const Ctor = () => (typeof globalThis.SpeechRecognition === 'function' ? globalThis.SpeechRecognition : typeof globalThis.webkitSpeechRecognition === 'function' ? globalThis.webkitSpeechRecognition : null);
export const dictationSupported = () => (native.available ? native.dictationAvailable() : !!Ctor());
export const dictationIsLocal = () => native.available;       // the app asks the phone to prefer offline recognition; browsers cannot promise it
const bcp = (lang) => (lang === 'he' ? 'he-IL' : 'en-US');

/**
 * Starts listening. onText(finalText, interimText) fires as words arrive (finalText accumulates). onEnd(reason) when it stops
 * ('stopped' | 'denied' | 'unavailable' | 'failed'). -> { stop() }
 */
export function startDictation(lang, { onText = () => {}, onEnd = () => {} } = {}) {
  let finalText = '', over = false;
  const add = (s) => { s = String(s || '').trim(); if (s) finalText = finalText ? `${finalText} ${s}` : s; };
  const end = (why) => { if (over) return; over = true; offNative?.(); onEnd(why); };
  let offNative = null, rec = null;
  if (native.available) {
    const handler = (e) => {
      const d = e.detail; if (d?.type !== 'dictation') return;
      if (d.status === 'partial') onText(finalText, String(d.text || ''));
      else if (d.status === 'final') { add(d.text); onText(finalText, ''); }
      else if (d.status === 'error') end(d.reason === 'denied' ? 'denied' : d.reason === 'unavailable' ? 'unavailable' : 'failed');
      else if (d.status === 'stopped') end('stopped');
    };
    globalThis.addEventListener('morning-native', handler); offNative = () => globalThis.removeEventListener('morning-native', handler);
    native.dictationStart(bcp(lang));
    return { stop: () => { native.dictationStop(); } };
  }
  const R = Ctor(); if (!R) { queueMicrotask(() => end('unavailable')); return { stop() {} }; }
  rec = new R(); rec.lang = bcp(lang); rec.continuous = true; rec.interimResults = true;
  rec.onresult = (ev) => { let interim = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) { const r = ev.results[i]; if (r.isFinal) add(r[0].transcript); else interim += r[0].transcript; } onText(finalText, interim); };
  rec.onerror = (ev) => end(ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? 'denied' : ev.error === 'no-speech' || ev.error === 'aborted' ? 'stopped' : 'failed');
  rec.onend = () => end('stopped');
  try { rec.start(); } catch { end('failed'); }
  return { stop: () => { try { rec.stop(); } catch { end('stopped'); } } };
}
